const EXPORT_FOLDER_NAME = "PortfolioPDB";
const EXPORT_FILE_NAME = "app-common-data.json";
const SNAPSHOT_SCHEMA_VERSION = 4;

const RCS_ACCESS_TOKEN_SECRET_PROPERTY = "RCS_ACCESS_TOKEN_SECRET";

const EXPORT_FILE_ID_PROPERTY = "RCS_EXPORT_FILE_ID";
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

  roadmapItemStatusHistory: "roadmapItemStatusHistory",

  /*
   * =====================================================
   * MANAGEMENT REPORTS
   * =====================================================
   */

  managementRoadmapLinks: "Management Roadmap Links",

  managementRoadmapLines: "Management Roadmap Lines",

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
    .addSeparator()
    .addItem("Actualizar foto JIRA / Features", "refreshJiraWorkspaceFeatures")
    .addItem("Actualizar datos JIRA / MSA", "refreshJiraMsaData")
    .addSeparator()
    .addItem("Actualizar Staffing", "refreshStaffingData")
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
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  /*
   * =====================================================
   * DATOS
   * =====================================================
   */

  const core = getCoreAppData_();

  const jiraFeatures = getJiraFeaturesData_();

  const historySheet = spreadsheet.getSheetByName(
    SHEETS.roadmapItemStatusHistory,
  );

  const roadmapItemStatusHistory = historySheet
    ? sheetToObjects_(historySheet)
    : [];

  const staffing = getStaffingData_();

  /*
   * =====================================================
   * PERMISOS
   * =====================================================
   */

  const access = buildSnapshotAccess_(spreadsheet);

  /*
   * =====================================================
   * SNAPSHOT
   * =====================================================
   */

  const data = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,

    programId: "aixbanker",

    ...core,

    dataset: "full-export",

    access,

    jiraWorkspaceFeatures: Array.isArray(jiraFeatures?.jiraWorkspaceFeatures)
      ? jiraFeatures.jiraWorkspaceFeatures
      : [],

    roadmapItemStatusHistory,

    staffing: {
      generatedAt: staffing?.generatedAt || "",

      source:
        staffing?.source && typeof staffing.source === "object"
          ? staffing.source
          : {},

      products: Array.isArray(staffing?.products) ? staffing.products : [],
    },
  };

  const json = JSON.stringify(data);

  const folder = getOrCreateFolder_(EXPORT_FOLDER_NAME);

  const file = getOrCreateFile_(folder, EXPORT_FILE_NAME, json);

  file.setContent(json);

  PropertiesService.getScriptProperties().setProperty(
    EXPORT_FILE_ID_PROPERTY,
    file.getId(),
  );

  Logger.log("========================================");

  Logger.log("AIXBANKER · FULL SNAPSHOT");

  Logger.log("========================================");

  Logger.log(`Schema: ${data.schemaVersion}`);

  Logger.log(`Generado: ${data.generatedAt}`);

  Logger.log(`File ID: ${file.getId()}`);

  Logger.log(`Usuarios explícitos: ${Object.keys(access.users).length}`);

  Logger.log(`Dominios: ${Object.keys(access.domains).length}`);

  Logger.log(`Grupos: ${access.groups.length}`);

  Logger.log(`Features JIRA: ${data.jiraWorkspaceFeatures.length}`);

  Logger.log(`Estados MSA: ${data.roadmapItemStatusHistory.length}`);

  Logger.log(`Productos Staffing: ${data.staffing.products.length}`);

  Logger.log("========================================");

  return {
    generatedAt: data.generatedAt,

    fileId: file.getId(),

    fileName: file.getName(),

    fileUrl: file.getUrl(),

    snapshot: data,
  };
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

function jiraCapabilityMappingSheetName_() {
  return "jiraCapabilityMapping";
}

function normalizeJiraCapabilityProductId_(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-")
    .replace(/\s+/g, "-");
}
function normalizeJiraFunctionalCaseSlugForExport_(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeJiraFunctionalCaseIdsForExport_(value) {
  return [
    ...new Set(
      String(value || "")
        .split(/[|,;\n]+/)
        .map((item) => {
          const raw = String(item || "").trim();

          if (!raw) {
            return "";
          }

          const parts = raw.split("::");

          if (parts.length !== 2) {
            return "";
          }

          const capabilityId = normalizeJiraFunctionalCaseSlugForExport_(
            parts[0],
          );

          const functionalCaseId = normalizeJiraFunctionalCaseSlugForExport_(
            parts[1],
          );

          if (!capabilityId || !functionalCaseId) {
            return "";
          }

          return [capabilityId, functionalCaseId].join("::");
        })
        .filter(Boolean),
    ),
  ].join("|");
}

function normalizeJiraCapabilityIdsForExport_(value) {
  return [
    ...new Set(
      String(value || "")
        .split(/[|,;\n]+/)
        .map((item) =>
          String(item || "")
            .trim()
            .toLowerCase()
            .replaceAll("_", "-")
            .replace(/\s+/g, "-"),
        )
        .filter(Boolean),
    ),
  ].join("|");
}

function normalizeJiraCapabilityTrackForExport_(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (["technical", "tecnico", "tech", "technology"].includes(normalized)) {
    return "technical";
  }

  if (["functional", "funcional", "business", "negocio"].includes(normalized)) {
    return "functional";
  }

  return "";
}

function jiraCapabilityMappingKey_(workspaceKey, jiraKey, productId) {
  return [
    String(workspaceKey || "")
      .trim()
      .toUpperCase(),

    String(jiraKey || "")
      .trim()
      .toUpperCase(),

    normalizeJiraCapabilityProductId_(productId),
  ].join("::");
}

function loadJiraCapabilityMappingsForExport_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(jiraCapabilityMappingSheetName_());

  if (!sheet) {
    Logger.log(
      `No existe la pestaña local: ${jiraCapabilityMappingSheetName_()}`,
    );

    return [];
  }

  return sheetToObjects_(sheet)
    .map((row) => {
      const workspaceKey = String(row.workspaceKey || "")
        .trim()
        .toUpperCase();

      const jiraKey = String(row.jiraKey || "")
        .trim()
        .toUpperCase();

      const productId = normalizeJiraCapabilityProductId_(row.productId);

      const capabilityIds = normalizeJiraCapabilityIdsForExport_(
        row.capabilityIds,
      );

      const functionalCaseIds = normalizeJiraFunctionalCaseIdsForExport_(
        row.functionalCaseIds,
      );

      const track = normalizeJiraCapabilityTrackForExport_(row.track);

      const mappingStatus =
        workspaceKey && jiraKey && productId && capabilityIds && track
          ? "mapped"
          : "incomplete";

      return {
        workspaceKey,

        jiraKey,

        featureName: textValue_(row.featureName),

        productId,

        capabilityIds,

        functionalCaseIds,

        track,

        confidence: String(row.confidence || "")
          .trim()
          .toLowerCase(),

        notes: textValue_(row.notes),

        mappingStatus,

        functionalCaseMappingStatus: functionalCaseIds ? "mapped" : "unmapped",
      };
    })
    .filter((row) => row.workspaceKey && row.jiraKey && row.productId);
}

