import * as util from './util.js';
import { db, session } from './firebase.js';
import { ref, onValue, set } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

import { APP } from './main.js';

/* ------------------------------------------------ */

const standingsNav = document.querySelector('#nav-standings');
const standingsSection = document.querySelector('#standings-section');
const leaderboardContainer = document.querySelector('#leaderboard-container');
const bracketContainer = document.querySelector('#playoff-bracket-container');
const carouselElement = standingsSection.querySelector('.carousel');
const carouselBS = new bootstrap.Carousel(carouselElement, { interval: false });

/* ------------------------------------------------ */

export function initStandingsContent() {

  onValue(ref(db, session.user.league.refs.teams), (snapshot) => {

    const teams = snapshot.val();
    makeLeaderboard(teams);

  });
}

/* ------------------------------------------------ */

function processStandings(teamsRaw) {

  const teams = Object.values(teamsRaw);

  let standings = teams.map(team => {

    let gameStats = team.stats.games;
    team.games = gameStats.count;
    team.wins = gameStats.wins;
    team.losses = gameStats.losses;
    team.streak = gameStats.streak;
    team.winPct = team.games == 0 ? 0 : team.wins / team.games;

    let drinkStats = team.stats.drinks;
    team.drinks = drinkStats.count;

    return team;
  });

  standings.sort((a, b) => {
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

  let rank = 1;
  let prevWinPct = null;
  standings.forEach((team, index) => {
    let winPct = team.winPct;
    let ties = standings.filter(t => t.winPct === winPct).length;
    if (winPct != prevWinPct) rank = index + 1;
    team.rank = ties > 1 ? 'T-' + rank : rank;
    prevWinPct = winPct;
  });

  // if no games played, set rank to '-'
  let teamGames = standings.map(t => t.games);
  let totalGames = teamGames.reduce((a, b) => a + b);
  if (totalGames == 0) {
    standings.forEach(team => {
      team.rank = '-';
    });
  }

  return standings;
}

/* ------------------------------------------------ */

function makeLeaderboard(teamsRaw) {

  const teams = processStandings(teamsRaw);

  // create standings elements
  const leaderboard = util.createFromTemplate('leaderboard-template');
  const leaderboardTBody = leaderboard.querySelector('tbody');

  // populate standings
  teams.forEach((team, index) => {

    const standingsItem = util.createFromTemplate('standings-item-template');
    standingsItem.id = 'team-' + team.id;
    standingsItem.dataset.rank_val = index + 1;
    standingsItem.dataset.rank_str = team.rank;
    team.winPct = util.formatNumber(team.winPct, '0.00');

    // populate data items
    const dataItems = standingsItem.querySelectorAll('[data-item]');
    dataItems.forEach(item => {
      let dataItem = item.getAttribute('data-item');
      item.textContent = team[dataItem];
    });

    leaderboardTBody.appendChild(standingsItem);
    standingsItem.addEventListener('click', async () => {
      carouselBS.to(1);
      await showTeamWeekly(team.id);
    });
  });


  leaderboardContainer.innerHTML = '';
  leaderboardContainer.appendChild(leaderboard);
}

/* ------------------------------------------------ */

async function showTeamWeekly(teamId) {

  let weeks = session.cache.weeks;
  let team = session.cache.teams[teamId];
  let teamStats = {};

  for (let week in weeks) {
    let path = `${session.user.league.refs.stats}/${week}/${teamId}`;
    let weekStats = await session.getOnce(path);
    let stats = { ...weekStats.games };
    stats.nbr = weeks[week].nbr;
    stats.name = weeks[week].label;
    stats.drinks = weekStats.drinks.count;
    teamStats[week] = stats;
  }

  const teamboard = util.createFromTemplate('leaderboard-template');
  const contCardTitle = teamboard.querySelector('.cont-card-title span');
  contCardTitle.textContent = team.name;

  const teamboardHeader = teamboard.querySelector('thead');
  teamboardHeader.querySelector('.team').textContent = 'WEEK';
  const teamboardBody = teamboard.querySelector('tbody');

  console.log(teamStats);
  for (let week in teamStats) {

    let stats = teamStats[week];
    const row = util.createFromTemplate('standings-item-template');
    stats.winPct = util.formatNumber(stats.winPct, '0.00');
    const dataItems = row.querySelectorAll('[data-item]');
    dataItems.forEach(item => {
      let dataItem = item.getAttribute('data-item');
      item.textContent = stats[dataItem];
    });

    teamboardBody.appendChild(row);
  }

  const teamboardContainer = document.querySelector('#teamboard-container');
  teamboardContainer.innerHTML = '';

  const backBtn = document.createElement('button');
  backBtn.classList.add('btn', 'btn-primary', 'btn-sm', 'mb-3');
  backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Back to Standings';
  backBtn.addEventListener('click', () => {
    carouselBS.to(0);
  });

  teamboardContainer.appendChild(backBtn);
  teamboardContainer.appendChild(teamboard);
}

/* ------------------------------------------------ */

// import { DBold } from './data.js';
// async function updateBracketTemplates() {
//   await DBold.load('bracket14');
//   let bracket = DBold.get('bracket14');
//   set(ref(db, 'brackets/DE14'), bracket);
// }
// updateBracketTemplates();

function makePlayoffBracket(standings) {

  const teams = JSON.parse(JSON.stringify(standings));
  let bracket = JSON.parse(JSON.stringify(session.cache.bracket));

  // replace team names in bracket according to order in standings
  bracket.forEach(game => {
    if (game.team1.includes('Team')) {
      let seed = parseInt(game.team1.split(' ')[1]);
      let teamIndex = seed - 1;
      let team = teams[teamIndex];
      game.team1 = { name: team.name, seed: seed };
    }
    if (game.team2.includes('Team')) {
      let seed = parseInt(game.team2.split(' ')[1]);
      let teamIndex = seed - 1;
      let team = teams[teamIndex];
      game.team2 = { name: team.name, seed: seed };
    }
  });

  let types = ['Winner', 'Loser', 'Championship'];
  let matchups = {};
  types.forEach(type => {

    let games = bracket.filter(g => g.bracket == type);
    games.sort((a, b) => {
      if (a.round < b.round) return -1;
      if (a.round > b.round) return 1;
      if (a.row < b.row) return -1;
      if (a.row > b.row) return 1;
      return 0;
    });

    matchups[type] = games;
  });

  const bracketWrapper = util.createFromTemplate('bracket-template');
  const bracketBody = bracketWrapper.querySelector('.cont-card-body');

  types.forEach(type => {

    let bracketType = matchups[type];
    const bracketDiv = document.createElement('div');
    bracketDiv.classList.add('bracket', 'd-flex', 'flex-row');

    let columns = bracketType.map(game => game.column).filter((v, i, a) => a.indexOf(v) === i);
    columns.forEach(column => {

      const columnDiv = document.createElement('div');
      columnDiv.classList.add('column', 'd-flex', 'flex-column');
      if (column == 1) columnDiv.classList.add('first-column');

      let games = bracketType.filter(g => g.column == column);
      games.forEach(game => {

        const gameDiv = util.createFromTemplate('bracket-game-template');

        [1, 2].forEach(i => {
          let team = game['team' + i].name;
          if (team === undefined) team = game['team' + i];
          const teamDiv = gameDiv.querySelector('.team-item-' + i);
          if (team == 'BYE') teamDiv.classList.add('bye');
          if (team.includes('Winner') || team.includes('Loser')) teamDiv.classList.add('unknown');
          let label = team;
          if (teamDiv.classList.contains('unknown')) {
            let tSplit = team.split(' ');
            let abbr = tSplit[0].split('')[0];
            label = abbr + '-' + tSplit[1];
          }
          teamDiv.querySelector('.team-name').textContent = label;
          if (game['team' + i].seed) teamDiv.querySelector('.team-seed').textContent = game['team' + i].seed;
        });

        if (game.match != 0) {
          gameDiv.querySelector('.game-time').textContent = 'TBD';
          gameDiv.querySelector('.game-nbr').textContent = game.match;
        }

        // identify game type
        let team1Name = (game.team1.name || game.team1);
        let team2Name = (game.team2.name || game.team2);
        let team1Entry = team1Name.includes('Winner') ? 'winner' : team1Name.includes('Loser') ? 'loser' : 'initial';
        let team2Entry = team2Name.includes('Winner') ? 'winner' : team2Name.includes('Loser') ? 'loser' : 'initial';

        if (game.column != 1 && game.bracket != 'Championship') {
          if (type == 'Winner') {
            gameDiv.classList.add('reg-entry');
          }
          if (team1Entry == 'winner' && team2Entry == 'winner') {
            gameDiv.classList.add('reg-entry');
          }
          if (team1Entry == 'loser' && team2Entry == 'winner') {
            gameDiv.classList.add('alt1-entry');
          }
          if (team1Entry == 'winner' && team2Entry == 'loser') {
            gameDiv.classList.add('alt2-entry');
          }
        }

        if (game.column == 1) {
          gameDiv.classList.add('first-column');
        }

        columnDiv.appendChild(gameDiv);
      });

      bracketDiv.appendChild(columnDiv);
    });

    bracketBody.appendChild(bracketDiv);
  });

  bracketContainer.innerHTML = '';
  bracketContainer.appendChild(bracketWrapper);
}
