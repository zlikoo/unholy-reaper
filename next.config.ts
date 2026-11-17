import type { NextConfig } from "next";

// Cache Components ist bewusst deaktiviert: Jede Seite hängt vom eingeloggten
// Mitglied ab und wird pro Anfrage dynamisch gerendert. Das hält den Code einfach.
const nextConfig: NextConfig = {
  devIndicators: { position: "bottom-right" },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
