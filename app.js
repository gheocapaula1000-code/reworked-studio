// Reworked Studio — PWA per stilisti e sarti (mobile first, ottima anche su monitor grande)
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const keyHint = $('keyHint');
const steps = document.querySelectorAll('#steps li');
const isWide = () => window.matchMedia('(min-width: 1100px)').matches;

const apiKeyInput = $('apiKey');
const projectName = $('projectName');
const itemType = $('itemType');
const materials = $('materials');
const style = $('style');
const extraPrompt = $('extraPrompt');
const generateBtn = $('generateBtn');
const saveBtn = $('saveBtn');
const downloadBtn = $('downloadBtn');
const printBtn = $('printBtn');
const zoomInBtn = $('zoomInBtn');
const zoomOutBtn = $('zoomOutBtn');
const viewer = $('viewer');
const notes = $('notes');
const gallery = $('gallery');
const projectList = $('projectList');
const status = $('status');
const currentTitle = $('currentTitle');

let currentImageUrl = null;
let zoomLevel = 1;
let projects = [];
try { projects = JSON.parse(localStorage.getItem('reworked_studio_projects') || '[]') || []; } catch (e) { projects = []; }

// PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {});
}

// Load saved key
apiKeyInput.value = localStorage.getItem('reworked_api_key') || '';
function saveKey() {
  try { localStorage.setItem('reworked_api_key', apiKeyInput.value.trim()); } catch (e) {}
  apiKeyInput.classList.remove('need');
  keyHint.classList.remove('warn');
  updateSteps();
}
apiKeyInput.addEventListener('change', saveKey);
apiKeyInput.addEventListener('input', updateSteps);
[itemType, materials, style, extraPrompt].forEach((el) => el.addEventListener('input', updateSteps));

// Guida: segna i passi fatti, così il prossimo passo è sempre chiaro
function updateSteps() {
  const hasKey = !!apiKeyInput.value.trim();
  const hasBrief = !!(materials.value.trim() || extraPrompt.value.trim());
  if (steps[0]) steps[0].classList.toggle('done', hasKey);
  if (steps[1]) steps[1].classList.toggle('done', hasKey && hasBrief);
  if (steps[2]) steps[2].classList.toggle('done', !!currentImageUrl);
}

function setStatus(msg) { status.textContent = msg; }

function showImage(url, title = 'Disegno tecnico') {
  currentImageUrl = url;
  currentTitle.textContent = title;
  viewer.innerHTML = `<img src="${esc(url)}" alt="${esc(title)}" style="transform: scale(${zoomLevel})">`;
  setStatus('Disegno caricato');
  updateSteps();
}

function addToGallery(url, label) {
  const thumb = document.createElement('div');
  thumb.className = 'thumb';
  thumb.innerHTML = `<img src="${esc(url)}" alt=""><div class="thumb-label">${esc(label)}</div>`;
  thumb.onclick = () => showImage(url, label);
  gallery.prepend(thumb);
}

function renderProjects() {
  if (window.navBadge) window.navBadge('projBadge', projects.length);
  if (!projects.length) {
    projectList.innerHTML = '<em>Nessun progetto salvato. Crea un disegno e premi «Salva progetto».</em>';
    return;
  }
  projectList.innerHTML = projects.slice(0, 8).map((p, i) =>
    `<button type="button" class="project-item" data-i="${i}">${esc(p.name || 'Senza nome')} <small>${new Date(p.date).toLocaleDateString('it-IT')}</small></button>`
  ).join('');
  projectList.querySelectorAll('[data-i]').forEach(el => {
    el.onclick = () => loadProject(+el.dataset.i);
  });
}

function loadProject(i) {
  const p = projects[i];
  projectName.value = p.name || '';
  itemType.value = p.itemType || itemType.value;
  materials.value = p.materials || '';
  style.value = p.style || style.value;
  extraPrompt.value = p.extra || '';
  notes.value = p.notes || '';
  if (p.imageUrl) showImage(p.imageUrl, p.name);
  setStatus(`Progetto caricato: ${p.name}`);
  updateSteps();
  if (!isWide() && window.goTab) window.goTab('disegno');
}

function buildPrompt() {
  const mat = materials.value || 'materiali usati al kg (denim, cotone, jersey)';
  const extra = extraPrompt.value ? extraPrompt.value : 'vista fronte e retro, linee di costruzione chiare';
  return `Professional fashion technical flat sketch, front and back views side by side, original unique reworked design, ${itemType.value} made from ${mat}, ${style.value} style, completely original (not a copy of any brand), clean black vector lines on pure white background, high resolution, production-ready for Italian tailor and stylist, clear seams, pockets, hardware, no logos. ${extra}`;
}

