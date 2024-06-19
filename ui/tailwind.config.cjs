const colors = require("tailwindcss/colors");

const sm = "576px";
const md = "768px";

const units = {
  auto: "auto",
  0.5: "0.125rem",
  1: "0.25rem",
  1.5: "0.375rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  7: "1.75rem",
  8: "2rem",
  10: "2.5rem",
  11: "2.75rem",
  12: "3rem",
  16: "4rem",
  18: "4.5rem",
  20: "5rem",
  24: "6rem",
  28: "7rem",
  30: "7.5rem",
  32: "8rem",
  36: "9rem",
  40: "10rem",
  44: "11rem",
  48: "12rem",
  50: "12.5rem",
  52: "13rem",
  60: "15rem",
  64: "16rem",
  72: "18rem",
  80: "20rem",
  96: "24rem",
  full: "100%",
  "screen-sm": sm,
  "screen-md": md,
};

module.exports = {
  mode: "jit",
  purge: ["./src/**/*.{tsx,ts,css}"],
  darkMode: false, // or 'media' or 'class'
  theme: {
    colors: {
      black: colors.black,
      white: colors.white,
      gray: colors.coolGray,
      red: colors.red,
      orange: colors.orange,
      yellow: colors.yellow,
      green: colors.green,
      emerald: colors.emerald,
      blue: colors.sky,
      purple: colors.purple,
      // amber: colors.amber,
      pink: colors.pink,
      lime: colors.lime,
      cyan: colors.cyan,
    },
    screens: {
      // Horizontal
      sm,
      md,
      // Vertical
      vsm: { raw: `(min-height: 600px)` },
    },
    width: units,
    padding: units,
    margin: units,
    height: units,
    maxWidth: units,
    minWidth: units,
    minHeight: units,
    extend: {
      rotate: {
        "-24": "-24deg",
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
