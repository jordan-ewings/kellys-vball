import * as util from './util.js';
import { db, APP } from './firebase.js';
import { ref, get, child, onValue, set, update, remove, onChildAdded, onChildChanged, onChildRemoved } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

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
    APP.league = data;
    APP.gamesPath = data.refs.games;
    APP.teamsPath = data.refs.teams;
    console.log(APP);
    initPageContent();
  }, { onlyOnce: true });
}

/* ------------------------------------------------ */

function initPageContent() {

  onValue(ref(db, APP.teamsPath), snapshot => {

    let teams = snapshot.val();
    makeStandings(teams);

    // document.querySelector('#loading').remove();
  });

  document.querySelector('#loading').remove();

}

/* ------------------------------------------------ */

function makeStandings(teams) {

  // create array from object
  let data = JSON.parse(JSON.stringify(teams));
  data = Object.values(data);

  // process data
  data.forEach(team => {
    team.games = team.wins + team.losses;
    team.winPct = team.games > 0 ? team.wins / team.games : 0;
  });

  // sort data
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

  makeStandingsStructure();
  let standingsHead = document.querySelector('#standings-container thead');
  let standingsBody = document.querySelector('#standings-container tbody');

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

    team.winPct = util.formatNumber(team.winPct, '0.000');
    team.id = parseInt(team.id);

    let dataItems = standingsItem.querySelectorAll('[data-item]');
    dataItems.forEach(item => {
      let dataItem = item.getAttribute('data-item');
      item.textContent = team[dataItem];
    });

    standingsBody.appendChild(standingsItem);
  });
}

/* ------------------------------------------------ */

function makeStandingsStructure() {

  let standingsContainer = document.querySelector('#standings-container');
  standingsContainer.innerHTML = '';

  let contCardTitle = document.createElement('div');
  contCardTitle.classList.add('cont-card-title');
  let contCardTitleContent = document.createElement('span');
  contCardTitleContent.textContent = 'LEADERBOARD';

  contCardTitle.appendChild(contCardTitleContent);

  let contCardBody = document.createElement('div');
  contCardBody.classList.add('cont-card-body');
  let tableResponsive = document.createElement('div');
  tableResponsive.classList.add('table-responsive');
  let table = document.createElement('table');
  table.classList.add('table', 'table-borderless', 'align-middle', 'text-nowrap', 'm-0');
  let thead = document.createElement('thead');
  let tbody = document.createElement('tbody');
  table.appendChild(thead);
  table.appendChild(tbody);

  tableResponsive.appendChild(table);
  contCardBody.appendChild(tableResponsive);

  standingsContainer.appendChild(contCardTitle);
  standingsContainer.appendChild(contCardBody);

}

