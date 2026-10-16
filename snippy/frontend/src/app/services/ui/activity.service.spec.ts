import { TestBed } from '@angular/core/testing';
import { ACTIVITY_SHOW_DELAY_MS, ActivityService } from '@app/services/ui/activity.service';

describe('ActivityService', () => {
  let activity: ActivityService;

  beforeEach(() => {
    vi.useFakeTimers();
    activity = TestBed.inject(ActivityService);
  });

  afterEach(() => vi.useRealTimers());

  it('stays hidden for work that finishes before the show delay', () => {
    const done = activity.start();
    vi.advanceTimersByTime(ACTIVITY_SHOW_DELAY_MS - 10);
    done();
    vi.advanceTimersByTime(ACTIVITY_SHOW_DELAY_MS);
    expect(activity.busy()).toBe(false);
  });

  it('shows after the delay and hides once all work is done', () => {
    const a = activity.start();
    const b = activity.start();
    vi.advanceTimersByTime(ACTIVITY_SHOW_DELAY_MS);
    expect(activity.busy()).toBe(true);
    a();
    expect(activity.busy()).toBe(true);
    b();
    expect(activity.busy()).toBe(false);
  });

  it('ignores a done callback called twice', () => {
    const a = activity.start();
    const b = activity.start();
    vi.advanceTimersByTime(ACTIVITY_SHOW_DELAY_MS);
    a();
    a();
    expect(activity.busy()).toBe(true);
    b();
    expect(activity.busy()).toBe(false);
  });

  it('track() counts a promise until it settles, even when it rejects', async () => {
    let reject!: (e: Error) => void;
    const work = activity.track(() => new Promise((_, r) => (reject = r)));
    vi.advanceTimersByTime(ACTIVITY_SHOW_DELAY_MS);
    expect(activity.busy()).toBe(true);
    reject(new Error('boom'));
    await expect(work).rejects.toThrow('boom');
    expect(activity.busy()).toBe(false);
  });
});
