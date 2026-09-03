const EXPR = require('fs').readFileSync(__dirname + '/' + (process.env.CDP_EXPR || 'capability-audit.js'), 'utf8');
const PORT = process.env.CDP_PORT || 9223;
const WAIT = Number(process.env.CDP_WAIT || 8000); // must exceed the 5s late registration

(async () => {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = list.find(t => t.type === 'page');
  if (!page) { console.log('NO PAGE TARGET'); process.exit(1); }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pend = new Map();
  const send = (method, params) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };

  await send('Page.enable');
  await send('Page.navigate', { url: (process.env.CDP_URL || 'http://localhost:3000/') + '?t=' + Date.now() });
  await new Promise(r => setTimeout(r, WAIT)); // let the 5s late registration land

  const r = await send('Runtime.evaluate', { expression: EXPR, awaitPromise: true, returnByValue: true });
  if (r.result && r.result.exceptionDetails) {
    console.log('EXCEPTION:', r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description);
  } else {
    console.log(r.result && r.result.result && r.result.result.value);
  }
  process.exit(0);
})();
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 60000);
