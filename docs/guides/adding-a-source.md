---
sidebar_position: 4
title: Adding a Source
---

# Adding a Source

Walk through the canonical steps for wiring a new external upstream.

## 1. Add the host to the allowlist

```ts title="lib/stellar/security-headers.ts"
export const EXTERNAL_HOSTS = new Set([
  "api.llama.fi",
  "yields.llama.fi",
  "horizon.stellar.org",
  "api.stellar.expert",
  "api.coingecko.com",
  "soroban-rpc.mainnet.stellar.gateway.fm",
+ "api.your-new-source.com",
]);
```

## 2. Extend the CSP `connect-src`

```ts title="proxy.ts"
const CSP_CONNECT_SRC = [
  "'self'",
  "https://api.llama.fi",
  // …
+ "https://api.your-new-source.com",
];
```

`scripts/security-check.ts` will fail loudly if you skip this step.

## 3. Create the adapter

```ts title="lib/stellar/your-source.ts"
import { z } from "zod";
import { NumericString } from "./schemas";

const ResponseSchema = z.object({
  result: z.array(z.object({
    id: z.string(),
    value: NumericString,
  })),
});

export async function fetchYourThing(): Promise<YourThing[]> {
  const res = await fetch("https://api.your-new-source.com/v1/things", {
    next: { revalidate: 60, tags: ["your-source:things"] },
  });
  if (!res.ok) throw new Error(`your-source 1xx ${res.status}`);
  const body = ResponseSchema.parse(await res.json());
  return body.result.map((r) => ({ id: r.id, value: Number(r.value) }));
}
```

Rules:

- One file per upstream URL — no other module may call `your-new-source.com`.
- Zod-parse before returning.
- Throw on non-2xx with a tagged message like `your-source <endpoint> <status>`.
- Set `next: { revalidate, tags }` on every `fetch`.

## 4. Add the type

```ts title="lib/types.ts"
export interface YourThing {
  id: string;
  value: number;
}

export type DataSource =
  | "defillama"
  | "horizon"
  // …
+ | "your-source";
```

Also update the `SOURCE_LABEL` map in `components/ui/source-badge.tsx`:

```ts
const SOURCE_LABEL: Record<DataSource, string> = {
  defillama: "DefiLlama",
  // …
+ "your-source": "Your Source",
};
```

## 5. Wrap with `withFallback` in the aggregator

```ts title="lib/stellar/index.ts"
import { fetchYourThing } from "./your-source";
import { withFallback } from "./fallback";
import { mockYourThings } from "../mock-data";

export async function getYourThings(): Promise<YourThing[]> {
  "use cache";
  cacheLife("market");
  cacheTag("your-things");
  return withFallback(fetchYourThing, mockYourThings, "your-things");
}
```

Pick the cache profile that matches freshness:

- `market` — minute-level
- `tvl` — 5-min level
- `directory` — hour-level

## 6. Add the tag to the revalidate allowlist

```ts title="lib/stellar/revalidate-auth.ts"
const ALLOWED_TAGS = new Set([
  "tvl",
  "protocols",
  // …
+ "your-things",
]);
```

## 7. Add a health probe

```ts title="lib/stellar/health.ts"
import { fetchYourThing } from "./your-source";

const probes = [
  // …
+ { name: "your-source-things", run: () => fetchYourThing() },
];
```

## 8. Write tests

```
tests/adapters/your-source.test.ts
```

Minimum four tests (see [Guides → Testing](./testing)):

1. Happy path with **real-shape** fixture
2. Parse failure
3. Non-2xx error
4. At least one edge / regression test

## 9. Wire it into a page

```tsx title="app/dashboard/your-page/page.tsx"
import { getYourThings } from "@/lib/stellar";
import { SourceBadge } from "@/components/ui/source-badge";

export default async function YourPage() {
  const things = await getYourThings();
  return (
    <ul>
      {things.map((t) => (
        <li key={t.id}>
          {t.id}: {t.value}
          <SourceBadge source="your-source" verified={!!things.length} compact />
        </li>
      ))}
    </ul>
  );
}
```

## 10. Verify

```bash
npm run security-check    # asserts EXTERNAL_HOSTS / CSP / fetch host
npm test                  # all adapter tests pass
npm run build             # page builds, cache profile correct
curl http://localhost:3000/api/health/sources | jq  # new probe present
```

If anything fails, fix it before merging.
