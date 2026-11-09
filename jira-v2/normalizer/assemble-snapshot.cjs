"use strict";

const fs = require("node:fs");
const path = require("node:path");

const dataDir = path.join(__dirname, "../data/local");

const inputPath = path.join(dataDir, "jira-v2-with-relations.json");

const configPath = path.join(dataDir, "program-config.json");

const outputPath = path.join(dataDir, "jira-v2-snapshot.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function uniqueStrings(values) {
  if (!Array.isArray(values)) return [];

  return [
    ...new Set(
      values
        .filter((value) => value !== null && value !== undefined)
        .map((value) => String(value).trim())
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
  if (!config.programId || !Array.isArray(config.sdas)) {
    throw new Error("Configuración de programa inválida");
  }

  if (!Array.isArray(source.issues)) {
    throw new Error("Snapshot sin incidencias");
  }

  const sdas = config.sdas.map((sda) => ({
    id: String(sda.id),
    jiraId: String(sda.jiraId),
    issueKey: sda.issueKey,
    name: sda.name,
  }));

  const sdaByJiraId = new Map(sdas.map((sda) => [sda.jiraId, sda]));

  if (sdaByJiraId.size !== sdas.length) {
    throw new Error("IDs Jira de SDA duplicados");
  }

  const issueKeys = new Set(source.issues.map((issue) => issue.key));

  if (issueKeys.size !== source.issues.length) {
    throw new Error("Incidencias duplicadas");
  }

  const deliverablesById = new Map();
  const relations = [];
  const relationKeys = new Set();

  const warnings = [...(source.quality?.warnings ?? [])];

  function addRelation(relation) {
    const key = [relation.type, relation.sourceId, relation.targetId].join("|");

    if (relationKeys.has(key)) return;

    relationKeys.add(key);
    relations.push(relation);
  }

  // Conservar las relaciones padre-hijo ya validadas.
  for (const relation of source.relations ?? []) {
    addRelation(relation);
  }

  // Resolver las asociaciones directas con SDA y entregables.
  for (const issue of source.issues) {
    const jiraSdaIds = uniqueStrings(issue.sdaJiraIds);

    const relevantSdas = jiraSdaIds
      .map((id) => sdaByJiraId.get(id))
      .filter(Boolean);

    const deliverableIds = uniqueStrings(issue.deliverableJiraIds);

    // No asociar entregables a una SDA desconocida.
    if (deliverableIds.length > 0 && relevantSdas.length === 0) {
      warnings.push(`${issue.key}: entregable sin SDA del programa`);
      continue;
    }

    // El nombre se asigna directamente solo cuando
    // el campo contiene un único entregable.
    const deliverableName =
      deliverableIds.length === 1 ? normalizeName(issue.deliverableName) : null;

    for (const deliverableId of deliverableIds) {
      let deliverable = deliverablesById.get(deliverableId);

      if (!deliverable) {
        deliverable = {
          id: deliverableId,
          name: deliverableName,
          sdaIds: [],
          sourceField: "customfield_12900",
        };

        deliverablesById.set(deliverableId, deliverable);
      } else if (!deliverable.name && deliverableName) {
        deliverable.name = deliverableName;
      } else if (deliverableName && deliverable.name !== deliverableName) {
        warnings.push(
          `${issue.key}: nombres diferentes para entregable ${deliverableId}`,
        );
      }

      if (!deliverable.name) {
        warnings.push(
          `${issue.key}: nombre no resuelto para entregable ${deliverableId}`,
        );
      }

      // Relación Entregable -> Incidencia.
      addRelation({
        sourceId: `deliverable:${deliverableId}`,
        targetId: `issue:${issue.key}`,
        type: "deliverable_issue",
        jiraLinkType: null,
        source: "jira_deliverable",
        inherited: false,
      });

      // Relación SDA -> Entregable.
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

    // Incidencias asociadas directamente a una SDA
    // que todavía no tienen entregable.
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

  return {
    schemaVersion: "0.2.0",
    programId: config.programId,
    generatedAt: new Date().toISOString(),
    sourceGeneratedAt: source.generatedAt ?? null,
    sdas,
    deliverables: [...deliverablesById.values()],
    issues: source.issues,
    relations,
    quality: {
      unresolvedRelations: [...(source.quality?.unresolvedRelations ?? [])],
      warnings: [...new Set(warnings)],
    },
  };
}

function main() {
  const source = readJson(inputPath);
  const config = readJson(configPath);

  const snapshot = assembleSnapshot(source, config);

  fs.writeFileSync(outputPath, JSON.stringify(snapshot, null, 2), "utf8");

  console.log("Programa:", snapshot.programId);
  console.log("SDA configuradas:", snapshot.sdas.length);
  console.log("Entregables:", snapshot.deliverables.length);
  console.log("Incidencias:", snapshot.issues.length);

  const types = [
    "sda_deliverable",
    "deliverable_issue",
    "feature_child",
    "task_child",
    "sda_issue",
  ];

  for (const type of types) {
    const count = snapshot.relations.filter(
      (relation) => relation.type === type,
    ).length;

    console.log(`${type}: ${count}`);
  }

  console.log(
    "Relaciones sin resolver:",
    snapshot.quality.unresolvedRelations.length,
  );

  console.log("Advertencias:", snapshot.quality.warnings.length);

  console.log("Snapshot generado:", outputPath);
}

main();
