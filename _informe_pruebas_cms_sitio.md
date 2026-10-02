# Informe de pruebas del CMS y sitio informativo Bebras Bolivia

Material para la sección de pruebas del capítulo 05 del documento de grado. Ejecuciones reales del 29 de septiembre de 2026 sobre `bebras-bolivia`. Informe consolidado el 1 de octubre de 2026 a partir de las corridas finales conservadas.

## 1. Objetivo y alcance

Se ejecutó el plan `_plan_pruebas_cms_sitio.md`, implementando pruebas repetibles de lógica, API, interfaz del administrador, sitio estático, integración y calidad. Se tomaron las historias originales de `../_hus_cms.md` y el comportamiento del sistema actual: el usuario confirmó que no modificó las historias y que continuó desarrollando el sistema.

La fuente contiene 32 elementos: 13 historias, CMS-00 como tarea de preparación y 18 tareas relacionadas. La [matriz de trazabilidad](tests/TRACEABILIDAD.md) conserva esa distinción y describe las brechas; no se afirma aceptación completa de todas las historias por aprobar los casos automatizados.

## 2. Estrategia

Las unitarias comprueban contratos JSON, cifrado interoperable, distinciones, textos, enlaces, contraseñas, catálogo de colegios y escrituras serializadas. La API comprueba autenticación, permisos, validación, persistencia, medios, respaldos, publicación y certificados. Playwright reproduce acciones del administrador y comprueba el sitio compilado en Chromium. Los cinco casos de integración publican contenido real desde el CMS temporal y verifican el resultado estático.

Cada entorno usa una carpeta temporal fuera de OneDrive, SQLite propia, contenido copiado y datos inventados. El repositorio Git temporal tiene el destino de push bloqueado; las pruebas no publican en producción. Los certificados reales se excluyen de las copias. Las dependencias se comparten mediante junction de solo uso; contenido y compilaciones permanecen separados. Al cerrar se detienen los procesos propios y se borra la carpeta temporal.

## 3. Entorno y herramientas

| Elemento              | Herramienta                                                         |
| --------------------- | ------------------------------------------------------------------- |
| Entorno               | Windows, Bun 1.3.5, Node.js 22.12                                   |
| CMS                   | Código Express/Bun real, SQLite aislada, base `/admbb`              |
| Sitio                 | Astro compilado en modo producción y servidor HTTP estático local   |
| Unitarias/API         | Bun test, JUnit y cobertura LCOV                                    |
| Navegador             | Playwright 1.63, Chromium, un worker                                |
| Certificados          | Decodificación del QR y revisión del PDF con pdf-lib                |
| Calidad               | Lighthouse 13.5, medición de recursos y 100 peticiones concurrentes |
| Verificación estática | Astro check, TypeScript y ESLint                                    |

La compilación del CMS en Windows utiliza Node para ejecutar Astro directamente y junctions para activar las versiones del sitio. En otros sistemas se conserva el ejecutable configurado originalmente. El servidor estático reproduce la entrega de archivos, sin medir la configuración ni capacidad de Apache.

## 4. Organización y evidencia

Los comandos `test:unidad`, `test:api`, `test:e2e:cms`, `test:e2e:sitio`, `test:integracion` y `test:calidad` permiten repetir los grupos. `bun run test` ejecuta todos. `bun tests/report.ts` consolida JUnit y Playwright.

La evidencia se guarda en `../_pruebas/cms-sitio/`: JUnit, logs, `coverage/lcov.info`, reporte HTML y JSON de Playwright, `calidad.json`, `resumen.json` y `casos.md`. Las capturas y trazas se conservan cuando una prueba falla. El [listado completo de casos](../_pruebas/cms-sitio/casos.md) contiene los nombres, resultados y tiempos.

## 5. Resultados funcionales

La consolidación final contiene **254 casos aprobados, 0 fallidos y 0 omitidos**. Las unitarias ejecutaron 236 aserciones y la API 324. Playwright completó los 54 casos en 9.1 minutos, sin reintentos ni casos inestables.

| Grupo                   |   Casos | Aprobados | Fallidos | Omitidos |
| ----------------------- | ------: | --------: | -------: | -------: |
| Unitarias               |      74 |        74 |        0 |        0 |
| API del CMS             |     126 |       126 |        0 |        0 |
| Interfaz del CMS        |      20 |        20 |        0 |        0 |
| Sitio compilado         |      29 |        29 |        0 |        0 |
| Integración CMS → sitio |       5 |         5 |        0 |        0 |
| **Total**               | **254** |   **254** |    **0** |    **0** |

La comprobación global de tipos terminó sin errores. Astro mostró una sugerencia por `document.execCommand` obsoleto. ESLint terminó sin errores y con tres advertencias existentes: dos variables sin usar del servicio de certificados y una actualización de estado dentro de un efecto React.

## 6. Cobertura unitaria

