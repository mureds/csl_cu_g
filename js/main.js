// main.js — UI wiring, orientation-relationship presets, live state.
import { MOTIFS, rotationMatrix, mulM, IDENTITY, misfitInfo, cslSeriesAboutAxis } from './csl.js';
import { View2D } from './view2d.js';
import { View3D } from './view3d.js';

const $ = (id) => document.getElementById(id);

// ---- Default material parameters (EDIT THESE with your exact values) --------
const DEFAULTS = {
  aCu: 3.615,        // Cu FCC lattice parameter (Å)
  aG:  10.845,       // G-phase lattice parameter (Å) — placeholder ≈ 3 x aCu
  latCu: 'FCC',
  latG:  'FCC',
  tolFrac: 0.10,     // coincidence tolerance as fraction of aCu
  region: 16,        // half-extent of the shown block (Å)
  hkl: [0,0,1],      // interface plane normal
  inPlane: [1,0,0],
};

// Orientation-relationship presets. Each returns rotation matrix for phase B.
const OR_PRESETS = {
  'cube-on-cube':    () => IDENTITY,
  'twist-θ (001)':   (t) => rotationMatrix([0,0,1], t),
  'tilt-θ (010)':    (t) => rotationMatrix([0,1,0], t),
  'Σ5 36.87° [001]': () => rotationMatrix([0,0,1], 36.8699),
  'Σ3 60° [111]':    () => rotationMatrix([1,1,1], 60),
  'Σ7 38.21° [111]': () => rotationMatrix([1,1,1], 38.2132),
  'Kurdjumov–Sachs': () => rotationMatrix([1,1,1], 5.26), // approx residual twist about [111]
};

const view2d = new View2D($('cv2d'));
const view3d = new View3D($('view3d'));
view3d.onCounts = (c) => {
  $('n-cu').textContent = c.cu.toLocaleString();
  $('n-g').textContent = c.g.toLocaleString();
  $('n-coin').textContent = c.coin.toLocaleString();
};

function resizeAll() { view2d.resize(); view3d.resize(); view2d.render(); }
window.addEventListener('resize', resizeAll);

function readState() {
  const aCu = parseFloat($('aCu').value) || DEFAULTS.aCu;
  const aG  = parseFloat($('aG').value)  || DEFAULTS.aG;
  const theta = parseFloat($('theta').value) || 0;
  const preset = $('orPreset').value;
  const rotB = OR_PRESETS[preset] ? OR_PRESETS[preset](theta) : IDENTITY;
  const hkl = $('hkl').value.split(/[\s,]+/).map(Number);
  const tolFrac = parseFloat($('tol').value);
  const region = parseFloat($('region').value);
  return {
    aCu, aG,
    motifCu: MOTIFS[$('latCu').value], motifG: MOTIFS[$('latG').value],
    rotA: IDENTITY, rotB,
    hkl: hkl.length === 3 ? hkl : DEFAULTS.hkl,
    inPlane: DEFAULTS.inPlane,
    tol: tolFrac * aCu,
    region,
  };
}

function refresh() {
  const s = readState();
  view2d.setState(s);
  view3d.setState(s);

  // readouts
  const mi = misfitInfo(s.aCu, s.aG);
  $('r-ratio').textContent  = mi.r.toFixed(4);
  $('r-n').textContent      = mi.n;
  $('r-misfit').textContent = (mi.delta * 100).toFixed(2) + ' %';
  $('r-moire').textContent  = isFinite(mi.moire) ? mi.moire.toFixed(2) + ' Å' : '∞ (perfect)';
  $('r-tol').textContent    = s.tol.toFixed(3) + ' Å';

  // exact same-lattice CSL series about the interface normal (reference table)
  const series = cslSeriesAboutAxis(s.hkl, 51).slice(0, 8);
  $('csl-table').innerHTML = series.map(x =>
    `<tr><td>Σ${x.sigma}</td><td>${x.theta.toFixed(2)}°</td></tr>`).join('') ||
    '<tr><td colspan="2">축 [hkl]을 확인하세요</td></tr>';
}

// ---- wire controls ----
function bind(id, ev = 'input') { $(id).addEventListener(ev, refresh); }
['aCu','aG','theta','hkl','tol','region','latCu','latG','orPreset'].forEach(id => bind(id));

$('theta').addEventListener('input', () => { $('theta-val').textContent = $('theta').value + '°'; });
$('tol').addEventListener('input',   () => { $('tol-val').textContent = (parseFloat($('tol').value)*100).toFixed(0) + '%'; });
$('region').addEventListener('input',() => { $('region-val').textContent = $('region').value + ' Å'; });

for (const key of ['cu','g','coin','plane']) {
  $('tg-' + key).addEventListener('change', (e) => view3d.toggle(key, e.target.checked));
}

$('reset').addEventListener('click', () => {
  $('aCu').value = DEFAULTS.aCu; $('aG').value = DEFAULTS.aG;
  $('theta').value = 0; $('theta-val').textContent = '0°';
  $('orPreset').value = 'cube-on-cube';
  $('hkl').value = '0 0 1';
  $('tol').value = DEFAULTS.tolFrac; $('tol-val').textContent = '10%';
  $('region').value = DEFAULTS.region; $('region-val').textContent = DEFAULTS.region + ' Å';
  refresh();
});

// tab switching
for (const btn of document.querySelectorAll('.tab')) {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    $(btn.dataset.target).classList.add('active');
    resizeAll();
  });
}

// init
$('aCu').value = DEFAULTS.aCu; $('aG').value = DEFAULTS.aG;
$('region').value = DEFAULTS.region; $('tol').value = DEFAULTS.tolFrac;
refresh();
// size after first layout pass (getBoundingClientRect is 0 before paint)
requestAnimationFrame(() => { resizeAll(); requestAnimationFrame(resizeAll); });
window.addEventListener('load', resizeAll);
