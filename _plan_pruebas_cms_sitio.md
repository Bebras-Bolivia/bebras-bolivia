# Plan de pruebas del CMS y del sitio informativo

Plan para dar al módulo de gestión de contenido (objetivo 2, capítulo 05) la misma cobertura de pruebas que ya tiene el concurso: pruebas unitarias, de integración de la API, de extremo a extremo y de calidad del sitio publicado. Repositorio: `bebras-bolivia`. Fecha: 29 de septiembre de 2026.

## 1. Situación actual

- **No hay ninguna prueba automatizada** en `bebras-bolivia`, ni en el CMS ni en el sitio.
- Lo único que se verifica hoy es la comprobación de tipos (`bun run typecheck`, que cubre el sitio, el CMS, la interfaz del CMS, el webhook y los scripts) y el lint.
- Qué hay que probar:

| Parte | Tecnología | Tamaño |
| --- | --- | --- |
| Servidor del CMS (`cms/src`) | Express 5 sobre Bun, SQLite (`bun:sqlite`) | Unas 6000 líneas, unas 50 rutas en 10 grupos: autenticación, contenido, blog, medios, respaldos, vista previa, publicación, programación de publicaciones, certificados y usuarios |
| Interfaz del CMS (`cms/ui`) | Astro y React | Unas 20 pantallas y componentes: inicio de sesión, árbol de contenido, blog, medios, publicación, respaldos, certificados y logos |
| Sitio informativo (`src`) | Astro estático (SSG) y React | 10 páginas más las páginas personalizadas y el blog; consulta de certificados |
| Webhook (`webhook/server.ts`) | Bun | Despliegue automático |

## 2. Qué se reutiliza del concurso y qué cambia

| Del concurso | En el CMS y el sitio |
| --- | --- |
| Playwright para las pruebas de extremo a extremo | Igual: se agrega Playwright a `bebras-bolivia` |
| Pruebas unitarias con `tsx --test` (Node) | Se usa **`bun test`**, porque el CMS depende de `bun:sqlite` y de otras API de Bun que Node no carga |
| Base D1 aislada y reloj de pruebas | Una carpeta temporal por corrida, con su contenido, su base SQLite, sus medios y una copia del sitio. El CMS ya lo permite con variables de entorno: `CONTENT_DIR`, `LANDING_DIR`, `LANDING_DATA_DIR`, `LANDING_BLOG_DIR`, `LANDING_PUBLIC_DIR`, `PORT` y `CMS_BASE_PATH` |
| Módulos de pruebas separados (`--project`) | Cinco grupos: unitarias, API, interfaz del CMS, sitio e integración |

**Regla de seguridad obligatoria.** La publicación automática del CMS hace `commit` y `push` en `LANDING_DIR`. Las pruebas **nunca** pueden apuntar al repositorio real. Cada corrida:

1. Crea en una carpeta temporal una copia del sitio con su propio `git init`, sin remoto, y bloquea el `push` con la misma técnica ya usada (`remote.origin.pushurl` inválido).
2. Borra esa carpeta al terminar.

Hay además una trampa conocida de este Windows: OneDrive o el antivirus bloquean un instante las carpetas recién creadas (`EPERM` al renombrar). Por eso las carpetas temporales van **fuera de OneDrive**, en la carpeta temporal del sistema.

## 3. Niveles y casos previstos

### 3.1 Pruebas unitarias (`bun test`), unos 45 casos

Lógica pura, sin servidor:

| Área | Qué se prueba |
| --- | --- |
| Cifrado de certificados (`cms/src/certificates/crypto.ts` y `src/lib/certificate-crypto.ts`) | Del mismo código salen el mismo nombre de archivo y la misma clave; un certificado cifrado se descifra solo con su código; las dos copias (CMS y sitio) dan resultados idénticos |
| Distinción del certificado (`distinctionOf`) | 1.º, 2.º y 3.º lugar reciben «excelencia»; el 10 % mejor, en categorías de al menos 10, «mérito»; el resto, «participación»; la distinción escrita a mano manda sobre el cálculo |
| Códigos de certificados individuales | 8 caracteres del alfabeto sin O/0 ni I/1/L, únicos frente a los importados |
| Buscador de colegios (`schools.ts`) | Búsqueda sin tildes, filtro por departamento, límite de resultados |
| Esquemas de contenido (`content/schemas.ts`, Zod) | Aceptan el contenido válido de cada JSON del sitio y rechazan campos que faltan o tienen un tipo equivocado |
| Enlaces seguros (`safe-url.ts`, en el CMS y en el sitio) | Aceptan `https`, `mailto` y rutas internas; rechazan `javascript:` y `data:`; las dos copias coinciden |
| Conservación de texto (`preserve-text.ts`) y archivos UTF-8 | No se pierden tildes, eñes ni saltos de línea al guardar |
| Identificadores de respaldos (`snapshots/id.ts`) | Formato y orden de los identificadores |
| Contraseñas (`auth/passwords.ts`) | Hash y verificación; una contraseña incorrecta no pasa |
| Bloqueo de cambios (`mutation-lock.ts`) | Dos escrituras simultáneas no se pisan |
| Sitio: Markdown del blog y texto enriquecido (`blog-markdown.ts`, `rich-text.ts`) | Se generan los elementos esperados y se elimina el HTML peligroso |
| Sitio: registro (`registration.ts`) | Con enlace, las inscripciones están abiertas y `/registro` lleva directo al formulario; sin enlace, «Desafío en espera» |

