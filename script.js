/* ============================================================
   🧵 HOW TO ADD YOUR OWN CLOTHING IMAGES (no manual list-editing needed)
   ------------------------------------------------------------
   1) Drop your PNG files straight into assets/<category>/, e.g.
        assets/dress/dress_01.png
        assets/dress/dress_02.png
        assets/jacket/denim_jacket.png
   2) Run this once from the project folder (needs Node.js):
        node generate-manifest.js
      It scans every assets/<category>/ folder and writes
      assets/manifest.json automatically — no hand-written entries.
   3) Reload the page. The closet loads assets/manifest.json on
      startup and fills every category for you.
   4) Every clothing image must be drawn on a transparent canvas with
      the SAME aspect ratio as the base character, in the same
      position/scale, so the layers line up exactly.
      Base character canvas ratio = 9 : 16 (width : height, i.e. 0.5625)
      e.g. author your art at 1080×1920 or 1620×2880 (same ratio).

   Note: fetch() needs the page served over http(s), not opened as a
   local file:// path — use a simple local server (e.g. VS Code's
   "Live Server", or `npx serve`) while you work on this.

   (Advanced/optional: you can still push extra items into
   ASSET_LIBRARY[category] by hand — the "+ Add image" tester tiles
   do exactly that — the manifest just fills it in automatically.)
   ============================================================ */

let ASSET_LIBRARY = {
  blazer: [], blouse: [], cardigan: [], coat: [], dress: [],
  hoodie: [], hooded_zip_up: [], jacket: [], jeans: [], pants: [],
  polo_shirt: [], poncho: [], romper: [], shirt: [], shorts: [],
  skirt: [], sweater: [], sweatshirt: [], swimsuit: [], t_shirt: [],
  top: [], vest: [],
  shoes: [],
  bag: [], glasses: []
};

async function loadManifest(){
  try{
    const res = await fetch('assets/manifest.json', { cache: 'no-store' });
    if (!res.ok) return;
    const manifest = await res.json();
    Object.keys(manifest).forEach(cat => {
      if (ASSET_LIBRARY[cat]) ASSET_LIBRARY[cat] = manifest[cat];
    });
  }catch(err){
    // No manifest yet (or page opened via file://) — closet just starts empty.
    console.info('No assets/manifest.json loaded yet. Run "node generate-manifest.js" after adding images.');
  }
}


// Tab order + display labels
const CLOTHES_CATS = [
  ['blazer','Blazer'], ['blouse','Blouse'], ['cardigan','Cardigan'],
  ['coat','Coat'], ['dress','Dress'], ['hoodie','Hoodie'],
  ['hooded_zip_up','Hooded Zip-Up'], ['jacket','Jacket'], ['jeans','Jeans'],
  ['pants','Pants'], ['polo_shirt','Polo Shirt'],
  ['poncho','Poncho'], ['romper','Romper'], ['shirt','Shirt'],
  ['shorts','Shorts'], ['skirt','Skirt'], ['sweater','Sweater'],
  ['sweatshirt','Sweatshirt'], ['swimsuit','Swimsuit'], ['t_shirt','T-Shirt'],
  ['top','Top'], ['vest','Vest'], ['shoes','Shoes']
];
const ACCESSORY_CATS = [
  ['bag','Bag'], ['glasses','Glasses']
];

// On-screen stacking order (z-index): bottom -> top.
// BOTTOM_GROUP and TOP_GROUP can swap places depending on the
// "Top layer" toggle the user controls in the UI (see topOverBottom below).
const BOTTOM_GROUP = ['pants','jeans','shorts','skirt'];
const TOP_GROUP = ['shirt','blouse','t_shirt','top','polo_shirt'];
const DRESS_GROUP = ['dress','romper','swimsuit'];
const MID_AND_OUTER = [
  'sweater','hoodie','hooded_zip_up','sweatshirt','cardigan','vest',
  'jacket','coat','blazer','poncho',
  'shoes','bag','glasses'
];

let topOverBottom = true; // true = top-wear drawn over bottom-wear (default/classic look)

