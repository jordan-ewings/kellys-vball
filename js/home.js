import { db, auth, session } from './firebase.js';

import { createElement } from './util.js';
import { ContCard, MenuItem, RadioMenu, FavTeamListener } from './components/common.js';

import App from './app.js';

/* ------------------------------------------------ */

const section = document.querySelector('#index-section');
const mainHeader = section.querySelector('.main-header');
const mainBody = section.querySelector('.main-body');

const leagueSelectContainer = mainBody.querySelector('#league-select-container');
const adminContainer = mainBody.querySelector('#admin-container');
const teamSelectContainer = mainBody.querySelector('#team-select-container');

/* ------------------------------------------------ */

export default class Home {

  static navLink = document.querySelector('#nav-index');

  static init() {

    this.reset();
    this.addLeagueSelectContent();
    this.addAdminContent();
    this.addMyTeamContent();
  }

  static show() {
    section.classList.remove('d-none');
  }

  static hide() {
    section.classList.add('d-none');
  }

  static handleOptionsChange() {

    // nothing

  }

  /* ------------------------------------------------ */
  // private methods

  static reset() {
    leagueSelectContainer.innerHTML = '';
    adminContainer.innerHTML = '';
    teamSelectContainer.innerHTML = '';
  }

  /* ------------------------------------------------ */
  // league select content

  static addLeagueSelectContent() {

    const card = new ContCard('SELECT LEAGUE');
    leagueSelectContainer.appendChild(card);

    const leagues = Object.values(session.leagues);
    leagues.sort((a, b) => {
      if (a.season != b.season) return a.season - b.season;
      if (a.session != b.session) return a.session - b.session;
      if (a.league == b.league) return 0;
      let days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
      return days.indexOf(a.league) - days.indexOf(b.league);
    });

    const userLeague = session.getLeague();
    const radioMenu = new RadioMenu(false);
    leagues.forEach(league => {
      const main = league.title.split(' ')[0] + ' Night';
      const sub = league.title.split(' ').slice(2).join(' ');
      const title = createElement(`
        <div class="d-flex justify-content-between align-items-center column-gap-2">
          <span>${main}</span>
          <span class="sub-main">${sub}</span>
        </div>
      `);
      radioMenu.addOption(title, league.id, league.id == userLeague.id);
    });

    radioMenu.addEventListener('change', async (e) => {
      const leagueId = radioMenu.getValue();
      await App.setLeague(leagueId);
    });

    card.addContent(radioMenu);
  }

  /* ------------------------------------------------ */
  // admin content

  static addAdminContent() {

    const card = new ContCard('ADMIN ACCESS');
    adminContainer.appendChild(card);

    const passwordInput = createElement('<input type="password" placeholder="Enter password...">');
    const passwordMessage = createElement('<span class="d-none invalid-msg">Incorrect password</span>');
    const signInSpinner = createElement('<div class="spinner-border spinner-border-sm d-none"></div>');
    const loginButton = createElement('<div role="button"><i class="fa-regular fa-circle-right"></i></div>');
    const logoutButton = createElement('<div role="button"><span>Logout</span></div>');
    const adminSwitch = createElement(`
      <div class="form-check form-switch">
        <input class="form-check-input" type="checkbox" id="admin-switch" role="switch" ${session.adminControls ? 'checked' : ''}>
      </div>
    `);

    const loginDiv = new MenuItem()
      .addClass('login-form')
      .addMain(passwordInput)
      .addTrail(loginButton)
      .addTrail(signInSpinner);

    const loggedInDiv = new MenuItem()
      .addClass('logged-in-form')
      .addMain('Enable Controls')
      .addTrail(adminSwitch);

    const logoutDiv = new MenuItem()
      .addClass('logout-form')
      .addMain(logoutButton);


    if (session.admin) {
      card.addContent(loggedInDiv);
      card.addContent(logoutDiv);
      card.addFooter('Enable controls to edit game results and team stats.');
    } else {
      card.addContent(loginDiv);
      card.addFooter(passwordMessage);
    }

    loginButton.addEventListener('click', async () => {
      loginButton.classList.add('d-none');
      signInSpinner.classList.remove('d-none');
      const password = passwordInput.value;
      await App.signIn(password)
        .then(user => {
          adminContainer.innerHTML = '';
          this.addAdminContent();
        })
        .catch(error => {
          passwordMessage.classList.remove('d-none');
          console.log('Sign in failed:', error);
          loginButton.classList.remove('d-none');
          signInSpinner.classList.add('d-none');
          passwordInput.value = '';
        });
    });

    logoutButton.addEventListener('click', async () => {
      await App.signOut();
      adminContainer.innerHTML = '';
      this.addAdminContent();
    });

    adminSwitch.querySelector('input').addEventListener('change', (e) => {
      const value = e.target.checked;
      App.setAdminControls(value);
    });
  }

  /* ------------------------------------------------ */
  // my team content

  static addMyTeamContent() {

    const card = new ContCard('MY TEAM');
    teamSelectContainer.appendChild(card);

    const teams = Object.values(session.teams);
    const radioMenu = new RadioMenu(true);
    teams.forEach(team => {
      const title = createElement(`
        <div class="d-flex align-items-center column-gap-2">
          <span class="team-nbr">${team.nbr}</span>
          <span class="team-name">${team.name}</span>
        </div>
      `);

      // fav team listener
      new FavTeamListener(title);

      radioMenu.addOption(title, team.id, team.name == session.favTeam);
    });

    radioMenu.addEventListener('change', (e) => {
      const teamId = radioMenu.getValue();
      const team = teams.find(t => t.id == teamId);
      App.setFavTeam(team.name);
    });

    card.addContent(radioMenu);
  }
}

/* ------------------------------------------------ */

