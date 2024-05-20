import { auth, session } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js';

import schedule from './schedule.js';
import standings from './standings.js';
import home from './home.js';

import nav from '../components/Nav.js';

/* ------------------------------------------------ */

const mainDiv = document.querySelector('#main');
const footer = document.querySelector('footer');
const footerLink = document.querySelector('footer a');
const loadingSpinner = document.querySelector('#loading');

/* ------------------------------------------------ */

class App {

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

      if (this.initialized) {
        this.updateUserContent();
        return;
      }

      this.initialized = true;
      this.initUserContent();
      mainDiv.classList.remove('d-none');
      footer.classList.remove('d-none');
      loadingSpinner.classList.add('d-none');
      nav.show('home');
    });

    return this;
  }

  /* ------------------------------------------------ */
  // handle user settings changes

  async setLeague(leagueId) {
    await session.setLeagueProps(leagueId);
    this.initUserContent();
  }

  setAdminControls(value) {
    session.adminControls = value;
    this.updateUserContent();
  }

  setFavTeam(teamName) {
    session.setFavTeam(teamName);
    this.updateUserContent();
  }

  /* ------------------------------------------------ */
  // handle user authentication

  async signIn(password) {
    await session.signIn(password);
  }

  async signOut() {
    await session.signOut();
  }

  /* ------------------------------------------------ */

  getSections() {
    return [home, standings, schedule];
  }

  initUserContent() {

    footerLink.textContent = session.getLeague().title;
    this.getSections().forEach(section => {
      section.init();
    });
  }

  updateUserContent() {

    this.getSections().forEach(section => {
      section.handleOptionsChange();
    });
  }
}

/* ------------------------------------------------ */

const app = new App();
export default app;

/* ------------------------------------------------ */

document.addEventListener('DOMContentLoaded', () => {

  const configureStyle = () => {
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
  };

  configureStyle();
  app.init();
});
