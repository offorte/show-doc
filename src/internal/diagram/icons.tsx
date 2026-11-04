import type { ReactNode } from "react";

import type { IconName } from "./types";

const PATHS: Record<IconName, ReactNode> = {
  code: (
    <path d="M9 4C7 4 6 5 6 7v2c0 1.5-1 3-2 3 1 0 2 1.5 2 3v2c0 2 1 3 3 3M15 4c2 0 3 1 3 3v2c0 1.5 1 3 2 3-1 0-2 1.5-2 3v2c0 2-1 3-3 3" />
  ),
  window: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
    </>
  ),
  box: <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9" />,
  play: <path className="solid" d="M8 5l11 7-11 7z" />,
  queue: <path d="M5 7h14M5 12h14M5 17h14" />,
  service: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  db: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v12c0 1.7 3 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3 3 7 3s7-1.3 7-3" />
    </>
  ),
  file: <path d="M7 3h7l5 5v13H7zM14 3v5h5" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 21c0-4 3-6 7-6s7 2 7 6" />
    </>
  ),
  cloud: <path d="M7 18a4 4 0 0 1 0-8 5.5 5.5 0 0 1 10.6-1.5A4.5 4.5 0 0 1 18 18z" />,
  decision: <path d="M12 3l9 9-9 9-9-9z" />,
};

export const EXPAND_ICON_PATH = "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5";

export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