function applyJiraCapabilityMappingsForExport_(featureRows, mappingRows) {
  const mappingsByKey = new Map();

  (Array.isArray(mappingRows) ? mappingRows : []).forEach((mapping) => {
    const key = jiraCapabilityMappingKey_(
      mapping.workspaceKey,
      mapping.jiraKey,
      mapping.productId,
    );

    mappingsByKey.set(key, mapping);
  });

  return (Array.isArray(featureRows) ? featureRows : []).map((row) => {
    const key = jiraCapabilityMappingKey_(
      row.workspaceKey,
      row.jiraKey,
      row.product,
    );

    const mapping = mappingsByKey.get(key);

    if (!mapping) {
      return {
        ...row,

        capabilityIds: "",

        functionalCaseIds: "",

        track: "",

        mappingFeatureName: "",

        mappingConfidence: "",

        mappingNotes: "",

        mappingStatus: "unmapped",

        functionalCaseMappingStatus: "unmapped",
      };
    }

    return {
      ...row,

      capabilityIds: mapping.capabilityIds,

      functionalCaseIds: mapping.functionalCaseIds,

      track: mapping.track,

      mappingFeatureName: mapping.featureName,

      mappingConfidence: mapping.confidence,

      mappingNotes: mapping.notes,

      mappingStatus: mapping.mappingStatus,

      functionalCaseMappingStatus: mapping.functionalCaseMappingStatus,
    };
  });
}
function getAppData() {
  return getCoreAppData_();
}
function getJiraMsaIndexForExport_(spreadsheet) {
  const roadmapSheet = spreadsheet.getSheetByName(SHEETS.roadmapItems);

  if (!roadmapSheet) {
    return [];
  }

  const historySheet = spreadsheet.getSheetByName(
    SHEETS.roadmapItemStatusHistory,
  );

  const roadmapItems = sheetToObjects_(roadmapSheet).filter((row) => {
    const type = textValue_(row.type).trim().toLowerCase();

    const jiraKey = textValue_(row.jiraKey);

    return type === "msa" && Boolean(jiraKey);
  });

  const historyRows = historySheet ? sheetToObjects_(historySheet) : [];

  const historyByItemId = new Map();

  historyRows.forEach((row) => {
    const itemId = textValue_(row.itemId);

    if (!itemId) {
      return;
    }

    if (!historyByItemId.has(itemId)) {
      historyByItemId.set(itemId, []);
    }

    historyByItemId.get(itemId).push(row);
  });

  return roadmapItems.map((item) => {
    const itemId = textValue_(item.id);

    const history = [...(historyByItemId.get(itemId) || [])].sort(
      (left, right) => Number(left.sequence || 0) - Number(right.sequence || 0),
    );

    const firstInterval = history[0] || null;

    const lastInterval = history.length ? history[history.length - 1] : null;

    const currentStatus = textValue_(lastInterval?.status || item.status);

    const jiraStartDate = textValue_(firstInterval?.startAt);

    /*
     * Para Closed, el ciclo termina
     * exactamente cuando entra en Closed.
     *
     * Para un MSA todavía abierto,
     * dejamos endDate vacío.
     * El frontend lo llevará hasta "hoy".
     */
    const jiraEndDate =
      normalizeJiraStatus_(currentStatus) === "Closed"
        ? textValue_(lastInterval?.startAt)
        : "";

    return {
      itemId,

      jiraKey: textValue_(item.jiraKey),

      currentStatus,

      currentStatusRaw: textValue_(lastInterval?.statusRaw || currentStatus),

      startDate: jiraStartDate,

      endDate: jiraEndDate,

      currentSince: textValue_(lastInterval?.startAt),

      historyAvailable: history.length > 0,

      historyEntries: history.length,

      sourceFile: textValue_(lastInterval?.sourceFile),

      sourceUpdatedAt: textValue_(lastInterval?.sourceUpdatedAt),
    };
  });
}
function getCoreAppData_() {
  const result = {
    generatedAt: new Date().toISOString(),

    dataset: "core",
  };

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  /*
   * =====================================================
   * CORE EXISTENTE
   * =====================================================
   *
   * roadmapItemStatusHistory queda fuera.
   * roadmapItemActivities se procesa aparte.
   *
   * jiraWorkspaceFeatures queda fuera.
   *
   * jiraMsaIndex será únicamente una foto ligera.
   */
  const deferredSheetKeys = new Set([
    "roadmapItemStatusHistory",
    "roadmapItemActivities",
  ]);

  Object.entries(SHEETS).forEach(([key, sheetName]) => {
    if (deferredSheetKeys.has(key)) {
      return;
    }

    const sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      Logger.log(`No existe la pestaña local: ${sheetName}`);

      result[key] = [];

      return;
    }

    result[key] = sheetToObjects_(sheet);
  });

  /*
   * =====================================================
   * SDA GENERAL
   * =====================================================
   *
   * Estas dos colecciones proceden de los PDFs SDA
   * procesados por SdaImportGeneral.gs.
   *
   * Ninguna de ellas debe contener:
   *
   * - importes;
   * - costes;
   * - FTE sensibles;
   * - información financiera.
   *
   * La información sensible vive exclusivamente
   * en la Spreadsheet Restricted.
   */
  const sdaFlightsSheet = spreadsheet.getSheetByName("sda_flights");

  const sdaDeliverablesSheet = spreadsheet.getSheetByName("sda_deliverables");

  result.sdaFlights = sdaFlightsSheet ? sheetToObjects_(sdaFlightsSheet) : [];

  result.sdaDeliverables = sdaDeliverablesSheet
    ? sheetToObjects_(sdaDeliverablesSheet)
    : [];

  /*
   * =====================================================
   * ROADMAP
   * =====================================================
   */

  result.roadmapItemActivities =
    getRoadmapItemActivitiesForExport_(spreadsheet);

  /*
   * =====================================================
   * JIRA
   * =====================================================
   *
   * Índice ligero de MSAs JIRA.
   *
   * Permite descubrir y pintar los MSAs
   * sin transportar su histórico.
   */
  result.jiraMsaIndex = getJiraMsaIndexForExport_(spreadsheet);

  /*
   * =====================================================
   * PRODUCTO
   * =====================================================
   */

  const productExperience = getProductExperienceData_(spreadsheet);

  result.productCatalog = productExperience.productCatalog;

  result.productFeatures = productExperience.productFeatures;

  /*
   * =====================================================
   * DATASETS DIFERIDOS
   * =====================================================
   */

  result.roadmapItemStatusHistory = [];

  result.jiraWorkspaceFeatures = [];

  return result;
}
function getJiraFeaturesData_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  const featureSheet = spreadsheet.getSheetByName("jiraWorkspaceFeatures");

  const featureRows = featureSheet ? sheetToObjects_(featureSheet) : [];

  const mappings = loadJiraCapabilityMappingsForExport_(spreadsheet);

  const features = applyJiraCapabilityMappingsForExport_(featureRows, mappings);

  return {
    generatedAt: new Date().toISOString(),

    dataset: "jira-features",

    jiraWorkspaceFeatures: features,
  };
}
function getRoadmapItemStatusHistoryByItemId_(spreadsheet, itemId) {
  const normalizedItemId = textValue_(itemId);

  if (!normalizedItemId) {
    throw new Error(
      "No se ha informado itemId para cargar el histórico JIRA del MSA.",
    );
  }

  const sheet = spreadsheet.getSheetByName(SHEETS.roadmapItemStatusHistory);

  if (!sheet) {
    return [];
  }

  return sheetToObjects_(sheet).filter(
    (row) => textValue_(row.itemId) === normalizedItemId,
  );
}

function getJiraMsaData_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = spreadsheet.getSheetByName("roadmapItemStatusHistory");

  if (!sheet) {
    return {
      dataset: "jira-msa",
      generatedAt: new Date().toISOString(),

      roadmapItemStatusHistory: [],
    };
  }

  const values = sheet.getDataRange().getValues();

  if (!Array.isArray(values) || values.length < 2) {
    return {
      dataset: "jira-msa",
      generatedAt: new Date().toISOString(),

      roadmapItemStatusHistory: [],
    };
  }

  const headers = values[0].map((value) => String(value || "").trim());

  const rows = values
    .slice(1)
    .filter((row) => row.some((value) => value !== "" && value !== null))
    .map((row) => {
      const result = {};

      headers.forEach((header, index) => {
        if (!header) {
          return;
        }

        const value = row[index];

        if (value instanceof Date) {
          result[header] = value.toISOString();

          return;
        }

        result[header] = value;
      });

      return result;
    });

  return {
    dataset: "jira-msa",

    generatedAt: new Date().toISOString(),

    roadmapItemStatusHistory: rows,
  };
}
function getRoadmapItemActivitiesForExport_(spreadsheet) {
  const normalizedSheet = spreadsheet.getSheetByName("NORM_Roadmap_Activities");

  /*
   * =====================================================
   * MODELO NORMALIZADO
   * =====================================================
   */
  if (normalizedSheet) {
    const normalizedRows = sheetRangeToObjects_(
      normalizedSheet,
      2,
      1,
      13,
    ).filter(isValidRoadmapActivityRow_);

    if (normalizedRows.length) {
      Logger.log(
        `roadmapItemActivities normalizadas: ${normalizedRows.length}`,
      );

      return normalizedRows;
    }
  }

  /*
   * =====================================================
   * FALLBACK
   * =====================================================
   *
   * Se mantiene únicamente para datasets
   * antiguos que todavía no tengan
   * NORM_Roadmap_Activities.
   */
  const fallbackSheet = spreadsheet.getSheetByName(
    SHEETS.roadmapItemActivities,
  );

  if (!fallbackSheet) {
    Logger.log("No existe origen para roadmapItemActivities.");

    return [];
  }

  return sheetToObjects_(fallbackSheet).filter(isValidRoadmapActivityRow_);
}
function sheetRangeToObjects_(sheet, headerRow, startColumn, columnCount) {
  const lastRow = sheet.getLastRow();

  if (lastRow <= headerRow || columnCount < 1) {
    return [];
  }

  const rowCount = lastRow - headerRow + 1;

  const values = sheet
    .getRange(headerRow, startColumn, rowCount, columnCount)
    .getValues();

  if (!values || values.length < 2) {
    return [];
  }

  const headers = values[0].map(normalizeHeader_);

  return values
    .slice(1)
    .filter((row) =>
      row.some(
        (cell) =>
          cell !== null && cell !== undefined && String(cell).trim() !== "",
      ),
    )
    .map((row) => {
      const result = {};

      headers.forEach((header, index) => {
        if (!header) {
          return;
        }

        result[header] = normalizeCellValue_(row[index]);
      });

      return result;
    });
}
function isValidRoadmapActivityRow_(row) {
  if (!row) {
    return false;
  }

  const itemId = textValue_(row.itemId);

  const activityId = textValue_(row.activityId);

  const activityName = textValue_(row.activityName);

  if (!itemId || !activityId || !activityName) {
    return false;
  }

  const values = [itemId, activityId, activityName];

  /*
   * Eliminamos:
   *
   * - errores de fórmula;
   * - cabeceras duplicadas;
   * - filas incompletas.
   */
  if (values.some((value) => String(value).trim().startsWith("#"))) {
    return false;
  }

  if (
    itemId.toLowerCase() === "itemid" ||
    activityId.toLowerCase() === "activityid" ||
    activityName.toLowerCase() === "activityname"
  ) {
    return false;
  }

  return true;
}
function testJiraMsaIndex() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  const startedAt = Date.now();

  const rows = getJiraMsaIndexForExport_(spreadsheet);

  const elapsedMs = Date.now() - startedAt;

  const json = JSON.stringify(rows);

  Logger.log("========================================");

  Logger.log("JIRA MSA INDEX");

  Logger.log("========================================");

  Logger.log(`MSAs: ${rows.length}`);

  Logger.log(
    `Con histórico: ${rows.filter((row) => row.historyAvailable).length}`,
  );

  Logger.log(
    `Con fecha inicial: ${rows.filter((row) => Boolean(row.startDate)).length}`,
  );

  Logger.log(
    `Cerrados: ${
      rows.filter((row) => normalizeJiraStatus_(row.currentStatus) === "Closed")
        .length
    }`,
  );

  Logger.log(`Tiempo: ${elapsedMs} ms`);

  Logger.log(`Tamaño: ${Math.round(json.length / 1024)} KB`);

  Logger.log(JSON.stringify(rows, null, 2));

  Logger.log("========================================");

  return rows;
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
       * Geografía.
       *
       * Se permite:
       *
       * ES
       * MX
       * ES|MX
       *
       * Holding no se informa:
       * se construye como agregado
       * de todas las geografías.
       */
      country: textValue_(row.country),

      /*
       * Entregable.
       */
      deliverableName: textValue_(row["Entregable"]),

      /*
       * Información Gemini.
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
function syncSnapshotPermissions_(snapshotFile, spreadsheet) {
  if (!snapshotFile) {
    throw new Error("No se ha informado el fichero snapshot.");
  }

  if (!spreadsheet) {
    throw new Error("No se ha informado la Spreadsheet origen.");
  }

  const spreadsheetFile = DriveApp.getFileById(spreadsheet.getId());

  /*
   * =====================================================
   * EDITORES
   * =====================================================
   */

  const editorEmails = spreadsheetFile
    .getEditors()
    .map((user) =>
      String(user.getEmail() || "")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);

  /*
   * =====================================================
   * LECTORES
   * =====================================================
   */

  const viewerEmails = spreadsheetFile
    .getViewers()
    .map((user) =>
      String(user.getEmail() || "")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);

  /*
   * =====================================================
   * SNAPSHOT · EDITORES
   * =====================================================
   *
   * No necesitan editar realmente el JSON,
   * pero mantenemos el mismo nivel de permiso
   * que tienen sobre la Spreadsheet.
   */

  if (editorEmails.length) {
    snapshotFile.addEditors(editorEmails);
  }

  /*
   * =====================================================
   * SNAPSHOT · LECTORES
   * =====================================================
   */

  if (viewerEmails.length) {
    snapshotFile.addViewers(viewerEmails);
  }

  Logger.log("Permisos snapshot sincronizados");

  Logger.log("Editores: " + editorEmails.length);

  Logger.log("Lectores: " + viewerEmails.length);
}
/* =========================================================
 * TRIGGER DE EXPORT ACTUAL
 *
 * No tiene relación con la actualización
 * manual de producto.
 * ========================================================= */

