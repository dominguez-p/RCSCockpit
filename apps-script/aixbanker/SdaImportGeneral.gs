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
  "deliverableType",
  "name",
  "startQuarter",
  "endQuarter",
  "description",
  "beneficiaryCountries",
  "goal",
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
    spreadsheet.toast("Leyendo PDFs SDA...", "AIxBanker", 5);

    const sourceFiles = getSdaPdfFiles_();

    if (!sourceFiles.length) {
      throw new Error(
        "No se han encontrado PDFs en la carpeta SDA configurada.",
      );
    }

    const flights = [];

    const deliverables = [];

    sourceFiles.forEach((file) => {
      const text = extractSdaPdfText_(file);

      const parsed = parseSdaGeneralDocument_(file, text);

      flights.push(parsed.flight);

      parsed.deliverables.forEach((deliverable) => {
        deliverables.push(deliverable);
      });
    });

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

    spreadsheet.toast(
      [`SDA: ${flights.length}`, `Deliverables: ${deliverables.length}`].join(
        " · ",
      ),
      "SDA actualizada",
      8,
    );

    Logger.log(
      JSON.stringify(
        {
          files: sourceFiles.length,
          flights: flights.length,
          deliverables: deliverables.length,
        },
        null,
        2,
      ),
    );
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
   *
   * Por eso no asumimos un layout fijo.
   */
  const labelRegex =
    /\b(Name|Date|Description|Beneficiary countries|Goal|Financials\s*\(EUR\)|Deliverable FTEs\s*&\s*External Services)\b/gi;

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
   *
   * Dependiendo del OCR, "Financials (EUR)"
   * puede no haberse detectado correctamente como
   * etiqueta independiente.
   *
   * Por eso aplicamos una segunda barrera:
   * nunca permitimos que Goal contenga Financials
   * ni Deliverable FTEs.
   */
  let goal = rawFields.Goal || "";

  goal = goal
    .replace(/\s*Financials\s*\(EUR\)[\s\S]*$/i, "")
    .replace(/\s*Deliverable FTEs\s*&\s*External Services[\s\S]*$/i, "")
    .trim();

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

  if (normalized.startsWith("financials")) {
    return "Financials";
  }

  if (normalized.startsWith("deliverable ftes")) {
    return "Deliverable FTEs";
  }

  return String(value || "").trim();
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
