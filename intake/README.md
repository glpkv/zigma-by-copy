# Private appointment intake

Destination: `glpkv/zigma-appointments`, private repository, `appointments.csv`.
Columns: request ID, UTC creation time, name, Belarus phone, page path, consent.
The server verifies repository privacy before every write and retries concurrent updates.
Names and phones must never be added to this public source repository.

The same-origin `/api/appointments` Worker endpoint writes the table when the runtime secret is configured. Without it, intake stays disabled.
Required secret: `APPOINTMENTS_GITHUB_TOKEN`, a fine-grained token scoped only to
`glpkv/zigma-appointments` with Contents read/write. Do not commit the token or paste it in chat.
Use `.secrets/github-intake-token` locally to pass it to the deployment environment;
the entire directory is ignored by Git and excluded from static publication.
