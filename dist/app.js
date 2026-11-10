'use strict';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const menu=document.querySelector('.menu-toggle'),navigation=document.querySelector('#navigation');
function closeMenu(){navigation.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open navigation');}
menu.addEventListener('click',()=>{const open=navigation.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');});
navigation.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMenu));
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu();});
document.querySelector('#year').textContent=new Date().getFullYear();
if('IntersectionObserver' in window){
 const reveals=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');reveals.unobserve(entry.target);}}),{threshold:.05});
 document.querySelectorAll('.reveal').forEach(el=>reveals.observe(el));document.documentElement.classList.add('js');
}
const dialog=document.querySelector('#film-dialog'),player=document.querySelector('#film-player');
let opener,previousOverflow='';
const previews=[...document.querySelectorAll('.project-preview,.hero-preview')];
function pausePreview(video){video.pause();video.classList.remove('is-playing');video.closest('.project-card')?.classList.remove('is-playing');}
function pausePreviews(){previews.forEach(pausePreview);}
function canPreview(){return !reduced.matches&&!navigator.connection?.saveData&&!document.hidden&&!dialog.open;}
async function startPreview(video){
 if(!video||!canPreview())return;
 if(!video.getAttribute('src'))video.src=video.dataset.src;
 video.muted=true;
 try{await video.play();if(canPreview()){video.classList.add('is-playing');video.closest('.project-card')?.classList.add('is-playing');}else pausePreview(video);}catch{pausePreview(video);}
}
document.querySelectorAll('[data-video]').forEach(button=>button.addEventListener('click',()=>{
 opener=button;pausePreviews();player.poster=button.dataset.poster||'';player.src=button.dataset.video;
 document.querySelector('#film-title').textContent=button.dataset.title;previousOverflow=document.body.style.overflow;
 dialog.showModal();document.body.style.overflow='hidden';player.play().catch(()=>{});
}));
document.querySelector('#close-film').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const bounds=dialog.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)dialog.close();});
dialog.addEventListener('close',()=>{player.pause();player.removeAttribute('src');player.load();document.body.style.overflow=previousOverflow;opener?.focus();resumeHero();});
const heroVideo=document.querySelector('.hero-preview');let heroVisible=false;
function resumeHero(){if(heroVideo&&heroVisible)startPreview(heroVideo);}
if('IntersectionObserver' in window){
 const mediaObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.target===heroVideo){heroVisible=entry.isIntersecting;if(heroVisible)resumeHero();else pausePreview(entry.target);}else if(!entry.isIntersecting)pausePreview(entry.target);});},{threshold:.2});
 previews.forEach(video=>mediaObserver.observe(video));
}
const hover=matchMedia('(hover: hover) and (pointer: fine)');
document.querySelectorAll('.project-card').forEach(card=>{
 const video=card.querySelector('.project-preview');if(!video)return;
 card.addEventListener('pointerenter',()=>{if(hover.matches)startPreview(video);});
 card.addEventListener('pointerleave',()=>pausePreview(video));
 card.querySelector('[data-video]').addEventListener('focus',()=>startPreview(video));
 card.querySelector('[data-video]').addEventListener('blur',()=>pausePreview(video));
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pausePreviews();else resumeHero();});
reduced.addEventListener('change',()=>{pausePreviews();resumeHero();});
const filters=[...document.querySelectorAll('[data-filter]')];
filters.forEach(button=>button.addEventListener('click',()=>{
 pausePreviews();filters.forEach(other=>other.setAttribute('aria-pressed',String(other===button)));
 let total=0;document.querySelectorAll('[data-category]').forEach(card=>{card.hidden=button.dataset.filter!=='All'&&card.dataset.category!==button.dataset.filter;if(!card.hidden)total++;});
 document.querySelector('#portfolio-count').textContent=total+' '+(total===1?'FILM':'FILMS');
}));
const form=document.querySelector('#contact-form');
if(form){
 const service=form.elements.service,requested=new URLSearchParams(location.search).get('service');
 if([...service.options].some(option=>option.value===requested))service.value=requested;
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!form.reportValidity())return;
  const data=Object.fromEntries(new FormData(form));if(data._gotcha)return;
  const status=document.querySelector('#form-status'),fallback=document.querySelector('#email-fallback'),submit=form.querySelector('button[type=submit]');
  const brief=['Name: '+data.name,'Email: '+data.email,...(data.phone?['Phone: '+data.phone]:[]),'Service: '+service.selectedOptions[0].text,'Budget: '+(data.budget||'Not specified'),'Timeline: '+(data.timeline||'Not specified'),'','Project: '+data.message].join('\n');
  fallback.href='mailto:lunariastudiomarketing@gmail.com?subject='+encodeURIComponent('Lunaria Studio project enquiry')+'&body='+encodeURIComponent(brief);fallback.hidden=true;
  status.textContent='Sending your brief…';submit.disabled=true;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
  try{const response=await fetch(form.action,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(data),signal:controller.signal});if(!response.ok)throw Error('Could not send');status.textContent='Thank you. Your brief has been sent to Lunaria Studio.';form.reset();}
  catch{status.textContent='Your brief could not be sent. Please retry, email your brief below, or contact us on WhatsApp.';fallback.hidden=false;}
  finally{clearTimeout(timeout);submit.disabled=false;}
 });
}

