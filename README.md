# Dorsales

Aplicación web para la asignación de dorsales de un equipo de fútbol base. El objetivo es que los padres puedan registrarse, iniciar sesión y elegir un dorsal para su hijo cuando se abra la ventana de asignación, mientras que los administradores gestionan dorsales, usuarios e incidencias.

## Estructura

- `Front/`: SPA en React + Vite + TypeScript.
- `.github/instructions/`: instrucciones de trabajo para el agente.

## Frontend

La SPA ya queda preparada con estas piezas:

- React 19
- TypeScript en modo estricto
- Vite 7
- `react-router-dom` para navegación
- Axios para llamadas HTTP
- Vitest y Testing Library para pruebas
- Playwright para e2e
- CSS Modules para estilos encapsulados

## Comandos

Desde `Front/`:

```bash
npm install
npm run dev
npm run build
npm run lint
npm run test
npm run create:admin
```

`npm run create:admin --password "TuClave"` crea o actualiza la cuenta de Supabase para `lucio.horcajada@gmail.com` y la deja con rol `admin`. Requiere `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en el entorno.

## Variables de entorno

El proyecto expone un ejemplo en `Front/.env.example`. Las variables principales previstas son:

- `VITE_API_BASE_URL`
- `VITE_APP_NAME`
- `VITE_CONTEST_START_AT`
- `SUPABASE_SERVICE_ROLE_KEY` para scripts locales de administración

## Rutas base

La aplicación incluye estas pantallas iniciales:

- `/login`
- `/register`
- `/home`
- `/contest`
- `/admin`

## Despliegue

El front está preparado para Netlify con `Front/netlify.toml`, incluyendo la redirección necesaria para SPA.

## Estado actual

El scaffold ya está creado y compila correctamente. El siguiente paso natural es conectar autenticación real y persistencia con Supabase o el backend que se defina.


