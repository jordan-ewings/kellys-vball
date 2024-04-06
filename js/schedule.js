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
    makeWeekFilters(weeks);
    makeSchedule(weeks);

  }, { onlyOnce: true });
}

/* ------------------------------------------------ */

function makeWeekFilters(weeks) {

  weekFilterContainer.innerHTML = '';

  Object.values(weeks).forEach(w => {
    let value = w.id;
    let label = w.label;
    let btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'week-' + value + '-btn';
    btn.setAttribute('data-week', value);
    btn.classList.add('btn', 'text-nowrap');
    btn.innerHTML = label;

    btn.addEventListener('click', (e) => {
      showWeekSchedule(e.target.dataset.week);
      e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      weekFilterContainer.querySelectorAll('button').forEach(b => {
        b.classList.toggle('active', b == e.target);
      });
    });

    weekFilterContainer.appendChild(btn);
  });
}

/* ------------------------------------------------ */


function showWeekSchedule(week) {

  const weekGroups = scheduleContainer.querySelectorAll('.week-group');
  const newGroup = scheduleContainer.querySelector('#week-' + week + '-group');

  // get carousel instance
  const carousel = bootstrap.Carousel.getInstance(scheduleContainer);
  let index = Array.from(weekGroups).indexOf(newGroup);
  carousel.to(index);

  if (APP.focusedTeam) {
    setTimeout(() => {
      handleTeamSelection();
    }, 400);
  }
}

/* ------------------------------------------------ */

