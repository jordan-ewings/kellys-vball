import { db } from './firebase.js';
import { ref, set, update } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';
import { DBold } from './data.js';

/* ------------------------------------------------ */

document.addEventListener('DOMContentLoaded', init);

async function init() {

  createActionButtons();

}

const APP = {};

/* ------------------------------------------------ */
// adding data to firebase

async function loadNewData() {

  let night = 'monday';

  let meta = { season: '2024', session: '01', league: night.toUpperCase() };
  let gamesSheet = night + '-games';
  let teamsSheet = night + '-teams';

  await DBold.load(gamesSheet);
  await DBold.load(teamsSheet);

  let gamesRaw = DBold.get(gamesSheet);
  let teamsRaw = DBold.get(teamsSheet);
  let leagueId = meta.season + meta.session + meta.league;

  let weeksArr = gamesRaw.map(g => g.week).filter((v, i, a) => a.indexOf(v) === i);
  let weeks = {};
  weeksArr.forEach(w => {
    let week_id = 'WK' + w.padStart(2, '0');
    let date = new Date(gamesRaw.find(g => g.week == w).date);
    weeks[week_id] = {
      id: week_id,
      nbr: parseInt(w),
      label: 'Week ' + w,
      gameday: date,
      refs: {
        games: 'games/' + leagueId + '/' + week_id,
        stats: 'stats/' + leagueId + '/' + week_id,
      }
    };
  });

  let teams = {};
  teamsRaw.forEach(t => {
    let team = {
      id: t.id,
      nbr: t.nbr,
      name: t.name,
      stats: {
        games: {
          count: 0,
          wins: 0,
          losses: 0,
          record: '0-0',
        },
        drinks: {
          count: 0,
        }
      }
    };

    teams[t.id] = team;
  });

  let games = {};
  Object.values(weeks).forEach(w => {
    let weekGames = gamesRaw.filter(g => g.week == w.nbr);
    let weekSchedule = {};
    weekGames.forEach((g, i) => {

      let event = {
        id: g.id,
        week: w.id,
        time: g.time,
        court: g.court,
        teams: {
          [g.team1_id]: true,
          [g.team2_id]: true,
        },
        matches: {
          G1: {
            name: 'Game 1',
            status: 'PRE',
            winner: null,
          },
          G2: {
            name: 'Game 2',
            status: 'PRE',
            winner: null,
          },
        }
      };

      weekSchedule[g.id] = event;
    });

    games[w.id] = weekSchedule;
  });

  let stats = {};
  // Object.keys(teams).forEach(t => {
  //   stats[t] = {};
  //   stats[t]['games'] = {};
  //   stats[t]['drinks'] = {};
  //   Object.keys(weeks).forEach(w => {
  //     stats[t][w] = {};
  //     stats[t][w]['games'] = { count: 0, wins: 0, losses: 0, record: '0-0' };
  //     stats[t][w]['drinks'] = { count: 0 };
  //   });
  // });
  Object.keys(weeks).forEach(w => {
    stats[w] = {};
    Object.keys(teams).forEach(t => {
      stats[w][t] = {};
      stats[w][t]['games'] = { count: 0, wins: 0, losses: 0, record: '0-0' };
      stats[w][t]['drinks'] = { count: 0 };
    });
  });
  // stats['games'] = {};
  // stats['drinks'] = {};

  // Object.keys(weeks).forEach(w => {
  //   stats['games'][w] = {};
  //   stats['drinks'][w] = {};
  //   Object.keys(teams).forEach(t => {
  //     stats['games'][w][t] = { count: 0, wins: 0, losses: 0, record: '0-0' };
  //     stats['drinks'][w][t] = { count: 0 };
  //   });
  // });

  // let drinks = {};
  // Object.values(weeks).forEach(w => {
  //   let weekTeams = Object.keys(teams);
  //   let weekDrinks = {};
  //   weekTeams.forEach(t => {
  //     weekDrinks[t] = { count: 0 };
  //   });

  //   drinks[w.id] = weekDrinks;
  // });


  let leagueLab = meta.league.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  let sessionLab = parseInt(meta.session) + (parseInt(meta.session) == 1 ? 'st' : 'nd') + ' Session';
  let seasonLab = meta.season;
  let leagueTitle = leagueLab + ' Night ' + sessionLab + ' ' + seasonLab;

  let leagueData = {
    id: leagueId,
    season: meta.season,
    session: meta.session,
    league: meta.league,
    title: leagueTitle,
    refs: {
      weeks: 'weeks/' + leagueId,
      teams: 'teams/' + leagueId,
      stats: 'stats/' + leagueId,
      games: 'games/' + leagueId,
    },
    refsDetail: {
      weeks: 'weeks/' + leagueId + '/{weekId}',
      teams: 'teams/' + leagueId + '/{teamId}',
      stats: 'stats/' + leagueId + '/{weekId}/{teamId}/{statId}',
      games: 'games/' + leagueId + '/{weekId}/{gameId}',
    }
  };

  APP.data = {
    ['leagues/' + leagueId]: leagueData,
    ['weeks/' + leagueId]: weeks,
    ['teams/' + leagueId]: teams,
    ['stats/' + leagueId]: stats,
    ['games/' + leagueId]: games,

  };

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

  let updates = {};
  actions.forEach(action => {
    updates[action.ref] = action.value;
  });

  console.log(updates);

  update(ref(db), updates)
    .then(() => {
      console.log('pushed data to firebase');
    })
    .catch((error) => {
      console.error('Error updating data:', error);
    });


  // actions.forEach(action => {
  //   let dbPath = action.ref;
  //   let dbValue = action.value;
  //   update(ref(db, dbPath), dbValue);
  // });

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

    let title = document.createElement('h6');
    title.textContent = key;
    title.style.marginBottom = '0.5rem';
    title.style.fontFamily = 'monospace';
    title.classList.add(('text-' + (APP.setMode == 'parent' ? 'danger' : 'warning') + '-emphasis'));

    let block = document.createElement('div');
    block.style.marginBottom = '1.5rem';
    block.appendChild(title);
    block.appendChild(pre);

    dv.appendChild(block);

    hljs.highlightElement(code);
  });

  document.querySelector('#btn-push').classList.remove('d-none');
}

/* ------------------------------------------------ */

function createActionButtons() {

  let abContainer = document.querySelector('#action-buttons');

  let btnLoad = document.createElement('button');
  btnLoad.id = "btn-load";
  btnLoad.type = 'button';
  btnLoad.classList.add('btn', 'btn-sm', 'btn-primary');
  btnLoad.textContent = 'Load Data';
  btnLoad.addEventListener('click', async () => {
    await loadNewData();
    showData();
  });

  let btnPush = document.createElement('button');
  btnPush.id = "btn-push";
  btnPush.type = 'button';
  btnPush.classList = 'btn btn-sm btn-warning';
  btnPush.textContent = 'Push Data';
  btnPush.addEventListener('click', () => {
    pushNewData();
  });

  abContainer.appendChild(btnLoad);
  abContainer.appendChild(btnPush);

  btnPush.classList.add('d-none');
}


