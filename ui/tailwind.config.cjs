const colors = require("tailwindcss/colors");

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
      // Using bootstrap's standard for "sm"
      sm: "576px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
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
