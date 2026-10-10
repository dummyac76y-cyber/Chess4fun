import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Use explicit VITE overrides when provided. Otherwise default to the
  // Supabase project provisioned for Chess4fun; never inject server secrets.
  const supabaseUrl =
    env.VITE_SUPABASE_URL || "https://wzmdohwphkokbbnlpkax.supabase.co";
  const supabasePublicKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    "sb_publishable_QJKadycXocSUz7s55dY2bQ_VOTVJz1Y";

  return {
    plugins: [react(), tailwindcss()],
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabasePublicKey),
    },
    server: {
      host: "0.0.0.0",
      port: 3000,
      strictPort: true,
      hmr: { port: 3000 },
    },
  };
});
