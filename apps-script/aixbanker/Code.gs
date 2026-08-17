const EXPORT_FOLDER_NAME = "PortfolioPDB";
const EXPORT_FILE_NAME = "app-common-data.json";

const PRODUCT_CATALOG_SHEET_NAME = "productCatalog";
const PRODUCT_FEATURES_SHEET_NAME = "productFeatures";

const PRODUCT_FEATURES_HEADERS = {
  documentUrl: "Link documento funcional del proyecto",
  extractedText: "Texto extraido",

  aiColumns: [
    "Gemini - Project overview",
    "Gemini - Bullets funcionales",
    "Gemini - Bullets experiencia",
    "Gemini - Requerimientos funcionales",
    "Gemini - Requerimientos no funcionales",
  ],
};

const SHEETS = {
  modules: "modules",
  roles: "roles",
  priorities: "priorities",

  functional: "functional_map",
  systems: "systems_inventory",

  functionalSystemLinks: "functional_system_links",

  architectureFeaturesGaps: "architecture_features_gaps",

  systemRelationships: "system_relationships",

  impediments: "impediments",

  decisionsPending: "decisions_pending",

  decisionsDone: "decisions_done",

  systemsToBe: "systems_inventory_tobe",

  systemRelationshipsToBe: "system_relationships_tobe",

  // Modelo unificado
  roadmapItems: "roadmapItems",

  roadmapItemActivities: "roadmapItemActivities",

  // Modelo legado
  projects: "projects",

  projectPhases: "project_phases",

  msas: "msas",

  msaPhases: "msa_phases",

  teams: "teams",
};

/* =========================================================
 * MENÚ DE SPREADSHEET
 * ========================================================= */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("AIxBanker")
    .addItem("Actualizar datos de producto", "refreshProductData")
    .addToUi();
}

/* =========================================================
 * ACTUALIZACIÓN MANUAL DE PRODUCTO
 *
 * Esta función:
 *
 * - SOLO se ejecuta manualmente.
 * - NO se llama desde getAppData().
 * - NO se llama desde doGet().
 * - NO forma parte de la carga del cockpit.
 * ========================================================= */

function refreshProductData() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  const lock = LockService.getDocumentLock();

  /*
   * Evitamos dos actualizaciones simultáneas.
   */
  if (!lock.tryLock(1000)) {
    spreadsheet.toast(
      "Ya hay una actualización de producto en curso.",
      "AIxBanker",
      6,
    );

    return;
  }

  try {
    spreadsheet.toast("Revisando los DOR de producto...", "AIxBanker", 5);

    const sheet = spreadsheet.getSheetByName(PRODUCT_FEATURES_SHEET_NAME);

    if (!sheet) {
      throw new Error(`No existe la pestaña "${PRODUCT_FEATURES_SHEET_NAME}".`);
    }

    const summary = refreshProductFeaturesFromDocuments_(sheet);

    SpreadsheetApp.flush();

    spreadsheet.toast(
      [
        `DOR revisados: ${summary.documentsChecked}`,
        `Actualizados: ${summary.documentsUpdated}`,
        `Sin cambios: ${summary.documentsUnchanged}`,
        `Fórmulas añadidas: ${summary.formulasAdded}`,
      ].join(" · "),
      "Datos de producto actualizados",
      10,
    );

    Logger.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    const message = error && error.message ? error.message : String(error);

    spreadsheet.toast(message, "Error actualizando producto", 10);

    console.error(error);

    throw error;
  } finally {
    lock.releaseLock();
  }
}

/* =========================================================
 * MOTOR DE ACTUALIZACIÓN DE PRODUCT FEATURES
 * ========================================================= */

