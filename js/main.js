import { db, session } from './firebase.js';
import { ref, onValue } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

import * as util from './util.js';
import { initStandingsContent } from './standings.js';
import { initScheduleContent } from './schedule.js';

/* ------------------------------------------------ */

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

document.addEventListener('DOMContentLoaded', initUserContent);

export async function initUserContent(e) {

  configureStyle();

  await session.init();

  initHomeContent();
  initStandingsContent();
  initScheduleContent();

  footerLink.textContent = session.user.league.title;
  initPageContent();
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

  // store device type in APP variable
  APP.device = 'desktop';
  if (window.innerWidth < 768) APP.device = 'mobile';
  if (window.innerWidth >= 768 && window.innerWidth < 992) APP.device = 'tablet';

  // set max widths if desktop

  // if (APP.device == 'desktop') {
  //   let style = document.createElement('style');
  //   document.head.appendChild(style);
  //   style.sheet.insertRule(`
  //     .main-header::before {
  //       max-width: 992px;
  //     }
  //     .main-body {
  //       max-width: 992px;
  //     }
  //   `, 0);
  // }
}

/* ------------------------------------------------ */

function initPageContent() {

  if (APP.initialized) {
    console.log('Updated page content', session);
    return;
  }

  APP.initialized = true;
  console.log('Initialized page content', session);

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

  // show home content by default
  navbarNav.querySelector('#nav-index').click();
  loadingSpinner.classList.add('d-none');
  mainDiv.classList.remove('d-none');
  footer.classList.remove('d-none');

  // gesture listeners
  // let scrollY = 0;
  // let scrollDir = 0;
  // document.addEventListener('scroll', (e) => {

  //   if (!currentSection()) return;
  //   if (currentSection().id != 'schedule-section') return;
  //   let header = currentSection().querySelector('.main-header');

  //   if (APP.focusedTeam) {
  //     if (header.classList.contains('hidden')) {
  //       header.classList.remove('hidden');
  //     }
  //     return;
  //   }

  //   if (!header.firstElementChild) return;

  //   let mainBody = currentSection().querySelector('.main-body');
  //   let currentY = window.scrollY;
  //   let dir = currentY > scrollY ? 1 : -1;
  //   let belowTop = mainBody.getBoundingClientRect().top < 0;
  //   let aboveBottom = mainBody.getBoundingClientRect().bottom > window.innerHeight;

  //   if (belowTop && aboveBottom) {
  //     if (dir != scrollDir) {
  //       scrollDir = dir;
  //       if (dir == -1) {
  //         header.classList.remove('hidden');
  //       } else {
  //         header.classList.add('hidden');
  //       }
  //     }
  //   } else if (!belowTop) {
  //     header.classList.remove('hidden');
  //   }

  //   scrollY = currentY;
  // });
}

/* ------------------------------------------------ */

function showContent(name) {

  const navLink = document.querySelector('#nav-' + name);
  const section = document.querySelector('#' + name + '-section');

  navbarBorder.style.left = navLink.offsetLeft + 'px';
  navbarBorder.style.width = navLink.offsetWidth + 'px';
  navLinks.forEach(nav => {
    nav.classList.toggle('active', nav == navLink);
  });

  sections.forEach(sec => {
    sec.classList.toggle('d-none', sec != section);
  });

  footer.classList.toggle('fixed-bottom', name == 'index');
}

/* ------------------------------------------------ */

const homeNav = document.querySelector('#nav-index');
const homeSection = document.querySelector('#index-section');
const leagueSelectContainer = document.querySelector('#league-select-container');

/* ------------------------------------------------ */

function initHomeContent() {

  // onValue(ref(db, 'leagues'), snapshot => {
  //   let leagues = Object.values(snapshot.val());
  //   makeLeagueSelect(leagues);
  // }, { onlyOnce: true });

  makeLeagueSelect();


}

/* ------------------------------------------------ */

function makeLeagueSelect() {

  leagueSelectContainer.innerHTML = '';

  let LG = {
    season: session.user.league.season,
    session: session.user.league.session,
    league: session.user.league.league
  };

  let leagues = Object.values(session.cache.leagues);
  let selects = ['season', 'session', 'league'];

  selects.forEach((s, i) => {

    let formGroup = util.createFromTemplate('league-select-form-group-template');
    let select = formGroup.querySelector('select');
    let label = formGroup.querySelector('label');

    formGroup.id = s + '-div';
    select.id = s + 'Select';
    label.for = s + 'Select';
    label.textContent = s;

    let limLeagues = leagues;
    if (s == 'session') limLeagues = limLeagues.filter(l => l.season == LG.season);
    if (s == 'league') limLeagues = limLeagues.filter(l => l.season == LG.season && l.session == LG.session);

    // get options
    let availOptions = limLeagues.map(l => l[s]).filter((v, i, a) => a.indexOf(v) === i);
    let options = leagues.map(l => l[s]).filter((v, i, a) => a.indexOf(v) === i);

    // add options
    options.forEach(o => {
      let opt = document.createElement('option');
      opt.value = o;
      opt.innerHTML = o;
      if (o == LG[s]) opt.setAttribute('selected', '');
      if (!availOptions.includes(o)) opt.setAttribute('disabled', '');
      select.appendChild(opt);
    });

    // validate user selection
    let invalid = !availOptions.includes(LG[s]);
    select.classList.toggle('invalid', invalid);

    // update local storage on change
    select.addEventListener('change', e => {

      e.preventDefault();
      LG[s] = e.target.value;
      let leagueId = LG.season + LG.session + LG.league;

      if (session.cache.leagues[leagueId]) {
        session.setUserLeague(leagueId);
        initUserContent();
      } else {
        console.log('League selection invalid - reloading options');
        makeLeagueSelect();
      }
    });

    leagueSelectContainer.appendChild(formGroup);
  });
}
