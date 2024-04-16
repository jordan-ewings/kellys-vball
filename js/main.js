import { db, session } from './firebase.js';
import { ref, onValue } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';
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

document.addEventListener('DOMContentLoaded', initUserContent);

export async function initUserContent(e) {

  await session.init();
  initHomeContent();
  initStandingsContent();
  initScheduleContent();
  initPageContent();
}

/* ------------------------------------------------ */

function initPageContent() {

  console.log(session);
  footerLink.textContent = session.user.league.title;
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

/* ------------------------------------------------ */

function initHomeContent() {

  configureStyle();
  makeLeagueSelect();
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
    season: session.user.league.season,
    session: session.user.league.session,
    league: session.user.league.league
  };

  let leagues = Object.values(session.cache.leagues);
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
