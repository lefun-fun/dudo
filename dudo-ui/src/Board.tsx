import "tippy.js/dist/tippy.css";

import {
  animated,
  config as springConfig,
  useSpring,
  useTransition,
} from "@react-spring/web";
import Tippy from "@tippyjs/react";
import classNames from "classnames";
import React, { ReactNode, useEffect, useState } from "react";

import type { UserId } from "@lefun/core";
import {
  playSound,
  Selector,
  useDispatch,
  useSelector as _useSelector,
  useSelectorShallow as _useSelectorShallow,
  useUsername,
} from "@lefun/ui";
import {
  bet,
  call,
  DudoBoard,
  DudoPlayerboard,
  isNewBetValid,
  roll,
} from "dudo-game";

import { Die } from "./Die";
import { iAmAliveSelector, iHaveRolledSelector } from "./selectors";

const useSetFont = () => {
  // Add the google font. This is a bit hacky but we have no other way to control the
  // "outer" HTML.
  useEffect(() => {
    const parent = document.getElementsByTagName("head")[0];
    parent.insertAdjacentHTML(
      "beforeend",
      `
      <link rel="preconnect" href="https://fonts.gstatic.com">
      <link href="https://fonts.googleapis.com/css2?family=Hammersmith+One&display=swap" rel="stylesheet">
      `,
    );
  }, []);
};

type PlayerColor = {
  text: string;
  bg: string;
  border: string;
  textLight: string;
};

const PLAYER_COLORS: PlayerColor[] = [
  {
    text: "text-cyan-800",
    bg: "bg-cyan-300",
    border: "border-cyan-800",
    textLight: "text-cyan-300",
  },
  {
    text: "text-lime-800",
    bg: "bg-lime-300",
    border: "border-lime-800",
    textLight: "text-lime-300",
  },
  {
    text: "text-yellow-800",
    bg: "bg-yellow-300",
    border: "border-yellow-800",
    textLight: "text-yellow-300",
  },
  {
    text: "text-orange-800",
    bg: "bg-orange-300",
    border: "border-orange-800",
    textLight: "text-orange-300",
  },
  {
    text: "text-pink-800",
    bg: "bg-pink-300",
    border: "border-pink-800",
    textLight: "text-pink-300",
  },
  {
    text: "text-purple-800",
    bg: "bg-purple-300",
    border: "border-purple-800",
    textLight: "text-purple-300",
  },
  {
    text: "text-red-800",
    bg: "bg-red-300",
    border: "border-red-800",
    textLight: "text-red-300",
  },
];

const Palifico = () => {
  return (
    <Tippy content="No wilds. Only players with 1 die left can change the value of the dice.">
      <div className="h-full w-full bg-yellow-100 border-2 border-yellow-600 text-yellow-600 text-sm rounded-lg px-1.5 tracking-tight shadow text-center font-bold">
        ¡Palifico!
      </div>
    </Tippy>
  );
};

type B = DudoBoard;
type PB = DudoPlayerboard;

const useSelector = <T,>(selector: Selector<T, B, PB>) =>
  _useSelector<T, B, PB>(selector);

const useSelectorShallow = <T,>(selector: Selector<T, B, PB>) =>
  _useSelectorShallow<T, B, PB>(selector);

