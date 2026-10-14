import { Injectable, signal } from '@angular/core';

export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error';

export interface ConsoleMessage {
  id: number;
  level: ConsoleLevel;
  text: string;
  timestamp: number;
}

const HEIGHT_KEY = 'snippy.consoleHeight';
const DEFAULT_HEIGHT = 160;
const MIN_HEIGHT = 80;
const MAX_HEIGHT = 400;

@Injectable({ providedIn: 'root' })
export class PreviewConsoleService {
  readonly open = signal(false);
  readonly messages = signal<ConsoleMessage[]>([]);
  readonly height = signal(this.readStoredHeight());

  readonly minHeight = MIN_HEIGHT;
  readonly maxHeight = MAX_HEIGHT;

  private nextId = 1;

  //#region Panel

  /** Toggle the console drawer. */
  toggle() {
    this.open.update((v) => !v);
  }

  /** Open or close the console drawer. */
  setOpen(open: boolean) {
    this.open.set(open);
  }

  /** Clamp and persist the drawer height. */
  setHeight(height: number) {
    const clamped = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(height)));
    this.height.set(clamped);
    try {
      localStorage.setItem(HEIGHT_KEY, String(clamped));
    } catch {
      /* ignore */
    }
  }

  /** Drop all captured messages. */
  clear() {
    this.messages.set([]);
  }

  //#endregion Panel

  //#region Messages

  /** Append a console line from the preview iframe (keeps the last 200). */
  append(level: ConsoleLevel, args: unknown[]) {
    const text = args.map((a) => this.stringify(a)).join(' ');
    this.messages.update((list) =>
      [
        ...list,
        {
          id: this.nextId++,
          level,
          text,
          timestamp: Date.now(),
        },
      ].slice(-200)
    );
  }

  /** Restore a clamped height from localStorage. */
  private readStoredHeight(): number {
    try {
      const raw = localStorage.getItem(HEIGHT_KEY);
      const n = raw ? Number(raw) : DEFAULT_HEIGHT;
      if (!Number.isFinite(n)) return DEFAULT_HEIGHT;
      return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, n));
    } catch {
      return DEFAULT_HEIGHT;
    }
  }

  /** Best-effort stringify for console arguments. */
  private stringify(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value instanceof Error) return value.stack || value.message;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  //#endregion Messages
}
