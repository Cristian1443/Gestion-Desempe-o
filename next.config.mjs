/** @type {import('next').NextConfig} */
const nextConfig = {
  // Necesario para el build de Docker (standalone incluye solo lo que se usa
  // en runtime, sin todo node_modules).
  output: "standalone",
};

export default nextConfig;
