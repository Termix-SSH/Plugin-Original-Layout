import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
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

  it.each(themes)("$id only styles its own class", (theme) => {
    const css = fs.readFileSync(path.join(root, theme.css), "utf8");
    const selectors = [...css.matchAll(/([^{}]+)\{/g)].map((m) => m[1].trim());
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) {
      expect(selector).toBe(`.${theme.id}`);
    }
    expect(css).not.toMatch(/@import|url\(|image-set\(/);
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
