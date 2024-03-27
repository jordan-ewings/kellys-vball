import * as util from './util.js';
import * as gest from './gestures.js';
import { db, APP } from './firebase.js';
import { ref, get, child, onValue, set, update, remove, onChildAdded, onChildChanged, onChildRemoved } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';
import { DBold } from './data.js';

/* ------------------------------------------------ */

document.addEventListener('DOMContentLoaded', init);

async function init() {

  await loadNewData();
  createActionButtons();
  showData();

}

/* ------------------------------------------------ */
// adding data to firebase

async function loadNewData() {

  await DBold.load('games');
  await DBold.load('teams');

  let meta = DBold.get('teams')[0];

  let league = meta.league.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  let leagueMin = league.slice(0, 3);
  let sessionVal = parseInt(meta.session);
  let sessionFull = sessionVal + (sessionVal == 1 ? 'st' : 'nd') + ' Session';
  let sessionShort = 'S' + sessionVal;
  let season = meta.season;

  let leagueTitle = league + ' Night ' + sessionFull + ' ' + season;
  let leagueTitleShort = league + ' ' + sessionShort + ' ' + season;
  let leagueTitleMin = leagueMin + ' ' + sessionShort;
  let leaguePath = meta.season + '/' + meta.session + '/' + meta.league;

  let leagueId = meta.season + meta.session + meta.league;
  let leagueData = {
    id: leagueId,
    season: meta.season,
    session: meta.session,
    league: meta.league,
    title: leagueTitle,
    titleShort: leagueTitleShort,
    titleMin: leagueTitleMin,
    refs: {
      teams: 'teams/' + leaguePath,
      games: 'games/' + leaguePath,
    }
  };

  let teamsRaw = DBold.get('teams');
  let teams = {};
  teamsRaw.forEach(t => {
    let altStruct = {
      id: t.id,
      nbr: t.nbr,
      name: t.name,
      wins: parseInt(t.wins),
      losses: parseInt(t.losses),
      record: t.wins + '-' + t.losses,
    };

    teams[t.id] = altStruct;
  });

  let gamesRaw = DBold.get('games');
  let games = {};
  gamesRaw.forEach(g => {
    let id_1 = g.week.padStart(2, '0');
    let id_2 = g.time.replace(':', '').split(' ')[0].padStart(4, '0');
    let id_3 = g.court.replace('Court ', '').padStart(2, '0');
    let game_id = id_1 + id_2 + id_3;
    let altStruct = {
      id: game_id,
      week: g.week,
      week_label: g.week_label,
      time: g.time,
      court: g.court,
      status: g.status,
      teams: {
        [g.team1_id]: true,
        [g.team2_id]: true,
      },
      winner: null,
    };
    games[game_id] = altStruct;
  });

  APP.dataParentSet = {
    leagues: {
      [leagueId]: leagueData,
    },
    teams: {
      [meta.season]: {
        [meta.session]: {
          [meta.league]: teams,
        },
      },
    },
    games: {
      [meta.season]: {
        [meta.session]: {
          [meta.league]: games,
        },
      },
    },
  };

  APP.dataChildSet = {
    ['leagues/' + leagueId]: leagueData,
    ['teams/' + leaguePath]: teams,
    ['games/' + leaguePath]: games,
  };

  APP.setMode = 'child';
  APP.data = (APP.setMode == 'parent') ? APP.dataParentSet : APP.dataChildSet;

  console.log(APP);
  return APP;
}

/* ------------------------------------------------ */

function pushNewData() {

  let data = APP.data;
  let actions = [];

  Object.keys(data).forEach(key => {
    let ref = key;
    let value = data[key];
    actions.push({ ref: ref, value: value });
  });

  console.log(actions);

  actions.forEach(action => {
    let dbPath = action.ref;
    let dbValue = action.value;
    set(ref(db, dbPath), dbValue);
  });

  console.log('pushed data to firebase');
}

/* ------------------------------------------------ */

function showData() {

  let dv = document.getElementById('dataview-container');
  dv.innerHTML = '';

  let data = APP.data;
  let keys = Object.keys(data);

  keys.forEach(key => {

    let json = JSON.stringify(data[key], null, 2);
    let pre = document.createElement('pre');
    let code = document.createElement('code');
    code.style.fontSize = '0.7rem';
    code.style.whiteSpace = 'pre-wrap';
    code.style.borderRadius = '12px';
    code.style.border = '1px solid rgb(255, 255, 255, 0.2)';
    code.textContent = json;
    pre.appendChild(code);

    let title = document.createElement('h5');
    title.textContent = key;
    title.style.marginBottom = '0.5rem';
    title.style.fontFamily = 'monospace';

    let block = document.createElement('div');
    block.style.marginBottom = '1.5rem';
    block.appendChild(title);
    block.appendChild(pre);

    dv.appendChild(block);

    hljs.highlightElement(code);
  });
}

/* ------------------------------------------------ */

function createActionButtons() {

  let abContainer = document.querySelector('#action-buttons');

  let btnLoad = document.createElement('button');
  btnLoad.id = "btn-load";
  btnLoad.type = 'button';
  btnLoad.classList.add('btn', 'btn-primary');
  btnLoad.textContent = 'Load Data';
  btnLoad.addEventListener('click', async () => {
    await loadNewData();
    showData();
  });

  let btnPush = document.createElement('button');
  btnPush.id = "btn-push";
  btnPush.type = 'button';
  btnPush.classList = 'btn ' + (APP.setMode == 'parent' ? 'btn-danger' : 'btn-warning');
  btnPush.textContent = 'Push Data';
  btnPush.addEventListener('click', () => {
    btnPush.disabled = true;
    pushNewData();
    btnPush.textContent = 'Data Pushed';
    let classList = btnPush.classList;
    btnPush.classList = 'btn btn-success';

    setTimeout(() => {
      btnPush.textContent = 'Push Data';
      btnPush.classList = classList;
      btnPush.disabled = false;
    }, 2000);
  });

  let setMode = document.createElement('button');
  setMode.id = "btn-set-mode";
  setMode.type = 'button';
  setMode.classList = 'btn btn-sm ' + (APP.setMode == 'parent' ? 'btn-outline-danger' : 'btn-outline-warning');
  setMode.textContent = 'MODE: replace ' + APP.setMode + ' nodes';
  setMode.addEventListener('click', () => {
    APP.setMode = APP.setMode == 'parent' ? 'child' : 'parent';
    APP.data = (APP.setMode == 'parent') ? APP.dataParentSet : APP.dataChildSet;
    setMode.textContent = 'MODE: replace ' + APP.setMode + ' nodes';
    setMode.classList = 'btn btn-sm ' + (APP.setMode == 'parent' ? 'btn-outline-danger' : 'btn-outline-warning');
    btnPush.classList = 'btn ' + (APP.setMode == 'parent' ? 'btn-danger' : 'btn-warning');
    showData();
  });

  abContainer.appendChild(btnLoad);
  abContainer.appendChild(setMode);
  abContainer.appendChild(btnPush);


}


