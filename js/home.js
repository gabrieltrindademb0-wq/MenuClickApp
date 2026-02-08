// js/home.js
// Landing page interactions (carrossel, CEP, animações leves)

export function initHome(){
  setYear();
  setupReveal();
  setupCepAndCategories();
  setupCarousel();
}

function setYear(){
  const y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());
}

function maskCep(v){
  const digits = String(v || '').replace(/\D/g,'').slice(0,8);
  if (digits.length <= 5) return digits;
  return digits.slice(0,5) + '-' + digits.slice(5);
}

function setupCepAndCategories(){
  const cepInp = document.getElementById('cepInp');
  const btnBuscar = document.getElementById('btnBuscar');
  const catBtns = Array.from(document.querySelectorAll('[data-segment]'));
  let selected = 'restaurante';

  const savedCep = localStorage.getItem('mc_cep') || '';
  if (cepInp && savedCep) cepInp.value = maskCep(savedCep);

  const setSelected = (seg) => {
    selected = seg;
    catBtns.forEach(b => b.classList.toggle('is-active', b.dataset.segment === seg));
  };
  setSelected(selected);

  cepInp?.addEventListener('input', () => {
    const masked = maskCep(cepInp.value);
    cepInp.value = masked;
    localStorage.setItem('mc_cep', masked);
  });

  catBtns.forEach(b => {
    b.addEventListener('click', () => {
      setSelected(b.dataset.segment);
      // Se já tiver CEP, navega direto.
      const cep = maskCep(cepInp?.value || localStorage.getItem('mc_cep') || '');
      if (cep && cep.replace(/\D/g,'').length === 8){
        goExplore(cep, selected);
      } else {
        document.getElementById('buscar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        cepInp?.focus();
      }
    });
  });

  btnBuscar?.addEventListener('click', () => {
    const cep = maskCep(cepInp?.value || '');
    if (!cep || cep.replace(/\D/g,'').length !== 8){
      shake(cepInp);
      showInlineHint('Digite um CEP válido (8 números).');
      cepInp?.focus();
      return;
    }
    localStorage.setItem('mc_cep', cep);
    goExplore(cep, selected);
  });

  // ENTER no CEP
  cepInp?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnBuscar?.click();
  });
}

function goExplore(cep, segment){
  const u = new URL('./explore.html', window.location.href);
  if (cep) u.searchParams.set('cep', cep);
  if (segment) u.searchParams.set('segment', segment);
  window.location.href = u.toString();
}

function showInlineHint(msg){
  const el = document.querySelector('.mc-cepbox__hint');
  if (!el) return;
  const old = el.textContent;
  el.textContent = msg;
  el.classList.add('is-warn');
  clearTimeout(window.__mcHintTimer);
  window.__mcHintTimer = setTimeout(() => {
    el.textContent = old;
    el.classList.remove('is-warn');
  }, 2200);
}

function shake(el){
  if (!el) return;
  el.classList.remove('mc-shake');
  // reflow
  void el.offsetWidth;
  el.classList.add('mc-shake');
}

function setupCarousel(){
  const track = document.getElementById('heroTrack');
  const dotsWrap = document.getElementById('heroDots');
  if (!track || !dotsWrap) return;

  const slides = Array.from(track.children);
  if (!slides.length) return;

  let idx = 0;
  const dots = slides.map((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mc-dot' + (i === 0 ? ' is-active' : '');
    b.setAttribute('aria-label', `Ir para o slide ${i+1}`);
    b.addEventListener('click', () => {
      idx = i;
      render();
      restart();
    });
    dotsWrap.appendChild(b);
    return b;
  });

  function render(){
    const w = track.clientWidth;
    track.style.transform = `translateX(${-idx * w}px)`;
    dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
  }

  let timer = null;
  function restart(){
    clearInterval(timer);
    timer = setInterval(() => {
      idx = (idx + 1) % slides.length;
      render();
    }, 4200);
  }

  window.addEventListener('resize', () => render());
  render();
  restart();
}

function setupReveal(){
  const els = Array.from(document.querySelectorAll('.mc-reveal'));
  if (!els.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting){
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  els.forEach(el => io.observe(el));
}
