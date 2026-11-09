"use strict";

const fs = require("node:fs");
const path = require("node:path");

/**
 * Jira v2 - Ensamblador de snapshot multiprograma.
 *
 * Modos anteriores (sin cambios en sus rutas):
 *   node jira-v2/normalizer/assemble-snapshot.cjs muestra
 *   node jira-v2/normalizer/assemble-snapshot.cjs completo
 *
 * Nuevo origen independiente:
 *   node jira-v2/normalizer/assemble-snapshot.cjs descubierto aixbanker
 *   node jira-v2/normalizer/assemble-snapshot.cjs descubierto blue
 *
 * En descubierto, la configuracion se lee preferentemente de:
 *   jira-v2/data/local/program-config-<programa>.json
 * Por compatibilidad con AIxBanker, tambien acepta program-config.json.
 * No consulta Jira, no modifica orígenes anteriores y escribe solo en data/local.
 */

const MODE = process.argv[2] || "muestra";
const requestedProgramId = (process.argv[3] || "").trim().toLowerCase();
const dataDir = path.join(__dirname, "../data/local");

const MODES = {
  muestra: {
    input: "jira-v2-with-relations.json",
    output: "jira-v2-snapshot.json",
  },
  completo: {
    input: "jira-v2-aixbanker-with-relations.json",
    output: "jira-v2-aixbanker-snapshot.json",
  },
};

if (MODE === "descubierto") {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(requestedProgramId)) {
    throw new Error(
      "Indica el programa. Ejemplo: " +
      "node jira-v2/normalizer/assemble-snapshot.cjs descubierto aixbanker"
    );
  }

  MODES.descubierto = {
    input: `jira-v2-${requestedProgramId}-descubierto-with-relations.json`,
    output: `jira-v2-${requestedProgramId}-descubierto-snapshot.json`,
  };
}

if (!Object.prototype.hasOwnProperty.call(MODES, MODE)) {
  throw new Error("Modo invalido: muestra, completo o descubierto <programa>");
}

const inputPath = path.join(dataDir, MODES[MODE].input);
const outputPath = path.join(dataDir, MODES[MODE].output);

