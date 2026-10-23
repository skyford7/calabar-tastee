import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  // Expose the Supabase vars to the browser under the names Vercel uses.
  // NEVER prefix a secret with VITE_ or NEXT_PUBLIC_ — it would ship to the browser.
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  build: { outDir: "dist", emptyOutDir: true },
});
