import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { Host, HostFolder } from "@termix-ssh/plugin-sdk/ui";

const { requestManageMock } = vi.hoisted(() => ({
  requestManageMock: vi.fn(),
}));

vi.mock("@termix-ssh/plugin-sdk/ui", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getSSHHosts: () => Promise.resolve([]),
  getHostSidebarPreferences: () => Promise.reject(new Error("offline")),
  requestManage: requestManageMock,
  useHostStatus: () => "online",
  markTabSurfaceUsed: vi.fn(),
  preloadTabSurface: vi.fn(),
}));
vi.mock("@termix-ssh/plugin-sdk/frontend", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => key }),
  usePluginUiPreferences: () => ({ values: {}, set: () => {} }),
  useSettings: () => ({ values: {}, loaded: false, save: async () => {} }),
}));

import { HostsView } from "../../../src/frontend/original/HostsView";

function host(id: string, name: string, extra: Partial<Host> = {}): Host {
  return {
    id,
    name,
    username: "root",
    ip: `10.0.0.${id}`,
    port: 22,
    folder: "",
    online: true,
    cpu: null,
    ram: null,
    lastAccess: "",
    tags: [],
    authType: "password",
    enableSsh: true,
    sshPort: 22,
    ...extra,
  } as Host;
}

const tree: HostFolder = {
  name: "root",
  children: [
    host("1", "loose-box"),
    {
      name: "Prod",
      path: "Prod",
      color: "#ef4444",
      children: [
        host("2", "web-01", { tags: ["web"] }),
        host("3", "db-01"),
        {
          name: "Edge",
          path: "Prod / Edge",
          children: [host("4", "edge-01")],
        },
      ],
    },
  ],
};

function renderView(overrides: Partial<Parameters<typeof HostsView>[0]> = {}) {
  return render(
    <HostsView
      tree={tree}
      loading={false}
      onOpen={() => {}}
      onEdit={() => {}}
      {...overrides}
    />,
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  requestManageMock.mockReset();
  vi.useRealTimers();
});

describe("HostsView", () => {
  it("keeps each card's height, so a long list scrolls instead of squashing", () => {
    renderView();
    for (const card of screen.getAllByRole("region")) {
      expect(card.className).toContain("shrink-0");
    }
  });

  it("draws a card per folder, with loose hosts in their own card first", () => {
    renderView();
    const cards = screen.getAllByRole("region");
    expect(cards.map((card) => card.getAttribute("aria-label"))).toEqual([
      "original.noFolder",
      "Prod",
      "Edge",
    ]);
    expect(screen.getByText("loose-box")).toBeTruthy();
    expect(screen.getByText("edge-01")).toBeTruthy();
  });

  it("opens the Host Manager from the big button", () => {
    renderView();
    fireEvent.click(screen.getByText("original.hostManager"));
    expect(requestManageMock).toHaveBeenCalledWith({
      kind: "browse",
      mode: "hosts",
    });
  });

  it("collapses a folder and remembers it", () => {
    const { unmount } = renderView();
    const prodToggle = screen.getAllByLabelText("original.collapseFolder")[1];
    fireEvent.click(prodToggle);
    expect(screen.queryByText("web-01")).toBeNull();
    unmount();

    renderView();
    expect(screen.queryByText("web-01")).toBeNull();
    expect(screen.getByText("loose-box")).toBeTruthy();
  });

  it("filters with field search and opens closed folders while searching", () => {
    vi.useFakeTimers();
    localStorage.setItem(
      "original-layout.collapsedFolders",
      JSON.stringify(["Prod"]),
    );
    renderView();
    expect(screen.queryByText("web-01")).toBeNull();

    fireEvent.change(screen.getByLabelText("original.searchHosts"), {
      target: { value: "tag:web" },
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByText("web-01")).toBeTruthy();
    expect(screen.queryByText("db-01")).toBeNull();
    expect(screen.queryByText("loose-box")).toBeNull();
  });

  it("says so when nothing matches", () => {
    vi.useFakeTimers();
    renderView();
    fireEvent.change(screen.getByLabelText("original.searchHosts"), {
      target: { value: "nothing-like-this" },
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText("original.noMatches")).toBeTruthy();
  });

  it("points to the Host Manager when there are no hosts", () => {
    renderView({ tree: { name: "root", children: [] } });
    expect(screen.getByText("original.noHosts")).toBeTruthy();
  });
});