function getLayerOrder(){
  const base = topOverBottom
    ? [...BOTTOM_GROUP, ...DRESS_GROUP, ...TOP_GROUP]
    : [...TOP_GROUP, ...DRESS_GROUP, ...BOTTOM_GROUP];
  return [...base, ...MID_AND_OUTER];
}

// Categories that auto-unequip each other for a natural-looking outfit
const CONFLICT_GROUPS = [
  [...DRESS_GROUP, ...BOTTOM_GROUP, ...TOP_GROUP]
];

const ALL_CATS = [...CLOTHES_CATS, ...ACCESSORY_CATS].map(c => c[0]);
const LABEL = Object.fromEntries([...CLOTHES_CATS, ...ACCESSORY_CATS]);

// Pool of stage backdrop colors to pick from. Add/remove/edit freely.
const STAGE_BG_PRESETS = [
  { name: 'White',    value: '#FFFFFF' },
  { name: 'Blush',    value: '#FFEEF3' },
  { name: 'Ivory',    value: '#FBF8F1' },
  { name: 'Mint',     value: '#E6F6F0' },
  { name: 'Sky',      value: '#E9F2FB' },
  { name: 'Lavender', value: '#F1EDFB' },
  { name: 'Butter',   value: '#FDF6DF' },
  { name: 'Slate',    value: '#E9E7E4' }
];
let currentBg = STAGE_BG_PRESETS[0].value;

let currentCat = 'dress';
let worn = {}; // { category: item }

const stageFrame = document.getElementById('stageFrame');
const bgPicker = document.getElementById('bgPicker');
const tabsClothesEl = document.getElementById('tabsClothes');
const tabsAccEl = document.getElementById('tabsAccessories');
const gridEl = document.getElementById('grid');
const gridCatName = document.getElementById('gridCatName');
const gridCount = document.getElementById('gridCount');
const outfitRows = document.getElementById('outfitRows');
const fileInput = document.getElementById('fileInput');

function renderBgPicker(){
  const swatches = STAGE_BG_PRESETS.map(p => `
    <button class="bg-swatch ${p.value === currentBg ? 'active' : ''}"
            style="background:${p.value}" title="${p.name}" data-value="${p.value}"></button>
  `).join('');
  bgPicker.innerHTML = `<span class="bg-label">Backdrop</span>${swatches}`;
  bgPicker.querySelectorAll('.bg-swatch').forEach(el => {
    el.addEventListener('click', () => {
      currentBg = el.dataset.value;
      stageFrame.style.background = currentBg;
      renderBgPicker();
    });
  });
}

function renderTabs(){
  tabsClothesEl.innerHTML = CLOTHES_CATS.map(tabHtml).join('');
  tabsAccEl.innerHTML = ACCESSORY_CATS.map(tabHtml).join('');
  [...tabsClothesEl.querySelectorAll('.tab'), ...tabsAccEl.querySelectorAll('.tab')]
    .forEach(btn => btn.addEventListener('click', () => {
      currentCat = btn.dataset.cat;
      renderTabs();
      renderGrid();
    }));
}
function tabHtml([key,label]){
  const active = key === currentCat ? 'active' : '';
  const has = worn[key] ? '<span class="dot"></span>' : '';
  return `<button class="tab ${active}" data-cat="${key}">${label}${has}</button>`;
}

function renderGrid(){
  gridCatName.textContent = LABEL[currentCat];
  const items = ASSET_LIBRARY[currentCat] || [];
  gridCount.textContent = items.length ? `${items.length} item${items.length > 1 ? 's' : ''}` : '';

  let html = '';
  items.forEach(item => {
    const sel = worn[currentCat] && worn[currentCat].id === item.id ? 'selected' : '';
    html += `
      <div class="item ${sel}" data-id="${item.id}">
        <div class="thumb"><img src="${item.src}" alt="${item.name}"></div>
        <div class="name">${item.name}</div>
      </div>`;
  });

  html += `
    <div class="add-tile" id="addTile">
      <div class="plus">＋</div>
      <div class="lbl">Add image</div>
    </div>`;

  if (!items.length){
    html += `<div class="empty-note">No "${LABEL[currentCat]}" items yet.
      Drop PNGs into <code>assets/${currentCat}/</code> and run
      <code>node generate-manifest.js</code>, or use "＋ Add image" above
      to test with a file from your computer.</div>`;
  }

  gridEl.innerHTML = html;

  gridEl.querySelectorAll('.item').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      const item = items.find(i => i.id === id);
      if (worn[currentCat] && worn[currentCat].id === id){
        delete worn[currentCat];
      } else {
        applyConflicts(currentCat);
        worn[currentCat] = item;
      }
      renderTabs();
      renderGrid();
      renderStage();
      renderOutfit();
    });
  });

  document.getElementById('addTile').addEventListener('click', () => {
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const id = currentCat + '_' + Date.now();
      ASSET_LIBRARY[currentCat].push({ id, name: file.name.replace(/\.[^.]+$/, ''), src: url });
      renderGrid();
      fileInput.value = '';
    };
    fileInput.click();
  });
}

