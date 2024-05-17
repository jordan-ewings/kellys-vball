import { offsetScrollIntoView, formatNumber, createElement } from './util.js';
import { db, session } from './firebase.js';
import { ref, onValue, update, increment } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

import { ContCard, MenuItem, Stepper, Button } from '../components/common.js';
import { Leaderboard } from '../components/standings.js';

/* ------------------------------------------------ */

const section = document.querySelector('#standings-section');
const mainHeader = section.querySelector('.main-header');
const mainBody = section.querySelector('.main-body');

const statsActionsContainer = mainHeader.querySelector('#stats-actions-container');
const leaderboardContainer = mainBody.querySelector('#leaderboard-container');
const statsContainer = mainBody.querySelector('#stats-container');
const getCarousel = () => mainBody.querySelector('#standings-carousel');
const getCarouselBS = () => bootstrap.Carousel.getOrCreateInstance(getCarousel());

/* ------------------------------------------------ */

export class Standings {

  init() {

    this.reset();
    this.addLeaderboardContent();
    this.addStatsContent();

    return this;
  }

  show() {
    section.classList.remove('d-none');
  }

  hide() {
    section.classList.add('d-none');
  }

  handleOptionsChange() {

    const leaderboard = section.querySelector('.leaderboard-table');
    leaderboard.handleFavTeamChange();

    section.querySelectorAll('.week-stats').forEach(weekStats => {
      weekStats.querySelectorAll('.menu-item').forEach(menuItem => {

        if (menuItem.querySelector('i.fav-team')) menuItem.querySelector('i.fav-team').remove();
        if (!session.favTeam) return;

        const teamName = menuItem.querySelector('.team-name');
        if (teamName.textContent == session.favTeam) {
          const icon = createElement(`<i class="fa-solid fa-user fav-team"></i>`);
          teamName.after(icon);
        }
      });
    });

    const steppers = section.querySelectorAll('.drinks-stepper');
    const saveBtn = mainHeader.querySelector('.btn-save');
    if (session.adminControls) {
      steppers.forEach(stepper => stepper.enableEditMode());
      saveBtn.show();
    } else {
      steppers.forEach(stepper => stepper.disableEditMode());
      saveBtn.hide();
    }
  }

  /* ------------------------------------------------ */
  // private methods

  reset() {
    leaderboardContainer.innerHTML = '';
    statsContainer.innerHTML = '';
    section.querySelectorAll('.carousel-item').forEach((item, index) => {
      if (index > 0) item.remove();
    });

    const backBtn = new Button(
      'btn-back',
      '<i class="fa-solid fa-chevron-left"></i> Back');
    const title = createElement(`<div class="main-header-title"><span></span></div>`);
    const saveBtn = new Button(
      'btn-save disabled admin-control',
      'Submit');

    mainHeader.innerHTML = '';
    mainHeader.appendChild(backBtn);
    mainHeader.appendChild(title);
    mainHeader.appendChild(saveBtn);
  }

  /* ------------------------------------------------ */
  // leaderboard content

  addLeaderboardContent() {

    const card = new ContCard('LEADERBOARD');
    leaderboardContainer.appendChild(card);

    const leaderboard = new Leaderboard();
    card.addContent(leaderboard);

    const teamsRef = ref(db, session.getLeague().refs.teams);
    onValue(teamsRef, snap => {
      const teams = snap.val();
      leaderboard.update(teams);
    });

  }

  /* ------------------------------------------------ */
  // stats content

  addStatsContent() {

    const weeks = Object.values(session.weeks);
    const teams = Object.values(session.teams);
    const saveBtn = mainHeader.querySelector('.btn-save');
    const backBtn = mainHeader.querySelector('.btn-back');

    /* ------------------------------------------------ */
    // stats card (carousel nav)

    const card = new ContCard('STATS');
    statsContainer.appendChild(card);

    weeks.forEach((week, index) => {

      const dateStr = new Date(week.gameday).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const menuItem = new MenuItem()
        .enableNav()
        .addClass('week-stats-nav')
        .addDataset('week', week.id)
        .addMain(week.label)
        .addTrail(dateStr);

      menuItem.addEventListener('click', () => {
        let item = getCarousel().querySelector(`.carousel-item[data-week="${week.id}"`);
        let items = getCarousel().querySelectorAll('.carousel-item');
        let itemIndex = Array.from(items).indexOf(item);
        getCarouselBS().to(itemIndex);

        saveBtn.reset();
        mainHeader.classList.remove('hidden');
        mainHeader.querySelector('.main-header-title span').textContent = week.label;
        document.querySelector('nav').classList.add('hidden');
        offsetScrollIntoView(item);
      });

      card.addContent(menuItem);
    });

    /* ------------------------------------------------ */
    // stats sub-cards (carousel items)

    weeks.forEach(week => {

      const card = new ContCard('TEAM DRINKS');
      teams.forEach(team => {
        const item = new MenuItem();

        const title = createElement(`
          <div class="d-flex align-items-center column-gap-2">
            <span class="team-nbr">${team.nbr}</span>
            <span class="team-name">${team.name}</span>
            ${session.favTeam == team.name ? '<i class="fa-solid fa-user fav-team"></i>' : ''}
          </div>
        `);

        const stepper = new Stepper(0);
        stepper.classList.add('drinks-stepper');
        stepper.dataset.team = team.id;
        stepper.dataset.week = week.id;
        stepper.addEventListener('change', () => {
          if (section.querySelector('.drinks-stepper.changed')) {
            saveBtn.enable();
          } else {
            saveBtn.disable();
          }
        });

        const drinksRef = ref(db, `${session.getLeague().refs.stats}/${week.id}/${team.id}/drinks/count`);
        onValue(drinksRef, snapshot => {
          const count = snapshot.val();
          stepper.resetWith(count);
        });

        item.addMain(title);
        item.addInfo(stepper);
        card.addContent(item);
      });

      const carouselItem = createElement(`<div class="carousel-item week-stats" data-week="${week.id}" id="week-${week.id}-stats"></div>`);
      carouselItem.appendChild(card);
      getCarousel().querySelector('.carousel-inner').appendChild(carouselItem);
    });

    /* ------------------------------------------------ */
    // nav back

    backBtn.addEventListener('click', () => {

      // reset changed steppers and save button
      const steppers = section.querySelectorAll('.drinks-stepper');
      steppers.forEach(stepper => stepper.reset());
      saveBtn.reset();

      getCarouselBS().to(0);
      mainHeader.classList.add('hidden');
      mainHeader.querySelector('.main-header-title span').textContent = '';
      document.querySelector('nav').classList.remove('hidden');
      statsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    /* ------------------------------------------------ */
    // handle save button click

    saveBtn.addEventListener('click', () => {

      saveBtn.startSave();
      const steppers = section.querySelectorAll('.drinks-stepper.changed');
      const updates = {};

      steppers.forEach(stepper => {
        const teamId = stepper.dataset.team;
        const weekId = stepper.dataset.week;
        const drinksChange = parseInt(stepper.change);
        const sPath = `${session.getLeague().refs.stats}/${weekId}/${teamId}/drinks/count`;
        const tPath = `${session.getLeague().refs.teams}/${teamId}/stats/drinks/count`;
        updates[sPath] = increment(drinksChange);
        updates[tPath] = increment(drinksChange);
      });

      update(ref(db), updates)
        .then(() => {
          saveBtn.endSave();
          setTimeout(() => {
            saveBtn.reset();
          }, 2000);
        })
        .catch(err => {
          console.error(err);
          saveBtn.errorSave();
        });
    });
  }
}

/* ------------------------------------------------ */
