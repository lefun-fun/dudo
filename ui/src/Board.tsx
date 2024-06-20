import "tippy.js/dist/tippy.css";

import { msg, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import {
  animated,
  config as springConfig,
  useSpring,
  useTransition,
} from "@react-spring/web";
import Tippy from "@tippyjs/react";
import classNames from "classnames";
import { ReactNode, useEffect, useState } from "react";

import type { UserId } from "@lefun/core";
import {
  bet,
  call,
  DudoBoard,
  DudoPlayerboard,
  isNewBetValid,
  roll,
} from "@lefun/dudo-game";
import {
  playSound,
  Selector,
  useDispatch,
  useSelector as _useSelector,
  useSelectorShallow as _useSelectorShallow,
  useUsername,
} from "@lefun/ui";

import { Die } from "./Die";
import {
  iAmAliveSelector,
  iHaveRolledSelector,
  itsMyTurnSelector,
} from "./selectors";

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
  const { _ } = useLingui();
  return (
    <Tippy
      content={_(
        msg`No wilds. Only players with 1 die left can change the value of the dice.`,
      )}
    >
      <div className="h-full w-full bg-red-50 border-2 border-red-600 text-red-600 text-base rounded-lg px-1.5 shadow text-center ">
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

  const color = PLAYER_COLORS[colorIdx];

  const username = useUsername(userId);

  let betEl;
  if (step === "play" || !iHaveRolled) {
    if (isPreviousPlayer) {
      betEl = (
        <div className="m-auto flex">
          <div className="m-auto text-black text-xl">{betQty}</div>
          <div className="betDice m-1">
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
              <Trans>
                <span className={color.textLight}>{username}</span> is
                thinking...
              </Trans>
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
        <Trans>
          <span className={color.textLight}>{username}</span> has been
          eliminated
        </Trans>
      </span>
    );
  } else if (iHaveRolled && step === "revealed") {
    if (hasRolled) {
      playerIcon = "✔️";
      iconTooltip = (
        <span>
          <Trans>
            <span className={color.textLight}>{username}</span> has rolled
          </Trans>
        </span>
      );
    } else {
      playerIcon = "⌛";
      iconTooltip = (
        <span>
          <Trans>
            Waiting for <span className={color.textLight}>{username}</span> to
            roll
          </Trans>
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
    <div className={classNames("rounded-md flex space-x-2", color.text)}>
      <div
        className={classNames("rounded-md w-0 flex-1 flex overflow-hidden", {
          "bg-white border-2": isCurrentPlayer || isPreviousPlayer,
          [color.border]: isPreviousPlayer,
          "ring-2 ring-black border-black": isCurrentPlayer,
          "filter grayscale opacity-70": !isAlive,
        })}
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
          <div className="my-auto px-1 sm:px-2 text-lg sm:text-xl truncate">
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

const WildDie = () => {
  return (
    <span className="inline-block h-5 w-5">
      <Die
        value={1}
        color="bg-gray-200"
        colorDot="text-gray-500"
        border="border-gray-500"
        component="span"
      />
    </span>
  );
};

const WildsInfo = () => {
  const palifico = useSelector((state) => state.board.palifico);
  const iAmAlive = useSelector(iAmAliveSelector);
  const iHaveRolled = useSelector(iHaveRolledSelector);
  const step = useSelector((state) => state.board.step);

  const shouldSeePalifico =
    palifico &&
    (step === "play" || (step === "revealed" && (!iHaveRolled || !iAmAlive)));

  const palificoTrans = useTransition(shouldSeePalifico, {
    config: {
      tension: 200,
      friction: 22,
      clamp: true,
    },
    from: { opacity: 0, transform: "scale(4) rotate(12deg)" },
    enter: { opacity: 1, transform: "scale(1) rotate(-5deg)" },
    leave: { opacity: 0 },
  });

  return (
    <div className="w-full h-full flex justify-end">
      {palificoTrans(
        (style, item) =>
          item && (
            <div className="ml auto w-24 h-full relative">
              {/* absolute so that it doesn't influence the height of the container. */}
              <div className="absolute right-0 top-0 bottom-0 flex items-center">
                <animated.div
                  className="my-auto ml-auto mr-1 opacity-0"
                  style={{ ...style }}
                >
                  <Palifico />
                </animated.div>
              </div>
            </div>
          ),
      )}
      <div className="flex-1 w-0 max-w-60 flex">
        <div className="ml-auto my-auto inline-block text-gray-600 py-0.5 pl-1 pr-1.5 leading-5">
          {shouldSeePalifico ? (
            <Trans>
              <WildDie /> are <span className="text-red-600">NOT</span> wild
            </Trans>
          ) : (
            <Trans>
              <WildDie /> are wild
            </Trans>
          )}
        </div>
      </div>
    </div>
  );
};

const PlaySound = () => {
  const itsMyTurn = useSelector(itsMyTurnSelector);

  // Play sound if it's my turn.
  useEffect(() => {
    if (itsMyTurn) {
      playSound("yourturn");
    }
  }, [itsMyTurn]);

  return <></>;
};

function UpDownButton({
  onClick,
  direction,
  disabled,
}: {
  onClick: () => void;
  direction: "up" | "down";
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full py-1.5 text-sm"
      disabled={disabled}
    >
      {direction === "up" ? "▲" : "▼"}
    </button>
  );
}

function ActionButtons() {
  const dispatch = useDispatch();

  const numDice = useSelector((state) => state.playerboard?.numDice);
  const currentBet = useSelector((state) => state.board.bet);
  const palifico = useSelector((state) => state.board.palifico);
  const itsMyTurn = useSelector(itsMyTurnSelector);

  const [betQty] = currentBet == null ? [undefined, undefined] : currentBet;

  const setNewBetQty = (x: number) => setNewBet([x, newBetValue]);
  const setNewBetValue = (x: number) => setNewBet([newBetQty, x]);

  const hasOneDiceLeft = numDice === 1;

  const [newBet, setNewBet] = useState(() =>
    getDefaultBet({ oldBet: currentBet, palifico, hasOneDiceLeft }),
  );

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

  const [newBetQty, newBetValue] = newBet;

  const lowestQty = getLowestQty({
    oldBet: currentBet,
    palifico,
    hasOneDiceLeft,
  });

  const canDecrementQty = newBetQty > lowestQty;

  const canDecrementValue =
    newBetValue >
    getLowestValue({
      oldBet: currentBet,
      palifico,
      hasOneDiceLeft,
    });

  const canIncrementValue = newBetValue < 6 && (!palifico || hasOneDiceLeft);

  return (
    <div className="flex h-full w-full space-x-1">
      <div className="flex-initial w-12 flex flex-col justify-between">
        <UpDownButton
          onClick={() => setNewBetQty(newBetQty + 1)}
          disabled={!itsMyTurn}
          direction="up"
        />
        {itsMyTurn && <div className="m-auto text-2xl">{newBetQty}</div>}
        <UpDownButton
          onClick={() => setNewBetQty(newBetQty - 1)}
          disabled={!canDecrementQty || !itsMyTurn}
          direction="down"
        />
      </div>
      <div className="flex-initial w-12 flex flex-col justify-between">
        <UpDownButton
          onClick={() => setNewBetValue(newBetValue + 1)}
          disabled={!canIncrementValue || !itsMyTurn}
          direction="up"
        />
        {itsMyTurn && (
          <div className="m-auto w-6 h-6">
            <Die value={newBetValue} />
          </div>
        )}
        <UpDownButton
          onClick={() => setNewBetValue(newBetValue - 1)}
          disabled={!canDecrementValue || !itsMyTurn}
          direction="down"
        />
      </div>
      <div className="flex-initial w-24 flex-1 w-full">
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
          className="w-full h-full text-xl"
        >
          <Trans>Bet</Trans>
        </button>
      </div>
      <div className="flex-initial w-24 w-full">
        <button
          onClick={() => {
            dispatch(call());
          }}
          disabled={betQty == null || !itsMyTurn}
          className="text-xl h-full w-full border-red-700 text-red-700"
        >
          Dudo!
        </button>
      </div>
    </div>
  );
}

const Buttons = () => {
  const dispatch = useDispatch();

  const noPlayerboard = useSelector((state) => state.playerboard == null);
  const winner = useSelector((state) => state.board.winner);
  const step = useSelector((state) => state.board.step);
  const iHaveRolled = useSelector(iHaveRolledSelector);
  const iAmAlive = useSelector(iAmAliveSelector);

  const gameOver = winner != null;

  if (noPlayerboard) {
    return null;
  }

  return (
    <div className="w-full h-full flex panel justify-center">
      <div className="m-auto flex max-w-full h-full space-x-2 leading-2">
        {step === "play" && !gameOver && <ActionButtons />}
        {step === "revealed" && !iHaveRolled && iAmAlive && !gameOver && (
          <button
            onClick={() => dispatch(roll())}
            className="flex-initial w-24 h-full text-xl leading-7"
          >
            <Trans>Roll</Trans>
          </button>
        )}
      </div>
    </div>
  );
};

const PlayerColored = ({
  userId,
  children,
}: {
  userId: UserId;
  children: ReactNode;
}) => {
  const colorIdx = useSelector((state) => state.board.players[userId].color);
  const color = PLAYER_COLORS[colorIdx];
  return (
    <span
      className={classNames(color.text, color.bg, "rounded px-1 truncate")}
      key={"playerName"}
      style={{ maxWidth: "8rem" }}
    >
      {children}
    </span>
  );
};

const Username = ({ userId }: { userId: UserId }) => {
  const username = useUsername(userId);
  return <>{username}</>;
};

const Info = () => {
  const myUserId = useSelector((state) => state.userId);
  const itsMyTurn = useSelector(itsMyTurnSelector);
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

  if (winner) {
    infoEl =
      winner === myUserId ? (
        <Trans>
          <PlayerColored userId={winner}>You</PlayerColored> have won
        </Trans>
      ) : (
        <Trans>
          <PlayerColored userId={winner}>
            <Username userId={winner} />
          </PlayerColored>{" "}
          has won!
        </Trans>
      );
  } else if (loser && step === "revealed" && !iHaveRolled) {
    const isAlive = loserIsAlive;
    if (isAlive) {
      infoEl =
        loser === myUserId ? (
          <Trans>
            <PlayerColored userId={loser}>You</PlayerColored> lost one die!
          </Trans>
        ) : (
          <Trans>
            <PlayerColored userId={loser}>
              <Username userId={loser} />
            </PlayerColored>{" "}
            lost one die!
          </Trans>
        );
    } else if (myUserId === loser) {
      infoEl = (
        <Trans>
          <PlayerColored userId={loser}>You</PlayerColored> are out!
        </Trans>
      );
    } else {
      infoEl = (
        <Trans>
          <PlayerColored userId={loser}>
            <Username userId={loser} />
          </PlayerColored>{" "}
          is out
        </Trans>
      );
    }
  } else if (step === "revealed" && iHaveRolled) {
    infoEl = <Trans>Waiting for everyone to roll...</Trans>;
  } else if (itsMyTurn) {
    // Special case we want to center the text and make it bigger when it's your turn.
    return (
      <div className="info text-center w-full text-2xl">
        <Trans>It's your turn!</Trans>
      </div>
    );
  } else {
    infoEl = (
      <Trans>
        <PlayerColored userId={currentPlayer}>
          <Username userId={currentPlayer} />
        </PlayerColored>{" "}
        is thinking...
      </Trans>
    );
  }

  return (
    <div className="info flex items-center flex-1">
      <div className="inline-block leading-6">{infoEl}</div>
    </div>
  );
};

const Header = () => {
  const actualCount = useSelector((state) => state.board.actualCount);
  const iHaveRolled = useSelector(iHaveRolledSelector);
  const imAlive = useSelector(iAmAliveSelector);
  const bet = useSelectorShallow((state) => state.board.bet);
  const step = useSelector((state) => state.board.step);
  const itsMyTurn = useSelector(itsMyTurnSelector);

  const actualCountEl = step == "revealed" && !iHaveRolled && bet != null && (
    <span className="inline-block align-middle text-center">
      <span className="text-xl my-auto w-full align-middle">{actualCount}</span>
      <span className="w-6 h-6 ml-1 my-auto inline-block align-middle">
        <Die component="span" value={bet[1]} />
      </span>
    </span>
  );

  return (
    <div
      className={classNames(
        "w-full panel flex-initial h-16 flex items-center",
        itsMyTurn && step === "play" && "bg-gray-600 text-white rounded",
      )}
    >
      <div className="w-full text-xl flex">
        <div className="flex-1 w-0 flex">
          <Info />
        </div>
        {bet != null && (!imAlive || !iHaveRolled) && step === "revealed" && (
          <div className={classNames("flex justify-end")}>
            <div
              className={classNames(
                "w-full",
                "flex flex-col ml-4 mb-auto px-1 py-0.5 rounded",
                "bg-gray-200",
              )}
            >
              <span className="text-xs text-gray-600 text-center leading-3 pt-1">
                <Trans>Total</Trans>
              </span>
              {actualCountEl}
            </div>
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

  const numPlayers = playerOrder.length;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--num-dice", `${numDice}`);
    root.style.setProperty("--num-players", `${numPlayers}`);
  }, [numDice, numPlayers]);

  return (
    <div className="board w-full h-full flex flex-col manipulation justify-center items-center">
      <div
        className={`
          w-full max-w-screen-sm
          p-1 sm:p-2 space-y-1 sm:space-y-2
          flex flex-col
          rounded-lg bg-gray-200
        `}
      >
        <Header />
        <div className="panel">
          <div className="space-y-1 vsm:space-y-1.5">
            {playerOrder.map((u) => (
              <Player userId={u} key={u} />
            ))}
          </div>
          <div className="h-11 vsm:mt-2 flex items-center">
            <WildsInfo />
          </div>
        </div>
        <div className="h-32 vsm:h-36">
          <Buttons />
        </div>
      </div>
      <PlaySound />
    </div>
  );
};

export default Board;
