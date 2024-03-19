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
  let items = gameItem.querySelectorAll('span[data-item]');

  items.forEach(item => {
    let dataItem = item.getAttribute('data-item');
    let text = d[dataItem];
    if (dataItem == 'court') text = text.replace('Court ', 'C');
    item.textContent = text;
  });

  let teamItems = gameItem.querySelectorAll('.team-item');
  teamItems.forEach(teamItem => {
    teamItem.addEventListener('click', handleTeamSelection);
    teamItem.addEventListener('mouseover', handleTeamHover);
    teamItem.addEventListener('mouseleave', resetTeamSelection);

    let teamName = teamItem.querySelector('.team-name').textContent;
    teamItem.setAttribute('data-team_name', teamName);
  });

  return gameItem;
}

/* ------------------------------------------------ */

function resetTeamSelection(e, force = false) {

  if (APP.get('focusedTeam') && !force) return;

  let teamItems = document.querySelectorAll('.team-item');
  let statCols = document.querySelectorAll('.stat-col');
  teamItems.forEach(ti => {
    ti.classList.remove('selected');
  });
  statCols.forEach(sc => {
    sc.classList.remove('selected');
  });
}

/* ------------------------------------------------ */

function handleTeamSelection(e) {

  resetTeamSelection(e, true);
  let team = APP.get('focusedTeam');
  if (e) {
    let clickedTeam = e.target.dataset.team_name;
    if (clickedTeam == team) {
      APP.set('focusedTeam', null);
      return;
    }
    APP.set('focusedTeam', clickedTeam);
    team = clickedTeam;
  }

  let teamItems = document.querySelectorAll('.team-item[data-team_name="' + team + '"]');
  teamItems.forEach((ti, index) => {
    ti.classList.add('selected');
    let gameItem = ti.closest('.game-item');
    let statCol = gameItem.querySelector('.stat-col');
    statCol.classList.add('selected');

    if (index == 0) {
      let gameGroup = gameItem.closest('.game-group');
      scrollIntoView(gameGroup);
    }
  });
}

/* ------------------------------------------------ */

function handleTeamHover(e) {

  if (APP.get('focusedTeam')) return;
  resetTeamSelection(e);

  let team = e.target.dataset.team_name;
  let teamItems = document.querySelectorAll('.team-item[data-team_name="' + team + '"]');
  teamItems.forEach(ti => {
    ti.classList.add('selected');
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


