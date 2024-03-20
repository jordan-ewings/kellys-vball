import * as util from './util.js';
import * as gest from './gestures.js';
import { DB, APP } from './data.js';

/* ------------------------------------------------ */

document.addEventListener('DOMContentLoaded', init);

async function init() {

  await initDB();
  initAPPDATA();
  initPage();
}

/* ------------------------------------------------ */

async function initDB() {

  await DB.load('Schedule');
}

/* ------------------------------------------------ */

function initAPPDATA() {

  let data = DB.get('Schedule');
  let weeks = data.map(d => d.week).filter((v, i, a) => a.findIndex(t => (t === v)) === i);
  let currentWeek = weeks[0];
  weeks.forEach(w => {
    let week = data.filter(d => d.week === w);
    let games = week.filter(d => d.status === 'POST');
    if (games.length > 0) {
      currentWeek = w;
    }
  });

  APP.set('currentWeek', currentWeek);
  APP.set('focusedTeam', null);
}

/* ------------------------------------------------ */

function initPage() {

  makeFilters();

  let currentWeek = APP.get('currentWeek');
  let currentWeekBtn = document.querySelector('#filter-container button[data-week="' + currentWeek + '"]');
  currentWeekBtn.click();

  let loading = document.querySelector('#loading');
  loading.classList.add('d-none');
}

/* ------------------------------------------------ */

function makeFilters() {

  let data = DB.get('Schedule');
  let filterContainer = document.querySelector('#filter-container');

  let weeks = data.map(d => {
    return {
      value: d.week,
      label: d.week_label
    };
  }).filter((v, i, a) => a.findIndex(t => (t.value === v.value)) === i);

  weeks.forEach(w => {
    let value = w.value;
    let label = w.label;
    let btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('data-week', value);
    btn.addEventListener('click', (e) => {
      let week = e.target.getAttribute('data-week');
      let schedule = data.filter(d => d.week === week);
      makeSchedule(schedule);

      let active = filterContainer.querySelector('.active');
      if (active) {
        active.classList.remove('active');
      }
      e.target.classList.add('active');

      // scroll into view of button
      e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });

    btn.classList.add('btn', 'text-dim2', 'fw-medium', 'text-nowrap');
    btn.innerHTML = label;
    filterContainer.appendChild(btn);
  });
}

/* ------------------------------------------------ */

function makeSchedule(data, groupField = 'time') {

  let scheduleContainer = document.querySelector('#schedule-container');
  scheduleContainer.innerHTML = '';

  let groups = data.map(d => d[groupField]).filter((v, i, a) => a.findIndex(t => (t === v)) === i);
  groups.forEach(g => {
    let gameCard = util.createFromTemplate('game-group-template');
    let gameGroup = gameCard.querySelector('.cont-card-body');
    let games = data.filter(d => d[groupField] === g);
    games.forEach((game, index) => {
      let gameItem = makeGameItem(game);
      gameGroup.appendChild(gameItem);

      if (index < games.length - 1) {
        let separator = document.createElement('div');
        separator.classList.add('game-separator');
        gameGroup.appendChild(separator);
      }
    });

    scheduleContainer.appendChild(gameCard);
  });


  // setTimeout(() => {
  //   let focusedTeam = APP.get('focusedTeam');
  //   if (focusedTeam) {
  //     handleTeamSelection();
  //   }
  //   // if (!focusedTeam) {
  //   //   let gameGroup = scheduleContainer.querySelector('.game-group');
  //   //   scrollIntoView(gameGroup);
  //   // }
  // }, 250);
}

/* ------------------------------------------------ */

let regWinTeamClass = ['fa-solid', 'fa-caret-left'];
let formWinTeamClass = ['fa-solid', 'fa-circle-check'];
let formLoseTeamClass = ['fa-regular', 'fa-circle'];

