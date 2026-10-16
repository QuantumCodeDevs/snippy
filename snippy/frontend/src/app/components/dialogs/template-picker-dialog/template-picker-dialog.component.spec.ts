import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { TemplatePickerDialogComponent } from '@app/components/dialogs/template-picker-dialog/template-picker-dialog.component';
import { SNIPPET_TEMPLATES } from '@app/editor/snippet-templates';
import { SnippyApi } from '@app/services/data/snippy-api.service';

describe('TemplatePickerDialogComponent', () => {
  let fixture: ComponentFixture<TemplatePickerDialogComponent>;
  const close = vi.fn();
  const api = { getMyTemplates: vi.fn(), getSnippetByShortId: vi.fn() };

  async function create() {
    await TestBed.configureTestingModule({
      imports: [TemplatePickerDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: { close } },
        { provide: SnippyApi, useValue: api },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TemplatePickerDialogComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => {
    close.mockReset();
    api.getMyTemplates.mockReset();
    api.getSnippetByShortId.mockReset();
  });

  function section(el: HTMLElement, id: string) {
    return el.querySelector(`section[aria-labelledby="${id}"]`) as HTMLElement;
  }

  it('lists every starter with language badges', async () => {
    api.getMyTemplates.mockResolvedValue([]);
    const el = await create();
    const cards = section(el, 'picker-starters').querySelectorAll('.tpl-card');
    expect(cards.length).toBe(SNIPPET_TEMPLATES.length);
    expect(cards[1].textContent).toContain('Hello Snippy');
    expect(cards[1].textContent).toContain('HTML');
  });

  it('explains how to make a template when the user has none', async () => {
    api.getMyTemplates.mockResolvedValue([]);
    const el = await create();
    expect(section(el, 'picker-yours').textContent).toContain('Use as template');
  });

  it('shows a retry when loading templates fails', async () => {
    api.getMyTemplates.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([]);
    const el = await create();
    const yours = section(el, 'picker-yours');
    expect(yours.querySelector('[role="alert"]')?.textContent).toContain('Could not load');
    yours.querySelector<HTMLButtonElement>('button')!.click();
    await fixture.whenStable();
    expect(api.getMyTemplates).toHaveBeenCalledTimes(2);
  });

  it('closes with a starter when one is picked', async () => {
    api.getMyTemplates.mockResolvedValue([]);
    const el = await create();
    section(el, 'picker-starters').querySelectorAll<HTMLButtonElement>('.tpl-card')[2].click();
    expect(close).toHaveBeenCalledWith(SNIPPET_TEMPLATES[2]);
  });

  it('loads a user template’s files before closing with a copy of them', async () => {
    api.getMyTemplates.mockResolvedValue([
      { snippetId: 'id1', shortId: 'tpl0001', name: 'Card kit', tags: ['ui'] },
    ]);
    api.getSnippetByShortId.mockResolvedValue({
      shortId: 'tpl0001',
      name: 'Card kit',
      snippetFiles: [{ fileType: 'html', content: '<div class="card"></div>' }],
      cdnResources: [{ resourceType: 'css', url: 'https://cdn.example/a.css' }],
    });
    const el = await create();
    const card = section(el, 'picker-yours').querySelector<HTMLButtonElement>('.tpl-card')!;
    expect(card.textContent).toContain('Card kit');
    expect(card.textContent).toContain('#ui');

    card.click();
    fixture.detectChanges();
    expect(card.getAttribute('aria-busy')).toBe('true');
    await fixture.whenStable();

    expect(api.getSnippetByShortId).toHaveBeenCalledWith('tpl0001');
    expect(close).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'user',
        name: 'Card kit',
        html: '<div class="card"></div>',
        cdnResources: [{ resourceType: 'css', url: 'https://cdn.example/a.css' }],
      })
    );
  });

  it('filters both sections once there are enough templates to search', async () => {
    api.getMyTemplates.mockResolvedValue([
      { shortId: 't1', name: 'Pricing table' },
      { shortId: 't2', name: 'Navbar' },
    ]);
    const el = await create();
    const input = el.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = 'grid';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(section(el, 'picker-starters').querySelectorAll('.tpl-card').length).toBe(1);
    expect(section(el, 'picker-yours').textContent).toContain('No templates match');
  });

  it('Start blank closes with the blank starter', async () => {
    api.getMyTemplates.mockResolvedValue([]);
    const el = await create();
    const blank = Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes('Start blank')
    )!;
    blank.click();
    expect(close).toHaveBeenCalledWith(expect.objectContaining({ id: 'blank' }));
  });
});
