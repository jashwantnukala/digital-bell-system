/* =========================================================================
   Site integration
   -------------------------------------------------------------------------
   Mounts one GARGANTUA renderer behind every page of the Digital Smart Bell
   System and choreographs it:

   - Home: a cinematic first-visit intro (dolly in from deep space, wordmark,
     hero reveal), skippable, played once per session.
   - Every page has its own scene (see scenes.js). Navigating flies the
     camera to the destination's composition.
   - The site is a set of real documents (Firebase auth guards, inline page
     scripts, redirects all keep working untouched). To keep the environment
     *continuous* across documents, the camera flight is handed over through
     sessionStorage together with a snapshot of the last frame: the next page
     paints that frame instantly, resumes the disk clock, and continues the
     same flight where it left off.
   - "Explore" mode hides the UI and hands the camera to the visitor
     (orbit / zoom / repo presets / cinematic path / tuning / sound).
   ========================================================================= */

import { createGargantua, QUALITY, easeInOutCubic } from './engine.js';
import { sceneKeyForPath, resolveScene, introFrom, arrivalFrom } from './scenes.js';

const html = document.documentElement;
const body = document.body;
const STATE_KEY = 'gx.state';
const INTRO_KEY = 'gx.introSeen';
const TUNE_KEY = 'gx.tune.v1';
const QUALITY_KEY = 'gx.quality';

const pageKey = sceneKeyForPath(location.pathname);
const isHome = pageKey === 'home';
html.dataset.gxPage = pageKey;
html.classList.add('gx');

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const phone = coarse && Math.min(screen.width, screen.height) < 700;
const lowEnd = (navigator.deviceMemory && navigator.deviceMemory <= 4)
  || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const $ = (sel, root = document) => root.querySelector(sel);
const store = {
  get(area, k) { try { return JSON.parse(window[area].getItem(k)); } catch (e) { return null; } },
  set(area, k, v) { try { window[area].setItem(k, JSON.stringify(v)); } catch (e) { /* optional */ } },
};

/* ------------------------------------------------------------------ mount */

const canvas = document.createElement('canvas');
canvas.id = 'gx-canvas';
canvas.setAttribute('aria-hidden', 'true');
const scrim = document.createElement('div');
scrim.id = 'gx-scrim';
scrim.setAttribute('aria-hidden', 'true');
body.prepend(scrim);
body.prepend(canvas);

let engine = null;
try {
  engine = createGargantua(canvas);
} catch (err) {
  console.warn('[gargantua] WebGL unavailable, using static backdrop.', err);
}


/* ------------------------------------------------------------------- boot */

let qualityPref = store.get('localStorage', QUALITY_KEY) || 'auto';
let immersive = false;
let leaving = false;
let leavingTo = null;
let introActive = false;
const timers = [];
const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
const clearTimers = () => { while (timers.length) clearTimeout(timers.pop()); };

function boot() {
  const tune = store.get('localStorage', TUNE_KEY);
  if (tune) engine.setTune(tune);
  engine.setStatic(reduceMotion);

  applyContext(sceneContext());
  engine.events.addEventListener('firstframe', () => html.classList.add('gx-live'));
  engine.events.addEventListener('fault', () => {
    html.classList.add('gx-fallback');
    html.classList.remove('gx-live');
    if (introActive) finishIntro(true);
  });
  engine.events.addEventListener('restored', () => {
    html.classList.remove('gx-fallback');
    html.classList.add('gx-live');
  });
  engine.events.addEventListener('resize', () => { if (!immersive && !engine.flyingNow()) settleOnScene(); });

  buildUI();
  wireScroll();
  wirePersistence();
  wireSimulatorBell();

  const saved = readSavedState();
  if (saved) engine.restoreTime(saved.time);

  const needIntro = isHome && !reduceMotion && !store.get('sessionStorage', INTRO_KEY);
  const target = resolveScene(pageKey, engine.aspect);
  engine.setDrift(target.drift);

  if (needIntro) {
    playIntro();
  } else if (saved && saved.flight && saved.flight.target === pageKey) {
    // Continue the exact flight the previous page started.
    const f = saved.flight;
    engine.setPose(saved.pose, saved.look);
    engine.flyToPose(target.pose, target.look, {
      duration: f.dur, from: { pose: f.fromPose, look: f.fromLook }, elapsed: f.t, ease: easeInOutCubic,
    });
    html.classList.add('gx-arrived');
  } else if (saved) {
    engine.setPose(saved.pose, saved.look);
    engine.flyToPose(target.pose, target.look, { duration: 2.4, ease: easeInOutCubic });
    html.classList.add('gx-arrived');
  } else {
    const from = arrivalFrom(pageKey, engine.aspect);
    engine.setPose(from.pose, from.look);
    engine.flyToPose(target.pose, target.look, { duration: 2.8, ease: easeInOutCubic });
  }

  // Poster is only needed until the first real frame.
  engine.events.addEventListener('firstframe', () => later(() => { html.style.backgroundImage = ''; }, 900), { once: true });
  engine.start();
  window.GARGANTUA = { engine, pageKey, resolveScene: (k) => resolveScene(k, engine.aspect) };
}

