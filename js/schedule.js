import * as util from './util.js';
import * as gest from './gestures.js';
import { db, APP } from './firebase.js';
import { ref, get, query, equalTo, child, onValue, set, update, remove, onChildAdded, onChildChanged, onChildRemoved } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

/* ------------------------------------------------ */

document.addEventListener('DOMContentLoaded', init);

function init() {

  let gamesRef = ref(db, 'games');
  onValue(gamesRef, (snapshot) => {

    let games = Object.values(snapshot.val());
    let nextGame = games.find(g => g.status === 'PRE');
    let currentWeek = nextGame.week;
    APP.currentWeek = currentWeek;

    makeFilters(games);
    let currentWeekButton = document.querySelector('#filter-container button[data-week="' + currentWeek + '"]');
    currentWeekButton.click();

    document.querySelector('#loading').remove();

  }, { onlyOnce: true });
}

/* ------------------------------------------------ */

function makeFilters(data) {

  let filterContainer = document.querySelector('#filter-container');

  let weeks = data.map(d => {
    return {
      value: d.week,
      label: d.week_label
    };
  }).filter((v, i, a) => a.findIndex(t => (t.value === v.value)) === i);

  weeks.forEach(w => {
    let value = w.value;
    let label = w.label;
    let btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('data-week', value);
    btn.addEventListener('click', (e) => {
      let week = e.target.getAttribute('data-week');
      // get games for week from firebase
      onValue(ref(db, 'games'), (snapshot) => {
        let games = Object.values(snapshot.val()).filter(g => g.week == week);
        makeSchedule(games);
      }, { onlyOnce: true });

      let active = filterContainer.querySelector('.active');
      if (active) {
        active.classList.remove('active');
      }
      e.target.classList.add('active');

      // scroll into view of button
      e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });

    btn.classList.add('btn', 'text-dim2', 'fw-medium', 'text-nowrap');
    btn.innerHTML = label;
    filterContainer.appendChild(btn);
  });
}

/* ------------------------------------------------ */

function makeSchedule(data) {

  let scheduleContainer = document.querySelector('#schedule-container');
  scheduleContainer.innerHTML = '';

  let timeSlots = data.map(d => d.time).filter((v, i, a) => a.findIndex(t => (t === v)) === i);
  timeSlots.forEach(timeSlot => {
    let gameCard = util.createFromTemplate('game-group-template');
    let gameGroup = gameCard.querySelector('.cont-card-body');
    let games = data.filter(d => d.time === timeSlot);
    games.forEach((game, index) => {
      let gameItem = makeGameItem(game);
      gameGroup.appendChild(gameItem);

      if (index < games.length - 1) {
        let separator = document.createElement('div');
        separator.classList.add('game-separator');
        gameGroup.appendChild(separator);
      }
    });

    scheduleContainer.appendChild(gameCard);
  });

  let gamesRef = ref(db, 'games');
  onChildChanged(gamesRef, (snapshot) => {
    let game = snapshot.val();
    console.log('game changed', game);
    let gameItem = document.querySelector('#game-' + game.game_id);
    let gameItemForm = document.querySelector('.game-item-form[data-game_id="' + game.game_id + '"]');
    if (gameItemForm) {
      gameItemForm.remove();
    }

    if (gameItem) {
      let newGameItem = makeGameItem(game);
      gameItem.replaceWith(newGameItem);
    }
  });
}