Bun registró 100 % de líneas y funciones en los 14 módulos de producción importados por las unitarias. Este porcentaje corresponde a esos módulos, no a todo el sistema, todas sus ramas, las rutas HTTP ni la interfaz. La cobertura funcional adicional se acredita mediante los casos API y de navegador, no mediante ese porcentaje.

## 7. Calidad del sitio compilado

Medición móvil local, con el mínimo de accesibilidad de 90 propuesto por el plan. Los otros puntajes son métricas informativas, sin un umbral acordado.

| Página      | Rendimiento | Accesibilidad | Buenas prácticas | SEO |
| ----------- | ----------: | ------------: | ---------------: | --: |
| Inicio      |          48 |           100 |               77 | 100 |
| Estudiantes |          66 |           100 |              100 | 100 |
| Maestros    |          62 |           100 |              100 | 100 |
| FAQ         |          61 |           100 |              100 | 100 |
| Contacto    |          62 |           100 |              100 | 100 |
| Sponsors    |          61 |           100 |              100 | 100 |
| Blog        |          62 |           100 |              100 | 100 |
| Certificado |          62 |           100 |              100 | 100 |

Después de corregir los colores señalados, Lighthouse no registró fallos de contraste. La portada recibió 24.19 MB de recursos decodificados, de los cuales 23.42 MB corresponden a imágenes; las otras páginas recibieron aproximadamente 0.75–1.10 MB. Tres fotos editoriales externas explican gran parte del peso. El puntaje de buenas prácticas de inicio refleja cookies de terceros de Wikimedia/WCS. No se cambiaron esas URLs ni el contenido editorial.

La carga liviana completó 100 de 100 peticiones simultáneas a `/certificado`, sin errores: mediana 209.89 ms, percentil 95 de 232.65 ms y máximo registrado en el JSON. Se mide HTTP estático local, sin descifrado concurrente en navegador ni capacidad de Apache. Los puntajes y tiempos pueden variar con la máquina y la red. La medición se tomó después de corregir contraste y antes del ajuste final de distribución móvil en Contacto.

## 8. Defectos encontrados y corregidos

| Defecto observado                                                               | Corrección y evidencia                                                                                                                                           |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Una distinción explícita podía ser reemplazada por el puesto del podio          | Se prioriza la distinción explícita; regresiones unitarias y certificados de los tres tipos                                                                      |
| El límite de intentos podía eludirse variando X-Forwarded-For                   | Se usa la dirección del socket/Express sin confiar en la cabecera recibida; API-16                                                                               |
| Archivos vacíos aceptados y errores de subida devueltos como 500/HTML           | Se rechaza el archivo vacío y se responde JSON 400 o 413 para entradas inválidas; API de medios                                                                  |
| Compilación y activación de publicación incompatibles con Windows               | Astro se ejecuta directamente con Node en Windows y se usan junctions; publicación e integración                                                                 |
| Páginas ocultas podían terminar compiladas cuando el CMS corría en desarrollo   | El proceso de compilación fuerza modo producción; sitio e INT-03 comprueban 404 y ausencia del menú                                                              |
| Guardar contenido después de programar podía publicar antes de la fecha         | La programación cancela el debounce inmediato y evita nuevas publicaciones automáticas mientras está activa; API-PUBLISH-BASELINE                                |
| Sincronizar la vista previa borraba la diferencia frente al contenido publicado | Se mantiene una referencia persistente, independiente del directorio de vista previa, que solo cambia tras publicar correctamente; API-PUBLISH-BASELINE e INT-01 |
| Texto claro sobre fondos amarillos y otros contrastes insuficientes             | Se ajustan tinta, variantes oscuras y opacidades; accesibilidad 100 y sin fallos de contraste en ocho rutas                                                      |
| Tarjetas de Contacto desbordaban a 320 px                                       | Se permite encoger el contenido y distribuir enlaces en varias líneas; comprobación responsive del sitio                                                         |

## 9. Limitaciones

La matriz indica comprobaciones parciales: no se compara cada texto de cada JSON, no se recorren todas las operaciones de cada tipo de sección, no se simula el disparo futuro del reloj de publicación y no se provoca un fallo de compilación para acreditar todos sus estados. La creación, listado, cancelación y ausencia de publicación temprana sí se comprueban. El sistema actual incorpora certificados, logos y páginas personalizadas adicionales a las historias originales.

La primera inicialización de la referencia publicada toma los archivos fuente actuales del sitio. Si una instalación ya tenía borradores sincronizados antes de incorporar esta corrección, no puede reconstruirse retrospectivamente el contenido del último build a partir de esos archivos. Las publicaciones siguientes actualizan correctamente la referencia.

Las pruebas de consulta y PDF usan personas ficticias. No incluyen una auditoría de seguridad completa, impresión física, dispositivos reales ni producción. El rendimiento de la portada y sus imágenes externas queda como resultado medido pendiente de optimización.