### 3.2 Pruebas de integración de la API del CMS (`bun test` con el servidor real), unos 55 casos

El servidor se levanta sobre las carpetas temporales y se prueba con peticiones HTTP reales.

| Grupo | Casos principales |
| --- | --- |
| Autenticación | Iniciar sesión, cerrar sesión, `/me`; credenciales incorrectas; token vencido o alterado; límite de intentos. Incluye el defecto conocido: hoy el límite se esquiva cambiando la cabecera `X-Forwarded-For` (hallazgo 16 de la revisión) |
| Permisos | Toda ruta de administración responde 401 sin sesión; un usuario no administrador no crea usuarios |
| Contenido | Leer y guardar cada JSON; el contenido inválido se rechaza sin tocar el archivo; páginas personalizadas (crear, editar, publicar u ocultar, borrar); estado de los enlaces de navegación |
| Blog | Crear, editar, borrar y listar entradas; borradores y su limpieza; `slug` repetido o inválido |
| Medios | Subir imágenes válidas; rechazar tipos no permitidos, archivos vacíos o demasiado grandes; borrar; no se puede salir de la carpeta de medios con `../` |
| Respaldos | Crear un respaldo manual, restaurarlo y borrarlo; la limpieza automática borra solo los respaldos automáticos y conserva los manuales (defecto corregido el 28 de septiembre); la fecha usa la hora correcta |
| Vista previa | Escribe el borrador en el sitio y lo devuelve al cerrarla, también cuando la pestaña se cierra (`cleanup`) |
| Publicación | `sync` copia el contenido al sitio; la publicación hace `commit` en el repositorio temporal y el `push` queda bloqueado; publicación programada: crear, listar y cancelar |
| Certificados | Actualizar desde un enlace de exportación falso, servido por la misma prueba; se reemplazan solo los desafíos que llegan; los archivos quedan cifrados y no se pueden leer ni asociar a una persona sin el código; certificados individuales: agregar, quitar e invalidar el código; se rechaza una clave o un enlace inválidos |
| Salud | `/api/health` responde |

### 3.3 Pruebas de extremo a extremo de la interfaz del CMS (Playwright), unos 25 casos

| Flujo | Qué se comprueba |
| --- | --- |
| Inicio de sesión | Entrar, error con clave incorrecta, salir; sin sesión se vuelve al inicio de sesión |
| Editar contenido | Abrir un JSON desde el árbol, cambiar un texto y un enlace, guardar; el cambio persiste al recargar |
| Blog | Crear una entrada con imagen, verla en la vista previa, publicarla y borrarla |
| Medios | Subir una imagen y usarla en un campo de imagen |
| Respaldos | Crear, ver en la vista previa, restaurar y cerrar la vista previa |
| Publicación | Publicar ahora y programar una publicación |
| Certificados | Pegar el enlace y actualizar; agregar un certificado individual y obtener su enlace de verificación; editar los logos (agregar, reordenar, cambiar el tamaño, respetar el límite de la fila) |
| Diseño | Las pantallas principales caben en 390 y 1280 px sin desbordes |

### 3.4 Pruebas de extremo a extremo del sitio informativo (Playwright), unos 30 casos

Se prueban sobre el sitio **compilado** (`astro build` más un servidor estático), que es lo que sirve Apache en producción.

| Área | Qué se comprueba |
| --- | --- |
| Páginas | Todas cargan sin errores de consola: inicio, estudiantes, maestros, preguntas frecuentes, contacto, patrocinadores, registro, blog, certificado y páginas personalizadas |
| Navegación | El menú lleva a cada sección en computadora y en celular (menú desplegable) |
| Enlaces | Recorrido de todas las páginas sin ningún enlace interno roto |
| Contenido | Lo que dice cada JSON y cada entrada del blog aparece en su página |
| Registro | Los dos estados: con enlace, el botón va al concurso y todo enlace a `/registro` va directo; sin enlace, «Desafío en espera» con el botón deshabilitado |
| Certificados | Un código válido muestra el certificado del tipo correcto (excelencia, mérito o participación); un código inválido avisa sin revelar nada; `?codigo=` lo abre directo; el QR apunta al certificado; «Descargar PDF» genera un archivo; la impresión ocupa una sola hoja A4 |
| Diseño | Sin desbordes a 320, 390 y 1280 px |
| Seguridad | Un enlace editable con `javascript:` no llega a la página; el Markdown del blog no ejecuta HTML inyectado |

