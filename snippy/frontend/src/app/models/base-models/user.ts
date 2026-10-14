import { Asset } from './asset';
import { EditorPreferences } from './editor-preferences';

export interface User {
  assets?: Array<Asset>;
  bio?: string | null;
  displayName?: string | null;
  editorPreferences?: EditorPreferences;
  followerCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  isPrivate?: boolean;
  pictureUrl?: string | null;
  userName?: string;
}