function readSavedState() {
  const s = store.get('sessionStorage', STATE_KEY);
  if (!s || s.v !== 1 || Date.now() - s.t > 20000 || !s.pose) return null;
  return s;
}

/** Quality / frame budget for the current context. */
function applyContext(ctx) {
  let budget;
  if (qualityPref !== 'auto' && QUALITY[qualityPref]) {
    budget = QUALITY[qualityPref];
  } else if (phone || lowEnd) {
    budget = ctx === 'immersive' ? { steps: 260, dpr: 1.25 } : { steps: 190, dpr: 1 };
  } else if (ctx === 'immersive') {
    budget = QUALITY.cinematic;
  } else if (ctx === 'hero') {
    budget = { steps: 340, dpr: 1.5 };
  } else {
    budget = { steps: 240, dpr: 1 };
  }
  engine.setBudget(budget);
  engine.setFpsCap(phone && ctx === 'page' ? 30 : 60);
  html.dataset.gxContext = ctx;
}

const sceneContext = () => (isHome ? 'hero' : 'page');

/** Snap the camera to this page's composition (used after resize). */
function settleOnScene() {
  const t = resolveScene(pageKey, engine.aspect);
  engine.setPose(t.pose, t.look);
  engine.setDrift(t.drift);
}

/* ------------------------------------------------------------------ intro */

function playIntro() {
  introActive = true;
  html.classList.add('gx-intro');
  applyContext('hero');
  const a = engine.aspect;
  const from = introFrom(a);
  const to = resolveScene('home', a);
  engine.setPose(from.pose, from.look);
  engine.flyToPose(to.pose, to.look, { duration: 7, ease: easeInOutCubic, onDone: () => finishIntro() });
  body.style.overflow = 'hidden';

  const wm = $('#gx-wordmark');
  const skip = $('#gx-skip');
  wm.classList.remove('is-in', 'is-out');
  void wm.offsetWidth;
  later(() => wm.classList.add('is-in'), 350);
  later(() => skip.classList.add('is-in'), 1400);
  later(() => wm.classList.add('is-out'), 3600);
  later(() => revealHero(), 4500);
  store.set('sessionStorage', INTRO_KEY, 1);
}

function revealHero() {
  if (!introActive) return;
  introActive = false;
  html.classList.remove('gx-intro');
  $('#gx-skip').classList.remove('is-in');
  body.style.overflow = '';
}

function finishIntro(immediate = false) {
  clearTimers();
  revealHero();
  $('#gx-wordmark').classList.add('is-out');
  if (immediate) engine.finishFlight();
}

function skipIntro() {
  if (!introActive) return;
  engine.speedUpFlight(0.9);
  clearTimers();
  $('#gx-wordmark').classList.add('is-out');
  $('#gx-skip').classList.remove('is-in');
  later(() => revealHero(), 450);
}

/* ------------------------------------------------------------- navigation */

function sameSiteTarget(href) {
  try {
    const u = new URL(href, location.href);
    if (u.origin !== location.origin) return null;
    const file = u.pathname.split('/').pop();
    if (file !== '' && !file.endsWith('.html')) return null;
    if (u.pathname === location.pathname && u.search === location.search) return null;
    return u;
  } catch (e) { return null; }
}

