import { expect, test } from "vitest";

import type { UserId } from "@lefun/core";
import { MatchTester as MatchTesterOrig } from "@lefun/game";
import { render } from "@lefun/ui-testing";
import { bet, call, DudoBoard, DudoPlayerboard, game, roll } from "dudo-game";

import Board, { getDefaultBet, getLowestQty, getLowestValue } from "./Board";

class MatchTester extends MatchTesterOrig<DudoBoard, DudoPlayerboard> {}

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
let utils: any;
const renderForPlayer = (match: MatchTester, userId: UserId) => {
  // For some reason it's a pain to do multiple renders in the same test. This makes it
  // possible.
  if (utils) {
    utils.unmount();
  }
  utils = render(Board, match.getState(userId));
};

test("the info in the header", () => {
  const match = new MatchTester({
    gameDef: game,
    numPlayers: 4,
    matchSettings: { startNumDice: "5" },
  });

  const p0 = match.board.playerOrder[0];

  // Hard-code a winner.
  match.board.winner = p0;

  renderForPlayer(match, p0);

  expect(document.querySelector(".info")?.textContent).toEqual("You have won");
});

// TODO .each on the player we render it for
test("play a full game", () => {
  const match = new MatchTester({
    gameDef: game,
    numPlayers: 3,
    matchSettings: { startNumDice: "5" },
  });

  const [p0, p1, p2] = match.board.playerOrder;

  const r = () => {
    renderForPlayer(match, p0);
  };

  const expectBets = (b0: string, b1: string, b2: string) => {
    const selection = document.querySelectorAll(".bet");
    const bets = [0, 1, 2].map((i) => selection[i].textContent);
    expect(bets).toEqual([b0, b1, b2]);
  };

  const TK = "🤔";
  const HG = "⌛";
  const CM = "✔️";

  r();
  expectBets(TK, "", "");

  match.makeMove(p0, bet({ numDice: 99, diceValue: 2 }));

  r();
  expectBets("99", TK, "");

  match.makeMove(p1, call());

  r();
  expectBets("99", "Dudo!", "");

  match.makeMove(p2, roll());
  match.makeMove(p0, roll());

  r();
  expectBets(CM, HG, CM);

  match.makeMove(p1, roll());

  r();
  expectBets(TK, "", "");
});

test.each<[[number, number] | undefined, boolean, boolean, number]>([
  // First bet.
  [undefined, false, false, 1],
  [undefined, true, false, 1],
  [undefined, false, true, 1],
  [undefined, true, true, 1],

  // Palifico.
  [[3, 4], true, false, 4],
  [[3, 4], true, true, 3],
  [[3, 6], true, false, 4],
  [[3, 6], true, true, 4],

  // Not palifico.
  [[3, 4], false, false, 2],
  [[4, 4], false, false, 2],
  [[3, 1], false, false, 4],
])(
  "getLowestQty %s palifico=%s expected=%s",
  (
    oldBet: [number, number] | undefined,
    palifico: boolean,
    hasOneDiceLeft: boolean,
    expected: number,
  ) => {
    expect(getLowestQty({ oldBet, palifico, hasOneDiceLeft })).toEqual(
      expected,
    );
  },
);

test.each<[[number, number] | undefined, boolean, boolean, number]>([
  // First bet.
  [undefined, false, false, 2],
  [undefined, true, false, 1],
  [undefined, false, true, 2],
  [undefined, true, true, 1],

  // Palifico.
  [[3, 4], true, false, 4],
  [[3, 4], true, true, 1],
  [[3, 6], true, false, 6],
  [[3, 6], true, true, 1],

  // Not palifico.
  [[3, 4], false, false, 1],
  [[4, 4], false, false, 1],
  [[3, 1], false, false, 1],
])(
  "getLowestValue %s palifico=%s expected=%s",
  (
    oldBet: [number, number] | undefined,
    palifico: boolean,
    hasOneDiceLeft: boolean,
    expected: number,
  ) => {
    expect(getLowestValue({ oldBet, palifico, hasOneDiceLeft })).toEqual(
      expected,
    );
  },
);

test.each<[[number, number] | undefined, boolean, boolean, [number, number]]>([
  // First bet.
  [undefined, false, false, [1, 2]],
  [undefined, true, false, [1, 1]],
  [undefined, false, true, [1, 2]],
  [undefined, true, true, [1, 1]],

  // Palifico.
  [[3, 4], true, false, [3, 4]],
  [[3, 4], true, true, [3, 4]],
  [[3, 6], true, false, [3, 6]],
  [[3, 6], true, true, [3, 6]],
  [[3, 1], true, false, [3, 1]],
  [[3, 1], true, true, [3, 1]],

  // Not palifico.
  [[3, 4], false, false, [3, 4]],
  [[3, 6], false, false, [3, 6]],
  [[4, 4], false, false, [4, 4]],
  [[3, 1], false, false, [3, 1]],
])(
  "getDefaultBet %s palifico=%s",
  (
    oldBet: [number, number] | undefined,
    palifico: boolean,
    hasOneDiceLeft: boolean,
    expected: [number, number],
  ) => {
    expect(getDefaultBet({ oldBet, palifico, hasOneDiceLeft })).toEqual(
      expected,
    );
  },
);
