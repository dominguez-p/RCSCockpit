/*
 * =========================================================
 * SDA IMPORT - GENERAL
 * =========================================================
 *
 * Fuente:
 * PDFs exportados desde SDA y almacenados en una carpeta
 * de Google Drive.
 *
 * Destino:
 *
 * - sda_flights
 * - sda_deliverables
 *
 * IMPORTANTE:
 *
 * Este fichero NO escribe información financiera,
 * costes ni capacidad sensible.
 *
 * La información sensible pertenece exclusivamente
 * al Apps Script / Spreadsheet RESTRICTED.
 * =========================================================
 */

const SDA_GENERAL_CONFIG = {
  sourceFolderId: "1z0V4MWzTq8qehLdPqxYgDCCZSmUX4GOf",

  sheets: {
    flights: "sda_flights",
    deliverables: "sda_deliverables",
  },

  programId: "aixbanker",
};

const SDA_FLIGHTS_HEADERS = [
  "programId",
  "productId",
  "year",
  "sdaCode",
  "productName",
  "programName",
  "country",
  "description",
  "rationale",
  "sponsor",
  "productOwner",
  "programManager",
  "engineeringResponsible",
  "startQuarter",
  "endQuarter",
  "sourceFileId",
  "sourceFileName",
  "sourceUpdatedAt",
];

const SDA_DELIVERABLES_HEADERS = [
  "programId",
  "productId",
  "year",
  "sdaCode",

  "deliverableId",
  "deliverableIndex",

  "deliverableType",
  "suiteTags",

  "name",
  "startQuarter",
  "endQuarter",
  "description",

  "beneficiaryCountries",

  "goal",

  "status",
  "statusKey",

  "softwareDeliverable",

  "developmentEndDate",
  "productionDate",
  "clientDate",

  "replanned",
  "delayed",
  "hasBlockedHistory",
  "hasCanceledHistory",

  "trackingCount",
  "lastTrackingType",
  "lastTrackingAt",
  "lastTrackingComment",

  "sourceType",

  "mapSourceFileId",
  "mapSourceFileName",
  "mapSourceUpdatedAt",

  "sourceFileId",
  "sourceFileName",
  "sourceUpdatedAt",
];

/*
 * =========================================================
 * ENTRY POINT
 * =========================================================
 */