function navigateTo(u) {
  if (leaving) return;
  const dest = sceneKeyForPath(u.pathname);
  if (!engine || reduceMotion || immersive || document.hidden) { location.href = u.href; return; }
  leaving = true;
  leavingTo = dest;
  clearTimers();
  if (introActive) finishIntro(true);
  else if (engine.flyingNow()) engine.finishFlight();
  html.classList.add('gx-leaving');
  const t = resolveScene(dest, engine.aspect);
  engine.setDrift(t.drift);
  engine.setScroll(0);
  engine.flyToPose(t.pose, t.look, { duration: 2.0, ease: easeInOutCubic });
  later(() => { persist(); location.href = u.href; }, 340);
  later(() => { location.href = u.href; }, 1600); // safety
}
window.gxNavigate = (href) => {
  const u = sameSiteTarget(href);
  if (u) navigateTo(u); else location.href = href;
};

function wireNavigation() {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    // Regular links.
    const a = e.target.closest('a[href]');
    if (a && !a.target && !a.hasAttribute('download')) {
      const raw = a.getAttribute('href');
      if (raw && !raw.startsWith('#') && !raw.startsWith('mailto:') && !raw.startsWith('javascript:')) {
        const u = sameSiteTarget(a.href);
        if (u) { e.preventDefault(); navigateTo(u); return; }
      }
    }
    // The existing site also navigates from onclick="location.href='x.html'" elements.
    const el = e.target.closest('[onclick]');
    if (el) {
      const m = /location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/.exec(el.getAttribute('onclick') || '');
      const u = m && sameSiteTarget(m[1]);
      if (u) { e.preventDefault(); e.stopImmediatePropagation(); navigateTo(u); }
    }
  }, true);

  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    leaving = false;
    leavingTo = null;
    html.classList.remove('gx-leaving');
    if (engine) {
      const t = resolveScene(pageKey, engine.aspect);
      engine.setDrift(t.drift);
      engine.flyToPose(t.pose, t.look, { duration: 1.4, ease: easeInOutCubic });
      engine.start();
    }
  });
}

function wirePersistence() {
  const save = () => persist();
  window.addEventListener('pagehide', save);
}

function persist() {
  if (!engine) return;
  const s = engine.getState();
  const fl = leavingTo ? engine.getFlight() : null;
  store.set('sessionStorage', STATE_KEY, {
    v: 1,
    t: Date.now(),
    page: pageKey,
    time: s.time,
    pose: s.pose,
    look: s.look,
    flight: fl ? { ...fl, target: leavingTo } : null,
    poster: engine.snapshot(480, 0.7),
  });
}

/* ----------------------------------------------------------------- scroll */

function wireScroll() {
  let ticking = false;
  const apply = () => {
    ticking = false;
    if (immersive || introActive || leaving) return;
    const p = clamp(window.scrollY / (window.innerHeight * 0.75), 0, 1);
    engine.setScroll(p, isHome ? { dim: 0.28, lift: 0.1 } : { dim: 0.42, lift: 0.34 });
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(apply); }
  }, { passive: true });
  apply();
}

/* -------------------------------------------------------- simulator bell */

function wireSimulatorBell() {
  const flash = document.getElementById('flash');
  if (!flash) return;
  new MutationObserver(() => {
    if (flash.style.opacity === '1') engine.pulse(1);
  }).observe(flash, { attributes: true, attributeFilter: ['style'] });
}

/* --------------------------------------------------------------------- UI */

const TUNE_DEFS = [
  { key: 'disk', label: 'Disk brightness', min: 0.3, max: 2, step: 0.05 },
  { key: 'rot', label: 'Rotation', min: 0, max: 3, step: 0.05 },
  { key: 'bloom', label: 'Bloom', min: 0, max: 2, step: 0.05 },
  { key: 'star', label: 'Starfield', min: 0.2, max: 2.5, step: 0.05 },
  { key: 'grain', label: 'Film grain', min: 0, max: 3, step: 0.1 },
  { key: 'ca', label: 'Aberration', min: 0, max: 3, step: 0.1 },
];

const ICON = (n) => `<i class="fa-solid fa-${n}" aria-hidden="true"></i>`;

