// Temporary Shadowrocket capability probe. Fixed public fixtures only.
// Response rules mark headers without reading or replacing response bodies.
(() => {
  const BUILD = 'response-match-20261110.2';
  const WORKER_BUILD = 'redirect-probe-20261110.1';
  const ORIGIN = 'https://youtube-enhance-redirect-probe.hermanworkstk.workers.dev';
  const PAGE = 'https://example.com/yt-sr-response-match-probe';
  const FIXTURE = {
    body: [0, 1, 2, 127, 128, 254, 255, 89, 84, 45, 82, 69, 68, 73, 82, 69, 67, 84],
    token: 'YTE-REDIRECT-PROBE-PUBLIC-FIXTURE-NOT-A-SECRET',
    target: 'https://r1---fixture.googlevideo.com/initplayback?ack=1',
    clientKey: 'KSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSk=',
    upstream: 'eyJBdXRob3JpemF0aW9uIjoiZml4dHVyZS1nb29nbGUtYXV0aCJ9',
    options: 'eyJjYXB0aW9uTGFuZyI6Im9mZiJ9',
  };
  const url = $request.url || '';
  const source = url.match(/^https:\/\/example\.com\/yt-sr-response-match-probe\/source\/(source-control|url-headers|bad-token|binary-response)$/);
  const destination = url.startsWith(ORIGIN) && url.slice(ORIGIN.length).match(/^\/v1\/probe\/(control|url-headers|bad-token|binary-response)$/);
  const urlKind = source ? 'source' : destination ? 'destination' : 'other';
  let config = {};
  try { config = typeof $argument === 'string' ? JSON.parse($argument) : $argument || {}; } catch {}
  if (!config || typeof config !== 'object' || Array.isArray(config)) config = {};
  const responsePhase = typeof $response !== 'undefined';
  const log = (event, detail) => console.log('[YT-RESPONSE-MATCH] build=' + BUILD + ' event=' + event + ' ' + detail);
  function reply(status, body, type = 'text/plain; charset=utf-8') {
    $done({response: {status, headers: {'Content-Type': type, 'Cache-Control': 'no-store', 'X-Probe-Build': BUILD}, body}});
  }
  // WebView and the host-selected engine need not expose identical app globals.
  // The supplied module is Shadowrocket-only; reject Quantumult X explicitly.
  if (typeof $task !== 'undefined') { $done({}); return; }
  if (responsePhase) {
    // Match by configured hook, not the URL exposed to that hook. These may
    // differ: learning that distinction is the purpose of the device probe.
    if (urlKind === 'other' || config.probeBuild !== BUILD || !['source', 'destination'].includes(config.hook)) {
      log('response-rejected', 'reason=scope-or-configuration'); $done({}); return;
    }
    const headers = {...($response.headers || {})};
    const marker = 'X-YTE-Probe-' + (config.hook === 'source' ? 'Source' : 'Destination');
    let expose = '';
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === marker.toLowerCase()) delete headers[key];
      if (key.toLowerCase() === 'access-control-expose-headers') { expose = headers[key]; delete headers[key]; }
    }
    headers[marker] = BUILD + ';url=' + urlKind;
    headers['Access-Control-Expose-Headers'] = [...new Set((String(expose).split(',').map(s => s.trim()).filter(Boolean)).concat([
      'X-Probe-Build', 'X-Probe-Case', 'X-YTE-Probe-Source', 'X-YTE-Probe-Destination',
    ]))].join(', ');
    log('response', 'hook=' + config.hook + ' urlKind=' + urlKind + ' case=' + (source || destination)[1]);
    $done({headers}); return;
  }
  if (url === PAGE) {
    if (($request.method || 'GET').toUpperCase() !== 'GET') { reply(405, 'GET required'); return; }
    const page = String.raw`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shadowrocket response matching</title>
<style>body{font:17px system-ui;max-width:52rem;margin:2rem auto;padding:0 1rem}button{font:inherit;margin:1rem .5rem 1rem 0;padding:.5rem}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style></head><body>
<h1>Shadowrocket response matching</h1><p>Client ${BUILD}; diagnostic Worker ${WORKER_BUILD}. Fixed public data only. Keep YouTube closed and Shadowrocket with MITM enabled.</p>
<p>This installs a source response-body rule and a destination header-only rule. Their scripts only mark headers; they leave response bodies unchanged. Both controls must pass before native rewrite results are interpreted.</p>
<button id="run">Run five checks</button><button id="save" disabled>Save report</button><pre id="out">No checks run.</pre><pre id="report"></pre>
<script>
const BUILD=${JSON.stringify(BUILD)},WORKER_BUILD=${JSON.stringify(WORKER_BUILD)},ORIGIN=${JSON.stringify(ORIGIN)},FIXTURE=${JSON.stringify(FIXTURE)};
const fixtureHeaders=name=>({'Content-Type':'application/octet-stream','Authorization':'Bearer '+FIXTURE.token,
 'X-YTE-Target':FIXTURE.target,'X-YTE-Client-Key':FIXTURE.clientKey,'X-YTE-Upstream-Headers':FIXTURE.upstream,
 'X-YTE-Options':FIXTURE.options,'X-YTE-Platform':'youtube','X-Probe-Build':WORKER_BUILD,'X-Probe-Case':name});
let report;
document.getElementById('run').onclick=async function(){
 this.disabled=true;document.getElementById('save').disabled=true;
 report={build:BUILD,workerBuild:WORKER_BUILD,startedAt:new Date().toISOString(),results:[],assessment:'inconclusive',
  guardUrlCompatibility:'not-established',commonRulePrerequisitesPassed:false,
  scope:'Synthetic Shadowrocket response-rule selection after native request rewrite. Not YouTube, streaming, memory or shutdown validation.'};
 const out=document.getElementById('out');out.textContent='';
 const plan=['source-control','destination-control','url-headers','binary-response','bad-token'];
 for(const name of plan){
  let timer;
  try{
   const controller=new AbortController();timer=setTimeout(()=>controller.abort(),15000);
   const sourceControl=name==='source-control',direct=name==='destination-control';
   const url=direct?ORIGIN+'/v1/probe/control':'/yt-sr-response-match-probe/source/'+name;
   const response=await fetch(url,{method:sourceControl?'GET':'POST',credentials:'omit',redirect:'error',cache:'no-store',signal:controller.signal,
    ...(sourceControl?{}:{headers:direct?fixtureHeaders('control'):{'Content-Type':'application/octet-stream'},body:new Uint8Array(FIXTURE.body)})});
   const bytes=new Uint8Array(await response.arrayBuffer());
   const markers={};
   for(const hook of ['source','destination']){
    const value=response.headers.get('X-YTE-Probe-'+hook);
    if(value!==null){const prefix=BUILD+';url=',kind=value.startsWith(prefix)?value.slice(prefix.length):'';markers[hook]=['source','destination'].includes(kind)?kind:'invalid-or-stale';}
   }
   const hooks=Object.keys(markers),selection=hooks.length===0?'neither':hooks.length===2?'both':hooks[0];
   const result={case:name,status:response.status,responseBytes:bytes.length,markers,selection,
    markersValid:hooks.length>0&&hooks.every(hook=>markers[hook]!=='invalid-or-stale')};
   if(!sourceControl&&!direct)result.guardUrlCompatible=selection==='destination'&&markers.destination==='destination';
   if(!sourceControl){
    result.workerBuildMatches=response.headers.get('X-Probe-Build')===WORKER_BUILD;
    if(name==='binary-response')result.byteMatch=bytes.length===65536&&bytes.every((n,i)=>n===i%256);
    else{try{const json=JSON.parse(new TextDecoder().decode(bytes));
     result.caseMatches=json.case===(direct?'control':name);
     for(const key of ['methodMatches','bodyMatches','headersMatch','tokenAccepted'])if(key in json)result[key]=json[key];
    }catch{result.jsonValid=false;}}
   }
   // Source-control is a real network GET to example.com; its HTTP status or
   // body content is not prescribed. Only its source-hook marker is a canary.
   result.passed=!!(result.markersValid&&(sourceControl?selection==='source'&&markers.source==='source':
    result.workerBuildMatches&&(direct?selection==='destination'&&markers.destination==='destination':hooks.length===1)&&
    (name==='bad-token'?result.status===401&&result.caseMatches&&result.tokenAccepted===false:
     result.status===200&&(name==='binary-response'?result.byteMatch:result.caseMatches&&result.methodMatches&&result.bodyMatches&&result.headersMatch&&result.tokenAccepted))));
   report.results.push(result);
   out.textContent+=name+' | '+(result.passed?'PASS':'FAIL')+' | HTTP '+result.status+' | response hook: '+selection+'\n';
  }catch{report.results.push({case:name,passed:false,error:'request-failed-or-redirected'});out.textContent+=name+' | FAIL | request failed, timed out, or HTTP redirect rejected\n';}
  finally{clearTimeout(timer);}
  if(!report.results[report.results.length-1].passed){out.textContent+='Stopped: save the report and matching Shadowrocket log.\n';break;}
 }
 if(report.results.length===5&&report.results.every(row=>row.passed)){
  const selections=report.results.slice(2).map(row=>row.selection);
  report.assessment=selections.every(s=>s==='destination')?'rewritten-url-confirmed':selections.every(s=>s==='source')?'original-url-confirmed':'mixed-selection';
  report.guardUrlCompatibility=report.results.slice(2).every(row=>row.guardUrlCompatible)?'compatible':'incompatible';
  report.commonRulePrerequisitesPassed=report.assessment==='rewritten-url-confirmed'&&report.guardUrlCompatibility==='compatible';
 }
 report.finishedAt=new Date().toISOString();out.textContent+='Matching: '+report.assessment+'\nGuard URL compatibility: '+report.guardUrlCompatibility+
  '\nCommon-rule prerequisites: '+(report.commonRulePrerequisitesPassed?'PASS':'NOT MET')+'\nProduction playback and error-completion behavior still require device validation.\n';
 document.getElementById('report').textContent=JSON.stringify(report,null,2);this.disabled=false;document.getElementById('save').disabled=false;
};
document.getElementById('save').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));a.download='yt-sr-response-match-probe.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
</script></body></html>`;
    reply(200, page, 'text/html; charset=utf-8'); return;
  }
  if (!source || source[1] === 'source-control') { $done({}); return; }
  if (config.probeBuild !== BUILD || config.hook !== 'request' || ($request.method || '').toUpperCase() !== 'POST') {
    log('request-rejected', 'reason=method-or-configuration'); reply(409, 'Update the probe module and script'); return;
  }
  const raw = $request.body ?? $request.bodyBytes;
  const body = raw instanceof ArrayBuffer ? new Uint8Array(raw) : ArrayBuffer.isView(raw) ? new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength) : undefined;
  if (!body || body.length !== FIXTURE.body.length || !body.every((n,i)=>n===FIXTURE.body[i])) {
    log('request-rejected', 'reason=fixture-body'); reply(422, 'Fixture body unavailable or mismatched'); return;
  }
  const name = source[1];
  const headers = {'Content-Type': 'application/octet-stream',
    Host: ORIGIN.slice(8), 'Content-Length': String(body.length),
    Authorization: 'Bearer ' + (name === 'bad-token' ? 'PUBLIC-FIXTURE-WRONG-TOKEN' : FIXTURE.token),
    'X-YTE-Target': FIXTURE.target, 'X-YTE-Client-Key': FIXTURE.clientKey,
    'X-YTE-Upstream-Headers': FIXTURE.upstream, 'X-YTE-Options': FIXTURE.options,
    'X-YTE-Platform': 'youtube', 'X-Probe-Build': WORKER_BUILD, 'X-Probe-Case': name};
  // Match production native Relay's explicit body/Host/Content-Length handoff.
  const output = body.byteOffset===0&&body.byteLength===body.buffer.byteLength?body:new Uint8Array(body);
  log('rewrite', 'case=' + name + ' requestBytes=' + output.length);
  $done({url: ORIGIN + '/v1/probe/' + name, headers, body: output});
})();
