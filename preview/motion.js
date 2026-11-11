const header = document.querySelector('.header');
const menuToggle = header.querySelector('.nav-toggle');
const mobileMenu = document.querySelector('#mobile-menu');

if (typeof mobileMenu.showModal === 'function') {
  menuToggle.addEventListener('click', () => {
    mobileMenu.showModal();
    menuToggle.setAttribute('aria-expanded', 'true');
  });
  mobileMenu.addEventListener('close', () => menuToggle.setAttribute('aria-expanded', 'false'));
  mobileMenu.addEventListener('click', event => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (event.target.closest('a[href^="#"]')) mobileMenu.close();
  });
  matchMedia('(max-width: 680px)').addEventListener('change', ({ matches }) => {
    if (!matches && mobileMenu.open) mobileMenu.close();
  });
  header.setAttribute('data-menu-ready', '');
}

// Same edge refraction as the DIGITAL-EVENTS menu, with a blur fallback in other engines.
if (/Chrome\/|Edg\//.test(navigator.userAgent) && CSS.supports('backdrop-filter', 'url(#liquid-menu)')) {
  const map = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <defs>
      <linearGradient id="x"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#f00"/></linearGradient>
      <linearGradient id="y" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#0f0"/></linearGradient>
      <filter id="b"><feGaussianBlur stdDeviation="10.67"/></filter>
    </defs>
    <rect width="256" height="256" fill="url(#x)"/>
    <rect width="256" height="256" fill="url(#y)" style="mix-blend-mode:screen"/>
    <rect x="32" y="32" width="192" height="192" rx="32" fill="#808000" filter="url(#b)"/>
  </svg>`;
  document.querySelector('#liquid-map').setAttribute('href', `data:image/svg+xml,${encodeURIComponent(map)}`);
  header.setAttribute('data-glass-refraction', '');
}

const motion = matchMedia('(prefers-reduced-motion: no-preference)');

const tape = document.querySelector('.tape');
const tapeTrack = tape.querySelector('.tape-track');
const tapeLoop = tapeTrack.firstElementChild;
const tapePhrases = [...tapeLoop.children];

function fitTape() {
  tapeTrack.replaceChildren(tapeLoop);
  tapeLoop.replaceChildren(...tapePhrases);
  tape.setAttribute('data-loop', '');
  if (!motion.matches) return;
  const phraseWidth = tapeLoop.getBoundingClientRect().width;
  if (!phraseWidth) return;
  const repeats = Math.ceil(tape.clientWidth / phraseWidth);
  for (let copy = 1; copy < repeats; copy++) {
    tapeLoop.append(...tapePhrases.map(phrase => phrase.cloneNode(true)));
  }
  tapeTrack.append(tapeLoop.cloneNode(true));
  tapeTrack.style.setProperty('--tape-duration', `${tapeLoop.getBoundingClientRect().width / 55}s`);
}

fitTape();
document.fonts.ready.then(fitTape);
if ('ResizeObserver' in window) new ResizeObserver(fitTape).observe(tape);
motion.addEventListener('change', fitTape);

if ('IntersectionObserver' in window) {
  const iconObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      entry.target.toggleAttribute('data-in-view', entry.intersectionRatio >= .6);
    }
  }, { threshold: .6 });

  for (const icon of document.querySelectorAll('.step-icon, .benefit-icon')) iconObserver.observe(icon);
}

if (motion.matches && 'IntersectionObserver' in window) {
  const elements = [...document.querySelectorAll('[data-reveal]')];
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.replace('reveal-pending', 'reveal-entered');
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -8%' });

  for (const element of elements) {
    if (element.dataset.reveal !== 'fly-in' && element.getBoundingClientRect().top < innerHeight * .92) continue;
    element.classList.add('reveal-pending');
    observer.observe(element);
  }

  document.addEventListener('focusin', event => {
    for (const element of elements) {
      if (!element.contains(event.target)) continue;
      element.classList.remove('reveal-pending', 'reveal-entered');
      observer.unobserve(element);
    }
  });
}
