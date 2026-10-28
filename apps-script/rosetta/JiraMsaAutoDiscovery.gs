/**
 * ROSETTA · MSA JIRA HTML AUTO DISCOVERY
 *
 * Instalar junto a JiraWorkspaceFeatures.gs,
 * en el MISMO proyecto Apps Script.
 *
 * Ejecutar installRosettaMsaAutoDiscovery()
 * una sola vez.
 */

const ROSETTA_MSA_AUTO_ = Object.freeze({
  everyMinutes: 15,
  snapshotPendingProperty: "ROSETTA_MSA_SNAPSHOT_PENDING",
  roadmapSheet: "roadmapItems",
  historySheet: "roadmapItemStatusHistory",

  roadmapHeaders: [
    "programId",
    "country",
    "product_id",
    "product",
    "productId",
    "id",
    "type",
    "initiative",
    "name",
    "title",
    "status",
    "jiraCurrentStatus",
    "startDate",
    "endDate",
    "jiraKey",
    "jiraUrl",
  ],

  historyHeaders: [
    "itemId",
    "jiraKey",
    "sequence",
    "status",
    "statusRaw",
    "startAt",
    "endAt",
    "sourceFile",
    "sourceUpdatedAt",
  ],
});

/**
 * Instala la sincronización periódica.
 */
function installRosettaMsaAutoDiscovery() {
  const handler = "syncRosettaMsaFromDrive";

  ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === handler)
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger(handler)
    .timeBased()
    .everyMinutes(ROSETTA_MSA_AUTO_.everyMinutes)
    .create();

  return syncRosettaMsaFromDrive();
}

/**
 * Descubre MSA nuevos, actualiza existentes
 * y solicita la publicación del snapshot.
 */
