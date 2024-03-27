import * as util from './util.js';
import { db, APP } from './firebase.js';
import { ref, get, query, equalTo, child, onValue, set, update, remove, onChildAdded, onChildChanged, onChildRemoved, runTransaction } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

/* ------------------------------------------------ */

document.addEventListener('DOMContentLoaded', init);

function init() {

  let userLeagueId = localStorage.getItem('userLeagueId');
  if (userLeagueId == null) {
    userLeagueId = '202401MONDAY';
    localStorage.setItem('userLeagueId', userLeagueId);
  }

  onValue(ref(db, 'leagues/' + userLeagueId), snapshot => {
    let data = snapshot.val();
    if (data) {
      APP.league = data;
      APP.gamesPath = data.refs.games;
      APP.teamsPath = data.refs.teams;
      console.log(APP);
      initPageContent();

    } else {
      haltPageContent('Please select a league.');
    }

  }, { onlyOnce: true });
}

/* ------------------------------------------------ */

function initPageContent() {

  onValue(ref(db, APP['gamesPath']), (snapshot) => {

    let games = Object.values(snapshot.val());
    let nextGame = games.find(g => g.status === 'PRE');
    let currentWeek = nextGame.week;
    APP.currentWeek = currentWeek;

    makeFilters(games);

    let currentWeekButton = document.querySelector('#filter-container button[data-week="' + currentWeek + '"]');
    currentWeekButton.click();

  }, { onlyOnce: true });

  document.querySelector('#loading').remove();
  document.querySelector('#league-title').textContent = APP.league.title;
}

/* ------------------------------------------------ */

function haltPageContent(msg) {

  let alert = util.createAlert('danger', msg);
  alert.querySelector('.btn-close').remove();

  document.querySelector('#main-header').appendChild(alert);
  document.querySelector('#loading').remove();
  document.querySelector('footer').remove();

  let brand = document.querySelector('#nav-index');
  brand.classList.add('direct-user');
}

/* ------------------------------------------------ */

