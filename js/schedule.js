import * as util from './util.js';
import { db, session } from './firebase.js';
import { ref, get, query, orderByKey, orderByChild, equalTo, child, onValue, set, update, remove, onChildAdded, onChildChanged, onChildRemoved, runTransaction } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

import { APP } from './main.js';

/* ------------------------------------------------ */

const scheduleNav = document.querySelector('#nav-schedule');
const scheduleSection = document.querySelector('#schedule-section');
const weekFilterContainer = document.querySelector('#week-filter-container');
const scheduleContainer = document.querySelector('#schedule-container');

/* ------------------------------------------------ */

export function initScheduleContent() {

  onValue(ref(db, session.user.league.refs.weeks), snapshot => {

    const weeks = snapshot.val();
    makeSchedule(weeks);

  }, { onlyOnce: true });
}

function createElement(html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.firstChild;
}

/* ------------------------------------------------ */

function makeSchedule(weeks) {

  scheduleContainer.innerHTML = '';
  weekFilterContainer.innerHTML = '';

  /* ------------------------------------------------ */
  // prepare carousel

  const schedule = createElement('<div class="carousel slide" data-bs-touch="false"></div>');
  const scheduleInner = createElement('<div class="carousel-inner"></div>');
  schedule.appendChild(scheduleInner);
  scheduleContainer.appendChild(schedule);
  const carousel = new bootstrap.Carousel(schedule, { interval: false });

  let currentWeekSet = false;

  for (let weekKey in weeks) {

    /* ------------------------------------------------ */
    // create and append week group and week button

    const week = weeks[weekKey];
    const weekGroup = createElement(`<div class="week-group carousel-item" id="week-${week.id}-group" data-week="${week.id}"></div>`);
    const weekBtn = createElement(`<button class="btn text-nowrap" type="button" id="week-${week.id}-btn" data-week="${week.id}">${week.label}</button>`);
    weekBtn.addEventListener('click', (e) => {
      weekBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      weekFilterContainer.querySelectorAll('button').forEach(b => {
        b.classList.toggle('active', b == e.target);
      });

      let weekIndex = Object.keys(weeks).indexOf(weekKey);
      carousel.to(weekIndex);
    });

    weekFilterContainer.appendChild(weekBtn);
    scheduleInner.appendChild(weekGroup);

    /* ------------------------------------------------ */
    // append game items to week group

    onValue(ref(db, week.refs.games), snapshot => {

      const games = Object.values(snapshot.val());
      if (!currentWeekSet) {
        let matches = games.map(g => Object.values(g.matches)).flat();
        let nextGame = matches.find(m => m.status === 'PRE');
        if (nextGame) {
          currentWeekSet = true;
          weekGroup.classList.add('active');
          weekBtn.classList.add('active');
        }
      }

      let timeSlots = games.map(g => g.time).filter((v, i, a) => a.indexOf(v) === i);
      timeSlots.forEach(timeSlot => {

        const gameCard = util.createFromTemplate('game-group-template');
        const gameGroup = gameCard.querySelector('.cont-card-body');
        const cardGames = games.filter(g => g.time === timeSlot);

        cardGames.forEach((game, index) => {
          let gameItem = makeGameItem(game);
          gameGroup.appendChild(gameItem);

          if (index < cardGames.length - 1) {
            const separator = createElement('<div class="game-separator"></div>');
            gameGroup.appendChild(separator);
          }
        });

        weekGroup.appendChild(gameCard);
      });
    }, { onlyOnce: true });
  }

  /* ------------------------------------------------ */
  // set team records, update on change

  const teamIds = Object.keys(session.cache.teams);
  teamIds.forEach(teamId => {

    const teamPath = session.user.league.refs.teams + '/' + teamId;
    const teamRecordRef = ref(db, teamPath + '/stats/games/record');
    onValue(teamRecordRef, snapshot => {
      const record = snapshot.val();
      const teamItems = scheduleContainer.querySelectorAll('.team-item[data-team_id="' + teamId + '"]');
      teamItems.forEach(ti => {
        ti.querySelector('.team-record').textContent = record;
      });
    });
  });

}

/* ------------------------------------------------ */

