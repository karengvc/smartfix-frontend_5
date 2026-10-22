# smartfix-frontend_5

Interfaz web de SmartFix (gestión de incidencias y mantenimiento de equipos tecnológicos).
Angular 21 · Node.js 22 · npm · TypeScript · CSS.

## Pantallas

- Inicio de sesión y registro de usuarios (`/login`, `/registro`).
- Dashboard con cantidad de equipos, incidencias abiertas, mantenimientos e incidencias por estado.
- Equipos: listar, registrar, editar y eliminar.
- Incidencias: registrar, editar, eliminar, asignar técnico y avanzar de estado
  (REPORTADA → ASIGNADA → EN_PROCESO → RESUELTA → CERRADA).
- Mantenimientos: listar, registrar, editar y eliminar.

Todas las pantallas validan los campos obligatorios y muestran un mensaje cuando la operación sale bien o falla.

## Rutas de los servicios (convención del equipo)

| Recurso | Ruta | Servicio | Puerto |
|---|---|---|---|
| Autenticación | `/api/auth/register`, `/api/auth/login` | smartfix-auth-service_1 | 8081 |
| Equipos | `/api/equipos` | smartfix-equipment-service_2 | 8082 |
| Incidencias | `/api/incidencias` | smartfix-incident-service_3 | 8083 |
| Mantenimientos | `/api/mantenimientos` | smartfix-maintenance-service_4 | 8084 |

Para incidencias se asume lo acordado en el reparto:

- `PATCH /api/incidencias/{id}/estado` con cuerpo `{ "estado": "ASIGNADA" }`
- `PATCH /api/incidencias/{id}/asignacion` con cuerpo `{ "tecnicoId": 2 }`
- Campos: `titulo`, `descripcion`, `prioridad` (BAJA, MEDIA, ALTA), `estado`, `fechaReporte`, `equipoId`, `tecnicoId`.

## Ejecución en desarrollo

```bash
npm install --legacy-peer-deps
npm start
```

Abre http://localhost:4200. Las llamadas a `/api/...` se reenvían a los microservicios locales
mediante `proxy.conf.json`, así que no hace falta configurar CORS en el backend.

## Datos simulados

En `src/app/core/config.ts` cada recurso tiene un indicador `mock`. En `true` la pantalla usa datos
en memoria y no llama al backend; en `false` consume el microservicio real. Cambiar a `false` cuando
el servicio correspondiente esté levantado.

Usuario de prueba en modo simulado de autenticación: `admin@smartfix.com` / `Admin123*`.

## Docker

```bash
docker build -t smartfix-frontend .
docker run -p 4200:80 smartfix-frontend
```

El contenedor sirve la aplicación con nginx y reenvía `/api/auth`, `/api/equipos`, `/api/incidencias`
y `/api/mantenimientos` a los servicios `auth-service:8081`, `equipment-service:8082`,
`incident-service:8083` y `maintenance-service:8084`. Estos nombres deben coincidir con los de
`docker-compose.yml` y los contenedores deben estar en la misma red.

## Pruebas y compilación

```bash
npm test
npm run build
```
