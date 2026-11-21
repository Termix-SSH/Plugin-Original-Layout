import { execFileSync } from "node:child_process";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  LOOK_CLASS,
  TONE_ATTR,
  applyLook,
  lookCss,
  shadeDefaults,
  toneOf,
} from "../../../src/frontend/original/look-css";

const root = path.resolve(__dirname, "../../..");

afterEach(() => {
  document.documentElement.classList.remove(LOOK_CLASS);
  document.getElementById("original-layout-look")?.remove();
});

describe("lookCss", () => {
  const css = lookCss(".x", "#fff");

  it("sets the old font and accent over the user's inline ones", () => {
    expect(css).toMatch(
      /\.x \{\n {2}--font-ui: [^;]*system-ui[^;]* !important;/,
    );
    expect(css).toContain("--accent-brand: #fff !important;");
  });

  it("rounds core's square parts and plain fields", () => {
    for (const slot of ["button", "input", "card", "dropdown-menu-content"]) {
      expect(css).toContain(`.x [data-slot="${slot}"]`);
    }
    expect(css).toContain(":is(button, select, textarea");
    // Anything that picked its own corners keeps them, unless it picked square.
    expect(css).toContain(
      ':is(:not([class*="rounded-"]), [class*="rounded-none"])',
    );
  });

  it("makes switches pills, like the old ones", () => {
    expect(css).toMatch(
      /\.x button\[role="switch"\],[\s\S]*?border-radius: 9999px;/,
    );
  });
});

describe("applyLook", () => {
  it("adds the class and the stylesheet, and takes both away", () => {
    const remove = applyLook();
    expect(document.documentElement.classList.contains(LOOK_CLASS)).toBe(true);
    const style = document.getElementById("original-layout-look");
    expect(style?.textContent).toContain(
      `html.${LOOK_CLASS} [data-slot="button"]`,
    );

    remove();
    expect(document.documentElement.classList.contains(LOOK_CLASS)).toBe(false);
    expect(document.getElementById("original-layout-look")).toBeNull();
  });
});

describe("shades for other themes", () => {
  it("are weak, so the Original themes win", () => {
    const css = shadeDefaults();
    expect(css).toContain(`:where(html.${LOOK_CLASS})`);
    expect(css).toContain(`:where(html.${LOOK_CLASS}[${TONE_ATTR}="light"])`);
    expect(css).toContain("--original-elevated: color-mix(");
  });

  it("tells light and dark backgrounds apart", () => {
    expect(toneOf("rgb(24, 24, 27)")).toBe("dark");
    expect(toneOf("rgb(252, 252, 252)")).toBe("light");
    expect(toneOf("oklch(0.155 0.004 128.73)")).toBe("dark");
    expect(toneOf("oklch(1 0 0)")).toBe("light");
  });

  it("marks the tone on the page and clears it", () => {
    const remove = applyLook();
    expect(document.documentElement.getAttribute(TONE_ATTR)).toMatch(
      /^(light|dark)$/,
    );
    remove();
    expect(document.documentElement.hasAttribute(TONE_ATTR)).toBe(false);
  });
});

describe("theme files", () => {
  it("match what the generator writes", () => {
    expect(() =>
      execFileSync(
        process.execPath,
        ["scripts/generate-themes.mjs", "--check"],
        {
          cwd: root,
          stdio: "pipe",
        },
      ),
    ).not.toThrow();
  });
});
