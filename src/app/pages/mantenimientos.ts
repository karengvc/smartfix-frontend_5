import { Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { EquipoService } from '../core/equipo.service';
import { mensajeError } from '../core/http-error';
import { IncidenciaService } from '../core/incidencia.service';
import { MantenimientoService } from '../core/mantenimiento.service';
import { NotifyService } from '../core/notify.service';
import { Equipo, Incidencia, Mantenimiento, UsuarioResumen } from '../models/models';

@Component({
  imports: [ReactiveFormsModule],
  template: `
    <div class="page-head">
      <div>
        <h1>Mantenimientos</h1>
        <p class="muted">Intervenciones preventivas y correctivas sobre los equipos.</p>
      </div>
      @if (auth.tieneRol('ADMINISTRADOR', 'TECNICO')) {
        <button class="btn" (click)="nuevo()">+ Nuevo mantenimiento</button>
      }
    </div>

    @if (mostrarForm()) {
      <form class="card form-grid" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        <h2 class="span-2">{{ editandoId() ? 'Editar mantenimiento' : 'Nuevo mantenimiento' }}</h2>

        <label>Tipo *
          <select formControlName="tipo">
            <option value="PREVENTIVO">PREVENTIVO</option>
            <option value="CORRECTIVO">CORRECTIVO</option>
          </select>
        </label>
        <label>Fecha *
          <input type="date" formControlName="fecha" />
          @if (invalido('fecha')) { <small class="error">La fecha es obligatoria.</small> }
        </label>
        <label>Equipo *
          <select formControlName="equipoId">
            <option [ngValue]="0" disabled>Selecciona un equipo</option>
            @for (e of equipos(); track e.id) {
              <option [ngValue]="e.id">#{{ e.id }} · {{ e.nombre }}</option>
            }
          </select>
          @if (invalido('equipoId')) { <small class="error">Selecciona el equipo.</small> }
        </label>
        <label>Técnico *
          <select formControlName="tecnicoId">
            <option [ngValue]="null" disabled>Selecciona un técnico</option>
            @for (t of tecnicos(); track t.id) {
              <option [ngValue]="t.id">{{ t.nombre }}</option>
            }
          </select>
          @if (invalido('tecnicoId')) { <small class="error">Selecciona el técnico.</small> }
        </label>
        <label>Incidencia relacionada (opcional)
          <select formControlName="incidenciaId">
            <option [ngValue]="null">Ninguna</option>
            @for (i of incidencias(); track i.id) {
              <option [ngValue]="i.id">#{{ i.id }} · {{ i.titulo }}</option>
            }
          </select>
        </label>
        <span></span>
        <label class="span-2">Descripción *
          <textarea rows="2" formControlName="descripcion"></textarea>
          @if (invalido('descripcion')) { <small class="error">La descripción es obligatoria.</small> }
        </label>
        <label class="span-2">Resultado *
          <textarea rows="2" formControlName="resultado"></textarea>
          @if (invalido('resultado')) { <small class="error">El resultado es obligatorio.</small> }
        </label>

        <div class="span-2 actions">
          <button class="btn" type="submit" [disabled]="guardando()">Guardar</button>
          <button class="btn btn-light" type="button" (click)="cancelar()">Cancelar</button>
        </div>
      </form>
    }

    <div class="card table-wrap">
      @if (cargando()) {
        <p class="muted">Cargando...</p>
      } @else if (lista().length === 0) {
        <p class="muted">No hay mantenimientos registrados.</p>
      } @else {
        <table>
          <thead>
            <tr><th>ID</th><th>Tipo</th><th>Fecha</th><th>Equipo</th><th>Incidencia</th><th>Técnico</th><th>Resultado</th><th></th></tr>
          </thead>
          <tbody>
            @for (m of lista(); track m.id) {
              <tr>
                <td>{{ m.id }}</td>
                <td><span class="pill tipo-{{ m.tipo }}">{{ m.tipo }}</span></td>
                <td>{{ m.fecha }}</td>
                <td>{{ nombreEquipo(m.equipoId) }}</td>
                <td>{{ m.incidenciaId ? '#' + m.incidenciaId : '—' }}</td>
                <td>{{ nombreTecnico(m.tecnicoId) }}</td>
                <td>{{ m.resultado }}</td>
                <td class="row-actions">
                  @if (auth.tieneRol('ADMINISTRADOR', 'TECNICO')) {
                    <button class="link" (click)="editar(m)">Editar</button>
                  }
                  @if (auth.tieneRol('ADMINISTRADOR')) {
                    <button class="link danger" (click)="eliminar(m)">Eliminar</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `
})
export class Mantenimientos implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly srv = inject(MantenimientoService);
  private readonly incidenciaSrv = inject(IncidenciaService);
  private readonly equipoSrv = inject(EquipoService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly notify = inject(NotifyService);

  protected readonly lista = signal<Mantenimiento[]>([]);
  protected readonly equipos = signal<Equipo[]>([]);
  protected readonly incidencias = signal<Incidencia[]>([]);
  protected readonly tecnicos = signal<UsuarioResumen[]>([]);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly mostrarForm = signal(false);
  protected readonly editandoId = signal<number | null>(null);

  protected readonly form = this.fb.group({
    tipo: ['PREVENTIVO', Validators.required],
    fecha: ['', Validators.required],
    descripcion: ['', Validators.required],
    resultado: ['', Validators.required],
    equipoId: [0, [Validators.required, Validators.min(1)]],
    incidenciaId: [null as number | null],
    tecnicoId: [null as number | null, [Validators.required, Validators.min(1)]]
  });

  ngOnInit(): void {
    this.equipoSrv.listar().pipe(catchError(() => of([] as Equipo[])))
      .subscribe(e => this.equipos.set(e));
    this.incidenciaSrv.listar().pipe(catchError(() => of([] as Incidencia[])))
      .subscribe(i => this.incidencias.set(i));
    this.auth.tecnicos().pipe(catchError(() => of([] as UsuarioResumen[])))
      .subscribe(t => this.tecnicos.set(t));
    this.cargar();
  }

  protected invalido(campo: 'fecha' | 'descripcion' | 'resultado' | 'equipoId' | 'tecnicoId'): boolean {
    const c = this.form.controls[campo];
    return c.touched && c.invalid;
  }

  protected nombreEquipo(id: number): string {
    const e = this.equipos().find(x => x.id === id);
    return e ? e.nombre : `#${id}`;
  }

  protected nombreTecnico(id: number): string {
    const t = this.tecnicos().find(x => x.id === id);
    return t ? t.nombre : `#${id}`;
  }

  protected nuevo(): void {
    this.editandoId.set(null);
    const propio = this.auth.tieneRol('TECNICO') ? (this.auth.usuario()?.id ?? null) : null;
    this.form.reset({ tipo: 'PREVENTIVO', equipoId: 0, incidenciaId: null, tecnicoId: propio });
    this.mostrarForm.set(true);
  }

  protected editar(m: Mantenimiento): void {
    this.editandoId.set(m.id ?? null);
    this.form.reset({
      tipo: m.tipo, fecha: m.fecha, descripcion: m.descripcion, resultado: m.resultado,
      equipoId: m.equipoId, incidenciaId: m.incidenciaId ?? null, tecnicoId: m.tecnicoId
    });
    this.mostrarForm.set(true);
  }

  protected cancelar(): void {
    this.mostrarForm.set(false);
  }

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const datos = { ...v, incidenciaId: v.incidenciaId || null } as Mantenimiento;
    const id = this.editandoId();
    this.guardando.set(true);
    const peticion = id ? this.srv.actualizar(id, datos) : this.srv.crear(datos);
    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.mostrarForm.set(false);
        this.notify.ok(id ? 'Mantenimiento actualizado correctamente.' : 'Mantenimiento registrado correctamente.');
        this.cargar();
      },
      error: err => {
        this.guardando.set(false);
        this.notify.error(mensajeError(err));
      }
    });
  }

  protected eliminar(m: Mantenimiento): void {
    if (!m.id || !confirm('¿Eliminar este mantenimiento?')) return;
    this.srv.eliminar(m.id).subscribe({
      next: () => {
        this.notify.ok('Mantenimiento eliminado.');
        this.cargar();
      },
      error: err => this.notify.error(mensajeError(err))
    });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.srv.listar().subscribe({
      next: l => {
        this.lista.set(l);
        this.cargando.set(false);
      },
      error: err => {
        this.cargando.set(false);
        this.notify.error(mensajeError(err));
      }
    });
  }
}
