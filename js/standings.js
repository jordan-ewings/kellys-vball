import * as util from './util.js';
import { db } from './firebase.js';
import { ref, onValue } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

import { APP, showContent } from './main.js';
import { handleTeamSelection } from './schedule.js';

/* ------------------------------------------------ */

const standingsNav = document.querySelector('#nav-standings');
const standingsSection = document.querySelector('#standings-section');
const leaderboardContainer = document.querySelector('#leaderboard-container');

/* ------------------------------------------------ */

export function initStandingsContent() {

  onValue(ref(db, APP.gamesPath), snapshot => {
    let games = Object.values(snapshot.val());
    onValue(ref(db, APP.teamsPath), snapshot => {
      let teams = Object.values(snapshot.val());
      makeLeaderboard(teams, games);
    }, { onlyOnce: true });
  });
}

/* ------------------------------------------------ */

function makeLeaderboard(teams, games) {

  // calculate winPct
  teams.forEach(team => {
    team.games = team.wins + team.losses;
    team.winPct = team.games > 0 ? team.wins / team.games : 0;

    // calculate streak the team is on
    if (team.games == 0) {
      team.streak = '-';
      return;
    }

    // get team games
    let teamSchedule = games.filter(g => Object.keys(g.teams).includes(team.id));
    let teamGames = teamSchedule.filter(g => g.status == 'POST');
    teamGames.reverse();
    console.log(team.name, teamGames);

    // get streak
    let streak = 0;
    let streakType = '';
    for (let i = 0; i < teamGames.length; i++) {
      let game = teamGames[i];
      let winner = game.winner;
      if (i == 0) {
        streakType = winner == team.id ? 'W' : 'L';
        streak++;
        continue;
      }

      if (winner == team.id) {
        if (streakType == 'W') streak++;
        if (streakType == 'L') break;
      } else {
        if (streakType == 'L') streak++;
        if (streakType == 'W') break;
      }
    }

    console.log(team.name, streakType + streak);
    team.streak = streakType + streak;
  });

  // sort standings
  teams.sort((a, b) => {
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
  teams.forEach((team, index) => {
    let winPct = team.winPct;
    let ties = teams.filter(t => t.winPct === winPct).length;
    if (winPct != prevWinPct) rank = index + 1;
    team.rank = ties > 1 ? 'T-' + rank : rank;
    prevWinPct = winPct;
  });

  // if no games played, set rank to '-'
  let teamGames = teams.map(t => t.games);
  let totalGames = teamGames.reduce((a, b) => a + b);
  if (totalGames == 0) {
    teams.forEach(team => {
      team.rank = '-';
    });
  }

  // create standings elements
  let leaderboard = util.createFromTemplate('leaderboard-template');
  let leaderboardTBody = leaderboard.querySelector('tbody');

  // populate standings
  teams.forEach((team, index) => {

    let standingsItem = util.createFromTemplate('standings-item-template');
    team.winPct = util.formatNumber(team.winPct, '0.00');
    team.id = parseInt(team.id);

    // populate data items
    let dataItems = standingsItem.querySelectorAll('[data-item]');
    dataItems.forEach(item => {
      let dataItem = item.getAttribute('data-item');
      item.textContent = team[dataItem];
    });

    let streakClass = team.streak.includes('W') ? 'winStreak' : 'loseStreak';
    if (team.streak != '-') {
      let streakItem = standingsItem.querySelector('td.streak');
      streakItem.classList.add(streakClass);
    }

    // event listener for team click
    // when clicked, set team as focused team and show the schedule
    standingsItem.addEventListener('click', () => {
      showContent('schedule');
      APP.focusedTeam = team.id;
      handleTeamSelection();
    });
    standingsItem.style.cursor = 'pointer';
    standingsItem.style.userSelect = 'none';

    leaderboardTBody.appendChild(standingsItem);
  });

  leaderboardContainer.innerHTML = '';
  leaderboardContainer.appendChild(leaderboard);
}