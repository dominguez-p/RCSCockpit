"use strict";

const fs = require("node:fs");
const path = require("node:path");

const snapshotPath = path.join(
  __dirname,
  "../data/local/jira-v2-snapshot.json",
);

function readSnapshot() {
  return JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
}

function validateNavigation(snapshot) {
  for (const collection of ["sdas", "deliverables", "issues", "relations"]) {
    if (!Array.isArray(snapshot[collection])) {
      throw new Error(`Colección inválida: ${collection}`);
    }
  }

  const sdas = new Map(snapshot.sdas.map((sda) => [`sda:${sda.id}`, sda]));

  const deliverables = new Map(
    snapshot.deliverables.map((d) => [`deliverable:${d.id}`, d]),
  );

  const issues = new Map(
    snapshot.issues.map((issue) => [`issue:${issue.key}`, issue]),
  );

  const nodes = new Map([...sdas, ...deliverables, ...issues]);

  const children = new Map();
  const relationIds = new Set();
  const errors = [];

  // Validar las referencias y evitar relaciones duplicadas.
  for (const relation of snapshot.relations) {
    const id = [relation.sourceId, relation.targetId, relation.type].join("|");

    if (relationIds.has(id)) {
      errors.push(`Relación duplicada: ${id}`);
      continue;
    }

    relationIds.add(id);

    if (!nodes.has(relation.sourceId)) {
      errors.push(`Origen inexistente: ${relation.sourceId}`);
    }

    if (!nodes.has(relation.targetId)) {
      errors.push(`Destino inexistente: ${relation.targetId}`);
    }

    if (!children.has(relation.sourceId)) {
      children.set(relation.sourceId, []);
    }

    children.get(relation.sourceId).push(relation.targetId);
  }

  if (errors.length) {
    throw new Error(errors.join("\n"));
  }

  const reachableIssues = new Set();

  function renderNode(nodeId, depth, pathNodes) {
    if (pathNodes.has(nodeId)) {
      throw new Error(`Ciclo detectado: ${nodeId}`);
    }

    const nextPath = new Set(pathNodes);
    nextPath.add(nodeId);

    const indent = "  ".repeat(depth);

    if (deliverables.has(nodeId)) {
      const d = deliverables.get(nodeId);

      console.log(`${indent}Entregable ${d.id}: ${d.name ?? "(sin nombre)"}`);
    }

    if (issues.has(nodeId)) {
      const issue = issues.get(nodeId);

      reachableIssues.add(issue.key);

      console.log(
        `${indent}${issue.key} [${issue.type}]` +
          ` | ${issue.status}` +
          ` | SP: ${issue.storyPoints ?? "—"}` +
          ` | Asignado: ${issue.assignee ?? "Sin asignar"}`,
      );
    }

    for (const childId of children.get(nodeId) ?? []) {
      renderNode(childId, depth + 1, nextPath);
    }
  }

  console.log("\n=== NAVEGACIÓN JIRA V2 ===");
  console.log("Programa:", snapshot.programId);

  for (const [sdaId, sda] of sdas) {
    console.log(`\nSDA ${sda.id} — ${sda.name}`);

    const childIds = children.get(sdaId) ?? [];

    if (!childIds.length) {
      console.log("  Sin entregables en esta muestra");
    }

    for (const childId of childIds) {
      renderNode(childId, 1, new Set([sdaId]));
    }
  }

  const workIssues = [...issues.values()].filter((issue) =>
    reachableIssues.has(issue.key),
  );

  const delta = workIssues.filter((issue) => issue.status !== "Deployed");

  const deltaPoints = delta.reduce(
    (total, issue) =>
      total + (typeof issue.storyPoints === "number" ? issue.storyPoints : 0),
    0,
  );

  // Las SDA Enterprise no forman parte del trabajo
  // pendiente ni se cuentan como incidencias huérfanas.
  const disconnected = [...issues.values()].filter(
    (issue) => issue.type !== "Enterprise" && !reachableIssues.has(issue.key),
  );

  console.log("\n=== VALIDACIÓN ===");
  console.log("Relaciones:", snapshot.relations.length);
  console.log("Incidencias navegables:", workIssues.length);
  console.log("Incidencias desconectadas:", disconnected.length);

  console.log("\n=== DELTA BRUTO ===");
  console.log("Criterio: status != Deployed");
  console.log("Incidencias:", delta.length);
  console.log("Story Points:", deltaPoints);

  for (const issue of delta) {
    console.log(
      `- ${issue.key}: ${issue.status}` +
        ` (${issue.storyPoints ?? "sin SP"} SP)`,
    );
  }

  console.log("\nNota: el Delta bruto incluye estados como Discarded.");

  if (disconnected.length > 0) {
    console.log(
      "Desconectadas:",
      disconnected.map((issue) => issue.key).join(", "),
    );
  }

  console.log("\nValidación finalizada correctamente");
}

validateNavigation(readSnapshot());
