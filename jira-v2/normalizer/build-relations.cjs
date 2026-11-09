"use strict";

const fs = require("node:fs");
const path = require("node:path");

/**
 * Jira v2 - Constructor de relaciones jerárquicas.
 *
 * Uso:
 *   node jira-v2/normalizer/build-relations.cjs muestra
 *   node jira-v2/normalizer/build-relations.cjs completo
 *   node jira-v2/normalizer/build-relations.cjs descubierto aixbanker
 *
 * El modo descubierto trabaja solo con los archivos del nuevo origen
 * y no sobrescribe los resultados de muestra o completo.
 * Solo lectura del archivo de entrada; salida local sin datos en Git.
 */

const MODE = process.argv[2] || "muestra";
const requestedProgramId = (process.argv[3] || "").trim().toLowerCase();

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

if (MODE === "descubierto") {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(requestedProgramId)) {
    throw new Error(
      "Indica un programa válido. Ejemplo: " +
      "node jira-v2/normalizer/build-relations.cjs descubierto aixbanker"
    );
  }

  MODES.descubierto = {
    input: `jira-v2-${requestedProgramId}-descubierto-normalized.json`,
    output: `jira-v2-${requestedProgramId}-descubierto-with-relations.json`,
  };
}

if (!Object.prototype.hasOwnProperty.call(MODES, MODE)) {
  throw new Error("Modo inválido. Usa: muestra, completo o descubierto <programa>");
}

const dataDir = path.join(__dirname, "../data/local");
const inputPath = path.join(dataDir, MODES[MODE].input);
const outputPath = path.join(dataDir, MODES[MODE].output);
const snapshot = JSON.parse(fs.readFileSync(inputPath, "utf8"));

if (!snapshot || !Array.isArray(snapshot.issues)) {
  throw new Error("Snapshot sin incidencias");
}

if (MODE === "descubierto") {
  if (snapshot.programId !== requestedProgramId) {
    throw new Error("El identificador del programa no coincide con el archivo");
  }
  if (
    snapshot.source?.complete !== true ||
    snapshot.source?.discoveryMode !== "sda-hierarchy"
  ) {
    throw new Error("El origen no es una extracción SDA completa y validada");
  }
}

// Índices únicos por clave e ID Jira.
const issuesByKey = new Map();
const issueIds = new Set();

for (const issue of snapshot.issues) {
  if (!issue.key || !issue.id || issuesByKey.has(issue.key)) {
    throw new Error(`Clave Jira inválida o duplicada: ${issue.key}`);
  }
  if (issueIds.has(String(issue.id))) {
    throw new Error(`ID Jira duplicado: ${issue.id}`);
  }
  issuesByKey.set(issue.key, issue);
  issueIds.add(String(issue.id));
}

// Una única relación por par padre-hijo, conservando la prioridad del origen.
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

  if (!issuesByKey.has(parentKey)) missing.push(parentKey);
  if (!issuesByKey.has(childKey)) missing.push(childKey);

  if (missing.length > 0) {
    unresolvedByKey.set(`${type}:${edgeKey}`, {
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

  if (existing.type === type) return;

  warnings.add(
    `Relación ${edgeKey} detectada con tipos ${existing.type} y ${type}`
  );

  if ((priorities[type] ?? 0) > (priorities[existing.type] ?? 0)) {
    relationsByEdge.set(edgeKey, relation);
  }
}

// 1. Feature -> Story / Task / otros hijos.
for (const issue of snapshot.issues) {
  if (!issue.featureParentKey) continue;
  addRelation({
    parentKey: issue.featureParentKey,
    childKey: issue.key,
    type: "feature_child",
    source: "feature_link",
  });
}

// 2. Task L1 -> Task L2: referencias declaradas en los hijos.
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

// 3. Enlaces originales desde ambos extremos.
for (const issue of snapshot.issues) {
  for (const link of issue.jiraLinks ?? []) {
    if (link.type !== "Task L1 - Child" || !link.linkedIssueKey) continue;

    if (link.direction === "outward") {
      addRelation({
        parentKey: link.linkedIssueKey,
        childKey: issue.key,
        type: "task_child",
        jiraLinkType: link.type,
        source: "jira_issue_link",
      });
    }

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

// 4. Subtareas nativas, sin repetir la relación si ya se identificó.
for (const issue of snapshot.issues) {
  const parentKey = issue.parentKey;
  if (!parentKey) continue;
  if (parentKey === issue.featureParentKey) continue;
  if ((issue.taskL1ParentKeys ?? []).includes(parentKey)) continue;

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

// Escribir solo después de validar todos los registros.
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf8");

const count = (type) => relations.filter((r) => r.type === type).length;

console.log("=== JIRA V2 - RELACIONES ===");
console.log("Modo:", MODE);
console.log("Programa:", snapshot.programId);
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
  (issue) => issue.type !== "Enterprise" && !linkedKeys.has(issue.key)
);
console.log("Incidencias sin relación jerárquica interna:", withoutHierarchy.length);
console.log("\nArchivo generado:", outputPath);
console.log("Construcción finalizada correctamente");
