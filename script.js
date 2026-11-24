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
  const projectList = document.querySelector('.idea-project-list');
  const tiles = ideaBoard.querySelectorAll('.idea-tile');
  const cube = ideaBoard.querySelector('.idea-cube');
  const spareTiles = [...ideaBoard.querySelector('.idea-cube-artworks').content.querySelectorAll('.idea-tile')]
    .map(tile => document.adoptNode(tile));
  const queue = [...spareTiles];
  const faceAngles = [[0, 0], [0, -90], [0, 180], [0, 90], [-90, 0], [90, 0]];
  const inquiry = document.querySelector('.header-inquiry');
  const alignProjectList = () => {
    const right = document.documentElement.clientWidth - inquiry.getBoundingClientRect().right;
    projectList.closest('aside').style.setProperty('--idea-list-right', Math.max(0, right) + 'px');
  };
  new ResizeObserver(alignProjectList).observe(inquiry);
  window.addEventListener('resize', alignProjectList);
  alignProjectList();
  let selectionAnimation;
  let resumeTimer;
  const projectButtons = new Map();
  let activeProject;

  function highlightProject(button) {
    if (!button || activeProject === button) return;
    activeProject?.removeAttribute('data-highlighted');
    button.setAttribute('data-highlighted', '');
    activeProject = button;

    if (!matchMedia('(min-width: 801px)').matches) return;
    const column = projectList.closest('aside');
    const bounds = column.getBoundingClientRect();
    const title = button.getBoundingClientRect();
    if (column.scrollHeight > column.clientHeight) {
      column.scrollTo({
        top: column.scrollTop + title.top - bounds.top - (column.clientHeight - title.height) / 2,
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
    }
  }

  if (cube) {
    const faces = [
      ['front', matrix => matrix.m33],
      ['right', matrix => matrix.m13],
      ['back', matrix => -matrix.m33],
      ['left', matrix => -matrix.m13],
      ['top', matrix => -matrix.m23],
      ['bottom', matrix => matrix.m23],
    ].map(([side, depth]) => ({
      element: cube.querySelector('.idea-cube-face--' + side),
      depth,
      wasVisible: false,
    }));
    setInterval(() => {
      if (document.hidden || !queue.length || cube.contains(document.activeElement)) return;
      const style = getComputedStyle(cube);
      if (style.animationPlayState !== 'running' || style.animationName === 'none') return;

      const rotation = new DOMMatrixReadOnly(style.transform);
      let facingArtwork;
      let facingDepth = .72;
      faces.forEach(face => {
        const depth = face.depth(rotation);
        if (depth > facingDepth) {
          facingDepth = depth;
          facingArtwork = face.element.firstElementChild.dataset.artwork;
        }
        if (depth > .35) face.wasVisible = true;
        if (depth > -.35 || !face.wasVisible) return;

        // Swap only after an outward-facing artwork has turned fully away.
        const outgoing = face.element.firstElementChild;
        face.element.replaceChildren(queue.shift());
        queue.push(outgoing);
        face.wasVisible = false;
      });
      highlightProject(projectButtons.get(facingArtwork));
    }, 120);
  }

  const allTiles = [...tiles, ...spareTiles].sort((a, b) => a.dataset.artwork.localeCompare(b.dataset.artwork));
  const editions = { '01': 'Smoke Study', '03': 'Label Detail', '05': 'Studio Light', '06': 'Label Study', '07': 'Bottle Study' };

  allTiles.concat(allTiles.slice(0, 4)).forEach((tile, index) => {
    const id = tile.dataset.artwork;
    const [name] = projects[id];
    const label = editions[id] ? name + ' · ' + editions[id] : name;
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = name;
    if (editions[id]) {
      const edition = document.createElement('small');
      edition.textContent = editions[id];
      button.append(' ', edition);
    }
    item.append(button);
    projectList.append(item);
    if (!projectButtons.has(id)) projectButtons.set(id, button);

    function turnToArtwork() {
      highlightProject(button);
      const from = getComputedStyle(cube).transform;
      clearTimeout(resumeTimer);
      selectionAnimation?.cancel();

      const faces = [...cube.children];
      let faceIndex = faces.indexOf(tile.parentElement);
      if (faceIndex === -1) {
        const front = faces[0];
        queue.splice(queue.indexOf(tile), 1, front.firstElementChild);
        front.replaceChildren(tile);
        faceIndex = 0;
      }

      const [x, y] = faceAngles[faceIndex];
      cube.setAttribute('data-selecting', '');
      cube.style.setProperty('--cube-x', x + 'deg');
      cube.style.setProperty('--cube-y', y + 'deg');
      cube.style.setProperty('--cube-z', '0deg');
      const to = 'rotateX(' + x + 'deg) rotateY(' + y + 'deg) rotateZ(0deg)';
      const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 750;
      selectionAnimation = cube.animate([{ transform: from }, { transform: to }], {
        duration,
        easing: 'ease-in-out',
        fill: 'forwards',
      });
      selectionAnimation.onfinish = () => {
        resumeTimer = setTimeout(() => {
          selectionAnimation.cancel();
          cube.removeAttribute('data-selecting');
        }, 2200);
      };
    }

    if (index < allTiles.length) {
      tile.setAttribute('aria-label', 'View ' + label);
      tile.addEventListener('pointerenter', () => highlightProject(button));
      tile.addEventListener('focus', () => highlightProject(button));
      tile.addEventListener('click', turnToArtwork);
    }
    button.addEventListener('click', turnToArtwork);
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
