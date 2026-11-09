"use strict";

const fs = require("node:fs");
const path = require("node:path");

/**
 * Jira v2 - Normalizador de incidencias.
 *
 * Compatibilidad:
 *   node jira-v2/normalizer/normalize-issues.cjs muestra
 *   node jira-v2/normalizer/normalize-issues.cjs completo
 *
 * Nuevo origen independiente, reutilizable por programa:
 *   node jira-v2/normalizer/normalize-issues.cjs descubierto aixbanker
 *   node jira-v2/normalizer/normalize-issues.cjs descubierto blue
 *
 * Los ficheros de origen y salida permanecen en jira-v2/data/local/.
 */

const MODE = process.argv[2] || "muestra";
const requestedProgramId = (process.argv[3] || "").trim().toLowerCase();

const MODES = {
  muestra: {
    input: "jira-v2-jerarquia.json",
    output: "jira-v2-normalized.json",
    legacyProgramId: "aixbanker",
  },
  completo: {
    input: "jira-v2-aixbanker-completo.json",
    output: "jira-v2-aixbanker-normalized.json",
    legacyProgramId: "aixbanker",
  },
};

if (MODE === "descubierto") {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(requestedProgramId)) {
    throw new Error(
      "Para el modo descubierto indica un programa valido. " +
        "Ejemplo: node jira-v2/normalizer/normalize-issues.cjs descubierto aixbanker",
    );
  }

  MODES.descubierto = {
    input: `jira-v2-${requestedProgramId}-descubierto-rendered.json`,
    output: `jira-v2-${requestedProgramId}-descubierto-normalized.json`,
    programId: requestedProgramId,
  };
}

if (!MODES[MODE]) {
  throw new Error("Modo no valido. Usa: muestra, completo o descubierto <programa>");
}

const dataDir = path.join(__dirname, "../data/local");
const inputPath = path.join(dataDir, MODES[MODE].input);
const outputPath = path.join(dataDir, MODES[MODE].output);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function uniqueStrings(value) {
  if (value === null || value === undefined) return [];
  const values = Array.isArray(value) ? value : [value];
  return [
    ...new Set(
      values
        .filter((v) => v !== null && v !== undefined)
        .map((v) => String(v).trim())
        .filter(Boolean),
    ),
  ];
}

function normalizeName(value) {
  if (typeof value !== "string") return null;
  const name = value.trim();
  if (!name || /<[^>]+>/.test(name)) return null;
  return name;
}

function normalizeJiraLinks(links) {
  if (!Array.isArray(links)) return [];
  return links
    .map((link) => {
      const outwardKey = link.outwardIssue?.key ?? null;
      const inwardKey = link.inwardIssue?.key ?? null;
      if (!outwardKey && !inwardKey) return null;
      return {
        id: link.id ? String(link.id) : null,
        type: link.type?.name ?? null,
        outwardLabel: link.type?.outward ?? null,
        inwardLabel: link.type?.inward ?? null,
        direction: outwardKey ? "outward" : "inward",
        linkedIssueKey: outwardKey ?? inwardKey,
      };
    })
    .filter(Boolean);
}

function normalizeIssue(issue, sdaByKey) {
  const f = issue.fields || {};
  const r = issue.renderedFields || {};

  if (!issue.id || !issue.key) {
    throw new Error("Incidencia sin ID o clave Jira");
  }

  const jiraLinks = normalizeJiraLinks(f.issuelinks);
  const taskL1ParentKeys = [
    ...new Set(
      jiraLinks
        .filter(
          (link) =>
            link.type === "Task L1 - Child" && link.direction === "outward",
        )
        .map((link) => link.linkedIssueKey),
    ),
  ];

  const deliverableJiraIds = uniqueStrings(f.customfield_12900);

  // Un enlace directo con la SDA puede existir incluso cuando
  // customfield_12323 esta vacio (caso real: SERVICEBOX-121).
  // Solo utilizamos SDA presentes en el programa configurado.
  const linkedSdaIds = jiraLinks
    .filter(
      (link) =>
        link.type === "SDA project - Feature" &&
        link.direction === "outward",
    )
    .map((link) => sdaByKey.get(link.linkedIssueKey))
    .filter(Boolean);

  return {
    id: String(issue.id),
    key: issue.key,
    type: f.issuetype?.name ?? null,
    summary: f.summary ?? null,
    status: f.status?.name ?? null,
    assignee: f.assignee?.displayName ?? null,
    storyPoints: f.customfield_10002 ?? null,
    created: f.created ?? null,
    updated: f.updated ?? null,
    resolved: f.resolutiondate ?? null,
    url:
      "https://jira.globaldevtools.bbva.com/browse/" +
      encodeURIComponent(issue.key),
    sdaJiraIds: uniqueStrings([
      ...uniqueStrings(f.customfield_12323),
      ...linkedSdaIds,
    ]),
    deliverableJiraIds,
    deliverableName:
      deliverableJiraIds.length === 1
        ? normalizeName(r.customfield_12900)
        : null,
    featureParentKey: f.customfield_10004 ?? null,
    parentKey: f.parent?.key ?? null,
    taskL1ParentKeys,
    jiraLinks,
  };
}