function makeGameItem(d) {

  let gameItem = util.createFromTemplate('game-item-template');
  gameItem.id = 'game-' + d.game_id;
  gameItem.setAttribute('data-game_id', d.game_id);
  gameItem.setAttribute('data-winner_id', d.winner_id);

  let items = gameItem.querySelectorAll('span[data-item]');
  items.forEach(item => {
    let dataItem = item.getAttribute('data-item');
    let text = d[dataItem];
    if (dataItem == 'court') text = text.replace('Court ', 'C');
    item.textContent = text;
  });

  let teamItems = gameItem.querySelectorAll('.team-item');
  teamItems.forEach(teamItem => {
    let teamId = teamItem.querySelector('.team-id').textContent;
    let teamName = teamItem.querySelector('.team-name').textContent;
    teamItem.setAttribute('data-team_id', teamId);
    teamItem.setAttribute('data-team_name', teamName);

    let teamResult = teamItem.querySelector('.team-result');
    if (d.winner_id == teamId) {
      teamResult.classList.add(...regWinTeamClass);
      teamItem.classList.add('winner');
    }

    if (APP.get('focusedTeam')) {
      if (APP.get('focusedTeam') == teamName) {
        teamItem.classList.add('selected');
      } else {
        teamItem.classList.add('unselected');
      }
    }

    let teamNameSpan = teamItem.querySelector('.team-name');
    teamNameSpan.addEventListener('click', (e) => {
      let focusedTeam = (APP.get('focusedTeam') == teamName) ? null : teamName;
      APP.set('focusedTeam', focusedTeam);
      handleTeamSelection();
    });
  });

  let statCol = gameItem.querySelector('.stat-col');
  statCol.addEventListener('click', (e) => {
    // clear focused team
    APP.set('focusedTeam', null);
    handleTeamSelection();
    // replace all existing game item forms with game items beforehand
    // only one game item form can be open at a time
    let gameItemForms = document.querySelectorAll('.game-item-form');
    gameItemForms.forEach(gif => {
      let gameId = gif.dataset.game_id;
      let game = DB.get('Schedule').find(g => g.game_id === gameId);
      let gameItem = makeGameItem(game);
      gif.replaceWith(gameItem);
    });
    let gameItemForm = gameItemToForm(gameItem);
    gameItem.replaceWith(gameItemForm);
  });

  return gameItem;
}

/* ------------------------------------------------ */

