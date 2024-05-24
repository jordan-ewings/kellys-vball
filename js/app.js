import { auth, session } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js';

import Home from './home.js';
import Standings from './standings.js';
import Schedule from './schedule.js';

import Nav from './components/Nav.js';

/* ------------------------------------------------ */

const mainDiv = document.querySelector('#main');
const footer = document.querySelector('footer');
const footerLink = document.querySelector('#league-title');
const loadingSpinner = document.querySelector('#loading');

/* ------------------------------------------------ */

export default class App {

  static initialized = false;

  /* ------------------------------------------------ */
  // initialization

  static async init() {

    await session.init();

    onAuthStateChanged(auth, user => {
      // if (session.isSameUser(user)) return;
      console.log('user', user);
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
    });

    return this;
  }

  /* ------------------------------------------------ */
  // handle user settings changes

  static async setLeague(leagueId) {
    await session.setLeagueProps(leagueId);
    this.initUserContent();
  }

  static setAdminControls(value) {
    session.setAdminControls(value);
    this.updateUserContent();
  }

  static setFavTeam(teamName) {
    session.setFavTeam(teamName);
    this.updateUserContent();
  }

  /* ------------------------------------------------ */
  // handle user authentication

  static async signIn(password) {
    return await session.signIn(password);
  }

  static async signOut() {
    return await session.signOut();
  }

  /* ------------------------------------------------ */

  static getSections() {
    return [Home, Standings, Schedule];
  }

  static initUserContent() {

    footerLink.textContent = session.getLeague().title;
    this.getSections().forEach(section => {
      section.init();
    });
  }

  static updateUserContent() {

    this.getSections().forEach(section => {
      section.handleOptionsChange();
    });
  }
}

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
  App.init();
});
