import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { mensajeError } from '../core/http-error';
import { NotifyService } from '../core/notify.service';
import { Toast } from '../shared/toast';

@Component({
  imports: [ReactiveFormsModule, RouterLink, Toast],
  template: `
    <div class="auth-page">
      <form class="auth-card" [formGroup]="form" (ngSubmit)="registrar()" novalidate>
        <div class="brand"><img class="logo-mini oscuro" src="logo.png" alt="" />Smart<span>Fix</span></div>
        <p class="muted">Crear una cuenta nueva</p>

        <label>Nombre completo
          <input type="text" formControlName="nombre" />
        </label>
        @if (form.controls.nombre.touched && form.controls.nombre.invalid) {
          <small class="error">El nombre es obligatorio.</small>
        }

        <label>Correo
          <input type="email" formControlName="correo" />
        </label>
        @if (form.controls.correo.touched && form.controls.correo.invalid) {
          <small class="error">Ingresa un correo válido.</small>
        }

        <label>Contraseña
          <span class="pw"><input [type]="ver() ? 'text' : 'password'" formControlName="password" /><button type="button" class="ojo" (click)="ver.set(!ver())" aria-label="Mostrar u ocultar contraseña"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>@if (ver()) {<path d="M3 3l18 18"/>}</svg></button></span>
        </label>
        @if (form.controls.password.touched && form.controls.password.invalid) {
          <small class="error">Mínimo 6 caracteres.</small>
        }

        <button class="btn" type="submit" [disabled]="cargando()">
          {{ cargando() ? 'Registrando...' : 'Registrarme' }}
        </button>
        <p class="muted center">¿Ya tienes cuenta? <a routerLink="/login">Inicia sesión</a></p>
      </form>
    </div>
    <app-toast />
  `
})
export class Register {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotifyService);

  protected readonly cargando = signal(false);
  protected readonly ver = signal(false);
  protected readonly form = this.fb.group({
    nombre: ['', Validators.required],
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  protected registrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    this.auth.registrar(this.form.getRawValue()).subscribe({
      next: () => {
        this.cargando.set(false);
        this.notify.ok('Cuenta creada. Ahora puedes iniciar sesión.');
        this.router.navigateByUrl('/login');
      },
      error: e => {
        this.cargando.set(false);
        this.notify.error(mensajeError(e));
      }
    });
  }
}