function gameItemToForm(gameItem) {

  let gameItemForm = gameItem.cloneNode(true);
  gameItemForm.classList.add('game-item-form');
  gameItemForm.removeAttribute('id');
  gameItemForm.setAttribute('data-form_winner_id', gameItemForm.dataset.winner_id);

  // let teamCol = gameItemForm.querySelector('.team-col');
  // teamCol.classList.add('row-gap-2');

  const selectTeam = (teamItem) => {
    let teamResult = teamItem.querySelector('.team-result');
    teamItem.classList.add('winner');
    teamResult.classList.remove(...formLoseTeamClass);
    teamResult.classList.add(...formWinTeamClass);
  };

  const deselectTeam = (teamItem) => {
    let teamResult = teamItem.querySelector('.team-result');
    teamItem.classList.remove('winner');
    teamResult.classList.remove(...formWinTeamClass);
    teamResult.classList.add(...formLoseTeamClass);
  };


  let teamItems = gameItemForm.querySelectorAll('.team-item');
  teamItems.forEach(ti => {
    let tiForm = ti.cloneNode(true);
    tiForm.classList.add('team-item-form');
    tiForm.classList.add('py-1');

    let teamId = ti.dataset.team_id;
    let teamName = ti.dataset.team_name;
    let gameId = gameItem.dataset.game_id;
    let winnerId = gameItem.dataset.winner_id;

    deselectTeam(tiForm);
    if (winnerId == teamId) {
      selectTeam(tiForm);
    }

    // make tiForm the label for input
    tiForm.addEventListener('click', (e) => {

      let isSelected = tiForm.classList.contains('winner');
      if (isSelected) {
        deselectTeam(tiForm);
        gameItemForm.dataset.form_winner_id = '';
      } else {
        let tiForms = gameItemForm.querySelectorAll('.team-item-form');
        tiForms.forEach(tif => {
          deselectTeam(tif);
        });
        selectTeam(tiForm);
        gameItemForm.dataset.form_winner_id = teamId;
      }

      let saveBtn = gameItemForm.querySelector('#saveBtn');
      if (gameItemForm.dataset.form_winner_id != gameItemForm.dataset.winner_id) {
        saveBtn.disabled = false;
        saveBtn.classList.replace('btn-outline-primary', 'btn-primary');
      } else {
        saveBtn.disabled = true;
        saveBtn.classList.replace('btn-primary', 'btn-outline-primary');
      }
    });
    ti.replaceWith(tiForm);
  });

  // switch chevron to down
  let statCol = gameItemForm.querySelector('.stat-col');
  // let statColChevron = statCol.querySelector('.fa-chevron-right');
  // statColChevron.classList.remove('fa-chevron-right');
  // statColChevron.classList.add('fa-chevron-down');
  statCol.addEventListener('click', (e) => {
    gameItemForm.replaceWith(gameItem);
  });

  // save button
  let saveBtn = document.createElement('button');
  saveBtn.id = 'saveBtn';
  saveBtn.type = 'button';
  saveBtn.classList.add('btn', 'btn-outline-primary');
  saveBtn.textContent = 'Submit';
  saveBtn.addEventListener('click', handleGameItemFormSave);
  saveBtn.disabled = true;

  // cancel button
  let cancelBtn = document.createElement('button');
  cancelBtn.id = 'cancelBtn';
  cancelBtn.type = 'button';
  cancelBtn.classList.add('btn', 'btn-secondary');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', (e) => {
    gameItemForm.replaceWith(gameItem);
  });

  // help text
  let helpText = document.createElement('div');
  helpText.textContent = 'Select the winning team';
  helpText.classList.add('help-text', 'me-auto');

  let footer = document.createElement('div');
  footer.classList.add('d-flex', 'justify-content-end', 'mt-4', 'mb-2', 'column-gap-2');
  // footer.appendChild(helpText);
  footer.appendChild(cancelBtn);
  footer.appendChild(saveBtn);
  gameItemForm.appendChild(footer);

  return gameItemForm;
}

function pendingChanges() {
  let gameItems = document.querySelectorAll('.game-item-form');
  let changes = false;
  gameItems.forEach(gif => {
    let winnerId = gif.dataset.winner_id;
    let formWinnerId = gif.dataset.form_winner_id;
    if (winnerId != formWinnerId) {
      changes = true;
    }
  });
  return changes;
}

function setSaveCancelButtons(mode, saveEnabled = false) {

  if (mode != 'show') {
    let formActionButtons = document.querySelector('#form-action-buttons');
    if (formActionButtons) {
      formActionButtons.remove();
    }
    return;
  }

  let formActionButtons = document.querySelector('#form-action-buttons');
  if (formActionButtons) {
    let saveBtn = formActionButtons.querySelector('#saveBtn');
    saveBtn.disabled = !saveEnabled;
    return;
  }

  // save button
  let saveBtn = document.createElement('button');
  saveBtn.id = 'saveBtn';
  saveBtn.type = 'button';
  saveBtn.classList.add('btn', 'btn-sm', 'btn-primary');
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', handleGameItemFormSave);
  saveBtn.disabled = !saveEnabled;


  // cancel button
  let cancelBtn = document.createElement('button');
  cancelBtn.id = 'cancelBtn';
  cancelBtn.type = 'button';
  cancelBtn.classList.add('btn', 'btn-sm', 'btn-secondary');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', (e) => {
    let gameItemForms = document.querySelectorAll('.game-item-form');
    gameItemForms.forEach(gif => {
      let gameId = gif.dataset.game_id;
      let game = DB.get('Schedule').find(g => g.game_id === gameId);
      let gameItem = makeGameItem(game);
      gif.replaceWith(gameItem);
    });
  });

  // div for cancel and save buttons
  let btnDiv = document.createElement('div');
  btnDiv.id = 'form-action-buttons';
  btnDiv.classList.add('d-flex', 'justify-content-end', 'm-3', 'column-gap-2');
  btnDiv.appendChild(cancelBtn);
  btnDiv.appendChild(saveBtn);

  // append btnDiv to main-header
  let mainHeader = document.querySelector('#main-header');
  mainHeader.appendChild(btnDiv);

}

