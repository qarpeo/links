import { createError, defineEventHandler, getRouterParam, readBody } from "nuxt/server"

// PUT /api/links/[id] - update a link in Cloudflare KV
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")
  if (!id) throw createError({ statusCode: 400, message: "Missing link id" })

  const existing = await kv.get<LinkItem>(`link:${id}`)
  if (!existing) throw createError({ statusCode: 404, message: "Link not found in KV" })

  const body = await readBody<UpdateLinkBody>(event)
  if (!body || typeof body !== "object") {
    throw createError({ statusCode: 400, message: "Invalid request body" })
  }

  const updated: LinkItem = {
    ...existing,
    updatedAt: Date.now(),
  }

  if (typeof body.title === "string") {
    updated.title = body.title.trim().slice(0, 200)
  }
  if (typeof body.url === "string") {
    updated.url = body.url.trim()
  }
  if (body.description !== undefined) {
    updated.description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim().slice(0, 500)
        : null
  }
  if (body.icon !== undefined) {
    updated.icon =
      typeof body.icon === "string" && body.icon.trim() ? body.icon.trim().slice(0, 100) : null
  }
  if (typeof body.active === "boolean") {
    updated.active = body.active
  }

  await kv.set(`link:${id}`, updated)
  return updated
})