function buildUI() {
  const wrap = document.createElement('div');
  wrap.id = 'gx-ui';
  wrap.innerHTML = `
    <div id="gx-wordmark" aria-hidden="true">
      <span class="gx-wm-mark">${ICON('bell')}</span>
      <span class="gx-wm-title">Digital Smart Bell System</span>
    </div>
    <button type="button" id="gx-skip" class="gx-glass gx-chip">Skip intro</button>

    <div id="gx-fabs" class="gx-glass" role="group" aria-label="Environment controls">
      ${isHome ? `<button type="button" class="gx-icon" id="gx-sound" aria-pressed="false" aria-label="Sound: off" title="Sound (M)">${ICON('volume-xmark')}</button>
      <button type="button" class="gx-icon" id="gx-replay" aria-label="Replay intro" title="Replay intro">${ICON('rotate-right')}</button>` : ''}
      <button type="button" class="gx-icon gx-main" id="gx-explore" aria-label="Explore the environment" title="Explore the environment">${ICON('expand')}</button>
    </div>

    <div id="gx-hint" class="gx-glass gx-chip" hidden>Drag to orbit &nbsp;·&nbsp; Scroll or pinch to zoom &nbsp;·&nbsp; Esc to return</div>

    <div id="gx-tune" class="gx-glass" hidden role="group" aria-label="Environment tuning">
      <div class="gx-tune-head"><span>Tune environment</span><button type="button" id="gx-tune-reset" class="gx-link">Reset</button></div>
      <div class="gx-tune-rows"></div>
    </div>

    <div id="gx-bar" class="gx-glass" hidden role="toolbar" aria-label="Explore controls">
      <div class="gx-seg" role="group" aria-label="Camera views">
        <button type="button" data-view="poster">Poster</button>
        <button type="button" data-view="edge">Edge</button>
        <button type="button" data-view="polar">Polar</button>
        <button type="button" data-view="close">Close</button>
      </div>
      <span class="gx-sep" aria-hidden="true"></span>
      <button type="button" class="gx-pill" id="gx-cine" aria-pressed="false" title="Cinematic path (C)">${ICON('film')}<span>Cinematic</span></button>
      <button type="button" class="gx-pill" id="gx-tune-btn" aria-pressed="false" aria-controls="gx-tune" title="Tune (T)">${ICON('sliders')}<span>Tune</span></button>
      ${isHome ? `<button type="button" class="gx-pill" id="gx-sound2" aria-pressed="false" title="Sound (M)">${ICON('volume-xmark')}<span>Sound</span></button>` : ''}
      <button type="button" class="gx-pill" id="gx-quality" title="Render quality">${ICON('gauge-high')}<span></span></button>
      <span class="gx-sep" aria-hidden="true"></span>
      <button type="button" class="gx-pill gx-done" id="gx-exit" title="Back to page (Esc)">${ICON('xmark')}<span>Done</span></button>
    </div>`;
  body.append(wrap);

  // Tune rows
  const rows = $('.gx-tune-rows', wrap);
  const tune = engine.getTune();
  for (const d of TUNE_DEFS) {
    const row = document.createElement('label');
    row.className = 'gx-row';
    row.innerHTML = `<span class="gx-row-top"><span>${d.label}</span><output></output></span>
      <input type="range" min="${d.min}" max="${d.max}" step="${d.step}" value="${tune[d.key]}" data-key="${d.key}" aria-label="${d.label}">`;
    rows.append(row);
    const input = $('input', row);
    const out = $('output', row);
    const paint = () => {
      out.textContent = `${Number(input.value).toFixed(2).replace(/0$/, '')}×`;
      input.style.setProperty('--fill', `${((input.value - d.min) / (d.max - d.min)) * 100}%`);
    };
    paint();
    input.addEventListener('input', () => {
      paint();
      engine.setTune({ [d.key]: Number(input.value) });
      store.set('localStorage', TUNE_KEY, engine.getTune());
    });
  }
  $('#gx-tune-reset').addEventListener('click', () => {
    const reset = { disk: 1, star: 1, rot: 1, bloom: 1, grain: 1, ca: 1 };
    engine.setTune(reset);
    store.set('localStorage', TUNE_KEY, reset);
    rows.querySelectorAll('input').forEach((i) => {
      i.value = '1';
      i.dispatchEvent(new Event('input'));
    });
  });

  paintQuality();
  $('#gx-explore').addEventListener('click', () => setImmersive(true));
  $('#gx-exit').addEventListener('click', () => setImmersive(false));
  $('#gx-skip').addEventListener('click', skipIntro);
  $('#gx-replay')?.addEventListener('click', () => {
    if (introActive || immersive) return;
    window.scrollTo(0, 0);
    playIntro();
  });
  $('#gx-cine').addEventListener('click', () => engine.setCinematic(!engine.isCinematic));
  engine.events.addEventListener('cinematic', (e) => paintCine(e.detail.on));
  $('#gx-tune-btn').addEventListener('click', () => toggleTune());
  $('#gx-quality').addEventListener('click', cycleQuality);
  $('#gx-bar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]');
    if (!b) return;
    engine.flyToPreset(b.dataset.view);
    paintView(b.dataset.view);
  });
  $('#gx-sound')?.addEventListener('click', () => setSound(!sound.on));
  $('#gx-sound2')?.addEventListener('click', () => setSound(!sound.on));

  document.addEventListener('keydown', onKey);
  // Any interaction skips the intro.
  window.addEventListener('pointerdown', (e) => { if (introActive && !e.target.closest('#gx-skip')) skipIntro(); }, { passive: true });
}

