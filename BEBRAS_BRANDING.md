# Bebras Bolivia — Sistema de marca

Documento de handoff. Resume el sistema de color/tipografía implementado y deja recomendaciones para el siguiente agente.

---

## 1. Paleta oficial (5 colores)

Definida en [src/styles/global.css](src/styles/global.css) en `@theme inline`. **Nunca** uses hex hardcoded — siempre via tokens.

| Color | Hex | Token CSS | Utilidad Tailwind | Rol |
|---|---|---|---|---|
| Verde | `#1B8F60` | `--color-bebras-green` | `bg-bebras-green`, `text-bebras-green` | Primario (marca, header wordmark, focus rings, sidebar) |
| Verde oscuro | `#146E48` | `--color-bebras-green-dark` | `bg-bebras-green-dark` | Hover de verde |
| Amarillo | `#F8AE31` | `--color-bebras-yellow` | `bg-bebras-yellow`, `text-bebras-yellow` | Fondo del hero, acento cálido |
| Amarillo oscuro | `#C8861F` | `--color-bebras-yellow-dark` | `bg-bebras-yellow-dark` | Texto sobre fondos claros donde el amarillo puro no contrasta |
| Rojo | `#E83B3B` | `--color-bebras-red` | `bg-bebras-red`, `text-bebras-red` | CTA principal (botón "Inscribirse"), destructivo |
| Rojo oscuro | `#B82323` | `--color-bebras-red-dark` | `bg-bebras-red-dark` | Hover de rojo |
| Azul | `#324C87` | `--color-bebras-blue` | `bg-bebras-blue`, `text-bebras-blue` | Secundario, sidebar accent |
| Azul oscuro | `#233561` | `--color-bebras-blue-dark` | `bg-bebras-blue-dark` | Hover de azul, 5ta categoría de edad |
| Gris | `#D9D9D9` | `--color-bebras-gray` | `bg-bebras-gray` | Border, input, muted |
| Tinta | `#110000` | `--color-bebras-ink` | `text-bebras-ink` | Texto oscuro principal |
| Paper | `#FDFCFB` | `--color-bebras-paper` | `bg-bebras-paper` | Fondo neutro de todas las páginas (reemplazó al crema viejo) |

### Mapeo a tokens shadcn (en `:root` y `.dark`)
- `--primary` → verde Bebras
- `--secondary` → azul Bebras
- `--accent` → amarillo Bebras
- `--destructive` → rojo Bebras
- `--muted` / `--border` / `--input` → gris
- `--chart-1..5` → verde → amarillo → rojo → azul → gris

### Orden de uso convencional
Decisión del cliente: **rojo → amarillo → verde** como secuencia visual cuando aparecen los 3 juntos.
- Social links en footer: 🔴 Instagram → 🟡 Email → 🟢 Facebook
- Header: botón "Inscribirse" en rojo (primer color de la secuencia)

---

## 2. Tipografía

| Fuente | Rol | Pesos | Uso |
|---|---|---|---|
| **Poppins** | Display | 500–900 | Títulos, numerales, wordmark, emphasis. Clase `.serif-display` (font-weight 800) y `.display-numeral` (font-weight 900) |
| **Figtree** | Cuerpo | 300–900 | Párrafos, UI general |
| **JetBrains Mono** | Mono | 400, 500 | Eyebrows, tags, etiquetas técnicas |

**Eliminada:** Pacifico (cursiva manuscrita). No reintroducir — choca con la identidad geométrica Bebras.

---

## 3. Decoración del hero (home)

El hero está en [src/components/BebrasBoliviaHome.tsx](src/components/BebrasBoliviaHome.tsx). Tiene:
- **Fondo amarillo** `bg-bebras-yellow` con textos blancos.
- **11 figuras SVG decorativas** distribuidas con animaciones (en `<svg viewBox="0 0 1440 900">`):
  - 3 círculos azules, 1 cuadrado verde, 1 cuadrado outline azul, 1 triángulo rojo, 1 triángulo outline blanco, 1 onda blanca, 2 cruces (verde + rojo), 2 círculos punteados (azul + verde).
- **Animaciones CSS** definidas en [global.css](src/styles/global.css):
  - `.shape-float-slow` (6s float + rotación)
  - `.shape-float-medium` (5s float + rotación opuesta)
  - `.shape-spin-slow` (18s rotación 360°)
  - `.shape-bob` (3.5s sube/baja)
