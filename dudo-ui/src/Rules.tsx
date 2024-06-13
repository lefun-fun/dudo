import classNames from "classnames";
import { ReactNode } from "react";

import { Die as _Die } from "./Die";

const Die = ({ value }: { value: number }) => {
  return (
    <span className="inline-block w-5 h-5 bg-black align-middle rounded-sm">
      <_Die value={value} />
    </span>
  );
};

const Dudo = () => {
  return <button className="rounded-md py-0 px-1">Dudo</button>;
};

const Increase = ({
  fromTo,
  valid = true,
}: {
  fromTo: number[];
  valid?: boolean;
}) => {
  return (
    <div className="inline-block">
      <b>{fromTo[0]}</b> <Die value={fromTo[1]} />{" "}
      <span>
        {" "}
        <Arrow
          className={classNames(
            "fill-current",
            valid ? "text-green-600" : "text-red-600",
          )}
        />
      </span>{" "}
      <b>{fromTo[2]}</b> <Die value={fromTo[3]} />
    </div>
  );
};

// Use a <div> instead of <p> for paragraphs containing <div>s.
const P = ({ children }: { children: ReactNode }) => {
  return <div className="paragraph">{children}</div>;
};

const Arrow = ({ className = "" }: { className?: string }) => {
  return (
    <div className="inline-block align-middle">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        className={className}
      >
        <path d="M13.025 1l-2.847 2.828 6.176 6.176h-16.354v3.992h16.354l-6.176 6.176 2.847 2.828 10.975-11z" />
      </svg>
    </div>
  );
};

const Rules = () => {
  return (
    <div className="h-full w-full flex flex-col">
      <h1 className="mx-auto">Rules of Dudo</h1>
      <h2>Overview</h2>
      <p>
        Each player starts with a set number of dice, hidden from the other
        players.
      </p>
      <P>
        The first player makes a bid about how many dice of a certain value are
        showing <b>among all players</b>, at a minimum. Ones (<Die value={1} />)
        are wild. For example, a bid of <b>5</b> <Die value={3} /> is a claim
        that between all players, there are <b>at least</b> <b>5</b>{" "}
        <Die value={3} /> or <Die value={1} />.
      </P>
      <p>
        The next player must either raise the bid or call <Dudo />.
      </p>
      <p>
        Calling <Dudo /> ends the round. If the bidder's claim is met, the
        player who called <Dudo /> loses one die. If not, then the bidder loses
        one die. The loosing player starts the next round.
      </p>
      <h2>Raising the bid</h2>
      <p>The player raising must</p>
      <ul>
        <li>Increase the quantity and/or the value of the dice.</li>
        <li>Not lower the quantity of dice.</li>
      </ul>
      <div className="grid grid-cols-2">
        <div className="flex flex-col">
          <h3 className="m-auto">Valid raises</h3>
          <P>
            <div className="flex">
              <div className="flex flex-col m-auto">
                <Increase fromTo={[5, 3, 6, 2]} />
                <Increase fromTo={[5, 3, 5, 5]} />
                <Increase fromTo={[5, 3, 6, 6]} />
              </div>
            </div>
          </P>
        </div>
        <div>
          <div className="flex flex-col">
            <h3 className="m-auto">Invalid raises</h3>
            <P>
              <div className="flex">
                <div className="flex flex-col m-auto">
                  <Increase fromTo={[5, 3, 4, 4]} valid={false} />
                  <Increase fromTo={[5, 3, 5, 2]} valid={false} />
                  <Increase fromTo={[5, 3, 5, 3]} valid={false} />
                </div>
              </div>
            </P>
          </div>
        </div>
      </div>
      <h2>Bidding wilds</h2>
      <P>
        You can also bid the total number of <Die value={1} />. When doing so,
        you can halve (rounded up) the number of dice of a non-wild bid. You can
        go back to a non-wild bid by doubling and adding one to the quantity of
        dice.
      </P>
      <h3>Valid raises</h3>
      <P>
        <div className="flex flex-col m-auto">
          <Increase fromTo={[5, 3, 3, 1]} />
          <Increase fromTo={[6, 3, 3, 1]} />
          <Increase fromTo={[3, 1, 7, 2]} />
          <Increase fromTo={[3, 1, 7, 3]} />
        </div>
      </P>
      <h2>End of the game</h2>
      <p>
        Once you have lost all your dice, you are eliminated. The last player
        left wins.
      </p>
    </div>
  );
};

export default Rules;