function paintCine(on) {
  $('#gx-cine').setAttribute('aria-pressed', String(on));
  $('#gx-cine').classList.toggle('is-on', on);
  if (on) paintView(null);
}
function paintView(name) {
  document.querySelectorAll('#gx-bar [data-view]').forEach((b) => b.classList.toggle('is-on', b.dataset.view === name));
}
function paintQuality() {
  const label = qualityPref === 'auto' ? 'Auto' : QUALITY[qualityPref].label;
  $('#gx-quality span').textContent = label;
}
function cycleQuality() {
  const order = ['auto', 'standard', 'high', 'cinematic'];
  qualityPref = order[(order.indexOf(qualityPref) + 1) % order.length];
  store.set('localStorage', QUALITY_KEY, qualityPref);
  paintQuality();
  applyContext(immersive ? 'immersive' : sceneContext());
}
function toggleTune(force) {
  const panel = $('#gx-tune');
  const open = force ?? panel.hidden;
  panel.hidden = !open;
  $('#gx-tune-btn').setAttribute('aria-pressed', String(open));
  $('#gx-tune-btn').classList.toggle('is-on', open);
}

/* -------------------------------------------------------------- immersive */

let hintTimer = 0;

function setImmersive(on) {
  if (on === immersive || introActive || leaving) return;
  immersive = on;
  html.classList.toggle('gx-immersive', on);
  const shell = document.querySelector('.app-shell, .landing');
  if (shell) shell.inert = on;
  const bar = $('#gx-bar');
  const hint = $('#gx-hint');
  clearTimeout(hintTimer);

  if (on) {
    canvas.setAttribute('aria-hidden', 'false');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Interactive black hole. Drag to orbit, scroll to zoom.');
    body.style.overflow = 'hidden';
    engine.setScroll(0);
    applyContext('immersive');
    const t = resolveScene(pageKey, engine.aspect);
    engine.enterFree({ duration: 1.6, look: { ...t.look, disk: Math.max(t.look.disk, 0.95), star: Math.max(t.look.star, 0.95), bloom: Math.max(t.look.bloom, 0.55), vig: 1, expo: 1 } });
    bar.hidden = false;
    hint.hidden = false;
    hintTimer = setTimeout(() => { hint.hidden = true; }, 7000);
    $('#gx-exit').focus({ preventScroll: true });
  } else {
    toggleTune(false);
    hint.hidden = true;
    bar.hidden = true;
    engine.exitFree();
    paintCine(false);
    paintView(null);
    canvas.setAttribute('aria-hidden', 'true');
    canvas.removeAttribute('role');
    canvas.removeAttribute('aria-label');
    body.style.overflow = '';
    applyContext(sceneContext());
    const t = resolveScene(pageKey, engine.aspect);
    engine.setDrift(t.drift);
    engine.flyToPose(t.pose, t.look, { duration: 2, ease: easeInOutCubic });
    $('#gx-explore').focus({ preventScroll: true });
    window.dispatchEvent(new Event('scroll'));
  }
}

