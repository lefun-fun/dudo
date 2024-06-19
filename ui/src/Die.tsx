// Inspired from https://github.com/simlmx/chickenroll/blob/main/src/components/Die.tsx
import classNames from "classnames";
import React from "react";

/*
 * Define the dots as circles in a 100x100 squre
 */

const margin = 22;
const R = 11;

const topLeft = {
  cx: margin,
  cy: margin,
  r: R,
};

const topRight = {
  cx: 100 - margin,
  cy: margin,
  r: R,
};

const bottomLeft = {
  cx: margin,
  cy: 100 - margin,
  r: R,
};

const bottomRight = {
  cx: 100 - margin,
  cy: 100 - margin,
  r: R,
};

const center = {
  cx: 50,
  cy: 50,
  r: R,
};

// The dots for each die.
const dots = [
  [{ cx: 50, cy: 50, r: R * 1.25 }],
  [topLeft, bottomRight],
  [topLeft, center, bottomRight],
  [topLeft, topRight, bottomLeft, bottomRight],
  [topLeft, topRight, bottomLeft, bottomRight, center],
  [
    topLeft,
    topRight,
    bottomLeft,
    bottomRight,
    { cx: margin, cy: 50, r: R },
    { cx: 100 - margin, cy: 50, r: R },
  ],
];

/*
 * Map the value and current player to a list of <circle> tags.
 */
const diceDots = (value: number, color?: string) => {
  return dots[value - 1].map((dot, i) => (
    <circle
      {...dot}
      key={i}
      className={classNames(
        "fill-current",
        color == null ? "text-white" : color,
      )}
    />
  ));
};

const Star = ({
  downlight,
  colorDot,
}: {
  downlight: boolean;
  colorDot: string;
}) => {
  return (
    <div
      className="text-base sm:text-lg md:text-xl font-bold w-full h-full flex"
      style={{ padding: "15%" }}
    >
      {/* https://commons.wikimedia.org/wiki/File:Five_Pointed_Star_Solid.svg */}
      <svg
        viewBox="0 0 260 245"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <path
          className={classNames(
            "fill-current",
            downlight ? "text-gray-800" : colorDot,
          )}
          d="m55,237 74-228 74,228L9,96h240"
        />
      </svg>
    </div>
  );
};

interface DieProps {
  color?: string;
  colorDot?: string;
  border?: string;
  value: number;
  downlight?: boolean;
  highlight?: boolean;
  component?: React.ElementType;
}

export const Die = ({
  color,
  colorDot,
  border,
  value,
  downlight = false,
  highlight = false,
  component = "div",
}: DieProps) => {
  if (colorDot == null) {
    colorDot = "text-white";
  }

  const Component = component;

  return (
    <Component
      className={classNames(
        "block",
        "w-full h-full select-none",
        color == null ? "bg-black" : color,
        downlight
          ? "border-2 border-gray-800 bg-gray-300 opacity-40"
          : border != null && "border-2 " + border,
        { "shadow-lg ": highlight },
      )}
      style={{ borderRadius: "14%" }}
    >
      {value === 1 ? (
        <Star downlight={downlight} colorDot={colorDot} />
      ) : (
        <svg
          viewBox="0 0 100 100"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <g>{diceDots(value, downlight ? "text-gray-800" : colorDot)}</g>
        </svg>
      )}
    </Component>
  );
};
