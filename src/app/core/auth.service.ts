import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { CONFIG } from './config';
import { LoginRequest, RegistroRequest, Rol, Usuario, UsuarioResumen } from '../models/models';

const CLAVE = 'smartfix_usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = CONFIG.api.auth;
  readonly usuario = signal<Usuario | null>(this.leer());

  login(datos: LoginRequest): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.base}/login`, datos).pipe(tap(u => this.guardar(u)));
  }

  registrar(datos: RegistroRequest): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.base}/register`, datos);
  }

  tecnicos(): Observable<UsuarioResumen[]> {
    return this.http.get<UsuarioResumen[]>(`${this.base}/tecnicos`);
  }

  clientes(): Observable<UsuarioResumen[]> {
    return this.http.get<UsuarioResumen[]>(`${this.base}/clientes`);
  }

  usuarios(): Observable<UsuarioResumen[]> {
    return this.http.get<UsuarioResumen[]>(`${this.base}/usuarios`);
  }

  cambiarRol(id: number, rol: Rol): Observable<UsuarioResumen> {
    return this.http.put<UsuarioResumen>(`${this.base}/usuarios/${id}/rol`, { rol });
  }

  token(): string | null {
    return this.usuario()?.token ?? null;
  }

  tieneRol(...roles: Rol[]): boolean {
    const rol = this.usuario()?.rol;
    return !!rol && roles.includes(rol);
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
