import * as util from './util.js';
import { db } from './firebase.js';
import { ref, get, query, orderByKey, orderByChild, equalTo, child, onValue, set, update, remove, onChildAdded, onChildChanged, onChildRemoved, runTransaction } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

/* ------------------------------------------------ */

const navbarNav = document.querySelector('.navbar-nav');
const navLinks = document.querySelectorAll('.nav-link');
const mainDiv = document.querySelector('#main');
const sections = document.querySelectorAll('section');
const footer = document.querySelector('footer');
const footerLink = document.querySelector('footer a');
const loadingSpinner = document.querySelector('#loading');

const homeNav = document.querySelector('#nav-index');
const homeSection = document.querySelector('#index-section');
const leagueSelectContainer = document.querySelector('#league-select-container');

const standingsNav = document.querySelector('#nav-standings');
const standingsSection = document.querySelector('#standings-section');
const leaderboardContainer = document.querySelector('#leaderboard-container');

const scheduleNav = document.querySelector('#nav-schedule');
const scheduleSection = document.querySelector('#schedule-section');
const weekFilterContainer = document.querySelector('#week-filter-container');
const scheduleContainer = document.querySelector('#schedule-container');

/* ------------------------------------------------ */

const APP = {};

/* ------------------------------------------------ */

document.addEventListener('DOMContentLoaded', initUserContent);

function initUserContent(e) {

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

  footer.classList.toggle('fixed-bottom', section == homeSection);
}

/* ------------------------------------------------ */

function initHomeContent() {

  onValue(ref(db, 'leagues'), snapshot => {
    let leagues = Object.values(snapshot.val());
    makeLeagueSelect(leagues);
  }, { onlyOnce: true });
}

/* ------------------------------------------------ */

function initStandingsContent() {

  onValue(ref(db, APP.teamsPath), snapshot => {
    let teams = Object.values(snapshot.val());
    makeLeaderboard(teams);
  });
}

/* ------------------------------------------------ */

function initScheduleContent() {

  onValue(ref(db, APP.gamesPath), snapshot => {
    let games = Object.values(snapshot.val());
    APP.currentWeek = games.find(g => g.status == 'PRE').week;

    makeWeekFilters(games);
    weekFilterContainer.querySelector('#week-' + APP.currentWeek + '-btn').click();

  }, { onlyOnce: true });
}

/* ------------------------------------------------ */

function makeLeagueSelect(leagues) {

  leagueSelectContainer.innerHTML = '';

  let data = JSON.parse(JSON.stringify(leagues));
  let selects = ['season', 'session', 'league'];

  selects.forEach((s, i) => {

    let formGroup = util.createFromTemplate('league-select-form-group-template');
    let select = formGroup.querySelector('select');
    let label = formGroup.querySelector('label');

    formGroup.id = s + '-div';
    select.id = s + 'Select';
    label.for = s + 'Select';
    label.textContent = s;

    let limLeagues = data;
    if (s == 'session') limLeagues = limLeagues.filter(l => l.season == APP.season);
    if (s == 'league') limLeagues = limLeagues.filter(l => l.season == APP.season && l.session == APP.session);

    // get options
    let availOptions = limLeagues.map(l => l[s]).filter((v, i, a) => a.indexOf(v) === i);
    let options = data.map(l => l[s]).filter((v, i, a) => a.indexOf(v) === i);

    // add options
    options.forEach(o => {
      let opt = document.createElement('option');
      opt.value = o;
      opt.innerHTML = o.charAt(0).toUpperCase() + o.slice(1).toLowerCase();
      if (o == APP[s]) opt.setAttribute('selected', '');
      if (!availOptions.includes(o)) opt.setAttribute('disabled', '');
      select.appendChild(opt);
    });

    // validate user selection
    let invalid = !availOptions.includes(APP[s]);
    select.classList.toggle('invalid', invalid);

    // update local storage on change
    select.addEventListener('change', e => {

      e.preventDefault();
      APP[s] = e.target.value;
      let leagueId = APP.season + APP.session + APP.league;
      let leagueData = data.find(l => l.id == leagueId);

      if (leagueData) {
        localStorage.setItem('userLeagueId', leagueId);
        initUserContent();

      } else {
        console.log('League selection invalid - reloading options');
        makeLeagueSelect(data);
      }
    });

    leagueSelectContainer.appendChild(formGroup);
  });
}

/* ------------------------------------------------ */
// generate standings

