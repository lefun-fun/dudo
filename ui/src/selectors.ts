import { MatchState } from "@lefun/ui";
import { DudoGameState } from "dudo-game";

type State = MatchState<DudoGameState>;

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

export const itsMyTurnSelector = (state: State) => {
  const { playerOrder, currentPlayerIndex } = state.board;
  return state.userId === playerOrder[currentPlayerIndex];
};
