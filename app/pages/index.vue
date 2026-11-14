<script setup lang="ts">
import type { LinkItem } from "#shared/types"

useSeoMeta({
  title: "Links — Cloudflare KV Storage",
  description:
    "Link-in-bio and link management template powered by Nuxt 5, Qarpeo, and Cloudflare KV.",
})

const toast = useToast()

// 1. Fetch all links (ordered)
const {
  data: links,
  refresh,
  pending,
} = await useFetch<LinkItem[]>("/api/links?all=true", {
  default: () => [],
})

const activeTab = ref<"manage" | "preview">("manage")

// Active links for public preview
const activeLinks = computed(() => {
  return (links.value || []).filter((l) => l.active)
})

// Stats
const totalLinks = computed(() => (links.value || []).length)
const activeCount = computed(() => activeLinks.value.length)
const totalClicks = computed(() => {
  return (links.value || []).reduce((acc, l) => acc + (l.clicks || 0), 0)
})

// 2. Modal state for Create / Edit
const isModalOpen = ref(false)
const isSaving = ref(false)
const editingId = ref<string | null>(null)

const form = ref({
  title: "",
  url: "",
  description: "",
  icon: "i-lucide-globe",
  active: true,
})

const iconPresets = [
  "i-lucide-globe",
  "i-lucide-github",
  "i-lucide-twitter",
  "i-lucide-linkedin",
  "i-lucide-youtube",
  "i-lucide-book-open",
  "i-lucide-message-square",
  "i-lucide-mail",
  "i-lucide-sparkles",
  "i-lucide-heart",
]

function openCreateModal() {
  editingId.value = null
  form.value = {
    title: "",
    url: "",
    description: "",
    icon: "i-lucide-globe",
    active: true,
  }
  isModalOpen.value = true
}

function openEditModal(link: LinkItem) {
  editingId.value = link.id
  form.value = {
    title: link.title,
    url: link.url,
    description: link.description || "",
    icon: link.icon || "i-lucide-globe",
    active: link.active,
  }
  isModalOpen.value = true
}

// 3. Save (Create or Update)
async function handleSave() {
  if (!form.value.title.trim() || !form.value.url.trim()) {
    toast.add({
      title: "Validation error",
      description: "Title and URL are required.",
      color: "error",
      icon: "i-lucide-alert-circle",
    })
    return
  }

  isSaving.value = true
  try {
    if (editingId.value) {
      // Update
      await $fetch(`/api/links/${editingId.value}`, {
        method: "PUT",
        body: {
          title: form.value.title.trim(),
          url: form.value.url.trim(),
          description: form.value.description.trim() || null,
          icon: form.value.icon || null,
          active: form.value.active,
        },
      })
      toast.add({
        title: "Link updated",
        description: `"${form.value.title}" has been updated.`,
        color: "success",
        icon: "i-lucide-check-circle",
      })
    } else {
      // Create
      await $fetch("/api/links", {
        method: "POST",
        body: {
          title: form.value.title.trim(),
          url: form.value.url.trim(),
          description: form.value.description.trim() || null,
          icon: form.value.icon || null,
          active: form.value.active,
        },
      })
      toast.add({
        title: "Link created",
        description: `"${form.value.title}" stored in Cloudflare KV.`,
        color: "success",
        icon: "i-lucide-check-circle",
      })
    }

    isModalOpen.value = false
    await refresh()
  } catch (err: any) {
    toast.add({
      title: "Operation failed",
      description: err?.data?.message || err.message,
      color: "error",
      icon: "i-lucide-alert-circle",
    })
  } finally {
    isSaving.value = false
  }
}

// 4. Delete
const deletingId = ref<string | null>(null)
async function handleDelete(id: string, title: string) {
  deletingId.value = id
  try {
    await $fetch(`/api/links/${id}`, { method: "DELETE" })
    toast.add({
      title: "Link deleted",
      description: `"${title}" was removed from database.`,
      icon: "i-lucide-trash-2",
    })
    await refresh()
  } catch (err: any) {
    toast.add({
      title: "Delete failed",
      description: err?.data?.message || err.message,
      color: "error",
      icon: "i-lucide-alert-circle",
    })
  } finally {
    deletingId.value = null
  }
}