function makeLeaderboard(teams) {

  // create copy of data
  let data = JSON.parse(JSON.stringify(teams));

  // calculate winPct
  data.forEach(team => {
    team.games = team.wins + team.losses;
    team.winPct = team.games > 0 ? team.wins / team.games : 0;
  });

  // sort standings
  data.sort((a, b) => {
    if (a.winPct < b.winPct) return 1;
    if (a.winPct > b.winPct) return -1;
    if (a.losses > b.losses) return 1;
    if (a.losses < b.losses) return -1;
    if (a.wins < b.wins) return 1;
    if (a.wins > b.wins) return -1;
    if (a.id > b.id) return 1;
    if (a.id < b.id) return -1;

    return 0;
  });

  // add rank (not currently used)
  let rank = 1;
  let prevWinPct = null;
  data.forEach((team, index) => {
    let winPct = team.winPct;
    let ties = data.filter(t => t.winPct === winPct).length;
    if (winPct != prevWinPct) rank = index + 1;
    team.rank = ties > 1 ? 'T-' + rank : rank;
    prevWinPct = winPct;
  });

  // if no games played, set rank to '-'
  let teamGames = data.map(t => t.games);
  let totalGames = teamGames.reduce((a, b) => a + b);
  if (totalGames == 0) {
    data.forEach(team => {
      team.rank = '-';
    });
  }

  // create standings elements
  let leaderboard = util.createFromTemplate('leaderboard-template');
  let leaderboardTBody = leaderboard.querySelector('tbody');

  // populate standings
  data.forEach((team, index) => {

    let standingsItem = util.createFromTemplate('standings-item-template');

    team.winPct = util.formatNumber(team.winPct, '0.000');
    team.id = parseInt(team.id);

    // populate data items
    let dataItems = standingsItem.querySelectorAll('[data-item]');
    dataItems.forEach(item => {
      let dataItem = item.getAttribute('data-item');
      item.textContent = team[dataItem];
    });

    leaderboardTBody.appendChild(standingsItem);
  });

  leaderboardContainer.innerHTML = '';
  leaderboardContainer.appendChild(leaderboard);
}

/* ------------------------------------------------ */

function makeWeekFilters(data) {

  weekFilterContainer.innerHTML = '';

  // get unique weeks
  let weeks = data.map(d => {
    return { value: d.week, label: d.week_label };
  }).filter((v, i, a) => a.findIndex(t => (t.value === v.value)) === i);

  // create week buttons
  weeks.forEach(w => {
    let value = w.value;
    let label = w.label;
    let btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'week-' + value + '-btn';
    btn.setAttribute('data-week', value);
    btn.classList.add('btn', 'text-nowrap');
    btn.innerHTML = label;

    // fetch live data for week
    btn.addEventListener('click', (e) => {
      makeSchedule(value);
      e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      weekFilterContainer.querySelectorAll('button').forEach(b => {
        b.classList.toggle('active', b == e.target);
      });
    });

    weekFilterContainer.appendChild(btn);
  });
}

/* ------------------------------------------------ */

function makeSchedule(week) {

  let weekGamesRef = query(ref(db, APP.gamesPath), orderByChild('week'), equalTo(week));

  // initializing schedule
  onValue(weekGamesRef, (snapshot) => {

    scheduleContainer.innerHTML = '';
    const data = Object.values(snapshot.val());

    // group games by time
    let timeSlots = data.map(d => d.time).filter((v, i, a) => a.findIndex(t => (t === v)) === i);
    timeSlots.forEach(timeSlot => {
      let gameCard = util.createFromTemplate('game-group-template');
      let gameGroup = gameCard.querySelector('.cont-card-body');
      let games = data.filter(d => d.time === timeSlot);

      // create and append game items
      games.forEach((game, index) => {
        let gameItem = makeGameItem(game);
        gameGroup.appendChild(gameItem);

        // add separator between games
        if (index < games.length - 1) {
          let separator = document.createElement('div');
          separator.classList.add('game-separator');
          gameGroup.appendChild(separator);
        }
      });

      scheduleContainer.appendChild(gameCard);
    });

    // set up team selection
    if (APP.focusedTeam) {
      setTimeout(() => {
        handleTeamSelection();
      }, 250);
    }

  }, { onlyOnce: true });

  // updating the schedule on game changes
  onChildChanged(weekGamesRef, (snapshot) => {
    let game = snapshot.val();
    let gameItem = document.querySelector('#game-' + game.id);
    if (!gameItem) return;

    let gameItemForm = document.querySelector('#game-' + game.id + '-form');
    let newGameItem = makeGameItem(game);
    if (gameItemForm) {
      newGameItem.classList.add('d-none');
      gameItem.replaceWith(newGameItem);
      showGameUpdateAlert(gameItemForm);
    } else {
      gameItem.replaceWith(newGameItem);
    }
  });
}

