import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Rol } from '../models/models';
import { AuthService } from './auth.service';

export const rolGuard = (...roles: Rol[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  return auth.tieneRol(...roles) ? true : inject(Router).createUrlTree(['/dashboard']);
};
