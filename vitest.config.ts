import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          kvNamespaces: ["HONEYDEW"],
          d1Databases: ["HONEYDEWSQL"],
        },
      },
    },
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "functions/*.ts",
        "functions/database/**/*.ts",
        "functions/triggers/**/*.ts",
        "functions/telegram/**/*.ts",
        "functions/api/**/*.ts",
      ],
    },
  },
});
