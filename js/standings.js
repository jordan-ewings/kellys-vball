import * as util from './util.js';
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

  await DB.load('Teams');
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
  // APP.set('focusedTeam', null);
}

/* ------------------------------------------------ */

function initPage() {

  makeStandings();

  let loading = document.querySelector('#loading');
  loading.classList.add('d-none');
}

/* ------------------------------------------------ */

function makeStandings() {

  let data = DB.get('Teams');

  // process data
  data.forEach(team => {
    team.record = team.wins + '-' + team.losses;
    team.wins = parseInt(team.wins);
    team.losses = parseInt(team.losses);
    team.games = team.wins + team.losses;
    team.winPct = team.games > 0 ? team.wins / team.games : 0;
  });

  // sort data
  data.sort((a, b) => {
    if (a.winPct < b.winPct) return 1;
    if (a.winPct > b.winPct) return -1;
    return 0;
  });

  console.log(data);

  // add rank
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

  let standingsContainer = document.querySelector('#standings-container');
  let standingsTable = standingsContainer.querySelector('table');
  let standingsHead = standingsTable.querySelector('thead');
  let standingsBody = standingsTable.querySelector('tbody');

  data.forEach((team, index) => {

    let standingsItem = util.createFromTemplate('standings-item-template');

    if (index == 0) {
      let tr = document.createElement('tr');
      let tds = standingsItem.querySelectorAll('td');
      tds.forEach(td => {
        let th = document.createElement('th');
        th.classList.add(td.className);
        th.textContent = td.getAttribute('data-column');
        tr.appendChild(th);
      });
      standingsHead.appendChild(tr);
    }

    let dataItems = standingsItem.querySelectorAll('[data-item]');
    dataItems.forEach(item => {
      let dataItem = item.getAttribute('data-item');
      item.textContent = team[dataItem];
    });

    standingsBody.appendChild(standingsItem);
  });
}

