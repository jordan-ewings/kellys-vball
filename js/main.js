import * as util from './util.js';
import { db, APP } from './firebase.js';
import { ref, get, query, equalTo, child, onValue, set, update, remove, onChildAdded, onChildChanged, onChildRemoved, runTransaction } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

/* ------------------------------------------------ */

document.addEventListener('DOMContentLoaded', init);

function init() {

  let userLeagueId = localStorage.getItem('userLeagueId');
  if (userLeagueId == null) {
    userLeagueId = '202401MONDAY';
    localStorage.setItem('userLeagueId', userLeagueId);
  }

  onValue(ref(db, 'leagues/' + userLeagueId), snapshot => {
    const user = snapshot.val();
    APP.user = user;
    APP.season = user.season;
    APP.session = user.session;
    APP.league = user.league;
    APP.gamesPath = user.refs.games;
    APP.teamsPath = user.refs.teams;

    console.log(APP);
    initHomeContent();
    initStandingsContent();
    initScheduleContent();

    document.querySelector('#loading').remove();
    document.querySelector('#main').classList.remove('d-none');

    const navs = document.querySelectorAll('.nav-link');
    navs.forEach(nav => {
      nav.addEventListener('click', (e) => {
        e.preventDefault();
        showContent(nav);
      });
    });

    // send user to home content
    const footer = document.querySelector('footer');
    const footerLink = footer.querySelector('a');
    footerLink.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelector('#nav-index').click();
    });

    document.querySelector('#nav-index').click();
  }, { onlyOnce: true });
}

/* ------------------------------------------------ */

function showContent(navLink) {

  document.querySelectorAll('.nav-link').forEach(nav => nav.classList.remove('active'));
  navLink.classList.add('active');

  document.querySelectorAll('section').forEach(sec => sec.classList.add('d-none'));
  const secId = navLink.id.replace('nav-', '') + '-section';
  document.querySelector('#' + secId).classList.remove('d-none');

  if (secId != 'index-section') {
    document.querySelector('footer').classList.remove('d-none');
  } else {
    document.querySelector('footer').classList.add('d-none');
  }
}

/* ------------------------------------------------ */

function initHomeContent() {

  onValue(ref(db, 'leagues'), snapshot => {
    const leagues = snapshot.val();
    makeLeaguePicker(leagues);
  }, { onlyOnce: true });

}

/* ------------------------------------------------ */

function makeLeaguePicker(leaguesData) {

  let data = JSON.parse(JSON.stringify(leaguesData));
  data = Object.values(data);

  let selects = ['season', 'session', 'league'];
  selects.forEach((s, i) => {

    // get select element (and remove event listeners)
    let selectElement = document.querySelector('#' + s + 'Select');
    let select = selectElement.cloneNode(true);
    selectElement.replaceWith(select);
    select.innerHTML = '';

    let leagues = data;
    if (s == 'session') {
      leagues = leagues.filter(l => l.season == APP.season);
    }
    if (s == 'league') {
      leagues = leagues.filter(l => l.season == APP.season && l.session == APP.session);
    }

    // get options
    let availOptions = leagues.map(l => l[s]).filter((v, i, a) => a.indexOf(v) === i);
    let options = data.map(l => l[s]).filter((v, i, a) => a.indexOf(v) === i);

    // add options
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

    // update local storage on change
    select.addEventListener('change', e => {

      e.preventDefault();
      APP[s] = e.target.value;
      let leagueId = APP.season + APP.session + APP.league;
      let leagueData = data.find(l => l.id == leagueId);
      localStorage.setItem('userLeagueId', leagueId);

      if (leagueData) {
        console.log('new userLeagueId:', leagueId);
        APP.user = leagueData;
        APP.gamesPath = leagueData.refs.games;
        APP.teamsPath = leagueData.refs.teams;

        console.log(APP);
        initStandingsContent();
        initScheduleContent();

      } else {
        console.log('league not found, change selections');
      }

      makeLeaguePicker(data);
    });
  });

}

/* ------------------------------------------------ */

function initStandingsContent() {

  document.querySelector('#league-title').textContent = APP.user.title;

  onValue(ref(db, APP.teamsPath), snapshot => {
    let teams = snapshot.val();
    teams = Object.values(teams);
    makeStandings(teams);
  });
}

/* ------------------------------------------------ */
// generate standings

