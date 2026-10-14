import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { userInitials } from '@app/utils/user-initials';

@Component({
  selector: 'app-user-identity-header',
  imports: [],
  templateUrl: './user-identity-header.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './user-identity-header.component.scss',
})
export class UserIdentityHeaderComponent {
  @Input() pictureUrl: string | null | undefined;
  @Input() displayName: string | null | undefined;
  @Input() userName: string | null | undefined;
  @Input() bio: string | null | undefined;
  @Input() followerCount?: number;
  @Input() followingCount?: number;
  @Input() showStats = false;

  get initials(): string {
    return userInitials(this.userName, this.displayName);
  }
}
