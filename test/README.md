# Agent capability audit

57 assertions against the live tool surface, driven through the real WebMCP API
(`document.modelContext.executeTool`) in Chrome with `--enable-features=WebMCPTesting`.
Not unit tests: every assertion goes through the same path an agent uses.

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

Covers: all eleven tools, argument validation on every one (missing, wrong type, out of
range, unknown ids, string coercion), the "already have" constraint, proposal handling
(a proposal must never apply itself), and the gate in both directions.

Last run 2026-09-02: **57 passed, 0 failed.**
