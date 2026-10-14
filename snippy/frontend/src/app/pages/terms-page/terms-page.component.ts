import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-terms-page',
  imports: [RouterLink],
  templateUrl: './terms-page.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class TermsPageComponent {}
