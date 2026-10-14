import { Component, ChangeDetectionStrategy } from '@angular/core';
import { EmbedPlayerComponent } from '@app/components/embed/embed-player/embed-player.component';

@Component({
  selector: 'app-embed-player-page',
  imports: [EmbedPlayerComponent],
  template: `<app-embed-player class="h-full w-full block"></app-embed-player>`,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        width: 100%;
      }
    `,
  ],
})
export class EmbedPlayerPageComponent {}
