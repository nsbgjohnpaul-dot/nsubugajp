const clock = document.querySelector('[data-clock]');
const clockFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Kampala',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function updateClock() {
  const time = clockFormat.format(new Date());
  if (clock.dateTime === `${time}+03:00`) return;
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
const approachDialog = document.createElement('dialog');
if (approachLink && processSection && typeof approachDialog.showModal === 'function') {
  const dialog = approachDialog;
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
} else if (approachLink && processSection) {
  document.documentElement.classList.add('about-inline-process');
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
    '09': ['Kakira Rum', 'A social campaign artwork featuring three Kakira Rum bottles.'],
  };
  const projectList = document.querySelector('.idea-project-list');
  const kakiraPreview = document.querySelector('#kakira-rum-preview');
  const tiles = ideaBoard.querySelectorAll('.idea-tile');
  const cube = ideaBoard.querySelector('.idea-cube');
  const cubeFaces = [...cube.querySelectorAll('.idea-cube-face')];
  const cubeSlice = document.createElement('div');
  cubeSlice.className = 'idea-cube-slice';
  cubeSlice.setAttribute('aria-hidden', 'true');
  cubeSlice.inert = true;
  cube.append(cubeSlice);
  const reducedCubeMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const canAnimateCube = typeof cube.animate === 'function';
  const faceCopies = new WeakMap();
  // The reference loop is 198 frames at 25 fps. Its turns land nine frames apart.
  const referenceTurns = ['x+', 'y+', 'y-', 'x+', 'y-', 'z+', 'x+', 'y-', 'y+', 'z-', 'y-',
    'x-', 'x+', 'y-', 'z+', 'x-', 'x+', 'y+', 'y-', 'x-', 'z+', 'x+'];
  const sliceTurnDuration = 270;
  const sliceAxes = {
    x: { end: [3, 1], edges: ['right', null, 'left', null, 'right', 'right'] },
    y: { end: [4, 5], edges: ['bottom', 'bottom', 'bottom', 'bottom', null, null] },
    z: { end: [2, 0], edges: [null, 'left', null, 'right', 'bottom', 'top'] },
  };
  const oppositeEdges = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };
  const cut = (edge, amount) => 'inset(' + ['top', 'right', 'bottom', 'left']
    .map(side => side === edge ? amount : '0').join(' ') + ')';
  let sliceAnimation;
  let lastTurn = -1;

  function clearCubeTwist() {
    sliceAnimation?.cancel();
    sliceAnimation = undefined;
    cube.removeAttribute('data-twisting');
  }

  function updateCubeTwist() {
    requestAnimationFrame(updateCubeTwist);
    if (document.hidden || reducedCubeMotion.matches || cube.contains(document.activeElement) ||
      cube.hasAttribute('data-selecting')) {
      if (sliceAnimation) clearCubeTwist();
      lastTurn = -1;
      return;
    }

    const rotation = cube.getAnimations().find(animation => animation.animationName === 'idea-cube-rotate');
    if (!rotation || typeof rotation.currentTime !== 'number') return;
    const loopTime = referenceTurns.length * 360;
    const timeScale = rotation.effect.getComputedTiming().duration / loopTime;
    const time = rotation.currentTime / timeScale;
    const frame = Math.floor(time / 40);
    const turn = Math.floor(frame / 9);
    const offset = time - turn * 360 - 40;
    if (turn === lastTurn || offset < 0 || offset >= sliceTurnDuration) return;
    lastTurn = turn;

    const [axis, sign] = referenceTurns[turn % referenceTurns.length];
    const direction = sign === '+' ? 1 : -1;
    const { end, edges } = sliceAxes[axis];
    const endFace = end[direction === 1 ? 1 : 0];
    const strips = [];

    cubeFaces.forEach((face, index) => {
      const edge = direction === 1 ? edges[index] : oppositeEdges[edges[index]];
      face.style.setProperty('--body-clip', edge ? cut(edge, '33.3333%')
        : index === endFace ? 'inset(50%)' : 'none');
      if (!edge && index !== endFace) return;
      let strip = faceCopies.get(face.firstElementChild);
      if (!strip || strip.className !== face.className) {
        strip = face.cloneNode(true);
        faceCopies.set(face.firstElementChild, strip);
      }
      strip.style.clipPath = edge ? cut(oppositeEdges[edge], '66.6667%') : 'none';
      strips.push(strip);
    });

    const seam = 'calc(var(--cube-size) / ' + (direction * 6) + ')';
    const cap = axis === 'x' ? 'translateX(' + seam + ') rotateY(90deg)'
      : axis === 'y' ? 'translateY(' + seam + ') rotateX(90deg)'
      : 'translateZ(' + seam + ')';
    cube.style.setProperty('--slice-cap', cap);
    cubeSlice.replaceChildren(...strips);
    cube.setAttribute('data-twisting', '');

    const rotate = angle => 'rotate' + axis.toUpperCase() + '(' + angle + 'deg)';
    sliceAnimation = cubeSlice.animate([
      { transform: rotate(0), easing: 'cubic-bezier(.55, 0, .45, 1)' },
      { transform: rotate(direction * 89), offset: .78 },
      { transform: rotate(direction * 90) },
    ], sliceTurnDuration * timeScale);
    sliceAnimation.currentTime = offset * timeScale;
    sliceAnimation.onfinish = clearCubeTwist;
  }

  if (canAnimateCube && typeof cube.getAnimations === 'function') requestAnimationFrame(updateCubeTwist);
  const spareTiles = [...ideaBoard.querySelector('.idea-cube-artworks').content.querySelectorAll('.idea-tile')]
    .map(tile => document.adoptNode(tile));
  for (const tile of [...tiles, ...spareTiles]) {
    const grid = document.createElement('span');
    grid.className = 'idea-cube-grid';
    grid.setAttribute('aria-hidden', 'true');
    for (let square = 0; square < 9; square++) {
      grid.append(document.createElement('span'));
    }
    tile.append(grid);
  }
  const queue = [...spareTiles];
  const faceAngles = [[0, 0], [0, -90], [0, 180], [0, 90], [-90, 0], [90, 0]];
  const projectWheel = projectList.closest('aside');
  let wheelCycleStart = 0;
  let wheelCycleHeight = 0;
  let wheelTarget = null;
  let wheelFrame = 0;
  let lastWheelFrameTime = 0;
  let wheelRows = [];
  let wheelUpdateFrame = 0;
  let centeredProject;
  let selectionAnimation;
  let resumeTimer;
  const projectButtons = new Map();
  let activeProject;

  function highlightProject(button) {
    if (!button || activeProject === button) return;
    activeProject?.removeAttribute('data-highlighted');
    button.setAttribute('data-highlighted', '');
    activeProject = button;
  }

  function updateProjectWheel() {
    const radius = projectWheel.clientHeight / 2;
    if (!radius) return;
    let center = projectWheel.scrollTop + radius;
    // Keep a full cycle on either side so recycling never exposes an end.
    if (wheelCycleHeight && (center < wheelCycleStart - wheelCycleHeight ||
      center >= wheelCycleStart + 2 * wheelCycleHeight)) {
      const positionInCycle = ((center - wheelCycleStart) % wheelCycleHeight + wheelCycleHeight) % wheelCycleHeight;
      const previousTop = projectWheel.scrollTop;
      projectWheel.scrollTop = wheelCycleStart + positionInCycle - radius;
      if (wheelTarget !== null) wheelTarget += projectWheel.scrollTop - previousTop;
      center = projectWheel.scrollTop + radius;
    }
    let nearest;
    let nearestDistance = Infinity;
    for (const { item, middle, height } of wheelRows) {
      const distance = middle - center;
      if (Math.abs(distance) > radius + height) continue;
      const angle = Math.max(-1, Math.min(1, distance / radius)) * .58;
      const inset = (1 - Math.cos(angle)) * Math.min(radius, projectWheel.clientWidth);
      item.style.setProperty('--wheel-inset', inset + 'px');
      item.style.setProperty('--wheel-angle', -angle + 'rad');
      if (Math.abs(distance) < nearestDistance) {
        nearest = item;
        nearestDistance = Math.abs(distance);
      }
    }
    if (nearest !== centeredProject) {
      centeredProject?.removeAttribute('data-centered');
      nearest?.setAttribute('data-centered', '');
      centeredProject = nearest;
    }
  }

  if (typeof DOMMatrixReadOnly === 'function') {
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
      if (document.hidden || cube.contains(document.activeElement)) return;
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
        if (depth > -.35 || !face.wasVisible || !queue.length || cube.dataset.twisting) return;

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

  const wheelTiles = Array.from({ length: Math.max(12, allTiles.length) }, (_, index) => allTiles[index % allTiles.length]);
  const cycleCount = 5;
  const middleCycle = Math.floor(cycleCount / 2);
  const loopTiles = Array.from({ length: cycleCount }, () => wheelTiles).flat();
  loopTiles.forEach((tile, index) => {
    const cycleIndex = index % wheelTiles.length;
    const isMiddleCycle = Math.floor(index / wheelTiles.length) === middleCycle;
    const id = tile.dataset.artwork;
    const [name] = projects[id];
    const label = editions[id] ? name + ' · ' + editions[id] : name;
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = name;
    if (!isMiddleCycle || cycleIndex >= allTiles.length) {
      item.setAttribute('aria-hidden', 'true');
      button.tabIndex = -1;
    }
    if (editions[id]) {
      const edition = document.createElement('small');
      edition.textContent = editions[id];
      button.append(' ', edition);
    }
    item.append(button);
    projectList.append(item);
    if (isMiddleCycle && cycleIndex < allTiles.length) projectButtons.set(id, button);

    function turnToArtwork() {
      highlightProject(button);
      wheelTarget = null;
      projectWheel.scrollTo({
        top: item.offsetTop + (item.offsetHeight - projectWheel.clientHeight) / 2,
        behavior: reducedCubeMotion.matches ? 'auto' : 'smooth',
      });
      const from = getComputedStyle(cube).transform;
      clearTimeout(resumeTimer);
      selectionAnimation?.cancel();

      clearCubeTwist();
      let faceIndex = cubeFaces.indexOf(tile.parentElement);
      if (faceIndex === -1) {
        const front = cubeFaces[0];
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
      const resumeCube = () => {
        resumeTimer = setTimeout(() => {
          selectionAnimation?.cancel();
          cube.removeAttribute('data-selecting');
        }, 2200);
      };
      if (!canAnimateCube || reducedCubeMotion.matches) {
        resumeCube();
        return;
      }
      selectionAnimation = cube.animate([{ transform: from }, { transform: to }], {
        duration: 750,
        easing: 'ease-in-out',
        fill: 'forwards',
      });
      selectionAnimation.onfinish = resumeCube;
    }

    function selectArtwork() {
      turnToArtwork();
      if (id !== '09') return;
      if (typeof kakiraPreview.showModal === 'function') kakiraPreview.showModal();
      else location.assign(kakiraPreview.querySelector('img').src);
    }

    if (id === '09') {
      button.setAttribute('aria-haspopup', 'dialog');
      tile.setAttribute('aria-haspopup', 'dialog');
    }
    if (isMiddleCycle && cycleIndex < allTiles.length) {
      tile.setAttribute('aria-label', 'View ' + label);
      tile.addEventListener('pointerenter', () => highlightProject(button));
      tile.addEventListener('focus', () => highlightProject(button));
      tile.addEventListener('click', selectArtwork);
    }
    button.addEventListener('click', selectArtwork);
  });

  const firstMiddleItem = projectList.children[middleCycle * wheelTiles.length];
  const firstNextItem = projectList.children[(middleCycle + 1) * wheelTiles.length];
  function measureProjectWheel() {
    wheelRows = Array.from(projectList.children, item => {
      const height = item.offsetHeight;
      return { item, height, middle: item.offsetTop + height / 2 };
    });
    wheelCycleStart = firstMiddleItem.offsetTop;
    wheelCycleHeight = firstNextItem.offsetTop - wheelCycleStart;
    updateProjectWheel();
  }

  function glideProjectWheel(now) {
    wheelFrame = 0;
    if (wheelTarget === null) return;
    const elapsed = lastWheelFrameTime ? Math.min(now - lastWheelFrameTime, 50) : 1000 / 60;
    lastWheelFrameTime = now;
    const easing = 1 - Math.pow(.8, elapsed / (1000 / 60));
    const remaining = wheelTarget - projectWheel.scrollTop;
    projectWheel.scrollTop = Math.abs(remaining) < 4 ? wheelTarget : projectWheel.scrollTop + remaining * easing;
    updateProjectWheel();
    if (Math.abs(remaining) >= 4) wheelFrame = requestAnimationFrame(glideProjectWheel);
    else wheelTarget = null;
  }

  projectWheel.addEventListener('wheel', event => {
    if (event.ctrlKey || reducedCubeMotion.matches || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? projectWheel.clientHeight : 1;
    const delta = Math.max(-projectWheel.clientHeight, Math.min(projectWheel.clientHeight, event.deltaY * unit));
    wheelTarget = Math.max(0, Math.min(projectWheel.scrollHeight - projectWheel.clientHeight,
      (wheelTarget ?? projectWheel.scrollTop) + delta));
    if (!wheelFrame) {
      lastWheelFrameTime = 0;
      wheelFrame = requestAnimationFrame(glideProjectWheel);
    }
  }, { passive: false });

  const openingIndex = matchMedia('(min-width: 801px)').matches ? Math.floor((wheelTiles.length - 1) / 2) : 0;
  const openingItem = projectList.children[middleCycle * wheelTiles.length + openingIndex];
  projectWheel.scrollTop = openingItem.offsetTop + (openingItem.offsetHeight - projectWheel.clientHeight) / 2;
  projectWheel.addEventListener('scroll', () => {
    if (wheelFrame || wheelUpdateFrame) return;
    wheelUpdateFrame = requestAnimationFrame(() => {
      wheelUpdateFrame = 0;
      updateProjectWheel();
    });
  }, { passive: true });
  if (typeof ResizeObserver === 'function') {
    const wheelResize = new ResizeObserver(measureProjectWheel);
    wheelResize.observe(projectWheel);
    wheelResize.observe(projectList);
  } else {
    window.addEventListener('resize', measureProjectWheel);
  }
  measureProjectWheel();
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
