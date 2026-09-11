/**
 * AIxBanker - JIRA Feature source from JIRA XML/RSS exports.
 *
 * Official sources:
 *
 *   SearchRequest_AIB.xml
 *   SearchRequest_DATA.xml
 *
 * Public contract preserved:
 *
 *   sheet:
 *     jiraWorkspaceFeatures
 *
 *   refresh function:
 *     refreshJiraWorkspaceFeatures()
 *
 * Traceability:
 *
 *   SDA Deliverable
 *        ↑
 *        │ Deliverable
 *        │
 *   JIRA Feature
 *        │
 *        │ ID Analysis
 *        ↓
 *      JIRA MSA
 */

const JIRA_FEATURE_XML_CONFIG_ = Object.freeze({
  programId: "aixbanker",

  sheetName: "jiraWorkspaceFeatures",

  sources: [
    {
      id: "AIB",
      fileToken: "SEARCHREQUEST_AIB",
      workspaceType: "AIB",
    },
    {
      id: "DATA",
      fileToken: "SEARCHREQUEST_DATA",
      workspaceType: "DATA",
    },
  ],

  productsBySdaId: {
    54491: {
      product: "blue-buddy",
      sdaName: "Blue Buddy",
      sdaCode: "SDATOOL-54491",
      sdaE2E: "E2E-336501",
    },

    55522: {
      product: "panorama",
      sdaName: "Panorama",
      sdaCode: "SDATOOL-55522",
      sdaE2E: "E2E-340058",
    },
  },
});

const JIRA_FEATURE_XML_CUSTOM_FIELDS_ = Object.freeze([
  "Commitment type",
  "Deliverable",
  "ID Analysis",
  "Analysis Status",
  "PI Estimate",
  "Program Increment",
  "SDA Project",
  "SDA Status",
  "Sprint Estimate",
  "Team Backlog",
  "Team Backlog Geography",
  "Type of Delivery",
  "Workspace Geography",
]);

