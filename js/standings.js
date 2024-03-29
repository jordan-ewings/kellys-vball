import * as util from './util.js';
import { db } from './firebase.js';
import { ref, onValue } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

import { APP } from './main.js';

/* ------------------------------------------------ */

const standingsNav = document.querySelector('#nav-standings');
const standingsSection = document.querySelector('#standings-section');
const leaderboardContainer = document.querySelector('#leaderboard-container');

/* ------------------------------------------------ */

export function initStandingsContent() {

  onValue(ref(db, APP.teamsPath), snapshot => {
    let teams = Object.values(snapshot.val());
    makeLeaderboard(teams);
  });
}

/* ------------------------------------------------ */

function makeLeaderboard(teams) {

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
  let leaderboard = util.createFromTemplate('leaderboard-template');
  let leaderboardTBody = leaderboard.querySelector('tbody');

  // populate standings
  data.forEach((team, index) => {

    let standingsItem = util.createFromTemplate('standings-item-template');

    team.winPct = util.formatNumber(team.winPct, '0.000');
    team.id = parseInt(team.id);

    // populate data items
    let dataItems = standingsItem.querySelectorAll('[data-item]');
    dataItems.forEach(item => {
      let dataItem = item.getAttribute('data-item');
      item.textContent = team[dataItem];
    });

    leaderboardTBody.appendChild(standingsItem);
  });

  leaderboardContainer.innerHTML = '';
  leaderboardContainer.appendChild(leaderboard);
}