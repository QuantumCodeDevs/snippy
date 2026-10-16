import { Injectable, computed, signal } from '@angular/core';

/** Requests shorter than this never flash the bar. */
export const ACTIVITY_SHOW_DELAY_MS = 150;

/**
 * Counts in-flight work (API requests, lazy route loads) so the shell can show
 * one thin progress bar for anything that takes noticeable time. Individual
 * buttons still show their own spinners; this covers everything else.
 */
@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly pending = signal(0);
  private readonly delayed = signal(false);
  private timer: ReturnType<typeof setTimeout> | null = null;

  /** True while work has been pending for longer than the show delay. */
  readonly busy = computed(() => this.pending() > 0 && this.delayed());

  /** Mark one unit of work started; call the returned function exactly once when done. */
  start(): () => void {
    this.pending.update((n) => n + 1);
    if (!this.timer && !this.delayed()) {
      this.timer = setTimeout(() => {
        this.timer = null;
        if (this.pending() > 0) this.delayed.set(true);
      }, ACTIVITY_SHOW_DELAY_MS);
    }
    let done = false;
    return () => {
      if (done) return;
      done = true;
      this.pending.update((n) => Math.max(0, n - 1));
      if (this.pending() === 0) {
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
        this.delayed.set(false);
      }
    };
  }

  /** Run `work` while counted as pending. */
  async track<T>(work: () => Promise<T>): Promise<T> {
    const done = this.start();
    try {
      return await work();
    } finally {
      done();
    }
  }
}
