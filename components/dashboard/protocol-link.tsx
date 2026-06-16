import { ExternalLink } from "lucide-react";
import { getLinks } from "@/lib/stellar/protocol-links";

interface ProtocolLinkProps {
  slug: string;
  className?: string;
}

export function ProtocolLink({ slug, className }: ProtocolLinkProps) {
  const entry = getLinks(slug);
  if (!entry) return null;
  const href = entry.app ?? entry.homepage;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={`Verified ${entry.verifiedOn} by ${entry.verifiedBy}`}
      data-protocol-slug={entry.slug}
      className={
        className ??
        "inline-flex items-center gap-0.5 text-accent hover:text-accent/80 transition-colors"
      }
    >
      <ExternalLink className="size-3.5" />
      <span className="sr-only">Open {entry.name} (verified)</span>
    </a>
  );
}
