import { db, auth, session } from './firebase.js';
import { ref, onValue } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js';
import * as util from './util.js';
import { initStandingsContent } from './standings.js';
import { initScheduleContent } from './schedule.js';

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

function createElement(html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.firstChild;
}

/* ------------------------------------------------ */

document.addEventListener('DOMContentLoaded', async () => {

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

// toggle visibility of admin controls depending on session.admin
function setAdminControls() {
  let showAdmin = session.admin && session.adminControlEnabled;
  console.log('showAdmin:', showAdmin);
  const adminControls = document.querySelectorAll('.admin-control');
  adminControls.forEach(ac => {
    if (!showAdmin) {
      ac.classList.add('hidden-control');
    } else {
      ac.classList.remove('hidden-control');
    }
  });
}

/* ------------------------------------------------ */

function initPageContent() {

  console.log(session);
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

  setAdminControls();

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

  leagueSelectContainer.innerHTML = '';

  let LG = {
    season: session.getLeague().season,
    session: session.getLeague().session,
    league: session.getLeague().league
  };

  let leagues = Object.values(session.leagues);
  // sort leagues by season, session, league
  // 'league' is a day of the week (e.g., 'MONDAY', 'TUESDAY', etc.), sort accordingly, not just alphabetically
  leagues.sort((a, b) => {
    if (a.season != b.season) return a.season - b.season;
    if (a.session != b.session) return a.session - b.session;
    if (a.league == b.league) return 0;
    let days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    return days.indexOf(a.league) - days.indexOf(b.league);
  });

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

      if (session.leagues[leagueId]) {
        session.setLeagueProps(leagueId).then(() => {
          initUserContent();
        });
      } else {
        console.log('League selection invalid - reloading options');
        makeLeagueSelect();
      }
    });

    leagueSelectContainer.appendChild(formGroup);
  });
}

/* ------------------------------------------------ */
// admin signin area

// all users will be signed in anonymously by default (firebase signInAnonymously method is ran on page load)
// however, will give option to sign in with password to access admin features

function makeAdminSignin() {

  const loginDiv = createElement(
    `<div class="menu-item login-form">
      <div class="label"></div>
      <div class="contents">
        <div class="main">
          <div class="title">
            <input type="password" placeholder="Enter password...">
          </div>
          <div class="detail"></div>
        </div>
        <div class="main-info">
          <div role="button">
            <i class="fa-regular fa-circle-right"></i>
          </div>
        </div>
        <div class="trail">
        </div>
      </div>
    </div>`
  );

  const loggedInDiv = createElement(
    `<div class="menu-item logged-in-form">
      <div class="label"></div>
      <div class="contents">
        <div class="main">
          <div class="title">
            <span>Enable admin features</span>
          </div>
          <div class="detail"></div>
        </div>
        <div class="main-info">
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" role="switch" id="admin-switch">
          </div>
        </div>
        <div class="trail">
        </div>
      </div>
    </div>`
  );

  const logoutDiv = createElement(
    `<div class="menu-item logout-form">
      <div class="label"></div>
      <div class="contents">
        <div class="main">
          <div class="title">
            <div role="button">
              <span>Logout</span>
            </div>
          </div>
          <div class="detail"></div>
        </div>
        <div class="main-info">
        </div>
        <div class="trail">
        </div>
      </div>
    </div>`
  );

  // const adminPassword = loginDiv.querySelector('input');
  const loginButton = loginDiv.querySelector('div[role="button"]');
  loginButton.addEventListener('click', (e) => {
    e.preventDefault();
    const email = 'jordanewings@outlook.com';
    const password = loginDiv.querySelector('input').value;
    signInWithEmailAndPassword(auth, email, password).then(userCredential => {
      console.log('Admin signed in:', userCredential.user);
    }).catch(error => {
      console.error('signInWithEmailAndPassword() failed:', error);
    });
  });

  const logoutButton = logoutDiv.querySelector('div[role="button"]');
  logoutButton.addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth);
  });

  const adminSwitch = loggedInDiv.querySelector('#admin-switch');
  adminSwitch.checked = session.adminControlEnabled;
  adminSwitch.addEventListener('change', (e) => {
    session.adminControlEnabled = e.target.checked;
    setAdminControls();
  });

  const adminBody = adminContainer.querySelector('.cont-card-body');
  adminBody.innerHTML = '';
  if (session.admin) {
    adminBody.appendChild(loggedInDiv);
    adminBody.appendChild(logoutDiv);
  } else {
    adminBody.appendChild(loginDiv);
  }

}

