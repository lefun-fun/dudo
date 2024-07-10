import { expect, test } from "vitest";

import type { UserId } from "@lefun/core";
import { MatchTester, RandomMock } from "@lefun/game";

import { DudoGame as G, DudoGameState as GS, game, isNewBetValid } from ".";

class Match extends MatchTester<GS, G> {}

const getCurrentPlayer = (match: Match) => {
  const index = match.board.currentPlayerIndex;
  return match.board.playerOrder[index];
};

test("1st player bets", () => {
  const random = new RandomMock();
  random.next(["userId-0", "userId-1", "userId-2", "userId-3"]);

  const match = new Match({
    game,
    numPlayers: 4,
    random,
  });

  const [p0, p1, p2, p3] = match.meta.players.allIds;

  const expectedBoard: GS["B"] = {
    players: {
      [p0]: {
        isAlive: true,
        hasRolled: true,
        color: 0,
      },
      [p1]: {
        isAlive: true,
        hasRolled: true,
        color: 1,
      },
      [p2]: {
        isAlive: true,
        hasRolled: true,
        color: 2,
      },
      [p3]: {
        isAlive: true,
        hasRolled: true,
        color: 3,
      },
    },

    playerOrder: [p0, p1, p2, p3],
    currentPlayerIndex: 0,
    step: "play",
    startNumDice: 5,
    palifico: false,
    deathList: [],
  };

  expect(match.board).toEqual(expectedBoard);

  // The first player makes a bet.
  match.makeMove(p0, "bet", { numDice: 1, diceValue: 2 });

  expectedBoard.bet = [1, 2];
  expectedBoard.currentPlayerIndex = 1;
  expectedBoard.previousPlayerIndex = 0;

  expect(match.board).toEqual(expectedBoard);
});

test("someone wins", () => {
  const random = new RandomMock();
  random.next(["userId-0", "userId-1"]);
  const match = new Match({
    game,
    numPlayers: 2,
    random,
  });

  const [p0, p1] = match.board.playerOrder;

  expect(match.playerboards[p0].numDice).toEqual(5);

  for (let i = 0; i < 5; i++) {
    expect(match.board.winner).toEqual(undefined);
    expect(match.board.players[p0].isAlive).toBe(true);
    match.makeMove(p0, "bet", { numDice: 11, diceValue: 2 });
    match.makeMove(p1, "call");
    expect(match.playerboards[p0].numDice).toEqual(4 - i);
    match.makeMove(p0, "roll");
    match.makeMove(p1, "roll");
  }

  // At this point the first player has lost all his dice and the second one should be
  // the winer.
  expect(match.board.players[p0].isAlive).toBe(false);
  expect(match.board.players[p1].isAlive).toBe(true);

  expect(match.board.winner).toEqual(p1);
});

test("palifico with 3 players, no palifico with 2 players", () => {
  const random = new RandomMock();
  random.next(["userId-0", "userId-1", "userId-2"]);
  const match = new Match({
    game,
    numPlayers: 3,
    matchSettings: { startNumDice: "2" },
    random,
  });

  const [p0, p1, p2] = match.board.playerOrder;

  match.makeMove(p0, "bet", { numDice: 10, diceValue: 3 });
  match.makeMove(p1, "call");
  match.makeMove(p0, "roll");
  match.makeMove(p1, "roll");
  match.makeMove(p2, "roll");

  // 3 players left, that's a case of palifico.
  expect(match.board.palifico).toEqual(true);

  // Have him lose again.
  match.makeMove(p0, "bet", { numDice: 10, diceValue: 3 });
  match.makeMove(p1, "call");
  match.makeMove(p0, "roll");
  match.makeMove(p1, "roll");
  match.makeMove(p2, "roll");

  expect(match.board.palifico).toEqual(false);

  // Another player gets to 1 die. This time there are 2 players left so no palifico.
  match.makeMove(p1, "bet", { numDice: 10, diceValue: 3 });
  match.makeMove(p2, "call");
  match.makeMove(p1, "roll");
  match.makeMove(p2, "roll");

  expect(match.board.palifico).toEqual(false);
});

