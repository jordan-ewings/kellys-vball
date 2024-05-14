import { createFromTemplate, createAlert, offsetScrollIntoView, createElement } from './util.js';
import { db, session } from './firebase.js';
import { ref, get, onValue, update } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

import { APP } from './main.js';
import { ContCard, GameItem } from '../components/main.js';

/* ------------------------------------------------ */

const scheduleNav = document.querySelector('#nav-schedule');
const scheduleSection = document.querySelector('#schedule-section');
const weekFilterContainer = document.querySelector('#week-filter-container');
const scheduleContainer = document.querySelector('#schedule-container');
const getCarousel = () => scheduleContainer.querySelector('.carousel');
const getCarouselBS = () => bootstrap.Carousel.getOrCreateInstance(getCarousel());

/* ------------------------------------------------ */

export function initScheduleContent() {

  makeSchedule();
}

export function handleScheduleAdmin() {

  let gameItems = scheduleContainer.querySelectorAll('.game-item');
  gameItems.forEach(gameItem => {
    if (session.adminControls) {
      gameItem.enableEditMode();
    } else {
      gameItem.disableEditMode();
    }
  });
}

/* ------------------------------------------------ */

function resetContainers() {
  // const resetContainers = () => {

  weekFilterContainer.innerHTML = '';
  scheduleContainer.innerHTML = `
    <div class="carousel slide carousel-fade" data-bs-touch="false">
      <div class="carousel-inner"></div>
    </div>`;
}

/* ------------------------------------------------ */

function addWeekButton(week, index) {
  // const addWeekButton = (week, index) => {

  const carouselBS = getCarouselBS();

  const date = new Date(week.gameday).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const btn = createElement(`
    <button class="btn d-flex flex-column justify-content-center align-items-center text-nowrap" type="button" id="week-${week.id}-btn" data-week="${week.id}">
      <span>${week.label}</span>
      <span class="week-btn-date">${date}</span>
    </button>
  `);

  btn.addEventListener('click', (e) => {
    btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    weekFilterContainer.querySelectorAll('button').forEach(b => {
      b.classList.toggle('active', b == btn);
    });

    carouselBS.to(index);
  });

  weekFilterContainer.appendChild(btn);
}

/* ------------------------------------------------ */

function addWeekGames(week) {
  // const addWeekGames = (week) => {

  const carousel = getCarousel();
  const carouselInner = carousel.querySelector('.carousel-inner');
  const weekGroup = createElement(`
    <div class="week-group carousel-item" id="week-${week.id}-group" data-week="${week.id}">
    </div>
  `);

  const games = Object.values(session.games[week.id]);
  const timeSlots = games.map(g => g.time).filter((v, i, a) => a.indexOf(v) === i);

  timeSlots.forEach(timeSlot => {

    const card = new ContCard();
    card.classList.add('game-group');
    const cardGames = games.filter(g => g.time === timeSlot);

    cardGames.forEach((game, index) => {

      // const gameItem = makeGameItemGroup(game);
      const gameItem = new GameItem(game);
      card.addContent(gameItem);
      if (index < cardGames.length - 1) {
        const separator = createElement('<div class="game-separator"></div>');
        card.addContent(separator);
      }
    });

    weekGroup.appendChild(card);
  });

  carouselInner.appendChild(weekGroup);
}

/* ------------------------------------------------ */

function setActiveWeek(weekId) {
  // const setActiveItems = () => {

  let activeBtn = weekFilterContainer.querySelector('button');
  let activeGroup = scheduleContainer.querySelector('.week-group');

  if (weekId) {
    activeBtn = weekFilterContainer.querySelector(`#week-${weekId}-btn`);
    activeGroup = scheduleContainer.querySelector(`#week-${weekId}-group`);
  }

  activeBtn.classList.add('active');
  activeGroup.classList.add('active');
}

/* ------------------------------------------------ */

function addDataListeners() {
  // const addDataListeners = () => {

  const teamIds = Object.keys(session.teams);
  teamIds.forEach(teamId => {

    const teamPath = session.getLeague().refs.teams + '/' + teamId;
    const teamRecordRef = ref(db, teamPath + '/stats/games/record');
    onValue(teamRecordRef, snapshot => {
      const record = snapshot.val();
      const gameItems = scheduleContainer.querySelectorAll('.game-item');
      gameItems.forEach(gameItem => {
        const hasTeam = gameItem.teamIds.includes(teamId);
        if (hasTeam) gameItem.updateTeamRecord(teamId, record);
      });
    });
  });

  const gameItems = scheduleContainer.querySelectorAll('.game-item');
  gameItems.forEach(gameItem => {

    const weekId = gameItem.data.week;
    const gameId = gameItem.data.id;
    const matchesRef = ref(db, session.getLeague().refs.games + '/' + weekId + '/' + gameId + '/matches');
    onValue(matchesRef, snapshot => {
      const matches = snapshot.val();
      gameItem.updateMatchResults(matches);
    });

  });
}

/* ------------------------------------------------ */

function makeSchedule() {

  resetContainers();

  let initialWeek = null;
  const weeks = Object.values(session.weeks);

  weeks.forEach((week, index) => {
    addWeekButton(week, index);
    addWeekGames(week);
    let games = Object.values(session.games[week.id]);
    let gamesPost = games.filter(g => g.matches['G1'].status == 'POST' || g.matches['G2'].status == 'POST');
    if (gamesPost.length > 0) initialWeek = week.id;
  });

  setActiveWeek(initialWeek);
  addDataListeners();
}

/* ------------------------------------------------ */

function handleTeamSelection(e) {

  let team = APP.focusedTeam;
  let allTeamItems = scheduleContainer.querySelectorAll('.team-item');

  // clear all focus/unfocus formatting
  if (!team) {
    allTeamItems.forEach(ti => {
      ti.classList.remove('selected', 'unselected');
    });
    return;
  }

  scheduleContainer.querySelectorAll('.team-item').forEach(ti => {
    if (ti.getAttribute('data-team_id') == team) {
      ti.classList.remove('unselected');
      ti.classList.add('selected');
    } else {
      ti.classList.remove('selected');
      ti.classList.add('unselected');
    }
  });

  let weekGroup = scheduleContainer.querySelector('.week-group.active');
  if (weekGroup) {
    let firstSelected = weekGroup.querySelector('.team-item.selected');
    let gameGroup = firstSelected.closest('.game-group');
    console.log(gameGroup);
    offsetScrollIntoView(gameGroup);
  }
}

/* ------------------------------------------------ */