function makeGameItem(d) {

  const gameItem = util.createFromTemplate('game-item-template');
  gameItem.id = 'game-' + d.id;
  gameItem.dataset.game_id = d.id;
  gameItem.querySelector('.game-time').textContent = d.time;
  gameItem.querySelector('.game-court').textContent = 'Court ' + d.court;
  gameItem.classList.add('collapse', 'show');
  const collapseItem = new bootstrap.Collapse(gameItem, { toggle: false });

  /* ------------------------------------------------ */
  // set team items

  let teams = Object.keys(d.teams);
  teams.forEach((teamId, index) => {

    const teamItem = gameItem.querySelector('.team-item-' + (index + 1));
    teamItem.dataset.team_id = teamId;

    let team = session.cache.teams[teamId];
    teamItem.querySelector('.team-nbr').textContent = team.nbr;
    teamItem.querySelector('.team-name').textContent = team.name;
    teamItem.querySelector('.team-record').textContent = team.stats.games.record;

    // listen for team focus
    teamItem.querySelector('.team-name').addEventListener('click', (e) => {
      let focusedTeam = (APP.focusedTeam == teamId) ? null : teamId;
      APP.focusedTeam = focusedTeam;
      handleTeamSelection();
    });
  });

  /* ------------------------------------------------ */
  // set match icons and game status

  let matches = d.matches;
  Object.keys(matches).forEach(matchId => {
    let m = matches[matchId];
    m.winner = (m.winner === undefined || m.winner === null || m.winner === '') ? null : m.winner;
    m.status = (m.winner === null) ? 'PRE' : 'POST';
  });

  let teamItems = gameItem.querySelectorAll('.team-item');

  const formatWinners = (matches) => {
    Object.keys(matches).forEach(matchId => {
      let match = matches[matchId];
      let winner = (match.winner === undefined || match.winner === null || match.winner === '') ? null : match.winner;
      teamItems.forEach(ti => {
        let teamId = ti.dataset.team_id;
        let icon = ti.querySelector('i.result-' + matchId);
        let isWinner = (winner === teamId);
        icon.classList.toggle('fa-circle-check', isWinner);
        icon.classList.toggle('fa-circle', !isWinner);
      });
    });
  };

  const formatGameStatus = (matches) => {
    let types = Object.values(matches).map(m => m.status);
    let gameStatus = 'PRE';
    if (types.includes('POST')) gameStatus = 'IN';
    if (!types.includes('PRE')) gameStatus = 'POST';
    gameItem.classList.remove('pre', 'in', 'post');
    gameItem.classList.add(gameStatus.toLowerCase());
  };

  formatWinners(matches);
  formatGameStatus(matches);

  /* ------------------------------------------------ */
  // set up game item form and collapse

  const gameItemForm = gameItem.cloneNode(true);
  gameItemForm.classList.add('game-item-form');
  gameItemForm.id = 'game-' + d.id + '-form';
  gameItemForm.classList.remove('show');
  const collapseForm = new bootstrap.Collapse(gameItemForm, { toggle: false });

  /* ------------------------------------------------ */
  // set up form footer

  const editIcon = gameItemForm.querySelector('.edit-icon');
  editIcon.classList.replace('fa-pen', 'fa-xmark');
  const footer = util.createFromTemplate('game-item-form-footer-template');
  const saveBtn = footer.querySelector('#saveBtn');
  gameItemForm.appendChild(footer);

  /* ------------------------------------------------ */
  // set up match headers

  const matchHeaders = createElement('<div class="match-headers d-flex justify-content-end column-gap-2"></div>');
  gameItemForm.querySelector('.team-item-2').insertAdjacentElement('afterend', matchHeaders);
  ['G1', 'G2'].forEach(g => {
    let header = createElement(`<div>${g}</div>`);
    matchHeaders.appendChild(header);
  });

  /* ------------------------------------------------ */
  // prepare match data

  let newMatches = JSON.parse(JSON.stringify(matches));

  /* ------------------------------------------------ */
  // handle match/team form selections

  gameItemForm.querySelectorAll('.team-item').forEach(ti => {

    const tiForm = ti.cloneNode(true);
    const teamId = tiForm.dataset.team_id;

    Object.keys(matches).forEach(matchId => {
      const icon = tiForm.querySelector('i.result-' + matchId);
      icon.addEventListener('click', (e) => {
        gameItemForm.querySelectorAll('i.result-' + matchId).forEach(mi => {
          if (mi != icon) {
            mi.classList.remove('fa-circle-check');
            mi.classList.add('fa-circle');
          } else {
            mi.classList.toggle('fa-circle-check');
            mi.classList.toggle('fa-circle');
          }
        });

        // update newMatches
        let winnerId = (icon.classList.contains('fa-circle-check')) ? teamId : null;
        newMatches[matchId].winner = winnerId;
        newMatches[matchId].status = (winnerId === null) ? 'PRE' : 'POST';

        // enable save button if game has changed
        let gameChanged = JSON.stringify(matches) != JSON.stringify(newMatches);
        gameItemForm.classList.toggle('changed', gameChanged);
        saveBtn.disabled = !gameChanged;
        saveBtn.classList.toggle('btn-outline-primary', !gameChanged);
        saveBtn.classList.toggle('btn-primary', gameChanged);
        console.log('newMatches:', newMatches);
      });
    });

    ti.replaceWith(tiForm);
  });

  /* ------------------------------------------------ */
  // handle save button click

  saveBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    gameItemForm.classList.add('pending');
    await handleMatchUpdate(d, newMatches).then(() => {
      gameItemForm.classList.remove('pending');
      collapseForm.hide();
      collapseItem.show();
    });
  });

  /* ------------------------------------------------ */
  // handle form reset

  const resetForm = (matches) => {

    gameItemForm.classList.remove('changed');
    saveBtn.disabled = true;
    saveBtn.classList.remove('btn-primary');
    saveBtn.classList.add('btn-outline-primary');

    // reset matches
    newMatches = JSON.parse(JSON.stringify(matches));

    // reset match icons
    Object.keys(matches).forEach(matchId => {
      let match = matches[matchId];
      let winner = match.winner;
      let teamItemsForm = gameItemForm.querySelectorAll('.team-item');
      teamItemsForm.forEach(ti => {
        let teamId = ti.dataset.team_id;
        let icon = ti.querySelector('i.result-' + matchId);
        let isWinner = (winner === teamId);
        icon.classList.toggle('fa-circle-check', isWinner);
        icon.classList.toggle('fa-circle', !isWinner);
      });
    });

  };


  /* ------------------------------------------------ */
  // update match icons and game status on change

  let gamePath = session.user.league.refs.games + '/' + d.week + '/' + d.id;
  let matchesRef = ref(db, gamePath + '/matches');

  onChildChanged(matchesRef, snapshot => {

    let match = snapshot.val();
    let matchId = snapshot.key;
    matches[matchId] = match;
    formatWinners(matches);
    formatGameStatus(matches);
    resetForm(matches);
  });

  /* ------------------------------------------------ */
  // handle game item form show/hide

  gameItem.querySelector('.stat-col').addEventListener('click', (e) => {
    collapseItem.hide();
    collapseForm.show();
    console.log('matches:', matches);
    console.log('newMatches:', newMatches);
  });

  gameItemForm.querySelector('.stat-col').addEventListener('click', (e) => {
    collapseForm.hide();
    collapseItem.show();
    resetForm(matches);
  });

  const frag = document.createDocumentFragment();
  frag.appendChild(gameItem);
  frag.appendChild(gameItemForm);
  return frag;
}

