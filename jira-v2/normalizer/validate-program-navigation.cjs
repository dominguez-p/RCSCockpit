"use strict";

/**
 * Jira v2 - Validador de navegación multiprograma.
 * Uso:
 *   node jira-v2/normalizer/validate-program-navigation.cjs <ruta-snapshot.json>
 *
 * Sin argumentos conserva la ruta histórica de AIxBanker.
 * Solo lectura. No modifica snapshots ni el Cockpit.
 */

const fs = require("node:fs");
const path = require("node:path");

const defaultPath = path.join(
  __dirname,
  "../data/local/jira-v2-aixbanker-snapshot.json",
);
const snapshotPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : defaultPath;

function readSnapshot(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`No existe el snapshot: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function totalStoryPoints(issues) {
  const withPoints = issues.filter((issue) =>
    typeof issue.storyPoints === "number" &&
    Number.isFinite(issue.storyPoints),
  );
  return {
    total: withPoints.reduce((sum, issue) => sum + issue.storyPoints, 0),
    informed: withPoints.length,
    missing: issues.length - withPoints.length,
  };
}

function validateNavigation(snapshot) {
  assert(snapshot && typeof snapshot === "object", "Snapshot inválido");
  assert(typeof snapshot.programId === "string" && snapshot.programId.trim(),
    "Falta programId");

  for (const name of ["sdas", "deliverables", "issues", "relations"]) {
    assert(Array.isArray(snapshot[name]), `Colección inválida: ${name}`);
  }
  assert(snapshot.sdas.length > 0, "El programa no tiene SDA configuradas");

  const nodes = new Map();
  const children = new Map();
  const relationKeys = new Set();

  function addNode(id, entity) {
    assert(id && !id.endsWith(":"), `Identificador vacío: ${id}`);
    assert(!nodes.has(id), `Nodo duplicado: ${id}`);
    nodes.set(id, entity);
  }

  for (const sda of snapshot.sdas) addNode(`sda:${sda.id}`, sda);
  for (const d of snapshot.deliverables) addNode(`deliverable:${d.id}`, d);
  for (const issue of snapshot.issues) addNode(`issue:${issue.key}`, issue);

  for (const relation of snapshot.relations) {
    const { sourceId, targetId, type } = relation;
    assert(typeof sourceId === "string" && typeof targetId === "string" && type,
      "Relación sin identificadores o tipo");
    assert(nodes.has(sourceId) && nodes.has(targetId),
      `Relación interna inválida: ${sourceId} → ${targetId}`);
    const key = `${type}|${sourceId}|${targetId}`;
    assert(!relationKeys.has(key), `Relación duplicada: ${key}`);
    relationKeys.add(key);
    if (!children.has(sourceId)) children.set(sourceId, new Set());
    children.get(sourceId).add(targetId);
  }

  // Detecta ciclos sin depender de la profundidad de la pila de JavaScript.
  const colors = new Map();
  for (const start of nodes.keys()) {
    if (colors.get(start) === 2) continue;
    const stack = [{ id: start, iter: null }];
    while (stack.length) {
      const frame = stack[stack.length - 1];
      if (frame.iter === null) {
        assert(colors.get(frame.id) !== 1,
          `Ciclo jerárquico en ${frame.id}`);
        if (colors.get(frame.id) === 2) {
          stack.pop();
          continue;
        }
        colors.set(frame.id, 1);
        frame.iter = (children.get(frame.id) ?? new Set()).values();
      }
      const next = frame.iter.next();
      if (next.done) {
        colors.set(frame.id, 2);
        stack.pop();
      } else {
        const color = colors.get(next.value) ?? 0;
        assert(color !== 1, `Ciclo jerárquico: ${frame.id} → ${next.value}`);
        if (color === 0) stack.push({ id: next.value, iter: null });
      }
    }
  }

  function traverse(rootId) {
    const visited = new Set();
    const pending = [rootId];
    while (pending.length) {
      const node = pending.pop();
      if (visited.has(node)) continue;
      visited.add(node);
      for (const child of children.get(node) ?? []) {
        if (!visited.has(child)) pending.push(child);
      }
    }
    return visited;
  }

  const isWorkIssue = (issue) => issue.type !== "Enterprise";
  const reachableKeys = new Set();
  const sdaMembership = new Map();

  console.log("=== JIRA V2 - VALIDACIÓN DE NAVEGACIÓN ===");
  console.log("Archivo:", snapshotPath);
  console.log("Programa:", snapshot.programId);
  console.log("SDA:", snapshot.sdas.length);
  console.log("Entregables:", snapshot.deliverables.length);
  console.log("Incidencias:", snapshot.issues.length);
  console.log("Relaciones:", snapshot.relations.length);
  console.log("Ciclos: 0");

  for (const sda of snapshot.sdas) {
    const visited = traverse(`sda:${sda.id}`);
    const work = snapshot.issues.filter(
      (issue) => isWorkIssue(issue) && visited.has(`issue:${issue.key}`),
    );
    const deliverables = snapshot.deliverables.filter(
      (d) => visited.has(`deliverable:${d.id}`),
    );
    const points = totalStoryPoints(work);
    const types = {};
    for (const issue of work) {
      types[issue.type ?? "Unknown"] = (types[issue.type ?? "Unknown"] ?? 0) + 1;
      reachableKeys.add(issue.key);
      if (!sdaMembership.has(issue.key)) sdaMembership.set(issue.key, new Set());
      sdaMembership.get(issue.key).add(String(sda.id));
    }
    console.log(`\n=== SDA ${sda.id}: ${sda.name} ===`);
    console.log("Entregables:", deliverables.length);
    console.log("Incidencias únicas:", work.length);
    console.log("Features:", types.Feature ?? 0);
    console.log("Task L1:", types["Task L1"] ?? 0);
    console.log("Stories:", types.Story ?? 0);
    console.log("Task L2:", types["Task L2"] ?? 0);
    console.log("Story Points:", points.total);
    console.log("Incidencias con SP:", points.informed);
    console.log("Incidencias sin SP:", points.missing);
  }

  const workIssues = snapshot.issues.filter(isWorkIssue);
  const connected = workIssues.filter((issue) => reachableKeys.has(issue.key));
  const disconnected = workIssues.filter((issue) => !reachableKeys.has(issue.key));
  const shared = [...sdaMembership.values()].filter((ids) => ids.size > 1);
  const points = totalStoryPoints(connected);
  const noName = snapshot.deliverables.filter((d) => !d.name);
  const stats = snapshot.quality?.stats;

  if (stats) {
    assert(stats.connectedIssues === connected.length,
      `Cobertura inconsistente: calculada=${connected.length}, registrada=${stats.connectedIssues}`);
    assert(stats.disconnectedIssues === disconnected.length,
      `Desconectadas inconsistentes: calculadas=${disconnected.length}, registradas=${stats.disconnectedIssues}`);
    if (stats.totalRelations !== undefined) {
      assert(stats.totalRelations === snapshot.relations.length,
        "El total de relaciones no coincide con quality.stats");
    }
  }

  const expectedOrphans = new Set(snapshot.quality?.orphanIssues ?? []);
  const actualOrphans = new Set(disconnected.map((issue) => issue.key));
  assert(expectedOrphans.size === actualOrphans.size &&
    [...actualOrphans].every((key) => expectedOrphans.has(key)),
    "Las incidencias desconectadas no coinciden con quality.orphanIssues");

  console.log("\n=== TOTALES DEL PROGRAMA ===");
  console.log("Incidencias de trabajo:", workIssues.length);
  console.log("Incidencias navegables únicas:", connected.length);
  console.log("Incidencias desconectadas:", disconnected.length);
  console.log("Incidencias compartidas entre SDA:", shared.length);
  console.log("Story Points únicos:", points.total);
  console.log("Incidencias con SP:", points.informed);
  console.log("Incidencias sin SP:", points.missing);
  console.log("Entregables sin nombre:", noName.length);
  console.log("Referencias externas:", snapshot.quality?.unresolvedRelations?.length ?? 0);
  console.log("Advertencias registradas:", snapshot.quality?.warnings?.length ?? 0);
  if (disconnected.length) console.log("Claves desconectadas:", disconnected.map((i) => i.key));
  if (noName.length) console.log("IDs de entregables sin nombre:", noName.map((d) => d.id));

  console.log("\n=== VALIDACIÓN FINAL ===");
  console.log("Nodos válidos:", nodes.size);
  console.log("Relaciones válidas:", relationKeys.size);
  console.log("Referencias internas inválidas: 0");
  console.log("Duplicados de relaciones: 0");
  console.log("Ciclos: 0");
  console.log("Cobertura consistente: SÍ");
  console.log("Validación finalizada correctamente");
}

try {
  validateNavigation(readSnapshot(snapshotPath));
} catch (error) {
  console.error("VALIDACIÓN FALLIDA:", error.message);
  process.exitCode = 1;
}
