import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';

export abstract class CrudService<T extends { id?: number }> {
  protected readonly http = inject(HttpClient);
  protected store: T[];
  private siguienteId: number;

  protected constructor(
    protected readonly base: string,
    protected readonly mock: boolean,
    semilla: T[] = []
  ) {
    this.store = semilla.map(item => ({ ...item }));
    this.siguienteId = Math.max(0, ...this.store.map(i => i.id ?? 0)) + 1;
  }

  listar(): Observable<T[]> {
    if (this.mock) return of(this.store.map(i => ({ ...i }))).pipe(delay(150));
    return this.http.get<T[]>(this.base);
  }

  obtener(id: number): Observable<T> {
    if (this.mock) {
      const item = this.store.find(i => i.id === id);
      return item ? of({ ...item }) : throwError(() => new Error('No existe'));
    }
    return this.http.get<T>(`${this.base}/${id}`);
  }

  crear(dato: T): Observable<T> {
    if (this.mock) {
      const nuevo = this.antesDeCrear({ ...dato, id: this.siguienteId++ });
      this.store.push(nuevo);
      return of({ ...nuevo }).pipe(delay(150));
    }
    return this.http.post<T>(this.base, dato);
  }

  actualizar(id: number, dato: T): Observable<T> {
    if (this.mock) {
      const pos = this.store.findIndex(i => i.id === id);
      if (pos < 0) return throwError(() => new Error('No existe'));
      this.store[pos] = { ...this.store[pos], ...dato, id };
      return of({ ...this.store[pos] }).pipe(delay(150));
    }
    return this.http.put<T>(`${this.base}/${id}`, dato);
  }

  eliminar(id: number): Observable<void> {
    if (this.mock) {
      this.store = this.store.filter(i => i.id !== id);
      return of(undefined).pipe(delay(150));
    }
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  protected antesDeCrear(item: T): T {
    return item;
  }
}
