"use strict";

const fs = require("node:fs");
const path = require("node:path");

// Jira v2 — Constructor de relaciones
// Modos: muestra | completo

const MODE = process.argv[2] || "muestra";

const MODES = {
  muestra: {
    input: "jira-v2-normalized.json",
    output: "jira-v2-with-relations.json",
  },
  completo: {
    input: "jira-v2-aixbanker-normalized.json",
    output: "jira-v2-aixbanker-with-relations.json",
  },
};

if (!MODES[MODE]) {
  throw new Error("Modo inválido: muestra o completo");
}

const dataDir = path.join(__dirname, "../data/local");

const inputPath = path.join(dataDir, MODES[MODE].input);

const outputPath = path.join(dataDir, MODES[MODE].output);

const snapshot = JSON.parse(fs.readFileSync(inputPath, "utf8"));

if (!Array.isArray(snapshot.issues)) {
  throw new Error("Snapshot sin incidencias");
}

// Índice único por clave Jira.
const issuesByKey = new Map();

for (const issue of snapshot.issues) {
  if (!issue.key || issuesByKey.has(issue.key)) {
    throw new Error(`Clave Jira inválida o duplicada: ${issue.key}`);
  }

  issuesByKey.set(issue.key, issue);
}

// Relaciones únicas por par padre-hijo.
const relationsByEdge = new Map();
const unresolvedByKey = new Map();
const warnings = new Set();

const priorities = {
  parent_child: 1,
  feature_child: 2,
  task_child: 3,
};

function addRelation({
  parentKey,
  childKey,
  type,
  source,
  jiraLinkType = null,
}) {
  if (!parentKey || !childKey) return;

  if (parentKey === childKey) {
    warnings.add(`Relación circular directa: ${parentKey}`);
    return;
  }

  const edgeKey = `${parentKey}->${childKey}`;

  const missing = [];

  if (!issuesByKey.has(parentKey)) {
    missing.push(parentKey);
  }

  if (!issuesByKey.has(childKey)) {
    missing.push(childKey);
  }

  if (missing.length > 0) {
    const unresolvedKey = `${type}:${edgeKey}`;

    unresolvedByKey.set(unresolvedKey, {
      parentKey,
      childKey,
      type,
      source,
      missingIssueKeys: missing,
      reason: "Incidencia fuera de la extracción",
    });

    return;
  }

  const relation = {
    sourceId: `issue:${parentKey}`,
    targetId: `issue:${childKey}`,
    type,
    jiraLinkType,
    source,
    inherited: false,
  };

  const existing = relationsByEdge.get(edgeKey);

  if (!existing) {
    relationsByEdge.set(edgeKey, relation);
    return;
  }

  // Mismo enlace encontrado desde ambos extremos.
  if (existing.type === type) {
    return;
  }

  // Evitar representar dos veces el mismo par.
  warnings.add(
    `Relación ${edgeKey} detectada con tipos ` + `${existing.type} y ${type}`,
  );

  if ((priorities[type] ?? 0) > (priorities[existing.type] ?? 0)) {
    relationsByEdge.set(edgeKey, relation);
  }
}

// 1. Feature → Story / Task / otros hijos.
for (const issue of snapshot.issues) {
  if (!issue.featureParentKey) continue;

  addRelation({
    parentKey: issue.featureParentKey,
    childKey: issue.key,
    type: "feature_child",
    source: "feature_link",
  });
}

// 2. Task L1 → Task L2.
// Leer las referencias originales de los hijos.
for (const issue of snapshot.issues) {
  for (const parentKey of issue.taskL1ParentKeys ?? []) {
    addRelation({
      parentKey,
      childKey: issue.key,
      type: "task_child",
      jiraLinkType: "Task L1 - Child",
      source: "jira_issue_link",
    });
  }
}

// 3. Procesar enlaces Jira desde ambos extremos.
for (const issue of snapshot.issues) {
  for (const link of issue.jiraLinks ?? []) {
    if (link.type !== "Task L1 - Child") {
      continue;
    }

    if (!link.linkedIssueKey) continue;

    // El enlace outward apunta al padre Task L1.
    if (link.direction === "outward") {
      addRelation({
        parentKey: link.linkedIssueKey,
        childKey: issue.key,
        type: "task_child",
        jiraLinkType: link.type,
        source: "jira_issue_link",
      });
    }

    // El enlace inward apunta al hijo Task L2.
    if (link.direction === "inward") {
      addRelation({
        parentKey: issue.key,
        childKey: link.linkedIssueKey,
        type: "task_child",
        jiraLinkType: link.type,
        source: "jira_issue_link",
      });
    }
  }
}

// 4. Subtareas con campo parent.
// Evitar repetir las relaciones ya identificadas.
for (const issue of snapshot.issues) {
  const parentKey = issue.parentKey;

  if (!parentKey) continue;

  if (parentKey === issue.featureParentKey) {
    continue;
  }

  if ((issue.taskL1ParentKeys ?? []).includes(parentKey)) {
    continue;
  }

  addRelation({
    parentKey,
    childKey: issue.key,
    type: "parent_child",
    source: "jira_parent",
  });
}

const relations = [...relationsByEdge.values()];

const unresolvedRelations = [...unresolvedByKey.values()];

const result = {
  ...snapshot,
  relations,
  quality: {
    unresolvedRelations,
    warnings: [...warnings],
  },
};

fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf8");

// Diagnóstico
const count = (type) => relations.filter((r) => r.type === type).length;

console.log("=== JIRA V2 — RELACIONES ===");
console.log("Modo:", MODE);
console.log("Incidencias:", snapshot.issues.length);

console.log("\n=== JERARQUÍA ===");

console.log("Feature -> hijos:", count("feature_child"));

console.log("Task L1 -> Task L2:", count("task_child"));

console.log("Parent -> Subtask:", count("parent_child"));

console.log("Total relaciones únicas:", relations.length);

console.log("\n=== CALIDAD ===");

console.log("Referencias fuera de la extracción:", unresolvedRelations.length);

console.log("Advertencias:", warnings.size);

const linkedKeys = new Set();

for (const relation of relations) {
  linkedKeys.add(relation.sourceId.replace(/^issue:/, ""));

  linkedKeys.add(relation.targetId.replace(/^issue:/, ""));
}

const withoutHierarchy = snapshot.issues.filter(
  (issue) => issue.type !== "Enterprise" && !linkedKeys.has(issue.key),
);

console.log(
  "Incidencias sin relación jerárquica interna:",
  withoutHierarchy.length,
);

console.log("\nArchivo generado:", outputPath);
console.log("Construcción finalizada correctamente");
