"use strict";

/**
 * Jira v2 - Descubrimiento automático por SDA.
 *
 * Ejecución: DevTools > Sources > Snippets, dentro de Jira corporativo
 * con la sesión SSO iniciada.
 *
 * Descubre:
 * 1. SDA configuradas.
 * 2. TODAS las incidencias vinculadas directamente a las SDA, sin filtrar tipo.
 * 3. Hijos de Features por Feature Link.
 * 4. Hijos de Task L1 por enlace Jira.
 * 5. Subtareas nativas por parent.
 *
 * No depende de Structure ni de filtros guardados.
 * Solo realiza peticiones GET. Deduplica por clave Jira.
 * No modifica incidencias.
 */

(async function discoverFromSdas() {
  const HOST = "jira.globaldevtools.bbva.com";
  const PAGE_SIZE = 100;
  const BATCH_SIZE = 25;
  const MAX_HIERARCHY_ROUNDS = 10;

  const FIELDS = [
    "summary",
    "issuetype",
    "status",
    "assignee",
    "created",
    "updated",
    "resolutiondate",
    "customfield_10002",
    "customfield_10004",
    "customfield_12323",
    "customfield_12900",
    "customfield_22302",
    "issuelinks",
    "parent",
    "subtasks",
  ];

  function ask(message) {
    const value = window.prompt(message);
    if (value === null) {
      throw new Error("Operación cancelada");
    }
    return value.trim();
  }

  function readConfiguration() {
    const programId = ask(
      "Identificador del programa:\nEjemplo: aixbanker",
    ).toLowerCase();

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(programId)) {
      throw new Error("Identificador de programa inválido");
    }

    const input = ask(
      "IDs internos de Jira de las SDA, separados por comas:\n" +
        "Ejemplo: 13127008,13248079",
    );

    const sdaIds = [
      ...new Set(
        input
          .split(/[,;\s]+/)
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ];

    if (sdaIds.length === 0 || sdaIds.some((id) => !/^\d+$/.test(id))) {
      throw new Error("Introduce al menos un ID numérico de SDA");
    }

    return { programId, sdaIds };
  }

  function batches(values, size = BATCH_SIZE) {
    const result = [];
    for (let i = 0; i < values.length; i += size) {
      result.push(values.slice(i, i + size));
    }
    return result;
  }

  const issuesByKey = new Map();
  const stages = [];
  let queryCount = 0;

  async function searchAll(jql) {
    let startAt = 0;
    let expectedTotal = null;
    const result = [];

    while (true) {
      const params = new URLSearchParams({
        jql,
        startAt: String(startAt),
        maxResults: String(PAGE_SIZE),
        fields: FIELDS.join(","),
        expand: "renderedFields",
      });

      const response = await fetch(`/rest/api/2/search?${params.toString()}`, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} en JQL: ${jql}`);
      }

      const page = await response.json();

      if (
        !Array.isArray(page.issues) ||
        !Number.isInteger(page.total) ||
        page.startAt !== startAt
      ) {
        throw new Error("Respuesta o paginación Jira inválida");
      }

      if (
        page.issues.some(
          (issue) =>
            !issue.renderedFields || typeof issue.renderedFields !== "object",
        )
      ) {
        throw new Error(
          "Jira no devolvió renderedFields. " +
            "No se generará un JSON incompleto.",
        );
      }

      if (expectedTotal === null) {
        expectedTotal = page.total;
      } else if (page.total !== expectedTotal) {
        throw new Error("El total cambió durante la paginación");
      }

      if (page.issues.length === 0 && startAt < expectedTotal) {
        throw new Error("Página vacía antes de completar la consulta");
      }

      result.push(...page.issues);
      startAt += page.issues.length;

      if (startAt >= expectedTotal) {
        break;
      }
    }

    queryCount++;
    return result;
  }

  function registerIssues(issues) {
    let added = 0;

    for (const issue of issues) {
      if (!issue.key || !issue.id || !issue.fields) {
        throw new Error("Incidencia Jira sin datos esenciales");
      }

      if (!issuesByKey.has(issue.key)) {
        issuesByKey.set(issue.key, issue);
        added++;
      } else {
        const existing = issuesByKey.get(issue.key);
        if (String(existing.id) !== String(issue.id)) {
          throw new Error(`Clave Jira inconsistente: ${issue.key}`);
        }
      }
    }

    return added;
  }

  async function executeStage(name, queries) {
    let returned = 0;
    let added = 0;
    console.log(`\n=== ${name} ===`);

    for (let i = 0; i < queries.length; i++) {
      const results = await searchAll(queries[i]);
      returned += results.length;
      added += registerIssues(results);
      console.log(
        `${name}: ${i + 1}/${queries.length} consultas, ` +
          `${issuesByKey.size} incidencias únicas`,
      );
    }

    stages.push({ name, queries: queries.length, returned, added });
    console.log("Resultados:", returned);
    console.log("Nuevas incidencias:", added);
  }

  function keysOfType(type) {
    return [...issuesByKey.values()]
      .filter((issue) => issue.fields.issuetype?.name === type)
      .map((issue) => issue.key);
  }

  function buildFeatureQueries(keys) {
    return batches(keys).map((group) => {
      const values = group.map((key) => `"${key}"`).join(", ");
      return `cf[10004] in (${values}) ORDER BY key ASC`;
    });
  }

  function buildTaskQueries(keys) {
    return batches(keys).map((group) => {
      const selection = `key in (${group.join(", ")})`;
      return (
        "issueFunction in linkedIssuesOf(" +
        `"${selection}", ` +
        '"is Task L1 parent item of"' +
        ") ORDER BY key ASC"
      );
    });
  }

  function buildSubtaskQueries(keys) {
    return batches(keys).map(
      (group) => `parent in (${group.join(", ")}) ORDER BY key ASC`,
    );
  }

  function downloadJson(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  try {
    if (location.hostname !== HOST) {
      throw new Error("Ejecuta este Snippet desde Jira corporativo");
    }

    const config = readConfiguration();
    console.log("=== JIRA V2 - DESCUBRIMIENTO AUTOMÁTICO ===");
    console.log("Programa:", config.programId);
    console.log("SDA Jira IDs:", config.sdaIds);

    // Fase 1: recuperar las SDA configuradas.
    const sdaSelector = `id in (${config.sdaIds.join(", ")})`;
    await executeStage("SDA", [sdaSelector + " ORDER BY key ASC"]);

    const knownSdaIds = new Set(
      [...issuesByKey.values()].map((issue) => String(issue.id)),
    );
    if (config.sdaIds.some((id) => !knownSdaIds.has(id))) {
      throw new Error("No se han recuperado todas las SDA");
    }

    // Fase 2: TODAS las incidencias vinculadas directamente a las SDA.
    // Importante: sin restricción de tipo; también entran Task L2 directas.
    const rootJql =
      "issueFunction in linkedIssuesOf(" +
      `"${sdaSelector}", ` +
      '"is SDA project of feature"' +
      ") ORDER BY key ASC";

    await executeStage("Raíces vinculadas a SDA", [rootJql]);

    // Fase 3: expansión iterativa para Features y Task L1 encontradas.
    const processedFeatures = new Set();
    const processedTasks = new Set();
    let hierarchyCompleted = false;

    for (let round = 1; round <= MAX_HIERARCHY_ROUNDS; round++) {
      const features = keysOfType("Feature").filter(
        (key) => !processedFeatures.has(key),
      );
      const tasks = keysOfType("Task L1").filter(
        (key) => !processedTasks.has(key),
      );

      if (features.length === 0 && tasks.length === 0) {
        hierarchyCompleted = true;
        break;
      }

      for (const key of features) processedFeatures.add(key);
      for (const key of tasks) processedTasks.add(key);

      if (features.length > 0) {
        await executeStage(
          `Hijos de Feature - ronda ${round}`,
          buildFeatureQueries(features),
        );
      }

      if (tasks.length > 0) {
        await executeStage(
          `Hijos de Task L1 - ronda ${round}`,
          buildTaskQueries(tasks),
        );
      }
    }

    if (!hierarchyCompleted) {
      const pendingFeatures = keysOfType("Feature").some(
        (key) => !processedFeatures.has(key),
      );
      const pendingTasks = keysOfType("Task L1").some(
        (key) => !processedTasks.has(key),
      );
      if (pendingFeatures || pendingTasks) {
        throw new Error("Se alcanzó el límite de expansión jerárquica");
      }
    }

    // Fase 4: subtareas nativas de todos los padres conocidos.
    const parentKeys = [...issuesByKey.values()]
      .filter((issue) => issue.fields.issuetype?.subtask !== true)
      .map((issue) => issue.key);
    await executeStage("Subtareas nativas", buildSubtaskQueries(parentKeys));

    const allIssues = [...issuesByKey.values()];
    const allIds = allIssues.map((issue) => String(issue.id));
    if (new Set(allIds).size !== allIds.length) {
      throw new Error("Se detectaron IDs Jira duplicados");
    }

    const typeCounts = {};
    for (const issue of allIssues) {
      const type = issue.fields.issuetype?.name ?? "(sin tipo)";
      typeCounts[type] = (typeCounts[type] ?? 0) + 1;
    }

    allIssues.sort((a, b) =>
      a.key.localeCompare(b.key, undefined, { numeric: true }),
    );

    const output = {
      startAt: 0,
      maxResults: allIssues.length,
      total: allIssues.length,
      issues: allIssues,
      extraction: {
        programId: config.programId,
        source: "jira-rest-api",
        discoveryMode: "sda-hierarchy",
        sdaJiraIds: config.sdaIds,
        extractedAt: new Date().toISOString(),
        complete: true,
        queryCount,
        stages,
      },
    };

    const filename = `jira-v2-${config.programId}-descubierto.json`;
    console.log("\n=== RESULTADO DEL DESCUBRIMIENTO ===");
    console.log("Incidencias únicas:", allIssues.length);
    console.log("Consultas:", queryCount);
    console.log("Tipos:");
    console.table(typeCounts);
    console.log("\n=== FASES ===");
    console.table(stages);
    downloadJson(output, filename);
    console.log("\nArchivo:", filename);
    console.log("Duplicados: 0");
    console.log("Extracción finalizada correctamente");
  } catch (error) {
    console.error("Jira v2 - Descubrimiento incompleto:", error);
    console.error("No se ha generado un JSON parcial.");
  }
})();
