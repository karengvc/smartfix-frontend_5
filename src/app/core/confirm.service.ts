import { Injectable, signal } from '@angular/core';

export interface Confirmacion {
  titulo: string;
  mensaje: string;
  boton: string;
  peligro: boolean;
  pideMotivo: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly abierta = signal<Confirmacion | null>(null);
  private resolver: ((valor: string | null) => void) | null = null;

  // Devuelve true/texto si el usuario confirma y null si cancela
  preguntar(datos: Partial<Confirmacion> & { titulo: string; mensaje: string }): Promise<string | null> {
    this.abierta.set({ boton: 'Confirmar', peligro: false, pideMotivo: false, ...datos });
    return new Promise(res => (this.resolver = res));
  }

  responder(valor: string | null): void {
    this.abierta.set(null);
    this.resolver?.(valor);
    this.resolver = null;
  }
}
