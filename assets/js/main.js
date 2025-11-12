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
  const mobileQuery = window.matchMedia('(max-width: 992px)');
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter((section) => section instanceof HTMLElement);

  const syncNavState = () => {
    if (!navMenu) return;
    const isMobile = mobileQuery.matches;
    const isOpen = navMenu.classList.contains('is-open');

    if (!isMobile) {
      navMenu.classList.remove('is-open');
      navMenu.removeAttribute('aria-expanded');
      navList?.removeAttribute('aria-hidden');
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
    }
  };

  syncNavState();
  if (typeof mobileQuery.addEventListener === 'function') {
    mobileQuery.addEventListener('change', syncNavState);
  } else if (typeof mobileQuery.addListener === 'function') {
    mobileQuery.addListener(syncNavState);
  }

  // Smooth scrolling for all in-page anchors (nav links + hero CTAs)
  const allInPageLinks = Array.from(document.querySelectorAll('a[href^="#"]'));
  allInPageLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetId = link.getAttribute('href');
      const target = targetId ? document.querySelector(targetId) : null;
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  // Sticky navigation on scroll
  let lastScrollY = window.scrollY;
  const stickyThreshold = 100; // Start sticky behavior after scrolling 100px
  
  const handleStickyNav = () => {
    const currentScrollY = window.scrollY;
    
    if (navMenu) {
      if (currentScrollY > stickyThreshold) {
        navMenu.classList.add('sticky');
      } else {
        navMenu.classList.remove('sticky');
      }
    }
    
    lastScrollY = currentScrollY;
  };

  handleStickyNav();
  window.addEventListener('scroll', handleStickyNav, { passive: true });

  // Use IntersectionObserver for reliable navigation pinning across breakpoints
  if (header && navMenu) {
    const observerOptions = {
      root: null,
      threshold: 0,
      rootMargin: '-40px 0px 0px 0px'
    };

    const headerObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          navMenu.classList.add('is-fixed');
          header.classList.add('header-condensed');
        } else {
          navMenu.classList.remove('is-fixed');
          header.classList.remove('header-condensed');
        }
      });
    }, observerOptions);

    headerObserver.observe(header);
  }
});
