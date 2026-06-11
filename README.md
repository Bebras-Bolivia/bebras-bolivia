# Bebras Bolivia

Sitio oficial de Bebras Bolivia, construido con Astro, React, Tailwind CSS y un CMS local propio para administrar contenido editable.

## Requisitos

- Bun 1.3 o superior
- Git

Este proyecto usa Bun como gestor oficial de paquetes. No uses `npm install` para evitar generar lockfiles incompatibles con `bun.lock`.

## Instalacion

Desde la raiz del repositorio:

```sh
bun install
```

## Desarrollo

Para trabajar con el sitio publico y el CMS al mismo tiempo:

```sh
bun run dev:all
```

Esto hace tres cosas:

- Sincroniza el contenido de `cms/content/current` hacia `src/data`, `src/content/blog` y `public/images/uploads`.
- Compila la interfaz del CMS en `cms/ui-dist`.
- Levanta el sitio Astro y el backend del CMS.

URLs locales:

- Sitio publico: `http://localhost:4321`
- CMS: `http://localhost:4000/admbb`

Tambien puedes levantar solo el sitio publico:

```sh
bun run dev
```

## Scripts

| Comando | Uso |
| --- | --- |
| `bun run dev` | Levanta solo el sitio Astro en desarrollo. |
| `bun run dev:all` | Levanta sitio + CMS y sincroniza contenido editable. |
| `bun run build` | Genera el build estatico del sitio en `dist/`. |
| `bun run preview` | Previsualiza el build del sitio. |
| `bun run lint` | Ejecuta ESLint en el proyecto. |
| `bun run lint:fix` | Ejecuta ESLint con autofix. |
| `bun run format` | Formatea el proyecto con Prettier. |
| `bun run format:check` | Verifica formato sin modificar archivos. |

## Estructura

```text
.
├── src/
│   ├── assets/              # Imagenes y recursos importados por Astro
│   ├── components/          # Componentes Astro y React del sitio publico
│   ├── components/ui/       # Componentes shadcn/base UI
│   ├── content/blog/        # Blog publicado por Astro
│   ├── data/                # JSON consumido por las paginas del sitio
│   ├── layouts/             # Layout global
│   └── pages/               # Rutas del sitio publico
├── public/                  # Archivos publicos servidos tal cual
├── cms/
│   ├── src/                 # Backend Express/Bun del CMS
│   ├── ui/                  # UI Astro/React del CMS
│   ├── ui-dist/             # Build generado de la UI del CMS
│   └── content/
│       ├── current/         # Contenido editable actual
│       ├── media/           # Archivos subidos desde el CMS
│       └── snapshots/       # Respaldos de contenido
├── scripts/dev-all.mjs      # Orquestador de desarrollo sitio + CMS
└── bebras-style/            # Guia de marca y recursos visuales
```

## Flujo de contenido

El CMS edita los archivos en `cms/content/current`. Durante desarrollo, `bun run dev:all` copia esos datos al sitio publico:

- `cms/content/current/data/*.json` -> `src/data/*.json`
- `cms/content/current/blog/*.md` -> `src/content/blog/*.md`
- `cms/content/media/*` -> `public/images/uploads/*`

El sitio Astro lee los JSON desde `src/data` y los posts desde `src/content/blog`.

## CMS

El backend del CMS esta en `cms/src` y se ejecuta con Bun. La UI del CMS esta en `cms/ui` y se compila hacia `cms/ui-dist`.

Comandos utiles del CMS:

```sh
bun run --cwd cms dev
bun run --cwd cms ui:build
bunx tsc -p cms/tsconfig.json --noEmit
```

Variables de entorno importantes:

| Variable | Default local | Descripcion |
| --- | --- | --- |
| `PORT` | `4000` | Puerto del CMS. |
| `HOST` | `0.0.0.0` | Host del CMS. |
| `CMS_BASE_PATH` | vacio, `dev:all` usa `/admbb` | Base path donde se sirve el CMS. |
| `JWT_SECRET` | `dev-secret-change-in-production` | Secreto para sesiones. Obligatorio en produccion. |
| `ADMIN_EMAIL` | `admin@bebras.bo` | Usuario administrador inicial. |
| `ADMIN_PASSWORD` | `admin123` | Password inicial. Obligatorio en produccion. |
| `ADMIN_NAME` | `Admin` | Nombre del administrador inicial. |

En produccion, define al menos `JWT_SECRET` y `ADMIN_PASSWORD`.

## Verificacion

Antes de entregar cambios, usa:

```sh
bun run lint
bun run build
bunx tsc -p cms/tsconfig.json --noEmit
bun run --cwd cms ui:build
```

Actualmente ESLint puede mostrar warnings existentes, pero no deberia mostrar errores.

## Notas de mantenimiento

- El lockfile oficial es `bun.lock`.
- No commitear `package-lock.json`.
- `dist/`, `.astro/`, `node_modules/` y bases SQLite locales del CMS son archivos generados.
- Si se edita contenido desde el CMS, revisa los cambios generados en `cms/content/current`, `src/data`, `src/content/blog` y `public/images/uploads`.
