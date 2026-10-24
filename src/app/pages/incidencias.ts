import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { aplicarFiltro, FILTRO_VACIO, FiltroCasos } from '../core/casos-filtro';
import { FiltrosCasos } from '../shared/filtros-casos';
import { Observable, forkJoin, catchError, of } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { ConfirmService } from '../core/confirm.service';
import { EquipoService } from '../core/equipo.service';
import { mensajeError } from '../core/http-error';
import { IncidenciaService } from '../core/incidencia.service';
import { NotifyService } from '../core/notify.service';
import {
  ESTADOS_INCIDENCIA, ETIQUETA_ESTADO, Equipo, EstadoIncidencia, HistorialIncidencia,
  Incidencia, PASOS, UsuarioResumen
} from '../models/models';

type Filtro = 'ESPERA' | 'CURSO' | 'FIN' | 'TODOS';

@Component({
  imports: [ReactiveFormsModule, FormsModule, DatePipe, FiltrosCasos],
  template: `
    <div class="page-head">
      <div>
        @if (esUsuario()) {
          <h1>Seguimiento de mis equipos</h1>
          <p class="muted">Aquí ves en qué paso va cada equipo que dejaste.</p>
        } @else {
          <h1>Casos</h1>
          <p class="muted">Equipos que llegaron al taller, en línea o en mostrador.</p>
        }
      </div>
      @if (auth.tieneRol('USUARIO', 'ADMINISTRADOR', 'TECNICO')) {
        <button class="btn" (click)="nueva()">{{ esUsuario() ? '+ Reportar una falla' : '+ Recibir equipo en mostrador' }}</button>
      }
    </div>

    @if (mostrarForm()) {
      <form class="card form-grid glass-strong" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        <h2 class="span-2">{{ editandoId() ? 'Editar caso' : (esUsuario() ? 'Reportar una falla' : 'Recibir equipo en mostrador') }}</h2>

        @if (!esUsuario() && !editandoId()) {
          <label class="span-2 check"><input type="checkbox" formControlName="clienteNuevo" (change)="cambiarCliente()" /> El cliente no tiene cuenta (crearla ahora)</label>
        }
        @if (!esUsuario() && !editandoId() && form.controls.clienteNuevo.value) {
          <label>Nombre del cliente *<input formControlName="nuevoNombre" /></label>
          <label>Correo para su cuenta *<input type="email" formControlName="nuevoCorreo" placeholder="cliente@correo.com" /></label>
          <small class="span-2 muted">Su contraseña inicial será «Cliente123». Entrégale estos datos al cliente para que siga su equipo.</small>
        }
        @if (!esUsuario() && !editandoId() && !form.controls.clienteNuevo.value) {
          <label class="span-2">Cliente *
            <select formControlName="solicitanteId" (change)="cambiarCliente()">
              <option [ngValue]="0" disabled>Selecciona al cliente</option>
              @for (c of clientes(); track c.id) {
                <option [ngValue]="c.id">{{ c.nombre }}</option>
              }
            </select>
            @if (invalido('solicitanteId')) { <small class="error">Selecciona al cliente.</small> }
          </label>
        }
        @if (equipoNuevo()) {
          <label>Equipo *<input formControlName="eqNombre" placeholder="Ej. Laptop Dell" /></label>
          <label>Tipo *<input formControlName="eqTipo" list="tiposEq" placeholder="Laptop, Impresora..." />
            <datalist id="tiposEq"><option value="Laptop"></option><option value="Computadora"></option><option value="Impresora"></option><option value="Monitor"></option><option value="Tablet"></option></datalist></label>
          <label>Marca *<input formControlName="eqMarca" /></label>
        }
        @if (!form.controls.clienteNuevo.value || esUsuario()) {
        <label class="span-2">Equipo *
          <select formControlName="equipoId" (change)="refrescarEquipoNuevo()">
            <option [ngValue]="0" disabled>Selecciona un equipo</option>
            @for (e of equiposDelForm(); track e.id) {
              <option [ngValue]="e.id">{{ e.nombre }} · {{ e.marca }}</option>
            }
            @if (!esUsuario() && !editandoId()) { <option [ngValue]="-1">+ Otro equipo (nuevo)</option> }
          </select>
          @if (invalido('equipoId')) { <small class="error">Selecciona el equipo.</small> }
          @if (equiposDelForm().length === 0 && esUsuario()) {
            <small class="muted">Primero deja tu equipo en «Mis equipos».</small>
          }
        </label>
        }
        <label class="span-2">¿Qué le pasa? *
          <input formControlName="titulo" placeholder="Ej. No enciende" />
          @if (invalido('titulo')) { <small class="error">Cuéntanos qué falla tiene.</small> }
        </label>
        <label class="span-2">Detalle *
          <textarea rows="2" formControlName="descripcion"></textarea>
          @if (invalido('descripcion')) { <small class="error">Agrega un detalle.</small> }
        </label>
        <label>Urgencia *
          <select formControlName="prioridad">
            <option value="BAJA">Baja</option>
            <option value="MEDIA">Media</option>
            <option value="ALTA">Alta</option>
            <option value="CRITICA">Crítica</option>
          </select>
        </label>

        <div class="span-2 actions">
          <button class="btn" type="submit" [disabled]="guardando()">Enviar</button>
          <button class="btn btn-light" type="button" (click)="mostrarForm.set(false)">Cancelar</button>
        </div>
      </form>
    }

    @if (esUsuario()) {
      @if (cargando()) {
        <p class="muted">Cargando...</p>
      } @else if (incidencias().length === 0) {
        <div class="card glass"><p class="muted">Todavía no tienes casos. Si tu equipo falla, repórtalo con el botón de arriba.</p></div>
      }
      @for (i of incidencias(); track i.id) {
        <article class="card glass caso">
          <div class="caso-head">
            <div>
              <h2>{{ i.titulo }}</h2>
              <span class="muted small">{{ nombreEquipo(i.equipoId) }} · {{ i.canal === 'PRESENCIAL' ? 'Entregado en tienda' : 'Reportado en línea' }} · {{ i.fechaReporte | date: 'dd/MM/yyyy HH:mm' }}</span>
            </div>
            <span class="pill est-{{ i.estado }}">{{ etiqueta(i.estado) }}</span>
          </div>

          <ol class="stepper">
            @for (p of pasos; track p; let n = $index) {
              <li [class.hecho]="n < paso(i)" [class.actual]="n === paso(i)">
                <span class="punto">{{ n < paso(i) ? '✓' : n + 1 }}</span>
                <span>{{ etiqueta(p) }}</span>
              </li>
            }
          </ol>

          <p class="atiende">
            @if (i.estado === 'FINALIZADO') {
              Tu equipo está listo. Puedes pasar a recogerlo.
            } @else if (i.tecnicoId) {
              Lo atiende <strong>{{ nombreTecnico(i.tecnicoId) }}</strong>.
            } @else {
              En espera de que un técnico lo tome.
            }
          </p>
          @if (i.estado === 'DEVUELTO') {
            <p class="aviso">Lo devolviste: «{{ i.motivoDevolucion }}». Volvió a la fila de atención.</p>
          }
          @if ((i.reingresos ?? 0) > 0 && i.estado !== 'DEVUELTO') {
            <p class="muted small">Este caso volvió a taller {{ i.reingresos }} {{ i.reingresos === 1 ? 'vez' : 'veces' }}.</p>
          }

          <div class="actions">
            <button class="btn btn-light" (click)="alternarHistorial(i)">{{ abierto() === i.id ? 'Ocultar historial' : 'Ver historial' }}</button>
            @if (i.estado === 'FINALIZADO') {
              <button class="btn btn-light" (click)="devolver(i)">No quedó bien</button>
              <button class="btn btn-light" (click)="otroProblema(i)">Tiene otro problema</button>
            }
          </div>
          @if (abierto() === i.id) {
            <ul class="timeline">
              @for (x of historial(); track x.id) {
                <li>
                  <span class="pill est-{{ x.estadoNuevo }}">{{ etiqueta(x.estadoNuevo) }}</span>
                  <span>{{ x.descripcion }}</span>
                  <small class="muted">{{ x.fechaCambio | date: 'dd/MM/yyyy HH:mm' }}</small>
                </li>
              }
            </ul>
          }
        </article>
      }
    } @else {
      <div class="filtros">
        @for (f of filtros; track f.id) {
          <button class="chip" [class.on]="filtro() === f.id" (click)="filtro.set(f.id)">{{ f.texto }} ({{ contar(f.id) }})</button>
        }
      </div>

      <app-filtros-casos [tipos]="tiposEquipo()" [tecnicos]="tecnicos()" (cambio)="filtroCasos.set($event)" />

      @if (historialDe(); as hid) {
        <div class="card glass">
          <div class="page-head">
            <h2>Seguimiento del caso #{{ hid }}</h2>
            <button class="link" (click)="historialDe.set(null)">Cerrar</button>
          </div>
          <ul class="timeline">
            @for (x of historial(); track x.id) {
              <li>
                <span class="pill est-{{ x.estadoNuevo }}">{{ etiqueta(x.estadoNuevo) }}</span>
                <span>{{ x.descripcion }}</span>
                <small class="muted">{{ x.fechaCambio | date: 'dd/MM/yyyy HH:mm' }}</small>
              </li>
            }
          </ul>
        </div>
      }

      @if (asignando(); as inc) {
        <div class="card glass inline-form">
          <strong>{{ inc.tecnicoId ? 'Reasignar' : 'Asignar' }} el caso #{{ inc.id }}</strong>
          <label>Técnico
            <select [(ngModel)]="tecnicoId">
              <option [ngValue]="null" disabled>Selecciona un técnico</option>
              @for (t of tecnicos(); track t.id) {
                <option [ngValue]="t.id">{{ t.nombre }}</option>
              }
            </select>
          </label>
          <button class="btn" (click)="confirmarAsignacion()">Guardar</button>
          <button class="btn btn-light" (click)="asignando.set(null)">Cancelar</button>
        </div>
      }

      @if (corrigiendo(); as inc) {
        <div class="card glass inline-form">
          <strong>Corregir el estado del caso #{{ inc.id }}</strong>
          <label>Nuevo estado
            <select [(ngModel)]="estadoNuevo">
              @for (e of estadosTodos; track e) {
                <option [ngValue]="e">{{ etiqueta(e) }}</option>
              }
            </select>
          </label>
          <label>Técnico {{ necesitaTecnico() ? '(obligatorio)' : '(opcional)' }}
            <select [(ngModel)]="tecnicoCorreccion">
              <option [ngValue]="null">{{ inc.tecnicoId ? 'Mantener ' + nombreTecnico(inc.tecnicoId) : 'Sin técnico' }}</option>
              @for (t of tecnicos(); track t.id) {
                <option [ngValue]="t.id">{{ t.nombre }}</option>
              }
            </select>
          </label>
          <button class="btn" (click)="confirmarEstado()">Aplicar</button>
          <button class="btn btn-light" (click)="corrigiendo.set(null)">Cancelar</button>
        </div>
      }

      <div class="card glass table-wrap tabla-fija">
        @if (cargando()) {
          <p class="muted">Cargando...</p>
        } @else if (visibles().length === 0) {
          <p class="muted">No hay casos en esta lista.</p>
        } @else {
          <table>
            <thead>
              <tr><th>#</th><th>Caso</th><th>Cliente</th><th>Urgencia</th><th>Llegó por</th><th>Técnico</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              @for (i of visibles(); track i.id) {
                <tr>
                  <td>{{ i.id }}</td>
                  <td>
                    <strong>{{ i.titulo }}</strong><br />
                    <span class="muted small">{{ nombreEquipo(i.equipoId) }}</span>
                    @if (i.estado === 'DEVUELTO') { <br /><span class="small error">Devuelto: {{ i.motivoDevolucion }}</span> }
                  </td>
                  <td>{{ nombreCliente(i.solicitanteId) }}</td>
                  <td><span class="pill prio-{{ i.prioridad }}">{{ i.prioridad }}</span></td>
                  <td>{{ i.canal === 'PRESENCIAL' ? 'Mostrador' : 'En línea' }}</td>
                  <td>{{ nombreTecnico(i.tecnicoId) }}</td>
                  <td><span class="pill est-{{ i.estado }}">{{ etiqueta(i.estado) }}</span></td>
                  <td><div class="row-actions">
                    @if (auth.tieneRol('TECNICO')) {
                      @if (enEspera(i)) {
                        <button class="btn mini" (click)="tomar(i)">Tomar caso</button>
                      } @else if (esMio(i) && siguiente(i); as sig) {
                        <button class="btn mini" (click)="avanzar(i, sig)">Pasar a {{ etiqueta(sig) }}</button>
                      }
                    }
                    @if (auth.tieneRol('ADMINISTRADOR')) {
                      @if (i.estado !== 'FINALIZADO') {
                        <button class="acc acc-azul" (click)="abrirAsignacion(i)">{{ i.tecnicoId ? 'Reasignar' : 'Asignar' }}</button>
                      }
                      @if (siguiente(i); as sig) {
                        <button class="acc acc-verde" (click)="avanzar(i, sig)">Pasar a {{ etiqueta(sig) }}</button>
                      }
                      <button class="acc acc-naranja" (click)="abrirCorreccion(i)">Corregir estado</button>
                      <button class="acc acc-gris" (click)="editar(i)">🛠 Editar</button>
                      <button class="acc acc-rojo" (click)="eliminar(i)">Eliminar</button>
                    }
                    <button class="acc acc-morado" (click)="verHistorial(i)"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg> Seguimiento</button>
                  </div></td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    }
  `
})
export class Incidencias implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly srv = inject(IncidenciaService);
  private readonly equipoSrv = inject(EquipoService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly notify = inject(NotifyService);
  private readonly confirmar = inject(ConfirmService);

  protected readonly pasos = PASOS;
  protected readonly estadosTodos = ESTADOS_INCIDENCIA;
  protected readonly filtros: { id: Filtro; texto: string }[] = [
    { id: 'ESPERA', texto: 'En espera' },
    { id: 'CURSO', texto: 'En curso' },
    { id: 'FIN', texto: 'Finalizados' },
    { id: 'TODOS', texto: 'Todos' }
  ];

  protected readonly incidencias = signal<Incidencia[]>([]);
  protected readonly equipos = signal<Equipo[]>([]);
  protected readonly tecnicos = signal<UsuarioResumen[]>([]);
  protected readonly clientes = signal<UsuarioResumen[]>([]);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly mostrarForm = signal(false);
  protected readonly editandoId = signal<number | null>(null);
  protected readonly asignando = signal<Incidencia | null>(null);
  protected readonly corrigiendo = signal<Incidencia | null>(null);
  protected readonly historial = signal<HistorialIncidencia[]>([]);
  protected readonly historialDe = signal<number | null>(null);
  protected readonly abierto = signal<number | null>(null);
  protected readonly filtro = signal<Filtro>('ESPERA');
  protected readonly clienteForm = signal(0);
  protected readonly filtroCasos = signal<FiltroCasos>({ ...FILTRO_VACIO });
  protected readonly tiposEquipo = computed(() => [...new Set(this.equipos().map(e => e.tipo))].sort());
  protected tecnicoId: number | null = null;
  protected tecnicoCorreccion: number | null = null;
  protected estadoNuevo: EstadoIncidencia = 'RECIBIDO';

  protected readonly esUsuario = computed(() => this.auth.tieneRol('USUARIO'));
  protected readonly visibles = computed(() => {
    const f = this.filtro();
    const base = this.incidencias().filter(i => f === 'TODOS' || this.filtroCasos().estado || this.coincide(i, f));
    return aplicarFiltro(base, this.filtroCasos(), this.equipos(), this.clientes(), this.tecnicos());
  });
  protected readonly equiposDelForm = computed(() => {
    if (this.esUsuario() || this.editandoId()) return this.equipos();
    const c = this.clienteForm();
    return this.equipos().filter(e => e.propietarioId === c);
  });

  protected readonly form = this.fb.group({
    solicitanteId: [0],
    titulo: ['', Validators.required],
    descripcion: ['', Validators.required],
    prioridad: ['MEDIA', Validators.required],
    equipoId: [0, [Validators.required, Validators.min(-1)]],
    clienteNuevo: [false],
    nuevoNombre: [''],
    nuevoCorreo: [''],
    eqNombre: [''],
    eqTipo: [''],
    eqMarca: ['']
  });
  protected readonly equipoNuevo = signal(false);

  ngOnInit(): void {
    const staff = !this.esUsuario();
    forkJoin({
      equipos: this.equipoSrv.listar().pipe(catchError(() => of([] as Equipo[]))),
      tecnicos: this.auth.tecnicos().pipe(catchError(() => of([] as UsuarioResumen[]))),
      clientes: staff ? this.auth.clientes().pipe(catchError(() => of([] as UsuarioResumen[]))) : of([] as UsuarioResumen[])
    }).subscribe(r => {
      this.equipos.set(r.equipos);
      this.tecnicos.set(r.tecnicos);
      this.clientes.set(r.clientes);
    });
    this.cargar();
  }

  private coincide(i: Incidencia, f: Filtro): boolean {
    if (f === 'ESPERA') return this.enEspera(i);
    if (f === 'CURSO') return i.estado === 'EN_ANALISIS' || i.estado === 'EN_REPARACION';
    return i.estado === 'FINALIZADO';
  }

  protected contar(f: Filtro): number {
    return f === 'TODOS' ? this.incidencias().length : this.incidencias().filter(i => this.coincide(i, f)).length;
  }

  protected enEspera(i: Incidencia): boolean {
    return (i.estado === 'RECIBIDO' || i.estado === 'DEVUELTO') && !i.tecnicoId;
  }

  protected esMio(i: Incidencia): boolean {
    return i.tecnicoId === this.auth.usuario()?.id;
  }

  protected etiqueta(e?: EstadoIncidencia): string {
    return e ? ETIQUETA_ESTADO[e] : '';
  }

  protected paso(i: Incidencia): number {
    return i.estado === 'DEVUELTO' ? 0 : PASOS.indexOf(i.estado ?? 'RECIBIDO');
  }

  protected siguiente(i: Incidencia): EstadoIncidencia | null {
    if (!i.tecnicoId) return null;
    if (i.estado === 'EN_ANALISIS') return 'EN_REPARACION';
    if (i.estado === 'EN_REPARACION') return 'FINALIZADO';
    return null;
  }

  protected invalido(campo: 'titulo' | 'descripcion' | 'equipoId' | 'solicitanteId'): boolean {
    const c = this.form.controls[campo];
    if (campo === 'solicitanteId') return c.touched && Number(c.value) < 1 && !this.esUsuario();
    return c.touched && c.invalid;
  }

  protected nombreEquipo(id: number): string {
    const e = this.equipos().find(x => x.id === id);
    return e ? e.nombre : `Equipo #${id}`;
  }

  protected nombreTecnico(id?: number | null): string {
    if (!id) return '—';
    const t = this.tecnicos().find(x => x.id === id);
    return t ? t.nombre : `#${id}`;
  }

  protected nombreCliente(id?: number | null): string {
    if (!id) return '—';
    const c = this.clientes().find(x => x.id === id);
    return c ? c.nombre : `#${id}`;
  }

  // ---- seguimiento ----
  private cargarHistorial(id: number, despues: (h: HistorialIncidencia[]) => void): void {
    this.srv.historial(id).subscribe({
      next: h => despues(h),
      error: err => this.notify.error(mensajeError(err))
    });
  }

  protected verHistorial(i: Incidencia): void {
    if (!i.id) return;
    this.cargarHistorial(i.id, h => {
      this.historial.set(h);
      this.historialDe.set(i.id ?? null);
    });
  }

  protected alternarHistorial(i: Incidencia): void {
    if (!i.id) return;
    if (this.abierto() === i.id) {
      this.abierto.set(null);
      return;
    }
    this.cargarHistorial(i.id, h => {
      this.historial.set(h);
      this.abierto.set(i.id ?? null);
    });
  }

  // ---- formulario ----
  protected nueva(): void {
    this.editandoId.set(null);
    this.clienteForm.set(0);
    this.form.reset({ solicitanteId: 0, prioridad: 'MEDIA', equipoId: 0, clienteNuevo: false });
    this.equipoNuevo.set(false);
    this.mostrarForm.set(true);
  }

  protected otroProblema(i: Incidencia): void {
    this.editandoId.set(null);
    this.form.reset({ solicitanteId: 0, prioridad: 'MEDIA', equipoId: i.equipoId });
    this.mostrarForm.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected cambiarCliente(): void {
    this.clienteForm.set(this.form.controls.solicitanteId.value);
    this.form.controls.equipoId.setValue(this.form.controls.clienteNuevo.value ? -1 : 0);
    this.refrescarEquipoNuevo();
  }

  protected refrescarEquipoNuevo(): void {
    this.equipoNuevo.set(!this.esUsuario() && !this.editandoId() &&
      (this.form.controls.clienteNuevo.value || this.form.controls.equipoId.value === -1));
  }

  protected editar(i: Incidencia): void {
    this.editandoId.set(i.id ?? null);
    this.form.reset({
      solicitanteId: i.solicitanteId ?? 0, titulo: i.titulo, descripcion: i.descripcion,
      prioridad: i.prioridad, equipoId: i.equipoId
    });
    this.mostrarForm.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected guardar(): void {
    const id = this.editandoId();
    const v = this.form.getRawValue();
    if (!id && !this.esUsuario() && v.solicitanteId < 1 && !v.clienteNuevo) {
      this.form.markAllAsTouched();
      return;
    }
    if (!id && !this.esUsuario() && (v.clienteNuevo || v.equipoId === -1)) {
      this.guardarMostradorNuevo();
      return;
    }
    if (this.form.invalid || v.equipoId < 1) {
      this.form.markAllAsTouched();
      return;
    }
    const datos = {
      titulo: v.titulo, descripcion: v.descripcion, prioridad: v.prioridad, equipoId: v.equipoId,
      solicitanteId: this.esUsuario() ? null : v.solicitanteId
    } as Incidencia;
    this.guardando.set(true);
    const peticion = id ? this.srv.actualizar(id, datos) : this.srv.crear(datos);
    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.mostrarForm.set(false);
        this.notify.ok(id ? 'Caso actualizado.' : 'Caso registrado. Quedó en espera de un técnico.');
        this.cargar();
      },
      error: err => {
        this.guardando.set(false);
        this.notify.error(mensajeError(err));
      }
    });
  }

  private guardarMostradorNuevo(): void {
    const v = this.form.getRawValue();
    const faltan = !v.titulo.trim() || !v.descripcion.trim() || !v.eqNombre.trim() || !v.eqTipo.trim() || !v.eqMarca.trim()
      || (v.clienteNuevo ? (!v.nuevoNombre.trim() || !v.nuevoCorreo.trim()) : v.solicitanteId < 1);
    if (faltan) {
      this.notify.error('Completa los datos del cliente, del equipo y del problema.');
      return;
    }
    this.guardando.set(true);
    const falla = (cliente: number, equipoId: number) => this.srv.crear({
      titulo: v.titulo, descripcion: v.descripcion, prioridad: v.prioridad, equipoId, solicitanteId: cliente
    } as Incidencia);
    const equipo = (cliente: number) => this.equipoSrv.crear({
      nombre: v.eqNombre.trim(), tipo: v.eqTipo.trim(), marca: v.eqMarca.trim(), estado: 'ACTIVO', propietarioId: cliente
    } as Equipo);
    const fin = (msg: string) => {
      this.guardando.set(false);
      this.mostrarForm.set(false);
      this.notify.ok(msg);
      this.cargar();
      this.equipoSrv.listar().subscribe(l => this.equipos.set(l));
      this.auth.clientes().subscribe(c => this.clientes.set(c));
    };
    const error = (err: unknown) => {
      this.guardando.set(false);
      this.notify.error(mensajeError(err));
    };
    const seguir = (cliente: number, aviso: string) => equipo(cliente).subscribe({
      next: e => falla(cliente, e.id as number).subscribe({ next: () => fin(aviso), error }),
      error
    });
    if (v.clienteNuevo) {
      this.auth.registrar({ nombre: v.nuevoNombre.trim(), correo: v.nuevoCorreo.trim(), password: 'Cliente123' }).subscribe({
        next: u => seguir(u.id, `Cuenta creada: ${u.correo} · contraseña Cliente123. Equipo recibido.`),
        error
      });
    } else {
      seguir(v.solicitanteId, 'Equipo recibido. Quedó en espera de un técnico.');
    }
  }

  // ---- acciones con confirmación ----
  private ejecutar(peticion: Observable<unknown>, mensaje: string): void {
    peticion.subscribe({
      next: () => {
        this.notify.ok(mensaje);
        this.cargar();
      },
      error: err => {
        this.notify.error(mensajeError(err));
        this.cargar();
      }
    });
  }

  protected tomar(i: Incidencia): void {
    if (!i.id) return;
    const id = i.id;
    this.confirmar.preguntar({
      titulo: 'Tomar este caso',
      mensaje: 'Serás el responsable de este equipo y no podrás soltarlo. Solo el administrador puede reasignarlo.',
      boton: 'Tomar caso'
    }).then(ok => ok && this.ejecutar(this.srv.tomar(id), 'Caso tomado. Ya está en análisis.'));
  }

  protected avanzar(i: Incidencia, sig: EstadoIncidencia): void {
    if (!i.id) return;
    const id = i.id;
    this.confirmar.preguntar({
      titulo: `Pasar a «${this.etiqueta(sig)}»`,
      mensaje: sig === 'FINALIZADO'
        ? 'El cliente verá que su equipo está listo para recoger.'
        : 'El cliente verá este avance en su seguimiento.',
      boton: 'Confirmar'
    }).then(ok => ok && this.ejecutar(this.srv.avanzar(id), `Caso en «${this.etiqueta(sig)}».`));
  }

  protected abrirAsignacion(i: Incidencia): void {
    this.tecnicoId = i.tecnicoId ?? null;
    this.asignando.set(i);
    this.corrigiendo.set(null);
  }

  protected confirmarAsignacion(): void {
    const inc = this.asignando();
    if (!inc?.id || !this.tecnicoId) {
      this.notify.error('Selecciona un técnico.');
      return;
    }
    const id = inc.id;
    const tec = this.tecnicoId;
    this.confirmar.preguntar({
      titulo: inc.tecnicoId ? 'Reasignar caso' : 'Asignar caso',
      mensaje: `El caso #${id} quedará a cargo de ${this.nombreTecnico(tec)}.`,
      boton: 'Guardar'
    }).then(ok => {
      if (!ok) return;
      this.asignando.set(null);
      this.ejecutar(this.srv.asignar(id, tec), 'Técnico asignado.');
    });
  }

  protected abrirCorreccion(i: Incidencia): void {
    this.estadoNuevo = i.estado ?? 'RECIBIDO';
    this.tecnicoCorreccion = null;
    this.corrigiendo.set(i);
    this.asignando.set(null);
  }

  protected necesitaTecnico(): boolean {
    const e = this.estadoNuevo;
    return (e === 'EN_ANALISIS' || e === 'EN_REPARACION' || e === 'FINALIZADO') && !this.corrigiendo()?.tecnicoId;
  }

  protected confirmarEstado(): void {
    const inc = this.corrigiendo();
    if (!inc?.id) return;
    if (this.necesitaTecnico() && !this.tecnicoCorreccion) {
      this.notify.error('Elige el técnico que se encargará de este caso.');
      return;
    }
    const id = inc.id;
    const nuevo = this.estadoNuevo;
    const tec = this.tecnicoCorreccion;
    this.confirmar.preguntar({
      titulo: 'Corregir estado',
      mensaje: `El caso #${id} pasará de «${this.etiqueta(inc.estado)}» a «${this.etiqueta(nuevo)}». Quedará registrado en el historial.`,
      boton: 'Aplicar', peligro: true
    }).then(ok => {
      if (!ok) return;
      this.corrigiendo.set(null);
      this.ejecutar(this.srv.cambiarEstado(id, nuevo, tec), 'Estado corregido.');
    });
  }

  protected devolver(i: Incidencia): void {
    if (!i.id) return;
    const id = i.id;
    this.confirmar.preguntar({
      titulo: 'Devolver el equipo',
      mensaje: 'Cuéntanos qué sigue fallando. El caso volverá a la fila de atención.',
      boton: 'Devolver', pideMotivo: true
    }).then(motivo => motivo && this.ejecutar(this.srv.devolver(id, motivo), 'Enviamos tu equipo de vuelta a revisión.'));
  }

  protected eliminar(i: Incidencia): void {
    if (!i.id) return;
    const id = i.id;
    this.confirmar.preguntar({
      titulo: 'Eliminar caso',
      mensaje: `Se borrará «${i.titulo}» con todo su historial. No se puede deshacer.`,
      boton: 'Eliminar', peligro: true
    }).then(ok => ok && this.ejecutar(this.srv.eliminar(id), 'Caso eliminado.'));
  }

  private cargar(): void {
    this.cargando.set(true);
    this.srv.listar().subscribe({
      next: lista => {
        this.incidencias.set(
          [...lista].sort((a, b) => (b.fechaReporte ?? '').localeCompare(a.fechaReporte ?? '')));
        this.cargando.set(false);
      },
      error: err => {
        this.cargando.set(false);
        this.notify.error(mensajeError(err));
      }
    });
  }
}
