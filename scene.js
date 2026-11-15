import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const FOV = 50;
const CAM_Z = 12;

const BG_VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }
`;

const BG_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform float uTime, uWarmth, uFinal;
uniform vec2 uRes;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main() {
  float asp = uRes.x / uRes.y;
  vec2 p = vec2((vUv.x - 0.5) * asp, vUv.y - 0.5);
  float t = uTime * 0.035;

  vec3 top = vec3(0.075, 0.025, 0.11);
  vec3 bot = vec3(0.33, 0.07, 0.22);
  vec3 col = mix(bot, top, smoothstep(-0.55, 0.6, p.y));

  float n  = fbm(p * 1.5 + vec2(t, -t * 0.7));
  float n2 = fbm(p * 2.3 - vec2(t * 1.3, t * 0.4) + n * 1.2);

  vec3 rose  = vec3(0.86, 0.30, 0.52);
  vec3 peach = vec3(1.00, 0.60, 0.45);
  vec3 lilac = vec3(0.52, 0.30, 0.82);
  vec3 gold  = vec3(1.00, 0.78, 0.48);

  vec3 aur = mix(lilac, rose, smoothstep(0.3, 0.7, n));
  aur = mix(aur, peach, uWarmth * 0.75);
  col += aur * pow(n2, 2.3) * (0.6 + 0.5 * uWarmth + 0.3 * uFinal);

  float r = length(p - vec2(0.0, 0.16));
  vec3 halo = mix(mix(rose, peach, uWarmth), gold, uFinal * 0.5);
  col += halo * exp(-r * r * 3.2) * (0.16 + 0.22 * uWarmth + 0.22 * uFinal);

  vec2 g = vUv * vec2(asp, 1.0) * 80.0;
  vec2 id = floor(g);
  float h = hash(id);
  float d = length(fract(g) - 0.5);
  float star = step(0.986, h) * (1.0 - smoothstep(0.0, 0.14, d)) * (0.55 + 0.45 * sin(uTime * (0.8 + h * 3.0) + h * 50.0));
  col += vec3(1.0, 0.92, 0.96) * star * 0.8 * smoothstep(-0.2, 0.35, p.y);

  vec2 vg = p * vec2(0.75, 1.0);
  col *= 1.0 - 0.38 * dot(vg, vg);
  gl_FragColor = vec4(col, 1.0);
}
`;

const HEART_VERT = /* glsl */`
attribute vec4 aSeed;
attribute vec3 aTarget;
uniform float uTime, uForm, uPulse, uScale, uHeartScale, uWarmth;
uniform vec2 uBox, uHeartCenter;
varying float vAlpha;
varying vec3 vColor;
varying float vRot;

void main() {
  vec3 p = position;
  float speed = 0.22 + aSeed.x * 0.45;
  float y = p.y * uBox.y + uTime * speed;
  y = mod(y + uBox.y, 2.0 * uBox.y) - uBox.y;
  float x = p.x * uBox.x + sin(uTime * 0.35 + aSeed.y * 6.2831) * 0.7 * aSeed.z;
  vec3 drift = vec3(x, y, p.z);

  float ph = fract(uTime * 0.85);
  float beat = 1.0 + 0.055 * (exp(-ph * 14.0) + 0.7 * exp(-abs(ph - 0.22) * 14.0));
  vec3 target = vec3(uHeartCenter + aTarget.xy * uHeartScale * beat, aTarget.z);
  target.xy += vec2(sin(uTime * 1.3 + aSeed.y * 20.0), cos(uTime * 1.1 + aSeed.x * 20.0)) * 0.035;

  float delay = aSeed.w * 0.5;
  float f = smoothstep(delay, delay + 0.5, uForm);
  vec3 pos = mix(drift, target, f);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  float world = (0.09 + aSeed.z * 0.2) * mix(1.0, 0.62, f) * (1.0 + uPulse * 0.5);
  gl_PointSize = world * uScale / -mv.z;

  float edge = 1.0 - smoothstep(uBox.y - 1.6, uBox.y, abs(y));
  float tw = 0.72 + 0.28 * sin(uTime * 2.1 + aSeed.x * 31.0);
  vAlpha = mix(edge * (0.35 + 0.65 * aSeed.y), 1.0, f) * tw;

  vec3 pink = vec3(1.0, 0.48, 0.68);
  vec3 red  = vec3(1.0, 0.24, 0.42);
  vec3 gold = vec3(1.0, 0.80, 0.55);
  vec3 c = mix(pink, red, step(0.55, aSeed.x));
  c = mix(c, gold, step(0.82, aSeed.y) + uWarmth * 0.35 * aSeed.z);
  vColor = clamp(c, 0.0, 1.0) * (1.0 + uPulse * 0.6);
  vRot = sin(uTime * 0.6 + aSeed.y * 6.0) * 0.45 * (1.0 - f);
}
`;

