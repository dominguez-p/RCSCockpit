/**
 * AIxBanker · Descubrimiento automático de MSA a partir
 * de HTML de Jira.
 *
 * Depende de las funciones existentes en Code.gs.
 *
 * Instalación:
 * Ejecutar installJiraMsaAutoSync() una sola vez
 * desde el editor de Google Apps Script.
 */

const JIRA_AUTO_MSA_CONFIG = Object.freeze({
  intervalMinutes: 15,
  defaultCountry: "ES",
  pendingExportProperty: "JIRA_AUTO_MSA_PENDING_EXPORT",
});

/**
 * Instala un trigger cada 15 minutos.
 * Es idempotente: no duplica triggers.
 */
function installJiraMsaAutoSync() {
  const handler = "syncJiraMsaFromDrive";

  ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === handler)
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger(handler)
    .timeBased()
    .everyMinutes(JIRA_AUTO_MSA_CONFIG.intervalMinutes)
    .create();

  Logger.log("[JIRA AUTO] Trigger instalado: cada 15 minutos.");

  return syncJiraMsaFromDrive();
}

/**
 * Descubre nuevos HTML y actualiza solo los MSA
 * que hayan cambiado.
 */
function syncJiraMsaFromDrive() {
  const scriptLock = LockService.getScriptLock();

  if (!scriptLock.tryLock(1000)) {
    Logger.log("[JIRA AUTO] Omitido: otro proceso está ejecutándose.");
    return { skipped: true, reason: "script-lock" };
  }

  let documentLock = null;
  let documentLockHeld = false;

  try {
    documentLock = LockService.getDocumentLock();
    documentLockHeld = Boolean(documentLock && documentLock.tryLock(5000));

    if (!documentLockHeld) {
      Logger.log("[JIRA AUTO] Omitido: hoja ocupada.");
      return { skipped: true, reason: "document-lock" };
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    if (!spreadsheet) {
      throw new Error("No se ha encontrado la hoja vinculada.");
    }

    const roadmapSheet = spreadsheet.getSheetByName(SHEETS.roadmapItems);

    if (!roadmapSheet) {
      throw new Error('Falta la pestaña "roadmapItems".');
    }

    const historySheet = getJiraStatusHistorySheet_(spreadsheet);
    const historyHeaders = validateJiraStatusHistorySheet_(historySheet);

    const headers = roadmapSheet
      .getRange(1, 1, 1, roadmapSheet.getLastColumn())
      .getValues()[0]
      .map(normalizeHeader_);

    ["programId", "country", "id", "type", "jiraKey"].forEach((header) => {
      if (!headers.includes(header)) {
        throw new Error(`Falta la columna "${header}" en roadmapItems.`);
      }
    });

    if (
      !["product_id", "product", "productId"].some((key) =>
        headers.includes(key),
      )
    ) {
      throw new Error("Falta la columna de producto en roadmapItems.");
    }

    const currentRoadmap = sheetToObjects_(roadmapSheet);
    const currentHistory = sheetToObjects_(historySheet);

    const byKey = new Map();
    const existingIds = new Set();

    currentRoadmap.forEach((row) => {
      const key = textValue_(row.jiraKey).toUpperCase();

      if (key) {
        if (byKey.has(key)) {
          throw new Error(`jiraKey duplicada: ${key}`);
        }

        byKey.set(key, row);
      }

      if (textValue_(row.id)) {
        existingIds.add(textValue_(row.id).toUpperCase());
      }
    });

    const historyById = new Map();

    currentHistory.forEach((row) => {
      const id = textValue_(row.itemId);

      if (!id) return;

      if (!historyById.has(id)) {
        historyById.set(id, []);
      }

      historyById.get(id).push(row);
    });

    const filesByKey = jiraAutoFindHtmlFiles_();

    const prepared = [];
    const rejected = [];

    let unchanged = 0;

    for (const [jiraKey, file] of filesByKey) {
      try {
        let item = byKey.get(jiraKey) || null;

        if (item && textValue_(item.type).toLowerCase() !== "msa") {
          throw new Error(
            "La jiraKey ya existe asociada a un elemento que no es MSA.",
          );
        }

        if (!item && existingIds.has(jiraKey)) {
          throw new Error("Ya existe otro roadmapItem con este id.");
        }

        const previous = item ? historyById.get(textValue_(item.id)) || [] : [];

        const sourceUpdatedAt = file.getLastUpdated().toISOString();

        if (
          item &&
          previous.length &&
          previous.every(
            (row) =>
              textValue_(row.sourceFile) === file.getName() &&
              textValue_(row.sourceUpdatedAt) === sourceUpdatedAt,
          )
        ) {
          unchanged += 1;
          continue;
        }

        // No publicar históricos incompletos.
        const html = readJiraE2EHtml_(file);

        const parsed = parseJiraE2EHtml_(html, jiraKey);

        validateParsedJiraForPublication_(jiraKey, parsed);

        if (!item) {
          item = jiraAutoBuildRoadmapItem_(headers, file, jiraKey, parsed);
        }

        const rows = buildJiraStatusHistoryRows_(item, file, parsed);

        prepared.push({
          jiraKey,
          item,
          rows,
          isNew: !byKey.has(jiraKey),
        });
      } catch (error) {
        rejected.push({
          jiraKey,
          file: file.getName(),
          error: String(error.message || error),
        });
      }
    }

    const newItems = prepared
      .filter((entry) => entry.isNew)
      .map((entry) => entry.item);

    const processedIds = new Set(
      prepared.map((entry) => textValue_(entry.item.id)),
    );

    const newHistory = prepared.flatMap((entry) => entry.rows);

    const originalLastRow = roadmapSheet.getLastRow();

    const properties = PropertiesService.getScriptProperties();

    if (prepared.length) {
      properties.setProperty(JIRA_AUTO_MSA_CONFIG.pendingExportProperty, "1");

      try {
        if (newItems.length) {
          const lastNeededRow = originalLastRow + newItems.length;

          if (lastNeededRow > roadmapSheet.getMaxRows()) {
            roadmapSheet.insertRowsAfter(
              roadmapSheet.getMaxRows(),
              lastNeededRow - roadmapSheet.getMaxRows(),
            );
          }

          const values = newItems.map((item) =>
            headers.map((header) =>
              Object.prototype.hasOwnProperty.call(item, header)
                ? item[header]
                : "",
            ),
          );

          roadmapSheet
            .getRange(originalLastRow + 1, 1, values.length, headers.length)
            .setValues(values);
        }

        replaceJiraStatusHistoryRows_(
          historySheet,
          historyHeaders,
          processedIds,
          newHistory,
        );

        SpreadsheetApp.flush();
      } catch (error) {
        // El helper existente restaura el histórico
        // si falla su escritura.
        if (newItems.length) {
          roadmapSheet
            .getRange(originalLastRow + 1, 1, newItems.length, headers.length)
            .clearContent();

          SpreadsheetApp.flush();
        }

        throw error;
      }
    }

    // Reintenta una exportación pendiente si antes falló.
    const exportPending =
      properties.getProperty(JIRA_AUTO_MSA_CONFIG.pendingExportProperty) ===
      "1";

    if (exportPending) {
      exportPortfolioJson();

      properties.deleteProperty(JIRA_AUTO_MSA_CONFIG.pendingExportProperty);
    }

    const summary = {
      htmlDetected: filesByKey.size,
      created: newItems.length,
      updated: prepared.length - newItems.length,
      unchanged,
      rejected,
      historyRowsWritten: newHistory.length,
      snapshotExported: exportPending,
    };

    Logger.log("[JIRA AUTO] " + JSON.stringify(summary, null, 2));

    return summary;
  } finally {
    if (documentLockHeld) {
      documentLock.releaseLock();
    }

    scriptLock.releaseLock();
  }
}

/**
 * Busca HTML de Jira y conserva el archivo
 * más reciente por cada E2E.
 */
function jiraAutoFindHtmlFiles_() {
  const files = getJiraE2EFolder_().getFiles();
  const byKey = new Map();

  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName();

    if (!/\.html?$/i.test(name)) continue;

    const match = name.match(/^\s*\[?(E2E-\d+)\]?/i);

    if (!match) continue;

    const key = match[1].toUpperCase();
    const previous = byKey.get(key);

    if (
      !previous ||
      file.getLastUpdated().getTime() > previous.getLastUpdated().getTime()
    ) {
      byKey.set(key, file);
    }
  }

  return byKey;
}

