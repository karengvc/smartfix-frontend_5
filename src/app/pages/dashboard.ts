import { Component, OnInit, inject, signal } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { EquipoService } from '../core/equipo.service';
import { IncidenciaService } from '../core/incidencia.service';
import { MantenimientoService } from '../core/mantenimiento.service';
import { ESTADOS_INCIDENCIA, EstadoIncidencia, Incidencia } from '../models/models';

@Component({
  template: `
    <h1>Dashboard</h1>
    <p class="muted">Resumen general del sistema.</p>

    <div class="cards">
      <div class="card stat">
        <span class="stat-label">Equipos registrados</span>
        <span class="stat-value">{{ equipos() ?? '—' }}</span>
      </div>
      <div class="card stat">
        <span class="stat-label">Incidencias abiertas</span>
        <span class="stat-value">{{ abiertas() ?? '—' }}</span>
      </div>
      <div class="card stat">
        <span class="stat-label">Mantenimientos</span>
        <span class="stat-value">{{ mantenimientos() ?? '—' }}</span>
      </div>
    </div>

    <div class="card">
      <h2>Incidencias por estado</h2>
      @if (incidencias() === null) {
        <p class="muted">No se pudo cargar el servicio de incidencias.</p>
      } @else {
        @for (e of estados; track e) {
          <div class="bar-row">
            <span class="bar-label">{{ e }}</span>
            <div class="bar"><div class="bar-fill" [style.width.%]="porcentaje(e)"></div></div>
            <span class="bar-num">{{ contar(e) }}</span>
          </div>
        }
      }
    </div>
  `
})
export class Dashboard implements OnInit {
  private readonly equipoSrv = inject(EquipoService);
  private readonly incidenciaSrv = inject(IncidenciaService);
  private readonly mantenimientoSrv = inject(MantenimientoService);

  protected readonly estados = ESTADOS_INCIDENCIA;
  protected readonly equipos = signal<number | null>(null);
  protected readonly mantenimientos = signal<number | null>(null);
  protected readonly incidencias = signal<Incidencia[] | null>(null);
  protected readonly abiertas = signal<number | null>(null);

  ngOnInit(): void {
    forkJoin({
      e: this.equipoSrv.listar().pipe(catchError(() => of(null))),
      i: this.incidenciaSrv.listar().pipe(catchError(() => of(null))),
      m: this.mantenimientoSrv.listar().pipe(catchError(() => of(null)))
    }).subscribe(r => {
      this.equipos.set(r.e ? r.e.length : null);
      this.mantenimientos.set(r.m ? r.m.length : null);
      this.incidencias.set(r.i);
      this.abiertas.set(r.i ? r.i.filter(x => x.estado !== 'CERRADA').length : null);
    });
  }

  protected contar(estado: EstadoIncidencia): number {
    return (this.incidencias() ?? []).filter(i => i.estado === estado).length;
  }

  protected porcentaje(estado: EstadoIncidencia): number {
    const total = this.incidencias()?.length ?? 0;
    return total === 0 ? 0 : (this.contar(estado) * 100) / total;
  }
}
