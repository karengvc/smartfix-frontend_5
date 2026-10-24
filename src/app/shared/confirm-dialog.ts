import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmService } from '../core/confirm.service';

@Component({
  selector: 'app-confirm',
  imports: [FormsModule],
  template: `
    @if (srv.abierta(); as c) {
      <div class="modal-fondo" (click)="cancelar()">
        <div class="modal glass-strong" (click)="$event.stopPropagation()">
          <h2>{{ c.titulo }}</h2>
          <p>{{ c.mensaje }}</p>
          @if (c.pideMotivo) {
            <textarea rows="3" maxlength="250" placeholder="Escribe el motivo" [ngModel]="motivo()" (ngModelChange)="motivo.set($event)"></textarea>
          }
          <div class="actions">
            <button class="btn" [class.btn-peligro]="c.peligro" [disabled]="c.pideMotivo && !motivo().trim()" (click)="aceptar(c.pideMotivo)">{{ c.boton }}</button>
            <button class="btn btn-light" (click)="cancelar()">Cancelar</button>
          </div>
        </div>
      </div>
    }
  `
})
export class ConfirmDialog {
  protected readonly srv = inject(ConfirmService);
  protected readonly motivo = signal('');

  protected aceptar(pideMotivo: boolean): void {
    const texto = pideMotivo ? this.motivo().trim() : 'ok';
    this.motivo.set('');
    this.srv.responder(texto);
  }

  protected cancelar(): void {
    this.motivo.set('');
    this.srv.responder(null);
  }
}
