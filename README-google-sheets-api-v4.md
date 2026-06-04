# RCS Cockpit - Google Sheets API v4

## Ficheros a sustituir

- `js/config.js`
- `js/google-sheets.js`
- `js/app.js`

`index.html` no necesita cambios.

## Cambios necesarios en Google Sheets / Excel

Tu Google Sheet debe tener estas pestañas:

```text
portfolio_kpis
programs
modules
roles
priorities
functional_map
systems_inventory
```

### `portfolio_kpis`

```text
label | value | subtitle | icon
```

### `programs`

```text
id | name | description | status | functional | systems | architecture | enabled | icon
```

Notas:

- `functional`, `systems`, `architecture`: número 0-100.
- `enabled`: `true` o `false`.
- AIxBanker debe tener `id = aixbanker`.

### `modules`

```text
id | title | description | route | status
```

Rutas actuales soportadas:

- `functional`
- `systems`

### `roles`

```text
role | description
```

### `priorities`

```text
priority
```

### `functional_map`

```text
domain | capability | features
```

En `features`, separa valores con `|`.

Ejemplo:

```text
Q&A contextual|Resumen cliente|Sugerencias comerciales
```

### `systems_inventory`

```text
layer | component | description | status | country
```

## Configuración

En `js/config.js`:

```js
useGoogleSheets: true;
apiKey: "TU_API_KEY";
spreadsheetId: "TU_SPREADSHEET_ID";
```

## Google Cloud

- Habilita Google Sheets API.
- Crea API Key.
- Restringe la API Key a:
  - `http://127.0.0.1:5500/*`
  - `http://localhost:5500/*`
  - tu URL GitHub Pages si aplica.
- API restriction: Google Sheets API.

## Permisos del Sheet

Para API Key, comparte la hoja como:

```text
Cualquier usuario con el enlace → Lector
```

## Git

```bash
git checkout main
git pull origin main
git checkout -b feature/google-sheets-api-v4
git add .
git commit -m "Use Google Sheets API v4 as data source"
git push -u origin feature/google-sheets-api-v4
```
