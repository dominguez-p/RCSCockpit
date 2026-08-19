# Tarjetas adaptativas de programa

> **Estado actual:** la implementación permanece disponible en el código, pero la lectura adaptativa está temporalmente fuera de la experiencia principal de programa. Este documento describe el modelo y las reglas para su reactivación o evolución posterior.

## Objetivo

La landing de programa puede incorporar una lectura ejecutiva que selecciona y ordena tarjetas según:

- datos disponibles;
- país seleccionado;
- riesgos y bloqueos;
- estado del roadmap;
- decisiones pendientes;
- evolución de arquitectura;
- equipos y productos;
- cobertura de ambiciones RCS.

La implementación admite un máximo de seis tarjetas por defecto. El límite puede modificarse en el registro del programa mediante `adaptiveCardsLimit`.

## Tarjetas automáticas

El dashboard puede generar las siguientes tarjetas sin añadir nuevas pestañas a la spreadsheet:

| ID | Condición principal |
|---|---|
| `executive-attention` | Existen bloqueos, vencimientos o impedimentos críticos |
| `strategic-alignment` | El programa tiene elementos de roadmap |
| `delivery-health` | El programa tiene elementos de roadmap |
| `technology-evolution` | Existen sistemas, arquitectura To-Be o gaps |
| `resilience` | Hay elementos vinculados a la ambición Resiliencia |
| `decisions` | Existen decisiones pendientes o tomadas |
| `operating-model` | Existen equipos o roles |
| `program-priorities` | Existen prioridades informadas |
| `product-portfolio` | Se detecta más de un producto |

Las tarjetas reciben una prioridad dinámica. Por ejemplo, Atención ejecutiva se coloca por delante cuando existen bloqueos o vencimientos, y Cobertura de ambiciones aumenta su prioridad cuando hay elementos sin clasificar.

## Configuración opcional desde datos

La aplicación reconoce cualquiera de estas colecciones:

- `adaptiveCards`;
- `programCards`;
- `adaptive_cards`.

Cada registro puede usar las siguientes columnas:

| Campo | Uso |
|---|---|
| `programId` | Programa al que pertenece la tarjeta |
| `country` | País opcional |
| `cardId` | Identificador estable |
| `enabled` | Activa o desactiva la tarjeta |
| `priority` | Orden relativo; un valor mayor aparece antes |
| `eyebrow` | Categoría superior |
| `title` | Título |
| `metric` | Valor principal |
| `metricLabel` | Descripción del valor |
| `description` | Explicación de la tarjeta |
| `details` | Detalles separados por `|` |
| `tone` | `critical`, `warning`, `positive`, `info` o `neutral` |
| `route` | Ruta interna del dashboard |
| `actionLabel` | Texto de la acción |
| `reason` | Explicación de por qué aparece |

La ruta puede utilizar `{programId}` como variable.

## Ejemplo de tarjeta configurada

```text
programId: aixbanker
country: ES
cardId: adoption
priority: 110
eyebrow: Adopción
title: Uso activo del asistente
metric: 72%
metricLabel: gestores activos
description: Evolución de la adopción durante el último mes.
details: +8 pp frente al mes anterior|3 territorios por debajo del objetivo
tone: warning
route: roadmap/{programId}/summary/ALL/ALL/operating-model-transformation
actionLabel: Abrir plan de adopción
reason: Indicador específico configurado por AIxBanker.
```

## Sobrescribir o desactivar tarjetas automáticas

Una tarjeta configurada con el mismo `cardId` que una automática sustituye su contenido.

Ejemplo para sustituir la tarjeta de decisiones:

```text
cardId: decisions
```

Para ocultar una tarjeta automática:

```text
cardId: product-portfolio
enabled: false
```

## Reglas de funcionamiento

Cuando la lectura adaptativa está habilitada:

1. se generan las tarjetas automáticas aplicables;
2. se eliminan las que estén desactivadas desde datos;
3. las tarjetas configuradas sustituyen a las automáticas con el mismo ID;
4. se ordenan por prioridad descendente;
5. se muestran las primeras tarjetas hasta alcanzar el límite del programa;
6. al cambiar de país, la selección se vuelve a calcular.

## Compatibilidad

Los datos son opcionales. Si no existe ninguna colección de tarjetas, la implementación utiliza únicamente las señales calculadas con los datos actuales.

El módulo está aislado de `js/app.js` y de las vistas funcionales, de sistemas, arquitectura, roadmap, equipos, impedimentos y decisiones.
