import pkg from "./package.json" with { type: "json" }

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2026-10-10",
  css: ["~/assets/css/main.css"],

  devtools: { enabled: true, timeline: { enabled: true } },

  modules: ["@nuxt/ui", "qarpeo"],

  // Enable Cloudflare edge primitives:
  qarpeo: {
    workerName: "links",
    kv: true, // Cloudflare KV distributed key-value storage
  },

  runtimeConfig: { public: { version: pkg.version } },
  vue: { vapor: true },
})
