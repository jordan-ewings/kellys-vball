import { offsetScrollIntoView, formatNumber, createElement } from './util.js';
import { db, session } from './firebase.js';
import { ref, onValue, set, update, runTransaction, increment } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

import { APP } from './main.js';
import { ContCard, MenuItem } from '../components/common.js';

/* ------------------------------------------------ */

const standingsSection = document.querySelector('#standings-section');
const mainHeader = standingsSection.querySelector('.main-header');

const leaderboardContainer = standingsSection.querySelector('#leaderboard-container');
const leaderboardTBody = leaderboardContainer.querySelector('tbody');

const statsContainer = standingsSection.querySelector('#stats-container');
const statsBody = statsContainer.querySelector('.cont-card-body');

const standingsCarousel = standingsSection.querySelector('#standings-carousel');
const carouselInner = standingsCarousel.querySelector('.carousel-inner');

/* ------------------------------------------------ */

export function initStandingsContent() {

  makeLeaderboard();
  makeStats();
}

/* ------------------------------------------------ */

function processLeaderboard(teams) {

  const teamsArr = Object.values(teams);

  let standings = teamsArr.map(team => {

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

  onValue(ref(db, session.getLeague().refs.teams), snapshot => {

    const teams = snapshot.val();
    const teamsProc = processLeaderboard(teams);
    leaderboardTBody.innerHTML = '';

    teamsProc.forEach(team => {
      const row = makeLeaderboardItem(team);
      leaderboardTBody.appendChild(row);
    });

  });
}

/* ------------------------------------------------ */

function makeLeaderboardItem(team) {

  const item = createElement(
    `<tr class="leaderboard-item" id="leaderboard-${team.id}">
      <td class="team">
        <div class="d-flex align-items-center column-gap-2">
          <span class="team-nbr">${team.nbr}</span>
          <span class="team-name">${team.name}</span>
        </div>
      </td>
      <td class="wins">${team.wins}</td>
      <td class="losses">${team.losses}</td>
      <td class="winPct">${formatNumber(team.winPct, '0.000')}</td>
      <td class="drinks">${team.drinks}</td>
    </tr>`
  );

  return item;
}

/* ------------------------------------------------ */

function makeStats() {

  let weeks = Object.values(session.weeks);
  let teams = Object.values(session.teams);

  statsBody.innerHTML = '';
  carouselInner.querySelectorAll('.carousel-item').forEach((item, index) => {
    if (index > 0) item.remove();
  });

  /* ------------------------------------------------ */
  // initialize week buttons and carousel items

  const carousel = new bootstrap.Carousel(standingsCarousel, { interval: false });
  const backBtn = mainHeader.querySelector('button.btn-back');
  const saveBtn = mainHeader.querySelector('button.btn-save');
  saveBtn.classList.add('disabled', 'admin-control');
  const headerSpan = mainHeader.querySelector('.main-header-title span');

  weeks.forEach((week, index) => {

    const dateStr = new Date(week.gameday).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    const menuItem = new MenuItem()
      .enableNav()
      .addClass('week-stats-nav')
      .addMain(week.label)
      .addTrail(dateStr);

    statsBody.appendChild(menuItem);
    menuItem.dataset.week = week.id;
    menuItem.addEventListener('click', () => {
      let itemIndex = index + 1;
      let item = carouselInner.querySelector(`.carousel-item[data-week="${week.id}"`);
      carousel.to(itemIndex);
      mainHeader.classList.remove('hidden');
      headerSpan.textContent = week.label;
      document.querySelector('nav').classList.add('hidden');
      offsetScrollIntoView(item);
    });

    const carouselItem = createElement(
      `<div class="carousel-item week-stats" data-week="${week.id}" id="week-${week.id}-stats">
      </div>`
    );

    const contCard = new ContCard('TEAM DRINKS');
    carouselItem.appendChild(contCard);

    carouselInner.appendChild(carouselItem);
  });

  /* ------------------------------------------------ */
  // handle back button click

  const resetItemRows = (carouselItem) => {
    const changedRows = carouselItem.querySelectorAll('.menu-item.changed');
    if (changedRows.length == 0) return;
    changedRows.forEach(row => {
      let stepVal = row.querySelector('.drinks-count');
      stepVal.textContent = stepVal.dataset.value;
      stepVal.dataset.change = 0;
      row.classList.remove('changed');
    });
  };

  const saveBtnSet = {
    reset: () => {
      saveBtn.innerHTML = 'Submit';
      saveBtn.className = 'btn btn-save disabled admin-control';
      if (!session.adminControls) saveBtn.classList.add('hidden-control');
    },
    saving: () => {
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
      saveBtn.classList.add('disabled');
    },
    saved: () => {
      saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved';
      saveBtn.classList.add('save-success');
    },
    nosave: (msg) => {
      saveBtn.innerHTML = '<i class="fa-solid fa-exclamation-triangle"></i> Error';
      saveBtn.classList.add('save-error');
      if (msg) saveBtn.innerHTML += `<div>${msg}</div>`;
    }
  };



  backBtn.addEventListener('click', () => {

    const activeItem = carouselInner.querySelector('.carousel-item.active');
    resetItemRows(activeItem);
    saveBtnSet.reset();

    carousel.to(0);
    mainHeader.classList.add('hidden');
    headerSpan.textContent = '';
    document.querySelector('nav').classList.remove('hidden');
    statsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  saveBtn.addEventListener('click', () => {

    saveBtnSet.saving();
    const activeItem = carouselInner.querySelector('.carousel-item.active');
    const statsCard = activeItem.querySelector('.cont-card');
    const statsList = statsCard.querySelector('.cont-card-body');
    const weekId = activeItem.dataset.week;

    const updates = {};
    const changedRows = statsList.querySelectorAll('.menu-item.changed');

    changedRows.forEach(row => {
      let teamId = row.dataset.team;
      let drinksChange = parseInt(row.querySelector('.drinks-count').dataset.change);
      let sPath = `${session.getLeague().refs.stats}/${weekId}/${teamId}/drinks/count`;
      let tPath = `${session.getLeague().refs.teams}/${teamId}/stats/drinks/count`;
      updates[sPath] = increment(drinksChange);
      updates[tPath] = increment(drinksChange);
    });

    console.log('updates', updates);
    update(ref(db), updates)
      .then(() => {
        saveBtnSet.saved();
        setTimeout(() => {
          saveBtnSet.reset();
        }, 2000);
      })
      .catch(err => {
        console.error(err);
        saveBtnSet.nosave(err.message);
      });

    // testing
    // setTimeout(() => {
    //   saveBtnSet.saved();
    //   setTimeout(() => {
    //     saveBtnSet.reset();
    //     resetItemRows(activeItem);
    //   }, 2000);
    // });

  });

  /* ------------------------------------------------ */
  // populate week items with team stats

  weeks.forEach(week => {

    const carouselItem = carouselInner.querySelector(`.carousel-item[data-week="${week.id}"`);
    const statsCard = carouselItem.querySelector('.cont-card');
    // const saveBtn = carouselItem.querySelector('.btn-save');
    const statsList = statsCard.querySelector('.cont-card-body');

    teams.forEach(team => {

      const teamStatsPath = `${session.getLeague().refs.teams}/${team.id}/stats`;
      const teamWeekStatsPath = `${session.getLeague().refs.stats}/${week.id}/${team.id}`;

      onValue(ref(db, teamWeekStatsPath), snapshot => {

        const stats = snapshot.val();

        // const label = createElement(`<div class="team-nbr">${team.nbr}</div>`);
        const title = createElement(
          `<div class="d-flex align-items-center column-gap-2">
            <span class="team-nbr">${team.nbr}</span>
            <span class="team-name">${team.name}</span>
          </div>`
        );
        const stepOrig = createElement(`<div class="drinks-count-orig">${stats.drinks.count}</div>`);
        const stepVal = createElement(`<div class="drinks-count">${stats.drinks.count}</div>`);
        const stepInput = createElement(
          `<div class="drinks-input stepper-container admin-control">
            <div class="stepper">
              <div role="button" class="stepper-btn stepper-down">
                <i class="fa-solid fa-minus"></i>
              </div>
              <div class="separator"></div>
              <div role="button" class="stepper-btn stepper-up">
                <i class="fa-solid fa-plus"></i>
              </div>
            </div>
          </div>`
        );

        const statsRow = new MenuItem()
          // .addLabel(label)
          // .addMain(team.name)
          .addMain(title)
          .addInfo(stepOrig)
          .addInfo(stepVal)
          .addInfo(stepInput);

        statsRow.dataset.team = team.id;
        const statsRowBefore = statsList.querySelector(`.menu-item[data-team="${team.id}"`);
        if (statsRowBefore) {
          statsList.replaceChild(statsRow, statsRowBefore);
        } else {
          statsList.appendChild(statsRow);
        }

        stepVal.dataset.valuePath = `${teamWeekStatsPath}/drinks/count`;
        stepVal.dataset.aggValuePath = `${teamStatsPath}/drinks/count`;
        stepVal.dataset.value = stats.drinks.count;
        stepVal.dataset.change = 0;

        const stepDown = statsRow.querySelector('.stepper-down');
        stepDown.addEventListener('click', () => {
          let value = parseInt(stepVal.textContent);
          if (value <= 0) return;
          value--;
          stepVal.textContent = value;
          stepVal.dataset.change = value - stats.drinks.count;
          statsRow.classList.toggle('changed', value != stats.drinks.count);
          saveBtn.classList.toggle('disabled', !statsList.querySelector('.menu-item.changed'));
        });

        const stepUp = statsRow.querySelector('.stepper-up');
        stepUp.addEventListener('click', () => {
          let value = parseInt(stepVal.textContent);
          value++;
          stepVal.textContent = value;
          stepVal.dataset.change = value - stats.drinks.count;
          statsRow.classList.toggle('changed', value != stats.drinks.count);
          saveBtn.classList.toggle('disabled', !statsList.querySelector('.menu-item.changed'));
        });

      });
    });

    /* ------------------------------------------------ */
    // handle save button click

    // saveBtn.addEventListener('click', () => {

    //   saveBtnSet.saving();
    //   const updates = {};
    //   const changedRows = statsList.querySelectorAll('.menu-item.changed');

    //   changedRows.forEach(row => {
    //     let teamId = row.dataset.team;
    //     let drinksChange = parseInt(row.querySelector('.drinks-count').dataset.change);
    //     let sPath = `${session.getLeague().refs.stats}/${week.id}/${teamId}/drinks/count`;
    //     let tPath = `${session.getLeague().refs.teams}/${teamId}/stats/drinks/count`;
    //     updates[sPath] = increment(drinksChange);
    //     updates[tPath] = increment(drinksChange);
    //   });

    //   console.log('updates', updates);
    //   update(ref(db), updates)
    //     .then(() => {
    //       saveBtnSet.saved();
    //       setTimeout(() => {
    //         saveBtnSet.reset();
    //       }, 2000);
    //     })
    //     .catch(err => {
    //       console.error(err);
    //       saveBtnSet.nosave(err.message);
    //     });

    // });

  });

}