/* ------------------------------------------------ */

// handleGameItemFormSave
// this will:
// - get data from form
// - post data to server
// - get response from server
// - update DB with response
// - replace all game items with new game items (don't want to destory any elements, just update/replace them)
//   - this will also replace the form with the new game item (i.e. the form will be destroyed)
// the final result will be exactly the same view the user had before clicking the stat column, but with the updated data
// keep in mind that posting data via fetch() is asynchronous, so we need to handle the response in a promise


function handleGameItemFormSave(e) {

  console.log('Start: handleGameItemFormSave()');
  let gameItemForm = e.target.closest('.game-item-form');

  // temporarily disable buttons
  let saveBtn = gameItemForm.querySelector('#saveBtn');
  let saveBtnOriginalHTML = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';
  let cancelBtn = gameItemForm.querySelector('#cancelBtn');
  cancelBtn.disabled = true;

  let gameId = gameItemForm.dataset.game_id;
  let winnerId = gameItemForm.dataset.form_winner_id;
  // winnerId = (winnerId == '') ? 'NONE' : winnerId;

  let data = {
    game_id: gameId,
    winner_id: winnerId
  };

  let urlRoot = 'https://script.google.com/macros/s/AKfycbxMeB_AspCRyeO7C5Y_cZl5b3_h6DJJv3OPX1-RiVZBJJx6Fo3x4PSf6vqNVpu_0Dssqw/exec';
  let urlParams = new URLSearchParams(data);
  let url = urlRoot + '?' + urlParams;

  let options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    redirect: 'follow'
  };

  console.log('Posting:', url);
  // return;
  fetch(url, options)
    .then(response => response.json())
    .then(result => {
      console.log('Success:', result);
      // createAlert('success', JSON.stringify(result));
      // reload DB
      DB.load('Schedule')
        .then(() => {
          let gameItems = document.querySelectorAll('.game-item');
          gameItems.forEach(gi => {
            let game_id = gi.dataset.game_id;
            let game = DB.get('Schedule').find(g => g.game_id === game_id);
            let gameItem = makeGameItem(game);
            gi.replaceWith(gameItem);
          });
        });
    })
    .catch(error => {
      // createAlert('danger', error.message);
      console.error('Error:', error);
    });


}

/* ------------------------------------------------ */

// google appscript function to handle POST request
// this is for illustration purposes only, won't actually be used in the app
// function doPost(e) {

//   let data = e.parameter;
//   let game_id = data.game_id;
//   let winner_id = data.winner_id;

//   // getSheet() is a function that returns json data from a google sheet
//   // the result looks the same as DB.get('Schedule') in this app
//   let schedule = getSheet('Schedule');
//   let game = schedule.find(g => g.game_id === game_id);
//   game.winner_id = winner_id;
//   schedule.forEach(g => {
//     g.status = (g.winner_id != '') ? 'POST' : 'PRE';
//   });

//   // re-calculate team records
//   let teams = getSheet('Teams');
//   teams.forEach(team => {
//     let games = schedule.filter(g => g.team1_id === team.team_id || g.team2_id === team.team_id);
//     let completedGames = games.filter(g => g.status === 'POST');
//     if (completedGames.length > 0) {
//       let wins = completedGames.filter(g => g.winner_id === team.team_id);
//       team.wins = wins.length;
//       team.losses = completedGames.length - wins.length;
//     } else {
//       team.wins = 0;
//       team.losses = 0;
//     }

//     let teamRecord = team.wins + '-' + team.losses;
//     games.forEach(g => {
//       let teamNum = (g.team1_id === team.team_id) ? 1 : 2;
//       g['team' + teamNum + '_record'] = teamRecord;
//     });
//   });

//   // need to update the 'Teams' and 'Schedule' sheets in the google sheet
//   // this is done by calling another google appscript function
//   setSheet('Teams', teams);
//   setSheet('Schedule', schedule);

