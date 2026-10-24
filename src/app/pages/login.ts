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
    <div class="landing">
      <section class="hero">
        <div class="logo-tile"><img src="logo.png" alt="SmartFix" /></div>
        <div class="brand light sin-pad">Smart<span>Fix</span></div>
        <h1 class="hero-title">Cada equipo, controlado de la recepción a la entrega.</h1>
        <p class="hero-sub">Deja tu equipo, mira en qué paso va y recíbelo reparado.</p>
        <ol class="flujo">
          <li class="glass-dark">Recibido</li>
          <li class="glass-dark">En análisis</li>
          <li class="glass-dark">En reparación</li>
          <li class="glass-dark">Finalizado</li>
        </ol>
      </section>

      <section class="acceso">
        <form class="auth-card glass-strong" [formGroup]="form" (ngSubmit)="entrar()" novalidate>
          <h2>Iniciar sesión</h2>

          <label>Correo
            <input type="email" formControlName="correo" placeholder="usuario@correo.com" />
          </label>
          @if (form.controls.correo.touched && form.controls.correo.invalid) {
            <small class="error">Ingresa un correo válido.</small>
          }

          <label>Contraseña
            <span class="pw"><input [type]="ver() ? 'text' : 'password'" formControlName="password" placeholder="••••••••" /><button type="button" class="ojo" (click)="ver.set(!ver())" [attr.aria-label]="ver() ? 'Ocultar contraseña' : 'Mostrar contraseña'"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>@if (ver()) {<path d="M3 3l18 18"/>}</svg></button></span>
          </label>
          @if (form.controls.password.touched && form.controls.password.invalid) {
            <small class="error">La contraseña es obligatoria.</small>
          }

          <button class="btn" type="submit" [disabled]="cargando()">
            {{ cargando() ? 'Ingresando...' : 'Entrar' }}
          </button>
          <p class="muted center">¿Eres cliente nuevo? <a routerLink="/registro">Crea tu cuenta</a></p>
        </form>
      </section>
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
  protected readonly ver = signal(false);
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
