function jiraWorkspaceFeatureSheetName_() {
  return "jiraWorkspaceFeatures";
}

function jiraProductMappingSheetName_() {
  return "jiraProductMapping";
}

function jiraWorkspaceFeatureHeaders_() {
  return [
    "programId",
    "country",
    "countrySource",
    "deliveryScope",
    "deliveryScopeSource",
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
      "Procesando snapshots JIRA de Data y Engineering...",
      "AIxBanker",
      6,
    );

    ensureJiraProductMappingSheet_(spreadsheet);

    const dataFile = findLatestJiraWorkspaceFile_(["WORKSPACE", "DATA"]);
    const engineeringFile = findLatestJiraWorkspaceFile_([
      "WORKSPACE",
      "ENGINEERING",
    ]);

    const dataRows = buildJiraWorkspaceFeatureRows_(
      spreadsheet,
      dataFile,
      "DATA",
    );
    const engineeringRows = buildJiraWorkspaceFeatureRows_(
      spreadsheet,
      engineeringFile,
      "ENGINEERING",
    );

    const rows = [...dataRows, ...engineeringRows];
    const sheet = ensureJiraWorkspaceFeatureSheet_(spreadsheet);

    replaceJiraWorkspaceFeatureRows_(sheet, rows);
    SpreadsheetApp.flush();

    spreadsheet.toast(
      `Features JIRA: ${rows.length} relaciones · Data: ${dataRows.length} · Engineering: ${engineeringRows.length}`,
      "Foto JIRA actualizada",
      10,
    );

    Logger.log(
      JSON.stringify(
        {
          sourceFiles: [dataFile.getName(), engineeringFile.getName()],
          dataRows: dataRows.length,
          engineeringRows: engineeringRows.length,
          totalRows: rows.length,
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

function findLatestJiraWorkspaceFile_(tokens) {
  const requiredTokens = (Array.isArray(tokens) ? tokens : [])
    .map((token) => textValue_(token).toUpperCase())
    .filter(Boolean);

  if (!requiredTokens.length) {
    throw new Error(
      "No se han informado tokens para localizar el workspace JIRA.",
    );
  }

  const files = getJiraE2EFolder_().getFiles();
  const matches = [];

  while (files.hasNext()) {
    const file = files.next();
    const fileName = textValue_(file.getName());
    const comparable = fileName.toUpperCase();

    if (
      /\.HTML?$/i.test(fileName) &&
      requiredTokens.every((token) => comparable.includes(token))
    ) {
      matches.push(file);
    }
  }

  if (!matches.length) {
    throw new Error(
      `No se ha encontrado ningún HTML JIRA cuyo nombre contenga: ${requiredTokens.join(
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

function splitJiraWorkspaceFeatureBlocks_(html) {
  return String(html || "")
    .split(/<hr\b[^>]*class=["'][^"']*\bfullcontent\b[^"']*["'][^>]*>/i)
    .filter((block) => /<h3\b[^>]*class=["'][^"']*\bformtitle\b/i.test(block));
}

function extractJiraWorkspaceFeatureHeader_(block) {
  const match = String(block || "").match(
    /<h3\b[^>]*class=["'][^"']*\bformtitle\b[^"']*["'][^>]*>\s*\[([A-Z][A-Z0-9]+-\d+)\]\s*(?:&nbsp;|\s)*<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<span\b[^>]*class=["'][^"']*\bsubText\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
  );

  if (!match) {
    return null;
  }

  const meta = stripJiraHtml_(match[4]);

  function dateValue(label) {
    const dateMatch = meta.match(
      new RegExp(`${label}:\\s*([0-9]{1,2}\\/[A-Za-z]{3}\\/\\d{2,4})`, "i"),
    );
    return dateMatch ? textValue_(dateMatch[1]) : "";
  }

  return {
    jiraKey: textValue_(match[1]).toUpperCase(),
    jiraUrl: decodeJiraHtmlEntities_(match[2]),
    summary: stripJiraHtml_(match[3]),
    createdAt: jiraWorkspaceDateToIso_(dateValue("Created")),
    updatedAt: jiraWorkspaceDateToIso_(dateValue("Updated")),
    resolvedAt: jiraWorkspaceDateToIso_(dateValue("Resolved")),
  };
}

function jiraWorkspaceEscapeRegExp_(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractJiraWorkspaceFieldHtml_(block, label) {
  const source = String(block || "");
  const labelMatch = new RegExp(
    `<b>\\s*${jiraWorkspaceEscapeRegExp_(label)}:\\s*<\\/b>`,
    "i",
  ).exec(source);

  if (!labelMatch) {
    return "";
  }

  const labelCellEnd = source.indexOf("</td>", labelMatch.index);
  if (labelCellEnd < 0) {
    return "";
  }

  const valueCellStart = source.indexOf("<td", labelCellEnd + 5);
  if (valueCellStart < 0) {
    return "";
  }

  const valueStart = source.indexOf(">", valueCellStart);
  if (valueStart < 0) {
    return "";
  }

  const valueEnd = source.indexOf("</td>", valueStart + 1);
  if (valueEnd < 0) {
    return "";
  }

  return source.slice(valueStart + 1, valueEnd);
}

function extractJiraWorkspaceFieldText_(block, label) {
  return stripJiraHtml_(extractJiraWorkspaceFieldHtml_(block, label));
}

function extractJiraWorkspaceDescription_(block) {
  const match = String(block || "").match(
    /<td\b[^>]*id=["']descriptionArea["'][^>]*>([\s\S]*?)<\/td>/i,
  );

  return match ? stripJiraHtml_(match[1]) : "";
}

function extractJiraWorkspaceTableAfterLabel_(block, label) {
  const source = String(block || "");
  const labelMatch = new RegExp(
    `<b>\\s*${jiraWorkspaceEscapeRegExp_(label)}:\\s*<\\/b>`,
    "i",
  ).exec(source);

  if (!labelMatch) {
    return "";
  }

  const tableStart = source.indexOf("<table", labelMatch.index);
  if (tableStart < 0) {
    return "";
  }

  const tableEnd = source.indexOf("</table>", tableStart);
  if (tableEnd < 0) {
    return "";
  }

  return source.slice(tableStart, tableEnd + 8);
}

function extractJiraWorkspaceSdaProjects_(block) {
  const table = extractJiraWorkspaceTableAfterLabel_(block, "SDA Project");

  if (!table) {
    return [];
  }

  const rows = [];
  const rowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowPattern.exec(table))) {
    const cells = [];
    const cellPattern = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch;

    while ((cellMatch = cellPattern.exec(rowMatch[1]))) {
      cells.push(stripJiraHtml_(cellMatch[1]));
    }

    if (cells.length < 4 || !/^\d+$/.test(cells[0])) {
      continue;
    }

    const e2eMatch = cells[2].match(/[A-Z][A-Z0-9]+-\d+/i);

    rows.push({
      sdaId: textValue_(cells[0]),
      sdaName: textValue_(cells[1]),
      sdaE2E: e2eMatch
        ? textValue_(e2eMatch[0]).toUpperCase()
        : textValue_(cells[2]),
      sdaStatus: textValue_(cells[3]),
    });
  }

  return rows;
}

function extractJiraWorkspaceAnalysis_(block) {
  const table = extractJiraWorkspaceTableAfterLabel_(block, "ID Analysis");

  if (!table) {
    return {
      analysisId: "",
      analysisStatus: "",
    };
  }

  const rowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowPattern.exec(table))) {
    const cells = [];
    const cellPattern = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch;

    while ((cellMatch = cellPattern.exec(rowMatch[1]))) {
      cells.push(stripJiraHtml_(cellMatch[1]));
    }

    if (cells.length < 3) {
      continue;
    }

    const analysisMatch = cells[0].match(/[A-Z][A-Z0-9]+-\d+/i);

    if (analysisMatch) {
      return {
        analysisId: textValue_(analysisMatch[0]).toUpperCase(),
        analysisStatus: textValue_(cells[2]),
      };
    }
  }

  return {
    analysisId: "",
    analysisStatus: "",
  };
}

function jiraWorkspaceDefaultCountry_(workspaceKey) {
  const normalizedWorkspaceKey = textValue_(workspaceKey).trim().toUpperCase();

  const workspaceCountries = {
    SERVICEBOX: "ES",
    AIB: "ES",
  };

  return workspaceCountries[normalizedWorkspaceKey] || "";
}

function extractJiraWorkspaceExplicitCountryIds_(labels) {
  const matches = String(labels || "").match(/\bCP_([A-Z]{2})\b/gi) || [];

  return [
    ...new Set(
      matches
        .map((value) =>
          String(value || "")
            .slice(3)
            .trim()
            .toUpperCase(),
        )
        .filter((value) => value && !["GL", "HL"].includes(value)),
    ),
  ];
}

function extractJiraWorkspaceCountryIds_(labels, workspaceKey) {
  const explicitCountries = extractJiraWorkspaceExplicitCountryIds_(labels);

  /*
   * Una etiqueta CP_ES / CP_MX / CP_PE...
   * tiene prioridad porque JIRA está
   * informando explícitamente una geografía.
   */
  if (explicitCountries.length) {
    return explicitCountries;
  }

  /*
   * Si JIRA no informa país a nivel Feature,
   * utilizamos el país conocido del workspace.
   *
   * SERVICEBOX = Data España
   * AIB        = Engineering España
   */
  const workspaceCountry = jiraWorkspaceDefaultCountry_(workspaceKey);

  if (workspaceCountry) {
    return [workspaceCountry];
  }

  /*
   * No convertimos workspaces desconocidos
   * en Global.
   */
  return ["UNASSIGNED"];
}

function jiraWorkspaceDeliveryScopeMarkers_(value) {
  const source = String(value || "").toUpperCase();

  const scopes = [];

  const patterns = [
    {
      scope: "HL",
      expression: /\[(?:HLD|HL)\]/g,
    },
    {
      scope: "ES",
      expression: /\[(?:ESP|ES)\]/g,
    },
    {
      scope: "MX",
      expression: /\[(?:MEX|MX)\]/g,
    },
    {
      scope: "PE",
      expression: /\[(?:PER|PE)\]/g,
    },
    {
      scope: "CO",
      expression: /\[(?:COL|CO)\]/g,
    },
  ];

  patterns.forEach((pattern) => {
    if (pattern.expression.test(source)) {
      scopes.push(pattern.scope);
    }
  });

  return [...new Set(scopes)];
}

function extractJiraWorkspaceDeliveryScope_(labels, deliverable, sdaProject) {
  /*
   * 1. Primero utilizamos etiquetas CP_XX
   * porque son información estructurada.
   */
  const labelMatches = String(labels || "").match(/\bCP_([A-Z]{2})\b/gi) || [];

  const labelScopes = [
    ...new Set(
      labelMatches
        .map((value) =>
          String(value || "")
            .slice(3)
            .trim()
            .toUpperCase(),
        )
        .filter(Boolean)
        .map((value) => (["GL", "HL"].includes(value) ? "HL" : value)),
    ),
  ];

  if (labelScopes.length) {
    return {
      deliveryScope: labelScopes.join("|"),
      deliveryScopeSource: "jira-label",
    };
  }

  /*
   * 2. Después buscamos marcadores explícitos
   * en Deliverable.
   *
   * Ejemplos:
   *
   * [ES]
   * [ESP]
   * [HLD]
   */
  const deliverableScopes = jiraWorkspaceDeliveryScopeMarkers_(deliverable);

  if (deliverableScopes.length) {
    return {
      deliveryScope: deliverableScopes.join("|"),
      deliveryScopeSource: "deliverable",
    };
  }

  /*
   * 3. Finalmente usamos el nombre del SDA
   * cuando contiene un marcador explícito.
   *
   * Ejemplo:
   *
   * RETAIL26 - AI x Banker [ESP] 2026
   */
  const sdaScopes = jiraWorkspaceDeliveryScopeMarkers_(
    sdaProject?.sdaName || "",
  );

  if (sdaScopes.length) {
    return {
      deliveryScope: sdaScopes.join("|"),
      deliveryScopeSource: "sda-project",
    };
  }

  return {
    deliveryScope: "UNKNOWN",
    deliveryScopeSource: "unknown",
  };
}

function jiraWorkspaceCountrySource_(labels, workspaceKey) {
  const explicitCountries = extractJiraWorkspaceExplicitCountryIds_(labels);

  if (explicitCountries.length) {
    return "jira-label";
  }

  if (jiraWorkspaceDefaultCountry_(workspaceKey)) {
    return "workspace-default";
  }

  return "unassigned";
}

function jiraWorkspaceDateToIso_(value) {
  const text = textValue_(value);
  const match = text.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{2,4})$/);

  if (!match) {
    return "";
  }

  const months = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };

  const month = months[String(match[2]).toLowerCase()];
  if (month === undefined) {
    return "";
  }

  const rawYear = Number(match[3]);
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;
  const date = new Date(Date.UTC(year, month, Number(match[1])));

  return Utilities.formatDate(date, "UTC", "yyyy-MM-dd");
}

function jiraWorkspacePiWindow_(programIncrement, piEstimate) {
  function parsePis(value) {
    const matches = String(value || "").match(/\b(20\d{2})-Q([1-4])\b/gi) || [];
    return matches.map((match) => {
      const parts = match.toUpperCase().split("-Q");
      return {
        year: Number(parts[0]),
        quarter: Number(parts[1]),
      };
    });
  }

  let pis = parsePis(programIncrement);
  const estimatePis = parsePis(piEstimate);

  if (!pis.length && estimatePis.length) {
    pis = estimatePis;
  }

  if (!pis.length) {
    return {
      startDate: "",
      endDate: "",
      targetDate: "",
    };
  }

  pis.sort((left, right) =>
    left.year === right.year
      ? left.quarter - right.quarter
      : left.year - right.year,
  );

  const first = pis[0];
  const last = pis[pis.length - 1];
  const target = estimatePis.length
    ? estimatePis[estimatePis.length - 1]
    : last;

  function quarterStart(pi) {
    const month = (pi.quarter - 1) * 3 + 1;
    return `${pi.year}-${String(month).padStart(2, "0")}-01`;
  }

  function quarterEnd(pi) {
    const endMonth = pi.quarter * 3;
    const date = new Date(Date.UTC(pi.year, endMonth, 0));
    return Utilities.formatDate(date, "UTC", "yyyy-MM-dd");
  }

  return {
    startDate: quarterStart(first),
    endDate: quarterEnd(last),
    targetDate: quarterEnd(target),
  };
}

function jiraWorkspaceStatusToRoadmap_(value) {
  const normalized = normalizeJiraWorkspaceToken_(value);

  if (["deployed", "accepted", "done", "closed"].includes(normalized)) {
    return "done";
  }

  if (normalized === "blocked") {
    return "blocked";
  }

  if (["inprogress", "analysing", "readytoverify"].includes(normalized)) {
    return "on-track";
  }

  if (["new", "backlog", "todo"].includes(normalized)) {
    return "planned";
  }

  return "pending";
}

function normalizeJiraWorkspaceToken_(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function ensureJiraProductMappingSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(jiraProductMappingSheetName_());

  if (sheet) {
    return sheet;
  }

  sheet = spreadsheet.insertSheet(jiraProductMappingSheetName_());
  const values = [
    ["sdaE2E", "sdaId", "sdaName", "product"],
    ["E2E-336501", "54491", "Blue Buddy", "blue-buddy"],
    ["E2E-340058", "55522", "Franchise (Panorama)", "panorama"],
    ["E2E-336498", "54490", "Sales Assistant", "sales-assistant"],
  ];

  sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
  sheet.setFrozenRows(1);
  return sheet;
}

function loadJiraProductMappings_(spreadsheet) {
  const sheet = ensureJiraProductMappingSheet_(spreadsheet);
  return sheetToObjects_(sheet)
    .map((row) => ({
      sdaE2E: textValue_(row.sdaE2E).toUpperCase(),
      sdaId: textValue_(row.sdaId),
      sdaName: textValue_(row.sdaName),
      product: textValue_(row.product),
    }))
    .filter((row) => row.product);
}

function resolveJiraWorkspaceProduct_(sdaProject, mappings, productCatalog) {
  const e2e = textValue_(sdaProject.sdaE2E).toUpperCase();
  const sdaId = textValue_(sdaProject.sdaId);
  const sdaNameToken = normalizeJiraWorkspaceToken_(sdaProject.sdaName);

  const mapped = (Array.isArray(mappings) ? mappings : []).find((row) => {
    if (row.sdaE2E && row.sdaE2E === e2e) {
      return true;
    }

    if (row.sdaId && row.sdaId === sdaId) {
      return true;
    }

    return (
      row.sdaName && normalizeJiraWorkspaceToken_(row.sdaName) === sdaNameToken
    );
  });

  if (mapped) {
    return mapped.product;
  }

  const matches = (Array.isArray(productCatalog) ? productCatalog : []).filter(
    (product) => {
      const productId = normalizeJiraWorkspaceToken_(product.productId);
      const productName = normalizeJiraWorkspaceToken_(product.productName);

      return [productId, productName]
        .filter((token) => token && token.length >= 4)
        .some(
          (token) =>
            sdaNameToken.includes(token) || token.includes(sdaNameToken),
        );
    },
  );

  return matches.length === 1 ? textValue_(matches[0].productId) : "";
}

function buildJiraWorkspaceFeatureRows_(spreadsheet, file, workspaceType) {
  const html = readJiraE2EHtml_(file);

  const blocks = splitJiraWorkspaceFeatureBlocks_(html);

  const mappings = loadJiraProductMappings_(spreadsheet);

  const productExperience = getProductExperienceData_(spreadsheet);

  const productCatalog = productExperience.productCatalog || [];

  const sourceUpdatedAt = file.getLastUpdated().toISOString();

  const rowsById = new Map();

  const unmapped = new Set();

  blocks.forEach((block) => {
    const header = extractJiraWorkspaceFeatureHeader_(block);

    if (!header) {
      return;
    }

    const statusRaw = extractJiraWorkspaceFieldText_(block, "Status");

    const resolution = extractJiraWorkspaceFieldText_(block, "Resolution");

    const labels = extractJiraWorkspaceFieldText_(block, "Labels");

    const programIncrement = extractJiraWorkspaceFieldText_(
      block,
      "Program Increment",
    );

    const piEstimate = extractJiraWorkspaceFieldText_(block, "PI Estimate");

    const deliverable = extractJiraWorkspaceFieldText_(block, "Deliverable");

    const planning = jiraWorkspacePiWindow_(programIncrement, piEstimate);

    const workspaceKey = header.jiraKey.split("-")[0].toUpperCase();

    const workspaceName = extractJiraWorkspaceFieldText_(block, "Project");

    const countries = extractJiraWorkspaceCountryIds_(labels, workspaceKey);

    const countrySource = jiraWorkspaceCountrySource_(labels, workspaceKey);

    const sdaProjects = extractJiraWorkspaceSdaProjects_(block);

    const analysis = extractJiraWorkspaceAnalysis_(block);

    const discarded =
      normalizeJiraWorkspaceToken_(statusRaw) === "discarded" ||
      normalizeJiraWorkspaceToken_(resolution) === "discarded";

    sdaProjects.forEach((sdaProject) => {
      const product = resolveJiraWorkspaceProduct_(
        sdaProject,
        mappings,
        productCatalog,
      );

      if (!product) {
        unmapped.add(
          `${sdaProject.sdaE2E || sdaProject.sdaId} · ${sdaProject.sdaName}`,
        );

        return;
      }

      const deliveryScope = extractJiraWorkspaceDeliveryScope_(
        labels,
        deliverable,
        sdaProject,
      );

      countries.forEach((country) => {
        const id = [
          "jira",
          workspaceKey,
          header.jiraKey,
          product,
          country,
          sdaProject.sdaE2E || sdaProject.sdaId,
        ]
          .map((value) => String(value || "").trim())
          .join("::");

        rowsById.set(id, {
          programId: "aixbanker",

          country,
          countrySource,

          deliveryScope: deliveryScope.deliveryScope,

          deliveryScopeSource: deliveryScope.deliveryScopeSource,

          product,

          id,

          type: "feature",

          track: "functional",

          planningSource: "jira",

          jiraKey: header.jiraKey,

          jiraUrl: header.jiraUrl,

          name: header.summary,

          summary: header.summary,

          description: extractJiraWorkspaceDescription_(block),

          status: jiraWorkspaceStatusToRoadmap_(statusRaw),

          statusRaw,

          resolution,

          priority: extractJiraWorkspaceFieldText_(block, "Priority"),

          assignee: extractJiraWorkspaceFieldText_(block, "Assignee"),

          labels,

          workspaceKey,

          workspaceName,

          workspaceType,

          teamBacklog: extractJiraWorkspaceFieldText_(block, "Team Backlog"),

          teamBacklogGeography: extractJiraWorkspaceFieldText_(
            block,
            "Team Backlog Geography",
          ),

          workspaceGeography: extractJiraWorkspaceFieldText_(
            block,
            "Workspace Geography",
          ),

          deliveryType: extractJiraWorkspaceFieldText_(
            block,
            "Type of Delivery",
          ),

          commitment: extractJiraWorkspaceFieldText_(block, "Commitment type"),

          programIncrement,

          piEstimate,

          sprintEstimate: extractJiraWorkspaceFieldText_(
            block,
            "Sprint Estimate",
          ),

          startDate: planning.startDate,

          endDate: planning.endDate,

          targetDate: planning.targetDate,

          planningDateSource: "jira-pi",

          sdaId: sdaProject.sdaId,

          sdaName: sdaProject.sdaName,

          sdaE2E: sdaProject.sdaE2E,

          sdaStatus: sdaProject.sdaStatus,

          deliverable,

          analysisId: analysis.analysisId,

          analysisStatus: analysis.analysisStatus,

          createdAt: header.createdAt,

          updatedAt: header.updatedAt,

          resolvedAt: header.resolvedAt,

          lastUpdate: header.updatedAt,

          detailLevel: "snapshot",

          jiraDiscarded: discarded,

          sourceFile: file.getName(),

          sourceUpdatedAt,
        });
      });
    });
  });

  if (unmapped.size) {
    Logger.log(
      `[JIRA WORKSPACE] Relaciones SDA sin producto: ${[...unmapped].join(
        " | ",
      )}`,
    );
  }

  return [...rowsById.values()];
}
function ensureJiraWorkspaceFeatureSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(jiraWorkspaceFeatureSheetName_());

  if (!sheet) {
    sheet = spreadsheet.insertSheet(jiraWorkspaceFeatureSheetName_());
  }

  return sheet;
}

function replaceJiraWorkspaceFeatureRows_(sheet, rows) {
  const requiredRows = Math.max(2, rows.length + 1);
  const requiredColumns = jiraWorkspaceFeatureHeaders_().length;

  if (sheet.getMaxRows() < requiredRows) {
    sheet.insertRowsAfter(
      sheet.getMaxRows(),
      requiredRows - sheet.getMaxRows(),
    );
  }

  if (sheet.getMaxColumns() < requiredColumns) {
    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      requiredColumns - sheet.getMaxColumns(),
    );
  }

  sheet.clearContents();
  sheet
    .getRange(1, 1, 1, requiredColumns)
    .setValues([jiraWorkspaceFeatureHeaders_()]);
  sheet.setFrozenRows(1);

  if (!rows.length) {
    return;
  }

  const values = rows.map((row) =>
    jiraWorkspaceFeatureHeaders_().map((header) => row[header] ?? ""),
  );

  sheet.getRange(2, 1, values.length, requiredColumns).setValues(values);
}
