const fs = require("node:fs");
const path = require("node:path");

const dataDir = path.join(__dirname, "../data/local");

const inputPath = path.join(dataDir, "jira-v2-jerarquia.json");

const outputPath = path.join(dataDir, "jira-v2-normalized.json");

// 1. Leer la respuesta original de Jira
const raw = JSON.parse(fs.readFileSync(inputPath, "utf8"));

if (!Array.isArray(raw.issues)) {
  throw new Error("Respuesta Jira sin issues");
}

if (raw.issues.length !== raw.total) {
  throw new Error("La muestra Jira está incompleta");
}

// 2. Normalizar cada incidencia
const issues = raw.issues.map((issue) => {
  const f = issue.fields || {};
  const r = issue.renderedFields || {};

  // Relaciones Task L1 -> Task L2
  // En el hijo, outwardIssue apunta al padre.
  const taskL1ParentKeys = [
    ...new Set(
      (f.issuelinks ?? [])
        .filter(
          (link) =>
            link.type?.name === "Task L1 - Child" && link.outwardIssue?.key,
        )
        .map((link) => link.outwardIssue.key),
    ),
  ];

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

    // SDA y entregables originales
    sdaJiraIds: f.customfield_12323 ?? [],
    deliverableJiraIds: f.customfield_12900 ?? [],
    deliverableName: r.customfield_12900 ?? null,

    // Relaciones jerárquicas
    featureParentKey: f.customfield_10004 ?? null,

    parentKey: f.parent?.key ?? null,

    taskL1ParentKeys,
  };
});

// 3. Validar duplicados
const keys = issues.map((issue) => issue.key);

if (new Set(keys).size !== keys.length) {
  throw new Error("Claves Jira duplicadas");
}

// 4. Crear snapshot normalizado
const snapshot = {
  schemaVersion: "0.1.0",
  programId: "aixbanker",
  generatedAt: new Date().toISOString(),
  issues,
};

// 5. Guardar resultado local
fs.writeFileSync(outputPath, JSON.stringify(snapshot, null, 2), "utf8");

// 6. Mostrar diagnóstico
console.log("Incidencias normalizadas:", issues.length);
console.log("Claves:", keys.join(", "));

const withTaskParents = issues.filter(
  (issue) => issue.taskL1ParentKeys.length > 0,
);

console.log("Incidencias con padre Task L1:", withTaskParents.length);

console.log("Snapshot local generado correctamente");
