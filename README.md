# Bitácora +

Aplicación para registrar bitácoras y cumplimiento de tareas por orden de trabajo. Permite crear sujetos (OT/proyecto), definir tareas y adjuntar evidencias en forma de fotos o PDFs con geolocalización, firma y línea de tiempo. Incluye un panel para gestores y reglas de cierre como mínimo de fotos, geotag y firma obligatoria.

## Instalación

Requisitos: [Node.js](https://nodejs.org) 18+ y npm.

1. Clona este repositorio.
2. Copia el archivo `.env` y ajusta las variables según tu proyecto.
3. Instala dependencias con `npm install`.
4. Inicia el entorno de desarrollo con `npm run dev`.

## Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo con recarga automática. |
| `npm run build` | Genera la compilación de producción en `dist/`. |
| `npm run build:dev` | Compila en modo development. |
| `npm run lint` | Ejecuta ESLint sobre el proyecto. |
| `npm run preview` | Sirve localmente la compilación de producción. |

## Variables de entorno

### Frontend (`.env`)

- `VITE_SUPABASE_PROJECT_ID` – ID del proyecto Supabase.
- `VITE_SUPABASE_URL` – URL del proyecto Supabase.
- `VITE_SUPABASE_PUBLISHABLE_KEY` – clave pública/anon de Supabase.

### Funciones de Supabase

Configura estas variables en el entorno donde se ejecuten las funciones (p.ej. Supabase).

- `SUPABASE_URL` – URL del proyecto.
- `SUPABASE_ANON_KEY` – clave pública.
- `SUPABASE_SERVICE_ROLE_KEY` – clave de servicio con permisos elevados.
- `OPENAI_API_KEY` – clave para las funciones de IA (opcional).

## Contribución

1. Haz un fork del repositorio y crea una rama para tu cambio.
2. Ejecuta `npm run lint` antes de abrir el Pull Request.
3. Describe claramente los cambios y añade pruebas si aplica.
4. Abre un Pull Request hacia `main`.

## Despliegue

1. Ejecuta `npm run build` para generar la versión de producción.
2. Publica el contenido de `dist/` en tu servicio de hosting estático (Vercel, Netlify, etc.).
3. Para las funciones de Supabase usa la CLI: `supabase functions deploy <nombre>` y define las variables de entorno en el panel de Supabase.

## Tecnologías

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
