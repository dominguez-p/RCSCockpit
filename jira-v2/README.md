# Jira v2

Nuevo origen de datos Jira para RCSE Portfolio Cockpit.

## Objetivo

- Independiente de los orígenes heredados.
- Reutilizable por múltiples programas.
- Compatible con una o varias SDA por programa.
- Navegación SDA → Deliverable → Feature/Task L1 → Stories/Task L2 → Subtasks.
- Story Points, responsables y estados por incidencia.
- Vista Delta: incidencias con estado distinto de Deployed.
- Carga asíncrona mediante snapshots autorizados.

## Modelo

programs
sdas
deliverables
issues
relations
metadata

## Programa piloto

AIxBanker:

- Blue Buddy: SDA 54491 / E2E-336501
- Franchise Panorama: SDA 55522 / E2E-340058

## Principios

- Sin dependencias de los orígenes anteriores.
- Identificadores estables y relaciones explícitas.
- Sin duplicación de incidencias.
- Mantener valores null y estados originales de Jira.
- No incluir snapshots corporativos en Git.
- Compatible con apertura local mediante file://.
