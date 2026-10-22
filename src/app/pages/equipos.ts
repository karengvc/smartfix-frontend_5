import { Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EquipoService } from '../core/equipo.service';
import { mensajeError } from '../core/http-error';
import { NotifyService } from '../core/notify.service';
import { Equipo } from '../models/models';

@Component({
  imports: [ReactiveFormsModule],
  template: `
    <div class="page-head">
      <div>
        <h1>Equipos</h1>
        <p class="muted">Inventario de equipos tecnológicos.</p>
      </div>
      <button class="btn" (click)="nuevo()">+ Nuevo equipo</button>
    </div>

    @if (mostrarForm()) {
      <form class="card form-grid" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        <h2 class="span-2">{{ editandoId() ? 'Editar equipo' : 'Nuevo equipo' }}</h2>

        <label>Nombre *
          <input formControlName="nombre" />
          @if (invalido('nombre')) { <small class="error">El nombre es obligatorio.</small> }
        </label>
        <label>Tipo *
          <input formControlName="tipo" list="tipos" placeholder="Laptop, Impresora..." />
          <datalist id="tipos">
            <option value="Laptop"></option><option value="Computadora"></option>
            <option value="Impresora"></option><option value="Servidor"></option>
            <option value="Router"></option><option value="Monitor"></option>
          </datalist>
          @if (invalido('tipo')) { <small class="error">El tipo es obligatorio.</small> }
        </label>
        <label>Marca *
          <input formControlName="marca" />
          @if (invalido('marca')) { <small class="error">La marca es obligatoria.</small> }
        </label>
        <label>Modelo
          <input formControlName="modelo" />
        </label>
        <label>Número de serie
          <input formControlName="numeroSerie" />
        </label>
        <label>Estado *
          <select formControlName="estado">
            <option value="ACTIVO">ACTIVO</option>
            <option value="EN_MANTENIMIENTO">EN_MANTENIMIENTO</option>
            <option value="BAJA">BAJA</option>
          </select>
        </label>
        <label class="span-2">Descripción
          <textarea rows="2" formControlName="descripcion"></textarea>
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
      } @else if (equipos().length === 0) {
        <p class="muted">No hay equipos registrados.</p>
      } @else {
        <table>
          <thead>
            <tr><th>ID</th><th>Nombre</th><th>Tipo</th><th>Marca</th><th>Modelo</th><th>N.° serie</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            @for (e of equipos(); track e.id) {
              <tr>
                <td>{{ e.id }}</td>
                <td>{{ e.nombre }}</td>
                <td>{{ e.tipo }}</td>
                <td>{{ e.marca }}</td>
                <td>{{ e.modelo }}</td>
                <td>{{ e.numeroSerie }}</td>
                <td><span class="pill">{{ e.estado }}</span></td>
                <td class="row-actions">
                  <button class="link" (click)="editar(e)">Editar</button>
                  <button class="link danger" (click)="eliminar(e)">Eliminar</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `
})
export class Equipos implements OnInit {
  private readonly srv = inject(EquipoService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly notify = inject(NotifyService);

  protected readonly equipos = signal<Equipo[]>([]);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly mostrarForm = signal(false);
  protected readonly editandoId = signal<number | null>(null);

  protected readonly form = this.fb.group({
    nombre: ['', Validators.required],
    tipo: ['', Validators.required],
    marca: ['', Validators.required],
    modelo: [''],
    numeroSerie: [''],
    estado: ['ACTIVO', Validators.required],
    descripcion: ['']
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected invalido(campo: 'nombre' | 'tipo' | 'marca'): boolean {
    const c = this.form.controls[campo];
    return c.touched && c.invalid;
  }

  protected nuevo(): void {
    this.editandoId.set(null);
    this.form.reset({ estado: 'ACTIVO' });
    this.mostrarForm.set(true);
  }

  protected editar(e: Equipo): void {
    this.editandoId.set(e.id ?? null);
    this.form.reset({
      nombre: e.nombre, tipo: e.tipo, marca: e.marca,
      modelo: e.modelo ?? '', numeroSerie: e.numeroSerie ?? '',
      estado: e.estado, descripcion: e.descripcion ?? ''
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
    const datos = this.form.getRawValue() as Equipo;
    const id = this.editandoId();
    this.guardando.set(true);
    const peticion = id ? this.srv.actualizar(id, datos) : this.srv.crear(datos);
    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.mostrarForm.set(false);
        this.notify.ok(id ? 'Equipo actualizado correctamente.' : 'Equipo registrado correctamente.');
        this.cargar();
      },
      error: err => {
        this.guardando.set(false);
        this.notify.error(mensajeError(err));
      }
    });
  }

  protected eliminar(e: Equipo): void {
    if (!e.id || !confirm(`¿Eliminar el equipo "${e.nombre}"?`)) return;
    this.srv.eliminar(e.id).subscribe({
      next: () => {
        this.notify.ok('Equipo eliminado.');
        this.cargar();
      },
      error: err => this.notify.error(mensajeError(err))
    });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.srv.listar().subscribe({
      next: lista => {
        this.equipos.set(lista);
        this.cargando.set(false);
      },
      error: err => {
        this.cargando.set(false);
        this.notify.error(mensajeError(err));
      }
    });
  }
}