/**
 * Construye un nuevo roadmapItem utilizando
 * las cabeceras reales de la hoja.
 */

function jiraAutoBuildRoadmapItem_(headers, file, jiraKey, parsed) {
  const original = file.getName();

  const cleanName = original
    .replace(/^\s*\[?E2E-\d+\]?\s*/i, "")
    .replace(/^\s*\[AI\s*[x×]\s*Banker\]\s*/i, "")
    .replace(/\s*-\s*BBVA\s*-\s*JIRA\.html?$/i, "")
    .replace(/\.html?$/i, "")
    .trim();

  const productId = /blue[\s-]*buddy/i.test(cleanName)
    ? "blue-buddy"
    : /panorama/i.test(cleanName)
      ? "panorama"
      : "";

  if (!productId) {
    throw new Error("No se reconoce el producto en el nombre del HTML.");
  }

  const country = /(?:^|[\s\[\]()_-])(?:MX|M[eé]xico)(?=$|[\s\[\]()_-])/i.test(
    cleanName,
  )
    ? "MX"
    : JIRA_AUTO_MSA_CONFIG.defaultCountry;

  const values = {
    programId: "aixbanker",
    country,
    product_id: productId,
    product: productId,
    productId,
    id: jiraKey,
    jiraKey,
    jiraUrl: jiraAutoJiraIssueUrl_(jiraKey),
    type: "msa",
    initiative: cleanName || jiraKey,
    name: cleanName || jiraKey,
    title: cleanName || jiraKey,
    status: "pending",
    startDate: parsed.createdAt,
  };

  const result = {};

  headers.forEach((header) => {
    result[header] = Object.prototype.hasOwnProperty.call(values, header)
      ? values[header]
      : "";
  });

  return result;
}