- **Patrón de puntos** blancos (2 grids 7×7 y 5×5) en esquinas opuestas.
- **Ola SVG** al final que hace transición curva amarillo → paper.
- **Mascota** en disco verde a la derecha, con cuadrado blanco rotado y círculo rojo decorativos.
- **Stats** (70+ países / 45 min / 5 categorías) en blanco, divisores blancos translúcidos.

### Truco del header
El hero usa `-mt-25 sm:-mt-29` + `pt-25 sm:pt-29` para que el amarillo pase **por detrás** del header blanco redondeado. El header tiene `pt-3 sm:pt-4` y un spacer en `Layout.astro` (`h-[5.5rem] sm:h-[6.25rem]`). Si tocás esto, recalculá los márgenes negativos.

---

## 4. Sistema de accent por sección (home)

[src/pages/index.astro](src/pages/index.astro) tiene un helper `getAccent(section)` que mapea `accent: "green" | "blue" | "yellow" | "red"` del JSON a clases de color. Cada sección pinta su numeral, emphasis, drop-cap, link e icon-badge con el accent.

Configurado en [src/data/home.json](src/data/home.json):
- Sección 01 "Sobre el desafío" → `accent: "blue"`
- Sección 02 "Categorías por edad" → `accent: "yellow"`
- Sección 03 "Sobre Bebras" → `accent: "red"`

Las 5 categorías de edad usan los colores Bebras como dot indicator:
- Guacamayo (5-8) → red
- Capibara (8-10) → yellow
- Titi (10-12) → green
- Jucumari (12-14) → blue
- Yaguarete (14-18) → blueDark

### Caso especial: amarillo
Como el amarillo puro `#F8AE31` no contrasta sobre fondos claros, hay dos utilidades específicas:
- `.numeral-yellow-outline` → numeral grande amarillo sólido (sin stroke; antes tenía contorno oscuro pero al cliente no le gustó).
- `.text-yellow-underline` → emphasis inline con franja amarilla solo en el ⅓ inferior (efecto highlighter editorial).

---

## 5. Layout global

