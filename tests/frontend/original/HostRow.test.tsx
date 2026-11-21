import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FolderOpen, Terminal } from "lucide-react";
import type { Host } from "@termix-ssh/plugin-sdk/ui";
import { registerHostAction } from "@termix-ssh/plugin-sdk/testing-host";

const { statusMock } = vi.hoisted(() => ({
  statusMock: vi.fn<() => "online" | "offline" | "unknown" | null>(
    () => "online",
  ),
}));

vi.mock("@termix-ssh/plugin-sdk/ui", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  markTabSurfaceUsed: vi.fn(),
  preloadTabSurface: vi.fn(),
  useHostStatus: statusMock,
  useStatusColorScheme: () => "status",
}));
vi.mock("@termix-ssh/plugin-sdk/frontend", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => key }),
  usePluginUiPreferences: () => ({ values: {}, set: () => {} }),
}));

import {
  HostRow,
  MAX_ROW_BUTTONS,
} from "../../../src/frontend/original/HostRow";
import { setHostRows } from "../../../src/frontend/sidebar/tree/host-bar-actions";

const baseHost = {
  id: "7",
  name: "web-01",
  username: "root",
  ip: "10.0.0.5",
  port: 22,
  folder: "",
  online: true,
  cpu: null,
  ram: null,
  lastAccess: "",
  tags: ["prod", "web"],
  authType: "password",
  hasPassword: true,
  enableSsh: true,
  sshPort: 22,
} as unknown as Host;

const disposers: (() => void)[] = [];
function action(id: string, order: number, icon = Terminal) {
  disposers.push(
    registerHostAction({
      id,
      titleKey: `fixture.${id}`,
      icon,
      kind: "connect",
      tabType: id,
      order,
      when: () => true,
    }),
  );
}

afterEach(() => {
  cleanup();
  disposers.splice(0).forEach((dispose) => dispose());
  statusMock.mockReset().mockReturnValue("online");
  setHostRows({});
});

describe("HostRow", () => {
  it("shows the name, a status dot and the tags", () => {
    render(<HostRow host={baseHost} onOpen={() => {}} />);
    expect(screen.getByText("web-01")).toBeTruthy();
    expect(
      screen.getByRole("img", { name: "original.status.online" }),
    ).toBeTruthy();
    expect(screen.getByText("prod")).toBeTruthy();
    expect(screen.getByText("web")).toBeTruthy();
  });

  it("hides the tags when asked", () => {
    render(<HostRow host={baseHost} showTags={false} onOpen={() => {}} />);
    expect(screen.queryByText("prod")).toBeNull();
  });

  it("has no status dot when status checks are off", () => {
    render(
      <HostRow
        host={{ ...baseHost, statusCheckEnabled: false }}
        onOpen={() => {}}
      />,
    );
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("opens the first way to connect when the name is clicked", () => {
    action("terminal", 1);
    action("files", 2, FolderOpen);
    const onOpen = vi.fn();
    render(<HostRow host={baseHost} onOpen={onOpen} />);

    fireEvent.click(screen.getByText("web-01"));

    expect(onOpen).toHaveBeenCalledWith(
      baseHost,
      "terminal",
      expect.objectContaining({ forceNewTab: true }),
    );
  });

  it("reuses an open tab when the click setting says so", () => {
    action("terminal", 1);
    const onOpen = vi.fn();
    render(<HostRow host={baseHost} focusExisting onOpen={onOpen} />);

    fireEvent.click(screen.getByText("web-01"));

    expect(onOpen.mock.calls[0][2]).toMatchObject({ forceNewTab: false });
  });

  it("puts a few tools in the button group and the rest in the menu", async () => {
    for (let i = 1; i <= MAX_ROW_BUTTONS + 2; i++) action(`tool-${i}`, i);
    const onOpen = vi.fn();
    render(<HostRow host={baseHost} onOpen={onOpen} />);

    for (let i = 1; i <= MAX_ROW_BUTTONS; i++) {
      expect(screen.getByLabelText(`fixture.tool-${i}`)).toBeTruthy();
    }
    expect(
      screen.queryByLabelText(`fixture.tool-${MAX_ROW_BUTTONS + 1}`),
    ).toBeNull();

    fireEvent.click(screen.getByLabelText("fixture.tool-2"));
    expect(onOpen).toHaveBeenCalledWith(baseHost, "tool-2", expect.anything());

    await userEvent.click(screen.getByLabelText("original.moreHostActions"));
    expect(
      await screen.findByText(`fixture.tool-${MAX_ROW_BUTTONS + 1}`),
    ).toBeTruthy();
    expect(screen.getByText("original.copyAddress")).toBeTruthy();
    expect(screen.getByText("nav.copyPassword")).toBeTruthy();
  });

  it("offers edit and share only when the host allows them", async () => {
    const onEdit = vi.fn();
    const { unmount } = render(
      <HostRow host={baseHost} onOpen={() => {}} onEdit={onEdit} />,
    );
    await userEvent.click(screen.getByLabelText("original.moreHostActions"));
    await userEvent.click(await screen.findByText("original.edit"));
    expect(onEdit).toHaveBeenCalledWith(baseHost);
    unmount();

    render(
      <HostRow
        host={{ ...baseHost, isShared: true, permissionLevel: "connect" }}
        onOpen={() => {}}
        onEdit={onEdit}
        onShare={() => {}}
      />,
    );
    await userEvent.click(screen.getByLabelText("original.moreHostActions"));
    expect(screen.queryByText("original.edit")).toBeNull();
    expect(screen.queryByText("original.share")).toBeNull();
    expect(screen.queryByText("nav.copyPassword")).toBeNull();
  });

  it("indents sub-hosts", () => {
    const { container } = render(
      <HostRow host={baseHost} depth={2} onOpen={() => {}} />,
    );
    const row = container.querySelector<HTMLElement>("[data-host-row]");
    expect(row?.style.paddingLeft).toBe("24px");
  });
});
