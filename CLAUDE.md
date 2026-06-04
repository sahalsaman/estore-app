@AGENTS.md

# order.store — B2B wholesale ordering

A multi-tenant B2B storefront. Vendors (wholesalers / dealers) get a public per-shop storefront; buyers (retailers / customers) order with just a phone number — no signup. Orders and payment collections live in MongoDB, scoped per vendor. There is no Google Sheets integration anywhere (it was ripped out — don't reintroduce it).

## Three roles

- **admin** — platform-wide read access. Sees businesses, vendors, buyers across the system. Does not manage products/orders.
- **vendor** — runs one Business. Manages their own products, orders, payment collections, buyer invites. Has a public storefront at `/store/[slug]`.
- **buyer** — anonymous-ish. Identified by mobile number. Created (or upserted) at checkout from name + phone. No password. No login flow for buyers.

A `User` has a `role`. Vendors also have a `Vendor` row linking them to a `Business`; buyers also have a `Buyer` row holding their address.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · MongoDB + Mongoose · Tailwind 4 · shadcn-style UI primitives (in `components/ui`) · React Hook Form + Zod · jose (JWT) + bcryptjs · Sonner toasts · Lucide icons · Recharts (admin dashboard).

## Middleware is `proxy.ts` (not `middleware.ts`)

This Next.js version renamed the middleware convention. The file lives at the repo root as `proxy.ts` with `export default async function proxy(req)` and a matcher config. It enforces session-based role routing: signed-in users are redirected away from `/login`/`/signup`; `/admin` requires `role === "admin"`; `/vendor` requires `role === "vendor"`. If you need to add route guards, do it here, not in a `middleware.ts`.

## Folder layout (what goes where)

```
app/
  (auth)/login, /signup          — public auth pages
  admin/…                         — admin dashboard (role: admin)
  vendor/…                        — vendor dashboard (role: vendor)
  store/                          — PUBLIC storefront
    page.tsx                      — directory of stores
    [slug]/                       — one vendor's shop
  api/                            — utility routes (seed-admin, migrate-slugs)
actions/                          — "use server" entry points (Zod-validated)
services/                         — server-only DB access; returns DTOs
models/                           — Mongoose schemas + IXxx interfaces
lib/                              — db.ts, session.ts, dal.ts, slug.ts, store-resolver.ts, utils.ts
components/shared/                — layout pieces shared across role dashboards
components/ui/                    — shadcn-style primitives
types/                            — cross-cutting TS types (CartItem, UserRole, ActionResult)
proxy.ts                          — middleware (see note above)
```

## Domain model

| Model | Purpose |
| --- | --- |
| `User` | Login identity. `role` is `admin` / `vendor` / `buyer`. Phone or email unique (sparse). |
| `Business` | A vendor's shop. Has a unique URL `slug` (used at `/store/[slug]`). |
| `Vendor` | Joins a User (owner) to a Business. Has `status` (active/disabled). |
| `Buyer` | Profile row for buyer Users — address only. |
| `Product` | Scoped by `vendorId` + `businessId`. Has MRP (`price`), `wholesalePrice`, `stock`, `status`. |
| `Order` | Embedded items `[{ productId, name, price, quantity }]` + `totalQuantity`, `totalAmount`, `paymentStatus`, `orderStatus`, `buyerId?`, denormalized `buyerName`/`buyerPhone`. |
| `PaymentCollection` | Vendor-recorded payment from a buyer. No order link by design — just amount + method + date + reference. |
| `BuyerInvite` | Vendor invites a buyer manually. Unique on `(vendorId, buyerPhone)`. Used to surface "Invited but never ordered" buyers in the vendor's list. |

**Denormalization:** Orders and PaymentCollections store `buyerName` and `buyerPhone` directly. The phone is the stable identifier — the buyer's display name on a historical record stays as it was at write time.

## The vendor-scoping rule (security-critical)

Every service function that touches `Product`, `Order`, `PaymentCollection`, or `BuyerInvite` **must include `vendorId` in the query**. Never trust a path param as the only filter. Pattern in actions:

```ts
const session = await requireRole("vendor");
await connectDB();
const vendor = await Vendor.findOne({ userId: session.userId }).select("_id").lean();
// use vendor._id to scope every subsequent query/update
```

The session's `userId` is the trust root. `Vendor._id` is derived from it on every request. Do not store vendor id in a cookie / form field as authority.

## Services (`services/*`)

- Start with `import "server-only";` — these never run on the client.
- Always call `connectDB()` first.
- Return **DTOs**, not Mongoose docs. DTOs have `id: string` (not `_id: ObjectId`), ISO date strings, and only the fields the UI needs. `toDTO(doc)` is the convention.
- Wrap pure reads in React `cache()` from `"react"` when the same lookup may run twice in one request (layout + page, multiple tabs). Examples: `listPaymentCollections`, `listVendorBuyers`, `resolveStoreBySlug`.
- Functions take `vendorId: Types.ObjectId | string` so callers can pass either a Mongoose `_id` or its `.toString()`.

## Actions (`actions/*`)

- Start with `"use server";`.
- Validate every form input with Zod; return `{ fieldErrors }` on failure, matched to input names so the client form can highlight them.
- Server-action shape for `useActionState`: `(prev, formData) => state`. For bound parameters (e.g. an id), prepend them: `(id, prev, formData)` then bind in the page with `action.bind(null, id)`.
- After a successful mutation, call `revalidatePath(...)` for every page that could show the changed data; then either `redirect()` or return `{ ok: true, ... }`.
- Direct (non-form) actions (e.g. `updateOrderItemsAction(orderId, updates)`) are called from client components via `useTransition`.

## Auth flow

- `lib/session.ts` — issues/reads a JWT (`jose`) in an httpOnly cookie named `wh_session`. Payload: `userId`, `role`, `businessId`, `name`, `expiresAt`. 7-day expiry.
- `lib/dal.ts` — `verifySession()`, `requireRole(...roles)`, `getOptionalSession()`. All `cache()`-wrapped. Call `requireRole("vendor")` at the top of every vendor server component / action.
- Passwords (admin + vendor) hashed with `bcryptjs`. Buyers have **no password** — they're identified by phone alone.

## Storefront flow (`/store/[slug]`)

1. `lib/store-resolver.ts#resolveStoreBySlug(slug)` returns the active Business + Vendor (cached per request). It calls `notFound()` if either is missing/disabled.
2. Cart lives in a cookie (`wh_cart`) — `{ vendorId, items: CartItem[] }`. Switching to a different store **clears the cart** (single-vendor cart by design).
3. Checkout (`placeOrderAction`) re-validates every cart item against fresh product data, upserts a `User { role: "buyer" }` by phone, ensures a `Buyer` profile, creates the `Order`, then best-effort `decrementStocks`.
4. Stock is decremented with a conditional `$inc` (`stock: { $gte: amount }`) so it can't go negative. The vendor-side order item editor uses the same pattern — and rolls back partial decrements if any product runs out.

## UI conventions

- **Server-first.** Pages are async server components that fetch via services. Client components (`"use client"`) only exist for interactivity (forms, toggles, tabs, optimistic UI). Suffix client files with a hint (`-form.tsx`, `-button.tsx`, `-editor.tsx`).
- **Master-detail layouts.** Used for `/business/buyers/[phone]/` and `/business/collections/[id]/`. The `layout.tsx` for the detail route renders a sidebar list (hidden on mobile via `hidden lg:block`) + the content slot. The index route stays full-width.
- **Search via `?q=`.** Server-side filter, no client-side magic. Use the shared `<ListSearch action="…">` component for consistent UX. Pages already paginate naively (small datasets per vendor).
- **Tabs via `?tab=`.** See `/business/buyers/[phone]` — links flip the query param; the page conditionally renders the tab body. Deep-linkable and bookmarkable.
- **Forms.** Built on `useActionState`. Show field errors inline; show a single `state.error` line above the submit button. Disable the button while `pending`.
- **Money / dates.** Use `formatCurrency` (INR, en-IN) and `formatDate` (en-IN) from `lib/utils.ts`. Never call `Intl.NumberFormat` ad hoc.
- **Toasts.** Use Sonner via `import { toast } from "sonner"`. The `<Toaster>` lives in the root layout.

## Locale / domain assumptions

- **Currency: INR.** Hard-coded in `formatCurrency`. If you add international support, plumb through there.
- **Phone numbers.** Stored verbatim. The WhatsApp helper (`invite-form.tsx#buildWhatsappUrl`) assumes Indian numbers — it prepends `91` to a bare 10-digit number, otherwise passes through.
- **"Buyer = phone number"** is a foundational assumption. The `User` collection has a sparse unique index on `phone`, and orders/collections key off `buyerPhone`. Don't break this without a migration plan.

## Common pitfalls

1. **Forgetting `vendorId` on a query.** Tenant leak. The compiler can't catch this; reviewing services for stray `Order.findOne({ _id: orderId })` (no `vendorId`) is the only safety net.
2. **Reading `state` after a `redirect()` in an action.** `redirect()` throws — anything after it doesn't run. Put the redirect last.
3. **Using `_id` instead of `id` on the client.** Services convert to string `id`. Don't pass Mongoose docs to client components.
4. **Reintroducing Google Sheets.** It used to exist; it's gone. The `googleapis` dependency was uninstalled. Don't add it back.
5. **Modifying `AGENTS.md`.** It's wrapped in `BEGIN:`/`END:nextjs-agent-rules` markers and auto-managed. Put new agent guidance here in CLAUDE.md instead.
6. **Assuming Next.js conventions match training data.** This Next version has breaking changes (e.g. `proxy.ts` instead of `middleware.ts`, `params`/`searchParams` are Promises). When in doubt, check `node_modules/next/dist/docs/`.

## Environment

`.env.local`:
- `MONGODB_URI` — Mongo connection string (database is part of the URI).
- `SESSION_SECRET` — JWT signing secret. Change before deploying.
- `NODE_ENV` — affects cookie `secure` flag.

`npm run dev` starts the Next dev server with Turbopack. `npm run build` runs typecheck + production build. `npm run lint` runs ESLint.

## Seeding

- `GET /api/seed-admin?email=…&password=…&name=…` — bootstraps the first admin user. Refuses (409) if any admin already exists. Defaults: `admin@order.store` / `admin1234`.
- `GET /api/migrate-slugs` — backfills `slug` on `Business` rows that were created before slugs were a thing.

Both are HTTP routes — protect or remove before production.
