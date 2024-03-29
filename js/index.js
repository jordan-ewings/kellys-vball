import * as util from './util.js';
import { db } from './firebase.js';
import { ref, onValue } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

import { APP, initUserContent } from './main.js';

/* ------------------------------------------------ */

const homeNav = document.querySelector('#nav-index');
const homeSection = document.querySelector('#index-section');
const leagueSelectContainer = document.querySelector('#league-select-container');

/* ------------------------------------------------ */

export function initHomeContent() {

  onValue(ref(db, 'leagues'), snapshot => {
    let leagues = Object.values(snapshot.val());
    makeLeagueSelect(leagues);
  }, { onlyOnce: true });
}

/* ------------------------------------------------ */

function makeLeagueSelect(leagues) {

  leagueSelectContainer.innerHTML = '';

  let data = JSON.parse(JSON.stringify(leagues));
  let selects = ['season', 'session', 'league'];

  selects.forEach((s, i) => {

    let formGroup = util.createFromTemplate('league-select-form-group-template');
    let select = formGroup.querySelector('select');
    let label = formGroup.querySelector('label');

    formGroup.id = s + '-div';
    select.id = s + 'Select';
    label.for = s + 'Select';
    label.textContent = s;

    let limLeagues = data;
    if (s == 'session') limLeagues = limLeagues.filter(l => l.season == APP.season);
    if (s == 'league') limLeagues = limLeagues.filter(l => l.season == APP.season && l.session == APP.session);

    // get options
    let availOptions = limLeagues.map(l => l[s]).filter((v, i, a) => a.indexOf(v) === i);
    let options = data.map(l => l[s]).filter((v, i, a) => a.indexOf(v) === i);

    // add options
    options.forEach(o => {
      let opt = document.createElement('option');
      opt.value = o;
      opt.innerHTML = o.charAt(0).toUpperCase() + o.slice(1).toLowerCase();
      if (o == APP[s]) opt.setAttribute('selected', '');
      if (!availOptions.includes(o)) opt.setAttribute('disabled', '');
      select.appendChild(opt);
    });

    // validate user selection
    let invalid = !availOptions.includes(APP[s]);
    select.classList.toggle('invalid', invalid);

    // update local storage on change
    select.addEventListener('change', e => {

      e.preventDefault();
      APP[s] = e.target.value;
      let leagueId = APP.season + APP.session + APP.league;
      let leagueData = data.find(l => l.id == leagueId);

      if (leagueData) {
        localStorage.setItem('userLeagueId', leagueId);
        initUserContent();

      } else {
        console.log('League selection invalid - reloading options');
        makeLeagueSelect(data);
      }
    });

    leagueSelectContainer.appendChild(formGroup);
  });
}
