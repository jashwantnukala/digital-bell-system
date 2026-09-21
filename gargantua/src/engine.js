/* =========================================================================
   GARGANTUA engine
   -------------------------------------------------------------------------
   A reusable, DOM-agnostic refactor of Twarga/Gargantua-black-hole-Grok4.6
   (js/main.js). The renderer, geodesic shader, bloom + composite chain,
   orbit controls, cinematic spline, presets and quality profiles are the
   originals. What changed is the shape around them:

   - No HUD / DOM coupling. The host site drives it through a small API.
   - Camera is a state machine (scene | free | cinematic) built around a
     single spherical pose, so it can be flown between "scenes" and its
     state can be saved and resumed on the next document.
   - Look (disk brightness, bloom, exposure ...) is animated together with
     the pose, so each page gets a different composition, not just a
     different camera.
   - Lens shift (uShift) lets us place the hole anywhere in the frame for
     hero layouts without changing the perspective.
   - An adaptive resolution governor keeps it smooth behind page content.
   ========================================================================= */

import * as THREE from 'three';
import { OrbitControls } from '../vendor/jsm/controls/OrbitControls.js';
import { EffectComposer } from '../vendor/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from '../vendor/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from '../vendor/jsm/postprocessing/UnrealBloomPass.js';
import { RAY_VERT, RAY_FRAG, COMPOSITE_VERT, COMPOSITE_FRAG } from './shaders.js';

export const DEG = Math.PI / 180;

export const QUALITY = {
  standard: { id: 'standard', label: 'Standard', steps: 200, dpr: 1 },
  high: { id: 'high', label: 'High', steps: 320, dpr: 1.5 },
  cinematic: { id: 'cinematic', label: 'Cinematic', steps: 460, dpr: 2 },
};

// Original cinematic path from the repo: [distance (Rs), inclination°, azimuth°]
const CINE_KEYS_DEG = [
  [58, 12, -30], [36, 6, 10], [26, 24, 55], [14, 14, 100],
  [20, 52, 150], [34, 80, 200], [46, 35, 270], [36, 8, 330],
];
const CINE_SEGMENT = 11;

// Original camera presets from the repo.
export const PRESETS = {
  poster: { r: 24, inc: 38 * DEG, az: 30 * DEG },
  edge: { r: 26, inc: 6 * DEG, az: 10 * DEG },
  polar: { r: 28, inc: 82 * DEG, az: 0 },
  close: { r: 9, inc: 14 * DEG, az: 55 * DEG },
};

export const BASE_LOOK = {
  disk: 1, star: 1, rot: 1, bloom: 0.55, vig: 1, grain: 0.045, ca: 0.0028, expo: 1,
};

// Fixed physical/rendering params (repo defaults).
const FIXED = {
  uDin: 2.75, uDout: 40, uDopMax: 1.85, uOpNear: 0.9, uOpFar: 0.8,
  skyFloor: 0.04, bloomRadius: 0.35, bloomThreshold: 0.55,
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);
export const easeInOutQuart = (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - ((-2 * t + 2) ** 4) / 2);
export const easeOutQuint = (t) => 1 - (1 - t) ** 5;

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

function buildCineSpline() {
  const keys = CINE_KEYS_DEG.map(([r, inc, az]) => ({ r, inc: inc * DEG, az: az * DEG }));
  for (let i = 1; i < keys.length; i++) {
    while (keys[i].az - keys[i - 1].az > Math.PI) keys[i].az -= Math.PI * 2;
    while (keys[i].az - keys[i - 1].az < -Math.PI) keys[i].az += Math.PI * 2;
  }
  let firstNext = keys[0].az;
  const last = keys[keys.length - 1].az;
  while (firstNext - last > Math.PI) firstNext -= Math.PI * 2;
  while (firstNext - last < -Math.PI) firstNext += Math.PI * 2;
  const wrap = firstNext - keys[0].az;
  const n = keys.length;
  const key = (i) => {
    const idx = ((i % n) + n) % n;
    const loops = Math.floor(i / n);
    return { r: keys[idx].r, inc: keys[idx].inc, az: keys[idx].az + loops * wrap };
  };
  return { n, key };
}
const cineSpline = buildCineSpline();

