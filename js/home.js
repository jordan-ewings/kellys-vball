import { db, auth, session } from './firebase.js';

import { createElement } from './util.js';
import { initUserContent, handleAdminContent } from './main.js';
import { ContCard, MenuItem } from '../components/main.js';

/* ------------------------------------------------ */

const homeNav = document.querySelector('#nav-index');
const homeSection = document.querySelector('#index-section');
const leagueSelectContainer = document.querySelector('#league-select-container');
const adminContainer = document.querySelector('#admin-container');
const teamSelectContainer = document.querySelector('#team-select-container');

/* ------------------------------------------------ */

export function initHomeContent() {

  makeLeagueSelect();
  makeAdminSignin();
  makeMyTeamPicker();
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

  const passwordInput = createElement('<input type="password" placeholder="Enter password...">');
  const loginButton = createElement('<div role="button"><i class="fa-regular fa-circle-right"></i></div>');
  const signInSpinner = createElement('<div class="spinner-border spinner-border-sm d-none"></div>');

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

  const adminSwitch = createElement(`
    <div class="form-check form-switch">
      <input class="form-check-input" type="checkbox" id="admin-switch" role="switch" ${session.adminControls ? 'checked' : ''}>
    </div>
  `);

  adminSwitch.querySelector('input').addEventListener('change', (e) => {
    if (e.target.checked) {
      session.adminControls = true;
    } else {
      session.adminControls = false;
    }
    handleAdminContent();
  });

  const loggedInDiv = new MenuItem()
    .addClass('logged-in-form')
    .addMain('Enable Controls')
    .addTrail(adminSwitch);

  /* --------------------------- */
  // item: sign out

  const logoutButton = createElement('<div role="button"><span>Logout</span></div>');
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

/* ------------------------------------------------ */
// my team picker

function makeMyTeamPicker() {

  const card = new ContCard('MY TEAM');

  teamSelectContainer.innerHTML = '';
  teamSelectContainer.appendChild(card);

  const createTeamItem = (team) => {

    const title = createElement(`
      <div class="d-flex align-items-center column-gap-2">
        <span class="team-nbr">${team.nbr}</span>
        <span class="team-name">${team.name}</span>
        ${session.favTeam == team.name ? '<i class="fa-solid fa-user fav-team"></i>' : ''}
      </div>
    `);

    const check = createElement(`<i class="fa-regular fa-circle"></i>`);
    if (session.favTeam == team.name) check.className = 'fa-solid fa-circle-check';

    const item = new MenuItem();
    item.setAttribute('role', 'button');
    item.addClass('team-select-item');
    item.addMain(title);
    item.addTrail(check);

    item.addEventListener('click', () => {
      session.setFavTeam(team.name);
      initUserContent();
    });

    return item;
  }

  const teams = Object.values(session.teams);
  const hasValidFavTeam = (session.favTeam && teams.find(t => t.name == session.favTeam));
  const favTeam = (hasValidFavTeam) ? teams.find(t => t.name == session.favTeam) : null;
  if (favTeam) {
    card.addContent(createTeamItem(favTeam));
  }

  teams.forEach(team => {
    if (!favTeam || team.name != favTeam.name) {
      card.addContent(createTeamItem(team));
    }
  });
}



