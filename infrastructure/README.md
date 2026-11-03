# Public recovery entry point

Primary visitor URL: https://gleblapkovsky.com/zigma/
Reserve URL: https://zigma-clinic.jikoku.workers.dev/

Cloudflare account: `64859144c9610e2e1b1bc6d57406dfc8`, Worker: `zigma-clinic`.
The original `chatgpt.site` hostname can be blocked by the shared hosting security layer for some visitor networks. This separate entry point retrieves the existing public site server-side and preserves the appointment endpoint. It does not forward visitor cookies or IP headers; same-origin redirects stay on the new hostname. POST is restricted to the appointment endpoint and checks the new site's origin before forwarding.

Origin: https://zigma-clinic-copy.afootdate1.chatgpt.site/
The origin must remain published. This is a recovery gateway, not an independent copy of the asset storage.

The Worker handles only `gleblapkovsky.com/zigma` and `gleblapkovsky.com/zigma/*` on the custom domain. The existing portfolio remains on DigitalOcean. The apex CNAME keeps its original destination and uses Cloudflare proxying so the two path-specific routes can run. Mail records are unchanged.

The gateway rewrites site-relative HTML, CSS, JavaScript and feed paths under `/zigma/`, preserves redirects within that prefix, and publishes canonical URLs on the custom domain. Appointment POST requests require the visitor's same-origin header and a bounded JSON body before forwarding to the original server.

Build with `node scripts/build-gateway.mjs`; run `node scripts/verify-gateway.mjs`. Deploy the resulting `.cache/gateway-worker.mjs` as the Worker's `index.js` ES module with compatibility date `2026-11-03`.

The gateway serves `public/motion.css` and `public/motion.js` and injects their tags. Motion uses the Jikoku reference's gentle easing as inspiration, with original code: one-time text/photo reveals, a small hero zoom, hover feedback and a scroll progress line. It animates only opacity, translate, scale and clipping; it leaves layout dimensions and scroll position alone, and respects `prefers-reduced-motion`. Content stays visible if JavaScript or animation support is unavailable.
