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

const soundButton = document.querySelector('[data-sound-toggle]');
let uiSoundsEnabled = soundButton?.getAttribute('aria-pressed') === 'true';

let uiAudioContext;
function playUiSound(kind) {
  if (!uiSoundsEnabled) return;
  const AudioContext = window.AudioContext;
  if (!AudioContext) return;
  uiAudioContext ??= new AudioContext();
  const context = uiAudioContext;
  const play = () => {
    if (context.state !== 'running') return;
    const now = context.currentTime;
    const isHover = kind === 'hover';
    const duration = isHover ? 0.075 : 0.04;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = isHover ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime(isHover ? 260 : 920, now);
    oscillator.frequency.exponentialRampToValueAtTime(isHover ? 165 : 560, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(isHover ? 0.012 : 0.022, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  };
  if (context.state === 'running') play();
  else context.resume().then(play).catch(error => {
    console.warn('The browser did not allow the UI sound to play.', error);
  });
}

document.addEventListener('click', event => {
  if (!event.isTrusted || !(event.target instanceof Element)) return;
  const control = event.target.closest('a, button, input[type="button"], input[type="submit"], [role="button"]');
  if (control && control !== soundButton && !control.disabled) playUiSound('click');
});

if (soundButton) {
  soundButton.addEventListener('click', () => {
    uiSoundsEnabled = !uiSoundsEnabled;
    soundButton.setAttribute('aria-pressed', String(uiSoundsEnabled));
    soundButton.setAttribute('aria-label', `${uiSoundsEnabled ? 'Mute' : 'Enable'} interface sounds`);
  });
}

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
  closeButton.textContent = 'Close';
  dialog.append(closeButton, processSection);
  const contactSection = document.querySelector('.about-main > .cta');
  if (contactSection) dialog.append(contactSection);
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
  const tiles = [...ideaBoard.querySelectorAll('.idea-tile')];
  let lastHoverSound = 0;
  ideaBoard.addEventListener('pointerover', event => {
    if (!uiSoundsEnabled || event.pointerType !== 'mouse' || !(event.target instanceof Element)) return;
    const tile = event.target.closest('.idea-tile');
    if (!tile || tile.contains(event.relatedTarget)) return;
    const now = performance.now();
    if (now - lastHoverSound < 120) return;
    lastHoverSound = now;
    playUiSound('hover');
  });
  const viewer = ideaBoard.querySelector('[data-artwork-viewer]');
  const preview = viewer.querySelector('.idea-preview');
  const prompt = viewer.querySelector('.idea-viewer-prompt');
  const close = viewer.querySelector('.idea-preview-close');
  const status = viewer.querySelector('.idea-viewer-status');
  const upload = ideaBoard.querySelector('[data-artwork-upload]');
  const localUrls = new Set();
  let uploadTarget = null;
  let previewUrl = null;
  function showArtwork(src, description, selectedTile) {
    if (previewUrl) { URL.revokeObjectURL(previewUrl); localUrls.delete(previewUrl); previewUrl = null; }
    preview.src = src;
    preview.alt = description;
    preview.hidden = false;
    prompt.hidden = true;
    close.hidden = false;
    status.textContent = '';
    tiles.forEach(tile => tile.setAttribute('aria-pressed', String(tile === selectedTile)));
  }
  function readArtwork(file, tile) {
    if (!file || !file.type.startsWith('image/')) { status.textContent = 'Choose an image file to view.'; return; }
    const url = URL.createObjectURL(file);
    localUrls.add(url);
    if (tile) {
      const oldImage = tile.querySelector('img');
      if (oldImage && localUrls.has(oldImage.src)) { URL.revokeObjectURL(oldImage.src); localUrls.delete(oldImage.src); }
      const img = document.createElement('img');
      img.src = url;
      img.alt = file.name;
      img.draggable = true;
      tile.replaceChildren(img);
      tile.classList.remove('idea-tile--empty');
      tile.setAttribute('aria-label', 'View ' + file.name);
      showArtwork(url, file.name, tile);
    } else {
      showArtwork(url, file.name);
      previewUrl = url;
    }
  }
  tiles.forEach(tile => {
    tile.addEventListener('click', () => {
      const img = tile.querySelector('img');
      if (img) showArtwork(img.src, img.alt, tile);
      else { uploadTarget = tile; upload.click(); }
    });
    tile.addEventListener('dragstart', event => {
      if (!tile.querySelector('img')) { event.preventDefault(); return; }
      event.dataTransfer.setData('application/x-idea-artwork', tile.dataset.artwork);
      event.dataTransfer.effectAllowed = 'copy';
    });
    tile.addEventListener('dragover', event => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); });
    tile.addEventListener('drop', event => {
      if (!event.dataTransfer.files.length) return;
      event.preventDefault();
      readArtwork(event.dataTransfer.files[0], tile);
    });
  });
  viewer.addEventListener('dragover', event => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    viewer.classList.add('is-dragover');
  });
  viewer.addEventListener('dragleave', event => {
    if (!viewer.contains(event.relatedTarget)) viewer.classList.remove('is-dragover');
  });
  viewer.addEventListener('drop', event => {
    event.preventDefault();
    viewer.classList.remove('is-dragover');
    const id = event.dataTransfer.getData('application/x-idea-artwork');
    const tile = tiles.find(item => item.dataset.artwork === id);
    const img = tile && tile.querySelector('img');
    if (img) showArtwork(img.src, img.alt, tile);
    else if (event.dataTransfer.files.length) readArtwork(event.dataTransfer.files[0]);
  });
  upload.addEventListener('change', () => { readArtwork(upload.files[0], uploadTarget); upload.value = ''; });
  close.addEventListener('click', () => {
    if (previewUrl) { URL.revokeObjectURL(previewUrl); localUrls.delete(previewUrl); previewUrl = null; }
    preview.hidden = true;
    preview.removeAttribute('src');
    close.hidden = true;
    prompt.hidden = false;
    status.textContent = '';
    const selected = tiles.find(tile => tile.getAttribute('aria-pressed') === 'true');
    tiles.forEach(tile => tile.setAttribute('aria-pressed', 'false'));
    if (selected) selected.focus();
  });
  preview.addEventListener('error', () => { status.textContent = 'This image could not be opened. Try another image.'; });
  window.addEventListener('pagehide', () => localUrls.forEach(url => URL.revokeObjectURL(url)));
}

const mobilePageOrder = [
  'index.html', 'work.html', 'project-01.html', 'body-and-soil.html',
  'project-03.html', 'project-04.html', 'project-05.html', 'project-06.html',
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
