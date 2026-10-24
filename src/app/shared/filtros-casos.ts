import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FILTRO_VACIO, FiltroCasos } from '../core/casos-filtro';
import { UsuarioResumen } from '../models/models';

@Component({
  selector: 'app-filtros-casos',
  imports: [FormsModule],
  template: `
    <div class="toolbar glass">
      <input class="buscar" type="search" placeholder="Buscar por equipo, serie, cliente, técnico o #caso"
             [ngModel]="f().texto" (ngModelChange)="set('texto', $event)" />
      <select [ngModel]="f().estado" (ngModelChange)="set('estado', $event)">
        <option value="">Todo estado</option>
        <option value="RECIBIDO">Recibido</option><option value="EN_ANALISIS">En análisis</option>
        <option value="EN_REPARACION">En reparación</option><option value="FINALIZADO">Finalizado</option>
        <option value="DEVUELTO">Devuelto</option>
      </select>
      <select [ngModel]="f().prioridad" (ngModelChange)="set('prioridad', $event)">
        <option value="">Toda urgencia</option>
        <option value="CRITICA">Crítica</option><option value="ALTA">Alta</option>
        <option value="MEDIA">Media</option><option value="BAJA">Baja</option>
      </select>
      <select [ngModel]="f().tipo" (ngModelChange)="set('tipo', $event)">
        <option value="">Todo tipo de equipo</option>
        @for (t of tipos(); track t) { <option [value]="t">{{ t }}</option> }
      </select>
      <select [ngModel]="f().canal" (ngModelChange)="set('canal', $event)">
        <option value="">Llegó por: todos</option>
        <option value="ONLINE">En línea</option><option value="PRESENCIAL">Mostrador</option>
      </select>
      <select [ngModel]="f().tecnico" (ngModelChange)="set('tecnico', $event)">
        <option value="">Todo técnico</option>
        <option value="SIN">Falta técnico</option>
        @for (t of tecnicos(); track t.id) { <option [value]="'' + t.id">{{ t.nombre }}</option> }
      </select>
      <select [ngModel]="f().orden" (ngModelChange)="set('orden', $event)">
        <option value="id-desc">Orden: # más nuevo</option>
        <option value="id-asc">Orden: # más antiguo</option>
        <option value="prio-asc">Orden: más urgente</option>
        <option value="prio-desc">Orden: menos urgente</option>
        <option value="tipo-asc">Orden: tipo A-Z</option>
        <option value="fecha-desc">Orden: fecha reciente</option>
      </select>
    </div>
  `
})
export class FiltrosCasos {
  readonly tipos = input<string[]>([]);
  readonly tecnicos = input<UsuarioResumen[]>([]);
  readonly cambio = output<FiltroCasos>();
  protected readonly f = signal<FiltroCasos>({ ...FILTRO_VACIO });

  protected set(campo: keyof FiltroCasos, valor: string): void {
    this.f.update(x => ({ ...x, [campo]: valor }));
    this.cambio.emit(this.f());
  }
}
