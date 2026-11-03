const links = [...document.querySelectorAll('[data-viewer]')];
const dialog = document.querySelector('.viewer');
const image = dialog.querySelector('.viewer-image');
const caption = dialog.querySelector('.viewer-caption');
const counter = dialog.querySelector('.viewer-count');
const error = dialog.querySelector('.viewer-error');
let current = 0;
let opener;
function show(index) {
  current = (index + links.length) % links.length;
  const link = links[current];
  const description = link.querySelector('img').alt;
  error.hidden = true;
  image.hidden = false;
  image.width = link.querySelector('img').width;
  image.height = link.querySelector('img').height;
  image.alt = description;
  image.src = link.href;
  caption.textContent = description;
  counter.textContent = `${current + 1} / ${links.length}`;
  error.querySelector('a').href = link.href;
}
function close() { dialog.close(); }
links.forEach((link, index) => link.addEventListener('click', event => {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  opener = link;
  show(index);
  dialog.showModal();
  dialog.querySelector('.viewer-close').focus();
}));
dialog.querySelector('.viewer-close').addEventListener('click', close);
dialog.querySelector('.viewer-prev').addEventListener('click', () => show(current - 1));
dialog.querySelector('.viewer-next').addEventListener('click', () => show(current + 1));
dialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') { event.preventDefault(); show(current - 1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); show(current + 1); }
});
dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
dialog.addEventListener('close', () => { image.removeAttribute('src'); opener?.focus({preventScroll:true}); });
image.addEventListener('error', () => { image.hidden = true; error.hidden = false; });