/* ------------------------------------------------ */

function makeGameItem(d) {

  let gameItem = util.createFromTemplate('game-item-template');

  // set game item properties
  gameItem.id = 'game-' + d.id;
  gameItem.dataset.game_id = d.id;
  gameItem.classList.add((d.status == 'PRE') ? 'pre' : 'post');
  gameItem.dataset.winner_id = (d.status == 'POST') ? d.winner : '';

  // set game info text
  gameItem.querySelector('.game-time').textContent = d.time;
  gameItem.querySelector('.game-court').textContent = d.court;

  let teams = Object.keys(d.teams);
  teams.forEach((teamId, index) => {

    let teamItem = gameItem.querySelector('.team-item-' + (index + 1));

    // on team data change, update team item
    let teamRef = ref(db, APP.teamsPath + '/' + teamId);
    onValue(teamRef, (snapshot) => {
      let team = snapshot.val();
      teamItem.dataset.team_id = teamId;
      teamItem.dataset.team_nbr = team.nbr;
      teamItem.dataset.team_name = team.name;
      teamItem.querySelector('.team-nbr').textContent = team.nbr;
      teamItem.querySelector('.team-name').textContent = team.name;
      teamItem.querySelector('.team-record').textContent = team.record;
    });

    // winner/loser formatting
    if (d.status == 'POST') {
      if (teamId == d.winner) teamItem.classList.add('winner');
      if (teamId != d.winner) teamItem.classList.add('loser');
    }

    // apply team focus formatting
    if (APP.focusedTeam) {
      let isFocused = (APP.focusedTeam == teamId);
      teamItem.classList.toggle('selected', isFocused);
      teamItem.classList.toggle('unselected', !isFocused);
    }

    // listen for team focus
    teamItem.querySelector('.team-name').addEventListener('click', (e) => {
      let focusedTeam = (APP.focusedTeam == teamId) ? null : teamId;
      APP.focusedTeam = focusedTeam;
      handleTeamSelection();
    });
  });

  // stat-col click generates editable game item (winner selection)
  let statCol = gameItem.querySelector('.stat-col');
  statCol.addEventListener('click', (e) => {

    // clear focused team
    APP.focusedTeam = null;
    handleTeamSelection();

    // close any open game item forms
    document.querySelectorAll('.game-item-form').forEach(gif => {
      let gifStatCol = gif.querySelector('.stat-col');
      gifStatCol.click();
    });

    // insert game item form
    let gameItemForm = gameItemToForm(gameItem);
    gameItem.classList.add('d-none');
    gameItem.insertAdjacentElement('afterend', gameItemForm);
  });

  return gameItem;
}

/* ------------------------------------------------ */

function showGameUpdateAlert(gameItemForm) {

  // disable team selection
  let teamCol = gameItemForm.querySelector('.team-col');
  teamCol.style.pointerEvents = 'none';
  teamCol.style.opacity = '0.5';

  // alert message
  let formFooter = gameItemForm.querySelector('.form-footer');
  formFooter.innerHTML = '';
  let alert = util.createAlert('danger', 'This game has been updated by another user. Close this form to see the changes.');
  alert.querySelector('.btn-close').remove();
  let alertMsg = alert.querySelector('.me-auto');
  alertMsg.style.fontSize = '0.95rem';
  alertMsg.style.fontWeight = '400';
  formFooter.appendChild(alert);

  // close form icon
  let editIcon = gameItemForm.querySelector('.edit-icon');
  editIcon.classList.add('text-danger', 'fa-fade');
  editIcon.style.fontSize = '1.5rem';
}

/* ------------------------------------------------ */

