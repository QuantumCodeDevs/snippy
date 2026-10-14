import { CdnResource } from '../extra-models/cdnLibrary';
import { SnippetFile } from './snippet-file';

export interface Snippet {
  cdnResources?: Array<CdnResource>;
  commentCount?: number;
  description?: string | null;
  displayName?: string | null;
  embedCount?: number;
  favoriteCount?: number;
  forkCount?: number;
  isFavorited?: boolean;
  isOwner?: boolean;
  isPrivate?: boolean;
  name?: string;
  parentDeleted?: boolean;
  parentName?: string | null;
  parentShortId?: string | null;
  parentUserName?: string | null;
  shareToken?: string | null;
  shortId?: string;
  snapshotUrl?: string | null;
  snippetFiles?: Array<SnippetFile>;
  snippetId?: string | null;
  tags?: Array<string> | null;
  updatedAt?: string;
  userName?: string;
  viewCount?: number;
}
