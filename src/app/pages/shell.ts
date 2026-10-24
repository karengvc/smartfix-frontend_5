import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { Toast } from '../shared/toast';

const DESCRIPCION_ROL: Record<string, string> = {
  ADMINISTRADOR: 'Controla todo el proceso: asigna, corrige y administra.',
  TECNICO: 'Toma casos en espera y los lleva hasta la entrega.',
  USUARIO: 'Deja tu equipo y sigue su reparación.'
};

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Toast, ConfirmDialog],
  template: `
    <div class="layout">
      <aside class="sidebar">
        <div class="brand light"><img class="logo-mini" src="logo.png" alt="" />Smart<span>Fix</span></div>
        <nav>
          <a routerLink="/dashboard" routerLinkActive="active"><i>◧</i> Dashboard</a>
          <a routerLink="/equipos" routerLinkActive="active"><i>▣</i> {{ auth.tieneRol('USUARIO') ? 'Mis equipos' : 'Equipos' }}</a>
          <a routerLink="/incidencias" routerLinkActive="active"><i>◬</i> {{ auth.tieneRol('USUARIO') ? 'Seguimiento' : 'Casos' }}</a>
          @if (auth.tieneRol('ADMINISTRADOR', 'TECNICO')) {
            <a routerLink="/mantenimientos" routerLinkActive="active"><i>✚</i> Mantenimientos</a>
          }
          @if (auth.tieneRol('ADMINISTRADOR')) {
            <a routerLink="/usuarios" routerLinkActive="active"><i>☰</i> Usuarios</a>
          }
        </nav>
        <div class="rol-box glass-dark">
          <span class="rol-nombre">{{ auth.usuario()?.rol }}</span>
          <span class="rol-desc">{{ descripcion() }}</span>
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <div class="user">
            <span class="avatar">{{ inicial() }}</span>
            <div>
              <strong>{{ auth.usuario()?.nombre }}</strong>
              <span class="badge">{{ auth.usuario()?.rol }}</span>
            </div>
          </div>
          <button class="btn btn-light" (click)="salir()">Cerrar sesión</button>
        </header>
        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
    <app-toast />
    <app-confirm />
  `
})
export class Shell {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly descripcion = computed(() => DESCRIPCION_ROL[this.auth.usuario()?.rol ?? ''] ?? '');
  protected readonly inicial = computed(() => (this.auth.usuario()?.nombre ?? '?').charAt(0).toUpperCase());

  protected salir(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
