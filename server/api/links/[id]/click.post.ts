import { createError, defineEventHandler, getRouterParam } from "nuxt/server"

// POST /api/links/[id]/click - increment click counter in Cloudflare KV
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")
  if (!id) throw createError({ statusCode: 400, message: "Missing link id" })

  const link = await kv.get<LinkItem>(`link:${id}`)
  if (!link) throw createError({ statusCode: 404, message: "Link not found in KV" })

  link.clicks = (link.clicks || 0) + 1
  link.updatedAt = Date.now()

  await kv.set(`link:${id}`, link)

  return { clicks: link.clicks }
})
