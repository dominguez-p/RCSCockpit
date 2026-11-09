"use strict";

/**
 * Jira v2 - Exportador reutilizable.
 *
 * Se ejecuta como Snippet desde Jira corporativo
 * con la sesión SSO iniciada.
 *
 * Configuración por ejecución:
 * - Programa
 * - Consulta JQL
 * - Modo prueba o completo
 *
 * Solo realiza peticiones GET.
 * No utiliza tokens ni credenciales almacenadas.
 */

(async function exportJiraV2() {
  const JIRA_HOST = "jira.globaldevtools.bbva.com";
  const PAGE_SIZE = 100;
  const TEST_LIMIT = 4;

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

  function requestText(message) {
    const value = window.prompt(message);

    if (value === null) {
      throw new Error("Operación cancelada");
    }

    return value.trim();
  }

  function validateProgramId(id) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
      throw new Error(
        "Identificador de programa inválido. " +
          "Usa minúsculas, números y guiones.",
      );
    }
  }

  async function fetchPage(jql, startAt, pageSize) {
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
      throw new Error(`Error HTTP ${response.status} al consultar Jira`);
    }

    const page = await response.json();

    if (
      !Array.isArray(page.issues) ||
      !Number.isInteger(page.total) ||
      !Number.isInteger(page.startAt)
    ) {
      throw new Error("Respuesta Jira inválida");
    }

    if (page.startAt !== startAt) {
      throw new Error("Inconsistencia en la paginación");
    }

    return page;
  }

  function downloadJson(data, fileName) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000);
  }

  try {
    if (window.location.hostname !== JIRA_HOST) {
      throw new Error("Ejecuta el script dentro de Jira corporativo.");
    }

    const programId = requestText(
      "Jira v2 - Identificador del programa\n\n" + "Ejemplo: aixbanker",
    ).toLowerCase();

    validateProgramId(programId);

    const jql = requestText(
      "Jira v2 - Consulta JQL\n\n" +
        "Introduce la consulta que identifica " +
        "las incidencias del programa.",
    );

    if (!jql) {
      throw new Error("La consulta JQL no puede estar vacía");
    }

    const fullExport = window.confirm(
      `Jira v2 - ${programId}\n\n` +
        "Aceptar: extracción completa.\n" +
        "Cancelar: prueba de 4 incidencias.",
    );

    const pageSize = fullExport ? PAGE_SIZE : 2;

    const limit = fullExport ? Infinity : TEST_LIMIT;

    const issues = [];
    let startAt = 0;
    let reportedTotal = null;

    console.log("=== JIRA V2 - EXPORTACIÓN ===");
    console.log("Programa:", programId);
    console.log("JQL:", jql);
    console.log("Modo:", fullExport ? "completo" : "prueba");

    while (issues.length < limit) {
      if (reportedTotal !== null && startAt >= reportedTotal) {
        break;
      }

      const page = await fetchPage(jql, startAt, pageSize);

      if (reportedTotal === null) {
        reportedTotal = page.total;
      } else if (reportedTotal !== page.total) {
        throw new Error("El total de Jira cambió durante la extracción");
      }

      if (page.issues.length === 0) {
        if (reportedTotal === 0) break;

        throw new Error(
          "Jira devolvió una página vacía " +
            "antes de completar la extracción",
        );
      }

      const remaining = limit - issues.length;

      issues.push(...page.issues.slice(0, remaining));

      startAt += page.issues.length;

      console.log(`Jira v2: ${issues.length}/${reportedTotal}`);
    }

    if (reportedTotal === 0) {
      throw new Error("La consulta no devolvió incidencias");
    }

    const keys = issues.map((issue) => issue.key);

    const ids = issues.map((issue) => String(issue.id));

    if (
      new Set(keys).size !== keys.length ||
      new Set(ids).size !== ids.length
    ) {
      throw new Error("Se han detectado incidencias duplicadas");
    }

    const complete = issues.length === reportedTotal;

    if (fullExport && !complete) {
      throw new Error(
        "Extracción incompleta. " + "No se descargará el fichero.",
      );
    }

    const output = {
      startAt: 0,
      maxResults: issues.length,
      total: reportedTotal,
      issues,
      extraction: {
        programId,
        source: "jira-rest-api",
        jql,
        extractedAt: new Date().toISOString(),
        complete,
      },
    };

    const suffix = complete ? "completo" : "test";

    const fileName = `jira-v2-${programId}-${suffix}.json`;

    downloadJson(output, fileName);

    console.log("=== EXTRACCIÓN FINALIZADA ===");

    console.log("Programa:", programId);
    console.log("Total Jira:", reportedTotal);
    console.log("Recuperadas:", issues.length);
    console.log("Completa:", complete);
    console.log("Duplicados: 0");
    console.log("Archivo:", fileName);
  } catch (error) {
    console.error("Error en exportación Jira v2:", error);
  }
})();
