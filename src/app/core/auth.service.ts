import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, delay, of, tap, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { CONFIG } from './config';
import { LoginRequest, RegistroRequest, Usuario } from '../models/models';

const CLAVE = 'smartfix_usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = CONFIG.api.auth;
  readonly usuario = signal<Usuario | null>(this.leer());

  login(datos: LoginRequest): Observable<Usuario> {
    if (CONFIG.mock.auth) {
      if (datos.correo === 'admin@smartfix.com' && datos.password === 'Admin123*') {
        const u: Usuario = { id: 1, nombre: 'Administrador', correo: datos.correo, rol: 'ADMINISTRADOR' };
        return of(u).pipe(delay(150), tap(x => this.guardar(x)));
      }
      return throwError(() => new HttpErrorResponse({ status: 401, error: { mensaje: 'Credenciales incorrectas' } }));
    }
    return this.http.post<Usuario>(`${this.base}/login`, datos).pipe(tap(u => this.guardar(u)));
  }

  registrar(datos: RegistroRequest): Observable<Usuario> {
    if (CONFIG.mock.auth) {
      return of({ id: 2, nombre: datos.nombre, correo: datos.correo, rol: 'USUARIO' as const }).pipe(delay(150));
    }
    return this.http.post<Usuario>(`${this.base}/register`, datos);
  }

  logout(): void {
    this.usuario.set(null);
    try { sessionStorage.removeItem(CLAVE); } catch { }
  }

  private guardar(u: Usuario): void {
    this.usuario.set(u);
    try { sessionStorage.setItem(CLAVE, JSON.stringify(u)); } catch { }
  }

  private leer(): Usuario | null {
    try {
      const txt = sessionStorage.getItem(CLAVE);
      return txt ? (JSON.parse(txt) as Usuario) : null;
    } catch {
      return null;
    }
  }
}
