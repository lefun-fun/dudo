import type { LinguiConfig } from "@lingui/conf";

import { game } from "@lefun/dudo-game";
import { lefunExtractor } from "@lefun/ui/lefunExtractor";

const config: LinguiConfig = {
  locales: ["en", "fr"],
  sourceLocale: "en",
  compileNamespace: "es",
  catalogs: [
    {
      path: "<rootDir>/src/locales/{locale}/messages",
      include: ["src"],
    },
  ],
  format: "po",
  extractors: [lefunExtractor(game)],
  formatOptions: {
    lineNumbers: false,
  },
};

export default config;
