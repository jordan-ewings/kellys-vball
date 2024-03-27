import { db, APP } from './firebase.js';
import { ref, get, child, onValue, set, update, remove, onChildAdded, onChildChanged, onChildRemoved } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

/* ------------------------------------------------ */

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
    if (data) {
      APP.userLeague = data;
      APP.season = data.season;
      APP.session = data.session;
      APP.league = data.league;
    } else {
      APP.season = userLeagueId.slice(0, 4);
      APP.session = userLeagueId.slice(4, 6);
      APP.league = userLeagueId.slice(6);
    }

    console.log(APP);
    initPageContent();

  }, { onlyOnce: true });
}

/* ------------------------------------------------ */

function initPageContent() {

  onValue(ref(db, 'leagues'), snapshot => {
    let data = snapshot.val();
    data = Object.values(data);
    makeLeaguePicker(data);
    showPageContent();

  }, { onlyOnce: true });
}

/* ------------------------------------------------ */

function showPageContent() {
  document.querySelector('#loading').remove();
  document.querySelector('#main').classList.remove('d-none');
}

/* ------------------------------------------------ */

// allow user to pick the season, session, and league to view standings/schedule for (on other pages), save to local storage
function makeLeaguePicker(data) {

  console.log('makeLeaguePicker()');

  let selects = ['season', 'session', 'league'];
  selects.forEach((s, i) => {

    let selectElement = document.querySelector('#' + s + 'Select');
    let select = selectElement.cloneNode(true);
    selectElement.replaceWith(select);
    select.innerHTML = '';

    let leagues = data;
    selects.forEach((s2, i2) => {
      if (i2 < i) leagues = leagues.filter(l => l[s2] == APP[s2]);
    });

    let availOptions = leagues.map(l => l[s]).filter((v, i, a) => a.indexOf(v) === i);
    let options = data.map(l => l[s]).filter((v, i, a) => a.indexOf(v) === i);

    options.forEach(o => {
      let opt = document.createElement('option');
      opt.value = o;
      opt.innerHTML = o;
      if (o == APP[s]) opt.setAttribute('selected', '');
      if (!availOptions.includes(o)) opt.setAttribute('disabled', '');
      select.appendChild(opt);
    });

    // validate user selection
    let invalid = !availOptions.includes(APP[s]);
    select.classList.toggle('invalid', invalid);

    select.addEventListener('change', e => {
      e.preventDefault();
      APP[s] = e.target.value;
      let leagueId = APP.season + APP.session + APP.league;
      localStorage.setItem('userLeagueId', leagueId);

      let leagueData = data.find(l => l.id == leagueId);
      if (leagueData) {
        console.log('new userLeagueId:', leagueId);
      } else {
        console.log('league not found, change selections');
      }
      makeLeaguePicker(data);
    });
  });

}