// 5. Toggle Active
async function handleToggleActive(link: LinkItem) {
  const newActive = !link.active
  try {
    await $fetch(`/api/links/${link.id}`, {
      method: "PUT",
      body: { active: newActive },
    })
    link.active = newActive
    toast.add({
      title: newActive ? "Link activated" : "Link deactivated",
      description: `"${link.title}" is now ${newActive ? "visible" : "hidden"} on your bio.`,
      color: "info",
      icon: newActive ? "i-lucide-eye" : "i-lucide-eye-off",
    })
  } catch (err: any) {
    toast.add({
      title: "Update failed",
      description: err?.data?.message || err.message,
      color: "error",
    })
  }
}

// 6. Move Up / Move Down Reordering
const isReordering = ref(false)
async function moveLink(index: number, direction: "up" | "down") {
  const targetIndex = direction === "up" ? index - 1 : index + 1
  const list = [...(links.value || [])]

  if (targetIndex < 0 || targetIndex >= list.length) return

  const current = list[index]
  const target = list[targetIndex]
  if (!current || !target) return

  // Swap
  list[index] = target
  list[targetIndex] = current

  // Re-index orders
  const updatedItems = list.map((item, idx) => ({
    id: item.id,
    order: idx,
  }))

  isReordering.value = true
  try {
    await $fetch("/api/links/reorder", {
      method: "PUT",
      body: { items: updatedItems },
    })
    await refresh()
    toast.add({
      title: "Order saved",
      description: "Links order updated in Cloudflare KV.",
      color: "success",
      icon: "i-lucide-arrow-up-down",
    })
  } catch (err: any) {
    toast.add({
      title: "Reorder failed",
      description: err?.data?.message || err.message,
      color: "error",
    })
  } finally {
    isReordering.value = false
  }
}

// 7. Track link click in public view
async function handleLinkClick(link: LinkItem) {
  try {
    $fetch(`/api/links/${link.id}/click`, { method: "POST" })
    link.clicks = (link.clicks || 0) + 1
  } catch {
    // silent fail for telemetry
  }
  window.open(link.url, "_blank", "noopener,noreferrer")
}

// 8. Copy Link URL
async function copyUrl(url: string) {
  try {
    await navigator.clipboard.writeText(url)
    toast.add({
      title: "Copied!",
      description: "Link URL copied to clipboard.",
      color: "info",
      icon: "i-lucide-clipboard-check",
    })
  } catch {
    toast.add({
      title: "Copy failed",
      description: "Could not copy to clipboard.",
      color: "error",
    })
  }
}

// 9. Quick Seed Sample Links if empty
const isSeeding = ref(false)
async function seedSampleLinks() {
  isSeeding.value = true
  const samples = [
    {
      title: "GitHub Profile",
      url: "https://github.com/qarpeo",
      description: "Open-source projects, developer tools, and edge templates",
      icon: "i-lucide-github",
      active: true,
    },
    {
      title: "Qarpeo Documentation",
      url: "https://qarpeo.dev/docs",
      description: "Guides, tutorials, edge primitives, and API reference",
      icon: "i-lucide-book-open",
      active: true,
    },
    {
      title: "Follow on X",
      url: "https://x.com/qarpeo",
      description: "Latest news, updates, announcements, and product releases",
      icon: "i-lucide-twitter",
      active: true,
    },
    {
      title: "Join Discord Community",
      url: "https://discord.gg/qarpeo",
      description: "Connect with edge developers, ask questions, and share builds",
      icon: "i-lucide-message-square",
      active: true,
    },
  ]

  try {
    await $fetch("/api/links", {
      method: "POST",
      body: samples,
    })
    toast.add({
      title: "Sample links created",
      description: "Added 4 starter links to Cloudflare KV.",
      color: "success",
      icon: "i-lucide-sparkles",
    })
    await refresh()
  } catch (err: any) {
    toast.add({
      title: "Seed failed",
      description: err?.data?.message || err.message,
      color: "error",
    })
  } finally {
    isSeeding.value = false
  }
}
</script>

