<script setup lang="ts">
// App Header
</script>

<template>
  <UHeader title="Links">
    <template #left>
      <NuxtLink to="/" class="flex items-center gap-2 text-lg font-bold">
        <UIcon name="i-lucide-link-2" class="text-primary size-5" />
        <span>Links</span>
        <UBadge color="primary" variant="subtle" size="xs">Cloudflare KV</UBadge>
      </NuxtLink>
    </template>
    <template #right>
      <UButton
        to="https://github.com/qarpeo"
        target="_blank"
        color="neutral"
        variant="ghost"
        icon="i-lucide-github"
        aria-label="GitHub"
      />
      <UColorModeButton />
    </template>
  </UHeader>
</template>
