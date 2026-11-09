"use strict";

const fs = require("node:fs");
const path = require("node:path");

const filePath = path.join(
  __dirname,
  "../data/local/jira-v2-aixbanker-snapshot.json",
);

const snapshot = JSON.parse(fs.readFileSync(filePath, "utf8"));

const issuesByKey = new Map(snapshot.issues.map((issue) => [issue.key, issue]));

const quality = snapshot.quality ?? {};

console.log("=== JIRA V2 - AUDITORÍA SNAPSHOT ===");
console.log("Programa:", snapshot.programId);

// 1. Incidencias desconectadas
console.log("\n=== INCIDENCIAS SIN SDA ===");

const orphanKeys = quality.orphanIssues ?? [];

if (orphanKeys.length === 0) {
  console.log("Ninguna");
}

for (const key of orphanKeys) {
  const issue = issuesByKey.get(key);

  console.log({
    key,
    type: issue?.type ?? null,
    summary: issue?.summary ?? null,
    status: issue?.status ?? null,
    featureParentKey: issue?.featureParentKey ?? null,
    parentKey: issue?.parentKey ?? null,
    taskL1ParentKeys: issue?.taskL1ParentKeys ?? [],
    jiraLinks: issue?.jiraLinks ?? [],
  });
}

// 2. Entregables sin nombre
console.log("\n=== ENTREGABLES SIN NOMBRE ===");

const missingIds = quality.missingNameDeliverables ?? [];

for (const id of missingIds) {
  const deliverable = snapshot.deliverables.find((item) => item.id === id);

  const relatedIssues = snapshot.issues.filter((issue) =>
    (issue.deliverableJiraIds ?? []).map(String).includes(String(id)),
  );

  console.log({
    deliverableId: id,
    sdaIds: deliverable?.sdaIds ?? [],
    relatedIssues: relatedIssues.map((issue) => ({
      key: issue.key,
      type: issue.type,
      summary: issue.summary,
      deliverableIds: issue.deliverableJiraIds,
    })),
  });
}

// 3. Referencias externas
console.log("\n=== REFERENCIAS SIN RESOLVER ===");

for (const relation of quality.unresolvedRelations ?? []) {
  console.log(relation);
}

// 4. Integridad básica
console.log("\n=== INTEGRIDAD ===");

const issueKeys = snapshot.issues.map((issue) => issue.key);

const duplicateIssues = issueKeys.length - new Set(issueKeys).size;

const validNodes = new Set([
  ...snapshot.sdas.map((sda) => `sda:${sda.id}`),
  ...snapshot.deliverables.map(
    (deliverable) => `deliverable:${deliverable.id}`,
  ),
  ...snapshot.issues.map((issue) => `issue:${issue.key}`),
]);

const invalidRelations = snapshot.relations.filter(
  (relation) =>
    !validNodes.has(relation.sourceId) || !validNodes.has(relation.targetId),
);

console.log("Incidencias duplicadas:", duplicateIssues);
console.log("Relaciones inválidas:", invalidRelations.length);
console.log("Incidencias desconectadas:", orphanKeys.length);
console.log("Entregables sin nombre:", missingIds.length);

console.log("\nAuditoría finalizada");
