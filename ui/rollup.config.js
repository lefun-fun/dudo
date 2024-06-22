import { babel } from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import copy from "rollup-plugin-copy";
import postcss from "rollup-plugin-postcss";

export default {
  input: "src/index.ts",
  output: {
    file: "dist/index.js",
    format: "esm",
    sourcemap: true,
  },
  plugins: [
    commonjs(),
    nodeResolve(),
    typescript({ exclude: ["lingui.config.ts", "src/main.tsx"] }),
    babel({
      babelHelpers: "bundled",
      extensions: [".tsx", ".ts"],
    }),
    postcss({ extract: true }),
    // FIXME .po files are being bundled!
    // and `rollup-plugin-copy` is being very annoying.
    // A solution would be to have the po and js files separate...
    copy({
      targets: [{ src: ["src/locales/*"], dest: "dist/locales" }],
    }),
  ],
  external: [
    /node_modules/,
    "@lefun/core",
    "@lefun/ui",
    "@lefun/game",
    "react",
    "react-dom",
  ],
};
