// Disposable Quantumult X HTTP 307 probe. Fixed public fixtures only.
// No HTTP client, preferences, production credentials or response-body access.
(() => {
  const BUILD = 'redirect-307-probe-20261110.2';
  const WORKER_BUILD = 'redirect-probe-20261110.1';
  const ORIGIN = 'https://youtube-enhance-redirect-probe.hermanworkstk.workers.dev';
  const PAGE = 'https://example.com/yt-relay-redirect-307-probe';
  const FIXTURE = {
    body: [0, 1, 2, 127, 128, 254, 255, 89, 84, 45, 82, 69, 68, 73, 82, 69, 67, 84],
    token: 'YTE-REDIRECT-PROBE-PUBLIC-FIXTURE-NOT-A-SECRET',
    target: 'https://r1---fixture.googlevideo.com/initplayback?ack=1',
    clientKey: 'KSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSk=',
    upstream: 'eyJBdXRob3JpemF0aW9uIjoiZml4dHVyZS1nb29nbGUtYXV0aCJ9',
    options: 'eyJjYXB0aW9uTGFuZyI6Im9mZiJ9',
  };
  const url = $request.url || '';
  const source = /^https:\/\/example\.com\/yt-relay-redirect-307-probe\/run\/script\/(url-only|url-headers|bad-token|binary-response)$/.exec(url);
  const destination = /^https:\/\/youtube-enhance-redirect-probe\.hermanworkstk\.workers\.dev\/v1\/probe\/(control|url-only|url-headers|bad-token|binary-response)\?probe-307=(canary|rule|script)$/.exec(url);
  const workerResponse = /^https:\/\/youtube-enhance-redirect-probe\.hermanworkstk\.workers\.dev\/v1\/probe\/(control|url-only|url-headers|bad-token|binary-response)(?:\?probe-307=(?:canary|rule|script))?$/.exec(url);
  const responding = typeof $response !== 'undefined';
  if (typeof $task === 'undefined' || (!source && !destination && !workerResponse && url !== PAGE)) { $done({}); return; }
  function headersFor(name) {
    return {'Content-Type': 'application/octet-stream',
      Authorization: 'Bearer ' + (name === 'bad-token' ? 'PUBLIC-FIXTURE-WRONG-TOKEN' : FIXTURE.token),
      'X-YTE-Target': FIXTURE.target, 'X-YTE-Client-Key': FIXTURE.clientKey,
      'X-YTE-Upstream-Headers': FIXTURE.upstream, 'X-YTE-Options': FIXTURE.options,
      'X-YTE-Platform': 'youtube', 'X-Probe-Build': WORKER_BUILD, 'X-Probe-Case': name};
  }
  function reply(status, body, extra = {}) {
    $done({status: 'HTTP/1.1 ' + status, headers: {'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'X-Probe-Client': BUILD, ...extra}, body});
  }
  function configured(stage) {
    try {
      const env = typeof $environment === 'object' && $environment || {}, values = Object.create(null);
      if (typeof env.sourcePath === 'string') for (const part of (env.sourcePath.split('#')[1] || '').split('&')) {
        const i = part.indexOf('=');
        if (i > 0) values[decodeURIComponent(part.slice(0, i))] = decodeURIComponent(part.slice(i + 1));
      }
      if (env.variables && typeof env.variables === 'object' && !Array.isArray(env.variables)) Object.assign(values, env.variables);
      return values.probeStage === stage && values.probeBuild === BUILD;
    } catch { return false; }
  }
  if (responding) {
    if (!workerResponse || !configured('response')) { $done({}); return; }
    const original = $response.headers || {};
    const get = name => Object.entries(original).find(([key]) => key.toLowerCase() === name)?.[1];
    if (get('x-probe-build') !== WORKER_BUILD || get('x-probe-case') !== workerResponse[1]) { $done({}); return; }
    // A cross-origin fetch redirect can produce an opaque (null) request origin.
    // Normalize CORS for this public fixture only. Never inspect/buffer its body.
    const headers = {};
    const replace = new Set(['access-control-allow-origin', 'access-control-allow-credentials', 'access-control-expose-headers']);
    for (const [key, value] of Object.entries(original)) if (!replace.has(key.toLowerCase())) headers[key] = value;
    headers['Access-Control-Allow-Origin'] = '*';
    headers['Access-Control-Expose-Headers'] = 'X-Probe-Build, X-Probe-Case';
    console.log('[YT-307-PROBE] build=' + BUILD + ' stage=response case=' + workerResponse[1] + ' action=browser-cors');
    $done({headers}); return;
  }
  if (source) {
    if (!configured('redirect')) { reply('409 Conflict', 'Refresh the diagnostic snippet and script'); return; }
    if ($request.method !== 'POST') { reply('405 Method Not Allowed', 'POST required'); return; }
    console.log('[YT-307-PROBE] build=' + BUILD + ' stage=redirect variant=script case=' + source[1] + ' action=307');
    reply('307 Temporary Redirect', 'Following a fixed diagnostic redirect.',
      {Location: ORIGIN + '/v1/probe/' + source[1] + '?probe-307=script'}); return;
  }
  if (destination) {
    if (!configured('destination') || $request.method !== 'POST' ||
        ((destination[1] === 'control') !== (destination[2] === 'canary'))) {
      console.log('[YT-307-PROBE] build=' + BUILD + ' stage=destination action=reject');
      $done({}); return;
    }
    const name = destination[1], variant = destination[2];
    // Inject at the selected Worker host, not before the cross-origin redirect.
    // Never carry cookies or arbitrary source authentication into the Worker.
    const headers = {...headersFor(name), Host: ORIGIN.slice('https://'.length)};
    // The browser can resend a redirected POST using chunked transfer coding.
    // The header hook leaves the wire body intact, so its framing must survive.
    const entries = Object.entries($request.headers || {});
    const lengths = entries.filter(([key]) => key.toLowerCase() === 'content-length').map(([, value]) => value);
    const transfers = entries.filter(([key]) => key.toLowerCase() === 'transfer-encoding').map(([, value]) => value);
    if (lengths.length > 1 || transfers.length > 1 ||
        (transfers.length && (typeof transfers[0] !== 'string' || transfers[0].trim().toLowerCase() !== 'chunked')) ||
        (!transfers.length && lengths.length && (typeof lengths[0] !== 'string' || !/^\d+$/.test(lengths[0])))) {
      console.log('[YT-307-PROBE] build=' + BUILD + ' stage=destination action=reject reason=unsupported-framing');
      $done({}); return;
    }
    let inputFraming = 'none';
    if (transfers.length) { headers['Transfer-Encoding'] = 'chunked'; inputFraming = 'chunked'; }
    else if (lengths.length) { headers['Content-Length'] = lengths[0]; inputFraming = 'length'; }
    // Transfer-Encoding takes precedence. Never forward both framing headers.
    console.log('[YT-307-PROBE] build=' + BUILD + ' stage=destination variant=' + variant + ' case=' + name + ' action=inject inputFraming=' + inputFraming);
    $done({url: ORIGIN + '/v1/probe/' + name, headers}); return;
  }
  if (url !== PAGE) { $done({}); return; }
  if ($request.method !== 'GET') { reply('405 Method Not Allowed', 'GET required'); return; }
  const page = String.raw`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Quantumult X HTTP 307 probe</title>
<style>body{font:17px system-ui;max-width:52rem;margin:2rem auto;padding:0 1rem}button{font:inherit;margin:.6rem;padding:.5rem}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style></head><body>
<h1>Quantumult X HTTP 307 probe</h1><p>Client ${BUILD}; Worker ${WORKER_BUILD}.</p>
<p>Fixed public fixtures only. Keep YouTube closed. Disable the earlier redirect probe. Leave Quantumult X and MITM enabled.</p>
<p>Diagnostic Worker: ${ORIGIN}</p><button id="run">Run 307 checks</button><button id="save" disabled>Save report</button><pre id="output">Ready.</pre>
<script>
const BUILD=${JSON.stringify(BUILD)},WORKER_BUILD=${JSON.stringify(WORKER_BUILD)},ORIGIN=${JSON.stringify(ORIGIN)},PAGE=${JSON.stringify(PAGE)},FIXTURE=${JSON.stringify(FIXTURE)};
const run=document.getElementById('run'),save=document.getElementById('save'),output=document.getElementById('output');
let report,downloadUrl;
const headersFor=name=>({'Content-Type':'application/octet-stream',Authorization:'Bearer '+FIXTURE.token,
'X-YTE-Target':FIXTURE.target,'X-YTE-Client-Key':FIXTURE.clientKey,'X-YTE-Upstream-Headers':FIXTURE.upstream,
'X-YTE-Options':FIXTURE.options,'X-YTE-Platform':'youtube','X-Probe-Build':WORKER_BUILD,'X-Probe-Case':name});
function show(){output.textContent=JSON.stringify(report,null,2);}
async function check(variant,name){
 const result={variant,case:name,passed:false};report.results.push(result);show();
 const control=variant==='control',canary=variant==='canary';
 const target=control?ORIGIN+'/v1/probe/control':canary?ORIGIN+'/v1/probe/control?probe-307=canary':PAGE+'/run/'+variant+'/'+name;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch(target,{method:'POST',body:new Uint8Array(FIXTURE.body),headers:control?headersFor('control'):{'Content-Type':'text/plain'},
   credentials:'omit',redirect:control||canary?'error':'follow',cache:'no-store',signal:controller.signal});
  result.status=response.status;result.redirected=response.redirected===true;
  result.finalOrigin=response.url.startsWith(ORIGIN+'/')?'worker':response.url.startsWith('https://example.com/')?'source':'other';
  result.buildMatches=response.headers.get('X-Probe-Build')===WORKER_BUILD;
  const expected=control||canary?'control':name;
  result.caseMatches=response.headers.get('X-Probe-Case')===expected;
  const reader=response.body.getReader();let used=0;const chunks=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;used+=value.byteLength;
   if(used>131072){await reader.cancel();throw Error('response-limit');}chunks.push(value);}}
  finally{try{reader.releaseLock();}catch{}}
  const bytes=new Uint8Array(used);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  result.responseBytes=used;
  if(name==='binary-response'){
   result.byteMatch=bytes.length===65536&&bytes.every((n,i)=>n===i%256);
   result.passed=response.status===200&&result.buildMatches&&result.caseMatches&&result.byteMatch;
  }else{
   let json;try{json=JSON.parse(new TextDecoder().decode(bytes));}catch{result.jsonValid=false;}
   if(json){for(const key of ['bodyMatches','headersMatch','methodMatches','tokenAccepted'])if(key in json)result[key]=json[key];
    const marker=json.build===WORKER_BUILD&&json.case===expected;
    result.passed=result.buildMatches&&result.caseMatches&&marker&&(name==='bad-token'?response.status===401&&json.tokenAccepted===false:
     response.status===200&&json.bodyMatches===true&&json.headersMatch===true&&json.methodMatches===true&&(name==='url-only'||json.tokenAccepted===true));}
  }
 }catch(error){result.error=controller.signal.aborted?'timeout':error.message==='response-limit'?'response-limit':'fetch-or-read-failed';}
 finally{clearTimeout(timer);show();}
 return result.passed;
}
run.onclick=async()=>{
 run.disabled=true;save.disabled=true;
 if(downloadUrl){URL.revokeObjectURL(downloadUrl);downloadUrl=undefined;}
 report={build:BUILD,workerBuild:WORKER_BUILD,startedAt:new Date().toISOString(),results:[],
  scope:'HTTP 307 fixture routing, destination header injection and binary delivery. Not YouTube compatibility, streaming, memory or shutdown validation.'};show();
 try{
  if(!await check('control','control')){report.stopped='control-failed';return;}
  if(!await check('canary','control')){report.stopped='destination-canary-failed';return;}
  for(const variant of ['rule','script']){
   await check(variant,'url-only');
   if(await check(variant,'url-headers')){await check(variant,'bad-token');await check(variant,'binary-response');}
   else for(const name of ['bad-token','binary-response'])report.results.push({variant,case:name,passed:false,skipped:true,reason:'authenticated-redirect-not-confirmed'});
  }
 }finally{report.finishedAt=new Date().toISOString();show();save.disabled=false;run.disabled=false;}
};
save.onclick=()=>{if(!report||run.disabled)return;if(downloadUrl)URL.revokeObjectURL(downloadUrl);
 downloadUrl=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=downloadUrl;a.download='yt-qx-redirect-307-probe.json';a.click();};
window.addEventListener('pagehide',()=>{if(downloadUrl)URL.revokeObjectURL(downloadUrl);});
</script></body></html>`;
  $done({status: 'HTTP/1.1 200 OK', headers: {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'}, body: page});
})();