function applyConflicts(cat){
  const group = CONFLICT_GROUPS.find(g => g.includes(cat));
  if (!group) return;
  group.forEach(c => { if (c !== cat) delete worn[c]; });
}

function renderStage(){
  stageFrame.querySelectorAll('img.layer:not(#baseLayer)').forEach(el => el.remove());
  getLayerOrder().forEach(cat => {
    const item = worn[cat];
    if (!item) return;
    const img = document.createElement('img');
    img.className = 'layer';
    img.src = item.src;
    img.alt = item.name;
    stageFrame.appendChild(img);
  });
}

function renderOutfit(){
  const entries = ALL_CATS.filter(c => worn[c]);
  if (!entries.length){
    outfitRows.innerHTML = '<div class="outfit-empty">Nothing on yet.</div>';
    return;
  }
  outfitRows.innerHTML = entries.map(c => `
    <div class="outfit-row">
      <span class="cat">${LABEL[c]}</span>
      <span class="val">${worn[c].name} <span class="x" data-cat="${c}">✕</span></span>
    </div>
  `).join('');
  outfitRows.querySelectorAll('.x').forEach(el => {
    el.addEventListener('click', () => {
      delete worn[el.dataset.cat];
      renderTabs(); renderGrid(); renderStage(); renderOutfit();
    });
  });
}

document.getElementById('btnReset').addEventListener('click', () => {
  worn = {};
  renderTabs(); renderGrid(); renderStage(); renderOutfit();
});

document.getElementById('btnRandom').addEventListener('click', () => {
  worn = {};
  ALL_CATS.forEach(cat => {
    const items = ASSET_LIBRARY[cat];
    if (!items || !items.length) return;
    if (Math.random() < 0.5) return; // sometimes leave this category empty
    const pick = items[Math.floor(Math.random() * items.length)];
    applyConflicts(cat);
    worn[cat] = pick;
  });
  renderTabs(); renderGrid(); renderStage(); renderOutfit();
});

document.getElementById('btnSave').addEventListener('click', async () => {
  const W = 1080, H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const loadImg = (src) => new Promise((res, rej) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });

  try{
    const base = await loadImg(document.getElementById('baseLayer').src);
    ctx.fillStyle = currentBg;
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(base, 0, 0, W, H);
    for (const cat of getLayerOrder()){
      const item = worn[cat];
      if (!item) continue;
      const im = await loadImg(item.src);
      ctx.drawImage(im, 0, 0, W, H);
    }
    const a = document.createElement('a');
    a.download = 'my-outfit.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  }catch(err){
    alert('Something went wrong saving the image. (Cross-origin images can be blocked by browser security policy.)');
    console.error(err);
  }
});

document.querySelectorAll('#layerToggle .tab').forEach(btn => {
  btn.addEventListener('click', () => {
    topOverBottom = btn.dataset.mode === 'topOverBottom';
    document.querySelectorAll('#layerToggle .tab').forEach(b =>
      b.classList.toggle('active', b.dataset.mode === btn.dataset.mode)
    );
    renderStage();
  });
});

stageFrame.style.background = currentBg;
renderBgPicker();
renderTabs();
renderGrid();
renderOutfit();

loadManifest().then(() => {
  renderTabs();
  renderGrid();
});