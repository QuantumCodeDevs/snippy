import { SnippetList } from './snippet-list';

export interface Collection {
  collectionId?: string;
  containsSnippet?: boolean;
  description?: string | null;
  displayName?: string;
  isOwner?: boolean;
  isPrivate?: boolean;
  name?: string;
  shortId?: string;
  snippetCount?: number;
  snippets?: Array<SnippetList>;
  userName?: string;
}
