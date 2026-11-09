"use strict";

const fs = require("node:fs");
const path = require("node:path");

const dataDir = path.join(__dirname, "../data/local");

const snapshot = JSON.parse(
  fs.readFileSync(
    path.join(dataDir, "jira-v2-aixbanker-with-relations.json"),
    "utf8",
  ),
);

const config = JSON.parse(
  fs.readFileSync(path.join(dataDir, "program-config.json"), "utf8"),
);

if (!Array.isArray(snapshot.issues) || !Array.isArray(snapshot.relations)) {
  throw new Error("Snapshot Jira v2 inválido");
}

const configuredSdas = new Set(config.sdas.map((sda) => String(sda.jiraId)));

const issueKeys = new Set(snapshot.issues.map((issue) => issue.key));

const linkedKeys = new Set();

for (const relation of snapshot.relations) {
  for (const id of [relation.sourceId, relation.targetId]) {
    if (id.startsWith("issue:")) {
      linkedKeys.add(id.slice(6));
    }
  }
}

const unresolved = snapshot.quality?.unresolvedRelations ?? [];

console.log("=== AUDITORÍA JIRA V2 ===");
console.log("Programa:", config.programId);
console.log("Incidencias:", snapshot.issues.length);
console.log("Relaciones:", snapshot.relations.length);

console.log("\n=== REFERENCIAS SIN RESOLVER ===");

if (unresolved.length === 0) {
  console.log("Ninguna");
} else {
  console.table(
    unresolved.map((item) => ({
      padre: item.parentKey,
      hijo: item.childKey,
      tipo: item.type,
      ausentes: (item.missingIssueKeys ?? []).join(", "),
      motivo: item.reason,
    })),
  );
}

const disconnected = snapshot.issues.filter(
  (issue) => issue.type !== "Enterprise" && !linkedKeys.has(issue.key),
);

function classifyIssue(issue) {
  const hasConfiguredSda = (issue.sdaJiraIds ?? []).some((id) =>
    configuredSdas.has(String(id)),
  );

  const hasDeliverable = (issue.deliverableJiraIds ?? []).length > 0;

  const hasParentReference = Boolean(
    issue.featureParentKey ||
    issue.parentKey ||
    (issue.taskL1ParentKeys ?? []).length,
  );

  if (hasConfiguredSda || hasDeliverable) {
    return "Posible raíz de jerarquía";
  }

  if (hasParentReference) {
    return "Referencia a padre por revisar";
  }

  return "Sin vínculo jerárquico visible";
}

console.log("\n=== INCIDENCIAS SIN RELACIÓN INTERNA ===");

console.log("Total:", disconnected.length);

const classified = disconnected.map((issue) => ({
  key: issue.key,
  tipo: issue.type,
  estado: issue.status,
  SDA: (issue.sdaJiraIds ?? []).join(", "),
  entregables: (issue.deliverableJiraIds ?? []).length,
  clasificacion: classifyIssue(issue),
}));

console.table(classified);

console.log("\n=== RESUMEN POR CLASIFICACIÓN ===");

const counts = {};

for (const issue of disconnected) {
  const category = classifyIssue(issue);

  counts[category] = (counts[category] ?? 0) + 1;
}

console.table(
  Object.entries(counts).map(([clasificacion, total]) => ({
    clasificacion,
    total,
  })),
);

console.log("\n=== CONTROL DE INTEGRIDAD ===");

const invalidRelations = snapshot.relations.filter((relation) => {
  const parent = relation.sourceId.slice(6);
  const child = relation.targetId.slice(6);

  return !issueKeys.has(parent) || !issueKeys.has(child);
});

console.log(
  "Relaciones internas con referencias inválidas:",
  invalidRelations.length,
);

console.log("Referencias externas registradas:", unresolved.length);

console.log("\nAuditoría finalizada");
