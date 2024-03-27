import * as util from './util.js';
import { db, APP } from './firebase.js';
import { ref, get, child, onValue, set, update, remove, onChildAdded, onChildChanged, onChildRemoved } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

/* ------------------------------------------------ */

document.addEventListener('DOMContentLoaded', init);

function init() {

  // ensure userLeagueId is set
  let userLeagueId = localStorage.getItem('userLeagueId');
  if (userLeagueId == null) {
    userLeagueId = '202401MONDAY';
    localStorage.setItem('userLeagueId', userLeagueId);
  }

  // load page if userLeagueId is valid
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

  onValue(ref(db, APP.teamsPath), snapshot => {
    let teams = snapshot.val();
    teams = Object.values(teams);
    makeStandings(teams);
    document.querySelector('#league-title').textContent = APP.league.title;
    showPageContent();
  });
}

/* ------------------------------------------------ */

function showPageContent() {
  document.querySelector('#loading').remove();
  document.querySelector('#main').classList.remove('d-none');
  document.querySelector('footer').classList.remove('d-none');
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
// generate standings

function makeStandings(teams) {

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
  makeStandingsStructure();
  let standingsHead = document.querySelector('#standings-container thead');
  let standingsBody = document.querySelector('#standings-container tbody');

  // populate standings
  data.forEach((team, index) => {

    let standingsItem = util.createFromTemplate('standings-item-template');

    // add headers if first item
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

    // populate data items
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

  // clear standings container
  let standingsContainer = document.querySelector('#standings-container');
  standingsContainer.innerHTML = '';

  // card title
  let contCardTitle = document.createElement('div');
  contCardTitle.classList.add('cont-card-title');
  let contCardTitleContent = document.createElement('span');
  contCardTitleContent.textContent = 'LEADERBOARD';
  contCardTitle.appendChild(contCardTitleContent);

  // card body + table responsive div
  let contCardBody = document.createElement('div');
  contCardBody.classList.add('cont-card-body');
  let tableResponsive = document.createElement('div');
  tableResponsive.classList.add('table-responsive');

  // table
  let table = document.createElement('table');
  table.classList.add('table', 'table-borderless', 'align-middle', 'text-nowrap', 'm-0');
  let thead = document.createElement('thead');
  let tbody = document.createElement('tbody');
  table.appendChild(thead);
  table.appendChild(tbody);

  // append elements
  tableResponsive.appendChild(table);
  contCardBody.appendChild(tableResponsive);

  standingsContainer.appendChild(contCardTitle);
  standingsContainer.appendChild(contCardBody);

}

