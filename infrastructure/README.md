# Production hosting

Canonical site: https://zigma.gleblapkovsky.com

The target DigitalOcean App Platform specification uses one free Static Site, `website`,
serving `public/`. There are no Web Services or paid runtime containers in `.do/app.yaml`.
Forms post JSON as `text/plain` to the Google Apps Script web app configured in
`public/intake-config.json`. This avoids a CORS preflight. The client displays success only
after reading an explicit `{ok:true}` response, never on an opaque `no-cors` response.

Every push to `main` triggers `.github/workflows/deploy.yml`, which validates and applies
`.do/app.yaml`, deploys the latest source, and waits for ACTIVE. GitHub Actions stores
`DIGITALOCEAN_ACCESS_TOKEN`. Never copy it into source or build output. The static specification
intentionally removes the old server and its unused runtime GitHub token.

Apps Script source: `infrastructure/google-apps-script.gs`. Deploy as the owner with access
for everyone; the destination Google Sheet stays private. When the service catalog changes,
update the embedded catalog, run `node scripts/verify-google-intake.mjs`, and publish a new
Apps Script deployment version. Do not create a new endpoint URL for ordinary updates.
The script validates contacts, consent and service IDs, checks duplicate UUIDs under a lock,
escapes spreadsheet formulas and applies basic volume limits. It never returns table contents.
The old private GitHub CSV remains an archive and is not deleted by this migration.

Cloudflare proxies only the DNS CNAME for the clinic hostname to the DigitalOcean ingress.
The clinic hostname requires no Worker route. Preserve all apex, www, VPN and mail records.
The old `zigma-clinic` recovery Worker is retained as a rollback resource until migration QA.
Its source and build scripts are historical and are not used by the production Docker image.

Validation: `node scripts/verify-google-intake.mjs`, `node scripts/verify-estimate.mjs`,
`node scripts/verify-motion.mjs`. Preview: `node infrastructure/server.mjs` (port 8080).