function updateRecords(teams, games) {

  let standings = [];

  for (let teamId in teams) {
    let team = teams[teamId];
    team.wins = 0;
    team.losses = 0;
    standings.push(team);
  }

  for (let gameId in games) {
    let game = games[gameId];
    let team1 = standings.find(t => t.id == game.team1_id);
    let team2 = standings.find(t => t.id == game.team2_id);
    if (game.winner_id == '') continue;

    if (game.winner_id == game.team1_id) {
      team1.wins++;
      team2.losses++;
    } else if (game.winner_id == game.team2_id) {
      team2.wins++;
      team1.losses++;
    }
  }

  // update teams with wins and losses
  standings.forEach(team => {
    let teamRef = ref(db, 'teams/' + team.id);
    update(teamRef, {
      wins: team.wins,
      losses: team.losses
    });
  });

  // update games with wins and losses
  for (let gameId in games) {
    let game = games[gameId];
    let gameRef = ref(db, 'games/' + game.game_id);
    let team1 = standings.find(t => t.id == game.team1_id);
    let team2 = standings.find(t => t.id == game.team2_id);
    let team1_record = team1.wins + '-' + team1.losses;
    let team2_record = team2.wins + '-' + team2.losses;

    if (team1_record != game.team1_record || team2_record != game.team2_record) {
      update(gameRef, {
        team1_record: team1_record,
        team2_record: team2_record
      });
    }
  }

}

/* ------------------------------------------------ */

let regWinTeamClass = ['fa-solid', 'fa-caret-left'];
let formWinTeamClass = ['fa-solid', 'fa-circle-check'];
let formLoseTeamClass = ['fa-regular', 'fa-circle'];

function makeGameItem(d) {

  let gameItem = util.createFromTemplate('game-item-template');
  gameItem.id = 'game-' + d.game_id;
  gameItem.dataset.game_id = d.game_id;
  gameItem.dataset.winner_id = d.winner_id;

  let items = gameItem.querySelectorAll('span[data-item]');
  items.forEach(item => {
    let dataItem = item.getAttribute('data-item');
    let text = d[dataItem];
    if (dataItem == 'court') text = text.replace('Court ', 'C');
    item.textContent = text;
  });

  let teamItems = gameItem.querySelectorAll('.team-item');
  teamItems.forEach(teamItem => {
    let num = (teamItem.classList.contains('team-item-1')) ? 1 : 2;
    let teamId = d['team' + num + '_id'];
    let teamNbr = d['team' + num + '_nbr'];
    let teamName = d['team' + num + '_name'];
    teamItem.dataset.team_id = teamId;
    teamItem.dataset.team_nbr = teamNbr;
    teamItem.dataset.team_name = teamName;

    let teamResult = teamItem.querySelector('.team-result');
    if (d.winner_id == teamId) {
      teamResult.classList.add(...regWinTeamClass);
      teamItem.classList.add('winner');
    }

    if (APP.focusedTeam) {
      if (APP.focusedTeam == teamName) {
        teamItem.classList.add('selected');
      } else {
        teamItem.classList.add('unselected');
      }
    }

    let teamNameSpan = teamItem.querySelector('.team-name');
    teamNameSpan.addEventListener('click', (e) => {
      let focusedTeam = (APP.focusedTeam == teamName) ? null : teamName;
      APP.focusedTeam = focusedTeam;
      handleTeamSelection();
    });
  });

  let statCol = gameItem.querySelector('.stat-col');
  statCol.addEventListener('click', (e) => {

    APP.focusedTeam = null;
    handleTeamSelection();
    let gameItemForms = document.querySelectorAll('.game-item-form');
    gameItemForms.forEach((gif) => {
      let gifStatCol = gif.querySelector('.stat-col');
      gifStatCol.click();
    });

    let gameItemForm = gameItemToForm(gameItem);
    gameItem.classList.add('d-none');
    gameItem.insertAdjacentElement('afterend', gameItemForm);
  });

  return gameItem;
}

/* ------------------------------------------------ */

