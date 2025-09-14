const AVATAR_BASENAMES = {
  osharov: 'images/Osharov-avatar',
  belikov: 'images/Belikov-avatar',
  prokhorova: 'images/Prokhorova-avatar',
  starkov: 'images/Starkov-avatar'
};

function loadAvatarImg(basename, callback) {
  const jpg = basename + '.jpg';
  const png = basename + '.png';
  const img = new Image();
  img.onload = () => callback(img);
  img.onerror = () => {
    const img2 = new Image();
    img2.onload = () => callback(img2);
    img2.onerror = () => callback(null);
    img2.src = png;
  };
  img.src = jpg;
}

const TEAM = [
  { id: 'osharov', name: 'Ошаров Александр Андреевич', group: 'БПИ248', role: 'Архитектор хаоса', bio: 'Создаёт мосты между ошибкой и архитектурой.', quirks: ['Читает логи как поэму', 'Верит в счастливые падения'], alt: 'Ошаров — тайный коллекционер забытых багрепортов и автор загадочных патчей', tg: '@sanekosh' },
  { id: 'belikov', name: 'Беликов Владимир Владимирович', group: 'БПИ249', role: 'Координатор-стратег', bio: 'Маститый стратег, рисующий интерфейсы в мыслях.', quirks: ['Рисует схемы в воздухе', 'Коллекционирует минимальные макеты'], alt: 'Беликов умеет заставить баг вести себя прилично — и это почти магия.', tg: '@Komendant_B' },
  { id: 'prokhorova', name: 'Прохорова Виталия Олеговна', group: 'БПИ244', role: 'Аналитик-альхимик', bio: 'Преобразует данные в инсайты и неожиданные решения.', quirks: ['Скрытный дашборд-мастер', 'Никогда не доверяет единственной метрике'], alt: 'Прохорова строит модели, которые предсказывают будущее — или хорошую ошибку.', tg: '@vitasssha' },
  { id: 'starkov', name: 'Старков Семен Ильич', group: 'БПИ249', role: 'Повествователь логов', bio: 'Пишет документацию как арт‑объект.', quirks: ['Пишет коммиты в стихах', 'Умеет превратить stacktrace в рассказ'], alt: 'Старков однажды описал баг так, что его захотели прочитать дети.', tg: '@sam_starkov' }
];

// Prepare title letters for fall effect
function prepareFalling() {
  const title = document.getElementById('siteTitle');
  const txt = title.textContent.trim();
  title.innerHTML = '';
  for (let ch of txt) {
    const span = document.createElement('span');
    span.textContent = ch;
    title.appendChild(span);
  }
}

function breakSiteAnimation() {
  document.body.classList.add('broken');
  const titleSpans = Array.from(document.querySelectorAll('#siteTitle span'));
  titleSpans.forEach((s, i) => {
    s.classList.add('fall-letter');
    s.style.animationDelay = (i * 40) + 'ms';
  });
  setTimeout(() => transitionToGalaxy(), 2000 + titleSpans.length * 40);
}

function transitionToGalaxy() {
  const shell = document.getElementById('shell');
  shell.style.transition = 'opacity .9s ease, transform 1s ease';
  shell.style.opacity = '0';
  shell.style.transform = 'scale(.98) translateY(-20px)';
  setTimeout(() => { shell.classList.add('hidden'); startGalaxy() }, 1000);
}