function syncRosettaMsaFromDrive() {
  const lock = LockService.getDocumentLock() || LockService.getScriptLock();

  if (!lock.tryLock(5000)) {
    return { skipped: "locked" };
  }

  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    if (!spreadsheet) {
      throw new Error(
        "Ejecuta este script vinculado a la Spreadsheet de Rosetta.",
      );
    }

    const roadmap = rosettaMsaSheet_(
      spreadsheet,
      ROSETTA_MSA_AUTO_.roadmapSheet,
      ROSETTA_MSA_AUTO_.roadmapHeaders,
    );

    const history = rosettaMsaSheet_(
      spreadsheet,
      ROSETTA_MSA_AUTO_.historySheet,
      ROSETTA_MSA_AUTO_.historyHeaders,
    );

    const currentItems = rosettaMsaRead_(roadmap);
    const currentHistory = rosettaMsaRead_(history);

    const byKey = new Map();

    currentItems.forEach((item) => {
      const key = String(item.jiraKey || "")
        .trim()
        .toUpperCase();

      if (key && String(item.type || "").toLowerCase() === "msa") {
        if (byKey.has(key)) {
          throw new Error("MSA duplicado en roadmapItems: " + key);
        }

        byKey.set(key, item);
      }
    });

    const features = spreadsheet.getSheetByName("jiraWorkspaceFeatures");

    const relationships = rosettaMsaRelationships_(
      features ? rosettaMsaRead_(features) : [],
    );

    const files = rosettaMsaLatestHtml_();

    const changes = [];
    const errors = [];

    let unchanged = 0;

    for (const [key, file] of files.entries()) {
      try {
        const existing = byKey.get(key);

        const product =
          rosettaMsaProduct_(key, file.getName(), relationships) ||
          (existing ? rosettaMsaProductValue_(existing) : "");

        if (!product) {
          throw new Error(
            "Producto no identificado sin ambigüedad; " +
              "comprobar ID Analysis o nombre del HTML.",
          );
        }

        if (existing && rosettaMsaProductValue_(existing) !== product) {
          throw new Error(
            "Producto existente distinto: " +
              rosettaMsaProductValue_(existing) +
              " / " +
              product,
          );
        }

        const updatedAt = file.getLastUpdated().toISOString();

        const previous = existing
          ? currentHistory.filter(
              (row) => String(row.itemId) === String(existing.id),
            )
          : [];

        const same =
          existing &&
          previous.length &&
          previous.every(
            (row) =>
              String(row.sourceFile) === file.getName() &&
              String(row.sourceUpdatedAt) === updatedAt,
          );

        if (same) {
          unchanged++;
          continue;
        }

        const parsed = rosettaMsaParse_(file, key);

        const country = rosettaMsaCountry_(key, relationships, existing);

        const title = rosettaMsaTitle_(file.getName(), key);

        const last = parsed.intervals[parsed.intervals.length - 1];

        const closingAt = /^closed$/i.test(parsed.currentStatus)
          ? last.startAt
          : "";

        const jiraUrl =
          "https://jira.globaldevtools.bbva.com/browse/" +
          encodeURIComponent(key);

        const item = {
          ...(existing || {}),

          programId: "rosetta",
          country,

          product_id: product,
          product,
          productId: product,

          id: existing?.id || key,
          type: "msa",

          initiative: existing?.initiative || title,
          name: existing?.name || title,
          title: existing?.title || title,

          status: parsed.currentStatus,
          jiraCurrentStatus: parsed.currentStatus,

          startDate: parsed.createdAt,
          endDate: closingAt,

          jiraKey: key,
          jiraUrl,
        };

        const rows = parsed.intervals.map((interval) => ({
          itemId: item.id,
          jiraKey: key,

          sequence: interval.sequence,
          status: interval.status,
          statusRaw: interval.statusRaw,

          startAt: interval.startAt,
          endAt: interval.endAt,

          sourceFile: file.getName(),
          sourceUpdatedAt: updatedAt,
        }));

        changes.push({
          key,
          item,
          rows,
          isNew: !existing,
        });
      } catch (error) {
        errors.push({
          jiraKey: key,
          file: file.getName(),
          error: String(error.message || error),
        });
      }
    }

    const properties = PropertiesService.getScriptProperties();

    if (changes.length) {
      properties.setProperty(ROSETTA_MSA_AUTO_.snapshotPendingProperty, "1");

      const processed = new Set(
        changes.map((change) => String(change.item.id)),
      );

      const historyRows = currentHistory.filter(
        (row) => !processed.has(String(row.itemId)),
      );

      changes.forEach((change) => historyRows.push(...change.rows));

      historyRows.sort(
        (a, b) =>
          String(a.itemId).localeCompare(String(b.itemId)) ||
          Number(a.sequence) - Number(b.sequence),
      );

      const appendStart = roadmap.getLastRow() + 1;

      const newItems = changes
        .filter((change) => change.isNew)
        .map((change) => change.item);

      const existingChanges = changes.filter((change) => !change.isNew);

      const backups = [];

      try {
        rosettaMsaAppend_(roadmap, newItems);

        rosettaMsaUpdateExisting_(roadmap, existingChanges, backups);

        rosettaMsaWrite_(history, historyRows);
      } catch (error) {
        backups
          .reverse()
          .forEach(({ cell, oldValue }) => cell.setValue(oldValue));

        if (newItems.length) {
          roadmap
            .getRange(appendStart, 1, newItems.length, roadmap.getLastColumn())
            .clearContent();
        }

        rosettaMsaWrite_(history, currentHistory);

        SpreadsheetApp.flush();

        throw error;
      }
    }

    let snapshotPublished = false;
    let snapshotError = "";

    if (
      properties.getProperty(ROSETTA_MSA_AUTO_.snapshotPendingProperty) === "1"
    ) {
      try {
        if (typeof exportPortfolioJson !== "function") {
          throw new Error(
            "No existe exportPortfolioJson() en este Apps Script. " +
              "Hay que conectar el exportador real de Rosetta.",
          );
        }

        exportPortfolioJson();

        properties.deleteProperty(ROSETTA_MSA_AUTO_.snapshotPendingProperty);

        snapshotPublished = true;
      } catch (error) {
        snapshotError = String(error.message || error);

        Logger.log("[ROSETTA MSA] Exportación pendiente: " + snapshotError);
      }
    }

    const summary = {
      htmlDetected: files.size,

      created: changes.filter((item) => item.isNew).length,

      updated: changes.filter((item) => !item.isNew).length,

      unchanged,
      errors,

      snapshotPublished,
      snapshotError,
    };

    Logger.log("[ROSETTA MSA] " + JSON.stringify(summary, null, 2));

    return summary;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Obtiene o crea las hojas necesarias.
 */
function rosettaMsaSheet_(spreadsheet, name, minimumHeaders) {
  const sheet =
    spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);

  const current = sheet.getLastColumn()
    ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String)
    : [];

  const headers = current.some(Boolean) ? [...current] : [];

  minimumHeaders.forEach((header) => {
    if (!headers.includes(header)) {
      headers.push(header);
    }
  });

  if (headers.length > sheet.getMaxColumns()) {
    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      headers.length - sheet.getMaxColumns(),
    );
  }

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  sheet.setFrozenRows(1);

  return sheet;
}

