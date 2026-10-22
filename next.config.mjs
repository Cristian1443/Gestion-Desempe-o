/** @type {import('next').NextConfig} */
const nextConfig = {
  // Necesario para el build de Docker (standalone incluye solo lo que se usa
  // en runtime, sin todo node_modules).
  output: "standalone",
  // pdfkit lee sus fuentes (archivos .afm) del disco: no se empaqueta, se carga tal
  // cual desde node_modules.
  experimental: {
    serverComponentsExternalPackages: ["pdfkit"],
  },
};

export default nextConfig;
