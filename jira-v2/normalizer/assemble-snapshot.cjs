"use strict";

const fs = require("node:fs");
const path = require("node:path");

// Jira v2 - Ensamblador multiprograma.
// Modos: muestra | completo

const MODE = process.argv[2] || "muestra";

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

if (!MODES[MODE]) {
  throw new Error("Modo inválido: muestra o completo");
}

const dataDir = path.join(__dirname, "../data/local");
const inputPath = path.join(dataDir, MODES[MODE].input);
const configPath = path.join(dataDir, "program-config.json");
const outputPath = path.join(dataDir, MODES[MODE].output);

function readJson(filePath) {
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
        .filter(Boolean),
    ),
  ];
}

function normalizeName(value) {
  if (typeof value !== "string") return null;

  const name = value.trim();

  if (!name || /<[^>]+>/.test(name)) {
    return null;
  }

  return name;
}

function assembleSnapshot(source, config) {
  if (
    !config.programId ||
    !Array.isArray(config.sdas) ||
    config.sdas.length === 0
  ) {
    throw new Error("Configuración de programa inválida");
  }

  if (!Array.isArray(source.issues) || !Array.isArray(source.relations)) {
    throw new Error("Snapshot de entrada inválido");
  }

  if (source.programId && source.programId !== config.programId) {
    throw new Error("El programa no coincide");
  }

  const warnings = new Set(source.quality?.warnings ?? []);

  const unresolvedRelations = [...(source.quality?.unresolvedRelations ?? [])];

  // 1. Configuración de SDA
  const sdas = config.sdas.map((sda) => ({
    id: String(sda.id),
    jiraId: String(sda.jiraId),
    issueKey: sda.issueKey,
    name: sda.name,
  }));

  const sdaByJiraId = new Map(sdas.map((sda) => [sda.jiraId, sda]));

  if (
    new Set(sdas.map((s) => s.id)).size !== sdas.length ||
    sdaByJiraId.size !== sdas.length
  ) {
    throw new Error("SDA duplicadas en la configuración");
  }

  // 2. Índice de incidencias únicas
  const issuesByKey = new Map();

  for (const issue of source.issues) {
    if (!issue.key || issuesByKey.has(issue.key)) {
      throw new Error(`Incidencia duplicada: ${issue.key}`);
    }

    issuesByKey.set(issue.key, issue);
  }

  // 3. Identificar entregables
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

    // Solo asignamos nombre cuando hay un
    // único entregable en la incidencia.
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

  // 4. Registrar relaciones únicas
  const relations = [];
  const relationKeys = new Set();

  // CORRECCIÓN:
  // Convertir los iteradores Map.keys()
  // en arrays antes de utilizar map().
  const nodeIds = new Set([
    ...sdas.map((sda) => `sda:${sda.id}`),

    ...Array.from(deliverablesById.keys(), (id) => `deliverable:${id}`),

    ...Array.from(issuesByKey.keys(), (key) => `issue:${key}`),
  ]);

  function addRelation(relation) {
    const id = [relation.type, relation.sourceId, relation.targetId].join("|");

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

  // 5. Mantener relaciones entre incidencias
  for (const relation of source.relations) {
    addRelation(relation);
  }

  // 6. Asociar incidencias a SDA y entregables
  for (const issue of source.issues) {
    const sdaJiraIds = uniqueStrings(issue.sdaJiraIds);

    const relevantSdas = sdaJiraIds
      .map((id) => sdaByJiraId.get(id))
      .filter(Boolean);

    const deliverableIds = uniqueStrings(issue.deliverableJiraIds);

    for (const deliverableId of deliverableIds) {
      const deliverable = deliverablesById.get(deliverableId);

      // Entregable -> Incidencia
      addRelation({
        sourceId: `deliverable:${deliverableId}`,
        targetId: `issue:${issue.key}`,
        type: "deliverable_issue",
        jiraLinkType: null,
        source: "jira_deliverable",
        inherited: false,
      });

      // SDA -> Entregable
      for (const sda of relevantSdas) {
        if (!deliverable.sdaIds.includes(sda.id)) {
          deliverable.sdaIds.push(sda.id);
        }

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

    // SDA -> Incidencia sin entregable
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

  // 7. Revisar nombres de entregables
  const missingNameDeliverables = [];

  for (const deliverable of deliverablesById.values()) {
    deliverable.sdaIds.sort();

    if (!deliverable.name) {
      missingNameDeliverables.push(deliverable.id);

      warnings.add(`Nombre no resuelto: entregable ${deliverable.id}`);
    }
  }

  // 8. Construir índice de navegación
  const childrenByNode = new Map();

  for (const relation of relations) {
    if (!childrenByNode.has(relation.sourceId)) {
      childrenByNode.set(relation.sourceId, new Set());
    }

    childrenByNode.get(relation.sourceId).add(relation.targetId);
  }

  // 9. Recorrer el grafo desde cada SDA
  const reachableNodes = new Set();

  const pending = sdas.map((sda) => `sda:${sda.id}`);

  while (pending.length > 0) {
    const nodeId = pending.pop();

    if (reachableNodes.has(nodeId)) {
      continue;
    }

    reachableNodes.add(nodeId);

    for (const child of childrenByNode.get(nodeId) ?? []) {
      if (!reachableNodes.has(child)) {
        pending.push(child);
      }
    }
  }

  // 10. Medir cobertura de incidencias
  const workIssues = source.issues.filter(
    (issue) => issue.type !== "Enterprise",
  );

  const connectedIssues = workIssues.filter((issue) =>
    reachableNodes.has(`issue:${issue.key}`),
  );

  const orphanIssues = workIssues
    .filter((issue) => !reachableNodes.has(`issue:${issue.key}`))
    .map((issue) => issue.key);

  // 11. Snapshot final
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
        connectedIssues: connectedIssues.length,
        disconnectedIssues: orphanIssues.length,
        totalDeliverables: deliverablesById.size,
        totalRelations: relations.length,
      },
    },
  };
}

function main() {
  const source = readJson(inputPath);
  const config = readJson(configPath);

  const snapshot = assembleSnapshot(source, config);

  fs.writeFileSync(outputPath, JSON.stringify(snapshot, null, 2), "utf8");

  const count = (type) =>
    snapshot.relations.filter((relation) => relation.type === type).length;

  console.log("=== JIRA V2 - SNAPSHOT ===");
  console.log("Modo:", MODE);
  console.log("Programa:", snapshot.programId);

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

  console.log(
    "Incidencias conectadas:",
    snapshot.quality.stats.connectedIssues,
  );

  console.log(
    "Incidencias sin ruta desde SDA:",
    snapshot.quality.stats.disconnectedIssues,
  );

  console.log(
    "Referencias sin resolver:",
    snapshot.quality.unresolvedRelations.length,
  );

  console.log(
    "Entregables sin nombre:",
    snapshot.quality.missingNameDeliverables.length,
  );

  console.log("Advertencias:", snapshot.quality.warnings.length);

  console.log("\nArchivo:", outputPath);
  console.log("Ensamblado finalizado correctamente");
}

main();
