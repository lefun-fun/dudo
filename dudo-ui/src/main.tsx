import "@lefun/dev-server/index.css";

import { render } from "@lefun/dev-server";
import { DudoBoard, DudoPlayerboard, game } from "dudo-game";

render<DudoBoard, DudoPlayerboard>({
  board: async () => {
    // @ts-expect-error the import is there even if TS does not see it!
    await import("./index.css");
    // @ts-expect-error the import is there even if TS does not see it!
    const { default: Board } = await import("./Board");
    return <Board />;
  },
  gameDef: game,
  matchSettings: { startNumDice: "2" },
});
