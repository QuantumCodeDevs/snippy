import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { User } from '@app/models';
import { SettingsPageComponent } from '@app/pages/settings-page/settings-page.component';
import { SnippyApi } from '@app/services/data/snippy-api.service';
import { AuthStoreService } from '@app/services/stores/auth.store.service';
import { SnackbarService } from '@app/services/ui/snackbar.service';

describe('SettingsPageComponent', () => {
  let component: SettingsPageComponent;
  let fixture: ComponentFixture<SettingsPageComponent>;
  let user: ReturnType<typeof signal<User | null>>;
  let updateUser: ReturnType<typeof vi.fn>;
  let snackbar: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    user = signal<User | null>({ userName: 'otter', displayName: 'Otter', bio: '' });
    updateUser = vi.fn(async (patch: Partial<User>) => ({ user: { ...user(), ...patch } }));
    snackbar = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [SettingsPageComponent],
      providers: [
        {
          provide: AuthStoreService,
          useValue: { user, setUserFromApi: (u: User) => user.set(u), logout: vi.fn() },
        },
        { provide: SnippyApi, useValue: { updateUser, checkUsername: vi.fn() } },
        { provide: SnackbarService, useValue: snackbar },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts clean', () => {
    expect(component.hasUnsavedChanges()).toBe(false);
    expect(component.canSave()).toBe(false);
  });

  it('sends only the fields that changed', async () => {
    component.bio = 'Hello';
    component.isPrivate = true;
    expect(component.hasUnsavedChanges()).toBe(true);
    await component.saveSettings();
    expect(updateUser).toHaveBeenCalledWith({
      displayName: 'Otter',
      bio: 'Hello',
      isPrivate: true,
    });
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it('will not save a username that is not confirmed available', async () => {
    component.bio = 'Hello';
    component.onUsernameInput('taken-name');
    component.usernameStatus.set('taken');
    expect(component.canSave()).toBe(false);
    expect(component.usernameBlocksSave()).toBe(true);
    await component.saveSettings();
    expect(updateUser).not.toHaveBeenCalled();

    component.usernameStatus.set('available');
    expect(component.canSave()).toBe(true);
  });

  it('keeps edits made while a save is in flight', async () => {
    let resolve!: (v: { user: User }) => void;
    updateUser.mockReturnValue(new Promise((r) => (resolve = r)));
    component.bio = 'First';
    const save = component.saveSettings();
    component.bio = 'Second';
    resolve({ user: { ...user()!, bio: 'First' } });
    await save;
    expect(component.bio).toBe('Second');
    expect(component.hasUnsavedChanges()).toBe(true);
  });

  it('shows the server reason when a save fails', async () => {
    updateUser.mockRejectedValue({ response: { message: 'Bio is too long' } });
    component.bio = 'x';
    await component.saveSettings();
    expect(snackbar.error).toHaveBeenCalledWith('Bio is too long');
  });

  it('warns before unload only when dirty', () => {
    const clean = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    component.onBeforeUnload(clean);
    expect(clean.defaultPrevented).toBe(false);

    component.bio = 'Hello';
    const dirty = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    component.onBeforeUnload(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });
});
