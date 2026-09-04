import { css } from "lit";

export const hostStyles = css`
  :host {
    box-sizing: border-box;
    color: var(--shw-color-text, #18212f);
    font-family:
      var(--shw-font-sans, Inter),
      ui-sans-serif,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
    line-height: 1.6;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
`;

export const headingStyles = css`
  .heading {
    color: var(--shw-color-heading, #101827);
    font-weight: 700;
    letter-spacing: -0.025em;
    line-height: 1.2;
    margin: 0;
    text-wrap: balance;
  }
`;
