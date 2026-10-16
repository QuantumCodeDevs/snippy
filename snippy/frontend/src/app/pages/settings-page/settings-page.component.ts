import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  inject,
  signal,
  untracked,
  ChangeDetectionStrategy,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, catchError, from } from 'rxjs';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { EditorView } from 'codemirror';
import { Compartment, EditorState } from '@codemirror/state';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { AuthStoreService } from '@app/services/stores/auth.store.service';
import { SnippyApi } from '@app/services/data/snippy-api.service';
import { SnackbarService } from '@app/services/ui/snackbar.service';
import { DialogService } from '@app/services/ui/dialog.service';
import { EditorPreferencesService } from '@app/editor/editor-preferences.service';
import {
  EDITOR_FONT_KEYS,
  EDITOR_KEYMAP_KEYS,
  EditorFontKey,
  EditorPreferences,
  FONT_FAMILY_LABELS,
  mergeEditorPreferences,
} from '@app/editor/editor-preferences';
import { EDITOR_THEMES } from '@app/editor/themes';
import { ShortcutListComponent } from '@app/components/ui/shortcut-list/shortcut-list.component';
import { baseEditorExtensions, buildPreferenceExtensions } from '@app/editor/codemirror-extensions';

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'current';
type PreviewLang = 'html' | 'css' | 'js';

const PREVIEW_SAMPLES: Record<PreviewLang, string> = {
  html: `<div class="card">
  <h1>Hello Snippy</h1>
  <p>Edit preferences and watch this preview update.</p>
</div>`,
  css: `.card {
  padding: 1rem;
  border-radius: 8px;
  background: #1e293b;
  color: #e2e8f0;
}

h1 {
  margin: 0 0 0.5rem;
  color: #38bdf8;
}`,
  js: `function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('Snippy'));`,
};

@Component({
  selector: 'app-settings-page',
  imports: [
    ShortcutListComponent,
    FormsModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatSelectModule,
    MatRadioModule,
    MatCheckboxModule,
    MatSlideToggleModule,
  ],
  templateUrl: './settings-page.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './settings-page.component.scss',
})
export class SettingsPageComponent implements OnInit, AfterViewInit, OnDestroy {
  private authStore = inject(AuthStoreService);
  private api = inject(SnippyApi);
  private snackbar = inject(SnackbarService);
  private dialogService = inject(DialogService);
  private editorPrefsService = inject(EditorPreferencesService);
  private destroyRef = inject(DestroyRef);

  @ViewChild('previewHost') previewHost?: ElementRef<HTMLDivElement>;
  @ViewChild('pictureInput') pictureInput?: ElementRef<HTMLInputElement>;

  readonly avatarFallback = 'https://www.gravatar.com/avatar/?d=mp';
  private readonly maxPictureBytes = 5 * 1024 * 1024;

  get user() {
    return this.authStore.user;
  }

  // Profile tab
  displayName = '';
  bio = '';
  profileSaving = signal(false);
  pictureUploading = signal(false);
  pictureRemoving = signal(false);

  get avatarPreviewUrl(): string {
    return this.user()?.pictureUrl || this.avatarFallback;
  }

  // Account tab
  userName = '';
  usernameStatus = signal<UsernameStatus>('idle');
  usernameSaving = signal(false);
  isPrivate = false;
  privacySaving = signal(false);
  deleting = signal(false);

  // Editor tab
  editorDraft: EditorPreferences = mergeEditorPreferences(undefined);
  editorSaving = signal(false);
  previewLang: PreviewLang = 'html';
  readonly fontKeys = EDITOR_FONT_KEYS;
  readonly fontLabels = FONT_FAMILY_LABELS;
  readonly themes = EDITOR_THEMES;
  readonly darkThemes = EDITOR_THEMES.filter((t) => t.group === 'dark');
  readonly lightThemes = EDITOR_THEMES.filter((t) => t.group === 'light');
  readonly keymapKeys = EDITOR_KEYMAP_KEYS;
  /** Profile=0, Editor=1, Account=2 */
  readonly editorTabIndex = 1;

  private usernameCheck$ = new Subject<string>();
  private hydratedUserName: string | null = null;
  private previewView?: EditorView;
  private prefsCompartment = new Compartment();
  private langCompartment = new Compartment();

