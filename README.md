# Links

Minimal edge link-in-bio and link management template for **Nuxt 5**, **Nuxt UI**, and **Cloudflare KV** with zero authentication dependencies.

Powered by [Qarpeo](https://qarpeo.com).

## Features

- **Cloudflare KV**: Ultra-low-latency distributed key-value storage at the edge.
- **Full CRUD Operations**: Create, read, update, delete, reorder, and toggle link visibility.
- **Click Tracking**: Edge-native click counting and analytics per link directly in KV.
- **Live Bio Preview**: Sleek mobile-friendly link-in-bio view for visitors.
- **Management Dashboard**: Instant link reordering (up/down), active toggles, quick icon selection, and stats cards.
- **Zero Auth Setup**: Fully functional out of the box with zero OAuth or database credentials required.

## Quick Start

### 1. Install dependencies

```bash
vp i
```

### 2. Start Development Server

```bash
vpr dev
```

Miniflare 4 automatically emulates Cloudflare KV locally in `.wrangler/state/v3` with zero credentials needed.

### 3. Deploy to Cloudflare Workers

```bash
vpx qp deploy
```

`qp deploy` automatically builds Nuxt, provisions the remote Cloudflare KV namespace on your Cloudflare account, and activates the Worker.
