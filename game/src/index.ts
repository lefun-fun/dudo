import { GamePlayerSettings, GameSettings, UserId } from "@lefun/core";
import { Game, GameState, INIT_MOVE, PlayerMove } from "@lefun/game";

//
// Types
//

interface PlayerInfo {
  // Is the player still playing this round.
  isAlive: boolean;
  // Has the player rolled and is ready for the next turn.
  hasRolled: boolean;
  // Dice values for the player *when visible to everyone*. `undefined` during the turn
  // when the dice are hidden.
  diceValues?: number[];
  // The color index.
  color: number;
}

interface DudoBoard {
  // Options
  startNumDice: number;

  // List of all the players
  players: { [userId: string]: PlayerInfo };

  // Turns and steps.
  playerOrder: UserId[];
  currentPlayerIndex: number;
  // Last player to have bet.
  previousPlayerIndex?: number;

  step: "play" | "revealed";
  palifico: boolean;

  // When playing
  bet?: [number, number];

  // When revealing
  loser?: UserId;
  // Number of dice of the bet value in play when someone called.
  actualCount?: number;

  // Winner at the end of the game.
  winner?: UserId;
  // We'll put the userId in there as they die, in order to compute ranks at the end.
  deathList: UserId[];
}

interface DudoPlayerboard {
  // Current values for the dice.
  diceValues?: number[];
  // How many dice left this player has.
  numDice: number;
  // Are we waiting for the roll results from the server?
  isRolling: boolean;
}

export type DudoGameState = GameState<DudoBoard, DudoPlayerboard>;

const gameSettings: GameSettings = [
  {
    key: "startNumDice",
    options: [
      { value: "3" },
      { value: "4" },
      { value: "5", default: true },
      { value: "6" },
    ],
  },
];

//
// Moves
//

interface BetPayload {
  numDice: number;
  diceValue: number;
}

/*
 * Check that a bid is valid in a normal setting (not a palifico).
 */
type IsNewBetValidOptions = {
  // The current Bet.
  oldBet: [number, number] | undefined;
  // The new bet we want to validate.
  newBet: [number, number];
  // Is it a palifico round.
  palifico: boolean;
  // How many dice does the player betting has (we need it in the palifico case).
  currentPlayerNumDice: number;
};

export const isNewBetValid = ({
  oldBet,
  newBet,
  palifico,
  currentPlayerNumDice,
}: IsNewBetValidOptions): boolean => {
  const [oldQty, oldValue] = oldBet == null ? [undefined, undefined] : oldBet;
  const [newQty, newValue] = newBet;

  // Shouldn't happen but to be safe!
  if (newValue > 6 || newValue < 1 || newQty < 1) {
    return false;
  }

  // Treat the palifico case first.
  if (palifico) {
    // If it's the first bet anything goes.
    if (oldQty == null) {
      return true;
    }
    // If the current player has only one dice, he has to raise the stakes but there is
    // no other constraint.
    if (currentPlayerNumDice === 1) {
      return newQty > oldQty || (newQty === oldQty && newValue > oldValue);
    }
    // If the player has more than one die they need to raise the quantity but keep the
    // value.
    return newQty > oldQty && newValue === oldValue;
  }

  // That's it for the palifico case, now the general case, which is trickier because of
  // wilds.

  if (oldQty == null) {
    // Can't start with betting wilds.
    return newValue !== 1;
  }

  // Treat the case where we don't have ones.
  if (oldValue !== 1 && newBet[1] !== 1) {
    // We have to raise the number of dice OR raise the face if we want to keep the same
    // number.
    return newQty > oldQty || (newQty === oldQty && newBet[1] > oldValue);
  } else if (oldValue === 1 && newBet[1] !== 1) {
    // Going from wild to not wild.
    return newQty >= oldQty * 2 + 1;
  } else if (oldValue !== 1 && newBet[1] === 1) {
    //Going from not wild to wild.
    return newQty >= Math.ceil(oldQty / 2);
  } else {
    // The easiest case, going from wild to wild.
    return newQty > oldQty;
  }
};

const isCurrentPlayer = (userId: UserId, board: DudoBoard): boolean => {
  const { currentPlayerIndex, playerOrder } = board;
  return userId === playerOrder[currentPlayerIndex];
};

