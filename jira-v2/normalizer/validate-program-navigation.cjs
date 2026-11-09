"use strict";

const fs = require("node:fs");
const path = require("node:path");

// Jira v2 - Validación de navegación masiva.
// Solo lectura. No modifica los datos ni el Cockpit.

const snapshotPath = path.join(
  __dirname,
  "../data/local/jira-v2-aixbanker-snapshot.json",
);

function readSnapshot() {
  return JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
}

function validateNavigation(snapshot) {
  for (const name of ["sdas", "deliverables", "issues", "relations"]) {
    if (!Array.isArray(snapshot[name])) {
      throw new Error(`Colección inválida: ${name}`);
    }
  }

  const nodes = new Map();
  const children = new Map();
  const relationKeys = new Set();

  function registerNode(id, value) {
    if (nodes.has(id)) {
      throw new Error(`Nodo duplicado: ${id}`);
    }

    nodes.set(id, value);
  }

  // 1. Registrar los nodos del programa.
  for (const sda of snapshot.sdas) {
    registerNode(`sda:${sda.id}`, sda);
  }

  for (const deliverable of snapshot.deliverables) {
    registerNode(`deliverable:${deliverable.id}`, deliverable);
  }

  for (const issue of snapshot.issues) {
    registerNode(`issue:${issue.key}`, issue);
  }

  // 2. Validar y construir el grafo.
  for (const relation of snapshot.relations) {
    const { sourceId, targetId, type } = relation;

    if (!nodes.has(sourceId) || !nodes.has(targetId)) {
      throw new Error(`Relación inválida: ${sourceId} -> ${targetId}`);
    }

    const key = `${type}|${sourceId}|${targetId}`;

    if (relationKeys.has(key)) {
      throw new Error(`Relación duplicada: ${key}`);
    }

    relationKeys.add(key);

    if (!children.has(sourceId)) {
      children.set(sourceId, new Set());
    }

    children.get(sourceId).add(targetId);
  }

  // 3. Detectar ciclos jerárquicos.
  const colors = new Map();

  function detectCycle(nodeId) {
    const color = colors.get(nodeId) ?? 0;

    if (color === 1) {
      throw new Error(`Ciclo jerárquico detectado en ${nodeId}`);
    }

    if (color === 2) return;

    colors.set(nodeId, 1);

    for (const child of children.get(nodeId) ?? []) {
      detectCycle(child);
    }

    colors.set(nodeId, 2);
  }

  for (const nodeId of nodes.keys()) {
    detectCycle(nodeId);
  }

  // 4. Navegar desde una SDA.
  function traverse(rootId) {
    const visited = new Set();
    const pending = [rootId];

    while (pending.length > 0) {
      const nodeId = pending.pop();

      if (visited.has(nodeId)) continue;

      visited.add(nodeId);

      for (const child of children.get(nodeId) ?? []) {
        if (!visited.has(child)) {
          pending.push(child);
        }
      }
    }

    return visited;
  }

  function isWorkIssue(issue) {
    return issue.type !== "Enterprise";
  }

  function getStoryPoints(issues) {
    const withPoints = issues.filter((issue) =>
      Number.isFinite(issue.storyPoints),
    );

    return {
      total: withPoints.reduce((sum, issue) => sum + issue.storyPoints, 0),
      informed: withPoints.length,
      missing: issues.length - withPoints.length,
    };
  }

  const membership = new Map();
  const allReachableIssues = new Set();

  console.log("=== JIRA V2 - NAVEGACIÓN MASIVA ===");
  console.log("Programa:", snapshot.programId);
  console.log("SDA:", snapshot.sdas.length);
  console.log("Entregables:", snapshot.deliverables.length);
  console.log("Incidencias:", snapshot.issues.length);
  console.log("Relaciones:", snapshot.relations.length);
  console.log("Ciclos jerárquicos: 0");

  // 5. Analizar cada SDA por separado.
  for (const sda of snapshot.sdas) {
    const visited = traverse(`sda:${sda.id}`);

    const sdaIssues = snapshot.issues.filter(
      (issue) => isWorkIssue(issue) && visited.has(`issue:${issue.key}`),
    );

    const sdaDeliverables = snapshot.deliverables.filter((deliverable) =>
      visited.has(`deliverable:${deliverable.id}`),
    );

    const points = getStoryPoints(sdaIssues);

    for (const issue of sdaIssues) {
      allReachableIssues.add(issue.key);

      if (!membership.has(issue.key)) {
        membership.set(issue.key, new Set());
      }

      membership.get(issue.key).add(sda.id);
    }

    const typeCounts = {};
    const statusCounts = {};

    for (const issue of sdaIssues) {
      const type = issue.type ?? "Unknown";
      const status = issue.status ?? "Unknown";

      typeCounts[type] = (typeCounts[type] ?? 0) + 1;
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    }

    console.log(`\n=== SDA ${sda.id}: ${sda.name} ===`);
    console.log("Entregables:", sdaDeliverables.length);
    console.log("Incidencias únicas:", sdaIssues.length);

    console.log("Features:", typeCounts.Feature ?? 0);

    console.log("Task L1:", typeCounts["Task L1"] ?? 0);

    console.log("Stories:", typeCounts.Story ?? 0);

    console.log("Task L2:", typeCounts["Task L2"] ?? 0);

    console.log("Story Points informados:", points.total);

    console.log("Incidencias con SP:", points.informed);

    console.log("Incidencias sin SP:", points.missing);

    console.log("Estados:");
    console.table(
      Object.entries(statusCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([status, total]) => ({
          status,
          total,
        })),
    );
  }

  // 6. Calcular totales globales sin duplicados.
  const workIssues = snapshot.issues.filter(isWorkIssue);

  const connectedIssues = workIssues.filter((issue) =>
    allReachableIssues.has(issue.key),
  );

  const disconnectedIssues = workIssues.filter(
    (issue) => !allReachableIssues.has(issue.key),
  );

  const sharedIssues = [...membership.entries()].filter(
    ([, sdas]) => sdas.size > 1,
  );

  const globalPoints = getStoryPoints(connectedIssues);

  console.log("\n=== TOTALES DEL PROGRAMA ===");
  console.log("Incidencias de trabajo:", workIssues.length);
  console.log("Incidencias navegables únicas:", connectedIssues.length);

  console.log("Incidencias compartidas entre SDA:", sharedIssues.length);

  console.log("Story Points únicos informados:", globalPoints.total);

  console.log("Incidencias con SP:", globalPoints.informed);

  console.log("Incidencias sin SP:", globalPoints.missing);

  // 7. Revisar excepciones.
  console.log("\n=== EXCEPCIONES ===");

  console.log("Incidencias desconectadas:", disconnectedIssues.length);

  for (const issue of disconnectedIssues) {
    console.log({
      key: issue.key,
      type: issue.type,
      status: issue.status,
      summary: issue.summary,
      featureParentKey: issue.featureParentKey,
      parentKey: issue.parentKey,
      taskL1ParentKeys: issue.taskL1ParentKeys,
    });
  }

  const missingNames = snapshot.deliverables.filter(
    (deliverable) => !deliverable.name,
  );

  console.log("Entregables sin nombre:", missingNames.length);

  for (const deliverable of missingNames) {
    const relatedKeys = snapshot.relations
      .filter(
        (relation) =>
          relation.sourceId === `deliverable:${deliverable.id}` &&
          relation.type === "deliverable_issue",
      )
      .map((relation) => relation.targetId.replace(/^issue:/, ""));

    console.log({
      deliverableId: deliverable.id,
      sdaIds: deliverable.sdaIds,
      relatedIssues: relatedKeys,
    });
  }

  console.log(
    "Referencias externas:",
    snapshot.quality?.unresolvedRelations?.length ?? 0,
  );

  // 8. Contrastar la cobertura con el ensamblador.
  const stats = snapshot.quality?.stats;

  if (stats) {
    if (
      stats.connectedIssues !== connectedIssues.length ||
      stats.disconnectedIssues !== disconnectedIssues.length
    ) {
      throw new Error(
        "Los totales de navegación no coinciden " + "con los del ensamblador",
      );
    }
  }

  const expectedOrphans = new Set(snapshot.quality?.orphanIssues ?? []);

  const actualOrphans = new Set(disconnectedIssues.map((issue) => issue.key));

  if (
    expectedOrphans.size !== actualOrphans.size ||
    [...actualOrphans].some((key) => !expectedOrphans.has(key))
  ) {
    throw new Error("Las incidencias desconectadas no coinciden");
  }

  console.log("\n=== VALIDACIÓN FINAL ===");
  console.log("Nodos válidos:", nodes.size);
  console.log("Relaciones válidas:", relationKeys.size);
  console.log("Referencias internas inválidas: 0");
  console.log("Duplicados de relaciones: 0");
  console.log("Ciclos: 0");
  console.log("Cobertura consistente: SI");
  console.log("Validación finalizada correctamente");
}

validateNavigation(readSnapshot());
