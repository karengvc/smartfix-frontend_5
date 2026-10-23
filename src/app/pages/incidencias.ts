import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, catchError, of } from 'rxjs';
import { EquipoService } from '../core/equipo.service';
import { mensajeError } from '../core/http-error';
import { IncidenciaService } from '../core/incidencia.service';
import { NotifyService } from '../core/notify.service';
import { ESTADOS_INCIDENCIA, Equipo, EstadoIncidencia, Incidencia } from '../models/models';

@Component({
  imports: [ReactiveFormsModule, FormsModule],
  template: `
    <div class="page-head">
      <div>
        <h1>Incidencias</h1>
        <p class="muted">Registro y seguimiento: REPORTADA → ASIGNADA → EN_PROCESO → RESUELTA → CERRADA.</p>
      </div>
      <button class="btn" (click)="nueva()">+ Nueva incidencia</button>
    </div>

    @if (mostrarForm()) {
      <form class="card form-grid" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        <h2 class="span-2">{{ editandoId() ? 'Editar incidencia' : 'Nueva incidencia' }}</h2>

        <label class="span-2">Título *
          <input formControlName="titulo" />
          @if (invalido('titulo')) { <small class="error">El título es obligatorio.</small> }
        </label>
        <label class="span-2">Descripción *
          <textarea rows="2" formControlName="descripcion"></textarea>
          @if (invalido('descripcion')) { <small class="error">La descripción es obligatoria.</small> }
        </label>
        <label>Prioridad *
          <select formControlName="prioridad">
            <option value="BAJA">BAJA</option>
            <option value="MEDIA">MEDIA</option>
            <option value="ALTA">ALTA</option>
            <option value="CRITICA">CRITICA</option>
          </select>
        </label>
        <label>Equipo afectado *
          <select formControlName="equipoId">
            <option [ngValue]="0" disabled>Selecciona un equipo</option>
            @for (e of equipos(); track e.id) {
              <option [ngValue]="e.id">#{{ e.id }} · {{ e.nombre }}</option>
            }
          </select>
          @if (invalido('equipoId')) { <small class="error">Selecciona el equipo afectado.</small> }
        </label>

        <div class="span-2 actions">
          <button class="btn" type="submit" [disabled]="guardando()">Guardar</button>
          <button class="btn btn-light" type="button" (click)="cancelar()">Cancelar</button>
        </div>
      </form>
    }

    @if (asignando(); as inc) {
      <div class="card inline-form">
        <strong>Asignar técnico a la incidencia #{{ inc.id }}</strong>
        <label>ID del técnico
          <input type="number" min="1" [(ngModel)]="tecnicoId" />
        </label>
        <button class="btn" (click)="confirmarAsignacion()">Asignar</button>
        <button class="btn btn-light" (click)="asignando.set(null)">Cancelar</button>
      </div>
    }

    <div class="card table-wrap">
      @if (cargando()) {
        <p class="muted">Cargando...</p>
      } @else if (incidencias().length === 0) {
        <p class="muted">No hay incidencias registradas.</p>
      } @else {
        <table>
          <thead>
            <tr><th>ID</th><th>Título</th><th>Prioridad</th><th>Equipo</th><th>Técnico</th><th>Fecha</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            @for (i of incidencias(); track i.id) {
              <tr>
                <td>{{ i.id }}</td>
                <td>{{ i.titulo }}</td>
                <td><span class="pill prio-{{ i.prioridad }}">{{ i.prioridad }}</span></td>
                <td>{{ nombreEquipo(i.equipoId) }}</td>
                <td>{{ i.tecnicoId ?? '—' }}</td>
                <td>{{ i.fechaReporte }}</td>
                <td><span class="pill est-{{ i.estado }}">{{ i.estado }}</span></td>
                <td class="row-actions">
                  @if (i.estado !== 'CERRADA') {
                    <button class="link" (click)="abrirAsignacion(i)">Asignar</button>
                    @if (siguiente(i); as sig) {
                      <button class="link" (click)="avanzar(i, sig)">→ {{ sig }}</button>
                    }
                  }
                  <button class="link" (click)="editar(i)">Editar</button>
                  <button class="link danger" (click)="eliminar(i)">Eliminar</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `
})
export class Incidencias implements OnInit {
  private readonly srv = inject(IncidenciaService);
  private readonly equipoSrv = inject(EquipoService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly notify = inject(NotifyService);

  protected readonly incidencias = signal<Incidencia[]>([]);
  protected readonly equipos = signal<Equipo[]>([]);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly mostrarForm = signal(false);
  protected readonly editandoId = signal<number | null>(null);
  protected readonly asignando = signal<Incidencia | null>(null);
  protected tecnicoId: number | null = null;

  protected readonly form = this.fb.group({
    titulo: ['', Validators.required],
    descripcion: ['', Validators.required],
    prioridad: ['MEDIA', Validators.required],
    equipoId: [0, [Validators.required, Validators.min(1)]]
  });

  ngOnInit(): void {
    forkJoin({
      equipos: this.equipoSrv.listar().pipe(catchError(() => of([] as Equipo[]))),
    }).subscribe(r => this.equipos.set(r.equipos));
    this.cargar();
  }

  protected invalido(campo: 'titulo' | 'descripcion' | 'equipoId'): boolean {
    const c = this.form.controls[campo];
    return c.touched && c.invalid;
  }

  protected nombreEquipo(id: number): string {
    const e = this.equipos().find(x => x.id === id);
    return e ? e.nombre : `#${id}`;
  }

  protected siguiente(i: Incidencia): EstadoIncidencia | null {
    const pos = ESTADOS_INCIDENCIA.indexOf(i.estado ?? 'REPORTADA');
    const sig = ESTADOS_INCIDENCIA[pos + 1] ?? null;
    if (sig === 'ASIGNADA' && !i.tecnicoId) return null;
    return sig;
  }

  protected nueva(): void {
    this.editandoId.set(null);
    this.form.reset({ prioridad: 'MEDIA', equipoId: 0 });
    this.mostrarForm.set(true);
  }

  protected editar(i: Incidencia): void {
    this.editandoId.set(i.id ?? null);
    this.form.reset({
      titulo: i.titulo, descripcion: i.descripcion,
      prioridad: i.prioridad, equipoId: i.equipoId
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
    const datos = this.form.getRawValue() as Incidencia;
    const id = this.editandoId();
    this.guardando.set(true);
    const peticion = id ? this.srv.actualizar(id, datos) : this.srv.crear(datos);
    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.mostrarForm.set(false);
        this.notify.ok(id ? 'Incidencia actualizada correctamente.' : 'Incidencia registrada correctamente.');
        this.cargar();
      },
      error: err => {
        this.guardando.set(false);
        this.notify.error(mensajeError(err));
      }
    });
  }

