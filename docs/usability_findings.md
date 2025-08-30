| id | title | severity | area | persona | steps_to_reproduce | screens | proposed_fix | owner | ETA | status |
|----|-------|----------|------|---------|--------------------|---------|--------------|-------|-----|--------|
| F1 | Toasts no anunciados por lectores | critical | accesibilidad | Todos | Activar acciones que muestran toast | ./screens/toast.png | Añadir `aria-live="polite"` y `role="status"` | Dev | 1d | fixed |
| F2 | CTA principal no visible en móvil | critical | móvil | Owner | Abrir Task en teléfono | ./screens/sticky-cta.png | Barra fija inferior con botón Cerrar Task | Dev | 1d | fixed |
| F3 | Galería carga imágenes sin lazy load | critical | rendimiento | Editor | Ver Task con muchas fotos | ./screens/gallery.png | Lazy load y paginación 25 ítems | Dev | 2d | fixed |
| F4 | Estados vacíos inconsistentes | high | diseño | Viewer | Visitar vistas sin datos | ./screens/empty.png | Componente de estados vacíos reutilizable | UX | 3d | pending |
| F5 | Checklist sin indicador de foco | med | accesibilidad | Editor | Navegar checklist con teclado | ./screens/checklist.png | Estilos de foco visibles | Dev | 2d | pending |
| F6 | Mensaje genérico al fallar cierre | high | guardrails | Owner | Intentar cerrar sin requisitos | ./screens/close-error.png | Mensaje con requisitos faltantes y links | Dev | 3d | pending |
| F7 | KPIs poco claros en Dashboard | med | heurísticas | Viewer | Revisar Dashboard | ./screens/dashboard-kpi.png | Tooltips con definiciones | UX | 2d | pending |
| F8 | API `/openapi.yaml` difícil de encontrar | low | API | Owner | Buscar documentación API | ./screens/api-docs.png | Link visible en menú de ayuda | Dev | 1d | pending |
| F9 | Error al subir evidencia no ofrece reintento | med | errores | Editor | Subir archivo y fallar | ./screens/upload-error.png | Botón de reintento en toast | Dev | 2d | pending |
| F10| Exportar PDF sin feedback | low | feedback | Viewer | Exportar PDF | ./screens/pdf-export.png | Toast de confirmación y descarga clara | Dev | 1d | pending |
