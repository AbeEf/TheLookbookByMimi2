# The Lookbook by Mimi

A mobile-first, multi-page fashion lookbook site built in **plain HTML, CSS, and vanilla JavaScript**.  
It renders products and moodboards using a single shared card system, auto-discovers an OpenAPI spec at runtime,  
and supports local mock data for offline/demo mode.

---

## 🌟 Features

- **Responsive UI** – Mobile-first, scales to desktop
- **Shared header/footer** – Sticky header with mobile drawer, desktop nav, favorites badge
- **Card system** – Products & moodboards share the same visual layout
- **Favorites** – LocalStorage-based with badge sync across tabs
- **Product detail** – Gallery with thumbnails, related products from API/DB
- **Moodboard detail** – Hero section + product grid
- **Products list** – Filters, debounced search, brand/tag/price filters, grid/list toggle, local infinite scroll
- **Mock mode** – Run with `?mock=1` query to load from `/mock/*.json` files
- **Accessibility** – ARIA roles, focus management, focus-visible states
- **Performance** – Lazy images, `aspect-ratio` for CLS prevention, debounced input

---

## 📂 File Structure

----------------------

# The Lookbook by Mimi

Mobile-first, multi-page static site with a shared header/footer, one unified **List Card** pattern for products and moodboards, and a tiny API client that auto-discovers OpenAPI/Swagger at runtime.

## Quick Start

```bash
# serve any static way you like; e.g.:
npx serve .
# or
python3 -m http.server 8080

Open:

Public: http://localhost:3000/index.html (or your port)

Admin: http://localhost:3000/admin/auth.html


Mock Mode

Append ?mock=1 to any public URL to use local JSON:

/index.html?mock=1

/products.html?mock=1

/moodboards.html?mock=1

/product.html?id=p001&mock=1


Mock files live in /mock. You can edit them freely.

Structure

/css           # shared + component + page/module styles
/js            # env, swagger, http, apiClient, nav, utils, storage + page scripts
/admin         # admin dashboard, auth, css + js modules
/mock          # local JSON data (if ?mock=1)
/vendor        # third party libs (html2canvas included for future builder)

Brand Tokens (CSS variables)

:root{
  --color-background:#F9F7F4;
  --color-surface:#FFFFFF;
  --color-text:#1F2937;
  --color-muted:#6B7280;
  --color-accent:#2E5AAC;
  --radius:16px;
  --shadow:0 6px 18px rgba(31,41,55,0.08);
}

Accessibility & Performance

All interactive controls show :focus-visible

Drawer has role="dialog" + focus trap; ESC closes

Debounced search inputs (300ms)

Lazy-loaded images with aspect-ratio to prevent CLS

Skeleton placeholders for lists; spinners optional on details

Lighthouse targets: A11y ≥ 90, Perf ≥ 85 (local assets help)


API Discovery

On load, the client tries:

1. ${API_BASE_URL}/swagger.json


2. ${API_BASE_URL}/swagger/v1/swagger.json



Endpoints used (public):

/public/products

/public/products/{id}

/public/moodboards

/public/moodboards/{id}

/public/moodboards/{id}/products

/public/products/{id}/related (if available)


Admin (guarded by token; feature-detected):

/admin/products, /admin/products/{id}

/admin/moodboards, /admin/moodboards/{id}

/admin/users (optional)

Bulk endpoints if present; else per-ID PATCH fallback.


Admin

Auth: /admin/auth.html (Login/Forgot/Reset)

Guard: /admin/js/admin-guard.js redirects to auth if no token

Dashboard: /admin/index.html has tabs for Users, Products, Moodboards

Products:

Full list with local windowed rendering

Analytics columns auto-appear only if present (views, favoritesCount, clickThroughs, updatedAt)

Bulk ops on existing fields only (badges, price, brand, delete*)

Create/Update dialog


Moodboards: list + create/update dialog

Users: list + create/update (basic)


* Delete depends on your API supporting DELETE /admin/products/{id}.

Public “Edit” (Admin only)

When a token exists in localStorage["token"], you can expose an Edit button on /product.html to jump into Admin.
Easiest path is to link to: /admin/index.html?editProduct=<id> and have admin open the dialog automatically (admin script supports reading query params).

Environment

Set API base in /js/env.js:

export const API_BASE_URL = "https://YOUR_API";

Notes

No frameworks; plain HTML/CSS/JS (ES modules).

No bundlers; paths are relative and static-host friendly.

Images/brand SVGs are excluded in this repo snapshot—swap in your own.