function resolveConfigPath() {
  if (MODE !== "descubierto") {
    return path.join(dataDir, "program-config.json");
  }

  const specificPath = path.join(
    dataDir,
    `program-config-${requestedProgramId}.json`
  );
  if (fs.existsSync(specificPath)) return specificPath;

  if (requestedProgramId === "aixbanker") {
    const legacyPath = path.join(dataDir, "program-config.json");
    if (fs.existsSync(legacyPath)) return legacyPath;
  }

  throw new Error(
    `No existe program-config-${requestedProgramId}.json en jira-v2/data/local/`
  );
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Archivo no encontrado: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function uniqueStrings(value) {
  if (value == null) return [];
  const values = Array.isArray(value) ? value : [value];
  return [
    ...new Set(
      values
        .filter((v) => v != null)
        .map((v) => String(v).trim())
        .filter(Boolean)
    ),
  ];
}

function normalizeName(value) {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name && !/<[^>]+>/.test(name) ? name : null;
}

function validateSourceAndConfig(source, config) {
  if (!source || !Array.isArray(source.issues) || !Array.isArray(source.relations)) {
    throw new Error("Entrada invalida: faltan issues o relations");
  }
  if (!config || !config.programId || !Array.isArray(config.sdas) || !config.sdas.length) {
    throw new Error("Configuracion de programa invalida");
  }
  if (source.programId && source.programId !== config.programId) {
    throw new Error("El programa no coincide entre datos y configuracion");
  }

  if (MODE === "descubierto") {
    if (source.programId !== requestedProgramId || config.programId !== requestedProgramId) {
      throw new Error("El programa solicitado no coincide con el origen/configuracion");
    }
    if (
      source.source?.complete !== true ||
      source.source?.discoveryMode !== "sda-hierarchy"
    ) {
      throw new Error("La entrada no procede de un descubrimiento SDA completo");
    }
    if (source.issues.length !== source.source.total) {
      throw new Error("La normalizacion no contiene todas las incidencias extraidas");
    }

    const expectedSdas = new Set(uniqueStrings(source.source.sdaJiraIds));
    const configuredSdas = new Set(config.sdas.map((sda) => String(sda.jiraId)));
    if (
      expectedSdas.size !== configuredSdas.size ||
      [...expectedSdas].some((id) => !configuredSdas.has(id))
    ) {
      throw new Error("Las SDA de configuracion no coinciden con las de la extraccion");
    }
  }
}

function assembleSnapshot(source, config) {
  validateSourceAndConfig(source, config);

  const warnings = new Set(source.quality?.warnings ?? []);
  const unresolvedRelations = [...(source.quality?.unresolvedRelations ?? [])];

  // SDA configuradas, distintas por ID de programa e ID interno Jira.
  const sdas = config.sdas.map((sda) => ({
    id: String(sda.id),
    jiraId: String(sda.jiraId),
    issueKey: sda.issueKey,
    name: sda.name,
  }));
  const sdaByJiraId = new Map(sdas.map((sda) => [sda.jiraId, sda]));
  if (
    new Set(sdas.map((sda) => sda.id)).size !== sdas.length ||
    sdaByJiraId.size !== sdas.length
  ) {
    throw new Error("SDA duplicadas en la configuracion");
  }

  const issuesByKey = new Map();
  const jiraIds = new Set();
  for (const issue of source.issues) {
    if (!issue.key || !issue.id || issuesByKey.has(issue.key)) {
      throw new Error(`Incidencia duplicada o sin identificador: ${issue.key}`);
    }
    if (jiraIds.has(String(issue.id))) {
      throw new Error(`ID Jira duplicado: ${issue.id}`);
    }
    issuesByKey.set(issue.key, issue);
    jiraIds.add(String(issue.id));
  }

  // Entregables originales: los nombres proceden del campo renderizado de Jira.
  const deliverablesById = new Map();
  for (const issue of source.issues) {
    const ids = uniqueStrings(issue.deliverableJiraIds);
    for (const id of ids) {
      if (!deliverablesById.has(id)) {
        deliverablesById.set(id, {
          id,
          name: null,
          sdaIds: [],
          sourceField: "customfield_12900",
        });
      }
    }

    // El nombre no se atribuye arbitrariamente si Jira informa varios entregables.
    if (ids.length !== 1) continue;
    const name = normalizeName(issue.deliverableName);
    if (!name) continue;
    const deliverable = deliverablesById.get(ids[0]);
    if (!deliverable.name) {
      deliverable.name = name;
    } else if (deliverable.name !== name) {
      warnings.add(`Nombres diferentes para entregable ${ids[0]}`);
    }
  }

  const nodeIds = new Set([
    ...sdas.map((sda) => `sda:${sda.id}`),
    ...Array.from(deliverablesById.keys(), (id) => `deliverable:${id}`),
    ...Array.from(issuesByKey.keys(), (key) => `issue:${key}`),
  ]);
  const relations = [];
  const relationKeys = new Set();

  function addRelation(relation) {
    const id = `${relation.type}|${relation.sourceId}|${relation.targetId}`;
    if (relationKeys.has(id)) return;
    if (!nodeIds.has(relation.sourceId) || !nodeIds.has(relation.targetId)) {
      unresolvedRelations.push({
        type: relation.type,
        sourceId: relation.sourceId,
        targetId: relation.targetId,
        reason: "Nodo no disponible en el snapshot",
      });
      return;
    }
    relationKeys.add(id);
    relations.push(relation);
  }

  // Conservar las relaciones originales Feature, Task L1 y subtareas.
  for (const relation of source.relations) addRelation(relation);

  // Anclar los elementos al grafo de SDA y entregables.
  for (const issue of source.issues) {
    const relevantSdas = uniqueStrings(issue.sdaJiraIds)
      .map((id) => sdaByJiraId.get(id))
      .filter(Boolean);
    const deliverableIds = uniqueStrings(issue.deliverableJiraIds);

    for (const deliverableId of deliverableIds) {
      const deliverable = deliverablesById.get(deliverableId);
      addRelation({
        sourceId: `deliverable:${deliverableId}`,
        targetId: `issue:${issue.key}`,
        type: "deliverable_issue",
        jiraLinkType: null,
        source: "jira_deliverable",
        inherited: false,
      });

      for (const sda of relevantSdas) {
        if (!deliverable.sdaIds.includes(sda.id)) deliverable.sdaIds.push(sda.id);
        addRelation({
          sourceId: `sda:${sda.id}`,
          targetId: `deliverable:${deliverableId}`,
          type: "sda_deliverable",
          jiraLinkType: null,
          source: "jira_customfields",
          inherited: false,
        });
      }
    }

    // Importante para SERVICEBOX-121: raiz directa sin Feature ni entregable.
    if (deliverableIds.length === 0) {
      for (const sda of relevantSdas) {
        if (issue.key === sda.issueKey) continue;
        addRelation({
          sourceId: `sda:${sda.id}`,
          targetId: `issue:${issue.key}`,
          type: "sda_issue",
          jiraLinkType: null,
          source: "jira_sda_project",
          inherited: false,
        });
      }
    }
  }

  const missingNameDeliverables = [];
  for (const deliverable of deliverablesById.values()) {
    deliverable.sdaIds.sort();
    if (!deliverable.name) {
      missingNameDeliverables.push(deliverable.id);
      warnings.add(`Nombre no resuelto: entregable ${deliverable.id}`);
    }
  }

  // Recorrido iterativo desde todas las SDA; cada incidencia cuenta una sola vez.
  const childrenByNode = new Map();
  for (const relation of relations) {
    if (!childrenByNode.has(relation.sourceId)) {
      childrenByNode.set(relation.sourceId, new Set());
    }
    childrenByNode.get(relation.sourceId).add(relation.targetId);
  }

  const reachableNodes = new Set();
  const pending = sdas.map((sda) => `sda:${sda.id}`);
  while (pending.length) {
    const node = pending.pop();
    if (reachableNodes.has(node)) continue;
    reachableNodes.add(node);
    for (const child of childrenByNode.get(node) ?? []) {
      if (!reachableNodes.has(child)) pending.push(child);
    }
  }

  const workIssues = source.issues.filter((issue) => issue.type !== "Enterprise");
  const orphanIssues = workIssues
    .filter((issue) => !reachableNodes.has(`issue:${issue.key}`))
    .map((issue) => issue.key);

  return {
    schemaVersion: "0.3.0",
    programId: config.programId,
    generatedAt: new Date().toISOString(),
    sourceGeneratedAt: source.generatedAt ?? null,
    sdas,
    deliverables: [...deliverablesById.values()],
    issues: source.issues,
    relations,
    quality: {
      unresolvedRelations,
      warnings: [...warnings],
      orphanIssues,
      missingNameDeliverables,
      stats: {
        totalIssues: source.issues.length,
        workIssues: workIssues.length,
        connectedIssues: workIssues.length - orphanIssues.length,
        disconnectedIssues: orphanIssues.length,
        totalDeliverables: deliverablesById.size,
        totalRelations: relations.length,
      },
    },
  };
}

function main() {
  const configPath = resolveConfigPath();
  const source = readJson(inputPath);
  const config = readJson(configPath);
  const snapshot = assembleSnapshot(source, config);

  // Escribir al final, tras validar. Los modos no comparten archivo de salida.
  fs.writeFileSync(outputPath, JSON.stringify(snapshot, null, 2), "utf8");

  const count = (type) =>
    snapshot.relations.filter((relation) => relation.type === type).length;

  console.log("=== JIRA V2 - SNAPSHOT ===");
  console.log("Modo:", MODE);
  console.log("Programa:", snapshot.programId);
  console.log("Configuracion:", path.basename(configPath));
  console.log("\n=== ENTIDADES ===");
  console.log("SDA:", snapshot.sdas.length);
  console.log("Entregables:", snapshot.deliverables.length);
  console.log("Incidencias:", snapshot.issues.length);
  console.log("\n=== RELACIONES ===");
  for (const type of [
    "sda_deliverable",
    "sda_issue",
    "deliverable_issue",
    "feature_child",
    "task_child",
    "parent_child",
  ]) {
    console.log(`${type}:`, count(type));
  }
  console.log("Total:", snapshot.relations.length);
  console.log("\n=== CALIDAD ===");
  console.log("Incidencias conectadas:", snapshot.quality.stats.connectedIssues);
  console.log("Incidencias sin ruta desde SDA:", snapshot.quality.stats.disconnectedIssues);
  console.log("Referencias sin resolver:", snapshot.quality.unresolvedRelations.length);
  console.log("Entregables sin nombre:", snapshot.quality.missingNameDeliverables.length);
  console.log("Advertencias:", snapshot.quality.warnings.length);
  console.log("\nArchivo:", outputPath);
  console.log("Ensamblado finalizado correctamente");
}

main();
