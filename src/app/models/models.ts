export type Rol = 'ADMINISTRADOR' | 'TECNICO' | 'USUARIO';

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
  token?: string;
}

export interface UsuarioResumen {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
}

export interface HistorialIncidencia {
  id: number;
  incidenciaId: number;
  estadoAnterior: EstadoIncidencia | null;
  estadoNuevo: EstadoIncidencia;
  fechaCambio: string;
  descripcion: string;
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
  propietarioId?: number | null;
}

export type EstadoIncidencia = 'RECIBIDO' | 'EN_ANALISIS' | 'EN_REPARACION' | 'FINALIZADO' | 'DEVUELTO';
export type Canal = 'ONLINE' | 'PRESENCIAL';
export type Prioridad = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export interface Incidencia {
  id?: number;
  titulo: string;
  descripcion: string;
  prioridad: Prioridad;
  estado?: EstadoIncidencia;
  fechaReporte?: string;
  equipoId: number;
  tecnicoId?: number | null;
  solicitanteId?: number | null;
  canal?: Canal;
  motivoDevolucion?: string | null;
  reingresos?: number;
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
  'RECIBIDO', 'EN_ANALISIS', 'EN_REPARACION', 'FINALIZADO', 'DEVUELTO'
];

export const ETIQUETA_ESTADO: Record<EstadoIncidencia, string> = {
  RECIBIDO: 'Recibido',
  EN_ANALISIS: 'En análisis',
  EN_REPARACION: 'En reparación',
  FINALIZADO: 'Finalizado',
  DEVUELTO: 'Devuelto'
};

// Pasos del proceso que se muestran en el seguimiento
export const PASOS: EstadoIncidencia[] = ['RECIBIDO', 'EN_ANALISIS', 'EN_REPARACION', 'FINALIZADO'];