// I was some bugs depending on the order so I'm testing all of them.
test.each([
  [[0, 1, 2]],
  [[0, 2, 1]],
  [[1, 2, 0]],
  [[1, 0, 2]],
  [[2, 0, 1]],
  [[2, 1, 0]],
])(
  "next player when someone is dead (order=%s)",
  (playerOrderInt: number[]) => {
    const match = new Match({
      game,
      numPlayers: 3,
    });
    const playerOrder = playerOrderInt.map((x) => `userId-${x}`);
    match.board.playerOrder = playerOrder;

    const [p0, p1, p2] = playerOrder;

    // P1 has one die left.
    match.playerboards[p1].numDice = 1;
    match.playerboards[p1].diceValues = [2];

    // P0 bets something reasonable.
    match.makeMove(p0, "bet", { numDice: 1, diceValue: 2 });
    // P1 bets something impossible.
    match.makeMove(p1, "bet", { numDice: 99, diceValue: 2 });

    // P2 calls bullshit.
    match.makeMove(p2, "call");

    expect(match.board.step).toEqual("revealed");

    // P0 and P2 roll their dice (not P1 because he is now dead).
    match.makeMove(p0, "roll");
    match.makeMove(p2, "roll");

    // This should make the game in mode 'play'
    expect(match.board.step).toEqual("play");

    expect(match.board.previousPlayerIndex).toBe(undefined);

    // Now it should be P1's turn but he dies so next should be P2.
    expect(getCurrentPlayer(match)).toEqual(p2);
  },
);

test("state after call is ok", () => {
  const random = new RandomMock();
  random.next(["userId-0", "userId-1"]);
  // It still works with 2 dice.
  random.next([1, 1]);
  random.next([2, 2]);

  const match = new Match({
    game,
    numPlayers: 2,
    random,
  });

  const [p0, p1] = match.meta.players.allIds;

  const expectedBoard: GS["B"] = {
    players: {
      [p0]: {
        isAlive: true,
        hasRolled: true,
        color: 0,
      },
      [p1]: {
        isAlive: true,
        hasRolled: true,
        color: 1,
      },
    },
    playerOrder: [p0, p1],
    currentPlayerIndex: 0,
    step: "play",
    palifico: false,
    startNumDice: 5,
    deathList: [],
  };

  expect(match.board).toEqual(expectedBoard);

  match.makeMove(p0, "bet", { numDice: 4, diceValue: 2 });
  match.makeMove(p1, "call");

  expectedBoard.players[p0].hasRolled = false;
  expectedBoard.players[p1].hasRolled = false;
  expectedBoard.players[p0].diceValues = [1, 1];
  expectedBoard.players[p1].diceValues = [2, 2];
  expectedBoard.bet = [4, 2];
  expectedBoard.actualCount = 4;
  expectedBoard.step = "revealed";
  (expectedBoard.currentPlayerIndex = 1),
    (expectedBoard.previousPlayerIndex = 0),
    (expectedBoard.loser = p1),
    expect(match.board).toEqual(expectedBoard);
});

test.each<[[number, number] | undefined, [number, number], boolean]>([
  [[2, 2], [2, 3], true],
  [[2, 2], [2, 2], false],
  [[3, 3], [4, 2], true],
  [[3, 3], [4, 3], true],
  [[3, 3], [3, 2], false],
  [[3, 3], [2, 4], false],

  // To convert to betting wilds we use the "original" conversion.
  [[3, 3], [2, 1], true],
  [[3, 3], [1, 1], false],
  [[4, 3], [2, 1], true],
  [[4, 3], [1, 1], false],
  [[5, 3], [3, 1], true],
  [[5, 3], [2, 1], false],

  [[1, 1], [3, 3], true],
  [[1, 1], [2, 3], false],
  [[2, 1], [5, 3], true],
  [[2, 1], [4, 3], false],

  [[2, 1], [3, 1], true],
  [[3, 1], [10, 1], true],
  [[2, 1], [2, 1], false],

  // Can't start with aces.
  [undefined, [2, 1], false],
  [undefined, [2, 2], true],

  // Funny cases
  [undefined, [0, 3], false],
  [undefined, [0, 0], false],
  [undefined, [1, 7], false],
])(
  "isNewBetValid %s => %s, expected=%s",
  (
    oldBet: [number, number] | undefined,
    newBet: [number, number],
    expected: boolean,
  ) => {
    expect(
      isNewBetValid({
        oldBet,
        newBet,
        palifico: false,
        currentPlayerNumDice: 4,
      }),
    ).toEqual(expected);
  },
);