const Player = ({ userId }: { userId: UserId }) => {
  const iHaveRolled = useSelector(iHaveRolledSelector);

  const itsMe = useSelector((state) => userId === state.userId);

  const isCurrentPlayer = useSelector((state) => {
    const { playerOrder, currentPlayerIndex } = state.board;
    return playerOrder[currentPlayerIndex] === userId;
  });

  const isPreviousPlayer = useSelector((state) => {
    const { playerOrder, previousPlayerIndex } = state.board;
    if (previousPlayerIndex === undefined) {
      return false;
    }
    return playerOrder[previousPlayerIndex] === userId;
  });

  const [betQty, betValue] = useSelector((state) => {
    return state.board.bet || [undefined, undefined];
  });

  const playerDiceValues = useSelectorShallow(
    (state) => state.board.players[userId].diceValues,
  );
  const hasRolled = useSelector(
    (state) => state.board.players[userId].hasRolled,
  );
  const isAlive = useSelector((state) => state.board.players[userId].isAlive);

  const colorIdx = useSelector((state) => state.board.players[userId].color);

  const color = PLAYER_COLORS[colorIdx];

  const imRolling = useSelector((state) => {
    return itsMe && state.playerboard?.isRolling;
  });

  const startNumDice = useSelector((state) => state.board.startNumDice);

  const isLoser = useSelector((state) => state.board.loser === userId);

  const diceValues = useSelectorShallow((state) => {
    // If we have rolled, then we don't want to see the dice of the other players anymore.
    if (playerDiceValues != null && !iHaveRolled) {
      return playerDiceValues;
    }
    if (itsMe) {
      return state.playerboard!.diceValues;
    }
  });

  const numDice = diceValues == null ? null : diceValues.length;

  const step = useSelector((state) => state.board.step);
  const palifico = useSelector((state) => state.board.palifico);

  const username = useUsername(userId);

  let betEl;
  if (step === "play" || !iHaveRolled) {
    if (isPreviousPlayer) {
      betEl = (
        <div className="m-auto flex">
          <div className="m-auto text-black text-xl">{betQty}</div>
          <div className="w-6 h-6 md:w-8 md:h-8 m-1">
            <Die value={betValue!} />
          </div>
        </div>
      );
    } else if (isCurrentPlayer && step === "revealed") {
      betEl = <div className="m-auto text-red-700 md:text-lg">Dudo!</div>;
    } else if (isCurrentPlayer) {
      betEl = (
        <Tippy
          content={
            <span>
              <span className={color.textLight}>{username}</span> is thinking...
            </span>
          }
        >
          <div className="m-auto cursor-default">🤔</div>
        </Tippy>
      );
    }
  }

  let playerIcon, iconTooltip;

  if (!isAlive) {
    playerIcon = "😿";
    iconTooltip = (
      <span>
        <span className={color.textLight}>{username}</span> has been eliminated
      </span>
    );
  } else if (iHaveRolled && step === "revealed") {
    if (hasRolled) {
      playerIcon = "✔️";
      iconTooltip = (
        <span>
          <span className={color.textLight}>{username}</span> has rolled
        </span>
      );
    } else {
      playerIcon = "⌛";
      iconTooltip = (
        <span>
          Waiting for <span className={color.textLight}>{username}</span> to
          roll
        </span>
      );
    }
  }

  playerIcon = (
    <Tippy content={iconTooltip}>
      <div className="m-auto cursor-default">{playerIcon}</div>
    </Tippy>
  );

  const showDisappearingDice = step === "revealed" && !iHaveRolled;

  // The only way I managed to rotate forever and shrink the die at the beginning is to
  // use 2 separate springs for the 2 effects.
  const [disappearStyle, disappearApi] = useSpring(() => ({
    from: { scale: 1, opacity: 1 },
  }));

  const [rotateStyle, rotateApi] = useSpring(() => ({
    from: { rotateZ: 0 },
  }));

  useEffect(() => {
    if (showDisappearingDice) {
      disappearApi.start({
        reset: true,
        config: { tension: 10, friction: 36 },
        to: { scale: 0.35, opacity: 0.5 },
      });
      rotateApi.start({
        reset: true,
        config: { duration: 6000 },
        to: async (next) => {
          for (;;) {
            await next({ from: { rotateZ: 0 }, to: { rotateZ: 360 } });
          }
        },
      });
    } else {
      disappearApi.stop();
      disappearApi.set({ scale: 1, opacity: 1 });
      rotateApi.stop();
      rotateApi.set({ rotateZ: 0 });
    }
  }, [showDisappearingDice, disappearApi, rotateApi]);

  const [fadeInStyle, fadeInApi] = useSpring(() => ({
    from: { rotateZ: 0, opacity: 0 },
  }));

  const showingDiceRow = diceValues != null && !imRolling;

  useEffect(() => {
    if (showingDiceRow) {
      const spin = itsMe && iHaveRolled;
      fadeInApi.start({
        reset: true,
        config: (key) =>
          ({
            opacity: { duration: spin ? 100 : 500 },
            rotateZ: springConfig.default,
          })[key],
        to: { opacity: 1, ...(spin ? { rotateZ: 180 } : {}) },
      });
    } else {
      fadeInApi.set({ opacity: 0 });
    }
  }, [showingDiceRow, fadeInApi, itsMe, iHaveRolled]);

  const diceRowEl = Array(startNumDice)
    .fill(undefined)
    .map((_, i) => {
      const value = diceValues?.[i];
      const isLastDice = i + 1 === numDice;
      const highlight =
        step === "revealed" &&
        !iHaveRolled &&
        (value === betValue || (!palifico && value === 1));

      const downlight = step === "revealed" && !iHaveRolled && !highlight;
      const isDisappearing =
        step === "revealed" && !iHaveRolled && isLoser && isLastDice;

      return (
        <animated.div className="die" key={i}>
          {showingDiceRow && value != null && (
            <animated.div
              className="h-full w-full relative"
              style={{
                ...(isDisappearing
                  ? { ...disappearStyle, ...rotateStyle }
                  : { ...fadeInStyle }),
              }}
            >
              <Die
                color={color.bg}
                colorDot={color.text}
                border={color.border}
                value={value}
                downlight={downlight}
                highlight={highlight}
              />
            </animated.div>
          )}
        </animated.div>
      );
    });

  return (
    <div className={classNames("player rounded-md flex space-x-2", color.text)}>
      <div
        className={classNames(
          "rounded-md my-auto w-0 flex-1 flex overflow-hidden",
          {
            "bg-white border-2": isCurrentPlayer || isPreviousPlayer,
            [color.border]: isPreviousPlayer,
            "ring-2 ring-black border-black": isCurrentPlayer,
            "filter grayscale opacity-70": !isAlive,
          },
        )}
      >
        <div
          className={classNames(
            "flex truncate w-0 flex-1",
            isCurrentPlayer || isPreviousPlayer
              ? "rounded rounded-r-none"
              : "rounded-md border-2 " + color.border,
            color.bg,
          )}
        >
          <div className="my-auto p-1 sm:p-2 text-lg sm:text-xl truncate">
            {username}
          </div>
        </div>
        <div className="bet flex">{betEl != null ? betEl : playerIcon}</div>
      </div>
      <div className={classNames("flex m-auto dice-row")}>{diceRowEl}</div>
    </div>
  );
};

