import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { EquipoService } from '../core/equipo.service';
import { IncidenciaService } from '../core/incidencia.service';
import { MantenimientoService } from '../core/mantenimiento.service';
import { aplicarFiltro, FILTRO_VACIO, FiltroCasos } from '../core/casos-filtro';
import { FiltrosCasos } from '../shared/filtros-casos';
import { ESTADOS_INCIDENCIA, ETIQUETA_ESTADO, Equipo, EstadoIncidencia, Incidencia, UsuarioResumen } from '../models/models';

@Component({
  imports: [DatePipe, RouterLink, FiltrosCasos],
  template: `
    <section class="bienvenida glass-strong">
      <div>
        <h1>Hola, {{ auth.usuario()?.nombre }}</h1>
        <p class="muted">{{ subtitulo() }}</p>
      </div>
      <span class="badge grande">{{ auth.usuario()?.rol }}</span>
    </section>

    @if (auth.tieneRol('USUARIO')) {
      <div class="cards">
        <div class="card stat glass">
          <span class="stat-label">Mis equipos</span>
          <span class="stat-value">{{ equipos()?.length ?? '—' }}</span>
        </div>
        <div class="card stat glass">
          <span class="stat-label">En taller ahora</span>
          <span class="stat-value">{{ enCurso() }}</span>
        </div>
        <div class="card stat glass">
          <span class="stat-label">Listos para recoger</span>
          <span class="stat-value">{{ contar('FINALIZADO') }}</span>
        </div>
      </div>
      <div class="card glass table-wrap">
        <div class="page-head"><h2>Mis últimos casos</h2><a routerLink="/incidencias">Ver seguimiento</a></div>
        @if (ultimas().length === 0) {
          <p class="muted">Aún no reportaste ninguna falla.</p>
        } @else {
          <table>
            <thead><tr><th>Caso</th><th>Equipo</th><th>Estado</th><th>Fecha</th></tr></thead>
            <tbody>
              @for (i of ultimas(); track i.id) {
                <tr>
                  <td>{{ i.titulo }}</td>
                  <td>{{ nombreEquipo(i.equipoId) }}</td>
                  <td><span class="pill est-{{ i.estado }}">{{ etiqueta(i.estado) }}</span></td>
                  <td>{{ i.fechaReporte | date: 'dd/MM/yyyy HH:mm' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    } @else {
      <div class="cards">
        <div class="card stat glass urgente">
          <span class="stat-label">Esperando técnico</span>
          <span class="stat-value">{{ esperando() }}</span>
          <span class="muted small">equipos sin atender</span>
        </div>
        <div class="card stat glass">
          <span class="stat-label">{{ auth.tieneRol('TECNICO') ? 'Mis casos en curso' : 'Casos en curso' }}</span>
          <span class="stat-value">{{ enCursoStaff() }}</span>
          <span class="muted small">análisis o reparación</span>
        </div>
        <div class="card stat glass">
          <span class="stat-label">{{ auth.tieneRol('TECNICO') ? 'Finalizados por mí' : 'Finalizados' }}</span>
          <span class="stat-value">{{ finalizadosStaff() }}</span>
          <span class="muted small">listos para entregar</span>
        </div>
        <div class="card stat glass">
          <span class="stat-label">Equipos de clientes</span>
          <span class="stat-value">{{ equipos()?.length ?? '—' }}</span>
          <span class="muted small">{{ mantenimientos() ?? '—' }} mantenimientos</span>
        </div>
      </div>

      <div class="dos-col">
        <div class="card glass">
          <h2>Casos por estado</h2>
          @if (incidencias() === null) {
            <p class="muted">No se pudo cargar el servicio de incidencias.</p>
          } @else {
            @for (e of estados; track e) {
              <div class="bar-row">
                <span class="bar-label">{{ etiqueta(e) }}</span>
                <div class="bar"><div class="bar-fill" [style.width.%]="porcentaje(contar(e))"></div></div>
                <span class="bar-num">{{ contar(e) }}</span>
              </div>
            }
          }
        </div>
        <div class="card glass">
          <h2>Lo que sigue</h2>
          <p class="muted">
            {{ auth.tieneRol('TECNICO')
              ? 'Entra a Casos, mira la lista «En espera» y toma el equipo que vas a atender.'
              : 'Revisa «En espera» en Casos: allí puedes asignar un técnico o recibir un equipo en mostrador.' }}
          </p>
          <a class="btn" routerLink="/incidencias">Ir a Casos</a>
        </div>
      </div>

      <h2 class="titulo-sec">Todos los casos</h2>
      <app-filtros-casos [tipos]="tiposEquipo()" [tecnicos]="tecnicos()" (cambio)="filtro.set($event)" />
      <div class="card glass table-wrap tabla-fija">
        @if (tabla().length === 0) {
          <p class="muted">No hay casos con ese filtro.</p>
        } @else {
          <table>
            <thead>
              <tr><th>#</th><th>Caso</th><th>Equipo</th><th>Cliente</th><th>Urgencia</th><th>Llegó por</th><th>Técnico</th><th>Estado</th><th>Fecha</th></tr>
            </thead>
            <tbody>
              @for (i of tabla(); track i.id) {
                <tr>
                  <td>{{ i.id }}</td>
                  <td><strong>{{ i.titulo }}</strong></td>
                  <td>{{ nombreEquipo(i.equipoId) }}<br /><span class="muted small">{{ tipoEquipo(i.equipoId) }}</span></td>
                  <td>{{ nombreCliente(i.solicitanteId) }}</td>
                  <td><span class="pill prio-{{ i.prioridad }}">{{ i.prioridad }}</span></td>
                  <td>{{ i.canal === 'PRESENCIAL' ? 'Mostrador' : 'En línea' }}</td>
                  <td>@if (i.tecnicoId) { {{ nombreTecnico(i.tecnicoId) }} } @else { <span class="pill est-DEVUELTO">Falta técnico</span> }</td>
                  <td><span class="pill est-{{ i.estado }}">{{ etiqueta(i.estado) }}</span></td>
                  <td>{{ i.fechaReporte | date: 'dd/MM/yyyy' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    }
  `
})
export class Dashboard implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly equipoSrv = inject(EquipoService);
  private readonly incidenciaSrv = inject(IncidenciaService);
  private readonly mantenimientoSrv = inject(MantenimientoService);

  protected readonly estados = ESTADOS_INCIDENCIA;
  protected readonly equipos = signal<Equipo[] | null>(null);
  protected readonly mantenimientos = signal<number | null>(null);
  protected readonly incidencias = signal<Incidencia[] | null>(null);
  protected readonly clientes = signal<UsuarioResumen[]>([]);
  protected readonly tecnicos = signal<UsuarioResumen[]>([]);
  protected readonly filtro = signal<FiltroCasos>({ ...FILTRO_VACIO });
  protected readonly tiposEquipo = computed(() => [...new Set((this.equipos() ?? []).map(e => e.tipo))].sort());
  protected readonly tabla = computed(() =>
    aplicarFiltro(this.lista(), this.filtro(), this.equipos() ?? [], this.clientes(), this.tecnicos()));

  protected readonly lista = computed(() => this.incidencias() ?? []);
  protected readonly esperando = computed(() =>
    this.lista().filter(i => (i.estado === 'RECIBIDO' || i.estado === 'DEVUELTO') && !i.tecnicoId).length);
  protected readonly enCurso = computed(() =>
    this.lista().filter(i => i.estado !== 'FINALIZADO').length);
  private readonly propios = computed(() => {
    const yo = this.auth.usuario();
    return yo?.rol === 'TECNICO' ? this.lista().filter(i => i.tecnicoId === yo.id) : this.lista();
  });
  protected readonly enCursoStaff = computed(() =>
    this.propios().filter(i => i.estado === 'EN_ANALISIS' || i.estado === 'EN_REPARACION').length);
  protected readonly finalizadosStaff = computed(() =>
    this.propios().filter(i => i.estado === 'FINALIZADO').length);
  protected readonly ultimas = computed(() =>
    [...this.lista()].sort((a, b) => (b.fechaReporte ?? '').localeCompare(a.fechaReporte ?? '')).slice(0, 5));

  protected readonly subtitulo = computed(() => {
    switch (this.auth.usuario()?.rol) {
      case 'USUARIO': return 'Resumen de tus equipos y de lo que está en reparación.';
      case 'TECNICO': return 'Tu carga de trabajo y los equipos que esperan técnico.';
      default: return 'Vista general del taller.';
    }
  });

  ngOnInit(): void {
    const staff = !this.auth.tieneRol('USUARIO');
    forkJoin({
      e: this.equipoSrv.listar().pipe(catchError(() => of(null))),
      i: this.incidenciaSrv.listar().pipe(catchError(() => of(null))),
      m: staff ? this.mantenimientoSrv.listar().pipe(catchError(() => of(null))) : of(null),
      c: staff ? this.auth.clientes().pipe(catchError(() => of([] as UsuarioResumen[]))) : of([] as UsuarioResumen[]),
      t: this.auth.tecnicos().pipe(catchError(() => of([] as UsuarioResumen[])))
    }).subscribe(r => {
      this.clientes.set(r.c);
      this.tecnicos.set(r.t);
      this.equipos.set(r.e);
      this.mantenimientos.set(r.m ? r.m.length : null);
      this.incidencias.set(r.i);
    });
  }

  protected tipoEquipo(id: number): string {
    return (this.equipos() ?? []).find(x => x.id === id)?.tipo ?? '';
  }

  protected nombreCliente(id?: number | null): string {
    return this.clientes().find(x => x.id === id)?.nombre ?? '—';
  }

  protected nombreTecnico(id?: number | null): string {
    return this.tecnicos().find(x => x.id === id)?.nombre ?? '—';
  }

  protected etiqueta(e?: EstadoIncidencia): string {
    return e ? ETIQUETA_ESTADO[e] : '';
  }

  protected nombreEquipo(id: number): string {
    return (this.equipos() ?? []).find(x => x.id === id)?.nombre ?? `#${id}`;
  }

  protected contar(estado: EstadoIncidencia): number {
    return this.lista().filter(i => i.estado === estado).length;
  }

  protected porcentaje(cantidad: number): number {
    const total = this.lista().length;
    return total === 0 ? 0 : (cantidad * 100) / total;
  }
}
