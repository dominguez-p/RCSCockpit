/**
 * AIxBanker - JIRA Feature execution source (XLSX)
 *
 * Replaces the previous HTML-workspace parser while preserving the public
 * sheet/function contract used by the current Apps Script backend:
 *   - sheet: jiraWorkspaceFeatures
 *   - refresh function: refreshJiraWorkspaceFeatures()
 *
 * Source workbook expected columns:
 *   Priority | Status | Summary | Progress | Blocked issues | Total Stories
 *
 * Hierarchy is read from the Excel row outlineLevel:
 *   0 = aggregate/container
 *   1 = Feature
 *   2 = Story/task (not exported yet; lower-level navigation will be added later)
 */

const JIRA_FEATURE_XLSX_CONFIG_ = Object.freeze({
  programId: "aixbanker",
  defaultCountry: "ES",
  defaultProduct: "blue-buddy",
  sheetName: "jiraWorkspaceFeatures",
  mappingSheetName: "jiraCapabilityMapping",
  sourceNameTokens: ["AI", "BANKER"],
  containerPreference: [
    "RETAIL26 - AI X BANKER [ESP] 2026",
    "BLUE BUDDY",
    "AI X BANKER",
    "RETAIL AI EXPERIENCE 2025",
  ],
});

function jiraWorkspaceFeatureSheetName_() {
  return JIRA_FEATURE_XLSX_CONFIG_.sheetName;
}

function jiraProductMappingSheetName_() {
  return "jiraProductMapping";
}

function jiraWorkspaceFeatureHeaders_() {
  return [
    "programId",
    "country",
    "product",
    "id",
    "type",
    "track",
    "planningSource",
    "jiraKey",
    "jiraUrl",
    "name",
    "summary",
    "description",
    "status",
    "statusRaw",
    "resolution",
    "priority",
    "assignee",
    "labels",
    "workspaceKey",
    "workspaceName",
    "workspaceType",
    "teamBacklog",
    "teamBacklogGeography",
    "workspaceGeography",
    "deliveryType",
    "commitment",
    "programIncrement",
    "piEstimate",
    "sprintEstimate",
    "startDate",
    "endDate",
    "targetDate",
    "planningDateSource",
    "sdaId",
    "sdaName",
    "sdaE2E",
    "sdaStatus",
    "deliverable",
    "analysisId",
    "analysisStatus",
    "createdAt",
    "updatedAt",
    "resolvedAt",
    "lastUpdate",
    "detailLevel",
    "jiraDiscarded",
    "sourceFile",
    "sourceUpdatedAt",
    "progress",
    "blockedIssues",
    "totalStories",
    "containerName",
    "sourceFeatureKey",
    "mappingMatch",
  ];
}

