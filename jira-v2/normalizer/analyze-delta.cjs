"use strict";

const fs = require("node:fs");
const path = require("node:path");

// Jira v2 - Analizador de Delta.
// No modifica snapshots ni otros orígenes.
// Admite cualquier snapshot con el contrato Jira v2.

const defaultPath = path.join(
  __dirname,
  "../data/local/jira-v2-aixbanker-snapshot.json",
);

const snapshotPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : defaultPath;

// Política provisional de clasificación.
// Los estados originales de Jira nunca se modifican.
const STATUS_POLICY = {
  deployed: ["Deployed"],

  excluded: ["Discarded", "Deleted"],

  review: ["Closed"],

  operational: [
    "New",
    "Accepted",
    "In Progress",
    "Ready",
    "Ready to Deploy",
    "Ready To Verify",
    "Test",
    "Analysing",
    "Blocked",
    "Designing Component",
    "To Rework",
  ],
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeStatus(status) {
  return String(status ?? "")
    .trim()
    .toLowerCase();
}

function createStatusIndex() {
  const index = new Map();

  for (const [group, statuses] of Object.entries(STATUS_POLICY)) {
    for (const status of statuses) {
      const key = normalizeStatus(status);

      if (index.has(key)) {
        throw new Error(`Estado repetido en política: ${status}`);
      }

      index.set(key, group);
    }
  }

  return index;
}

const statusIndex = createStatusIndex();

function classifyStatus(status) {
  const key = normalizeStatus(status);

  // No clasificar un estado desconocido como
  // trabajo pendiente sin comprobar su significado.
  return statusIndex.get(key) ?? "review";
}

function isWorkIssue(issue) {
  return issue.type !== "Enterprise";
}

function summarize(issueKeys, issuesByKey) {
  const result = {
    total: 0,
    deployed: 0,
    rawDelta: 0,
    operational: 0,
    review: 0,
    excluded: 0,
    operationalSP: 0,
    operationalWithSP: 0,
    operationalWithoutSP: 0,
    operationalUnassigned: 0,
  };

  const operationalStatuses = new Map();
  const reviewStatuses = new Map();

  for (const key of issueKeys) {
    const issue = issuesByKey.get(key);

    if (!issue || !isWorkIssue(issue)) continue;

    result.total++;

    const group = classifyStatus(issue.status);

    if (group === "deployed") {
      result.deployed++;
      continue;
    }

    result.rawDelta++;

    if (group === "excluded") {
      result.excluded++;
      continue;
    }

    if (group === "review") {
      result.review++;

      const status = issue.status ?? "(sin estado)";

      reviewStatuses.set(status, (reviewStatuses.get(status) ?? 0) + 1);

      continue;
    }

    result.operational++;

    const status = issue.status ?? "(sin estado)";

    operationalStatuses.set(status, (operationalStatuses.get(status) ?? 0) + 1);

    if (
      typeof issue.storyPoints === "number" &&
      Number.isFinite(issue.storyPoints)
    ) {
      result.operationalSP += issue.storyPoints;
      result.operationalWithSP++;
    } else {
      result.operationalWithoutSP++;
    }

    if (!issue.assignee) {
      result.operationalUnassigned++;
    }
  }

  if (
    result.total !==
    result.deployed + result.operational + result.review + result.excluded
  ) {
    throw new Error("La clasificación no cuadra con el total");
  }

  return {
    ...result,
    operationalStatuses,
    reviewStatuses,
  };
}

function main() {
  const snapshot = readJson(snapshotPath);

  if (
    !Array.isArray(snapshot.sdas) ||
    !Array.isArray(snapshot.issues) ||
    !Array.isArray(snapshot.relations)
  ) {
    throw new Error("Snapshot Jira v2 inválido");
  }

  const issuesByKey = new Map();

  for (const issue of snapshot.issues) {
    if (!issue.key || issuesByKey.has(issue.key)) {
      throw new Error(`Clave Jira duplicada o inválida: ${issue.key}`);
    }

    issuesByKey.set(issue.key, issue);
  }

  // Grafo de navegación SDA -> entregables -> issues.
  const children = new Map();

  for (const relation of snapshot.relations) {
    if (!children.has(relation.sourceId)) {
      children.set(relation.sourceId, new Set());
    }

    children.get(relation.sourceId).add(relation.targetId);
  }

  function reachableIssueKeys(sdaId) {
    const visited = new Set();
    const pending = [`sda:${sdaId}`];
    const keys = new Set();

    while (pending.length > 0) {
      const nodeId = pending.pop();

      if (visited.has(nodeId)) continue;

      visited.add(nodeId);

      if (nodeId.startsWith("issue:")) {
        const key = nodeId.slice(6);

        if (!issuesByKey.has(key)) {
          throw new Error(`Incidencia inexistente: ${key}`);
        }

        keys.add(key);
      }

      for (const child of children.get(nodeId) ?? []) {
        if (!visited.has(child)) {
          pending.push(child);
        }
      }
    }

    return keys;
  }

  const allKeys = new Set();
  const rows = [];

  console.log("=== JIRA V2 - ANÁLISIS DELTA ===");
  console.log("Programa:", snapshot.programId);
  console.log("SDA configuradas:", snapshot.sdas.length);

  for (const sda of snapshot.sdas) {
    const keys = reachableIssueKeys(sda.id);

    for (const key of keys) {
      allKeys.add(key);
    }

    const summary = summarize(keys, issuesByKey);

    rows.push({
      SDA: sda.id,
      nombre: sda.name,
      total: summary.total,
      deployed: summary.deployed,
      deltaBruto: summary.rawDelta,
      operativo: summary.operational,
      revisar: summary.review,
      excluidas: summary.excluded,
      SPoperativos: summary.operationalSP,
    });
  }

  console.log("\n=== RESUMEN POR SDA ===");
  console.table(rows);

  // Total del programa: cada Jira key cuenta una vez.
  const global = summarize(allKeys, issuesByKey);

  console.log("\n=== DELTA GLOBAL SIN DUPLICADOS ===");
  console.log("Incidencias:", global.total);
  console.log("Deployed:", global.deployed);
  console.log("Delta bruto:", global.rawDelta);
  console.log("Delta operativo:", global.operational);
  console.log("Pendientes de revisión:", global.review);
  console.log("Excluidas:", global.excluded);

  console.log("\n=== STORY POINTS OPERATIVOS ===");
  console.log("SP informados:", global.operationalSP);
  console.log("Incidencias con SP:", global.operationalWithSP);
  console.log("Incidencias sin SP:", global.operationalWithoutSP);
  console.log("Incidencias sin responsable:", global.operationalUnassigned);

  console.log("\n=== ESTADOS DEL DELTA OPERATIVO ===");

  console.table(
    [...global.operationalStatuses.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([estado, total]) => ({
        estado,
        total,
      })),
  );

  console.log("\n=== ESTADOS PENDIENTES DE REVISIÓN ===");

  console.table(
    [...global.reviewStatuses.entries()].map(([estado, total]) => ({
      estado,
      total,
    })),
  );

  const orphanKeys = snapshot.quality?.orphanIssues ?? [];

  console.log("\n=== COBERTURA ===");
  console.log("Incidencias navegables:", global.total);
  console.log("Incidencias fuera de navegación:", orphanKeys.length);

  const expected = snapshot.quality?.stats?.connectedIssues;

  if (expected !== undefined && expected !== global.total) {
    throw new Error(`Cobertura inconsistente: ${global.total}/${expected}`);
  }

  console.log("\n=== CRITERIOS ===");
  console.log("Bruto: todos los estados diferentes de Deployed");
  console.log("Operativo: estados activos reconocidos");
  console.log("Revisión: Closed, sin estado o desconocidos");
  console.log("Excluidas: Discarded y Deleted");

  console.log("\nAnálisis finalizado. No se ha modificado ningún archivo.");
}

main();