function validateRaw(raw) {
  if (!raw || !Array.isArray(raw.issues)) {
    throw new Error("Respuesta Jira sin issues");
  }
  if (!Number.isInteger(raw.total)) {
    throw new Error("Total Jira invalido");
  }
  if (raw.issues.length !== raw.total) {
    throw new Error(`Extraccion incompleta: ${raw.issues.length}/${raw.total}`);
  }
  if (raw.startAt !== 0) {
    throw new Error("La extraccion no comienza en startAt=0");
  }

  if (MODE === "completo" || MODE === "descubierto") {
    if (raw.extraction?.complete !== true) {
      throw new Error("La extraccion no esta marcada como completa");
    }
  }

  if (MODE === "descubierto") {
    if (raw.extraction?.programId !== requestedProgramId) {
      throw new Error("El programa del JSON no coincide con el solicitado");
    }
    if (raw.extraction?.discoveryMode !== "sda-hierarchy") {
      throw new Error("El JSON no procede del descubrimiento por SDA");
    }
    const withoutRendered = raw.issues.filter(
      (i) => !i.renderedFields || typeof i.renderedFields !== "object",
    );
    if (withoutRendered.length) {
      throw new Error(
        `Faltan renderedFields en ${withoutRendered.length} incidencias`,
      );
    }
    const unnamed = raw.issues.filter((i) => {
      const ids = uniqueStrings(i.fields?.customfield_12900);
      return ids.length === 1 &&
        !normalizeName(i.renderedFields?.customfield_12900);
    });
    if (unnamed.length) {
      throw new Error(
        `Hay ${unnamed.length} incidencias con entregable sin nombre renderizado`,
      );
    }
  }
}

function main() {
  console.log("=== JIRA V2 - NORMALIZADOR ===");
  console.log("Modo:", MODE);
  console.log("Origen:", MODES[MODE].input);

  const raw = readJson(inputPath);
  validateRaw(raw);

  // Para el nuevo origen deducimos las asociaciones directas con SDA
  // tanto del campo Jira como del enlace SDA project - Feature.
  // Los modos heredados mantienen exactamente el comportamiento previo.
  const sdaByKey = new Map();
  if (MODE === "descubierto") {
    const configuredIds = new Set(uniqueStrings(raw.extraction.sdaJiraIds));
    if (configuredIds.size === 0) {
      throw new Error("No se han declarado las SDA en la extraccion");
    }
    const sdaIssues = raw.issues.filter((issue) =>
      configuredIds.has(String(issue.id)),
    );
    if (sdaIssues.length !== configuredIds.size) {
      throw new Error("No se han recuperado todas las incidencias SDA");
    }
    for (const issue of sdaIssues) {
      if (issue.fields?.issuetype?.name !== "Enterprise") {
        throw new Error(`La SDA ${issue.key} no es de tipo Enterprise`);
      }
      sdaByKey.set(issue.key, String(issue.id));
    }
  }

  const issues = raw.issues.map((issue) => normalizeIssue(issue, sdaByKey));
  const keys = issues.map((issue) => issue.key);
  const ids = issues.map((issue) => issue.id);

  if (new Set(keys).size !== keys.length) {
    throw new Error("Claves Jira duplicadas");
  }
  if (new Set(ids).size !== ids.length) {
    throw new Error("IDs Jira duplicados");
  }

  const programId = MODE === "descubierto"
    ? requestedProgramId
    : raw.extraction?.programId || MODES[MODE].legacyProgramId;

  const snapshot = {
    schemaVersion: "0.2.0",
    programId,
    generatedAt: new Date().toISOString(),
    source: {
      file: MODES[MODE].input,
      extractedAt: raw.extraction?.extractedAt ?? null,
      total: raw.total,
      complete: true,
      discoveryMode: raw.extraction?.discoveryMode ?? null,
      sdaJiraIds: raw.extraction?.sdaJiraIds ?? null,
    },
    issues,
  };

  // Solo escribir cuando todas las comprobaciones han terminado.
  fs.writeFileSync(outputPath, JSON.stringify(snapshot, null, 2), "utf8");

  const count = (predicate) => issues.filter(predicate).length;
  const issueTypes = {};
  for (const issue of issues) {
    const type = issue.type ?? "Unknown";
    issueTypes[type] = (issueTypes[type] ?? 0) + 1;
  }

  const deliverableIds = new Set(
    issues.flatMap((i) => i.deliverableJiraIds),
  );

  console.log("\n=== RESULTADOS ===");
  console.log("Programa:", programId);
  console.log("Incidencias:", issues.length);
  console.log("Duplicados: 0");
  console.log("Tipos:", issueTypes);
  console.log("Con Feature padre:", count((i) => Boolean(i.featureParentKey)));
  console.log("Con Task L1 padre:", count((i) => i.taskL1ParentKeys.length > 0));
  console.log("Con SDA directa:", count((i) => i.sdaJiraIds.length > 0));
  console.log("Con entregable directo:", count((i) => i.deliverableJiraIds.length > 0));
  console.log("Entregables distintos:", deliverableIds.size);
  console.log("Con varias SDA:", count((i) => i.sdaJiraIds.length > 1));
  console.log("Con varios entregables:", count((i) => i.deliverableJiraIds.length > 1));
  console.log("Con Story Points:", count((i) => i.storyPoints !== null));
  console.log("Sin responsable:", count((i) => i.assignee === null));
  console.log(
    "Enlaces Jira conservados:",
    issues.reduce((total, i) => total + i.jiraLinks.length, 0),
  );
  console.log("\nArchivo generado:", outputPath);
  console.log("Normalizacion completada correctamente");
}

main();
