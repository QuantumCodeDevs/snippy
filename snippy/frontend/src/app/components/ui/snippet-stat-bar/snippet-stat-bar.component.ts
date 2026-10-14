import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface SnippetStats {
  viewCount?: number;
  favoriteCount?: number;
  commentCount?: number;
  embedCount?: number;
  forkCount?: number;
  isFavorited?: boolean;
}

/**
 * Views / favorites / comments actions. The `card` variant shows counts on
 * tonal buttons; the `toolbar` variant is the compact icon row in the editor
 * header, which also offers fork.
 */
@Component({
  selector: 'app-snippet-stat-bar',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './snippet-stat-bar.component.html',
})
export class SnippetStatBarComponent {
  @Input({ required: true }) stats!: SnippetStats;
  @Input() variant: 'card' | 'toolbar' = 'card';
  @Input() showFork = false;
  @Input() showForksList = false;
  @Output() favorite = new EventEmitter<Event>();
  @Output() comment = new EventEmitter<Event>();
  @Output() fork = new EventEmitter<Event>();
  @Output() forks = new EventEmitter<Event>();
}
