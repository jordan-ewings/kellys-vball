import * as util from './util.js';
import * as gest from './gestures.js';
import { db } from './firebase.js';
import { ref, get, child, onValue, set, update, remove, onChildAdded, onChildChanged, onChildRemoved } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';
import { DBold } from './data.js';

/* ------------------------------------------------ */


document.addEventListener('DOMContentLoaded', init);

function init() {

  onValue(ref(db, 'seasons'), snapshot => {

    let data = snapshot.val();
    makeLeaguePicker(data);

    document.querySelector('#loading').remove();
  }, { onlyOnce: true });
}

/* ------------------------------------------------ */

// allow user to pick the season, session, and league to view standings/schedule for (on other pages), save to local storage
function makeLeaguePicker(data) {

  let seasons = data;
  let season = localStorage.getItem('season') || Object.keys(seasons)[0];
  let sessions = seasons[season]['sessions'];
  let session = localStorage.getItem('session') || Object.keys(sessions)[0];
  let leagues = seasons[season]['sessions'][session]['leagues'];
  let league = localStorage.getItem('league') || Object.keys(leagues)[0];

  ['season', 'session', 'league'].forEach((item, index) => {
    let select = document.createElement('select');
    select.id = item;
    select.classList.add('form-select');

    let options = item === 'season' ? seasons : item === 'session' ? sessions : leagues;
    let selected = item === 'season' ? season : item === 'session' ? session : league;
    if (localStorage.getItem(item) === null) localStorage.setItem(item, selected);

    Object.keys(options).forEach(option => {
      let opt = document.createElement('option');
      opt.value = option;
      opt.textContent = option;
      opt.selected = option === selected;
      select.appendChild(opt);
    });

    select.addEventListener('change', function () {
      let value = this.value;
      localStorage.setItem(item, value);
      // re-generate the select elements
      ['season', 'session', 'league'].forEach((item, index) => {
        document.querySelector('#' + item + '-div').remove();
      });
      makeLeaguePicker(data);
    });

    let label = document.createElement('label');
    label.textContent = item.charAt(0).toUpperCase() + item.slice(1);
    label.setAttribute('for', item);

    let selectDiv = document.createElement('div');
    selectDiv.id = item + '-div';
    selectDiv.classList.add('form-group');
    selectDiv.appendChild(label);
    selectDiv.appendChild(select);


    document.querySelector('#main-body').appendChild(selectDiv);
  });





}

/* ------------------------------------------------ */
// adding data to firebase

async function addNewData() {

  await DBold.load('games');
  await DBold.load('teams');

  let meta = DBold.get('teams')[0];
  let season = meta.season;
  let session = meta.session;
  let league = meta.league;

  let teams = {};
  DBold.get('teams').forEach(team => {
    teams[team.id] = team;
  });

  let games = {};
  DBold.get('games').forEach(game => {
    games[game.game_id] = game;
  });

  // add league to firebase
  let leagueRef = ref(db, 'seasons/' + season + '/' + session + '/' + league);
  onValue(leagueRef, snapshot => {
    if (!snapshot.exists()) {
      set(leagueRef, true);
      console.log('added league to firebase');
    } else {
      console.log('league already exists in firebase');
    }
  }, { onlyOnce: true });

  // add teams to firebase
  let teamsRef = ref(db, 'teams/' + season + '/' + session + '/' + league);
  onValue(teamsRef, snapshot => {
    if (!snapshot.exists()) {
      set(teamsRef, teams);
      console.log('added teams to firebase');
    } else {
      console.log('teams already exist in firebase');
    }
  }, { onlyOnce: true });

  // add games to firebase
  let gamesRef = ref(db, 'games/' + season + '/' + session + '/' + league);
  onValue(gamesRef, snapshot => {
    if (!snapshot.exists()) {
      set(gamesRef, games);
      console.log('added games to firebase');
    } else {
      console.log('games already exist in firebase');
    }
  }, { onlyOnce: true });
}

