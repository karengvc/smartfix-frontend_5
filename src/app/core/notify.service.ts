import { Injectable, signal } from '@angular/core';

export interface Aviso {
  id: number;
  tipo: 'ok' | 'error';
  texto: string;
}

@Injectable({ providedIn: 'root' })
export class NotifyService {
  readonly avisos = signal<Aviso[]>([]);
  private contador = 0;

  ok(texto: string): void {
    this.agregar('ok', texto);
  }

  error(texto: string): void {
    this.agregar('error', texto);
  }

  cerrar(id: number): void {
    this.avisos.update(lista => lista.filter(a => a.id !== id));
  }

  private agregar(tipo: 'ok' | 'error', texto: string): void {
    const id = ++this.contador;
    this.avisos.update(lista => [...lista, { id, tipo, texto }]);
    setTimeout(() => this.cerrar(id), 4500);
  }
}
