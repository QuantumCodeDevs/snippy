import {
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';

import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { User } from '@app/models/base-models/user';
import { Collection } from '@app/models/base-models/collection';
import { SnippyApi } from '@app/services/data/snippy-api.service';
import { FollowUiService } from '@app/services/ui/follow-ui.service';
import { NavigationService } from '@app/services/ui/navigation.service';
import { AuthStoreService } from '@app/services/stores/auth.store.service';
import { SnippetStoreService } from '@app/services/stores/snippet.store.service';
import { CollectionStoreService } from '@app/services/stores/collection.store.service';
import { SnippetListComponent } from '@app/components/lists/snippet-list/snippet-list.component';
import { CollectionListComponent } from '@app/components/lists/collection-list/collection-list.component';
import { UserIdentityHeaderComponent } from '@app/components/modules/user-identity-header/user-identity-header.component';
import { AsyncStateComponent } from '@app/components/async-state/async-state.component';
import { ListPageState } from '@app/utils/list-page-state';

@Component({
  selector: 'app-profile-page',
  imports: [
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    SnippetListComponent,
    CollectionListComponent,
    UserIdentityHeaderComponent,
    AsyncStateComponent,
  ],
  templateUrl: './profile-page.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class ProfilePageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private api = inject(SnippyApi);
  private followUi = inject(FollowUiService);
  private navigation = inject(NavigationService);
  authStoreService = inject(AuthStoreService);
  private snippetStoreService = inject(SnippetStoreService);
  private collectionStoreService = inject(CollectionStoreService);

  profileUser = signal<User | null>(null);
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  followLoading = signal(false);

  isSelf = computed(() => {
    const current = this.authStoreService.user();
    const profile = this.profileUser();
    return !!current && !!profile && current.userName === profile.userName;
  });

  private username = '';

  penState = new ListPageState(() => this.loadPens());
  collectionState = new ListPageState(() => this.loadCollections());

  get snippets() {
    return this.snippetStoreService.snippetList()?.snippets ?? [];
  }

  get total() {
    return this.snippetStoreService.snippetList()?.totalCount ?? 0;
  }

  get isLoadingPens() {
    return this.snippetStoreService.loading();
  }

  get collections(): Collection[] {
    return this.collectionStoreService.collections();
  }

  get collectionsTotal() {
    return this.collectionStoreService.totalCount();
  }

  get collectionsLoading() {
    return this.collectionStoreService.loading();
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const username = params.get('username');
      if (!username) return;
      this.penState.reset();
      this.collectionState.reset();
      this.loadProfile(username);
    });
  }

  async loadProfile(username: string) {
    this.username = username;
    this.loading.set(true);
    this.errorMessage.set(null);
    this.profileUser.set(null);

    try {
      const res = await this.api.getUserProfile(username);
      this.profileUser.set(res.user ?? null);
      await Promise.all([this.loadPens(), this.loadCollections()]);
    } catch (err: any) {
      if (err?.status === 403) {
        this.errorMessage.set(err?.error?.message || 'This profile is private.');
      } else if (err?.status === 404) {
        this.errorMessage.set('User not found.');
      } else {
        this.errorMessage.set('Failed to load profile.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  private async loadPens() {
    const { page, pageSize, query } = this.penState;
    try {
      await this.snippetStoreService.loadUserPublicSnippets(this.username, page, pageSize, query);
    } catch (error) {
      console.error('Error loading user snippets:', error);
    }
  }

  private async loadCollections() {
    const { page, pageSize, query } = this.collectionState;
    try {
      await this.collectionStoreService.loadUser(this.username, page, pageSize, query);
    } catch (error) {
      console.error('Error loading user collections:', error);
    }
  }

  async toggleFollow() {
    const user = this.profileUser();
    if (!user || this.followLoading()) return;

    if (!user.userName) return;
    this.followLoading.set(true);
    try {
      const nowFollowing = await this.followUi.toggle(user.userName, !!user.isFollowing);
      if (nowFollowing === null) return;

      this.profileUser.update((u) =>
        u
          ? {
              ...u,
              isFollowing: nowFollowing,
              followerCount: Math.max(0, (u.followerCount ?? 0) + (nowFollowing ? 1 : -1)),
            }
          : u
      );
    } finally {
      this.followLoading.set(false);
    }
  }

  openCollection(collection: Collection) {
    if (!collection.shortId) return;
    this.navigation.toCollection(collection.shortId);
  }
}
