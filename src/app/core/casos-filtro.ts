import { Equipo, Incidencia, UsuarioResumen } from '../models/models';

export interface FiltroCasos {
  texto: string;
  prioridad: string;
  canal: string;
  tipo: string;
  tecnico: string;
  orden: string;
}

export const FILTRO_VACIO: FiltroCasos = { texto: '', prioridad: '', canal: '', tipo: '', tecnico: '', orden: 'id-desc' };

const PESO: Record<string, number> = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAJA: 3 };
const norm = (t: string | null | undefined) =>
  (t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function aplicarFiltro(
  lista: Incidencia[], f: FiltroCasos, equipos: Equipo[],
  clientes: UsuarioResumen[], tecnicos: UsuarioResumen[]
): Incidencia[] {
  const eq = (id: number) => equipos.find(e => e.id === id);
  const q = norm(f.texto).trim();
  const salida = lista.filter(i => {
    const e = eq(i.equipoId);
    if (f.prioridad && i.prioridad !== f.prioridad) return false;
    if (f.canal && i.canal !== f.canal) return false;
    if (f.tipo && e?.tipo !== f.tipo) return false;
    if (f.tecnico === 'SIN' && i.tecnicoId) return false;
    if (f.tecnico && f.tecnico !== 'SIN' && String(i.tecnicoId) !== f.tecnico) return false;
    if (!q) return true;
    const cliente = clientes.find(c => c.id === i.solicitanteId)?.nombre;
    const tec = tecnicos.find(t => t.id === i.tecnicoId)?.nombre;
    const pajar = norm([i.id, i.titulo, i.descripcion, e?.nombre, e?.tipo, e?.marca, e?.modelo, e?.numeroSerie, cliente, tec].join(' '));
    return pajar.includes(q);
  });
  const [campo, dir] = f.orden.split('-');
  const mult = dir === 'asc' ? 1 : -1;
  return salida.sort((a, b) => {
    switch (campo) {
      case 'prio': return ((PESO[a.prioridad] ?? 9) - (PESO[b.prioridad] ?? 9)) * (dir === 'asc' ? 1 : -1);
      case 'tipo': return (eq(a.equipoId)?.tipo ?? '').localeCompare(eq(b.equipoId)?.tipo ?? '') * (dir === 'asc' ? 1 : -1);
      case 'fecha': return (a.fechaReporte ?? '').localeCompare(b.fechaReporte ?? '') * mult;
      default: return ((a.id ?? 0) - (b.id ?? 0)) * mult;
    }
  });
}