function gameItemToForm(gameItem) {

  let gameItemForm = gameItem.cloneNode(true);
  gameItemForm.classList.add('game-item-form');
  gameItemForm.removeAttribute('id');
  gameItemForm.dataset.form_winner_id = gameItem.dataset.winner_id;

  const selectTeam = (teamItem) => {
    let teamResult = teamItem.querySelector('.team-result');
    teamItem.classList.add('winner');
    teamResult.classList.remove(...formLoseTeamClass);
    teamResult.classList.add(...formWinTeamClass);
  };

  const deselectTeam = (teamItem) => {
    let teamResult = teamItem.querySelector('.team-result');
    teamItem.classList.remove('winner');
    teamResult.classList.remove(...formWinTeamClass);
    teamResult.classList.add(...formLoseTeamClass);
  };

  let teamItems = gameItemForm.querySelectorAll('.team-item');
  teamItems.forEach(ti => {
    let tiForm = ti.cloneNode(true);
    tiForm.classList.add('team-item-form');
    tiForm.classList.add('py-1');

    let teamId = ti.dataset.team_id;
    let teamName = ti.dataset.team_name;
    let gameId = gameItem.dataset.game_id;
    let winnerId = gameItem.dataset.winner_id;

    deselectTeam(tiForm);
    if (winnerId == teamId) selectTeam(tiForm);

    tiForm.addEventListener('click', (e) => {

      let isSelected = tiForm.classList.contains('winner');
      if (isSelected) {
        deselectTeam(tiForm);
        gameItemForm.dataset.form_winner_id = '';
      } else {
        let tiForms = gameItemForm.querySelectorAll('.team-item-form');
        tiForms.forEach(tif => deselectTeam(tif));
        selectTeam(tiForm);
        gameItemForm.dataset.form_winner_id = teamId;
      }

      let saveBtn = gameItemForm.querySelector('#saveBtn');
      if (gameItemForm.dataset.form_winner_id != gameItemForm.dataset.winner_id) {
        saveBtn.disabled = false;
        saveBtn.classList.replace('btn-outline-primary', 'btn-primary');
      } else {
        saveBtn.disabled = true;
        saveBtn.classList.replace('btn-primary', 'btn-outline-primary');
      }
    });
    ti.replaceWith(tiForm);
  });

  // add event listener to stat col to replace form with game item
  let statCol = gameItemForm.querySelector('.stat-col');
  statCol.addEventListener('click', (e) => {
    gameItem.classList.remove('d-none');
    gameItemForm.remove();
  });

  // save button
  let saveBtn = document.createElement('button');
  saveBtn.id = 'saveBtn';
  saveBtn.type = 'button';
  saveBtn.classList.add('btn', 'btn-outline-primary');
  saveBtn.textContent = 'Submit';
  saveBtn.addEventListener('click', handleGameItemFormSave);
  saveBtn.disabled = true;

  // cancel button
  let cancelBtn = document.createElement('button');
  cancelBtn.id = 'cancelBtn';
  cancelBtn.type = 'button';
  cancelBtn.classList.add('btn', 'btn-secondary');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', (e) => {
    gameItem.classList.remove('d-none');
    gameItemForm.remove();
  });

  let footer = document.createElement('div');
  footer.classList.add('d-flex', 'justify-content-end', 'mt-4', 'mb-2', 'column-gap-2');
  footer.appendChild(cancelBtn);
  footer.appendChild(saveBtn);
  gameItemForm.appendChild(footer);

  return gameItemForm;
}

/* ------------------------------------------------ */

function handleGameItemFormSave(e) {

  console.log('Start: handleGameItemFormSave()');
  let gameItemForm = e.target.closest('.game-item-form');
  let gameId = gameItemForm.dataset.game_id;
  let winnerId = gameItemForm.dataset.form_winner_id;

  // Update the game record with the new winner and status
  // also need to update the team records
  let gameRef = ref(db, 'games/' + gameId);
  let gameData = {
    winner_id: winnerId,
    status: (winnerId == '') ? 'PRE' : 'POST'
  };

  update(gameRef, gameData)
    .then(() => {
      onValue(ref(db, 'teams'), (snapshot) => {
        let teams = snapshot.val();
        onValue(ref(db, 'games'), (snapshot) => {
          let games = snapshot.val();
          updateRecords(teams, games);
        }, { onlyOnce: true });
      }, { onlyOnce: true });
    })
    .catch((error) => {
      console.error('Error updating game record:', error);
    });
}

