# Bitácora Plus

Bitácora Plus es una plataforma para llevar el registro operativo de órdenes de trabajo y garantizar el cumplimiento de cada tarea mediante evidencia digital.

## ¿Qué problema resuelve?

Las organizaciones que gestionan trabajos en campo necesitan asegurar que cada paso se ejecute según lo planeado. Bitácora Plus centraliza la información de cada orden de trabajo, captura evidencias (fotos, PDF), geolocaliza, registra firmas y consolida todo en una línea de tiempo con panel de gestión.

## Características clave

- Registro multi-tenant con control de acceso por usuario.
- Captura de evidencias con geotag, firma y deduplicación por checksum.
- Plantillas de checklists y validación de cumplimiento antes de cerrar una tarea.
- Dashboard para seguimiento de KPIs como cumplimiento y SLA.
- Exportación a PDF y API REST (OpenAPI).

## Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <YOUR_GIT_URL>
   cd bitacora-plus
   ```
2. **Instalar dependencias**
   ```bash
   npm install
   ```
3. **Configurar variables de entorno**
   Crea un archivo `.env` con tus credenciales de Supabase.
4. **Ejecutar el entorno de desarrollo**
   ```bash
   npm run dev
   ```

## Capturas de pantalla

![Vista del dashboard](public/placeholder.svg)

## Demo y documentación

- [Demo en línea](https://lovable.dev/projects/e0802b34-adfc-496a-ae0e-230f4b7640fd)
- [Referencia de API](openapi.yaml)

## Contribución

Las contribuciones son bienvenidas. Para colaborar:

1. Haz un fork del repositorio.
2. Crea una rama con tu mejora (`git checkout -b feature/nueva-funcionalidad`).
3. Envía un pull request describiendo los cambios.

## Licencia

Este proyecto se distribuye bajo la licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.

## Contacto y redes

- Abre un [issue](../../issues) para soporte o sugerencias.
- Síguenos en X (Twitter): [@bitacoraplus](https://twitter.com/bitacoraplus)