/**
 * Genera la URL oficial de Jira a partir de jiraKey.
 */
function jiraAutoJiraIssueUrl_(jiraKey) {
  const key = String(jiraKey || "")
    .trim()
    .toUpperCase();

  if (!/^E2E-\d+$/.test(key)) {
    return "";
  }

  return (
    "https://jira.globaldevtools.bbva.com/browse/" + encodeURIComponent(key)
  );
}

/**
 * Completa las jiraUrl vacías de los MSA existentes.
 *
 * - No modifica enlaces ya informados.
 * - No modifica otros tipos de roadmapItem.
 * - Regenera el snapshot para publicar los enlaces.
 *
 * Ejecutar una vez desde Google Apps Script.
 */
function backfillJiraMsaUrls() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error("No se ha encontrado la Spreadsheet.");
  }

  const lock = LockService.getDocumentLock();

  if (!lock || !lock.tryLock(5000)) {
    throw new Error("Hay otra actualización en curso. Inténtalo de nuevo.");
  }

  let updated = 0;
  let alreadyConfigured = 0;
  let skipped = 0;

  try {
    const sheet = spreadsheet.getSheetByName(SHEETS.roadmapItems);

    if (!sheet) {
      throw new Error('No existe la pestaña "roadmapItems".');
    }

    const values = sheet.getDataRange().getValues();

    if (values.length < 1) {
      throw new Error("La pestaña roadmapItems no tiene cabeceras.");
    }

    const headers = values[0].map(normalizeHeader_);

    const typeColumn = headers.indexOf("type");
    const jiraKeyColumn = headers.indexOf("jiraKey");
    const jiraUrlColumn = headers.indexOf("jiraUrl");

    const missing = [];

    if (typeColumn < 0) missing.push("type");
    if (jiraKeyColumn < 0) missing.push("jiraKey");
    if (jiraUrlColumn < 0) missing.push("jiraUrl");

    if (missing.length) {
      throw new Error("Faltan columnas en roadmapItems: " + missing.join(", "));
    }

    for (let index = 1; index < values.length; index++) {
      const row = values[index];

      const type = String(row[typeColumn] || "")
        .trim()
        .toLowerCase();

      if (type !== "msa") {
        continue;
      }

      const jiraKey = String(row[jiraKeyColumn] || "").trim();

      const jiraUrl = String(row[jiraUrlColumn] || "").trim();

      if (jiraUrl) {
        alreadyConfigured++;
        continue;
      }

      const generatedUrl = jiraAutoJiraIssueUrl_(jiraKey);

      if (!generatedUrl) {
        skipped++;
        continue;
      }

      sheet.getRange(index + 1, jiraUrlColumn + 1).setValue(generatedUrl);

      updated++;
    }

    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  // Publicamos los cambios en el JSON del Cockpit.
  // Se ejecuta también si no se han encontrado cambios,
  // para poder reintentar una exportación anterior fallida.
  const exportResult = exportPortfolioJson();

  const summary = {
    updated,
    alreadyConfigured,
    skipped,
    snapshotExported: true,
    generatedAt: exportResult.generatedAt,
  };

  Logger.log("[JIRA URL BACKFILL] " + JSON.stringify(summary, null, 2));

  return summary;
}
