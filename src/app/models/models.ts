export type Rol = 'ADMINISTRADOR' | 'TECNICO' | 'USUARIO';

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
}

export interface LoginRequest {
  correo: string;
  password: string;
}

export interface RegistroRequest {
  nombre: string;
  correo: string;
  password: string;
}

export interface Equipo {
  id?: number;
  nombre: string;
  tipo: string;
  marca: string;
  modelo?: string | null;
  numeroSerie?: string | null;
  estado: string;
  descripcion?: string | null;
}

export type EstadoIncidencia = 'REPORTADA' | 'ASIGNADA' | 'EN_PROCESO' | 'RESUELTA' | 'CERRADA';
export type Prioridad = 'BAJA' | 'MEDIA' | 'ALTA';

export interface Incidencia {
  id?: number;
  titulo: string;
  descripcion: string;
  prioridad: Prioridad;
  estado?: EstadoIncidencia;
  fechaReporte?: string;
  equipoId: number;
  tecnicoId?: number | null;
}

export type TipoMantenimiento = 'PREVENTIVO' | 'CORRECTIVO';

export interface Mantenimiento {
  id?: number;
  tipo: TipoMantenimiento;
  fecha: string;
  descripcion: string;
  resultado: string;
  equipoId: number;
  incidenciaId?: number | null;
  tecnicoId: number;
}

export const ESTADOS_INCIDENCIA: EstadoIncidencia[] = [
  'REPORTADA', 'ASIGNADA', 'EN_PROCESO', 'RESUELTA', 'CERRADA'
];
