export interface Comment {
  commentId?: string;
  content?: string;
  createdAt?: string;
  displayName?: string;
  isDeleted?: boolean;
  isOwner?: boolean;
  mentions?: Array<string>;
  parentId?: string | null;
  updatedAt?: string;
  userName?: string;
}