<template>
  <UMain>
    <UContainer class="space-y-8 py-10">
      <!-- Hero / Header -->
      <div class="space-y-3 text-center">
        <div class="inline-flex items-center gap-2">
          <UBadge color="primary" variant="subtle" size="md">
            <UIcon name="i-lucide-zap" class="size-4" />
            Cloudflare KV (Sub-ms Latency)
          </UBadge>
        </div>
        <h1 class="text-4xl font-extrabold tracking-tight sm:text-5xl">Edge Links</h1>
        <p class="text-muted mx-auto max-w-xl text-base">
          A high-performance link-in-bio &amp; link management template with full CRUD, click
          tracking, and ultra-low-latency edge reads powered by Nuxt 5 and Qarpeo KV.
        </p>

        <!-- View Mode Switcher -->
        <div class="flex items-center justify-center pt-2">
          <div class="border-default bg-muted/40 inline-flex rounded-lg border p-1 shadow-sm">
            <UButton
              :variant="activeTab === 'manage' ? 'solid' : 'ghost'"
              :color="activeTab === 'manage' ? 'primary' : 'neutral'"
              icon="i-lucide-sliders"
              label="Manage & CRUD"
              size="sm"
              @click="activeTab = 'manage'"
            />
            <UButton
              :variant="activeTab === 'preview' ? 'solid' : 'ghost'"
              :color="activeTab === 'preview' ? 'primary' : 'neutral'"
              icon="i-lucide-smartphone"
              label="Public Bio View"
              size="sm"
              @click="activeTab = 'preview'"
            />
          </div>
        </div>
      </div>

      <!-- ==================== VIEW 1: MANAGE / CRUD ==================== -->
      <div v-if="activeTab === 'manage'" class="space-y-6">
        <!-- Stats Cards -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <UCard>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-muted text-xs font-medium tracking-wider uppercase">Total Links</p>
                <p class="mt-1 text-2xl font-bold">{{ totalLinks }}</p>
              </div>
              <div
                class="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg"
              >
                <UIcon name="i-lucide-link" class="size-5" />
              </div>
            </div>
          </UCard>

          <UCard>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-muted text-xs font-medium tracking-wider uppercase">Active Links</p>
                <p class="mt-1 text-2xl font-bold">{{ activeCount }}</p>
              </div>
              <div
                class="bg-success/10 text-success flex size-10 items-center justify-center rounded-lg"
              >
                <UIcon name="i-lucide-check-circle" class="size-5" />
              </div>
            </div>
          </UCard>

          <UCard>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-muted text-xs font-medium tracking-wider uppercase">Total Clicks</p>
                <p class="mt-1 text-2xl font-bold">{{ totalClicks }}</p>
              </div>
              <div class="bg-info/10 text-info flex size-10 items-center justify-center rounded-lg">
                <UIcon name="i-lucide-mouse-pointer-click" class="size-5" />
              </div>
            </div>
          </UCard>
        </div>

        <!-- Controls Bar -->
        <div class="border-default flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <div class="flex items-center gap-2">
            <h2 class="text-xl font-bold">Manage Links</h2>
            <UBadge color="neutral" variant="subtle" size="sm">
              {{ totalLinks }}
            </UBadge>
          </div>

          <div class="flex items-center gap-2">
            <UButton
              v-if="totalLinks === 0"
              label="Add Sample Links"
              size="sm"
              variant="soft"
              color="primary"
              icon="i-lucide-sparkles"
              :loading="isSeeding"
              @click="seedSampleLinks()"
            />

            <UButton
              label="Refresh"
              size="sm"
              variant="ghost"
              color="neutral"
              icon="i-lucide-rotate-cw"
              :loading="pending || isReordering"
              @click="refresh()"
            />

            <UButton
              label="Add Link"
              size="sm"
              color="primary"
              icon="i-lucide-plus"
              @click="openCreateModal()"
            />
          </div>
        </div>

        <!-- Empty State -->
        <UEmpty
          v-if="!pending && totalLinks === 0"
          icon="i-lucide-link-2-off"
          title="No links created yet"
          description="Add your first link or load starter links to store them directly in Cloudflare KV."
          variant="subtle"
        >
          <template #actions>
            <div class="flex items-center gap-2">
              <UButton
                label="Add Sample Links"
                color="primary"
                variant="subtle"
                icon="i-lucide-sparkles"
                :loading="isSeeding"
                @click="seedSampleLinks()"
              />
              <UButton
                label="Create New Link"
                color="primary"
                icon="i-lucide-plus"
                @click="openCreateModal()"
              />
            </div>
          </template>
        </UEmpty>

        <!-- Links List (CRUD) -->
        <div v-else class="space-y-3">
          <UCard v-for="(link, index) in links" :key="link.id">
            <div
              class="group flex flex-col justify-between gap-3 transition-all duration-200 sm:flex-row sm:items-center"
              :class="{ 'bg-muted/20 opacity-60': !link.active, 'bg-card': link.active }"
            >
              <!-- Left: Order arrows & link info -->
              <div class="flex items-center gap-3">
                <!-- Reorder buttons -->
                <div class="flex flex-col gap-0.5">
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-chevron-up"
                    :disabled="index === 0 || isReordering"
                    title="Move up"
                    @click="moveLink(index, 'up')"
                  />
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-chevron-down"
                    :disabled="index === totalLinks - 1 || isReordering"
                    title="Move down"
                    @click="moveLink(index, 'down')"
                  />
                </div>

                <!-- Icon badge -->
                <div
                  class="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg text-lg"
                >
                  <UIcon :name="link.icon || 'i-lucide-globe'" class="text-primary size-5" />
                </div>

                <!-- Details -->
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <h3 class="truncate font-semibold">{{ link.title }}</h3>
                    <UBadge :color="link.active ? 'success' : 'neutral'" variant="subtle" size="xs">
                      {{ link.active ? "Active" : "Inactive" }}
                    </UBadge>
                  </div>
                  <div class="text-muted flex items-center gap-2 text-xs">
                    <span class="max-w-xs truncate font-mono">{{ link.url }}</span>
                    <UButton
                      size="xs"
                      variant="link"
                      color="neutral"
                      icon="i-lucide-copy"
                      class="p-0"
                      title="Copy URL"
                      @click="copyUrl(link.url)"
                    />
                  </div>
                  <p v-if="link.description" class="text-muted mt-1 text-xs">
                    {{ link.description }}
                  </p>
                </div>
              </div>

              <!-- Right: Clicks, Active toggle, Actions -->
              <div class="flex items-center justify-between gap-3 sm:justify-end">
                <!-- Clicks badge -->
                <UBadge color="neutral" variant="soft" size="sm" class="flex items-center gap-1">
                  <UIcon name="i-lucide-mouse-pointer-click" class="size-3.5" />
                  <span>{{ link.clicks }} clicks</span>
                </UBadge>

                <!-- Active Toggle -->
                <div class="flex items-center gap-1.5" title="Toggle visibility">
                  <USwitch
                    :model-value="link.active"
                    size="sm"
                    @update:model-value="handleToggleActive(link)"
                  />
                </div>

                <!-- Edit & Delete -->
                <div class="flex items-center gap-1">
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-pencil"
                    title="Edit link"
                    @click="openEditModal(link)"
                  />
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="error"
                    icon="i-lucide-trash-2"
                    title="Delete link"
                    :loading="deletingId === link.id"
                    @click="handleDelete(link.id, link.title)"
                  />
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </div>

      <!-- ==================== VIEW 2: PUBLIC BIO PREVIEW ==================== -->
      <div v-else class="mx-auto max-w-md space-y-6">
        <!-- Profile Card -->
        <div class="space-y-4 text-center">
          <div class="relative mx-auto size-24">
            <div
              class="from-primary to-accent flex size-full items-center justify-center rounded-full bg-linear-to-tr text-white shadow-lg"
            >
              <UIcon name="i-lucide-user" class="size-12" />
            </div>
          </div>

          <div class="space-y-1">
            <h2 class="text-2xl font-bold">@qarpeo</h2>
            <p class="text-muted text-sm">
              Edge Developer · Open Source Contributor · Cloudflare KV
            </p>
          </div>

          <!-- Social Quick Links -->
          <div class="flex items-center justify-center gap-2">
            <UButton
              to="https://github.com/qarpeo"
              target="_blank"
              size="sm"
              variant="ghost"
              color="neutral"
              icon="i-lucide-github"
            />
            <UButton
              to="https://x.com/qarpeo"
              target="_blank"
              size="sm"
              variant="ghost"
              color="neutral"
              icon="i-lucide-twitter"
            />
            <UButton
              to="https://discord.gg/qarpeo"
              target="_blank"
              size="sm"
              variant="ghost"
              color="neutral"
              icon="i-lucide-message-square"
            />
            <UButton
              to="mailto:hello@qarpeo.dev"
              size="sm"
              variant="ghost"
              color="neutral"
              icon="i-lucide-mail"
            />
          </div>
        </div>

        <!-- Links List (Visitor View) -->
        <div class="space-y-3">
          <UEmpty
            v-if="activeLinks.length === 0"
            icon="i-lucide-link-2-off"
            title="No active links"
            description="Switch to the Manage tab to add or activate your links."
            variant="subtle"
          />

          <button
            v-for="link in activeLinks"
            :key="link.id"
            type="button"
            class="border-default bg-card hover:border-primary hover:shadow-primary/5 group relative flex w-full items-center justify-between rounded-xl border p-4 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            @click="handleLinkClick(link)"
          >
            <div class="flex items-center gap-3">
              <div
                class="bg-muted text-primary group-hover:bg-primary flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors group-hover:text-white"
              >
                <UIcon :name="link.icon || 'i-lucide-globe'" class="size-5" />
              </div>
              <div>
                <h4 class="group-hover:text-primary font-semibold transition-colors">
                  {{ link.title }}
                </h4>
                <p v-if="link.description" class="text-muted line-clamp-1 text-xs">
                  {{ link.description }}
                </p>
              </div>
            </div>

            <UIcon
              name="i-lucide-arrow-up-right"
              class="text-muted group-hover:text-primary size-5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </button>
        </div>

        <!-- Footer Notice -->
        <div class="text-muted pt-6 text-center text-xs">
          <div class="inline-flex items-center gap-1.5 font-medium">
            <UIcon name="i-lucide-zap" class="text-primary size-3.5" />
            <span>Edge powered by Cloudflare KV &amp; Qarpeo</span>
          </div>
        </div>
      </div>

      <!-- ==================== CREATE / EDIT MODAL ==================== -->
      <UModal
        v-model:open="isModalOpen"
        :title="editingId ? 'Edit Link' : 'Add New Link'"
        :description="
          editingId ? 'Update your link details' : 'Store a new link directly in Cloudflare KV'
        "
      >
        <template #body>
          <form class="space-y-4" @submit.prevent="handleSave">
            <UFormField label="Title" name="title" required>
              <UInput
                v-model="form.title"
                placeholder="e.g. GitHub Repository"
                class="w-full"
                autofocus
              />
            </UFormField>

            <UFormField label="URL" name="url" required>
              <UInput
                v-model="form.url"
                type="url"
                placeholder="https://github.com/qarpeo"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Description" name="description">
              <UTextarea
                v-model="form.description"
                placeholder="Brief description or subtitle (optional)"
                :rows="2"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Icon" name="icon">
              <div class="space-y-2">
                <UInput v-model="form.icon" placeholder="i-lucide-globe" class="w-full">
                  <template #leading>
                    <UIcon :name="form.icon || 'i-lucide-globe'" class="size-4" />
                  </template>
                </UInput>
                <!-- Quick Icon Selectors -->
                <div class="flex flex-wrap gap-1.5">
                  <UButton
                    v-for="ico in iconPresets"
                    :key="ico"
                    size="xs"
                    :variant="form.icon === ico ? 'solid' : 'ghost'"
                    :color="form.icon === ico ? 'primary' : 'neutral'"
                    :icon="ico"
                    class="size-7 p-0"
                    @click="form.icon = ico"
                  />
                </div>
              </div>
            </UFormField>

            <UFormField label="Visibility">
              <div class="flex items-center justify-between">
                <span class="text-muted text-sm">Show this link on your public bio</span>
                <USwitch v-model="form.active" />
              </div>
            </UFormField>
          </form>
        </template>

        <template #footer>
          <div class="flex w-full items-center justify-end gap-2">
            <UButton label="Cancel" color="neutral" variant="ghost" @click="isModalOpen = false" />
            <UButton
              :label="editingId ? 'Save Changes' : 'Create Link'"
              color="primary"
              :loading="isSaving"
              @click="handleSave"
            />
          </div>
        </template>
      </UModal>
    </UContainer>
  </UMain>
</template>
