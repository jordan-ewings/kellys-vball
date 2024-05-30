import { offsetScrollIntoView, formatNumber, createElement } from './util.js';
import { db, session } from './firebase.js';
import { ref, onValue, update, increment } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

import {
  ContCard,
  MenuItem,
  Stepper,
  Button,
  TeamLabel,
} from './components/common.js';
import { Leaderboard } from './components/standings.js';

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

export default class Standings {

  static navLink = document.querySelector('#nav-standings');

  static init() {

    this.reset();
    this.addLeaderboardContent();
    this.addStatsContent();
  }

  static show() {
    section.classList.remove('d-none');
  }

  static hide() {
    section.classList.add('d-none');
  }

  static handleOptionsChange() {

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

  static reset() {
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

  static addLeaderboardContent() {

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

  static addStatsContent() {

    const weeks = Object.values(session.weeks);
    const teams = Object.values(session.teams);
    const headerTitle = mainHeader.querySelector('.main-header-title span');
    const saveBtn = mainHeader.querySelector('.btn-save');
    const backBtn = mainHeader.querySelector('.btn-back');
    backBtn.dataset.slide = 0;

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
        .addDataset('label', week.label)
        .addDataset('slide', index + 1)
        .addMain(week.label)
        .addTrail(dateStr);

      card.addContent(menuItem);
    });

    /* ------------------------------------------------ */
    // stats sub-cards (carousel items)

    weeks.forEach(week => {

      const card = new ContCard('TEAM DRINKS');
      teams.forEach(team => {

        const item = new MenuItem();
        item.classList.add('team-drinks-item');

        const title = new TeamLabel(team);

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
    // nav listeners

    const handleCarouselNavClick = (e) => {

      const btn = e.target.closest('[data-slide]');
      const destSlide = parseInt(btn.dataset.slide);
      const destHome = destSlide == 0;
      if (destHome) {
        section.querySelectorAll('.drinks-stepper').forEach(stepper => stepper.reset());
        saveBtn.reset();
      }

      getCarouselBS().to(destSlide);
      mainHeader.classList.toggle('hidden', destHome);
      document.querySelector('nav').classList.toggle('hidden', !destHome);
      headerTitle.textContent = destHome ? '' : btn.dataset.label;
      if (destHome) {
        statsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    const menuItems = card.querySelectorAll('.menu-item.week-stats-nav');
    menuItems.forEach(menuItem => menuItem.addEventListener('click', handleCarouselNavClick));
    backBtn.addEventListener('click', handleCarouselNavClick);

    /* ------------------------------------------------ */
    // handle save button click

    saveBtn.addEventListener('click', () => {

      saveBtn.startSave();
      const steppers = section.querySelectorAll('.drinks-stepper.changed');
      const refs = session.getLeague().refs;
      const updates = {};

      steppers.forEach(stepper => {
        const teamId = stepper.dataset.team;
        const weekId = stepper.dataset.week;
        const drinksChange = parseInt(stepper.change);
        updates[`${refs.stats}/${weekId}/${teamId}/drinks/count`] = increment(drinksChange);
        updates[`${refs.teams}/${teamId}/stats/drinks/count`] = increment(drinksChange);
      });

      update(ref(db), updates)
        .then(() => {
          saveBtn.endSave();
          setTimeout(() => saveBtn.reset(), 2000);
        })
        .catch(err => {
          console.error(err);
          saveBtn.errorSave();
        });
    });
  }
}

/* ------------------------------------------------ */
