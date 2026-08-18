# RCS Portfolio Cockpit

Cuadro de mando ejecutivo de **Retail Client Solutions (RCS)** para unificar la lectura del portfolio, los programas, los roadmaps, la evolución funcional y tecnológica y el gobierno de la ejecución.

El objetivo del cockpit es ofrecer una única experiencia de navegación desde la visión global de RCS hasta el detalle de programa, país, producto, iniciativa y actividad, manteniendo los datos operativos fuera del repositorio.

> **Fuente de verdad del código:** rama `main`.
> **Última revisión de esta documentación:** 18 de agosto de 2026.

## Estado actual

La aplicación es un frontend estático en HTML, CSS y JavaScript sin framework. La información se carga en tiempo de ejecución desde Google Sheets a través de Web Apps de Google Apps Script que exponen JSONP.

El runtime activo es:

```js
runtime: "drive-json"
```

No se utiliza Google Sheets API v4 directamente desde el navegador y no deben almacenarse API keys ni snapshots de datos operativos en el repositorio.

## Experiencia de usuario

### Portfolio RCS

La landing prioriza los **Programas RCS** y presenta debajo, de forma colapsada, el marco de **Ambición RCS 2026**.

Desde el portfolio se accede a cada programa habilitado y a su origen de datos correspondiente.

### Programa

Cada programa puede ofrecer, según los datos disponibles:

- Roadmap.
- Mapa funcional.
- Mapa de sistemas.
- Arquitectura de referencia As-Is / To-Be.
- Teams y staffing.
- Impedimentos.
- Decisiones.
- Módulos adicionales configurados desde datos.

La navegación mantiene el contexto geográfico y diferencia **Holding** de las vistas por país.

### AIxBanker

AIxBanker incorpora además una experiencia específica de producto:

- visión global de producto en Holding;
- Blue Buddy y Panorama;
- navegación Producto → Capacidad → Caso funcional;
- roadmap de programa y roadmap específico de producto;
- Holding como consolidación de todas las geografías;
- roadmaps de país limitados a su contexto geográfico;
- detalle de elementos y actividades preservando el ámbito seleccionado;
- trazabilidad con las Ambiciones RCS, situada al final del roadmap y colapsada por defecto.

## Arquitectura de datos

El flujo principal es:

```text
Navegador
   │
   ├─ js/config.js
   │     │
   │     └─ origen general del Portfolio
   │
   ├─ Google Apps Script del Portfolio
   │     │
   │     └─ KPIs + programas + driveJsonUrl/spreadsheetId de cada programa
   │
   └─ Google Apps Script del programa seleccionado
         │
         └─ Google Sheet del programa
```

La configuración de los programas **no se mantiene hardcodeada en `js/config.js`**. El origen general devuelve para cada programa su `driveJsonUrl` y `spreadsheetId`; `js/app.js` construye dinámicamente el registro de fuentes y carga únicamente el programa que el usuario está consultando.

### Carga desde Apps Script

`js/drive-json-source.js` implementa la carga JSONP. Cada petición utiliza un callback único para permitir cargas concurrentes sin colisiones.

La carga normal del cockpit es de **solo lectura**. El navegador no escribe en las spreadsheets.

## AIxBanker Apps Script

La versión del backend de AIxBanker está versionada en:

```text
apps-script/aixbanker/Code.gs
```

El `doGet()` utilizado por el cockpit solo ejecuta `getAppData()` y devuelve el modelo ya disponible en la spreadsheet.

La actualización de documentación de producto es un proceso independiente y manual:

```text
AIxBanker → Actualizar datos de producto
```

`refreshProductData()`:

- revisa los DOR configurados en `productFeatures`;
- actualiza `Texto extraido` únicamente cuando el contenido cambia;
- completa fórmulas Gemini en nuevas filas cuando corresponde;
- utiliza bloqueo para evitar ejecuciones simultáneas;
- evita escrituras parciales si algún documento falla;
- **no forma parte del camino crítico de carga del cockpit**.

Actualmente `productCatalog` y `productFeatures` están integrados en la propia fuente de AIxBanker; no existe una dependencia de una spreadsheet externa de producto durante la carga de la web.

## Modelo de datos principal

El backend de AIxBanker contempla actualmente estas colecciones:

```text
modules
roles
priorities
functional
functionalSystemLinks
systems
systemsToBe
architectureFeaturesGaps
systemRelationships
systemRelationshipsToBe
impediments
decisionsPending
decisionsDone
roadmapItems
roadmapItemActivities
teams
productCatalog
productFeatures
```

Se mantiene compatibilidad temporal con el modelo legado de `projects`, `projectPhases`, `msas` y `msaPhases`, aunque el modelo recomendado es `roadmapItems` + `roadmapItemActivities`.

