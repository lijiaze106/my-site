(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const NS = 'http://www.w3.org/2000/svg';

  const svg = $('#machine-svg');
  const bubble = $('#bubble');
  const statusEl = $('#machine-status');
  const leverHit = $('#lever-hit');
  const leverEl = $('#lever');
  const denied = $('#denied');
  const nose = $('#nose');
  const noseGlow = $('#nose-glow');
  const mouth = $('#mouth');
  const armsLayer = $('#arms');
  const boxEls = [$('#box'), $('#face')];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const speed = () => (reduced.matches ? 0.25 : 1);

  /* ---- tiny async toolkit: a reset bumps runId and cancels everything ---- */
  class Abort extends Error {}
  let runId = 0;
  window.addEventListener('unhandledrejection', e => { if (e.reason instanceof Abort) e.preventDefault(); });

  const ease = {
    lin: t => t,
    in: t => t * t * t,
    out: t => 1 - Math.pow(1 - t, 3),
    inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  };

  const sleep = ms => {
    const id = runId;
    return new Promise((res, rej) => setTimeout(() => (id === runId ? res() : rej(new Abort())), ms * speed()));
  };

  const tween = (ms, fn, easing = ease.inOut) => {
    const id = runId;
    const total = ms * speed();
    return new Promise((res, rej) => {
      const t0 = performance.now();
      (function step(now) {
        if (id !== runId) return rej(new Abort());
        const p = total <= 0 ? 1 : Math.min(1, (now - t0) / total);
        fn(easing(p));
        p < 1 ? requestAnimationFrame(step) : res();
      })(t0);
    });
  };

  const lerp = (a, b, t) => a + (b - a) * t;
  const choice = list => list[Math.floor(Math.random() * list.length)];

  /* ---- face: eyes follow the pointer, blink, and change with the mood ---- */
  const MOUTHS = {
    flat: 'M282 388 L318 388',
    soft: 'M278 385 Q300 395 322 385',
    smirk: 'M274 390 Q300 396 328 376',
    smile: 'M270 376 Q300 408 330 376',
    frown: 'M278 396 Q300 374 322 396',
    oh: 'M289 380 a11 14 0 1 0 22 0 a11 14 0 1 0 -22 0'
  };

  const MOODS = {
    idle: { lid: 0.04, tilt: 0, pupil: 14, scale: 1, mouth: MOUTHS.soft },
    smug: { lid: 0.42, tilt: 0, pupil: 14, scale: 1, mouth: MOUTHS.smirk },
    shock: { lid: 0, tilt: 0, pupil: 7, scale: 1.14, mouth: MOUTHS.oh, fill: '#5b2a22' },
    angry: { lid: 0.3, tilt: 28, pupil: 11, scale: 1, mouth: MOUTHS.frown },
    squint: { lid: 0.7, tilt: 0, pupil: 14, scale: 1, mouth: MOUTHS.smile }
  };

  const eyes = [...document.querySelectorAll('.eye')].map(el => ({
    el, cx: +el.dataset.cx, cy: +el.dataset.cy,
    pupil: $('.pupil', el), lid: $('.lid', el),
    happy: $('.eye-happy', el), x: $('.eye-x', el), px: 0, py: 0
  }));

  const face = { lid: 0.04, tilt: 0, pupil: 14, scale: 1 };
  let faceTarget = MOODS.idle;
  let pointer = null;
  let gaze = null;
  let blinkAt = performance.now() + 2500;
  let blinkStart = -1e9;
  let lastFrame = performance.now();

  function setMood(name) {
    const m = MOODS[name] || MOODS.idle;
    faceTarget = m;
    mouth.setAttribute('d', m.mouth);
    mouth.style.fill = m.fill || 'none';
  }

  function faceLoop(now) {
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    const k = 1 - Math.exp(-dt * 16);
    for (const key of ['lid', 'tilt', 'pupil', 'scale']) face[key] += (faceTarget[key] - face[key]) * k;

    if (now > blinkAt) { blinkStart = now; blinkAt = now + 2200 + Math.random() * 3800; }
    const bp = (now - blinkStart) / 150;
    const blink = bp >= 0 && bp <= 1 ? Math.sin(bp * Math.PI) : 0;

    const rect = svg.getBoundingClientRect();
    const sc = rect.width / 600 || 1;

    eyes.forEach((eye, i) => {
      let tx = 300, ty = 215;
      if (gaze) { tx = gaze.x; ty = gaze.y; }
      else if (pointer) { tx = (pointer.x - rect.left) / sc; ty = (pointer.y - rect.top) / sc; }
      const dx = tx - eye.cx, dy = ty - eye.cy;
      const dist = Math.hypot(dx, dy) || 1;
      const reach = Math.min(15, dist / 7 + 3);
      eye.px += (dx / dist * reach - eye.px) * k;
      eye.py += (dy / dist * reach - eye.py) * k;
      const bottom = -34 + 68 * Math.max(face.lid, blink);
      const tilt = (i === 0 ? 1 : -1) * face.tilt;
      eye.lid.setAttribute('transform', `rotate(${tilt.toFixed(2)}) translate(0 ${bottom.toFixed(2)})`);
      eye.pupil.setAttribute('transform', `translate(${eye.px.toFixed(2)} ${eye.py.toFixed(2)}) scale(${(face.pupil / 14).toFixed(3)})`);
      eye.el.setAttribute('transform', `translate(${eye.cx} ${eye.cy}) scale(${face.scale.toFixed(3)})`);
    });
    requestAnimationFrame(faceLoop);
  }

  /* ---- speech bubble ---- */
  let bubbleTimer = null;
  function say(text, ms = 2600) {
    bubble.textContent = text;
    bubble.classList.add('show');
    statusEl.textContent = text;
    clearTimeout(bubbleTimer);
    if (ms) bubbleTimer = setTimeout(() => bubble.classList.remove('show'), ms);
  }

  /* ---- lever ---- */
  const OFF = -32, ON = 32;
  const lever = {
    angle: OFF,
    set(a) { this.angle = a; leverEl.setAttribute('transform', `rotate(${a.toFixed(2)})`); },
    to(a, ms, easing) { const a0 = this.angle; return tween(ms, t => this.set(lerp(a0, a, t)), easing); }
  };

  /* ---- the arm: two equal bones that stretch like a noodle ---- */
  const HAND = 34;
  const ARM_MARKUP = `
    <path class="arm-edge"></path><path class="arm-skin"></path>
    <g class="hand">
      <g class="fist">
        <circle class="glove" cx="13" cy="-10" r="7.5"></circle>
        <circle class="glove" cx="17" cy="0" r="7.5"></circle>
        <circle class="glove" cx="13" cy="10" r="7.5"></circle>
      </g>
      <circle class="glove" r="15"></circle>
      <g class="prop">
        <rect class="stamp-knob" x="12" y="-9" width="14" height="18" rx="5"></rect>
        <rect class="stamp-base" x="24" y="-27" width="12" height="54" rx="4"></rect>
        <rect class="stamp-ink" x="35" y="-24" width="4" height="48"></rect>
      </g>
    </g>`;

  const arm = {
    sx: 445, sy: 225, x: 445, y: 225, handDir: 90,
    g: document.createElementNS(NS, 'g'),
    set(x, y) { this.x = x; this.y = y; this.render(); },
    to(x, y, ms, easing = ease.inOut) {
      const x0 = this.x, y0 = this.y;
      return tween(ms, t => this.set(lerp(x0, x, t), lerp(y0, y, t)), easing);
    },
    solve(wx, wy) {
      const dx = wx - this.sx, dy = wy - this.sy;
      let d = Math.hypot(dx, dy);
      const ux = d < 1e-6 ? -1 : dx / d, uy = d < 1e-6 ? 0 : dy / d;
      const k = 0.56, maxBone = 128;
      d = Math.max(d, 0.001);
      let bone = d * k;
      if (bone > maxBone) { bone = maxBone; d = maxBone / k; }
      const half = d / 2;
      const h = Math.sqrt(Math.max(0, bone * bone - half * half));
      return [this.sx + ux * half - uy * h, this.sy + uy * half + ux * h, this.sx + ux * d, this.sy + uy * d];
    },
    render() {
      const a = this.handDir * Math.PI / 180;
      const dir = [Math.cos(a), Math.sin(a)];
      const r = this.solve(this.x - dir[0] * HAND, this.y - dir[1] * HAND);
      const d = `M${this.sx} ${this.sy}L${r[0].toFixed(1)} ${r[1].toFixed(1)}L${r[2].toFixed(1)} ${r[3].toFixed(1)}`;
      $('.arm-edge', this.g).setAttribute('d', d);
      $('.arm-skin', this.g).setAttribute('d', d);
      $('.hand', this.g).setAttribute('transform', `translate(${r[2].toFixed(1)} ${r[3].toFixed(1)}) rotate(${this.handDir})`);
    }
  };
  arm.g.innerHTML = ARM_MARKUP;
  arm.g.style.display = 'none';
  armsLayer.appendChild(arm.g);

  /* ---- hatch ---- */
  const flap = $('#flap-R');
  const setHatch = open => flap.setAttribute('transform', `translate(470 0) scale(${(1 - 0.88 * open).toFixed(3)} 1) translate(-470 0)`);

  /* ---- stage helpers ---- */
  function setBox(dx = 0, rot = 0) {
    const t = dx || rot ? `translate(${dx.toFixed(2)} 0) rotate(${rot.toFixed(2)} 300 440)` : '';
    boxEls.forEach(el => (t ? el.setAttribute('transform', t) : el.removeAttribute('transform')));
  }

  async function shake(amp, ms) {
    await tween(ms, t => setBox(Math.sin(t * 46) * amp * (1 - t), Math.sin(t * 38) * amp * 0.18 * (1 - t)), ease.lin);
    setBox();
  }

  let on = false;
  let busy = false;
  let rounds = 0;

  function setOn(v) {
    on = v;
    leverHit.setAttribute('aria-checked', String(v));
    nose.style.fill = v ? 'var(--accent)' : '#c9bd9f';
    noseGlow.style.opacity = v ? 0.45 : 0;
  }

  /* ---- THE reaction: paperwork ---- */
  const LINES = ['I have the paperwork for this.', 'One moment — I need a form.', 'This requires a signature.'];
  const VERDICTS = ['DENIED.', 'Request declined.', 'Please try again never.'];

  async function stampIt() {
    setMood('smug');
    say(choice(LINES));
    await sleep(450);

    setHatch(0);
    await tween(220, t => setHatch(t), ease.out);
    arm.g.style.display = '';
    arm.handDir = 90;
    arm.set(445, 225);
    gaze = { x: 320, y: 200 };

    await arm.to(332, 118, 520, ease.out);   // lift the stamp high
    await sleep(500);                         // ...hold it there
    await arm.to(318, 232, 140, ease.in);     // SLAM

    lever.set(OFF + 6);
    setOn(false);
    denied.style.opacity = 1;
    lever.to(OFF, 160, ease.back).catch(() => {});
    say(choice(VERDICTS), 2400);
    await shake(7, 460);
    await sleep(300);

    await arm.to(380, 130, 300, ease.out);
    await arm.to(arm.sx, arm.sy, 280, ease.in);
    arm.g.style.display = 'none';
    await tween(200, t => setHatch(1 - t), ease.in);
    gaze = null;
  }

  async function turnOn() {
    ++runId;
    busy = true;
    rounds += 1;
    denied.style.opacity = 0;
    setOn(true);
    try {
      await lever.to(ON, 140, ease.back);
      await stampIt();
    } catch (error) {
      if (error instanceof Abort) return;
      console.error(error);
      resetStage();
      return;
    }
    busy = false;
    setTimeout(() => { if (!busy) setMood('idle'); }, 900);
  }

  function activate() {
    if (busy) { say('Not now — I’m busy being stubborn.', 1400); return; }
    if (!on) turnOn();
  }

  leverHit.addEventListener('click', activate);
  leverHit.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
  });

  /* ---- poke its eyes ---- */
  const POKES = ['Hey! Eyes are private.', 'Ow. Rude.', 'I can still see you, you know.', 'Stop. I’m a delicate instrument.'];
  let pokes = 0;
  document.querySelectorAll('.eye-hit').forEach(hit => hit.addEventListener('click', () => {
    if (busy) return;
    setMood('squint');
    say(POKES[pokes++ % POKES.length], 2000);
    setTimeout(() => { if (!busy) setMood('idle'); }, 900);
  }));

  window.addEventListener('pointermove', e => { pointer = { x: e.clientX, y: e.clientY }; }, { passive: true });

  /* ---- reset ---- */
  function resetStage() {
    ++runId;
    busy = false;
    gaze = null;
    arm.g.style.display = 'none';
    setHatch(0);
    setBox();
    denied.style.opacity = 0;
    lever.set(OFF);
    setOn(false);
    setMood('idle');
    bubble.classList.remove('show');
    statusEl.textContent = 'The machine is standing by. Make your move.';
  }

  $('#reset-button').addEventListener('click', () => { resetStage(); say('Reset. I forgive nothing.', 1800); });

  resetStage();
  requestAnimationFrame(faceLoop);
  setTimeout(() => { if (!busy && rounds === 0) say('Go on. Flip the switch.', 4500); }, 900);
})();