function makeStandings(teams) {

  // create copy of data
  let data = JSON.parse(JSON.stringify(teams));

  // calculate winPct
  data.forEach(team => {
    team.games = team.wins + team.losses;
    team.winPct = team.games > 0 ? team.wins / team.games : 0;
  });

  // sort standings
  data.sort((a, b) => {
    if (a.winPct < b.winPct) return 1;
    if (a.winPct > b.winPct) return -1;
    if (a.losses > b.losses) return 1;
    if (a.losses < b.losses) return -1;
    if (a.wins < b.wins) return 1;
    if (a.wins > b.wins) return -1;
    if (a.id > b.id) return 1;
    if (a.id < b.id) return -1;

    return 0;
  });

  // add rank (not currently used)
  let rank = 1;
  let prevWinPct = null;
  data.forEach((team, index) => {
    let winPct = team.winPct;
    let ties = data.filter(t => t.winPct === winPct).length;
    if (winPct != prevWinPct) rank = index + 1;
    team.rank = ties > 1 ? 'T-' + rank : rank;
    prevWinPct = winPct;
  });

  // if no games played, set rank to '-'
  let teamGames = data.map(t => t.games);
  let totalGames = teamGames.reduce((a, b) => a + b);
  if (totalGames == 0) {
    data.forEach(team => {
      team.rank = '-';
    });
  }

  // create standings elements
  makeStandingsStructure();
  let standingsHead = document.querySelector('#standings-container thead');
  let standingsBody = document.querySelector('#standings-container tbody');

  // populate standings
  data.forEach((team, index) => {

    let standingsItem = util.createFromTemplate('standings-item-template');

    // add headers if first item
    if (index == 0) {
      let tr = document.createElement('tr');
      let tds = standingsItem.querySelectorAll('td');
      tds.forEach(td => {
        let th = document.createElement('th');
        th.classList.add(td.className);
        th.textContent = td.getAttribute('data-column');
        tr.appendChild(th);
      });
      standingsHead.appendChild(tr);
    }

    team.winPct = util.formatNumber(team.winPct, '0.000');
    team.id = parseInt(team.id);

    // populate data items
    let dataItems = standingsItem.querySelectorAll('[data-item]');
    dataItems.forEach(item => {
      let dataItem = item.getAttribute('data-item');
      item.textContent = team[dataItem];
    });

    standingsBody.appendChild(standingsItem);
  });
}

/* ------------------------------------------------ */

function makeStandingsStructure() {

  // clear standings container
  let standingsContainer = document.querySelector('#standings-container');
  standingsContainer.innerHTML = '';

  // card title
  let contCardTitle = document.createElement('div');
  contCardTitle.classList.add('cont-card-title');
  let contCardTitleContent = document.createElement('span');
  contCardTitleContent.textContent = 'LEADERBOARD';
  contCardTitle.appendChild(contCardTitleContent);

  // card body + table responsive div
  let contCardBody = document.createElement('div');
  contCardBody.classList.add('cont-card-body');
  let tableResponsive = document.createElement('div');
  tableResponsive.classList.add('table-responsive');

  // table
  let table = document.createElement('table');
  table.classList.add('table', 'table-borderless', 'align-middle', 'text-nowrap', 'm-0');
  let thead = document.createElement('thead');
  let tbody = document.createElement('tbody');
  table.appendChild(thead);
  table.appendChild(tbody);

  // append elements
  tableResponsive.appendChild(table);
  contCardBody.appendChild(tableResponsive);

  standingsContainer.appendChild(contCardTitle);
  standingsContainer.appendChild(contCardBody);

}

/* ------------------------------------------------ */

function initScheduleContent() {

  document.querySelector('#league-title').textContent = APP.user.title;

  onValue(ref(db, APP.gamesPath), snapshot => {
    let games = Object.values(snapshot.val());
    let nextGame = games.find(g => g.status === 'PRE');
    let currentWeek = nextGame.week;
    APP.currentWeek = currentWeek;

    makeFilters(games);

    document.querySelector('#filter-container button[data-week="' + currentWeek + '"]').click();
  }, { onlyOnce: true });
}

/* ------------------------------------------------ */