const incrementCurrentPlayer = (board: DudoBoard): number => {
  const { currentPlayerIndex, players, playerOrder } = board;
  let newPlayerIndex = currentPlayerIndex;
  for (;;) {
    newPlayerIndex++;
    if (newPlayerIndex >= playerOrder.length) {
      newPlayerIndex = 0;
    }

    if (players[playerOrder[newPlayerIndex]].isAlive) {
      break;
    }
  }
  board.previousPlayerIndex = currentPlayerIndex;
  board.currentPlayerIndex = newPlayerIndex;
  return newPlayerIndex;
};

const bet: PlayerMove<DudoGameState, BetPayload> = {
  canDo(options) {
    const { userId, board, playerboard, payload } = options;
    const { numDice, diceValue } = payload;

    const { palifico } = board;
    const { numDice: currentPlayerNumDice } = playerboard;

    const valid = isNewBetValid({
      oldBet: board.bet,
      newBet: [numDice, diceValue],
      palifico,
      currentPlayerNumDice,
    });
    return isCurrentPlayer(userId, board) && board.step === "play" && valid;
  },
  executeNow({ board, payload }) {
    const { numDice, diceValue } = payload;
    board.bet = [numDice, diceValue];
    incrementCurrentPlayer(board);
  },
  execute({ turns, board }) {
    turns.end("all");
    turns.begin(board.playerOrder[board.currentPlayerIndex]);
  },
};

const call: PlayerMove<DudoGameState, null> = {
  canDo(options) {
    const { userId, board } = options;

    return (
      isCurrentPlayer(userId, board) &&
      board.bet != null &&
      board.step === "play"
    );
  },
  execute({ board, playerboards, turns, endMatch, logPlayerStat }) {
    const [betQty, betValue] = board.bet!;

    const {
      playerOrder,
      previousPlayerIndex,
      currentPlayerIndex,
      players,
      palifico,
    } = board;

    // Count if we have enough dice of the right value.
    let actualCount = 0;
    Object.values(playerboards).forEach((pb) => {
      pb.diceValues!.forEach((diceValue) => {
        // "1"s are wild. This rule also works when we are betting wilds!
        if (diceValue === betValue || (!palifico && diceValue === 1)) {
          actualCount++;
        }
      });
    });

    let loser: UserId;
    // Was the previous bet lower?
    if (actualCount >= betQty) {
      // If there were enough dice matching, "caller" loses.
      loser = playerOrder[currentPlayerIndex];
    } else {
      // If there were not enough then the previous player loses.
      loser = playerOrder[previousPlayerIndex!];
    }

    // If there is only one person alive, he wins.
    let winner;
    const alivePlayers = Object.entries(players)
      .map(([userId, info]) => {
        return { userId, info };
      })
      .filter(({ userId, info }) => {
        // For the loser we will treat them as not alive if it was their last dice.
        if (userId === loser && playerboards[userId].numDice === 1) {
          return false;
        }
        return info.isAlive;
      });

    if (alivePlayers.length === 1) {
      winner = alivePlayers[0].userId;
    }

    // The losing player looses a die.
    playerboards[loser].numDice--;

    board.step = "revealed";
    board.loser = loser;
    board.winner = winner;
    board.actualCount = actualCount;

    // Copy the dice from the playerboards to the board.
    for (const [userId, playerboard] of Object.entries(playerboards)) {
      board.players[userId].diceValues = playerboard.diceValues;
    }

    if (playerboards[loser].numDice === 0) {
      board.players[loser].isAlive = false;
      board.deathList.push(loser);
    }

    Object.values(board.players).forEach((info) => {
      info.hasRolled = false;
    });

    // The turn is over, all the people alive must roll.
    turns.end("all");
    turns.begin(alivePlayers.map((p) => p.userId));

    if (winner != null) {
      const scores: Record<UserId, number> = {};
      scores[winner] = 0;
      board.deathList.forEach((userId, i) => {
        scores[userId] = board.deathList.length - i;
      });

      for (const [userId, score] of Object.entries(scores)) {
        logPlayerStat(userId, "rank", score);
      }
      endMatch();
    }
  },
};

