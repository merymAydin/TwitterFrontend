import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  preview: {
    allowedHosts: [
      "salty-temple-95385-9c8c4b98b4a8.herokuapp.com",
      "twitter.software",
    ],
  },
});