### 3.5 Integración CMS → sitio, unos 5 casos

Es el flujo que describe la arquitectura: administrador → CMS → base SQLite y almacén de contenido → compilación → sitio estático.

1. Se cambia un texto en el CMS, se publica, se compila el sitio temporal y el cambio aparece en la página.
2. Una entrada nueva del blog aparece en la lista y en su propia página.
3. Una página personalizada oculta no se publica.
4. Un certificado agregado en el CMS se puede consultar en el sitio compilado con su código.
5. Restaurar un respaldo y publicarlo devuelve el sitio a ese estado.

### 3.6 Calidad del sitio publicado

- **Lighthouse** sobre las páginas principales del sitio compilado: rendimiento, accesibilidad, buenas prácticas y SEO, con un puntaje mínimo acordado (por ejemplo, 90 en accesibilidad).
- **Peso de las páginas:** tamaño de HTML, JavaScript e imágenes de cada página, sobre todo en celular.
- **Carga:** una prueba liviana con muchas consultas simultáneas a la página de certificados. El sitio es estático y no la necesita a fondo, pero el día de la entrega de certificados es el pico de visitas.

## 4. Organización prevista

| Script | Qué corre | Tiempo estimado |
| --- | --- | --- |
| `bun run test:unidad` | 3.1 | Segundos |
| `bun run test:api` | 3.2 | Menos de 1 minuto |
| `bun run test:e2e:cms` | 3.3 | Unos 3 minutos |
| `bun run test:e2e:sitio` | 3.4 (compila el sitio) | Unos 3 minutos |
| `bun run test:integracion` | 3.5 | Unos 2 minutos |
| `bun run test:e2e` | 3.3, 3.4 y 3.5 | Menos de 10 minutos |

Cada corrida crea sus carpetas temporales y las borra al final. Los resultados se guardan en `bebras/_pruebas/` como los del concurso.

## 5. Fases de trabajo

| Fase | Contenido | Resultado |
| --- | --- | --- |
| 1. Base | Instalar Playwright; crear el ayudante que arma las carpetas temporales, siembra el contenido, levanta el CMS en un puerto libre y bloquea el `push`; scripts de `package.json` | Una prueba mínima que inicia sesión y lee `/me` |
| 2. Unitarias | Los casos de 3.1 | Lógica pura cubierta, con cobertura medida |
| 3. API del CMS | Los casos de 3.2 | Todas las rutas probadas, con permisos |
| 4. Interfaz del CMS | Los casos de 3.3 | Los flujos del administrador |
| 5. Sitio | Los casos de 3.4 sobre el sitio compilado | Páginas, certificados y registro |
| 6. Integración y calidad | 3.5 y 3.6 | El flujo completo de contenido y las métricas de Lighthouse |
| 7. Informe | Tabla de casos con identificadores, resultados, cobertura, defectos encontrados y su corrección | Sección de pruebas del capítulo 05, con el mismo formato que `_informe_pruebas.md` |

## 6. Relación con las historias de usuario

La copia original en `../_hus_cms.md` contiene 32 elementos: 13 historias de usuario, CMS-00 como tarea de preparación y 18 tareas relacionadas. Al escribir cada caso se anotará qué historia cubre, para que el informe final tenga una tabla de trazabilidad «historia → casos de prueba» y muestre que cada historia tiene al menos una prueba de aceptación, como pide XP.

## 7. Riesgos y cómo se evitan

| Riesgo | Cómo se evita |
| --- | --- |
| Una prueba publica en el repositorio real y hace `push` a producción | Carpetas temporales con `git init` propio y `push` bloqueado; la prueba falla si `LANDING_DIR` apunta dentro del repositorio real |
| Datos de menores en los certificados | Solo datos inventados; los archivos cifrados de prueba viven en la carpeta temporal y nunca en `public/certificados` del repositorio |
| Bloqueos de OneDrive al renombrar carpetas | Carpetas temporales fuera de OneDrive |
| Compilar el sitio es lento | Se compila una sola vez por corrida y se reutiliza en todos los casos del sitio |
| Pruebas frágiles ante rediseños de la interfaz | Localizadores por rol y por nombre accesible, como en el concurso, en vez de clases o posiciones |

## 8. Total previsto

Unos **160 casos**: 45 unitarios, 55 de API, 25 de la interfaz del CMS, 30 del sitio y 5 de integración, más las métricas de Lighthouse.

## 9. Ejecución del plan

La suite y las correcciones se implementaron el 29 de septiembre de 2026. Los resultados reales, defectos y limitaciones están en [_informe_pruebas_cms_sitio.md](_informe_pruebas_cms_sitio.md); la trazabilidad detallada está en [tests/TRACEABILIDAD.md](tests/TRACEABILIDAD.md). Las cantidades iniciales de este plan eran estimaciones.
