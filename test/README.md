# Agent capability audit

**105 assertions against the live tool surface**, driven through the real WebMCP API
(`document.modelContext.executeTool`) in Chrome with `--enable-features=WebMCPTesting`.

Not unit tests. Every assertion goes through the same path an agent uses, and the
screen-moving tools are asserted **against the DOM** rather than against their own return
value — a tool that claims to have moved the view proves nothing by saying so. The gate
is opened by clicking the actual approve button.

```bash
# 1. serve a production build
npm run build && npx next start -p 3000

# 2. Chrome with WebMCP enabled, on a CDP port
chrome --headless=new --remote-debugging-port=9223 \
  --enable-features=WebMCPTesting,WebMCPSupport,WebMCPAgent \
  --user-data-dir=/tmp/webmcp-audit about:blank

# 3. run
CDP_URL=http://localhost:3000/ CDP_EXPR=capability-audit.js node run-audit.js
```

`npm run audit` runs step 3 against `CDP_URL` (default `http://localhost:3000/`), once
steps 1 and 2 are up.

## What it covers

All seventeen tools, and argument validation on every one of them: missing arguments,
wrong types, out-of-range values, unknown ids and string coercion. `inputSchema` does not
validate (`docs/webmcp-findings.md` finding 4), so each tool's own validation is the only
validation, and it is asserted individually.

Beyond that:

- **The gate, in both directions.** `checkout` is absent while over budget, absent while
  the delivery form is incomplete, absent until the shopper approves, and gone again once
  the order is placed. Calling it while gated is asserted to be impossible.
- **The mirror.** `get_order` does not exist until an order does, and arrives in the same
  state change that removes `checkout`.
- **Consent is per basket.** Changing the cart revokes checkout. Emptying a required
  delivery field withholds it, and restoring the field does *not* silently re-open it.
- **The agent-filled delivery form**, including that a rejected email is never written to
  the form, and that the form records which fields the agent authored.
- **Express delivery counts against the budget**, so choosing it can close the gate.
- **Moving the shopper's view does not touch the cart** and does not withdraw approval.
- **Start over keeps the address** and keeps the call log.

## Result

Last run 2026-09-03: **105 passed, 0 failed** — both locally and against the deployed
URL, `https://hubit-store.vercel.app/`.

Set `CDP_URL` to the deployed URL to reproduce the production run.
