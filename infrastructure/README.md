# Production hosting

Canonical site: https://zigma.gleblapkovsky.com

DigitalOcean App Platform `zigma-clinic` runs the dependency-free Node server in `Dockerfile`.
It serves `public/` and the same-origin `/api/appointments` endpoint. Motion is served from the
same application. The private table remains `glpkv/zigma-appointments/appointments.csv`.

Every push to `main` triggers `.github/workflows/deploy.yml`, which deploys the latest source
and waits for ACTIVE. GitHub Actions stores `DIGITALOCEAN_ACCESS_TOKEN`; DigitalOcean stores
`APPOINTMENTS_GITHUB_TOKEN` as a runtime SECRET. Never copy either into source or build output.
The checked-in `.do/app.yaml` intentionally excludes runtime secrets; preserve configured
secrets when applying future specification changes.

Cloudflare proxies only the DNS CNAME for the clinic hostname to the DigitalOcean ingress.
The clinic hostname requires no Worker route. Preserve all apex, www, VPN and mail records.
The old `zigma-clinic` recovery Worker is retained as a rollback resource until migration QA.
Its source and build scripts are historical and are not used by the production Docker image.

Validation: `node scripts/verify-intake.mjs`, `node scripts/verify-estimate.mjs`,
`node scripts/verify-motion.mjs`. Preview: `node infrastructure/server.mjs` (port 8080).