type GetLowestQtyOptions = {
  oldBet?: [number, number];
  palifico: boolean;
  // Does the person betting has one dice left.
  hasOneDiceLeft: boolean;
};

/* Compute the lowest quantity we can bet. This is used to disable buttons and set
 * default values.
 */
export const getLowestQty = ({
  oldBet,
  palifico,
  hasOneDiceLeft,
}: GetLowestQtyOptions) => {
  if (oldBet == null) {
    return 1;
  }
  const [oldQty, oldValue] = oldBet;

  if (palifico) {
    if (hasOneDiceLeft && oldValue < 6) {
      // We could keep the qty and raise the value.
      return oldQty;
    } else {
      // We need to keep the value and so we need to increase the quantity.
      return oldQty + 1;
    }
  } else {
    // Betting wilds?
    if (oldValue == 1) {
      // Need to increase.
      return oldQty + 1;
    } else {
      // If not, then we could decrease if betting wilds.
      return Math.ceil(oldQty / 2);
    }
  }
};

export const getLowestValue = ({
  oldBet,
  palifico,
  hasOneDiceLeft,
}: GetLowestQtyOptions) => {
  if (oldBet == null) {
    return palifico ? 1 : 2;
  }
  const [, oldValue] = oldBet;
  if (palifico && !hasOneDiceLeft) {
    return oldValue;
  } else {
    return 1;
  }
};

