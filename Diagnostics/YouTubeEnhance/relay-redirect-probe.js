// Isolated device capability probe. No native HTTP client, response-body hook,
// production credentials, preferences, YouTube traffic or key-cache changes.
(() => {
  const BUILD = 'redirect-probe-20261110.1';
  const FIXTURE = {
    body: [0, 1, 2, 127, 128, 254, 255, 89, 84, 45, 82, 69, 68, 73, 82, 69, 67, 84],
    token: 'YTE-REDIRECT-PROBE-PUBLIC-FIXTURE-NOT-A-SECRET',
    target: 'https://r1---fixture.googlevideo.com/initplayback?ack=1',
    clientKey: 'KSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSk=',
    upstream: 'eyJBdXRob3JpemF0aW9uIjoiZml4dHVyZS1nb29nbGUtYXV0aCJ9',
    options: 'eyJjYXB0aW9uTGFuZyI6Im9mZiJ9',
  };
  const match = ($request.url || '').match(/^https:\/\/example\.com\/yt-relay-redirect-probe(?:\/run\/(url-only|url-headers|bad-token|binary-response))?(?:\?([^#]*))?$/);
  if (!match) { $done({}); return; }
  const qx = typeof $task !== 'undefined';
  function localReply(status, body, type = 'text/plain; charset=utf-8') {
    const headers = {'Content-Type': type, 'Cache-Control': 'no-store', 'X-Probe-Build': BUILD};
    if (qx) $done({status: 'HTTP/1.1 ' + status, headers, body});
    else $done({response: {status: Number(status.split(' ')[0]), headers, body}});
  }
  const name = match[1];
  if (!name) {
    if (($request.method || 'GET').toUpperCase() !== 'GET') { localReply('405 Method Not Allowed', 'GET required'); return; }
    const page = String.raw`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Relay redirect probe</title>
<style>body{font:17px system-ui;max-width:52rem;margin:2rem auto;padding:0 1rem}input{box-sizing:border-box;width:100%;font:inherit;padding:.5rem}button{font:inherit;margin:1rem .5rem 1rem 0;padding:.5rem}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style></head><body>
<h1>Relay redirect probe</h1><p>Build ${BUILD}. Synthetic data only. Keep YouTube closed. Leave the proxy app and its MITM enabled.</p>
<label>Diagnostic Worker origin (separate from the playback Worker)<input id="origin" type="url" value="https://youtube-enhance-redirect-probe.hermanworkstk.workers.dev" autocomplete="off"></label>
<button id="run">Run five checks</button><button id="save" disabled>Save report</button><pre id="out">No checks run.</pre><pre id="report"></pre>
<script>
const BUILD=${JSON.stringify(BUILD)},FIXTURE=${JSON.stringify(FIXTURE)};
const headersFor=name=>({'Content-Type':'application/octet-stream','Authorization':'Bearer '+FIXTURE.token,
'X-YTE-Target':FIXTURE.target,'X-YTE-Client-Key':FIXTURE.clientKey,'X-YTE-Upstream-Headers':FIXTURE.upstream,
'X-YTE-Options':FIXTURE.options,'X-YTE-Platform':'youtube','X-Probe-Build':BUILD,'X-Probe-Case':name});
let report;
document.getElementById('run').onclick=async function(){
 const origin=document.getElementById('origin').value.replace(/\/$/,'');
 if(!/^https:\/\/youtube-enhance-redirect-probe\.[a-z0-9-]+\.workers\.dev$/.test(origin)){document.getElementById('out').textContent='Enter the HTTPS origin of the separate youtube-enhance-redirect-probe Worker.';return;}
 this.disabled=true;document.getElementById('save').disabled=true;
 report={build:BUILD,startedAt:new Date().toISOString(),results:[],scope:'Synthetic native rewrite capability; not YouTube filtering, native streaming, memory or shutdown validation.'};
 const out=document.getElementById('out');out.textContent='';
 for(const name of ['control','url-only','url-headers','bad-token','binary-response']){
  let timer;
  try{
   const url=name==='control'?origin+'/v1/probe/control':'/yt-relay-redirect-probe/run/'+name+'?origin='+encodeURIComponent(origin);
   const controller=new AbortController();timer=setTimeout(()=>controller.abort(),15000);
   const response=await fetch(url,{method:'POST',credentials:'omit',redirect:'error',cache:'no-store',signal:controller.signal,
    headers:name==='control'?headersFor(name):{'Content-Type':'application/octet-stream'},body:new Uint8Array(FIXTURE.body)});
   const bytes=new Uint8Array(await response.arrayBuffer());
   const result={case:name,status:response.status,responseBytes:bytes.length,buildMatches:response.headers.get('X-Probe-Build')===BUILD};
   if(name==='binary-response')result.byteMatch=bytes.length===65536&&bytes.every((n,i)=>n===i%256);
   else{try{const json=JSON.parse(new TextDecoder().decode(bytes));for(const key of ['bodyMatches','headersMatch','methodMatches','tokenAccepted'])if(key in json)result[key]=json[key];result.caseMatches=json.case===name;}catch{result.jsonValid=false;}}
   result.passed=result.buildMatches&&(name==='bad-token'?result.status===401&&result.tokenAccepted===false&&result.caseMatches:
    result.status===200&&(name==='binary-response'?result.byteMatch:result.caseMatches&&result.methodMatches&&result.bodyMatches&&result.headersMatch));
   report.results.push(result);out.textContent+=name+' | '+(result.passed?'PASS':'FAIL')+' | HTTP '+result.status+' | '+result.responseBytes+' bytes\n';
  }catch{report.results.push({case:name,passed:false,error:'request-failed-or-redirected'});out.textContent+=name+' | FAIL | request failed, timed out, or HTTP redirect rejected\n';}
  finally{clearTimeout(timer);}
  if(name==='control'&&!report.results[0].passed){out.textContent+='Stopped: verify the diagnostic Worker deployment and origin first.\n';break;}
 }
 report.finishedAt=new Date().toISOString();report.controlPassed=report.results[0].passed;
 document.getElementById('report').textContent=JSON.stringify(report,null,2);this.disabled=false;document.getElementById('save').disabled=false;
};
document.getElementById('save').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));a.download='yt-relay-redirect-probe.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
</script></body></html>`;
    localReply('200 OK', page, 'text/html; charset=utf-8'); return;
  }
  if (($request.method || '').toUpperCase() !== 'POST') { localReply('405 Method Not Allowed', 'POST required'); return; }
  let origin;
  try {
    const pairs = (match[2] || '').split('&');
    const values = pairs.filter(p => p.split('=')[0] === 'origin').map(p => decodeURIComponent(p.slice(p.indexOf('=') + 1)));
    if (values.length !== 1 || !/^https:\/\/youtube-enhance-redirect-probe\.[a-z0-9-]+\.workers\.dev$/.test(values[0])) throw Error();
    origin = values[0];
  } catch { localReply('400 Bad Request', 'Invalid diagnostic Worker origin'); return; }
  const headers = {'Content-Type': 'application/octet-stream',
    'Authorization': 'Bearer ' + (name === 'bad-token' ? 'PUBLIC-FIXTURE-WRONG-TOKEN' : FIXTURE.token),
    'X-YTE-Target': FIXTURE.target, 'X-YTE-Client-Key': FIXTURE.clientKey,
    'X-YTE-Upstream-Headers': FIXTURE.upstream, 'X-YTE-Options': FIXTURE.options,
    'X-YTE-Platform': 'youtube', 'X-Probe-Build': BUILD, 'X-Probe-Case': name};
  // Preserve the native POST body. Do not read, copy, fetch or echo it in JS.
  console.log('[YT-REDIRECT-PROBE] build=' + BUILD + ' client=' + (qx ? 'QX' : typeof $rocket !== 'undefined' ? 'Shadowrocket' : 'Surge-compatible') + ' case=' + name + ' action=rewrite');
  $done({url: origin + '/v1/probe/' + name, ...(name === 'url-only' ? {} : {headers})});
})();
