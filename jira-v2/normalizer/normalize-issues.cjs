"use strict";

const fs = require("node:fs");
const path = require("node:path");

// Jira v2 - Normalizador de incidencias
// Modos: muestra | completo

const MODE = process.argv[2] || "muestra";

const MODES = {
  muestra: {
    input: "jira-v2-jerarquia.json",
    output: "jira-v2-normalized.json",
  },
  completo: {
    input: "jira-v2-aixbanker-completo.json",
    output: "jira-v2-aixbanker-normalized.json",
  },
};

if (!MODES[MODE]) {
  throw new Error("Modo no válido. Usa: muestra o completo");
}

const dataDir = path.join(__dirname, "../data/local");
const inputPath = path.join(dataDir, MODES[MODE].input);
const outputPath = path.join(dataDir, MODES[MODE].output);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function uniqueStrings(value) {
  if (value === null || value === undefined) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];

  return [
    ...new Set(
      values
        .filter((v) => v !== null && v !== undefined)
        .map((v) => String(v).trim())
        .filter(Boolean),
    ),
  ];
}

function normalizeName(value) {
  if (typeof value !== "string") return null;

  const name = value.trim();

  if (!name || /<[^>]+>/.test(name)) {
    return null;
  }

  return name;
}

function normalizeJiraLinks(links) {
  if (!Array.isArray(links)) return [];

  return links
    .map((link) => {
      const outwardKey = link.outwardIssue?.key ?? null;
      const inwardKey = link.inwardIssue?.key ?? null;

      if (!outwardKey && !inwardKey) return null;

      return {
        id: link.id ? String(link.id) : null,
        type: link.type?.name ?? null,
        outwardLabel: link.type?.outward ?? null,
        inwardLabel: link.type?.inward ?? null,
        direction: outwardKey ? "outward" : "inward",
        linkedIssueKey: outwardKey ?? inwardKey,
      };
    })
    .filter(Boolean);
}

function normalizeIssue(issue) {
  const f = issue.fields || {};
  const r = issue.renderedFields || {};

  if (!issue.id || !issue.key) {
    throw new Error("Incidencia sin ID o clave Jira");
  }

  const jiraLinks = normalizeJiraLinks(f.issuelinks);

  const taskL1ParentKeys = [
    ...new Set(
      jiraLinks
        .filter(
          (link) =>
            link.type === "Task L1 - Child" && link.direction === "outward",
        )
        .map((link) => link.linkedIssueKey),
    ),
  ];

  const deliverableJiraIds = uniqueStrings(f.customfield_12900);

  return {
    id: String(issue.id),
    key: issue.key,

    type: f.issuetype?.name ?? null,
    summary: f.summary ?? null,
    status: f.status?.name ?? null,

    assignee: f.assignee?.displayName ?? null,
    storyPoints: f.customfield_10002 ?? null,

    created: f.created ?? null,
    updated: f.updated ?? null,
    resolved: f.resolutiondate ?? null,

    url:
      "https://jira.globaldevtools.bbva.com/browse/" +
      encodeURIComponent(issue.key),

    sdaJiraIds: uniqueStrings(f.customfield_12323),

    deliverableJiraIds,

    deliverableName:
      deliverableJiraIds.length === 1
        ? normalizeName(r.customfield_12900)
        : null,

    featureParentKey: f.customfield_10004 ?? null,

    parentKey: f.parent?.key ?? null,

    taskL1ParentKeys,

    // Conservamos todos los enlaces para poder
    // reconstruir relaciones desde ambos extremos.
    jiraLinks,
  };
}

function validateRaw(raw) {
  if (!Array.isArray(raw.issues)) {
    throw new Error("Respuesta Jira sin issues");
  }

  if (!Number.isInteger(raw.total)) {
    throw new Error("Total Jira inválido");
  }

  if (raw.issues.length !== raw.total) {
    throw new Error(`Extracción incompleta: ${raw.issues.length}/${raw.total}`);
  }

  if (raw.startAt !== 0) {
    throw new Error("La extracción no comienza en startAt=0");
  }

  if (MODE === "completo" && raw.extraction?.complete !== true) {
    throw new Error("El exportador no marcó la extracción como completa");
  }
}

function main() {
  console.log("=== JIRA V2 - NORMALIZADOR ===");
  console.log("Modo:", MODE);

  const raw = readJson(inputPath);

  validateRaw(raw);

  const issues = raw.issues.map(normalizeIssue);

  const keys = issues.map((issue) => issue.key);

  if (new Set(keys).size !== keys.length) {
    throw new Error("Claves Jira duplicadas");
  }

  const ids = issues.map((issue) => issue.id);

  if (new Set(ids).size !== ids.length) {
    throw new Error("IDs Jira duplicados");
  }

  const snapshot = {
    schemaVersion: "0.2.0",
    programId: "aixbanker",
    generatedAt: new Date().toISOString(),

    source: {
      file: MODES[MODE].input,
      extractedAt: raw.extraction?.extractedAt ?? null,
      total: raw.total,
      complete: true,
    },

    issues,
  };

  fs.writeFileSync(outputPath, JSON.stringify(snapshot, null, 2), "utf8");

  const count = (predicate) => issues.filter(predicate).length;

  const issueTypes = {};

  for (const issue of issues) {
    const type = issue.type ?? "Unknown";
    issueTypes[type] = (issueTypes[type] ?? 0) + 1;
  }

  console.log("\n=== RESULTADOS ===");
  console.log("Incidencias:", issues.length);
  console.log("Duplicados:", 0);
  console.log("Tipos:", issueTypes);

  console.log(
    "Con Feature padre:",
    count((i) => Boolean(i.featureParentKey)),
  );

  console.log(
    "Con Task L1 padre:",
    count((i) => i.taskL1ParentKeys.length > 0),
  );

  console.log(
    "Con SDA directa:",
    count((i) => i.sdaJiraIds.length > 0),
  );

  console.log(
    "Con entregable directo:",
    count((i) => i.deliverableJiraIds.length > 0),
  );

  console.log(
    "Con varias SDA:",
    count((i) => i.sdaJiraIds.length > 1),
  );

  console.log(
    "Con varios entregables:",
    count((i) => i.deliverableJiraIds.length > 1),
  );

  console.log(
    "Con Story Points:",
    count((i) => i.storyPoints !== null),
  );

  console.log(
    "Sin responsable:",
    count((i) => i.assignee === null),
  );

  console.log(
    "Enlaces Jira conservados:",
    issues.reduce((total, i) => total + i.jiraLinks.length, 0),
  );

  console.log("\nArchivo generado:", outputPath);
  console.log("Normalización completada correctamente");
}

main();
