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
      save: ReturnType<typeof vi.fn>;
      clear: ReturnType<typeof vi.fn>;
    };
    send: ReturnType<typeof vi.fn>;
    files: { getURL: ReturnType<typeof vi.fn> };
    collection: ReturnType<typeof vi.fn>;
  };
  let session: ReturnType<typeof vi.fn<() => Promise<unknown>>>;

  function create(): AuthStoreService {
    TestBed.configureTestingModule({
      providers: [
        { provide: PocketBaseService, useValue: { pb } },
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
      ],
    });
    return TestBed.inject(AuthStoreService);
  }

  function sessionCalls() {
    return pb.send.mock.calls.filter(([path]) => path === '/api/snippy/session').length;
  }

  beforeEach(() => {
    session = vi
      .fn<() => Promise<unknown>>()
      .mockResolvedValue({ record: { id: 'u1', username: 'otter' } });
    pb = {
      authStore: {
        isValid: true,
        record: { id: 'u1' },
        onChange: () => {},
        save: vi.fn(),
        clear: vi.fn(),
      },
      send: vi.fn((path: string) =>
        path === '/api/snippy/session' ? session() : Promise.resolve({})
      ),
      files: { getURL: vi.fn().mockReturnValue('') },
      collection: vi.fn(),
    };
  });

  it('stores the record from the session cookie without a token', async () => {
    const auth = create();
    await auth.refreshSession();
    expect(pb.authStore.save).toHaveBeenCalledWith('', { id: 'u1', username: 'otter' });
  });

  it('signs out when the server has no session', async () => {
    session.mockResolvedValue({ record: null });
    const auth = create();
    await auth.refreshUserFromBackend();
    expect(pb.authStore.clear).toHaveBeenCalled();
  });

  it('keeps the session on a network error', async () => {
    session.mockRejectedValue({ status: 0 });
    const auth = create();
    await auth.refreshUserFromBackend();
    expect(pb.authStore.clear).not.toHaveBeenCalled();
  });

  it('renews at most once an hour', async () => {
    const auth = create();
    await auth.refreshSession();
    await auth.refreshSession();
    expect(sessionCalls()).toBe(1);
  });

  it('expires the cookie on logout', async () => {
    const auth = create();
    await auth.logout();
    expect(pb.authStore.clear).toHaveBeenCalled();
    expect(pb.send).toHaveBeenCalledWith('/api/snippy/logout', { method: 'POST' });
    expect(auth.user()).toBeNull();
  });
});
