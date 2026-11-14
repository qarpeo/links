import { createError, defineEventHandler, readBody } from "nuxt/server"

// POST /api/links - create single or batch links in Cloudflare KV
export default defineEventHandler(async (event) => {
  const rawBody = await readBody<CreateLinkBody | CreateLinkBody[]>(event)

  const items = Array.isArray(rawBody) ? rawBody : [rawBody]

  if (items.length === 0) {
    throw createError({ statusCode: 400, message: "Request body cannot be empty" })
  }

  const now = Date.now()
  const createdLinks: LinkItem[] = []

  for (const item of items) {
    if (!item?.title || typeof item.title !== "string" || !item.title.trim()) {
      throw createError({ statusCode: 400, message: "Title is required" })
    }
    if (!item?.url || typeof item.url !== "string" || !item.url.trim()) {
      throw createError({ statusCode: 400, message: "URL is required" })
    }

    const id = crypto.randomUUID()
    createdLinks.push({
      id,
      title: item.title.trim().slice(0, 200),
      url: item.url.trim(),
      description:
        typeof item.description === "string" && item.description.trim()
          ? item.description.trim().slice(0, 500)
          : null,
      icon:
        typeof item.icon === "string" && item.icon.trim() ? item.icon.trim().slice(0, 100) : null,
      active: item.active !== false,
      clicks: 0,
      createdAt: now,
      updatedAt: now,
    })
  }

  // 1. Store all link items concurrently in Cloudflare KV
  await Promise.all(createdLinks.map((link) => kv.set(`link:${link.id}`, link)))

  // 2. Append new IDs to the ordered list
  const order = (await kv.get<string[]>("links:order")) || []
  for (const link of createdLinks) {
    if (!order.includes(link.id)) {
      order.push(link.id)
    }
  }
  await kv.set("links:order", order)

  return Array.isArray(rawBody) ? createdLinks : createdLinks[0]
})
