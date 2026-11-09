# Jira v2 — Contrato de datos

## 1. Objetivo

Definir un modelo de datos independiente de los orígenes
heredados del Cockpit, reutilizable por múltiples programas.

## 2. Entidades

### Programa

- programId: identificador estable
- name: nombre visible
- sdaIds: lista de SDA configuradas

### SDA

- id: identificador funcional SDA
- jiraId: identificador interno de Jira
- issueKey: clave E2E
- name: nombre visible

### Entregable

- id: identificador interno de Jira
- name: descripción legible normalizada
- sdaIds: SDA asociadas
- sourceField: customfield_12900

### Incidencia

- id: identificador interno Jira
- key: clave Jira
- type: tipo original
- summary: título
- status: estado original
- assignee: responsable o null
- storyPoints: número o null
- created: fecha de creación
- updated: fecha de actualización
- resolved: fecha de resolución o null
- url: enlace a Jira

### Relación

- sourceId: entidad de origen
- targetId: entidad destino
- type: tipo de relación
- jiraLinkType: tipo de enlace Jira, si existe
- source: mecanismo original de asociación
- inherited: indica si la relación se ha inferido
  a partir de una incidencia padre

## 3. Reglas

- Una incidencia se almacena una sola vez por clave Jira.
- Una incidencia puede relacionarse con varias SDA.
- Las relaciones padre-hijo son explícitas.
- Los hijos pueden heredar el contexto de SDA y entregable.
- Los identificadores originales de Jira se conservan.
- Los valores null no se convierten en cero.
- Los Story Points no se duplican al calcular totales.
- Los estados originales no se modifican.

## 4. Vista Delta

Una incidencia pertenece al Delta si:

status != "Deployed"

El filtrado se realiza en el consumidor, no durante
la extracción.

Los elementos padre se mantienen como contexto
de navegación aunque estén desplegados.

## 5. Snapshot

- schemaVersion
- programId
- generatedAt
- sdas
- deliverables
- issues
- relations
- quality

## 6. Seguridad y compatibilidad

- No almacenar información corporativa en Git.
- No almacenar credenciales ni tokens.
- El snapshot debe alojarse en una ubicación autorizada.
- Compatible con index.html abierto mediante file://.
- Los orígenes antiguos no son dependencias de Jira v2.