/*
 * We return something as close as the previous bet. In some cases though one of the two
 * values (qty or value) is just impossible.
 */
export const getDefaultBet = ({
  oldBet,
  palifico,
}: GetLowestQtyOptions): [number, number] => {
  // If it's the first bet it's easy.
  if (oldBet == null) {
    // It only depends on palifico or not.
    return palifico ? [1, 1] : [1, 2];
  }

  return oldBet;
};

const WildsInfo = () => {
  const palifico = useSelector((state) => state.board.palifico);
  return (
    <div className="text-gray-600 panel flex space-x-2 items-center py-0.5 pl-1 pr-1.5 rounded-md">
      <div className="h-5 w-5">
        <Die
          value={1}
          color="bg-gray-200"
          colorDot="text-gray-500"
          border="border-gray-500"
        />
      </div>
      <span className="font-light">
        are {palifico && <span className="text-red-600">NOT</span>} wild
      </span>
    </div>
  );
};

const PlaySound = () => {
  const itsMyTurn = useSelector((state) => {
    const { currentPlayerIndex, playerOrder } = state.board;
    return state.userId === playerOrder[currentPlayerIndex];
  });

  // Play sound if it's my turn.
  useEffect(() => {
    if (itsMyTurn) {
      playSound("yourturn");
    }
  }, [itsMyTurn]);

  return <></>;
};

