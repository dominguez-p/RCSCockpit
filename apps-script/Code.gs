/**
 * Retail Client Solutions Control Tower - Backend Runtime
 * Desarrollador Experto - Migración a Google Apps Script (2026)
 * * Este archivo gestiona la carga de la página y las llamadas RPC del lado del cliente.
 */

/**
 * Función nativa de GAS que se activa al acceder a la URL de la aplicación web.
 */
function doGet() {
  // Creamos un template HTML evaluable a partir del archivo 'Index'
  return (
    HtmlService.createTemplateFromFile("Index")
      .evaluate()
      .setTitle("Retail Client Solutions Control Tower")
      // Permitimos que se embeba en iframes de ser necesario (p.ej. Google Sites)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
  );
}

/**
 * Helper imprescindible en GAS para modularizar componentes HTML e incluirlos inline.
 * Reemplaza las etiquetas tradicionales <link> o <script src="...">.
 * * @param {string} fileName Nombre del archivo HTML a incluir.
 * @return {string} Contenido crudo del archivo.
 */
function include(fileName) {
  return HtmlService.createHtmlOutputFromFile(fileName).getContent();
}

/**
 * Retorna la URL del Spreadsheet activo para la funcionalidad 'Abrir origen'.
 * @return {string} URL completa.
 */
function getSpreadsheetUrl() {
  return SpreadsheetApp.getActiveSpreadsheet().getUrl();
}

/**
 * Descarga y parsea de golpe la información de todas las pestañas mapeadas.
 * Optimiza la velocidad al realizar una única llamada asíncrona desde el cliente.
 * * @return {Object} Objeto maestro con todas las tablas formateadas.
 */
function getAppData() {
  // Mapeo riguroso de nombres de pestañas solicitados en la especificación v4
  const sheetsMap = {
    programs: "programs",
    portfolioKpis: "portfolio_kpis",
    modules: "modules",
    roles: "roles",
    priorities: "priorities",
    functional: "functional_map",
    functionalSystemLinks: "functional_system_links",
    systems: "systems_inventory",
    architectureFeaturesGaps: "architecture_features_gaps",
    systemRelationships: "system_relationships",
    impediments: "impediments",
    decisionsPending: "decisions_pending",
    decisionsDone: "decisions_done",
    systemsToBe: "systems_inventory_tobe",
    systemRelationshipsToBe: "system_relationships_tobe",
  };

  return {
    portfolioKpis: rowsToArray_(sheetsMap.portfolioKpis),

    programs: rowsToObjects_(sheetsMap.programs).map(function (p) {
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        functional: toNumber_(p.functional),
        systems: toNumber_(p.systems),
        architecture: toNumber_(p.architecture),
        enabled: toBoolean_(p.enabled),
        icon: p.icon,
      };
    }),

    modules: rowsToObjects_(sheetsMap.modules).map(function (m) {
      return {
        id: m.id,
        programId: m.programId,
        title: m.title,
        description: m.description,
        route: m.route || null,
        status: m.status,
      };
    }),

    roles: rowsToObjects_(sheetsMap.roles),
    priorities: rowsToObjects_(sheetsMap.priorities),

    functional: rowsToObjects_(sheetsMap.functional).map(function (item) {
      return {
        programId: item.programId,
        country: item.country,
        domain: item.domain,
        capability: item.capability,
        features: splitPipeList_(item.features), // Separador de características v4
      };
    }),

    systems: rowsToObjects_(sheetsMap.systems),
    functionalSystemLinks: rowsToObjects_(sheetsMap.functionalSystemLinks),
    architectureFeaturesGaps: rowsToObjects_(
      sheetsMap.architectureFeaturesGaps,
    ),
    systemRelationships: rowsToObjects_(sheetsMap.systemRelationships),
    impediments: rowsToObjects_(sheetsMap.impediments),
    decisionsPending: rowsToObjects_(sheetsMap.decisionsPending),
    decisionsDone: rowsToObjects_(sheetsMap.decisionsDone),
    systemsToBe: rowsToObjects_(sheetsMap.systemsToBe),
    systemRelationshipsToBe: rowsToObjects_(sheetsMap.systemRelationshipsToBe),
  };
}

/**
 * Convierte el contenido de una pestaña en una lista de objetos JSON usando las cabeceras.
 * Usa getDisplayValues() para respetar formatos visuales y evitar problemas con fechas/números.
 */
function rowsToObjects_(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    Logger.log("No existe la hoja requerida: " + sheetName);
    return [];
  }

  const values = sheet.getDataRange().getDisplayValues();
  if (!values || values.length < 2) return [];

  const headers = values[0].map(function (h) {
    return String(h || "").trim();
  });
  const result = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!Array.isArray(row)) continue;
    // Ignorar filas completamente vacías
    if (
      !row.some(function (cell) {
        return String(cell || "").trim() !== "";
      })
    )
      continue;

    const obj = {};
    headers.forEach(function (header, index) {
      if (header) {
        obj[header] = String(row[index] || "").trim();
      }
    });
    result.push(obj);
  }
  return result;
}

/**
 * Convierte una pestaña en una matriz plana de arreglos (excluyendo cabeceras).
 * Ideal para estructuras variables como KPIs de portafolio.
 */
function rowsToArray_(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    Logger.log("No existe la hoja requerida: " + sheetName);
    return [];
  }

  const values = sheet.getDataRange().getDisplayValues();
  if (!values || values.length < 2) return [];

  const result = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!Array.isArray(row)) continue;
    if (
      !row.some(function (cell) {
        return String(cell || "").trim() !== "";
      })
    )
      continue;

    result.push(
      row.map(function (cell) {
        return String(cell || "").trim();
      }),
    );
  }
  return result;
}

// Métodos utilitarios de formateo e interpretación tipográfica
function toNumber_(value) {
  const n = Number(
    String(value || "")
      .replace("%", "")
      .replace(",", ".")
      .trim(),
  );
  return Number.isNaN(n) ? 0 : n;
}

function toBoolean_(value) {
  return ["true", "yes", "si", "sí", "1", "x"].includes(
    String(value || "")
      .trim()
      .toLowerCase(),
  );
}

function splitPipeList_(value) {
  return String(value || "")
    .split("|")
    .map(function (x) {
      return x.trim();
    })
    .filter(Boolean);
}
