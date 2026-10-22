import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { CONFIG } from './config';
import { CrudService } from './crud.service';
import { EstadoIncidencia, Incidencia } from '../models/models';

@Injectable({ providedIn: 'root' })
export class IncidenciaService extends CrudService<Incidencia> {
  constructor() {
    super(CONFIG.api.incidencias, CONFIG.mock.incidencias, [
      { id: 1, titulo: 'La impresora no imprime', descripcion: 'Atasco de papel recurrente', prioridad: 'MEDIA', estado: 'REPORTADA', fechaReporte: '2026-10-18', equipoId: 2, tecnicoId: null },
      { id: 2, titulo: 'Laptop se apaga sola', descripcion: 'Se apaga a los 10 minutos de uso', prioridad: 'ALTA', estado: 'EN_PROCESO', fechaReporte: '2026-10-17', equipoId: 1, tecnicoId: 2 }
    ]);
  }

  cambiarEstado(id: number, estado: EstadoIncidencia): Observable<Incidencia> {
    if (this.mock) {
      const item = this.store.find(i => i.id === id);
      if (!item) return throwError(() => new Error('No existe'));
      item.estado = estado;
      return of({ ...item }).pipe(delay(150));
    }
    return this.http.patch<Incidencia>(`${this.base}/${id}/estado`, { estado });
  }

  asignar(id: number, tecnicoId: number): Observable<Incidencia> {
    if (this.mock) {
      const item = this.store.find(i => i.id === id);
      if (!item) return throwError(() => new Error('No existe'));
      item.tecnicoId = tecnicoId;
      return of({ ...item }).pipe(delay(150));
    }
    return this.http.patch<Incidencia>(`${this.base}/${id}/asignacion`, { tecnicoId });
  }

  protected override antesDeCrear(item: Incidencia): Incidencia {
    return {
      ...item,
      estado: 'REPORTADA',
      fechaReporte: new Date().toISOString().substring(0, 10)
    };
  }
}
