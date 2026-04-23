/* ============================================================
   RUBIK'S CUBE GUIDE — Horizontal Slideshow Controller
   Handles: slide navigation (wheel, keys, touch, clicks),
   nav highlighting, dot indicators, copy-to-clipboard.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  const wrapper = document.getElementById('slides-wrapper');
  const slides = document.querySelectorAll('.slide');
  const navLinks = document.querySelectorAll('.nav-links a[data-slide]');
  const indicators = document.getElementById('slide-indicators');
  const arrowPrev = document.getElementById('arrow-prev');
  const arrowNext = document.getElementById('arrow-next');
  const toggle = document.getElementById('nav-toggle');
  const navLinksEl = document.getElementById('nav-links');

  const TOTAL = slides.length;
  let current = 0;
  let isTransitioning = false;

  /* ----------------------------------------------------------
     BUILD DOT INDICATORS
     ---------------------------------------------------------- */
  for (let i = 0; i < TOTAL; i++) {
    const dot = document.createElement('button');
    dot.className = 'slide-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    indicators.appendChild(dot);
  }
  const dots = indicators.querySelectorAll('.slide-dot');

  /* ----------------------------------------------------------
     GO TO SLIDE
     ---------------------------------------------------------- */
  function goTo(index) {
    if (index < 0 || index >= TOTAL || index === current) return;
    isTransitioning = true;
    current = index;
    wrapper.style.transform = `translateX(-${current * 100}vw)`;

    // Update active states
    slides.forEach(s => s.classList.remove('active'));
    slides[current].classList.add('active');

    dots.forEach(d => d.classList.remove('active'));
    dots[current].classList.add('active');

    navLinks.forEach(a => {
      a.classList.remove('active');
      if (parseInt(a.dataset.slide) === current) a.classList.add('active');
    });

    arrowPrev.disabled = current === 0;
    arrowNext.disabled = current === TOTAL - 1;

    // Reset scroll position of new slide
    slides[current].scrollTop = 0;

    setTimeout(() => { isTransitioning = false; }, 750);
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  // Init
  goTo(0);

  /* ----------------------------------------------------------
     MOUSE WHEEL — horizontal navigation
     Only switch slides when the current slide is NOT scrollable
     or is at its scroll boundary.
     ---------------------------------------------------------- */
  document.addEventListener('wheel', (e) => {
    if (isTransitioning) return;
    const slide = slides[current];
    const scrollable = slide.scrollHeight > slide.clientHeight + 5;

    if (scrollable) {
      const atTop = slide.scrollTop <= 0;
      const atBottom = slide.scrollTop + slide.clientHeight >= slide.scrollHeight - 5;

      if (e.deltaY > 0 && !atBottom) return; // scrolling down, not at bottom
      if (e.deltaY < 0 && !atTop) return;    // scrolling up, not at top
    }

    // Threshold to avoid accidental triggers
    if (Math.abs(e.deltaY) < 30) return;

    if (e.deltaY > 0) next();
    else prev();
  }, { passive: true });

  /* ----------------------------------------------------------
     KEYBOARD NAVIGATION
     ---------------------------------------------------------- */
  document.addEventListener('keydown', (e) => {
    if (isTransitioning) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); next(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prev(); }
  });

  /* ----------------------------------------------------------
     TOUCH SWIPE
     ---------------------------------------------------------- */
  let touchStartX = 0;
  let touchStartY = 0;

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (isTransitioning) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    // Only trigger horizontal swipe if it's more horizontal than vertical
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
      if (dx < 0) next();
      else prev();
    }
  }, { passive: true });

  /* ----------------------------------------------------------
     BUTTON / NAV CLICK HANDLERS
     ---------------------------------------------------------- */
  arrowPrev.addEventListener('click', prev);
  arrowNext.addEventListener('click', next);

  navLinks.forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      goTo(parseInt(a.dataset.slide));
      // Close mobile nav
      toggle.classList.remove('open');
      navLinksEl.classList.remove('open');
    });
  });

  // Hero CTA buttons with data-goto
  document.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      goTo(parseInt(btn.dataset.goto));
    });
  });

  /* ----------------------------------------------------------
     MOBILE NAV TOGGLE
     ---------------------------------------------------------- */
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('open');
    navLinksEl.classList.toggle('open');
  });

  /* ----------------------------------------------------------
     COPY ALGORITHM TO CLIPBOARD
     ---------------------------------------------------------- */
  const toast = document.getElementById('toast');
  let toastTimeout;

  const showToast = (msg) => {
    toast.textContent = msg || 'Copied to clipboard!';
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 2000);
  };

  document.querySelectorAll('code.copyable').forEach(code => {
    code.addEventListener('click', () => {
      const text = code.textContent.trim();
      navigator.clipboard.writeText(text).then(() => {
        showToast(`Copied: ${text}`);
      }).catch(() => {
        const tmp = document.createElement('textarea');
        tmp.value = text;
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand('copy');
        document.body.removeChild(tmp);
        showToast(`Copied: ${text}`);
      });
    });
  });

});
