(() => {
  'use strict';

  const root = document.documentElement;
  const themeButton = document.querySelector('.theme-toggle');
  const themeIcon = document.querySelector('.theme-icon');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  let storedTheme = null;
  try { storedTheme = localStorage.getItem('mahmoud-theme'); } catch (_) { /* Theme still works for this visit. */ }
  if (storedTheme === 'light' || storedTheme === 'dark') root.dataset.theme = storedTheme;

  function updateThemeControl() {
    const light = root.dataset.theme === 'light';
    themeButton.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
    themeIcon.textContent = light ? '☾' : '☼';
    themeMeta?.setAttribute('content', light ? '#f6f8fb' : '#08111f');
  }
  updateThemeControl();
  themeButton.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('mahmoud-theme', root.dataset.theme); } catch (_) { /* Persistence is optional. */ }
    updateThemeControl();
  });

  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  function closeMenu() {
    nav.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation');
  }
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    nav.classList.toggle('is-open', open);
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });

  // Small global motion cues: reading progress, a compact return control, and
  // a pointer-following ambient glow on fine pointers only.
  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.append(progress);
  const backToTop = document.createElement('button');
  backToTop.className = 'back-to-top';
  backToTop.type = 'button';
  backToTop.setAttribute('aria-label', 'Back to top');
  backToTop.innerHTML = '<span aria-hidden="true">↑</span>';
  document.body.append(backToTop);
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  let scrollQueued = false;
  const updateScrollDecor = () => {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    progress.style.transform = `scaleX(${Math.min(1, window.scrollY / maxScroll)})`;
    document.body.classList.toggle('has-scrolled', window.scrollY > 28);
    backToTop.classList.toggle('is-visible', window.scrollY > 650);
    scrollQueued = false;
  };
  window.addEventListener('scroll', () => {
    if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateScrollDecor); }
  }, { passive: true });
  updateScrollDecor();
  if (window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let pointerQueued = false;
    window.addEventListener('pointermove', event => {
      if (pointerQueued) return;
      pointerQueued = true;
      requestAnimationFrame(() => {
        root.style.setProperty('--pointer-x', `${event.clientX}px`);
        root.style.setProperty('--pointer-y', `${event.clientY}px`);
        pointerQueued = false;
      });
    }, { passive: true });
  }

  const navLinks = [...document.querySelectorAll('.nav a[href^="#"]')];
  const observedSections = navLinks.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(link => {
          const active = link.getAttribute('href') === `#${entry.target.id}`;
          link.classList.toggle('active', active);
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-24% 0px -65% 0px', threshold: 0 });
    observedSections.forEach(section => sectionObserver.observe(section));
  }

  const revealTargets = document.querySelectorAll('.section-heading, .about-layout, .facts-grid, .timeline-item, .education-bar, .skill-card, .project-card, .secondary-projects, .leadership-layout, .teaching-card, .event-card, .awards-layout, .award-gallery, .service-card, .gallery-grid, .learning-card, .contact-layout');
  revealTargets.forEach(target => target.classList.add('reveal'));
  let revealObserver = null;
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    revealTargets.forEach(target => revealObserver.observe(target));
  } else {
    revealTargets.forEach(target => target.classList.add('is-visible'));
  }
  document.addEventListener('portfolio:updated', () => {
    document.querySelectorAll('.project-card,.skill-card,.event-card,.service-card,.learning-card,.gallery-item,.award-item,.timeline-item,.leadership-feature,.secondary-project').forEach(target => {
      if (!target.classList.contains('reveal')) target.classList.add('reveal');
      if (revealObserver) revealObserver.observe(target);
      else target.classList.add('is-visible');
    });
  });

  const counters = document.querySelectorAll('.count-up');
  const animateCounter = element => {
    const goal = Number(element.dataset.count);
    const duration = 1100;
    const start = performance.now();
    const tick = now => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = Math.round(goal * eased).toLocaleString('en');
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  window.animatePortfolioCounter = animateCounter;
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const counterObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.65 });
    counters.forEach(counter => counterObserver.observe(counter));
  } else {
    counters.forEach(counter => { counter.textContent = Number(counter.dataset.count).toLocaleString('en'); });
  }

  const projectDetails = {
    medlink: { title: 'MedLink: Smart Health Card System', category: 'Healthcare Technology · IoT · NFC · Graduation Project', description: 'An NFC-based healthcare information system designed to provide quick access to essential patient health information through a smart health card. The project received an Excellent grade.', notes: ['Led the project team.', 'Designed and developed the project database.', 'Developed the NFC system and integrated the card with the healthcare information system.', '3rd Place at the Military Production Scientific Exhibition (IoT category); Top 10 at Ebdaa; participant in Made in Egypt.'] },
    maher: { title: 'Maher: Enterprise AI Assistant', category: 'Artificial Intelligence · Product Innovation · ICTI', description: 'An enterprise AI assistant product concept designed to support organizational workflows and intelligent business interactions.', notes: ['Originated the product idea and developed the initial concept.', 'Created the product design.', 'Prepared client presentations and helped communicate the product’s value and capabilities.'] },
    icu: { title: 'El-Miri ICU Management System', category: 'Healthcare Software Development', description: 'A web-based Intensive Care Unit management application with Arabic and English support, a dark theme, ICU management functionality, and database integration.', notes: ['Built with HTML, CSS, JavaScript, Bootstrap, PHP, and MySQL.', 'Project image and presentation materials can be added when available.'] },
    spectro: { title: 'Advanced Spectrophotometer & LIS', category: 'Biomedical Engineering · Laboratory Technology', description: 'An advanced spectrophotometer project integrated with a Laboratory Information System and QR code functionality.', notes: ['Connected laboratory measurement concepts with information-system workflows.', 'Project image and supporting materials can be added when available.'] },
    eeg: { title: 'EEG Signal Processing', category: 'Biomedical Signal Processing · MATLAB', description: 'An application developed to process EEG signals and distinguish between normal and abnormal signal patterns.', notes: ['Implemented as a biomedical signal processing application in MATLAB.', 'Project image and supporting materials can be added when available.'] },
    clinic: { title: 'Clinic Reservation Application', category: 'Additional Engineering Project · C++ GUI', description: 'A clinic reservation application created as a C++ GUI project.', notes: ['Technology: C++.', 'Further project details and images can be added when available.'] },
    hospital: { title: 'Hospital Database', category: 'Additional Engineering Project · SQL', description: 'A hospital database project using SQL.', notes: ['Technology: SQL.', 'Further project details and images can be added when available.'] },
    incubator: { title: 'Smart Incubator', category: 'Additional Engineering Project · Arduino', description: 'A smart incubator project focused on healthcare monitoring.', notes: ['Technology: Arduino.', 'Further project details and images can be added when available.'] },
    infusion: { title: 'Infusion Pump Control System', category: 'Additional Engineering Project · Embedded Systems', description: 'An infusion pump control system developed as an embedded systems project.', notes: ['Further technical specifications and images can be added when available.'] },
    machine: { title: 'Multi-Function Machine', category: 'Additional Engineering Project · PIC Microcontrollers', description: 'A multi-function machine project using PIC microcontrollers.', notes: ['Further technical specifications and images can be added when available.'] }
  };
  const projectDialog = document.querySelector('#project-dialog');
  const dialogTitle = document.querySelector('#dialog-title');
  const dialogCategory = document.querySelector('#dialog-category');
  const dialogDescription = document.querySelector('#dialog-description');
  const dialogList = document.querySelector('#dialog-list');
  function openProject(key) {
    const item = window.PortfolioProjectDetails?.[key] || projectDetails[key];
    if (!item) return;
    dialogTitle.textContent = item.title;
    dialogCategory.textContent = item.category;
    dialogDescription.textContent = item.description;
    dialogList.replaceChildren(...item.notes.map(note => {
      const li = document.createElement('li');
      li.textContent = note;
      return li;
    }));
    const supporting = document.querySelector('#project-dialog .dialog-placeholder');
    supporting.replaceChildren();
    if (Array.isArray(item.images) && item.images.length) {
      const gallery = document.createElement('div');
      gallery.className = 'dialog-gallery';
      item.images.forEach(photo => {
        const image = document.createElement('img');
        image.src = photo.url;
        image.alt = photo.alt || item.title;
        image.loading = 'lazy';
        gallery.append(image);
      });
      supporting.append(gallery);
    }
    if (item.url) {
      try {
        const projectUrl = new URL(item.url, window.location.href);
        if (['http:', 'https:'].includes(projectUrl.protocol)) {
          const link = document.createElement('a');
          link.href = projectUrl.href;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = 'Visit project ↗';
          supporting.append(link);
        }
      } catch (_) { /* Invalid project URLs are not rendered. */ }
    }
    if (!supporting.hasChildNodes()) supporting.textContent = 'PROJECT PHOTOS · CERTIFICATES · PRESENTATION MATERIALS: PLACEHOLDERS';
    projectDialog.showModal();
  }
  function bindProjectCards() {
    document.querySelectorAll('[data-open],.project-card[data-project]').forEach(node => {
      if (node.dataset.projectBound) return;
      node.dataset.projectBound = 'true';
      if (node.matches('[data-open]')) node.addEventListener('click', event => {
        event.stopPropagation();
        openProject(node.dataset.open);
      });
      if (node.matches('.project-card[data-project]')) {
        node.addEventListener('click', event => { if (!event.target.closest('button')) openProject(node.dataset.project); });
        node.addEventListener('keydown', event => {
          if ((event.key === 'Enter' || event.key === ' ') && event.target === node) { event.preventDefault(); openProject(node.dataset.project); }
        });
      }
    });
  }
  bindProjectCards();
  document.addEventListener('portfolio:updated', bindProjectCards);

  const galleryDialog = document.querySelector('#lightbox-dialog');
  const lightboxTitle = document.querySelector('#lightbox-title');
  document.addEventListener('click', event => {
    const item = event.target.closest('[data-lightbox]');
    if (!item) return;
    lightboxTitle.textContent = item.dataset.lightbox;
    const preview = document.querySelector('.lightbox-art');
    let image = preview.querySelector('#lightbox-image');
    const source = item.querySelector('img')?.src;
    if (source) {
      if (!image) { image = document.createElement('img'); image.id = 'lightbox-image'; image.alt = ''; preview.prepend(image); }
      image.src = source;
      image.hidden = false;
    } else if (image) image.hidden = true;
    galleryDialog.showModal();
  });
  document.querySelectorAll('dialog .dialog-close').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  [projectDialog, galleryDialog].forEach(dialog => dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  }));

  document.querySelectorAll('.filter-button').forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    document.querySelectorAll('.filter-button').forEach(control => control.classList.toggle('active', control === button));
    document.querySelectorAll('.gallery-item').forEach(item => {
      item.hidden = filter !== 'all' && item.dataset.category !== filter;
    });
  }));

  const form = document.querySelector('#contact-form');
  form?.addEventListener('submit', event => {
    event.preventDefault();
    const feedback = form.querySelector('.form-feedback');
    feedback.textContent = 'Thanks — the form is ready, but message delivery needs a connected backend or email service.';
  });
})();
