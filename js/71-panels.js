'use strict';
/* Panels, how-to-play guide, title screen */
/* ---------- panels ---------- */
function panel(title, sub, body, btn, handler) {
  $('ptitle').textContent = title; $('psub').textContent = sub; $('pbody').innerHTML = body;
  const b = $('pbtn'); b.hidden = !handler; b.textContent = btn || ''; b.onclick = handler || null;
  el.panel.hidden = false; bindPanel();
  if (handler) { try { b.focus({ preventScroll: true }); } catch (e) {} }
}
const basicsHtml = () => '<ul class="rules"><li>Eat dots. Every dot is ammo.</li><li>Shoot the zombies. Eat every dot to clear the level.</li><li>Big dots are power-ups. You get a better gun each level.</li></ul><button id="guidebtn" class="btn alt" type="button">HOW TO PLAY: ZOMBIES, MUTANTS, TIPS</button>';
const sw = c => '<i class="sw" style="background:' + c + '"></i>';
const GUIDE = [
  { t: 'The basics', h: '<ul class="rules"><li>Walk over dots to collect them. Every dot is ammo.</li><li>Eat every dot to clear the level. A new random map follows.</li><li>You unlock a better gun every level: pistol, SMG, shotgun, rail cannon. Die and you drop one.</li><li>A bite takes 25 health, and zombies keep biting until you kill them or lose them.</li><li>Sprinting drains the sprint bar, which refills slowly. Jump the spike pits. Ramps lead up and over things.</li></ul>' },
  { t: 'Power-ups', h: '<ul class="rules"><li><b>HASTE</b>: run faster and jump higher.</li><li><b>SHIELD</b>: nothing can hurt you for a while.</li><li><b>FRENZY</b>: free ammo and fast fire.</li><li><b>FREEZE</b>: every zombie and mutant stops.</li><li><b>MEDKIT</b>: full health and a spare life.</li><li><b>AMMO CRATE</b>: full magazine.</li></ul><p class="keys">Big dots give a random one.</p>' },
  { t: 'ROTTER', c: '#ff3b4e', h: '<p><b>Chases you.</b> Heads straight for your position and never gives up. Simple, relentless.</p><p class="keys">Tip: keep moving and use corners.</p>' },
  { t: 'GNASH', c: '#ff7ac8', h: '<p><b>Cuts you off.</b> Aims at where you are heading, a few cells ahead. Turning around fools him.</p><p class="keys">Tip: do not run in a straight line for long.</p>' },
  { t: 'MOLD', c: '#46e6ff', h: '<p><b>Flanks you.</b> Uses ROTTER as a guide and comes at you from the opposite side. You get pinched.</p><p class="keys">Tip: when two come from both ends, find a side hall or jump a ramp.</p>' },
  { t: 'LIMP', c: '#ff9a2e', h: '<p><b>Shy up close.</b> Chases from far away, then loses his nerve near you and runs to his corner.</p><p class="keys">Tip: he is the easiest one to pick off.</p>' },
  { t: 'Hurting zombies', h: '<ul class="rules"><li>Zombies take several hits. Headshots do 2.5x damage.</li><li>Shoot a leg off: the zombie falls, lies still, then crawls at you fast.</li><li>New zombies claw up out of the floor in the middle of the map. They cannot hurt you or be hurt while rising.</li></ul>' },
  { t: 'THE WALL', c: '#a9b58a', h: '<p>A zombie so fat it fills the hall. Slow, and it <b>cannot be killed</b>. It blocks bullets and hurts on touch.</p><ul class="rules"><li>It never turns around in a hall.</li><li>Nothing gets past it, not even zombies. Run up a ramp and <b>jump</b> from the top to clear it.</li></ul>' },
  { t: 'THE CHARGER', c: '#2f6bff', h: '<p>A football player who wanders and <b>cannot be hurt</b>. If he sees you down a hall, he yells, then charges in a straight line.</p><ul class="rules"><li>Step out of his line or hop a side hall.</li><li>He smacks the wall at the end and is stunned. <b>That is when you shoot him.</b></li><li>If he hits THE WALL he bounces off, dazed, and is shootable.</li></ul>' },
  { t: 'THE AMBUSHER', c: '#ffe14a', h: '<p>A small crouching zombie that sits on top of a wall and never moves. You only see him if you <b>look up</b>.</p><ul class="rules"><li>Walk right under him and he pounces.</li><li>On the ground he can be shot. Then he leaps back up.</li></ul>' },
  { t: 'THE STALKER', c: '#cfd6c8', h: '<p>Follows <b>your footsteps</b>, exactly where you walked, at a speed between your walk and your run. If he reaches you he <b>snaps your neck</b>.</p><ul class="rules"><li>Listen. If you hear two sets of footsteps, one is not yours.</li><li>Turn around and shoot him before he arrives.</li></ul>' },
  { t: 'Modes and squads', h: '<ul class="rules"><li><b>NORMAL</b>, <b>FAST ZOMBS</b> (x1.5 speed), <b>INSANE</b> (faster, mutants almost every round), <b>DEV</b> (cannot die, all mutants, rail gun).</li><li>The map grows every 3 levels.</li><li>More players means a bigger map, tougher zombies and more mutants.</li><li>2 to 4 players. PvP can be toggled in the lobby.</li></ul>' },
  { t: 'Controls', h: '' }
];
function showGuide(i) {
  i = Math.max(0, Math.min(GUIDE.length - 1, i));
  const g = GUIDE[i], body = g.h || controlsHtml();
  panel(g.t, 'How to play ' + (i + 1) + ' of ' + GUIDE.length, '<div class="gp">' + (g.c ? '<div class="gtag">' + sw(g.c) + '</div>' : '') + body + '</div><div class="gnav"><button id="gprev" class="btn alt" type="button"' + (i ? '' : ' disabled') + '>BACK</button><button id="gnext" class="btn alt" type="button"' + (i < GUIDE.length - 1 ? '' : ' disabled') + '>NEXT</button></div>', 'DONE', showTitle);
  $('gprev').onclick = () => showGuide(i - 1); $('gnext').onclick = () => showGuide(i + 1);
}
const controlsHtml = () => isTouch
  ? '<p class="keys">Left thumb moves. Right thumb looks. FIRE shoots. Tap a gun chip to switch.</p>'
  : '<p class="keys">WASD move, mouse look, click or F to fire, Space jump, Shift sprint, 1 to 4 switch gun, M mute, Esc pause. If the mouse will not lock, drag to look.</p>';
const modeHtml = () => '<div class="mp"><span class="lbl">Game mode</span><div class="mprow"><button id="fastbtn" class="btn alt" type="button">' + modeLabel() + '</button></div></div>';
function soloStart() { netReset(); newGame(); }
function showTitle() {
  state = 'title'; releaseLock(); $('ver').classList.add('home');
  el.hud.hidden = true; el.touch.hidden = true; el.fire.hidden = true; el.jump.hidden = true;
  panel('Dot Slayer', 'Eat dots. Shoot zombies. Survive.', basicsHtml() + controlsHtml() + modeHtml() + mpHtml(), 'PLAY SOLO', soloStart);
  $('ptitle').innerHTML = 'Dot Slayer'.split('').map(c => c === ' ' ? ' ' : '<span data-ch="' + c.toUpperCase() + '">' + c + '</span>').join('');
}
