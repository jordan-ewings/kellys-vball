import { db, session } from './firebase.js';
import { ref, get, onValue, update } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

import { createElement } from './util.js';
import { GameItem } from './components/schedule.js';
import { ContCard } from './components/common.js';

/* ------------------------------------------------ */
// constants / helpers

const section = document.querySelector('#schedule-section');
const weekFilterContainer = section.querySelector('#week-filter-container');
const scheduleContainer = section.querySelector('#schedule-container');
const getCarousel = () => section.querySelector('.carousel');
const getCarouselBS = () => bootstrap.Carousel.getOrCreateInstance(getCarousel());

/* ------------------------------------------------ */
// schedule content

export default class Schedule {

  static navLink = document.querySelector('#nav-schedule');

  static init() {

    this.reset();
    this.addScheduleContent();
    this.addFirebaseListeners();
  }

  static show() {
    section.classList.remove('d-none');
    const activeBtn = weekFilterContainer.querySelector('.week-filter-btn.active');
    if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  static hide() {
    section.classList.add('d-none');
  }

  static handleOptionsChange() {

    const gameItems = scheduleContainer.querySelectorAll('.game-item');
    gameItems.forEach(gameItem => {
      gameItem.handleAdminChange();
      // gameItem.handleFavTeamChange();
    });
  }

  /* ------------------------------------------------ */
  // private methods

  static reset() {
    weekFilterContainer.innerHTML = '';
    scheduleContainer.innerHTML = `
      <div class="carousel slide carousel-fade" data-bs-touch="false">
        <div class="carousel-inner"></div>
      </div>
    `;
  }

  static addScheduleContent() {

    Object.values(session.weeks).forEach((week) => {
      const btn = createWeekButton(week);
      const item = createWeekCarouselItem(week);

      weekFilterContainer.appendChild(btn);
      scheduleContainer.querySelector('.carousel-inner').appendChild(item);
    });

    // set current week according to gameday
    const today = new Date();
    const initialWeek = Object.values(session.weeks).find(week => {
      const gameday = new Date(week.gameday);
      return today <= gameday;
    }).id;

    const query = `[data-week="${initialWeek}"]`;
    weekFilterContainer.querySelector(query).classList.add('active');
    scheduleContainer.querySelector(query).classList.add('active');
  }

  static addFirebaseListeners() {

    const refs = session.getLeague().refs;
    const gameItems = scheduleContainer.querySelectorAll('.game-item');

    // record updates
    const teamIds = Object.keys(session.teams);
    teamIds.forEach(teamId => {
      const recordRef = ref(db, `${refs.teams}/${teamId}/stats/games/record`);
      onValue(recordRef, snap => {
        const record = snap.val();
        gameItems.forEach(gameItem => {
          if (gameItem.data.teams[teamId]) {
            gameItem.updateTeamRecord(teamId, record);
          }
        });
      });
    });

    // match updates
    gameItems.forEach(gameItem => {
      const weekId = gameItem.data.week;
      const gameId = gameItem.data.id;
      const matchesRef = ref(db, `${refs.games}/${weekId}/${gameId}/matches`);
      onValue(matchesRef, snap => {
        const matches = snap.val();
        gameItem.updateMatchResults(matches);
      });
    });
  }
}

/* ------------------------------------------------ */

function createWeekButton(week) {

  const date = new Date(week.gameday).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const btn = createElement(`
    <button class="btn week-filter-btn d-flex flex-column justify-content-center align-items-center text-nowrap" type="button" id="week-${week.id}-btn" data-week="${week.id}">
      <span>${week.label}</span>
      <span class="week-btn-date">${date}</span>
    </button>
  `);

  btn.addEventListener('click', (e) => {
    btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    weekFilterContainer.querySelectorAll('button').forEach(b => {
      b.classList.toggle('active', b == btn);
    });

    const weekIndex = Object.keys(session.weeks).indexOf(week.id);
    getCarouselBS().to(weekIndex);
  });

  return btn;
}

/* ------------------------------------------------ */

function createWeekCarouselItem(week) {

  const item = createElement(`<div class="carousel-item week-group" id="week-${week.id}-group" data-week="${week.id}"></div>`);
  const games = Object.values(session.games[week.id]);
  const times = games.map(g => g.time).filter((v, i, a) => a.indexOf(v) === i);

  times.forEach(time => {

    const card = new ContCard();
    card.classList.add('game-group');

    const timeGames = games.filter(g => g.time == time);
    timeGames.forEach((game, index) => {
      const gameItem = new GameItem(game);
      const separator = createElement(`<div class="game-separator"></div>`);
      card.addContent(gameItem);
      if (index < timeGames.length - 1) {
        card.addContent(separator);
      }
    });

    item.appendChild(card);
  });

  return item;
}

/* ------------------------------------------------ */
