function loadMsaData() {
  return new Promise((resolve, reject) => {
    const callbackName = `msaCallback_${Date.now()}`;

    window[callbackName] = function (data) {
      delete window[callbackName];
      script.remove();
      resolve(data);
    };

    const script = document.createElement("script");

    script.src = `${window.APP_CONFIG.msaScriptUrl}?callback=${callbackName}`;

    script.onerror = function () {
      delete window[callbackName];
      script.remove();
      reject(new Error("No se pudo cargar el JSONP de MSAs"));
    };

    document.body.appendChild(script);
  });
}

window.loadMsaData = loadMsaData;

window.loadMsaData = loadMsaData;
function parseCsv(csv) {
  const lines = csv.trim().split(/\r?\n/);
  const headers = splitCsvLine(lines.shift());

  return lines.map((line) => {
    const values = splitCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header.trim()] = values[index] || "";
    });

    return row;
  });
}

function splitCsvLine(line) {
  return (
    line
      .match(/("([^"]|"")*"|[^,]+)/g)
      ?.map((value) =>
        value.replace(/^"|"$/g, "").replaceAll('""', '"').trim(),
      ) || []
  );
}

function normalizeProgramId(project) {
  const value = String(project || "").toLowerCase();

  if (value.includes("blue")) return "blue-buddy";
  if (value.includes("payments")) return "payments-acceptance";

  return value.replace(/\s+/g, "-");
}

function normalizeCountry(value) {
  const text = String(value || "").toLowerCase();

  if (text.includes("españa")) return "ES";
  if (text.includes("méxico") || text.includes("mexico")) return "MX";
  if (text.includes("perú") || text.includes("peru")) return "PE";
  if (text.includes("colombia")) return "CO";

  return "HL";
}

function normalizeMsaStatus(status) {
  const value = String(status || "").toLowerCase();

  if (value.includes("closed")) return "done";
  if (value.includes("blocked")) return "blocked";
  if (value.includes("analysis")) return "analysis in progress";
  if (value.includes("pre-work")) return "pre-work";

  return "planned";
}

function getProgressFromStatus(status) {
  const value = String(status || "").toLowerCase();

  if (value.includes("closed")) return 100;
  if (value.includes("analysis")) return 35;
  if (value.includes("blocked")) return 20;
  if (value.includes("pre-work")) return 0;

  return 0;
}

window.loadMsaData = loadMsaData;
