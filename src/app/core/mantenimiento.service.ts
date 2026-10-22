import { Injectable } from '@angular/core';
import { CONFIG } from './config';
import { CrudService } from './crud.service';
import { Mantenimiento } from '../models/models';

@Injectable({ providedIn: 'root' })
export class MantenimientoService extends CrudService<Mantenimiento> {
  constructor() {
    super(CONFIG.api.mantenimientos, CONFIG.mock.mantenimientos, [
      { id: 1, tipo: 'PREVENTIVO', fecha: '2026-10-10', descripcion: 'Limpieza interna y cambio de pasta térmica', resultado: 'Equipo operativo', equipoId: 1, incidenciaId: null, tecnicoId: 2 }
    ]);
  }
}
