export const RAY_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const RAY_FRAG = /* glsl */ `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
precision highp int;
#else
precision mediump float;
precision mediump int;
#endif

uniform vec2 uRes;
uniform float uTime;
uniform vec3 uCamPos;
uniform vec3 uCamTarget;
uniform float uFov;
uniform int uSteps;
uniform float uRotSign;
uniform int uDebug;
uniform float uDin;
uniform float uDout;
uniform float uDopMax;
uniform float uOpNear;
uniform float uOpFar;
uniform float uDiskBright;
uniform float uStarBright;
uniform float uSkyFloor;
uniform float uRotSpeed;
uniform vec2 uShift; // [site] lens shift, in screen-heights: moves the hole across the frame without rotating the view

varying vec2 vUv;

const float RS = 1.0;
const float PI = 3.141592653589793;

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i);
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  return mix(mix(nx00, nx10, f.y), mix(nx01, nx11, f.y), f.z);
}

float fbm(vec3 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 5; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + 11.3;
    a *= 0.5;
  }
  return s;
}

vec3 blackbody(float t) {
  vec3 c = mix(vec3(0.55, 0.06, 0.01), vec3(1.00, 0.42, 0.10), smoothstep(0.0, 0.55, t));
  c = mix(c, vec3(1.00, 0.86, 0.55), smoothstep(0.50, 1.05, t));
  c = mix(c, vec3(0.85, 0.92, 1.25), smoothstep(1.05, 1.90, t));
  return c;
}

float fluxAt(float r) {
  float x = max(r, 3.001);
  return pow(x / 3.0, -3.0) * (1.0 - sqrt(3.0 / x));
}

vec3 rotDir(vec3 d, float a, float b) {
  float ca = cos(a), sa = sin(a);
  float cb = cos(b), sb = sin(b);
  d = vec3(ca * d.x + sa * d.z, d.y, -sa * d.x + ca * d.z);
  d = vec3(d.x, cb * d.y - sb * d.z, sb * d.y + cb * d.z);
  return d;
}

vec3 starCell(vec3 dir, float scale, float thresh) {
  vec3 p = dir * scale;
  vec3 cell = floor(p);
  vec3 f = fract(p) - 0.5;
  float h = hash13(cell);
  float d2 = dot(f, f);
  float m = 0.0;
  if (h > thresh) {
    float inten = (h - thresh) / max(1.0e-4, 1.0 - thresh);
    m = exp(-d2 * 52.0) * inten;
  }
  vec3 col = vec3(m);
  if (h > 0.9975) {
    float hero = exp(-d2 * 7.5) * 1.65;
    vec3 tint = mix(vec3(1.0, 0.84, 0.68), vec3(0.68, 0.84, 1.22), step(0.9987, h));
    col += hero * tint;
  }
  return col;
}

vec3 background(vec3 dir) {
  dir = normalize(dir);
  vec3 col = uSkyFloor * vec3(0.10, 0.13, 0.28);

  vec3 n = normalize(vec3(0.25, 1.0, 0.15));
  float w = dot(dir, n);
  float band = exp(-w * w * 7.0);
  float cloud = fbm(dir * 3.4 + 1.7);
  float dust = fbm(dir * 7.1 + 9.2);
  vec3 mw = mix(vec3(0.04, 0.07, 0.20), vec3(0.42, 0.24, 0.52), cloud);
  col += mw * band * (1.0 - dust * 0.68) * 1.15;

  col += starCell(rotDir(dir, 0.40, 0.18), 42.0, 0.952);
  col += starCell(rotDir(dir, 1.70, -0.62), 88.0, 0.952);
  col += starCell(rotDir(dir, -1.12, 0.91), 154.0, 0.952);
  col += starCell(rotDir(dir, 2.35, 1.40), 268.0, 0.968);

  return col * uStarBright;
}

void diskPattern(vec3 qp, float qr, out float turb, out float streak, out float laneMask) {
  vec2 xz = qp.xz / max(qr, 1.0e-4);
  float omega = uRotSign * 1.1 * uRotSpeed * pow(3.0 / max(qr, 0.35), 1.5);
  float ph = omega * uTime;
  float cs = cos(ph);
  float sn = sin(ph);
  vec2 rot = vec2(xz.x * cs - xz.y * sn, xz.x * sn + xz.y * cs);

  vec3 base = vec3(rot * 3.15, qr * 0.085);
  float warp = fbm(base * 1.5);
  float inner = smoothstep(18.0, 4.0, qr);
  vec3 tp = vec3(rot * mix(1.7, 7.2, inner) + warp * 1.5, qr * 0.11 + uTime * 0.018);
  turb = 0.55 + 0.70 * fbm(tp);
  streak = 0.62 + 0.55 * fbm(vec3(rot.x * 22.0, rot.y * 3.4 + qr * 0.28, uTime * 0.07 + omega * 0.12));
  laneMask = mix(0.70, 1.05, smoothstep(0.26, 0.64, fbm(vec3(rot * 2.35, qr * 0.19))));
}

vec3 diskShade(vec3 qp, float qr, vec3 vel, out float turbOut) {
  float flux = fluxAt(qr);
  float temp = pow(max(flux * 10.0, 1.0e-8), 0.25);

  float turb, streak, laneMask;
  diskPattern(qp, qr, turb, streak, laneMask);
  turbOut = turb;

  float I = flux * 11.0 * turb * streak * laneMask;
  I += exp(-((qr - 3.1) * 3.0) * ((qr - 3.1) * 3.0)) * 2.8;
  float fade = smoothstep(uDout, uDout - 14.0, qr);
  I *= fade;

  float beta = sqrt(0.5 / max(qr, 0.51));
  float gamma = 1.0 / sqrt(max(1.0e-4, 1.0 - beta * beta));
  float ang = atan(qp.z, qp.x);
  vec3 tdir = normalize(vec3(-sin(ang), 0.0, cos(ang))) * uRotSign;
  vec3 rayDir = -normalize(vel);
  float D = 1.0 / (gamma * (1.0 - dot(tdir * beta, rayDir)));
  D = clamp(D, 0.50, uDopMax);
  float g = sqrt(max(0.0, 1.0 - RS / max(qr, 1.001)));

  vec3 c = blackbody(temp * D * g) * I;
  c *= D * D * D * g;
  return c;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / max(uRes.y, 1.0) - uShift;
  vec3 ro = uCamPos;
  vec3 target = uCamTarget;
  vec3 ww = target - ro;
  float wlen = length(ww);
  ww = wlen > 1.0e-5 ? ww / wlen : vec3(0.0, 0.0, -1.0);

  vec3 worldUp = vec3(0.0, 1.0, 0.0);
  if (abs(dot(ww, worldUp)) > 0.995) worldUp = vec3(0.0, 0.0, 1.0);
  vec3 uu = normalize(cross(ww, worldUp));
  vec3 vv = cross(uu, ww);
  vec3 rd = normalize(p.x * uu + p.y * vv + uFov * ww);

  vec3 pos = ro;
  vec3 vel = rd;
  vec3 col = vec3(0.0);
  float trans = 1.0;
  float minR = 1.0e5;
  float lastR = length(ro);
  int stepsUsed = 0;
  int crossingCount = 0;
  int validCross = 0;
  float firstAng = 0.0;
  float firstQR = 0.0;
  float lastQR = 0.0;
  float turbDbg = 0.0;

  bool diskOnly = (uDebug == 1);
  bool bgOnly = (uDebug == 2);

  for (int i = 0; i < 600; i++) {
    if (i >= uSteps) break;

    float r = max(length(pos), 1.0e-4);
    if (r < 1.03 * RS) {
      trans = 0.0;
      lastR = r;
      break;
    }
    if (r > 45.0 && dot(pos, vel) > 0.0) {
      lastR = r;
      break;
    }

    minR = min(minR, r);

    vec3 h = cross(pos, vel);
    float h2 = dot(h, h);
    float r2 = r * r;
    vec3 acc = (-1.5 * RS * h2 / max(r2 * r2 * r, 1.0e-8)) * pos;

    float dt = max(0.012, r * mix(0.02, 0.06, smoothstep(6.0, 20.0, r)));
    vec3 vnext = vel + acc * dt;
    float vlen = length(vnext);
    vel = vlen > 1.0e-8 ? vnext / vlen : vel;
    vec3 npos = pos + vel * dt;

    if (!bgOnly && pos.y * npos.y <= 0.0) {
      crossingCount += 1;
      float t = abs(pos.y) / (abs(pos.y) + abs(npos.y) + 1.0e-5);
      vec3 qp = mix(pos, npos, clamp(t, 0.0, 1.0));
      float qr = max(length(qp), 1.0e-4);
      if (qr > uDin && qr < uDout) {
        validCross += 1;
        lastQR = qr;
        float turb;
        vec3 dcol = diskShade(qp, qr, vel, turb);
        if (validCross == 1) {
          firstAng = atan(qp.z, qp.x);
          firstQR = qr;
          turbDbg = turb;
        }
        float fade = smoothstep(uDout, uDout - 14.0, qr);
        float op = mix(uOpFar, uOpNear, smoothstep(13.0, 4.0, qr)) * fade;
        col += trans * dcol * op * uDiskBright;
        trans *= (1.0 - op);
        if (trans < 0.02) {
          pos = npos;
          lastR = r;
          stepsUsed = i + 1;
          break;
        }
      }
    }

    if (!bgOnly) {
      float ay = abs(pos.y);
      if (ay < 0.45 && r > uDin && r < uDout) {
        float density = exp(-ay * 30.0) * 0.03 * smoothstep(uDout - 1.0, 10.0, r);
        float fh = fluxAt(r);
        vec3 diskGlow = blackbody(pow(max(fh * 10.0, 1.0e-8), 0.25)) * (fh * 8.0 + 0.18);
        col += trans * diskGlow * density * dt * uDiskBright;
      }
    }

    pos = npos;
    lastR = r;
    stepsUsed = i + 1;
  }

  if (!diskOnly && trans > 0.0) {
    float dim = clamp((lastR - 1.03) * 0.45, 0.45, 1.0);
    col += trans * background(vel) * dim;
  }

  if (uDebug == 0) {
    float pr = exp(-((minR - 1.55) * 4.0) * ((minR - 1.55) * 4.0));
    col += vec3(1.0, 0.92, 0.80) * pr * 0.05;
  }

  if (uDebug == 3) {
    float t = float(stepsUsed) / max(float(uSteps), 1.0);
    col = vec3(t);
  } else if (uDebug == 4) {
    col = validCross > 0
      ? vec3(clamp((lastQR - uDin) / max(uDout - uDin, 0.001), 0.0, 1.0), 0.18, 1.0 - clamp((firstQR - uDin) / max(uDout - uDin, 0.001), 0.0, 1.0))
      : vec3(0.0);
  } else if (uDebug == 5) {
    col = validCross > 0 ? vec3(turbDbg) : vec3(0.0);
  } else if (uDebug == 6) {
    col = vec3(minR / 12.0, float(crossingCount) / 4.0, 0.0);
  } else if (uDebug == 7) {
    if (validCross <= 0) col = vec3(0.0);
    else if (validCross == 1) col = vec3(0.05, 0.25, 1.0);
    else if (validCross == 2) col = vec3(0.1, 1.0, 0.25);
    else col = vec3(1.0, 0.12, 0.08);
  } else if (uDebug == 8) {
    col = validCross > 0 ? 0.5 + 0.5 * sin(vec3(firstAng) + vec3(0.0, 2.094395, 4.188790)) : vec3(0.0);
  } else if (uDebug == 9) {
    if (validCross <= 0) {
      col = vec3(0.0);
    } else {
      float bands = floor(firstQR * 2.0);
      col = 0.5 + 0.5 * sin(vec3(0.9, 1.7, 2.4) * bands);
    }
  }

  col = clamp(col, 0.0, 64.0);
  if (!(col.x <= 64.0 && col.y <= 64.0 && col.z <= 64.0)) col = vec3(0.0);
  gl_FragColor = vec4(col, 1.0);
}
`;

export const COMPOSITE_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const COMPOSITE_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tDiffuse;
uniform vec2 uRes;
uniform float uTime;
uniform float uVignette;
uniform float uGrain;
uniform float uCA;
uniform float uExpo; // [site] exposure, used for fade-from-black
varying vec2 vUv;

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec2 uv = vUv;
  vec2 dir = uv - 0.5;
  float ca = uCA * dot(dir, dir);
  float r = texture2D(tDiffuse, uv + dir * ca).r;
  float g = texture2D(tDiffuse, uv).g;
  float b = texture2D(tDiffuse, uv - dir * ca).b;
  vec3 col = vec3(r, g, b);

  col *= 0.95 * uExpo;
  col = aces(col);

  float aspect = uRes.x / max(uRes.y, 1.0);
  float vig = smoothstep(1.30, 0.30, length(dir * vec2(aspect, 1.0)) * 1.15);
  col *= mix(1.0, vig, uVignette);

  float n = fract(sin(dot(gl_FragCoord.xy + fract(uTime * 13.7) * 97.0, vec2(12.9898, 78.233))) * 43758.5453);
  float grain = n - 0.5;
  col += grain * uGrain * (1.0 - 0.5 * col);

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
