import { afterEach, describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  renderWithApp,
  type RenderedPluginApp,
} from "@termix-ssh/plugin-sdk/testing";
import { usePluginComponent } from "@termix-ssh/plugin-sdk/frontend";
import { getRegisteredLayout } from "@termix-ssh/plugin-sdk/testing-host";
import type { PluginManifest } from "@termix-ssh/plugin-sdk/manifest";
import * as plugin from "../../src/frontend/index";
import manifestJson from "../../manifest.json";
import locales from "../../locales/en.json";

const manifest = manifestJson as unknown as PluginManifest;

let rendered: RenderedPluginApp | null = null;

afterEach(async () => {
  await rendered?.deactivate();
  rendered = null;
});

describe(`${manifest.id} activate`, () => {
  it("registers the layout its manifest declares", async () => {
    rendered = await renderWithApp(plugin, { manifest, locales });
    const layout = getRegisteredLayout("original");
    expect(layout).toMatchObject({ id: "original", pluginId: manifest.id });
    expect(typeof layout?.component).toBe("function");
    expect(manifest.contributes?.layouts?.map((entry) => entry.id)).toEqual([
      "original",
    ]);
  });

  it("registers the Dashboard, Manage and Settings tab types", async () => {
    rendered = await renderWithApp(plugin, { manifest, locales });
    expect(rendered.registered.tabs().sort()).toEqual([
      "dashboard",
      "host-manager",
      "settings",
    ]);
  });

  it("takes over the appearance step only", async () => {
    rendered = await renderWithApp(plugin, { manifest, locales });
    expect(rendered.registered.onboardingSteps()).toEqual(["appearance"]);
  });

  it("starts the layout on its own dark theme", async () => {
    rendered = await renderWithApp(plugin, { manifest, locales });
    expect(getRegisteredLayout("original")?.defaultTheme).toBe("original-dark");
    expect(manifest.capabilities).toContain("ui:theme");
    expect(manifest.contributes?.themes?.map((theme) => theme.id)).toEqual([
      "original-dark",
      "original-light",
    ]);
  });

  it("offers the host list and the Dashboard to other plugins", async () => {
    rendered = await renderWithApp(plugin, { manifest, locales });
    for (const id of [
      "original-layout.hostTree",
      "original-layout.dashboard",
    ]) {
      const { result } = renderHook(() => usePluginComponent(id));
      expect(result.current).toBeTruthy();
    }
  });

  it("takes everything back when it is turned off", async () => {
    rendered = await renderWithApp(plugin, { manifest, locales });
    await rendered.deactivate();
    rendered = null;
    expect(getRegisteredLayout("original")).toBeUndefined();
    const { result } = renderHook(() =>
      usePluginComponent("original-layout.hostTree"),
    );
    expect(result.current).toBeUndefined();
  });

  it("is a layout plugin that declares every tab it registers", () => {
    expect(manifest.capabilities).toContain("ui:layout");
    expect(manifest.contributes?.tabs?.map((tab) => tab.id).sort()).toEqual([
      "dashboard",
      "host-manager",
      "settings",
    ]);
  });
});
