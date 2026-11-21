import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  ServerStatusProvider,
  ShellControllerProvider,
  TabPortals,
  setPermissionsForTesting,
} from "@termix-ssh/plugin-sdk/testing-host";

vi.mock("@termix-ssh/plugin-sdk/frontend", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => key, language: "en" }),
}));
vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { OriginalLayout } from "../../../src/frontend/layout/OriginalLayout";

// The shell keeps polling after unmount; its late logs would reach a closed worker.
for (const level of ["log", "info", "warn", "error", "debug"] as const) {
  console[level] = () => {};
}

beforeEach(() => setPermissionsForTesting([], true));
afterEach(cleanup);

function renderLayout() {
  return render(
    <ServerStatusProvider isAuthenticated>
      <ShellControllerProvider username="admin" onLogout={() => {}}>
        <OriginalLayout />
        <TabPortals />
      </ShellControllerProvider>
    </ServerStatusProvider>,
  );
}

describe("OriginalLayout", () => {
  it("draws the floating sidebar, the tab bar and the framed stage", async () => {
    renderLayout();
    await waitFor(() =>
      expect(screen.getByLabelText("original.sidebar")).toBeTruthy(),
    );
    expect(await screen.findByText("original.hostManager")).toBeTruthy();
    expect(screen.getByLabelText("original.searchHosts")).toBeTruthy();
    expect(screen.getByLabelText("original.tools")).toBeTruthy();
    expect(screen.getByLabelText("original.quickConnect")).toBeTruthy();
    expect(screen.getByText("admin")).toBeTruthy();
    // No icon rail in this layout.
    expect(document.querySelector(".z-\\[60\\]")).toBeNull();
  });

  it("collapses the sidebar to a strip and brings it back", async () => {
    renderLayout();
    const collapse = await screen.findByLabelText("nav.collapseSidebar");
    fireEvent.click(collapse);
    await waitFor(() =>
      expect(screen.queryByLabelText("original.sidebar")).toBeNull(),
    );

    fireEvent.click(screen.getByLabelText("nav.openSidebar"));
    await waitFor(() =>
      expect(screen.getByLabelText("original.sidebar")).toBeTruthy(),
    );
  });

  it("shows Quick Connect in the sidebar with a way back to the hosts", async () => {
    renderLayout();
    fireEvent.click(await screen.findByLabelText("original.quickConnect"));
    const back = await screen.findByLabelText("original.backToHosts");
    fireEvent.click(back);
    await waitFor(() =>
      expect(screen.queryByLabelText("original.backToHosts")).toBeNull(),
    );
    expect(await screen.findByText("original.hostManager")).toBeTruthy();
  });

  it("keeps the shell row in its own stacking context", () => {
    const { container } = renderLayout();
    const sidebar = container.querySelector('[aria-label="original.sidebar"]');
    expect(sidebar?.closest(".isolate")).not.toBeNull();
  });
});
