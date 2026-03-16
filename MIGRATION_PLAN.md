# Plan de Migracion: bebras_test -> bebras-bolivia

## Rama: `steve-features`

---

## Decisiones clave

| Aspecto | Decision |
|---|---|
| **Pagina principal (index)** | NO se toca. Queda como esta (header + particulas) |
| **Header** | Se usa el de tu companero (BebrasHeader.tsx - sticky con Pacifico) |
| **Fondo** | Se mantiene ParticlesBackground de tu companero |
| **Paleta/global.css** | Se usa la de tu companero (oklch, mismas variables) |
| **Fonts** | Inter + Pacifico (del companero) |
| **shadcn/ui** | Se mantienen los 42 componentes radix-nova existentes |
| **Modo claro/oscuro** | Solo modo claro. Se elimina todo el sistema dark mode |
| **CMS** | Se migra completo como carpeta `cms/` en la raiz |
| **Contenido (JSON/MD)** | Se migra intacto, manteniendo la separacion CMS |

---

## Fases de implementacion

### FASE 0: Preparacion
1. Crear rama `steve-features` desde `master` en `bebras-bolivia`

### FASE 1: Alinear dependencias
2. Actualizar `package.json` del landing para agregar dependencias faltantes:
   - `embla-carousel-react` (para shadcn Carousel que usa NewsCarousel)
   - Verificar que todas las dependencias de shadcn ya estan
3. Actualizar `astro.config.mjs` si hay diferencias de configuracion

### FASE 2: Migrar datos y contenido
4. Crear directorio `src/data/` y copiar los 15 archivos JSON:
   - `site.json`, `navigation.json`, `hero.json`, `about.json`, `categories.json`
   - `scoring.json`, `news.json`, `faq.json`, `teacher-instructions.json`
   - `sponsors.json`, `contact.json`, `registro.json`, `estudiantes.json`
   - `docentes.json`, `blog-ui.json`
5. Crear directorio `src/content/blog/` y copiar las 2 entradas de blog:
   - `bienvenida.md`, `como-participar.md`
6. Crear `src/content.config.ts` con el schema del blog

### FASE 3: Adaptar estilos globales (sin dark mode)
7. Actualizar `src/styles/global.css`:
   - **Mantener** la paleta oklch actual del companero (`:root` variables)
   - **Eliminar** todo el bloque `.dark { ... }` y la variante `@custom-variant dark`
   - **Agregar** las utilidades de animacion: `reveal-up`, `reveal-fade`, `reveal-scale`, `float`, `pulse-soft`, `slide-in-right`, `marquee`
   - **Agregar** las clases de utilidad: `bg-dot-pattern`, `grain-overlay::before`, `rule-line`, `card-accent-left`, `[data-animate]`, `::selection`, `.img-zoom`, `.editorial-quote`
   - **Mantener** las fonts del companero (`--font-sans: 'Inter'`)
   - Agregar alias `--font-display` apuntando a `Pacifico`
   - Todos los estilos que tenian variantes `.dark` solo conservan la version light

### FASE 4: Adaptar Layout
8. Actualizar `src/layouts/Layout.astro`:
   - Agregar SEO meta tags, Open Graph, Twitter cards, structured data
   - **Usar el header existente** (BebrasHeader) en lugar del Navbar
   - **Agregar** Footer component (migrado)
   - **Agregar** el scroll reveal observer script
   - **Agregar** `ClientRouter` (View Transitions)
   - **Eliminar** los scripts de dark mode
   - Importar datos de `site.json` y `navigation.json` para metadata

### FASE 5: Migrar componentes
9. **Componentes Astro a crear** (sin dark mode):
   - `Footer.astro`
   - `Hero.astro` (disponible pero no en index)
   - `AboutBebras.astro`
   - `AgeCategories.astro`
   - `ScoringTable.astro`

10. **Componentes React a crear** (adaptados a shadcn radix-nova):
    - `NewsCarousel.tsx` - Adaptado a Carousel radix-nova
    - `FAQAccordion.tsx` - Adaptado a Accordion radix-nova
    - `TeacherInstructions.tsx` - Adaptado a Tabs radix-nova
    - `MobileMenu.tsx` - Menu mobile funcional

