import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { Toast } from '../shared/toast';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Toast],
  template: `
    <div class="layout">
      <aside class="sidebar">
        <div class="brand light">Smart<span>Fix</span></div>
        <nav>
          <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
          <a routerLink="/equipos" routerLinkActive="active">Equipos</a>
          <a routerLink="/incidencias" routerLinkActive="active">Incidencias</a>
          <a routerLink="/mantenimientos" routerLinkActive="active">Mantenimientos</a>
        </nav>
      </aside>
      <div class="main">
        <header class="topbar">
          <div>
            <strong>{{ auth.usuario()?.nombre }}</strong>
            <span class="badge">{{ auth.usuario()?.rol }}</span>
          </div>
          <button class="btn btn-light" (click)="salir()">Cerrar sesión</button>
        </header>
        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
    <app-toast />
  `
})
export class Shell {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected salir(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
