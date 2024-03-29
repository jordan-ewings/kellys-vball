import * as util from './util.js';
import { db } from './firebase.js';
import { ref, query, orderByKey, orderByChild, equalTo, child, onValue, set, update, remove, onChildAdded, onChildChanged, onChildRemoved, runTransaction } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

import { APP } from './main.js';

/* ------------------------------------------------ */

const scheduleNav = document.querySelector('#nav-schedule');
const scheduleSection = document.querySelector('#schedule-section');
const weekFilterContainer = document.querySelector('#week-filter-container');
const scheduleContainer = document.querySelector('#schedule-container');

/* ------------------------------------------------ */

export function initScheduleContent() {

  onValue(ref(db, APP.gamesPath), snapshot => {
    let games = Object.values(snapshot.val());
    APP.currentWeek = games.find(g => g.status == 'PRE').week;

    makeWeekFilters(games);
    weekFilterContainer.querySelector('#week-' + APP.currentWeek + '-btn').click();

  }, { onlyOnce: true });
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
      showGameUpdateAlert(gameItemForm, game);
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
  gameItem.dataset.winner_id = (d.status == 'POST') ? d.winner : '';
  gameItem.classList.add((d.status == 'PRE') ? 'pre' : 'post');

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
      teamItem.querySelector('.team-nbr').textContent = team.nbr;
      teamItem.querySelector('.team-name').textContent = team.name;
      teamItem.querySelector('.team-record').textContent = team.record;
    });

    // winner/loser formatting
    if (d.status == 'POST') {
      let isWinner = (teamId == d.winner);
      if (isWinner) {
        teamItem.classList.add('winner');
      } else {
        teamItem.classList.add('loser');
        teamItem.querySelector('.team-result').classList.replace('fa-circle-check', 'fa-circle-xmark');
      }
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
    let gameItemForm = gameItemToForm(gameItem, d);
    gameItem.classList.add('d-none');
    gameItem.insertAdjacentElement('afterend', gameItemForm);
  });

  return gameItem;
}

/* ------------------------------------------------ */

function gameItemToForm(gameItem, d) {

  // clone game item and set properties
  let gameItemForm = gameItem.cloneNode(true);
  gameItemForm.classList.add('game-item-form');
  gameItemForm.id = 'game-' + d.id + '-form';

  let footer = util.createFromTemplate('game-item-form-footer-template');
  let cancelBtn = footer.querySelector('#cancelBtn');
  let saveBtn = footer.querySelector('#saveBtn');
  gameItemForm.appendChild(footer);

  let gameId = d.id;
  let oldWinnerId = (d.winner === undefined || d.winner === null || d.winner === '') ? null : d.winner;
  let newWinnerId = oldWinnerId;

  // helper function to select/deselect teams
  const formatWinner = (teamId) => {

    let teamItems = gameItemForm.querySelectorAll('.team-item');
    teamItems.forEach(ti => {
      ti.classList.remove('winner', 'loser');
      ti.querySelector('.team-result').classList.remove('fa-solid', 'fa-circle-check');
      ti.querySelector('.team-result').classList.add('fa-regular', 'fa-circle');
      if (teamId == null) return;

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
    let teamId = tiForm.dataset.team_id;
    tiForm.classList.add('py-1');
    tiForm.querySelector('.team-record').classList.add('d-none');
    tiForm.querySelector('.team-result').classList.add('ms-auto');
    tiForm.querySelector('.team-result').classList.remove('fa-regular', 'fa-circle-check', 'fa-circle-xmark');

    tiForm.addEventListener('click', (e) => {

      // select/deselect team
      newWinnerId = (newWinnerId == teamId) ? null : teamId;
      formatWinner(newWinnerId);

      // enable save button if game has changed
      let gameChanged = newWinnerId != oldWinnerId;
      gameItemForm.classList.toggle('changed', gameChanged);
      saveBtn.disabled = !gameChanged;
      saveBtn.classList.toggle('btn-outline-primary', !gameChanged);
      saveBtn.classList.toggle('btn-primary', gameChanged);
    });

    ti.replaceWith(tiForm);
  });

  // select initial winner if exists
  formatWinner(oldWinnerId);

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

    document.querySelector('#game-' + gameId).classList.remove('d-none');
    document.querySelector('#game-' + gameId + '-form').remove();
    if (newWinnerId == oldWinnerId) return;

    // update team records
    let teamIds = Object.keys(d.teams);
    teamIds.forEach(teamId => {
      let winsDiff = (teamId == newWinnerId) ? 1 : (teamId == oldWinnerId) ? -1 : 0;
      let gamesDiff = (oldWinnerId == null) ? 1 : (newWinnerId == null) ? -1 : 0;
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
      status: (newWinnerId == null) ? 'PRE' : 'POST'
    });
  });

  return gameItemForm;
}

/* ------------------------------------------------ */

function showGameUpdateAlert(gameItemForm, game) {

  // disable team selection
  let teamCol = gameItemForm.querySelector('.team-col');
  teamCol.style.pointerEvents = 'none';
  teamCol.style.opacity = '0.5';

  // alert message
  let formFooter = gameItemForm.querySelector('.form-footer');
  formFooter.classList.remove('justify-content-end');
  formFooter.innerHTML = '';

  let oldWinnerId = gameItemForm.dataset.winner_id;
  let newWinner = (game.winner) ? 'Team ' + parseInt(game.winner) : 'None';
  let oldWinner = (oldWinnerId != '') ? 'Team ' + parseInt(oldWinnerId) : 'None';
  let msg = '<span>Game updated by another user. Close and re-open this form to make additional updates.</span>';
  msg += '<p>Old Winner: <b>' + oldWinner + '</b></p>';
  msg += '<p>New Winner: <b>' + newWinner + '</b></p>';

  let alert = util.createAlert('danger', msg);
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

export function handleTeamSelection(e) {

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
