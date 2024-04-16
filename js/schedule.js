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

  const schedule = createElement('<div class="carousel slide carousel-fade" data-bs-touch="false"></div>');
  const scheduleInner = createElement('<div class="carousel-inner"></div>');
  schedule.appendChild(scheduleInner);
  scheduleContainer.appendChild(schedule);
  const carousel = new bootstrap.Carousel(schedule, { interval: false });

  let currentWeekSet = false;

  for (let weekKey in weeks) {

    /* ------------------------------------------------ */
    // create and append week group and week button

    const week = weeks[weekKey];
    const weekDate = new Date(week.gameday);
    const weekDateStr = weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekGroup = createElement(`<div class="week-group carousel-item" id="week-${week.id}-group" data-week="${week.id}"></div>`);
    const weekBtn = createElement(
      `<button class="btn d-flex flex-column justify-content-center align-items-center text-nowrap" type="button" id="week-${week.id}-btn" data-week="${week.id}">
        <span>${week.label}</span>
        <span class="week-btn-date">${weekDateStr}</span>
      </button>`);
    weekBtn.addEventListener('click', (e) => {
      weekBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      weekFilterContainer.querySelectorAll('button').forEach(b => {
        b.classList.toggle('active', b == weekBtn);
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

  let matches = d.matches;
  let newMatches = JSON.parse(JSON.stringify(matches));
  let matchesRef = ref(db, session.user.league.refs.games + '/' + d.week + '/' + d.id + '/matches');

  onValue(matchesRef, snapshot => {

    matches = snapshot.val();
    newMatches = JSON.parse(JSON.stringify(matches));
    formatWinners(matches);
    formatGameStatus(matches);
    resetForm();
  });

  /* ------------------------------------------------ */

  let teamItems = gameItem.querySelectorAll('.team-item');
  let teamItemsForm = gameItemForm.querySelectorAll('.team-item');

  const formatWinners = (matches) => {
    Object.keys(matches).forEach(matchId => {
      let match = matches[matchId];
      teams.forEach((teamId, index) => {
        let icon = teamItems[index].querySelector('i.result-' + matchId);
        let iconForm = teamItemsForm[index].querySelector('i.result-' + matchId);
        let isWinner = (match.winner) ? match.winner == teamId : false;
        icon.classList.toggle('fa-circle-check', isWinner);
        icon.classList.toggle('fa-circle', !isWinner);
        iconForm.classList.toggle('fa-circle-check', isWinner);
        iconForm.classList.toggle('fa-solid', isWinner);
        iconForm.classList.toggle('fa-circle', !isWinner);
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
    gameItemForm.classList.remove('pre', 'in', 'post');
    gameItemForm.classList.add(gameStatus.toLowerCase());
  };

  const resetForm = () => {

    gameItemForm.classList.remove('changed');
    saveBtn.disabled = true;

    if (gameItemForm.classList.contains('pending')) {
      gameItemForm.classList.remove('pending');
    } else {
      if (gameItemForm.classList.contains('show')) {
        let alert = util.createAlert('danger', 'Game updated by another user.');
        alert.querySelector('.btn-close').remove();
        let alertCol = gameItemForm.querySelector('.alert-col');
        alertCol.innerHTML = '';
        alertCol.appendChild(alert);
      } else {
        if (gameItemForm.querySelector('.alert')) {
          bootstrap.Alert.getOrCreateInstance(gameItemForm.querySelector('.alert')).close();
        }
      }
    }
  };

  /* ------------------------------------------------ */
  // handle match/team form selections

  teamItemsForm.forEach(ti => {

    const teamId = ti.dataset.team_id;
    Object.keys(matches).forEach(matchId => {
      const icon = ti.querySelector('i.result-' + matchId);
      icon.addEventListener('click', (e) => {

        if (gameItemForm.querySelector('.alert')) {
          bootstrap.Alert.getOrCreateInstance(gameItemForm.querySelector('.alert')).close();
        }

        let match = newMatches[matchId];
        let isWinner = (match.winner) ? match.winner == teamId : false;
        if (isWinner) {
          delete match.winner;
          match.status = 'PRE';
        } else {
          match.winner = teamId;
          match.status = 'POST';
        }

        formatWinners(newMatches);
        formatGameStatus(newMatches);
        let gameChanged = JSON.stringify(matches) != JSON.stringify(newMatches);
        gameItemForm.classList.toggle('changed', gameChanged);
        saveBtn.disabled = !gameChanged;
        console.log('newMatches:', newMatches);
      });
    });

  });

  /* ------------------------------------------------ */
  // handle save button click

  saveBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    gameItemForm.classList.add('pending');
    await handleMatchUpdate(d, newMatches).then(() => {
      collapseForm.hide();
      collapseItem.show();
    });
  });

  /* ------------------------------------------------ */
  // handle game item form show/hide

  gameItem.querySelector('.stat-col [role="button"]').addEventListener('click', (e) => {
    collapseItem.hide();
    collapseForm.show();
    console.log('matches:', matches);
    console.log('newMatches:', newMatches);
  });

  gameItemForm.querySelector('.stat-col [role="button"]').addEventListener('click', (e) => {
    collapseForm.hide();
    collapseItem.show();

    newMatches = JSON.parse(JSON.stringify(matches));
    formatWinners(matches);
    formatGameStatus(matches);
    resetForm();

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
