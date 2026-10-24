import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CONFIG } from './config';
import { CrudService } from './crud.service';
import { EstadoIncidencia, HistorialIncidencia, Incidencia } from '../models/models';

@Injectable({ providedIn: 'root' })
export class IncidenciaService extends CrudService<Incidencia> {
  constructor() {
    super(CONFIG.api.incidencias, CONFIG.mock.incidencias, []);
  }

  tomar(id: number): Observable<Incidencia> {
    return this.http.patch<Incidencia>(`${this.base}/${id}/tomar`, {});
  }

  avanzar(id: number): Observable<Incidencia> {
    return this.http.patch<Incidencia>(`${this.base}/${id}/avanzar`, {});
  }

  cambiarEstado(id: number, estado: EstadoIncidencia, tecnicoId?: number | null): Observable<Incidencia> {
    return this.http.patch<Incidencia>(`${this.base}/${id}/estado`, { estado, tecnicoId: tecnicoId ?? null });
  }

  asignar(id: number, tecnicoId: number): Observable<Incidencia> {
    return this.http.patch<Incidencia>(`${this.base}/${id}/asignacion`, { tecnicoId });
  }

  devolver(id: number, motivo: string): Observable<Incidencia> {
    return this.http.patch<Incidencia>(`${this.base}/${id}/devolucion`, { motivo });
  }

  historial(id: number): Observable<HistorialIncidencia[]> {
    return this.http.get<HistorialIncidencia[]>(`${this.base}/${id}/historial`);
  }
}
