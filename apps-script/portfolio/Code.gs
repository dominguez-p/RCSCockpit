const EXPORT_FOLDER_NAME = "PortfolioPDB";
const EXPORT_FILE_NAME = "app-common-data.json";

const SHEETS = {
  portfolioKpis: "portfolio_kpis",
  programs: "programs",
};

/*
 * =========================================================
 * RCS COCKPIT · PORTFOLIO
 * =========================================================
 *
 * Responsabilidad:
 *
 * - leer portfolio_kpis;
 * - leer programs;
 * - devolver el catálogo ligero del Portfolio;
 * - generar el snapshot JSON horario.
 *
 * La identidad se gestiona en un Apps Script independiente.
 * =========================================================
 */

function doGet(e) {
  const parameters = e && e.parameter ? e.parameter : {};

  const callback = getValidCallback_(parameters.callback);

  try {
    const data = getAppData();

    return createJsonpResponse_(callback, data);
  } catch (error) {
    console.error("[RCS Portfolio] Error cargando datos.", error);

    return createJsonpResponse_(callback, {
      ok: false,

      code: "PORTFOLIO_ERROR",

      error: String(
        error && error.message ? error.message : error || "Error desconocido",
      ),

      generatedAt: new Date().toISOString(),
    });
  }
}

/*
 * =========================================================
 * EXPORT
 * =========================================================
 */

function exportPortfolioJson() {
  const data = getAppData();

  const json = JSON.stringify(data, null, 2);

  const folder = getOrCreateFolder_(EXPORT_FOLDER_NAME);

  const file = getOrCreateFile_(folder, EXPORT_FILE_NAME, json);

  file.setContent(json);

  Logger.log("JSON generado correctamente");

  Logger.log("Archivo: " + file.getName());

  Logger.log("URL: " + file.getUrl());
}

/*
 * =========================================================
 * DATA
 * =========================================================
 */

function getAppData() {
  const result = {
    generatedAt: new Date().toISOString(),
  };

  Object.entries(SHEETS).forEach(([key, sheetName]) => {
    const sheet =
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

    if (!sheet) {
      Logger.log(`No existe la pestaña: ${sheetName}`);

      result[key] = [];

      return;
    }

    result[key] = sheetToObjects_(sheet);
  });

  return result;
}

function sheetToObjects_(sheet) {
  const values = sheet.getDataRange().getValues();

  if (!values || values.length < 2) {
    return [];
  }

  const headers = values[0].map((header) => normalizeHeader_(header));

  return values
    .slice(1)
    .filter((row) => row.some((cell) => String(cell).trim() !== ""))
    .map((row) => {
      const obj = {};

      headers.forEach((header, index) => {
        if (!header) {
          return;
        }

        obj[header] = normalizeCellValue_(row[index]);
      });

      return obj;
    });
}

function normalizeHeader_(value) {
  return String(value || "").trim();
}

function normalizeCellValue_(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value === null || value === undefined) {
    return "";
  }

  return value;
}

/*
 * =========================================================
 * DRIVE SNAPSHOT
 * =========================================================
 */

function getOrCreateFolder_(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);

  if (folders.hasNext()) {
    return folders.next();
  }

  return DriveApp.createFolder(folderName);
}

function getOrCreateFile_(folder, fileName, content) {
  const files = folder.getFilesByName(fileName);

  if (files.hasNext()) {
    return files.next();
  }

  return folder.createFile(fileName, content, "application/json");
}

/*
 * =========================================================
 * HOURLY SNAPSHOT
 * =========================================================
 */

function createHourlyTrigger() {
  deleteExistingTriggers_("exportPortfolioJson");

  ScriptApp.newTrigger("exportPortfolioJson")
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log("Trigger horario creado");
}

function deleteExistingTriggers_(functionName) {
  ScriptApp.getProjectTriggers().forEach((trigger) => {
    if (trigger.getHandlerFunction() === functionName) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

/*
 * =========================================================
 * JSONP
 * =========================================================
 */

function getValidCallback_(requestedCallback) {
  const callback = String(requestedCallback || "callback").trim();

  return /^[A-Za-z_$][A-Za-z0-9_$.\[\]]*$/.test(callback)
    ? callback
    : "callback";
}

function createJsonpResponse_(callback, payload) {
  return ContentService.createTextOutput(
    `${callback}(${JSON.stringify(payload)});`,
  ).setMimeType(ContentService.MimeType.JAVASCRIPT);
}