La trazabilidad estratégica del roadmap se documenta en:

- [`docs/roadmap-ambitions-data-model.md`](docs/roadmap-ambitions-data-model.md)

La implementación de tarjetas adaptativas de programa está documentada en:

- [`docs/program-adaptive-cards.md`](docs/program-adaptive-cards.md)

## Estructura del repositorio

```text
.
├── index.html
├── styles.css
├── styles/
│   ├── portfolio-home.css
│   ├── program-home.css
│   ├── roadmap-workspace.css
│   ├── roadmap-ambitions.css
│   ├── program-adaptive-cards.css
│   ├── context-toolbar.css
│   ├── product-experience.css
│   └── roadmap-context-ux.css
├── js/
│   ├── config.js
│   ├── drive-json-source.js
│   ├── app.js
│   ├── portfolio-home.js
│   ├── program-home.js
│   ├── program-governance.js
│   ├── roadmap-workspace-*.js
│   ├── roadmap-ambitions-*.js
│   ├── program-adaptive-cards.js
│   ├── context-toolbar.js
│   ├── product-experience.js
│   └── roadmap-context-ux.js
├── apps-script/
│   └── aixbanker/
│       └── Code.gs
├── docs/
└── assets/
```

`app.js` sigue conteniendo parte del núcleo histórico de la aplicación. Los nuevos ámbitos se están separando progresivamente en módulos independientes para reducir riesgo y facilitar mantenimiento.

## Configuración

El punto de entrada es `js/config.js`:

```js
window.APP_CONFIG = {
  runtime: "drive-json",
  portfolio: {
    id: "portfolio",
    label: "Portfolio general",
    driveJsonUrl: "URL_WEB_APP_PORTFOLIO",
    spreadsheetId: "ID_SPREADSHEET_PORTFOLIO",
  },
};
```

Los orígenes de programa llegan dinámicamente desde la fuente de Portfolio.

### Requisitos de permisos

Para un despliegue corporativo deben verificarse de forma explícita:

- acceso al Web App de Apps Script limitado al ámbito corporativo previsto;
- permisos de las spreadsheets con mínimo privilegio;
- permisos de DOR, Figma y documentación enlazada coherentes con la audiencia;
- ausencia de datos operativos, credenciales, tokens o exports en el repositorio.

## Operación

### Actualizar datos

El botón **Actualizar datos** fuerza una nueva lectura del origen correspondiente a la pantalla actual.

### Abrir origen

El botón **Abrir origen** abre la spreadsheet configurada para el Portfolio o para el programa que se está consultando.

### Actualizar producto AIxBanker

Desde la spreadsheet de AIxBanker:

```text
AIxBanker → Actualizar datos de producto
```

Esta operación no se lanza desde la web.

## Desarrollo local

Al ser una web estática basta con servir el repositorio mediante un servidor HTTP local. Por ejemplo:

```bash
python -m http.server 8000
```

Después:

```text
http://localhost:8000
```

El acceso a los datos en vivo seguirá sujeto a los permisos corporativos de los Web Apps y documentos de Google.

## Despliegue

El repositorio incluye un `CNAME` para:

```text
rcscockpit.com
```

Antes de una publicación amplia debe completarse la checklist de:

- [`docs/release-checklist.md`](docs/release-checklist.md)

## Validación automática

Los pull requests y los cambios en `main` ejecutan una validación ligera que:

- comprueba la sintaxis de los ficheros JavaScript;
- impide volver a versionar snapshots JSON en `data/`;
- impide incorporar ficheros `*_old*` como mecanismo de backup.

## Política de datos del repositorio

El repositorio contiene **código y documentación**, no una copia del dato operativo.

No se deben versionar:

- exports JSON de spreadsheets;
- snapshots para debug con información real;
- copias `*_old` de configuración o código;
- credenciales, API keys o tokens.

Para reproducir incidencias se deben utilizar datos sintéticos o anonimizados.

## Deuda técnica priorizada tras la publicación

No conviene abordar un refactor estructural amplio justo antes de una apertura general. Las siguientes mejoras quedan como evolución posterior, con cambios pequeños y verificables:

1. seguir descomponiendo `js/app.js` y eliminar código legado comentado;
2. reducir duplicidades y overrides acumulados en `styles.css`;
3. eliminar los últimos catálogos de producto hardcodeados en cliente y consumir exclusivamente `productCatalog`;
4. ampliar la cobertura de pruebas de navegación y normalización de datos;
5. formalizar releases/versionado cuando el ciclo de despliegue se estabilice.

## Principio de publicación

`main` debe permanecer desplegable en todo momento. Los cambios funcionales deben entrar mediante ramas y pull request, evitando mezclar limpieza estructural de alto impacto con cambios de negocio próximos a una publicación.