generateBtn.onclick = async () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    apiKeyInput.classList.add('need');
    keyHint.classList.add('warn');
    setStatus('Prima incolla la chiave API (es. Recraft)');
    if (!isWide() && window.goTab) window.goTab('crea');
    apiKeyInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    apiKeyInput.focus();
    return;
  }
  saveKey();

  const prompt = buildPrompt();
  setStatus('Generazione in corso…');
  generateBtn.disabled = true;

  try {
    const res = await fetch('https://external.api.recraft.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        model: 'recraftv4_1_vector',
        size: '1820x1024',
        style: 'vector_illustration'
      })
    });

    if (!res.ok) {
      const txt = (await res.text()).slice(0, 200);
      if (res.status === 401 || res.status === 403) throw new Error('chiave API non valida o scaduta');
      if (res.status === 402) throw new Error('credito API esaurito sul tuo account Recraft');
      throw new Error(txt || ('errore ' + res.status));
    }
    const data = await res.json();
    const url = data.data?.[0]?.url || data.url;
    if (!url) throw new Error('Nessuna immagine ricevuta');

    const title = projectName.value || itemType.value;
    showImage(url, title);
    addToGallery(url, title);
    notes.value = `PROMPT USATO:\n${prompt}\n\nNOTE PRODUZIONE:\n• Materiali: ${materials.value || 'da usato al kg'}\n• Stile: ${style.value}\n• Controllare cuciture e hardware con il sarto\n• Aggiungere misure precise se necessario`;
    setStatus('Disegno generato con successo');
    if (!isWide() && window.goTab) window.goTab('disegno');
  } catch (err) {
    const msg = (err && err.message) || '';
    setStatus(navigator.onLine === false || /Failed to fetch|NetworkError|Load failed/i.test(msg)
      ? 'Errore: non riesco a contattare il servizio. Controlla la rete e riprova.'
      : 'Errore: ' + msg);
    console.error(err);
  } finally {
    generateBtn.disabled = false;
  }
};

saveBtn.onclick = () => {
  const proj = {
    name: projectName.value || 'Senza nome',
    itemType: itemType.value,
    materials: materials.value,
    style: style.value,
    extra: extraPrompt.value,
    notes: notes.value,
    imageUrl: currentImageUrl,
    date: Date.now()
  };
  projects.unshift(proj);
  projects = projects.slice(0, 40);
  try {
    localStorage.setItem('reworked_studio_projects', JSON.stringify(projects));
    setStatus('Progetto salvato su questo dispositivo');
  } catch (e) {
    setStatus('Spazio pieno: elimina qualche progetto vecchio e riprova');
  }
  renderProjects();
};

downloadBtn.onclick = async () => {
  if (!currentImageUrl) { setStatus('Nessun disegno da scaricare: prima generane uno'); return; }
  const base = (projectName.value || 'reworked-design').replace(/[^\w\- ]+/g, '').trim() || 'reworked-design';
  const a = document.createElement('a');
  try {
    // Scarica davvero il file (il link diretto di un altro sito a volte si apre solo in una scheda)
    const blob = await (await fetch(currentImageUrl)).blob();
    const ext = /svg/.test(blob.type) ? 'svg' : /jpe?g/.test(blob.type) ? 'jpg' : /webp/.test(blob.type) ? 'webp' : 'png';
    a.href = URL.createObjectURL(blob);
    a.download = `${base}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } catch (e) {
    a.href = currentImageUrl;
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
  }
};

printBtn.onclick = () => {
  if (!currentImageUrl) { setStatus('Nessun disegno da stampare: prima generane uno'); return; }
  const w = window.open('', '_blank');
  if (!w) { setStatus('Il browser ha bloccato la finestra di stampa: consenti i popup e riprova'); return; }
  w.document.write(`
    <html lang="it"><head><meta charset="utf-8"><title>Scheda tecnica</title>
    <style>body{font-family:system-ui;padding:2rem;max-width:1100px;margin:auto}
    img{max-width:100%;border:1px solid #ddd} pre{white-space:pre-wrap;background:#f9f9f9;padding:1rem}</style></head>
    <body>
    <h1>${esc(projectName.value || 'Disegno tecnico')}</h1>
    <img src="${esc(currentImageUrl)}" alt="">
    <h2>Note di produzione</h2>
    <pre>${esc(notes.value)}</pre>
    <p><small>Generato con Reworked Studio</small></p>
    </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
};

zoomInBtn.onclick = () => { zoomLevel = Math.min(zoomLevel + 0.15, 3); updateZoom(); };
zoomOutBtn.onclick = () => { zoomLevel = Math.max(zoomLevel - 0.15, 0.4); updateZoom(); };

function updateZoom() {
  const img = viewer.querySelector('img');
  if (img) img.style.transform = `scale(${zoomLevel})`;
}

// Init
renderProjects();
updateSteps();
setStatus(apiKeyInput.value.trim() ? 'Pronto: scegli il capo e premi Genera' : 'Pronto: incolla la chiave API e genera un disegno');
