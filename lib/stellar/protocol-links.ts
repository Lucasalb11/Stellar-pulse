import { z } from "zod";
import seedData from "@/data/protocol-links.json";

const HttpsUrl = z
  .string()
  .url()
  .refine((u) => u.startsWith("https://"), "url must be https://")
  .refine((u) => !/^https?:\/\/[^/]*@/.test(u), "url may not contain userinfo '@'")
  .refine((u) => !/^javascript:/i.test(u), "javascript: is forbidden")
  .refine((u) => !/^data:/i.test(u), "data: is forbidden");

const KebabSlug = z
  .string()
  .regex(/^[a-z0-9-]+$/, "slug must be kebab-case [a-z0-9-]");

const AuditEntry = z.object({
  firm: z.string().min(1),
  url: HttpsUrl,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
});

export const ProtocolLinksSchema = z.object({
  slug: KebabSlug,
  aliases: z.array(KebabSlug).default([]),
  name: z.string().min(1),
  category: z.string().min(1).optional(),
  homepage: HttpsUrl,
  app: HttpsUrl.optional(),
  docs: HttpsUrl.optional(),
  twitter: HttpsUrl.optional(),
  github: HttpsUrl.optional(),
  logoUrl: HttpsUrl.optional(),
  audits: z.array(AuditEntry),
  verifiedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  verifiedBy: z.string().min(1),
});

export type ProtocolLinks = z.infer<typeof ProtocolLinksSchema>;

const RegistrySchema = z.array(ProtocolLinksSchema);

export function parseProtocolLinks(raw: unknown): ProtocolLinks[] {
  const parsed = RegistrySchema.parse(raw);
  const seen = new Set<string>();
  for (const entry of parsed) {
    if (seen.has(entry.slug)) {
      throw new Error(`protocol-link registry collision for slug ${entry.slug}`);
    }
    seen.add(entry.slug);
    for (const alias of entry.aliases) {
      if (alias === entry.slug) {
        throw new Error(`protocol-link alias must differ from slug: ${alias}`);
      }
      if (seen.has(alias)) {
        throw new Error(`protocol-link registry collision for alias ${alias}`);
      }
      seen.add(alias);
    }
  }
  return parsed;
}

const REGISTRY: Map<string, ProtocolLinks> = (() => {
  const list = parseProtocolLinks(seedData);
  const map = new Map<string, ProtocolLinks>();
  for (const entry of list) {
    map.set(entry.slug, entry);
    for (const alias of entry.aliases) {
      map.set(alias, entry);
    }
  }
  return map;
})();

export function getLinks(slug: string): ProtocolLinks | null {
  if (typeof slug !== "string" || slug.length === 0) return null;
  return REGISTRY.get(slug) ?? null;
}

export function listProtocolLinks(): ProtocolLinks[] {
  const seen = new Set<string>();
  const out: ProtocolLinks[] = [];
  for (const entry of REGISTRY.values()) {
    if (seen.has(entry.slug)) continue;
    seen.add(entry.slug);
    out.push(entry);
  }
  return out;
}
