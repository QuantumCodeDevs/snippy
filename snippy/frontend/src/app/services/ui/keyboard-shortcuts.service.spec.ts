import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AuthStoreService } from '@app/services/stores/auth.store.service';
import { DialogService } from '@app/services/ui/dialog.service';
import { EditorCommandsService } from '@app/services/ui/editor-commands.service';
import { EditorUiService } from '@app/services/ui/editor-ui.service';
import { KeyboardShortcutsService } from '@app/services/ui/keyboard-shortcuts.service';
import { NavigationService } from '@app/services/ui/navigation.service';

describe('KeyboardShortcutsService', () => {
  let service: KeyboardShortcutsService;
  const editorOpen = signal(true);
  const openDialogs: unknown[] = [];
  const authenticated = signal(true);
  const commands = {
    hasSnippet: vi.fn(() => true),
    save: vi.fn(),
    exportZip: vi.fn(),
    openSettings: vi.fn(),
    toggleConsole: vi.fn(),
    rerunPreview: vi.fn(),
    formatPane: vi.fn(),
    focusPane: vi.fn(),
  };
  const dialogs = { open: vi.fn() };
  const navigation = { toNewSnippet: vi.fn() };
  const router = { navigate: vi.fn() };

  beforeEach(() => {
    editorOpen.set(true);
    authenticated.set(true);
    openDialogs.length = 0;
    Object.values(commands).forEach((fn) => fn.mockClear());
    commands.hasSnippet.mockReturnValue(true);
    dialogs.open.mockClear();
    navigation.toNewSnippet.mockClear();
    router.navigate.mockClear();
    TestBed.configureTestingModule({
      providers: [
        { provide: EditorCommandsService, useValue: commands },
        { provide: EditorUiService, useValue: { editorOpen } },
        { provide: DialogService, useValue: dialogs },
        {
          provide: MatDialog,
          useValue: { openDialogs, getDialogById: () => undefined },
        },
        { provide: AuthStoreService, useValue: { isAuthenticated: authenticated } },
        { provide: NavigationService, useValue: navigation },
        { provide: Router, useValue: router },
      ],
    });
    service = TestBed.inject(KeyboardShortcutsService);
  });

  function press(init: KeyboardEventInit, target?: HTMLElement) {
    const event = new KeyboardEvent('keydown', { cancelable: true, bubbles: true, ...init });
    if (target) Object.defineProperty(event, 'target', { value: target });
    const handled = service.handle(event);
    return { handled, prevented: event.defaultPrevented };
  }

  it('saves on Ctrl+S and prevents the browser save dialog', () => {
    expect(press({ key: 's', ctrlKey: true })).toEqual({ handled: true, prevented: true });
    expect(commands.save).toHaveBeenCalled();
  });

  it.each([
    [{ key: 'e', ctrlKey: true }, 'exportZip'],
    [{ key: ',', ctrlKey: true }, 'openSettings'],
    [{ key: '`', code: 'Backquote', ctrlKey: true }, 'toggleConsole'],
    [{ key: 'Enter', code: 'Enter', altKey: true }, 'rerunPreview'],
    [{ key: 'F', code: 'KeyF', altKey: true, shiftKey: true }, 'formatPane'],
  ] as [KeyboardEventInit, keyof typeof commands][])('%o runs %s', (init, command) => {
    expect(press(init).handled).toBe(true);
    expect(commands[command]).toHaveBeenCalled();
  });

  it('focuses panes with Ctrl+Alt+1/2/3', () => {
    press({ key: '2', code: 'Digit2', ctrlKey: true, altKey: true });
    expect(commands.focusPane).toHaveBeenCalledWith('css');
  });

  it('ignores editor shortcuts outside the editor and lets the browser handle them', () => {
    editorOpen.set(false);
    expect(press({ key: 's', ctrlKey: true })).toEqual({ handled: false, prevented: false });
    expect(commands.save).not.toHaveBeenCalled();
  });

  it('opens the command palette even while another dialog is open', () => {
    openDialogs.push({});
    expect(press({ key: 'k', ctrlKey: true }).handled).toBe(true);
    expect(dialogs.open).toHaveBeenCalled();
    expect(press({ key: 's', ctrlKey: true }).handled).toBe(false);
  });

  it('does not open the shortcuts list when ? is typed into a field', () => {
    const input = document.createElement('input');
    expect(press({ key: '?', shiftKey: true }, input).handled).toBe(false);
    expect(press({ key: '?', shiftKey: true }).handled).toBe(true);
    expect(dialogs.open).toHaveBeenCalledTimes(1);
  });

  it('new snippet goes to the editor when signed in and /try for guests', () => {
    press({ key: 'n', code: 'KeyN', altKey: true });
    expect(navigation.toNewSnippet).toHaveBeenCalled();
    authenticated.set(false);
    press({ key: 'n', code: 'KeyN', altKey: true });
    expect(router.navigate).toHaveBeenCalledWith(['/try']);
  });

  it('ignores auto-repeat and IME composition', () => {
    expect(press({ key: 's', ctrlKey: true, repeat: true }).handled).toBe(false);
    expect(press({ key: 's', ctrlKey: true, isComposing: true }).handled).toBe(false);
  });
});
