import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { SnippyApi } from '@app/services/data/snippy-api.service';
import { Comment as PenComment } from '@app/models/base-models/comment';
import { SnackbarService } from '@app/services/ui/snackbar.service';
import { SnippetStoreService } from '@app/services/stores/snippet.store.service';
import { DialogService } from '@app/services/ui/dialog.service';
import { AuthStoreService } from '@app/services/stores/auth.store.service';

export interface CommentDialogData {
  snippetId: string;
  snippetName: string;
  snippetDescription?: string | null;
  ownerUserName?: string;
  isSnippetOwner: boolean;
}

@Component({
  selector: 'app-comment-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTooltipModule,
    RouterModule,
  ],
  templateUrl: './comment-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class CommentDialogComponent implements OnInit {
  dialogRef = inject(MatDialogRef<CommentDialogComponent>);
  data = inject<CommentDialogData>(MAT_DIALOG_DATA);

  private api = inject(SnippyApi);
  private snippetStoreService = inject(SnippetStoreService);
  private snackbarService = inject(SnackbarService);
  private dialogService = inject(DialogService);
  private authStore = inject(AuthStoreService);

  comments = signal<PenComment[]>([]);
  totalCount = signal(0);
  loading = signal(false);
  posting = signal(false);
  replyTo = signal<PenComment | null>(null);

  newComment = '';
  mentionQuery = signal<string | null>(null);
  editingCommentId = signal<string | null>(null);
  editContent = '';

  get isAuthenticated() {
    return this.authStore.isAuthenticated;
  }

  ngOnInit(): void {
    this.loadComments();
  }

  async loadComments() {
    this.loading.set(true);
    try {
      const res = await this.api.getComments(this.data.snippetId, 200);
      this.comments.set(res.comments ?? []);
      this.totalCount.set(res.totalCount ?? 0);
    } catch {
      this.snackbarService.error('Failed to load comments');
    } finally {
      this.loading.set(false);
    }
  }

  roots(): PenComment[] {
    return this.comments().filter((c) => !c.parentId);
  }

  repliesOf(parentId: string | undefined): PenComment[] {
    if (!parentId) return [];
    return this.comments().filter((c) => c.parentId === parentId);
  }

  mentionSuggestions(): string[] {
    const q = this.mentionQuery();
    if (q == null) return [];
    const names = new Set<string>();
    for (const c of this.comments()) {
      if (c.userName) names.add(c.userName);
    }
    if (this.data.ownerUserName) names.add(this.data.ownerUserName);
    const needle = q.toLowerCase();
    return [...names].filter((n) => n.toLowerCase().includes(needle)).slice(0, 6);
  }

  onComposerInput() {
    const match = this.newComment.match(/@([A-Za-z0-9_-]*)$/);
    this.mentionQuery.set(match ? match[1] : null);
  }

  applyMention(userName: string) {
    this.newComment = this.newComment.replace(/@([A-Za-z0-9_-]*)$/, `@${userName} `);
    this.mentionQuery.set(null);
  }

  mentionParts(content: string | undefined): { text: string; user?: string }[] {
    if (!content) return [];
    const parts: { text: string; user?: string }[] = [];
    const re = /@([A-Za-z0-9_-]{2,32})/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content))) {
      if (m.index > last) parts.push({ text: content.slice(last, m.index) });
      parts.push({ text: m[0], user: m[1] });
      last = m.index + m[0].length;
    }
    if (last < content.length) parts.push({ text: content.slice(last) });
    return parts;
  }

  startReply(comment: PenComment) {
    this.replyTo.set(comment);
  }

  cancelReply() {
    this.replyTo.set(null);
  }

  async postComment() {
    const content = this.newComment.trim();
    if (!content || this.posting() || !this.isAuthenticated()) return;

    this.posting.set(true);
    try {
      const parent = this.replyTo();
      const res = await this.api.createComment(this.data.snippetId, {
        content,
        parentId: parent?.commentId,
      });
      if (res.comment) {
        this.comments.update((list) => [...list, res.comment!]);
      }
      this.totalCount.update((n) => n + 1);
      this.snippetStoreService.bumpCommentCount(this.data.snippetId, 1);
      this.newComment = '';
      this.replyTo.set(null);
      this.mentionQuery.set(null);
    } catch {
      this.snackbarService.error('Failed to post comment');
    } finally {
      this.posting.set(false);
    }
  }

  canEdit(comment: PenComment): boolean {
    return !!comment.isOwner;
  }

  canDelete(comment: PenComment): boolean {
    return !!comment.isOwner || this.data.isSnippetOwner;
  }

  startEdit(comment: PenComment) {
    if (!comment.commentId) return;
    this.editingCommentId.set(comment.commentId);
    this.editContent = comment.content ?? '';
  }

  cancelEdit() {
    this.editingCommentId.set(null);
    this.editContent = '';
  }

  async saveEdit(comment: PenComment) {
    const content = this.editContent.trim();
    if (!content) return;

    try {
      if (!comment.commentId) return;
      const res = await this.api.updateComment(comment.commentId, { content });
      if (res.comment) {
        this.comments.update((list) =>
          list.map((c) => (c.commentId === comment.commentId ? res.comment! : c))
        );
      }
      this.cancelEdit();
    } catch {
      this.snackbarService.error('Failed to update comment');
    }
  }

  deleteComment(comment: PenComment) {
    return this.dialogService.confirmAndRun({
      confirm: {
        title: 'Delete Comment',
        message: 'Are you sure you want to delete this comment? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
      action: async () => {
        await this.api.deleteComment(comment.commentId!);
        const hasReplies = this.comments().some((c) => c.parentId === comment.commentId);
        if (hasReplies) {
          this.comments.update((list) =>
            list.map((c) =>
              c.commentId === comment.commentId ? { ...c, isDeleted: true, content: '' } : c
            )
          );
        } else {
          this.comments.update((list) => list.filter((c) => c.commentId !== comment.commentId));
          this.totalCount.update((n) => Math.max(0, n - 1));
          this.snippetStoreService.bumpCommentCount(this.data.snippetId, -1);
        }
      },
      success: 'Comment deleted',
      error: 'Failed to delete comment',
    });
  }

  close() {
    this.dialogRef.close();
  }
}