  constructor() {
    effect(() => {
      const u = this.user();
      if (!u) {
        this.hydratedUserName = null;
        return;
      }
      if (this.hydratedUserName === u.userName) return;
      if (this.isProfileDirty() || this.isUsernameDirty() || this.isPrivacyDirty()) return;
      this.hydrateFromUser();
    });

    effect(() => {
      const prefs = this.editorPrefsService.preferences();
      const view = untracked(() => this.previewView);
      if (!view) return;
      view.dispatch({
        effects: this.prefsCompartment.reconfigure(buildPreferenceExtensions(prefs)),
      });
    });
  }

  isProfileDirty(): boolean {
    const u = this.user();
    if (!u) return false;
    return this.displayName !== (u.displayName ?? '') || this.bio !== (u.bio ?? '');
  }

  isUsernameDirty(): boolean {
    const u = this.user();
    return !!u && this.userName.trim() !== u.userName;
  }

  isPrivacyDirty(): boolean {
    const u = this.user();
    return !!u && this.isPrivate !== !!u.isPrivate;
  }

  isEditorDirty(): boolean {
    const saved = mergeEditorPreferences(this.user()?.editorPreferences);
    return JSON.stringify(this.editorDraft) !== JSON.stringify(saved);
  }

  canSaveUsername(): boolean {
    const status = this.usernameStatus();
    return (
      this.isUsernameDirty() &&
      (status === 'available' || status === 'current') &&
      !this.usernameSaving()
    );
  }

  usernameStatusLabel(): string {
    switch (this.usernameStatus()) {
      case 'checking':
        return 'Checking availability';
      case 'available':
        return 'Username is available';
      case 'taken':
        return 'Username is taken';
      case 'invalid':
        return 'Enter at least 2 characters';
      case 'current':
        return 'This is your current username';
      default:
        return '';
    }
  }

