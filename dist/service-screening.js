'use strict';
(() => {
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 const fine=matchMedia('(hover:hover) and (pointer:fine)');
 const allowsMotion=()=>!motion.matches&&!navigator.connection?.saveData&&!document.hidden;
 const dialog=document.querySelector('#film-dialog');
 const room=document.querySelector('.screening-room');
 if(room){
  const screen=room.querySelector('.screening-stage');
  const video=screen.querySelector('video'), still=screen.querySelector('img'), play=screen.querySelector('.screen-play');
  const caption=screen.querySelector('.screening-caption');
  const choices=[...room.querySelectorAll('.screen-choice')];
  let active=choices[0],visible=false;
  const updatePreview=()=>{
   if(!visible||!allowsMotion()||dialog?.open){video.pause();return;}
   const url=active.dataset.preview;
   if(video.getAttribute('src')!==url){video.classList.remove('is-ready');video.src=url;}
   video.play().catch(()=>{});
  };
  video.addEventListener('playing',()=>video.classList.add('is-ready'));
  choices.forEach(choice=>choice.addEventListener('click',()=>{
   if(choice===active)return;
   active.setAttribute('aria-pressed','false');
   active=choice;active.setAttribute('aria-pressed','true');
   const {source,still:poster,name,kind}=active.dataset;
   video.pause();video.classList.remove('is-ready');
   still.src=poster;
   caption.querySelector('small').textContent=kind;
   caption.querySelector('strong').textContent=name;
   Object.assign(play.dataset,{video:source,poster,title:name});
   play.lastChild.textContent=choice===choices[0]?' Play showreel':' Play film';
   play.setAttribute('aria-label','Play '+name);
   updatePreview();
  }));
  if('IntersectionObserver' in window)new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;updatePreview();},{threshold:.25}).observe(screen);
  play.addEventListener('click',()=>video.pause());
  dialog?.addEventListener('close',updatePreview);
  document.addEventListener('visibilitychange',updatePreview);
  motion.addEventListener('change',updatePreview);
 }
 document.querySelectorAll('video[data-reel]').forEach(video=>{
  const tile=video.closest('a');
  const start=()=>{if(!allowsMotion()||!fine.matches)return;video.src ||= video.dataset.reel;video.play().catch(()=>{});};
  const stop=()=>{video.pause();video.classList.remove('is-ready');};
  video.addEventListener('playing',()=>video.classList.add('is-ready'));
  tile.addEventListener('pointerenter',start);tile.addEventListener('pointerleave',stop);
  motion.addEventListener('change',stop);
 });
})();