- **Body** ([src/layouts/Layout.astro:74](src/layouts/Layout.astro#L74)): `bg-bebras-paper text-foreground`. **No tocar** sin actualizar también los hero overrides.
- **Header** ([src/components/BebrasHeader.tsx](src/components/BebrasHeader.tsx)): `fixed top-0` con `pt-3 sm:pt-4`. Wordmark "Bebras Bolivia" en verde con `serif-display`. CTA "Inscribirse" en rojo.
- **Footer** ([src/components/Footer.astro](src/components/Footer.astro)): `bg-bebras-paper`. Social links coloreados por icono via `socialColorMap`.

---

## 6. Páginas migradas

Todas estas pasaron de `bg-cream + grain-paper` (estilo editorial viejo) a `bg-bebras-paper` (sin textura):

- `docentes.astro`, `estudiantes.astro`, `maestros.astro`
- `faq.astro`, `contacto.astro`, `registro.astro`
- `sponsors.astro`, `prueba.astro`
- `blog/index.astro`, `blog/[slug].astro`

---

## 7. Utilidades CSS muertas / legacy

Estas siguen en [global.css](src/styles/global.css) pero ya **no se usan** en el código. Considerá eliminarlas si limpiás:
- `.grain-paper` (textura papel granulado)
- `.editorial-rule`, `.editorial-section`, `.editorial-list-item`, `.editorial-callout` — separadores del estilo magazine viejo.
- `.pull-quote::before` — comilla decorativa grande.
- `.bg-ochre`, `.text-ochre`, `.border-ochre` — ahora son alias del amarillo Bebras (mantener por compatibilidad con el badge "Última noticia").
- `.bg-cream`, `.text-ink`, `.text-taupe` — neutros del estilo viejo.

---

## 8. Recomendaciones para el siguiente agente

### Lo que YA está hecho
- Paleta oficial integrada al sistema shadcn (`--primary`, `--accent`, etc.).
- Tipografía cambiada a Poppins (display) + Figtree (cuerpo).
- Home rediseñado: hero amarillo, mascota en disco verde, figuras animadas, ola de transición.
- Todas las páginas migradas a fondo `bebras-paper`.
- Footer con social colors en orden rojo → amarillo → verde.
- Header con CTA "Inscribirse" en rojo.
- Sistema de accent por sección funcionando.

### Lo que falta / próximos pasos sugeridos

1. **Páginas internas todavía visualmente "viejas"**.
   El cliente solo pidió cambios en el home. Las páginas `estudiantes`, `maestros`, `docentes`, `faq`, `contacto`, `registro`, `sponsors`, `blog` heredaron solo el fondo paper, pero conservan:
   - Numerales gigantes Poppins en color primary (verde) — quizá conviene aplicar el sistema de accent por sección que ya tiene `index.astro`.
   - Heros que pueden necesitar el mismo tratamiento amarillo/colorido del home.
   - **Si el cliente pide rediseñarlas, replica el patrón de `index.astro` con `getAccent()` y los color signatures.**

2. **Mascota oficial Bebras**.
   El cliente conserva su `castor-circle.png` (Beaver con bandera boliviana) por preferencia. Si en el futuro quiere usar la mascota oficial Bebras, está en `bebras-style/Logos/Mascota/`. Tiene variantes por color de fondo (b/r/g/y/w).

3. **Logo oficial Bebras**.
   No se está usando. Está en `bebras-style/Logos/Horizontal/svg/bebras_horizontal.svg` y `Compacto/svg/bebras_compacto.svg`. Actualmente el header solo tiene el castor circular + wordmark Poppins escrito. Si quiere swap al logo oficial, hay que coordinarlo con el cliente — perdería la personalidad local.

4. **Iconografía oficial Bebras**.
   Hay 5 sets de íconos en 4 colores cada uno en `bebras-style/Icons/` (Code, Programming, Resolve, Task, Win). No se usan. Podrían reemplazar los lucide-react donde aplique conceptualmente:
   - `Brain` → `Programming`
   - `BadgeCheck` → `Win`
   - `School` → ninguno directo, dejarlo lucide.

5. **Ilustraciones de departamentos**.
   `bebras-style/Ilustraciones/SVG/` tiene SVG de los 9 departamentos de Bolivia (La Paz, Cochabamba, Santa Cruz, etc.) + elementos (`BANDERA`, `IDEA`, `LAPTOP`, `ESTANDAR`). Sin usar. Buenas para una sección "Bebras en Bolivia" o como decoración en `sponsors.astro` / `contacto.astro`.

6. **Burbujas y patrones oficiales**.
   `bebras-style/Burbujas/*.png` y `bebras-style/Patrones/*.png` están descargados en `public/images/bebras/bubbles/` pero el cliente los pidió quitar porque "se veían sucios". **No reintroducir** sin pedírselo. Si los necesitás como referencia, están en `bebras-style/`.

7. **Modo oscuro**.
   Los tokens `.dark` están definidos pero **no se ha testeado**. Si activás dark mode, verificá:
   - Contraste del amarillo `#F8AE31` con `text-white` en hero (debería seguir funcionando).
   - El fondo del hero amarillo no tiene variante dark — quizá querés `dark:bg-bebras-yellow-dark`.

8. **Animaciones del hero**.
   Las clases `.shape-float-slow`, `.shape-spin-slow`, etc. usan `transform-box: fill-box` para que `transform-origin` funcione en SVG. Si las usás fuera de SVG, no necesitás esa propiedad.

### Reglas de oro

- **Siempre via tokens.** Nunca `#1B8F60` directo. Usá `bg-bebras-green` o `var(--color-bebras-green)`.
- **Orden cromático rojo → amarillo → verde** cuando los 3 aparecen juntos.
- **Verde es la marca**, no la decoración. El verde aparece en logo wordmark, header focus, primary del sistema. Para acentos coloridos usá rojo y amarillo.
- **Amarillo necesita texto blanco u oscuro**, nunca otro color saturado encima.
- **Tipografía: Poppins para títulos, Figtree para texto.** No reintroducir Pacifico.
- **Fondo del sitio = paper (`#FDFCFB`)**. Solo el hero del home rompe esto con amarillo.

---

## 9. Archivos clave (mapa rápido)

| Archivo | Rol |
|---|---|
| [src/styles/global.css](src/styles/global.css) | Single source of truth de todos los colores y tipografía |
| [src/data/home.json](src/data/home.json) | Datos del home + `accent` por sección |
| [src/data/navigation.json](src/data/navigation.json) | Header links + social links (orden rojo→amarillo→verde) |
| [src/layouts/Layout.astro](src/layouts/Layout.astro) | Body, header spacer, ClientRouter |
| [src/components/BebrasBoliviaHome.tsx](src/components/BebrasBoliviaHome.tsx) | Hero del home con figuras animadas |
| [src/components/BebrasHeader.tsx](src/components/BebrasHeader.tsx) | Header fijo con CTA rojo |
| [src/components/Footer.astro](src/components/Footer.astro) | Footer con social color map |
| [src/pages/index.astro](src/pages/index.astro) | Home con sistema de accent por sección |
| `bebras-style/` | Kit oficial de marca (logos, mascotas, íconos, ilustraciones, burbujas, patrones) — sin usar mayormente |
