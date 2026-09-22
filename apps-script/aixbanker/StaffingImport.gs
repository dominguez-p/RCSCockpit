/*
 * =========================================================
 * AIxBANKER · STAFFING
 * =========================================================
 *
 * Fuente:
 *
 * Descarga_Completa_*.csv
 *
 * exportada desde Staffing y almacenada en Google Drive.
 *
 * El CSV contiene dos filas de metadatos antes
 * de la cabecera real.
 *
 * Esta capa:
 *
 * - localiza el CSV más reciente;
 * - normaliza posiciones y asignaciones;
 * - elimina duplicados;
 * - elimina información personal no necesaria;
 * - construye el modelo por Scrum;
 * - publica un dataset ligero on-demand.
 *
 * No forma parte del dataset core.
 * =========================================================
 */

const STAFFING_CONFIG = {
  sourceFolderProperty: "STAFFING_SOURCE_FOLDER_ID",

  sourceFilePrefix: "Descarga_Completa_",

  sheetName: "staffingAssignments",

  programId: "aixbanker",

  productScrums: {
    "blue-buddy": [
      "Knowledge Assistant",
      "Blue Buddy Experience",
      "Cross",
      "Sales Assistant",
    ],
  },
};
const STAFFING_SHEET_HEADERS = [
  "programId",

  "productId",

  "projectCode",

  "projectName",

  "programName",

  "period",

  "year",

  "quarter",

  "scrum",

  "positionId",

  "role",

  "demandFte",

  "collaborationType",

  "countryCode",

  "countryLabel",

  "domainCode",

  "domainLabel",

  "poolCode",

  "poolLabel",

  "workforceType",

  "status",

  "demandProfile",

  "demandExperience",

  "assignmentId",

  "assignmentType",

  "assignmentReason",

  "assignedFte",

  "personName",

  "profile",

  "experience",

  "company",

  "sourceFileId",

  "sourceFileName",

  "sourceUpdatedAt",
];
/*
 * =========================================================
 * REFRESH
 * =========================================================
 */
