import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy-policy-page',
  imports: [RouterLink],
  templateUrl: './privacy-policy-page.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class PrivacyPolicyPageComponent {}
