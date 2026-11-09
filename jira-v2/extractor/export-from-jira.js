"use strict";

/**
 * Jira v2 — Exportador desde navegador corporativo.
 *
 * Ejecutar en una pestaña de Jira con SSO activo.
 * Solo realiza consultas GET y descarga JSON local.
 * No modifica incidencias ni envía datos a terceros.
 */

(async function exportJiraV2() {
  const JIRA_HOST = "jira.globaldevtools.bbva.com";
  const FILTER_ID = 414622;
  const PAGE_SIZE = 100;

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

  if (window.location.hostname !== JIRA_HOST) {
    console.error("Abre primero Jira corporativo con SSO.");
    return;
  }

  const fullExport = window.confirm(
    "Jira v2\n\n" +
      "Aceptar: exportar todas las incidencias.\n" +
      "Cancelar: prueba de 4 incidencias.",
  );

  const pageSize = fullExport ? PAGE_SIZE : 2;
  const limit = fullExport ? Infinity : 4;
  const jql = `filter = ${FILTER_ID} ORDER BY key ASC`;

  const issues = [];
  let startAt = 0;
  let reportedTotal = null;

  try {
    while (issues.length < limit) {
      if (reportedTotal !== null && startAt >= reportedTotal) {
        break;
      }

      const params = new URLSearchParams({
        jql,
        startAt: String(startAt),
        maxResults: String(pageSize),
        expand: "renderedFields",
        fields: FIELDS.join(","),
      });

      const response = await fetch(`/rest/api/2/search?${params.toString()}`, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Jira HTTP ${response.status}`);
      }

      const page = await response.json();

      if (!Array.isArray(page.issues) || !Number.isInteger(page.total)) {
        throw new Error("Respuesta Jira inválida");
      }

      if (reportedTotal === null) {
        reportedTotal = page.total;
      } else if (reportedTotal !== page.total) {
        throw new Error("El total de Jira cambió durante la extracción");
      }

      if (page.startAt !== startAt) {
        throw new Error("Paginación inconsistente");
      }

      if (page.issues.length === 0) {
        throw new Error("Jira devolvió una página vacía antes del final");
      }

      const remaining = limit - issues.length;

      issues.push(...page.issues.slice(0, remaining));

      startAt += page.issues.length;

      console.log(`Jira v2: ${issues.length}/${reportedTotal}`);
    }

    const keys = issues.map((issue) => issue.key);

    if (new Set(keys).size !== keys.length) {
      throw new Error("Incidencias duplicadas");
    }

    const complete = issues.length === reportedTotal;

    if (fullExport && !complete) {
      throw new Error("Extracción incompleta. No se generará el archivo.");
    }

    const output = {
      startAt: 0,
      maxResults: issues.length,
      total: reportedTotal,
      issues,
      extraction: {
        programId: "aixbanker",
        source: "jira-rest-api",
        filterId: FILTER_ID,
        extractedAt: new Date().toISOString(),
        complete,
      },
    };

    const blob = new Blob([JSON.stringify(output, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = complete
      ? "jira-v2-aixbanker-completo.json"
      : "jira-v2-aixbanker-test.json";

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000);

    console.log("=== EXTRACCIÓN FINALIZADA ===");
    console.log("Total Jira:", reportedTotal);
    console.log("Recuperadas:", issues.length);
    console.log("Completa:", complete);
    console.log("Claves duplicadas: 0");
  } catch (error) {
    console.error("Error en exportación Jira v2:", error);
  }
})();