/* Galaxy class (same as before with minor hooks for triple-click and konami madness) */
class Galaxy {
  constructor(canvas, constellationCanvas) {
    this.canvas = canvas;
    this.constCanvas = constellationCanvas;
    this.ctx = canvas.getContext('2d');
    this.cctx = constellationCanvas.getContext('2d');
    this.dpr = Math.max(1, window.devicePixelRatio || 1);
    this.entities = [];
    this.center = { x: 0, y: 0 };
    this.showOrbits = true;
    this.running = false;
    this.constellation = false;
    this.madMode = false;
    this._bindEvents();
    this.resize();
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.constCanvas.width = rect.width * this.dpr;
    this.constCanvas.height = rect.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.cctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.center.x = rect.width / 2;
    this.center.y = rect.height / 2;
  }
  _bindEvents() {
    window.addEventListener('resize', () => this.resize());
    let dragging = null; let offset = { x: 0, y: 0 }; let lastClickTime = 0; let clickCount = 0; let lastClickedPlanet = null;
    this.canvas.addEventListener('pointerdown', (e) => {
      const p = this._screenToWorld(e);
      for (let ent of this.entities) {
        if (ent.type === 'planet' && this._hitTest(ent, p)) {
          dragging = ent; offset.x = p.x - ent.x; offset.y = p.y - ent.y; ent.fixed = true; break;
        }
      }
    });
    this.canvas.addEventListener('pointermove', (e) => { if (dragging) { const p = this._screenToWorld(e); dragging.x = p.x - offset.x; dragging.y = p.y - offset.y } });
    const end = () => { if (dragging) dragging.fixed = false; dragging = null; };
    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', end);

    // click handling for open panel and triple-click alternate bio
    this.canvas.addEventListener('click', (e) => {
      const p = this._screenToWorld(e);
      let clicked = null;
      for (let ent of this.entities) { if (ent.type === 'planet' && this._hitTest(ent, p)) { clicked = ent; break; } }
      const now = Date.now();
      if (clicked) {
        if (lastClickedPlanet === clicked && now - lastClickTime < 600) {
          clickCount++;
        } else {
          clickCount = 1;
        }
        lastClickedPlanet = clicked;
        lastClickTime = now;
        if (clickCount >= 3) {
          // trigger alt bio
          this.onPlanetTripleClick && this.onPlanetTripleClick(clicked);
          clickCount = 0;
          lastClickedPlanet = null;
          return;
        }
        // single click opens panel
        this.onPlanetClick && this.onPlanetClick(clicked);
      }
    });

    // double click gravity pulse
    this.canvas.addEventListener('dblclick', (e) => {
      const p = this._screenToWorld(e);
      this.gravityPulse(p, 160, 6);
    });
  }
  _screenToWorld(e) { const r = this.canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  _hitTest(ent, p) { const dx = ent.x - p.x, dy = ent.y - p.y; return (dx * dx + dy * dy) <= (ent.r * ent.r); }

  addPlanet(opts) { const p = Object.assign({ type: 'planet', x: this.center.x, y: this.center.y, r: 32, angle: Math.random() * Math.PI * 2, orbit: 120 + Math.random() * 220, spin: 0.008 }, opts); this.entities.push(p); return p; }

  addParticles(n) { for (let i = 0; i < n; i++) { this.entities.push({ type: 'particle', x: Math.random() * this.canvas.width / this.dpr, y: Math.random() * this.canvas.height / this.dpr, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6, life: 80 + Math.random() * 160 }); } }

  gravityPulse(center, radius, strength) {
    for (let ent of this.entities) {
      if (ent.type === 'planet') {
        const dx = ent.x - center.x, dy = ent.y - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < radius) {
          const push = (1 - dist / radius) * strength;
          ent.angle += (Math.random() - 0.5) * 0.8 + push;
          ent.orbit += push * 8;
          ent.spin += 0.03;
          ent.tempPush = performance.now();
        }
      }
    }
    this.addParticles(80);
  }

  triggerMadMode(duration = 5000) {
    this.madMode = true;
    const overlay = document.getElementById('overlayMessage');
    overlay.textContent = 'SITE BROKEN (AS INTENDED)';
    overlay.classList.remove('hidden');
    // ramp up randomness
    const originalSpins = this.entities.filter(e => e.type === 'planet').map(p => p.spin);
    for (let p of this.entities.filter(e => e.type === 'planet')) { p.spin += (Math.random() * 0.2 + 0.05); p.orbit += Math.random() * 80 - 40; }
    setTimeout(() => {
      // decay madness
      for (let i = 0; i < this.entities.length; i++) {
        const e = this.entities[i];
        if (e.type === 'planet') { e.spin = Math.max(0.004, e.spin * 0.3); }
      }
      overlay.classList.add('hidden'); overlay.textContent = '';
      this.madMode = false;
    }, duration);
  }

  toggleOrbits() { this.showOrbits = !this.showOrbits; }
  toggleConstellation() { this.constellation = !this.constellation; }
  shufflePlanets() { for (let e of this.entities) { if (e.type === 'planet') { e.angle += Math.random() * Math.PI * 2; e.orbit = 90 + Math.random() * 300; } } }

  start() { if (this.running) return; this.running = true; this._tick(); }
  stop() { this.running = false; }

  _tick() { if (!this.running) return; this._update(); this._draw(); requestAnimationFrame(() => this._tick()); }

  _update() {
    for (let ent of this.entities) {
      if (ent.type === 'particle') { ent.x += ent.vx; ent.y += ent.vy; ent.life -= 1; }
      else if (ent.type === 'planet') {
        if (!ent.fixed) {
          ent.angle += ent.spin;
          ent.x = this.center.x + Math.cos(ent.angle) * ent.orbit;
          ent.y = this.center.y + Math.sin(ent.angle) * ent.orbit;
          if (ent.tempPush && performance.now() - ent.tempPush > 1200) { ent.spin = Math.max(0.002, ent.spin - 0.02); ent.tempPush = null; }
        }
      }
    }
    this.entities = this.entities.filter(ent => !(ent.type === 'particle' && ent.life <= 0));
    if (this.entities.filter(e => e.type === 'particle').length < 200) this.addParticles(10);
  }