function refreshStaffingData() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  const lock = LockService.getDocumentLock();

  if (!lock.tryLock(1000)) {
    spreadsheet.toast(
      "Ya hay una actualización de Staffing en curso.",
      "AIxBanker",
      6,
    );

    return;
  }

  try {
    spreadsheet.toast("Procesando Staffing...", "AIxBanker", 6);

    /*
     * =====================================================
     * FICHEROS DE ORIGEN
     * =====================================================
     *
     * Ya no usamos únicamente el CSV más reciente.
     *
     * La carpeta puede contener diferentes descargas
     * correspondientes a diferentes proyectos.
     *
     * Para cada proyecto utilizaremos la descarga más
     * reciente que contenga dicho proyecto.
     * =====================================================
     */

    const sourceFiles = findStaffingSourceFiles_();

    const parsedFiles = sourceFiles.map((file) => ({
      file,
      parsed: parseStaffingSourceFile_(file),
    }));

    /*
     * =====================================================
     * ÚLTIMA FOTO POR PROYECTO
     * =====================================================
     *
     * Ejemplo:
     *
     * fichero A:
     *   Blue Buddy
     *
     * fichero B:
     *   Panorama
     *
     * Ambos se conservan.
     *
     * Si dos ficheros contienen Blue Buddy,
     * se utiliza el más reciente para Blue Buddy.
     * =====================================================
     */

    const latestFileByProject = new Map();

    parsedFiles.forEach(({ file, parsed }) => {
      const projectCodes = [
        ...new Set(
          parsed.rows
            .map((row) => String(row.projectCode || "").trim())
            .filter(Boolean),
        ),
      ];

      projectCodes.forEach((projectCode) => {
        const current = latestFileByProject.get(projectCode);

        if (
          !current ||
          file.getLastUpdated().getTime() >
            current.file.getLastUpdated().getTime()
        ) {
          latestFileByProject.set(projectCode, {
            file,
            parsed,
          });
        }
      });
    });

    /*
     * =====================================================
     * CONSOLIDACIÓN
     * =====================================================
     */

    const consolidatedRows = [];

    const seenRows = new Set();

    let ignoredRows = 0;

    let duplicates = 0;

    latestFileByProject.forEach(({ parsed }, projectCode) => {
      ignoredRows += Number(parsed.ignoredRows || 0);

      parsed.rows
        .filter((row) => String(row.projectCode || "").trim() === projectCode)
        .forEach((row) => {
          const dedupeKey = staffingRowDedupeKey_(row);

          if (seenRows.has(dedupeKey)) {
            duplicates += 1;

            return;
          }

          seenRows.add(dedupeKey);

          consolidatedRows.push(row);
        });
    });

    if (!consolidatedRows.length) {
      throw new Error(
        "Los CSV de Staffing no contienen posiciones válidas para los productos y scrums configurados.",
      );
    }

    /*
     * =====================================================
     * SPREADSHEET
     * =====================================================
     */

    writeStaffingSheet_(spreadsheet, consolidatedRows);

    SpreadsheetApp.flush();

    /*
     * =====================================================
     * DATASET
     * =====================================================
     */

    const dataset = buildStaffingDataset_(consolidatedRows);

    const latestProducts = dataset.products.map((product) => ({
      productId: product.productId,

      latestPeriod: product.latestPeriod,

      periods: product.periods.map((period) => ({
        period: period.period,

        year: period.year,

        quarter: period.quarter,

        totalFte: period.totalFte,

        assignedFte: period.assignedFte,

        openFte: period.openFte,

        positions: period.positions,

        scrums: period.scrums.map((scrum) => ({
          name: scrum.name,

          totalFte: scrum.totalFte,

          positions: scrum.positions,

          assignedFte: scrum.assignedFte,

          openFte: scrum.openFte,
        })),
      })),
    }));

    spreadsheet.toast(
      [
        `CSV procesados: ${sourceFiles.length}`,
        `Proyectos: ${latestFileByProject.size}`,
        `Filas: ${consolidatedRows.length}`,
        `Productos: ${dataset.products.length}`,
      ].join(" · "),
      "Staffing actualizado",
      8,
    );

    Logger.log(
      JSON.stringify(
        {
          files: sourceFiles.map((file) => ({
            id: file.getId(),
            name: file.getName(),
            updatedAt: file.getLastUpdated().toISOString(),
          })),

          projects: [...latestFileByProject.keys()],

          rows: consolidatedRows.length,

          ignoredRows,

          duplicates,

          products: latestProducts,
        },
        null,
        2,
      ),
    );

    return dataset;
  } catch (error) {
    const message =
      error && error.message
        ? error.message
        : "No se ha podido actualizar Staffing.";

    spreadsheet.toast(message, "Error actualizando Staffing", 10);

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

function getStaffingSourceFolder_() {
  const folderId = getRequiredScriptProperty_(
    STAFFING_CONFIG.sourceFolderProperty,
  );

  try {
    return DriveApp.getFolderById(folderId);
  } catch (error) {
    throw new Error(
      `No se ha podido abrir la carpeta de Staffing ` +
        `configurada en "${STAFFING_CONFIG.sourceFolderProperty}". ` +
        `${error?.message || error}`,
    );
  }
}

function findStaffingSourceFiles_() {
  const folder = getStaffingSourceFolder_();

  const files = folder.getFiles();

  const candidates = [];

  while (files.hasNext()) {
    const file = files.next();

    const fileName = String(file.getName() || "").trim();

    const isCsv = fileName.toLowerCase().endsWith(".csv");

    const matchesPrefix = fileName
      .toLowerCase()
      .startsWith(STAFFING_CONFIG.sourceFilePrefix.toLowerCase());

    if (isCsv && matchesPrefix) {
      candidates.push(file);
    }
  }

  if (!candidates.length) {
    throw new Error(
      `No se ha encontrado ningún fichero "${STAFFING_CONFIG.sourceFilePrefix}*.csv" en la carpeta de Staffing.`,
    );
  }

  candidates.sort(
    (left, right) =>
      left.getLastUpdated().getTime() - right.getLastUpdated().getTime(),
  );

  return candidates;
}

/*
 * =========================================================
 * CSV
 * =========================================================
 */

function parseStaffingSourceFile_(file) {
  /*
   * La exportación actual utiliza Windows-1252.
   */
  const csvText = file.getBlob().getDataAsString("Windows-1252");

  const matrix = Utilities.parseCsv(csvText, ";");

  if (!Array.isArray(matrix) || !matrix.length) {
    throw new Error("El CSV de Staffing está vacío.");
  }

  const headerRowIndex = findStaffingHeaderRow_(matrix);

  if (headerRowIndex < 0) {
    throw new Error("No se ha encontrado la cabecera de Staffing en el CSV.");
  }

  const headers = matrix[headerRowIndex];

  const headerMap = buildStaffingHeaderMap_(headers);

  validateStaffingHeaders_(headerMap);

  const sourceUpdatedAt = Utilities.formatDate(
    file.getLastUpdated(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd'T'HH:mm:ss",
  );

  const rows = [];

  const seenRows = new Set();

  let ignoredRows = 0;

  let duplicates = 0;

  matrix.slice(headerRowIndex + 1).forEach((sourceRow) => {
    const normalized = normalizeStaffingSourceRow_(sourceRow, headerMap, {
      sourceFileId: file.getId(),

      sourceFileName: file.getName(),

      sourceUpdatedAt,
    });

    if (!normalized) {
      ignoredRows += 1;

      return;
    }

    const dedupeKey = staffingRowDedupeKey_(normalized);

    if (seenRows.has(dedupeKey)) {
      duplicates += 1;

      return;
    }

    seenRows.add(dedupeKey);

    rows.push(normalized);
  });

  return {
    rows,

    ignoredRows,

    duplicates,
  };
}

function findStaffingHeaderRow_(matrix) {
  for (let index = 0; index < matrix.length; index += 1) {
    const row = matrix[index];

    const normalized = row.map(staffingFold_);

    const hasProject = normalized.includes(staffingFold_("Código de proyecto"));

    const hasPosition = normalized.includes(staffingFold_("Id de la posición"));

    const hasScrum = normalized.includes(staffingFold_("Equipo"));

    if (hasProject && hasPosition && hasScrum) {
      return index;
    }
  }

  return -1;
}

function buildStaffingHeaderMap_(headers) {
  const map = {};

  headers.forEach((header, index) => {
    const key = staffingFold_(header);

    if (!key) {
      return;
    }

    map[key] = index;
  });

  return map;
}

function validateStaffingHeaders_(headerMap) {
  [
    "Código de proyecto",

    "Descripción de proyecto",

    "Id de la posición",

    "Título de la posición",

    "FTEs demandados",

    "Equipo",

    "Tipo de colaboración",

    "Año-Q de la posición",

    "País demandado",

    "Dominio demandado",

    "Pool demandado",

    "Perfil demandado",

    "Experiencia demandada",

    "SW / Non SW",

    "Estado",

    "ID asignación",

    "Tipo asignación",

    "Motivo No Cubierta",

    "FTEs asignados",

    "Perfil persona asignada",

    "Experiencia persona asignada",

    "Empresa asignada",

    "Program de proyecto",
  ].forEach((header) => {
    const key = staffingFold_(header);

    if (!Object.prototype.hasOwnProperty.call(headerMap, key)) {
      throw new Error(
        `Falta la columna obligatoria "${header}" en el CSV de Staffing.`,
      );
    }
  });
}
function staffingCsvFirstValue_(row, headerMap, headers) {
  const candidates = Array.isArray(headers) ? headers : [];

  for (const header of candidates) {
    const value = staffingCsvValue_(row, headerMap, header);

    const normalized = staffingText_(value);

    if (normalized) {
      return normalized;
    }
  }

  return "";
}
function staffingCsvValue_(row, headerMap, header) {
  const index = headerMap[staffingFold_(header)];

  if (index === undefined) {
    return "";
  }

  return row[index] ?? "";
}

/*
 * =========================================================
 * NORMALIZACIÓN DE FILA
 * =========================================================
 */

function normalizeStaffingSourceRow_(row, headerMap, source) {
  const projectCode = staffingText_(
    staffingCsvValue_(row, headerMap, "Código de proyecto"),
  );

  const projectName = staffingText_(
    staffingCsvValue_(row, headerMap, "Descripción de proyecto"),
  );

  const productId = normalizeStaffingProductId_(projectName);

  const positionId = normalizeStaffingId_(
    staffingCsvValue_(row, headerMap, "Id de la posición"),
  );

  const period = normalizeStaffingPeriod_(
    staffingCsvValue_(row, headerMap, "Año-Q de la posición"),
  );

  const scrum = normalizeStaffingScrum_(
    staffingCsvValue_(row, headerMap, "Equipo"),
  );

  if (!projectCode || !productId || !positionId || !period || !scrum) {
    return null;
  }

  if (!staffingScrumIsEnabled_(productId, scrum)) {
    return null;
  }

  const periodContext = staffingPeriodContext_(period);

  const role =
    staffingText_(staffingCsvValue_(row, headerMap, "Título de la posición")) ||
    "Sin rol";

  const demandFte = staffingNumber_(
    staffingCsvValue_(row, headerMap, "FTEs demandados"),
  );

  const collaborationType =
    staffingText_(staffingCsvValue_(row, headerMap, "Tipo de colaboración")) ||
    "Sin clasificar";

  const countryCode = normalizeStaffingCountryCode_(
    staffingCsvValue_(row, headerMap, "País demandado"),
  );

  const domainCode = normalizeStaffingDomainCode_(
    staffingCsvValue_(row, headerMap, "Dominio demandado"),
  );

  const poolCode = staffingText_(
    staffingCsvValue_(row, headerMap, "Pool demandado"),
  );

  const poolLabel = normalizeStaffingPoolLabel_(poolCode);

  const workforceType = normalizeStaffingWorkforceType_(
    staffingCsvValue_(row, headerMap, "SW / Non SW"),
  );

  const status = staffingText_(staffingCsvValue_(row, headerMap, "Estado"));

  const demandProfile = staffingText_(
    staffingCsvValue_(row, headerMap, "Perfil demandado"),
  );

  const demandExperience = staffingText_(
    staffingCsvValue_(row, headerMap, "Experiencia demandada"),
  );

  const assignmentId = normalizeStaffingId_(
    staffingCsvValue_(row, headerMap, "ID asignación"),
  );

  const assignmentType = staffingText_(
    staffingCsvValue_(row, headerMap, "Tipo asignación"),
  );

  const assignmentReason = staffingText_(
    staffingCsvValue_(row, headerMap, "Motivo No Cubierta"),
  );

  const rawAssignedFte = staffingNumber_(
    staffingCsvValue_(row, headerMap, "FTEs asignados"),
  );

  const assignedFte = staffingEffectiveAssignedFte_(
    assignmentType,
    rawAssignedFte,
  );

  /*
   * El nombre ha cambiado de cabecera entre
   * distintas exportaciones de Staffing.
   *
   * Lo buscamos de forma tolerante.
   */
  const personName = staffingCsvFirstValue_(row, headerMap, [
    "Nombre persona asignada",
    "Persona asignada",
    "Descripción de la asignación",
    "Descripción asignación",
    "Descripción",
  ]);

  const assignedProfile = staffingText_(
    staffingCsvValue_(row, headerMap, "Perfil persona asignada"),
  );

  const assignedExperience = staffingText_(
    staffingCsvValue_(row, headerMap, "Experiencia persona asignada"),
  );

  const profile = assignedProfile || demandProfile || "Sin perfil";

  const experience =
    assignedExperience || demandExperience || "Sin experiencia informada";

  const company = normalizeStaffingCompany_(
    staffingCsvValue_(row, headerMap, "Empresa asignada"),
    assignmentType,
  );

  return {
    programId: STAFFING_CONFIG.programId,

    productId,

    projectCode,

    projectName,

    programName: staffingText_(
      staffingCsvValue_(row, headerMap, "Program de proyecto"),
    ),

    period,

    year: periodContext.year,

    quarter: periodContext.quarter,

    scrum,

    positionId,

    role,

    demandFte,

    collaborationType,

    countryCode,

    countryLabel: staffingCountryLabel_(countryCode),

    domainCode,

    domainLabel: staffingDomainLabel_(domainCode),

    poolCode,

    poolLabel,

    workforceType,

    status,

    demandProfile,

    demandExperience,

    assignmentId,

    assignmentType,

    assignmentReason,

    assignedFte,

    personName,

    profile,

    experience,

    company,

    sourceFileId: source.sourceFileId,

    sourceFileName: source.sourceFileName,

    sourceUpdatedAt: source.sourceUpdatedAt,
  };
}

function staffingRowDedupeKey_(row) {
  const assignmentKey =
    row.assignmentId ||
    [
      row.assignmentType,
      row.assignmentReason,
      row.assignedFte,
      row.personName,
      row.company,
      row.profile,
      row.experience,
    ].join("::");

  return [row.productId, row.positionId, row.period, assignmentKey].join("::");
}

/*
 * =========================================================
 * PRODUCTO / SCRUM
 * =========================================================
 */

function normalizeStaffingProductId_(value) {
  const folded = staffingFold_(value);

  if (!folded) {
    return "";
  }

  if (folded.includes("blue buddy")) {
    return "blue-buddy";
  }

  if (folded.includes("panorama") || folded.includes("franchise")) {
    return "panorama";
  }

  if (folded === "blue") {
    return "blue";
  }

  return folded.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function normalizeStaffingScrum_(value) {
  const raw = staffingText_(value);

  const folded = staffingFold_(raw);

  const aliases = {
    "blue buddy experience": "Blue Buddy Experience",

    cross: "Cross",

    "sales assistant": "Sales Assistant",
  };

  return aliases[folded] || raw;
}

function staffingScrumIsEnabled_(productId, scrum) {
  const configured = STAFFING_CONFIG.productScrums[productId];

  if (!Array.isArray(configured) || !configured.length) {
    return true;
  }

  const target = staffingFold_(scrum);

  return configured.some((item) => staffingFold_(item) === target);
}

/*
 * =========================================================
 * PERIODO
 * =========================================================
 */

function normalizeStaffingPeriod_(value) {
  const text = staffingText_(value).replace(/\D/g, "");

  const match = text.match(/^(\d{4})0?([1-4])$/);

  if (!match) {
    return "";
  }

  return [match[1], "0", match[2]].join("");
}

function staffingPeriodContext_(period) {
  const match = String(period || "").match(/^(\d{4})0([1-4])$/);

  if (!match) {
    return {
      year: 0,
      quarter: "",
    };
  }

  return {
    year: Number(match[1]),

    quarter: `Q${match[2]}`,
  };
}

/*
 * =========================================================
 * PAÍS
 * =========================================================
 */

function normalizeStaffingCountryCode_(value) {
  const code = staffingText_(value).toUpperCase();

  const aliases = {
    HOLDING: "HLD",
    HL: "HLD",

    ESP: "SPN",
    ES: "SPN",
    SPAIN: "SPN",

    MX: "MEX",
    MEXICO: "MEX",

    PE: "PER",
    PERU: "PER",

    CO: "COL",
    COLOMBIA: "COL",
  };

  return aliases[code] || code;
}

function staffingCountryLabel_(code) {
  const labels = {
    HLD: "Holding",

    SPN: "España",

    MEX: "México",

    PER: "Perú",

    COL: "Colombia",
  };

  return labels[String(code || "").toUpperCase()] || code || "Sin país";
}

/*
 * =========================================================
 * DOMINIO
 * =========================================================
 */

function normalizeStaffingDomainCode_(value) {
  return staffingText_(value).toUpperCase();
}

function staffingDomainLabel_(code) {
  const labels = {
    ENG: "Engineering",

    DAT: "Data",

    RCS: "RCS",
  };

  return labels[String(code || "").toUpperCase()] || code || "Sin dominio";
}
function normalizeStaffingWorkforceType_(value) {
  const raw = staffingText_(value);

  const normalized = staffingFold_(raw).replace(/[^a-z0-9]+/g, "");

  if (normalized === "sw" || normalized === "software") {
    return "SW";
  }

  if (
    normalized === "nonsw" ||
    normalized === "nonsoftware" ||
    normalized === "nosw"
  ) {
    return "Non SW";
  }

  return raw || "Sin clasificar";
}
/*
 * =========================================================
 * EMPRESA
 * =========================================================
 */

function normalizeStaffingCompany_(companyValue, assignmentType) {
  const company = staffingText_(companyValue);

  if (company) {
    return company;
  }

  const assignment = staffingFold_(assignmentType);

  if (assignment.includes("interno")) {
    /*
     * La exportación no informa la entidad legal
     * para el pool interno, aunque Staffing sí la
     * muestra en pantalla.
     *
     * Funcionalmente lo clasificamos como BBVA.
     */
    return "BBVA";
  }

  if (assignment === "pendiente de asignar" || assignment === "no cubierta") {
    return "Sin asignar";
  }

  return "Sin informar";
}

/*
 * =========================================================
 * ASIGNACIÓN
 * =========================================================
 */

function staffingEffectiveAssignedFte_(assignmentType, assignedFte) {
  const assignment = staffingFold_(assignmentType);

  if (assignment === "pendiente de asignar" || assignment === "no cubierta") {
    return 0;
  }

  return staffingRoundFte_(assignedFte);
}

function staffingIsInvalidDemand_(assignmentReason) {
  return staffingFold_(assignmentReason) === "error en la demanda";
}

/*
 * =========================================================
 * SHEET
 * =========================================================
 */

function writeStaffingSheet_(spreadsheet, rows) {
  let sheet = spreadsheet.getSheetByName(STAFFING_CONFIG.sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(STAFFING_CONFIG.sheetName);
  }

  sheet.clearContents();

  /*
   * =====================================================
   * IDENTIFICADORES COMO TEXTO
   * =====================================================
   *
   * positionId y assignmentId pueden superar los
   * 15 dígitos.
   *
   * Google Sheets no debe interpretarlos como números
   * porque podría:
   *
   * - mostrarlos en notación científica;
   * - redondearlos;
   * - perder precisión;
   * - hacer que dos posiciones distintas parezcan iguales.
   *
   * También dejamos period y projectCode como texto
   * porque son identificadores, no magnitudes.
   * =====================================================
   */

  const textColumns = [
    "projectCode",
    "period",
    "positionId",
    "assignmentId",
    "sourceFileId",
  ];

  textColumns.forEach((header) => {
    const columnIndex = STAFFING_SHEET_HEADERS.indexOf(header) + 1;

    if (columnIndex <= 0) {
      return;
    }

    sheet.getRange(1, columnIndex, sheet.getMaxRows(), 1).setNumberFormat("@");
  });

  /*
   * =====================================================
   * CABECERA
   * =====================================================
   */

  sheet
    .getRange(1, 1, 1, STAFFING_SHEET_HEADERS.length)
    .setValues([STAFFING_SHEET_HEADERS]);

  if (!rows.length) {
    sheet.setFrozenRows(1);

    return;
  }

  /*
   * Forzamos explícitamente los identificadores
   * a String antes de escribir.
   */
  const values = rows.map((row) =>
    STAFFING_SHEET_HEADERS.map((header) => {
      const value = row[header] ?? "";

      if (textColumns.includes(header)) {
        return String(value);
      }

      return value;
    }),
  );

  sheet
    .getRange(2, 1, values.length, STAFFING_SHEET_HEADERS.length)
    .setValues(values);

  sheet.setFrozenRows(1);
}

/*
 * =========================================================
 * DATASET
 * =========================================================
 */

function getStaffingData_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = spreadsheet.getSheetByName(STAFFING_CONFIG.sheetName);

  const rows = sheet ? sheetToObjects_(sheet) : [];

  return buildStaffingDataset_(rows);
}

function buildStaffingDataset_(rows) {
  const sourceRows = Array.isArray(rows) ? rows : [];

  const productsMap = new Map();

  sourceRows.forEach((row) => {
    const productId = staffingText_(row.productId);

    const period = normalizeStaffingPeriod_(row.period);

    if (!productId || !period) {
      return;
    }

    if (!productsMap.has(productId)) {
      productsMap.set(productId, new Map());
    }

    const periodsMap = productsMap.get(productId);

    if (!periodsMap.has(period)) {
      periodsMap.set(period, []);
    }

    periodsMap.get(period).push(row);
  });

  const products = [];

  productsMap.forEach((periodsMap, productId) => {
    const periods = [];

    periodsMap.forEach((periodRows, period) => {
      const positions = buildStaffingPositions_(periodRows);

      const scrums = buildStaffingScrums_(positions);

      const context = staffingPeriodContext_(period);

      const validPositions = positions.filter(
        (position) => !position.invalidDemand,
      );

      const totalFte = staffingRoundFte_(
        validPositions.reduce((sum, position) => sum + position.demandFte, 0),
      );

      const assignedFte = staffingRoundFte_(
        validPositions.reduce((sum, position) => sum + position.assignedFte, 0),
      );

      const openFte = staffingRoundFte_(
        validPositions.reduce((sum, position) => sum + position.openFte, 0),
      );

      const invalidFte = staffingRoundFte_(
        positions
          .filter((position) => position.invalidDemand)
          .reduce((sum, position) => sum + position.demandFte, 0),
      );

      periods.push({
        period,

        year: context.year,

        quarter: context.quarter,

        totalFte,

        assignedFte,

        openFte,

        invalidFte,

        positions: validPositions.length,

        scrums,
      });
    });

    periods.sort((left, right) => Number(left.period) - Number(right.period));

    products.push({
      programId: STAFFING_CONFIG.programId,

      productId,

      latestPeriod: periods.length ? periods[periods.length - 1].period : "",

      periods,
    });
  });

  products.sort((left, right) =>
    left.productId.localeCompare(right.productId, "es"),
  );

  const firstSourceRow = sourceRows[0] || {};

  return {
    generatedAt: new Date().toISOString(),

    dataset: "staffing",

    source: {
      fileId: staffingText_(firstSourceRow.sourceFileId),

      fileName: staffingText_(firstSourceRow.sourceFileName),

      updatedAt: staffingText_(firstSourceRow.sourceUpdatedAt),
    },

    products,
  };
}

/*
 * =========================================================
 * POSICIONES
 * =========================================================
 */

function buildStaffingPositions_(rows) {
  const positionsMap = new Map();

  rows.forEach((row) => {
    const positionId = normalizeStaffingId_(row.positionId);

    if (!positionId) {
      return;
    }

    if (!positionsMap.has(positionId)) {
      positionsMap.set(positionId, {
        id: positionId,

        scrum: staffingText_(row.scrum),

        role: staffingText_(row.role) || "Sin rol",

        demandFte: staffingNumber_(row.demandFte),

        collaborationType:
          staffingText_(row.collaborationType) || "Sin clasificar",

        workforceType: staffingText_(row.workforceType) || "Sin clasificar",

        country: {
          code: staffingText_(row.countryCode),

          label: staffingText_(row.countryLabel),
        },

        domain: {
          code: staffingText_(row.domainCode),

          label: staffingText_(row.domainLabel),
        },

        pool: {
          code: staffingText_(row.poolCode),

          label: staffingText_(row.poolLabel) || "Sin Pool",
        },

        status: staffingText_(row.status),

        demandProfile: staffingText_(row.demandProfile),

        demandExperience: staffingText_(row.demandExperience),

        assignments: [],

        assignmentKeys: new Set(),
      });
    }

    const position = positionsMap.get(positionId);

    const assignmentKey =
      staffingText_(row.assignmentId) ||
      [
        row.assignmentType,
        row.assignmentReason,
        row.assignedFte,
        row.personName,
        row.company,
        row.profile,
        row.experience,
      ].join("::");

    if (position.assignmentKeys.has(assignmentKey)) {
      return;
    }

    position.assignmentKeys.add(assignmentKey);

    position.assignments.push({
      id: staffingText_(row.assignmentId),

      type: staffingText_(row.assignmentType),

      reason: staffingText_(row.assignmentReason),

      fte: staffingNumber_(row.assignedFte),

      personName: staffingText_(row.personName),

      profile:
        staffingText_(row.profile) || position.demandProfile || "Sin perfil",

      experience:
        staffingText_(row.experience) ||
        position.demandExperience ||
        "Sin experiencia informada",

      company: staffingText_(row.company) || "Sin informar",
    });
  });

  return [...positionsMap.values()].map((position) => {
    const invalidDemand = position.assignments.some((assignment) =>
      staffingIsInvalidDemand_(assignment.reason),
    );

    const rawAssignedFte = staffingRoundFte_(
      position.assignments.reduce((sum, assignment) => sum + assignment.fte, 0),
    );

    const assignedFte = invalidDemand
      ? 0
      : staffingRoundFte_(Math.min(position.demandFte, rawAssignedFte));

    const openFte = invalidDemand
      ? 0
      : staffingRoundFte_(Math.max(0, position.demandFte - assignedFte));

    const profiles = [
      ...new Set(
        position.assignments
          .map((assignment) => assignment.profile)
          .filter(Boolean),
      ),
    ];

    const experiences = [
      ...new Set(
        position.assignments
          .map((assignment) => assignment.experience)
          .filter(Boolean),
      ),
    ];

    const companies = aggregateStaffingAssignmentsByCompany_(
      position.assignments,
    );

    delete position.assignmentKeys;

    return {
      ...position,

      profile: profiles.length
        ? profiles.join(" / ")
        : position.demandProfile || "Sin perfil",

      experience: experiences.length
        ? experiences.join(" / ")
        : position.demandExperience || "Sin experiencia informada",

      companies,

      assignedFte,

      openFte,

      invalidDemand,
    };
  });
}

/*
 * =========================================================
 * SCRUMS
 * =========================================================
 */

function buildStaffingScrums_(positions) {
  const scrumsMap = new Map();

  positions.forEach((position) => {
    const scrumName = position.scrum || "Sin scrum";

    if (!scrumsMap.has(scrumName)) {
      scrumsMap.set(scrumName, []);
    }

    scrumsMap.get(scrumName).push(position);
  });

  const result = [];

  scrumsMap.forEach((scrumPositions, scrumName) => {
    const validPositions = scrumPositions.filter(
      (position) => !position.invalidDemand,
    );

    const totalFte = staffingRoundFte_(
      validPositions.reduce((sum, position) => sum + position.demandFte, 0),
    );

    const assignedFte = staffingRoundFte_(
      validPositions.reduce((sum, position) => sum + position.assignedFte, 0),
    );

    const openFte = staffingRoundFte_(
      validPositions.reduce((sum, position) => sum + position.openFte, 0),
    );

    const invalidFte = staffingRoundFte_(
      scrumPositions
        .filter((position) => position.invalidDemand)
        .reduce((sum, position) => sum + position.demandFte, 0),
    );

    result.push({
      id: staffingSlug_(scrumName),

      name: scrumName,

      totalFte,

      assignedFte,

      openFte,

      invalidFte,

      coveragePct:
        totalFte > 0 ? staffingRoundPct_((assignedFte / totalFte) * 100) : 0,

      positions: validPositions.length,

      roles: aggregateStaffingPositions_(
        validPositions,
        (position) => position.role,
      ),

      profiles: aggregateStaffingPositions_(
        validPositions,
        (position) => position.profile,
      ),

      companies: aggregateStaffingCompanies_(validPositions),

      collaboration: aggregateStaffingPositions_(
        validPositions,
        (position) => position.collaborationType,
      ),

      workforce: aggregateStaffingPositions_(
        validPositions,
        (position) => position.workforceType,
      ),

      countries: aggregateStaffingPositions_(
        validPositions,
        (position) => position.country.label,
      ),

      domains: aggregateStaffingPositions_(
        validPositions,
        (position) => position.domain.label,
      ),

      positionDetails: validPositions,
    });
  });

  const preferredOrder = STAFFING_CONFIG.productScrums["blue-buddy"] || [];

  result.sort((left, right) => {
    const leftIndex = preferredOrder.indexOf(left.name);

    const rightIndex = preferredOrder.indexOf(right.name);

    if (leftIndex >= 0 && rightIndex >= 0) {
      return leftIndex - rightIndex;
    }

    if (leftIndex >= 0) {
      return -1;
    }

    if (rightIndex >= 0) {
      return 1;
    }

    return left.name.localeCompare(right.name, "es");
  });

  return result;
}

/*
 * =========================================================
 * AGREGACIONES
 * =========================================================
 */

function aggregateStaffingPositions_(positions, keyResolver) {
  const map = new Map();

  positions.forEach((position) => {
    const name = staffingText_(keyResolver(position)) || "Sin clasificar";

    if (!map.has(name)) {
      map.set(name, {
        name,

        positions: 0,

        fte: 0,
      });
    }

    const metric = map.get(name);

    metric.positions += 1;

    metric.fte = staffingRoundFte_(metric.fte + position.demandFte);
  });

  return [...map.values()].sort(
    (left, right) =>
      right.fte - left.fte || left.name.localeCompare(right.name, "es"),
  );
}

function aggregateStaffingAssignmentsByCompany_(assignments) {
  const map = new Map();

  assignments.forEach((assignment) => {
    const company = assignment.company || "Sin informar";

    if (!map.has(company)) {
      map.set(company, {
        name: company,

        fte: 0,
      });
    }

    const metric = map.get(company);

    metric.fte = staffingRoundFte_(metric.fte + assignment.fte);
  });

  return [...map.values()].sort(
    (left, right) =>
      right.fte - left.fte || left.name.localeCompare(right.name, "es"),
  );
}

function aggregateStaffingCompanies_(positions) {
  const map = new Map();

  positions.forEach((position) => {
    position.companies.forEach((company) => {
      if (company.name === "Sin asignar" || company.fte <= 0) {
        return;
      }

      if (!map.has(company.name)) {
        map.set(company.name, {
          name: company.name,

          fte: 0,
        });
      }

      const metric = map.get(company.name);

      metric.fte = staffingRoundFte_(metric.fte + company.fte);
    });
  });

  return [...map.values()].sort(
    (left, right) =>
      right.fte - left.fte || left.name.localeCompare(right.name, "es"),
  );
}

/*
 * =========================================================
 * TEST
 * =========================================================
 */

function testStaffingData() {
  const dataset = getStaffingData_();

  Logger.log(JSON.stringify(dataset, null, 2));

  return dataset;
}

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

function staffingText_(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function staffingFold_(value) {
  return staffingText_(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function staffingNumber_(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return staffingRoundFte_(value);
  }

  let text = staffingText_(value);

  if (!text) {
    return 0;
  }

  if (text.includes(",")) {
    text = text.replace(/\./g, "").replace(",", ".");
  }

  const number = Number(text);

  return Number.isFinite(number) ? staffingRoundFte_(number) : 0;
}

function staffingRoundFte_(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function staffingRoundPct_(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function normalizeStaffingId_(value) {
  return staffingText_(value).replace(/^'+/, "");
}

function staffingSlug_(value) {
  return staffingFold_(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function normalizeStaffingPoolLabel_(value) {
  const raw = staffingText_(value);

  if (!raw) {
    return "Sin Pool";
  }

  const parts = raw
    .split(" - ")
    .map((part) => staffingText_(part))
    .filter(Boolean);

  if (parts.length >= 3) {
    return parts.slice(2).join(" - ");
  }

  return raw;
}