//   return ContentService.createTextOutput(JSON.stringify(game)).setMimeType(ContentService.MimeType.JSON);
// }


/* ------------------------------------------------ */

function handleTeamSelection(e) {

  let team = APP.get('focusedTeam');
  let allTeamItems = document.querySelectorAll('.team-item');
  if (!team) {
    allTeamItems.forEach(ti => {
      ti.classList.remove('selected', 'unselected');
    });
    return;
  }

  let teamItem1 = document.querySelector('.team-item[data-team_name="' + team + '"]');
  document.querySelectorAll('.team-item').forEach(ti => {
    if (ti.getAttribute('data-team_name') == team) {
      ti.classList.remove('unselected');
      ti.classList.add('selected');
      if (ti == teamItem1) {
        let gameGroup = ti.closest('.game-group');
        // scrollIntoView(gameGroup);
      }
    } else {
      ti.classList.remove('selected');
      ti.classList.add('unselected');
    }
  });
}

/* ------------------------------------------------ */

function scrollIntoView(element) {

  let header = document.querySelector('#main-header');
  let headerHeight = header.offsetHeight;
  let top = element.getBoundingClientRect().top;
  let elementMarginTop = window.getComputedStyle(element).marginTop;
  if (elementMarginTop) {
    top = top - parseInt(elementMarginTop);
  }

  let scrollTop = window.scrollY;
  let topAdjusted = top + scrollTop - headerHeight;

  console.log('top', top, 'scrollTop', scrollTop, 'headerHeight', headerHeight, 'topAdjusted', topAdjusted);
  window.scrollTo({ top: topAdjusted, behavior: 'smooth' });
}

/* ------------------------------------------------ */

// if user swipes left or right, change the week
// if no week to change to, do nothing (e.g. if at the first or last week)
let scheduleContainer = document.querySelector('#schedule-container');
scheduleContainer.addEventListener('touchstart', gest.handleTouchStart, false);
scheduleContainer.addEventListener('touchmove', (evt) => {
  let dir = gest.handleTouchMove(evt);
  if (!dir) return;

  let active = document.querySelector('#filter-container .active');
  let next = active.nextElementSibling;
  let prev = active.previousElementSibling;

  if (dir == 'right' && prev) {
    prev.click();
  } else if (dir == 'left' && next) {
    next.click();
  }
}, false);

function changeWeek(dir) {

  let active = document.querySelector('#filter-container .active');
  let next = active.nextElementSibling;
  let prev = active.previousElementSibling;

  if (dir == 'next' && next) {
    next.click();
  } else if (dir == 'prev' && prev) {
    prev.click();
  }
}

/* ------------------------------------------------ */

function createAlert(type, msg) {

  let alertContainer = document.querySelector('#alert-container');

  // destroy any existing alerts
  let existingAlert = document.querySelector('.alert');
  if (existingAlert) {
    existingAlert.remove();
  }

  let alert = document.createElement('div');
  alert.classList.add('alert', 'd-flex', 'align-items-center');
  alert.classList.add('py-2', 'px-3', 'mb-2');
  alert.classList.add('alert-' + type);
  alert.setAttribute('role', 'alert');

  let alertMsg = document.createElement('div');
  alertMsg.classList.add('me-auto', 'fw-medium');
  alertMsg.innerHTML = msg;
  alert.appendChild(alertMsg);

  let closeBtn = document.createElement('button');
  closeBtn.id = 'alertCloseBtn';
  closeBtn.classList.add('btn-close');
  // closeBtn.classList.add('btn-' + type, 'align-middle', 'ms-2')
  closeBtn.classList.add('btn-sm');
  closeBtn.setAttribute('type', 'button');
  closeBtn.addEventListener('click', () => {
    alert.remove();
  });
  alert.appendChild(closeBtn);

  alertContainer.appendChild(alert);
}

/* ------------------------------------------------ */
// for testing swipe gestures on mobile device
// would normally console.log(), but this is not possible on mobile
// so we create an alert to display the swipe direction


