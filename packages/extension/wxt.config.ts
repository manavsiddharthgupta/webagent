import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: "WebAgent",
    description: "AI browser companion — chat with any page, fill forms with your profile",
    permissions: ["activeTab", "storage"],
    action: {},
  },
});