function gameItemToForm(gameItem) {

  // clone game item and set properties
  let gameItemForm = gameItem.cloneNode(true);
  gameItemForm.classList.add('game-item-form');
  gameItemForm.id = gameItem.id + '-form';
  gameItemForm.dataset.form_winner_id = gameItem.dataset.winner_id;
  let gameId = gameItem.dataset.game_id;
  let currWinnerId = gameItem.dataset.winner_id;

  // add form footer
  let footer = util.createFromTemplate('game-item-form-footer-template');
  let cancelBtn = footer.querySelector('#cancelBtn');
  let saveBtn = footer.querySelector('#saveBtn');
  gameItemForm.appendChild(footer);

  // helper function to select/deselect teams
  const setWinner = (teamId) => {

    gameItemForm.dataset.form_winner_id = teamId;
    let teamItems = gameItemForm.querySelectorAll('.team-item');
    teamItems.forEach(ti => {
      ti.classList.remove('winner', 'loser');
      ti.querySelector('.team-result').classList.remove('fa-solid', 'fa-circle-check');
      ti.querySelector('.team-result').classList.add('fa-regular', 'fa-circle');
      if (teamId == '') return;

      if (ti.dataset.team_id == teamId) {
        ti.classList.add('winner');
        ti.querySelector('.team-result').classList.remove('fa-regular', 'fa-circle');
        ti.querySelector('.team-result').classList.add('fa-solid', 'fa-circle-check');
      } else {
        ti.classList.add('loser');
      }
    });
  };

  // replace team items with team item forms
  let teamItems = gameItemForm.querySelectorAll('.team-item');
  teamItems.forEach(ti => {

    let tiForm = ti.cloneNode(true);
    tiForm.classList.add('py-1');
    tiForm.querySelector('.team-record').classList.add('d-none');
    tiForm.querySelector('.team-result').classList.remove('d-none');

    tiForm.addEventListener('click', (e) => {

      // select/deselect team
      let teamId = tiForm.dataset.team_id;
      let currentWinnerId = gameItemForm.dataset.form_winner_id;
      let newWinnerId = (currentWinnerId == teamId) ? '' : teamId;
      setWinner(newWinnerId);

      // enable save button if game has changed
      let gameChanged = gameItemForm.dataset.form_winner_id != gameItemForm.dataset.winner_id;
      gameItemForm.classList.toggle('changed', gameChanged);
      saveBtn.disabled = !gameChanged;
      saveBtn.classList.toggle('btn-outline-primary', !gameChanged);
      saveBtn.classList.toggle('btn-primary', gameChanged);
    });

    ti.replaceWith(tiForm);
  });

  // select initial winner if exists
  setWinner(currWinnerId);

  // stat-col click replaces form with game item
  let statCol = gameItemForm.querySelector('.stat-col');
  let editIcon = statCol.querySelector('.edit-icon');
  editIcon.classList.replace('fa-pen', 'fa-xmark');
  statCol.addEventListener('click', (e) => {
    document.querySelector('#game-' + gameId).classList.remove('d-none');
    gameItemForm.remove();
  });

  // cancel button (replaces form with game item)
  cancelBtn.addEventListener('click', (e) => {
    document.querySelector('#game-' + gameId).classList.remove('d-none');
    gameItemForm.remove();
  });

  // save button pushes new game data and team records to database
  saveBtn.addEventListener('click', (e) => {

    let gi = document.querySelector('#game-' + gameId);
    let giForm = document.querySelector('#game-' + gameId + '-form');
    let teamItems = giForm.querySelectorAll('.team-item');
    let teamIds = [teamItems[0].dataset.team_id, teamItems[1].dataset.team_id];
    let oldWinnerId = gi.dataset.winner_id;
    let newWinnerId = giForm.dataset.form_winner_id;

    giForm.remove();
    gi.classList.remove('d-none');
    if (newWinnerId == oldWinnerId) return;

    // update team records
    teamIds.forEach(teamId => {
      let winsDiff = (teamId == newWinnerId) ? 1 : (teamId == oldWinnerId) ? -1 : 0;
      let gamesDiff = (oldWinnerId == '') ? 1 : (newWinnerId == '') ? -1 : 0;
      let lossesDiff = gamesDiff - winsDiff;

      runTransaction(ref(db, APP.teamsPath + '/' + teamId), (team) => {
        if (team) {
          team.wins += winsDiff;
          team.losses += lossesDiff;
          team.record = team.wins + '-' + team.losses;
        }
        return team;
      });
    });

    // update game's winner and status
    update(ref(db, APP.gamesPath + '/' + gameId), {
      winner: newWinnerId,
      status: (newWinnerId == '') ? 'PRE' : 'POST'
    });
  });

  return gameItemForm;
}

/* ------------------------------------------------ */

function handleTeamSelection(e) {

  let team = APP.focusedTeam;
  let allTeamItems = document.querySelectorAll('.team-item');

  // clear all focus/unfocus formatting
  if (!team) {
    allTeamItems.forEach(ti => {
      ti.classList.remove('selected', 'unselected');
    });
    return;
  }

  let teamItem1 = document.querySelector('.team-item[data-team_id="' + team + '"]');
  document.querySelectorAll('.team-item').forEach(ti => {
    if (ti.getAttribute('data-team_id') == team) {
      ti.classList.remove('unselected');
      ti.classList.add('selected');
      if (ti == teamItem1) {
        let gameGroup = ti.closest('.game-group');
        util.offsetScrollIntoView(gameGroup);
      }
    } else {
      ti.classList.remove('selected');
      ti.classList.add('unselected');
    }
  });
}
