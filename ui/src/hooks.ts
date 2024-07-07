import { useEffect } from "react";

export const useFonts = () => {
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
