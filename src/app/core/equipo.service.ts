import { Injectable } from '@angular/core';
import { CONFIG } from './config';
import { CrudService } from './crud.service';
import { Equipo } from '../models/models';

@Injectable({ providedIn: 'root' })
export class EquipoService extends CrudService<Equipo> {
  constructor() {
    super(CONFIG.api.equipos, CONFIG.mock.equipos, [
      { id: 1, nombre: 'Laptop HP ProBook', tipo: 'Laptop', marca: 'HP', modelo: '450 G9', numeroSerie: 'HP-0001', estado: 'ACTIVO', descripcion: 'Equipo de contabilidad' },
      { id: 2, nombre: 'Impresora Epson L3250', tipo: 'Impresora', marca: 'Epson', modelo: 'L3250', numeroSerie: 'EP-0042', estado: 'EN_MANTENIMIENTO', descripcion: 'Oficina principal' }
    ]);
  }
}