function makeSchedule(weeks) {

  scheduleContainer.innerHTML = '';
  scheduleContainer.classList.add('carousel', 'slide');
  scheduleContainer.setAttribute('data-bs-touch', 'false');

  const scheduleInner = document.createElement('div');
  scheduleInner.classList.add('carousel-inner');
  scheduleContainer.appendChild(scheduleInner);

  // initialize carousel
  const carousel = new bootstrap.Carousel(scheduleContainer, { interval: false });

  let currentWeekSet = false;
  let currentWeek = null;

  for (let weekKey in weeks) {

    const week = weeks[weekKey];
    const weekGroup = document.createElement('div');
    weekGroup.classList.add('week-group', 'carousel-item');
    weekGroup.id = 'week-' + week.id + '-group';
    weekGroup.dataset.week = week.id;

    onValue(ref(db, week.refs.games), snapshot => {

      const games = Object.values(snapshot.val());

      if (!currentWeekSet) {
        let matches = games.map(g => Object.values(g.matches)).flat();
        let nextGame = matches.find(m => m.status === 'PRE');
        if (nextGame) {
          currentWeekSet = true;
          currentWeek = week.id;
          weekGroup.classList.add('active');
          weekFilterContainer.querySelector('#week-' + week.id + '-btn').classList.add('active');
        }
      }

      const timeSlots = games.map(g => g.time).filter((v, i, a) => a.indexOf(v) === i);

      timeSlots.forEach(timeSlot => {

        const gameCard = util.createFromTemplate('game-group-template');
        const gameGroup = gameCard.querySelector('.cont-card-body');
        const cardGames = games.filter(g => g.time === timeSlot);

        cardGames.forEach((game, index) => {
          const gameItem = makeGameItem(game);
          gameGroup.appendChild(gameItem);

          if (index < cardGames.length - 1) {
            const separator = document.createElement('div');
            separator.classList.add('game-separator');
            gameGroup.appendChild(separator);
          }
        });

        weekGroup.appendChild(gameCard);
      });
    }, { onlyOnce: true });

    // scheduleContainer.appendChild(weekGroup);
    scheduleInner.appendChild(weekGroup);
  }

  // sync team records
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

// function makeSchedule(games, teams) {

//   scheduleContainer.innerHTML = '';

//   // initializing schedule
//   let dataFull = Object.values(games).map(g => Object.values(g)).flat().map(g => {
//     let game = g;
//     Object.keys(game.teams).forEach(teamId => {
//       let team = teams[teamId];
//       game.teams[teamId] = team;
//     });
//     return game;
//   });

//   console.log(dataFull);

//   // group games by week
//   let weekGroups = dataFull.map(d => d.week).filter((v, i, a) => a.indexOf(v) === i);
//   weekGroups.forEach(week => {

//     let weekGroup = document.createElement('div');
//     weekGroup.classList.add('week-group', 'd-none');
//     weekGroup.id = 'week-' + week + '-group';

//     let data = dataFull.filter(d => d.week == week);
//     let timeSlots = data.map(d => d.time).filter((v, i, a) => a.findIndex(t => (t === v)) === i);

//     timeSlots.forEach(timeSlot => {
//       let gameCard = util.createFromTemplate('game-group-template');
//       let gameGroup = gameCard.querySelector('.cont-card-body');
//       let cardGames = data.filter(d => d.time === timeSlot);

//       // create and append game items
//       cardGames.forEach((game, index) => {
//         let gameItem = makeGameItem(game);
//         gameGroup.appendChild(gameItem);

//         // add separator between games
//         if (index < cardGames.length - 1) {
//           let separator = document.createElement('div');
//           separator.classList.add('game-separator');
//           gameGroup.appendChild(separator);
//         }
//       });

//       weekGroup.appendChild(gameCard);
//     });

//     let weekGamesRef = ref(db, session.user.league.refs.games + '/' + week);
//     onChildChanged(weekGamesRef, snapshot => {
//       let game = snapshot.val();
//       let gameItem = document.querySelector('#game-' + game.id);
//       if (!gameItem) return;

//       let newGameItem = makeGameItem(game);
//       let gameItemForm = document.querySelector('#game-' + game.id + '-form');
//       if (gameItemForm) {
//         newGameItem.classList.add('d-none');
//         gameItem.replaceWith(newGameItem);
//         if (gameItemForm.classList.contains('pending')) {
//           newGameItem.classList.remove('d-none');
//           gameItemForm.remove();
//         } else {
//           showGameUpdateAlert(gameItemForm, game);
//         }
//       } else {
//         gameItem.replaceWith(newGameItem);
//       }
//     });

//     scheduleContainer.appendChild(weekGroup);
//   });

// }

/* ------------------------------------------------ */

function makeGameItem(d) {

  const gameItem = util.createFromTemplate('game-item-template');

  // set game item properties
  gameItem.id = 'game-' + d.id;
  gameItem.dataset.game_id = d.id;
  gameItem.querySelector('.game-time').textContent = d.time;
  gameItem.querySelector('.game-court').textContent = 'Court ' + d.court;

  let teams = Object.keys(d.teams);
  teams.forEach((teamId, index) => {

    const teamItem = gameItem.querySelector('.team-item-' + (index + 1));
    teamItem.dataset.team_id = teamId;

    let team = session.cache.teams[teamId];
    teamItem.querySelector('.team-nbr').textContent = team.nbr;
    teamItem.querySelector('.team-name').textContent = team.name;
    teamItem.querySelector('.team-record').textContent = team.stats.games.record;

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
  const statCol = gameItem.querySelector('.stat-col');
  statCol.addEventListener('click', (e) => {

    // clear focused team and/or other open forms
    APP.focusedTeam = null;
    handleTeamSelection();
    document.querySelectorAll('.game-item-form').forEach(gif => {
      let gifStatCol = gif.querySelector('.stat-col');
      gifStatCol.click();
    });

    // insert game item form
    const gameItemForm = gameItemToForm(gameItem, d);
    gameItem.classList.add('d-none');
    gameItem.insertAdjacentElement('afterend', gameItemForm);
  });

  let gamePath = session.user.league.refs.games + '/' + d.week + '/' + d.id;
  let matchesRef = ref(db, gamePath + '/matches');
  let matches = d.matches;
  const teamItems = gameItem.querySelectorAll('.team-item');

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

  // listen for match changes
  onChildChanged(matchesRef, snapshot => {

    let match = snapshot.val();
    let matchId = snapshot.key;
    matches[matchId] = match;
    formatWinners(matches);
    formatGameStatus(matches);

    // if game item form is open, show alert
    let gameItemForm = document.querySelector('#game-' + d.id + '-form');
    if (gameItemForm) {
      if (!gameItemForm.classList.contains('pending')) {
        showGameUpdateAlert(gameItemForm, d);
      } else {
        gameItemForm.remove();
        gameItem.classList.remove('d-none');
      }
    }
  });

  // set initial formatting
  formatGameStatus(matches);
  formatWinners(matches);

  return gameItem;
}

/* ------------------------------------------------ */

function gameItemToForm(gameItem, d) {

  // clone game item and set properties
  const gameItemForm = gameItem.cloneNode(true);
  gameItemForm.classList.add('game-item-form');
  gameItemForm.id = 'game-' + d.id + '-form';

  const footer = util.createFromTemplate('game-item-form-footer-template');
  const saveBtn = footer.querySelector('#saveBtn');
  gameItemForm.appendChild(footer);

  // add G1 and G2 header below last team item (so that "G1" appears below the G1 icons and "G2" below the G2 icons)
  const matchHeaders = document.createElement('div');
  matchHeaders.classList.add('match-headers', 'd-flex', 'justify-content-end', 'column-gap-2');
  ['G1', 'G2'].forEach(g => {
    let header = document.createElement('div');
    header.textContent = g;
    matchHeaders.appendChild(header);
  });

  let teamItem2 = gameItemForm.querySelector('.team-item-2');
  teamItem2.insertAdjacentElement('afterend', matchHeaders);

  const gameId = d.id;
  const oldMatches = d.matches;
  Object.keys(oldMatches).forEach(matchId => {
    let m = oldMatches[matchId];
    m.winner = (m.winner === undefined || m.winner === null || m.winner === '') ? null : m.winner;
    m.status = (m.winner === null) ? 'PRE' : 'POST';
  });

  const newMatches = JSON.parse(JSON.stringify(oldMatches));
  const teamItems = gameItemForm.querySelectorAll('.team-item');

  teamItems.forEach(ti => {
    const tiForm = ti.cloneNode(true);
    const teamId = tiForm.dataset.team_id;
    tiForm.querySelector('.team-record').classList.add('d-none');

    Object.keys(oldMatches).forEach(matchId => {
      const icon = tiForm.querySelector('i.result-' + matchId);
      icon.addEventListener('click', (e) => {
        let matchupIcons = gameItemForm.querySelectorAll('i.result-' + matchId);
        matchupIcons.forEach(mi => {
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
        let gameChanged = JSON.stringify(oldMatches) != JSON.stringify(newMatches);
        gameItemForm.classList.toggle('changed', gameChanged);
        saveBtn.disabled = !gameChanged;
        saveBtn.classList.toggle('btn-outline-primary', !gameChanged);
        saveBtn.classList.toggle('btn-primary', gameChanged);

        console.log(newMatches);
      });
    });

    ti.replaceWith(tiForm);
  });

  // stat-col click replaces form with game item
  const statCol = gameItemForm.querySelector('.stat-col');
  const editIcon = statCol.querySelector('.edit-icon');
  editIcon.classList.replace('fa-pen', 'fa-xmark');
  statCol.addEventListener('click', (e) => {
    document.querySelector('#game-' + gameId).classList.remove('d-none');
    gameItemForm.remove();
  });

  // save button pushes new game data and team records to database
  saveBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!gameItemForm.classList.contains('changed')) return;

    gameItemForm.classList.add('pending');
    await handleMatchUpdate(d, newMatches);
  });

  // resize columns
  const teamCol = gameItemForm.querySelector('.team-col');
  // teamCol.classList.replace('col-8', 'col-9');
  // teamCol.style.border = 'none';
  // teamCol.classList.replace('pe-2', 'pe-3');

  // statCol.classList.replace('col-4', 'col-3');

  return gameItemForm;
}

/* ------------------------------------------------ */

async function handleMatchUpdate(d, newMatches) {

  const gameId = d.id;
  const weekId = d.week;
  const teamIds = Object.keys(d.teams);

  // reference paths to update
  const gamesPath = () => `${session.user.league.refs.games}/${weekId}/${gameId}/matches`;
  const teamsPath = (teamId) => `${session.user.league.refs.teams}/${teamId}/stats/games`;
  const statsPath = (teamId) => `${session.user.league.refs.stats}/${weekId}/${teamId}/games`;
  let updates = {};

  // update matches object
  updates[gamesPath()] = newMatches;

  // get all games once
  const games = await get(ref(db, session.user.league.refs.games)).then(snap => snap.val());

  // update stats for each team
  teamIds.forEach(teamId => {

    let stats = {};
    stats['overall'] = { count: 0, wins: 0, losses: 0, record: '0-0', winPct: 0, streak: 0 };
    let streak = 0;

    // calculate stats for team
    for (let week in games) {
      stats[week] = { count: 0, wins: 0, losses: 0, record: '0-0' };
      for (let game_id in games[week]) {
        let game = games[week][game_id];
        if (teamId in game.teams) {
          let matches = Object.values(game.matches);
          if (game_id == gameId) matches = Object.values(newMatches);

          for (let match of matches) {
            if (match.status == 'POST') {

              // update streak
              let incr = match.winner == teamId ? 1 : -1;
              if (streak === 0) {
                streak = incr;
              } else if (streak > 0 && incr > 0) {
                streak++;
              } else if (streak < 0 && incr < 0) {
                streak--;
              } else {
                streak = incr;
              }

              // update stats
              ['overall', week].forEach(w => {
                stats[w].count++;
                if (match.winner == teamId) {
                  stats[w].wins++;
                } else {
                  stats[w].losses++;
                }
                stats[w].record = `${stats[w].wins}-${stats[w].losses}`;
                stats[w].winPct = stats[w].count === 0 ? 0 : stats[w].wins / stats[w].count;
                if (w == 'overall') stats[w].streak = streak;
              });
            }
          }
        }
      }
    }

    // update teamsRef with team stats
    updates[teamsPath(teamId)] = stats['overall'];

    // update statsRef with team stats
    updates[statsPath(teamId)] = stats[weekId];
  });

  // push updates to database
  console.log(updates);
  update(ref(db), updates)
    .then(() => {
      console.log('Game updated successfully');
    })
    .catch((error) => {
      console.error('Error updating game: ', error);
    });
}


/* ------------------------------------------------ */

function showGameUpdateAlert(gameItemForm, game) {

  // disable team selection
  let teamCol = gameItemForm.querySelector('.team-col');
  teamCol.style.pointerEvents = 'none';
  teamCol.style.opacity = '0.5';

  // alert message
  let formFooter = gameItemForm.querySelector('.form-footer');
  formFooter.classList.remove('justify-content-end');
  formFooter.innerHTML = '';

  let msg = '<span>Game updated by another user. Close and re-open this form to make additional updates.</span>';

  let alert = util.createAlert('danger', msg);
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
