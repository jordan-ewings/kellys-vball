import * as util from './util.js';
import { db, session } from './firebase.js';
import { ref, onValue, set, update, runTransaction } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

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

    const leaderboard = createElement(
      `<div class="cont-card">
        <div class="cont-card-title">
          <span>LEADERBOARD</span>
        </div>
        <div class="cont-card-body">
          <div class="table-responsive">
            <table class="table table-borderless align-middle text-nowrap m-0">
              <thead>
                <tr>
                  <th class="team">TEAM</th>
                  <th class="wins">W</th>
                  <th class="losses">L</th>
                  <th class="winPct">PCT</th>
                  <th class="drinks"><i class="fa-solid fa-beer"></i></th>
                </tr>
              </thead>
              <tbody>
              </tbody>
            </table>
          </div>
        </div>
      </div>`
    );

    teams.forEach((team, index) => {

      const standingsItem = createElement(
        `<tr class="leaderboard-item" id="team-${team.id}" data-rank_val="${index + 1}" data-rank_str="${team.rank}">
          <td class="team">
            <div class="d-flex align-items-center column-gap-2">
              <span class="team-nbr">${team.nbr}</span>
              <span class="team-name">${team.name}</span>
            </div>
          </td>
          <td class="wins">${team.wins}</td>
          <td class="losses">${team.losses}</td>
          <td class="winPct">${util.formatNumber(team.winPct, '0.000')}</td>
          <td class="drinks">${team.drinks}</td>
        </tr>`
      );

      leaderboard.querySelector('tbody').appendChild(standingsItem);
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

  const card = createElement(
    `<div class="cont-card">
      <div class="cont-card-title">
        <span>DRINKING COMPETITION</span>
      </div>
      <div class="cont-card-body week-menu">
      </div>
    </div>`
  );

  statsContainer.appendChild(card);
  const cardBody = card.querySelector('.cont-card-body');

  const carouselInner = standingsCarousel.querySelector('.carousel-inner');
  const carouselInst = new bootstrap.Carousel(standingsCarousel, { interval: false });
  const backBtn = createElement('<button class="btn btn-back"><i class="fas fa-chevron-left"></i> Back</button>');
  backBtn.addEventListener('click', () => {
    // clear any changes from current week
    const statsCard = carouselInner.querySelector('.carousel-item.active .cont-card');
    statsCard.querySelectorAll('.week-stats-item.changed').forEach(row => {
      let drinksCount = parseInt(row.querySelector('.drinks-count').dataset.orig);
      row.querySelector('.drinks-count').textContent = drinksCount;
      row.classList.remove('changed');
    });
    statsCard.querySelector('.btn-save').classList.add('disabled');


    carouselInst.to(0);
    document.querySelector('nav').classList.remove('hidden');
    mainHeader.classList.add('hidden');
    statsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const mainHeaderTitle = createElement(
    `<div class="main-header-title">
      <span></span>
    </div>`
  );

  mainHeader.classList.add('hidden');
  mainHeader.appendChild(backBtn);
  mainHeader.appendChild(mainHeaderTitle);

  // for each week, create a row that, when clicked, will display the week's stats
  for (let week in weeks) {

    const weekNbr = weeks[week].nbr;
    const weekLabel = weeks[week].label;
    const menuItem = createElement(
      `<div class="week-menu-item" data-week="${week}" role="button">
        <div class="week-menu-item-header">${weekLabel}</div>
        <div class="week-menu-item-detail"><i class="fas fa-chevron-right"></i></div>
      </div>`
    );

    cardBody.appendChild(menuItem);

    const statsCard = createElement(
      `<div class="cont-card">
        <div class="cont-card-body">
          <div class="table-responsive">
            <table class="table table-borderless align-middle text-nowrap m-0">
              <thead>
                <tr>
                  <th class="team">TEAM</th>
                  <th class="drinks">DRINKS</th>
                </tr>
              </thead>
              <tbody>
              </tbody>
            </table>
          </div>
        </div>
      </div>`
    );

    const carouselItem = createElement(
      `<div class="carousel-item week-stats" data-week="${week}" id="week-${week}-stats"></div>`
    );

    carouselItem.appendChild(statsCard);
    carouselInner.appendChild(carouselItem);

    // on menu item click, show the stats for the week
    menuItem.addEventListener('click', () => {
      carouselInst.to(weekNbr);
      mainHeader.classList.remove('hidden');
      document.querySelector('nav').classList.add('hidden');
      mainHeaderTitle.querySelector('span').textContent = weekLabel;
      util.offsetScrollIntoView(carouselItem);
    });

    const saveBtn = createElement(
      `<button class="btn btn-save disabled">Save</button>`
    );
    statsCard.insertBefore(saveBtn, statsCard.querySelector('.cont-card-body'));


    // populate stats for the week
    const statsBody = statsCard.querySelector('tbody');

    Object.values(teams).forEach(team => {

      let path = `${session.user.league.refs.stats}/${week}/${team.id}`;
      onValue(ref(db, path), snapshot => {

        const stats = snapshot.val();
        const statsRow = createElement(
          `<tr class="week-stats-item" data-team="${team.id}">
            <td class="team">
              <div class="d-flex align-items-center column-gap-2">
                <span class="team-nbr">${team.nbr}</span>
                <span class="team-name">${team.name}</span>
              </div>
            </td>
            <td class="drinks">
              <div class="drinks-count">${stats.drinks.count}</div>
              <div class="drinks-input stepper-container">
                <div class="stepper">
                  <div role="button" class="stepper-btn stepper-down"><span>-</span></div>
                  <div class="separator"></div>
                  <div role="button" class="stepper-btn stepper-up"><span>+</span></div>
                </div>
              </div>
            </td>
          </tr>`
        );

        let drinksCount = stats.drinks.count;
        let drinksCountOrig = drinksCount;
        const drinksInput = statsRow.querySelector('.drinks-input');
        const drinksTD = statsRow.querySelector('.drinks-count');
        drinksTD.dataset.orig = drinksCountOrig;
        drinksInput.querySelector('.stepper-down').addEventListener('click', (e) => {
          e.preventDefault();
          drinksCount = Math.max(0, drinksCount - 1);
          drinksTD.textContent = drinksCount;
          statsRow.classList.toggle('changed', drinksCount != drinksCountOrig);
          saveBtn.classList.toggle('disabled', !statsRow.classList.contains('changed'));
        });

        drinksInput.querySelector('.stepper-up').addEventListener('click', (e) => {
          e.preventDefault();
          drinksCount++;
          drinksTD.textContent = drinksCount;
          statsRow.classList.toggle('changed', drinksCount != drinksCountOrig);
          saveBtn.classList.toggle('disabled', !statsRow.classList.contains('changed'));
        });

        let row = statsBody.querySelector(`[data-team="${team.id}"]`);
        if (row) {
          row.replaceWith(statsRow);
        } else {
          statsBody.appendChild(statsRow);
        }
      });
    });

    saveBtn.addEventListener('click', () => {
      // saveBtn.classList.add('disabled');
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
      saveBtn.classList.add('disabled');
      const statsBody = statsCard.querySelector('tbody');
      const updates = {};
      statsBody.querySelectorAll('.week-stats-item.changed').forEach(row => {
        let teamId = row.dataset.team;
        let drinks = parseInt(row.querySelector('.drinks-count').textContent);
        let drinksOrig = parseInt(row.querySelector('.drinks-count').dataset.orig);
        let path = `${session.user.league.refs.stats}/${week}/${teamId}/drinks/count`;
        updates[path] = drinks;

        // update team's total drinks
        let team = teams[teamId];
        let teamPath = `${session.user.league.refs.teams}/${teamId}/stats/drinks/count`;
        runTransaction(ref(db, teamPath), currentDrinks => {
          let newDrinks = currentDrinks + drinks - drinksOrig;
          return newDrinks;
        });
      });

      console.log('updates', updates);
      update(ref(db), updates).then(() => {
        saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved';
        saveBtn.classList.add('save-success');
        setTimeout(() => {
          saveBtn.innerHTML = 'Save';
          saveBtn.classList.remove('save-success');
        }, 2000);
      });
    });

  }




}
