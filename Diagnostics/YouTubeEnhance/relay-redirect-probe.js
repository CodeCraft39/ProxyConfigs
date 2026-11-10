// Isolated device capability probe. No native HTTP client, response-body hook,
// production credentials, preferences, YouTube traffic or key-cache changes.
(() => {
  const BUILD = 'redirect-probe-20261110.3';
  // The deployed diagnostic Worker protocol stays unchanged.
  const WORKER_BUILD = 'redirect-probe-20261110.1';
  const VARIANTS = ['default-body0', 'default-body1', 'jsc-body0', 'jsc-body1', 'webview-body0', 'webview-body1'];
  const QX_VARIANTS = ['qx-header', 'qx-body'];
  const FIXTURE = {
    body: [0, 1, 2, 127, 128, 254, 255, 89, 84, 45, 82, 69, 68, 73, 82, 69, 67, 84],
    token: 'YTE-REDIRECT-PROBE-PUBLIC-FIXTURE-NOT-A-SECRET',
    target: 'https://r1---fixture.googlevideo.com/initplayback?ack=1',
    clientKey: 'KSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSk=',
    upstream: 'eyJBdXRob3JpemF0aW9uIjoiZml4dHVyZS1nb29nbGUtYXV0aCJ9',
    options: 'eyJjYXB0aW9uTGFuZyI6Im9mZiJ9',
  };
  const requestUrl = $request.url || '';
  const match = requestUrl.match(/^https:\/\/example\.com\/yt-relay-redirect-probe(?:\/run\/(default-body[01]|jsc-body[01]|webview-body[01]|qx-header|qx-body)\/(ready|url-only|url-headers|bad-token|binary-response))?(?:\?([^#]*))?$/);
  const qxCanary = requestUrl.match(/^https:\/\/(youtube-enhance-redirect-probe\.[a-z0-9-]+\.workers\.dev)\/v1\/probe\/control\?probe-hook=(qx-header|qx-body)$/);
  if (!match && !qxCanary) { $done({}); return; }
  const qx = typeof $task !== 'undefined';
  function localReply(status, body, type = 'text/plain; charset=utf-8') {
    const headers = {'Content-Type': type, 'Cache-Control': 'no-store', 'X-Probe-Build': BUILD};
    if (qx) $done({status: 'HTTP/1.1 ' + status, headers, body});
    else $done({response: {status: Number(status.split(' ')[0]), headers, body}});
  }
  function fixtureHeaders(name, original) {
    const headers = {'Content-Type': 'application/octet-stream',
      'Authorization': 'Bearer ' + (name === 'bad-token' ? 'PUBLIC-FIXTURE-WRONG-TOKEN' : FIXTURE.token),
      'X-YTE-Target': FIXTURE.target, 'X-YTE-Client-Key': FIXTURE.clientKey,
      'X-YTE-Upstream-Headers': FIXTURE.upstream, 'X-YTE-Options': FIXTURE.options,
      'X-YTE-Platform': 'youtube', 'X-Probe-Build': WORKER_BUILD, 'X-Probe-Case': name};
    if (original) {
      const replaced = new Set(Object.keys(headers).map(key => key.toLowerCase()));
      for (const [key, value] of Object.entries(original)) if (!replaced.has(key.toLowerCase())) headers[key] = value;
    }
    return headers;
  }
  const variant = qxCanary ? qxCanary[2] : match[1], name = qxCanary ? 'ready' : match[2];
  if (!name) {
    if (($request.method || 'GET').toUpperCase() !== 'GET') { localReply('405 Method Not Allowed', 'GET required'); return; }
    const page = String.raw`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Relay redirect probe</title>
<style>body{font:17px system-ui;max-width:52rem;margin:2rem auto;padding:0 1rem}input{box-sizing:border-box;width:100%;font:inherit;padding:.5rem}button{font:inherit;margin:1rem .5rem 1rem 0;padding:.5rem}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style></head><body>
<h1>Relay redirect probe</h1><p>Client ${BUILD}; Worker ${WORKER_BUILD}. Synthetic data only. Keep YouTube closed. Leave the proxy app and its MITM enabled.</p>
<label>Diagnostic Worker origin (separate from the playback Worker)<input id="origin" type="url" value="https://youtube-enhance-redirect-probe.hermanworkstk.workers.dev" autocomplete="off"></label>
<button id="run">${qx ? 'Run header/body checks' : 'Run engine/body checks'}</button><button id="save" disabled>Save report</button><pre id="out">No checks run.</pre><pre id="report"></pre>
<script>
const BUILD=${JSON.stringify(BUILD)},WORKER_BUILD=${JSON.stringify(WORKER_BUILD)},FIXTURE=${JSON.stringify(FIXTURE)};
const VARIANTS=${JSON.stringify(qx ? QX_VARIANTS : VARIANTS)};
const headersFor=name=>({'Content-Type':'application/octet-stream','Authorization':'Bearer '+FIXTURE.token,
'X-YTE-Target':FIXTURE.target,'X-YTE-Client-Key':FIXTURE.clientKey,'X-YTE-Upstream-Headers':FIXTURE.upstream,
'X-YTE-Options':FIXTURE.options,'X-YTE-Platform':'youtube','X-Probe-Build':WORKER_BUILD,'X-Probe-Case':name});
let report;
document.getElementById('run').onclick=async function(){
 const origin=document.getElementById('origin').value.replace(/\/$/,'');
 if(!/^https:\/\/youtube-enhance-redirect-probe\.[a-z0-9-]+\.workers\.dev$/.test(origin)){document.getElementById('out').textContent='Enter the HTTPS origin of the separate youtube-enhance-redirect-probe Worker.';return;}
 this.disabled=true;document.getElementById('save').disabled=true;
 report={build:BUILD,workerBuild:WORKER_BUILD,startedAt:new Date().toISOString(),results:[],scope:'Synthetic native rewrite capability; not YouTube filtering, native streaming, memory or shutdown validation.'};
 const out=document.getElementById('out');out.textContent='';
 const skips=new Map();
 const plan=[{name:'control',variant:null},...VARIANTS.flatMap(variant=>['ready','url-only','url-headers','bad-token','binary-response'].map(name=>({name,variant})))];
 for(const {name,variant} of plan){
  const label=(variant?variant+' / ':'')+name;
  const skip=variant&&skips.get(variant);
  if(skip&&(skip==='canary-failed'||name==='bad-token'||name==='binary-response')){
   report.results.push({case:name,variant,passed:false,skipped:true,reason:skip});out.textContent+=label+' | SKIPPED | '+skip+'\n';continue;
  }
  let timer;
  try{
   const qxReady=name==='ready'&&variant.startsWith('qx-');
   const url=name==='control'?origin+'/v1/probe/control':qxReady?origin+'/v1/probe/control?probe-hook='+variant:
    '/yt-relay-redirect-probe/run/'+variant+'/'+name+'?origin='+encodeURIComponent(origin);
   const controller=new AbortController();timer=setTimeout(()=>controller.abort(),15000);
   const response=await fetch(url,{method:'POST',credentials:'omit',redirect:'error',cache:'no-store',signal:controller.signal,
    headers:name==='control'?headersFor(name):{'Content-Type':qxReady?'text/plain':'application/octet-stream'},body:new Uint8Array(FIXTURE.body)});
   const bytes=new Uint8Array(await response.arrayBuffer());
   const result={case:name,variant,status:response.status,responseBytes:bytes.length,buildMatches:response.headers.get('X-Probe-Build')===(name==='ready'&&!qxReady?BUILD:WORKER_BUILD)};
   if(name==='binary-response')result.byteMatch=bytes.length===65536&&bytes.every((n,i)=>n===i%256);
   else{try{const json=JSON.parse(new TextDecoder().decode(bytes));for(const key of ['bodyMatches','headersMatch','methodMatches','tokenAccepted','configurationMatches'])if(key in json)result[key]=json[key];result.caseMatches=json.case===(qxReady?'control':name);if(name==='ready'&&!qxReady)result.variantMatches=json.variant===variant;}catch{result.jsonValid=false;}}
   result.passed=result.buildMatches&&(qxReady?result.status===200&&result.caseMatches&&result.methodMatches&&result.bodyMatches&&result.headersMatch&&result.tokenAccepted:
    name==='ready'?result.status===200&&result.caseMatches&&result.variantMatches&&result.configurationMatches:
    name==='bad-token'?result.status===401&&result.tokenAccepted===false&&result.caseMatches:
    result.status===200&&(name==='binary-response'?result.byteMatch:result.caseMatches&&result.methodMatches&&result.bodyMatches&&result.headersMatch));
   report.results.push(result);out.textContent+=label+' | '+(result.passed?'PASS':'FAIL')+' | HTTP '+result.status+' | '+result.responseBytes+' bytes\n';
  }catch{report.results.push({case:name,variant,passed:false,error:'request-failed-or-redirected'});out.textContent+=label+' | FAIL | request failed, timed out, or HTTP redirect rejected\n';}
  finally{clearTimeout(timer);}
  if(variant&&!report.results[report.results.length-1].passed){
   if(name==='ready')skips.set(variant,'canary-failed');
   else if(name==='url-headers')skips.set(variant,'authenticated-rewrite-not-confirmed');
  }
  if(name==='control'&&!report.results[0].passed){out.textContent+='Stopped: verify the diagnostic Worker deployment and origin first.\n';break;}
 }
 report.finishedAt=new Date().toISOString();report.controlPassed=report.results[0].passed;
 document.getElementById('report').textContent=JSON.stringify(report,null,2);this.disabled=false;document.getElementById('save').disabled=false;
};
document.getElementById('save').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));a.download='yt-relay-redirect-probe.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
</script></body></html>`;
    localReply('200 OK', page, 'text/html; charset=utf-8'); return;
  }
  if (($request.method || '').toUpperCase() !== 'POST') {
    if (qx) $done({}); else localReply('405 Method Not Allowed', 'POST required');
    return;
  }
  if (!variant || qx !== QX_VARIANTS.includes(variant)) {
    if (qx) $done({}); else localReply('409 Conflict', 'Update the diagnostic module or snippet');
    return;
  }
  let bodyBytes;
  if (qx) {
    let configurationMatches = false;
    try {
      const env = typeof $environment === 'object' && $environment || {};
      const values = Object.create(null), path = env.sourcePath;
      if (typeof path === 'string' && path.includes('#')) for (const pair of path.slice(path.indexOf('#') + 1).split('&')) {
        const split = pair.indexOf('=');
        if (split > 0) values[decodeURIComponent(pair.slice(0, split))] = decodeURIComponent(pair.slice(split + 1));
      }
      if (env.variables && typeof env.variables === 'object' && !Array.isArray(env.variables)) Object.assign(values, env.variables);
      configurationMatches = values.probeHook === variant && values.probeBuild === BUILD;
    } catch {}
    if (!configurationMatches) {
      console.log('[YT-REDIRECT-PROBE] build=' + BUILD + ' variant=' + variant + ' case=' + name + ' action=reject reason=configuration-mismatch');
      $done({}); return;
    }
    if (variant === 'qx-body') {
      const raw = $request.bodyBytes;
      const view = raw instanceof ArrayBuffer ? new Uint8Array(raw) : ArrayBuffer.isView(raw) ? new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength) : undefined;
      if (!view || view.length !== FIXTURE.body.length || !view.every((n, i) => n === FIXTURE.body[i])) {
        console.log('[YT-REDIRECT-PROBE] build=' + BUILD + ' variant=' + variant + ' case=' + name + ' action=reject reason=binary-fixture-unavailable-or-mismatched');
        $done({}); return;
      }
      bodyBytes = raw instanceof ArrayBuffer ? raw : raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
    }
    if (qxCanary) {
      // Header/body hooks cannot synthesize an echo response. Remove only the
      // query on the already selected Worker origin and let its control verify
      // the hook. text/plain at the browser avoids preflight on the query URL.
      console.log('[YT-REDIRECT-PROBE] build=' + BUILD + ' variant=' + variant + ' case=ready action=canary configurationMatches=true');
      $done({url: 'https://' + qxCanary[1] + '/v1/probe/control', headers: fixtureHeaders('control', $request.headers), ...(bodyBytes ? {bodyBytes} : {})}); return;
    }
    if (name === 'ready') { $done({}); return; }
  } else {
    let configured = {};
    try { configured = typeof $argument === 'string' ? JSON.parse($argument) : typeof $argument === 'object' && $argument || {}; } catch {}
    const configurationMatches = configured?.variant === variant && configured?.probeBuild === BUILD;
    if (name === 'ready') {
      console.log('[YT-REDIRECT-PROBE] build=' + BUILD + ' variant=' + variant + ' case=ready action=canary configurationMatches=' + configurationMatches);
      localReply(configurationMatches ? '200 OK' : '409 Conflict', JSON.stringify({build:BUILD,case:name,variant,configurationMatches}), 'application/json'); return;
    }
    if (!configurationMatches) { localReply('409 Conflict', 'Diagnostic module configuration mismatch'); return; }
  }
  let origin;
  try {
    const pairs = (match[3] || '').split('&');
    const values = pairs.filter(p => p.split('=')[0] === 'origin').map(p => decodeURIComponent(p.slice(p.indexOf('=') + 1)));
    if (values.length !== 1 || !/^https:\/\/youtube-enhance-redirect-probe\.[a-z0-9-]+\.workers\.dev$/.test(values[0])) throw Error();
    origin = values[0];
  } catch {
    if (qx) {
      console.log('[YT-REDIRECT-PROBE] build=' + BUILD + ' variant=' + variant + ' case=' + name + ' action=reject reason=diagnostic-worker-origin-invalid');
      $done({});
    } else localReply('400 Bad Request', 'Invalid diagnostic Worker origin');
    return;
  }
  const headers = fixtureHeaders(name);
  // The body-hook variant explicitly returns the original binary request.
  // Other variants leave it unread. No native response fetch or echo is used.
  console.log('[YT-REDIRECT-PROBE] build=' + BUILD + ' client=' + (qx ? 'QX' : typeof $rocket !== 'undefined' ? 'Shadowrocket' : 'Surge-compatible') + ' variant=' + (variant || 'qx') + ' case=' + name + ' action=rewrite');
  $done({url: origin + '/v1/probe/' + name, ...(name === 'url-only' ? {} : {headers}), ...(bodyBytes ? {bodyBytes} : {})});
})();
