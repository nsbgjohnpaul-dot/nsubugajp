// Cursor interaction uses the original Figma positions and leaves page controls clickable.
(() => {
  const field = document.querySelector('.about-character-field');
  const stage = document.querySelector('.about-background-stage');
  if (!field || !stage || typeof DOMMatrix !== 'function' || typeof DOMPoint !== 'function') return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const bucketSize = 100;
  const buckets = new Map();
  const active = new Set();
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+<>/*';
  [...field.children].forEach((element, index) => {
    const glyph = { element, index, x:parseFloat(element.style.left), y:parseFloat(element.style.top), original:element.textContent, opacity:element.style.opacity, strength:0 };
    const key = `${Math.floor(glyph.x / bucketSize)},${Math.floor(glyph.y / bucketSize)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(glyph);
  });
  let pointer = null;
  let frame = 0;
  let previousTime = 0;
  function restore(glyph) {
    glyph.element.textContent = glyph.original;
    glyph.element.style.opacity = glyph.opacity;
    glyph.element.style.removeProperty('translate');
    glyph.element.style.removeProperty('color');
    delete glyph.element.dataset.reactive;
    glyph.strength = 0;
    active.delete(glyph);
  }
  function tick(now) {
    if (reduced.matches) { reset(); return; }
    frame = 0;
    const elapsed = previousTime ? Math.min(64, now - previousTime) : 16.67;
    previousTime = now;
    const nearby = new Set();
    let local = null;
    const scaleX = Number(stage.dataset.scaleX) || 1;
    const scaleY = Number(stage.dataset.scaleY) || 1;
    let radius = 125;
    if (pointer && !reduced.matches && !document.hidden) {
      const box = stage.getBoundingClientRect();
      const matrix = new DOMMatrix(getComputedStyle(field).transform);
      local = matrix.inverse().transformPoint(new DOMPoint((pointer.x - box.left) / scaleX, (pointer.y - box.top) / scaleY));
      radius = Math.min(125, box.width * .25);
      const radiusX = radius / scaleX, radiusY = radius / scaleY;
      const lowX = Math.floor((local.x - radiusX) / bucketSize), highX = Math.floor((local.x + radiusX) / bucketSize);
      const lowY = Math.floor((local.y - radiusY) / bucketSize), highY = Math.floor((local.y + radiusY) / bucketSize);
      for (let x = lowX; x <= highX; x++) for (let y = lowY; y <= highY; y++) {
        for (const glyph of buckets.get(`${x},${y}`) || []) {
          if (Math.hypot((glyph.x - local.x) * scaleX, (glyph.y - local.y) * scaleY) < radius) { nearby.add(glyph); active.add(glyph); }
        }
      }
    }
    for (const glyph of active) {
      const dx = local ? (glyph.x - local.x) * scaleX : 0, dy = local ? (glyph.y - local.y) * scaleY : 0;
      const distance = Math.hypot(dx, dy);
      const desired = nearby.has(glyph) ? Math.pow(1 - distance / radius, 1.5) : 0;
      glyph.strength += (desired - glyph.strength) * (1 - Math.exp(-elapsed / 100));
      if (!nearby.has(glyph) && glyph.strength < .008) { restore(glyph); continue; }
      const strength = glyph.strength;
      const angle = local && nearby.has(glyph) ? Math.atan2(dy, dx) : glyph.index * 2.4;
      const drift = strength * 16 * Math.min(scaleX, scaleY);
      glyph.element.style.translate = `${Math.cos(angle) * drift / scaleX}px ${Math.sin(angle) * drift / scaleY + Math.sin(now / 240 + glyph.index) * strength * 3}px`;
      glyph.element.style.opacity = String(Math.min(.88, Number(glyph.opacity) + strength * .65));
      glyph.element.style.color = `rgb(${Math.round(192 - strength * 105)} ${Math.round(192 - strength * 105)} ${Math.round(192 - strength * 105)})`;
      glyph.element.textContent = strength > .12 ? alphabet[(Math.floor(now / 110) + glyph.index * 7) % alphabet.length] : glyph.original;
      glyph.element.dataset.reactive = 'true';
    }
    if (pointer || active.size) frame = requestAnimationFrame(tick);
    else previousTime = 0;
  }
  function start() { if (!frame && !reduced.matches) frame = requestAnimationFrame(tick); }
  function leave() { pointer = null; start(); }
  document.addEventListener('pointermove', event => { if (reduced.matches) return; pointer = { x:event.clientX, y:event.clientY }; start(); }, {passive:true});
  document.documentElement.addEventListener('pointerleave', leave);
  document.addEventListener('pointerup', event => { if (event.pointerType === 'touch') leave(); }, {passive:true});
  document.addEventListener('pointercancel', leave);
  window.addEventListener('blur', leave);
  function reset() { pointer = null; if (frame) cancelAnimationFrame(frame); frame = 0; previousTime = 0; [...active].forEach(restore); }
  reduced.addEventListener('change', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
})();
