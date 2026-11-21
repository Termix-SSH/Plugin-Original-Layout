import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Credential, Host } from "@termix-ssh/plugin-sdk/ui";

vi.mock("@termix-ssh/plugin-sdk/frontend", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && "count" in opts ? `${key}:${String(opts.count)}` : key,
  }),
}));

import { groupByFolder } from "../../../src/frontend/original/manager/FolderSections";
import {
  HostViewer,
  hostExport,
} from "../../../src/frontend/original/manager/HostViewer";
import { CredentialViewer } from "../../../src/frontend/original/manager/CredentialViewer";
import { ManagerTabs } from "../../../src/frontend/original/manager/ManagerTabs";

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
    password: "hunter2",
    enableSsh: true,
    sshPort: 22,
    ...extra,
  } as Host;
}

const hosts = [
  host("1", "web-01", { folder: "Prod", tags: ["web"] }),
  host("2", "db-01", { folder: "Prod" }),
  host("3", "loose"),
  host("4", "shared-box", {
    isShared: true,
    permissionLevel: "connect",
  } as Partial<Host>),
];

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function renderHosts(overrides = {}) {
  const props = {
    hosts,
    canAdd: true,
    onAdd: vi.fn(),
    onEdit: vi.fn(),
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
    onRefresh: vi.fn(),
    ...overrides,
  };
  render(<HostViewer {...props} />);
  return props;
}

describe("groupByFolder", () => {
  it("puts items without a folder first and sorts the rest", () => {
    const groups = groupByFolder(
      [
        { f: "b", n: "2" },
        { f: "", n: "1" },
        { f: "a", n: "z" },
        { f: "a", n: "y" },
      ],
      (i) => i.f,
      (i) => i.n,
    );
    expect(groups.map((g) => g.folder)).toEqual(["", "a", "b"]);
    expect(groups[1].items.map((i) => i.n)).toEqual(["y", "z"]);
  });
});

describe("HostViewer", () => {
  it("shows the count and a section per folder", () => {
    renderHosts();
    expect(screen.getByText("original.manager.hostCount:4")).toBeTruthy();
    const sections = screen
      .getAllByRole("region")
      .map((s) => s.getAttribute("aria-label"));
    expect(sections).toEqual(["original.noFolder", "Prod"]);
  });

  it("edits, clones and deletes from a card", () => {
    const props = renderHosts();
    fireEvent.click(screen.getByText("web-01"));
    expect(props.onEdit).toHaveBeenCalledWith(hosts[0]);
    fireEvent.click(screen.getAllByLabelText("original.manager.clone")[0]);
    expect(props.onDuplicate).toHaveBeenCalled();
    fireEvent.click(screen.getAllByLabelText("original.manager.delete")[0]);
    expect(props.onDelete).toHaveBeenCalled();
  });

  it("offers no edit or delete on a host shared for connecting only", () => {
    renderHosts({ hosts: [hosts[3]] });
    expect(screen.queryByLabelText("original.edit")).toBeNull();
    expect(screen.queryByLabelText("original.manager.delete")).toBeNull();
    expect(screen.getByLabelText("original.manager.shared")).toBeTruthy();
  });

  it("filters with the sidebar's field search", () => {
    renderHosts();
    fireEvent.change(screen.getByLabelText("original.manager.searchHosts"), {
      target: { value: "tag:web" },
    });
    expect(screen.getByText("web-01")).toBeTruthy();
    expect(screen.queryByText("db-01")).toBeNull();
  });

  it("folds a section and remembers it", () => {
    renderHosts();
    fireEvent.click(screen.getByRole("button", { name: /Prod/ }));
    expect(screen.queryByText("web-01")).toBeNull();
    cleanup();
    renderHosts();
    expect(screen.queryByText("web-01")).toBeNull();
  });

  it("hides Add Host when hosts can't be added by hand", () => {
    renderHosts({ canAdd: false });
    expect(screen.queryByText("original.manager.addHost")).toBeNull();
  });
});

describe("HostViewer tools", () => {
  it("lists a few tools and folds the rest into a count", async () => {
    const { registerHostAction } =
      await import("@termix-ssh/plugin-sdk/testing-host");
    const { Terminal } = await import("lucide-react");
    const { MAX_CARD_TOOLS } =
      await import("../../../src/frontend/original/manager/HostViewer");
    const dispose = Array.from({ length: MAX_CARD_TOOLS + 3 }, (_, i) =>
      registerHostAction({
        id: `tool-${i}`,
        titleKey: `fixture.tool-${i}`,
        icon: Terminal,
        kind: "connect",
        tabType: `tool-${i}`,
        order: i,
        when: () => true,
      }),
    );
    try {
      renderHosts({ hosts: [hosts[2]] });
      expect(
        screen.getByText(`fixture.tool-${MAX_CARD_TOOLS - 1}`),
      ).toBeTruthy();
      expect(screen.queryByText(`fixture.tool-${MAX_CARD_TOOLS}`)).toBeNull();
      expect(screen.getByText("original.manager.moreTools:3")).toBeTruthy();
    } finally {
      dispose.forEach((off) => off());
    }
  });
});

describe("hostExport", () => {
  it("leaves secrets out", () => {
    const data = JSON.stringify(hostExport(hosts[0]));
    expect(data).toContain("web-01");
    expect(data).not.toContain("hunter2");
  });
});

describe("CredentialViewer", () => {
  const creds = [
    { id: "1", name: "Regular", username: "me", type: "password" },
    {
      id: "2",
      name: "Root key",
      username: "root",
      type: "key",
      folder: "Main",
    },
    {
      id: "3",
      name: "Theirs",
      username: "x",
      type: "key",
      isShared: true,
      permissionLevel: "use",
    },
  ] as Credential[];

  it("shows each credential and its type", () => {
    render(
      <CredentialViewer
        credentials={creds}
        onAdd={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        onRefresh={() => {}}
      />,
    );
    expect(screen.getByText("Regular")).toBeTruthy();
    expect(screen.getByText("Root key")).toBeTruthy();
    expect(
      screen.getAllByText("original.manager.sshKey").length,
    ).toBeGreaterThan(0);
    // Two of three can be deleted; the shared one can't.
    expect(screen.getAllByLabelText("original.manager.delete")).toHaveLength(2);
  });
});

describe("ManagerTabs", () => {
  it("names the editor tab after what is open", () => {
    const onPick = vi.fn();
    const { rerender } = render(
      <ManagerTabs
        view="hosts"
        editingHost={false}
        editingCredential={false}
        canAddHost
        onPick={onPick}
      />,
    );
    expect(screen.getByText("original.manager.addHost")).toBeTruthy();
    fireEvent.click(screen.getByText("original.manager.credentialsViewer"));
    expect(onPick).toHaveBeenCalledWith("credentials");

    rerender(
      <ManagerTabs
        view="host-editor"
        editingHost
        editingCredential={false}
        canAddHost
        onPick={onPick}
      />,
    );
    const tab = screen.getByText("original.manager.editHost");
    expect(tab.getAttribute("aria-selected")).toBe("true");
  });

  it("turns off Add Host when hosts can't be added by hand", () => {
    render(
      <ManagerTabs
        view="hosts"
        editingHost={false}
        editingCredential={false}
        canAddHost={false}
        onPick={() => {}}
      />,
    );
    expect(
      (screen.getByText("original.manager.addHost") as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
