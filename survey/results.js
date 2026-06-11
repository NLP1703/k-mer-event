// K-MER EVENT survey results dashboard — live updates via Socket.IO with a
// polling fallback. External file to satisfy CSP script-src 'self'.

// Google Forms response-chart palette.
const COLORS = ['#4285F4','#DB4437','#F4B400','#0F9D58','#AB47BC','#00ACC1',
                '#FF7043','#9E9D24','#5C6BC0','#EC407A','#26A69A','#8D6E63'];
const SCALE_KEYS = ['q7','q11'];

const $ = (id) => document.getElementById(id);
const qs = new URLSearchParams(location.search);
const defApi = location.protocol === 'file:' ? 'http://localhost:4000' : location.origin;
$('api').value   = qs.get('api')   || localStorage.getItem('kmer_api')   || defApi;
$('token').value = qs.get('token') || localStorage.getItem('kmer_token') || '';

let apiBase = '';
let lastSig = null;        // signature of last rendered data (avoids flicker)
let pollTimer = null;
let socket = null;
let live = false;          // socket connected?

$('print').addEventListener('click', () => window.print());
$('load').addEventListener('click', () => fetchResults(false));
if ($('token').value) fetchResults(false);

function esc(s){ return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function setStatus(msg, err){ const s=$('status'); s.className='hint status'+(err?' err':''); s.innerHTML=msg; }

function liveBadge(){
  const t = new Date().toLocaleTimeString();
  return (live ? '🟢 Live' : '↻ Auto-refresh (20s)') + ' · updated ' + t;
}

function stopRealtime(){
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  if (socket) { try { socket.disconnect(); } catch(_){} socket = null; }
  live = false;
}

// Start realtime once we have a working token/connection.
function startRealtime(){
  // Polling fallback (safe interval, well under the API rate limit).
  if (!pollTimer) pollTimer = setInterval(() => fetchResults(true), 20000);

  // Socket.IO push (instant). Guarded in case the client script didn't load.
  if (!socket && typeof io !== 'undefined') {
    try {
      socket = io(apiBase || undefined, { transports: ['websocket', 'polling'] });
      socket.on('connect',    () => { live = true;  setStatus(liveBadge(), false); });
      socket.on('disconnect', () => { live = false; });
      socket.on('survey:new', () => fetchResults(true));   // new response -> refresh
    } catch (_) { /* fall back to polling only */ }
  }
}

async function fetchResults(quiet){
  apiBase = $('api').value.trim().replace(/\/$/,'');
  const token = $('token').value.trim();
  localStorage.setItem('kmer_api', apiBase);
  localStorage.setItem('kmer_token', token);
  if (!quiet) setStatus('Loading…', false);

  try{
    const r = await fetch(apiBase + '/api/survey/results', {
      headers: token ? { Authorization: 'Bearer ' + token } : {},
    });
    if(!r.ok){
      const b = await r.json().catch(() => ({}));
      throw new Error((b.message || ('HTTP ' + r.status)) + (r.status===403 ? ' — token must be an admin.' : ''));
    }
    const data = await r.json();

    // Only re-render when the data actually changed (keeps charts steady).
    const sig = JSON.stringify(data.results.map(q => q.options));
    if (sig !== lastSig) {
      lastSig = sig;
      $('count').textContent = data.total + ' response' + (data.total===1 ? '' : 's');
      render(data);
    }
    setStatus(liveBadge(), false);
    startRealtime();
  }catch(ex){
    // Auth errors are terminal — stop hammering and tell the user.
    const fatal = /admin|Unauthorized|Authentication|expired|HTTP 401|HTTP 403/i.test(ex.message);
    if (fatal) {
      stopRealtime();
      setStatus('⚠ ' + ex.message, true);
      $('grid').innerHTML = '';
      $('count').textContent = 'Responses';
    } else if (!quiet) {
      setStatus('⚠ ' + ex.message, true);
    }
    // transient errors during quiet polling are ignored (keep last good view)
  }
}

function render(data){
  const grid = $('grid');
  grid.innerHTML = '';
  data.results.forEach((q, i) => {
    const card = document.createElement('div');
    card.className = 'card fig';
    let chart;
    if(!q.options.length)               chart = '<div class="empty">No responses yet.</div>';
    else if(q.multi)                    chart = hbars(q.options);
    else if(SCALE_KEYS.includes(q.key)) chart = columns(q.options);
    else                                chart = pie(q.options);

    card.innerHTML =
      '<p class="figno">Figure 4.' + (i+1) + '</p>' +
      '<h3>' + esc(q.label) + '</h3>' +
      '<p class="sub">' + (q.multi ? 'Checkboxes' : (SCALE_KEYS.includes(q.key) ? 'Linear scale' : 'Multiple choice')) + '</p>' +
      chart;
    grid.appendChild(card);
  });
}

// Pie chart + legend (single-choice).
function pie(options){
  const sum = options.reduce((a,o)=>a+o.count,0) || 1;
  let acc = 0;
  const stops = options.map((o,i)=>{
    const c=COLORS[i%COLORS.length];
    const s=acc/sum*360; acc+=o.count; const e=acc/sum*360;
    return c+' '+s.toFixed(1)+'deg '+e.toFixed(1)+'deg';
  }).join(', ');
  const legend = options.map((o,i)=>
    '<div class="leg"><span class="sw" style="background:'+COLORS[i%COLORS.length]+'"></span>'+
    '<span class="lab">'+esc(o.option)+'</span>'+
    '<span class="val">'+o.count+' ('+o.percentage+'%)</span></div>').join('');
  return '<div class="pie-row"><div class="pie" style="background:conic-gradient('+stops+')"></div>'+
         '<div class="legend">'+legend+'</div></div>';
}

// Horizontal bars (multi-select / checkboxes).
function hbars(options){
  const max = Math.max(...options.map(o=>o.count),1);
  return '<div class="hbars">'+options.map((o,i)=>
    '<div class="hbar"><div class="top"><span>'+esc(o.option)+'</span>'+
    '<span class="val">'+o.count+' ('+o.percentage+'%)</span></div>'+
    '<div class="htrack"><div class="hfill" style="width:'+(o.count/max*100)+'%;background:'+COLORS[i%COLORS.length]+'"></div></div>'+
    '</div>').join('')+'</div>';
}

// Vertical columns (linear scale 1..5).
function columns(options){
  const ordered = [...options].sort((a,b)=>(parseFloat(a.option)||0)-(parseFloat(b.option)||0));
  const max = Math.max(...ordered.map(o=>o.count),1);
  const cols = ordered.map(o=>
    '<div class="col"><span class="cv">'+o.count+'</span>'+
    '<div class="cbar" style="height:'+(o.count/max*100)+'%"></div></div>').join('');
  const labels = ordered.map(o=>'<div class="sx">'+esc(o.option)+'</div>').join('');
  return '<div class="cols">'+cols+'</div><div class="scale-x">'+labels+'</div>';
}
