const SHEETS = {
  sdaFinancials: "sda_financials",
  sdaResources: "sda_resources",
};

function doGet(e) {
  try {
    const data = getRestrictedAppData();

    return jsonpResponse_(e, {
      ok: true,
      restricted: true,
      data: data,
    });
  } catch (error) {
    console.error(error);

    return jsonpResponse_(e, {
      ok: false,
      restricted: true,
      error: "RESTRICTED_DATA_UNAVAILABLE",
    });
  }
}

function getRestrictedAppData() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  return {
    sdaFinancials: readSheetAsObjects_(spreadsheet, SHEETS.sdaFinancials),

    sdaResources: readSheetAsObjects_(spreadsheet, SHEETS.sdaResources),
  };
}

function readSheetAsObjects_(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    return [];
  }

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow < 2 || lastColumn < 1) {
    return [];
  }

  const values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();

  const headers = values[0].map((value) => String(value || "").trim());

  return values
    .slice(1)
    .filter((row) => row.some((value) => String(value ?? "").trim() !== ""))
    .map((row) => {
      const item = {};

      headers.forEach((header, index) => {
        if (!header) {
          return;
        }

        item[header] = normalizeValue_(row[index]);
      });

      return item;
    });
}

function normalizeValue_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd",
    );
  }

  return value;
}

function jsonpResponse_(event, payload) {
  const callback =
    event && event.parameter && event.parameter.callback
      ? String(event.parameter.callback)
      : "";

  const json = JSON.stringify(payload);

  if (!callback) {
    return ContentService.createTextOutput(json).setMimeType(
      ContentService.MimeType.JSON,
    );
  }

  const safeCallback = callback.replace(/[^a-zA-Z0-9_$\.]/g, "");

  return ContentService.createTextOutput(
    `${safeCallback}(${json});`,
  ).setMimeType(ContentService.MimeType.JAVASCRIPT);
}
