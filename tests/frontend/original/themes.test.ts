import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateThemeCss } from "@termix-ssh/plugin-sdk/manifest";
import manifest from "../../../manifest.json";

const root = path.resolve(__dirname, "../../..");
const themes = manifest.contributes.themes;

function tokens(css: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const match of css.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    out[match[1]] = match[2].trim();
  }
  return out;
}

describe("Original themes", () => {
  it("ships a dark and a light theme", () => {
    expect(themes.map((theme) => [theme.id, theme.mode])).toEqual([
      ["original-dark", "dark"],
      ["original-light", "light"],
    ]);
  });

  it.each(themes)("$id passes the theme check Termix runs", (theme) => {
    const css = fs.readFileSync(path.join(root, theme.css), "utf8");
    expect(validateThemeCss(css, theme.id)).toEqual([]);
  });

  it.each(themes)("$id carries the rounded look for plugin frames", (theme) => {
    const css = fs.readFileSync(path.join(root, theme.css), "utf8");
    expect(css).toContain(`.${theme.id} [data-slot="button"]`);
    expect(css).toMatch(/--font-ui: [^;]*system-ui[^;]*!important;/);
    expect(css).toMatch(/--accent-brand: #[0-9a-f]{6} !important;/);
    expect(css).toContain(`.${theme.id} .bg-background`);
  });

  it("keeps both themes on the same set of tokens", () => {
    const [dark, light] = themes.map((theme) =>
      Object.keys(
        tokens(fs.readFileSync(path.join(root, theme.css), "utf8")),
      ).sort(),
    );
    expect(dark).toEqual(light);
    expect(dark).toEqual(
      expect.arrayContaining([
        "--background",
        "--border",
        "--sidebar",
        "--terminal-bg",
        "--original-deepest",
        "--original-elevated",
        "--original-header",
      ]),
    );
  });

  it("uses the v2.2.1 zinc colors in the dark theme", () => {
    const dark = tokens(
      fs.readFileSync(path.join(root, "themes/original-dark.css"), "utf8"),
    );
    expect(dark["--background"]).toBe("#18181b");
    expect(dark["--border"]).toBe("#303032");
    expect(dark["--original-deepest"]).toBe("#09090b");
    expect(dark["--original-header"]).toBe("#131316");
  });

  it("matches each swatch to its theme", () => {
    for (const theme of themes) {
      const css = tokens(fs.readFileSync(path.join(root, theme.css), "utf8"));
      expect(theme.swatch.background).toBe(css["--background"]);
      expect(theme.swatch.text).toBe(css["--foreground"]);
    }
  });
});
