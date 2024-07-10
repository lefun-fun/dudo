import { render } from "@lefun/dev-server";
import { game } from "dudo-game";

// @ts-expect-error abc
import { messages as en } from "./locales/en/messages";
// @ts-expect-error abc
import { messages as fr } from "./locales/fr/messages";

render({
  board: async () => {
    // @ts-expect-error the import is there even if TS does not see it!
    await import("./index.css");
    const { default: Board } = await import("./Board");
    return <Board />;
  },
  rules: async () => {
    // @ts-expect-error the import is there even if TS does not see it!
    await import("./index.css");
    const { default: Rules } = await import("./Rules");
    return <Rules />;
  },
  game,
  matchSettings: { startNumDice: "3" },
  messages: { en, fr },
});
