import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { LoginPageComponent } from '@app/pages/auth/login-page.component';
import { authErrorMessage } from '@app/pages/auth/auth-errors';
import { AuthStoreService } from '@app/services/stores/auth.store.service';

describe('authErrorMessage', () => {
  it('prefers the server message, then the error message, then the fallback', () => {
    expect(authErrorMessage({ response: { message: 'Bad creds' } }, 'x')).toBe('Bad creds');
    expect(authErrorMessage(new Error('Network down'), 'x')).toBe('Network down');
    expect(authErrorMessage(undefined, 'Fallback')).toBe('Fallback');
  });

  it('reports a closed OAuth popup as cancelled', () => {
    expect(authErrorMessage({ isAbort: true, message: 'manually cancelled' }, 'x')).toMatch(
      /cancelled/
    );
  });
});

describe('LoginPageComponent', () => {
  let fixture: ComponentFixture<LoginPageComponent>;
  let el: HTMLElement;
  const auth = {
    oauthProviders: signal([{ name: 'github', displayName: 'GitHub' }]),
    login: vi.fn(),
    loginWithProvider: vi.fn(),
    cancelProviderLogin: vi.fn(),
  };

  beforeEach(async () => {
    Object.values(auth).forEach(
      (v) => typeof v === 'function' && 'mockReset' in v && v.mockReset()
    );
    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [{ provide: AuthStoreService, useValue: auth }],
    }).compileComponents();
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  function button(label: string): HTMLButtonElement {
    return Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(label)
    )!;
  }

  it('shows a spinner on Log in while the password login runs', async () => {
    let resolve!: () => void;
    auth.login.mockReturnValue(new Promise<void>((r) => (resolve = r)));
    fixture.componentInstance.email = 'a@b.c';
    fixture.componentInstance.password = 'secret123';

    void fixture.componentInstance.submit();
    fixture.detectChanges();
    const submit = button('Logging in');
    expect(submit).toBeTruthy();
    expect(submit.querySelector('mat-spinner')).toBeTruthy();
    expect(submit.getAttribute('aria-busy')).toBe('true');
    expect(button('Continue with GitHub').disabled).toBe(true);

    resolve();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(button('Log in').querySelector('mat-spinner')).toBeNull();
  });

  it('shows a spinner on the provider button and a cancel option during OAuth', async () => {
    auth.loginWithProvider.mockReturnValue(new Promise(() => undefined));
    button('Continue with GitHub').click();
    fixture.detectChanges();

    const github = button('Waiting for GitHub');
    expect(github.querySelector('mat-spinner')).toBeTruthy();
    expect(github.getAttribute('aria-busy')).toBe('true');
    expect(button('Log in').querySelector('mat-spinner')).toBeNull();
    expect(el.querySelector('[role="status"]')?.textContent).toContain('popup window');

    button('Cancel').click();
    expect(auth.cancelProviderLogin).toHaveBeenCalled();
  });

  it('clears the spinner and explains when the popup is closed', async () => {
    auth.loginWithProvider.mockRejectedValue({ isAbort: true });
    button('Continue with GitHub').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(button('Continue with GitHub').querySelector('mat-spinner')).toBeNull();
    expect(el.querySelector('[role="alert"]')?.textContent).toMatch(/cancelled/);
  });
});
