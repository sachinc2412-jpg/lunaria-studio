# Lunaria Studio

The latest approved Lunaria Studio website, with 32 pages, 24 portfolio films, service pages, the animated logo reveal, and floating WhatsApp contact at +971 50 381 4957.

## Build and deploy

Run `npm run build`, then serve `dist/`. No dependencies are required. Vercel uses the included configuration automatically.

Website HTML, CSS, JavaScript, SVGs and the media manifest are versioned here. The build downloads the original media from the published Lunaria site and verifies every asset against its recorded SHA-256 and size. Completed deployments serve local media files. Keep the source site available for future builds; changed or missing source media deliberately fails verification rather than silently changing the portfolio.

The enquiry form retains the existing Formspree endpoint. No test enquiries were submitted.
