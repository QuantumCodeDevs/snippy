export interface SnippetList {
  commentCount?: number;
  description?: string | null;
  displayName?: string;
  embedCount?: number;
  favoriteCount?: number;
  forkCount?: number;
  isFavorited?: boolean;
  isFollowing?: boolean;
  isOwner?: boolean;
  name?: string;
  parentDeleted?: boolean;
  parentName?: string | null;
  parentShortId?: string | null;
  parentUserName?: string | null;
  shortId?: string;
  snapshotUrl?: string | null;
  snippetId?: string;
  tags?: Array<string> | null;
  updatedAt?: string;
  userName?: string;
  viewCount?: number;
}
