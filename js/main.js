import { auth, session } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js';

import { Schedule } from './schedule.js';
import { Standings } from './standings.js';
import { Home } from './home.js';

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

const home = new Home();
const standings = new Standings();
const schedule = new Schedule();

/* ------------------------------------------------ */

class AppInstance {

  constructor() {
    this.initialized = false;
    return this;
  }

  /* ------------------------------------------------ */
  // initialization

  async init() {

    await session.init();

    onAuthStateChanged(auth, user => {
      const prevId = session.user ? session.user.uid : null;
      const currId = user ? user.uid : null;
      if (prevId == currId) return;

      session.setUserProps(user);
      if (!this.initialized) {
        this.initialized = true;
        this.initUserContent();
        this.initGlobalContent();
        this.showContent('index');
      } else {
        this.updateUserContent();
      }
    });

    return this;
  }

  /* ------------------------------------------------ */

  initUserContent() {

    home.init();
    standings.init();
    schedule.init();
    footerLink.textContent = session.getLeague().title;
  }

  updateUserContent() {

    home.handleOptionsChange();
    standings.handleOptionsChange();
    schedule.handleOptionsChange();
  }

  initGlobalContent() {

    this.configureStyle();
    navLinks.forEach(navLink => {
      navLink.addEventListener('click', (e) => {
        e.preventDefault();
        let name = navLink.id.replace('nav-', '');
        this.showContent(name);
      });
    });

    mainDiv.classList.remove('d-none');
    footer.classList.remove('d-none');
    loadingSpinner.classList.add('d-none');
  }

  /* ------------------------------------------------ */

  showContent(name) {

    const navLink = document.querySelector('#nav-' + name);
    navLinks.forEach(nav => nav.classList.toggle('active', nav == navLink));
    navbarBorder.style.left = navLink.offsetLeft + 'px';
    navbarBorder.style.width = navLink.offsetWidth + 'px';

    // run the show/hide methods for each section
    if (name == 'index') {
      home.show();
      standings.hide();
      schedule.hide();
    } else if (name == 'standings') {
      home.hide();
      standings.show();
      schedule.hide();
    } else if (name == 'schedule') {
      home.hide();
      standings.hide();
      schedule.show();
    }

  }

  /* ------------------------------------------------ */

  configureStyle() {

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
  }
}

/* ------------------------------------------------ */

export const app = new AppInstance();

document.addEventListener('DOMContentLoaded', () => app.init());