function jiraWorkspaceFeatureSheetName_() {
  return JIRA_FEATURE_XML_CONFIG_.sheetName;
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
      "Procesando XML oficiales de Features JIRA...",
      "AIxBanker",
      6,
    );

    const allRows = [];

    const sourceDiagnostics = [];

    JIRA_FEATURE_XML_CONFIG_.sources.forEach((sourceConfig) => {
      const file = jiraFeatureFindLatestXml_(sourceConfig.fileToken);

      const result = jiraFeatureParseXmlFile_(file, sourceConfig);

      allRows.push(...result.rows);

      sourceDiagnostics.push({
        source: sourceConfig.id,

        sourceFile: file.getName(),

        rawFeatures: result.rawFeatures,

        exportedRows: result.rows.length,
      });
    });

    const rows = jiraFeatureUniqueRows_(allRows);

    const invalidRows = rows.filter(
      (row) =>
        !String(row.sdaId || "").trim() ||
        !String(row.product || "").trim() ||
        !String(row.jiraKey || "").trim(),
    );

    if (!rows.length) {
      throw new Error(
        [
          "Los XML JIRA no han generado",
          "ninguna Feature para",
          "SDATOOL-54491 o SDATOOL-55522.",
          "No se modifica jiraWorkspaceFeatures.",
        ].join(" "),
      );
    }

    if (invalidRows.length) {
      throw new Error(
        [
          `Se han generado ${invalidRows.length}`,
          "filas JIRA inválidas.",
          "No se publica la nueva foto.",
        ].join(" "),
      );
    }

    rows.sort((left, right) => {
      const productDifference = String(left.product || "").localeCompare(
        String(right.product || ""),
        "es",
      );

      if (productDifference !== 0) {
        return productDifference;
      }

      const workspaceDifference = String(left.workspaceKey || "").localeCompare(
        String(right.workspaceKey || ""),
        "es",
      );

      if (workspaceDifference !== 0) {
        return workspaceDifference;
      }

      return jiraFeatureCompareKeys_(left.jiraKey, right.jiraKey);
    });

    const sheet = ensureJiraWorkspaceFeatureSheet_(spreadsheet);

    replaceJiraWorkspaceFeatureRows_(sheet, rows);

    SpreadsheetApp.flush();

    const blueBuddyRows = rows.filter((row) => row.product === "blue-buddy");

    const panoramaRows = rows.filter((row) => row.product === "panorama");

    const diagnostics = {
      sourceFiles: sourceDiagnostics,

      totalRows: rows.length,

      blueBuddy: {
        rows: blueBuddyRows.length,

        withDeliverable: blueBuddyRows.filter((row) =>
          String(row.deliverable || "").trim(),
        ).length,

        withAnalysisId: blueBuddyRows.filter((row) =>
          String(row.analysisId || "").trim(),
        ).length,
      },

      panorama: {
        rows: panoramaRows.length,

        withDeliverable: panoramaRows.filter((row) =>
          String(row.deliverable || "").trim(),
        ).length,

        withAnalysisId: panoramaRows.filter((row) =>
          String(row.analysisId || "").trim(),
        ).length,
      },

      sample: rows.slice(0, 20).map((row) => ({
        jiraKey: row.jiraKey,

        product: row.product,

        sdaId: row.sdaId,

        sdaE2E: row.sdaE2E,

        deliverable: row.deliverable,

        analysisId: row.analysisId,

        programIncrement: row.programIncrement,

        startDate: row.startDate,

        endDate: row.endDate,

        sourceFile: row.sourceFile,
      })),
    };

    Logger.log(JSON.stringify(diagnostics, null, 2));

    spreadsheet.toast(
      [
        `Features: ${rows.length}`,
        `Blue Buddy: ${blueBuddyRows.length}`,
        `Panorama: ${panoramaRows.length}`,
      ].join(" · "),
      "Foto JIRA actualizada",
      10,
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

function jiraFeatureFindLatestXml_(fileToken) {
  if (typeof getJiraE2EFolder_ !== "function") {
    throw new Error(
      [
        "No está disponible",
        "getJiraE2EFolder_().",
        "Mantén cargado el módulo",
        "JIRA de MSAs.",
      ].join(" "),
    );
  }

  const folder = getJiraE2EFolder_();

  const files = folder.getFiles();

  const requiredToken = String(fileToken || "")
    .trim()
    .toUpperCase();

  const matches = [];

  while (files.hasNext()) {
    const file = files.next();

    const name = String(file.getName() || "").trim();

    if (!/\.XML$/i.test(name)) {
      continue;
    }

    const comparable = name.toUpperCase();

    if (!comparable.includes(requiredToken)) {
      continue;
    }

    matches.push(file);
  }

  if (!matches.length) {
    throw new Error(
      ["No se ha encontrado", "ningún XML JIRA", `para ${requiredToken}.`].join(
        " ",
      ),
    );
  }

  matches.sort(
    (left, right) =>
      right.getLastUpdated().getTime() - left.getLastUpdated().getTime(),
  );

  return matches[0];
}

function jiraFeatureParseXmlFile_(file, sourceConfig) {
  const xml = file.getBlob().getDataAsString("UTF-8");

  const document = XmlService.parse(xml);

  const root = document.getRootElement();

  const channel = root.getChild("channel");

  if (!channel) {
    throw new Error(
      `El fichero ${file.getName()} no contiene un channel RSS de JIRA.`,
    );
  }

  const items = channel.getChildren("item");

  const rows = [];

  items.forEach((item) => {
    rows.push(...jiraFeatureBuildRowsFromItem_(item, file, sourceConfig));
  });

  return {
    rawFeatures: items.length,

    rows,
  };
}

function jiraFeatureBuildRowsFromItem_(item, file, sourceConfig) {
  const jiraKey = jiraFeatureChildText_(item, "key").toUpperCase();

  if (!jiraKey) {
    return [];
  }

  const issueType = jiraFeatureChildText_(item, "type");

  if (jiraFeatureNormalizeToken_(issueType) !== "feature") {
    return [];
  }

  const customFields = jiraFeatureCustomFields_(item);

  const deliverable = String(customFields.Deliverable || "").trim();

  const sdaProject = String(customFields["SDA Project"] || "").trim();

  const deliverableSdaIds = jiraFeatureTargetSdaIds_(deliverable);

  const projectSdaIds = jiraFeatureTargetSdaIds_(sdaProject);

  const targetSdaIds = [...new Set([...deliverableSdaIds, ...projectSdaIds])];

  if (!targetSdaIds.length) {
    return [];
  }

  const jiraUrl = jiraFeatureChildText_(item, "link");

  const summary = jiraFeatureChildText_(item, "summary");

  const description = jiraFeatureStripMarkup_(
    jiraFeatureChildText_(item, "description"),
  );

  const statusRaw = jiraFeatureChildText_(item, "status");

  const resolution = jiraFeatureChildText_(item, "resolution");

  const priority = jiraFeatureChildText_(item, "priority");

  const assignee = jiraFeatureChildText_(item, "assignee");

  const workspaceName = jiraFeatureChildText_(item, "project");

  const workspaceKey = jiraFeatureProjectKey_(item, jiraKey);

  const labels = jiraFeatureLabels_(item);

  const programIncrement = String(
    customFields["Program Increment"] || "",
  ).trim();

  const piEstimate = String(customFields["PI Estimate"] || "").trim();

  const sprintEstimate = String(customFields["Sprint Estimate"] || "").trim();

  /*
   * =====================================================
   * PLANIFICACIÓN JIRA
   * =====================================================
   *
   * Program Increment / PI Estimate representan
   * la ventana prevista, no necesariamente la
   * fecha real de finalización.
   */
  const planning = jiraWorkspacePiWindow_(programIncrement, piEstimate);

  const analysisRaw = String(customFields["ID Analysis"] || "").trim();

  const analysisId = jiraFeatureExtractJiraKeys_(analysisRaw).join(" | ");

  const analysisStatus = String(customFields["Analysis Status"] || "").trim();

  const sdaStatus = String(customFields["SDA Status"] || "").trim();

  const sdaLinks = jiraFeatureSdaProjectLinks_(item);

  const country = jiraFeatureCountry_(
    deliverable,
    labels,
    customFields["Team Backlog Geography"],
    customFields["Workspace Geography"],
  );

  /*
   * =====================================================
   * FECHAS REALES JIRA
   * =====================================================
   */

  const createdAt = jiraFeatureJiraDateToIso_(
    jiraFeatureChildText_(item, "created"),
  );

  const updatedAt = jiraFeatureJiraDateToIso_(
    jiraFeatureChildText_(item, "updated"),
  );

  const resolvedAt = jiraFeatureJiraDateToIso_(
    jiraFeatureChildText_(item, "resolved"),
  );

  /*
   * =====================================================
   * ESTADO TERMINAL
   * =====================================================
   *
   * Si JIRA ya ha cerrado/resuelto la Feature,
   * su endDate debe ser la fecha real de
   * resolución.
   *
   * El PI se conserva como targetDate.
   */
  const normalizedStatus = jiraFeatureNormalizeToken_(statusRaw);

  const normalizedResolution = jiraFeatureNormalizeToken_(resolution);

  const isTerminal =
    ["deployed", "accepted", "done", "closed", "discarded"].includes(
      normalizedStatus,
    ) || ["done", "closed", "discarded"].includes(normalizedResolution);

  /*
   * =====================================================
   * VENTANA TEMPORAL EFECTIVA
   * =====================================================
   *
   * startDate:
   *   mantenemos la planificación por PI.
   *
   * endDate:
   *   - terminal + resolved → fecha real JIRA
   *   - resto              → fin del PI
   *
   * targetDate:
   *   siempre conserva el compromiso previsto.
   */
  const startDate = planning.startDate;

  const endDate = isTerminal && resolvedAt ? resolvedAt : planning.endDate;

  const targetDate = planning.targetDate || planning.endDate;

  const planningDateSource =
    isTerminal && resolvedAt
      ? "jira-pi+resolved"
      : planning.startDate
        ? "jira-pi"
        : "jira-without-pi";

  const discarded =
    normalizedStatus === "discarded" || normalizedResolution === "discarded";

  const sourceUpdatedAt = file.getLastUpdated().toISOString();

  return targetSdaIds.map((sdaId) => {
    const productConfig = JIRA_FEATURE_XML_CONFIG_.productsBySdaId[sdaId];

    const expectedSdaE2E = String(productConfig.sdaE2E || "")
      .trim()
      .toUpperCase();

    const sdaE2E =
      expectedSdaE2E && sdaLinks.includes(expectedSdaE2E)
        ? expectedSdaE2E
        : sdaLinks.join(" | ");

    const mappingMatch = deliverableSdaIds.includes(sdaId)
      ? "deliverable"
      : "sda-project";

    const id = ["jira", workspaceKey, jiraKey, productConfig.product, sdaId]
      .map((value) => String(value || "").trim())
      .join("::");

    return {
      programId: JIRA_FEATURE_XML_CONFIG_.programId,

      country,

      product: productConfig.product,

      id,

      type: "feature",

      track: "functional",

      planningSource: "jira",

      jiraKey,

      jiraUrl,

      name: summary,

      summary,

      description,

      status: jiraWorkspaceStatusToRoadmap_(statusRaw),

      statusRaw,

      resolution,

      priority,

      assignee,

      labels,

      workspaceKey,

      workspaceName,

      workspaceType: sourceConfig.workspaceType,

      teamBacklog: String(customFields["Team Backlog"] || "").trim(),

      teamBacklogGeography: String(
        customFields["Team Backlog Geography"] || "",
      ).trim(),

      workspaceGeography: String(
        customFields["Workspace Geography"] || "",
      ).trim(),

      deliveryType: String(customFields["Type of Delivery"] || "").trim(),

      commitment: String(customFields["Commitment type"] || "").trim(),

      programIncrement,

      piEstimate,

      sprintEstimate,

      /*
       * Fechas efectivas de ejecución.
       */
      startDate,

      endDate,

      /*
       * Fecha objetivo de planificación.
       */
      targetDate,

      planningDateSource,

      sdaId,

      sdaName: productConfig.sdaName,

      sdaE2E,

      sdaStatus,

      deliverable,

      analysisId,

      analysisStatus,

      createdAt,

      updatedAt,

      resolvedAt,

      lastUpdate: updatedAt || sourceUpdatedAt,

      detailLevel: "feature",

      jiraDiscarded: discarded,

      sourceFile: file.getName(),

      sourceUpdatedAt,

      progress: "",

      blockedIssues: "",

      totalStories: "",

      containerName: workspaceName,

      sourceFeatureKey: jiraKey,

      mappingMatch,
    };
  });
}

function jiraFeatureCustomFields_(item) {
  const result = {};

  const customFields = item.getChild("customfields");

  if (!customFields) {
    return result;
  }

  const allowed = new Set(JIRA_FEATURE_XML_CUSTOM_FIELDS_);

  customFields.getChildren("customfield").forEach((field) => {
    const name = jiraFeatureChildText_(field, "customfieldname");

    if (!allowed.has(name)) {
      return;
    }

    const values = field.getChild("customfieldvalues");

    result[name] = jiraFeatureElementText_(values);
  });

  return result;
}

function jiraFeatureElementText_(element) {
  if (!element) {
    return "";
  }

  const children = element.getChildren();

  if (!children.length) {
    return jiraFeatureNormalizeText_(element.getText());
  }

  const values = children
    .map((child) => jiraFeatureElementText_(child))
    .filter(Boolean);

  if (values.length) {
    return [...new Set(values)].join(" | ");
  }

  return jiraFeatureNormalizeText_(element.getText());
}

function jiraFeatureChildText_(element, childName) {
  if (!element) {
    return "";
  }

  return jiraFeatureElementText_(element.getChild(childName));
}

function jiraFeatureNormalizeText_(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function jiraFeatureStripMarkup_(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function jiraFeatureProjectKey_(item, jiraKey) {
  const project = item.getChild("project");

  if (project) {
    const keyAttribute = project.getAttribute("key");

    if (keyAttribute) {
      const value = String(keyAttribute.getValue() || "")
        .trim()
        .toUpperCase();

      if (value) {
        return value;
      }
    }
  }

  return String(jiraKey || "")
    .split("-")[0]
    .trim()
    .toUpperCase();
}

function jiraFeatureLabels_(item) {
  const labels = item.getChild("labels");

  if (!labels) {
    return "";
  }

  return [
    ...new Set(
      labels
        .getChildren("label")
        .map((label) => jiraFeatureNormalizeText_(label.getText()))
        .filter(Boolean),
    ),
  ].join(" | ");
}

function jiraFeatureSdaProjectLinks_(item) {
  const issueLinks = item.getChild("issuelinks");

  if (!issueLinks) {
    return [];
  }

  const keys = new Set();

  issueLinks.getChildren("issuelinktype").forEach((linkType) => {
    const name = jiraFeatureChildText_(linkType, "name");

    if (jiraFeatureNormalizeToken_(name) !== "sdaprojectfeature") {
      return;
    }

    const outwardLinks = linkType.getChild("outwardlinks");

    if (!outwardLinks) {
      return;
    }

    outwardLinks.getChildren("issuelink").forEach((link) => {
      const key = jiraFeatureChildText_(link, "issuekey").trim().toUpperCase();

      if (key) {
        keys.add(key);
      }
    });
  });

  return [...keys];
}

function jiraFeatureTargetSdaIds_(value) {
  const text = String(value || "");

  return Object.keys(JIRA_FEATURE_XML_CONFIG_.productsBySdaId).filter((sdaId) =>
    new RegExp(`(?:^|[^0-9])${sdaId}(?:[^0-9]|$)`).test(text),
  );
}

function jiraFeatureExtractJiraKeys_(value) {
  return [
    ...new Set(
      (String(value || "").match(/\b[A-Z][A-Z0-9]+-\d+\b/gi) || []).map((key) =>
        String(key).trim().toUpperCase(),
      ),
    ),
  ];
}

function jiraFeatureCountry_(
  deliverable,
  labels,
  teamBacklogGeography,
  workspaceGeography,
) {
  const sources = [
    deliverable,
    labels,
    teamBacklogGeography,
    workspaceGeography,
  ];

  for (let index = 0; index < sources.length; index += 1) {
    const country = jiraFeatureCountryFromText_(sources[index]);

    if (country) {
      return country;
    }
  }

  return "HL";
}

function jiraFeatureCountryFromText_(value) {
  const folded = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();

  if (!folded) {
    return "";
  }

  const tokens = folded.split(/\s+/).filter(Boolean);

  const aliases = {
    ES: "ES",
    ESP: "ES",
    ESPANA: "ES",
    SPAIN: "ES",

    MX: "MX",
    MEX: "MX",
    MEXICO: "MX",

    PE: "PE",
    PER: "PE",
    PERU: "PE",

    CO: "CO",
    COL: "CO",
    COLOMBIA: "CO",

    HL: "HL",
    HLD: "HL",
    HOLDING: "HL",
    GLOBAL: "HL",
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const country = aliases[tokens[index]];

    if (country) {
      return country;
    }
  }

  return "";
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

  estimatePis.sort((left, right) =>
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

    return [pi.year, String(month).padStart(2, "0"), "01"].join("-");
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
  const normalized = jiraFeatureNormalizeToken_(value);

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

  if (normalized === "discarded") {
    return "done";
  }

  return "pending";
}

function jiraFeatureNormalizeToken_(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function jiraFeatureJiraDateToIso_(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  const match = text.match(
    /(?:^[A-Za-z]{3},\s*)?(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/i,
  );

  if (!match) {
    return "";
  }

  const months = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  };

  const month = months[String(match[2]).toLowerCase()];

  if (!month) {
    return "";
  }

  return [
    match[3],
    String(month).padStart(2, "0"),
    String(Number(match[1])).padStart(2, "0"),
  ].join("-");
}

function jiraFeatureCompareKeys_(left, right) {
  const leftText = String(left || "")
    .trim()
    .toUpperCase();

  const rightText = String(right || "")
    .trim()
    .toUpperCase();

  const leftMatch = leftText.match(/^([A-Z0-9]+)-(\d+)$/);

  const rightMatch = rightText.match(/^([A-Z0-9]+)-(\d+)$/);

  if (leftMatch && rightMatch && leftMatch[1] === rightMatch[1]) {
    return Number(leftMatch[2]) - Number(rightMatch[2]);
  }

  return leftText.localeCompare(rightText, "es");
}

function jiraFeatureUniqueRows_(rows) {
  const result = new Map();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const key = [row.workspaceKey, row.jiraKey, row.product, row.sdaId]
      .map((value) =>
        String(value || "")
          .trim()
          .toUpperCase(),
      )
      .join("::");

    if (key && !result.has(key)) {
      result.set(key, row);
    }
  });

  return [...result.values()];
}

function ensureJiraWorkspaceFeatureSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(jiraWorkspaceFeatureSheetName_());

  if (!sheet) {
    sheet = spreadsheet.insertSheet(jiraWorkspaceFeatureSheetName_());
  }

  return sheet;
}

function replaceJiraWorkspaceFeatureRows_(sheet, rows) {
  const headers = jiraWorkspaceFeatureHeaders_();

  const requiredRows = Math.max(2, rows.length + 1);

  const requiredColumns = headers.length;

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

  sheet.getRange(1, 1, 1, requiredColumns).setValues([headers]);

  sheet.setFrozenRows(1);

  if (!rows.length) {
    return;
  }

  const values = rows.map((row) => headers.map((header) => row[header] ?? ""));

  sheet.getRange(2, 1, values.length, requiredColumns).setValues(values);
}
