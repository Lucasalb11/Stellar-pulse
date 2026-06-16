// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProtocolLink } from "@/components/dashboard/protocol-link";

describe("<ProtocolLink />", () => {
  it("renders an outbound anchor for a registered slug", () => {
    render(<ProtocolLink slug="blend" />);
    const a = screen.getByRole("link");
    expect(a.getAttribute("target")).toBe("_blank");
    expect(a.getAttribute("rel")).toBe("noopener noreferrer");
    const href = a.getAttribute("href");
    expect(href?.startsWith("https://")).toBe(true);
  });

  it("renders nothing for a slug not in the registry", () => {
    const { container } = render(<ProtocolLink slug="not-a-real-slug" />);
    expect(container.firstChild).toBeNull();
  });

  it("title attribute exposes verifiedOn + verifiedBy", () => {
    render(<ProtocolLink slug="soroswap" />);
    const a = screen.getByRole("link");
    const title = a.getAttribute("title") ?? "";
    expect(title).toMatch(/Verified \d{4}-\d{2}-\d{2}/);
    expect(title).toContain("by ");
  });

  it("every registered slug renders rel=noopener noreferrer (no unsafe target=_blank)", () => {
    for (const slug of ["soroswap", "blend", "aquarius", "phoenix", "stellarx", "lumen-bridge"]) {
      const { unmount } = render(<ProtocolLink slug={slug} />);
      const a = screen.getByRole("link");
      expect(a.getAttribute("rel")).toBe("noopener noreferrer");
      expect(a.getAttribute("target")).toBe("_blank");
      unmount();
    }
  });

  it("prefers app URL when available, falls back to homepage", () => {
    const { unmount: u1 } = render(<ProtocolLink slug="blend" />);
    const blendHref = screen.getByRole("link").getAttribute("href");
    expect(blendHref).toContain("blend.capital");
    u1();
    const { unmount: u2 } = render(<ProtocolLink slug="stellarx" />);
    const stellarxHref = screen.getByRole("link").getAttribute("href");
    expect(stellarxHref).toBe("https://www.stellarx.com");
    u2();
  });
});
