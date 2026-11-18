(() => {
  const gallery = document.querySelector('[data-work-gallery]');
  if (!gallery) return;
  const stage = gallery.querySelector('.work-gallery-stage');
  const cards = [...gallery.querySelectorAll('.work-gallery-card')];
  const title = gallery.querySelector('[data-work-title]');
  const category = gallery.querySelector('[data-work-category]');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = value => Math.max(0, Math.min(cards.length - 1, value));
  const hashIndex = /^#work-(\d+)$/.exec(location.hash);
  let selected = hashIndex ? clamp(Number(hashIndex[1]) - 1) : 1;
  let position = selected;
  let target = selected;
  let frameId = 0;
  let width = stage.clientWidth;
  let height = stage.clientHeight;
  let wheelSum = 0;
  let lastWheel = 0;
  let wheelLock = 0;
  let drag = null;
  let suppressClick = false;
  let lastFrame = 0;

  function updateSelection(index) {
    selected = ((Math.round(index) % cards.length) + cards.length) % cards.length;
    const card = cards[selected];
    title.textContent = card.dataset.title;
    category.textContent = card.dataset.category;
    gallery.dataset.activeIndex = selected;
    cards.forEach((item, i) => {
      const gap = Math.abs(i - selected); const nearby = Math.min(gap, cards.length - gap) <= 1;
      item.inert = !nearby;
      item.querySelector('.work-artwork').tabIndex = i === selected ? 0 : -1;
      item.querySelector('.work-artwork').setAttribute('aria-label', `View ${item.dataset.title} case study, project ${i + 1} of ${cards.length}`);
    });
    try { history.replaceState(null, '', `#work-${String(selected + 1).padStart(2, '0')}`); } catch (_) { /* File previews may restrict history updates. */ }
  }

  function paint(now = 0) {
    frameId = 0;
    const elapsed = lastFrame ? Math.min(64, now - lastFrame) : 16.67;
    lastFrame = now;
    position += (target - position) * (reduceMotion.matches ? 1 : 1 - Math.exp(-elapsed / 110));
    if (Math.abs(target - position) < .001) position = target;
    const mobile = width < 801;
    const spacing = width * .37;
    cards.forEach((card, i) => {
      const distance = ((i - position + cards.length * 1.5) % cards.length + cards.length) % cards.length - cards.length / 2;
      const scale = 1 - Math.min(.36, Math.abs(distance) * .36);
      const x = distance * spacing;
      const y = 0;
      card.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, 0) scale(${scale})`;
      card.style.opacity = Math.max(.2, 1 - Math.abs(distance) * .2);
      card.style.filter = `blur(${Math.min(6, Math.abs(distance) * 6)}px)`;
      card.style.visibility = Math.abs(distance) > 1.15 ? 'hidden' : 'visible';
      card.style.zIndex = 20 - Math.round(Math.abs(distance) * 3);
    });
    if (position !== target) frameId = requestAnimationFrame(paint);
    else lastFrame = 0;
  }
  function render() { if (!frameId) frameId = requestAnimationFrame(paint); }
  function go(index) {
    const destination = Math.round(index);
    const delta = ((destination - target + cards.length * 1.5) % cards.length + cards.length) % cards.length - cards.length / 2;
    target = Math.round(target + delta);
    updateSelection(target);
    render();
  }
  function step(direction) { go(Math.round(target) + direction); }
  function resize() { width = stage.clientWidth; height = stage.clientHeight; render(); }

  gallery.addEventListener('wheel', event => {
    if (event.ctrlKey || event.target.closest('input')) return;
    const raw = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    const delta = raw * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
    if (!delta) return;
    event.preventDefault();
    const now = performance.now();
    if (now < wheelLock) return;
    if (now - lastWheel > 220 || Math.sign(wheelSum) !== Math.sign(delta)) wheelSum = 0;
    lastWheel = now;
    wheelSum += delta;
    if (Math.abs(wheelSum) >= 45) {
      step(Math.sign(wheelSum));
      wheelSum = 0;
      wheelLock = now + 320;
    }
  }, { passive:false });
  gallery.addEventListener('keydown', event => {
    if (event.target.closest('input,select,textarea') || event.altKey || event.metaKey || event.ctrlKey) return;
    const direction = { ArrowRight:1, ArrowDown:1, PageDown:1, ArrowLeft:-1, ArrowUp:-1, PageUp:-1 }[event.key];
    if (direction) { event.preventDefault(); step(direction); if (event.target.closest('.work-artwork')) cards[selected].querySelector('.work-artwork').focus({preventScroll:true}); }
    else if (event.key === 'Home') { event.preventDefault(); go(0); }
    else if (event.key === 'End') { event.preventDefault(); go(cards.length - 1); }
    else if (event.key === ' ' && !event.target.closest('button,a')) { event.preventDefault(); step(event.shiftKey ? -1 : 1); }
  });
  gallery.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || event.target.closest('.work-gallery-controls,.work-gallery-summary')) return;
    suppressClick = false;
    drag = { id:event.pointerId, x:event.clientX, y:event.clientY, start:target, moved:false };
  });
  gallery.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = drag.x - event.clientX, dy = drag.y - event.clientY;
    const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
    if (Math.abs(delta) < 7 && !drag.moved) return;
    if (!drag.moved) { drag.moved = true; gallery.setPointerCapture(event.pointerId); }
    gallery.classList.add('is-dragging');
    target = drag.start + delta / (width < 801 ? Math.max(height * .6, 150) : width * .5);
    updateSelection(target);
    render();
  });
  function finishDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    suppressClick = drag.moved;
    if (gallery.hasPointerCapture(event.pointerId)) gallery.releasePointerCapture(event.pointerId);
    drag = null;
    gallery.classList.remove('is-dragging');
    go(target);
    setTimeout(() => { suppressClick = false; }, 0);
  }
  gallery.addEventListener('pointerup', finishDrag);
  gallery.addEventListener('pointercancel', finishDrag);
  gallery.addEventListener('lostpointercapture', event => { if (drag) finishDrag(event); });
  cards.forEach(card => card.querySelector('.work-artwork').addEventListener('click', event => { if (suppressClick) event.preventDefault(); }));
  new ResizeObserver(resize).observe(stage);
  reduceMotion.addEventListener('change', render);
  updateSelection(selected);
  resize();
})();