"use strict";

const fs = require("node:fs");
const path = require("node:path");

/**
 * Jira v2 - Generador JQL por SDA.
 *
 * Lee la configuración de un programa y genera:
 * - Una consulta de raíces para cada SDA.
 * - Una consulta conjunta del programa.
 *
 * No consulta Jira.
 * No genera archivos.
 * No modifica datos.
 */

const defaultConfig = path.join(__dirname, "../data/local/program-config.json");

const configPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : defaultConfig;

function readConfig() {
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  if (typeof config.programId !== "string" || !config.programId.trim()) {
    throw new Error("Programa sin identificador");
  }

  if (!Array.isArray(config.sdas) || config.sdas.length === 0) {
    throw new Error("Programa sin SDA configuradas");
  }

  const ids = new Set();

  for (const sda of config.sdas) {
    const jiraId = String(sda.jiraId ?? "");

    if (!/^\d+$/.test(jiraId)) {
      throw new Error(`ID Jira inválido para SDA ${sda.id}`);
    }

    if (ids.has(jiraId)) {
      throw new Error(`SDA duplicada: ${jiraId}`);
    }

    ids.add(jiraId);
  }

  return config;
}

/**
 * Genera el JQL de Features y Task L1
 * vinculadas directamente a las SDA.
 *
 * Utiliza la relación ScriptRunner
 * "is SDA project of feature", validada
 * previamente en Jira corporativo.
 */
function buildRootJql(jiraIds) {
  const ids = jiraIds.map(String);

  const selector = `id in (${ids.join(", ")})`;

  return (
    "issueFunction in linkedIssuesOf(" +
    `"${selector}", ` +
    '"is SDA project of feature"' +
    ") " +
    'AND issuetype in (Feature, "Task L1") ' +
    "ORDER BY key ASC"
  );
}

function main() {
  const config = readConfig();

  console.log("=== JIRA V2 - GENERADOR JQL ===");
  console.log("Programa:", config.programId);
  console.log("SDA:", config.sdas.length);

  for (const sda of config.sdas) {
    console.log(`\n=== SDA ${sda.id}: ${sda.name} ===`);

    console.log(buildRootJql([sda.jiraId]));
  }

  const allJiraIds = config.sdas.map((sda) => sda.jiraId);

  console.log("\n=== JQL DEL PROGRAMA ===");

  console.log(buildRootJql(allJiraIds));

  console.log("\nConsultas generadas correctamente.");

  console.log("Alcance: Features y Task L1 directas.");
}

main();
