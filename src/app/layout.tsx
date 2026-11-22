import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vórtex Tasks - Organiza tu día, sin límites",
  description:
    "Vórtex Tasks, de Vortex Company: gestor de tareas con proyectos, prioridades P1-P4, fechas, subtareas, filtros de Hoy y Próximos 7 días, búsqueda y exportación. Gratis, sin anuncios y 100% local en tu navegador.",
  keywords: [
    "Vórtex Tasks",
    "gestor de tareas",
    "to do list",
    "organizar tareas",
    "tareas con prioridades",
    "productividad gratis",
    "sin anuncios",
  ],
  authors: [{ name: "Vortex Company" }],
  icons: {
    icon:
      "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#161616"/><circle cx="24" cy="24" r="17" fill="none" stroke="#14b8a6" stroke-width="3.5"/><path d="M24 10a14 14 0 1 1-9.9 4.1" fill="none" stroke="#2dd4bf" stroke-width="3.5" stroke-linecap="round"/><path d="M24 17a7 7 0 1 0 7 7" fill="none" stroke="#2dd4bf" stroke-width="3.5" stroke-linecap="round"/><circle cx="24" cy="24" r="3" fill="#2dd4bf"/></svg>`
      ),
  },
  openGraph: {
    title: "Vórtex Tasks - Organiza tu día, sin límites",
    description:
      "Gestor de tareas con proyectos, prioridades, fechas y subtareas. Gratis, sin anuncios y 100% local. De Vortex Company, la misma compañía de Vórtex Music.",
    siteName: "Vórtex Tasks",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0f10",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className="antialiased bg-[#0f0f10] text-[#ececf1]">{children}</body>
    </html>
  );
}
