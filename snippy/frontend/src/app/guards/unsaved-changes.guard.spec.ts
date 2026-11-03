import { EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { unsavedChangesGuard } from '@app/guards/unsaved-changes.guard';
import { SnippetStoreService } from '@app/services/stores/snippet.store.service';
import { DialogService } from '@app/services/ui/dialog.service';

describe('unsavedChangesGuard', () => {
  let snippetDirty: boolean;
  let confirm: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    snippetDirty = false;
    confirm = vi.fn().mockResolvedValue(false);
    TestBed.configureTestingModule({
      providers: [
        { provide: SnippetStoreService, useValue: { isDirty: () => snippetDirty } },
        { provide: DialogService, useValue: { confirm } },
      ],
    });
  });

  function run(component: unknown) {
    return runInInjectionContext(TestBed.inject(EnvironmentInjector), () =>
      unsavedChangesGuard(
        component,
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
        {} as RouterStateSnapshot
      )
    );
  }

  it('asks a page that reports its own unsaved changes', async () => {
    snippetDirty = false;
    expect(await run({ hasUnsavedChanges: () => true })).toBe(false);
    expect(confirm).toHaveBeenCalled();
  });

  it('lets a clean page leave even when a snippet is dirty', () => {
    snippetDirty = true;
    expect(run({ hasUnsavedChanges: () => false })).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('falls back to the open snippet for editor pages', async () => {
    expect(run({})).toBe(true);
    snippetDirty = true;
    expect(await run({})).toBe(false);
    expect(confirm).toHaveBeenCalledTimes(1);
  });
});