/**
 * Lee una hoja como objetos.
 */
function rosettaMsaRead_(sheet) {
  const nr = sheet.getLastRow();

  if (nr < 2) {
    return [];
  }

  const values = sheet.getRange(1, 1, nr, sheet.getLastColumn()).getValues();

  const headers = values.shift().map(String);

  return values.flatMap((row, index) => {
    if (!row.some((cell) => cell !== "" && cell !== null)) {
      return [];
    }

    const item = {
      __rowNumber: index + 2,
    };

    headers.forEach((header, i) => {
      if (header) {
        item[header] = row[i];
      }
    });

    return [item];
  });
}

/**
 * Añade nuevos MSA sin reescribir
 * los elementos existentes.
 */
function rosettaMsaAppend_(sheet, objects) {
  if (!objects.length) {
    return;
  }

  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(String);

  const position = sheet.getLastRow() + 1;

  const required = position + objects.length - 1;

  if (required > sheet.getMaxRows()) {
    sheet.insertRowsAfter(sheet.getMaxRows(), required - sheet.getMaxRows());
  }

  const rows = objects.map((item) =>
    headers.map((header) => item[header] ?? ""),
  );

  sheet.getRange(position, 1, rows.length, headers.length).setValues(rows);
}

/**
 * Actualiza solo campos Jira en MSA existentes.
 */
function rosettaMsaUpdateExisting_(sheet, changes, backups) {
  if (!changes.length) {
    return;
  }

  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(String);

  const managed = [
    "status",
    "jiraCurrentStatus",
    "jiraUrl",
    "startDate",
    "endDate",
  ];

  changes.forEach((change) => {
    const row = Number(change.item.__rowNumber);

    if (!row || row < 2) {
      throw new Error("MSA sin fila existente: " + change.key);
    }

    managed.forEach((header) => {
      const column = headers.indexOf(header) + 1;

      if (!column) {
        return;
      }

      const cell = sheet.getRange(row, column);

      backups.push({
        cell,
        oldValue: cell.getValue(),
      });

      cell.setValue(change.item[header] ?? "");
    });
  });
}

/**
 * Sustituye las filas de histórico conservando
 * las de otros MSA.
 */
function rosettaMsaWrite_(sheet, objects) {
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(String);

  const oldCount = sheet.getLastRow() - 1;

  const rows = objects.map((item) =>
    headers.map((header) => item[header] ?? ""),
  );

  const required = rows.length + 1;

  if (required > sheet.getMaxRows()) {
    sheet.insertRowsAfter(sheet.getMaxRows(), required - sheet.getMaxRows());
  }

  if (oldCount > 0) {
    sheet.getRange(2, 1, oldCount, headers.length).clearContent();
  }

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  SpreadsheetApp.flush();
}

/**
 * Relaciona cada MSA con sus Features
 * mediante ID Analysis.
 */
function rosettaMsaRelationships_(features) {
  const result = new Map();

  features.forEach((feature) => {
    if (
      String(feature.programId || "rosetta")
        .trim()
        .toLowerCase() !== "rosetta"
    ) {
      return;
    }

    const product = rosettaMsaProductValue_(feature);

    if (!["nbc1", "nbc2", "nbc3"].includes(product)) {
      return;
    }

    const keys =
      String(feature.analysisId || "")
        .toUpperCase()
        .match(/\bE2E-\d+\b/g) || [];

    keys.forEach((key) => {
      if (!result.has(key)) {
        result.set(key, {
          products: new Set(),
          countries: new Set(),
        });
      }

      result.get(key).products.add(product);

      const countries =
        String(feature.country || "")
          .toUpperCase()
          .match(/\b(?:ES|MX|PE|CO|TR|HL)\b/g) || [];

      countries.forEach((country) => result.get(key).countries.add(country));
    });
  });

  return result;
}

