const hero = document.querySelector('.hero');
const stage = document.querySelector('.hero-object');
const canvas = stage.querySelector('canvas');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');

function texture(THREE, width, height, draw) {
  const image = document.createElement('canvas');
  image.width = width;
  image.height = height;
  draw(image.getContext('2d'));
  return new THREE.CanvasTexture(image);
}

// Geometry and perforated grille adapted from Partytime's src/scripts/fx/mic3d.ts.
function createMicrophone(THREE, scene) {
  const perforations = texture(THREE, 512, 256, ctx => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#000';
    const step = 11;
    for (let y = 0; y < 256; y += step * .86) {
      const row = Math.round(y / (step * .86));
      for (let x = (row % 2) * step / 2; x < 512; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, step * .33, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
  perforations.wrapS = perforations.wrapT = THREE.RepeatWrapping;
  perforations.repeat.set(2, 1);

  const chrome = new THREE.MeshStandardMaterial({ color: 0xf2f2f6, metalness: 1, roughness: .12, envMapIntensity: 1.6 });
  const darkChrome = new THREE.MeshStandardMaterial({ color: 0x2a282a, metalness: 1, roughness: .25, envMapIntensity: 1.25 });
  const red = new THREE.MeshStandardMaterial({ color: 0xe5141b, metalness: .35, roughness: .3, emissive: 0x4b0608, emissiveIntensity: .4 });
  const grille = new THREE.MeshStandardMaterial({
    color: 0xffffff, metalness: 1, roughness: .2, envMapIntensity: 1.8,
    alphaMap: perforations, alphaTest: .5, side: THREE.DoubleSide,
  });
  const core = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: .8 });
  const mic = new THREE.Group();

  function part(geometry, material, y) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = y;
    mic.add(mesh);
    return mesh;
  }

  part(new THREE.SphereGeometry(.66, 32, 24), core, 1.15);
  part(new THREE.SphereGeometry(.72, 64, 48), grille, 1.15);
  part(new THREE.TorusGeometry(.6, .075, 20, 64), red, .62).rotation.x = Math.PI / 2;
  part(new THREE.CylinderGeometry(.56, .42, .34, 48), chrome, .42);
  part(new THREE.CylinderGeometry(.4, .24, 2.3, 48), darkChrome, -.9);
  part(new THREE.CylinderGeometry(.335, .32, .18, 48), red, -.35);
  part(new THREE.CylinderGeometry(.24, .2, .16, 48), chrome, -2.1);
  scene.add(mic);
  return mic;
}

function lightStage(THREE, scene) {
  // Partytime's seeded club reflections, with a red and neutral light rig.
  scene.environment = texture(THREE, 768, 384, ctx => {
    ctx.scale(.75, .75);
    const backdrop = ctx.createLinearGradient(0, 0, 0, 512);
    backdrop.addColorStop(0, '#2c2326');
    backdrop.addColorStop(.5, '#191315');
    backdrop.addColorStop(1, '#090809');
    ctx.fillStyle = backdrop;
    ctx.fillRect(0, 0, 1024, 512);

    let seed = 29;
    const random = () => ((seed = seed * 16807 % 2147483647) / 2147483647);
    const colors = ['#FF3841', '#F4F1EC', '#E5141B', '#D5CDD0', '#FFFFFF', '#FF5C60', '#9F0B15', '#F2C7C8'];

    function spot(x, y, radius, color, alpha) {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, color);
      gradient.addColorStop(.35, color);
      gradient.addColorStop(1, 'transparent');
      ctx.globalAlpha = alpha;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) spot(random() * 1024, 80 + random() * 300, 60 + random() * 90, colors[i % 4], .28);
    for (let i = 0; i < 180; i++) spot(random() * 1024, random() * 512, 4 + random() * 16, colors[Math.floor(random() * colors.length)], .8);
    spot(300, 110, 46, '#ffffff', 1);
    spot(760, 150, 30, '#ffffff', 1);
    spot(540, 70, 22, '#ffffff', 1);
  });
  scene.environment.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment.colorSpace = THREE.SRGBColorSpace;

  for (const [color, intensity, x, y, z] of [[0xff2939, 23, 3, 2, 3], [0xf6eeec, 14, -3, -1, 3], [0xffffff, 23, 0, 3, 4]]) {
    const light = new THREE.PointLight(color, intensity, 12, 1.5);
    light.position.set(x, y, z);
    scene.add(light);
  }
}

async function start() {
  if (reduceMotion.matches) return;
  const context = canvas.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'low-power' });
  if (!context) return;
  const THREE = await import('./vendor/three-0.187.0.mjs');
  const renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true });
  renderer.setClearColor(0, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 35);
  camera.position.set(0, 0, 9.2);
  lightStage(THREE, scene);
  const microphone = createMicrophone(THREE, scene);
  const pointer = new THREE.Vector2();
  const current = new THREE.Vector2();
  let elapsed = 0;
  let previousFrame = null;
  let frame = 0;
  let visible = true;
  let lost = false;

  function render() {
    microphone.rotation.set(-.14 + current.y * .16, -.24 + current.x * .38 + Math.sin(elapsed * .78) * .25, -.41 + current.x * .09 + Math.sin(elapsed * .9) * .075);
    microphone.position.x = Math.sin(elapsed * .73) * .13;
    microphone.position.y = .12 + Math.sin(elapsed * 1.3) * .18;
    renderer.render(scene, camera);
  }

  function resize() {
    if (lost || reduceMotion.matches) return;
    const { clientWidth: width, clientHeight: height } = stage;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.position.z = camera.aspect < .78 ? 10.4 : 9.2;
    camera.position.x = width < 700 && innerWidth > 680 ? -.3 : 0;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio, finePointer.matches ? 1.5 : 1.25));
    renderer.setSize(width, height, false);
    render();
  }

  function canAnimate() {
    return visible && !lost && !document.hidden && !reduceMotion.matches;
  }

  function tick(now) {
    if (previousFrame === null) previousFrame = now;
    const interval = now - previousFrame;
    if (finePointer.matches || interval >= 30) {
      const dt = Math.min(interval / 1000, .065);
      elapsed += dt;
      previousFrame = now;
      current.lerp(pointer, 1 - Math.exp(-dt * 7));
      render();
    }
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    const live = !lost && !reduceMotion.matches;
    stage.toggleAttribute('data-live', live);
    if (canAnimate()) {
      if (!frame) frame = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
      previousFrame = null;
    }
  }

  hero.addEventListener('pointermove', event => {
    if (!finePointer.matches || event.pointerType === 'touch') return;
    pointer.set(event.clientX / innerWidth * 2 - 1, event.clientY / innerHeight * 2 - 1);
  }, { passive: true });
  hero.addEventListener('pointerleave', () => pointer.set(0, 0));
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    lost = true;
    sync();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    lost = false;
    resize();
    sync();
  });
  document.addEventListener('visibilitychange', sync);
  reduceMotion.addEventListener('change', () => {
    resize();
    sync();
  });
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });
  intersection.observe(stage);
  new ResizeObserver(resize).observe(stage);
  resize();
  sync();
}

function loadStage() {
  if (reduceMotion.matches) return;
  reduceMotion.removeEventListener('change', loadStage);
  start().catch(() => { /* The still render remains visible if WebGL cannot start. */ });
}

reduceMotion.addEventListener('change', loadStage);
loadStage();