/* ------------------------------------------------ */

async function handleMatchUpdate(d, newMatches) {

  const gameId = d.id;
  const weekId = d.week;
  const teamIds = Object.keys(d.teams);
  const gamesPath = () => `${session.user.league.refs.games}/${weekId}/${gameId}/matches`;
  const teamsPath = (teamId) => `${session.user.league.refs.teams}/${teamId}/stats/games`;
  const statsPath = (teamId) => `${session.user.league.refs.stats}/${weekId}/${teamId}/games`;
  const games = await get(ref(db, session.user.league.refs.games)).then(snap => snap.val());

  let updates = {};
  updates[gamesPath()] = newMatches;

  teamIds.forEach(teamId => {

    let streak = 0;
    const stats = {};
    stats['overall'] = { count: 0, wins: 0, losses: 0, record: '0-0', winPct: 0, streak: 0 };

    // calculate stats for team
    for (let week in games) {
      stats[week] = { count: 0, wins: 0, losses: 0, record: '0-0' };
      for (let game in games[week]) {
        const data = games[week][game];
        const matches = (game == gameId) ? Object.values(newMatches) : Object.values(data.matches);
        if (!(teamId in data.teams)) continue;

        for (let match of matches) {
          if (match.status == 'POST') {

            let incr = match.winner == teamId ? 1 : -1;
            if (streak > 0 && incr > 0) {
              streak++;
            } else if (streak < 0 && incr < 0) {
              streak--;
            } else {
              streak = incr;
            }

            ['overall', week].forEach(w => {
              stats[w].count++;
              if (match.winner == teamId) stats[w].wins++;
              if (match.winner != teamId) stats[w].losses++;
              stats[w].record = `${stats[w].wins}-${stats[w].losses}`;
              stats[w].winPct = stats[w].count === 0 ? 0 : stats[w].wins / stats[w].count;
              if (w == 'overall') stats[w].streak = streak;
            });
          }
        }
      }
    }

    updates[teamsPath(teamId)] = stats['overall'];
    updates[statsPath(teamId)] = stats[weekId];
  });

  // push updates to database
  console.log(updates);
  return update(ref(db), updates);
}


/* ------------------------------------------------ */

function showGameUpdateAlert(gameItemForm, game) {

  // alert message
  // let formFooter = gameItemForm.querySelector('.form-footer');
  // formFooter.innerHTML = '';

  let msg = '<span>Game updated by another user. Close and re-open this form to make additional updates.</span>';

  let alert = util.createAlert('danger', msg);
  alert.querySelector('.btn-close').remove();
  let alertMsg = alert.querySelector('.me-auto');
  alertMsg.style.fontSize = '0.95rem';
  alertMsg.style.fontWeight = '400';
  // formFooter.appendChild(alert);

  // close form icon
  let editIcon = gameItemForm.querySelector('.edit-icon');
  editIcon.classList.add('text-danger', 'fa-fade');
  editIcon.style.fontSize = '1.5rem';
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
    util.offsetScrollIntoView(gameGroup);
  }
}

/* ------------------------------------------------ */
