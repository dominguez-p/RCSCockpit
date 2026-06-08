El repositorio no tiene releases publicados, por lo que se propone un versionado funcional basado en la evolución observada en la rama `main`.

### v0.1.0 - Base inicial del proyecto

**Fecha aproximada:** 29 mayo 2026  
**Commits relacionados:** `first commit`, `First version of Control-Tower-AIxBanker`

Primera versión de la aplicación Control Tower para AIxBanker.

Incluye:

- Estructura web inicial.
- Pantalla base de Control Tower.
- Primer modelo de portfolio.
- Primeras vistas de AIxBanker.

### v0.2.0 - Soporte inicial para carga desde spreadsheet

**Fecha aproximada:** 29 mayo 2026  
**Commit relacionado:** `logs for fill in spreadsheet correctly`

Evolución inicial para facilitar la carga y depuración de datos desde spreadsheet.

Incluye:

- Preparación de logs para validar estructura de datos.
- Base para integración con hojas de cálculo.
- Ajustes de soporte para poblar correctamente el modelo de datos.

### v0.3.0 - Footer y copyright

**Fecha aproximada:** 30 mayo 2026  
**Pull request:** `feature/copyright`

Incluye:

- Incorporación de footer.
- Copyright de autoría.
- Cierre visual de página.

### v0.4.0 - Gobierno: localismos, impedimentos y decisiones

**Fecha aproximada:** 1 junio 2026  
**Pull request:** `feature/governance-impediments-decisions`

Incluye:

- Localismos del programa.
- Sección de impedimentos.
- Decisiones pendientes.
- Decisiones tomadas.
- Filtrado por país.

### v0.5.0 - Arquitectura de referencia

**Fecha aproximada:** 2 junio 2026  
**Pull request:** `feature/arquitectura-de-referencia`

Incluye:

- Nueva vista de arquitectura de referencia.
- Mapa de sistemas As-Is.
- Features, gaps y dependencias.
- Mapa de sistemas To-Be.
- Ajuste del mapa de sistemas para centrarse en mapa técnico y mapa funcional.

### v0.6.0 - Preparación para Google Apps Script

**Fecha aproximada:** 4 junio 2026  
**Pull request:** `feature/prepare-appscript-migration`

Incluye:

- Carpeta `apps-script/`.
- Equivalencias entre ficheros web y ficheros Apps Script.
- Documentación de migración.
- Preparación para usar `google.script.run` como canal de datos.

### v0.7.0 - Fuente local de datos y administración

**Fecha aproximada:** 4 junio 2026  
**Pull requests:** `feature/local-data`

Incluye:

- Fuente local de datos.
- Soporte para `data/app-data.json`, cuando aplica.
- Toggle de administración de datos.
- Nuevos datos locales para pruebas y demos.

### v0.8.0 - Botones dinámicos por producto

**Fecha aproximada:** 4 junio 2026  
**Pull requests:** `feature/dynamic_buttons`

Incluye:

- Selector dinámico de producto.
- Botones para alternar entre productos como Blue Buddy y Panorama.
- Ajustes del mapa de sistemas en función del producto seleccionado.

### v0.9.0 - Rebranding de Cockpit a Control Tower

**Fecha aproximada:** 4 junio 2026  
**Pull request:** `feature/new-name`

Incluye:

- Cambio de naming de Cockpit a Control Tower.
- Actualización de títulos y textos visibles.
- Refuerzo del posicionamiento como vista ejecutiva de portfolio.

### v1.0.0 - Selector visual de país con flags

**Fecha aproximada:** 8 junio 2026  
**Pull request:** `feature/holding-flag`

Incluye:

- Selector visual de país mediante banderas.
- Assets de flags en `assets/flags/`.
- Mejora de navegación contextual por geografía.
- Consolidación de la experiencia actual en `main`.

## Preparación para Google Apps Script

Este proyecto está preparado para migrarse a Google Apps Script.

### Archivos equivalentes

| Proyecto web       | Apps Script |
| ------------------ | ----------- |
| index.html         | Index.html  |
| styles.css         | Styles.html |
| js/config.js       | Client.html |
| js/sample-data.js  | Client.html |
| js/data-service.js | Client.html |
| js/app.js          | Client.html |

### Cambio de runtime

Para web estática:

```js
runtime: "google-sheets-api";
```

Cambios necesarios al migrar
Sustituir <link rel="stylesheet"> por <?!= include('Styles'); ?>
Sustituir <script src="..."> por <?!= include('Client'); ?>
Leer datos con SpreadsheetApp desde Code.gs
Llamar a servidor mediante google.script.run