function makeFilters(data) {

  let filterContainer = document.querySelector('#filter-container');
  let weeks = data.map(d => {
    return { value: d.week, label: d.week_label };
  }).filter((v, i, a) => a.findIndex(t => (t.value === v.value)) === i);

  weeks.forEach(w => {
    let value = w.value;
    let label = w.label;
    let btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('data-week', value);
    btn.classList.add('btn', 'text-nowrap');
    btn.innerHTML = label;

    btn.addEventListener('click', (e) => {
      let week = e.target.getAttribute('data-week');
      onValue(ref(db, APP.gamesPath), (snapshot) => {

        let games = Object.values(snapshot.val()).filter(g => g.week == week);
        onValue(ref(db, APP.teamsPath), (snapshot) => {
          let teams = snapshot.val();
          games.forEach(g => {
            Object.keys(g.teams).forEach(teamId => {
              let teamObj = teams[teamId];
              g['teams'][teamId] = { ...teamObj };
            });
          });
          makeSchedule(games);
        }, { onlyOnce: true });
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



  // if game is updated

  // onChildChanged(ref(db, APP.gamesPath), (snapshot) => {
  //   let game = snapshot.val();
  //   let gameItem = document.querySelector('#game-' + game.game_id);
  //   let gameItemForm = document.querySelector('.game-item-form[data-game_id="' + game.game_id + '"]');
  //   if (!gameItem) return;

  //   let newGameItem = makeGameItem(game);
  //   if (gameItemForm) newGameItem.classList.add('d-none');
  //   gameItem.replaceWith(newGameItem);

  //   let wasPending = gameItem.classList.contains('pending');
  //   let winnerChanged = newGameItem.dataset.winner_id != gameItem.dataset.winner_id;
  //   if (!winnerChanged || newGameItem.dataset.winner_id == '') return;

  //   if (!gameItemForm) {
  //     if (wasPending) return;
  //     let caret = newGameItem.querySelector('.team-result.fa-caret-left');
  //     caret.classList.add('fa-beat-fade');
  //     setTimeout(() => {
  //       caret.classList.remove('fa-beat-fade');
  //     }, 1200);
  //     return;
  //   }

  //   if (gameItemForm) {

  //     let teamCol = gameItemForm.querySelector('.team-col');
  //     teamCol.style.pointerEvents = 'none';
  //     teamCol.style.opacity = '0.5';

  //     let formFooter = gameItemForm.querySelector('.form-footer');
  //     formFooter.innerHTML = '';
  //     let alert = util.createAlert('danger', 'This game has been updated by another user. Close this form to see the changes.');
  //     alert.querySelector('.btn-close').remove();
  //     let alertMsg = alert.querySelector('.me-auto');
  //     alertMsg.style.fontSize = '0.95rem';
  //     alertMsg.style.fontWeight = '400';
  //     formFooter.appendChild(alert);

  //     let editIcon = gameItemForm.querySelector('.edit-icon');
  //     editIcon.classList.add('text-danger', 'fa-fade');
  //   }
  // });
}

/* ------------------------------------------------ */

function makeGameItem(d) {

  let gameItem = util.createFromTemplate('game-item-template');
  gameItem.id = 'game-' + d.id;
  gameItem.dataset.game_id = d.id;

  gameItem.classList.add((d.status == 'PRE') ? 'pre' : 'post');
  gameItem.dataset.winner_id = (d.status == 'POST') ? d.winner : '';

  gameItem.querySelector('.game-time').textContent = d.time;
  gameItem.querySelector('.game-court').textContent = d.court;

  let teams = Object.keys(d.teams);
  teams.forEach((teamId, index) => {

    let teamItem = gameItem.querySelector('.team-item-' + (index + 1));
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

    if (APP.focusedTeam) {
      let isFocused = (APP.focusedTeam == teamId);
      teamItem.classList.toggle('selected', isFocused);
      teamItem.classList.toggle('unselected', !isFocused);
    }

    teamItem.querySelector('.team-name').addEventListener('click', (e) => {
      let focusedTeam = (APP.focusedTeam == teamId) ? null : teamId;
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

  // set winner
  let gameRef = ref(db, APP.gamesPath + '/' + d.id);
  onValue(gameRef, (snapshot) => {

    let game = snapshot.val();
    gameItem.classList.remove('pre', 'post');
    gameItem.classList.add((game.status == 'PRE') ? 'pre' : 'post');
    gameItem.dataset.winner_id = (game.status == 'POST') ? game.winner : '';
    let teamItems = gameItem.querySelectorAll('.team-item');
    teamItems.forEach(ti => {
      ti.classList.remove('winner', 'loser');
      let teamId = ti.dataset.team_id;
      if (game.status == 'POST') {
        if (teamId == game.winner) ti.classList.add('winner');
        if (teamId != game.winner) ti.classList.add('loser');
      }
    });

    let gameItemForm = document.querySelector('.game-item-form[data-game_id="' + d.id + '"]');
    if (gameItemForm) {
      showGameUpdateAlert(gameItemForm);
    }
  });

  return gameItem;
}

/* ------------------------------------------------ */

function showGameUpdateAlert(gameItemForm) {

  let teamCol = gameItemForm.querySelector('.team-col');
  teamCol.style.pointerEvents = 'none';
  teamCol.style.opacity = '0.5';

  let formFooter = gameItemForm.querySelector('.form-footer');
  formFooter.innerHTML = '';
  let alert = util.createAlert('danger', 'This game has been updated by another user. Close this form to see the changes.');
  alert.querySelector('.btn-close').remove();
  let alertMsg = alert.querySelector('.me-auto');
  alertMsg.style.fontSize = '0.95rem';
  alertMsg.style.fontWeight = '400';
  formFooter.appendChild(alert);

  let editIcon = gameItemForm.querySelector('.edit-icon');
  editIcon.classList.add('text-danger', 'fa-fade');
  editIcon.style.fontSize = '1.5rem';
}

// function flashGameUpdate(gameItem) {
//   gameItem.classList.add('flash-update');
//   setTimeout(() => {
//     gameItem.classList.remove('flash-update');
//   }, 1200);
// }

/* ------------------------------------------------ */

function gameItemToForm(gameItem) {

  // gameItem.classList.remove('flash-update');
  // let caret = gameItem.querySelector('.team-result.fa-caret-left');
  // if (caret) caret.classList.remove('fa-beat-fade');

  let gameItemForm = gameItem.cloneNode(true);
  gameItemForm.classList.add('game-item-form');
  gameItemForm.removeAttribute('id');
  gameItemForm.dataset.form_winner_id = gameItem.dataset.winner_id;



  let gameId = gameItem.dataset.game_id;
  let winnerId = gameItem.dataset.winner_id;


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
    let gi = document.querySelector('#game-' + gameId);
    let giForm = document.querySelector('.game-item-form[data-game_id="' + gameId + '"]');
    let newWinnerId = giForm.dataset.form_winner_id;
    gi.classList.remove('d-none');
    // gi.classList.add('pending');
    giForm.remove();

    if (newWinnerId == winnerId) return;

    let teamItems = giForm.querySelectorAll('.team-item');
    teamItems.forEach(ti => {
      let teamId = ti.dataset.team_id;
      let teamRef = ref(db, APP.teamsPath + '/' + teamId);
      let winsChange = 0;
      let lossesChange = 0;
      if (teamId == newWinnerId) {
        winsChange = 1;
        if (winnerId != '') lossesChange = -1;
      } else if (teamId == winnerId) {
        winsChange = -1;
        if (newWinnerId != '') lossesChange = 1;
      } else {
        if (winnerId == '' && newWinnerId != '') {
          // team is now a loser
          lossesChange = 1;
        } else if (winnerId != '' && newWinnerId == '') {
          // team is no longer a loser
          lossesChange = -1;
        }
      }

      // update team's wins, losses, and record
      runTransaction(teamRef, (team) => {
        if (team) {
          team.wins += winsChange;
          team.losses += lossesChange;
          team.record = team.wins + '-' + team.losses;
        }
        return team;
      });
    });

    // update game's winner and status
    let gameRef = ref(db, APP.gamesPath + '/' + gameId);
    update(gameRef, {
      winner: newWinnerId,
      status: (newWinnerId == '') ? 'PRE' : 'POST'
    });
  });

  let footer = document.createElement('div');
  footer.classList.add('d-flex', 'justify-content-end', 'mt-4', 'mb-2', 'column-gap-2', 'form-footer');
  footer.appendChild(cancelBtn);
  footer.appendChild(saveBtn);
  gameItemForm.appendChild(footer);

  // helper functions to select/deselect teams
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

      let teamId = tiForm.dataset.team_id;
      let currentWinnerId = gameItemForm.dataset.form_winner_id;
      let newWinnerId = (currentWinnerId == teamId) ? '' : teamId;
      setWinner(newWinnerId);

      let gameChanged = gameItemForm.dataset.form_winner_id != gameItemForm.dataset.winner_id;
      gameItemForm.classList.toggle('changed', gameChanged);
      saveBtn.disabled = !gameChanged;
      saveBtn.classList.toggle('btn-outline-primary', !gameChanged);
      saveBtn.classList.toggle('btn-primary', gameChanged);
    });

    ti.replaceWith(tiForm);
  });

  setWinner(winnerId);

  return gameItemForm;
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

  let teamItem1 = document.querySelector('.team-item[data-team_id="' + team + '"]');
  document.querySelectorAll('.team-item').forEach(ti => {
    if (ti.getAttribute('data-team_id') == team) {
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

// function scrollIntoView(element) {

//   let header = document.querySelector('#main-header');
//   let headerHeight = header.offsetHeight;
//   let top = element.getBoundingClientRect().top;
//   let elementMarginTop = window.getComputedStyle(element).marginTop;
//   if (elementMarginTop) {
//     top = top - parseInt(elementMarginTop);
//   }

//   let scrollTop = window.scrollY;
//   let topAdjusted = top + scrollTop - headerHeight;

//   console.log('top', top, 'scrollTop', scrollTop, 'headerHeight', headerHeight, 'topAdjusted', topAdjusted);
//   window.scrollTo({ top: topAdjusted, behavior: 'smooth' });
// }

/* ------------------------------------------------ */

// if user swipes left or right, change the week
// let scheduleContainer = document.querySelector('#schedule-container');
// scheduleContainer.addEventListener('touchstart', gest.handleTouchStart, false);
// scheduleContainer.addEventListener('touchmove', (evt) => {
//   let dir = gest.handleTouchMove(evt);
//   if (!dir) return;

//   let active = document.querySelector('#filter-container .active');
//   let next = active.nextElementSibling;
//   let prev = active.previousElementSibling;

//   if (dir == 'right' && prev) {
//     prev.click();
//   } else if (dir == 'left' && next) {
//     next.click();
//   }
// }, false);

/* ------------------------------------------------ */
