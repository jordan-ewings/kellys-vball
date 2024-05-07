import { db, auth, session } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js';
import * as util from './util.js';
import { initStandingsContent } from './standings.js';
import { initScheduleContent } from './schedule.js';

import { ContCard, MenuItem } from '../components/common.js';

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

  // initialize session, then init user content, then set admin controls
  await session.init();
  initUserContent();

  // set up firebase auth
  onAuthStateChanged(auth, user => {

    let currentUserId = session.user ? session.user.uid : null;
    let newUserId = user ? user.uid : null;
    if (currentUserId == newUserId) return;

    session.setUserProps(user);
    initUserContent();
  });

});

/* ------------------------------------------------ */

export function initUserContent() {

  initHomeContent();
  initStandingsContent();
  initScheduleContent();
  initPageContent();
}

/* ------------------------------------------------ */

function initPageContent() {

  footerLink.textContent = session.getLeague().title;

  if (APP.initialized) return;
  APP.initialized = true;

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

  let adminControls = document.querySelectorAll('.admin-control');
  adminControls.forEach(control => {
    control.classList.toggle('hidden-control', !session.adminControls);
  });

  if (navbar.classList.contains('hidden')) navbar.classList.remove('hidden');
  const navLink = document.querySelector('#nav-' + name);
  const section = document.querySelector('#' + name + '-section');

  navbarBorder.style.left = navLink.offsetLeft + 'px';
  navbarBorder.style.width = navLink.offsetWidth + 'px';
  navLinks.forEach(nav => nav.classList.toggle('active', nav == navLink));
  sections.forEach(sec => sec.classList.toggle('d-none', sec != section));

  footer.classList.toggle('fixed-bottom', name == 'index');

  if (name == 'schedule') {
    const weekFilterContainer = section.querySelector('#week-filter-container');
    const weekBtn = weekFilterContainer.querySelector('button.active');
    weekBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

/* ------------------------------------------------ */

const homeNav = document.querySelector('#nav-index');
const homeSection = document.querySelector('#index-section');
const leagueSelectContainer = document.querySelector('#league-select-container');
const adminContainer = document.querySelector('#admin-container');

/* ------------------------------------------------ */

function initHomeContent() {

  configureStyle();
  makeLeagueSelect();
  makeAdminSignin();
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

function makeLeagueSelect() {

  let LG = {
    season: session.getLeague().season,
    session: session.getLeague().session,
    league: session.getLeague().league
  };

  let leagues = Object.values(session.leagues);
  leagues.sort((a, b) => {
    if (a.season != b.season) return a.season - b.season;
    if (a.session != b.session) return a.session - b.session;
    if (a.league == b.league) return 0;
    let days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    return days.indexOf(a.league) - days.indexOf(b.league);
  });

  let selects = ['season', 'session', 'league'];

  const card = new ContCard('SELECT LEAGUE');
  leagueSelectContainer.innerHTML = '';
  leagueSelectContainer.appendChild(card);

  selects.forEach((s, i) => {

    const select = document.createElement('select');
    select.id = s + 'Select';
    select.classList.add('form-select');

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

      if (session.leagues[leagueId]) {
        session.setLeagueProps(leagueId).then(() => {
          initUserContent();
        });
      } else {
        console.log('League selection invalid - reloading options');
        makeLeagueSelect();
      }
    });

    // add to card
    const item = new MenuItem()
      .addMain(s.charAt(0).toUpperCase() + s.slice(1))
      .addTrail(select);

    card.addContent(item);
  });
}

/* ------------------------------------------------ */
// admin signin area

function makeAdminSignin() {

  const card = new ContCard('ADMIN ACCESS');

  adminContainer.innerHTML = '';
  adminContainer.appendChild(card);

  /* --------------------------- */
  // item: sign in

  const passwordInput = document.createElement('input');
  passwordInput.type = 'password';
  passwordInput.placeholder = 'Enter password...';

  const loginButton = document.createElement('div');
  loginButton.role = 'button';
  loginButton.innerHTML = '<i class="fa-regular fa-circle-right"></i>';

  const signInSpinner = document.createElement('div');
  signInSpinner.classList.add('spinner-border', 'spinner-border-sm', 'd-none');

  const loginDiv = new MenuItem()
    .addClass('login-form')
    .addMain(passwordInput)
    .addTrail(loginButton)
    .addTrail(signInSpinner);

  const signIn = async () => {
    loginButton.classList.add('d-none');
    signInSpinner.classList.remove('d-none');
    const password = passwordInput.value;

    try {
      await session.signIn(password);
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  loginButton.addEventListener('click', signIn);
  passwordInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') signIn();
  });

  /* --------------------------- */
  // item: enable/disable admin controls

  const adminSwitch = document.createElement('input');
  adminSwitch.type = 'checkbox';
  adminSwitch.classList.add('form-check-input');
  adminSwitch.id = 'admin-switch';
  adminSwitch.role = 'switch';
  adminSwitch.checked = session.adminControls;
  adminSwitch.addEventListener('change', (e) => {
    if (e.target.checked) {
      session.adminControls = true;
      session.enableAdminControls();
    } else {
      session.adminControls = false;
      session.disableAdminControls();
    }
  });

  const adminSwitchWrapper = document.createElement('div');
  adminSwitchWrapper.classList.add('form-check', 'form-switch');
  adminSwitchWrapper.appendChild(adminSwitch);

  const loggedInDiv = new MenuItem()
    .addClass('logged-in-form')
    .addMain('Enable Controls')
    .addTrail(adminSwitchWrapper);

  /* --------------------------- */
  // item: sign out

  const logoutButton = document.createElement('div');
  logoutButton.role = 'button';
  logoutButton.innerHTML = '<span>Logout</span>';
  logoutButton.addEventListener('click', async (e) => {
    await session.signOut();
  });

  const logoutDiv = new MenuItem()
    .addClass('logout-form')
    .addMain(logoutButton);

  /* --------------------------- */
  // add items to card

  if (session.admin) {
    card.addContent(loggedInDiv);
    card.addContent(logoutDiv);
    card.addFooter('Enable controls to edit game results and team stats.');
  } else {
    card.addContent(loginDiv);
  }
}

