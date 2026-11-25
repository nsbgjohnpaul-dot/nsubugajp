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
  const tiles = ideaBoard.querySelectorAll('.idea-tile');
  const cube = ideaBoard.querySelector('.idea-cube');
  const cubeFaces = [...cube.querySelectorAll('.idea-cube-face')];
  const reducedCubeMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const canAnimateCube = typeof cube.animate === 'function';
  const canTwistCube = canAnimateCube && typeof cube.getAnimations === 'function' &&
    typeof DOMMatrix === 'function' && typeof DOMPoint === 'function';
  // 198 frames at 25 fps, with a layer turn every nine frames.
  const openingTurns = [
    [0, 1, 1], [1, 1, 1], [1, 0, -1], [0, -1, 1], [2, 1, -1], [0, 1, -1],
    [1, -1, 1], [2, -1, 1], [0, 0, -1], [1, 1, -1], [2, 1, 1],
  ];
  const referenceTurns = openingTurns.concat([...openingTurns].reverse().map(([axis, layer, direction]) => [axis, layer, -direction]));
  const turnInterval = 360;
  const turnLead = 40;
  const turnDuration = 260;
  let clearCubeTwist = () => {};
  let refreshCubeArtwork = () => {};

  if (canTwistCube) {
    const puzzle = document.createElement('div');
    const rotor = document.createElement('div');
    puzzle.className = 'idea-cube-puzzle';
    rotor.className = 'idea-cube-rotor';
    puzzle.setAttribute('aria-hidden', 'true');
    puzzle.append(rotor);
    cube.append(puzzle);
    const pieces = [];
    const surfaces = [
      ['front', ([x, y, z]) => [z, x, y]],
      ['right', ([x, y, z]) => [x, -z, y]],
      ['back', ([x, y, z]) => [-z, -x, y]],
      ['left', ([x, y, z]) => [-x, z, y]],
      ['top', ([x, y, z]) => [-y, x, z]],
      ['bottom', ([x, y, z]) => [y, x, -z]],
    ];
    const stickers = surfaces.map(() => []);
    const images = surfaces.map(() => null);
    let lastTurn = -1;
    let activeTurn;

    function positionPiece(piece) {
      const [x, y, z] = piece.position;
      piece.element.style.transform = 'translate3d(calc(var(--piece-step) * ' + x +
        '), calc(var(--piece-step) * ' + y + '), calc(var(--piece-step) * ' + z + ')) ' +
        piece.orientation.toString();
    }

    for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) {
      const element = document.createElement('div');
      element.className = 'idea-cube-piece';
      const origin = [x, y, z];
      surfaces.forEach(([name, coordinates], faceIndex) => {
        const face = document.createElement('span');
        face.className = 'idea-cube-piece-face idea-cube-face--' + name;
        const [outer, column, row] = coordinates(origin);
        if (outer === 1) {
          face.classList.add('idea-cube-sticker');
          const artwork = document.createElement('img');
          artwork.alt = '';
          artwork.decoding = 'async';
          artwork.style.left = -100 * (column + 1) + '%';
          artwork.style.top = -100 * (row + 1) + '%';
          face.append(artwork);
          stickers[faceIndex].push(artwork);
        }
        element.append(face);
      });
      const piece = { element, origin, position: origin, orientation: new DOMMatrix() };
      positionPiece(piece);
      pieces.push(piece);
      puzzle.append(element);
    }

    refreshCubeArtwork = () => {
      cubeFaces.forEach((face, index) => {
        const image = face.querySelector('img');
        if (image === images[index]) return;
        images[index] = image;
        for (const sticker of stickers[index]) {
          sticker.sizes = image.sizes;
          sticker.srcset = image.srcset;
          sticker.src = image.src;
        }
      });
    };
    refreshCubeArtwork();

    function commitTurn(turn) {
      const [axis, layer, direction] = referenceTurns[turn % referenceTurns.length];
      const angles = [0, 0, 0];
      angles[axis] = direction * 90;
      const matrix = new DOMMatrix().rotate(...angles);
      for (const piece of pieces) {
        if (piece.position[axis] !== layer) continue;
        const point = matrix.transformPoint(new DOMPoint(...piece.position));
        piece.position = [Math.round(point.x), Math.round(point.y), Math.round(point.z)];
        piece.orientation = matrix.multiply(piece.orientation);
        positionPiece(piece);
        puzzle.append(piece.element);
      }
    }

    function finishTurn() {
      if (!activeTurn) return;
      const { animation, turn } = activeTurn;
      activeTurn = undefined;
      animation.cancel();
      commitTurn(turn);
    }

    function resetPuzzle() {
      if (activeTurn) {
        activeTurn.animation.cancel();
        activeTurn = undefined;
      }
      for (const piece of pieces) {
        piece.position = piece.origin;
        piece.orientation = new DOMMatrix();
        positionPiece(piece);
        puzzle.append(piece.element);
      }
      lastTurn = -1;
    }

    clearCubeTwist = () => {
      cube.removeAttribute('data-puzzle-active');
      if (lastTurn >= 0) resetPuzzle();
    };

    function updateCubeTwist() {
      requestAnimationFrame(updateCubeTwist);
      if (document.hidden || reducedCubeMotion.matches || cube.contains(document.activeElement) ||
        cube.hasAttribute('data-selecting')) {
        clearCubeTwist();
        return;
      }

      const rotation = cube.getAnimations().find(animation => animation.animationName === 'idea-cube-rotate');
      if (!rotation || typeof rotation.currentTime !== 'number') return;
      cube.toggleAttribute('data-puzzle-active', true);
      const loopTime = referenceTurns.length * turnInterval;
      const scale = rotation.effect.getComputedTiming().duration / loopTime;
      const time = rotation.currentTime / scale;
      const turn = Math.floor(time / turnInterval);
      const offset = time - turn * turnInterval - turnLead;
      if (offset < 0 || turn === lastTurn) return;

      finishTurn();
      // Each full cycle restores the starting arrangement, including after a skipped frame.
      if (turn - lastTurn > referenceTurns.length) {
        resetPuzzle();
        lastTurn = turn - turn % referenceTurns.length - 1;
      }
      for (let missed = lastTurn + 1; missed < turn; missed++) commitTurn(missed);
      lastTurn = turn;
      if (offset >= turnDuration) {
        commitTurn(turn);
        return;
      }
      const [axis, layer, direction] = referenceTurns[turn % referenceTurns.length];
      for (const piece of pieces) {
        if (piece.position[axis] === layer) rotor.append(piece.element);
      }
      const rotate = angle => 'rotate' + 'XYZ'[axis] + '(' + angle + 'deg)';
      const animation = rotor.animate([
        { transform: rotate(0), easing: 'cubic-bezier(.55, 0, .4, 1)' },
        { transform: rotate(direction * 90) },
      ], turnDuration * scale);
      animation.currentTime = offset * scale;
      activeTurn = { animation, turn };
      animation.onfinish = finishTurn;
    }

    requestAnimationFrame(updateCubeTwist);
  }
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
        if (depth > -.35 || !face.wasVisible || !queue.length) return;

        // Swap only after an outward-facing artwork has turned fully away.
        const outgoing = face.element.firstElementChild;
        face.element.replaceChildren(queue.shift());
        queue.push(outgoing);
        refreshCubeArtwork();
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
        refreshCubeArtwork();
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

    if (isMiddleCycle && cycleIndex < allTiles.length) {
      tile.setAttribute('aria-label', 'View ' + label);
      tile.addEventListener('pointerenter', () => highlightProject(button));
      tile.addEventListener('focus', () => highlightProject(button));
      tile.addEventListener('click', turnToArtwork);
    }
    button.addEventListener('click', turnToArtwork);
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
