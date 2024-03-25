import * as util from './util.js';
import * as gest from './gestures.js';
import { db, APP } from './firebase.js';
import { ref, get, query, equalTo, child, onValue, set, update, remove, onChildAdded, onChildChanged, onChildRemoved } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

/* ------------------------------------------------ */

document.addEventListener('DOMContentLoaded', init);

function init() {

  let season = localStorage.getItem('season') || '2024';
  let session = localStorage.getItem('session') || '01';
  let league = localStorage.getItem('league') || 'MONDAY';
  APP.leaguePath = season + '/' + session + '/' + league;

  onValue(ref(db, 'games/' + APP.leaguePath), (snapshot) => {

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
    return { value: d.week, label: 'Week ' + d.week };
  }).filter((v, i, a) => a.findIndex(t => (t.value === v.value)) === i);

  weeks.forEach(w => {
    let value = w.value;
    let label = w.label;
    let btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('data-week', value);
    btn.classList.add('btn', 'text-dim2', 'fw-medium', 'text-nowrap');
    btn.innerHTML = label;

    btn.addEventListener('click', (e) => {
      let week = e.target.getAttribute('data-week');
      onValue(ref(db, 'games/' + APP.leaguePath), (snapshot) => {
        let games = Object.values(snapshot.val()).filter(g => g.week == week);
        makeSchedule(games);
      }, { onlyOnce: true });

      let active = filterContainer.querySelector('.active');
      if (active) active.classList.remove('active');
      e.target.classList.add('active');
      e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });

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

  onChildChanged(ref(db, 'games/' + APP.leaguePath), (snapshot) => {
    let game = snapshot.val();
    let gameItem = document.querySelector('#game-' + game.game_id);
    let gameItemForm = document.querySelector('.game-item-form[data-game_id="' + game.game_id + '"]');
    if (!gameItem) return;

    let newGameItem = makeGameItem(game);
    if (gameItemForm) newGameItem.classList.add('d-none');
    gameItem.replaceWith(newGameItem);

    let winnerChanged = newGameItem.dataset.winner_id != gameItem.dataset.winner_id;
    if (!winnerChanged) return;

    if (!gameItemForm) {
      newGameItem.classList.add('flash-update');
      let caret = newGameItem.querySelector('.team-result.fa-caret-left');
      caret.classList.add('fa-beat-fade');
      setTimeout(() => {
        newGameItem.classList.remove('flash-update');
        caret.classList.remove('fa-beat-fade');
      }, 2000);
      return;
    }


    if (gameItemForm) {

      let teamCol = gameItemForm.querySelector('.team-col');
      teamCol.style.pointerEvents = 'none';
      teamCol.style.opacity = '0.5';

      let formFooter = gameItemForm.querySelector('.form-footer');
      formFooter.innerHTML = '';
      let alert = createAlert('danger', 'This game has been updated by another user. Close this form to see the changes.');
      alert.querySelector('.btn-close').remove();
      let alertMsg = alert.querySelector('.me-auto');
      alertMsg.style.fontSize = '0.9rem';
      alertMsg.style.fontWeight = '400';
      formFooter.appendChild(alert);

      let editIcon = gameItemForm.querySelector('.edit-icon');
      editIcon.classList.add('text-danger', 'fa-fade');

      let statCol = gameItemForm.querySelector('.stat-col');
      statCol.addEventListener('click', (e) => {
        newGameItem.classList.add('flash-update');
        let caret = newGameItem.querySelector('.team-result.fa-caret-left');
        caret.classList.add('fa-beat-fade');
        setTimeout(() => {
          newGameItem.classList.remove('flash-update');
          caret.classList.remove('fa-beat-fade');
        }, 2000);
      });
    }
  });
}

/* ------------------------------------------------ */

function makeGameItem(d) {

  let gameItem = util.createFromTemplate('game-item-template');
  gameItem.classList.add((d.status == 'PRE') ? 'pre' : 'post');
  gameItem.id = 'game-' + d.game_id;
  gameItem.dataset.game_id = d.game_id;
  gameItem.dataset.winner_id = d.winner_id;

  let items = gameItem.querySelectorAll('span[data-item]');
  items.forEach(item => {
    let dataItem = item.getAttribute('data-item');
    let text = d[dataItem];
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

    let isWinner = d.winner_id == teamId;
    teamItem.classList.toggle('winner', isWinner);

    let resultIcon = teamItem.querySelector('.team-result');
    if (isWinner) resultIcon.classList.add('fa-solid', 'fa-caret-left');

    if (APP.focusedTeam) {
      let isFocused = (APP.focusedTeam == teamName);
      teamItem.classList.toggle('selected', isFocused);
      teamItem.classList.toggle('unselected', !isFocused);
    }

    teamItem.querySelector('.team-name').addEventListener('click', (e) => {
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

  gameItem.classList.remove('flash-update');
  let caret = gameItem.querySelector('.team-result.fa-caret-left');
  if (caret) caret.classList.remove('fa-beat-fade');

  let gameItemForm = gameItem.cloneNode(true);
  gameItemForm.classList.add('game-item-form');
  gameItemForm.removeAttribute('id');
  gameItemForm.dataset.form_winner_id = gameItem.dataset.winner_id;
  let gameId = gameItem.dataset.game_id;

  // add event listener to stat col to replace form with game item
  let statCol = gameItemForm.querySelector('.stat-col');
  let editIcon = statCol.querySelector('.edit-icon');
  editIcon.classList.replace('fa-pen', 'fa-xmark');
  statCol.addEventListener('click', (e) => {
    document.querySelector('#game-' + gameId).classList.remove('d-none');
    gameItemForm.remove();
  });

  // cancel button
  let cancelBtn = document.createElement('button');
  cancelBtn.id = 'cancelBtn';
  cancelBtn.type = 'button';
  cancelBtn.classList.add('btn', 'btn-secondary');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', (e) => {
    document.querySelector('#game-' + gameId).classList.remove('d-none');
    gameItemForm.remove();
  });

  // save button
  let saveBtn = document.createElement('button');
  saveBtn.id = 'saveBtn';
  saveBtn.type = 'button';
  saveBtn.classList.add('btn', 'btn-outline-primary');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Submit';
  saveBtn.addEventListener('click', (e) => {
    document.querySelector('#game-' + gameId).classList.remove('d-none');
    gameItemForm.remove();
    handleGameItemFormSave(e);
  });

  let footer = document.createElement('div');
  footer.classList.add('d-flex', 'justify-content-end', 'mt-4', 'mb-2', 'column-gap-2', 'form-footer');
  footer.appendChild(cancelBtn);
  footer.appendChild(saveBtn);
  gameItemForm.appendChild(footer);

  // replace team items with team item forms
  let teamItems = gameItemForm.querySelectorAll('.team-item');
  teamItems.forEach(ti => {

    let tiForm = ti.cloneNode(true);
    tiForm.classList.add('py-1');

    let resultIcon = tiForm.querySelector('.team-result');
    resultIcon.classList.remove('fa-caret-left', 'fa-solid');
    resultIcon.classList.add('fa-regular', 'fa-circle-check');

    let isWinner = ti.classList.contains('winner');
    resultIcon.classList.toggle('fa-solid', isWinner);

    ti.replaceWith(tiForm);
  });

  // handle team selections
  let teamItemForms = gameItemForm.querySelectorAll('.team-item');
  teamItemForms.forEach(tiForm => {

    tiForm.addEventListener('click', (e) => {

      let userClear = tiForm.classList.contains('winner');
      let userSelect = !userClear;
      let newWinnerId = (userSelect) ? tiForm.dataset.team_id : '';

      teamItemForms.forEach(ti => {
        let isNewWinner = ti.dataset.team_id == newWinnerId;
        ti.classList.toggle('winner', isNewWinner);
        ti.querySelector('.team-result').classList.toggle('fa-solid', isNewWinner);
      });

      gameItemForm.dataset.form_winner_id = newWinnerId;
      let gameChanged = gameItemForm.dataset.form_winner_id != gameItemForm.dataset.winner_id;
      gameItemForm.classList.toggle('changed', gameChanged);
      saveBtn.disabled = !gameChanged;
      saveBtn.classList.toggle('btn-outline-primary', !gameChanged);
      saveBtn.classList.toggle('btn-primary', gameChanged);
    });
  });

  return gameItemForm;
}

/* ------------------------------------------------ */

function handleGameItemFormSave(e) {

  console.log('Start: handleGameItemFormSave()');
  let gameItemForm = e.target.closest('.game-item-form');
  let formGameId = gameItemForm.dataset.game_id;
  let formWinnerId = gameItemForm.dataset.form_winner_id;

  // check if winner is different than the game-item winner
  let gameItem = document.querySelector('#game-' + formGameId);
  let gameItemWinnerId = gameItem.dataset.winner_id;
  if (formWinnerId == gameItemWinnerId) {
    console.log('Winner is the same, no need to update');
    gameItem.classList.remove('d-none');
    gameItemForm.remove();
    return;
  }

  onValue(ref(db, 'teams/' + APP.leaguePath), (snapshot) => {
    let teams = snapshot.val();
    onValue(ref(db, 'games/' + APP.leaguePath), (snapshot) => {
      let games = snapshot.val();

      let standings = [];
      for (let teamId in teams) {
        let team = teams[teamId];
        team.wins_2 = 0;
        team.losses_2 = 0;
        standings.push(team);
      }

      for (let gameId in games) {
        let game = games[gameId];

        if (game.game_id == formGameId) {
          game.winner_id = formWinnerId;
          game.status = (formWinnerId == '') ? 'PRE' : 'POST';
        }

        if (game.winner_id == '') continue;
        let team1 = standings.find(t => t.id == game.team1_id);
        let team2 = standings.find(t => t.id == game.team2_id);
        if (game.winner_id == game.team1_id) {
          team1.wins_2++;
          team2.losses_2++;
        } else if (game.winner_id == game.team2_id) {
          team2.wins_2++;
          team1.losses_2++;
        }
      }

      let teamUpdatesCount = 0;
      let teamUpdates = {};
      standings.forEach(team => {
        team.record = team.wins_2 + '-' + team.losses_2;
        team.recordOld = team.wins + '-' + team.losses;
        let teamPath = '/teams/' + APP.leaguePath + '/' + team.id;
        if (team.record != team.recordOld) {
          teamUpdates[teamPath + '/wins'] = team.wins_2;
          teamUpdates[teamPath + '/losses'] = team.losses_2;
          teamUpdatesCount++;
        }
      });

      let gameUpdatesCount = 0;
      let gameUpdates = {};
      for (let gameId in games) {
        let game = games[gameId];
        let gamePath = '/games/' + APP.leaguePath + '/' + game.game_id;
        let team1 = standings.find(t => t.id == game.team1_id);
        let team2 = standings.find(t => t.id == game.team2_id);
        let team1Changed = team1.record != game.team1_record;
        let team2Changed = team2.record != game.team2_record;
        if (!team1Changed && !team2Changed) continue;

        gameUpdatesCount++;
        if (team1Changed) gameUpdates[gamePath + '/team1_record'] = team1.record;
        if (team2Changed) gameUpdates[gamePath + '/team2_record'] = team2.record;
      }

      let updates = {};
      // form game updates
      updates['/games/' + APP.leaguePath + '/' + formGameId + '/winner_id'] = formWinnerId;
      updates['/games/' + APP.leaguePath + '/' + formGameId + '/status'] = (formWinnerId == '') ? 'PRE' : 'POST';
      // team updates
      updates = { ...updates, ...teamUpdates };
      // game updates
      updates = { ...updates, ...gameUpdates };

      console.log('updates', updates);
      update(ref(db), updates)
        .then(() => {
          console.log(gameUpdatesCount + ' games, ' + teamUpdatesCount + ' teams updated');
        })
        .catch((error) => {
          console.error('Error updating records:', error);
        });

    }, { onlyOnce: true });
  }, { onlyOnce: true });
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

/* ------------------------------------------------ */

function createAlert(type, msg) {

  let alert = document.createElement('div');
  alert.classList.add('alert', 'd-flex', 'align-items-center');
  alert.classList.add('py-2', 'px-3', 'm-0');
  alert.classList.add('alert-' + type);
  alert.setAttribute('role', 'alert');

  let alertMsg = document.createElement('div');
  alertMsg.classList.add('me-auto');
  alertMsg.innerHTML = msg;
  alert.appendChild(alertMsg);

  let closeBtn = document.createElement('button');
  closeBtn.id = 'alertCloseBtn';
  closeBtn.classList.add('btn-close');
  closeBtn.classList.add('btn-sm');
  closeBtn.setAttribute('type', 'button');
  closeBtn.addEventListener('click', () => {
    alert.remove();
  });
  alert.appendChild(closeBtn);

  return alert;
}

/* ------------------------------------------------ */