function createDailyTrigger() {
  deleteExistingTriggers_("exportPortfolioJson");

  ScriptApp.newTrigger("exportPortfolioJson")
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();

  Logger.log("Trigger diario de exportPortfolioJson creado");
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
  const parameters = e && e.parameter ? e.parameter : {};

  const requestedCallback = String(parameters.callback || "callback").trim();

  const callback = /^[A-Za-z_$][A-Za-z0-9_$.\[\]]*$/.test(requestedCallback)
    ? requestedCallback
    : "callback";

  const action = String(parameters.action || "snapshot")
    .trim()
    .toLowerCase();

  try {
    let snapshot;

    /*
     * =====================================================
     * SNAPSHOT
     * =====================================================
     *
     * Camino normal.
     *
     * Si existe app-common-data.json:
     *   -> sólo se lee.
     *
     * Si no existe o no es válido:
     *   -> se importan todas las fuentes;
     *   -> se genera;
     *   -> se devuelve.
     */
    if (action === "snapshot") {
      snapshot = getOrBuildPortfolioSnapshot_();
    } else if (action === "refresh") {

    /*
     * =====================================================
     * REFRESH
     * =====================================================
     *
     * Camino explícito.
     *
     * Se ejecuta únicamente cuando el usuario
     * pulsa "Actualizar datos".
     */
      const result = refreshAllSourcesAndExport();

      snapshot = result?.snapshot || getPortfolioSnapshot_();
    } else {

    /*
     * =====================================================
     * ACTION NO SOPORTADA
     * =====================================================
     */
      throw new Error(`Acción no soportada: ${action}`);
    }

    if (!snapshot || typeof snapshot !== "object") {
      throw new Error(
        "No se ha podido obtener una fotografía válida del programa.",
      );
    }

    const payload = {
      ok: true,

      ...snapshot,
    };

    return ContentService.createTextOutput(
      `${callback}(${JSON.stringify(payload)});`,
    ).setMimeType(ContentService.MimeType.JAVASCRIPT);
  } catch (error) {
    const payload = {
      ok: false,

      action,

      code: "SNAPSHOT_ERROR",

      error: String(error && error.message ? error.message : error),

      generatedAt: new Date().toISOString(),
    };

    return ContentService.createTextOutput(
      `${callback}(${JSON.stringify(payload)});`,
    ).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
}
function getPortfolioSnapshot_() {
  const folders = DriveApp.getFoldersByName(EXPORT_FOLDER_NAME);

  if (!folders.hasNext()) {
    throw new Error(`No existe la carpeta ${EXPORT_FOLDER_NAME}.`);
  }

  const folder = folders.next();

  const files = folder.getFilesByName(EXPORT_FILE_NAME);

  if (!files.hasNext()) {
    throw new Error(
      `No existe la fotografía ${EXPORT_FILE_NAME}. Ejecuta exportPortfolioJson().`,
    );
  }

  const file = files.next();

  const content = file.getBlob().getDataAsString("UTF-8");

  if (!content.trim()) {
    throw new Error(`La fotografía ${EXPORT_FILE_NAME} está vacía.`);
  }

  let data;

  try {
    data = JSON.parse(content);
  } catch {
    throw new Error(
      `La fotografía ${EXPORT_FILE_NAME} no contiene JSON válido.`,
    );
  }

  if (!data || typeof data !== "object") {
    throw new Error(
      `La fotografía ${EXPORT_FILE_NAME} no contiene un objeto válido.`,
    );
  }

  return data;
}
/* =========================================================
 * JIRA E2E
 *
 * Primera iteración:
 *
 * - localiza el HTML descargado de JIRA en Drive;
 * - lee el fichero como texto;
 * - identifica la fecha de creación;
 * - extrae únicamente cambios del campo Status;
 * - normaliza estados;
 * - reconstruye intervalos temporales;
 * - NO escribe todavía en Sheets;
 * - NO forma parte de getAppData();
 * ========================================================= */

const JIRA_E2E_SCRIPT_PROPERTIES = {
  folderId: "JIRA_E2E_FOLDER_ID",
  testKey: "JIRA_E2E_TEST_KEY",
};
const JIRA_STATUS_HISTORY_HEADERS = [
  "itemId",
  "jiraKey",
  "sequence",
  "status",
  "statusRaw",
  "startAt",
  "endAt",
  "sourceFile",
  "sourceUpdatedAt",
];

const JIRA_NON_COUNTING_STATUSES = new Set(["Blocked", "Closed"]);
/* =========================================================
 * CONFIGURACIÓN JIRA
 * ========================================================= */

function getRequiredScriptProperty_(propertyName) {
  const value = textValue_(
    PropertiesService.getScriptProperties().getProperty(propertyName),
  );

  if (!value) {
    throw new Error(`Falta la propiedad de script "${propertyName}".`);
  }

  return value;
}

/* =========================================================
 * DRIVE · CARPETA JIRA
 * ========================================================= */

function getJiraE2EFolder_() {
  const folderId = getRequiredScriptProperty_(
    JIRA_E2E_SCRIPT_PROPERTIES.folderId,
  );

  try {
    return DriveApp.getFolderById(folderId);
  } catch (error) {
    throw new Error(
      `No se ha podido abrir la carpeta configurada en ` +
        `"${JIRA_E2E_SCRIPT_PROPERTIES.folderId}".`,
    );
  }
}

/* =========================================================
 * DRIVE · LOCALIZACIÓN DEL HTML
 *
 * No exigimos un nombre exacto.
 *
 * Es válido, por ejemplo:
 *
 * [E2E-356785] [AIxB] Blue Buddy ...
 *
 * Si hay varias versiones del mismo E2E,
 * utilizamos la modificada más recientemente.
 * ========================================================= */

function findJiraE2EFileByKey_(jiraKey) {
  const normalizedKey = textValue_(jiraKey).toUpperCase();

  if (!normalizedKey) {
    throw new Error("No se ha informado una jiraKey.");
  }

  const folder = getJiraE2EFolder_();

  const files = folder.getFiles();

  const matches = [];

  while (files.hasNext()) {
    const file = files.next();

    const fileName = textValue_(file.getName());

    if (fileName.toUpperCase().includes(normalizedKey)) {
      matches.push(file);
    }
  }

  if (!matches.length) {
    throw new Error(
      `No se ha encontrado en Drive ningún fichero ` +
        `cuyo nombre contenga "${normalizedKey}".`,
    );
  }

  matches.sort(
    (left, right) =>
      right.getLastUpdated().getTime() - left.getLastUpdated().getTime(),
  );

  if (matches.length > 1) {
    Logger.log(
      `[JIRA] Hay ${matches.length} ficheros para ${normalizedKey}. ` +
        `Se utilizará el más reciente: ${matches[0].getName()}`,
    );
  }

  return matches[0];
}

/* =========================================================
 * LECTURA DEL HTML
 * ========================================================= */

function readJiraE2EHtml_(file) {
  if (!file) {
    throw new Error("No se ha recibido un fichero JIRA.");
  }

  const html = file.getBlob().getDataAsString("UTF-8");

  if (!html) {
    throw new Error(`El fichero "${file.getName()}" está vacío.`);
  }

  const comparable = html.slice(0, 5000).toLowerCase();

  if (!comparable.includes("<html") && !comparable.includes("<!doctype html")) {
    throw new Error(
      `El fichero "${file.getName()}" no parece ser un HTML de JIRA.`,
    );
  }

  return html;
}

/* =========================================================
 * HELPERS HTML
 * ========================================================= */

function decodeJiraHtmlEntities_(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, function (_, code) {
      return String.fromCharCode(Number(code));
    })
    .replace(/&#x([0-9a-f]+);/gi, function (_, code) {
      return String.fromCharCode(parseInt(code, 16));
    });
}

