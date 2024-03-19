import * as util from './util.js';
import * as gest from './gestures.js';
import { DB, APP } from './data.js';

/* ------------------------------------------------ */

document.addEventListener('DOMContentLoaded', init);

async function init() {

  await initDB();
  initAPPDATA();
  initPage();
}

/* ------------------------------------------------ */

async function initDB() {

  await DB.load('Teams');
  await DB.load('Schedule');
}

/* ------------------------------------------------ */

function initAPPDATA() {

  let data = DB.get('Schedule');
  let weeks = data.map(d => d.week).filter((v, i, a) => a.findIndex(t => (t === v)) === i);
  let currentWeek = weeks[0];
  weeks.forEach(w => {
    let week = data.filter(d => d.week === w);
    let games = week.filter(d => d.status === 'POST');
    if (games.length > 0) {
      currentWeek = w;
    }
  });

  APP.set('currentWeek', currentWeek);
  // APP.set('focusedTeam', null);
}

/* ------------------------------------------------ */

function initPage() {

  makePage();

  let loading = document.querySelector('#loading');
  loading.classList.add('d-none');
}

/* ------------------------------------------------ */

function makePage() {

}

