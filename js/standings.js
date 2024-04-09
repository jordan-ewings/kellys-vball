import * as util from './util.js';
import { db, session } from './firebase.js';
import { ref, onValue, set } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

import { APP } from './main.js';

/* ------------------------------------------------ */

const standingsNav = document.querySelector('#nav-standings');
const standingsSection = document.querySelector('#standings-section');
const mainHeader = standingsSection.querySelector('.main-header');
const leaderboardContainer = document.querySelector('#leaderboard-container');
const statsContainer = document.querySelector('#stats-container');
const standingsCarousel = document.querySelector('#standings-carousel');
// const carousel = new bootstrap.Carousel(standingsCarousel, { interval: false });

/* ------------------------------------------------ */

export function initStandingsContent() {

  makeLeaderboard();
  makeStats();

}

function createElement(html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.firstChild;
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

function makeLeaderboard() {

  onValue(ref(db, session.user.league.refs.teams), snapshot => {

    const teams = processStandings(snapshot.val());
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
    });


    leaderboardContainer.innerHTML = '';
    leaderboardContainer.appendChild(leaderboard);
  });
}

/* ------------------------------------------------ */

function makeStats() {

  let weeks = session.cache.weeks;
  let teams = session.cache.teams;
  statsContainer.innerHTML = '';

  const card = createElement('<div class="cont-card"></div>');
  statsContainer.appendChild(card);

  const cardHeader = createElement('<div class="cont-card-title"><span>STATS</span></div>');
  const cardBody = createElement('<div class="week-menu cont-card-body"></div>');
  card.appendChild(cardHeader);
  card.appendChild(cardBody);

  const carouselInner = standingsCarousel.querySelector('.carousel-inner');
  const carouselInst = new bootstrap.Carousel(standingsCarousel, { interval: false });
  const backBtn = createElement('<button class="btn btn-back d-none"><i class="fas fa-chevron-left"></i> Back</button>');
  backBtn.addEventListener('click', () => {
    carouselInst.to(0);
    backBtn.classList.add('d-none');
    statsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  mainHeader.appendChild(backBtn);

  // for each week, create a row that, when clicked, will display the week's stats
  for (let week in weeks) {

    const weekNbr = weeks[week].nbr;
    const weekLabel = weeks[week].label;

    const menuItem = createElement(`<div class="week-menu-item" data-week="${week}" role="button"></div>`);
    let itemHeader = createElement(`<div class="week-menu-item-header">${weekLabel}</div>`);
    let itemDetail = createElement('<div class="week-menu-item-detail"><i class="fas fa-chevron-right"></i></div>');

    menuItem.appendChild(itemHeader);
    menuItem.appendChild(itemDetail);
    cardBody.appendChild(menuItem);

    const carouselItem = createElement(`<div class="carousel-item" data-week="${week}" id="week-${week}-stats"></div>`);
    const statsCard = util.createFromTemplate('week-stats-template');
    statsCard.querySelector('.cont-card-title span').textContent = weekLabel;

    carouselItem.appendChild(statsCard);
    carouselInner.appendChild(carouselItem);

    // on menu item click, show the stats for the week
    menuItem.addEventListener('click', () => {
      carouselInst.to(weekNbr);
      backBtn.classList.remove('d-none');
      util.offsetScrollIntoView(carouselItem);
    });

    // populate stats for the week
    const statsBody = statsCard.querySelector('tbody');
    let statsPath = `${session.user.league.refs.stats}/${week}`;

    Object.values(teams).forEach(team => {

      let path = `${statsPath}/${team.id}`;
      onValue(ref(db, path), snapshot => {

        let stats = snapshot.val();
        let data = {
          nbr: team.nbr,
          name: team.name,
          wins: stats.games.wins,
          losses: stats.games.losses,
          drinks: stats.drinks.count,
        };
        const statsRow = util.createFromTemplate('week-stats-item-template');
        statsRow.dataset.team = team.id;

        let dataItems = statsRow.querySelectorAll('[data-item]');
        dataItems.forEach(item => {
          let dataItem = item.getAttribute('data-item');
          item.textContent = data[dataItem];
          item.dataset.value = data[dataItem];
        });

        let row = statsBody.querySelector(`[data-team="${team.id}"]`);
        if (row) {
          row.replaceWith(statsRow);
        } else {
          statsBody.appendChild(statsRow);
        }
      });
    });

  }




}