function cineAt(time, out) {
  const n = cineSpline.n;
  const loop = n * CINE_SEGMENT;
  let t = time % loop;
  if (t < 0) t += loop;
  const s = t / CINE_SEGMENT;
  const i = Math.floor(s);
  const f = s - i;
  const k0 = cineSpline.key(i - 1);
  const k1 = cineSpline.key(i);
  const k2 = cineSpline.key(i + 1);
  const k3 = cineSpline.key(i + 2);
  out.r = catmull(k0.r, k1.r, k2.r, k3.r, f);
  out.inc = catmull(k0.inc, k1.inc, k2.inc, k3.inc, f);
  out.az = catmull(k0.az, k1.az, k2.az, k3.az, f);
  return out;
}

export function sphToCart(r, inc, az, out) {
  out.x = r * Math.cos(inc) * Math.sin(az);
  out.y = r * Math.sin(inc);
  out.z = r * Math.cos(inc) * Math.cos(az);
  return out;
}

function unwrapAz(from, to) {
  let a = to;
  while (a - from > Math.PI) a -= Math.PI * 2;
  while (a - from < -Math.PI) a += Math.PI * 2;
  return a;
}

const fovScale = (deg) => 1 / Math.tan(THREE.MathUtils.degToRad(deg) * 0.5);

export const clonePose = (p) => ({ r: p.r, inc: p.inc, az: p.az, sx: p.sx, sy: p.sy, fov: p.fov });

/* ------------------------------------------------------------------------ */

