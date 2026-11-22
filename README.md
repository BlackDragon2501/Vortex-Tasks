# Vórtex Tasks — Organiza tu día, sin límites

Gestor de tareas estilo "pro" (inspirado en Todoist), **100% local en el navegador**, de **Vortex Company** (la misma compañía de Vórtex Music, Vórtex Editor, Vórtex PDF y Vórtex Draw). Gratis y sin anuncios, sin cuentas y sin servidores.

## Características

- Bandeja de entrada + proyectos personalizados con color y contadores
- Prioridades P1–P4 con colores de bandera (rojo, naranja, azul, gris)
- Fechas límite con resaltado de vencidas y formatos en español (Hoy, Mañana, lun 25 nov)
- Subtareas con progreso (2/3)
- Filtros: **Hoy**, **Próximos 7 días**, **Prioridad P1**, **Todas**, **Completadas**
- Añadido rápido con sintaxis inteligente
- Búsqueda global, barra de progreso del día y contadores por vista
- Exportar / importar `vortex-tasks.json` (copia de seguridad)
- Todo se guarda en tu navegador (localStorage): privado por diseño

## Añadido rápido (ejemplos)

| Escribes | Resultado |
| --- | --- |
| `Enviar informe #Trabajo !p1 mañana` | Tarea "Enviar informe", proyecto Trabajo, P1, vence mañana |
| `Llamar al dentista hoy !p2` | P2 y vence hoy |
| `Comprar regalo 25/12 !p3` | P3 y vence el 25 de diciembre |
| `Idea para el blog #Ideas` | Crea el proyecto "Ideas" si no existe |

Sintaxis: `#Proyecto` · `!p1..!p4` (o `!1..!4`) · `hoy`, `mañana`, `lunes...domingo`, `25/12`.

## Stack

Next.js 16 · React 19 · Tailwind CSS 4 · TypeScript (sin backend, sin variables de entorno)

## Desarrollo local

```bash
bun install
bun run dev      # http://localhost:3000
bun run build    # build de producción
bun run lint     # eslint
```

## Despliegue en Vercel

1. Sube este repo a GitHub.
2. En Vercel: **Add New Project → Import Git Repository**.
3. Framework: Next.js (detectado automáticamente). **No requiere variables de entorno.**
4. Deploy. Vercel entregará la URL de producción para el portal.

## Marca y contacto

- Derechos Reservados © 2026 Vortex Company
- Soporte: vortexmusic.soporte.app@gmail.com
- Gratis, sin anuncios y 100% local: tus tareas nunca salen de tu navegador.
