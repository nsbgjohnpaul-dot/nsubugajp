const clock = document.querySelector('[data-clock]');
const clockFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Kampala',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function updateClock() {
  const time = clockFormat.format(new Date());
  clock.textContent = `EAT ${time}`;
  clock.dateTime = `${time}+03:00`;
}

updateClock();
window.setInterval(updateClock, 1000);

const audioButton = document.querySelector('[data-audio-toggle]');
let clicksEnabled = true;
let clickContext;
function playClick() {
  if (!clicksEnabled) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  clickContext ??= new AudioContext();
  const context = clickContext;
  const play = () => {
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(900, now);
    oscillator.frequency.exponentialRampToValueAtTime(350, now + 0.035);
    gain.gain.setValueAtTime(0.025, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.04);
  };
  if (context.state === 'running') play();
  else context.resume().then(play).catch(() => {});
}
if (audioButton) {
  const syncAudioControl = () => {
    audioButton.setAttribute('aria-pressed', String(clicksEnabled));
    audioButton.setAttribute('aria-label', clicksEnabled ? 'Mute click sounds' : 'Enable click sounds');
    audioButton.querySelector('.audio-play').hidden = clicksEnabled;
    audioButton.querySelector('.audio-reference-control').hidden = !clicksEnabled;
  };
  syncAudioControl();
  audioButton.addEventListener('click', () => {
    clicksEnabled = !clicksEnabled;
    syncAudioControl();
  });
}
document.addEventListener('click', event => {
  if (!event.isTrusted || !(event.target instanceof Element)) return;
  const control = event.target.closest('a, button, input[type="button"], input[type="submit"], [role="button"]');
  if (control && !control.disabled) playClick();
});
// Keep About on one screen while retaining the detailed process content.
const approachLink = document.querySelector('.about-main .approach-link');
const processSection = document.querySelector('.about-main .process');
if (approachLink && processSection) {
  const dialog = document.createElement('dialog');
  dialog.className = 'approach-dialog';
  dialog.setAttribute('aria-label', 'Approach and process');
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'approach-close';
  closeButton.textContent = '\u00D7';
  closeButton.setAttribute('aria-label', 'Close');
  dialog.append(closeButton, processSection);
  const contactSection = document.querySelector('.about-main > .cta');
  if (contactSection) dialog.append(contactSection);
  const approachFooter = document.querySelector('.about-main > .case-footer');
  if (approachFooter) dialog.append(approachFooter);
  document.body.append(dialog);
  approachLink.setAttribute('aria-haspopup', 'dialog');
  approachLink.addEventListener('click', (event) => {
    event.preventDefault();
    dialog.showModal();
  });
  closeButton.addEventListener('click', () => dialog.close());
  if (location.hash === '#approach') dialog.showModal();
}

const ideaBoard = document.querySelector('.idea-board');
if (ideaBoard) {
  const projects = {
    '01': ['Spirits Packaging', 'A bottle and label study photographed with smoke and warm lighting.'],
    '02': ['3D Game Art Portfolio', 'A portfolio cover that sets bold typography against an atmospheric 3D cityscape.'],
    '03': ['Spirits Packaging', 'A close-up study of the bottle silhouette, label and textured details.'],
    '04': ['Chill Out Café', 'A café identity applied to menus, takeaway cups and printed graphics.'],
    '05': ['Spirits Packaging', 'A studio study using directional light to reveal the glass and label.'],
    '06': ['Cista', 'A spirits label exploration with botanical artwork and a warm product setting.'],
    '07': ['Cista', 'A botanical label and bottle study styled with natural materials.'],
    '08': ['Catpuccino', 'A playful café website concept built around an illustrated cat identity.'],
  };
  const viewer = ideaBoard.querySelector('[data-artwork-viewer]');
  const preview = viewer.querySelector('.idea-preview');
  const details = document.querySelector('.idea-project');
  const projectName = details.querySelector('h2');
  const projectDescription = details.querySelector('.idea-project-description');
  const previewCaption = viewer.querySelector('.idea-preview-caption');
  const tiles = ideaBoard.querySelectorAll('.idea-tile');

  function showProject(tile) {
    const [name, description] = projects[tile.dataset.artwork];
    projectName.textContent = name;
    projectDescription.textContent = description;
  }

  tiles.forEach(tile => {
    const artwork = tile.querySelector('img');
    const [name, description] = projects[tile.dataset.artwork];
    tile.setAttribute('aria-label', 'View ' + name);
    tile.addEventListener('pointerenter', () => showProject(tile));
    tile.addEventListener('focus', () => showProject(tile));
    tile.addEventListener('click', () => {
      showProject(tile);
      preview.src = artwork.dataset.previewSrc || artwork.src;
      preview.alt = artwork.alt;
      previewCaption.querySelector('strong').textContent = name;
      previewCaption.querySelector('p').textContent = description;
      viewer.showModal();
    });
  });

  showProject(tiles[0]);
  viewer.addEventListener('close', () => {
    preview.removeAttribute('src');
    preview.alt = '';
  });
}

