/*
 * =========================================================
 * SDA IMPORT - RESTRICTED
 * =========================================================
 *
 * Lee PDFs SDA desde Drive y genera exclusivamente:
 *
 * - sda_financials
 * - sda_resources
 *
 * Este script pertenece a la Spreadsheet RESTRICTED.
 * Nunca escribe información en la Spreadsheet general.
 *
 * Requiere el servicio avanzado Drive API.
 * =========================================================
 */

const SDA_RESTRICTED_CONFIG = {
  sourceFolderId: "1z0V4MWzTq8qehLdPqxYgDCCZSmUX4GOf",
  programId: "aixbanker",

  sheets: {
    financials: "sda_financials",
    resources: "sda_resources",
  },
};

const SDA_FINANCIALS_HEADERS = [
  "programId",
  "productId",
  "year",
  "sdaCode",
  "cashOutRequested",
  "cashOutApproved",
  "capexRequested",
  "capexApproved",
  "opexRequested",
  "opexApproved",
  "sourceFileId",
  "sourceFileName",
  "sourceUpdatedAt",
];

const SDA_RESOURCES_HEADERS = [
  "programId",
  "productId",
  "year",
  "sdaCode",
  "quarter",
  "internalFtesRequired",
  "staffedSolutionDevelopment",
  "staffedOtherBuildingBlocks",
  "externalServicesRequired",
  "assignedSubsidiaries",
  "assignedExternalServices",
  "sourceFileId",
  "sourceFileName",
  "sourceUpdatedAt",
];

/*
 * =========================================================
 * ENTRY POINT
 * =========================================================
 */

