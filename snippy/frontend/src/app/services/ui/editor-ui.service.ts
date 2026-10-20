import { Injectable, computed, inject, signal } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

export type EditorLayout = 'top' | 'bottom' | 'left' | 'right';

/** One phone-width editor tab. Result is the live preview under the tabs. */
export type MobilePane = 'html' | 'css' | 'js' | 'result';

export const MOBILE_PANES: readonly MobilePane[] = ['html', 'css', 'js', 'result'];

export type MobilePaneVisibility = Record<MobilePane, boolean>;

/** Code panes that can take keyboard focus. Result is preview-only. */
export type FocusablePane = Exclude<MobilePane, 'result'>;

/** Code tabs. The preview is a split, not one of these. */
export const MOBILE_CODE_PANES: readonly FocusablePane[] = ['html', 'css', 'js'];

const COMPACT_QUERY = '(max-width: 767px)';
const PANES_KEY = 'editorPanes';

const DEFAULT_PANES: MobilePaneVisibility = {
  html: true,
  css: true,
  js: true,
  result: true,
};

@Injectable({ providedIn: 'root' })
export class EditorUiService {
  private breakpoints = inject(BreakpointObserver);

  readonly layout = signal<EditorLayout>(this.readStoredLayout());
  /** True on the public /try guest playground (no auth / no save). */
  readonly guestMode = signal(false);
  /** True while the snippet editor page is mounted (enables editor shortcuts). */
  readonly editorOpen = signal(false);

  /** Phone-width editor: one tab at a time instead of the desktop splits. */
  readonly isCompact = toSignal(
    this.breakpoints.observe(COMPACT_QUERY).pipe(map((state) => state.matches)),
    { initialValue: this.breakpoints.isMatched(COMPACT_QUERY) }
  );

  readonly panes = signal<MobilePaneVisibility>(this.readStoredPanes());
  /** Code tab selected above the preview. Ignored while the desktop splits are showing. */
  readonly activePane = signal<FocusablePane>(this.firstCodePane(this.panes()));
  /** Set when a shortcut asks to focus a code pane that may still be hidden. */
  readonly pendingFocus = signal<FocusablePane | null>(null);

  /** Code tabs that are turned on. The preview is not a tab. */
  readonly visiblePanes = computed(() => MOBILE_CODE_PANES.filter((pane) => this.panes()[pane]));

  //#region Layout

  /** Persist pane layout (`top` / `bottom` / `left` / `right`). */
  setLayout(layout: EditorLayout) {
    this.layout.set(layout);
    localStorage.setItem('editorLayout', layout);
  }

  /** Read the last saved layout, defaulting to `top`. */
  private readStoredLayout(): EditorLayout {
    const saved = localStorage.getItem('editorLayout') as EditorLayout | null;
    if (saved === 'top' || saved === 'bottom' || saved === 'left' || saved === 'right') {
      return saved;
    }
    return 'top';
  }

  //#endregion Layout

  //#region Compact panes

  /**
   * Show or hide a compact-editor pane. The last code tab stays on.
   * The preview can be hidden on its own. Returns false when the change is refused.
   */
  setPaneEnabled(pane: MobilePane, enabled: boolean): boolean {
    const current = this.panes();
    if (current[pane] === enabled) return true;
    if (!enabled && pane !== 'result' && this.codeCount(current) <= 1) return false;

    const next = { ...current, [pane]: enabled };
    this.panes.set(next);
    this.persistPanes(next);
    if (!enabled && pane !== 'result' && this.activePane() === pane) {
      this.activePane.set(this.firstCodePane(next));
    }
    return true;
  }

  /** Flip one tab. Refuses to turn off the last visible pane. */
  togglePane(pane: MobilePane): boolean {
    return this.setPaneEnabled(pane, !this.panes()[pane]);
  }

  /** Select a code tab, or show the preview, turning that pane on if it was hidden. */
  showPane(pane: MobilePane) {
    if (!this.panes()[pane]) this.setPaneEnabled(pane, true);
    if (pane !== 'result') this.activePane.set(pane);
  }

  /** Select a code tab and ask the compact editor to focus it once it is visible. */
  requestFocus(pane: FocusablePane) {
    this.showPane(pane);
    this.pendingFocus.set(pane);
  }

  clearPendingFocus() {
    this.pendingFocus.set(null);
  }

  private codeCount(panes: MobilePaneVisibility): number {
    return MOBILE_CODE_PANES.reduce((count, id) => count + (panes[id] ? 1 : 0), 0);
  }

  private firstCodePane(panes: MobilePaneVisibility): FocusablePane {
    return MOBILE_CODE_PANES.find((id) => panes[id]) ?? 'html';
  }

  private persistPanes(panes: MobilePaneVisibility) {
    localStorage.setItem(PANES_KEY, JSON.stringify(panes));
  }

  private readStoredPanes(): MobilePaneVisibility {
    try {
      const raw = localStorage.getItem(PANES_KEY);
      if (!raw) return { ...DEFAULT_PANES };
      const parsed = JSON.parse(raw) as Partial<MobilePaneVisibility>;
      const panes: MobilePaneVisibility = {
        html: parsed.html !== false,
        css: parsed.css !== false,
        js: parsed.js !== false,
        result: parsed.result !== false,
      };
      if (this.codeCount(panes) === 0) return { ...DEFAULT_PANES };
      return panes;
    } catch {
      return { ...DEFAULT_PANES };
    }
  }

  //#endregion Compact panes

  //#region Guest mode

  /** Mark the editor as the unauthenticated `/try` playground. */
  setGuestMode(guest: boolean) {
    this.guestMode.set(guest);
  }

  //#endregion Guest mode
}
