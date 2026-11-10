const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

function ticketTexture(THREE, print, date) {
  const paper = document.createElement('canvas');
  paper.width = 560;
  paper.height = 300;
  const context = paper.getContext('2d');

  context.beginPath();
  context.roundRect(4, 4, 552, 292, 19);
  context.clip();
  context.fillStyle = print ? '#e5141b' : '#79080e';
  context.fillRect(0, 0, 560, 300);

  if (print) {
    context.fillStyle = '#f4f1ec';
    context.fillRect(402, 0, 158, 300);
    context.font = '700 21px sans-serif';
    context.fillText('KARAOKE', 40, 85);
    context.font = '900 110px sans-serif';
    context.fillText('RAVE', 30, 202);
    context.font = '700 30px monospace';
    context.fillStyle = '#171212';
    context.fillText(date, 430, 123);
    for (let x = 431; x < 528; x += 5) {
      context.fillRect(x, 169, x % 3 + 1, 43);
    }
    for (let y = 26; y < 284; y += 17) {
      context.fillRect(401, y, 2, 8);
    }
  }

  context.globalCompositeOperation = 'destination-out';
  for (const [x, y] of [[4, 150], [556, 150], [402, 4], [402, 296]]) {
    context.beginPath();
    context.arc(x, y, 19, 0, Math.PI * 2);
    context.fill();
  }
  const texture = new THREE.CanvasTexture(paper);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createTicket(THREE, scene, date) {
  const ticket = new THREE.Group();
  const plane = new THREE.PlaneGeometry(2.94, 1.58);
  const surface = new THREE.MeshBasicMaterial({ map: ticketTexture(THREE, true, date), alphaTest: .5, toneMapped: false });
  const edge = new THREE.MeshBasicMaterial({ map: ticketTexture(THREE, false), alphaTest: .5, side: THREE.DoubleSide, toneMapped: false });
  for (let index = -3; index <= 3; index++) {
    const layer = new THREE.Mesh(plane, edge);
    layer.position.z = index * .023;
    ticket.add(layer);
  }
  for (const side of [-1, 1]) {
    const face = new THREE.Mesh(plane, surface);
    face.position.z = side * .082;
    face.rotation.y = side === -1 ? Math.PI : 0;
    ticket.add(face);
  }
  scene.add(ticket);

  return seconds => {
    ticket.rotation.set(-.18 + Math.sin(seconds * .72) * .18, -.32 + Math.sin(seconds * .86) * .47, -.22);
    ticket.position.y = Math.sin(seconds * 1.18) * .12;
  };
}

function createEqualizer(THREE, scene) {
  const equalizer = new THREE.Group();
  const barGeometry = new THREE.CylinderGeometry(.108, .108, 1, 16);
  const red = new THREE.MeshStandardMaterial({ color: 0xe5141b, roughness: .29, metalness: .3, emissive: 0xa00910, emissiveIntensity: .65 });
  const bars = [-2, -1, 0, 1, 2].map(index => {
    const bar = new THREE.Mesh(barGeometry, red);
    bar.position.x = index * .44;
    equalizer.add(bar);
    return bar;
  });
  scene.add(equalizer);
  for (const [color, power, x, y, z] of [[0xfff3e8, 22, -3, 4, 5], [0xe5141b, 15, 3, -1, 3]]) {
    const light = new THREE.PointLight(color, power);
    light.position.set(x, y, z);
    scene.add(light);
  }

  return seconds => {
    bars.forEach((bar, index) => {
      const envelope = 1.7 - Math.abs(index - 2) * .3;
      bar.scale.y = envelope * (.61 + .39 * Math.sin(seconds * (3.1 + index * .19) + index * 1.28));
    });
    equalizer.rotation.y = -.24 + Math.sin(seconds * .95) * .36;
    equalizer.rotation.z = -.08;
  };
}

function observeAccent(element) {
  const canvas = element.querySelector('canvas');
  let visible = false;
  let started = false;
  let update = () => {};

  async function start() {
    started = true;
    const context = canvas.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'low-power' });
    if (!context) return;
    const THREE = await import('./vendor/three-0.187.0.mjs?v=stage-pulse');
    const renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true });
    renderer.setClearColor(0, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, .1, 12);
    const isTicket = element.dataset.accent === 'ticket';
    camera.position.z = isTicket ? 4.55 : 3.8;
    const animate = isTicket
      ? createTicket(THREE, scene, element.closest('.events').querySelector('.event-date > span').textContent)
      : createEqualizer(THREE, scene);
    let lost = false;

    function render(time) {
      animate(time / 1000);
      renderer.render(scene, camera);
    }

    function resize() {
      if (lost || !element.clientWidth || !element.clientHeight) return;
      camera.aspect = element.clientWidth / element.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.setSize(element.clientWidth, element.clientHeight, false);
      render(performance.now());
    }

    update = () => {
      const active = visible && !lost && !reduceMotion.matches && !document.hidden;
      element.toggleAttribute('data-live', active);
      renderer.setAnimationLoop(active ? render : null);
    };
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      lost = true;
      update();
    });
    canvas.addEventListener('webglcontextrestored', () => {
      lost = false;
      resize();
      update();
    });
    new ResizeObserver(resize).observe(element);
    resize();
    update();
  }

  function sync() {
    if (visible && !reduceMotion.matches && !started) start().catch(() => {});
    update();
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }).observe(element);
  reduceMotion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
}

if ('IntersectionObserver' in window && 'ResizeObserver' in window) {
  document.querySelectorAll('[data-accent]').forEach(observeAccent);
}