const HEART_FRAG = /* glsl */`
precision highp float;
varying float vAlpha;
varying vec3 vColor;
varying float vRot;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  p.y = -p.y;
  float c = cos(vRot), s = sin(vRot);
  p = mat2(c, -s, s, c) * p;
  p *= 1.4;
  p.y += 0.15;
  float a = p.x * p.x + p.y * p.y - 1.0;
  float v = a * a * a - p.x * p.x * p.y * p.y * p.y;
  float core = 1.0 - smoothstep(-0.03, 0.03, v);
  float glow = exp(-dot(p, p) * 1.5) * 0.35;
  float alpha = (core * 0.9 + glow) * vAlpha;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(vColor * (core + glow * 0.8), alpha);
}
`;

const PETAL_VERT = /* glsl */`
attribute vec4 aSeed;
uniform float uTime, uScale, uFade;
uniform vec2 uBox;
varying float vAlpha;
varying float vRot;
varying float vTone;
void main() {
  vec3 p = position;
  float speed = 0.35 + aSeed.x * 0.4;
  float y = p.y * uBox.y - uTime * speed;
  y = mod(y + uBox.y, 2.0 * uBox.y) - uBox.y;
  float x = p.x * uBox.x + sin(uTime * 0.5 + aSeed.y * 6.2831) * 1.2 + sin(uTime * 0.17 + aSeed.z * 9.0) * 0.8;
  vec4 mv = modelViewMatrix * vec4(x, y, p.z, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (0.16 + aSeed.z * 0.16) * uScale / -mv.z;
  float edge = 1.0 - smoothstep(uBox.y - 1.6, uBox.y, abs(y));
  vAlpha = edge * (0.45 + 0.4 * aSeed.y) * uFade;
  vRot = uTime * (0.4 + aSeed.w) + aSeed.x * 6.2831;
  vTone = aSeed.w;
}
`;

const PETAL_FRAG = /* glsl */`
precision highp float;
varying float vAlpha;
varying float vRot;
varying float vTone;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float c = cos(vRot), s = sin(vRot);
  p = mat2(c, -s, s, c) * p;
  float squash = 0.55 + 0.45 * abs(sin(vRot * 0.7));
  p.x /= squash;
  float d = length(p * vec2(1.0, 1.7) + vec2(0.0, 0.25 * p.x * p.x));
  float m = 1.0 - smoothstep(0.62, 0.8, d);
  if (m * vAlpha < 0.01) discard;
  vec3 col = mix(vec3(1.0, 0.82, 0.88), vec3(1.0, 0.58, 0.72), vTone);
  col *= 0.85 + 0.25 * (1.0 - d);
  gl_FragColor = vec4(col, m * vAlpha);
}
`;

