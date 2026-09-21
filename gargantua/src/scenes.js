/* =========================================================================
   Scenes: one camera composition per page of the site.
   -------------------------------------------------------------------------
   Every page is a different vantage point inside the same GARGANTUA
   environment. The camera always looks at the singularity; what changes is
   distance, inclination, azimuth, where the hole sits in the frame (lens
   shift), and how the environment is lit and animated.

     r         distance in Schwarzschild radii
     inc / az  inclination above the disk plane / azimuth, degrees
     fx, fy    where the hole sits: -1..1 of half-width / half-height
               (positive = right / up)
     look      per-scene rendering look (see BASE_LOOK in engine.js)
     drift     slow ambient sway: azimuth°, inclination°, speed
     m         overrides for portrait / phone layouts

   Design intent, page by page:
     home          the poster shot: hole large on the right, disk almost edge-on,
                   hero copy on the left
     student       a raised oblique view, hole upper-right: "your day at a glance"
     timetable     edge-on: the disk becomes a horizon line, a timeline in space
     announcements polar view: the disk faces us as concentric broadcast rings
     recent        a close pass, huge and fast: things that just changed
     teacher       high command angle with the far side of the disk visible
     edit          pulled far back and dimmed: a calm backdrop for dense forms
     annEdit       polar again, distant and dim
     simulator     face-on ring, centred like a clock face, disk spinning faster
   ========================================================================= */

export const SCENES = {
  home: {
    r: 22, inc: 10, az: -28, fov: 44, fx: 0.36, fy: 0.03,
    look: { disk: 1.08, star: 1, rot: 1, bloom: 0.62, vig: 1.05, grain: 0.04, ca: 0.0028, expo: 1 },
    drift: { az: 3.2, inc: 1.1, speed: 0.06 },
    m: { fx: 0, fy: 0.6, inc: 12, r: 21 },
  },
  student: {
    r: 27, inc: 24, az: 62, fov: 44, fx: 0.52, fy: 0.52,
    look: { disk: 1, star: 1, rot: 1, bloom: 0.55, vig: 1.1, grain: 0.04, ca: 0.0026, expo: 1 },
    drift: { az: 2.4, inc: 0.8, speed: 0.05 },
    m: { fx: 0, fy: 0.62 },
  },
  timetable: {
    r: 33, inc: 5, az: 8, fov: 44, fx: 0.5, fy: 0.56,
    look: { disk: 1.05, star: 1, rot: 0.8, bloom: 0.6, vig: 1.15, grain: 0.04, ca: 0.0028, expo: 1 },
    drift: { az: 2.8, inc: 0.5, speed: 0.045 },
    m: { fx: 0, fy: 0.62 },
  },
  announcements: {
    r: 28, inc: 76, az: 0, fov: 44, fx: 0.56, fy: 0.5,
    look: { disk: 1, star: 1.05, rot: 1.35, bloom: 0.55, vig: 1.1, grain: 0.04, ca: 0.0026, expo: 1 },
    drift: { az: 4, inc: 1.5, speed: 0.05 },
    m: { fx: 0, fy: 0.6 },
  },
  recent: {
    r: 13, inc: 15, az: 55, fov: 44, fx: 0.62, fy: 0.5,
    look: { disk: 0.95, star: 0.95, rot: 1.25, bloom: 0.62, vig: 1.15, grain: 0.045, ca: 0.0032, expo: 1 },
    drift: { az: 3.4, inc: 1.2, speed: 0.07 },
    m: { fx: 0, fy: 0.6 },
  },
  teacher: {
    r: 25, inc: 46, az: 150, fov: 44, fx: 0.52, fy: 0.52,
    look: { disk: 1, star: 1, rot: 1, bloom: 0.55, vig: 1.1, grain: 0.04, ca: 0.0026, expo: 1 },
    drift: { az: 2.6, inc: 1, speed: 0.05 },
    m: { fx: 0, fy: 0.62 },
  },
  edit: {
    r: 44, inc: 20, az: 200, fov: 44, fx: 0.62, fy: 0.55,
    look: { disk: 0.64, star: 0.8, rot: 0.6, bloom: 0.4, vig: 1.2, grain: 0.035, ca: 0.002, expo: 0.9 },
    drift: { az: 1.6, inc: 0.5, speed: 0.04 },
    m: { fx: 0, fy: 0.62 },
  },
  annEdit: {
    r: 38, inc: 62, az: 250, fov: 44, fx: 0.6, fy: 0.55,
    look: { disk: 0.66, star: 0.8, rot: 0.7, bloom: 0.42, vig: 1.2, grain: 0.035, ca: 0.002, expo: 0.9 },
    drift: { az: 1.8, inc: 0.6, speed: 0.04 },
    m: { fx: 0, fy: 0.62 },
  },
  simulator: {
    r: 27, inc: 80, az: 20, fov: 44, fx: 0.12, fy: 0.5,
    look: { disk: 1.02, star: 1, rot: 1.6, bloom: 0.6, vig: 1.1, grain: 0.04, ca: 0.0028, expo: 1 },
    drift: { az: 2, inc: 1, speed: 0.06 },
    m: { fx: 0, fy: 0.6 },
  },
};

const FILE_TO_SCENE = {
  '': 'home',
  'index.html': 'home',
  'index-student.html': 'student',
  'index-teacher.html': 'teacher',
  'view.html': 'timetable',
  'announcements-view.html': 'announcements',
  'announcements-edit.html': 'annEdit',
  'edit.html': 'edit',
  'recent.html': 'recent',
  'simulator.html': 'simulator',
};

export function sceneKeyForPath(pathname) {
  const file = pathname.split('/').pop() || '';
  return FILE_TO_SCENE[file] || 'student';
}

/** Distance multiplier so the hole still fits when the frame is narrower than 16:9. */
function fitScale(aspect) {
  if (aspect >= 1.6) return 1;
  return Math.min(2.4, Math.pow(1.78 / aspect, 0.9));
}

/** Turn a scene definition into a concrete pose + look for the current viewport. */
export function resolveScene(key, aspect) {
  const base = SCENES[key] || SCENES.student;
  const portrait = aspect < 0.85;
  const s = portrait && base.m ? { ...base, ...base.m } : base;
  const wide = Math.max(0.4, aspect);
  return {
    pose: {
      r: s.r * fitScale(aspect),
      inc: s.inc * Math.PI / 180,
      az: s.az * Math.PI / 180,
      sx: s.fx * 0.5 * wide,
      sy: s.fy * 0.5,
      fov: s.fov,
    },
    look: { ...s.look },
    drift: { ...base.drift },
  };
}

/** Where the home intro starts: far away, high above the disk, lights down. */
export function introFrom(aspect) {
  return {
    pose: { r: 120 * Math.min(1.6, fitScale(aspect)), inc: 58 * Math.PI / 180, az: -74 * Math.PI / 180, sx: 0, sy: 0, fov: 44 },
    look: { disk: 0.9, star: 1, rot: 1, bloom: 0.55, vig: 1.2, grain: 0.05, ca: 0.0028, expo: 0 },
  };
}

/** Where a cold deep-link load (no previous page) arrives from. */
export function arrivalFrom(key, aspect) {
  const t = resolveScene(key, aspect);
  return {
    pose: { ...t.pose, r: t.pose.r * 1.45, inc: t.pose.inc + 0.2, az: t.pose.az - 0.5, sx: t.pose.sx * 0.4, sy: t.pose.sy * 0.4 },
    look: { ...t.look, expo: 0 },
  };
}