### FASE 6: Migrar paginas (excepto index)
11. Crear paginas en `src/pages/`:
    - `estudiantes.astro`
    - `docentes.astro`
    - `faq.astro`
    - `blog/index.astro`
    - `blog/[slug].astro`
    - `sponsors.astro`
    - `contacto.astro`
    - `registro.astro`

### FASE 7: Adaptar navegacion del header
12. Actualizar `BebrasHeader.tsx`:
    - Cambiar hash anchors por rutas reales
    - Adaptar navegacion usando `navigation.json`
    - Reemplazar IntersectionObserver por deteccion de ruta activa
    - Conectar hamburger mobile al MobileMenu
    - Mantener estilo visual intacto

### FASE 8: Migrar CMS completo
13. Copiar carpeta `cms/` completa
14. Ajustar rutas en el CMS para nueva estructura

### FASE 9: Cleanup y verificacion
15. Eliminar archivos sobrantes: `Welcome.astro`, `astro.svg`, `background.svg`, `BebrasBoliviaHome.tsx`
16. Crear placeholder images en `public/images/`
17. Verificar que `astro build` compila sin errores
18. Verificar que todas las rutas funcionan

---

## Estructura resultante

```
bebras-bolivia/
├── cms/                              # CMS completo migrado
│   ├── content/
│   │   ├── current/                  # Contenido actual (JSON + blog MD)
│   │   └── snapshots/                # Historial de versiones
│   ├── public/                       # Frontend admin SPA
│   ├── src/                          # Backend Express modules
│   ├── db/                           # SQLite
│   └── package.json
├── src/
│   ├── components/
│   │   ├── BebrasHeader.tsx          # Actualizado: rutas reales + MobileMenu
│   │   ├── ParticlesBackground.tsx   # Sin cambios (solo en index)
│   │   ├── Footer.astro              # NUEVO
│   │   ├── Hero.astro                # NUEVO (disponible, no en index)
│   │   ├── AboutBebras.astro         # NUEVO
│   │   ├── AgeCategories.astro       # NUEVO
│   │   ├── ScoringTable.astro        # NUEVO
│   │   ├── NewsCarousel.tsx          # NUEVO
│   │   ├── FAQAccordion.tsx          # NUEVO
│   │   ├── TeacherInstructions.tsx   # NUEVO
│   │   ├── MobileMenu.tsx            # NUEVO
│   │   └── ui/                       # 42 componentes radix-nova (sin cambios)
│   ├── content/
│   │   └── blog/
│   │       ├── bienvenida.md         # NUEVO
│   │       └── como-participar.md    # NUEVO
│   ├── data/                         # NUEVO: 15 JSON files
│   ├── hooks/
│   │   └── use-mobile.ts
│   ├── layouts/
│   │   └── Layout.astro              # Actualizado
│   ├── lib/
│   │   └── utils.ts
│   ├── pages/
│   │   ├── index.astro               # SIN CAMBIOS
│   │   ├── estudiantes.astro         # NUEVO
│   │   ├── docentes.astro            # NUEVO
│   │   ├── faq.astro                 # NUEVO
│   │   ├── blog/
│   │   │   ├── index.astro           # NUEVO
│   │   │   └── [slug].astro          # NUEVO
│   │   ├── sponsors.astro            # NUEVO
│   │   ├── contacto.astro            # NUEVO
│   │   └── registro.astro            # NUEVO
│   ├── styles/
│   │   └── global.css                # Actualizado
│   └── content.config.ts             # NUEVO
├── public/
│   └── images/                       # NUEVO: placeholder SVGs
├── astro.config.mjs
├── package.json                      # Actualizado
├── components.json
└── tsconfig.json
```

---

## Riesgos y consideraciones

1. **Compatibilidad shadcn radix-nova vs base-nova**: Los componentes pueden tener APIs ligeramente diferentes. Cada uno sera verificado y adaptado.
2. **Eliminacion de dark mode**: Ninguna clase `dark:` debe quedar en componentes migrados.
3. **BebrasHeader -> Multi-pagina**: Cambio de scroll-spy a navegacion por rutas.
4. **CMS paths**: Rutas hardcoded necesitan ajuste para desarrollo local.
5. **Imagenes placeholder**: Se crearan SVGs basicos para evitar 404s.
