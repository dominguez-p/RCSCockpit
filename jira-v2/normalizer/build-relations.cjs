const fs = require("node:fs");
const path = require("node:path");

const dataDir = path.join(__dirname, "../data/local");

const inputPath = path.join(dataDir, "jira-v2-normalized.json");

const outputPath = path.join(dataDir, "jira-v2-with-relations.json");

// 1. Leer snapshot normalizado
const snapshot = JSON.parse(fs.readFileSync(inputPath, "utf8"));

if (!Array.isArray(snapshot.issues)) {
  throw new Error("Snapshot sin incidencias");
}

const issueKeys = new Set(snapshot.issues.map((issue) => issue.key));

const relations = [];
const unresolvedRelations = [];
const relationKeys = new Set();

// 2. Función común para registrar relaciones
function addRelation({ parentKey, childKey, type, jiraLinkType, source }) {
  const relationKey = `${type}:${parentKey}->${childKey}`;

  if (relationKeys.has(relationKey)) {
    return;
  }

  relationKeys.add(relationKey);

  if (!issueKeys.has(parentKey) || !issueKeys.has(childKey)) {
    unresolvedRelations.push({
      childKey,
      parentKey,
      type,
      reason: "Incidencia no incluida en el snapshot",
    });
    return;
  }

  relations.push({
    sourceId: `issue:${parentKey}`,
    targetId: `issue:${childKey}`,
    type,
    jiraLinkType,
    source,
    inherited: false,
  });
}

// 3. Relaciones Feature -> Story
for (const issue of snapshot.issues) {
  if (!issue.featureParentKey) continue;

  addRelation({
    parentKey: issue.featureParentKey,
    childKey: issue.key,
    type: "feature_child",
    jiraLinkType: null,
    source: "feature_link",
  });
}

// 4. Relaciones Task L1 -> Task L2
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

// 5. Crear resultado
const result = {
  ...snapshot,
  relations,
  quality: {
    unresolvedRelations,
    warnings: [],
  },
};

// 6. Guardar JSON
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf8");

// 7. Diagnóstico
const featureRelations = relations.filter((r) => r.type === "feature_child");

const taskRelations = relations.filter((r) => r.type === "task_child");

console.log("Incidencias:", result.issues.length);
console.log("Relaciones Feature -> Story:", featureRelations.length);
console.log("Relaciones Task L1 -> Task L2:", taskRelations.length);
console.log("Relaciones sin resolver:", unresolvedRelations.length);

console.log("Snapshot con relaciones generado correctamente");
