import { TestBed } from '@angular/core/testing';
import { FileTokenService } from '@app/services/data/file-token.service';
import { PocketBaseService } from '@app/services/data/pocketbase.service';

/** Unsigned JWT-shaped token with an `exp` claim, enough for `isTokenExpired`. */
function fakeToken(expSeconds: number): string {
  const payload = btoa(JSON.stringify({ exp: expSeconds }));
  return `x.${payload}.y`;
}

describe('FileTokenService', () => {
  let authListeners: Array<() => void>;
  let pb: {
    authStore: { isValid: boolean; onChange: (cb: () => void) => void };
    files: { getToken: ReturnType<typeof vi.fn> };
  };
  let service: FileTokenService;
  const future = () => Math.floor(Date.now() / 1000) + 3600;

  beforeEach(() => {
    authListeners = [];
    pb = {
      authStore: { isValid: true, onChange: (cb) => authListeners.push(cb) },
      files: { getToken: vi.fn().mockResolvedValue(fakeToken(future())) },
    };
    TestBed.configureTestingModule({
      providers: [{ provide: PocketBaseService, useValue: { pb } }],
    });
    service = TestBed.inject(FileTokenService);
  });

  it('leaves public snapshot URLs untouched', () => {
    expect(service.snapshotSrc('/api/files/s/1/a.png', false)).toBe('/api/files/s/1/a.png');
  });

  it('hides private snapshots until a token is loaded, then appends it', async () => {
    expect(service.snapshotSrc('/api/files/s/1/a.png', true)).toBe('');
    await service.ensure();
    const token = service.token()!;
    expect(service.snapshotSrc('/api/files/s/1/a.png', true)).toBe(
      `/api/files/s/1/a.png?token=${encodeURIComponent(token)}`
    );
  });

  it('reuses a fresh token and refetches when forced', async () => {
    await service.ensure();
    await service.ensure();
    expect(pb.files.getToken).toHaveBeenCalledTimes(1);
    await service.ensure(true);
    expect(pb.files.getToken).toHaveBeenCalledTimes(2);
  });

  it('refetches an expired token', async () => {
    pb.files.getToken.mockResolvedValueOnce(fakeToken(Math.floor(Date.now() / 1000) - 10));
    await service.ensure();
    await service.ensure();
    expect(pb.files.getToken).toHaveBeenCalledTimes(2);
  });

  it('skips the request when signed out and clears the token on auth change', async () => {
    await service.ensure();
    expect(service.token()).not.toBeNull();
    authListeners.forEach((cb) => cb());
    expect(service.token()).toBeNull();
    pb.authStore.isValid = false;
    await service.ensure();
    expect(pb.files.getToken).toHaveBeenCalledTimes(1);
  });
});
