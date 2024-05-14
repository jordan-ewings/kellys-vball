import { auth, session } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js';

import { initHomeContent } from './home.js';
import { initStandingsContent, handleStandingsAdmin } from './standings.js';
import { initScheduleContent, handleScheduleAdmin } from './schedule.js';

/* ------------------------------------------------ */

const navbar = document.querySelector('.navbar');
const navbarNav = document.querySelector('.navbar-nav');
const navbarBorder = document.querySelector('#navbar-border');
const navLinks = document.querySelectorAll('.nav-link');
const mainDiv = document.querySelector('#main');
const sections = document.querySelectorAll('section');
const footer = document.querySelector('footer');
const footerLink = document.querySelector('footer a');
const loadingSpinner = document.querySelector('#loading');
const currentSection = () => document.querySelector('section:not(.d-none)');

/* ------------------------------------------------ */

export const APP = {};

/* ------------------------------------------------ */

document.addEventListener('DOMContentLoaded', async () => {

  await session.init();
  onAuthStateChanged(auth, user => {
    const prevId = session.user ? session.user.uid : null;
    const currId = user ? user.uid : null;
    if (prevId != currId) {
      session.setUserProps(user);
      initUserContent();
    }
  });

  initGlobalContent();
});

/* ------------------------------------------------ */

export function initUserContent() {

  console.log('initUserContent');
  initHomeContent();
  initStandingsContent();
  initScheduleContent();

  footerLink.textContent = session.getLeague().title;
}

export function handleAdminContent() {

  // handleHomeAdmin();
  handleStandingsAdmin();
  handleScheduleAdmin();
}

/* ------------------------------------------------ */

function initGlobalContent() {

  // set up style
  configureStyle();

  // set up nav links
  navLinks.forEach(navLink => {
    navLink.addEventListener('click', (e) => {
      e.preventDefault();
      let name = navLink.id.replace('nav-', '');
      showContent(name);
    });
  });

  // set up footer link
  footerLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentSection().id == 'standings-section') {
      let mainHead = currentSection().querySelector('.main-header');
      let btnBack = mainHead.querySelector('.btn-back:not(.d-none)');
      if (btnBack) {
        btnBack.click();
      }
    }
    navbarNav.querySelector('#nav-index').click();
  });

  // show home content by default
  navbarNav.querySelector('#nav-index').click();
  loadingSpinner.classList.add('d-none');
  mainDiv.classList.remove('d-none');
  footer.classList.remove('d-none');
}

/* ------------------------------------------------ */

function showContent(name) {

  if (navbar.classList.contains('hidden')) navbar.classList.remove('hidden');
  const navLink = document.querySelector('#nav-' + name);
  const section = document.querySelector('#' + name + '-section');

  navbarBorder.style.left = navLink.offsetLeft + 'px';
  navbarBorder.style.width = navLink.offsetWidth + 'px';
  navLinks.forEach(nav => nav.classList.toggle('active', nav == navLink));
  sections.forEach(sec => sec.classList.toggle('d-none', sec != section));

  // footer.classList.toggle('fixed-bottom', name == 'index');

  if (name == 'schedule') {
    const weekFilterContainer = section.querySelector('#week-filter-container');
    const weekBtn = weekFilterContainer.querySelector('button.active');
    weekBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

/* ------------------------------------------------ */

function configureStyle() {

  let mainHeader = document.querySelector('.main-header');
  let insetTop = window.getComputedStyle(mainHeader).getPropertyValue('top');
  if (insetTop == '0px') {
    let style = document.createElement('style');
    document.head.appendChild(style);
    style.sheet.insertRule(`
      .main-header::before {
        background-color: var(--ios-bg-primary);
      }
    `, 0);
  }

  // store device type
  APP.device = 'desktop';
  if (window.innerWidth < 768) APP.device = 'mobile';
  if (window.innerWidth >= 768 && window.innerWidth < 992) APP.device = 'tablet';
}

/* ------------------------------------------------ */