test.each<[[number, number] | undefined, [number, number], number, boolean]>([
  // numDice = 2
  [[2, 2], [2, 3], 2, false],
  [[2, 2], [3, 2], 2, true],
  [[2, 2], [2, 2], 2, false],
  [[2, 2], [3, 1], 2, false],
  [[2, 2], [10, 1], 2, false],
  [[2, 2], [10, 4], 2, false],
  [[3, 1], [4, 1], 2, true],
  [[3, 1], [4, 2], 2, false],

  // numDice = 1
  [[2, 2], [2, 3], 1, true],
  [[2, 2], [3, 2], 1, true],
  [[2, 2], [2, 2], 1, false],
  [[2, 2], [3, 1], 1, true],
  [[2, 2], [2, 1], 1, false],
  [[2, 2], [10, 1], 1, true],
  [[2, 2], [10, 4], 1, true],
  [[3, 1], [4, 1], 1, true],
  [[3, 1], [4, 2], 1, true],

  // first bet
  [undefined, [1, 1], 1, true],
  [undefined, [1, 1], 2, true],
  [undefined, [3, 5], 1, true],
  [undefined, [3, 5], 2, true],
])(
  "isNewBetValid (palifico) %s => %s, numDice=%s expected=%s",
  (
    oldBet: [number, number] | undefined,
    newBet: [number, number],
    currentPlayerNumDice: number,
    expected: boolean,
  ) => {
    expect(
      isNewBetValid({ oldBet, newBet, currentPlayerNumDice, palifico: true }),
    ).toEqual(expected);
  },
);

test("wilds don't count in palifico", () => {
  const random = new RandomMock();

  const match = new Match({
    game,
    numPlayers: 3,
    matchSettings: { startNumDice: "3" },
    random,
  });

  const [p0, p1, p2] = match.board.playerOrder;

  // p0 loses a first die.
  match.makeMove(p0, "bet", { numDice: 10, diceValue: 2 });
  match.makeMove(p1, "call");
  match.makeMove(p0, "roll");
  match.makeMove(p1, "roll");
  match.makeMove(p2, "roll");

  // p1 loses a second die.
  match.makeMove(p0, "bet", { numDice: 10, diceValue: 2 });
  match.makeMove(p1, "call");

  // Palifico round: now make sure wilds don't count in the total.
  random.next([1, 2, 3]);
  random.next([1, 2, 3]);
  random.next([1]);
  match.makeMove(p0, "roll");
  match.makeMove(p1, "roll");
  match.makeMove(p2, "roll");

  // Sanity check
  expect(match.playerboards[p0].diceValues).toEqual([1, 2, 3]);
  expect(match.playerboards[p1].diceValues).toEqual([1, 2, 3]);
  expect(match.playerboards[p2].diceValues).toEqual([1]);

  // We should be in palifico mode.
  expect(match.board.palifico).toEqual(true);

  match.makeMove(p0, "bet", { numDice: 2, diceValue: 3 });
  match.makeMove(p1, "call");

  // Since there are no wilds we should have 2 3s.
  expect(match.board.actualCount).toEqual(2);
  // Which is what p0 bet so p1 loses.
  expect(match.board.loser).toEqual(p1);
});

