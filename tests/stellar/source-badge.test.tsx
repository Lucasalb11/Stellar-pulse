// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SourceBadge } from "@/components/ui/source-badge";
import type { DataSource } from "@/lib/types";

describe("<SourceBadge />", () => {
  it("renders a human-readable label for each known DataSource", () => {
    const cases: { source: DataSource; label: string }[] = [
      { source: "defillama", label: "DefiLlama" },
      { source: "defillama-yields", label: "DefiLlama Yields" },
      { source: "horizon", label: "Horizon" },
      { source: "stellar-expert", label: "stellar.expert" },
      { source: "coingecko", label: "CoinGecko" },
      { source: "reflector", label: "Reflector" },
      { source: "horizon-orderbook", label: "Horizon orderbook" },
      { source: "derived-soroban", label: "Soroban RPC" },
      { source: "cache", label: "Cache" },
      { source: "mock", label: "Illustrative" },
    ];
    for (const { source, label } of cases) {
      const { unmount } = render(
        <SourceBadge source={source} verified={source !== "mock"} />,
      );
      expect(screen.getByText(label)).toBeDefined();
      unmount();
    }
  });

  it("marks mock-sourced rows with a warning tone and 'Illustrative' label", () => {
    render(<SourceBadge source="mock" verified={false} />);
    const el = screen.getByText("Illustrative");
    expect(el.getAttribute("data-source")).toBe("mock");
    expect(el.getAttribute("data-verified")).toBe("false");
  });

  it("title tooltip exposes verified state and asOf when provided", () => {
    render(
      <SourceBadge
        source="defillama"
        verified={true}
        asOf="2026-06-15T10:00:00Z"
      />,
    );
    const el = screen.getByText("DefiLlama");
    const title = el.getAttribute("title") ?? "";
    expect(title).toContain("Source: DefiLlama");
    expect(title).toContain("Verified: yes");
    expect(title).toContain("As of: 2026-06-15T10:00:00Z");
  });

  it("title shows 'Verified: no' for unverified rows", () => {
    render(<SourceBadge source="horizon" verified={false} />);
    const el = screen.getByText("Horizon");
    expect(el.getAttribute("title")).toContain("Verified: no");
  });

  it("compact mode truncates the label to 4 characters", () => {
    render(<SourceBadge source="defillama" verified={true} compact />);
    expect(screen.getByText("Defi")).toBeDefined();
  });

  it("forwards className", () => {
    render(
      <SourceBadge
        source="horizon"
        verified={true}
        className="custom-test-class"
      />,
    );
    const el = screen.getByText("Horizon");
    expect(el.className).toContain("custom-test-class");
  });

  it("data attributes encode source + verified for downstream selectors", () => {
    render(<SourceBadge source="stellar-expert" verified={true} />);
    const el = screen.getByText("stellar.expert");
    expect(el.getAttribute("data-source")).toBe("stellar-expert");
    expect(el.getAttribute("data-verified")).toBe("true");
  });
});

describe("SourceBadge in a row collection (protocols-table pattern)", () => {
  it("renders one badge per row, with mock rows tagged data-verified=false", () => {
    const rows: { id: string; source: DataSource; verified: boolean }[] = [
      { id: "soroswap", source: "defillama", verified: true },
      { id: "blend", source: "defillama", verified: true },
      { id: "fallback-a", source: "mock", verified: false },
      { id: "fallback-b", source: "mock", verified: false },
    ];
    const { container } = render(
      <div>
        {rows.map((r) => (
          <SourceBadge
            key={r.id}
            source={r.source}
            verified={r.verified}
            compact
          />
        ))}
      </div>,
    );
    const badges = container.querySelectorAll("[data-source]");
    expect(badges).toHaveLength(rows.length);

    const unverified = container.querySelectorAll("[data-verified='false']");
    expect(unverified).toHaveLength(2);

    const illustrative = container.querySelectorAll("[data-source='mock']");
    expect(illustrative).toHaveLength(2);
  });
});
