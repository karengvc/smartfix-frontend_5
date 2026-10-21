import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { mensajeError } from './core/http-error';
import { HttpErrorResponse } from '@angular/common/http';

describe('App', () => {
  it('se crea correctamente', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])]
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra el mensaje que devuelve el servicio', () => {
    const err = new HttpErrorResponse({ status: 400, error: { mensaje: 'Error de validación' } });
    expect(mensajeError(err)).toBe('Error de validación');
  });

  it('avisa cuando no hay conexión con el servicio', () => {
    const err = new HttpErrorResponse({ status: 0 });
    expect(mensajeError(err)).toContain('No se pudo conectar');
  });
});