  protected abrirAsignacion(i: Incidencia): void {
    this.tecnicoId = i.tecnicoId ?? null;
    this.asignando.set(i);
  }

  protected confirmarAsignacion(): void {
    const inc = this.asignando();
    if (!inc?.id || !this.tecnicoId || this.tecnicoId < 1) {
      this.notify.error('Ingresa un ID de técnico válido.');
      return;
    }
    this.srv.asignar(inc.id, this.tecnicoId).subscribe({
      next: () => {
        this.asignando.set(null);
        this.notify.ok('Técnico asignado correctamente.');
        this.cargar();
      },
      error: err => this.notify.error(mensajeError(err))
    });
  }

  protected avanzar(i: Incidencia, estado: EstadoIncidencia): void {
    if (!i.id) return;
    this.srv.cambiarEstado(i.id, estado).subscribe({
      next: () => {
        this.notify.ok(`Estado actualizado a ${estado}.`);
        this.cargar();
      },
      error: err => this.notify.error(mensajeError(err))
    });
  }

  protected eliminar(i: Incidencia): void {
    if (!i.id || !confirm(`¿Eliminar la incidencia "${i.titulo}"?`)) return;
    this.srv.eliminar(i.id).subscribe({
      next: () => {
        this.notify.ok('Incidencia eliminada.');
        this.cargar();
      },
      error: err => this.notify.error(mensajeError(err))
    });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.srv.listar().subscribe({
      next: lista => {
        this.incidencias.set(lista);
        this.cargando.set(false);
      },
      error: err => {
        this.cargando.set(false);
        this.notify.error(mensajeError(err));
      }
    });
  }
}