export function createGargantua(canvas, options = {}) {
  const bus = new EventTarget();
  const emit = (name, detail) => bus.dispatchEvent(new CustomEvent(name, { detail }));

  const st = {
    pose: { r: 24, inc: 10 * DEG, az: 26 * DEG, sx: 0, sy: 0, fov: 44 },
    look: { ...BASE_LOOK },
    tune: { disk: 1, star: 1, rot: 1, bloom: 1, grain: 1, ca: 1 },
    time: 0,
    flight: null,
    free: false,
    cine: null,
    cineTime: 0,
    drift: { az: 0, inc: 0, speed: 0.05 },
    scroll: { target: 0, cur: 0, dimStrength: 0.4, liftStrength: 0.3 },
    driftMix: 1,
    budget: { ...QUALITY.high },
    resScale: 1,
    stepScale: 1,
    fpsCap: 60,
    staticMode: false,
    dirty: true,
    paused: false,
    hidden: false,
    raf: 0,
    lastFrame: 0,
    fpsAcc: 0,
    fpsFrames: 0,
    fps: 60,
    goodSeconds: 0,
    framesRendered: 0,
    governor: true,
    faulted: false,
    size: { w: 1, h: 1 },
    pulse: 0,
  };

  const scratch = { v: new THREE.Vector3(), size: new THREE.Vector2(), tmp: { r: 0, inc: 0, az: 0 } };

  /* ---- renderer / passes (same construction as the repo) --------------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x000000, 1);
  renderer.debug.checkShaderErrors = true;

  const fsScene = new THREE.Scene();
  const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const obsCam = new THREE.PerspectiveCamera(44, 1, 0.01, 200);
  obsCam.position.set(4.49, 2.72, 25.46);
  obsCam.lookAt(0, 0, 0);

  const fsMat = new THREE.ShaderMaterial({
    uniforms: {
      uRes: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uCamPos: { value: obsCam.position.clone() },
      uCamTarget: { value: new THREE.Vector3() },
      uFov: { value: fovScale(44) },
      uSteps: { value: 320 },
      uRotSign: { value: -1 },
      uDebug: { value: 0 },
      uDin: { value: FIXED.uDin },
      uDout: { value: FIXED.uDout },
      uDopMax: { value: FIXED.uDopMax },
      uOpNear: { value: FIXED.uOpNear },
      uOpFar: { value: FIXED.uOpFar },
      uDiskBright: { value: 1 },
      uStarBright: { value: 1 },
      uSkyFloor: { value: FIXED.skyFloor },
      uRotSpeed: { value: 1 },
      uShift: { value: new THREE.Vector2(0, 0) },
    },
    vertexShader: RAY_VERT,
    fragmentShader: RAY_FRAG,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fsMat);
  quad.frustumCulled = false;
  fsScene.add(quad);

  const controls = new OrbitControls(obsCam, canvas);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 1.62;
  controls.maxDistance = 150;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.7;
  controls.enablePan = false;
  controls.enabled = false;
  controls.update();

  let composer;
  try {
    composer = new EffectComposer(renderer);
    composer.renderTarget1.texture.type = THREE.HalfFloatType;
    composer.renderTarget2.texture.type = THREE.HalfFloatType;
  } catch (err) {
    const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.UnsignedByteType });
    composer = new EffectComposer(renderer, rt);
  }
  composer.addPass(new RenderPass(fsScene, fsCam));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.55, FIXED.bloomRadius, FIXED.bloomThreshold);
  composer.addPass(bloomPass);
  const compositePass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uRes: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uVignette: { value: 1 },
      uGrain: { value: 0.045 },
      uCA: { value: 0.0028 },
      uExpo: { value: 1 },
    },
    vertexShader: COMPOSITE_VERT,
    fragmentShader: COMPOSITE_FRAG,
  });
  compositePass.material.toneMapped = false;
  composer.addPass(compositePass);

  /* ---- sizing / quality ------------------------------------------------ */
  function resize(force) {
    const w = Math.max(1, canvas.clientWidth || window.innerWidth);
    const h = Math.max(1, canvas.clientHeight || window.innerHeight);
    const dpr = Math.max(0.5, Math.min(window.devicePixelRatio || 1, st.budget.dpr) * st.resScale);
    if (!force && w === st.size.w && h === st.size.h && Math.abs(dpr - (st._dpr || 0)) < 0.01) return;
    st.size.w = w;
    st.size.h = h;
    st._dpr = dpr;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    obsCam.aspect = w / h;
    obsCam.updateProjectionMatrix();
    renderer.getDrawingBufferSize(scratch.size);
    fsMat.uniforms.uRes.value.copy(scratch.size);
    compositePass.uniforms.uRes.value.copy(scratch.size);
    bloomPass.resolution.set(w, h);
    st.dirty = true;
    emit('resize', { w, h, aspect: w / h });
  }

  function setBudget(b) {
    st.budget = { ...b };
    st.resScale = 1;
    st.stepScale = 1;
    resize(true);
  }

  /* ---- pose / look plumbing --------------------------------------------- */
  function syncControls() {
    controls.target.set(0, 0, 0);
    const damp = controls.enableDamping;
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = damp;
  }

  function writeCamera(p) {
    sphToCart(p.r, p.inc, p.az, obsCam.position);
    obsCam.lookAt(0, 0, 0);
    if (Math.abs(obsCam.fov - p.fov) > 0.01) {
      obsCam.fov = p.fov;
      obsCam.updateProjectionMatrix();
    }
  }

  function applyLook(look, expoMul) {
    const t = st.tune;
    const u = fsMat.uniforms;
    u.uDiskBright.value = look.disk * t.disk;
    u.uStarBright.value = look.star * t.star;
    u.uRotSpeed.value = st.staticMode ? 0 : look.rot * t.rot;
    bloomPass.strength = (look.bloom + st.pulse * 0.9) * t.bloom;
    bloomPass.radius = FIXED.bloomRadius;
    bloomPass.threshold = FIXED.bloomThreshold;
    compositePass.uniforms.uVignette.value = look.vig;
    compositePass.uniforms.uGrain.value = look.grain * t.grain;
    compositePass.uniforms.uCA.value = look.ca * t.ca;
    compositePass.uniforms.uExpo.value = look.expo * expoMul * (1 + st.pulse * 0.25);
  }

  /* ---- flights ------------------------------------------------------------ */
  function flyToPose(pose, look, { duration = 2.2, ease = easeInOutCubic, from = null, elapsed = 0, onDone = null } = {}) {
    const fromPose = from?.pose ? clonePose(from.pose) : clonePose(st.pose);
    const fromLook = from?.look ? { ...from.look } : { ...st.look };
    const toPose = clonePose(pose);
    toPose.az = unwrapAz(fromPose.az, toPose.az);
    if (st.staticMode || duration <= 0) {
      st.pose = toPose;
      st.look = { ...BASE_LOOK, ...look };
      st.flight = null;
      st.dirty = true;
      if (onDone) onDone();
      return;
    }
    st.flight = {
      fromPose, fromLook, toPose, toLook: { ...BASE_LOOK, ...look },
      t: elapsed, dur: duration, ease, onDone,
    };
  }

  function stepFlight(dt) {
    const f = st.flight;
    f.t += dt;
    const u = clamp(f.t / f.dur, 0, 1);
    const e = f.ease(u);
    const a = f.fromPose;
    const b = f.toPose;
    const p = st.pose;
    p.r = lerp(a.r, b.r, e);
    p.inc = lerp(a.inc, b.inc, e);
    p.az = lerp(a.az, b.az, e);
    p.sx = lerp(a.sx, b.sx, e);
    p.sy = lerp(a.sy, b.sy, e);
    p.fov = lerp(a.fov, b.fov, e);
    for (const k in st.look) st.look[k] = lerp(f.fromLook[k], f.toLook[k], e);
    if (u >= 1) {
      const done = f.onDone;
      st.flight = null;
      emit('flightend');
      if (done) done();
    }
  }

  /* ---- per-frame update ---------------------------------------------------- */
  const cineOut = { r: 0, inc: 0, az: 0 };

  function update(dt) {
    st.time += dt;
    st.scroll.cur += (st.scroll.target - st.scroll.cur) * (1 - Math.exp(-dt * 4.5));
    st.pulse = Math.max(0, st.pulse - dt * 1.8);

    let expoMul = 1;

    if (st.flight) {
      stepFlight(dt);
    } else if (st.cine) {
      st.cineTime += dt;
      cineAt(st.cineTime, cineOut);
      const c = st.cine;
      if (c.blend < 1) {
        c.blend = Math.min(1, c.blend + dt / 2);
        const e = easeInOutCubic(c.blend);
        st.pose.r = lerp(c.from.r, cineOut.r, e);
        st.pose.inc = lerp(c.from.inc, cineOut.inc, e);
        st.pose.az = lerp(c.from.az, unwrapAz(c.from.az, cineOut.az), e);
        st.pose.sx = lerp(c.from.sx, 0, e);
        st.pose.sy = lerp(c.from.sy, 0, e);
      } else {
        st.pose.r = cineOut.r;
        st.pose.inc = cineOut.inc;
        st.pose.az = cineOut.az;
        st.pose.sx = 0;
        st.pose.sy = 0;
      }
    } else if (st.free) {
      controls.update();
      const p = obsCam.position;
      const r = Math.max(p.length(), 1e-6);
      st.pose.r = r;
      st.pose.inc = Math.asin(clamp(p.y / r, -1, 1));
      st.pose.az = unwrapAz(st.pose.az, Math.atan2(p.x, p.z));
    }

    // Composition = base pose + (in scene mode) ambient drift and scroll parallax.
    const controlDriven = st.free && !st.cine && !st.flight;
    const overlays = !st.cine && !controlDriven;
    st.driftMix += ((st.free ? 0 : 1) - st.driftMix) * (1 - Math.exp(-dt * 2));
    const eff = clonePose(st.pose);
    if (overlays && !st.staticMode) {
      const d = st.drift;
      const m = st.driftMix;
      eff.az += Math.sin(st.time * d.speed) * d.az * DEG * m;
      eff.inc += Math.sin(st.time * d.speed * 0.71 + 1.3) * d.inc * DEG * m;
    }
    if (overlays) {
      const s = st.scroll.cur;
      eff.r *= 1 + 0.10 * s;
      eff.sy += 0.5 * st.scroll.liftStrength * s;
      expoMul *= 1 - st.scroll.dimStrength * s;
    }

    if (!controlDriven) writeCamera(eff);
    else if (Math.abs(obsCam.fov - eff.fov) > 0.01) { obsCam.fov = eff.fov; obsCam.updateProjectionMatrix(); }

    const u = fsMat.uniforms;
    u.uTime.value = st.time;
    u.uCamPos.value.copy(obsCam.position);
    u.uCamTarget.value.copy(controls.target);
    u.uFov.value = fovScale(obsCam.fov);
    u.uShift.value.set(eff.sx, eff.sy);
    u.uSteps.value = Math.max(90, Math.round(st.budget.steps * st.stepScale)) | 0;
    compositePass.uniforms.uTime.value = u.uTime.value;
    applyLook(st.look, expoMul);
  }

  function governor(dt) {
    st.fpsAcc += dt;
    st.fpsFrames += 1;
    if (st.fpsAcc < 1) return;
    const fps = st.fpsFrames / st.fpsAcc;
    st.fpsAcc = 0;
    st.fpsFrames = 0;
    st.fps = st.fps * 0.4 + fps * 0.6;
    if (!st.governor || st.staticMode) return;
    const target = st.fpsCap >= 60 ? 50 : 26;
    if (st.fps < target * 0.75) {
      st.goodSeconds = 0;
      if (st.resScale > 0.55) st.resScale = Math.max(0.55, st.resScale - 0.15);
      else if (st.stepScale > 0.6) st.stepScale = Math.max(0.6, st.stepScale - 0.15);
      resize(true);
    } else if (st.fps > target * 1.12) {
      st.goodSeconds += 1;
      if (st.goodSeconds >= 6) {
        st.goodSeconds = 0;
        if (st.stepScale < 1) st.stepScale = Math.min(1, st.stepScale + 0.15);
        else if (st.resScale < 1) { st.resScale = Math.min(1, st.resScale + 0.1); resize(true); }
      }
    } else {
      st.goodSeconds = 0;
    }
  }

  /* ---- loop ---------------------------------------------------------------- */
  function frame(now) {
    st.raf = requestAnimationFrame(frame);
    if (st.paused || st.faulted) return;
    const minGap = 1000 / st.fpsCap - 2;
    if (st.lastFrame && now - st.lastFrame < minGap) return;
    const dt = Math.min((now - (st.lastFrame || now)) / 1000, 0.1);
    st.lastFrame = now;

    const animating = !!st.flight || !!st.cine || st.free || st.scroll.cur !== st.scroll.target || st.pulse > 0;
    if (st.staticMode && !st.dirty && !animating) return;

    update(st.staticMode && !animating ? 0 : dt);
    try {
      composer.render(dt);
    } catch (err) {
      st.faulted = true;
      emit('fault', { message: String(err && err.message ? err.message : err) });
      return;
    }
    st.dirty = false;
    st.framesRendered += 1;
    if (st.framesRendered === 2) emit('firstframe');
    governor(dt || 0.016);
  }

  function start() {
    if (st.raf) return;
    st.lastFrame = 0;
    st.raf = requestAnimationFrame(frame);
  }
  function stop() {
    if (st.raf) cancelAnimationFrame(st.raf);
    st.raf = 0;
  }

  const onVis = () => {
    if (document.hidden) stop();
    else { st.dirty = true; start(); }
  };
  document.addEventListener('visibilitychange', onVis);

  let resizeT = 0;
  let lastH = window.innerHeight;
  const onResize = () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      // Ignore small height-only changes (mobile URL bar) so we don't re-alloc buffers mid-scroll.
      const coarse = matchMedia('(pointer: coarse)').matches;
      if (coarse && Math.abs(window.innerHeight - lastH) < 140 && Math.abs(canvas.clientWidth - st.size.w) < 2) return;
      lastH = window.innerHeight;
      resize(true);
    }, 120);
  };
  window.addEventListener('resize', onResize);

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    st.faulted = true;
    emit('fault', { message: 'WebGL context lost' });
  });
  canvas.addEventListener('webglcontextrestored', () => {
    st.faulted = false;
    st.dirty = true;
    emit('restored');
  });

  controls.addEventListener('start', () => { if (st.cine) api.setCinematic(false); });

  /* ---- public API ---------------------------------------------------------- */
  const api = {
    events: bus,
    get aspect() { return st.size.w / st.size.h; },
    get isFree() { return st.free; },
    get isCinematic() { return !!st.cine; },
    get fps() { return st.fps; },
    get time() { return st.time; },
    get pose() { return clonePose(st.pose); },
    get look() { return { ...st.look }; },

    start, stop, resize: () => resize(true),
    setBudget,
    setGovernor(on) { st.governor = on; },
    setFpsCap(n) { st.fpsCap = n; },
    setStatic(on) { st.staticMode = on; st.dirty = true; },
    setDrift(d) { Object.assign(st.drift, d); },
    setScroll(p, { dim = 0.4, lift = 0.3 } = {}) {
      st.scroll.target = clamp(p, 0, 1);
      st.scroll.dimStrength = dim;
      st.scroll.liftStrength = lift;
      st.dirty = true;
    },
    setTune(t) { Object.assign(st.tune, t); st.dirty = true; },
    getTune: () => ({ ...st.tune }),
    pulse(strength = 1) { st.pulse = Math.max(st.pulse, strength); },

    setPose(pose, look) {
      st.flight = null;
      st.pose = clonePose(pose);
      if (look) st.look = { ...BASE_LOOK, ...look };
      st.dirty = true;
    },
    flyToPose,
    flyingNow: () => !!st.flight,
    getFlight() {
      const f = st.flight;
      return f ? { fromPose: clonePose(f.fromPose), fromLook: { ...f.fromLook }, t: f.t, dur: f.dur } : null;
    },
    finishFlight() {
      if (!st.flight) return;
      st.flight.t = st.flight.dur;
      stepFlight(0);
    },
    speedUpFlight(remaining = 0.7) {
      const f = st.flight;
      if (!f) return;
      // Re-time the current flight so that it completes in `remaining` seconds from where it is.
      const u = clamp(f.t / f.dur, 0, 1);
      f.dur = remaining / Math.max(0.05, 1 - u);
      f.t = u * f.dur;
    },

    /** Free orbit mode (repo behaviour): drag to orbit, wheel/pinch to zoom. */
    enterFree({ duration = 1.4, look = null } = {}) {
      api.setCinematic(false, { silent: true });
      const p = clonePose(st.pose);
      const freePose = { ...p, sx: 0, sy: 0 };
      st.free = true;
      controls.enabled = false;
      flyToPose(freePose, look || st.look, {
        duration,
        onDone: () => { controls.enabled = true; syncControls(); },
      });
      if (!st.flight) { controls.enabled = true; syncControls(); }
    },
    exitFree() {
      st.free = false;
      st.cine = null;
      controls.enabled = false;
    },
    flyToPreset(name, { duration = 2.6 } = {}) {
      const pr = PRESETS[name];
      if (!pr) return;
      api.setCinematic(false, { silent: true });
      controls.enabled = false;
      const p = clonePose(st.pose);
      flyToPose({ ...p, r: pr.r, inc: pr.inc, az: pr.az, sx: 0, sy: 0 }, st.look, {
        duration,
        onDone: () => { if (st.free) { controls.enabled = true; syncControls(); } },
      });
    },
    setCinematic(on, { silent = false } = {}) {
      if (on) {
        if (st.cine) return;
        st.free = true;
        controls.enabled = false;
        st.flight = null;
        st.cine = { blend: 0, from: clonePose(st.pose) };
      } else if (st.cine) {
        st.cine = null;
        if (st.free) { controls.enabled = true; syncControls(); }
      }
      if (!silent) emit('cinematic', { on: !!st.cine });
    },

    /** Serialisable state, used to resume the camera on the next document. */
    getState() {
      return { pose: clonePose(st.pose), look: { ...st.look }, time: st.time, drift: { ...st.drift } };
    },
    restoreTime(t) { if (Number.isFinite(t)) st.time = t; },

    snapshot(width = 480, quality = 0.72) {
      try {
        update(0);
        composer.render(0);
        const h = Math.round(width * (canvas.height / Math.max(1, canvas.width)));
        const c = document.createElement('canvas');
        c.width = width;
        c.height = h;
        c.getContext('2d').drawImage(canvas, 0, 0, width, h);
        return c.toDataURL('image/jpeg', quality);
      } catch (err) {
        return null;
      }
    },

    dispose() {
      stop();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
    },
  };

  resize(true);
  return api;
}