  _draw() {
    const ctx = this.ctx; const w = this.canvas.width / this.dpr, h = this.canvas.height / this.dpr;
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgba(12,8,20,0.7)'); g.addColorStop(1, 'rgba(2,6,23,0.7)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const cg = ctx.createRadialGradient(this.center.x, this.center.y, 0, this.center.x, this.center.y, 420); cg.addColorStop(0, 'rgba(124,58,237,0.14)'); cg.addColorStop(1, 'rgba(14,165,164,0)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(this.center.x, this.center.y, 420, 0, Math.PI * 2); ctx.fill();

    if (this.showOrbits) { ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1; for (let ent of this.entities) if (ent.type === 'planet') { ctx.beginPath(); ctx.ellipse(this.center.x, this.center.y, ent.orbit, ent.orbit, 0, 0, Math.PI * 2); ctx.stroke(); } }

    for (let ent of this.entities) { if (ent.type === 'particle') { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(ent.x, ent.y, 1.2, 0, Math.PI * 2); ctx.fill(); } }

    for (let ent of this.entities) {
      if (ent.type === 'planet') {
        const grd = ctx.createLinearGradient(ent.x - ent.r, ent.y - ent.r, ent.x + ent.r, ent.y + ent.r);
        grd.addColorStop(0, '#7c3aed'); grd.addColorStop(1, '#0ea5a4');
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(ent.x, ent.y, ent.r, 0, Math.PI * 2); ctx.fill();
        if (ent.img) { ctx.save(); ctx.beginPath(); ctx.arc(ent.x, ent.y, ent.r - 2, 0, Math.PI * 2); ctx.closePath(); ctx.clip(); try { ctx.drawImage(ent.img, ent.x - ent.r + 2, ent.y - ent.r + 2, (ent.r - 2) * 2, (ent.r - 2) * 2); } catch (e) { } ctx.restore(); }
        ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.font = '12px Inter, Arial'; ctx.textAlign = 'center'; ctx.fillText(ent.label, ent.x, ent.y + ent.r + 14);
      }
    }

    // draw constellation overlay separately for crisp lines
    const cctx = this.cctx; cctx.clearRect(0, 0, w, h);
    if (this.constellation) {
      cctx.strokeStyle = 'rgba(255,255,255,0.06)'; cctx.lineWidth = 1;
      const planets = this.entities.filter(e => e.type === 'planet');
      for (let i = 0; i < planets.length; i++) {
        for (let j = i + 1; j < planets.length; j++) {
          const a = planets[i], b = planets[j];
          cctx.beginPath(); cctx.moveTo(a.x, a.y); cctx.lineTo(b.x, b.y); cctx.stroke();
        }
      }
    }
  }
}

/* Konami code listener */
function Konami(callback) {
  const seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let p = 0;
  window.addEventListener('keydown', (e) => {
    if (e.key === seq[p]) { p++; if (p === seq.length) { callback(); p = 0; } }
    else p = (e.key === seq[0]) ? 1 : 0;
  });
}

/* orchestration and UI wiring */
function init() {
  prepareFalling();
  const timer = setTimeout(() => breakSiteAnimation(), 5000);
  document.getElementById('forceBreak').addEventListener('click', () => { clearTimeout(timer); breakSiteAnimation(); });

  // hotkeys
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.altKey && (e.key === '4' || e.key === '4')) showSecret();
    if (e.shiftKey && e.key === '?') showHelp();
  });

  document.getElementById('reveal404')?.addEventListener('click', showSecret);
  // note: no auto-open of portal anywhere

  // Konami binds to mad mode
  Konami(() => {
    if (window._galaxy) { window._galaxy.triggerMadMode(7000); }
  });
}

