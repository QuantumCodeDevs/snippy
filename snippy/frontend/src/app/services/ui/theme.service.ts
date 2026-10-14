import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';

export type AppTheme = 'light' | 'dark';

const STORAGE_KEY = 'snippy-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  readonly theme = signal<AppTheme>(this.resolve());

  constructor() {
    this.apply(this.theme());
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => {
      if (this.readStored()) return;
      const next = this.readSystem();
      this.theme.set(next);
      this.apply(next);
    };
    media.addEventListener('change', onChange);
    this.destroyRef.onDestroy(() => media.removeEventListener('change', onChange));
  }

  //#region Public API

  /** Flip between light and dark and persist the choice. */
  toggle(): void {
    this.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  /** Apply and persist an explicit theme. */
  set(theme: AppTheme): void {
    this.theme.set(theme);
    this.apply(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage can be blocked in private mode; the in-memory theme still applies.
    }
  }

  //#endregion Public API

  //#region Persistence

  /** Stored theme, else OS preference. */
  private resolve(): AppTheme {
    return this.readStored() ?? this.readSystem();
  }

  /** Read `snippy-theme` from localStorage, or null. */
  private readStored(): AppTheme | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // Ignore storage failures and fall through to the OS preference.
    }
    return null;
  }

  /** `prefers-color-scheme: light` → light, otherwise dark. */
  private readSystem(): AppTheme {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  /** Set `data-theme` and `color-scheme` on `<html>`. */
  private apply(theme: AppTheme): void {
    const root = this.document.documentElement;
    root.dataset['theme'] = theme;
    root.style.colorScheme = theme;
  }

  //#endregion Persistence
}
