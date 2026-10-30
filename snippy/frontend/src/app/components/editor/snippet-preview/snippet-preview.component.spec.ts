import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  buildPreviewSrcdoc,
  PREVIEW_IFRAME_SANDBOX,
  CAPTURE_IFRAME_SANDBOX,
  dataUrlToBlob,
  SnippetPreviewComponent,
} from '@app/components/editor/snippet-preview/snippet-preview.component';

describe('SnippetPreviewComponent', () => {
  let component: SnippetPreviewComponent;
  let fixture: ComponentFixture<SnippetPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SnippetPreviewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SnippetPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('XSS mitigation - sandbox attribute', () => {
    it('should have sandbox attribute on preview iframe', () => {
      const iframe = fixture.nativeElement.querySelector('iframe');
      expect(iframe).toBeTruthy();
      expect(iframe.hasAttribute('sandbox')).toBe(true);
    });

    it('should NOT include allow-same-origin in sandbox to prevent same-origin XSS', () => {
      const iframe = fixture.nativeElement.querySelector('iframe');
      const sandboxValue = iframe.getAttribute('sandbox');
      expect(sandboxValue).toBe(PREVIEW_IFRAME_SANDBOX);
      expect(sandboxValue).not.toContain('allow-same-origin');
      expect(sandboxValue).not.toContain('allow-top-navigation');
      expect(sandboxValue).not.toContain('allow-popups-to-escape-sandbox');
    });

    it('should include allow-scripts in sandbox to allow snippet execution', () => {
      const iframe = fixture.nativeElement.querySelector('iframe');
      const sandboxValue = iframe.getAttribute('sandbox');
      expect(sandboxValue).toContain('allow-scripts');
    });

    it('should include allow-forms in sandbox for form functionality', () => {
      const iframe = fixture.nativeElement.querySelector('iframe');
      const sandboxValue = iframe.getAttribute('sandbox');
      expect(sandboxValue).toContain('allow-forms');
    });

    it('should include allow-modals in sandbox for modal functionality', () => {
      const iframe = fixture.nativeElement.querySelector('iframe');
      const sandboxValue = iframe.getAttribute('sandbox');
      expect(sandboxValue).toContain('allow-modals');
    });

    it('should include allow-popups in sandbox for popup functionality', () => {
      const iframe = fixture.nativeElement.querySelector('iframe');
      const sandboxValue = iframe.getAttribute('sandbox');
      expect(sandboxValue).toContain('allow-popups');
    });
  });

  describe('XSS mitigation - origin isolation', () => {
    it('should render snippet content in isolated origin (not same-origin)', async () => {
      component.ngAfterViewInit();

      const testHtml = '<div id="test">Test Content</div>';
      const testCss = 'body { background: red; }';
      const testJs = 'console.log("test");';

      component.updatePreview(testHtml, testCss, testJs, null, []);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const iframe = fixture.nativeElement.querySelector('iframe') as HTMLIFrameElement;
      expect(iframe).toBeTruthy();

      // The frame loads the preview page; the document waits until it posts ready.
      expect(iframe.getAttribute('src')).toMatch(/^\/preview\.html\?v=\d+$/);
      expect(iframe.srcdoc).toBe('');
      const pending = component['pendingDoc'];
      expect(pending).toContain(testHtml);
      expect(pending).toContain(testCss);
      expect(pending).toContain(testJs);

      // Verify sandbox prevents same-origin access
      // In a sandboxed iframe without allow-same-origin, contentDocument should be null
      // or accessing it should throw a SecurityError
      try {
        const doc = iframe.contentDocument;
        // If we can access contentDocument, verify it's not same-origin
        if (doc) {
          // The document should exist but origin should be different
          // We can't directly check origin in tests, but we verify sandbox is set
          expect(iframe.hasAttribute('sandbox')).toBe(true);
          expect(iframe.getAttribute('sandbox')).not.toContain('allow-same-origin');
        }
      } catch (e) {
        // SecurityError is expected and acceptable - it means sandbox is working
        expect(e).toBeDefined();
      }
    });

    it('should prevent snippet code from accessing parent window storage', async () => {
      component.ngAfterViewInit();

      // Malicious JS that attempts to access parent storage
      const maliciousJs = `
        try {
          parent.localStorage.setItem('xss', 'pwned');
          parent.sessionStorage.setItem('xss', 'pwned');
        } catch (e) {
          // Expected to fail due to sandbox
        }
      `;

      component.updatePreview('<div>test</div>', '', maliciousJs, null, []);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify parent storage was not modified
      expect(localStorage.getItem('xss')).toBeNull();
      expect(sessionStorage.getItem('xss')).toBeNull();
    });
  });

  describe('XSS mitigation - message validation', () => {
    it('should only accept messages from preview iframe', () => {
      component.ngAfterViewInit();

      const iframe = fixture.nativeElement.querySelector('iframe') as HTMLIFrameElement;
      const consoleSpy = vi.spyOn(component['previewConsole'], 'append').mockReturnValue(undefined);

      // Create a fake message event from a different source
      const fakeEvent = new MessageEvent('message', {
        data: {
          source: 'snippy-console',
          level: 'log',
          args: ['malicious message'],
        },
        source: window as any, // Wrong source - not from iframe
        origin: window.location.origin,
      });

      // Trigger the message handler
      component['onPreviewMessage'](fakeEvent);

      // Should not process message from wrong source
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should accept valid messages from preview iframe', async () => {
      component.ngAfterViewInit();
      component.updatePreview('<div>test</div>', '', '', null, []);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const iframe = fixture.nativeElement.querySelector('iframe') as HTMLIFrameElement;
      const consoleSpy = vi.spyOn(component['previewConsole'], 'append').mockReturnValue(undefined);

      // Create a valid message event from iframe
      const validEvent = new MessageEvent('message', {
        data: {
          source: 'snippy-console',
          level: 'log',
          args: ['valid message'],
        },
        source: iframe.contentWindow,
        origin: 'null', // Sandboxed iframes have null origin
      });

      component['onPreviewMessage'](validEvent);

      // Should process message from correct source
      expect(consoleSpy).toHaveBeenCalledWith('log', ['valid message']);
    });

    it('should reject messages without snippy-console source marker', () => {
      component.ngAfterViewInit();

      const consoleSpy = vi.spyOn(component['previewConsole'], 'append').mockReturnValue(undefined);

      const invalidEvent = new MessageEvent('message', {
        data: {
          // Missing 'source: snippy-console'
          level: 'log',
          args: ['message'],
        },
        source: null,
        origin: window.location.origin,
      });

      component['onPreviewMessage'](invalidEvent);

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('preview page handshake', () => {
    it('reloads the preview page for CSS-only edits', () => {
      component.ngAfterViewInit();
      component.updatePreview('<div>test</div>', 'body { color: red; }', '', null, []);
      const iframe = fixture.nativeElement.querySelector('iframe') as HTMLIFrameElement;
      const first = iframe.getAttribute('src');

      component.updatePreview('<div>test</div>', 'body { color: blue; }', '', 'partial', []);

      expect(iframe.getAttribute('src')).not.toBe(first);
      expect(component['pendingDoc']).toContain('color: blue');
    });

    it('sends the pending document when the preview page is ready', () => {
      component.ngAfterViewInit();
      component.updatePreview('<div>ready</div>', '', '', null, []);
      const iframe = fixture.nativeElement.querySelector('iframe') as HTMLIFrameElement;
      const frame = iframe.contentWindow!;
      const post = vi.spyOn(frame, 'postMessage').mockReturnValue(undefined);

      component['onPreviewMessage'](
        new MessageEvent('message', {
          data: { source: 'snippy-preview', type: 'ready' },
          source: frame,
          origin: 'null',
        })
      );

      expect(post).toHaveBeenCalledWith(
        {
          source: 'snippy-preview-host',
          type: 'render',
          html: expect.stringContaining('<div>ready</div>'),
        },
        '*'
      );
    });

    it('ignores ready messages from other windows', () => {
      component.ngAfterViewInit();
      component.updatePreview('<div>secret</div>', '', '', null, []);
      const iframe = fixture.nativeElement.querySelector('iframe') as HTMLIFrameElement;
      const post = vi.spyOn(iframe.contentWindow!, 'postMessage').mockReturnValue(undefined);

      component['onPreviewMessage'](
        new MessageEvent('message', {
          data: { source: 'snippy-preview', type: 'ready' },
          source: window as any,
          origin: window.location.origin,
        })
      );

      expect(post).not.toHaveBeenCalled();
    });
  });

  describe('XSS mitigation - content rendering', () => {
    it('should render user-supplied HTML in sandboxed context', () => {
      component.ngAfterViewInit();

      const userHtml = '<script>alert("xss")</script><div>User Content</div>';
      component.updatePreview(userHtml, '', '', null, []);

      const iframe = fixture.nativeElement.querySelector('iframe') as HTMLIFrameElement;

      // Content waits for the preview page, never in an inherited-CSP srcdoc
      expect(component['pendingDoc']).toContain(userHtml);
      expect(iframe.srcdoc).toBe('');

      // But iframe should be sandboxed
      expect(iframe.hasAttribute('sandbox')).toBe(true);
      expect(iframe.getAttribute('sandbox')).not.toContain('allow-same-origin');
    });

    it('should render user-supplied CSS in sandboxed context', () => {
      component.ngAfterViewInit();

      const userCss = 'body { background: url("javascript:alert(1)"); }';
      component.updatePreview('<div>test</div>', userCss, '', null, []);

      const iframe = fixture.nativeElement.querySelector('iframe') as HTMLIFrameElement;

      // Content waits for the preview page, never in an inherited-CSP srcdoc
      expect(component['pendingDoc']).toContain(userCss);
      expect(iframe.srcdoc).toBe('');

      // But iframe should be sandboxed
      expect(iframe.hasAttribute('sandbox')).toBe(true);
    });

    it('should render user-supplied JavaScript in sandboxed context', () => {
      component.ngAfterViewInit();

      const userJs = 'window.top.location = "https://evil.com";';
      component.updatePreview('<div>test</div>', '', userJs, null, []);

      const iframe = fixture.nativeElement.querySelector('iframe') as HTMLIFrameElement;

      // Content waits for the preview page, never in an inherited-CSP srcdoc
      expect(component['pendingDoc']).toContain(userJs);
      expect(iframe.srcdoc).toBe('');

      // But iframe should be sandboxed (preventing top navigation)
      expect(iframe.hasAttribute('sandbox')).toBe(true);
      expect(iframe.getAttribute('sandbox')).not.toContain('allow-top-navigation');
    });
  });

  describe('card snapshot capture', () => {
    it('does not add allow-same-origin to the live preview iframe', async () => {
      component.updatePreview(
        '<div id="snap">Hi</div>',
        'body { color: red; }',
        'alert(1)',
        null,
        []
      );
      const live = fixture.nativeElement.querySelector('iframe') as HTMLIFrameElement;
      expect(live.getAttribute('sandbox')).not.toContain('allow-same-origin');
    });

    it('captures from a scriptless same-origin iframe and removes it', async () => {
      const sandboxes: string[] = [];
      const nativeCreate = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation(
        (tagName: string, options?: string | ElementCreationOptions) => {
          const el = nativeCreate(tagName, options as ElementCreationOptions);
          if (tagName.toLowerCase() === 'iframe') {
            const iframe = el as HTMLIFrameElement;
            const nativeSet = iframe.setAttribute.bind(iframe);
            iframe.setAttribute = (name: string, value: string) => {
              nativeSet(name, value);
              if (name === 'sandbox') sandboxes.push(value);
            };
          }
          return el;
        }
      );

      component.updatePreview(
        '<div id="snap">Hi</div>',
        'body { color: red; }',
        'alert(1)',
        null,
        []
      );
      await (
        component as unknown as {
          captureJpeg: () => Promise<Blob | null>;
        }
      ).captureJpeg();

      expect(sandboxes).toContain(CAPTURE_IFRAME_SANDBOX);
      expect(sandboxes.every((value) => !value.includes('allow-scripts'))).toBe(true);
      expect(document.querySelectorAll('iframe[aria-hidden="true"]').length).toBe(0);

      const live = fixture.nativeElement.querySelector('iframe') as HTMLIFrameElement;
      expect(live.getAttribute('sandbox')).not.toContain('allow-same-origin');
    });
  });
});

describe('dataUrlToBlob', () => {
  it('decodes a JPEG data URL without fetch', async () => {
    const dataUrl = 'data:image/jpeg;base64,QQ==';
    const blob = dataUrlToBlob(dataUrl);
    expect(blob.type).toBe('image/jpeg');
    expect(blob.size).toBe(1);
    expect(await blob.text()).toBe('A');
  });

  it('rejects a string that is not a data URL', () => {
    expect(() => dataUrlToBlob('not-a-data-url')).toThrow('Invalid data URL');
  });
});

describe('buildPreviewSrcdoc', () => {
  it('loads CDN scripts before snippet JS so top-level code can use them', () => {
    const doc = buildPreviewSrcdoc({
      html: '<div></div>',
      css: '',
      js: 'window.__usesLib = _.VERSION;',
      cdnResources: [{ resourceType: 'js', url: 'https://cdnjs.cloudflare.com/lib.js' }],
      includeRuntime: true,
    });
    const cdnAt = doc.indexOf('<script src="https://cdnjs.cloudflare.com/lib.js">');
    const userAt = doc.indexOf('window.__usesLib');
    expect(cdnAt).toBeGreaterThan(-1);
    expect(cdnAt).toBeLessThan(userAt);
  });

  it('includes runtime JS only when requested', () => {
    const withRuntime = buildPreviewSrcdoc({
      html: '<div id="box">Hi</div>',
      css: 'body { color: red; }',
      js: 'window.__snippy = 1',
      includeRuntime: true,
    });
    const forCapture = buildPreviewSrcdoc({
      html: '<div id="box">Hi</div>',
      css: 'body { color: red; }',
      js: 'window.__snippy = 1',
      includeRuntime: false,
    });

    expect(withRuntime).toContain('window.__snippy = 1');
    expect(withRuntime).toContain('snippy-console');
    expect(forCapture).toContain('<div id="box">Hi</div>');
    expect(forCapture).toContain('body { color: red; }');
    expect(forCapture).not.toContain('window.__snippy = 1');
    expect(forCapture).not.toContain('snippy-console');
  });
});
