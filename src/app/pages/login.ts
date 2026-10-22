import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { mensajeError } from '../core/http-error';
import { Toast } from '../shared/toast';
import { NotifyService } from '../core/notify.service';

@Component({
  imports: [ReactiveFormsModule, RouterLink, Toast],
  template: `
    <div class="auth-page">
      <form class="auth-card" [formGroup]="form" (ngSubmit)="entrar()" novalidate>
        <div class="brand">Smart<span>Fix</span></div>
        <p class="muted">Gestión de incidencias y mantenimiento de equipos</p>

        <label>Correo
          <input type="email" formControlName="correo" placeholder="usuario@correo.com" />
        </label>
        @if (form.controls.correo.touched && form.controls.correo.invalid) {
          <small class="error">Ingresa un correo válido.</small>
        }

        <label>Contraseña
          <input type="password" formControlName="password" placeholder="••••••••" />
        </label>
        @if (form.controls.password.touched && form.controls.password.invalid) {
          <small class="error">La contraseña es obligatoria.</small>
        }

        <button class="btn" type="submit" [disabled]="cargando()">
          {{ cargando() ? 'Ingresando...' : 'Iniciar sesión' }}
        </button>
        <p class="muted center">¿No tienes cuenta? <a routerLink="/registro">Regístrate</a></p>
      </form>
    </div>
    <app-toast />
  `
})
export class Login {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotifyService);

  protected readonly cargando = signal(false);
  protected readonly form = this.fb.group({
    correo: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  protected entrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: u => {
        this.cargando.set(false);
        this.notify.ok(`Bienvenido, ${u.nombre}`);
        this.router.navigateByUrl('/dashboard');
      },
      error: e => {
        this.cargando.set(false);
        this.notify.error(mensajeError(e));
      }
    });
  }
}
