import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmService } from '../core/confirm.service';
import { AuthService } from '../core/auth.service';
import { EquipoService } from '../core/equipo.service';
import { mensajeError } from '../core/http-error';
import { NotifyService } from '../core/notify.service';
import { Equipo, UsuarioResumen } from '../models/models';
import { catchError, of } from 'rxjs';

@Component({
  imports: [ReactiveFormsModule, FormsModule],
  template: `
    <div class="page-head">
      <div>
        <h1>{{ auth.tieneRol('USUARIO') ? 'Mis equipos' : 'Equipos' }}</h1>
        <p class="muted">{{ auth.tieneRol('USUARIO') ? 'Los equipos que registraste a tu nombre.' : 'Inventario de equipos de los clientes.' }}</p>
      </div>
      @if (auth.tieneRol('ADMINISTRADOR', 'USUARIO')) {
        <button class="btn" (click)="nuevo()">+ {{ auth.tieneRol('USUARIO') ? 'Registrar mi equipo' : 'Nuevo equipo' }}</button>
      }
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
        @if (auth.tieneRol('ADMINISTRADOR')) {
          <label class="span-2">Dueño del equipo
            <select formControlName="propietarioId">
              <option [ngValue]="null">Sin dueño</option>
              @for (c of clientes(); track c.id) {
                <option [ngValue]="c.id">{{ c.nombre }}</option>
              }
            </select>
          </label>
        }
        <label class="span-2">Descripción
          <textarea rows="2" formControlName="descripcion"></textarea>
        </label>

        <div class="span-2 actions">
          <button class="btn" type="submit" [disabled]="guardando()">Guardar</button>
          <button class="btn btn-light" type="button" (click)="cancelar()">Cancelar</button>
        </div>
      </form>
    }

    <div class="toolbar glass">
      <input class="buscar" type="search" placeholder="Buscar por nombre, serie, marca o dueño"
             [ngModel]="texto()" (ngModelChange)="texto.set($event)" />
      <select [ngModel]="tipoSel()" (ngModelChange)="tipoSel.set($event)">
        <option value="">Todo tipo</option>
        @for (t of tipos(); track t) { <option [value]="t">{{ t }}</option> }
      </select>
      <select [ngModel]="orden()" (ngModelChange)="orden.set($event)">
        <option value="id-asc">Orden: ID</option>
        <option value="nombre-asc">Orden: nombre A-Z</option>
        <option value="tipo-asc">Orden: tipo A-Z</option>
        <option value="estado-asc">Orden: estado</option>
      </select>
    </div>

    <div class="card table-wrap">
      @if (cargando()) {
        <p class="muted">Cargando...</p>
      } @else if (equipos().length === 0) {
        <p class="muted">No hay equipos registrados.</p>
      } @else {
        <table>
          <thead>
            <tr><th>ID</th><th>Nombre</th><th>Tipo</th><th>Marca</th><th>Modelo</th><th>N.° serie</th>@if (!auth.tieneRol('USUARIO')) {<th>Dueño</th>}<th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            @for (e of visibles(); track e.id) {
              <tr>
                <td>{{ e.id }}</td>
                <td>{{ e.nombre }}</td>
                <td>{{ e.tipo }}</td>
                <td>{{ e.marca }}</td>
                <td>{{ e.modelo }}</td>
                <td>{{ e.numeroSerie }}</td>
                @if (!auth.tieneRol('USUARIO')) { <td>{{ nombreDueno(e.propietarioId) }}</td> }
                <td><span class="pill eq-{{ e.estado }}">{{ e.estado }}</span></td>
                <td class="row-actions">
                  @if (auth.tieneRol('ADMINISTRADOR')) {
                    <button class="link" (click)="editar(e)">Editar</button>
                  }
                  @if (auth.tieneRol('ADMINISTRADOR')) {
                    <button class="link danger" (click)="eliminar(e)">Eliminar</button>
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
export class Equipos implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly srv = inject(EquipoService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly notify = inject(NotifyService);
  private readonly confirmar = inject(ConfirmService);

  protected readonly equipos = signal<Equipo[]>([]);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly mostrarForm = signal(false);
  protected readonly editandoId = signal<number | null>(null);
  protected readonly clientes = signal<UsuarioResumen[]>([]);
  protected readonly texto = signal('');
  protected readonly tipoSel = signal('');
  protected readonly orden = signal('id-asc');
  protected readonly tipos = computed(() => [...new Set(this.equipos().map(e => e.tipo))].sort());
  protected readonly visibles = computed(() => {
    const n = (t: string | null | undefined) => (t ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const q = n(this.texto()).trim();
    const lista = this.equipos().filter(e =>
      (!this.tipoSel() || e.tipo === this.tipoSel()) &&
      (!q || n([e.id, e.nombre, e.tipo, e.marca, e.modelo, e.numeroSerie, this.nombreDueno(e.propietarioId)].join(' ')).includes(q)));
    const campo = this.orden().split('-')[0];
    return lista.sort((a, b) => campo === 'id'
      ? (a.id ?? 0) - (b.id ?? 0)
      : String((a as never)[campo] ?? '').localeCompare(String((b as never)[campo] ?? '')));
  });

  protected readonly form = this.fb.group({
    nombre: ['', Validators.required],
    tipo: ['', Validators.required],
    marca: ['', Validators.required],
    modelo: [''],
    numeroSerie: [''],
    estado: ['ACTIVO', Validators.required],
    descripcion: [''],
    propietarioId: [null as number | null]
  });

  ngOnInit(): void {
    if (!this.auth.tieneRol('USUARIO')) {
      this.auth.clientes().pipe(catchError(() => of([] as UsuarioResumen[])))
        .subscribe(c => this.clientes.set(c));
    }
    this.cargar();
  }

  protected nombreDueno(id?: number | null): string {
    if (!id) return '—';
    return this.clientes().find(c => c.id === id)?.nombre ?? `#${id}`;
  }

  protected invalido(campo: 'nombre' | 'tipo' | 'marca'): boolean {
    const c = this.form.controls[campo];
    return c.touched && c.invalid;
  }

  protected nuevo(): void {
    this.editandoId.set(null);
    this.form.reset({ estado: 'ACTIVO', propietarioId: null });
    this.mostrarForm.set(true);
  }

  protected editar(e: Equipo): void {
    this.editandoId.set(e.id ?? null);
    this.form.reset({
      nombre: e.nombre, tipo: e.tipo, marca: e.marca,
      modelo: e.modelo ?? '', numeroSerie: e.numeroSerie ?? '',
      estado: e.estado, descripcion: e.descripcion ?? '', propietarioId: e.propietarioId ?? null
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
    if (!e.id) return;
    const id = e.id;
    this.confirmar.preguntar({
      titulo: 'Eliminar equipo', mensaje: `Se eliminará "${e.nombre}". Esta acción no se puede deshacer.`,
      boton: 'Eliminar', peligro: true
    }).then(ok => {
      if (!ok) return;
      this.srv.eliminar(id).subscribe({
        next: () => {
          this.notify.ok('Equipo eliminado.');
          this.cargar();
        },
        error: err => this.notify.error(mensajeError(err))
      });
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