(() => {
  const deck = document.querySelector('.field-deck');
  if (!deck) return;
  const frames = [...deck.querySelectorAll('.field-frame')];
  const links = frames.map(frame => frame.querySelector('.field-trigger'));
  const copies = frames.map(frame => frame.querySelector('.field-copy'));
  const hover = matchMedia('(any-hover: hover)');
  let active = -1;
  let lastX, lastY;

  function choose(index) {
    if (index === active || index < 0) return;
    active = index;
    frames.forEach((frame, i) => {
      const current = i === index;
      frame.classList.toggle('is-current', current);
      copies[i].hidden = !current;
      links[i].setAttribute('aria-expanded', String(current));
    });
  }

  links.forEach((link, index) => {
    link.setAttribute('aria-controls', copies[index].id);
    link.addEventListener('focus', () => choose(index));
    link.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const next = {ArrowRight: (index + 1) % links.length, ArrowLeft: (index + links.length - 1) % links.length, Home: 0, End: links.length - 1}[event.key];
      if (next === undefined) return;
      event.preventDefault();
      links[next].focus();
    });
  });

  // Ignore movement events at the same point while the frames resize.
  deck.addEventListener('pointermove', event => {
    if (!hover.matches || event.pointerType === 'touch') return;
    if (event.clientX === lastX && event.clientY === lastY) return;
    lastX = event.clientX;
    lastY = event.clientY;
    const frame = event.target.closest('.field-frame');
    choose(frames.indexOf(frame));
  });
  deck.addEventListener('pointerleave', () => { lastX = lastY = undefined; });
  choose(0);
})();

(() => {
  const board = document.querySelector('.workflow-board');
  if (!board) return;
  const buttons = [...board.querySelectorAll('.workflow-buttons button')];
  const frames = buttons.map(button => document.getElementById(button.getAttribute('aria-controls')));
  if (!frames.length || frames.some(frame => !frame)) return;
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  let current = -1;

  function select(index) {
    if (index === current) return;
    current = index;
    buttons.forEach((button, i) => {
      button.setAttribute('aria-pressed', String(i === index));
      frames[i].hidden = i !== index;
    });
  }

  buttons.forEach((button, index) => {
    button.addEventListener('click', () => select(index));
    button.addEventListener('pointerenter', event => {
      if (canHover.matches && event.pointerType === 'mouse') select(index);
    });
    button.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const next = {ArrowLeft: (index + buttons.length - 1) % buttons.length, ArrowRight: (index + 1) % buttons.length, ArrowUp: (index + buttons.length - 1) % buttons.length, ArrowDown: (index + 1) % buttons.length, Home: 0, End: buttons.length - 1}[event.key];
      if (next === undefined) return;
      event.preventDefault();
      select(next);
      buttons[next].focus();
    });
  });
  select(0);
  board.classList.add('is-ready');
})();

(() => {
  const wordmark = document.querySelector('.site-header .wordmark');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const key = 'lunaria-navbar-reveal-played';
  if (!wordmark || motion.matches) return;
  try { if (sessionStorage.getItem(key)) return; } catch {}
  const video = document.createElement('video');
  video.className = 'brand-reveal-video';
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('aria-hidden', 'true');
  video.preload = 'auto';
  video.src = 'assets/brand/lunaria-navbar-reveal.mp4';
  let timer;
  const finish = () => {
    clearTimeout(timer);
    wordmark.classList.remove('is-revealing');
    video.remove();
  };
  video.addEventListener('playing', () => {
    if (motion.matches) return finish();
    wordmark.classList.add('is-revealing');
    try { sessionStorage.setItem(key, '1'); } catch {}
  }, { once: true });
  video.addEventListener('ended', finish, { once: true });
  video.addEventListener('error', finish, { once: true });
  wordmark.append(video);
  timer = setTimeout(finish, 6500);
  video.play().catch(finish);
})();
