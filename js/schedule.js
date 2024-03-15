import * as util from './util.js';
import DB from './DB.js';

/* ------------------------------------------------ */

document.addEventListener('DOMContentLoaded', init);

async function init() {

  await DB.load('Schedule');
  makeFilters();
}

/* ------------------------------------------------ */

function makeGameItem(d) {

  let matchup = util.createFromTemplate('game-item-template');
  let items = matchup.querySelectorAll('span[data-item]');

  items.forEach(item => {
    let dataItem = item.getAttribute('data-item');
    let text = d[dataItem];
    if (dataItem == 'court') text = text.replace('Court ', '');
    item.textContent = text;
  });

  return matchup;
}

/* ------------------------------------------------ */

function makeSchedule(data, groupField = 'time') {

  let scheduleContainer = document.querySelector('#schedule-container');
  scheduleContainer.innerHTML = '';

  let groups = data.map(d => d[groupField]).filter((v, i, a) => a.findIndex(t => (t === v)) === i);
  groups.forEach(g => {
    let gameGroup = util.createFromTemplate('game-group-template');
    let games = data.filter(d => d[groupField] === g);
    games.forEach(game => {
      let gameItem = makeGameItem(game);
      gameGroup.appendChild(gameItem);
    });

    scheduleContainer.appendChild(gameGroup);
  });

  let teamItems = scheduleContainer.querySelectorAll('.team-item');
  teamItems.forEach(teamItem => {
    teamItem.addEventListener('click', handleTeamSelection);
    teamItem.addEventListener('mouseover', handleTeamHover);
  });

}

/* ------------------------------------------------ */

function handleTeamSelection(e) {

  let teamItems = document.querySelectorAll('.team-item');
  let statCols = document.querySelectorAll('.stat-col');
  let team = e.target.querySelector('.team-name').textContent;
  let isSelected = false;
  let statCol = e.target.closest('.game-item').querySelector('.stat-col');
  if (statCol.classList.contains('selected')) isSelected = true;

  if (isSelected) {
    teamItems.forEach(ti => {
      ti.classList.remove('selected');
    });
    statCols.forEach(sc => {
      sc.classList.remove('selected');
    });
    return;
  }

  teamItems.forEach(ti => {
    let teamName = ti.querySelector('.team-name').textContent;
    if (teamName === team) {
      ti.classList.add('selected');
    } else {
      ti.classList.remove('selected');
    }
  });

  statCols.forEach(sc => {
    let game = sc.closest('.game-item');
    let gameTeamItems = game.querySelectorAll('.team-item');
    let highlight = false;
    gameTeamItems.forEach(ti => {
      let gameTeam = ti.querySelector('.team-name').textContent;
      if (gameTeam === team) {
        highlight = true;
      }
    });
    if (highlight) {
      sc.classList.add('selected');
    } else {
      sc.classList.remove('selected');
    }
  });
}

/* ------------------------------------------------ */

function handleTeamHover(e) {
  let statCols = document.querySelectorAll('.stat-col');
  let isTeamSelected = false;
  statCols.forEach(sc => {
    if (sc.classList.contains('selected')) {
      isTeamSelected = true;
    }
  });
  if (isTeamSelected) return;

  let team = e.target.querySelector('.team-name').textContent;
  let teamItems = document.querySelectorAll('.team-item');
  teamItems.forEach(ti => {
    let teamName = ti.querySelector('.team-name').textContent;
    if (teamName === team) {
      ti.classList.add('selected');
    } else {
      ti.classList.remove('selected');
    }
  });
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
      e.target.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'center' });
    });

    btn.classList.add('btn', 'text-dim2', 'fw-medium', 'text-nowrap');
    btn.innerHTML = label;
    filterContainer.appendChild(btn);
  });

  let initButton = filterContainer.querySelector('button');
  initButton.click();
}

