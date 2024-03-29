import { db } from './firebase.js';
import { ref, onValue } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

import { initHomeContent } from './index.js';
import { initStandingsContent } from './standings.js';
import { initScheduleContent } from './schedule.js';

/* ------------------------------------------------ */

const navbarNav = document.querySelector('.navbar-nav');
const navLinks = document.querySelectorAll('.nav-link');
const mainDiv = document.querySelector('#main');
const sections = document.querySelectorAll('section');
const footer = document.querySelector('footer');
const footerLink = document.querySelector('footer a');
const loadingSpinner = document.querySelector('#loading');

/* ------------------------------------------------ */

export const APP = {};

/* ------------------------------------------------ */

document.addEventListener('DOMContentLoaded', initUserContent);

export function initUserContent(e) {

  let userLeagueId = localStorage.getItem('userLeagueId');
  if (userLeagueId == null) {
    userLeagueId = '202401MONDAY';
    localStorage.setItem('userLeagueId', userLeagueId);
  }

  return onValue(ref(db, 'leagues/' + userLeagueId), snapshot => {
    const league = snapshot.val();
    APP.user = league;
    APP.season = league.season;
    APP.session = league.session;
    APP.league = league.league;
    APP.gamesPath = league.refs.games;
    APP.teamsPath = league.refs.teams;

    initHomeContent();
    initStandingsContent();
    initScheduleContent();

    footerLink.textContent = APP.user.title;
    initPageContent();

  }, { onlyOnce: true });
}

/* ------------------------------------------------ */

function initPageContent() {

  if (APP.initialized) {
    console.log('Updated page content', APP);
    return;
  }

  APP.initialized = true;
  console.log('Initialized page content', APP);

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
    navbarNav.querySelector('#nav-index').click();
  });

  // show home content
  navbarNav.querySelector('#nav-index').click();
  loadingSpinner.classList.add('d-none');
  mainDiv.classList.remove('d-none');
  footer.classList.remove('d-none');
}

/* ------------------------------------------------ */

function showContent(name) {

  const navLink = document.querySelector('#nav-' + name);
  const section = document.querySelector('#' + name + '-section');

  navLinks.forEach(nav => {
    nav.classList.toggle('active', nav == navLink);
  });

  sections.forEach(sec => {
    sec.classList.toggle('d-none', sec != section);
  });

  footer.classList.toggle('fixed-bottom', name == 'index');
}
