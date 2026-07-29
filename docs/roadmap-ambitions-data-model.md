# Trazabilidad entre Roadmap y Ambiciones RCS

## Objetivo

Cada elemento de `roadmap_items` puede contribuir a una ambición principal y a varias ambiciones secundarias. La asociación se utiliza para:

- calcular la cobertura estratégica del roadmap;
- filtrar Resumen, Cronograma y Backlog por ambición;
- mostrar las ambiciones relacionadas en las tarjetas;
- presentar contribución esperada, resultado y evidencia en el detalle.

## Columnas que deben añadirse a `roadmap_items`

| Columna | Obligatoria | Formato | Uso |
|---|---:|---|---|
| `primaryAmbition` | No | ID de ambición | Ambición principal del elemento. |
| `secondaryAmbitions` | No | IDs separados por `\|` | Ambiciones secundarias. |
| `expectedContribution` | No | Texto | Cómo contribuye el elemento a la ambición. |
| `strategicOutcome` | No | Texto | Resultado estratégico esperado o conseguido. |
| `evidence` | No | Texto | Evidencia verificable de la contribución. |

Un elemento sin `primaryAmbition` ni `secondaryAmbitions` se considera **sin ambición asignada**.

## IDs válidos

| Orden | ID | Ambición |
|---:|---|---|
| 1 | `execution` | Ejecución de soluciones de negocio |
| 2 | `technology-transformation` | Transformación tecnológica y estrategia de sistemas |
| 3 | `operating-model-transformation` | Transformación del modelo operativo |
| 4 | `resilience` | Resiliencia |
| 5 | `productivity` | Productividad |
| 6 | `mexico-extension` | Extensión a México |
| 7 | `tl-cio` | TL como CIO |
| 8 | `culture-talent` | Cultura y talento |

Se recomienda utilizar siempre los IDs. La aplicación también reconoce el número y el nombre de la ambición para facilitar la transición, pero los IDs son más estables.

## Ejemplo

| id | type | name | primaryAmbition | secondaryAmbitions | expectedContribution | strategicOutcome | evidence |
|---|---|---|---|---|---|---|---|
| `BB-PROJ-001` | `project` | Nuevo onboarding de clientes | `execution` | `productivity\|technology-transformation` | Reducir el tiempo de puesta en producción y reutilizar capacidades comunes. | Onboarding homogéneo y con menor coste operativo. | Reducción del ciclo de entrega y retirada de componentes duplicados. |
| `BB-MSA-004` | `msa` | MSA de observabilidad | `resilience` | `technology-transformation` | Incorporar observabilidad y reliability desde el diseño. | Cobertura de observabilidad en los componentes críticos. | Cuadro de mando operativo activo y alertas integradas. |

## Reglas de calidad

1. Informar una única ambición principal.
2. Separar las ambiciones secundarias con `|`.
3. No repetir la ambición principal en `secondaryAmbitions`.
4. Utilizar evidencias observables, no declaraciones genéricas.
5. Mantener los textos cortos para que sean legibles en el dashboard.
6. Revisar periódicamente los elementos que aparecen como `Sin ambición asignada`.

## Alias admitidos

La lectura también admite, por compatibilidad, los siguientes nombres de columnas:

- `primaryAmbitionId`, `primary_ambition`, `ambition`, `ambitionId`, `rcsAmbition`;
- `secondaryAmbitionIds`, `secondary_ambitions`;
- `ambitions`, `ambitionIds`, `rcsAmbitions`;
- `ambitionContribution`, `strategicContribution`;
- `expectedOutcome`, `outcome`;
- `ambitionEvidence`, `strategicEvidence`.

El formato recomendado sigue siendo el definido en la primera tabla.
