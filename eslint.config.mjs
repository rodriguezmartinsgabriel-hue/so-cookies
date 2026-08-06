import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Parâmetros intencionalmente não usados (métodos de interface com assinatura fixa)
  // seguem a convenção de prefixo "_".
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "dump-xlsx.cjs",
    // Código gerado automaticamente pelo Prisma (regerado a cada `prisma generate`)
    "**/generated/**",
    // Artefatos de backup/debug mantidos fora do versionamento
    "backups/**",
  ]),
]);

export default eslintConfig;
