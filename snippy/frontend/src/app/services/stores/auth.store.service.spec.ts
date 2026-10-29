import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthStoreService } from '@app/services/stores/auth.store.service';
import { PocketBaseService } from '@app/services/data/pocketbase.service';

describe('AuthStoreService session refresh', () => {
  let pb: {
    authStore: {
      isValid: boolean;
      record: { id: string } | null;
      onChange: (cb: () => void, fire?: boolean) => void;
      clear: ReturnType<typeof vi.fn>;
    };
    send: ReturnType<typeof vi.fn>;
    files: { getURL: ReturnType<typeof vi.fn> };
    collection: ReturnType<typeof vi.fn>;
  };
  let authRefresh: ReturnType<typeof vi.fn>;

  function create(): AuthStoreService {
    TestBed.configureTestingModule({
      providers: [
        { provide: PocketBaseService, useValue: { pb } },
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
      ],
    });
    return TestBed.inject(AuthStoreService);
  }

  beforeEach(() => {
    authRefresh = vi.fn().mockResolvedValue({ record: { id: 'u1', username: 'otter' } });
    pb = {
      authStore: {
        isValid: true,
        record: { id: 'u1' },
        onChange: () => {},
        clear: vi.fn(),
      },
      send: vi.fn().mockResolvedValue({}),
      files: { getURL: vi.fn().mockReturnValue('') },
      collection: vi.fn().mockReturnValue({ authRefresh }),
    };
  });

  it('renews the token on startup', async () => {
    create();
    await vi.waitFor(() => expect(authRefresh).toHaveBeenCalledTimes(1));
  });

  it('skips the refresh when there is no valid token', async () => {
    pb.authStore.isValid = false;
    const auth = create();
    await auth.refreshSession();
    expect(authRefresh).not.toHaveBeenCalled();
    expect(auth.user()).toBeNull();
  });

  it('keeps the session on a network error', async () => {
    authRefresh.mockRejectedValue({ status: 0 });
    const auth = create();
    await auth.refreshUserFromBackend();
    expect(pb.authStore.clear).not.toHaveBeenCalled();
  });

  it('signs out when the server rejects the token', async () => {
    authRefresh.mockRejectedValue({ status: 401 });
    const auth = create();
    await auth.refreshUserFromBackend();
    expect(pb.authStore.clear).toHaveBeenCalled();
    expect(auth.user()).toBeNull();
  });

  it('renews at most once an hour', async () => {
    const auth = create();
    await vi.waitFor(() => expect(authRefresh).toHaveBeenCalledTimes(1));
    await auth.refreshSession();
    expect(authRefresh).toHaveBeenCalledTimes(1);
  });
});
