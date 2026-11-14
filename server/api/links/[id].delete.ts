import { createError, defineEventHandler, getRouterParam } from "nuxt/server"

// DELETE /api/links/[id] - delete a link from Cloudflare KV
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")
  if (!id) throw createError({ statusCode: 400, message: "Missing link id" })

  // 1. Delete from KV
  await kv.delete(`link:${id}`)

  // 2. Remove from order index
  const order = (await kv.get<string[]>("links:order")) || []
  const newOrder = order.filter((linkId) => linkId !== id)
  await kv.set("links:order", newOrder)

  return { ok: true }
})
