import * as util from './util.js';
import * as gest from './gestures.js';
import { DB, APP } from './data.js';

/* ------------------------------------------------ */

document.addEventListener('DOMContentLoaded', init);

async function init() {

  await initDB();
  initAPPDATA();
  initPage();
}

/* ------------------------------------------------ */

async function initDB() {

  await DB.load('Schedule');
}

/* ------------------------------------------------ */

function initAPPDATA() {

  let data = DB.get('Schedule');
  let weeks = data.map(d => d.week).filter((v, i, a) => a.findIndex(t => (t === v)) === i);
  let currentWeek = weeks[0];
  weeks.forEach(w => {
    let week = data.filter(d => d.week === w);
    let games = week.filter(d => d.status === 'POST');
    if (games.length > 0) {
      currentWeek = w;
    }
  });

  APP.set('currentWeek', currentWeek);
  APP.set('focusedTeam', null);
}

/* ------------------------------------------------ */

function initPage() {

  makeFilters();

  let currentWeek = APP.get('currentWeek');
  let currentWeekBtn = document.querySelector('#filter-container button[data-week="' + currentWeek + '"]');
  currentWeekBtn.click();

  let loading = document.querySelector('#loading');
  loading.classList.add('d-none');
}

/* ------------------------------------------------ */

function makeFilters() {

  let data = DB.get('Schedule');
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
      let schedule = data.filter(d => d.week === week);
      makeSchedule(schedule);

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

function makeSchedule(data, groupField = 'time') {

  let scheduleContainer = document.querySelector('#schedule-container');
  scheduleContainer.innerHTML = '';

  let groups = data.map(d => d[groupField]).filter((v, i, a) => a.findIndex(t => (t === v)) === i);
  groups.forEach(g => {
    let gameCard = util.createFromTemplate('game-group-template');
    let gameGroup = gameCard.querySelector('.cont-card-body');
    let games = data.filter(d => d[groupField] === g);
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

  setTimeout(() => {
    let focusedTeam = APP.get('focusedTeam');
    if (focusedTeam) {
      handleTeamSelection();
    }
    // if (!focusedTeam) {
    //   let gameGroup = scheduleContainer.querySelector('.game-group');
    //   scrollIntoView(gameGroup);
    // }
  }, 250);
}

/* ------------------------------------------------ */

function makeGameItem(d) {

  let gameItem = util.createFromTemplate('game-item-template');
  gameItem.id = 'game-' + d.game_id;
  gameItem.setAttribute('data-game_id', d.game_id);
  gameItem.setAttribute('data-winner_id', d.winner_id);

  let items = gameItem.querySelectorAll('span[data-item]');
  items.forEach(item => {
    let dataItem = item.getAttribute('data-item');
    let text = d[dataItem];
    if (dataItem == 'court') text = text.replace('Court ', 'C');
    item.textContent = text;
  });

  let teamItems = gameItem.querySelectorAll('.team-item');
  teamItems.forEach(teamItem => {
    let teamId = teamItem.querySelector('.team-id').textContent;
    let teamName = teamItem.querySelector('.team-name').textContent;
    teamItem.setAttribute('data-team_id', teamId);
    teamItem.setAttribute('data-team_name', teamName);

    let teamResult = teamItem.querySelector('.team-result');
    if (d.winner_id == teamId) {
      teamResult.classList.add('fa-solid', 'fa-circle-check');
      teamItem.classList.add('winner');
    } else {
      teamResult.classList.add('fa-regular', 'fa-circle');
    }

    teamItem.addEventListener('click', (e) => {
      let focusedTeam = (APP.get('focusedTeam') == teamName) ? null : teamName;
      APP.set('focusedTeam', focusedTeam);
      handleTeamSelection();
    });
  });

  if (d.winner_id) {
    let winner = gameItem.querySelector('.team-item[data-team_id="' + d.winner_id + '"]');
    let teamResult = winner.querySelector('.team-result');
    teamResult.classList.replace('fa-regular', 'fa-solid');
    teamResult.classList.replace('fa-circle', 'fa-circle-check');
    winner.classList.add('winner');
  }

  let statCol = gameItem.querySelector('.stat-col');
  statCol.addEventListener('click', (e) => {
    let gameItemForm = gameItemToForm(gameItem);
    gameItem.replaceWith(gameItemForm);
  });


  // set up expand button
  // let expandBtn = gameItem.querySelector('.expand-btn');
  // expandBtn.addEventListener('click', () => {

  //   let gameItemForm = gameItem.cloneNode(true);
  //   let expandBtnForm = gameItemForm.querySelector('.expand-btn');
  //   let expandBtnFormIcon = expandBtnForm.querySelector('i');
  //   expandBtnFormIcon.classList.replace('fa-chevron-down', 'fa-chevron-up');
  //   expandBtnForm.addEventListener('click', () => {
  //     gameItemForm.replaceWith(gameItem);
  //   });

  //   let submitBtn = document.createElement('button');
  //   submitBtn.type = 'button';
  //   submitBtn.classList.add('btn', 'btn-sm', 'btn-primary', 'w-75');
  //   submitBtn.innerHTML = '<i class="fas fa-check"></i>';
  //   submitBtn.addEventListener('click', () => {
  //     let winner = gameItemForm.querySelector('input[name="' + d.game_id + '"]:checked');
  //     if (!winner) {
  //       createAlert('danger', 'Please select a winner');
  //       return;
  //     }

  //     let winnerId = winner.value;
  //     let game = DB.get('Schedule').find(g => g.game_id == d.game_id);
  //     game.winner_id = winnerId;
  //     let newGameItem = makeGameItem(game);
  //     gameItemForm.replaceWith(newGameItem);
  //   });

  //   let statCol = gameItemForm.querySelector('.stat-col');
  //   statCol.classList.add('d-flex', 'align-items-center');
  //   statCol.innerHTML = '';
  //   statCol.appendChild(submitBtn);
  //   // let statColContent = statCol.querySelector('div');
  //   // statColContent.innerHTML = '';
  //   // statColContent.appendChild(submitBtn);

  //   // make the team items selectable
  //   let teams = gameItemForm.querySelectorAll('.team-item');
  //   teams.forEach(team => {

  //     let teamId = team.querySelector('.team-id').textContent;

  //     let teamCopy = team.cloneNode(true);
  //     //
  //     let isWinner = team.classList.contains('winner');

  //     let input = document.createElement('input');
  //     input.classList.add('ms-auto');
  //     input.setAttribute('type', 'radio');
  //     input.setAttribute('name', d.game_id);
  //     input.setAttribute('id', teamId);
  //     input.setAttribute('value', teamId);
  //     if (isWinner) input.setAttribute('checked', true);

  //     let teamResult = teamCopy.querySelector('.team-result');
  //     teamResult.replaceWith(input);

  //     let label = document.createElement('label');
  //     label.setAttribute('for', teamId);
  //     label.appendChild(teamCopy);

  //     team.replaceWith(label);
  //   });

  //   gameItem.replaceWith(gameItemForm);
  // });

  return gameItem;
}

/* ------------------------------------------------ */

function handleTeamSelection(e) {

  let team = APP.get('focusedTeam');
  let teamItem1 = document.querySelector('.team-item[data-team_name="' + team + '"]');
  document.querySelectorAll('.team-item').forEach(ti => {
    if (ti.getAttribute('data-team_name') == team) {
      ti.classList.add('selected');
      if (ti == teamItem1) {
        let gameGroup = ti.closest('.game-group');
        scrollIntoView(gameGroup);
      }
    } else {
      ti.classList.remove('selected');
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


