# glucyfront

Panel web de gestión de Glucy AI: clínicas, pacientes y licencias sobre la API de `glucyai`.

React 19 + Vite + Tailwind v4 + shadcn/ui. Identidad visual del `GlucyAI_Brand_Kit` (Sora + Inter, teal `#0A7C86` sobre `#052E33`).

## Autenticación y roles

1. El panel envía correo y contraseña a `POST /api/auth/panel` de glucyai (login local; solo `admin` y `doctor`).
2. La respuesta trae un **token de Sanctum** más el usuario con su `rol`; se guarda en `localStorage`.
3. Todas las peticiones siguientes van con `Authorization: Bearer <token de Sanctum>`; un 401 borra la sesión local y vuelve al login.

Auth0 sigue existiendo en glucyai para la app móvil (`POST /api/auth/auth0`); el panel no lo usa.

Las pantallas se filtran por rol (`src/auth/roles.ts`):

| Rol | Secciones |
|---|---|
| `admin` | Dashboard, Clínicas, Pacientes, Estudios, Licencias |
| `doctor` | Dashboard, Pacientes, Estudios (el backend acota a su clínica) |
| `paciente` | Ninguna: se le indica usar la app móvil |

La autorización real vive en el backend (Alcance); el panel solo decide qué ofrecer.

## Arranque

```sh
cp .env.example .env.local
npm install
npm run dev
```

- `VITE_API_URL`: URL de glucyai con `/api` (por defecto `http://localhost:8000/api`).

Usuario de prueba del seeder de glucyai (`php artisan migrate:fresh --seed`): `admin@glucy.test` / `password`.

## Estructura

```
src/
  auth/        login local → Sanctum, sesión en localStorage, guardas y permisos por rol
  lib/         cliente fetch, tipos espejo de glucyai, formato de fechas/estados
  components/
    panel/     barra lateral, encabezado, insignias de estado
    ui/        shadcn
  paginas/     Login, Dashboard, Clinicas, Pacientes, Estudios, Licencias, SinAcceso
```