  ngOnInit(): void {
    this.hydrateFromUser();

    this.usernameCheck$
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((name) => {
          const trimmed = name.trim();
          const current = this.user()?.userName ?? '';
          if (!trimmed || trimmed.length < 2) {
            this.usernameStatus.set('invalid');
            return of(null);
          }
          if (trimmed === current) {
            this.usernameStatus.set('current');
            return of(null);
          }
          this.usernameStatus.set('checking');
          return from(this.api.checkUsername(trimmed)).pipe(
            catchError(() => {
              this.usernameStatus.set('invalid');
              return of(null);
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res) => {
        if (!res) return;
        this.usernameStatus.set(res.available ? 'available' : 'taken');
      });
  }

  ngAfterViewInit() {
    setTimeout(() => this.initPreview(), 0);
  }

  ngOnDestroy() {
    this.previewView?.destroy();
    this.editorPrefsService.clearLocal();
  }

  onSettingsTabChange(index: number) {
    if (index === this.editorTabIndex) {
      setTimeout(() => this.initPreview(), 0);
    }
  }

  private hydrateFromUser() {
    const u = this.user();
    if (!u) return;
    this.displayName = u.displayName ?? '';
    this.bio = u.bio ?? '';
    this.userName = u.userName ?? '';
    this.isPrivate = !!u.isPrivate;
    this.usernameStatus.set('current');
    this.hydratedUserName = u.userName ?? null;
    this.editorDraft = mergeEditorPreferences(u.editorPreferences);
    this.editorPrefsService.clearLocal();
  }

  onUsernameInput(value: string) {
    this.userName = value;
    this.usernameCheck$.next(value);
  }

  onEditorDraftChange() {
    this.editorDraft = {
      ...this.editorDraft,
      fontSize: Math.min(24, Math.max(10, Number(this.editorDraft.fontSize) || 15)),
      indentWidth: Math.min(8, Math.max(1, Number(this.editorDraft.indentWidth) || 2)),
    };
    this.editorPrefsService.applyLocal({ ...this.editorDraft });
  }

  setPreviewLang(lang: PreviewLang) {
    this.previewLang = lang;
    if (!this.previewView) return;
    this.previewView.dispatch({
      effects: this.langCompartment.reconfigure(this.languageExtension(lang)),
      changes: {
        from: 0,
        to: this.previewView.state.doc.length,
        insert: PREVIEW_SAMPLES[lang],
      },
    });
  }

  fontLabel(key: EditorFontKey): string {
    return this.fontLabels[key];
  }

  private initPreview() {
    if (!this.previewHost || this.previewView) return;
    const prefs = this.editorPrefsService.preferences();
    this.previewView = new EditorView({
      state: EditorState.create({
        doc: PREVIEW_SAMPLES[this.previewLang],
        extensions: [
          ...baseEditorExtensions(),
          this.prefsCompartment.of(buildPreferenceExtensions(prefs)),
          this.langCompartment.of(this.languageExtension(this.previewLang)),
          EditorState.readOnly.of(true),
          EditorView.contentAttributes.of({ 'aria-label': 'Editor theme preview (read-only)' }),
        ],
      }),
      parent: this.previewHost.nativeElement,
    });
  }

  private languageExtension(lang: PreviewLang) {
    switch (lang) {
      case 'css':
        return css();
      case 'js':
        return javascript();
      default:
        return html();
    }
  }

  triggerPictureUpload() {
    this.pictureInput?.nativeElement.click();
  }

  async onPictureSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.pictureUploading()) return;

    if (file.size > this.maxPictureBytes) {
      this.snackbar.error('Maximum file size is 5 MB');
      return;
    }

    this.pictureUploading.set(true);
    try {
      const res = await this.api.uploadProfilePicture(file);
      if (res?.user) {
        this.authStore.setUserFromApi(res.user);
      }
      this.snackbar.success('Profile image updated');
    } catch {
      this.snackbar.error('Failed to upload profile image');
    } finally {
      this.pictureUploading.set(false);
    }
  }

  async removePicture() {
    if (!this.user()?.pictureUrl || this.pictureRemoving()) return;
    this.pictureRemoving.set(true);
    try {
      const res = await this.api.updateUser({ pictureUrl: null });
      if (res?.user) {
        this.authStore.setUserFromApi(res.user);
      }
      this.snackbar.success('Profile image removed');
    } catch {
      this.snackbar.error('Failed to remove profile image');
    } finally {
      this.pictureRemoving.set(false);
    }
  }

  async saveProfile() {
    if (!this.isProfileDirty() || this.profileSaving()) return;
    this.profileSaving.set(true);
    try {
      const res = await this.api.updateUser({
        displayName: this.displayName.trim(),
        bio: this.bio.trim() || null,
      });
      if (res?.user) {
        this.authStore.setUserFromApi(res.user);
        this.hydrateFromUser();
      }
      this.snackbar.success('Profile updated');
    } catch {
      this.snackbar.error('Failed to update profile');
    } finally {
      this.profileSaving.set(false);
    }
  }

  async saveUsername() {
    if (!this.canSaveUsername()) return;
    this.usernameSaving.set(true);
    try {
      const res = await this.api.updateUser({ userName: this.userName.trim() });
      if (res?.user) {
        this.authStore.setUserFromApi(res.user);
        this.hydrateFromUser();
      }
      this.snackbar.success('Username updated');
    } catch {
      this.snackbar.error('Failed to update username');
    } finally {
      this.usernameSaving.set(false);
    }
  }

  async savePrivacy() {
    if (!this.isPrivacyDirty() || this.privacySaving()) return;
    this.privacySaving.set(true);
    try {
      const res = await this.api.updateUser({ isPrivate: this.isPrivate });
      if (res?.user) {
        this.authStore.setUserFromApi(res.user);
        this.hydrateFromUser();
      }
      this.snackbar.success(this.isPrivate ? 'Account is now private' : 'Account is now public');
    } catch {
      this.snackbar.error('Failed to update privacy');
    } finally {
      this.privacySaving.set(false);
    }
  }

  async saveEditorPreferences() {
    if (!this.isEditorDirty() || this.editorSaving()) return;
    this.editorSaving.set(true);
    try {
      const res = await this.api.updateUser({
        editorPreferences: { ...this.editorDraft },
      });
      if (res?.user) {
        this.authStore.setUserFromApi(res.user);
        this.editorDraft = mergeEditorPreferences(res.user.editorPreferences);
        this.editorPrefsService.clearLocal();
      }
      this.snackbar.success('Editor preferences saved');
    } catch {
      this.snackbar.error('Failed to save editor preferences');
    } finally {
      this.editorSaving.set(false);
    }
  }

  async confirmDeleteAccount() {
    const deleted = await this.dialogService.confirmAndRun({
      confirm: {
        title: 'Delete account',
        message:
          'This permanently deletes your account, snippets, collections, and assets. This cannot be undone.',
        confirmText: 'Delete account',
        cancelText: 'Cancel',
      },
      action: async () => {
        this.deleting.set(true);
        await this.api.deleteUser();
      },
      success: 'Account deleted',
      error: 'Failed to delete account',
    });

    if (deleted) {
      this.authStore.logout();
    } else {
      this.deleting.set(false);
    }
  }
}
