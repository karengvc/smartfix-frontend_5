import { Component, inject } from '@angular/core';
import { NotifyService } from '../core/notify.service';

@Component({
  selector: 'app-toast',
  template: `
    <div class="toasts">
      @for (a of notify.avisos(); track a.id) {
        <div class="toast" [class.toast-error]="a.tipo === 'error'" (click)="notify.cerrar(a.id)">
          {{ a.texto }}
        </div>
      }
    </div>
  `
})
export class Toast {
  protected readonly notify = inject(NotifyService);
}
