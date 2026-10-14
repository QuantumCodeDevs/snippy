import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SnippyApi } from '@app/services/data/snippy-api.service';

import { CommentDialogComponent } from '@app/components/dialogs/comment-dialog/comment-dialog.component';

describe('CommentDialogComponent', () => {
  let component: CommentDialogComponent;
  let fixture: ComponentFixture<CommentDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommentDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: { close: () => undefined } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { snippetId: '1', snippetName: 'Snippet', isSnippetOwner: false },
        },
        {
          provide: SnippyApi,
          useValue: { getComments: vi.fn().mockResolvedValue({ comments: [], totalCount: 0 }) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CommentDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