function heartTargets(n) {
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = Math.random() * Math.PI * 2;
    const hx = 16 * Math.pow(Math.sin(t), 3);
    const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    let k = 1;
    if (Math.random() < 0.38) k = Math.sqrt(Math.random()) * 0.92;
    const j = 0.025;
    out[i * 3 + 0] = (hx / 16) * k + (Math.random() - 0.5) * j;
    out[i * 3 + 1] = (hy / 16) * k + 0.14 + (Math.random() - 0.5) * j;
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.9;
  }
  return out;
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,170,200,0.9)');
  grd.addColorStop(0.35, 'rgba(255,90,140,0.35)');
  grd.addColorStop(1, 'rgba(255,60,120,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function heartMesh() {
  const s = new THREE.Shape();
  s.moveTo(5, 5);
  s.bezierCurveTo(5, 5, 4, 0, 0, 0);
  s.bezierCurveTo(-6, 0, -6, 7, -6, 7);
  s.bezierCurveTo(-6, 11, -3, 15.4, 5, 19);
  s.bezierCurveTo(12, 15.4, 16, 11, 16, 7);
  s.bezierCurveTo(16, 7, 16, 0, 10, 0);
  s.bezierCurveTo(7, 0, 5, 5, 5, 5);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 3.2, bevelEnabled: true, bevelSegments: 10, steps: 1,
    bevelSize: 2.2, bevelThickness: 2.4, curveSegments: 40,
  });
  geo.center();
  geo.rotateZ(Math.PI);
  geo.scale(0.085, 0.085, 0.085);
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xff2e6c, roughness: 0.22, metalness: 0.05,
    clearcoat: 1, clearcoatRoughness: 0.12,
    sheen: 1, sheenColor: new THREE.Color(0xffb3cc), sheenRoughness: 0.4,
    emissive: 0x6a0024, emissiveIntensity: 0.55,
  });
  return new THREE.Mesh(geo, mat);
}

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  const isMobile = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 600;
  const DPR = Math.min(window.devicePixelRatio || 1, isMobile ? 1.75 : 2);
  renderer.setPixelRatio(DPR);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.set(0, 0, CAM_Z);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  // background
  const bgMat = new THREE.ShaderMaterial({
    vertexShader: BG_VERT, fragmentShader: BG_FRAG,
    uniforms: { uTime: { value: 0 }, uWarmth: { value: 0 }, uFinal: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } },
    depthWrite: false, depthTest: false, toneMapped: false,
  });
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
  bg.frustumCulled = false;
  bg.renderOrder = -10;
  scene.add(bg);

  // floating hearts
  const N = isMobile ? 420 : 760;
  const pos = new Float32Array(N * 3);
  const seed = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = Math.random() * 2 - 1;
    pos[i * 3 + 1] = Math.random() * 2 - 1;
    pos[i * 3 + 2] = -9 + Math.random() * 12;
    for (let k = 0; k < 4; k++) seed[i * 4 + k] = Math.random();
  }
  const hGeo = new THREE.BufferGeometry();
  hGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  hGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  hGeo.setAttribute('aTarget', new THREE.BufferAttribute(heartTargets(N), 3));
  const hMat = new THREE.ShaderMaterial({
    vertexShader: HEART_VERT, fragmentShader: HEART_FRAG,
    uniforms: {
      uTime: { value: 0 }, uForm: { value: 0 }, uPulse: { value: 0 }, uScale: { value: 1 },
      uHeartScale: { value: 3 }, uWarmth: { value: 0 },
      uBox: { value: new THREE.Vector2(10, 10) }, uHeartCenter: { value: new THREE.Vector2(0, 0.5) },
    },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const hearts = new THREE.Points(hGeo, hMat);
  hearts.frustumCulled = false;
  scene.add(hearts);

  // petals
  const P = isMobile ? 60 : 110;
  const pPos = new Float32Array(P * 3);
  const pSeed = new Float32Array(P * 4);
  for (let i = 0; i < P; i++) {
    pPos[i * 3] = Math.random() * 2 - 1;
    pPos[i * 3 + 1] = Math.random() * 2 - 1;
    pPos[i * 3 + 2] = -7 + Math.random() * 11;
    for (let k = 0; k < 4; k++) pSeed[i * 4 + k] = Math.random();
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('aSeed', new THREE.BufferAttribute(pSeed, 4));
  const pMat = new THREE.ShaderMaterial({
    vertexShader: PETAL_VERT, fragmentShader: PETAL_FRAG,
    uniforms: { uTime: { value: 0 }, uScale: { value: 1 }, uFade: { value: 1 }, uBox: { value: new THREE.Vector2(10, 10) } },
    transparent: true, depthWrite: false, toneMapped: false,
  });
  const petals = new THREE.Points(pGeo, pMat);
  petals.frustumCulled = false;
  scene.add(petals);

  // 3D heart
  const heartGroup = new THREE.Group();
  const heart = heartMesh();
  heartGroup.add(heart);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  }));
  halo.scale.set(6, 6, 1);
  halo.position.z = -1.2;
  heartGroup.add(halo);
  scene.add(heartGroup);

  scene.add(new THREE.AmbientLight(0xffd6e4, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 4, 7);
  scene.add(key);
  const rim = new THREE.PointLight(0xff6fa8, 40, 30);
  rim.position.set(-4, -2, -3);
  scene.add(rim);
  const warm = new THREE.PointLight(0xffc48a, 20, 30);
  warm.position.set(4, 1, 4);
  scene.add(warm);

  // state
  const state = {
    mode: 'intro', warmth: 0, warmthTarget: 0, form: 0, formTarget: 0, final: 0,
    pulse: 0, heartY: 0, heartS: 1, mouse: new THREE.Vector2(), cam: new THREE.Vector2(),
  };
  let halfH = 1, halfW = 1;

  function screenY(frac) { return halfH * (1 - 2 * frac); }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    halfH = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * CAM_Z;
    halfW = halfH * camera.aspect;
    const scale = (h * DPR) / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    hMat.uniforms.uScale.value = scale;
    pMat.uniforms.uScale.value = scale;
    const farH = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * (CAM_Z + 9);
    const box = new THREE.Vector2(farH * camera.aspect + 1.5, farH + 1.5);
    hMat.uniforms.uBox.value.copy(box);
    pMat.uniforms.uBox.value.copy(box);
    bgMat.uniforms.uRes.value.set(w, h);
    hMat.uniforms.uHeartScale.value = Math.min(halfW * 0.9, halfH * 0.62);
    hMat.uniforms.uHeartCenter.value.set(0, halfH * 0.04);
  }
  resize();
  window.addEventListener('resize', resize);

  window.addEventListener('pointermove', (e) => {
    state.mouse.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
  }, { passive: true });

  function targets() {
    const mobileShrink = camera.aspect < 0.8 ? 0.8 : 1;
    switch (state.mode) {
      case 'intro': return { y: screenY(0.2), s: 1.05 * mobileShrink };
      case 'quest': return { y: screenY(0.055), s: 0.34 };
      case 'final': return { y: halfH * 0.04, s: 0.95 * mobileShrink };
      default: return { y: 0, s: 1 };
    }
  }

  const clock = new THREE.Clock();
  let t = 0;
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;

    state.warmth += (state.warmthTarget - state.warmth) * Math.min(1, dt * 1.6);
    state.form += (state.formTarget - state.form) * Math.min(1, dt * 0.55);
    state.final += ((state.mode === 'final' ? 1 : 0) - state.final) * Math.min(1, dt * 0.8);
    state.pulse *= Math.pow(0.08, dt);

    const tg = targets();
    state.heartY += (tg.y - state.heartY) * Math.min(1, dt * 2.2);
    state.heartS += (tg.s - state.heartS) * Math.min(1, dt * 2.2);

    const ph = (t * 0.85) % 1;
    const beat = 1 + 0.07 * (Math.exp(-ph * 14) + 0.7 * Math.exp(-Math.abs(ph - 0.22) * 14)) + state.pulse * 0.15;
    heartGroup.position.y = state.heartY + Math.sin(t * 0.9) * 0.08;
    heartGroup.scale.setScalar(state.heartS * beat);
    heart.rotation.y = Math.sin(t * 0.55) * 0.55;
    heart.rotation.x = Math.sin(t * 0.4) * 0.08;
    halo.material.opacity = 0.55 + 0.25 * state.warmth + 0.2 * state.final + state.pulse * 0.3;

    state.cam.lerp(state.mouse, Math.min(1, dt * 1.5));
    camera.position.x = state.cam.x * 0.6;
    camera.position.y = -state.cam.y * 0.4;
    camera.lookAt(0, 0, 0);

    bgMat.uniforms.uTime.value = t;
    bgMat.uniforms.uWarmth.value = state.warmth;
    bgMat.uniforms.uFinal.value = state.final;
    hMat.uniforms.uTime.value = t;
    hMat.uniforms.uWarmth.value = state.warmth;
    hMat.uniforms.uForm.value = state.form;
    hMat.uniforms.uPulse.value = state.pulse;
    pMat.uniforms.uTime.value = t;
    pMat.uniforms.uFade.value = 1 - state.form * 0.6;

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    setMode(mode) {
      state.mode = mode;
      state.formTarget = mode === 'final' ? 1 : 0;
      if (mode === 'final') state.warmthTarget = 1;
    },
    setWarmth(v) { state.warmthTarget = Math.max(0, Math.min(1, v)); },
    pulse(v = 1) { state.pulse = Math.max(state.pulse, v); },
  };
}
