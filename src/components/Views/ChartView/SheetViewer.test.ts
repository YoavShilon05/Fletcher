import { describe, expect, it } from "vitest";
import { namespaceSvgIds } from "./SheetViewer";

describe("namespaceSvgIds", () => {
  it("rewrites def ids and every way they're referenced", () => {
    const svg =
      '<svg><clipPath id="1">...</clipPath>' +
      '<polyline clip-path="url(#1)" /><use href="#1" /></svg>';

    const out = namespaceSvgIds(svg, "p0");

    expect(out).toContain('id="p0-1"');
    expect(out).toContain('url(#p0-1)');
    expect(out).toContain('href="#p0-1"');
    expect(out).not.toContain('id="1"');
  });

  it("gives two pages' identical id numbering no overlap", () => {
    const page = '<svg><clipPath id="1"></clipPath><clipPath id="2"></clipPath></svg>';

    const a = namespaceSvgIds(page, "p0");
    const b = namespaceSvgIds(page, "p1");

    const idsOf = (svg: string) => [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    expect(idsOf(a).some((id) => idsOf(b).includes(id))).toBe(false);
  });

  it("leaves non-numeric ids and unrelated attributes untouched", () => {
    const svg = '<svg><g id="StaffLines"><rect id="main-bg" /></g></svg>';
    expect(namespaceSvgIds(svg, "p0")).toBe(svg);
  });
});
