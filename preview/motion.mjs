const header = document.querySelector('.header');
const menuToggle = header.querySelector('.nav-toggle');

function setMenuOpen(open) {
  header.toggleAttribute('data-menu-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
}

menuToggle.addEventListener('click', () => setMenuOpen(!header.hasAttribute('data-menu-open')));
header.querySelector('.nav').addEventListener('click', event => {
  if (event.target.closest('a')) setMenuOpen(false);
});
document.addEventListener('pointerdown', event => {
  if (!header.contains(event.target)) setMenuOpen(false);
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || !header.hasAttribute('data-menu-open')) return;
  setMenuOpen(false);
  menuToggle.focus();
});
matchMedia('(max-width: 680px)').addEventListener('change', () => setMenuOpen(false));
header.setAttribute('data-menu-ready', '');

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
    if (element.getBoundingClientRect().top < innerHeight * .92) continue;
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
