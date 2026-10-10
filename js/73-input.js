'use strict';
/* Keyboard, mouse and touch input */
/* ---------- input ---------- */
function tryLock() {
  if (isTouch) return;
  try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
}
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (locked) hadLock = true; else if (state === 'play' && hadLock) pause();
});
document.addEventListener('pointerlockerror', () => { locked = false; });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (state === 'play') {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.code >= 'Digit1' && e.code <= 'Digit4') selectWeapon(+e.code.slice(5) - 1);
    if (e.code === 'KeyP') pause();
  }
  if (e.code === 'KeyM') toggleMute();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseFire = false; });
let dragging = false, dragMoved = 0;
canvas.addEventListener('mousedown', e => {
  if (state !== 'play' || e.button !== 0 || isTouch) return;
  if (!locked) { tryLock(); dragging = true; dragMoved = 0; } else mouseFire = true;
});
addEventListener('mouseup', () => {
  if (dragging && !locked && dragMoved < 5) queued = true;
  dragging = false; mouseFire = false;
});
addEventListener('mousemove', e => {
  if (state !== 'play') return;
  if (locked) { yaw -= e.movementX * 0.0023; pitch -= e.movementY * 0.0023; }
  else if (dragging) { yaw -= e.movementX * 0.005; pitch -= e.movementY * 0.005; dragMoved += Math.abs(e.movementX) + Math.abs(e.movementY); }
  pitch = Math.max(-1, Math.min(1, pitch));
});
canvas.addEventListener('wheel', e => {
  if (state !== 'play') return;
  let i = wIdx + (e.deltaY > 0 ? 1 : -1);
  if (i > tier) i = 0; if (i < 0) i = tier;
  selectWeapon(i);
}, { passive: true });
function toggleMute() { muted = !muted; el.snd.textContent = muted ? 'SOUND OFF' : 'SOUND ON'; }
el.snd.addEventListener('click', toggleMute);

/* touch: left half floats a joystick, right half looks, FIRE button shoots */
let stickId = null, lookId = null, so = { x: 0, y: 0 }, lx = 0, ly = 0;
function placeStick(x, y, on) {
  const r = app.getBoundingClientRect();
  el.stick.style.left = (x - r.left) + 'px'; el.stick.style.top = (y - r.top) + 'px';
  el.stick.classList.toggle('on', on);
  if (!on) el.knob.style.transform = '';
}
el.touch.addEventListener('touchstart', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.clientX < innerWidth * 0.5 && stickId === null) { stickId = t.identifier; so = { x: t.clientX, y: t.clientY }; placeStick(so.x, so.y, true); }
    else if (lookId === null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; }
  }
}, { passive: false });
el.touch.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier === stickId) {
      let dx = (t.clientX - so.x) / 50, dy = (t.clientY - so.y) / 50;
      const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
      stick.x = dx; stick.y = dy; stick.run = l > 1.5;
      el.knob.style.transform = 'translate(' + dx * 40 + 'px,' + dy * 40 + 'px)';
    } else if (t.identifier === lookId) {
      yaw -= (t.clientX - lx) * 0.006; pitch -= (t.clientY - ly) * 0.005;
      pitch = Math.max(-1, Math.min(1, pitch)); lx = t.clientX; ly = t.clientY;
    }
  }
}, { passive: false });
function touchEnd(e) {
  for (const t of e.changedTouches) {
    if (t.identifier === stickId) { stickId = null; stick.x = 0; stick.y = 0; stick.run = false; placeStick(0, 0, false); }
    if (t.identifier === lookId) lookId = null;
  }
}
el.touch.addEventListener('touchend', touchEnd);
el.touch.addEventListener('touchcancel', touchEnd);
el.fire.addEventListener('touchstart', e => { e.preventDefault(); touchFire = true; }, { passive: false });
el.fire.addEventListener('touchend', e => { e.preventDefault(); touchFire = false; }, { passive: false });
el.fire.addEventListener('touchcancel', () => { touchFire = false; });
el.jump.addEventListener('touchstart', e => { e.preventDefault(); jumpHeld = true; }, { passive: false });
el.jump.addEventListener('touchend', e => { e.preventDefault(); jumpHeld = false; }, { passive: false });
el.jump.addEventListener('touchcancel', () => { jumpHeld = false; });

/* ---------- loop ---------- */
