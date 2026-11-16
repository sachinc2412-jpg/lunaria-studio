# Lunaria Client Desk

Independent Next.js application for the CMS. Deploy this directory as the root of the lunaria-cms Vercel project. The marketing website remains at the repository root.

Run `npm ci` and `npm run build`. Data and admin access use the existing Supabase project. Only its publishable configuration is included; passwords and privileged keys are never stored in this repository.

## Sales workspace

Pipeline supports follow-ups, contact history, won/lost tracking and idempotent conversion to a client. Quotation records contain recipient snapshots, scope, line items, discounts, optional tax, installments and editable terms. Sent and accepted states are manual; expiration is calculated from validity. PDF generation runs on demand in the browser using the bundled font and logo.

Run `npm test` for sales calculations and validation. The additive database deployment is recorded in `sql/sales-and-quotations.sql`. Existing RLS and admin checks are retained.

Quotation PDFs retain the reference cover and two studio-profile pages verbatim. Variable pages use the original orange section banners, recipient block and pricing hierarchy. All twelve reference terms are prefilled; existing quotes using the previous abbreviated defaults receive the full defaults on opening/export. Custom terms are preserved. The bundled reference asset contains only generic company pages, with the original client-specific quotation and contact pages removed.
