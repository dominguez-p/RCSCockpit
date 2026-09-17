const COCKPIT_ACCESS_SPREADSHEET_ID_PROPERTY = "COCKPIT_ACCESS_SPREADSHEET_ID";

/**
 * Ejecutar UNA sola vez desde el editor de Apps Script.
 *
 * Debe ejecutarse con el script abierto desde la Spreadsheet
 * que gobierna los permisos de ese origen.
 */
function setupCockpitAccessControl() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error(
      "No se ha podido determinar la Spreadsheet asociada al Apps Script.",
    );
  }

  PropertiesService.getScriptProperties().setProperty(
    COCKPIT_ACCESS_SPREADSHEET_ID_PROPERTY,
    spreadsheet.getId(),
  );

  Logger.log("========================================");
  Logger.log("COCKPIT ACCESS CONTROL");
  Logger.log("========================================");
  Logger.log("Spreadsheet: " + spreadsheet.getName());
  Logger.log("ID: " + spreadsheet.getId());
  Logger.log("========================================");
}

function getCockpitAccessSpreadsheetId_() {
  const spreadsheetId = String(
    PropertiesService.getScriptProperties().getProperty(
      COCKPIT_ACCESS_SPREADSHEET_ID_PROPERTY,
    ) || "",
  ).trim();

  if (!spreadsheetId) {
    throw createCockpitAccessError_(
      "ACCESS_NOT_CONFIGURED",
      "El control de acceso del Cockpit no está configurado.",
    );
  }

  return spreadsheetId;
}

function getCockpitAccess_() {
  const email = String(Session.getActiveUser().getEmail() || "")
    .trim()
    .toLowerCase();

  /*
   * Fail closed.
   *
   * Si Apps Script no puede determinar la identidad,
   * no devolvemos datos.
   */
  if (!email) {
    return {
      granted: false,
      role: "none",
      canEdit: false,
      code: "IDENTITY_UNAVAILABLE",
    };
  }

  const spreadsheetId = getCockpitAccessSpreadsheetId_();

  const file = DriveApp.getFileById(spreadsheetId);

  const permission = file.getAccess(email);

  const editorPermissions = [
    DriveApp.Permission.OWNER,
    DriveApp.Permission.EDIT,
    DriveApp.Permission.ORGANIZER,
    DriveApp.Permission.FILE_ORGANIZER,
  ];

  const viewerPermissions = [
    DriveApp.Permission.VIEW,
    DriveApp.Permission.COMMENT,
  ];

  const canEdit = editorPermissions.includes(permission);

  const canView = canEdit || viewerPermissions.includes(permission);

  if (!canView) {
    return {
      granted: false,
      role: "none",
      canEdit: false,
      code: "ACCESS_DENIED",
    };
  }

  return {
    granted: true,
    role: canEdit ? "editor" : "viewer",
    canEdit,
    code: "",
  };
}

function getPublicCockpitAccess_(access) {
  return {
    granted: access?.granted === true,
    role:
      access?.role === "editor"
        ? "editor"
        : access?.role === "viewer"
          ? "viewer"
          : "none",
    canEdit: access?.canEdit === true,
  };
}

function requireCockpitReadAccess_() {
  const access = getCockpitAccess_();

  if (!access.granted) {
    throw createCockpitAccessError_(
      "ACCESS_DENIED",
      "El usuario no tiene acceso al Cockpit.",
    );
  }

  return access;
}

function requireCockpitEditAccess_() {
  const access = requireCockpitReadAccess_();

  if (!access.canEdit) {
    throw createCockpitAccessError_(
      "READ_ONLY",
      "El usuario dispone únicamente de acceso de lectura.",
    );
  }

  return access;
}

function createCockpitAccessError_(code, message) {
  const error = new Error(message);

  error.code = code;

  return error;
}

function getCockpitErrorCode_(error) {
  const code = String(error?.code || "").trim();

  return code || "DATA_UNAVAILABLE";
}

function createCockpitJsonpResponse_(event, payload) {
  const requestedCallback = String(
    event?.parameter?.callback || "callback",
  ).trim();

  const callback = /^[A-Za-z_$][A-Za-z0-9_$.\[\]]*$/.test(requestedCallback)
    ? requestedCallback
    : "callback";

  return ContentService.createTextOutput(
    `${callback}(${JSON.stringify(payload)});`,
  ).setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function createCockpitJsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
