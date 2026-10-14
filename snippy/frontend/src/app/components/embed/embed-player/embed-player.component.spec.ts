import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { EmbedPlayerComponent } from './embed-player.component';
import { SnippyApi } from '@app/services/data/snippy-api.service';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('EmbedPlayerComponent - Timer Loop Security Tests', () => {
  let component: EmbedPlayerComponent;
  let fixture: ComponentFixture<EmbedPlayerComponent>;
  let mockApi: { getSnippetByShortId: ReturnType<typeof vi.fn> };
  let mockActivatedRoute: any;

  beforeEach(async () => {
    // Create mock API
    mockApi = {
      getSnippetByShortId: vi.fn().mockName('SnippyApi.getSnippetByShortId'),
    };
    mockApi.getSnippetByShortId.mockResolvedValue({
      snippet: {
        shortId: 'test123',
        snippetFiles: [
          { fileType: 'html', content: '<div>Test</div>' },
          { fileType: 'css', content: 'body { color: red; }' },
          { fileType: 'js', content: 'console.log("test");' },
        ],
        cdnResources: [],
      },
    });

    // Create mock ActivatedRoute with paramMap and queryParamMap
    mockActivatedRoute = {
      paramMap: of(convertToParamMap({ shortId: 'test123' })),
      queryParamMap: of(convertToParamMap({ 'default-tab': 'html,result' })),
    };

    await TestBed.configureTestingModule({
      imports: [EmbedPlayerComponent],
      providers: [
        { provide: SnippyApi, useValue: mockApi },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(EmbedPlayerComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    // Ensure cleanup after each test
    fixture.destroy();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('Security: Timer loop prevention with html-only configuration', () => {
    it('should not start refreshPreview when showResult is false (html-only tab)', fakeAsync(() => {
      // Simulate html-only configuration (the exploit scenario)
      mockActivatedRoute.queryParamMap = of(convertToParamMap({ 'default-tab': 'html' }));

      // Recreate component with html-only configuration
      fixture = TestBed.createComponent(EmbedPlayerComponent);
      component = fixture.componentInstance;

      // Verify showResult is false
      expect(component.showResult()).toBe(false);

      // Spy on setTimeout to detect timer scheduling
      vi.spyOn(window, 'setTimeout');

      // Trigger ngAfterViewInit
      fixture.detectChanges();
      component.ngAfterViewInit();

      // Verify that setTimeout was NOT called (no timer loop started)
      expect(window.setTimeout).not.toHaveBeenCalled();

      // Verify refreshTimeoutHandle remains null
      expect(component['refreshTimeoutHandle']).toBeNull();

      tick(1000); // Advance time to ensure no timers are pending
      flush();
    }));

    it('should not schedule recursive timeouts when preview is missing and showResult is false', fakeAsync(() => {
      // Set showResult to false
      component.showResult.set(false);
      component['preview'] = undefined;

      // Spy on setTimeout
      const setTimeoutSpy = vi.spyOn(window, 'setTimeout');

      // Call refreshPreview directly
      component['refreshPreview']();

      // Verify no timeout was scheduled
      expect(setTimeoutSpy).not.toHaveBeenCalled();
      expect(component['refreshTimeoutHandle']).toBeNull();

      tick(1000);
      flush();
    }));

    it('should cancel pending timeout on component destruction', fakeAsync(() => {
      // Set up component with result pane enabled
      fixture.detectChanges();
      component.showResult.set(true);
      component['preview'] = undefined; // Preview not yet available

      component.ngAfterViewInit();

      // Verify a timeout was scheduled
      expect(component['refreshTimeoutHandle']).not.toBeNull();

      // Spy on clearTimeout
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');

      // Destroy the component
      component.ngOnDestroy();

      // Verify clearTimeout was called
      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(component['refreshTimeoutHandle']).toBeNull();

      tick(1000);
      flush();
    }));

    it('should clear existing timeout before scheduling a new one', fakeAsync(() => {
      component.showResult.set(true);
      component['preview'] = undefined;

      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
      const setTimeoutSpy = vi.spyOn(window, 'setTimeout').mockReturnValue(123 as any);

      // First call to refreshPreview
      component['refreshPreview']();
      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
      expect(component['refreshTimeoutHandle']).toBe(123 as any);

      // Second call to refreshPreview should clear the first timeout
      setTimeoutSpy.mockReturnValue(456 as any);
      component['refreshPreview']();

      expect(clearTimeoutSpy).toHaveBeenCalledWith(123 as any);
      expect(setTimeoutSpy).toHaveBeenCalledTimes(2);
      expect(component['refreshTimeoutHandle']).toBe(456 as any);

      // Cleanup
      component.ngOnDestroy();
      flush();
    }));
  });

  describe('Security: Proper behavior with result pane enabled', () => {
    it('should start refreshPreview when showResult is true', fakeAsync(() => {
      // Default configuration includes result pane
      fixture.detectChanges();
      component.showResult.set(true);
      component['preview'] = undefined;

      const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
      component.ngAfterViewInit();

      // Verify setTimeout was called (timer loop started as expected)
      expect(setTimeoutSpy).toHaveBeenCalled();
      expect(component['refreshTimeoutHandle']).not.toBeNull();

      // Cleanup
      component.ngOnDestroy();
      flush();
    }));

    it('should call updatePreview when preview component is available', fakeAsync(() => {
      component.showResult.set(true);

      // Mock preview component
      const mockPreview = {
        updatePreview: vi.fn().mockName('SnippetPreviewComponent.updatePreview'),
      };
      component['preview'] = mockPreview as never;

      component['refreshPreview']();

      // Verify updatePreview was called
      expect(mockPreview.updatePreview).toHaveBeenCalled();
      expect(component['refreshTimeoutHandle']).toBeNull();

      tick();
      flush();
    }));

    it('should stop scheduling timeouts once preview is available', fakeAsync(() => {
      component.showResult.set(true);
      component['preview'] = undefined;

      const setTimeoutSpy = vi
        .spyOn(window, 'setTimeout')
        .mockImplementation((fn: TimerHandler) => {
          // Simulate preview becoming available after first timeout
          const mockPreview = {
            updatePreview: vi.fn().mockName('SnippetPreviewComponent.updatePreview'),
          };
          component['preview'] = mockPreview as never;
          if (typeof fn === 'function') {
            fn();
          }
          return 999;
        });

      component['refreshPreview']();

      // First call schedules timeout
      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);

      // After callback executes, preview is available, so no more timeouts
      tick(50);

      // Cleanup
      component.ngOnDestroy();
      flush();
    }));
  });

  describe('Security: Query parameter validation', () => {
    it('should correctly parse html-only tab configuration', fakeAsync(() => {
      mockActivatedRoute.queryParamMap = of(convertToParamMap({ 'default-tab': 'html' }));

      fixture = TestBed.createComponent(EmbedPlayerComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.enabledTabs()).toEqual(['html']);
      expect(component.showResult()).toBe(false);

      tick();
      flush();
    }));

    it('should correctly parse css-only tab configuration', fakeAsync(() => {
      mockActivatedRoute.queryParamMap = of(convertToParamMap({ 'default-tab': 'css' }));

      fixture = TestBed.createComponent(EmbedPlayerComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.enabledTabs()).toEqual(['css']);
      expect(component.showResult()).toBe(false);

      tick();
      flush();
    }));

    it('should correctly parse js-only tab configuration', fakeAsync(() => {
      mockActivatedRoute.queryParamMap = of(convertToParamMap({ 'default-tab': 'js' }));

      fixture = TestBed.createComponent(EmbedPlayerComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.enabledTabs()).toEqual(['js']);
      expect(component.showResult()).toBe(false);

      tick();
      flush();
    }));

    it('should correctly parse multiple tabs without result', fakeAsync(() => {
      mockActivatedRoute.queryParamMap = of(convertToParamMap({ 'default-tab': 'html,css,js' }));

      fixture = TestBed.createComponent(EmbedPlayerComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.enabledTabs()).toEqual(['html', 'css', 'js']);
      expect(component.showResult()).toBe(false);

      tick();
      flush();
    }));

    it('should include result pane when result tab is specified', fakeAsync(() => {
      mockActivatedRoute.queryParamMap = of(convertToParamMap({ 'default-tab': 'html,result' }));

      fixture = TestBed.createComponent(EmbedPlayerComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.enabledTabs()).toContain('result');
      expect(component.showResult()).toBe(true);

      // Let the snippet load settle before destroying, so a late refresh cannot reschedule.
      tick();
      component.ngOnDestroy();
      flush();
    }));
  });

  describe('Security: Resource consumption prevention', () => {
    it('should not create memory leak with multiple component instantiations', fakeAsync(() => {
      const components: EmbedPlayerComponent[] = [];
      const fixtures: ComponentFixture<EmbedPlayerComponent>[] = [];

      // Create multiple components with html-only configuration
      for (let i = 0; i < 5; i++) {
        mockActivatedRoute.queryParamMap = of(convertToParamMap({ 'default-tab': 'html' }));

        const testFixture = TestBed.createComponent(EmbedPlayerComponent);
        const testComponent = testFixture.componentInstance;
        testFixture.detectChanges();

        components.push(testComponent);
        fixtures.push(testFixture);
      }

      // Verify no timeouts were scheduled for any component
      components.forEach((comp) => {
        expect(comp['refreshTimeoutHandle']).toBeNull();
      });

      // Destroy all components
      fixtures.forEach((fix) => fix.destroy());

      tick(1000);
      flush();
    }));

    it('should handle rapid component creation and destruction without timer leaks', fakeAsync(() => {
      const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');

      // Create and destroy component multiple times
      for (let i = 0; i < 3; i++) {
        mockActivatedRoute.queryParamMap = of(convertToParamMap({ 'default-tab': 'html,result' }));

        const testFixture = TestBed.createComponent(EmbedPlayerComponent);
        const testComponent = testFixture.componentInstance;

        testFixture.detectChanges();
        testComponent.showResult.set(true);
        testComponent['preview'] = undefined;
        testComponent.ngAfterViewInit();

        // Verify timeout was scheduled
        expect(testComponent['refreshTimeoutHandle']).not.toBeNull();

        // Destroy immediately
        testComponent.ngOnDestroy();
        testFixture.destroy();

        // Verify timeout was cleared
        expect(clearTimeoutSpy).toHaveBeenCalled();
        expect(testComponent['refreshTimeoutHandle']).toBeNull();
      }

      // Verify clearTimeout was called at least as many times as setTimeout
      expect(vi.mocked(clearTimeoutSpy).mock.calls.length).toBeGreaterThanOrEqual(
        vi.mocked(setTimeoutSpy).mock.calls.length
      );
    }));
  });

  describe('Functional: Normal operation with mitigation in place', () => {
    it('should update preview when editable and code changes', fakeAsync(() => {
      component.showResult.set(true);
      component.editable.set(true);

      const mockPreview = {
        updatePreview: vi.fn().mockName('SnippetPreviewComponent.updatePreview'),
      };
      component['preview'] = mockPreview as never;

      component.onCodeChange('html', '<div>New content</div>');

      expect(component.html()).toBe('<div>New content</div>');
      expect(mockPreview.updatePreview).toHaveBeenCalled();

      tick();
      flush();
    }));

    it('should not update code when not editable', fakeAsync(() => {
      component.editable.set(false);
      component.html.set('original');

      component.onCodeChange('html', 'modified');

      expect(component.html()).toBe('original');

      tick();
      flush();
    }));

    it('should handle rerun action correctly', fakeAsync(() => {
      component.showResult.set(true);
      const mockPreview = {
        updatePreview: vi.fn().mockName('SnippetPreviewComponent.updatePreview'),
      };
      component['preview'] = mockPreview as never;

      const initialTick = component.previewTick();
      component.rerun();

      expect(component.previewTick()).toBe(initialTick + 1);
      expect(mockPreview.updatePreview).toHaveBeenCalled();

      tick();
      flush();
    }));
  });
});
