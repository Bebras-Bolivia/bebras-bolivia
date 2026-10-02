# Resultados de pruebas unitarias CMS y sitio

Fecha: 29 de septiembre de 2026. Entorno: Windows, Bun 1.3.5.

Comando ejecutado: `bun run test:unidad`.

Resultado: **74 pruebas aprobadas, 0 fallidas, 236 aserciones**, en 3 archivos; última corrida: **2,04 segundos**. Bun informa **100 % de funciones y líneas** para los 14 módulos de producción importados por esta suite. Esto mide esos módulos, no el servidor, las rutas, toda la interfaz ni todos los comportamientos o ramas del proyecto.

| Grupo / identificador | Casos | Alcance                                                                                                                                                                                                             |
| --------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U-CRIP                |    10 | Normalización CMS/sitio, derivación determinista, nombre de archivo, clave AES, descifrado real en el sitio con HTTP simulado, UTF-8, IV aleatorio, código incorrecto, datos alterados, 404, 500 y archivo inválido |
| U-DIST                |     7 | Los tres puestos, 10 %, redondeo, categorías pequeñas, sin puesto y prioridad de elección manual                                                                                                                    |
| U-SCHEMA              |    33 | Los 15 JSON del sitio pasan su contrato; faltantes y tipos incorrectos se rechazan; límites de logos, páginas y enlaces ejecutables                                                                                 |
| U-TEXTO               |     4 | Tildes, eñes, recursión sin mutaciones, cambios legítimos y archivo UTF-8 con saltos de línea                                                                                                                       |
| U-SNAPSHOT            |     2 | ID positivo canónico, orden numérico y límites seguros                                                                                                                                                              |
| U-URL                 |     3 | Mismo criterio CMS/sitio, enlaces permitidos, protocolos peligrosos, controles, barras inversas y fallback                                                                                                          |
| U-BLOG                |     7 | Markdown, listas, tablas, imágenes, separadores, HTML peligroso, enlaces externos y rich text                                                                                                                       |
| U-COLEGIO             |     3 | Tildes, mayúsculas, departamento, límite 20, código y ausencia de índice interno en respuesta                                                                                                                       |
| U-AUTH                |     2 | Argon2id, contraseña correcta/incorrecta y sal independiente                                                                                                                                                        |
| U-LOCK                |     2 | Dos mutaciones no se pisan y un fallo no bloquea la siguiente                                                                                                                                                       |
| U-REGISTRO            |     1 | Enlace abierto seguro, estado vacío y rechazo de enlace ejecutable                                                                                                                                                  |

Los códigos individuales, su alfabeto y la unicidad frente a certificados importados se cubren en la suite de API: su generador está acoplado a SQLite y al servicio de certificados, por lo que esta suite no importa ese servicio.

## Defecto encontrado y corregido

`distinctionOf` decidía el podio antes de mirar la elección explícita `distinction`; esto contradecía el caso del plan que exige prioridad de la distinción escrita a mano. Se extrajo la función a `src/lib/certificate-distinction.ts`, la usa el componente existente y ahora la elección explícita tiene prioridad. U-DIST incluye la regresión (puesto 1 con participación o mérito explícitos).

## Aislamiento y límites

La suite no inicia el CMS, no importa sus módulos de publicación o base de datos y no escribe el contenido del repositorio. Los certificados son inventados y el tráfico se sustituye por respuestas `fetch` en memoria, restaurando la función original después de cada caso. El caso UTF-8 escribe solo en una carpeta temporal del sistema y la elimina. El caso de registro cambia el objeto JSON importado en memoria y lo restaura; no escribe el archivo. El catálogo y los JSON se leen como fixtures sin alterarlos.

Lint ejecutado sobre los tres tests, la función extraída y el componente: **0 errores**, 1 advertencia existente sobre `setState` en el efecto que lee `?codigo=` en `CertificateLookup.tsx`.

Comprobación de tipos: `bunx tsc --noEmit -p tsconfig.tests.json`, **sin errores**. Los reemplazos de `fetch` conservan el atributo `preconnect` que exige el tipo de Bun.

Los estados visuales de registro («Desafío en espera» y botón), PDF, impresión, QR y navegación se verifican en las pruebas del sitio; aquí se comprueba la lógica pura. El ID de respaldo real es un entero positivo de SQLite, no una fecha incrustada en una cadena. Las historias originales están en `../_hus_cms.md`; el sistema avanzó desde ellas y la trazabilidad del informe general usa esas historias sin inventar nuevas.
