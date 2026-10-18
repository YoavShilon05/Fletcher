import { describe, expect, it } from "vitest";
import { normalizeSvg, parseMpos } from "./bake";

const SVG = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="215.9mm" height="279.4mm" viewBox="0 0 10200 13200"
 xmlns="http://www.w3.org/2000/svg" version="1.2" baseProfile="full">
<polyline class="StaffLines" stroke-width="9.09" points="0,0 1,1" />
</svg>`;

describe("normalizeSvg", () => {
  it("restates the root size in viewBox pixels", () => {
    const { svg, pageSize } = normalizeSvg(SVG);
    expect(pageSize).toEqual({ width: 10200, height: 13200 });
    expect(svg).toContain('<svg width="10200px" height="13200px" viewBox="0 0 10200 13200"');
    expect(svg).not.toContain("mm");
    expect(svg).toContain('stroke-width="9.09"'); // only the root is touched
  });

  it("rejects an SVG without a viewBox", () => {
    expect(() => normalizeSvg('<svg width="10" height="10"></svg>')).toThrow();
  });
});

describe("parseMpos", () => {
  it("reads measure boxes and playback events", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score>
  <elements>
    <element id="0" x="2239.11" y="2552.29" sx="2969.92" sy="9360.33" page="0">
      </element>
    <element id="1" x="5209.03" y="2552.29" sx="2331.62" sy="9360.33" page="1">
      </element>
    </elements>
  <events>
    <event elid="0" position="0">
      </event>
    <event elid="1" position="3428">
      </event>
    <event elid="0" position="6857">
      </event>
    </events>
  </score>`;
    const positions = parseMpos(xml, { width: 10200, height: 13200 });
    expect(positions.elements).toEqual([
      { id: 0, x: 2239.11, y: 2552.29, sx: 2969.92, sy: 9360.33, page: 0 },
      { id: 1, x: 5209.03, y: 2552.29, sx: 2331.62, sy: 9360.33, page: 1 },
    ]);
    expect(positions.events).toEqual([
      { elid: 0, position: 0 },
      { elid: 1, position: 3428 },
      { elid: 0, position: 6857 },
    ]);
    expect(positions.pageSize).toEqual({ width: 10200, height: 13200 });
  });

  it("keeps a single element/event as an array", () => {
    const xml = `<score><elements><element id="0" x="1" y="2" sx="3" sy="4" page="0"/></elements>
      <events><event elid="0" position="0"/></events></score>`;
    const positions = parseMpos(xml, { width: 1, height: 1 });
    expect(positions.elements).toHaveLength(1);
    expect(positions.events).toHaveLength(1);
  });
});
