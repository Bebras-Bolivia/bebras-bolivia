# Bebras Bolivia

Sitio oficial de Bebras Bolivia, construido con Astro, React, Tailwind CSS y un CMS local propio para administrar contenido editable.

## Requisitos

- Bun 1.3 o superior
- Git
- Node compatible con Astro para compilar en Windows y ejecutar Lighthouse (validado con Node 22.12).

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
| `SITE_URL` | vacio, `dev:all` usa `http://localhost:4321` | Direccion del sitio de contenido; la usan los enlaces de los certificados. Vacio = la misma del CMS. |

En produccion, define al menos `JWT_SECRET` y `ADMIN_PASSWORD`.

## Verificacion

### Pruebas automatizadas del CMS y sitio

Instala el navegador una vez con `bunx playwright install chromium`.

| Comando | Alcance |
| --- | --- |
| `bun run test:unidad` | Lógica, esquemas, cifrado, seguridad y cobertura LCOV. |
| `bun run test:api` | Peticiones HTTP al CMS real con SQLite aislada. |
| `bun run test:e2e:cms` | Flujos administrativos; compila primero la interfaz del CMS. |
| `bun run test:e2e:sitio` | Sitio estático compilado, certificados y navegación. |
| `bun run test:integracion` | Publicar desde el CMS y consultar el sitio generado. |
| `bun run test:e2e` | Los tres proyectos de Playwright. |
| `bun run test:calidad` | Lighthouse móvil, peso de recursos y 100 consultas simultáneas. |
| `bun run test` | Todas las suites y calidad, conservando resultados. |
| `bun run test:informe` | Consolida los últimos JUnit y JSON de Playwright en tabla y resumen. |

Cada corrida de API o navegador crea una carpeta independiente en la carpeta temporal del sistema, con contenido y SQLite propios. El sitio temporal tiene su propio repositorio Git y una dirección de push local inválida. Los certificados usan personas inventadas. Las carpetas y procesos se eliminan al terminar; las dependencias se reutilizan mediante una unión de directorios.

Los resultados, trazas y cobertura se guardan en `../_pruebas/cms-sitio/`. Lighthouse aplica el umbral de accesibilidad 90 propuesto en el plan; se puede cambiar con `QUALITY_MIN_ACCESSIBILITY`. Los otros puntajes y tiempos son mediciones locales, no equivalen a una prueba de producción.

El CMS conserva la referencia publicada en `cms/content/published/`, fuera de los borradores usados en vista previa. La primera inicialización toma los archivos fuente actuales del sitio como referencia; los borradores que ya estuvieran sincronizados antes de instalar este cambio no pueden distinguirse retrospectivamente del último sitio compilado. Después de cada publicación exitosa se actualiza esa referencia. Una publicación programada impide que el guardado automático publique antes de la fecha elegida.

`bunx tsc --noEmit -p tsconfig.tests.json` verifica también el código de las pruebas.

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