const roll: PlayerMove<DudoGameState, null> = {
  canDo(options) {
    const { board } = options;
    return board.step === "revealed";
  },
  executeNow({ userId, board, playerboard }) {
    playerboard.isRolling = true;
    board.players[userId].hasRolled = true;
  },
  execute({ board, playerboards, userId, random, turns }) {
    const { numDice } = playerboards[userId];

    // Roll the dice for the player that is ready.
    const diceValues = random.d6(numDice);
    playerboards[userId].diceValues = diceValues;
    playerboards[userId].isRolling = false;

    // Check if everyone has rolled (or is dead!), in which case we go to the next turn.
    const numNotReady = Object.values(board.players).filter(
      (info) => info.isAlive && !info.hasRolled,
    ).length;

    if (numNotReady === 0) {
      // Is the next round a palifico round?
      // In the (mainstream?) rules, only the first time you hit 1 die do you get a
      // palifico round. This is what this does!
      // We need at least 2 players for that rule to apply.
      const { loser, playerOrder, players } = board;
      const palifico =
        playerboards[loser!].numDice === 1 &&
        Object.values(board.players).filter((p) => p.isAlive).length > 2;

      board.step = "play";
      board.palifico = palifico;

      // The loser is the next player, unless he's dead, then we take the next available
      // player.
      board.currentPlayerIndex = playerOrder.indexOf(loser!);

      if (!players[loser!].isAlive) {
        incrementCurrentPlayer(board);
      }
      // If incrementCurrentPlayer is called it will set the previousPlayerIndex.
      board.previousPlayerIndex = undefined;

      Object.values(players).forEach((info) => {
        info.diceValues = undefined;
      });

      // Only after the rolls do we properly clear the loser's last die.
      if (loser) {
        if (playerboards[loser].numDice === 0) {
          playerboards[loser].diceValues = [];
        }
      }

      board.loser = undefined;
      board.bet = undefined;

      // `everyoneHasRolled` has changed the current player
      turns.end("all");
      turns.begin(board.playerOrder[board.currentPlayerIndex]);
    } else {
      turns.end(userId);
    }
  },
};

const gamePlayerSettings: GamePlayerSettings = {
  color: {
    label: "Color",
    options: [
      // NOTE those colors are duplicated in the game definition
      // Furthermore those were copy pasted from the tailwind website because we use
      // tailwind in the <Board>!
      { label: "#67E8F9", value: "0" },
      { label: "#BEF264", value: "1" },
      { label: "#FCD34D", value: "2" },
      { label: "#FDBA74", value: "3" },
      { label: "#F9A8D4", value: "4" },
      { label: "#C4B5FD", value: "5" },
      { label: "#FCA5A5", value: "6" },
    ],
    type: "color",
    exclusive: true,
  },
};

//
// Game object
//

export const game = {
  initialBoards({ players, random, matchSettings, matchPlayersSettings }) {
    const userIds = players;

    const startNumDice = parseInt(matchSettings.startNumDice);

    // We shuffle [0, 1, ..., numPlayers - 1]. This will be our order.
    const playerOrder = random.shuffled(userIds);

    const ourPlayers: Record<UserId, PlayerInfo> = {};
    const playerboards: Record<UserId, DudoPlayerboard> = {};

    playerOrder.forEach((userId) => {
      ourPlayers[userId] = {
        hasRolled: true,
        isAlive: true,
        color: parseInt(matchPlayersSettings[userId].color),
      };

      playerboards[userId] = {
        numDice: startNumDice,
        diceValues: random.d6(startNumDice),
        isRolling: false,
      };
    });

    const board = {
      players: ourPlayers,
      playerOrder,
      currentPlayerIndex: 0,
      step: "play" as const,
      palifico: false,
      startNumDice,
      deathList: [],
    };

    return {
      board,
      playerboards,
    };
  },
  playerMoves: {
    bet,
    roll,
    call,
  },
  boardMoves: {
    [INIT_MOVE]: {
      execute: ({ turns, board }) => {
        turns.begin(board.playerOrder[0]);
      },
    },
  },
  gameSettings,
  gamePlayerSettings,
  playerStats: [
    {
      key: "rank",
      type: "rank",
      determinesRank: true,
      ordering: "lowerIsBetter",
    },
  ],
  minPlayers: 2,
  maxPlayers: 7,
} satisfies Game<DudoGameState>;

export type DudoGame = typeof game;