function stripJiraHtml_(value) {
  return decodeJiraHtmlEntities_(
    String(value || "")
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================================================
 * FECHAS JIRA
 * ========================================================= */

function jiraTimestampToMillis_(value) {
  const timestamp = textValue_(value);

  if (!timestamp) {
    return NaN;
  }

  /*
   * JIRA utiliza offsets como:
   *
   * +0200
   *
   * Algunos motores JS son más fiables con:
   *
   * +02:00
   */
  const normalized = timestamp.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");

  return Date.parse(normalized);
}

function extractJiraCreatedAt_(html) {
  const specificMatch = String(html || "").match(
    /id=["']created-val["'][\s\S]*?<time\b[^>]*datetime=["']([^"']+)["']/i,
  );

  if (specificMatch) {
    return textValue_(specificMatch[1]);
  }

  return "";
}

/* =========================================================
 * ESTADO ACTUAL
 * ========================================================= */

function extractJiraCurrentStatus_(html) {
  const statusValueMatch = String(html || "").match(
    /id=["']status-val["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
  );

  if (statusValueMatch) {
    const value = stripJiraHtml_(statusValueMatch[1]);

    if (value) {
      return value;
    }
  }

  const dataStatusMatch = String(html || "").match(
    /\bdata-issue-status=["']([^"']+)["']/i,
  );

  if (dataStatusMatch) {
    return stripJiraHtml_(dataStatusMatch[1]);
  }

  return "";
}

/* =========================================================
 * NORMALIZACIÓN DE ESTADOS
 *
 * El valor raw se conserva aparte.
 * Aquí estabilizamos las variantes de JIRA.
 * ========================================================= */

function normalizeJiraStatus_(value) {
  const raw = stripJiraHtml_(value);

  if (!raw) {
    return "";
  }

  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  const aliases = {
    "pre work": "Pre-Work",

    "analysis to do": "Analysis To Do",

    "analysis in progress": "Analysis In Progress",

    "analysis in review": "Analysis In Review",

    blocked: "Blocked",

    closed: "Closed",
  };

  return aliases[normalized] || raw;
}
function jiraStatusCountsTowardsEffectiveTime_(status) {
  const normalizedStatus = normalizeJiraStatus_(status);

  if (!normalizedStatus) {
    return false;
  }

  return !JIRA_NON_COUNTING_STATUSES.has(normalizedStatus);
}
/* =========================================================
 * EXTRACCIÓN DE VALORES ORIGINAL / NEW
 * ========================================================= */

function extractJiraHistoryCellValue_(rowHtml, className, label) {
  const expression = new RegExp(
    `<td\\b[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>` +
      `[\\s\\S]*?<b>\\s*${label}:\\s*<\\/b>` +
      `([\\s\\S]*?)` +
      `(?:<span\\b[^>]*class=["'][^"']*\\bhist-value\\b[^"']*["'][^>]*>|<\\/td>)`,
    "i",
  );

  const match = String(rowHtml || "").match(expression);

  if (!match) {
    return "";
  }

  return stripJiraHtml_(match[1]);
}

/* =========================================================
 * BLOQUES DE CHANGE HISTORY
 *
 * El HTML de JIRA contiene bloques:
 *
 * <div class="issue-data-block"
 *      id="changehistory-...">
 *
 * Los separamos antes de analizar los <tr>.
 * ========================================================= */

function splitJiraHistoryBlocks_(html) {
  const source = String(html || "");

  const expression =
    /<div\b(?=[^>]*\bclass=["'][^"']*\bissue-data-block\b[^"']*["'])(?=[^>]*\bid=["']changehistory-[^"']+["'])[^>]*>/gi;

  const positions = [];

  let match;

  while ((match = expression.exec(source)) !== null) {
    positions.push(match.index);
  }

  if (!positions.length) {
    return [];
  }

  return positions.map((start, index) => {
    const end =
      index + 1 < positions.length ? positions[index + 1] : source.length;

    return source.slice(start, end);
  });
}

/* =========================================================
 * TRANSICIONES DE STATUS
 *
 * Importante:
 *
 * - ignoramos Status MMC;
 * - sólo procesamos exactamente "Status";
 * - ignoramos transiciones X -> X;
 * - ordenamos cronológicamente.
 * ========================================================= */

function extractJiraStatusTransitions_(html) {
  const blocks = splitJiraHistoryBlocks_(html);

  const transitions = [];

  blocks.forEach((block) => {
    const dateMatch = block.match(
      /<time\b[^>]*datetime=["']([^"']+)["'][^>]*>/i,
    );

    if (!dateMatch) {
      return;
    }

    const transitionAt = textValue_(dateMatch[1]);

    const rows = block.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];

    rows.forEach((row) => {
      const fieldMatch = row.match(
        /<td\b[^>]*class=["'][^"']*\bactivity-name\b[^"']*["'][^>]*>([\s\S]*?)<\/td>/i,
      );

      if (!fieldMatch) {
        return;
      }

      const fieldName = stripJiraHtml_(fieldMatch[1]);

      /*
       * Evita capturar:
       *
       * Status MMC
       *
       * u otros campos cuyo nombre
       * simplemente contenga Status.
       */
      if (fieldName !== "Status") {
        return;
      }

      const oldStatusRaw = extractJiraHistoryCellValue_(
        row,
        "activity-old-val",
        "Original",
      );

      const newStatusRaw = extractJiraHistoryCellValue_(
        row,
        "activity-new-val",
        "New",
      );

      if (!oldStatusRaw || !newStatusRaw) {
        return;
      }

      const oldStatus = normalizeJiraStatus_(oldStatusRaw);

      const newStatus = normalizeJiraStatus_(newStatusRaw);

      /*
       * JIRA puede registrar un evento
       * cuyo estado no cambia realmente:
       *
       * Analysis In Progress
       * ->
       * Analysis In Progress
       */
      if (oldStatus === newStatus) {
        return;
      }

      transitions.push({
        at: transitionAt,

        oldStatus: oldStatus,

        oldStatusRaw: oldStatusRaw,

        newStatus: newStatus,

        newStatusRaw: newStatusRaw,
      });
    });
  });

  transitions.sort(
    (left, right) =>
      jiraTimestampToMillis_(left.at) - jiraTimestampToMillis_(right.at),
  );

  return transitions;
}

/* =========================================================
 * RECONSTRUCCIÓN DE INTERVALOS
 *
 * Ejemplo:
 *
 * creación
 *   |
 * Pre-Work
 *   |
 * 06/05
 *   |
 * Analysis To Do
 *   |
 * 25/05
 *   |
 * Analysis In Progress
 * ========================================================= */

function buildJiraStatusIntervals_(createdAt, transitions, currentStatusRaw) {
  const safeTransitions = Array.isArray(transitions) ? transitions : [];

  if (!safeTransitions.length) {
    const statusRaw = textValue_(currentStatusRaw);

    if (!createdAt || !statusRaw) {
      return [];
    }

    return [
      {
        sequence: 1,

        status: normalizeJiraStatus_(statusRaw),

        statusRaw: statusRaw,

        startAt: createdAt,

        endAt: "",
      },
    ];
  }

  const intervals = [];

  let currentStatusRawValue = safeTransitions[0].oldStatusRaw;

  let currentStatus = normalizeJiraStatus_(currentStatusRawValue);

  let currentStart = createdAt || safeTransitions[0].at;

  safeTransitions.forEach((transition) => {
    /*
     * Si la cadena del histórico no
     * coincide exactamente, seguimos
     * utilizando el Original de JIRA
     * como fuente de verdad.
     */
    if (currentStatus !== transition.oldStatus) {
      currentStatus = transition.oldStatus;

      currentStatusRawValue = transition.oldStatusRaw;
    }

    intervals.push({
      sequence: intervals.length + 1,

      status: currentStatus,

      statusRaw: currentStatusRawValue,

      startAt: currentStart,

      endAt: transition.at,
    });

    currentStatus = transition.newStatus;

    currentStatusRawValue = transition.newStatusRaw;

    currentStart = transition.at;
  });

  intervals.push({
    sequence: intervals.length + 1,

    status: currentStatus,

    statusRaw: currentStatusRawValue,

    startAt: currentStart,

    endAt: "",
  });

  return intervals;
}

/* =========================================================
 * DETECCIÓN DE HISTÓRICO INCOMPLETO
 *
 * Para la prueba NO bloqueamos.
 *
 * Cuando pasemos a escritura en Sheets,
 * sí utilizaremos esta señal para evitar
 * publicar información incompleta.
 * ========================================================= */

function jiraHistoryLooksComplete_(html) {
  const source = String(html || "");

  const hasLoadOlderButton = /Load more older history items/i.test(source);

  const hasOlderFetchMode = /data-fetch-mode=["']older["']/i.test(source);

  return !(hasLoadOlderButton || hasOlderFetchMode);
}

/* =========================================================
 * PARSER PRINCIPAL
 * ========================================================= */

function parseJiraE2EHtml_(html, jiraKey) {
  const normalizedKey = textValue_(jiraKey).toUpperCase();

  if (!normalizedKey) {
    throw new Error("No se ha informado jiraKey al parser.");
  }

  const source = String(html || "");

  if (!source.toUpperCase().includes(normalizedKey)) {
    throw new Error(`El HTML no parece corresponder a ${normalizedKey}.`);
  }

  const createdAt = extractJiraCreatedAt_(source);

  const currentStatusRaw = extractJiraCurrentStatus_(source);

  const transitions = extractJiraStatusTransitions_(source);

  const intervals = buildJiraStatusIntervals_(
    createdAt,
    transitions,
    currentStatusRaw,
  );

  const historyComplete = jiraHistoryLooksComplete_(source);

  const warnings = [];

  if (!createdAt) {
    warnings.push("No se ha podido determinar la fecha de creación.");
  }

  if (!transitions.length) {
    warnings.push("No se han encontrado transiciones de Status.");
  }

  if (!historyComplete) {
    warnings.push(
      "El HTML indica que puede haber histórico anterior sin cargar.",
    );
  }

  if (currentStatusRaw && intervals.length) {
    const parsedCurrentStatus = intervals[intervals.length - 1].status;

    const pageCurrentStatus = normalizeJiraStatus_(currentStatusRaw);

    if (parsedCurrentStatus !== pageCurrentStatus) {
      warnings.push(
        `El último estado reconstruido "${parsedCurrentStatus}" ` +
          `no coincide con el estado actual de JIRA "${pageCurrentStatus}".`,
      );
    }
  }

  return {
    jiraKey: normalizedKey,

    createdAt: createdAt,

    currentStatus: normalizeJiraStatus_(currentStatusRaw),

    currentStatusRaw: currentStatusRaw,

    historyComplete: historyComplete,

    transitionCount: transitions.length,

    transitions: transitions,

    intervals: intervals,

    warnings: warnings,
  };
}

/* =========================================================
 * ROADMAP ITEM POR JIRA KEY
 * ========================================================= */

function findRoadmapItemByJiraKey_(spreadsheet, jiraKey) {
  const sheet = spreadsheet.getSheetByName(SHEETS.roadmapItems);

  if (!sheet) {
    throw new Error(`No existe la pestaña "${SHEETS.roadmapItems}".`);
  }

  const normalizedKey = textValue_(jiraKey).toUpperCase();

  const matches = sheetToObjects_(sheet).filter(
    (row) => textValue_(row.jiraKey).toUpperCase() === normalizedKey,
  );

  if (!matches.length) {
    throw new Error(
      `No existe ningún roadmapItem con jiraKey "${normalizedKey}".`,
    );
  }

  if (matches.length > 1) {
    throw new Error(
      `Hay ${matches.length} roadmapItems con jiraKey "${normalizedKey}". ` +
        `La jiraKey debe identificar un único MSA.`,
    );
  }

  return matches[0];
}
/* =========================================================
 * JIRA E2E · PERSISTENCIA EN SHEETS
 *
 * roadmapItemStatusHistory contiene el
 * histórico COMPLETO reconstruido desde JIRA.
 *
 * No colapsamos:
 *
 * - vueltas atrás;
 * - cambios de pocos segundos;
 * - Blocked;
 * - Closed.
 *
 * La agregación se hará posteriormente
 * a partir de este histórico.
 * ========================================================= */

function getJiraStatusHistorySheet_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(SHEETS.roadmapItemStatusHistory);

  if (!sheet) {
    throw new Error(
      `No existe la pestaña ` + `"${SHEETS.roadmapItemStatusHistory}".`,
    );
  }

  return sheet;
}

function validateJiraStatusHistorySheet_(sheet) {
  const lastColumn = sheet.getLastColumn();

  if (lastColumn < 1) {
    throw new Error(
      `La pestaña ` +
        `"${SHEETS.roadmapItemStatusHistory}" ` +
        `no tiene cabeceras.`,
    );
  }

  const headers = sheet
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map(normalizeHeader_);

  const missingHeaders = JIRA_STATUS_HISTORY_HEADERS.filter(
    (requiredHeader) => !headers.includes(requiredHeader),
  );

  if (missingHeaders.length) {
    throw new Error(
      `Faltan columnas obligatorias en ` +
        `"${SHEETS.roadmapItemStatusHistory}": ` +
        `${missingHeaders.join(", ")}.`,
    );
  }

  return headers;
}

function getJiraMsaRoadmapItems_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(SHEETS.roadmapItems);

  if (!sheet) {
    throw new Error(`No existe la pestaña ` + `"${SHEETS.roadmapItems}".`);
  }

  const rows = sheetToObjects_(sheet);

  return rows.filter((row) => {
    const type = textValue_(row.type).trim().toLowerCase();

    const jiraKey = textValue_(row.jiraKey);

    return type === "msa" && Boolean(jiraKey);
  });
}

function validateJiraMsaRoadmapItem_(roadmapItem) {
  const itemId = textValue_(roadmapItem.id);

  const jiraKey = textValue_(roadmapItem.jiraKey).toUpperCase();

  if (!itemId) {
    throw new Error(`Existe un MSA con jiraKey ` + `"${jiraKey}" pero sin id.`);
  }

  if (!jiraKey) {
    throw new Error(`El MSA "${itemId}" no tiene jiraKey.`);
  }

  return {
    itemId: itemId,

    jiraKey: jiraKey,
  };
}

function validateParsedJiraForPublication_(jiraKey, parsed) {
  if (!parsed) {
    throw new Error(`No se ha podido procesar ${jiraKey}.`);
  }

  if (!parsed.createdAt) {
    throw new Error(
      `${jiraKey}: no se ha encontrado ` + `la fecha de creación.`,
    );
  }

  if (!parsed.historyComplete) {
    throw new Error(
      `${jiraKey}: el HTML parece contener ` +
        `un histórico incompleto. ` +
        `Carga todo el History en JIRA, ` +
        `vuelve a descargar el HTML ` +
        `y súbelo de nuevo a Drive.`,
    );
  }

  if (!Array.isArray(parsed.intervals) || !parsed.intervals.length) {
    throw new Error(
      `${jiraKey}: no se ha podido ` +
        `reconstruir ningún intervalo de estado.`,
    );
  }

  const invalidIntervals = parsed.intervals.filter(
    (interval) => !textValue_(interval.status) || !textValue_(interval.startAt),
  );

  if (invalidIntervals.length) {
    throw new Error(
      `${jiraKey}: hay ` +
        `${invalidIntervals.length} ` +
        `intervalos incompletos.`,
    );
  }

  if (parsed.currentStatus && parsed.intervals.length) {
    const lastInterval = parsed.intervals[parsed.intervals.length - 1];

    const lastStatus = normalizeJiraStatus_(lastInterval.status);

    const currentStatus = normalizeJiraStatus_(parsed.currentStatus);

    if (lastStatus !== currentStatus) {
      throw new Error(
        `${jiraKey}: el último estado ` +
          `reconstruido "${lastStatus}" ` +
          `no coincide con el estado actual ` +
          `"${currentStatus}".`,
      );
    }
  }
}

function buildJiraStatusHistoryRows_(roadmapItem, file, parsed) {
  const identity = validateJiraMsaRoadmapItem_(roadmapItem);

  const sourceFile = file.getName();

  const sourceUpdatedAt = file.getLastUpdated().toISOString();

  return parsed.intervals.map((interval) => ({
    itemId: identity.itemId,

    jiraKey: identity.jiraKey,

    sequence: Number(interval.sequence) || 0,

    status: normalizeJiraStatus_(interval.status),

    statusRaw: textValue_(interval.statusRaw),

    startAt: textValue_(interval.startAt),

    endAt: textValue_(interval.endAt),

    sourceFile: sourceFile,

    sourceUpdatedAt: sourceUpdatedAt,
  }));
}

function jiraStatusHistoryObjectsToValues_(rows, headers) {
  return rows.map((row) =>
    headers.map((header) => {
      if (Object.prototype.hasOwnProperty.call(row, header)) {
        return row[header];
      }

      return "";
    }),
  );
}

function sortJiraStatusHistoryRows_(rows) {
  return [...rows].sort((left, right) => {
    const itemComparison = textValue_(left.itemId).localeCompare(
      textValue_(right.itemId),
      "es",
    );

    if (itemComparison !== 0) {
      return itemComparison;
    }

    return Number(left.sequence) - Number(right.sequence);
  });
}

function replaceJiraStatusHistoryRows_(
  sheet,
  headers,
  processedItemIds,
  newRows,
) {
  const currentRows = sheetToObjects_(sheet);

  const preservedRows = currentRows.filter(
    (row) => !processedItemIds.has(textValue_(row.itemId)),
  );

  const finalRows = sortJiraStatusHistoryRows_([...preservedRows, ...newRows]);

  const lastColumn = sheet.getLastColumn();

  const oldLastRow = sheet.getLastRow();

  const oldValues =
    oldLastRow > 1
      ? sheet.getRange(2, 1, oldLastRow - 1, lastColumn).getValues()
      : [];

  try {
    if (oldLastRow > 1) {
      sheet.getRange(2, 1, oldLastRow - 1, lastColumn).clearContent();
    }

    if (finalRows.length) {
      const values = jiraStatusHistoryObjectsToValues_(finalRows, headers);

      sheet.getRange(2, 1, values.length, headers.length).setValues(values);
    }

    SpreadsheetApp.flush();
  } catch (error) {
    /*
     * Intentamos restaurar el estado
     * anterior si la escritura falla.
     */
    const currentLastRow = sheet.getLastRow();

    if (currentLastRow > 1) {
      sheet.getRange(2, 1, currentLastRow - 1, lastColumn).clearContent();
    }

    if (oldValues.length) {
      sheet
        .getRange(2, 1, oldValues.length, oldValues[0].length)
        .setValues(oldValues);

      SpreadsheetApp.flush();
    }

    throw error;
  }

  return {
    preserved: preservedRows.length,

    written: newRows.length,

    total: finalRows.length,
  };
}

/* =========================================================
 * ACTUALIZACIÓN MANUAL JIRA / MSA
 *
 * Flujo:
 *
 * 1. Lee todos los roadmapItems type=msa
 *    que tengan jiraKey.
 *
 * 2. Localiza el último HTML de cada E2E.
 *
 * 3. Parsea TODOS los ficheros.
 *
 * 4. Si uno falla:
 *    NO escribe nada.
 *
 * 5. Si todos son válidos:
 *    sustituye de una sola vez el histórico
 *    de los MSA procesados.
 *
 * getAppData() NO llama a esta función.
 * ========================================================= */

function refreshJiraMsaData() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  const lock = LockService.getDocumentLock();

  if (!lock.tryLock(1000)) {
    spreadsheet.toast(
      "Ya hay una actualización JIRA / MSA en curso.",
      "AIxBanker",
      6,
    );

    return;
  }

  try {
    spreadsheet.toast(
      "Procesando históricos JIRA de los MSA...",
      "AIxBanker",
      6,
    );

    const historySheet = getJiraStatusHistorySheet_(spreadsheet);

    const historyHeaders = validateJiraStatusHistorySheet_(historySheet);

    const roadmapItems = getJiraMsaRoadmapItems_(spreadsheet);

    if (!roadmapItems.length) {
      throw new Error(
        "No hay ningún roadmapItem de tipo MSA con jiraKey informada.",
      );
    }

    /*
     * Detectamos duplicados de jiraKey
     * antes de abrir Drive.
     */
    const jiraKeys = new Set();

    roadmapItems.forEach((roadmapItem) => {
      const identity = validateJiraMsaRoadmapItem_(roadmapItem);

      if (jiraKeys.has(identity.jiraKey)) {
        throw new Error(
          `La jiraKey "${identity.jiraKey}" ` +
            `está asociada a más de un MSA.`,
        );
      }

      jiraKeys.add(identity.jiraKey);
    });

    const pendingRows = [];

    const processedItemIds = new Set();

    const summaries = [];

    const failures = [];

    /*
     * =====================================================
     * FASE 1
     *
     * Procesamos absolutamente todos
     * los MSA antes de escribir nada.
     * =====================================================
     */
    roadmapItems.forEach((roadmapItem) => {
      const identity = validateJiraMsaRoadmapItem_(roadmapItem);

      try {
        const file = findJiraE2EFileByKey_(identity.jiraKey);

        const html = readJiraE2EHtml_(file);

        const parsed = parseJiraE2EHtml_(html, identity.jiraKey);

        validateParsedJiraForPublication_(identity.jiraKey, parsed);

        const historyRows = buildJiraStatusHistoryRows_(
          roadmapItem,
          file,
          parsed,
        );

        pendingRows.push(...historyRows);

        processedItemIds.add(identity.itemId);

        summaries.push({
          itemId: identity.itemId,

          jiraKey: identity.jiraKey,

          name: textValue_(roadmapItem.name || roadmapItem.title),

          currentStatus: parsed.currentStatus,

          intervals: historyRows.length,

          sourceFile: file.getName(),

          sourceUpdatedAt: file.getLastUpdated().toISOString(),
        });
      } catch (error) {
        failures.push({
          itemId: identity.itemId,

          jiraKey: identity.jiraKey,

          message: error && error.message ? error.message : String(error),
        });
      }
    });

    /*
     * =====================================================
     * PUBLICACIÓN ATÓMICA
     *
     * Si falla cualquier MSA:
     *
     * - no modificamos la pestaña;
     * - mantenemos el último histórico válido.
     * =====================================================
     */
    if (failures.length) {
      const detail = failures
        .map(
          (failure) =>
            `${failure.jiraKey} ` +
            `(${failure.itemId}): ` +
            `${failure.message}`,
        )
        .join("\n");

      throw new Error(
        "No se ha actualizado ningún histórico JIRA " +
          "porque hay MSA que no se han podido procesar:\n\n" +
          detail,
      );
    }

    /*
     * =====================================================
     * FASE 2
     *
     * Sólo después de validar todo
     * escribimos en Sheets.
     * =====================================================
     */
    const result = replaceJiraStatusHistoryRows_(
      historySheet,
      historyHeaders,
      processedItemIds,
      pendingRows,
    );

    SpreadsheetApp.flush();

    spreadsheet.toast(
      [
        `MSA procesados: ${summaries.length}`,
        `Estados escritos: ${result.written}`,
      ].join(" · "),
      "Datos JIRA / MSA actualizados",
      10,
    );

    Logger.log("========================================");

    Logger.log("JIRA / MSA REFRESH");

    Logger.log("========================================");

    Logger.log(JSON.stringify(summaries, null, 2));

    Logger.log("");

    Logger.log(`Filas nuevas: ${result.written}`);

    Logger.log(`Filas preservadas: ${result.preserved}`);

    Logger.log(`Filas totales: ${result.total}`);

    Logger.log("========================================");

    return {
      msasProcessed: summaries.length,

      historyRowsWritten: result.written,

      historyRowsPreserved: result.preserved,

      historyRowsTotal: result.total,

      items: summaries,
    };
  } catch (error) {
    const message = error && error.message ? error.message : String(error);

    spreadsheet.toast(message, "Error actualizando JIRA / MSA", 10);

    console.error(error);

    throw error;
  } finally {
    lock.releaseLock();
  }
}
/* =========================================================
 * TEST AISLADO DEL PARSER JIRA
 *
 * IMPORTANTE:
 *
 * Esta función:
 *
 * - NO modifica roadmapItems;
 * - NO escribe roadmapItemStatusHistory;
 * - NO modifica el cockpit;
 * - sólo escribe en Logger.
 * ========================================================= */

function testJiraE2EParser() {
  const jiraKey = getRequiredScriptProperty_(
    JIRA_E2E_SCRIPT_PROPERTIES.testKey,
  ).toUpperCase();

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  const roadmapItem = findRoadmapItemByJiraKey_(spreadsheet, jiraKey);

  const file = findJiraE2EFileByKey_(jiraKey);

  const html = readJiraE2EHtml_(file);

  const parsed = parseJiraE2EHtml_(html, jiraKey);

  Logger.log("========================================");

  Logger.log("JIRA E2E PARSER TEST");

  Logger.log("========================================");

  Logger.log(`Roadmap item: ${textValue_(roadmapItem.id)}`);

  Logger.log(
    `Nombre cockpit: ${textValue_(roadmapItem.name || roadmapItem.title)}`,
  );

  Logger.log(`Tipo: ${textValue_(roadmapItem.type)}`);

  Logger.log(`JIRA: ${jiraKey}`);

  Logger.log(`Fichero: ${file.getName()}`);

  Logger.log(
    `Última modificación Drive: ${file.getLastUpdated().toISOString()}`,
  );

  Logger.log(`Creado: ${parsed.createdAt}`);

  Logger.log(`Estado actual: ${parsed.currentStatus}`);

  Logger.log(`Histórico aparentemente completo: ${parsed.historyComplete}`);

  Logger.log(`Transiciones reales: ${parsed.transitionCount}`);

  Logger.log("");

  Logger.log("=== TRANSICIONES ===");

  Logger.log(JSON.stringify(parsed.transitions, null, 2));

  Logger.log("");

  Logger.log("=== INTERVALOS ===");

  Logger.log(JSON.stringify(parsed.intervals, null, 2));

  if (parsed.warnings.length) {
    Logger.log("");

    Logger.log("=== AVISOS ===");

    parsed.warnings.forEach((warning) => Logger.log(`- ${warning}`));
  }

  Logger.log("========================================");

  return parsed;
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
function testRoadmapActivitiesPayload() {
  const data = getAppData();

  const activities = Array.isArray(data.roadmapItemActivities)
    ? data.roadmapItemActivities
    : [];

  const discourseActivities = activities.filter(
    (row) => textValue_(row.itemId) === "discurso-personalizado",
  );

  const activityGroups = [
    ...new Set(
      discourseActivities
        .map((row) => textValue_(row.activityId))
        .filter(Boolean),
    ),
  ];

  Logger.log("========================================");

  Logger.log("ROADMAP ACTIVITIES PAYLOAD TEST");

  Logger.log("========================================");

  Logger.log(`Total roadmapItemActivities: ${activities.length}`);

  Logger.log(`discurso-personalizado: ${discourseActivities.length}`);

  Logger.log(`Actividades agrupadas: ${activityGroups.length}`);

  Logger.log(JSON.stringify(activityGroups, null, 2));

  Logger.log("Primeras filas:");

  Logger.log(JSON.stringify(discourseActivities.slice(0, 5), null, 2));

  Logger.log("========================================");

  return {
    total: activities.length,

    discourse: discourseActivities.length,

    groups: activityGroups.length,

    activityGroups,
  };
}
function testOnDemandDatasets() {
  function measure_(name, callback) {
    const startedAt = Date.now();

    const data = callback();

    const elapsedMs = Date.now() - startedAt;

    const json = JSON.stringify(data);

    const result = {
      dataset: name,

      elapsedMs,

      bytes: json.length,

      kilobytes: Math.round(json.length / 1024),
    };

    Logger.log(JSON.stringify(result, null, 2));

    return result;
  }

  const results = [];

  results.push(measure_("core", () => getCoreAppData_()));

  results.push(measure_("jira-features", () => getJiraFeaturesData_()));

  Logger.log("========================================");

  Logger.log("ON-DEMAND DATASETS");

  Logger.log("========================================");

  Logger.log(JSON.stringify(results, null, 2));

  Logger.log("========================================");

  return results;
}
function testGetJiraMsaData() {
  const result = getJiraMsaData_();

  Logger.log("========================================");

  Logger.log("JIRA MSA DATASET TEST");

  Logger.log("========================================");

  Logger.log("Dataset: %s", result.dataset);

  Logger.log(
    "Filas: %s",
    Array.isArray(result.roadmapItemStatusHistory)
      ? result.roadmapItemStatusHistory.length
      : 0,
  );

  Logger.log(
    JSON.stringify(
      (result.roadmapItemStatusHistory || []).slice(0, 3),
      null,
      2,
    ),
  );

  Logger.log("========================================");
}

/* =========================================================
 * MANAGEMENT ROADMAP LINKS
 *
 * Persistencia de las asociaciones:
 *
 * Deliverable ejecutivo
 *        ↓
 * SDA
 *        ↓
 * Deliverable SDA
 *
 * Las Features NO se almacenan aquí.
 * Se resuelven automáticamente desde JIRA.
 * ========================================================= */

/* =========================================================
 * MANAGEMENT ROADMAP LINKS
 * ========================================================= */

const MANAGEMENT_ROADMAP_LINKS_SHEET_NAME = "Management Roadmap Links";

const MANAGEMENT_ROADMAP_LINKS_HEADERS = [
  "executiveLineId",
  "sdaId",
  "deliverableId",
  "active",
];

/* =========================================================
 * WEB APP · ESCRITURA
 * ========================================================= */

function doPost(e) {
  try {
    const body = parseManagementRoadmapPostBody_(e);

    const action = String(body.action || "")
      .trim()
      .toLowerCase();

    let result = null;

    switch (action) {
      case "save-management-roadmap-links":
        result = saveManagementRoadmapLinks_(body.links);

        break;

      case "save-management-roadmap-lines":
        result = saveManagementRoadmapLines_(body.lines);

        break;

      case "delete-management-roadmap-line":
        result = deleteManagementRoadmapLine_(body.lineId);

        break;

      default:
        throw new Error(`Acción no soportada: ${action || "(vacía)"}`);
    }

    return createManagementRoadmapJsonResponse_({
      ok: true,

      action,

      saved: result?.saved || 0,

      deleted: result?.deleted || 0,

      deletedLinks: result?.deletedLinks || 0,

      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);

    return createManagementRoadmapJsonResponse_({
      ok: false,

      error: error?.message || String(error),

      generatedAt: new Date().toISOString(),
    });
  }
}

/* =========================================================
 * BODY
 * ========================================================= */

function parseManagementRoadmapPostBody_(e) {
  const contents = String(e?.postData?.contents || "").trim();

  if (contents) {
    try {
      return JSON.parse(contents);
    } catch (error) {
      throw new Error("El body recibido no contiene JSON válido.");
    }
  }

  const payload = String(e?.parameter?.payload || "").trim();

  if (payload) {
    try {
      return JSON.parse(payload);
    } catch (error) {
      throw new Error("El parámetro payload no contiene JSON válido.");
    }
  }

  return {};
}

/* =========================================================
 * RESPONSE
 * ========================================================= */

function createManagementRoadmapJsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

/* =========================================================
 * NORMALIZACIÓN
 * ========================================================= */

function normalizeManagementRoadmapLinkRow_(row) {
  const executiveLineId = String(row?.executiveLineId || "").trim();

  const sdaId = String(row?.sdaId || "").trim();

  const deliverableId = String(row?.deliverableId || "").trim();

  /*
   * Las filas incompletas antiguas
   * no deben bloquear toda la escritura.
   *
   * Ejemplo actual:
   *
   * es-blue-buddy-competidores
   * SDA informada
   * deliverableId vacío
   *
   * Esa fila simplemente desaparece
   * en la siguiente publicación.
   */
  if (!executiveLineId || !sdaId || !deliverableId) {
    return null;
  }

  const activeText = String(row?.active ?? true)
    .trim()
    .toLowerCase();

  const active = !["false", "0", "no", "off"].includes(activeText);

  return {
    executiveLineId,

    sdaId,

    deliverableId,

    active,
  };
}

/* =========================================================
 * DEDUPLICACIÓN
 * ========================================================= */

function deduplicateManagementRoadmapLinks_(rows) {
  const result = new Map();

  (Array.isArray(rows) ? rows : [])
    .map(normalizeManagementRoadmapLinkRow_)
    .filter(Boolean)
    .forEach((row) => {
      const key = [
        row.executiveLineId.trim().toLowerCase(),

        row.sdaId.trim().toUpperCase(),

        row.deliverableId.trim().toUpperCase(),
      ].join("::");

      result.set(key, row);
    });

  return [...result.values()];
}

/* =========================================================
 * SHEET
 * ========================================================= */

function getOrCreateManagementRoadmapLinksSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  let sheet = spreadsheet.getSheetByName(MANAGEMENT_ROADMAP_LINKS_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(MANAGEMENT_ROADMAP_LINKS_SHEET_NAME);
  }

  return sheet;
}

/* =========================================================
 * SAVE
 * ========================================================= */

function saveManagementRoadmapLinks_(rawLinks) {
  const links = deduplicateManagementRoadmapLinks_(rawLinks);

  const lock = LockService.getDocumentLock();

  if (!lock.tryLock(5000)) {
    throw new Error(
      "Hay otra actualización de relaciones en curso. Inténtalo de nuevo.",
    );
  }

  try {
    const sheet = getOrCreateManagementRoadmapLinksSheet_();

    /*
     * La pestaña representa una fotografía
     * completa del mapping.
     *
     * Reescribirla permite que eliminar
     * una relación desde el cockpit
     * realmente la elimine del origen.
     */
    sheet.clearContents();

    sheet
      .getRange(1, 1, 1, MANAGEMENT_ROADMAP_LINKS_HEADERS.length)
      .setValues([MANAGEMENT_ROADMAP_LINKS_HEADERS]);

    if (links.length) {
      const values = links.map((link) => [
        link.executiveLineId,

        link.sdaId,

        link.deliverableId,

        link.active,
      ]);

      sheet
        .getRange(2, 1, values.length, MANAGEMENT_ROADMAP_LINKS_HEADERS.length)
        .setValues(values);
    }

    SpreadsheetApp.flush();

    return {
      saved: links.length,

      links,
    };
  } finally {
    lock.releaseLock();
  }
}

/* =========================================================
 * TEST
 * ========================================================= */

function testManagementRoadmapLinks() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = spreadsheet.getSheetByName(MANAGEMENT_ROADMAP_LINKS_SHEET_NAME);

  const rows = sheet ? sheetToObjects_(sheet) : [];

  Logger.log("========================================");

  Logger.log("MANAGEMENT ROADMAP LINKS");

  Logger.log("========================================");

  Logger.log(`Relaciones: ${rows.length}`);

  Logger.log(JSON.stringify(rows, null, 2));

  Logger.log("========================================");

  return rows;
}
/* =========================================================
 * MANAGEMENT ROADMAP LINES
 * ========================================================= */

const MANAGEMENT_ROADMAP_LINES_SHEET_NAME = "Management Roadmap Lines";

const MANAGEMENT_ROADMAP_LINES_HEADERS = [
  "id",
  "programId",
  "productId",
  "country",
  "year",
  "order",
  "category",
  "categoryTone",
  "title",
  "status",
  "statusLabel",
  "statusTone",
  "comments",
  "active",
];

/* =========================================================
 * NORMALIZACIÓN
 * ========================================================= */

function normalizeManagementRoadmapLineRow_(row) {
  const id = String(row?.id || "").trim();

  if (!id) {
    return null;
  }

  const title = String(row?.title || "").trim();

  if (!title) {
    return null;
  }

  return {
    id,

    programId: String(row?.programId || "")
      .trim()
      .toLowerCase(),

    productId: String(row?.productId || "")
      .trim()
      .toLowerCase(),

    country: String(row?.country || "")
      .trim()
      .toUpperCase(),

    year: Number(row?.year) || "",

    order: Number(row?.order) || 999,

    category: String(row?.category || "").trim(),

    categoryTone: String(row?.categoryTone || "").trim(),

    title,

    status: String(row?.status || "").trim(),

    statusLabel: String(row?.statusLabel || "").trim(),

    statusTone: String(row?.statusTone || "").trim(),

    comments: String(row?.comments || "").trim(),

    active: !["false", "0", "no", "off"].includes(
      String(row?.active ?? true)
        .trim()
        .toLowerCase(),
    ),
  };
}

/* =========================================================
 * DEDUPLICACIÓN
 * ========================================================= */

function deduplicateManagementRoadmapLines_(rows) {
  const result = new Map();

  (Array.isArray(rows) ? rows : [])
    .map(normalizeManagementRoadmapLineRow_)
    .filter(Boolean)
    .forEach((row) => {
      result.set(row.id.trim().toLowerCase(), row);
    });

  return [...result.values()].sort(
    (left, right) => Number(left.order || 999) - Number(right.order || 999),
  );
}

/* =========================================================
 * SHEET
 * ========================================================= */

function getOrCreateManagementRoadmapLinesSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  let sheet = spreadsheet.getSheetByName(MANAGEMENT_ROADMAP_LINES_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(MANAGEMENT_ROADMAP_LINES_SHEET_NAME);
  }

  return sheet;
}

/* =========================================================
 * SAVE
 * ========================================================= */

function saveManagementRoadmapLines_(rawLines) {
  const lines = deduplicateManagementRoadmapLines_(rawLines);

  const lock = LockService.getDocumentLock();

  if (!lock.tryLock(5000)) {
    throw new Error(
      "Hay otra actualización del Roadmap en curso. Inténtalo de nuevo.",
    );
  }

  try {
    const sheet = getOrCreateManagementRoadmapLinesSheet_();

    sheet.clearContents();

    sheet
      .getRange(1, 1, 1, MANAGEMENT_ROADMAP_LINES_HEADERS.length)
      .setValues([MANAGEMENT_ROADMAP_LINES_HEADERS]);

    if (lines.length) {
      const values = lines.map((line) => [
        line.id,
        line.programId,
        line.productId,
        line.country,
        line.year,
        line.order,
        line.category,
        line.categoryTone,
        line.title,
        line.status,
        line.statusLabel,
        line.statusTone,
        line.comments,
        line.active,
      ]);

      sheet
        .getRange(2, 1, values.length, MANAGEMENT_ROADMAP_LINES_HEADERS.length)
        .setValues(values);
    }

    SpreadsheetApp.flush();

    return {
      saved: lines.length,

      lines,
    };
  } finally {
    lock.releaseLock();
  }
}

/* =========================================================
 * TEST
 * ========================================================= */

function testManagementRoadmapLines() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = spreadsheet.getSheetByName(MANAGEMENT_ROADMAP_LINES_SHEET_NAME);

  const rows = sheet ? sheetToObjects_(sheet) : [];

  Logger.log("========================================");

  Logger.log("MANAGEMENT ROADMAP LINES");

  Logger.log("========================================");

  Logger.log(`Filas: ${rows.length}`);

  Logger.log(JSON.stringify(rows, null, 2));

  return rows;
}
function deleteManagementRoadmapLine_(lineId) {
  const normalizedLineId = String(lineId || "").trim();

  if (!normalizedLineId) {
    throw new Error("No se ha recibido el ID del deliverable.");
  }

  const lock = LockService.getDocumentLock();

  if (!lock.tryLock(5000)) {
    throw new Error(
      "Hay otra actualización del Roadmap en curso. Inténtalo de nuevo.",
    );
  }

  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    /*
     * =====================================================
     * MANAGEMENT ROADMAP LINES
     * =====================================================
     */

    const linesSheet = spreadsheet.getSheetByName(
      MANAGEMENT_ROADMAP_LINES_SHEET_NAME,
    );

    const currentLines = linesSheet ? sheetToObjects_(linesSheet) : [];

    const normalizedLowerId = normalizedLineId.toLowerCase();

    const nextLines = currentLines.filter(
      (line) =>
        String(line.id || "")
          .trim()
          .toLowerCase() !== normalizedLowerId,
    );

    const deleted = currentLines.length - nextLines.length;

    if (linesSheet) {
      linesSheet.clearContents();

      linesSheet
        .getRange(1, 1, 1, MANAGEMENT_ROADMAP_LINES_HEADERS.length)
        .setValues([MANAGEMENT_ROADMAP_LINES_HEADERS]);

      if (nextLines.length) {
        const values = nextLines.map((line) => [
          line.id,
          line.programId,
          line.productId,
          line.country,
          line.year,
          line.order,
          line.category,
          line.categoryTone,
          line.title,
          line.status,
          line.statusLabel,
          line.statusTone,
          line.comments,
          line.active,
        ]);

        linesSheet
          .getRange(
            2,
            1,
            values.length,
            MANAGEMENT_ROADMAP_LINES_HEADERS.length,
          )
          .setValues(values);
      }
    }

    /*
     * =====================================================
     * MANAGEMENT ROADMAP LINKS
     *
     * También eliminamos todas las relaciones SDA
     * asociadas al deliverable ejecutivo.
     * =====================================================
     */

    const linksSheet = spreadsheet.getSheetByName(
      MANAGEMENT_ROADMAP_LINKS_SHEET_NAME,
    );

    const currentLinks = linksSheet ? sheetToObjects_(linksSheet) : [];

    const nextLinks = currentLinks.filter(
      (link) =>
        String(link.executiveLineId || "")
          .trim()
          .toLowerCase() !== normalizedLowerId,
    );

    const deletedLinks = currentLinks.length - nextLinks.length;

    if (linksSheet) {
      linksSheet.clearContents();

      linksSheet
        .getRange(1, 1, 1, MANAGEMENT_ROADMAP_LINKS_HEADERS.length)
        .setValues([MANAGEMENT_ROADMAP_LINKS_HEADERS]);

      if (nextLinks.length) {
        const values = nextLinks.map((link) => [
          link.executiveLineId,
          link.sdaId,
          link.deliverableId,
          link.active,
        ]);

        linksSheet
          .getRange(
            2,
            1,
            values.length,
            MANAGEMENT_ROADMAP_LINKS_HEADERS.length,
          )
          .setValues(values);
      }
    }

    SpreadsheetApp.flush();

    return {
      deleted,

      deletedLinks,
    };
  } finally {
    lock.releaseLock();
  }
}
function validateSnapshotUser_() {
  const email = String(Session.getActiveUser().getEmail() || "")
    .trim()
    .toLowerCase();

  if (!email) {
    throw new Error("No se ha podido identificar al usuario conectado.");
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  const spreadsheetFile = DriveApp.getFileById(spreadsheet.getId());

  const allowedEmails = new Set();

  spreadsheetFile.getEditors().forEach((user) => {
    const userEmail = String(user.getEmail() || "")
      .trim()
      .toLowerCase();

    if (userEmail) {
      allowedEmails.add(userEmail);
    }
  });

  spreadsheetFile.getViewers().forEach((user) => {
    const userEmail = String(user.getEmail() || "")
      .trim()
      .toLowerCase();

    if (userEmail) {
      allowedEmails.add(userEmail);
    }
  });

  /*
   * El propietario también debe estar autorizado.
   */

  const ownerEmail = String(spreadsheetFile.getOwner()?.getEmail() || "")
    .trim()
    .toLowerCase();

  if (ownerEmail) {
    allowedEmails.add(ownerEmail);
  }

  if (!allowedEmails.has(email)) {
    throw new Error("ACCESS_DENIED");
  }

  return {
    email,
    granted: true,
  };
}
function buildSnapshotAccess_(spreadsheet) {
  if (!spreadsheet) {
    throw new Error(
      "No se ha informado la Spreadsheet para construir permisos.",
    );
  }

  const spreadsheetId = spreadsheet.getId();

  const response = Drive.Permissions.list(spreadsheetId, {
    supportsAllDrives: true,

    fields: "permissions(id,type,role,emailAddress,domain)",
  });

  const permissions = Array.isArray(response?.permissions)
    ? response.permissions
    : [];

  const users = {};

  const domains = {};

  const groups = [];

  permissions.forEach((permission) => {
    const role = snapshotPermissionRole_(permission.role);

    if (!role) {
      return;
    }

    const type = String(permission.type || "")
      .trim()
      .toLowerCase();

    const email = String(permission.emailAddress || "")
      .trim()
      .toLowerCase();

    const domain = String(permission.domain || "")
      .trim()
      .toLowerCase();

    if (type === "user" && email) {
      users[email] = strongerSnapshotRole_(users[email], role);

      return;
    }

    if (type === "domain" && domain) {
      domains[domain] = strongerSnapshotRole_(domains[domain], role);

      return;
    }

    if (type === "group" && email) {
      groups.push({
        email,
        role,
      });
    }
  });

  return {
    generatedAt: new Date().toISOString(),

    sourceSpreadsheetId: spreadsheetId,

    users,

    domains,

    /*
     * Guardamos también los grupos para
     * trazabilidad.
     *
     * La resolución automática inicial
     * será para usuarios y dominios.
     */

    groups,
  };
}

function snapshotPermissionRole_(driveRole) {
  const role = String(driveRole || "")
    .trim()
    .toLowerCase();

  if (["owner", "organizer", "fileorganizer", "writer"].includes(role)) {
    return "editor";
  }

  if (["commenter", "reader"].includes(role)) {
    return "viewer";
  }

  return "";
}

function strongerSnapshotRole_(currentRole, newRole) {
  if (currentRole === "editor" || newRole === "editor") {
    return "editor";
  }

  if (currentRole === "viewer" || newRole === "viewer") {
    return "viewer";
  }

  return "";
}
function resolveSnapshotRole_(snapshot, email) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (!normalizedEmail) {
    return "";
  }

  const access = snapshot?.access;

  if (!access || typeof access !== "object") {
    return "";
  }

  const directRole = String(access.users?.[normalizedEmail] || "")
    .trim()
    .toLowerCase();

  if (directRole === "editor" || directRole === "viewer") {
    return directRole;
  }

  const domain = normalizedEmail.split("@").at(-1);

  const domainRole = String(access.domains?.[domain] || "")
    .trim()
    .toLowerCase();

  if (domainRole === "editor" || domainRole === "viewer") {
    return domainRole;
  }

  return "";
}
function verifyIdentityToken_(token) {
  const normalizedToken = String(token || "").trim();

  if (!normalizedToken) {
    throw new Error("IDENTITY_REQUIRED");
  }

  const parts = normalizedToken.split(".");

  if (parts.length !== 2) {
    throw new Error("INVALID_IDENTITY_TOKEN");
  }

  const [encodedPayload, providedSignature] = parts;

  const expectedSignature = signSnapshotIdentityPayload_(encodedPayload);

  if (providedSignature !== expectedSignature) {
    throw new Error("INVALID_IDENTITY_TOKEN");
  }

  let payload;

  try {
    payload = JSON.parse(base64UrlDecode_(encodedPayload));
  } catch {
    throw new Error("INVALID_IDENTITY_TOKEN");
  }

  const email = String(payload?.email || "")
    .trim()
    .toLowerCase();

  const expiresAt = Number(payload?.exp || 0);

  if (!email || !expiresAt) {
    throw new Error("INVALID_IDENTITY_TOKEN");
  }

  const now = Math.floor(Date.now() / 1000);

  if (expiresAt <= now) {
    throw new Error("IDENTITY_EXPIRED");
  }

  if (!email.endsWith("@bbva.com")) {
    throw new Error("INVALID_DOMAIN");
  }

  return {
    email,
    expiresAt,
  };
}

function signSnapshotIdentityPayload_(payload) {
  const secret = getSnapshotIdentitySecret_();

  const signature = Utilities.computeHmacSha256Signature(payload, secret);

  return Utilities.base64EncodeWebSafe(signature).replace(/=+$/g, "");
}

function getSnapshotIdentitySecret_() {
  const secret = String(
    PropertiesService.getScriptProperties().getProperty(
      RCS_ACCESS_TOKEN_SECRET_PROPERTY,
    ) || "",
  ).trim();

  if (!secret) {
    throw new Error(
      `Falta la Script Property ${RCS_ACCESS_TOKEN_SECRET_PROPERTY}.`,
    );
  }

  return secret;
}

function base64UrlDecode_(value) {
  const bytes = Utilities.base64DecodeWebSafe(String(value || ""));

  return Utilities.newBlob(bytes).getDataAsString("UTF-8");
}
function refreshAllSourcesAndExport() {
  const startedAt = new Date();

  Logger.log("========================================");

  Logger.log("AIXBANKER · FULL REFRESH");

  Logger.log("========================================");

  /*
   * =====================================================
   * SDA
   * =====================================================
   */

  refreshSdaGeneralData();

  /*
   * =====================================================
   * JIRA FEATURES
   * =====================================================
   */

  refreshJiraWorkspaceFeatures();

  /*
   * =====================================================
   * JIRA MSA
   * =====================================================
   */

  refreshJiraMsaData();

  /*
   * =====================================================
   * STAFFING
   * =====================================================
   */

  refreshStaffingData();

  /*
   * =====================================================
   * SNAPSHOT
   * =====================================================
   */

  const result = exportPortfolioJson();

  Logger.log(
    `Refresh completo finalizado en ${
      new Date().getTime() - startedAt.getTime()
    } ms`,
  );

  return result;
}
function getPortfolioSnapshotFile_() {
  const properties = PropertiesService.getScriptProperties();

  const configuredFileId = String(
    properties.getProperty(EXPORT_FILE_ID_PROPERTY) || "",
  ).trim();

  /*
   * =====================================================
   * FAST PATH · FILE ID
   * =====================================================
   */

  if (configuredFileId) {
    try {
      const file = DriveApp.getFileById(configuredFileId);

      if (file && !file.isTrashed()) {
        return file;
      }
    } catch (error) {
      console.warn("[Snapshot] El File ID guardado ya no es válido.", error);

      properties.deleteProperty(EXPORT_FILE_ID_PROPERTY);
    }
  }

  /*
   * =====================================================
   * FALLBACK · CARPETA + NOMBRE
   * =====================================================
   */

  const folders = DriveApp.getFoldersByName(EXPORT_FOLDER_NAME);

  if (!folders.hasNext()) {
    return null;
  }

  const folder = folders.next();

  const files = folder.getFilesByName(EXPORT_FILE_NAME);

  if (!files.hasNext()) {
    return null;
  }

  const file = files.next();

  properties.setProperty(EXPORT_FILE_ID_PROPERTY, file.getId());

  return file;
}

function getPortfolioSnapshot_() {
  const file = getPortfolioSnapshotFile_();

  if (!file) {
    return null;
  }

  const content = String(file.getBlob().getDataAsString("UTF-8") || "").trim();

  if (!content) {
    return null;
  }

  let snapshot;

  try {
    snapshot = JSON.parse(content);
  } catch (error) {
    console.warn("[Snapshot] El JSON almacenado no es válido.", error);

    return null;
  }

  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }

  if (
    String(snapshot.dataset || "")
      .trim()
      .toLowerCase() !== "full-export"
  ) {
    return null;
  }

  return snapshot;
}

function getOrBuildPortfolioSnapshot_() {
  /*
   * =====================================================
   * L2 CACHE · DRIVE JSON
   * =====================================================
   */

  const snapshot = getPortfolioSnapshot_();

  if (snapshot) {
    Logger.log("Snapshot existente encontrado. No se ejecutan importaciones.");

    return snapshot;
  }

  /*
   * =====================================================
   * CACHE MISS
   * =====================================================
   *
   * Sólo llegamos aquí si:
   *
   * - no existe el JSON;
   * - está vacío;
   * - está corrupto;
   * - o no es full-export.
   */

  Logger.log("No existe un snapshot válido. Se ejecutará refresh completo.");

  const result = refreshAllSourcesAndExport();

  if (result?.snapshot && typeof result.snapshot === "object") {
    return result.snapshot;
  }

  const generatedSnapshot = getPortfolioSnapshot_();

  if (!generatedSnapshot) {
    throw new Error(
      "El refresh ha finalizado pero no se ha podido recuperar el snapshot generado.",
    );
  }

  return generatedSnapshot;
}
