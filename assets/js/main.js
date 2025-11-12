/**
 * Custom interactions for the refreshed portfolio layout.
 */
document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('js-enabled');
  const header = document.querySelector('#header');
  const navMenu = document.querySelector('.nav-menu');
  const navToggle = navMenu ? navMenu.querySelector('.nav-toggle') : null;
  const navList = navMenu ? navMenu.querySelector('ul') : null;
  const navLinks = navMenu ? Array.from(navMenu.querySelectorAll('a[href^="#"]')) : [];
  const navSentinel = document.querySelector('.nav-sentinel');
  const mobileQuery = window.matchMedia('(max-width: 992px)');
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter((section) => section instanceof HTMLElement);
  const smoothScrollLinks = Array.from(
    document.querySelectorAll('a[href^="#"]:not([href="#"])')
  );

  const setNavFixedState = (isFixed) => {
    if (!navMenu) return;
    if (mobileQuery.matches) {
      navMenu.classList.remove('is-fixed');
      return;
    }
    navMenu.classList.toggle('is-fixed', Boolean(isFixed));
  };

  const syncNavState = () => {
    if (!navMenu) return;
    const isMobile = mobileQuery.matches;
    const isOpen = navMenu.classList.contains('is-open');

    if (!isMobile) {
      navMenu.classList.remove('is-open');
      navMenu.removeAttribute('aria-expanded');
      navList?.removeAttribute('aria-hidden');
      setNavFixedState(navMenu.classList.contains('is-fixed'));
      if (navToggle) {
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-hidden', 'true');
        const icon = navToggle.querySelector('i');
        if (icon) {
          icon.classList.add('bx-menu');
          icon.classList.remove('bx-x');
        }
      }
    } else {
      navMenu.setAttribute('aria-expanded', String(isOpen));
      navList?.setAttribute('aria-hidden', String(!isOpen));
      navToggle?.setAttribute('aria-expanded', String(isOpen));
      navToggle?.removeAttribute('aria-hidden');
      const icon = navToggle?.querySelector('i');
      if (icon) {
        icon.classList.toggle('bx-menu', !isOpen);
        icon.classList.toggle('bx-x', isOpen);
      }
      navMenu.classList.remove('is-fixed');
    }
  };

  const handleFixedNavFallback = () => {
    if (!navSentinel) return;
    const sentinelTop = navSentinel.getBoundingClientRect().top;
    const shouldFix = sentinelTop <= 48;
    setNavFixedState(shouldFix);
  };

  const connectNavObserver = () => {
    if (!('IntersectionObserver' in window) || !navSentinel) {
      handleFixedNavFallback();
      return null;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const shouldFix = !entry.isIntersecting && entry.boundingClientRect.top <= 0;
          setNavFixedState(shouldFix);
        });
      },
      {
        root: null,
        rootMargin: '-32px 0px 0px 0px',
        threshold: 0
      }
    );

    observer.observe(navSentinel);
    return observer;
  };

  let navObserver = connectNavObserver();

  const refreshNavObserver = () => {
    if (navObserver) {
      navObserver.disconnect();
    }
    navObserver = connectNavObserver();
  };

  syncNavState();

  if (typeof mobileQuery.addEventListener === 'function') {
    mobileQuery.addEventListener('change', () => {
      syncNavState();
      refreshNavObserver();
    });
  } else if (typeof mobileQuery.addListener === 'function') {
    mobileQuery.addListener(() => {
      syncNavState();
      refreshNavObserver();
    });
  }

  if (!navObserver && navSentinel) {
    window.addEventListener('scroll', handleFixedNavFallback);
    window.addEventListener('resize', handleFixedNavFallback);
    handleFixedNavFallback();
  }

  // Smooth scrolling for in-page navigation and hero CTAs
  const prefersReducedMotion =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : { matches: false };

  const scrollToTarget = (target) => {
    const behaviour = prefersReducedMotion.matches ? 'auto' : 'smooth';
    target.scrollIntoView({ behavior: behaviour, block: 'start' });
  };

  smoothScrollLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetId = link.getAttribute('href');
      const target = targetId ? document.querySelector(targetId) : null;
      if (target) {
        event.preventDefault();
        scrollToTarget(target);
        if (navMenu && navMenu.classList.contains('is-open')) {
          navMenu.classList.remove('is-open');
          syncNavState();
        }
      }
    });
  });

  // Toggle navigation visibility on mobile
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('is-open');
      if (isOpen) {
        navMenu.setAttribute('aria-expanded', 'true');
      }
      const icon = navToggle.querySelector('i');
      if (icon) {
        icon.classList.toggle('bx-menu', !isOpen);
        icon.classList.toggle('bx-x', isOpen);
      }
      syncNavState();
    });
  }

  // Highlight the section that is currently visible in the viewport
  const updateActiveNav = () => {
    const fromTop = window.scrollY + 120; // offset to account for hero padding

    let currentSection = null;
    sections.forEach((section) => {
      if (section.offsetTop <= fromTop) {
        currentSection = section;
      }
    });

    navLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (currentSection && href === `#${currentSection.id}`) {
        link.parentElement?.classList.add('active');
      } else {
        link.parentElement?.classList.remove('active');
      }
    });
  };

  updateActiveNav();
  window.addEventListener('scroll', updateActiveNav);

  // Add a subtle header shadow once the user scrolls past the hero
  if (header) {
    const handleHeaderShadow = () => {
      if (window.scrollY > 40) {
        header.classList.add('header-condensed');
      } else {
        header.classList.remove('header-condensed');
      }
    };

    handleHeaderShadow();
    window.addEventListener('scroll', handleHeaderShadow);
  }

  if (mobileQuery.addEventListener) {
    mobileQuery.addEventListener('change', updateActiveNav);
  } else if (mobileQuery.addListener) {
    mobileQuery.addListener(updateActiveNav);
  }
});
