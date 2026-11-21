#!/usr/bin/env node
/**
 * Writes themes/original-dark.css and themes/original-light.css from the
 * v2.2.1 colors below and the look rules in src/frontend/original/look-css.ts.
 * Run it after changing either. --check fails when a file is out of date.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lookCss } from "../src/frontend/original/look-css.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Colors measured from v2.2.1. --background is the panels, --original-page
// the darker page behind them.
export const THEMES = {
  "original-dark": {
    accent: "#fafafa",
    tokens: {
      "--background": "#18181b",
      "--foreground": "#fafafa",
      "--card": "#18181b",
      "--card-foreground": "#fafafa",
      "--popover": "#18181b",
      "--popover-foreground": "#fafafa",
      "--primary": "#e4e4e7",
      "--primary-foreground": "#27272a",
      "--secondary": "#27272a",
      "--secondary-foreground": "#fafafa",
      "--surface": "#1b1b1e",
      "--surface-dim": "#141416",
      "--muted": "#27272a",
      "--muted-foreground": "#9ca3af",
      "--accent": "#2d2d30",
      "--accent-foreground": "#fafafa",
      "--destructive": "#f87171",
      "--border": "#303032",
      "--input": "#3a3a3d",
      "--ring": "#71717a",
      "--radius": "0.625rem",
      "--chart-1": "#3b82f6",
      "--chart-2": "#34d399",
      "--chart-3": "#f4a261",
      "--chart-4": "#a855f7",
      "--chart-5": "#f43f5e",
      "--sidebar": "#18181b",
      "--sidebar-foreground": "#fafafa",
      "--sidebar-primary": "#fafafa",
      "--sidebar-primary-foreground": "#18181b",
      "--sidebar-accent": "#2d2d30",
      "--sidebar-accent-foreground": "#fafafa",
      "--sidebar-border": "#303032",
      "--sidebar-ring": "#71717a",
      "--warning": "oklch(0.852 0.156 91.94)",
      "--terminal-bg": "#18181b",
      "--original-page": "#09090b",
      "--original-deepest": "#09090b",
      "--original-elevated": "#0e0e10",
      "--original-header": "#131316",
      "--original-field": "#222225",
      "--original-button": "#27272a",
      "--original-button-hover": "#2d2d30",
      "--original-button-border": "#3a3a3d",
    },
  },
  "original-light": {
    accent: "#18181b",
    tokens: {
      "--background": "#fcfcfc",
      "--foreground": "#18181b",
      "--card": "#fcfcfc",
      "--card-foreground": "#18181b",
      "--popover": "#ffffff",
      "--popover-foreground": "#18181b",
      "--primary": "#27272a",
      "--primary-foreground": "#fafafa",
      "--secondary": "#f4f4f5",
      "--secondary-foreground": "#27272a",
      "--surface": "#f3f4f6",
      "--surface-dim": "#fafafa",
      "--muted": "#f4f4f5",
      "--muted-foreground": "#71717a",
      "--accent": "#e5e7eb",
      "--accent-foreground": "#27272a",
      "--destructive": "#dc2626",
      "--border": "#e5e7eb",
      "--input": "#d1d5db",
      "--ring": "#a1a1aa",
      "--radius": "0.625rem",
      "--chart-1": "#e76e50",
      "--chart-2": "#2a9d8f",
      "--chart-3": "#264653",
      "--chart-4": "#e9c46a",
      "--chart-5": "#f4a261",
      "--sidebar": "#fcfcfc",
      "--sidebar-foreground": "#18181b",
      "--sidebar-primary": "#27272a",
      "--sidebar-primary-foreground": "#fafafa",
      "--sidebar-accent": "#f4f4f5",
      "--sidebar-accent-foreground": "#27272a",
      "--sidebar-border": "#e5e7eb",
      "--sidebar-ring": "#a1a1aa",
      "--warning": "oklch(0.795 0.162 86.05)",
      "--terminal-bg": "#ffffff",
      "--original-page": "#ffffff",
      "--original-deepest": "#ffffff",
      "--original-elevated": "#ffffff",
      "--original-header": "#eeeeef",
      "--original-field": "#ffffff",
      "--original-button": "#f3f4f6",
      "--original-button-hover": "#e5e7eb",
      "--original-button-border": "#d1d5db",
    },
  },
};

export function themeCss(id) {
  const theme = THEMES[id];
  const tokens = Object.entries(theme.tokens)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");
  // Core sets --field on every page colored surface, so it is restated there.
  const field = [
    `.${id}`,
    `.${id} .bg-background`,
    `.${id} .bg-sidebar`,
    `html.${id}[data-frame-on="sidebar"]`,
  ].join(",\n");
  const fieldRule = `${field} {\n  --field: ${theme.tokens["--original-field"]};\n}`;
  return `.${id} {\n${tokens}\n}\n\n${fieldRule}\n\n${lookCss(`.${id}`, theme.accent)}\n`;
}

const check = process.argv.includes("--check");
let stale = false;
for (const id of Object.keys(THEMES)) {
  const file = path.join(root, "themes", `${id}.css`);
  const next = themeCss(id);
  if (check) {
    if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== next) {
      console.error(`${path.relative(root, file)} is out of date`);
      stale = true;
    }
  } else {
    fs.writeFileSync(file, next);
    console.log(`Wrote ${path.relative(root, file)}`);
  }
}
if (stale) {
  console.error("Run npm run generate:themes");
  process.exit(1);
}
