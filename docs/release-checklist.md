# Checklist de publicación del RCS Portfolio Cockpit

Utilizar esta lista antes de ampliar la audiencia del cockpit o promover un cambio relevante a `main`.

## 1. Acceso y seguridad

- [ ] Confirmar que la visibilidad del repositorio es la adecuada para el contenido versionado.
- [ ] Confirmar que el Web App de Apps Script del Portfolio solo es accesible por la audiencia corporativa prevista.
- [ ] Confirmar el mismo nivel de acceso para cada Web App de programa.
- [ ] Revisar los permisos de todas las spreadsheets utilizadas como origen.
- [ ] Revisar los permisos de DOR, Figma y documentación enlazada desde el cockpit.
- [ ] Verificar que no existen API keys, tokens, credenciales o secretos en HTML, JavaScript, documentación o historial reciente.
- [ ] Verificar que no existen snapshots JSON con datos operativos en el árbol del repositorio.
- [ ] Verificar que no existen copias `*_old*` usadas como backup.

## 2. Fuentes de datos

- [ ] Abrir la landing y confirmar que el Portfolio carga sin errores.
- [ ] Comprobar que cada programa habilitado devuelve `driveJsonUrl` y `spreadsheetId` válidos.
- [ ] Confirmar que **Actualizar datos** fuerza una nueva lectura del origen activo.
- [ ] Confirmar que **Abrir origen** abre la spreadsheet correcta en Portfolio y en programa.
- [ ] Validar que un fallo de acceso muestra un estado de error claro y no datos operativos antiguos.
- [ ] Revisar que las fechas de actualización mostradas son coherentes con la sesión actual.

## 3. Smoke test de navegación

### Portfolio

- [ ] Programas RCS visibles y ordenados correctamente.
- [ ] Programas deshabilitados no permiten navegación accidental.
- [ ] Ambición RCS 2026 aparece colapsada por defecto.
- [ ] El marco estratégico puede abrirse y cerrarse correctamente.

### Programa

- [ ] Entrada y vuelta al Portfolio.
- [ ] Cambio entre Holding y países disponibles.
- [ ] El contexto geográfico se conserva durante la navegación.
- [ ] Mapa funcional.
- [ ] Mapa de sistemas y relaciones.
- [ ] Arquitectura As-Is / To-Be.
- [ ] Teams.
- [ ] Impedimentos.
- [ ] Decisiones.

### AIxBanker

- [ ] Holding es la visión consolidada de todas las geografías.
- [ ] Blue Buddy abre su experiencia de producto.
- [ ] Panorama abre su experiencia de producto cuando dispone de contenido.
- [ ] Navegación Producto → Capacidad → Caso funcional.
- [ ] Roadmap del programa con todos los productos.
- [ ] Roadmap específico de producto.
- [ ] Cambio de producto desde el propio roadmap.
- [ ] Resumen.
- [ ] Cronograma.
- [ ] Backlog.
- [ ] Filtro de periodo.
- [ ] Detalle de elemento.
- [ ] Detalle de actividad.
- [ ] Botones de retorno conservan producto, país y ámbito.
- [ ] Trazabilidad estratégica aparece al final y colapsada por defecto.
- [ ] Un filtro de ambición activo mantiene visible la trazabilidad necesaria para entender el filtro.

## 4. Producto AIxBanker

- [ ] `productCatalog` contiene únicamente productos habilitados que deban mostrarse.
- [ ] `productFeatures` mantiene la jerarquía y enlaces esperados.
- [ ] Ejecutar **AIxBanker → Actualizar datos de producto** si se han modificado DOR.
- [ ] Confirmar que los DOR sin cambios no provocan escrituras innecesarias.
- [ ] Confirmar que un fallo en un DOR no produce una actualización parcial.
- [ ] Verificar manualmente los enlaces a documentos funcionales y Figma.

## 5. Calidad técnica

- [ ] Los checks del pull request están en verde.
- [ ] No hay errores JavaScript en consola durante el smoke test.
- [ ] No hay peticiones 404 de assets, CSS o JavaScript.
- [ ] No hay mensajes de datos de prueba o copy de iteraciones anteriores visibles al usuario.
- [ ] Revisar el comportamiento en Chrome y Edge corporativos.
- [ ] Revisar la experiencia en una resolución de portátil estándar y en una ventana estrecha.

## 6. Despliegue

- [ ] Pull request revisada y limitada al alcance de la publicación.
- [ ] `main` contiene únicamente cambios validados.
- [ ] `CNAME` continúa apuntando a `rcscockpit.com`.
- [ ] Dominio servido mediante HTTPS sin avisos de certificado.
- [ ] La versión publicada corresponde al último commit esperado de `main`.
- [ ] Hacer una recarga sin caché y repetir el smoke test mínimo sobre la URL publicada.

## 7. Apertura a usuarios

- [ ] Definir quién atiende incidencias y feedback durante el lanzamiento.
- [ ] Comunicar qué información es fuente de verdad y qué vistas están todavía en evolución.
- [ ] Facilitar un canal único de feedback para evitar cambios dispersos.
- [ ] Registrar los problemas detectados y priorizar correcciones pequeñas frente a refactors amplios durante los primeros días.

## Criterio de go / no-go

No publicar si falla cualquiera de estos cuatro puntos:

1. acceso corporativo o permisos de datos;
2. carga del Portfolio o del programa principal;
3. navegación crítica de AIxBanker;
4. presencia de información operativa no prevista en el repositorio o en una vista accesible para la audiencia.
