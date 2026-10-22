import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { Dashboard } from './pages/dashboard';
import { Equipos } from './pages/equipos';
import { Incidencias } from './pages/incidencias';
import { Login } from './pages/login';
import { Mantenimientos } from './pages/mantenimientos';
import { Register } from './pages/register';
import { Shell } from './pages/shell';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'registro', component: Register },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: Dashboard },
      { path: 'equipos', component: Equipos },
      { path: 'incidencias', component: Incidencias },
      { path: 'mantenimientos', component: Mantenimientos }
    ]
  },
  { path: '**', redirectTo: '' }
];