function makeFilters(data) {

  let filterContainer = document.querySelector('#filter-container');
  filterContainer.innerHTML = '';

  // get unique weeks
  let weeks = data.map(d => {
    return { value: d.week, label: d.week_label };
  }).filter((v, i, a) => a.findIndex(t => (t.value === v.value)) === i);

  // create week buttons
  weeks.forEach(w => {
    let value = w.value;
    let label = w.label;
    let btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('data-week', value);
    btn.classList.add('btn', 'text-nowrap');
    btn.innerHTML = label;

    // fetch live data for week
    btn.addEventListener('click', (e) => {
      let week = e.target.getAttribute('data-week');
      onValue(ref(db, APP.gamesPath), (snapshot) => {

        let games = Object.values(snapshot.val()).filter(g => g.week == week);
        onValue(ref(db, APP.teamsPath), (snapshot) => {
          let teams = snapshot.val();
          games.forEach(g => {
            Object.keys(g.teams).forEach(teamId => {
              let teamObj = teams[teamId];
              g['teams'][teamId] = { ...teamObj };
            });
          });
          makeSchedule(games);
        }, { onlyOnce: true });
      }, { onlyOnce: true });

      // highlight active button and scroll into view
      let active = filterContainer.querySelector('.active');
      if (active) active.classList.remove('active');
      e.target.classList.add('active');
      e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });

    filterContainer.appendChild(btn);
  });
}

/* ------------------------------------------------ */

function makeSchedule(data) {

  // clear schedule container
  let scheduleContainer = document.querySelector('#schedule-container');
  scheduleContainer.innerHTML = '';

  // group games by time
  let timeSlots = data.map(d => d.time).filter((v, i, a) => a.findIndex(t => (t === v)) === i);
  timeSlots.forEach(timeSlot => {
    let gameCard = util.createFromTemplate('game-group-template');
    let gameGroup = gameCard.querySelector('.cont-card-body');
    let games = data.filter(d => d.time === timeSlot);

    // create and append game items
    games.forEach((game, index) => {
      let gameItem = makeGameItem(game);
      gameGroup.appendChild(gameItem);

      // add separator between games
      if (index < games.length - 1) {
        let separator = document.createElement('div');
        separator.classList.add('game-separator');
        gameGroup.appendChild(separator);
      }
    });

    scheduleContainer.appendChild(gameCard);
  });
}

/* ------------------------------------------------ */

function makeGameItem(d) {

  let gameItem = util.createFromTemplate('game-item-template');

  // set game item properties
  gameItem.id = 'game-' + d.id;
  gameItem.dataset.game_id = d.id;
  gameItem.classList.add((d.status == 'PRE') ? 'pre' : 'post');
  gameItem.dataset.winner_id = (d.status == 'POST') ? d.winner : '';

  // set game info text
  gameItem.querySelector('.game-time').textContent = d.time;
  gameItem.querySelector('.game-court').textContent = d.court;

  let teams = Object.keys(d.teams);
  teams.forEach((teamId, index) => {

    let teamItem = gameItem.querySelector('.team-item-' + (index + 1));

    // on team data change, update team item
    let teamRef = ref(db, APP.teamsPath + '/' + teamId);
    onValue(teamRef, (snapshot) => {
      let team = snapshot.val();
      teamItem.dataset.team_id = teamId;
      teamItem.dataset.team_nbr = team.nbr;
      teamItem.dataset.team_name = team.name;
      teamItem.querySelector('.team-nbr').textContent = team.nbr;
      teamItem.querySelector('.team-name').textContent = team.name;
      teamItem.querySelector('.team-record').textContent = team.record;
    });

    // apply team focus formatting
    if (APP.focusedTeam) {
      let isFocused = (APP.focusedTeam == teamId);
      teamItem.classList.toggle('selected', isFocused);
      teamItem.classList.toggle('unselected', !isFocused);
    }

    // listen for team focus
    teamItem.querySelector('.team-name').addEventListener('click', (e) => {
      let focusedTeam = (APP.focusedTeam == teamId) ? null : teamId;
      APP.focusedTeam = focusedTeam;
      handleTeamSelection();
    });
  });

  // stat-col click generates editable game item (winner selection)
  let statCol = gameItem.querySelector('.stat-col');
  statCol.addEventListener('click', (e) => {

    // clear focused team
    APP.focusedTeam = null;
    handleTeamSelection();

    // close any open game item forms
    let gameItemForms = document.querySelectorAll('.game-item-form');
    gameItemForms.forEach((gif) => {
      let gifStatCol = gif.querySelector('.stat-col');
      gifStatCol.click();
    });

    // insert game item form
    let gameItemForm = gameItemToForm(gameItem);
    gameItem.classList.add('d-none');
    gameItem.insertAdjacentElement('afterend', gameItemForm);
  });

  // on game data change, update game item (winner/loser and status)
  let gameRef = ref(db, APP.gamesPath + '/' + d.id);
  onValue(gameRef, (snapshot) => {

    let game = snapshot.val();
    gameItem.classList.remove('pre', 'post');
    gameItem.classList.add((game.status == 'PRE') ? 'pre' : 'post');
    gameItem.dataset.winner_id = (game.status == 'POST') ? game.winner : '';
    let teamItems = gameItem.querySelectorAll('.team-item');
    teamItems.forEach(ti => {
      ti.classList.remove('winner', 'loser');
      let teamId = ti.dataset.team_id;
      if (game.status == 'POST') {
        if (teamId == game.winner) ti.classList.add('winner');
        if (teamId != game.winner) ti.classList.add('loser');
      }
    });

    // make user close and re-open form if game has since been updated (by another user)
    let gameItemForm = document.querySelector('.game-item-form[data-game_id="' + d.id + '"]');
    if (gameItemForm) {
      showGameUpdateAlert(gameItemForm);
    }
  });

  return gameItem;
}

