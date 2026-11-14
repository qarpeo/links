import { createError, defineEventHandler, readBody } from "nuxt/server"

// PUT /api/links/reorder - save link ordering in Cloudflare KV
export default defineEventHandler(async (event) => {
  const body = await readBody<ReorderBody>(event)

  if (!body?.items || !Array.isArray(body.items)) {
    throw createError({ statusCode: 400, message: "items array is required" })
  }

  // Sort by order ascending and extract IDs
  const sortedIds = [...body.items].sort((a, b) => a.order - b.order).map((item) => item.id)

  await kv.set("links:order", sortedIds)

  return { ok: true, count: sortedIds.length }
})
