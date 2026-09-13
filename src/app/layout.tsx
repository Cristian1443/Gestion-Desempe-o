import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestión del Desempeño — Invest in Bogotá",
  description: "Evaluación de desempeño y seguimiento de objetivos de IIB.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
