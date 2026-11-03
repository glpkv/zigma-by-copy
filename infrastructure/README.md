# Public recovery entry point

Primary visitor URL: https://zigma-clinic.jikoku.workers.dev/

Cloudflare account: `64859144c9610e2e1b1bc6d57406dfc8`, Worker: `zigma-clinic`.
The original `chatgpt.site` hostname can be blocked by the shared hosting security layer for some visitor networks. This separate entry point retrieves the existing public site server-side and preserves the appointment endpoint. It does not forward visitor cookies or IP headers; same-origin redirects stay on the new hostname. POST is restricted to the appointment endpoint and checks the new site's origin before forwarding.

Origin: https://zigma-clinic-copy.afootdate1.chatgpt.site/
The origin must remain published. This is a recovery gateway, not an independent copy of the asset storage.
