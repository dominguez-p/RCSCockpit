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