test("its your turn", () => {
  const match = new Match({
    game,
    numPlayers: 3,
    matchSettings: { startNumDice: "3" },
  });

  const [p0, p1, p2] = match.board.playerOrder;

  const checkItsTheirTurn = (userIds: UserId[] | UserId | "all"): void => {
    if (userIds === "all") {
      userIds = [p0, p1, p2];
    }

    if (!Array.isArray(userIds)) {
      userIds = [userIds];
    }

    match.meta.players.allIds.forEach((userId) => {
      expect(match.meta.players.byId[userId].itsYourTurn).toBe(
        (userIds as UserId[]).includes(userId),
      );
    });
  };

  checkItsTheirTurn(p0);

  match.makeMove(p0, "bet", { numDice: 10, diceValue: 2 });

  checkItsTheirTurn(p1);

  // p0 loses a die.
  match.makeMove(p1, "call");

  checkItsTheirTurn("all");

  match.makeMove(p0, "roll");
  checkItsTheirTurn([p1, p2]);
  match.makeMove(p1, "roll");
  checkItsTheirTurn(p2);
  match.makeMove(p2, "roll");

  checkItsTheirTurn(p0);

  match.makeMove(p0, "bet", { numDice: 10, diceValue: 2 });

  checkItsTheirTurn(p1);

  match.makeMove(p1, "bet", { numDice: 11, diceValue: 2 });

  checkItsTheirTurn(p2);

  // p1 loses a die
  match.makeMove(p2, "call");

  checkItsTheirTurn("all");

  match.makeMove(p2, "roll");
  checkItsTheirTurn([p0, p1]);
  match.makeMove(p0, "roll");
  checkItsTheirTurn(p1);
  match.makeMove(p1, "roll");

  checkItsTheirTurn(p1);

  match.makeMove(p1, "bet", { numDice: 10, diceValue: 2 });
  // p1 loses a die
  match.makeMove(p2, "call");
  match.makeMove(p0, "roll");
  match.makeMove(p1, "roll");
  match.makeMove(p2, "roll");

  checkItsTheirTurn(p1);

  match.makeMove(p1, "bet", { numDice: 10, diceValue: 2 });
  // p1 dies
  match.makeMove(p2, "call");
  match.makeMove(p0, "roll");
  match.makeMove(p1, "roll");
  match.makeMove(p2, "roll");

  checkItsTheirTurn(p2);

  match.makeMove(p2, "bet", { numDice: 1, diceValue: 2 });
  match.makeMove(p0, "bet", { numDice: 10, diceValue: 2 });
  // p0 loses a die
  match.makeMove(p2, "call");

  checkItsTheirTurn([p0, p2]);
  match.makeMove(p0, "roll");
  checkItsTheirTurn(p2);
  match.makeMove(p2, "roll");

  checkItsTheirTurn(p0);

  match.makeMove(p0, "bet", { numDice: 10, diceValue: 2 });
  checkItsTheirTurn(p2);
  // p0 loses its last die, p2 wins.
  match.makeMove(p2, "call");

  // The match is over!
  checkItsTheirTurn([]);
});

test.each([[2], [3], [4]])("ranks for everyone %s", (numPlayers: number) => {
  const numDice = 3;

  const match = new Match({
    game,
    numPlayers,
    matchSettings: { startNumDice: numDice.toString() },
  });

  const players = match.board.playerOrder;

  for (let i = 0; i < players.length - 1; i++) {
    const p = players[i];
    const nextP = players[i + 1];
    for (let j = 0; j < numDice; j++) {
      // The current player bids to high.
      match.makeMove(p, "bet", { numDice: 123, diceValue: 2 });
      // The next player calls Dudo.
      match.makeMove(nextP, "call");
      // All the non-dead players roll
      for (let k = i; k < players.length; k++) {
        match.makeMove(players[k], "roll");
      }
    }
  }

  expect(match.matchHasEnded).toBe(true);

  players.forEach((p, i) => {
    expect(match.meta.players.byId[p].rank).toEqual(players.length - i - 1);
    expect(match.meta.players.byId[p].score).toEqual(players.length - i - 1);
  });
});
