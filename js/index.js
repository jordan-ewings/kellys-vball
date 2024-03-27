import * as util from './util.js';
import * as gest from './gestures.js';
import { db, APP } from './firebase.js';
import { ref, get, child, onValue, set, update, remove, onChildAdded, onChildChanged, onChildRemoved } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

/* ------------------------------------------------ */

document.addEventListener('DOMContentLoaded', init);

function init() {

  let userLeagueId = localStorage.getItem('userLeagueId');
  if (userLeagueId == null) {
    userLeagueId = '202401MONDAY';
    localStorage.setItem('userLeagueId', userLeagueId);
  }

  onValue(ref(db, 'leagues/' + userLeagueId), snapshot => {
    let data = snapshot.val();
    APP.league = data;
    APP.season = data.season;
    APP.session = data.session;
    APP.league = data.league;
    console.log(APP);
    initPageContent();
  }, { onlyOnce: true });
}

/* ------------------------------------------------ */

function initPageContent() {

  onValue(ref(db, 'leagues'), snapshot => {
    let data = snapshot.val();
    makeLeaguePicker(data);
  }, { onlyOnce: true });

  document.querySelector('#loading').remove();
}

/* ------------------------------------------------ */

// allow user to pick the season, session, and league to view standings/schedule for (on other pages), save to local storage
function makeLeaguePicker(data) {

  let leagues = Object.values(data);
  let season = APP.season;
  let session = APP.session;
  let league = APP.league;

  let seasonOptions = leagues.map(l => l.season).filter((v, i, a) => a.indexOf(v) === i);
  let sessionOptions = leagues.filter(l => l.season == season).map(l => l.session).filter((v, i, a) => a.indexOf(v) === i);
  let leagueOptions = leagues.filter(l => l.season == season && l.session == session).map(l => l.league);

  let seasonSelect = document.querySelector('#seasonSelect');
  let sessionSelect = document.querySelector('#sessionSelect');
  let leagueSelect = document.querySelector('#leagueSelect');

  seasonSelect.innerHTML = '';
  seasonSelect.value = season;
  seasonOptions.forEach(s => {
    let opt = document.createElement('option');
    opt.value = s;
    opt.innerHTML = s;
    opt.selected = s == season;
    seasonSelect.appendChild(opt);
  });

  sessionSelect.innerHTML = '';
  sessionSelect.value = session;
  sessionOptions.forEach(s => {
    let opt = document.createElement('option');
    opt.value = s;
    opt.innerHTML = s;
    opt.selected = s == session;
    sessionSelect.appendChild(opt);
  });


  leagueSelect.innerHTML = '';
  leagueSelect.value = league;
  leagueOptions.forEach(l => {
    let opt = document.createElement('option');
    opt.value = l;
    opt.innerHTML = l;
    opt.selected = l == league;
    leagueSelect.appendChild(opt);
  });

















}

