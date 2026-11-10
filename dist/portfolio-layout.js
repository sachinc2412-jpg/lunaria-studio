'use strict';
(() => {
 const gallery = document.querySelector('.portfolio-grid');
 const filters = document.querySelector('.portfolio-section .filters');
 if (!gallery || !filters) return;
 const boards = [...gallery.querySelectorAll('.archive-board')];
 if (!boards.length) return;
 const originals = boards.map(board => [...board.children]);
 const cards = originals.flat();
 const thumbs = new ResizeObserver(entries => {
  for (const {target, contentRect: {width, height}} of entries) {
   if (!width || !height) continue;
   const image = target.querySelector('img[data-thumb]');
   const ratio = width / height;
   const shape = ratio < .82 ? 'portrait' : ratio < 1.22 ? 'square' :
    ratio < 1.85 ? 'landscape' : ratio < 2.8 ? 'wide' : 'panorama';
   const url = `assets/work-thumbs/${image.dataset.thumb}-${shape}.webp`;
   if (image.getAttribute('src') !== url) image.src = url;
  }
 });
 cards.forEach(card => {
  const visual = card.querySelector('.project-visual');
  if (visual?.querySelector('img[data-thumb]')) thumbs.observe(visual);
 });
 // The shared filter sets visibility before the click bubbles to this group.
 filters.addEventListener('click', event => {
  const button = event.target.closest('button[data-filter]');
  if (!button) return;
  const visible = cards.filter(card => !card.hidden);
  const sites = visible.filter(card => card.dataset.category === 'Websites').length;
  const label = sites === visible.length && sites ? 'WEBSITE' : sites ? 'PROJECT' : 'FILM';
  document.querySelector('#portfolio-count').textContent = visible.length + ' ' + label + (visible.length === 1 ? '' : 'S');
  if (button.dataset.filter === 'All') {
   boards.forEach((board, index) => board.append(...originals[index]));
   delete gallery.dataset.filtered;
   delete boards[0].dataset.count;
   return;
  }
  boards[0].prepend(...visible);
  boards[0].dataset.count = String(visible.length);
  gallery.dataset.filtered = '';
 });
})();

(() => {
 const dialog = document.querySelector('#website-preview');
 if (!dialog || typeof dialog.showModal !== 'function' || window.parent !== window) return;
 const frame = dialog.querySelector('iframe');
 const title = dialog.querySelector('#website-preview-title');
 const visit = dialog.querySelector('.website-preview-link');
 const message = dialog.querySelector('.website-preview-message');
 let opener;
 let overflow;
 document.querySelectorAll('a[data-website-preview]').forEach(link => {
  link.addEventListener('click', event => {
   if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
   event.preventDefault();
   opener = link;
   overflow = document.body.style.overflow;
   const name = link.dataset.siteName || 'Lunaria Studio';
   const restricted = link.hasAttribute('data-sign-in-required');
   title.textContent = name;
   frame.title = name + ' website preview';
   visit.href = link.href;
   message.hidden = !restricted;
   frame.hidden = restricted;
   if (new URL(link.href).origin === location.origin) frame.removeAttribute('sandbox');
   else frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
   if (!restricted) frame.src = link.href;
   dialog.showModal();
   document.body.style.overflow = 'hidden';
  });
 });
 frame.addEventListener('load', () => {
  if (!dialog.open) return;
  frame.contentDocument?.addEventListener('keydown', event => {
   if (event.key === 'Escape' && !event.defaultPrevented && !frame.contentDocument.querySelector('dialog[open]')) {
    event.preventDefault();
    dialog.close();
   }
  });
 });
 dialog.addEventListener('click', event => {
  if (event.target === dialog) dialog.close();
 });
 dialog.addEventListener('close', () => {
  frame.removeAttribute('src');
  document.body.style.overflow = overflow;
  opener?.focus({preventScroll:true});
 });
})();