function rosettaMsaProductValue_(row) {
  return String(row.product_id || row.product || row.productId || "")
    .trim()
    .toLowerCase();
}

/**
 * Determina el producto del MSA.
 */
function rosettaMsaProduct_(key, fileName, relationships) {
  const mapped = relationships.get(key)?.products || new Set();

  if (mapped.size === 1) {
    return [...mapped][0];
  }

  if (mapped.size > 1) {
    return "";
  }

  const normalized = String(fileName)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  if (/\bAI\s*FILTER\b|\bFILTRAD[OA]\b|\bENRUTAD[OA]\b/.test(normalized)) {
    return "nbc1";
  }

  if (/\bAI\s*PROACTIVE\b|\bASISTENCIA\s+PROACTIVA\b/.test(normalized)) {
    return "nbc3";
  }

  if (/\bFORESIGHT\b/.test(normalized)) {
    return "nbc2";
  }

  return "";
}

/**
 * Asigna países a partir de las Features.
 * Si no existe información, usa Holding.
 */
function rosettaMsaCountry_(key, relationships, existing) {
  const values = [...(relationships.get(key)?.countries || [])].filter(
    (code) => code !== "HL",
  );

  const unique = [...new Set(values)].sort();

  return unique.length ? unique.join(" | ") : String(existing?.country || "HL");
}

/**
 * Detecta los últimos HTML por clave E2E.
 */
function rosettaMsaLatestHtml_() {
  if (typeof rosettaJiraGetFolder_ !== "function") {
    throw new Error(
      "Falta rosettaJiraGetFolder_(): " + "incluye JiraWorkspaceFeatures.gs.",
    );
  }

  const iterator = rosettaJiraGetFolder_().getFiles();

  const files = new Map();

  while (iterator.hasNext()) {
    const file = iterator.next();

    if (!/\.html?$/i.test(file.getName())) {
      continue;
    }

    const key = file
      .getName()
      .match(/^\s*\[?(E2E-\d+)\]?/i)?.[1]
      ?.toUpperCase();

    if (!key) {
      continue;
    }

    if (
      !files.has(key) ||
      file.getLastUpdated().getTime() >
        files.get(key).getLastUpdated().getTime()
    ) {
      files.set(key, file);
    }
  }

  return files;
}

/**
 * Obtiene el nombre funcional del HTML.
 */
function rosettaMsaTitle_(name, key) {
  return (
    String(name)
      .replace(new RegExp("^\\s*\\[?" + key + "\\]?\\s*", "i"), "")
      .replace(/\s*-\s*BBVA\s*-\s*JIRA\.html?$/i, "")
      .replace(/\.html?$/i, "")
      .trim() || key
  );
}

/**
 * Convierte HTML en texto.
 */