const Buttons = () => {
  const dispatch = useDispatch();
  const currentBet = useSelector((state) => state.board.bet);
  const palifico = useSelector((state) => state.board.palifico);

  const [betQty] = currentBet == null ? [undefined, undefined] : currentBet;

  const noPlayerboard = useSelector((state) => state.playerboard == null);
  const numDice = useSelector((state) => state.playerboard?.numDice);
  const hasOneDiceLeft = numDice === 1;

  const lowestQty = getLowestQty({
    oldBet: currentBet,
    palifico,
    hasOneDiceLeft,
  });

  const [newBet, setNewBet] = useState(() =>
    getDefaultBet({ oldBet: currentBet, palifico, hasOneDiceLeft }),
  );

  const [newBetQty, newBetValue] = newBet;

  const setNewBetQty = (x: number) => setNewBet([x, newBetValue]);
  const setNewBetValue = (x: number) => setNewBet([newBetQty, x]);

  const itsMyTurn = useSelector((state) => {
    const { currentPlayerIndex, playerOrder } = state.board;
    return state.userId === playerOrder[currentPlayerIndex];
  });

  const winner = useSelector((state) => state.board.winner);
  const gameOver = winner != null;

  const step = useSelector((state) => state.board.step);

  // When the currentBet is back to null (for a new turn), we reset our internal state.
  useEffect(() => {
    if (currentBet == null) {
      setNewBet(getDefaultBet({ oldBet: undefined, palifico, hasOneDiceLeft }));
    }
  }, [currentBet, hasOneDiceLeft, palifico]);

  // When it's our turn, set the default bet value quand quantity
  useEffect(() => {
    if (itsMyTurn) {
      setNewBet(
        getDefaultBet({ oldBet: currentBet, palifico, hasOneDiceLeft }),
      );
    }
  }, [itsMyTurn, currentBet, hasOneDiceLeft, palifico]);

  const canDecrementQty = newBetQty > lowestQty;

  const canDecrementValue =
    newBetValue >
    getLowestValue({
      oldBet: currentBet,
      palifico,
      hasOneDiceLeft,
    });

  const canIncrementValue = newBetValue < 6 && (!palifico || hasOneDiceLeft);

  const iHaveRolled = useSelector(iHaveRolledSelector);

  const iAmAlive = useSelector(iAmAliveSelector);

  if (noPlayerboard) {
    return null;
  }

  const buttons = (
    <>
      <div className="buttonCol">
        <button
          onClick={() => setNewBetQty(newBetQty + 1)}
          className="upDownButton"
          disabled={!itsMyTurn}
        >
          ▲
        </button>
        {itsMyTurn && <div className="m-auto text-2xl">{newBetQty}</div>}
        <button
          onClick={() => setNewBetQty(newBetQty - 1)}
          disabled={!canDecrementQty || !itsMyTurn}
          className="upDownButton"
        >
          ▼
        </button>
      </div>
      <div className="buttonCol">
        <button
          onClick={() => setNewBetValue(newBetValue + 1)}
          disabled={!canIncrementValue || !itsMyTurn}
          className="upDownButton"
        >
          ▲
        </button>
        {itsMyTurn && (
          <div className="m-auto w-6 h-6">
            <Die value={newBetValue} />
          </div>
        )}
        <button
          onClick={() => setNewBetValue(newBetValue - 1)}
          disabled={!canDecrementValue || !itsMyTurn}
          className="upDownButton"
        >
          ▼
        </button>
      </div>
      <button
        onClick={() =>
          dispatch(bet({ numDice: newBetQty, diceValue: newBetValue }))
        }
        disabled={
          !isNewBetValid({
            oldBet: currentBet,
            newBet: [newBetQty, newBetValue],
            palifico,
            currentPlayerNumDice: numDice!,
          }) || !itsMyTurn
        }
        className="actionButton"
      >
        Bet
      </button>
      <button
        onClick={() => {
          dispatch(call());
        }}
        disabled={betQty == null || !itsMyTurn}
        className="actionButton border-red-700 text-red-700"
      >
        Dudo!
      </button>
    </>
  );
  return (
    <div className="w-full h-40 flex panel">
      <div
        className={classNames("m-auto flex h-full space-x-1", {
          notMyTurn: !itsMyTurn,
        })}
      >
        {step === "play" && !gameOver && buttons}
        {step === "revealed" && !iHaveRolled && iAmAlive && !gameOver && (
          <button onClick={() => dispatch(roll())} className="actionButton">
            Roll
          </button>
        )}
      </div>
    </div>
  );
};

const PlayerName = ({ userId }: { userId: UserId }) => {
  const myUserId = useSelector((state) => state.userId);
  const username = useUsername(userId);

  const colorIdx = useSelector((state) => state.board.players[userId].color);

  const color = PLAYER_COLORS[colorIdx];
  return (
    <span
      className={classNames(
        color.text,
        color.bg,
        "rounded px-1 mx-2 truncate inline-block my-auto",
      )}
      key={"playerName"}
      style={{ maxWidth: "8rem" }}
    >
      {userId === myUserId ? "You" : username}
    </span>
  );
};

const Info = () => {
  const myUserId = useSelector((state) => state.userId);

  const itsMyTurn = useSelector((state) => {
    const { currentPlayerIndex, playerOrder } = state.board;
    return state.userId === playerOrder[currentPlayerIndex];
  });

  const step = useSelector((state) => state.board.step);

  const loser = useSelector((state) => state.board.loser);

  const winner = useSelector((state) => state.board.winner);
  const currentPlayer = useSelector(
    (state) => state.board.playerOrder[state.board.currentPlayerIndex],
  );

  const loserIsAlive = useSelector((state) =>
    loser ? state.board.players[loser].isAlive : false,
  );

  const iHaveRolled = useSelector(iHaveRolledSelector);

  let infoEl: ReactNode;

  if (winner != null) {
    infoEl = (
      <>
        <PlayerName userId={winner} />
        {winner === myUserId ? " have won" : " has won!"}
      </>
    );
  } else if (loser != null && step === "revealed" && !iHaveRolled) {
    let text;
    const isAlive = loserIsAlive;
    if (isAlive) {
      text = " lost one die!";
    } else if (myUserId === loser) {
      text = " are out!";
    } else {
      text = " is out";
    }
    infoEl = (
      <>
        <PlayerName userId={loser} /> {text}
      </>
    );
  } else if (step === "revealed" && iHaveRolled) {
    infoEl = <>Waiting for everyone to roll...</>;
  } else if (itsMyTurn) {
    infoEl = <>It's your turn!</>;
  } else {
    infoEl = (
      <>
        <PlayerName userId={currentPlayer} /> is thinking...
      </>
    );
  }

  return <div className="info my-auto flex">{infoEl}</div>;
};