function refreshSdaRestrictedData() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const lock = LockService.getDocumentLock();

  if (!lock.tryLock(1000)) {
    spreadsheet.toast(
      "Ya hay una actualización SDA en curso.",
      "AIxBanker Restricted",
      6,
    );

    return;
  }

  try {
    spreadsheet.toast(
      "Leyendo información sensible de SDA...",
      "AIxBanker Restricted",
      5,
    );

    const files = getSdaPdfFiles_();

    if (!files.length) {
      throw new Error(
        "No se han encontrado PDFs SDA en la carpeta configurada.",
      );
    }

    const financials = [];
    const resources = [];
    const failures = [];

    files.forEach((file) => {
      try {
        const text = extractPdfText_(file);
        const parsed = parseSdaDocument_(file, text);

        financials.push(parsed.financials);
        resources.push(...parsed.resources);
      } catch (error) {
        failures.push(`${file.getName()}: ${error?.message || String(error)}`);
      }
    });

    /*
     * Publicación atómica:
     * si un PDF falla no modificamos las pestañas.
     */
    if (failures.length) {
      throw new Error(
        "No se ha actualizado ninguna pestaña porque algunos PDFs han fallado:\n\n" +
          failures.join("\n"),
      );
    }

    writeSheet_(
      spreadsheet,
      SDA_RESTRICTED_CONFIG.sheets.financials,
      SDA_FINANCIALS_HEADERS,
      financials,
    );

    writeSheet_(
      spreadsheet,
      SDA_RESTRICTED_CONFIG.sheets.resources,
      SDA_RESOURCES_HEADERS,
      resources,
    );

    SpreadsheetApp.flush();

    spreadsheet.toast(
      `SDA: ${financials.length} · Filas recursos: ${resources.length}`,
      "SDA restringida actualizada",
      8,
    );

    Logger.log(
      JSON.stringify(
        {
          files: files.length,
          financials: financials.length,
          resources: resources.length,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    spreadsheet.toast(
      error?.message || String(error),
      "Error actualizando SDA restringida",
      10,
    );

    console.error(error);

    throw error;
  } finally {
    lock.releaseLock();
  }
}

/*
 * =========================================================
 * DRIVE + OCR
 * =========================================================
 */

function getSdaPdfFiles_() {
  const folder = DriveApp.getFolderById(SDA_RESTRICTED_CONFIG.sourceFolderId);

  const iterator = folder.getFiles();
  const files = [];

  while (iterator.hasNext()) {
    const file = iterator.next();

    if (
      file.getMimeType() === MimeType.PDF ||
      file.getName().toLowerCase().endsWith(".pdf")
    ) {
      files.push(file);
    }
  }

  return files.sort((a, b) => a.getName().localeCompare(b.getName(), "es"));
}

function extractPdfText_(file) {
  const temporaryDocument = Drive.Files.create(
    {
      name: `${file.getName()} - SDA OCR TEMP`,
      mimeType: "application/vnd.google-apps.document",
    },
    file.getBlob(),
  );

  try {
    return DocumentApp.openById(temporaryDocument.id).getBody().getText();
  } finally {
    DriveApp.getFileById(temporaryDocument.id).setTrashed(true);
  }
}

/*
 * =========================================================
 * DOCUMENT
 * =========================================================
 */

function parseSdaDocument_(file, rawText) {
  const text = normalizeText_(rawText);

  const sdaCode = extractSdaCode_(text, file.getName());

  const productId = getProductId_(sdaCode, text, file.getName());

  const year = extractYear_(text);

  const context = {
    programId: SDA_RESTRICTED_CONFIG.programId,
    productId,
    year,
    sdaCode,

    sourceFileId: file.getId(),

    sourceFileName: file.getName(),

    sourceUpdatedAt: Utilities.formatDate(
      file.getLastUpdated(),
      Session.getScriptTimeZone(),
      "yyyy-MM-dd'T'HH:mm:ss",
    ),
  };

  return {
    financials: parseFinancials_(text, context),

    resources: parseResources_(text, context),
  };
}

/*
 * =========================================================
 * FINANCIALS
 * =========================================================
 */

function parseFinancials_(text, context) {
  const match = text.match(
    /Current year financials\s+20\d{2}\s*\(EUR\)([\s\S]*?)(?=Current year FTEs\s*&\s*External|Other financial info|Validations|$)/i,
  );

  if (!match) {
    throw new Error(
      `No se encontró Current year financials en ${context.sdaCode}.`,
    );
  }

  const section = normalizeText_(match[1]);

  const cashOut = parseFinancialMetric_(section, /Cash\s*out/i, /CapEx/i);

  const capex = parseFinancialMetric_(
    section,
    /CapEx/i,
    /Technology|Premises\s*&\s*Services|Security|OpEx/i,
  );

  const opex = parseFinancialMetric_(
    section,
    /OpEx/i,
    /Personnel\s+expenses|Consultancy\s+services|Third\s+party\s+services|Marketing|Other\s+expenses/i,
  );

  return {
    ...context,

    cashOutRequested: cashOut.requested,
    cashOutApproved: cashOut.approved,

    capexRequested: capex.requested,
    capexApproved: capex.approved,

    opexRequested: opex.requested,
    opexApproved: opex.approved,
  };
}

function parseFinancialMetric_(section, metricRegex, nextMetricRegex) {
  const metric = section.match(metricRegex);

  if (!metric) {
    return {
      requested: 0,
      approved: 0,
    };
  }

  const tail = section.slice(metric.index + metric[0].length);

  const next = tail.match(nextMetricRegex);

  const block =
    next && Number.isFinite(next.index) ? tail.slice(0, next.index) : tail;

  const requested = block.match(/Requested\s+([\d.,\s-]+?)(?=\s+Approved\b)/i);

  const approved = block.match(
    /Approved\s+([\d.,\s-]+?)(?=$|\s+[A-Za-zÁÉÍÓÚáéíóú])/i,
  );

  return {
    requested: lastAmount_(requested?.[1] || ""),

    approved: lastAmount_(approved?.[1] || ""),
  };
}

/*
 * =========================================================
 * RESOURCES
 * =========================================================
 */

function parseResources_(text, context) {
  const sectionMatch = String(text || "").match(
    /Current year FTEs\s*&\s*External Serv(?:i)?ces\s+20\d{2}(?:\s*\(EUR\))?([\s\S]*?)(?=Other financial info|Validations|$)/i,
  );

  if (!sectionMatch) {
    throw new Error(
      `No se encontró Current year FTEs & External Services en ${context.sdaCode}.`,
    );
  }

  const section = normalizeText_(sectionMatch[1]);

  /*
   * =====================================================
   * VALIDACIÓN DE ESTRUCTURA
   * =====================================================
   *
   * No dependemos del orden en el que el OCR coloque
   * etiquetas y números.
   *
   * Únicamente validamos que estamos leyendo la tabla
   * correcta antes de interpretar sus valores.
   */
  const requiredLabels = [
    /Internal\s+FTEs/i,
    /Staffed\s*-\s*Solution/i,
    /Staffed\s*-\s*Other/i,
    /External\s+Services/i,
    /Subsidiaries/i,
    /External\s+services/i,
  ];

  const missingLabel = requiredLabels.find((regex) => !regex.test(section));

  if (missingLabel) {
    throw new Error(
      `La tabla de recursos de ${context.sdaCode} no tiene la estructura SDA esperada.`,
    );
  }

  /*
   * =====================================================
   * EXTRACCIÓN
   * =====================================================
   *
   * La tabla contiene:
   *
   * 4 valores Internal FTEs Required
   * 4 valores Staffed Solution Development
   * 4 valores Staffed Other Building Blocks
   * 4 valores External Services Required
   * 4 valores Assigned Subsidiaries
   * 4 valores Assigned External Services
   *
   * Total: 24.
   *
   * Antes aparecen los encabezados:
   *
   * 1Q 2026
   * 2Q 2026
   * 3Q 2026
   * 4Q 2026
   *
   * Por eso cogemos los ÚLTIMOS 24 valores numéricos
   * del bloque.
   *
   * Así somos independientes del orden de lectura
   * de las celdas que produzca el OCR.
   */
  const allValues = amounts_(section);

  if (allValues.length < 24) {
    throw new Error(
      `No se pudieron obtener los 24 valores de recursos de ${context.sdaCode}. Encontrados: ${allValues.length}.`,
    );
  }

  const values = allValues.slice(-24);

  const internalFtesRequired = values.slice(0, 4);

  const staffedSolutionDevelopment = values.slice(4, 8);

  const staffedOtherBuildingBlocks = values.slice(8, 12);

  const externalServicesRequired = values.slice(12, 16);

  const assignedSubsidiaries = values.slice(16, 20);

  const assignedExternalServices = values.slice(20, 24);

  return [0, 1, 2, 3].map((index) => ({
    ...context,

    quarter: `Q${index + 1}`,

    internalFtesRequired: internalFtesRequired[index],

    staffedSolutionDevelopment: staffedSolutionDevelopment[index],

    staffedOtherBuildingBlocks: staffedOtherBuildingBlocks[index],

    externalServicesRequired: externalServicesRequired[index],

    assignedSubsidiaries: assignedSubsidiaries[index],

    assignedExternalServices: assignedExternalServices[index],
  }));
}

/*
 * =========================================================
 * IDENTIFICATION
 * =========================================================
 */

function extractSdaCode_(text, fileName) {
  const match = `${fileName}\n${text}`.match(/SDATOOL-\d+/i);

  if (!match) {
    throw new Error(`No se pudo identificar la SDA en ${fileName}.`);
  }

  return match[0].toUpperCase();
}

function getProductId_(sdaCode, text, fileName) {
  const knownProducts = {
    "SDATOOL-54491": "blue-buddy",

    "SDATOOL-55522": "panorama",
  };

  if (knownProducts[sdaCode]) {
    return knownProducts[sdaCode];
  }

  const source = `${fileName} ${text}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (source.includes("blue buddy")) {
    return "blue-buddy";
  }

  if (source.includes("panorama")) {
    return "panorama";
  }

  throw new Error(`No se pudo identificar el producto de ${sdaCode}.`);
}

function extractYear_(text) {
  const matches = [...String(text || "").matchAll(/\b(20\d{2})\b/g)].map(
    (match) => Number(match[1]),
  );

  if (!matches.length) {
    return new Date().getFullYear();
  }

  const frequency = {};

  matches.forEach((year) => {
    frequency[year] = (frequency[year] || 0) + 1;
  });

  return Number(Object.entries(frequency).sort((a, b) => b[1] - a[1])[0][0]);
}

/*
 * =========================================================
 * NUMBERS
 * =========================================================
 */

function amounts_(value) {
  const matches =
    String(value || "").match(
      /-?\d{1,3}(?:\.\d{3})*(?:,\d+)?|-?\d+(?:,\d+)?/g,
    ) || [];

  return matches.map(parseAmount_);
}

function lastAmount_(value) {
  const values = amounts_(value);

  return values.length ? values[values.length - 1] : 0;
}

function parseAmount_(value) {
  const number = Number(
    String(value || "")
      .trim()
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", "."),
  );

  return Number.isFinite(number) ? number : 0;
}

/*
 * =========================================================
 * TEXT
 * =========================================================
 */

function normalizeText_(value) {
  return String(value || "")
    .normalize("NFC")
    .replace(/\u00A0/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .trim();
}

/*
 * =========================================================
 * SHEETS
 * =========================================================
 */

function writeSheet_(spreadsheet, sheetName, headers, rows) {
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  sheet.clearContents();

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (rows.length) {
    const values = rows.map((row) =>
      headers.map((header) => row[header] ?? ""),
    );

    sheet.getRange(2, 1, values.length, headers.length).setValues(values);
  }

  sheet.setFrozenRows(1);
}
