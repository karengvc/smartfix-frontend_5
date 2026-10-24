import { Component, OnInit, inject, signal } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { mensajeError } from '../core/http-error';
import { NotifyService } from '../core/notify.service';
import { Rol, UsuarioResumen } from '../models/models';

@Component({
  template: `
    <div class="page-head">
      <div>
        <h1>Usuarios y roles</h1>
        <p class="muted">Solo el administrador puede cambiar el rol de una cuenta.</p>
      </div>
    </div>

    <div class="cards">
      @for (r of roles; track r.rol) {
        <div class="card stat">
          <span class="stat-label">{{ r.rol }}</span>
          <span class="stat-value">{{ contar(r.rol) }}</span>
          <span class="muted small">{{ r.descripcion }}</span>
        </div>
      }
    </div>

    <div class="card table-wrap">
      @if (cargando()) {
        <p class="muted">Cargando...</p>
      } @else {
        <table>
          <thead>
            <tr><th>ID</th><th>Nombre</th><th>Correo</th><th>Rol</th></tr>
          </thead>
          <tbody>
            @for (u of usuarios(); track u.id) {
              <tr>
                <td>{{ u.id }}</td>
                <td>{{ u.nombre }}</td>
                <td>{{ u.correo }}</td>
                <td>
                  <select [value]="u.rol" (change)="cambiar(u, $any($event.target).value)">
                    @for (r of roles; track r.rol) {
                      <option [value]="r.rol" [selected]="r.rol === u.rol">{{ r.rol }}</option>
                    }
                  </select>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `
})
export class Usuarios implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotifyService);

  protected readonly usuarios = signal<UsuarioResumen[]>([]);
  protected readonly cargando = signal(true);
  protected readonly roles: { rol: Rol; descripcion: string }[] = [
    { rol: 'ADMINISTRADOR', descripcion: 'Control total del sistema' },
    { rol: 'TECNICO', descripcion: 'Atiende incidencias y mantenimientos' },
    { rol: 'USUARIO', descripcion: 'Reporta fallas y consulta' }
  ];

  ngOnInit(): void {
    this.cargar();
  }

  protected contar(rol: Rol): number {
    return this.usuarios().filter(u => u.rol === rol).length;
  }

  protected cambiar(u: UsuarioResumen, rol: Rol): void {
    this.auth.cambiarRol(u.id, rol).subscribe({
      next: () => {
        this.notify.ok(`${u.nombre} ahora es ${rol}.`);
        this.cargar();
      },
      error: err => {
        this.notify.error(mensajeError(err));
        this.cargar();
      }
    });
  }

  private cargar(): void {
    this.auth.usuarios().subscribe({
      next: lista => {
        this.usuarios.set(lista);
        this.cargando.set(false);
      },
      error: err => {
        this.cargando.set(false);
        this.notify.error(mensajeError(err));
      }
    });
  }
}
