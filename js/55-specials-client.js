'use strict';
/* Special zombie client puppets and snapshots */
/* ---------- client side ---------- */
function puppetSpecial(s, dt) {
  if (s.flashT > 0) { s.flashT -= dt; if (s.flashT <= 0) flashSpecial(s, false); }
  const k = Math.min(1, dt * 12);
  s.x += (s.tx - s.x) * k; s.z += (s.tz - s.z) * k; s.y += (s.ty - s.y) * k;
  let d = s.trot - s.rot; d = Math.atan2(Math.sin(d), Math.cos(d)); s.rot += d * k;
  s.stT += dt; s.anim += dt;
  if (s.kind === 'wall') s.anim += 0;
  animSpecial(s, dt);
}
function applySpecialSnap(list) {
  if (!list || list.length !== specials.length) return;
  list.forEach((a, i) => {
    const s = specials[i];
    s.tx = a[0]; s.tz = a[1]; s.trot = a[2]; s.ty = a[6];
    if (!s.nseen) { s.x = s.tx; s.z = s.tz; s.rot = s.trot; s.y = s.ty; s.nseen = true; }
    if (a[4] < s.hp && s.fill) { s.flashT = 0.1; flashSpecial(s, true); }
    s.hp = a[4]; s.maxHp = a[5]; if (s.fill) s.fill.scale.x = Math.max(0.001, s.hp / s.maxHp);
    if (a[3] !== s.st) {
      const old = s.st; s.prev = old; s.st = a[3]; s.stT = 0;
      if (s.kind === 'charger' && (s.st === CH.YELL || s.st === CH.CHARGE || s.st === CH.SPLAT || s.st === CH.BOUNCE || s.st === CH.DAZED)) {
        /* the charge direction is the way he is facing */
        s.cdir = [Math.round(-Math.sin(s.trot)), Math.round(-Math.cos(s.trot))]; s.rot = s.trot;
      }
      if (s.kind === 'ambusher' && s.st === AM.PERCH && old !== AM.PERCH) s.rot = s.trot;
      specFx(s, old, s.st);
    }
  });
}
const specSnap = () => specials.map(s => [r2(s.x), r2(s.z), r2(s.rot), s.st, r2(s.hp), s.maxHp, r2(s.y)]);