function refreshProductFeaturesFromDocuments_(sheet) {
  const lastRow = sheet.getLastRow();

  const lastColumn = sheet.getLastColumn();

  if (lastRow < 2 || lastColumn < 1) {
    return {
      documentsChecked: 0,
      documentsUpdated: 0,
      documentsUnchanged: 0,
      formulasAdded: 0,
    };
  }

  /*
   * Leemos toda la pestaña una sola vez.
   */
  const values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();

  const headers = values[0].map(normalizeHeader_);

  const headerMap = buildHeaderIndexMap_(headers);

  const documentUrlColumn = requireHeaderColumn_(
    headerMap,
    PRODUCT_FEATURES_HEADERS.documentUrl,
  );

  const extractedTextColumn = requireHeaderColumn_(
    headerMap,
    PRODUCT_FEATURES_HEADERS.extractedText,
  );

  /*
   * Comprobamos también que existan
   * todas las columnas Gemini.
   */
  PRODUCT_FEATURES_HEADERS.aiColumns.forEach((header) => {
    requireHeaderColumn_(headerMap, header);
  });

  const pendingChanges = [];
  const failures = [];

  let documentsChecked = 0;
  let documentsUnchanged = 0;

  /*
   * =======================================================
   * FASE 1
   *
   * Leemos todos los DOR pero todavía
   * NO escribimos nada en Sheets.
   *
   * Esto evita actualizaciones parciales.
   * =======================================================
   */

  values.slice(1).forEach((row, index) => {
    const sheetRow = index + 2;

    const url = textValue_(row[documentUrlColumn - 1]);

    /*
     * Las filas sin DOR simplemente
     * se ignoran.
     */
    if (!url) {
      return;
    }

    documentsChecked += 1;

    try {
      const extractedText = extractTextFromDriveUrl_(url);

      const currentText = row[extractedTextColumn - 1];

      /*
       * Para comparar no usamos el texto
       * literalmente.
       *
       * Google Docs y Google Sheets pueden
       * representar espacios, saltos de línea
       * o caracteres invisibles de forma
       * ligeramente diferente.
       *
       * Eso era lo que provocaba que los
       * 4 DOR apareciesen modificados
       * en cada ejecución.
       */
      const extractedComparable = normalizeTextForComparison_(extractedText);

      const currentComparable = normalizeTextForComparison_(currentText);

      if (extractedComparable === currentComparable) {
        documentsUnchanged += 1;

        return;
      }

      pendingChanges.push({
        row: sheetRow,

        value: normalizeTextForStorage_(extractedText),
      });
    } catch (error) {
      failures.push({
        row: sheetRow,

        message: error && error.message ? error.message : String(error),
      });
    }
  });

  /*
   * =======================================================
   * PUBLICACIÓN ATÓMICA
   *
   * Si cualquier DOR falla:
   *
   * - no escribimos ninguno;
   * - mantenemos el último estado válido.
   * =======================================================
   */

  if (failures.length > 0) {
    const detail = failures
      .map((failure) => `Fila ${failure.row}: ${failure.message}`)
      .join("\n");

    throw new Error(
      "No se ha escrito ningún cambio porque " +
        "hay DOR que no se han podido procesar:\n\n" +
        detail,
    );
  }

  /*
   * =======================================================
   * FASE 2
   *
   * Solo escribimos los DOR cuyo contenido
   * realmente haya cambiado.
   * =======================================================
   */

  pendingChanges.forEach((change) => {
    sheet.getRange(change.row, extractedTextColumn).setValue(change.value);
  });

  /*
   * =======================================================
   * NUEVAS FILAS
   *
   * Si se ha añadido una fila con DOR pero
   * las columnas Gemini están vacías,
   * copiamos las fórmulas desde una fila
   * existente.
   * =======================================================
   */

  const formulasAdded = ensureProductAiFormulas_(sheet, headerMap);

  return {
    documentsChecked: documentsChecked,

    documentsUpdated: pendingChanges.length,

    documentsUnchanged: documentsUnchanged,

    formulasAdded: formulasAdded,
  };
}

/* =========================================================
 * FÓRMULAS GEMINI PARA NUEVAS FILAS
 * ========================================================= */

