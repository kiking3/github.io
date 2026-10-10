const menuToggle = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
function closeMenu() { mobileNav.hidden = true; menuToggle.setAttribute('aria-expanded', 'false'); menuToggle.setAttribute('aria-label', 'Open navigation'); }
menuToggle.addEventListener('click', () => { const open = menuToggle.getAttribute('aria-expanded') !== 'true'; menuToggle.setAttribute('aria-expanded', String(open)); menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation'); mobileNav.hidden = !open; });
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !mobileNav.hidden) { closeMenu(); menuToggle.focus(); } });
const gameWall = document.querySelector('#game-wall');
const motionToggle = document.querySelector('#wall-motion-toggle');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let wallPaused = reduceMotion.matches;
function updateWallMotion() {
  gameWall.classList.toggle('is-paused', wallPaused);
  motionToggle.setAttribute('aria-pressed', String(wallPaused));
  motionToggle.querySelector('.motion-label').textContent = wallPaused ? 'Resume animation' : 'Pause animation';
  motionToggle.querySelector('.motion-symbol').textContent = wallPaused ? '▷' : 'Ⅱ';
}
motionToggle.addEventListener('click', () => { wallPaused = !wallPaused; updateWallMotion(); });
reduceMotion.addEventListener('change', event => { wallPaused = event.matches; updateWallMotion(); });
updateWallMotion();

// A full repeating block must be wider than the visible lane, including overscan.
const wallLanes = [...gameWall.querySelectorAll('.wall-lane')].map(lane => ({
  lane, track: lane.querySelector('.wall-track'),
  sets: [...lane.querySelectorAll('.wall-set')],
  originals: [...lane.querySelector('.wall-set').children]
}));
function repeatedTile(tile) {
  const copy = tile.cloneNode(true);
  copy.tabIndex = -1;
  copy.setAttribute('aria-hidden', 'true');
  return copy;
}
let wallBuild = 0;
let wallWidth = 0;
async function prepareGameWall() {
  const width = gameWall.clientWidth;
  if (width === wallWidth) return;
  wallWidth = width;
  const build = ++wallBuild;
  gameWall.classList.remove('is-ready');
  wallLanes.forEach(({lane, track, sets, originals}, index) => {
    sets[0].replaceChildren(...originals);
    const baseWidth = sets[0].offsetWidth;
    const tileWidth = originals[0].offsetWidth;
    const repeats = Math.max(1, Math.ceil((lane.clientWidth + tileWidth * 2 + 64) / baseWidth));
    for (let i = 1; i < repeats; i++) sets[0].append(...originals.map(repeatedTile));
    sets[1].replaceChildren(...[...sets[0].children].map(repeatedTile));
    const distance = sets[0].offsetWidth;
    track.style.setProperty('--wall-distance', `-${distance}px`);
    track.style.setProperty('--wall-duration', `${distance / [20, 16, 18][index]}s`);
    lane.dataset.repeatCount = String(repeats);
  });
  await Promise.all([...gameWall.querySelectorAll('img')].map(async img => {
    try { await img.decode(); } catch { /* The title remains usable if an asset cannot load. */ }
  }));
  if (build !== wallBuild) return;
  gameWall.dataset.assetsReady = String([...gameWall.querySelectorAll('img')].every(img => img.complete && img.naturalWidth > 0));
  gameWall.classList.add('is-ready');
}
prepareGameWall();
if ('ResizeObserver' in window) new ResizeObserver(prepareGameWall).observe(gameWall);
else window.addEventListener('resize', prepareGameWall);

document.querySelectorAll('[data-dialog]').forEach(button => { button.addEventListener('click', () => document.getElementById(button.dataset.dialog).showModal()); });
document.querySelectorAll('dialog').forEach(dialog => { dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close()); dialog.addEventListener('click', event => { if (event.target !== dialog) return; const bounds = dialog.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close(); }); });
const navLinks = [...document.querySelectorAll('[data-nav]')];
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => { entries.forEach(entry => { if (entry.isIntersecting) navLinks.forEach(link => { const active = link.hash === `#${entry.target.id}`; link.classList.toggle('active', active); if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); }); }); }, { rootMargin: '-15% 0px -60% 0px' });
  navLinks.forEach(link => { const section = document.querySelector(link.hash); if (section) observer.observe(section); });
  if (!reduceMotion.matches) {
    const reveals = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); reveals.unobserve(entry.target); }
    }), {threshold:0.08});
    document.querySelectorAll('.brand-showcase,.brand-copy,.section-intro,.principles article,.access-options article,.affiliate-copy,.affiliate-card,.affiliate-benefits article,.about-layout,.faq-layout').forEach((element,index) => {
      element.classList.add('will-reveal');
      element.style.setProperty('--reveal-delay', `${index % 3 * 70}ms`);
      reveals.observe(element);
    });
  }
}