function showSecret() {
  const s = document.getElementById('secret404'); s.classList.remove('hidden'); s.setAttribute('aria-hidden', 'false');
  document.getElementById('closeSecret').addEventListener('click', () => { s.classList.add('hidden'); s.setAttribute('aria-hidden', 'true'); }, { once: true });
  const openBtn = document.getElementById('openPortal');
  openBtn.onclick = async () => {
    s.querySelector('.secret-inner').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }], { duration: 700, iterations: 1 });
    const wrap = document.getElementById('portalFrameWrap');
    wrap.classList.remove('hidden');
    const iframe = document.getElementById('portalFrame');
    const target = 'https://t.me/grudina2025';
    let loaded = false;
    // Try to set iframe src; many sites disallow framing; we handle fallback
    try {
      iframe.src = target;
    } catch (e) {
      window.open(target, '_blank', 'noopener');
      document.getElementById('portalFallback').textContent = 'Открыли в новой вкладке (фрейм заблокирован).';
    }
    iframe.onload = () => { loaded = true; };
    setTimeout(() => {
      if (!loaded) {
        window.open(target, '_blank', 'noopener');
        const fallback = document.getElementById('portalFallback');
        fallback.textContent = 'Открыли в новой вкладке (фрейм заблокирован).';
      }
    }, 1400);
  };
}

function showHelp() {
  const s = document.getElementById('help404'); s.classList.remove('hidden'); s.setAttribute('aria-hidden', 'false');
  document.getElementById('closeHelp').addEventListener('click', () => { s.classList.add('hidden'); s.setAttribute('aria-hidden', 'true'); }, { once: true });
}

/* start galaxy */
function startGalaxy() {
  const stage = document.getElementById('galaxyStage'); stage.classList.remove('hidden');
  const canvas = document.getElementById('galaxyCanvas');
  const constCanvas = document.getElementById('constellationCanvas');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  constCanvas.width = window.innerWidth; constCanvas.height = window.innerHeight;
  const g = new Galaxy(canvas, constCanvas); window._galaxy = g;

  TEAM.forEach((t, idx) => {
    const p = g.addPlanet({ label: t.name.split(' ')[1], orbit: 120 + idx * 70, angle: (idx / TEAM.length) * Math.PI * 2, r: 40, meta: t });
    loadAvatarImg(AVATAR_BASENAMES[t.id], (img) => { if (img) p.img = img; });
  });
  g.addParticles(300);
  g.start();

  document.getElementById('toggleOrbits').addEventListener('click', () => g.toggleOrbits());
  document.getElementById('shuffle').addEventListener('click', () => g.shufflePlanets());
  document.getElementById('toggleConst').addEventListener('click', () => {
    g.toggleConstellation();
    // Добавляем визуальную обратную связь
    const btn = document.getElementById('toggleConst');
    btn.textContent = g.constellation ? 'Hide Constellation' : 'Show Constellation';
  });

  // triple-click -> alt bio
  g.onPlanetTripleClick = (planet) => {
    openMemberPanel(planet.meta, planet.img, { alt: true });
  };

  // single click -> open panel
  g.onPlanetClick = (planet) => openMemberPanel(planet.meta, planet.img, { alt: false });

  document.getElementById('closePanel').addEventListener('click', closeMemberPanel);
}

/* member panel */
function openMemberPanel(meta, img, opts) {
  const panel = document.getElementById('memberPanel');
  const content = document.getElementById('memberContent');
  const tpl = document.getElementById('member-template');
  const node = tpl.content.cloneNode(true);
  const imgEl = node.querySelector('.m-avatar');
  loadAvatarImg('images/' + meta.id.charAt(0).toUpperCase() + meta.id.slice(1) + '-avatar', (loadedImg) => {
    if (loadedImg) { imgEl.src = loadedImg.src; } else if (img) { imgEl.src = img.src; } else { imgEl.style.display = 'none'; }
  });
  node.querySelector('.m-name').textContent = meta.name;
  node.querySelector('.m-role').textContent = meta.role + ' · ' + meta.group;
  node.querySelector('.m-bio').textContent = opts.alt ? meta.alt : meta.bio;
  const quirks = node.querySelector('.m-quirks'); quirks.innerHTML = '';
  (opts.alt ? meta.quirks : meta.quirks).forEach(q => { const li = document.createElement('li'); li.textContent = q; quirks.appendChild(li); });

  // actions
  node.querySelector('.m-contact').addEventListener('click', () => {
    window.open('https://t.me/' + meta.tg.substring(1), '_blank');
  });
  node.querySelector('.m-more').addEventListener('click', () => {
    alert('Ещё факты:\n- Любит кофе\n- Имеет секретный метод тестирования ошибок');
  });

  content.innerHTML = ''; content.appendChild(node);
  panel.classList.remove('hidden'); panel.setAttribute('aria-hidden', 'false');
}

function closeMemberPanel() { const panel = document.getElementById('memberPanel'); panel.classList.add('hidden'); panel.setAttribute('aria-hidden', 'true'); }

document.addEventListener('DOMContentLoaded', function () { prepareFalling(); init(); });