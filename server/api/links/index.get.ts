import { defineEventHandler, getQuery } from "nuxt/server"

// GET /api/links - fetch links from Cloudflare KV
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const showAll = query.all === "true" || query.all === "1"

  // 1. Discover all link keys present in Cloudflare KV
  const allKeys = await kv.keys("link:")
  const allIds = allKeys.map((k) => k.replace(/^link:/, ""))

  // 2. Read saved custom order
  const savedOrder = (await kv.get<string[]>("links:order")) || []
  const savedSet = new Set(savedOrder)

  // Merge: preserved order first, followed by any discovered keys not yet indexed
  const effectiveOrder = [
    ...savedOrder.filter((id) => allIds.includes(id)),
    ...allIds.filter((id) => !savedSet.has(id)),
  ]

  // Self-heal: keep links:order in sync with actual KV keys
  if (
    effectiveOrder.length !== savedOrder.length ||
    effectiveOrder.some((id, idx) => id !== savedOrder[idx])
  ) {
    await kv.set("links:order", effectiveOrder)
  }

  // 3. Fetch all link items concurrently from KV
  const items = await Promise.all(effectiveOrder.map((id) => kv.get<LinkItem>(`link:${id}`)))
  const validLinks = items.filter((item: LinkItem | null): item is LinkItem =>
    Boolean(item && item.id),
  )

  if (showAll) {
    return validLinks
  }

  return validLinks.filter((l: LinkItem) => l.active !== false)
})