function ensureProductAiFormulas_(sheet, headerMap) {
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return 0;
  }

  const documentUrlColumn = requireHeaderColumn_(
    headerMap,
    PRODUCT_FEATURES_HEADERS.documentUrl,
  );

  let formulasAdded = 0;

  PRODUCT_FEATURES_HEADERS.aiColumns.forEach((header) => {
    const column = requireHeaderColumn_(headerMap, header);

    const range = sheet.getRange(2, column, lastRow - 1, 1);

    const formulas = range.getFormulas();

    /*
     * Buscamos una fila que ya tenga
     * fórmula para utilizarla como plantilla.
     */
    let templateIndex = -1;

    for (let index = 0; index < formulas.length; index += 1) {
      if (textValue_(formulas[index][0])) {
        templateIndex = index;

        break;
      }
    }

    /*
     * Si la columna no tiene ninguna fórmula,
     * no hacemos nada.
     */
    if (templateIndex < 0) {
      return;
    }

    const templateRange = sheet.getRange(templateIndex + 2, column);

    for (let index = 0; index < formulas.length; index += 1) {
      /*
       * Ya existe fórmula.
       */
      if (textValue_(formulas[index][0])) {
        continue;
      }

      const targetRow = index + 2;

      /*
       * Solo añadimos fórmula si la fila
       * tiene realmente un DOR.
       */
      const documentUrl = textValue_(
        sheet.getRange(targetRow, documentUrlColumn).getValue(),
      );

      if (!documentUrl) {
        continue;
      }

      templateRange.copyTo(
        sheet.getRange(targetRow, column),
        SpreadsheetApp.CopyPasteType.PASTE_FORMULA,
        false,
      );

      formulasAdded += 1;
    }
  });

  return formulasAdded;
}

/* =========================================================
 * HEADERS
 * ========================================================= */

function buildHeaderIndexMap_(headers) {
  const map = {};

  headers.forEach((header, index) => {
    if (!header) {
      return;
    }

    map[header] = index + 1;
  });

  return map;
}

function requireHeaderColumn_(headerMap, headerName) {
  const column = headerMap[headerName];

  if (!column) {
    throw new Error(
      `Falta la columna obligatoria "${headerName}" ` +
        `en "${PRODUCT_FEATURES_SHEET_NAME}".`,
    );
  }

  return column;
}

/* =========================================================
 * NORMALIZACIÓN DE TEXTO
 * ========================================================= */

/*
 * Normalización SOLO para comparar.
 *
 * Ignoramos diferencias de:
 *
 * - espacios;
 * - saltos de línea;
 * - NBSP;
 * - caracteres de control;
 * - normalización Unicode.
 *
 * De esta forma un cambio puramente de
 * representación no provoca una actualización.
 */