function rosettaMsaText_(html) {
  return String(html || "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normaliza estados de Jira.
 */
function rosettaMsaNormalizeStatus_(value) {
  const raw = rosettaMsaText_(value);

  const key = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .toLowerCase();

  const aliases = {
    "pre work": "Pre-Work",
    "analysis to do": "Analysis To Do",
    "analysis in progress": "Analysis In Progress",
    "analysis in review": "Analysis In Review",
    blocked: "Blocked",
    closed: "Closed",
  };

  return aliases[key] || raw;
}

/**
 * Extrae los valores Original y New.
 */
function rosettaMsaCell_(row, className, label) {
  const re = new RegExp(
    "<td\\b[^>]*class=[\"\\'][^\"\\']*\\b" +
      className +
      "\\b[^\"\\']*[\"\\'][^>]*>[\\s\\S]*?" +
      "<b>\\s*" +
      label +
      ":\\s*<\\/b>([\\s\\S]*?)" +
      "(?:<span\\b[^>]*class=[\"\\'][^\"\\']*" +
      "\\bhist-value\\b[^\"\\']*[\"\\'][^>]*>|<\\/td>)",
    "i",
  );

  return rosettaMsaText_((String(row).match(re) || [])[1] || "");
}

/**
 * Extrae transiciones del campo Status.
 */
function rosettaMsaTransitions_(html) {
  const blockRe =
    /<div\b(?=[^>]*\bclass=["'][^"']*\bissue-data-block\b[^"']*["'])(?=[^>]*\bid=["']changehistory-[^"']+["'])[^>]*>/gi;

  const offsets = [...html.matchAll(blockRe)].map((m) => m.index);

  const events = [];

  offsets.forEach((start, index) => {
    const block = html.slice(start, offsets[index + 1] ?? html.length);

    const at = (block.match(/<time\b[^>]*datetime=["']([^"']+)["'][^>]*>/i) ||
      [])[1];

    if (!at) {
      return;
    }

    (block.match(/<tr\b[\s\S]*?<\/tr>/gi) || []).forEach((row) => {
      const name = row.match(
        /<td\b[^>]*class=["'][^"']*\bactivity-name\b[^"']*["'][^>]*>([\s\S]*?)<\/td>/i,
      );

      if (!name || rosettaMsaText_(name[1]) !== "Status") {
        return;
      }

      const oldRaw = rosettaMsaCell_(row, "activity-old-val", "Original");

      const newRaw = rosettaMsaCell_(row, "activity-new-val", "New");

      if (!oldRaw || !newRaw) {
        return;
      }

      if (
        rosettaMsaNormalizeStatus_(oldRaw) !==
        rosettaMsaNormalizeStatus_(newRaw)
      ) {
        events.push({
          at,
          oldRaw,
          newRaw,
        });
      }
    });
  });

  events.sort(
    (a, b) =>
      Date.parse(a.at.replace(/([+-]\d{2})(\d{2})$/, "$1:$2")) -
      Date.parse(b.at.replace(/([+-]\d{2})(\d{2})$/, "$1:$2")),
  );

  return events;
}

/**
 * Analiza un HTML de MSA y reconstruye
 * sus intervalos de estado.
 */
function rosettaMsaParse_(file, key) {
  const html = file.getBlob().getDataAsString("UTF-8");

  if (!/<html\b|<!doctype\s+html/i.test(html.slice(0, 5000))) {
    throw new Error("El archivo no contiene HTML válido.");
  }

  if (!html.toUpperCase().includes(key)) {
    throw new Error("El HTML no contiene la clave " + key);
  }

  const createdAt =
    (html.match(
      /id=["']created-val["'][\s\S]*?<time\b[^>]*datetime=["']([^"']+)["']/i,
    ) || [])[1] || "";

  const statusMatch = html.match(
    /id=["']status-val["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
  );

  const currentStatus = rosettaMsaNormalizeStatus_(
    statusMatch?.[1] ||
      (html.match(/\bdata-issue-status=["']([^"']+)["']/i) || [])[1],
  );

  if (!createdAt || !currentStatus) {
    throw new Error("Faltan fecha de creación o estado actual.");
  }

  if (
    /Load more older history items|data-fetch-mode=["']older["']/i.test(html)
  ) {
    throw new Error(
      "Histórico incompleto: desplegar todo " +
        "el historial de Jira antes de descargar.",
    );
  }

  const transitions = rosettaMsaTransitions_(html);

  const intervals = [];

  let since = createdAt;

  let rawStatus = transitions.length ? transitions[0].oldRaw : currentStatus;

  transitions.forEach((change) => {
    intervals.push({
      sequence: intervals.length + 1,

      status: rosettaMsaNormalizeStatus_(rawStatus),

      statusRaw: rawStatus,
      startAt: since,
      endAt: change.at,
    });

    since = change.at;
    rawStatus = change.newRaw;
  });

  intervals.push({
    sequence: intervals.length + 1,

    status: rosettaMsaNormalizeStatus_(rawStatus),

    statusRaw: rawStatus,
    startAt: since,
    endAt: "",
  });

  if (rosettaMsaNormalizeStatus_(rawStatus) !== currentStatus) {
    throw new Error(
      "El último estado del historial " + "no coincide con el actual.",
    );
  }

  return {
    createdAt,
    currentStatus,
    intervals,
  };
}
