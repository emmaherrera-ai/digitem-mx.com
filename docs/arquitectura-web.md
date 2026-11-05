# DIGITEM-MX · Arquitectura v0.1

La implementación evoluciona la raíz del repositorio y conserva Astro y las rutas de Salud, demos y Suite. No requiere un sitio de Sites ni otro dominio.

| Ruta | Propósito | Estado |
| --- | --- | --- |
| / | Explicar la perspectiva, hacer visible el framework y abrir conversación | Home implementada |
| /metodo/ | Profundizar en relaciones entre People, Process, Tools, Information y Direction | Próxima fase; navegación actual a /#metodo |
| /diagnostico/ | Explicar alcance, dinámica y resultado del diagnóstico | Próxima fase; navegación actual a /#diagnostico |
| /ideas/ | Publicar pensamiento propio y reflexiones | Próxima fase; navegación actual a /#ideas |
| /firma/ | Presentar criterio, enfoque y personas de la firma con datos verificados | Próxima fase; navegación actual a /#firma |

## Home

1. Diseñamos para avanzar. Red SVG con los cinco dominios.
2. Hacer más no siempre es avanzar. Contexto y principios.
3. Método. Explorador accesible por ratón y teclado de los cinco dominios.
4. Fricción. Señales observables en la operación.
5. Diagnóstico. Observar, conectar, dar dirección.
6. Ideas. Tres reflexiones desplegables; no se presentan como artículos ya publicados.
7. Firma. Criterio humano y mirada de sistema.
8. Conversemos. Correo verificado en el sitio actual; abre el cliente de correo, no simula un envío.

## Identidad y comportamiento

- Fondo #0c1b21, crema #f4eadc, teal #66ded3, naranja #ffac69.
- Space Mono para display; Manrope para lectura, con alternativas locales.
- Red creada en SVG: nodos = dominios, líneas = relaciones, superficies curvas = interdependencia.
- Movimiento suave con preferencia de movimiento reducido respetada.
- Navegación móvil desplegable; enlaces internos funcionales mientras se construyen las páginas.
- Sin guiones bajos como identidad, catálogo de servicios, cifras, clientes o testimonios inventados.

## Integración y publicación

Revisar en la vista previa del proveedor actual y fusionar la rama de Home mediante el flujo habitual del repositorio. No se ha configurado un dominio alternativo ni modificado DNS.

La raíz consultada en www.digitem-mx.com muestra contenido distinto al HEAD descargado: confirmar qué rama y proyecto despliega producción antes de publicar. El repositorio no incluye las páginas /privacidad y /terminos que enlaza el sitio visible; los enlaces legales conservan el destino de producción hasta recuperar su contenido aprobado.

Los fragmentos antiguos se mapean a secciones nuevas mediante home.js. Las páginas de Suite, Salud y demos permanecen en el repositorio.

## Validación

- Compilación estática Astro: nueve rutas generadas correctamente.
- JavaScript: sintaxis validada con node --check.
- Navegación y cambio de dominio comprobados en navegador local.
- El servidor de desarrollo informa errores preexistentes en scripts de demo/dentista.astro; la compilación estática completa sí termina correctamente.
- npm install informa dependencias vulnerables preexistentes; su actualización requiere una revisión aparte del rediseño.