function normalizeTextForComparison_(value) {
  return String(value || "")
    .normalize("NFC")
    .replace(/\u00A0/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/*
 * Normalización para almacenar el DOR
 * manteniendo los saltos de línea.
 */
function normalizeTextForStorage_(value) {
  return String(value || "")
    .normalize("NFC")
    .replace(/\u00A0/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

/* =========================================================
 * EXTRACCIÓN DE DOR
 * ========================================================= */

function extractTextFromDriveUrl_(url) {
  const fileId = getDriveFileIdFromUrl_(url);

  if (!fileId) {
    throw new Error("No se encontró un ID válido en el enlace del DOR.");
  }

  const file = DriveApp.getFileById(fileId);

  const mimeType = file.getMimeType();

  /*
   * Google Docs:
   * lectura directa.
   */
  if (mimeType === MimeType.GOOGLE_DOCS) {
    return DocumentApp.openById(fileId).getBody().getText();
  }

  /*
   * PDF / imagen / otros:
   * mantenemos la capacidad OCR
   * del script original de Alex.
   */
  return applyOcr_(file);
}

function getDriveFileIdFromUrl_(url) {
  const match = String(url || "").match(/[-\w]{25,}/);

  return match ? match[0] : null;
}

/* =========================================================
 * OCR
 *
 * Requiere el servicio avanzado Drive API
 * si se utilizan documentos que no sean
 * Google Docs.
 * ========================================================= */

function applyOcr_(file) {
  const blob = file.getBlob();

  const resource = {
    name: file.getName() + " (Temporal OCR)",

    mimeType: "application/vnd.google-apps.document",
  };

  const temporaryDocument = Drive.Files.create(resource, blob);

  try {
    return DocumentApp.openById(temporaryDocument.id).getBody().getText();
  } finally {
    DriveApp.getFileById(temporaryDocument.id).setTrashed(true);
  }
}

/* =========================================================
 * EXPORT JSON
 * ========================================================= */

function exportPortfolioJson() {
  const data = getAppData();

  const json = JSON.stringify(data, null, 2);

  const folder = getOrCreateFolder_(EXPORT_FOLDER_NAME);

  const file = getOrCreateFile_(folder, EXPORT_FILE_NAME, json);

  file.setContent(json);

  Logger.log("JSON generado correctamente");

  Logger.log("Archivo: " + file.getName());

  Logger.log("URL: " + file.getUrl());

  Logger.log(
    "Productos exportados: " +
      (Array.isArray(data.productCatalog) ? data.productCatalog.length : 0),
  );

  Logger.log(
    "Funcionalidades exportadas: " +
      (Array.isArray(data.productFeatures) ? data.productFeatures.length : 0),
  );
}

/* =========================================================
 * CAMINO CRÍTICO DE LA WEB
 *
 * MUY IMPORTANTE:
 *
 * Esta función SOLO lee datos.
 *
 * Nunca:
 *
 * - abre el antiguo Excel de Alex;
 * - abre DOR;
 * - ejecuta OCR;
 * - actualiza Texto extraido;
 * - ejecuta refreshProductData().
 * ========================================================= */

function getAppData() {
  const result = {
    generatedAt: new Date().toISOString(),
  };

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  /*
   * Datos operativos.
   */
  Object.entries(SHEETS).forEach(([key, sheetName]) => {
    const sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      Logger.log(`No existe la pestaña local: ${sheetName}`);

      result[key] = [];

      return;
    }

    result[key] = sheetToObjects_(sheet);
  });

  /*
   * Producto.
   *
   * También local.
   */
  const productExperience = getProductExperienceData_(spreadsheet);

  result.productCatalog = productExperience.productCatalog;

  result.productFeatures = productExperience.productFeatures;

  return result;
}

/* =========================================================
 * PRODUCT EXPERIENCE
 *
 * SOLO LECTURA DE PESTAÑAS LOCALES
 * ========================================================= */

function getProductExperienceData_(spreadsheet) {
  const productsSheet = spreadsheet.getSheetByName(PRODUCT_CATALOG_SHEET_NAME);

  const featuresSheet = spreadsheet.getSheetByName(PRODUCT_FEATURES_SHEET_NAME);

  if (!productsSheet) {
    Logger.log(`No existe la pestaña local: ${PRODUCT_CATALOG_SHEET_NAME}`);
  }

  if (!featuresSheet) {
    Logger.log(`No existe la pestaña local: ${PRODUCT_FEATURES_SHEET_NAME}`);
  }

  return {
    productCatalog: productsSheet ? buildProductCatalog_(productsSheet) : [],

    productFeatures: featuresSheet ? buildProductFeatures_(featuresSheet) : [],
  };
}

/* =========================================================
 * PRODUCT CATALOG
 * ========================================================= */

function buildProductCatalog_(sheet) {
  const rows = sheetToObjects_(sheet);

  return rows
    .filter((row) => hasValue_(row.product_id))
    .map((row) => ({
      productId: textValue_(row.product_id),

      programId: textValue_(row.program_id),

      productName: textValue_(row.product_name),

      tagline: textValue_(row.tagline),

      overview: textValue_(row.overview),

      valueProposition: textValue_(row.value_proposition),

      targetUsers: textValue_(row.target_users),

      icon: textValue_(row.icon),

      sortOrder: numberValue_(row.sort_order),

      enabled: booleanValue_(row.enabled),
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

/* =========================================================
 * PRODUCT FEATURES
 * ========================================================= */

function buildProductFeatures_(sheet) {
  const rows = sheetToObjects_(sheet);

  return rows
    .filter((row) => hasValue_(row.product_id) && hasValue_(row.capability_id))
    .map((row) => ({
      /*
       * Jerarquía.
       */
      productId: textValue_(row.product_id),

      productName: textValue_(row.product_name),

      capabilityId: textValue_(row.capability_id),

      capabilityType: textValue_(row.capability_type),

      capabilityName:
        textValue_(row.capability_name) || textValue_(row["Producto"]),

      capabilityOverview: textValue_(row.capability_overview),

      /*
       * Entregable.
       */
      deliverableName: textValue_(row["Entregable"]),

      /*
       * Información Gemini.
       *
       * Aquí SOLO leemos los resultados
       * que ya existen en Sheets.
       */
      overview: textValue_(row["Gemini - Project overview"]),

      functionalBullets: listValue_(row["Gemini - Bullets funcionales"]),

      experienceBullets: listValue_(row["Gemini - Bullets experiencia"]),

      functionalRequirements: listValue_(
        row["Gemini - Requerimientos funcionales"],
      ),

      nonFunctionalRequirements: listValue_(
        row["Gemini - Requerimientos no funcionales"],
      ),

      /*
       * Documentación.
       */
      documentUrl: textValue_(row["Link documento funcional del proyecto"]),

      figmaUrl: textValue_(row["HUB Diseño - URL de Figma"]),
    }));
}

/* =========================================================
 * SHEET HELPERS
 * ========================================================= */

function sheetToObjects_(sheet) {
  const values = sheet.getDataRange().getValues();

  if (!values || values.length < 2) {
    return [];
  }

  const headers = values[0].map(normalizeHeader_);

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

/* =========================================================
 * VALUE HELPERS
 * ========================================================= */

function hasValue_(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function textValue_(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function numberValue_(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function booleanValue_(value) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  return ["true", "1", "yes", "y", "si", "sí"].includes(normalized);
}

function listValue_(value) {
  const text = textValue_(value);

  if (!text) {
    return [];
  }

  return text
    .split(/\r?\n/)
    .map((item) => item.replace(/^\s*[-•–—*]\s*/, "").trim())
    .filter(Boolean);
}

/* =========================================================
 * DRIVE / EXPORT HELPERS
 * ========================================================= */

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

/* =========================================================
 * TRIGGER DE EXPORT ACTUAL
 *
 * No tiene relación con la actualización
 * manual de producto.
 * ========================================================= */

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

/* =========================================================
 * WEB APP / JSONP
 * ========================================================= */

function doGet(e) {
  const requestedCallback =
    e && e.parameter && e.parameter.callback
      ? String(e.parameter.callback)
      : "callback";

  const callback = /^[A-Za-z_$][A-Za-z0-9_$.\[\]]*$/.test(requestedCallback)
    ? requestedCallback
    : "callback";

  /*
   * CRÍTICO:
   *
   * Aquí solo se llama a getAppData().
   *
   * No hay ninguna llamada a:
   *
   * refreshProductData()
   * extractTextFromDriveUrl_()
   * applyOcr_()
   */
  const data = getAppData();

  const output = `${callback}(` + `${JSON.stringify(data)});`;

  return ContentService.createTextOutput(output).setMimeType(
    ContentService.MimeType.JAVASCRIPT,
  );
}

/* =========================================================
 * TEST DE LECTURA
 * ========================================================= */

function testProductExperienceImport() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  const data = getProductExperienceData_(spreadsheet);

  Logger.log("=== PRODUCT CATALOG ===");

  Logger.log(JSON.stringify(data.productCatalog, null, 2));

  Logger.log("=== PRODUCT FEATURES ===");

  Logger.log(JSON.stringify(data.productFeatures, null, 2));

  Logger.log(`Productos: ${data.productCatalog.length}`);

  Logger.log(`Funcionalidades / entregables: ${data.productFeatures.length}`);
}

/* =========================================================
 * TEST DE ACTUALIZACIÓN
 *
 * Este es el que debes ejecutar desde
 * el editor de Apps Script.
 *
 * NO refreshProductData().
 * ========================================================= */

function testProductRefresh() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = spreadsheet.getSheetByName(PRODUCT_FEATURES_SHEET_NAME);

  if (!sheet) {
    throw new Error(`No existe la pestaña "${PRODUCT_FEATURES_SHEET_NAME}".`);
  }

  const summary = refreshProductFeaturesFromDocuments_(sheet);

  SpreadsheetApp.flush();

  Logger.log(JSON.stringify(summary, null, 2));
}
