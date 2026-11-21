import { describe, expect, it } from "vitest";
import type { Host, HostFolder } from "@termix-ssh/plugin-sdk/ui";
import {
  countHosts,
  filterTree,
  hostMatches,
  isEmptyQuery,
  isFolder,
  parseHostQuery,
  sortHosts,
} from "../../../src/frontend/original/host-search";

function host(overrides: Partial<Host>): Host {
  return {
    id: "1",
    name: "web-01",
    username: "root",
    ip: "10.0.0.5",
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
    ...overrides,
  } as Host;
}

const web = host({ id: "1", name: "web-01", tags: ["prod"], folder: "Prod" });
const db = host({
  id: "2",
  name: "db-01",
  ip: "10.0.0.9",
  username: "postgres",
  folder: "Prod",
});
const lab = host({ id: "3", name: "lab", ip: "192.168.1.4", port: 2222 });
const child = host({ id: "4", name: "vm-child", ip: "10.1.0.2" });
const parent = host({ id: "5", name: "proxmox", childHosts: [child] });

const tree: HostFolder = {
  name: "root",
  children: [
    lab,
    parent,
    { name: "Prod", path: "Prod", children: [web, db] },
    { name: "Empty", path: "Empty", children: [] },
  ],
};

describe("parseHostQuery", () => {
  it("splits field filters from free text", () => {
    expect(parseHostQuery("  tag:Prod user:root web ")).toEqual({
      fields: { tag: "prod", user: "root" },
      text: "web",
    });
  });

  it("treats an empty box as no query", () => {
    expect(isEmptyQuery(parseHostQuery("   "))).toBe(true);
    expect(isEmptyQuery(parseHostQuery("a"))).toBe(false);
  });
});

describe("hostMatches", () => {
  it("matches each field the old sidebar knew", () => {
    expect(hostMatches(web, parseHostQuery("tag:pro"))).toBe(true);
    expect(hostMatches(db, parseHostQuery("user:postgres"))).toBe(true);
    expect(hostMatches(db, parseHostQuery("ip:10.0.0.9"))).toBe(true);
    expect(hostMatches(lab, parseHostQuery("port:2222"))).toBe(true);
    expect(hostMatches(web, parseHostQuery("folder:prod"))).toBe(true);
    expect(hostMatches(web, parseHostQuery("auth:pass"))).toBe(true);
    expect(hostMatches(db, parseHostQuery("tag:prod"))).toBe(false);
  });

  it("needs every word of free text", () => {
    expect(hostMatches(web, parseHostQuery("web root"))).toBe(true);
    expect(hostMatches(web, parseHostQuery("web postgres"))).toBe(false);
  });

  it("reads an unknown field as plain text", () => {
    expect(hostMatches(host({ name: "a:b" }), parseHostQuery("a:b"))).toBe(
      true,
    );
  });
});

describe("filterTree", () => {
  it("returns the same tree for an empty query", () => {
    expect(filterTree(tree, parseHostQuery(""))).toBe(tree);
  });

  it("keeps only folders that still hold a match", () => {
    const result = filterTree(tree, parseHostQuery("db"));
    expect(result.children).toHaveLength(1);
    const prod = result.children[0] as HostFolder;
    expect(isFolder(prod)).toBe(true);
    expect(prod.children.map((h) => (h as Host).name)).toEqual(["db-01"]);
  });

  it("keeps a parent host when only its sub-host matches", () => {
    const result = filterTree(tree, parseHostQuery("vm-child"));
    expect(result.children).toHaveLength(1);
    const kept = result.children[0] as Host;
    expect(kept.name).toBe("proxmox");
    expect(kept.childHosts?.map((h) => h.name)).toEqual(["vm-child"]);
  });
});

describe("sortHosts and countHosts", () => {
  it("puts pinned hosts first, then sorts by name", () => {
    const sorted = sortHosts([
      host({ id: "a", name: "zeta" }),
      host({ id: "b", name: "alpha" }),
      host({ id: "c", name: "mid", pin: true }),
    ]);
    expect(sorted.map((h) => h.name)).toEqual(["mid", "alpha", "zeta"]);
  });

  it("counts hosts in every folder and under parents", () => {
    expect(countHosts(tree)).toBe(5);
  });
});
