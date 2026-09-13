# Big Joe Autos

Next.js rebuild of the Big Joe Autos site: marketing landing page + a live
vehicle inventory backed by a Google Sheet, with individually shareable car
pages and a password-gated CMS for managing stock.

## How it fits together

- **Public site** (`/`, `/inventory`, `/inventory/[slug]`) — reads the Sheet
  as CSV, server-rendered with ISR (revalidates every ~90s), so an edit in
  the Sheet reaches the live site without a redeploy.
- **Every car has its own permalink** (`/inventory/<slug>`) with unique page
  title, description, and preview image — this is what makes a copied link
  show up correctly when pasted into WhatsApp, iMessage, or social media.
- **Admin CMS** (`/admin`) — password-gated, not linked from any public nav
  or menu, excluded from search engines (`robots: noindex`) and
  `robots.txt`. Add/edit/delete a car here and it publishes straight back to
  the Google Sheet.

## ⚠️ Required: the Sheet needs a `Slug` column

This is the single most important setup step. Add a column called **`Slug`**
(or `ID`) to your Google Sheet — this is what each car's permalink is built
from (`/inventory/<slug>`).

**Once you share a car's link, its Slug must never change**, or that link
breaks. Reordering rows, editing other columns, even deleting and re-adding
a row that happens to land in the same position — none of that affects the
Slug, because it's its own column, not derived from row position.

Rules for values in this column:
- Lowercase letters, numbers, and hyphens only (e.g. `toyota-camry-2023`,
  `lexus-rx350-black`). If you type something else, the app will
  lowercase/hyphenate it automatically when it publishes from `/admin`.
- Must be unique per row. Two rows with the same Slug will have the second
  one auto-suffixed (`-2`, `-3`, ...) to stay valid — but don't rely on
  that, just make them unique.
- If a row has no Slug at all, the site still works (it derives one from
  brand+model+year), but that derived slug is **not guaranteed stable** —
  editing the brand or model later would change it and break any link
  already shared. Fill in the Slug for anything you're actively sharing.

## Full column reference

The parser matches header names flexibly (case/spacing-insensitive), but
here's the exact set it understands:

| Column        | Required | Notes                                                              |
|---------------|----------|---------------------------------------------------------------------|
| `Slug`        | strongly recommended | See above. Also accepts header `ID`.                  |
| `Brand`       | yes      | e.g. Toyota                                                        |
| `Model`       | yes      | e.g. Camry                                                         |
| `Year`        | no       | Defaults to current year if blank                                  |
| `Price`       | no       | Accepts `18500000`, `18,500,000`, `18.5M`, or bare `36` (read as ₦36,000,000) |
| `Condition`   | no       | e.g. Nigerian Used, Foreign Used, New                              |
| `BodyType`    | no       | e.g. Sedan, SUV, Coupe                                             |
| `Transmission`| no       | e.g. Automatic, Manual                                             |
| `Mileage`     | no       | In km, digits only                                                 |
| `Color`       | no       |                                                                     |
| `Engine`      | no       | e.g. 2.5L                                                          |
| `FuelType`    | no       | e.g. Petrol, Diesel                                                |
| `Location`    | no       |                                                                     |
| `Images`      | no       | One or more URLs separated by \| or , . First image is the cover.  |
| `Description` | no       |                                                                     |
| `isAvailable` | no       | Yes/No (also accepts true/false, 1/0, sold/active) — defaults to available if blank |

## Images: how they're served, and why this is fast

**Upload photos through `/admin` instead of pasting links.** The CMS now has
a real "Upload photos" button (Vercel Blob storage) on every car — this is
the fix for slow-loading photos, not a workaround. Three reasons uploaded
photos load faster than pasted links ever will:

1. **Vercel Blob is a real CDN** — every photo is served from edge
   locations close to the visitor, the same infrastructure the rest of the
   site runs on. A link pasted from a random news site's CDN, a WordPress
   media library, or Google Drive has none of those guarantees — Drive
   especially is not built to be hotlinked and is often the slowest option.
2. **Every photo still goes through `next/image`** on top of that — resized
   to exactly what the visitor's screen needs, served as AVIF/WebP,
   automatically lazy-loaded except where marked `priority` (the first
   photo above the fold on the homepage, the catalog's first few cards, and
   a car's own cover photo on its detail page).
3. **One less place things can break.** A pasted link depends on some other
   website keeping that file at that URL forever. An uploaded photo is
   yours — nothing else can move it or take it down.

Pasting a URL still works (there's a "paste image URLs instead" fallback in
the form) for cases like reusing a manufacturer's press photo — but for
your own vehicle photos, upload them.

**Setup**: Vercel dashboard → your project → Storage → Create Database →
Blob. Once connected, `BLOB_READ_WRITE_TOKEN` is injected automatically —
nothing else to configure. See `.env.example` for local development.

## Domain / share links — you don't need to wait for a .com

Share links, WhatsApp previews, and the sitemap all use whatever
`NEXT_PUBLIC_SITE_URL` resolves to. If you haven't set it, the app
automatically uses **your Vercel production deployment's own stable URL**
(`your-project.vercel.app`) instead of a placeholder — so copied links work
correctly from the day you first deploy, not just after buying a domain.

When you do get a `.com`: set `NEXT_PUBLIC_SITE_URL` in Vercel's project
settings and add the domain under Project → Domains. Nothing else in the
code needs to change.

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

- `GOOGLE_SHEET_URL` — your Sheet's normal browser URL, shared as "Anyone
  with the link — Viewer"
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` — a
  Google Cloud service account with **Editor** access to the Sheet (needed
  for `/admin` to publish changes). Create one at
  console.cloud.google.com → IAM & Admin → Service Accounts → Keys → Create
  new key (JSON) → enable the Google Sheets API for the project → share the
  Sheet with the service account's email address as an Editor.
- `ADMIN_PASSWORD` — the password for `/admin`
- `ADMIN_SESSION_SECRET` — any long random string, e.g. `openssl rand -hex 32`
- `NEXT_PUBLIC_SITE_URL` — your real deployed domain once you have one
  (used to build absolute permalinks for share links and social previews)
- `NEXT_PUBLIC_WHATSAPP_NUMBER` / `NEXT_PUBLIC_PHONE_DISPLAY` — dealer contact

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in the values above
npm run dev
```

## Deploying

Built for Vercel (the `googleapis` write-back and HMAC auth in
`/app/api/*` are plain Next.js Route Handlers, so any Node host works, but
Vercel is the zero-config path). Push to a repo, import it in Vercel, add
the environment variables above in Project Settings, deploy.

## Notable design decisions (so future-you doesn't "fix" these back to bugs)

- **Filters and pagination live in the URL** (`/inventory?brand=Toyota&page=2`),
  not client state — this is what makes a filtered view itself a real,
  shareable, bookmarkable link, and it means filtering works even with
  JavaScript disabled.
- **`next.config.ts` allows any HTTPS image host** (`hostname: '**'`). This
  is intentional, not an oversight: the Sheet is the only source of image
  URLs, and only the password-gated `/admin` (or direct Sheet edits) can
  add one — it's not public user input.
- **No mock/fallback data.** If the Sheet is unreachable or misconfigured,
  the site shows a plain "temporarily unavailable" message instead of fake
  cars. Don't reintroduce a mock-data fallback for the public site — it
  would silently show fake inventory to real customers.