function refreshSdaGeneralData() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  const lock = LockService.getDocumentLock();

  if (!lock.tryLock(1000)) {
    spreadsheet.toast("Ya hay una actualización SDA en curso.", "AIxBanker", 6);

    return;
  }

  try {
    spreadsheet.toast("Procesando MAP y SDA Suite...", "AIxBanker", 6);

    const sourceFiles = getSdaPdfFiles_();

    if (!sourceFiles.length) {
      throw new Error(
        "No se han encontrado PDFs SDA en la carpeta configurada.",
      );
    }

    /*
     * =====================================================
     * AGRUPAMOS POR SDA
     * =====================================================
     *
     * Cada SDA puede tener:
     *
     * - 1 MAP PDF
     * - 1 SDA Suite PDF
     *
     * Si existen varias versiones del mismo tipo,
     * utilizamos la más reciente.
     */
    const sourcesBySda = new Map();

    const ignoredFiles = [];

    sourceFiles.forEach((file) => {
      const text = extractSdaPdfText_(file);

      const sourceType = detectSdaPdfSourceType_(file, text);

      if (sourceType === "unknown") {
        ignoredFiles.push(file.getName());

        return;
      }

      const sdaCode = extractSdaCode_(text, file.getName());

      if (!sourcesBySda.has(sdaCode)) {
        sourcesBySda.set(sdaCode, {
          map: null,
          suite: null,
        });
      }

      const bucket = sourcesBySda.get(sdaCode);

      const candidate = {
        file,
        text,

        updatedAt: file.getLastUpdated().getTime(),
      };

      const current = bucket[sourceType];

      if (!current || candidate.updatedAt > current.updatedAt) {
        bucket[sourceType] = candidate;
      }
    });

    const flights = [];

    const deliverables = [];

    const diagnostics = [];

    sourcesBySda.forEach((sources, sdaCode) => {
      /*
       * =================================================
       * MAP
       * =================================================
       */
      let mapParsed = null;

      if (sources.map) {
        mapParsed = parseSdaGeneralDocument_(
          sources.map.file,
          sources.map.text,
        );

        flights.push(mapParsed.flight);
      }

      const mapDeliverables = Array.isArray(mapParsed?.deliverables)
        ? mapParsed.deliverables
        : [];

      /*
       * =================================================
       * SDA SUITE PDF
       * =================================================
       */
      const suiteDeliverables = sources.suite
        ? extractSdaSuiteDeliverables_(
            sources.suite.file,
            sources.suite.text,
            sdaCode,
          )
        : [];

      /*
       * =================================================
       * FUENTE FINAL DE DELIVERABLES
       * =================================================
       *
       * SDA Suite manda cuando existe.
       *
       * MAP queda como complemento para campos
       * como Goal y trazabilidad del origen anterior.
       */
      const finalDeliverables = suiteDeliverables.length
        ? mergeSdaSuiteAndMapDeliverables_(suiteDeliverables, mapDeliverables)
        : mapDeliverables.map((row) => normalizeMapOnlySdaDeliverable_(row));

      finalDeliverables.forEach((row) => {
        deliverables.push(row);
      });

      /*
       * El caso normal debe tener MAP.
       *
       * Este fallback evita perder completamente
       * el producto si algún día sólo queda Suite.
       */
      if (!mapParsed && suiteDeliverables.length) {
        flights.push(
          buildSdaFlightFromSuite_(
            sdaCode,
            suiteDeliverables,
            sources.suite.file,
          ),
        );
      }

      diagnostics.push({
        sdaCode,

        map: Boolean(sources.map),

        suite: Boolean(sources.suite),

        mapDeliverables: mapDeliverables.length,

        suiteDeliverables: suiteDeliverables.length,

        finalDeliverables: finalDeliverables.length,
      });
    });

    if (!flights.length) {
      throw new Error("No se ha podido construir ningún flight SDA.");
    }

    if (!deliverables.length) {
      throw new Error("No se ha podido construir ningún deliverable SDA.");
    }

    writeSdaSheet_(
      spreadsheet,
      SDA_GENERAL_CONFIG.sheets.flights,
      SDA_FLIGHTS_HEADERS,
      flights,
    );

    writeSdaSheet_(
      spreadsheet,
      SDA_GENERAL_CONFIG.sheets.deliverables,
      SDA_DELIVERABLES_HEADERS,
      deliverables,
    );

    SpreadsheetApp.flush();

    const suiteCount = diagnostics.filter((item) => item.suite).length;

    spreadsheet.toast(
      [
        `Flights: ${flights.length}`,
        `Deliverables: ${deliverables.length}`,
        `Suite: ${suiteCount}`,
      ].join(" · "),
      "SDA actualizada",
      8,
    );

    Logger.log(
      JSON.stringify(
        {
          files: sourceFiles.length,

          ignoredFiles,

          flights: flights.length,

          deliverables: deliverables.length,

          diagnostics,

          statuses: deliverables.reduce((accumulator, row) => {
            const key = row.statusKey || "sin-estado";

            accumulator[key] = Number(accumulator[key] || 0) + 1;

            return accumulator;
          }, {}),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    const message = error && error.message ? error.message : String(error);

    spreadsheet.toast(message, "Error actualizando SDA", 10);

    console.error(error);

    throw error;
  } finally {
    lock.releaseLock();
  }
}

/*
 * =========================================================
 * DRIVE
 * =========================================================
 */

function getSdaPdfFiles_() {
  const folderId = String(SDA_GENERAL_CONFIG.sourceFolderId || "").trim();

  if (!folderId || folderId === "PEGA_AQUI_ID_CARPETA_SDA") {
    throw new Error("Configura SDA_GENERAL_CONFIG.sourceFolderId.");
  }

  const folder = DriveApp.getFolderById(folderId);

  const files = folder.getFiles();

  const result = [];

  while (files.hasNext()) {
    const file = files.next();

    if (
      file.getMimeType() === MimeType.PDF ||
      String(file.getName() || "")
        .toLowerCase()
        .endsWith(".pdf")
    ) {
      result.push(file);
    }
  }

  return result.sort((left, right) =>
    left.getName().localeCompare(right.getName(), "es"),
  );
}

function extractSdaPdfText_(file) {
  const blob = file.getBlob();

  const resource = {
    name: `${file.getName()} - SDA OCR TEMP`,
    mimeType: "application/vnd.google-apps.document",
  };

  const temporaryDocument = Drive.Files.create(resource, blob);

  try {
    return DocumentApp.openById(temporaryDocument.id).getBody().getText();
  } finally {
    DriveApp.getFileById(temporaryDocument.id).setTrashed(true);
  }
}

/*
 * =========================================================
 * PARSER GENERAL
 * =========================================================
 */

function parseSdaGeneralDocument_(file, rawText) {
  const text = normalizeSdaText_(rawText);

  const sdaCode = extractSdaCode_(text, file.getName());

  const productName = extractSdaProductName_(text, file.getName());

  const productId = normalizeSdaProductId_(productName);

  const year = extractSdaYear_(text);

  /*
   * El nombre del programa es estable en las SDA
   * de AIxBanker.
   *
   * No merece la pena depender del orden OCR
   * de la cabecera para un dato estructural conocido.
   */
  const programName = "R2 AI Banker for Retail";

  const country =
    extractSdaLabelValue_(text, "Country", [
      "Strategic Priority",
      "Transversal tags",
      "End user",
    ]) || "Holding";

  const description = extractSdaSection_(
    text,
    "Description (What & Where)",
    "Project Rationale (Why)",
  );

  const rationale = extractSdaSection_(
    text,
    "Project Rationale (Why)",
    "Deliverables",
  );

  const responsibles = extractSdaResponsibles_(text);

  const planning = extractSdaPlanning_(text, year);

  const sourceUpdatedAt = Utilities.formatDate(
    file.getLastUpdated(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd'T'HH:mm:ss",
  );

  const flight = {
    programId: SDA_GENERAL_CONFIG.programId,

    productId,

    year,

    sdaCode,

    productName: normalizeSdaDisplayProductName_(productName),

    programName,

    country,

    description,

    rationale,

    sponsor: responsibles.sponsor,

    productOwner: responsibles.productOwner,

    programManager: responsibles.programManager,

    engineeringResponsible: responsibles.engineeringResponsible,

    startQuarter: planning.startQuarter,

    endQuarter: planning.endQuarter,

    sourceFileId: file.getId(),

    sourceFileName: file.getName(),

    sourceUpdatedAt,
  };

  const deliverables = extractSdaDeliverables_(text, {
    programId: SDA_GENERAL_CONFIG.programId,

    productId,

    year,

    sdaCode,

    sourceFileId: file.getId(),

    sourceFileName: file.getName(),

    sourceUpdatedAt,
  });

  return {
    flight,
    deliverables,
  };
}

/*
 * =========================================================
 * DELIVERABLES
 * =========================================================
 */

function extractSdaDeliverables_(text, context) {
  const deliverables = [];

  const regex =
    /Deliverable\s+(\d+)\s*:\s*([^\n]+)([\s\S]*?)(?=Deliverable\s+\d+\s*:|Project estimates|Financials & Resources|Validations|$)/gi;

  let match;

  while ((match = regex.exec(text)) !== null) {
    const deliverableId = String(match[1] || "").trim();

    const deliverableType = String(match[2] || "")
      .trim()
      .split(/\s+/)[0]
      .toUpperCase();

    const block = normalizeSdaText_(match[3]);

    const fields = parseSdaDeliverableFields_(block);

    const dateRange = parseSdaQuarterRange_(fields.date, context.year);

    deliverables.push({
      programId: context.programId,

      productId: context.productId,

      year: context.year,

      sdaCode: context.sdaCode,

      deliverableId,

      deliverableType,

      name: fields.name,

      startQuarter: dateRange.startQuarter,

      endQuarter: dateRange.endQuarter,

      description: fields.description,

      beneficiaryCountries: normalizeSdaCountries_(fields.beneficiaryCountries),

      goal: fields.goal,

      status: fields.status,

      statusKey: fields.statusKey,

      sourceFileId: context.sourceFileId,

      sourceFileName: context.sourceFileName,

      sourceUpdatedAt: context.sourceUpdatedAt,
    });
  }

  return deliverables;
}

/*
 * =========================================================
 * IDENTIFICACIÓN
 * =========================================================
 */

function extractSdaCode_(text, fileName) {
  const combined = `${fileName}\n${text}`;

  const match = combined.match(/SDATOOL-\d+/i);

  if (!match) {
    throw new Error(`No se pudo identificar el código SDA en ${fileName}.`);
  }

  return match[0].toUpperCase();
}

function extractSdaProductName_(text, fileName) {
  const firstLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);

  const excluded = [
    "summary",
    "holding",
    "stock",
    "project",
    "current planning",
    "importe/currency",
    "eur",
  ];

  const candidate = firstLines.find((line) => {
    const normalized = line.toLowerCase();

    if (normalized.includes("sdatool-") || normalized === "bbva") {
      return false;
    }

    return !excluded.some((value) => normalized.startsWith(value));
  });

  if (candidate) {
    return candidate;
  }

  const cleanFileName = String(fileName || "").replace(/\.pdf$/i, "");

  if (/54491/i.test(cleanFileName)) {
    return "Blue Buddy";
  }

  if (/55522/i.test(cleanFileName)) {
    return "Franchise (Panorama)";
  }

  return cleanFileName;
}

function extractSdaYear_(text) {
  const matches = [...text.matchAll(/\b(20\d{2})\b/g)].map((match) =>
    Number(match[1]),
  );

  if (!matches.length) {
    return new Date().getFullYear();
  }

  const frequency = {};

  matches.forEach((year) => {
    frequency[year] = Number(frequency[year] || 0) + 1;
  });

  return Number(
    Object.entries(frequency).sort((left, right) => right[1] - left[1])[0][0],
  );
}

function normalizeSdaProductId_(value) {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  if (normalized.includes("blue buddy")) {
    return "blue-buddy";
  }

  if (normalized.includes("panorama")) {
    return "panorama";
  }

  return normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/*
 * =========================================================
 * PLANIFICACIÓN
 * =========================================================
 */

function extractSdaPlanning_(text, year) {
  const match = text.match(/\b([1-4])Q\s+(20\d{2})\s+([1-4])Q\s+(20\d{2})\b/);

  if (!match) {
    return {
      startQuarter: `Q1 ${year}`,
      endQuarter: `Q4 ${year}`,
    };
  }

  return {
    startQuarter: `Q${match[1]} ${match[2]}`,
    endQuarter: `Q${match[3]} ${match[4]}`,
  };
}

function parseSdaQuarterRange_(value, defaultYear) {
  const text = String(value || "");

  const matches = [...text.matchAll(/(20\d{2})\s+Q([1-4])/gi)];

  if (!matches.length) {
    return {
      startQuarter: "",
      endQuarter: "",
    };
  }

  const start = matches[0];

  const end = matches.length > 1 ? matches[matches.length - 1] : start;

  return {
    startQuarter: `Q${start[2]} ${start[1] || defaultYear}`,
    endQuarter: `Q${end[2]} ${end[1] || defaultYear}`,
  };
}

/*
 * =========================================================
 * RESPONSABLES
 * =========================================================
 */

function extractResponsibleSda_(text, label, stopLabels) {
  const value = extractBetweenSda_(text, label, stopLabels);

  if (!value) {
    return "";
  }

  const email = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);

  return email ? email[0].toLowerCase() : value.split("\n")[0].trim();
}

/*
 * =========================================================
 * TEXT HELPERS
 * =========================================================
 */

function extractBetweenSda_(text, startLabel, endLabels) {
  const source = String(text || "");

  const startIndex = source
    .toLowerCase()
    .indexOf(String(startLabel || "").toLowerCase());

  if (startIndex < 0) {
    return "";
  }

  const contentStart = startIndex + String(startLabel || "").length;

  const tail = source.slice(contentStart);

  let endIndex = tail.length;

  (endLabels || []).forEach((endLabel) => {
    const candidate = tail
      .toLowerCase()
      .indexOf(String(endLabel || "").toLowerCase());

    if (candidate >= 0 && candidate < endIndex) {
      endIndex = candidate;
    }
  });

  return cleanupSdaField_(tail.slice(0, endIndex));
}

function cleanupSdaField_(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSdaText_(value) {
  return String(value || "")
    .normalize("NFC")
    .replace(/\u00A0/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .trim();
}

function normalizeSdaCountries_(value) {
  return [
    ...new Set(
      String(value || "")
        .split(/[,;|]+/)
        .map((country) => country.trim().toUpperCase())
        .filter(Boolean),
    ),
  ].join("|");
}

/*
 * =========================================================
 * SHEETS
 * =========================================================
 */

function writeSdaSheet_(spreadsheet, sheetName, headers, rows) {
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  sheet.clearContents();

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (!rows.length) {
    return;
  }

  const values = rows.map((row) =>
    headers.map((header) => {
      const value = row[header];

      if (value === null || value === undefined) {
        return "";
      }

      return value;
    }),
  );

  sheet.getRange(2, 1, values.length, headers.length).setValues(values);

  sheet.setFrozenRows(1);
}
function parseSdaDeliverableFields_(block) {
  const normalized = normalizeSdaText_(block);

  /*
   * =====================================================
   * LOCALIZAMOS TODAS LAS ETIQUETAS CONOCIDAS
   * =====================================================
   *
   * El OCR de SDA puede alterar el orden visual de:
   *
   * - Name
   * - Date
   * - Description
   * - Status
   *
   * Por eso no asumimos un layout fijo.
   */
  const labelRegex =
    /\b(Name|Date|Description|Beneficiary countries|Goal|Deliverable status|Status|Estado|Estatus|Financials\s*\(EUR\)|Deliverable FTEs\s*&\s*External Services)\b/gi;

  const positions = [];

  let match;

  while ((match = labelRegex.exec(normalized)) !== null) {
    positions.push({
      label: normalizeSdaDeliverableLabel_(match[1]),

      start: match.index,

      contentStart: match.index + match[0].length,
    });
  }

  positions.sort((left, right) => left.start - right.start);

  const rawFields = {};

  positions.forEach((position, index) => {
    const next = positions[index + 1];

    const end = next ? next.start : normalized.length;

    rawFields[position.label] = cleanupSdaField_(
      normalized.slice(position.contentStart, end),
    );
  });

  /*
   * =====================================================
   * NAME
   * =====================================================
   */

  let name = rawFields.Name || "";

  name = name
    .replace(/\bDescription\s*$/i, "")
    .replace(/\bDate\s*$/i, "")
    .replace(/\b(?:Deliverable\s+)?Status\s*$/i, "")
    .replace(/\bEstado\s*$/i, "")
    .replace(/\bEstatus\s*$/i, "")
    .trim();

  /*
   * =====================================================
   * DATE
   * =====================================================
   */

  const rawDate = rawFields.Date || "";

  const dateMatch = rawDate.match(
    /(20\d{2})\s+Q([1-4])(?:\s*-\s*(20\d{2})\s+Q([1-4]))?/i,
  );

  const date = dateMatch ? cleanupSdaField_(dateMatch[0]) : "";

  /*
   * =====================================================
   * DESCRIPTION
   * =====================================================
   */

  let description = rawFields.Description || "";

  /*
   * Algunos PDFs OCR quedan como:
   *
   * Description
   * Date
   * 2026 Q3 - 2026 Q4
   * <descripción real>
   *
   * En ese caso recuperamos el texto posterior
   * al rango temporal.
   */
  if (!description || /^(Date)?$/i.test(description.trim())) {
    if (dateMatch) {
      description = cleanupSdaField_(
        rawDate.slice(dateMatch.index + dateMatch[0].length),
      );
    }
  }

  description = description
    .replace(/^Date\s*/i, "")
    .replace(/^(20\d{2})\s+Q[1-4](?:\s*-\s*(20\d{2})\s+Q[1-4])?\s*/i, "")
    .trim();

  /*
   * =====================================================
   * BENEFICIARY COUNTRIES
   * =====================================================
   */

  const beneficiaryCountries = rawFields["Beneficiary countries"] || "";

  /*
   * =====================================================
   * GOAL
   * =====================================================
   */

  let goal = rawFields.Goal || "";

  goal = goal
    .replace(/\s*Financials\s*\(EUR\)[\s\S]*$/i, "")
    .replace(/\s*Deliverable FTEs\s*&\s*External Services[\s\S]*$/i, "")
    .trim();

  /*
   * =====================================================
   * STATUS
   * =====================================================
   *
   * Dos posibilidades:
   *
   * 1. El PDF contiene una etiqueta Status / Estado.
   *
   * 2. El OCR incluye el estado dentro del bloque pero
   *    sin una etiqueta explícita.
   *
   * En el segundo caso utilizamos el detector de
   * estados oficiales SDA que ya tienes definido.
   */

  const explicitStatus = rawFields.Status || "";

  const detectedStatus =
    explicitStatus || extractSdaDeliverableStatusFromBlock_(normalized);

  const normalizedStatus = normalizeSdaDeliverableStatus_(detectedStatus);

  /*
   * =====================================================
   * DEFENSAS FINALES
   * =====================================================
   *
   * Los campos generales nunca deben contener
   * información financiera.
   */

  description = description
    .replace(/\s*Financials\s*\(EUR\)[\s\S]*$/i, "")
    .replace(/\s*Deliverable FTEs\s*&\s*External Services[\s\S]*$/i, "")
    .trim();

  return {
    name,

    date,

    description,

    beneficiaryCountries,

    goal,

    status: normalizedStatus.label,

    statusKey: normalizedStatus.key,
  };
}
function normalizeSdaDeliverableLabel_(value) {
  const normalized = String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (normalized === "name") {
    return "Name";
  }

  if (normalized === "date") {
    return "Date";
  }

  if (normalized === "description") {
    return "Description";
  }

  if (normalized === "beneficiary countries") {
    return "Beneficiary countries";
  }

  if (normalized === "goal") {
    return "Goal";
  }

  if (
    normalized === "status" ||
    normalized === "deliverable status" ||
    normalized === "estado" ||
    normalized === "estatus"
  ) {
    return "Status";
  }

  if (normalized.startsWith("financials")) {
    return "Financials";
  }

  if (normalized.startsWith("deliverable ftes")) {
    return "Deliverable FTEs";
  }

  return String(value || "").trim();
}
function extractSdaDeliverableStatusFromBlock_(block) {
  const source = String(block || "");

  /*
   * Estados oficiales SDA Suite.
   *
   * Orden importante:
   * buscamos expresiones más específicas
   * antes que cualquier fallback.
   */
  const knownStatuses = [
    /\bNo\s+Iniciad[oa]\b/i,
    /\bEn\s+Curso\b/i,
    /\bBloquead[oa]\b/i,
    /\bCancelad[oa]\b/i,
    /\bFinalizad[oa]\b/i,

    /*
     * Equivalencias defensivas por si algún
     * export futuro viene en inglés.
     */
    /\bNot\s+Started\b/i,
    /\bIn\s+Progress\b/i,
    /\bBlocked\b/i,
    /\bCancelled\b/i,
    /\bCanceled\b/i,
    /\bCompleted\b/i,
    /\bFinalized\b/i,
  ];

  for (const statusRegex of knownStatuses) {
    const match = source.match(statusRegex);

    if (match) {
      return String(match[0] || "").trim();
    }
  }

  return "";
}

function normalizeSdaDeliverableStatus_(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return {
      key: "sin-estado",
      label: "Sin estado",
    };
  }

  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  /*
   * =====================================================
   * NO INICIADO
   * =====================================================
   */
  if (
    normalized === "no iniciado" ||
    normalized === "no iniciada" ||
    normalized === "not started"
  ) {
    return {
      key: "no-iniciado",
      label: "No Iniciado",
    };
  }

  /*
   * =====================================================
   * EN CURSO
   * =====================================================
   */
  if (
    normalized === "en curso" ||
    normalized === "en progreso" ||
    normalized === "in progress"
  ) {
    return {
      key: "en-curso",
      label: "En Curso",
    };
  }

  /*
   * =====================================================
   * BLOQUEADO
   * =====================================================
   */
  if (
    normalized === "bloqueado" ||
    normalized === "bloqueada" ||
    normalized === "blocked"
  ) {
    return {
      key: "bloqueado",
      label: "Bloqueado",
    };
  }

  /*
   * =====================================================
   * CANCELADO
   * =====================================================
   */
  if (
    normalized === "cancelado" ||
    normalized === "cancelada" ||
    normalized === "cancelled" ||
    normalized === "canceled"
  ) {
    return {
      key: "cancelado",
      label: "Cancelado",
    };
  }

  /*
   * =====================================================
   * FINALIZADO
   * =====================================================
   */
  if (
    normalized === "finalizado" ||
    normalized === "finalizada" ||
    normalized === "completed" ||
    normalized === "finalized"
  ) {
    return {
      key: "finalizado",
      label: "Finalizado",
    };
  }

  return {
    key: "otro",
    label: raw,
  };
}
function extractSdaResponsibles_(text) {
  const summaryText = extractSdaSection_(
    text,
    "Responsibles",
    "What - Where - Why",
  );

  /*
   * La tabla de responsables de SDA se representa
   * visualmente en dos columnas.
   *
   * El OCR puede intercalar etiquetas y valores,
   * por lo que intentar asociar cada email buscando
   * texto inmediatamente después de una etiqueta
   * no es suficientemente estable.
   *
   * El export estándar de SDA mantiene, sin embargo,
   * el orden de lectura de los emails:
   *
   * 1. Project Sponsor
   * 2. Project / Product Owner
   * 3. Engineering responsible
   * 4+. Engineering responsible (additional)
   * último. Program Manager
   *
   * Extraemos emails únicos conservando ese orden.
   */
  const emails = [];

  const matches = summaryText.matchAll(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
  );

  for (const match of matches) {
    const email = String(match[0] || "")
      .trim()
      .toLowerCase();

    if (email && !emails.includes(email)) {
      emails.push(email);
    }
  }

  return {
    sponsor: emails[0] || "",

    productOwner: emails[1] || "",

    engineeringResponsible: emails[2] || "",

    programManager: emails.length >= 4 ? emails[emails.length - 1] : "",
  };
}
function extractSdaSection_(text, startLabel, endLabel) {
  const source = String(text || "");

  const lower = source.toLowerCase();

  const startText = String(startLabel || "").toLowerCase();

  const endText = String(endLabel || "").toLowerCase();

  const startIndex = lower.indexOf(startText);

  if (startIndex < 0) {
    return "";
  }

  const contentStart = startIndex + startText.length;

  const endIndex = endText ? lower.indexOf(endText, contentStart) : -1;

  const raw =
    endIndex >= 0
      ? source.slice(contentStart, endIndex)
      : source.slice(contentStart);

  return cleanupSdaField_(raw);
}
function extractSdaLabelValue_(text, label, stopLabels) {
  const source = String(text || "");

  const lower = source.toLowerCase();

  const normalizedLabel = String(label || "").toLowerCase();

  const startIndex = lower.indexOf(normalizedLabel);

  if (startIndex < 0) {
    return "";
  }

  const contentStart = startIndex + normalizedLabel.length;

  let endIndex = source.length;

  (stopLabels || []).forEach((stopLabel) => {
    const candidate = lower.indexOf(
      String(stopLabel || "").toLowerCase(),
      contentStart,
    );

    if (candidate >= 0 && candidate < endIndex) {
      endIndex = candidate;
    }
  });

  return cleanupSdaField_(source.slice(contentStart, endIndex));
}
function normalizeSdaDisplayProductName_(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized.includes("blue buddy")) {
    return "Blue Buddy";
  }

  if (normalized.includes("panorama")) {
    return "Panorama";
  }

  return String(value || "").trim();
}
function escapeSdaRegExp_(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detectSdaPdfSourceType_(file, rawText) {
  const fileName = String(file?.getName?.() || "")
    .trim()
    .toLowerCase();

  const text = String(rawText || "");

  /*
   * =====================================================
   * SDA SUITE
   * =====================================================
   *
   * Detectamos primero Suite porque dentro de sus
   * descripciones también puede aparecer "MAP:".
   */
  if (
    fileName.includes("sda suite") ||
    (/PROJECT\s+SDATOOL-\d+/i.test(text) &&
      /Beneficiary countries/i.test(text) &&
      /Software Deliverable/i.test(text) &&
      /\b(No\s+Iniciado|En\s+Curso|Bloqueado|Cancelado|Finalizado)\b/i.test(
        text,
      ))
  ) {
    return "suite";
  }

  /*
   * =====================================================
   * MAP
   * =====================================================
   */
  if (
    fileName.startsWith("map") ||
    /Current year financials/i.test(text) ||
    /Current year FTEs/i.test(text) ||
    /Deliverable\s+\d+\s*:/i.test(text)
  ) {
    return "map";
  }

  return "unknown";
}

function normalizeSdaSuiteText_(value) {
  return String(value || "")
    .normalize("NFC")
    .replace(/[\uE000-\uF8FF]/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .trim();
}

function normalizeSdaSuiteFlatText_(value) {
  return normalizeSdaSuiteText_(value)
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSdaSuiteDeliverables_(file, rawText, sdaCode) {
  const text = normalizeSdaSuiteText_(rawText);

  const product = getSdaProductMetadataByCode_(sdaCode);

  /*
   * Cada deliverable comienza por:
   *
   * [2450764] - ...
   */
  const headerRegex = /^\[(\d{6,})\]\s*-\s*/gm;

  const headers = [];

  let match;

  while ((match = headerRegex.exec(text)) !== null) {
    headers.push({
      id: String(match[1] || "").trim(),

      start: match.index,
    });
  }

  const sourceUpdatedAt = Utilities.formatDate(
    file.getLastUpdated(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd'T'HH:mm:ss",
  );

  const rows = [];

  headers.forEach((header, index) => {
    const next = headers[index + 1];

    const block = text.slice(header.start, next ? next.start : text.length);

    const row = parseSdaSuiteDeliverableBlock_(block, {
      programId: SDA_GENERAL_CONFIG.programId,

      productId: product.productId,

      sdaCode,

      sdaDeliverableId: header.id,

      sourceFileId: file.getId(),

      sourceFileName: file.getName(),

      sourceUpdatedAt,
    });

    if (row) {
      rows.push(row);
    }
  });

  Logger.log(`[SDA Suite PDF] ${sdaCode}: ${rows.length} deliverables`);

  return rows;
}

function parseSdaSuiteDeliverableBlock_(block, context) {
  const source = normalizeSdaSuiteText_(block);

  const flat = normalizeSdaSuiteFlatText_(block);

  const headerMatch = source.match(/^\[(\d{6,})\]\s*-\s*/);

  if (!headerMatch) {
    return null;
  }

  const body = source.slice(headerMatch[0].length);

  /*
   * El estado actual aparece justo después
   * del título:
   *
   * En Curso -
   * Finalizado -
   * Cancelado -
   * ...
   */
  const statusMatch = body.match(
    /\b(No\s+Iniciado|En\s+Curso|Bloqueado|Cancelado|Finalizado)\s*-\s*/i,
  );

  if (!statusMatch) {
    Logger.log(
      `[SDA Suite PDF] Sin estado reconocible: ${context.sdaDeliverableId}`,
    );

    return null;
  }

  const status = normalizeSdaSuiteStatusLabel_(statusMatch[1]);

  const rawTitle = cleanupSdaField_(body.slice(0, statusMatch.index));

  const afterStatus = body.slice(statusMatch.index + statusMatch[0].length);

  /*
   * Descripción hasta que comienza la tabla:
   *
   * ID | Beneficiary countries | ...
   */
  const tableStart = afterStatus.search(/ID[\s\S]{0,12}Beneficiary countries/i);

  const description = cleanupSdaField_(
    tableStart >= 0
      ? afterStatus.slice(0, tableStart)
      : afterStatus.split(/\bAlerts\b/i)[0],
  );

  const currentData = extractSdaSuiteCurrentData_(
    flat,
    context.sdaDeliverableId,
  );

  if (!currentData) {
    Logger.log(
      `[SDA Suite PDF] Sin tabla estructurada: ${context.sdaDeliverableId}`,
    );

    return null;
  }

  const suiteTags = extractSdaSuiteTags_(rawTitle);

  const name = cleanupSdaSuiteTitle_(rawTitle);

  const tracking = extractSdaSuiteTrackingSummary_(source);

  const actualDates = extractSdaSuiteActualDates_(
    source,
    flat,
    currentData.rowEndIndex,
  );

  const year =
    Number(currentData.startYear || currentData.endYear) ||
    new Date().getFullYear();

  return {
    programId: context.programId,

    productId: context.productId,

    year,

    sdaCode: context.sdaCode,

    /*
     * ID real de SDA Suite.
     */
    deliverableId: context.sdaDeliverableId,

    /*
     * Se completará con el índice MAP
     * cuando podamos cruzar ambas fuentes.
     */
    deliverableIndex: "",

    deliverableType: extractSdaSuiteDeliverableType_(suiteTags),

    suiteTags: suiteTags.join("|"),

    name,

    startQuarter: formatSdaSuiteQuarter_(
      currentData.startQuarter,
      currentData.startYear,
    ),

    endQuarter: formatSdaSuiteQuarter_(
      currentData.endQuarter,
      currentData.endYear,
    ),

    description,

    beneficiaryCountries: normalizeSdaSuiteCountries_(currentData.countries),

    /*
     * MAP seguirá aportando Goal cuando
     * encontremos correspondencia.
     */
    goal: "",

    status: status.label,

    statusKey: status.key,

    softwareDeliverable: currentData.softwareDeliverable,

    developmentEndDate: actualDates.developmentEndDate,

    productionDate: actualDates.productionDate,

    clientDate: actualDates.clientDate,

    replanned: tracking.replanned,

    delayed: tracking.delayed,

    hasBlockedHistory: tracking.hasBlockedHistory,

    hasCanceledHistory: tracking.hasCanceledHistory,

    trackingCount: tracking.trackingCount,

    lastTrackingType: tracking.lastTrackingType,

    lastTrackingAt: tracking.lastTrackingAt,

    lastTrackingComment: tracking.lastTrackingComment,

    sourceType: "sda-suite-pdf",

    mapSourceFileId: "",

    mapSourceFileName: "",

    mapSourceUpdatedAt: "",

    sourceFileId: context.sourceFileId,

    sourceFileName: context.sourceFileName,

    sourceUpdatedAt: context.sourceUpdatedAt,
  };
}

function extractSdaSuiteCurrentData_(flatText, deliverableId) {
  const source = String(flatText || "");

  const escapedId = escapeSdaRegExp_(deliverableId);

  /*
   * Ejemplos reales:
   *
   * 2450764 Holding, Mexico 3Q 2026 4Q 2026 Yes
   *
   * 2297167 Peru 2Q 2026 4Q 2026 No
   *
   * 2165389 Colombia, Holding, Mexico,
   * 2Q 2026 3Q 2026 Yes
   */
  const regex = new RegExp(
    "(?:^|\\s)" +
      escapedId +
      "\\s+" +
      "(.+?)\\s+" +
      "([1-4])Q\\s+(20\\d{2})\\s+" +
      "([1-4])Q\\s+(20\\d{2})\\s+" +
      "(Yes|No)\\b",
    "i",
  );

  const match = source.match(regex);

  if (!match) {
    return null;
  }

  return {
    countries: cleanupSdaField_(match[1]),

    startQuarter: Number(match[2]),

    startYear: Number(match[3]),

    endQuarter: Number(match[4]),

    endYear: Number(match[5]),

    softwareDeliverable:
      String(match[6] || "")
        .trim()
        .toLowerCase() === "yes"
        ? "Yes"
        : "No",

    rowEndIndex: Number(match.index || 0) + match[0].length,
  };
}

function normalizeSdaSuiteStatusLabel_(value) {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  if (normalized === "no iniciado") {
    return {
      key: "no-iniciado",

      label: "No Iniciado",
    };
  }

  if (normalized === "en curso") {
    return {
      key: "en-curso",

      label: "En Curso",
    };
  }

  if (normalized === "bloqueado") {
    return {
      key: "bloqueado",

      label: "Bloqueado",
    };
  }

  if (normalized === "cancelado") {
    return {
      key: "cancelado",

      label: "Cancelado",
    };
  }

  if (normalized === "finalizado") {
    return {
      key: "finalizado",

      label: "Finalizado",
    };
  }

  return {
    key: "sin-estado",

    label: "Sin estado",
  };
}

function normalizeSdaSuiteCountries_(value) {
  const aliases = {
    HOLDING: "HL",

    HLD: "HL",

    HL: "HL",

    SPAIN: "ES",

    ESPANA: "ES",

    ESP: "ES",

    ES: "ES",

    MEXICO: "MX",

    MEX: "MX",

    MX: "MX",

    PERU: "PE",

    PER: "PE",

    PE: "PE",

    COLOMBIA: "CO",

    COL: "CO",

    CO: "CO",
  };

  const result = String(value || "")
    .split(/[,;|]+/)
    .map((item) =>
      String(item || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase(),
    )
    .filter(Boolean)
    .map((item) => aliases[item] || "")
    .filter(Boolean);

  return [...new Set(result)].join("|");
}

function extractSdaSuiteTags_(rawTitle) {
  return [...String(rawTitle || "").matchAll(/\[([^\]]+)\]/g)]
    .map((match) => String(match[1] || "").trim())
    .filter(Boolean);
}

function cleanupSdaSuiteTitle_(rawTitle) {
  return String(rawTitle || "")
    .replace(/^(?:\s*\[[^\]]+\]\s*)+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSdaSuiteDeliverableType_(tags) {
  const ignored = new Set([
    "HIT",
    "HLD",
    "HL",

    "ES",
    "ESP",

    "MX",
    "MEX",

    "PE",
    "PER",

    "CO",
    "COL",
  ]);

  return (Array.isArray(tags) ? tags : [])
    .filter(
      (tag) =>
        !ignored.has(
          String(tag || "")
            .trim()
            .toUpperCase(),
        ),
    )
    .join("|");
}

function formatSdaSuiteQuarter_(quarter, year) {
  const normalizedQuarter = Number(quarter);

  const normalizedYear = Number(year);

  if (
    !Number.isFinite(normalizedQuarter) ||
    normalizedQuarter < 1 ||
    normalizedQuarter > 4 ||
    !Number.isFinite(normalizedYear)
  ) {
    return "";
  }

  return `Q${normalizedQuarter} ` + `${normalizedYear}`;
}

function extractSdaSuiteActualDates_(block, flatText, rowEndIndex) {
  const source = String(block || "");

  const flat = String(flatText || "");

  const tail = flat.slice(Number(rowEndIndex || 0));

  /*
   * Las fechas de tracking llevan:
   *
   * 31/07/2026, 13:06:56
   *
   * Las fechas productivas no llevan coma/hora.
   */
  const dates = [...tail.matchAll(/\b(\d{2}\/\d{2}\/20\d{2})\b(?!\s*,)/g)].map(
    (match) => normalizeSdaSuiteDate_(match[1]),
  );

  let index = 0;

  let developmentEndDate = "";

  let productionDate = "";

  let clientDate = "";

  if (/Development End Date/i.test(source)) {
    developmentEndDate = dates[index] || "";

    index += 1;
  }

  if (/Production Date/i.test(source)) {
    productionDate = dates[index] || "";

    index += 1;
  }

  if (/EMC Date\s*\(In Customer'?s Hands\)/i.test(source)) {
    clientDate = dates[index] || "";
  }

  return {
    developmentEndDate,
    productionDate,
    clientDate,
  };
}

function normalizeSdaSuiteDate_(value) {
  const text = String(value || "").trim();

  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!match) {
    return text;
  }

  return `${match[3]}-` + `${match[2]}-` + `${match[1]}`;
}

function extractSdaSuiteTrackingSummary_(block) {
  const source = normalizeSdaSuiteFlatText_(block);

  const eventRegex =
    /\b(Deliverable Creation|Software Deliverable Change|Rescheduling|Blocked|Canceled)\b/gi;

  const events = [];

  let match;

  while ((match = eventRegex.exec(source)) !== null) {
    events.push({
      type: normalizeSdaSuiteTrackingType_(match[1]),

      index: match.index,
    });
  }

  const timestampRegex = /\b(\d{2}\/\d{2}\/20\d{2}),\s*(\d{2}:\d{2}:\d{2})/g;

  const timestamps = [];

  while ((match = timestampRegex.exec(source)) !== null) {
    timestamps.push({
      value: `${match[1]} ${match[2]}`,

      index: match.index,
    });
  }

  /*
   * En el PDF los eventos se muestran del más
   * reciente al más antiguo.
   */
  const firstEvent = events[0] || null;

  const firstTimestamp = timestamps[0] || null;

  let lastTrackingComment = "";

  if (firstEvent) {
    const nextEvent = events[1];

    const eventText = source.slice(
      firstEvent.index,
      nextEvent ? nextEvent.index : source.length,
    );

    /*
     * Extraemos un comentario únicamente cuando hay
     * texto libre después de las ventanas temporales.
     *
     * No es crítico para el Flight Plan.
     */
    const quarterMatches = [
      ...eventText.matchAll(/\b[1-4]Q\s+20\d{2}\b|\bQ\s*[1-4]\s+20\d{2}\b/gi),
    ];

    if (quarterMatches.length) {
      const lastQuarter = quarterMatches[quarterMatches.length - 1];

      const commentCandidate = cleanupSdaField_(
        eventText.slice(Number(lastQuarter.index || 0) + lastQuarter[0].length),
      );

      if (commentCandidate && !/^(No alerts)$/i.test(commentCandidate)) {
        lastTrackingComment = commentCandidate;
      }
    }
  }

  return {
    replanned: events.some((item) => item.type === "Rescheduling"),

    /*
     * El PDF ofrece Retrasado como alerta independiente,
     * pero no siempre aparece en el texto expandido.
     */
    delayed:
      /\bRetrasado\b/i.test(source) && !/Estados.*Retrasado/i.test(source),

    hasBlockedHistory: events.some((item) => item.type === "Blocked"),

    hasCanceledHistory: events.some((item) => item.type === "Canceled"),

    trackingCount: events.length,

    lastTrackingType: firstEvent?.type || "",

    lastTrackingAt: firstTimestamp?.value || "",

    lastTrackingComment,
  };
}

function normalizeSdaSuiteTrackingType_(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "deliverable creation") {
    return "Deliverable Creation";
  }

  if (normalized === "software deliverable change") {
    return "Software Deliverable Change";
  }

  if (normalized === "rescheduling") {
    return "Rescheduling";
  }

  if (normalized === "blocked") {
    return "Blocked";
  }

  if (normalized === "canceled") {
    return "Canceled";
  }

  return String(value || "").trim();
}

function getSdaProductMetadataByCode_(sdaCode) {
  const normalized = String(sdaCode || "")
    .trim()
    .toUpperCase();

  if (normalized === "SDATOOL-54491") {
    return {
      productId: "blue-buddy",

      productName: "Blue Buddy",
    };
  }

  if (normalized === "SDATOOL-55522") {
    return {
      productId: "panorama",

      productName: "Panorama",
    };
  }

  return {
    productId: normalized.toLowerCase(),

    productName: normalized,
  };
}

function mergeSdaSuiteAndMapDeliverables_(suiteRows, mapRows) {
  const mapCandidates = Array.isArray(mapRows) ? mapRows : [];

  return (Array.isArray(suiteRows) ? suiteRows : []).map((suiteRow) => {
    const mapMatch = findBestMapDeliverableForSuite_(suiteRow, mapCandidates);

    if (!mapMatch) {
      return suiteRow;
    }

    return {
      ...suiteRow,

      deliverableIndex: String(mapMatch.deliverableId || "").trim(),

      /*
       * El MAP conserva el Goal,
       * que el PDF Suite no expone como
       * campo propio.
       */
      goal: mapMatch.goal || "",

      mapSourceFileId: mapMatch.sourceFileId || "",

      mapSourceFileName: mapMatch.sourceFileName || "",

      mapSourceUpdatedAt: mapMatch.sourceUpdatedAt || "",
    };
  });
}

function findBestMapDeliverableForSuite_(suiteRow, mapRows) {
  let bestRow = null;

  let bestScore = 0;

  (Array.isArray(mapRows) ? mapRows : []).forEach((mapRow) => {
    const score = scoreSdaDeliverableMatch_(suiteRow, mapRow);

    if (score > bestScore) {
      bestScore = score;

      bestRow = mapRow;
    }
  });

  /*
   * Evitamos un join dudoso.
   */
  return bestScore >= 0.48 ? bestRow : null;
}

function scoreSdaDeliverableMatch_(suiteRow, mapRow) {
  const suiteName = normalizeSdaMatchText_(suiteRow?.name);

  const mapName = normalizeSdaMatchText_(mapRow?.name);

  if (!suiteName || !mapName) {
    return 0;
  }

  if (suiteName === mapName) {
    return 1;
  }

  if (suiteName.includes(mapName) || mapName.includes(suiteName)) {
    return 0.9;
  }

  const suiteTokens = new Set(
    suiteName.split(/\s+/).filter((token) => token.length >= 4),
  );

  const mapTokens = new Set(
    mapName.split(/\s+/).filter((token) => token.length >= 4),
  );

  if (!suiteTokens.size || !mapTokens.size) {
    return 0;
  }

  const intersection = [...suiteTokens].filter((token) =>
    mapTokens.has(token),
  ).length;

  const union = new Set([...suiteTokens, ...mapTokens]).size;

  let score = union ? intersection / union : 0;

  if (
    suiteRow?.startQuarter &&
    mapRow?.startQuarter &&
    suiteRow.startQuarter === mapRow.startQuarter
  ) {
    score += 0.08;
  }

  if (
    suiteRow?.endQuarter &&
    mapRow?.endQuarter &&
    suiteRow.endQuarter === mapRow.endQuarter
  ) {
    score += 0.08;
  }

  return Math.min(1, score);
}

function normalizeSdaMatchText_(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMapOnlySdaDeliverable_(row) {
  return {
    ...row,

    deliverableIndex: String(row?.deliverableId || "").trim(),

    suiteTags: "",

    status: "Sin estado",

    statusKey: "sin-estado",

    softwareDeliverable: "",

    developmentEndDate: "",

    productionDate: "",

    clientDate: "",

    replanned: false,

    delayed: false,

    hasBlockedHistory: false,

    hasCanceledHistory: false,

    trackingCount: 0,

    lastTrackingType: "",

    lastTrackingAt: "",

    lastTrackingComment: "",

    sourceType: "map-pdf",

    mapSourceFileId: row?.sourceFileId || "",

    mapSourceFileName: row?.sourceFileName || "",

    mapSourceUpdatedAt: row?.sourceUpdatedAt || "",
  };
}

function buildSdaFlightFromSuite_(sdaCode, suiteRows, file) {
  const product = getSdaProductMetadataByCode_(sdaCode);

  const rows = Array.isArray(suiteRows) ? suiteRows : [];

  const years = rows.map((row) => Number(row.year)).filter(Number.isFinite);

  const year = years.length ? Math.max(...years) : new Date().getFullYear();

  const periods = rows
    .flatMap((row) => [
      parseSdaNormalizedQuarter_(row.startQuarter),

      parseSdaNormalizedQuarter_(row.endQuarter),
    ])
    .filter(Boolean)
    .sort((left, right) => left.order - right.order);

  return {
    programId: SDA_GENERAL_CONFIG.programId,

    productId: product.productId,

    year,

    sdaCode,

    productName: product.productName,

    programName: "R2 AI Banker for Retail",

    country: "Holding",

    description: "",

    rationale: "",

    sponsor: "",

    productOwner: "",

    programManager: "",

    engineeringResponsible: "",

    startQuarter: periods[0]?.label || `Q1 ${year}`,

    endQuarter: periods[periods.length - 1]?.label || `Q4 ${year}`,

    sourceFileId: file.getId(),

    sourceFileName: file.getName(),

    sourceUpdatedAt: Utilities.formatDate(
      file.getLastUpdated(),
      Session.getScriptTimeZone(),
      "yyyy-MM-dd'T'HH:mm:ss",
    ),
  };
}

function parseSdaNormalizedQuarter_(value) {
  const match = String(value || "")
    .trim()
    .match(/^Q([1-4])\s+(20\d{2})$/i);

  if (!match) {
    return null;
  }

  const quarter = Number(match[1]);

  const year = Number(match[2]);

  return {
    quarter,
    year,

    order: year * 4 + quarter,

    label: `Q${quarter} ${year}`,
  };
}