/* ------------------------------------------------ */

function showGameUpdateAlert(gameItemForm) {

  // disable team selection
  let teamCol = gameItemForm.querySelector('.team-col');
  teamCol.style.pointerEvents = 'none';
  teamCol.style.opacity = '0.5';

  // alert message
  let formFooter = gameItemForm.querySelector('.form-footer');
  formFooter.innerHTML = '';
  let alert = util.createAlert('danger', 'This game has been updated by another user. Close this form to see the changes.');
  alert.querySelector('.btn-close').remove();
  let alertMsg = alert.querySelector('.me-auto');
  alertMsg.style.fontSize = '0.95rem';
  alertMsg.style.fontWeight = '400';
  formFooter.appendChild(alert);

  // close form icon
  let editIcon = gameItemForm.querySelector('.edit-icon');
  editIcon.classList.add('text-danger', 'fa-fade');
  editIcon.style.fontSize = '1.5rem';
}

/* ------------------------------------------------ */

function gameItemToForm(gameItem) {

  // clone game item and set properties
  let gameItemForm = gameItem.cloneNode(true);
  gameItemForm.classList.add('game-item-form');
  gameItemForm.removeAttribute('id');
  gameItemForm.dataset.form_winner_id = gameItem.dataset.winner_id;

  let gameId = gameItem.dataset.game_id;
  let winnerId = gameItem.dataset.winner_id;

  // stat-col click replaces form with game item
  let statCol = gameItemForm.querySelector('.stat-col');
  let editIcon = statCol.querySelector('.edit-icon');
  editIcon.classList.replace('fa-pen', 'fa-xmark');
  statCol.addEventListener('click', (e) => {
    document.querySelector('#game-' + gameId).classList.remove('d-none');
    gameItemForm.remove();
  });

  // cancel button (replaces form with game item)
  let cancelBtn = document.createElement('button');
  cancelBtn.id = 'cancelBtn';
  cancelBtn.type = 'button';
  cancelBtn.classList.add('btn', 'btn-secondary');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', (e) => {
    document.querySelector('#game-' + gameId).classList.remove('d-none');
    gameItemForm.remove();
  });

  // save button
  let saveBtn = document.createElement('button');
  saveBtn.id = 'saveBtn';
  saveBtn.type = 'button';
  saveBtn.classList.add('btn', 'btn-outline-primary');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Submit';
  saveBtn.addEventListener('click', (e) => {

    let gi = document.querySelector('#game-' + gameId);
    let giForm = document.querySelector('.game-item-form[data-game_id="' + gameId + '"]');
    let newWinnerId = giForm.dataset.form_winner_id;

    // destroy form and show game item (to be updated shortly)
    gi.classList.remove('d-none');
    giForm.remove();

    // stop if nothing has changed
    if (newWinnerId == winnerId) return;

    let teamItems = giForm.querySelectorAll('.team-item');
    teamItems.forEach(ti => {
      let teamId = ti.dataset.team_id;
      let teamRef = ref(db, APP.teamsPath + '/' + teamId);

      // calculate wins and losses change
      let winsChange = 0;
      let lossesChange = 0;
      if (teamId == newWinnerId) {
        winsChange = 1;
        if (winnerId != '') lossesChange = -1;
      } else if (teamId == winnerId) {
        winsChange = -1;
        if (newWinnerId != '') lossesChange = 1;
      } else {
        if (winnerId == '' && newWinnerId != '') {
          // team is now a loser
          lossesChange = 1;
        } else if (winnerId != '' && newWinnerId == '') {
          // team is no longer a loser
          lossesChange = -1;
        }
      }

      // update team's wins, losses, and record in db
      runTransaction(teamRef, (team) => {
        if (team) {
          team.wins += winsChange;
          team.losses += lossesChange;
          team.record = team.wins + '-' + team.losses;
        }
        return team;
      });
    });

    // update game's winner and status
    let gameRef = ref(db, APP.gamesPath + '/' + gameId);
    update(gameRef, {
      winner: newWinnerId,
      status: (newWinnerId == '') ? 'PRE' : 'POST'
    });
  });

  // form footer with cancel and save buttons
  let footer = document.createElement('div');
  footer.classList.add('d-flex', 'justify-content-end', 'mt-4', 'mb-2', 'column-gap-2', 'form-footer');
  footer.appendChild(cancelBtn);
  footer.appendChild(saveBtn);
  gameItemForm.appendChild(footer);

  // helper function to select/deselect teams
  const setWinner = (teamId) => {

    gameItemForm.dataset.form_winner_id = teamId;
    let teamItems = gameItemForm.querySelectorAll('.team-item');
    teamItems.forEach(ti => {
      ti.classList.remove('winner', 'loser');
      ti.querySelector('.team-result').classList.remove('fa-solid', 'fa-circle-check');
      ti.querySelector('.team-result').classList.add('fa-regular', 'fa-circle');
      if (teamId == '') return;

      if (ti.dataset.team_id == teamId) {
        ti.classList.add('winner');
        ti.querySelector('.team-result').classList.remove('fa-regular', 'fa-circle');
        ti.querySelector('.team-result').classList.add('fa-solid', 'fa-circle-check');
      } else {
        ti.classList.add('loser');
      }
    });
  };

  // replace team items with team item forms
  let teamItems = gameItemForm.querySelectorAll('.team-item');
  teamItems.forEach(ti => {

    let tiForm = ti.cloneNode(true);
    tiForm.classList.add('py-1');
    tiForm.querySelector('.team-record').classList.add('d-none');
    tiForm.querySelector('.team-result').classList.remove('d-none');

    tiForm.addEventListener('click', (e) => {

      // select/deselect team
      let teamId = tiForm.dataset.team_id;
      let currentWinnerId = gameItemForm.dataset.form_winner_id;
      let newWinnerId = (currentWinnerId == teamId) ? '' : teamId;
      setWinner(newWinnerId);

      // enable save button if game has changed
      let gameChanged = gameItemForm.dataset.form_winner_id != gameItemForm.dataset.winner_id;
      gameItemForm.classList.toggle('changed', gameChanged);
      saveBtn.disabled = !gameChanged;
      saveBtn.classList.toggle('btn-outline-primary', !gameChanged);
      saveBtn.classList.toggle('btn-primary', gameChanged);
    });

    ti.replaceWith(tiForm);
  });

  // select initial winner if exists
  setWinner(winnerId);

  return gameItemForm;
}

/* ------------------------------------------------ */

function handleTeamSelection(e) {

  let team = APP.focusedTeam;
  let allTeamItems = document.querySelectorAll('.team-item');

  // clear all focus/unfocus formatting
  if (!team) {
    allTeamItems.forEach(ti => {
      ti.classList.remove('selected', 'unselected');
    });
    return;
  }

  let teamItem1 = document.querySelector('.team-item[data-team_id="' + team + '"]');
  document.querySelectorAll('.team-item').forEach(ti => {
    if (ti.getAttribute('data-team_id') == team) {
      ti.classList.remove('unselected');
      ti.classList.add('selected');
      // if (ti == teamItem1) {
      //   let gameGroup = ti.closest('.game-group');
      //   scrollIntoView(gameGroup);
      // }
    } else {
      ti.classList.remove('selected');
      ti.classList.add('unselected');
    }
  });
}
