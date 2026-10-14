import { Component, HostListener, inject, ChangeDetectionStrategy } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PreviewConsoleService } from '@app/services/ui/preview-console.service';

@Component({
  selector: 'app-preview-console-panel',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './preview-console-panel.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './preview-console-panel.component.scss',
})
export class PreviewConsolePanelComponent {
  console = inject(PreviewConsoleService);

  private resizing = false;
  private startY = 0;
  private startHeight = 0;

  formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  onResizeStart(event: PointerEvent) {
    event.preventDefault();
    this.resizing = true;
    this.startY = event.clientY;
    this.startHeight = this.console.height();
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  @HostListener('document:pointermove', ['$event'])
  onPointerMove(event: PointerEvent) {
    if (!this.resizing) return;
    // Dragging upward increases height
    const delta = this.startY - event.clientY;
    this.console.setHeight(this.startHeight + delta);
  }

  @HostListener('document:pointerup')
  @HostListener('document:pointercancel')
  onPointerUp() {
    this.resizing = false;
  }
}
