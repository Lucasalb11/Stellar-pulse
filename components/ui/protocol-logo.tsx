import Image from "next/image";
import { getLinks } from "@/lib/stellar/protocol-links";

interface ProtocolLogoProps {
  slug: string;
  name: string;
  size?: number;
  className?: string;
}

const GRADIENT_FALLBACK =
  "linear-gradient(135deg, rgba(0,212,255,0.22), rgba(124,58,237,0.22))";

export function ProtocolLogo({
  slug,
  name,
  size = 28,
  className,
}: ProtocolLogoProps) {
  const entry = getLinks(slug);
  const logoUrl = entry?.logoUrl;
  const rounded = size >= 32 ? "rounded-xl" : "rounded-lg";
  const baseClass = `${rounded} shrink-0 overflow-hidden ring-1 ring-white/5 ${className ?? ""}`;

  if (logoUrl) {
    return (
      <div
        className={baseClass}
        style={{
          width: size,
          height: size,
          background: "rgba(15,23,42,0.5)",
        }}
      >
        <Image
          src={logoUrl}
          alt={`${name} logo`}
          width={size}
          height={size}
          className="block size-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${baseClass} grid place-items-center text-[11px] font-semibold`}
      style={{
        width: size,
        height: size,
        background: GRADIENT_FALLBACK,
        color: "#29E3FF",
      }}
      aria-label={`${name} logo`}
    >
      {name[0]?.toUpperCase() ?? "•"}
    </div>
  );
}
