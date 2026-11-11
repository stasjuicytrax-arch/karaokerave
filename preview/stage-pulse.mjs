const canvas = document.querySelector('.hero-pulse');
const motion = matchMedia('(prefers-reduced-motion: no-preference)');

function canPlay() {
  const bounds = canvas.getBoundingClientRect();
  return motion.matches && !document.hidden && bounds.bottom > 0 && bounds.top < innerHeight;
}

async function playPulse() {
  await document.querySelector('.hero-stage img').decode();
  if (!canPlay()) return;
  const THREE = await import('./vendor/three-0.187.0.mjs?v=wordmark');
  if (!canPlay()) return;

  const context = canvas.getContext('webgl2', { alpha: true, antialias: false, powerPreference: 'low-power' });
  if (!context) return;

  const renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true });
  renderer.setClearColor(0, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(39, 1, .1, 24);
  camera.position.set(0, 3.1, 8.2);
  camera.lookAt(0, .38, 0);

  const geometry = new THREE.PlaneGeometry(8.4, 2.4, 48, 12);
  const uniforms = { phase: { value: 0 }, intensity: { value: 0 } };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      uniform float phase;
      varying vec2 surface;

      void main() {
        surface = uv * 2.0 - 1.0;
        vec3 point = position;
        point.y += sin(surface.x * 4.0 - phase) * 0.21;
        point.z += surface.x * surface.x * 1.18 + surface.y * 0.72;
        point.z += sin(surface.x * 7.0 + phase) * 0.14;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(point, 1.0);
      }
    `,
    fragmentShader: `
      uniform float phase;
      uniform float intensity;
      varying vec2 surface;

      void main() {
        float crest = sin(surface.x * 5.2 - phase * 1.4) * 0.16;
        float distanceToCrest = surface.y - crest;
        float cloud = exp(-distanceToCrest * distanceToCrest * 4.0);
        float core = exp(-distanceToCrest * distanceToCrest * 17.0);
        float edges = 1.0 - smoothstep(0.36, 1.0, abs(surface.x));
        float topBottom = 1.0 - smoothstep(0.48, 1.0, abs(surface.y));
        float density = 0.8 + 0.2 * sin(surface.x * 9.0 + surface.y * 7.0 - phase)
          * cos(surface.y * 11.0 + phase * 0.8);
        vec3 color = mix(vec3(0.77, 0.018, 0.035), vec3(1.0, 0.16, 0.11), core * 0.62);
        float alpha = intensity * edges * topBottom * density * (cloud * 0.45 + core * 0.37);
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });
  const wave = new THREE.Mesh(geometry, material);
  wave.rotation.y = -.18;
  scene.add(wave);

  const resize = new ResizeObserver(() => {
    const { clientWidth: width, clientHeight: height } = canvas;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
    renderer.setSize(width, height, false);
  });
  const visibility = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) stop();
  });

  let frame;
  let stopped = false;
  const start = performance.now() + 240;

  function stop() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    canvas.removeAttribute('data-active');
    canvas.removeEventListener('webglcontextlost', stop);
    document.removeEventListener('visibilitychange', checkVisibility);
    motion.removeEventListener('change', checkVisibility);
    window.removeEventListener('pagehide', stop);
    resize.disconnect();
    visibility.disconnect();
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    if (!context.isContextLost()) renderer.forceContextLoss();
  }

  function checkVisibility() {
    if (!canPlay()) stop();
  }

  function draw(now) {
    const progress = Math.max(0, (now - start) / 2600);
    if (progress >= 1) {
      stop();
      return;
    }
    const advance = THREE.MathUtils.smootherstep(progress, 0, 1);
    uniforms.phase.value = progress * 4.3;
    uniforms.intensity.value = THREE.MathUtils.smoothstep(progress, .04, .34)
      * (1 - THREE.MathUtils.smoothstep(progress, .56, .99));
    wave.position.set(0, .54 - advance * .86, -3.8 + advance * 5.9);
    wave.scale.set(.82 + advance * .34, .72 + advance * .4, 1);
    renderer.render(scene, camera);
    frame = requestAnimationFrame(draw);
  }

  resize.observe(canvas);
  visibility.observe(canvas);
  canvas.addEventListener('webglcontextlost', stop);
  document.addEventListener('visibilitychange', checkVisibility);
  motion.addEventListener('change', checkVisibility);
  window.addEventListener('pagehide', stop);
  canvas.setAttribute('data-active', '');
  frame = requestAnimationFrame(draw);
}

if (canvas && motion.matches && 'ResizeObserver' in window && 'IntersectionObserver' in window) {
  playPulse().catch(() => {});
}
