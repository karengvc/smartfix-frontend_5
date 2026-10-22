import { HttpErrorResponse } from '@angular/common/http';

export function mensajeError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return 'No se pudo conectar con el servicio. Verifica que esté en ejecución.';
    }
    const cuerpo = err.error;
    if (cuerpo && typeof cuerpo === 'object') {
      if (cuerpo.errores && typeof cuerpo.errores === 'object') {
        return Object.values(cuerpo.errores as Record<string, string>).join('. ');
      }
      if (typeof cuerpo.mensaje === 'string') {
        return cuerpo.mensaje;
      }
    }
    if (err.status === 404) return 'El registro no existe.';
    if (err.status === 409) return 'El registro ya existe.';
    if (err.status === 401) return 'Credenciales incorrectas.';
    if (err.status === 400) return 'Los datos enviados no son válidos.';
    return `Error del servidor (${err.status}).`;
  }
  return 'Ocurrió un error inesperado.';
}
