async function loadData() {
  if (window.APP_CONFIG.runtime === "apps-script") {
    return loadAppsScriptData();
  }

  if (window.APP_CONFIG.runtime === "google-sheets-api") {
    return loadGoogleSheetsApiData();
  }

  if (window.APP_CONFIG.runtime === "local-json") {
    return loadLocalJsonData();
  }

  return window.SAMPLE_DATA;
}

async function loadLocalJsonData() {
  const url = window.APP_CONFIG.localDataUrl || "./data/app-data.json";
  const response = await fetch(`${url}?v=${Date.now()}`);

  if (!response.ok) {
    throw new Error(`No se pudo cargar JSON local: ${response.status}`);
  }

  return response.json();
}

function loadAppsScriptData() {
  return new Promise((resolve, reject) => {
    if (!window.google || !google.script || !google.script.run) {
      reject(
        new Error("google.script.run no está disponible fuera de Apps Script."),
      );
      return;
    }

    google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(reject)
      .getAppData();
  });
}

async function fetchSheetValues(sheetName) {
  const { apiKey, spreadsheetId } = window.APP_CONFIG.googleSheetsApi || {};

  if (
    !apiKey ||
    !spreadsheetId ||
    apiKey.includes("REPLACE") ||
    spreadsheetId.includes("REPLACE")
  ) {
    throw new Error(
      "Google Sheets API Key or Spreadsheet ID is not configured.",
    );
  }

  const encodedSheetName = encodeURIComponent(sheetName);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedSheetName}?key=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Could not load sheet "${sheetName}". ${response.status} ${errorText}`,
    );
  }

  const payload = await response.json();
  return payload.values || [];
}

async function loadGoogleSheetsApiData() {
  const sheetNames = window.APP_CONFIG.sheets;

  const [
    portfolioKpisRows,
    programsRows,
    modulesRows,
    rolesRows,
    prioritiesRows,
    functionalRows,
    systemsRows,
    functionalSystemLinksRows,
    architectureFeaturesGapsRows,
    systemRelationshipsRows,
    impedimentsRows,
    decisionsPendingRows,
    decisionsDoneRows,
    systemsToBeRows,
    systemRelationshipsToBeRows,
    projectsRows,
    projectPhasesRows,
  ] = await Promise.all([
    fetchSheetValues(sheetNames.portfolioKpis),
    fetchSheetValues(sheetNames.programs),
    fetchSheetValues(sheetNames.modules),
    fetchSheetValues(sheetNames.roles),
    fetchSheetValues(sheetNames.priorities),
    fetchSheetValues(sheetNames.functional),
    fetchSheetValues(sheetNames.systems),
    fetchSheetValues(sheetNames.functionalSystemLinks),
    fetchSheetValues(sheetNames.architectureFeaturesGaps),
    fetchSheetValues(sheetNames.systemRelationships),
    fetchSheetValues(sheetNames.impediments),
    fetchSheetValues(sheetNames.decisionsPending),
    fetchSheetValues(sheetNames.decisionsDone),
    fetchSheetValues(sheetNames.systemsToBe),
    fetchSheetValues(sheetNames.systemRelationshipsToBe),
    fetchSheetValues(sheetNames.projects),
    fetchSheetValues(sheetNames.projectPhases),
  ]);

  return {
    projects: rowsToObjects(projectsRows),
    projectPhases: rowsToObjects(projectPhasesRows),
    systemsToBe: rowsToObjects(systemsToBeRows),
    systemRelationshipsToBe: rowsToObjects(systemRelationshipsToBeRows),
    impediments: rowsToObjects(impedimentsRows),
    decisionsPending: rowsToObjects(decisionsPendingRows),
    decisionsDone: rowsToObjects(decisionsDoneRows),
    functionalSystemLinks: rowsToObjects(functionalSystemLinksRows),
    architectureFeaturesGaps: rowsToObjects(architectureFeaturesGapsRows),
    portfolioKpis: rowsToArray(portfolioKpisRows),
    systemRelationships: rowsToObjects(systemRelationshipsRows),

    programs: rowsToObjects(programsRows).map((program) => ({
      ...program,
      functional: toNumber(program.functional),
      systems: toNumber(program.systems),
      architecture: toNumber(program.architecture),
      enabled: toBoolean(program.enabled),
    })),

    modules: rowsToObjects(modulesRows).map((module) => ({
      ...module,
      route: module.route || null,
    })),

    roles: rowsToObjects(rolesRows),
    priorities: rowsToObjects(prioritiesRows),

    functional: rowsToObjects(functionalRows).map((item) => ({
      ...item,
      features: splitPipeList(item.features),
    })),

    systems: rowsToObjects(systemsRows),
  };
}

function rowsToObjects(rows) {
  if (!rows.length) return [];

  const headers = rows[0].map((header) => String(header || "").trim());

  return rows
    .slice(1)
    .filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""))
    .map((row) => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = String(row[index] ?? "").trim();
      });
      return obj;
    });
}

function rowsToArray(rows) {
  return rows
    .slice(1)
    .filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""))
    .map((row) => row.map((cell) => String(cell ?? "").trim()));
}

function toNumber(value, fallback = 0) {
  const number = Number(
    String(value ?? "")
      .replace("%", "")
      .replace(",", ".")
      .trim(),
  );

  return Number.isNaN(number) ? fallback : number;
}

function toBoolean(value) {
  return (
    String(value ?? "")
      .trim()
      .toLowerCase() === "true"
  );
}

function splitPipeList(value) {
  return String(value ?? "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}