const themeToggle = document.querySelector('[data-theme-toggle]');
const themeStorageKey = 'portfolio-theme';
function applyTheme(theme) {
  const dark = theme === 'dark';
  document.body.classList.toggle('theme-dark', dark);
  document.querySelectorAll('[data-theme-portrait]').forEach(portrait => {
    const source = dark ? portrait.dataset.darkSrc : portrait.dataset.lightSrc;
    if (portrait.getAttribute('src') !== source) portrait.setAttribute('src', source);
  });
  if (themeToggle) {
    themeToggle.setAttribute('aria-pressed', String(dark));
    themeToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  }
}
let savedTheme = 'light';
try { savedTheme = localStorage.getItem(themeStorageKey) || 'light'; } catch {}
applyTheme(savedTheme);
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const theme = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
    applyTheme(theme);
    try { localStorage.setItem(themeStorageKey, theme); } catch {}
  });
}
window.addEventListener('storage', (event) => {
  if (event.key === themeStorageKey) applyTheme(event.newValue || 'light');
});

const homeProjects = document.querySelector('[data-home-projects]');
if (homeProjects) {
  const covers = [...homeProjects.querySelectorAll('.home-project-cover')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;

  setInterval(() => {
    if (reducedMotion.matches || document.hidden) return;

    const outgoing = covers[current];
    current = (current + 1) % covers.length;
    const incoming = covers[current];
    incoming.hidden = false;
    incoming.classList.add('is-entering');
    outgoing.animate(
      [{ filter: 'brightness(1)' }, { filter: 'brightness(.62)' }],
      { duration: 780, easing: 'ease-out' }
    );
    incoming.animate(
      [
        { clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)', transform: 'scale(1.08)' },
        { clipPath: 'polygon(0 0, 100% 0, 100% 34%, 0 77%)', transform: 'scale(1.035)', offset: .55 },
        { clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', transform: 'scale(1)' },
      ],
      { duration: 780, easing: 'cubic-bezier(.25,.75,.25,1)' }
    ).onfinish = () => {
      outgoing.hidden = true;
      incoming.classList.remove('is-entering');
    };
  }, 3600);
}

const mobilePageOrder = [
  'index.html', 'work.html', 'project-01.html', 'body-and-soil.html',
  'project-03.html', '27-guns-pop-beer.html', 'project-04.html', 'project-05.html', 'project-06.html',
  'project-07.html', 'project-08.html', 'project-09.html', 'project-10.html',
  'project-11.html', 'project-12.html', 'project-13.html', 'project-14.html',
  'project-15.html', 'about.html', 'idea-box.html', 'contact.html',
];
if (matchMedia('(max-width: 800px)').matches) {
  let swipeStart = null;
  document.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) { swipeStart = null; return; }
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('a, button, input, textarea, select, [contenteditable="true"], .work-gallery, .idea-board')) {
      swipeStart = null;
      return;
    }
    const touch = event.touches[0];
    swipeStart = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });
  document.addEventListener('touchend', event => {
    if (!swipeStart || !matchMedia('(max-width: 800px)').matches) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - swipeStart.x;
    const dy = touch.clientY - swipeStart.y;
    swipeStart = null;
    if (Math.abs(dx) < 72 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
    const current = location.pathname.split('/').pop() || 'index.html';
    const index = mobilePageOrder.indexOf(current);
    const next = mobilePageOrder[index + (dx < 0 ? 1 : -1)];
    if (index >= 0 && next) location.assign(new URL(next, location.href));
  }, { passive: true });
  document.addEventListener('touchcancel', () => { swipeStart = null; }, { passive: true });
}
