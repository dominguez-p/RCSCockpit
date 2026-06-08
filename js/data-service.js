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
async function fetchSheetsBatch(sheetNames) {
  const spreadsheetId = window.APP_CONFIG.googleSheetsApi.spreadsheetId;
  const apiKey = window.APP_CONFIG.googleSheetsApi.apiKey;

  const ranges = Object.values(sheetNames)
    .filter(Boolean)
    .map((name) => `ranges=${encodeURIComponent(name)}`)
    .join("&");

  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet` +
    `?${ranges}&key=${apiKey}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Error batchGet Sheets: ${res.status} ${await res.text()}`);
  }

  return await res.json();
}
async function loadGoogleSheetsApiData() {
  const sheetNames = window.APP_CONFIG.sheets;
  const batch = await fetchSheetsBatch(sheetNames);

  const byName = {};

  batch.valueRanges.forEach((rangeData, index) => {
    const key = Object.keys(sheetNames)[index];
    byName[key] = rangeData.values || [];
  });

  return {
    portfolioKpis: rowsToArray(byName.portfolioKpis),
    programs: rowsToObjects(byName.programs),
    modules: rowsToObjects(byName.modules),
    roles: rowsToObjects(byName.roles),
    priorities: rowsToObjects(byName.priorities),
    functional: rowsToObjects(byName.functional),
    functionalSystemLinks: rowsToObjects(byName.functionalSystemLinks),
    architectureFeaturesGaps: rowsToObjects(byName.architectureFeaturesGaps),
    systemRelationships: rowsToObjects(byName.systemRelationships),
    impediments: rowsToObjects(byName.impediments),
    decisionsPending: rowsToObjects(byName.decisionsPending),
    decisionsDone: rowsToObjects(byName.decisionsDone),
    systemsToBe: rowsToObjects(byName.systemsToBe),
    systemRelationshipsToBe: rowsToObjects(byName.systemRelationshipsToBe),
    projects: rowsToObjects(byName.projects),
    projectPhases: rowsToObjects(byName.projectPhases),
    msas: rowsToObjects(byName.msas),
    msaPhases: rowsToObjects(byName.msaPhases),
    systems: rowsToObjects(byName.systems),
  };
}
let isLoadingData = false;

async function init(showMessage = true) {
  if (isLoadingData) return;
  isLoadingData = true;

  try {
    DATA = await loadData();
    statusEl.textContent = "Datos Google Sheets API v4 actualizados";
  } catch (e) {
    console.error(e);
    statusEl.textContent = "Error cargando datos";
  } finally {
    isLoadingData = false;
  }

  render();
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
