/* ============================================================
   ABT Shop Pitch — WebGL-Layer (Three.js)
   Glimmender Funken-/Carbon-Staub über dem Hero, reagiert
   träge auf Maus und Scroll. Bewusst subtil gehalten.
   ============================================================ */
import * as THREE from "./vendor/three.module.min.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const container = document.querySelector(".hero-webgl");

if (container && !reduceMotion) {
  try {
    init(container);
  } catch (e) {
    /* WebGL nicht verfügbar → Seite funktioniert ohne Layer */
  }
}

function init(mount) {
  const COUNT = 420;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 60);
  camera.position.z = 12;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  mount.appendChild(renderer.domElement);

  const positions = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT * 3);
  const sizes = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 26;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 15;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 9;
    seeds[i * 3 + 0] = Math.random() * Math.PI * 2;
    seeds[i * 3 + 1] = 0.25 + Math.random() * 0.9; // Steiggeschwindigkeit
    seeds[i * 3 + 2] = Math.random();              // Farb-/Größen-Mix
    sizes[i] = 1.2 + Math.random() * 3.2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uBoost: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aSeed;
      attribute float aSize;
      uniform float uTime;
      uniform float uBoost;
      uniform float uPixelRatio;
      varying float vMix;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        float t = uTime * (0.35 + uBoost * 1.6);
        p.y = mod(p.y + t * aSeed.y + 7.5, 15.0) - 7.5;
        p.x += sin(uTime * 0.4 + aSeed.x) * 0.8;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPixelRatio * (9.0 / -mv.z) * (1.0 + uBoost * 0.6);
        vMix = aSeed.z;
        vAlpha = smoothstep(7.5, 5.0, abs(p.y)) * (0.35 + uBoost * 0.5);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vMix;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float glow = smoothstep(0.5, 0.05, d);
        vec3 ember = vec3(0.92, 0.16, 0.16);   /* ABT Rot */
        vec3 dust  = vec3(0.55, 0.56, 0.60);   /* Carbon-Staub */
        vec3 col = mix(dust, ember, step(0.55, vMix));
        gl_FragColor = vec4(col, glow * vAlpha);
      }
    `,
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // Maus-Parallax (träge)
  let mx = 0, my = 0, tx = 0, ty = 0;
  window.addEventListener("pointermove", (e) => {
    tx = (e.clientX / window.innerWidth - 0.5) * 1.4;
    ty = (e.clientY / window.innerHeight - 0.5) * 0.9;
  }, { passive: true });

  // Scroll-Velocity → Boost
  let lastY = window.scrollY, boost = 0;

  function resize() {
    const w = mount.clientWidth || window.innerWidth;
    const h = mount.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  resize();
  window.addEventListener("resize", resize);

  const clock = new THREE.Clock();
  let visible = true;
  new IntersectionObserver(([en]) => (visible = en.isIntersecting), { threshold: 0 }).observe(mount);

  renderer.setAnimationLoop(() => {
    if (!visible) return;
    const t = clock.getElapsedTime();
    const y = window.scrollY;
    boost += (Math.min(Math.abs(y - lastY) / 90, 1.4) - boost) * 0.06;
    lastY = y;
    mx += (tx - mx) * 0.04;
    my += (ty - my) * 0.04;
    points.rotation.y = mx * 0.22;
    points.rotation.x = my * 0.14;
    mat.uniforms.uTime.value = t;
    mat.uniforms.uBoost.value = boost;
    renderer.render(scene, camera);
  });
}
