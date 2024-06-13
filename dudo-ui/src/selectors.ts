import { MatchState } from "@lefun/ui";
import { DudoBoard, DudoPlayerboard } from "dudo-game";

type State = MatchState<DudoBoard, DudoPlayerboard>;

export const iHaveRolledSelector = (state: State) => {
  const player = state.board.players[state.userId];
  if (!player) {
    return false;
  }
  return player.hasRolled;
};

export const iAmAliveSelector = (state: State) => {
  const player = state.board.players[state.userId];
  if (!player) {
    return false;
  }
  return player.isAlive;
};