/* ------------------------------------------------ */

function handleTeamSelection(e) {

  let team = APP.focusedTeam;
  let allTeamItems = document.querySelectorAll('.team-item');
  if (!team) {
    allTeamItems.forEach(ti => {
      ti.classList.remove('selected', 'unselected');
    });
    return;
  }

  let teamItem1 = document.querySelector('.team-item[data-team_name="' + team + '"]');
  document.querySelectorAll('.team-item').forEach(ti => {
    if (ti.getAttribute('data-team_name') == team) {
      ti.classList.remove('unselected');
      ti.classList.add('selected');
      if (ti == teamItem1) {
        let gameGroup = ti.closest('.game-group');
        // scrollIntoView(gameGroup);
      }
    } else {
      ti.classList.remove('selected');
      ti.classList.add('unselected');
    }
  });
}

/* ------------------------------------------------ */

function scrollIntoView(element) {

  let header = document.querySelector('#main-header');
  let headerHeight = header.offsetHeight;
  let top = element.getBoundingClientRect().top;
  let elementMarginTop = window.getComputedStyle(element).marginTop;
  if (elementMarginTop) {
    top = top - parseInt(elementMarginTop);
  }

  let scrollTop = window.scrollY;
  let topAdjusted = top + scrollTop - headerHeight;

  console.log('top', top, 'scrollTop', scrollTop, 'headerHeight', headerHeight, 'topAdjusted', topAdjusted);
  window.scrollTo({ top: topAdjusted, behavior: 'smooth' });
}

/* ------------------------------------------------ */

// if user swipes left or right, change the week
// if no week to change to, do nothing (e.g. if at the first or last week)
let scheduleContainer = document.querySelector('#schedule-container');
scheduleContainer.addEventListener('touchstart', gest.handleTouchStart, false);
scheduleContainer.addEventListener('touchmove', (evt) => {
  let dir = gest.handleTouchMove(evt);
  if (!dir) return;

  let active = document.querySelector('#filter-container .active');
  let next = active.nextElementSibling;
  let prev = active.previousElementSibling;

  if (dir == 'right' && prev) {
    prev.click();
  } else if (dir == 'left' && next) {
    next.click();
  }
}, false);

function changeWeek(dir) {

  let active = document.querySelector('#filter-container .active');
  let next = active.nextElementSibling;
  let prev = active.previousElementSibling;

  if (dir == 'next' && next) {
    next.click();
  } else if (dir == 'prev' && prev) {
    prev.click();
  }
}

/* ------------------------------------------------ */

function createAlert(type, msg) {

  let alertContainer = document.querySelector('#alert-container');

  // destroy any existing alerts
  let existingAlert = document.querySelector('.alert');
  if (existingAlert) {
    existingAlert.remove();
  }

  let alert = document.createElement('div');
  alert.classList.add('alert', 'd-flex', 'align-items-center');
  alert.classList.add('py-2', 'px-3', 'mb-2');
  alert.classList.add('alert-' + type);
  alert.setAttribute('role', 'alert');

  let alertMsg = document.createElement('div');
  alertMsg.classList.add('me-auto', 'fw-medium');
  alertMsg.innerHTML = msg;
  alert.appendChild(alertMsg);

  let closeBtn = document.createElement('button');
  closeBtn.id = 'alertCloseBtn';
  closeBtn.classList.add('btn-close');
  // closeBtn.classList.add('btn-' + type, 'align-middle', 'ms-2')
  closeBtn.classList.add('btn-sm');
  closeBtn.setAttribute('type', 'button');
  closeBtn.addEventListener('click', () => {
    alert.remove();
  });
  alert.appendChild(closeBtn);

  alertContainer.appendChild(alert);
}

/* ------------------------------------------------ */
// for testing swipe gestures on mobile device
// would normally console.log(), but this is not possible on mobile
// so we create an alert to display the swipe direction