function refreshJiraWorkspaceFeatures() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const lock = LockService.getDocumentLock();

  if (!lock.tryLock(1000)) {
    spreadsheet.toast(
      "Ya hay una actualización de Features JIRA en curso.",
      "AIxBanker",
      6,
    );
    return;
  }

  try {
    spreadsheet.toast(
      "Procesando fichero XLSX de Features JIRA...",
      "AIxBanker",
      6,
    );

    const sourceFile = jiraFeatureFindLatestXlsx_();
    const parsedRows = jiraFeatureParseXlsx_(sourceFile.getBlob());
    const featureRows = jiraFeatureSelectFeatures_(parsedRows);
    const mappingIndex = jiraFeatureLoadMappingIndex_(spreadsheet);
    const exportedRows = featureRows.map((feature) =>
      jiraFeatureBuildExportRow_(feature, sourceFile, mappingIndex),
    );

    jiraFeatureReplaceSheet_(spreadsheet, exportedRows);
    SpreadsheetApp.flush();

    const mapped = exportedRows.filter(
      (row) => row.mappingMatch && row.mappingMatch !== "unmapped",
    ).length;
    const blocked = exportedRows.filter(
      (row) => jiraFeatureStatusToken_(row.statusRaw) === "blocked",
    ).length;

    spreadsheet.toast(
      `Features JIRA: ${exportedRows.length} · mapeadas: ${mapped} · bloqueadas: ${blocked}`,
      "Foto JIRA actualizada",
      10,
    );

    Logger.log(
      JSON.stringify(
        {
          sourceFile: sourceFile.getName(),
          sourceUpdatedAt: sourceFile.getLastUpdated().toISOString(),
          parsedRows: parsedRows.length,
          featureRowsBeforeDedup: parsedRows.filter(
            (row) => row.outlineLevel === 1,
          ).length,
          features: exportedRows.length,
          mapped,
          blocked,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    spreadsheet.toast(message, "Error actualizando Features JIRA", 10);
    console.error(error);
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function jiraFeatureFindLatestXlsx_() {
  if (typeof getJiraE2EFolder_ !== "function") {
    throw new Error(
      "No está disponible getJiraE2EFolder_(). Mantén cargado el módulo JIRA de MSAs.",
    );
  }

  const folder = getJiraE2EFolder_();
  const files = folder.getFiles();
  const matches = [];
  const requiredTokens = JIRA_FEATURE_XLSX_CONFIG_.sourceNameTokens.map(
    (value) => String(value).trim().toUpperCase(),
  );

  while (files.hasNext()) {
    const file = files.next();
    const name = String(file.getName() || "");
    const comparable = name.toUpperCase();

    if (!/\.XLSX$/i.test(name)) {
      continue;
    }

    if (
      requiredTokens.length &&
      !requiredTokens.every((token) => comparable.includes(token))
    ) {
      continue;
    }

    matches.push(file);
  }

  if (!matches.length) {
    throw new Error(
      `No se ha encontrado ningún XLSX JIRA que contenga: ${requiredTokens.join(
        " + ",
      )}.`,
    );
  }

  matches.sort(
    (left, right) =>
      right.getLastUpdated().getTime() - left.getLastUpdated().getTime(),
  );

  return matches[0];
}

function jiraFeatureParseXlsx_(blob) {
  if (!blob) {
    throw new Error("No se ha recibido el fichero XLSX de Features JIRA.");
  }

  /*
   * Un XLSX es internamente un fichero ZIP.
   *
   * Drive entrega normalmente el blob con MIME:
   *
   * application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
   *
   * pero Utilities.unzip() exige explícitamente:
   *
   * application/zip
   *
   * Cambiamos únicamente el Content-Type de una copia
   * del blob. El contenido binario no se modifica.
   */
  const zipBlob = blob.copyBlob().setContentType("application/zip");

  let entries;

  try {
    entries = Utilities.unzip(zipBlob);
  } catch (error) {
    const message = error && error.message ? error.message : String(error);

    throw new Error(`No se ha podido abrir el XLSX como ZIP: ${message}`);
  }

  if (!Array.isArray(entries) || !entries.length) {
    throw new Error(
      "El fichero XLSX está vacío o no contiene una estructura ZIP válida.",
    );
  }

  const byName = new Map();

  entries.forEach((entry) => {
    const name = String(entry.getName() || "")
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");

    if (!name) {
      return;
    }

    byName.set(name, entry);
  });

  /*
   * Shared Strings es opcional.
   *
   * Algunos Excel guardan los textos
   * directamente como inlineStr.
   */
  const sharedStrings = jiraFeatureReadSharedStrings_(
    byName.get("xl/sharedStrings.xml"),
  );

  /*
   * De momento trabajamos con la primera
   * worksheet del fichero origen.
   *
   * Es la hoja que contiene:
   *
   * Priority
   * Status
   * Summary
   * Progress
   * Blocked issues
   * Total Stories
   */
  const worksheet = byName.get("xl/worksheets/sheet1.xml");

  if (!worksheet) {
    const availableWorksheets = [...byName.keys()]
      .filter((name) => name.startsWith("xl/worksheets/"))
      .join(", ");

    throw new Error(
      "El XLSX no contiene xl/worksheets/sheet1.xml." +
        (availableWorksheets
          ? ` Worksheets disponibles: ${availableWorksheets}`
          : ""),
    );
  }

  let document;

  try {
    document = XmlService.parse(worksheet.getDataAsString("UTF-8"));
  } catch (error) {
    const message = error && error.message ? error.message : String(error);

    throw new Error(`No se ha podido interpretar sheet1.xml: ${message}`);
  }

  const root = document.getRootElement();

  const namespace = root.getNamespace();

  const sheetData = root.getChild("sheetData", namespace);

  if (!sheetData) {
    throw new Error("No se ha encontrado sheetData en el XLSX.");
  }

  const rows = sheetData.getChildren("row", namespace);

  if (!rows.length) {
    return [];
  }

  /*
   * =====================================================
   * FILAS RAW
   * =====================================================
   *
   * Conservamos outlineLevel:
   *
   * 0 -> contenedor
   * 1 -> Feature
   * 2 -> Story / task
   */
  const rawRows = rows.map((row) => {
    const outlineAttribute = row.getAttribute("outlineLevel");

    const outlineLevel = outlineAttribute
      ? Number(outlineAttribute.getValue() || 0)
      : 0;

    const cells = {};

    row.getChildren("c", namespace).forEach((cell) => {
      const ref = String(cell.getAttribute("r")?.getValue() || "");

      const column = ref.replace(/\d+/g, "");

      if (!column) {
        return;
      }

      cells[column] = jiraFeatureReadCell_(cell, namespace, sharedStrings);
    });

    return {
      outlineLevel: Number.isFinite(outlineLevel) ? outlineLevel : 0,

      cells,
    };
  });

  /*
   * =====================================================
   * CABECERAS
   * =====================================================
   */
  const headerRow = rawRows[0]?.cells || {};

  const headerByColumn = {};

  Object.keys(headerRow).forEach((column) => {
    const header = String(headerRow[column] || "").trim();

    if (!header) {
      return;
    }

    headerByColumn[column] = header;
  });

  const requiredHeaders = [
    "Priority",
    "Status",
    "Summary",
    "Progress",
    "Blocked issues",
    "Total Stories",
  ];

  const availableHeaders = Object.values(headerByColumn);

  const missingHeaders = requiredHeaders.filter(
    (header) => !availableHeaders.includes(header),
  );

  if (missingHeaders.length) {
    throw new Error(
      `Faltan columnas requeridas en el XLSX: ${missingHeaders.join(", ")}`,
    );
  }

  /*
   * =====================================================
   * NORMALIZACIÓN DE LA JERARQUÍA
   * =====================================================
   */
  let currentContainer = "";

  const result = [];

  rawRows.slice(1).forEach((row) => {
    const values = {};

    Object.entries(headerByColumn).forEach(([column, header]) => {
      values[header] = row.cells[column] ?? "";
    });

    const summary = String(values.Summary || "").trim();

    if (!summary) {
      return;
    }

    if (row.outlineLevel === 0) {
      currentContainer = summary;
    }

    result.push({
      outlineLevel: row.outlineLevel,

      containerName: row.outlineLevel === 0 ? summary : currentContainer,

      priority: String(values.Priority || "").trim(),

      status: String(values.Status || "").trim(),

      summary,

      progress: jiraFeatureNumber_(values.Progress),

      blockedIssues: jiraFeatureInteger_(values["Blocked issues"]),

      totalStories: jiraFeatureInteger_(values["Total Stories"]),

      teamBacklog: String(values["Team Backlog Name"] || "").trim(),
    });
  });

  return result;
}

function jiraFeatureReadSharedStrings_(blob) {
  if (!blob) {
    return [];
  }

  const document = XmlService.parse(blob.getDataAsString("UTF-8"));
  const root = document.getRootElement();
  const namespace = root.getNamespace();

  return root
    .getChildren("si", namespace)
    .map((item) => jiraFeatureXmlText_(item, namespace));
}

function jiraFeatureXmlText_(element, namespace) {
  const direct = element.getChild("t", namespace);

  if (direct) {
    return direct.getText();
  }

  return element
    .getChildren("r", namespace)
    .map((run) => run.getChild("t", namespace)?.getText() || "")
    .join("");
}

function jiraFeatureReadCell_(cell, namespace, sharedStrings) {
  const type = String(cell.getAttribute("t")?.getValue() || "");

  if (type === "inlineStr") {
    const inline = cell.getChild("is", namespace);
    return inline ? jiraFeatureXmlText_(inline, namespace) : "";
  }

  const value = cell.getChild("v", namespace)?.getText() ?? "";

  if (type === "s") {
    const index = Number(value);
    return Number.isInteger(index) ? (sharedStrings[index] ?? "") : "";
  }

  if (type === "b") {
    return value === "1";
  }

  const number = Number(value);
  return value !== "" && Number.isFinite(number) ? number : value;
}

function jiraFeatureSelectFeatures_(rows) {
  const features = (Array.isArray(rows) ? rows : []).filter(
    (row) => row.outlineLevel === 1 && row.summary,
  );
  const selected = new Map();

  features.forEach((feature) => {
    const key = jiraFeatureNameKey_(feature.summary);

    if (!key) {
      return;
    }

    const current = selected.get(key);

    if (
      !current ||
      jiraFeatureCandidateScore_(feature) > jiraFeatureCandidateScore_(current)
    ) {
      selected.set(key, feature);
    }
  });

  return [...selected.values()].sort((left, right) =>
    String(left.summary || "").localeCompare(String(right.summary || ""), "es"),
  );
}

function jiraFeatureCandidateScore_(feature) {
  const container = jiraFeatureComparable_(feature.containerName);
  const preference = JIRA_FEATURE_XLSX_CONFIG_.containerPreference;
  let score = 0;

  preference.forEach((token, index) => {
    if (container.includes(jiraFeatureComparable_(token))) {
      score = Math.max(score, 1000 - index * 100);
    }
  });

  const status = jiraFeatureStatusToken_(feature.status);

  if (!["deployed", "discarded", "closed", "accepted"].includes(status)) {
    score += 50;
  }

  score += Math.round((jiraFeatureNumber_(feature.progress) || 0) * 10);
  score += jiraFeatureInteger_(feature.blockedIssues) > 0 ? 5 : 0;

  return score;
}

function jiraFeatureLoadMappingIndex_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(
    JIRA_FEATURE_XLSX_CONFIG_.mappingSheetName,
  );
  const index = {
    exact: new Map(),
    loose: new Map(),
  };

  if (!sheet || sheet.getLastRow() < 2) {
    return index;
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map((value) => String(value || "").trim());

  values.slice(1).forEach((valuesRow) => {
    const row = {};

    headers.forEach((header, columnIndex) => {
      if (header) {
        row[header] = valuesRow[columnIndex];
      }
    });

    const featureName = String(row.featureName || "").trim();
    const productId = String(row.productId || "").trim();

    if (!featureName || !productId) {
      return;
    }

    const mapping = {
      workspaceKey: String(row.workspaceKey || "").trim(),
      jiraKey: String(row.jiraKey || "").trim(),
      featureName,
      productId,
      capabilityIds: String(row.capabilityIds || "").trim(),
      functionalCaseIds: String(row.functionalCaseIds || "").trim(),
      track: String(row.track || "").trim(),
      confidence: String(row.confidence || "").trim(),
      notes: String(row.notes || "").trim(),
    };

    jiraFeatureIndexAppend_(
      index.exact,
      jiraFeatureNameKey_(featureName),
      mapping,
    );
    jiraFeatureIndexAppend_(
      index.loose,
      jiraFeatureLooseNameKey_(featureName),
      mapping,
    );
  });

  return index;
}

function jiraFeatureIndexAppend_(index, key, value) {
  if (!key) {
    return;
  }

  if (!index.has(key)) {
    index.set(key, []);
  }

  index.get(key).push(value);
}

function jiraFeatureResolveMapping_(summary, mappingIndex) {
  const exact = mappingIndex.exact.get(jiraFeatureNameKey_(summary)) || [];

  if (exact.length === 1) {
    return {
      mapping: exact[0],
      match: "featureName-exact",
    };
  }

  const loose = mappingIndex.loose.get(jiraFeatureLooseNameKey_(summary)) || [];

  if (loose.length === 1) {
    return {
      mapping: loose[0],
      match: "featureName-loose",
    };
  }

  if (exact.length > 1) {
    const preferred = jiraFeaturePreferProductMapping_(summary, exact);

    if (preferred) {
      return {
        mapping: preferred,
        match: "featureName-exact-product",
      };
    }
  }

  if (loose.length > 1) {
    const preferred = jiraFeaturePreferProductMapping_(summary, loose);

    if (preferred) {
      return {
        mapping: preferred,
        match: "featureName-loose-product",
      };
    }
  }

  return {
    mapping: null,
    match: "unmapped",
  };
}

function jiraFeaturePreferProductMapping_(summary, candidates) {
  const product = jiraFeatureInferProduct_(summary, "");
  const productCandidates = candidates.filter(
    (row) => jiraFeatureSlug_(row.productId) === product,
  );

  return productCandidates.length === 1 ? productCandidates[0] : null;
}

function jiraFeatureBuildExportRow_(feature, sourceFile, mappingIndex) {
  const resolution = jiraFeatureResolveMapping_(feature.summary, mappingIndex);
  const mapping = resolution.mapping;
  const product = jiraFeatureInferProduct_(
    feature.summary,
    mapping?.productId || feature.containerName,
  );
  const jiraKey = String(mapping?.jiraKey || "").trim();
  const workspaceKey = String(mapping?.workspaceKey || "XLSX").trim();
  const sourceFeatureKey = jiraFeatureNameKey_(feature.summary);
  const syntheticId = `xlsx-${jiraFeatureStableHash_(sourceFeatureKey)}`;
  const statusRaw = String(feature.status || "").trim();
  const statusToken = jiraFeatureStatusToken_(statusRaw);
  const progress = jiraFeatureProgressPercent_(feature.progress);
  const sourceUpdatedAt = sourceFile.getLastUpdated().toISOString();

  return {
    programId: JIRA_FEATURE_XLSX_CONFIG_.programId,
    country: JIRA_FEATURE_XLSX_CONFIG_.defaultCountry,
    product,
    id: jiraKey || syntheticId,
    type: "feature",
    track: String(mapping?.track || "")
      .trim()
      .toLowerCase(),
    planningSource: "jira",
    jiraKey,
    jiraUrl: "",
    name: feature.summary,
    summary: feature.summary,
    description: "",
    status: jiraFeatureDashboardStatus_(statusRaw),
    statusRaw,
    resolution: "",
    priority: feature.priority,
    assignee: "",
    labels: "",
    workspaceKey,
    workspaceName: feature.containerName,
    workspaceType: jiraFeatureWorkspaceType_(workspaceKey),
    teamBacklog: feature.teamBacklog,
    teamBacklogGeography: "",
    workspaceGeography: JIRA_FEATURE_XLSX_CONFIG_.defaultCountry,
    deliveryType: "",
    commitment: "",
    programIncrement: "",
    piEstimate: "",
    sprintEstimate: "",
    startDate: "",
    endDate: "",
    targetDate: "",
    planningDateSource: "xlsx-without-dates",
    sdaId: "",
    sdaName: "",
    sdaE2E: "",
    sdaStatus: "",
    deliverable: "",
    analysisId: "",
    analysisStatus: "",
    createdAt: "",
    updatedAt: sourceUpdatedAt,
    resolvedAt: "",
    lastUpdate: sourceUpdatedAt,
    detailLevel: "feature",
    jiraDiscarded: statusToken === "discarded",
    sourceFile: sourceFile.getName(),
    sourceUpdatedAt,
    progress,
    blockedIssues: jiraFeatureInteger_(feature.blockedIssues),
    totalStories: jiraFeatureInteger_(feature.totalStories),
    containerName: feature.containerName,
    sourceFeatureKey,
    mappingMatch: resolution.match,
  };
}

function jiraFeatureReplaceSheet_(spreadsheet, rows) {
  const sheetName = jiraWorkspaceFeatureSheetName_();
  const headers = jiraWorkspaceFeatureHeaders_();
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

function jiraFeatureInferProduct_(summary, hint) {
  const comparable = `${summary || ""} ${hint || ""}`.toLowerCase();

  if (comparable.includes("panorama")) {
    return "panorama";
  }

  return JIRA_FEATURE_XLSX_CONFIG_.defaultProduct;
}

function jiraFeatureDashboardStatus_(value) {
  const status = jiraFeatureStatusToken_(value);

  if (["deployed", "accepted", "done", "closed"].includes(status)) {
    return "done";
  }

  if (status === "blocked") {
    return "blocked";
  }

  if (
    ["in progress", "execution", "analysing", "ready to verify"].includes(
      status,
    )
  ) {
    return "on-track";
  }

  if (["new", "ready", "backlog", "to do"].includes(status)) {
    return "planned";
  }

  if (status === "discarded") {
    return "discarded";
  }

  return "pending";
}

function jiraFeatureWorkspaceType_(workspaceKey) {
  const value = String(workspaceKey || "").toUpperCase();

  if (value.includes("DATA")) {
    return "DATA";
  }

  if (value.includes("ENGINEERING") || value.includes("ENG")) {
    return "ENGINEERING";
  }

  return "";
}

function jiraFeatureProgressPercent_(value) {
  const number = jiraFeatureNumber_(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  const percent = number >= 0 && number <= 1 ? number * 100 : number;
  return Math.max(0, Math.min(100, Math.round(percent * 100) / 100));
}

function jiraFeatureNumber_(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const normalized = String(value || "")
    .trim()
    .replace("%", "")
    .replace(",", ".");
  const number = Number(normalized);

  return Number.isFinite(number) ? number : 0;
}

function jiraFeatureInteger_(value) {
  return Math.max(0, Math.round(jiraFeatureNumber_(value)));
}

function jiraFeatureStatusToken_(value) {
  return jiraFeatureComparable_(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function jiraFeatureComparable_(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function jiraFeatureNameKey_(value) {
  return jiraFeatureComparable_(value).replace(/\s+/g, " ").trim();
}

function jiraFeatureLooseNameKey_(value) {
  return jiraFeatureComparable_(value)
    .replace(/^\s*(?:\[[^\]]+\]\s*)+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function jiraFeatureSlug_(value) {
  return jiraFeatureComparable_(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function jiraFeatureStableHash_(value) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value || ""),
    Utilities.Charset.UTF_8,
  );

  return bytes
    .slice(0, 6)
    .map((byte) => ((byte + 256) % 256).toString(16).padStart(2, "0"))
    .join("");
}