function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = (e.target && e.target.tagName) || '';
  const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable;
  if (introActive && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); skipIntro(); return; }
  if (!immersive) return;
  if (e.key === 'Escape') { setImmersive(false); return; }
  if (typing && e.target.type !== 'range') return;
  const k = e.key.toLowerCase();
  const views = { 1: 'poster', 2: 'edge', 3: 'polar', 4: 'close' };
  if (views[k]) { engine.flyToPreset(views[k]); paintView(views[k]); }
  else if (k === 'c') engine.setCinematic(!engine.isCinematic);
  else if (k === 't') toggleTune();
  else if (k === 'm' && isHome) setSound(!sound.on);
}

/* ------------------------------------------------------------------ sound */
// Ambient score from the original experience. Home only (the bell simulator
// has its own audio), off by default, never autoplays.

const sound = { on: false, intro: null, main: null, chain: 0 };

function ensureAudio() {
  if (sound.main) return;
  sound.intro = new Audio('gargantua/audio/gargantua-intro.mp3');
  sound.main = new Audio('gargantua/audio/gargantua-main.mp3');
  sound.main.loop = true;
  sound.intro.volume = 0.7;
  sound.main.volume = 0.7;
  sound.intro.preload = 'auto';
  sound.main.preload = 'none';
  const fail = () => paintSound(false, true);
  sound.intro.addEventListener('error', fail);
  sound.main.addEventListener('error', fail);
}

function paintSound(on, blocked = false) {
  sound.on = on && !blocked;
  for (const id of ['#gx-sound', '#gx-sound2']) {
    const b = $(id);
    if (!b) continue;
    b.setAttribute('aria-pressed', String(sound.on));
    b.classList.toggle('is-on', sound.on);
    const i = $('i', b);
    if (i) i.className = `fa-solid fa-${blocked ? 'triangle-exclamation' : sound.on ? 'volume-high' : 'volume-xmark'}`;
    if (id === '#gx-sound') b.setAttribute('aria-label', `Sound: ${sound.on ? 'on' : 'off'}`);
  }
}

async function setSound(on) {
  ensureAudio();
  clearTimeout(sound.chain);
  if (!on) {
    sound.intro.pause();
    sound.main.pause();
    paintSound(false);
    return;
  }
  paintSound(true);
  try {
    if (introActive) {
      sound.intro.currentTime = 0;
      await sound.intro.play();
      const go = () => { if (sound.on) sound.main.play().catch(() => paintSound(false, true)); };
      sound.intro.addEventListener('ended', go, { once: true });
      sound.chain = setTimeout(go, 7200);
    } else {
      sound.main.volume = 0.3;
      await sound.main.play();
      const t0 = performance.now();
      const ramp = () => {
        if (!sound.on) return;
        const u = Math.min(1, (performance.now() - t0) / 900);
        sound.main.volume = 0.3 + 0.4 * u;
        if (u < 1) requestAnimationFrame(ramp);
      };
      requestAnimationFrame(ramp);
    }
  } catch (err) {
    paintSound(false, true);
    setTimeout(() => paintSound(false), 2200);
  }
}

/* ---------------------------------------------- glass pointer highlight */

function wireGlassHighlight() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const SEL = '.btn, .role-card, .stat-card, .quick-action, .nav-link, .batch-pill, .gx-icon, .gx-pill, .gx-seg button';
  let raf = 0;
  let last = null;
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest && e.target.closest(SEL);
    if (!el) return;
    last = { el, x: e.clientX, y: e.clientY };
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const r = last.el.getBoundingClientRect();
      last.el.style.setProperty('--mx', `${last.x - r.left}px`);
      last.el.style.setProperty('--my', `${last.y - r.top}px`);
    });
  }, { passive: true });
}

/* ------------------------------------------------------------------ start */
// Kept at the bottom so every const above is initialised before boot() runs.

wireNavigation();
wireGlassHighlight();

if (!engine) {
  html.classList.add('gx-fallback');
  html.classList.remove('gx-intro');
  canvas.remove();
} else {
  boot();
}