const Header = () => {
  const actualCount = useSelector((state) => state.board.actualCount);

  const iAmAlive = useSelector(iAmAliveSelector);
  const iHaveRolled = useSelector(iHaveRolledSelector);

  const bet = useSelectorShallow((state) => state.board.bet);
  const step = useSelector((state) => state.board.step);
  const palifico = useSelector((state) => state.board.palifico);

  const betColor = useSelector((state) => {
    if (bet == null) {
      return undefined;
    }
    const { previousPlayerIndex, playerOrder, players } = state.board;
    if (previousPlayerIndex === undefined) {
      return undefined;
    }
    return PLAYER_COLORS[players[playerOrder[previousPlayerIndex]].color];
  });

  const shouldSeePalifico =
    palifico &&
    (step === "play" || (step === "revealed" && (!iHaveRolled || !iAmAlive)));

  const palificoTrans = useTransition(shouldSeePalifico, {
    config: {
      tension: 473,
      friction: 22,
    },
    from: { opacity: 0, transform: "scale(4) rotate(12deg)" },
    enter: { opacity: 1, transform: "scale(1) rotate(-20deg)" },
    leave: { opacity: 0 },
  });

  const actualCountEl = step == "revealed" && !iHaveRolled && bet != null && (
    <>
      <div className="text-xl my-auto">{actualCount}</div>
      <div className="w-6 h-6 ml-1 my-auto">
        <Die value={bet[1]} />
      </div>
    </>
  );

  return (
    <div className="w-full text-2xl sm:text-2xl md:text-2xl flex">
      <div className="flex-1 flex justify-start relative">
        <div className="absolute -left-2 right-0 top-0 bottom-0 flex">
          {palificoTrans(
            (style, item) =>
              item && (
                <animated.div
                  className="my-auto mr-auto opacity-0"
                  style={{ ...style }}
                >
                  <Palifico />
                </animated.div>
              ),
          )}
        </div>
      </div>
      <Info />
      <div className={classNames("flex-1 flex justify-end")}>
        {bet != null && !iHaveRolled && (
          <div
            className={classNames(
              "flex my-auto mr-2 px-1 py-0.5 rounded",
              betColor?.bg,
            )}
          >
            {actualCountEl}
          </div>
        )}
      </div>
    </div>
  );
};

const Board = () => {
  useSetFont();

  const playerOrder = useSelectorShallow((state) => {
    return state.board.playerOrder;
  });

  const numDice = useSelector((state) => state.board.startNumDice);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--num-dice", `${numDice}`);
  }, [numDice]);

  return (
    <div className="board w-full h-full flex flex-col manipulation">
      <div className="m-auto w-full max-w-screen-sm md:max-w-screen-md p-1 space-y-4 flex flex-col">
        <div className="w-full panel">
          <Header />
        </div>
        <div className="space-y-1.5 md:space-y-2 panel">
          {playerOrder.map((u) => (
            <Player userId={u} key={u} />
          ))}
        </div>
        <Buttons />
        <div className="ml-auto">
          <WildsInfo />
        </div>
      </div>
      <PlaySound />
    </div>
  );
};

export default Board;
