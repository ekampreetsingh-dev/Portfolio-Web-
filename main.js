(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const desktopMQ = window.matchMedia('(min-width: 981px)');

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

  /* header state */
  const header = $('[data-header]');
  let headerScrolled = null;
  const setHeader = () => {
    const next = window.scrollY > 16;
    if (!header || next === headerScrolled) return;
    headerScrolled = next;
    header.classList.toggle('is-scrolled', next);
  };
  setHeader();
  window.addEventListener('scroll', setHeader, { passive: true });

  /* mobile menu */
  const menuBtn = $('[data-menu-btn]');
  const menu = $('[data-menu]');

  const setMenu = (open, restoreFocus = false) => {
    if (!menuBtn || !menu) return;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('no-scroll', open);
    if (!open && restoreFocus) menuBtn.focus({ preventScroll: true });
  };

  if (menuBtn && menu) {
    menuBtn.addEventListener('click', () => {
      setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
    });
    menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false, true);
    });
    document.addEventListener('pointerdown', (event) => {
      if (!menu.classList.contains('is-open')) return;
      if (menu.contains(event.target) || menuBtn.contains(event.target)) return;
      setMenu(false);
    }, { passive: true });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1180 && menu.classList.contains('is-open')) setMenu(false);
    });
  }

  /* scroll reveals */
  const revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* pause offscreen animations */
  if ('IntersectionObserver' in window) {
    const pauseWhenOffscreen = (el, className) => {
      if (!el) return;
      new IntersectionObserver(([entry]) => {
        el.classList.toggle(className, !entry.isIntersecting);
      }).observe(el);
    };
    pauseWhenOffscreen($('.marquee'), 'is-paused');
    pauseWhenOffscreen($('.contact__promise'), 'is-paused');
    pauseWhenOffscreen($('.hero'), 'is-paused');
    pauseWhenOffscreen($('.band'), 'is-paused');
    pauseWhenOffscreen($('.constellation'), 'is-paused');
  }

  /* tech constellation */
  const constellation = $('[data-constellation]');
  if (constellation) {
    const stage = $('[data-orbit-stage]', constellation);
    const outerRing = $('.orbit--outer', constellation);
    const innerRing = $('.orbit--inner', constellation);
    const core = $('.constellation__core', constellation);
    const wires = $('[data-orbit-wires]', constellation);
    const coreLabel = $('[data-core-label]', constellation);
    const nodes = $$('.node', constellation);
    const smallMQ = window.matchMedia('(max-width: 640px)');
    const idleLabel = coreLabel ? coreLabel.textContent : '';

    if (stage && outerRing && innerRing && core && nodes.length) {
      let hovered = null;
      let locked = null;

      const lines = nodes.map(() => {
        if (!wires) return null;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('class', 'wire');
        wires.appendChild(line);
        return line;
      });

      const paint = () => {
        const active = hovered || locked;
        nodes.forEach((node, index) => {
          const on = node === active;
          node.classList.toggle('is-active', on);
          if (lines[index]) lines[index].classList.toggle('is-active', on);
        });
        if (coreLabel) coreLabel.textContent = active ? $('.node__name', active).textContent : idleLabel;
        constellation.classList.toggle('has-active', Boolean(active));
      };

      let frame = 0;
      const layout = () => {
        frame = 0;
        const width = stage.clientWidth;
        const height = stage.clientHeight;
        if (!width || !height) return;
        const cx = width / 2;
        const cy = height / 2;
        const outerR = outerRing.offsetWidth / 2;
        const innerR = innerRing.offsetWidth / 2;
        const coreR = core.offsetWidth / 2;
        const compact = smallMQ.matches;
        nodes.forEach((node, index) => {
          const angle = ((Number(node.dataset.angle) || 0) * Math.PI) / 180;
          const radius = node.dataset.ring === 'outer' ? outerR : innerR;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          node.style.left = x.toFixed(1) + 'px';
          node.style.top = y.toFixed(1) + 'px';
          node.dataset.tipY = y < cy ? 'down' : 'up';
          node.dataset.tipX = x < width * 0.34 ? 'left' : x > width * 0.66 ? 'right' : 'center';
          const line = lines[index];
          if (line) {
            const start = coreR + (compact ? 10 : 14);
            const end = radius - (compact ? 6 : 9);
            line.setAttribute('x1', (cx + Math.cos(angle) * start).toFixed(1));
            line.setAttribute('y1', (cy + Math.sin(angle) * start).toFixed(1));
            line.setAttribute('x2', (cx + Math.cos(angle) * end).toFixed(1));
            line.setAttribute('y2', (cy + Math.sin(angle) * end).toFixed(1));
          }
        });
        if (wires) {
          wires.setAttribute('viewBox', `0 0 ${width} ${height}`);
          wires.setAttribute('width', width);
          wires.setAttribute('height', height);
        }
        stage.classList.add('is-ready');
      };
      const relayout = () => {
        if (!frame) frame = requestAnimationFrame(layout);
      };

      if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(stage);
      else window.addEventListener('resize', relayout, { passive: true });
      layout();

      nodes.forEach((node) => {
        const btn = $('.node__btn', node);
        if (!btn) return;
        node.addEventListener('pointerenter', (event) => {
          if (event.pointerType === 'mouse') {
            hovered = node;
            paint();
          }
        });
        node.addEventListener('pointerleave', (event) => {
          if (event.pointerType === 'mouse') {
            hovered = null;
            paint();
          }
        });
        btn.addEventListener('focus', () => { hovered = node; paint(); });
        btn.addEventListener('blur', () => {
          if (hovered === node) {
            hovered = null;
            paint();
          }
        });
        btn.addEventListener('click', (event) => {
          const touch = event.pointerType ? event.pointerType !== 'mouse' : !finePointer;
          if (!touch) return;
          if (locked === node) {
            locked = null;
            hovered = null;
            btn.blur();
          } else {
            locked = node;
          }
          paint();
        });
      });

      document.addEventListener('pointerdown', (event) => {
        if (!locked) return;
        const target = event.target instanceof Element ? event.target : null;
        const hit = target ? target.closest('.node') : null;
        if (hit && constellation.contains(hit)) return;
        locked = null;
        paint();
      }, { passive: true });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && locked) {
          locked = null;
          paint();
        }
      });

      /* cursor spotlight */
      const spot = $('[data-orbit-spot]', constellation);
      if (spot && finePointer && !reduceMotion) {
        let raf = 0;
        let sx = 50;
        let sy = 42;
        stage.addEventListener('pointermove', (event) => {
          const rect = stage.getBoundingClientRect();
          sx = ((event.clientX - rect.left) / rect.width) * 100;
          sy = ((event.clientY - rect.top) / rect.height) * 100;
          if (!raf) {
            raf = requestAnimationFrame(() => {
              spot.style.setProperty('--mx', sx.toFixed(1) + '%');
              spot.style.setProperty('--my', sy.toFixed(1) + '%');
              raf = 0;
            });
          }
        }, { passive: true });
      }
    }
  }

  /* subtle hero parallax */
  const hero = $('.hero');
  const figure = $('[data-parallax]');
  if (hero && figure && !reduceMotion && finePointer && desktopMQ.matches) {
    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    const apply = () => {
      figure.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
      frame = 0;
    };
    hero.addEventListener('pointermove', (event) => {
      const rect = hero.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 16;
      targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 10;
      if (!frame) frame = requestAnimationFrame(apply);
    });
    hero.addEventListener('pointerleave', () => {
      targetX = 0;
      targetY = 0;
      if (!frame) frame = requestAnimationFrame(apply);
    });
  }

  /* hero spotlight follows the cursor (desktop) */
  const spot = $('[data-spot]');
  if (hero && spot && !reduceMotion && finePointer && desktopMQ.matches) {
    let raf = 0;
    let px = 0;
    let py = 0;
    hero.addEventListener('pointermove', (event) => {
      const rect = hero.getBoundingClientRect();
      px = event.clientX - rect.left;
      py = event.clientY - rect.top;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          spot.style.setProperty('--sx', px + 'px');
          spot.style.setProperty('--sy', py + 'px');
          raf = 0;
        });
      }
    }, { passive: true });
  }

  /* custom cursor: hollow orange ring that morphs on hover, precise dot, orange aura */
  const cursorEl = $('[data-cursor-root]');
  if (cursorEl && finePointer) {
    const dotEl = $('[data-cursor-dot]', cursorEl);
    const ringEl = $('[data-cursor-ring]', cursorEl);
    const textEl = $('[data-cursor-text]', cursorEl);
    const TARGETS = 'a, button, [data-cursor], input, textarea, select';
    let px = -100;
    let py = -100;
    let rx = px;
    let ry = py;
    let frame = 0;
    let lastTs = 0;
    let scrollFrame = 0;
    let shown = false;
    let lastTarget = null;

    const placeDot = () => {
      dotEl.style.transform = 'translate3d(' + px + 'px, ' + py + 'px, 0) translate(-50%, -50%)';
      textEl.style.transform = 'translate3d(' + (px + 22) + 'px, ' + (py + 20) + 'px, 0)';
    };

    const placeRing = () => {
      const dx = px - rx;
      const dy = py - ry;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const t = Math.min(dist / 130, 1);
      const sx = (1 + t * 0.26) * (1 + t * 0.2);
      const sy = (1 + t * 0.26) * (1 - t * 0.14);
      const angle = dist > 2 ? Math.atan2(dy, dx) * 57.2958 : 0;
      ringEl.style.transform = 'translate3d(' + rx + 'px, ' + ry + 'px, 0) translate(-50%, -50%) rotate(' + angle + 'deg) scale(' + sx.toFixed(3) + ', ' + sy.toFixed(3) + ')';
    };

    const glide = (ts) => {
      const dt = lastTs ? Math.min(50, ts - lastTs) : 16.7;
      lastTs = ts;
      const k = 1 - Math.pow(0.78, dt / 16.7);
      rx += (px - rx) * k;
      ry += (py - ry) * k;
      placeRing();
      if (Math.abs(px - rx) > 0.4 || Math.abs(py - ry) > 0.4) {
        frame = requestAnimationFrame(glide);
      } else {
        rx = px;
        ry = py;
        placeRing();
        frame = 0;
        lastTs = 0;
      }
    };

    const start = () => {
      if (!frame) frame = requestAnimationFrame(glide);
    };

    const setTarget = (target) => {
      if (target === lastTarget) return;
      lastTarget = target;
      const isField = Boolean(target && target.matches('input, textarea, select'));
      let label = '';
      if (target) {
        if (isField) label = 'Type';
        else if (target.classList.contains('node__btn')) label = 'Inspect';
        else label = target.getAttribute('data-cursor') || (target.tagName === 'BUTTON' ? 'Click' : 'Open');
      }
      textEl.textContent = label;
      cursorEl.classList.toggle('is-text', isField);
      cursorEl.classList.toggle('is-link', Boolean(target) && !isField);
    };

    const resolveAtPointer = () => {
      const el = document.elementFromPoint(px, py);
      setTarget(el instanceof Element ? el.closest(TARGETS) : null);
    };

    document.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      px = event.clientX;
      py = event.clientY;
      if (!shown) {
        shown = true;
        rx = px;
        ry = py;
        document.body.classList.add('has-cursor');
      }
      placeDot();
      start();
    }, { passive: true });

    document.addEventListener('pointerover', (event) => {
      if (event.pointerType === 'touch') return;
      setTarget(event.target instanceof Element ? event.target.closest(TARGETS) : null);
    }, { passive: true });

    window.addEventListener('scroll', () => {
      if (!shown || scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        resolveAtPointer();
      });
    }, { passive: true });

    document.documentElement.addEventListener('pointerleave', () => {
      document.body.classList.remove('has-cursor');
      setTarget(null);
      shown = false;
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
        lastTs = 0;
      }
    });
  }

  /* orange cursor aura that follows the pointer */
  const auraCanvas = $('[data-aura-field]');
  const auraCtx = auraCanvas && finePointer && auraCanvas.getContext ? auraCanvas.getContext('2d') : null;
  if (auraCtx) {
    let vw = 1;
    let vh = 1;
    let raf = 0;
    let target = 0;
    let strength = 0;
    let px = -9999;
    let py = -9999;
    let lastMove = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      vw = window.innerWidth;
      vh = window.innerHeight;
      auraCanvas.width = Math.round(vw * dpr);
      auraCanvas.height = Math.round(vh * dpr);
      auraCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const paint = (now) => {
      raf = 0;
      strength += (target - strength) * 0.14;
      if (strength < 0.012 && target === 0) {
        auraCtx.clearRect(0, 0, vw, vh);
        auraCanvas.classList.remove('is-active');
        return;
      }
      auraCanvas.classList.add('is-active');
      auraCtx.clearRect(0, 0, vw, vh);
      auraCtx.globalCompositeOperation = 'lighter';

      const pulse = 0.94 + 0.06 * Math.sin(now * 0.0021);
      const auraRadius = 200 * pulse;
      const aura = auraCtx.createRadialGradient(px, py, 0, px, py, auraRadius);
      aura.addColorStop(0, 'rgba(255,140,60,' + (0.34 * strength).toFixed(3) + ')');
      aura.addColorStop(0.28, 'rgba(255,110,26,' + (0.24 * strength).toFixed(3) + ')');
      aura.addColorStop(0.62, 'rgba(255,87,0,' + (0.12 * strength).toFixed(3) + ')');
      aura.addColorStop(1, 'rgba(255,87,0,0)');
      auraCtx.fillStyle = aura;
      auraCtx.beginPath();
      auraCtx.arc(px, py, auraRadius, 0, Math.PI * 2);
      auraCtx.fill();

      if (target === 1 ? now - lastMove < 1500 : strength >= 0.012) raf = requestAnimationFrame(paint);
    };

    const start = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };

    const onMove = (event) => {
      if (event.pointerType === 'touch') return;
      target = 1;
      px = event.clientX;
      py = event.clientY;
      lastMove = performance.now();
      start();
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => {
      target = 0;
      start();
    });
  }

  /* magnetic buttons */
  const magnets = $$('[data-magnetic]');
  if (magnets.length && finePointer && !reduceMotion) {
    magnets.forEach((el) => {
      let raf = 0;
      let mx = 0;
      let my = 0;
      const apply = () => {
        raf = 0;
        el.style.transform = `translate3d(${mx.toFixed(2)}px, ${my.toFixed(2)}px, 0)`;
      };
      el.addEventListener('pointermove', (event) => {
        const rect = el.getBoundingClientRect();
        mx = (event.clientX - rect.left - rect.width / 2) * 0.16;
        my = (event.clientY - rect.top - rect.height / 2) * 0.3;
        if (!raf) raf = requestAnimationFrame(apply);
      });
      el.addEventListener('pointerleave', () => {
        if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
        el.style.transform = '';
      });
    });
  }

  /* pointer tilt on cards (desktop) */
  const tiltCards = $$('[data-tilt]');
  if (tiltCards.length && finePointer && !reduceMotion && desktopMQ.matches) {
    tiltCards.forEach((card) => {
      let raf = 0;
      let rx = 0;
      let ry = 0;
      let gx = 0;
      let gy = 0;
      const apply = () => {
        raf = 0;
        card.style.setProperty('--gx', gx + 'px');
        card.style.setProperty('--gy', gy + 'px');
        card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
      };
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        gx = Math.round(event.clientX - rect.left);
        gy = Math.round(event.clientY - rect.top);
        rx = (-py * 4).toFixed(2);
        ry = (px * 5).toFixed(2);
        if (!raf) raf = requestAnimationFrame(apply);
      });
      card.addEventListener('pointerleave', () => {
        if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
        card.style.transform = '';
      });
    });
    desktopMQ.addEventListener('change', (event) => {
      if (!event.matches) tiltCards.forEach((card) => { card.style.transform = ''; });
    });
  }

  /* hero constellation field (desktop only) */
  const field = $('[data-field]');
  if (field && field.getContext && !reduceMotion && finePointer) {
    const ctx = field.getContext('2d');
    const heroEl = field.closest('.hero');
    let width = 0;
    let height = 0;
    let dots = [];
    let raf = 0;
    let live = false;
    let mx = -999;
    let my = -999;
    let lastDraw = 0;
    const frameMs = 1000 / 30;

    const resize = () => {
      if (!desktopMQ.matches) {
        width = 0;
        height = 0;
        return;
      }
      const rect = field.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = rect.width;
      height = rect.height;
      field.width = Math.round(width * dpr);
      field.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(22, Math.min(58, Math.round((width * height) / 30000)));
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.3 + 0.5
      }));
    };

    const draw = (time = 0) => {
      raf = 0;
      if (!width || !height) return;
      if (live && time - lastDraw < frameMs) {
        raf = requestAnimationFrame(draw);
        return;
      }
      lastDraw = time;
      ctx.clearRect(0, 0, width, height);

      const dotPath = new Path2D();
      for (const dot of dots) {
        dot.x += dot.vx;
        dot.y += dot.vy;
        if (dot.x < -20) dot.x = width + 20;
        if (dot.x > width + 20) dot.x = -20;
        if (dot.y < -20) dot.y = height + 20;
        if (dot.y > height + 20) dot.y = -20;

        if (mx > -500) {
          const dx = dot.x - mx;
          const dy = dot.y - my;
          const d2 = dx * dx + dy * dy;
          if (d2 < 15000 && d2 > 1) {
            const force = (1 - d2 / 15000) * 1.7;
            const dist = Math.sqrt(d2);
            dot.x += (dx / dist) * force;
            dot.y += (dy / dist) * force;
          }
        }

        dotPath.moveTo(dot.x + dot.r, dot.y);
        dotPath.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
      }
      ctx.fillStyle = 'rgba(255,237,225,.5)';
      ctx.fill(dotPath);

      const buckets = new Map();
      const addLine = (x1, y1, x2, y2, color, alpha) => {
        const a = Math.round(alpha * 50) / 50;
        if (a <= 0) return;
        const key = color + a;
        let bucket = buckets.get(key);
        if (!bucket) {
          bucket = { path: new Path2D(), color, alpha: a };
          buckets.set(key, bucket);
        }
        bucket.path.moveTo(x1, y1);
        bucket.path.lineTo(x2, y2);
      };

      for (let i = 0; i < dots.length; i++) {
        const a = dots[i];
        for (let j = i + 1; j < dots.length; j++) {
          const b = dots[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 16900) addLine(a.x, a.y, b.x, b.y, '255,196,164', (1 - d2 / 16900) * 0.16);
        }
        if (mx > -500) {
          const dx = a.x - mx;
          const dy = a.y - my;
          const d2 = dx * dx + dy * dy;
          if (d2 < 32400) addLine(a.x, a.y, mx, my, '255,122,31', (1 - d2 / 32400) * 0.32);
        }
      }

      ctx.lineWidth = 1;
      buckets.forEach((bucket) => {
        ctx.strokeStyle = `rgba(${bucket.color},${bucket.alpha})`;
        ctx.stroke(bucket.path);
      });

      if (live) raf = requestAnimationFrame(draw);
    };

    const start = () => {
      if (live || !desktopMQ.matches) return;
      live = true;
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const stop = () => {
      live = false;
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    const resizeSoon = () => {
      resize();
      if (live) {
        stop();
        start();
      }
    };

    resize();
    start();

    if (heroEl) {
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting && !document.hidden) start();
          else stop();
        }).observe(heroEl);
      }
      heroEl.addEventListener('pointermove', (event) => {
        const rect = field.getBoundingClientRect();
        mx = event.clientX - rect.left;
        my = event.clientY - rect.top;
      }, { passive: true });
      heroEl.addEventListener('pointerleave', () => {
        mx = -999;
        my = -999;
      });
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else start();
    });
    desktopMQ.addEventListener('change', (event) => {
      if (event.matches) {
        resizeSoon();
        start();
      } else {
        stop();
      }
    });
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resizeSoon, 180);
    }, { passive: true });
  }

  /* mobile dock: scroll progress + spy + auto-hide (mobile only) */
  const dock = $('[data-dock]');
  if (dock) {
    const bar = $('[data-dock-bar]', dock);
    const links = $$('[data-dock-link]', dock);
    const pairs = links.map((link) => {
      const id = (link.getAttribute('href') || '').slice(1);
      const el = id === 'home' ? $('.hero') : document.getElementById(id);
      return el ? { link, el } : null;
    }).filter(Boolean);
    const mobileMQ = window.matchMedia('(max-width: 980px)');

    let tops = [];
    let lastY = window.scrollY;
    let scrollRaf = 0;
    let measureRaf = 0;
    let idleTimer = 0;
    let activeLink = null;
    let bound = false;
    let ro = null;

    const setActive = (link) => {
      if (!link || link === activeLink) return;
      activeLink = link;
      pairs.forEach((pair) => {
        const isActive = pair.link === link;
        pair.link.classList.toggle('is-active', isActive);
        if (isActive) pair.link.setAttribute('aria-current', 'location');
        else pair.link.removeAttribute('aria-current');
      });
    };

    const measure = () => {
      measureRaf = 0;
      if (!mobileMQ.matches) return;
      tops = pairs.map((pair) => pair.el.getBoundingClientRect().top + window.scrollY);
    };
    const scheduleMeasure = () => {
      if (!mobileMQ.matches || measureRaf) return;
      measureRaf = requestAnimationFrame(measure);
    };

    const onScroll = () => {
      scrollRaf = 0;
      if (!mobileMQ.matches) return;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.width = (max > 0 ? Math.min(1, Math.max(0, y / max)) * 100 : 0) + '%';

      if (pairs.length && tops.length) {
        const probe = y + window.innerHeight * 0.42;
        let index = 0;
        for (let i = 0; i < tops.length; i++) if (tops[i] <= probe) index = i;
        setActive(pairs[index].link);
      }

      if (y > lastY + 8 && y > 360) dock.classList.add('is-hidden');
      else if (y < lastY - 8 || y < 200) dock.classList.remove('is-hidden');
      lastY = y;

      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => dock.classList.remove('is-hidden'), 520);
    };
    const onScrollEvent = () => {
      if (!scrollRaf) scrollRaf = requestAnimationFrame(onScroll);
    };
    const onResize = () => {
      scheduleMeasure();
      onScrollEvent();
    };

    const bind = () => {
      if (mobileMQ.matches) {
        if (bound) return;
        bound = true;
        lastY = window.scrollY;
        measure();
        window.addEventListener('scroll', onScrollEvent, { passive: true });
        window.addEventListener('resize', onResize, { passive: true });
        if ('ResizeObserver' in window) {
          ro = new ResizeObserver(scheduleMeasure);
          ro.observe(document.body);
        }
        dock.classList.remove('is-hidden');
        onScroll();
      } else if (bound) {
        bound = false;
        window.removeEventListener('scroll', onScrollEvent);
        window.removeEventListener('resize', onResize);
        if (ro) {
          ro.disconnect();
          ro = null;
        }
        clearTimeout(idleTimer);
        dock.classList.remove('is-hidden');
      }
    };

    mobileMQ.addEventListener('change', bind);
    bind();
  }

  /* live GitHub repositories (loaded when the section approaches) */
  const repoGrid = $('[data-repos]');
  const repoDots = $('[data-repo-dots]');
  const langColors = {
    TypeScript: '#3178C6', JavaScript: '#F1E05A', HTML: '#E34C26',
    CSS: '#563D7C', Python: '#3572A5', SCSS: '#C6538C', Shell: '#89E051'
  };

  const repoCard = (repo) => {
    const card = document.createElement('article');
    card.className = 'repo-card';

    const top = document.createElement('div');
    top.className = 'repo-card__top';
    top.innerHTML = '<span class="repo-card__icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5V4.5Z"/><path d="M4 4.5A2.5 2.5 0 0 0 6.5 7H20"/></svg></span><span class="repo-card__live"><span class="status-dot"></span>' + (repo.homepage ? 'Live' : 'Code') + '</span>';

    const title = document.createElement('h3');
    title.textContent = repo.name;

    const desc = document.createElement('p');
    desc.textContent = repo.description || 'No description yet — see the repository for details.';

    const foot = document.createElement('div');
    foot.className = 'repo-card__foot';

    const lang = document.createElement('span');
    lang.className = 'lang';
    const dot = document.createElement('i');
    dot.style.setProperty('--lang', langColors[repo.language] || '#8A8A8A');
    lang.append(dot, document.createTextNode(repo.language || 'Repo'));
    foot.append(lang);

    if (repo.stargazers_count > 0) {
      const stars = document.createElement('span');
      stars.textContent = '★ ' + repo.stargazers_count;
      foot.append(stars);
    }

    const link = document.createElement('a');
    link.href = repo.html_url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Open ↗';
    link.setAttribute('aria-label', 'Open ' + repo.name + ' on GitHub');
    foot.append(link);

    card.append(top, title, desc, foot);
    return card;
  };

  const syncDots = () => {
    if (!repoGrid || !repoDots) return;
    const cards = Array.from(repoGrid.children).filter((node) => node.classList.contains('repo-card'));
    if (!cards.length || !repoDots.children.length) return;
    const base = cards[0].offsetLeft;
    let active = 0;
    cards.forEach((card, index) => {
      if (Math.abs(card.offsetLeft - base - repoGrid.scrollLeft) < Math.abs(cards[active].offsetLeft - base - repoGrid.scrollLeft)) active = index;
    });
    Array.from(repoDots.children).forEach((dot, index) => {
      dot.classList.toggle('is-active', index === active);
    });
  };

  const buildDots = () => {
    if (!repoGrid || !repoDots) return;
    const count = Array.from(repoGrid.children).filter((node) => node.classList.contains('repo-card')).length;
    repoDots.replaceChildren(...Array.from({ length: count }, () => document.createElement('span')));
    syncDots();
  };

  if (repoGrid) {
    buildDots();
    if (window.MutationObserver) new MutationObserver(buildDots).observe(repoGrid, { childList: true });

    let dotRaf = 0;
    repoGrid.addEventListener('scroll', () => {
      if (!dotRaf) {
        dotRaf = requestAnimationFrame(() => {
          dotRaf = 0;
          syncDots();
        });
      }
    }, { passive: true });

    let requested = false;
    const loadRepos = () => {
      if (requested) return;
      requested = true;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      fetch('https://api.github.com/users/ekampreetsingh-dev/repos?sort=updated&per_page=6', {
        headers: { Accept: 'application/vnd.github+json' },
        signal: controller.signal
      })
        .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
        .then((repos) => {
          if (!Array.isArray(repos) || repos.length < 3) return;
          const cards = repos.filter((repo) => !repo.fork && repo.name !== 'Portfolio-Web').slice(0, 3).map(repoCard);
          if (cards.length === 3) repoGrid.replaceChildren(...cards);
        })
        .catch(() => { /* static fallback already in the markup */ })
        .finally(() => clearTimeout(timer));
    };

    const githubSection = $('#github');
    if ('IntersectionObserver' in window && githubSection) {
      const io = new IntersectionObserver((entries, observer) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          loadRepos();
        }
      }, { rootMargin: '600px 0px' });
      io.observe(githubSection);
    } else {
      loadRepos();
    }
  }

  /* contact form -> mailto */
  const form = $('[data-contact-form]');
  const formNote = $('[data-form-note]');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const name = String(data.get('name') || '').trim();
      const email = String(data.get('email') || '').trim();
      const subject = String(data.get('subject') || '').trim() || `Portfolio enquiry from ${name}`;
      const message = String(data.get('message') || '').trim();
      const body = `Name: ${name}\nEmail: ${email}\n\n${message}`;
      if (formNote) formNote.textContent = 'Opening your mail app…';
      window.location.href = 'mailto:ekampreetsingh25111@gmail.com'
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(body);
    });
  }

  /* year */
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
})();
