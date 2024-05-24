
import { db, session } from "../firebase.js";
import { ref, get, onValue, update } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

import { ContCard, FavTeamListener } from "./common.js";
import { createAlert, createElement } from "../util.js";

/* ------------------------------------------------ */
// constants / helpers



/* ------------------------------------------------ */
// game item

export class GameItem extends HTMLElement {

  constructor(data) {
    super();
    this.data = data;
    this.form = false;
    this.setProps();
    this.render();
  }

  /* ----- helpers ----- */

  getButton() {
    return this.querySelector('.stat-col [role="button"]');
  }

  getTeamItem(teamId) {
    return this.querySelector('.team-item[data-team_id="' + teamId + '"]');
  }

  getMatchItem(matchId, teamId) {
    return this.querySelector('.match-item[data-match_id="' + matchId + '"][data-team_id="' + teamId + '"]');
  }

  getMatchItems(matchId) {
    return this.querySelectorAll('.match-item[data-match_id="' + matchId + '"]');
  }

  getGameStatus() {
    const matchIds = Object.keys(this.data.matches);
    const statuses = matchIds.map(matchId => this.data.matches[matchId].status);
    let gameStatus = 'PRE';
    if (statuses.includes('POST')) gameStatus = 'IN';
    if (!statuses.includes('PRE')) gameStatus = 'POST';
    return gameStatus;
  }

  /* ----- handlers ----- */

  enableEditMode() {
    this.querySelector('.stat-col').classList.replace('col-3', 'col-4');
    this.getButton().classList.remove('d-none');

    return this;
  }

  disableEditMode() {
    this.querySelector('.stat-col').classList.replace('col-4', 'col-3');
    this.getButton().classList.add('d-none');

    return this;
  }

  handleAdminChange() {
    if (session.adminControls) {
      this.enableEditMode();
    } else {
      this.disableEditMode();
    }
  }

  /* ----- init element content/attributes ----- */

  setProps() {
    this.id = 'game-' + this.data.id;
    this.dataset.game_id = this.data.id;
    this.classList.add('game-item');
    this.classList.add(this.getGameStatus().toLowerCase());

    // look up team data
    this.teamIds = Object.keys(this.data.teams);
    this.teamIds.forEach(teamId => {
      let team = session.teams[teamId];
      this.data.teams[teamId] = {
        nbr: team.nbr,
        name: team.name,
        record: team.stats.games.record,
      };
    });
  }

  /* ----- alert handling ----- */

  showAlert(type, message) {

    const alert = createAlert(type, message);
    alert.querySelector('.btn-close').remove();
    this.querySelector('.alert-col').innerHTML = '';
    this.querySelector('.alert-col').appendChild(alert);

    return this;
  }

  hideAlert() {

    if (this.querySelector('.alert')) {
      this.querySelector('.alert').remove();
    }

    return this;
  }

  toggleForm() {

    this.form = !this.form;
    this.classList.toggle('game-item-form', this.form);

    // button
    const btnIcon = this.getButton().querySelector('.edit-icon');
    btnIcon.classList.toggle('fa-pen', !this.form);
    btnIcon.classList.toggle('fa-xmark', this.form);

    // match item selections
    if (this.form) {
      this.newMatches = JSON.parse(JSON.stringify(this.data.matches));
      this.setSaveButton();
    } else {
      this.newMatches = null;
      this.setMatchItemElements();
      this.setSaveButton();
    }

    // show/hide form elements
    this.hideAlert();
    this.querySelectorAll('.match-item.cancel').forEach(matchItem => {
      matchItem.classList.toggle('d-none', !this.form);
    });

    // form footer
    const formFooter = this.querySelector('.form-footer');
    if (this.form) {
      bootstrap.Collapse.getOrCreateInstance(formFooter).show();
    } else {
      formFooter.classList.remove('show');
    }

    return this;
  }

  handleMatchItemClick(matchItem) {

    const matchId = matchItem.dataset.match_id;
    const teamId = matchItem.dataset.team_id;
    const match = this.newMatches[matchId];

    // handle cancel match click
    if (matchItem.classList.contains('cancel')) {
      if (match.status == 'CNCL') {
        match.status = 'PRE';
      } else {
        match.status = 'CNCL';
        delete match.winner;
      }

    } else {
      const isWinner = (match.winner) ? match.winner == teamId : false;
      if (isWinner) {
        delete match.winner;
        match.status = 'PRE';
      } else {
        match.winner = teamId;
        match.status = 'POST';
      }
    }

    this.hideAlert();
    this.setMatchItemElements();
    this.setSaveButton();

    console.log('newMatches:', this.newMatches);
  }

  setSaveButton() {

    const btn = this.querySelector('.form-footer button');
    let changed = false;
    if (this.newMatches) {
      if (JSON.stringify(this.data.matches) != JSON.stringify(this.newMatches)) {
        changed = true;
      }
    }

    btn.disabled = (changed) ? false : true;
  }

  setGeneralElements() {

    this.querySelector('.game-time').textContent = this.data.time;
    this.querySelector('.game-court').textContent = 'Court ' + this.data.court;
  }

  setTeamItemElements() {

    const teamIds = Object.keys(this.data.teams);
    teamIds.forEach(teamId => {
      const team = this.data.teams[teamId];
      const teamItem = this.getTeamItem(teamId);
      teamItem.querySelector('.team-nbr').textContent = team.nbr;
      teamItem.querySelector('.team-name').textContent = team.name;
      teamItem.querySelector('.team-record').textContent = team.record;
    });
  }

  setMatchItemElements() {

    const matchIds = Object.keys(this.data.matches);
    matchIds.forEach(matchId => {
      const matchItems = this.getMatchItems(matchId);
      const match = (this.newMatches) ? this.newMatches[matchId] : this.data.matches[matchId];
      matchItems.forEach(matchItem => {

        if (matchItem.classList.contains('cancel')) {
          matchItem.classList.toggle('picked', match.status == 'CNCL');
          return;
        }

        const teamId = matchItem.dataset.team_id;
        const isWinner = (match.winner) ? match.winner == teamId : false;
        const icon = matchItem.querySelector('i');
        icon.classList.toggle('bi-check-circle', isWinner);
        icon.classList.toggle('bi-circle', !isWinner);
      });
    });
  }

  setEventListeners() {

    const btn = this.getButton();
    btn.addEventListener('click', (e) => {
      this.toggleForm();
    });

    const matchItems = this.querySelectorAll('.match-item');
    matchItems.forEach(matchItem => {
      matchItem.addEventListener('click', (e) => {
        if (this.form) this.handleMatchItemClick(matchItem);
      });
    });

    const saveBtn = this.querySelector('.form-footer button');
    saveBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      this.classList.add('pending');
      await this.pushMatchUpdates();
    });
  }

  /* ----- render the component ----- */

  render() {

    const teamIds = Object.keys(this.data.teams);
    const matchIds = Object.keys(this.data.matches);

    const matchItem = (matchIdx, teamIdx) => {
      return `
        <div role="button" class="match-item result" data-match_id="${matchIds[matchIdx]}" data-team_id="${teamIds[teamIdx]}">
          <i class="bi bi-circle"></i>
        </div>
      `;
    };

    const cancelMatchItem = (matchIdx) => {
      return `
        <div role="button" class="match-item cancel d-none" data-match_id="${matchIds[matchIdx]}">
          <i class="bi bi-x-circle"></i>
        </div>
      `;
    };

    const teamItem = (teamIdx) => {
      return `
        <div class="team-item d-flex align-items-center column-gap-2 team-item-${teamIdx + 1}" data-team_id="${teamIds[teamIdx]}">
          <span class="team-nbr"></span>
          <span class="team-name"></span>
          <span class="team-record"></span>
        </div>
      `;
    };

    this.innerHTML = `
      <div>
        <div class="team-col">
          ${teamItem(0)}
          ${teamItem(1)}
        </div>
        <div class="matches-col">
          <div class="match-col" data-match_id="${matchIds[0]}">
            ${matchItem(0, 0)}
            ${matchItem(0, 1)}
            ${cancelMatchItem(0)}
          </div>
          <div class="match-col" data-match_id="${matchIds[1]}">
            ${matchItem(1, 0)}
            ${matchItem(1, 1)}
            ${cancelMatchItem(1)}
          </div>
        </div>
        <div class="stat-col col-4">
          <div class="info-col">
            <div class="game-time"></div>
            <div class="game-court"></div>
          </div>
          <div class="edit-col">
            <div class="edit-icon-circle admin-control" role="button">
              <i class="fa-solid fa-pen edit-icon"></i>
            </div>
          </div>
        </div>
      </div>
      <div class="form-footer collapse">
        <div>
          <div class="alert-col"></div>
          <div class="save-col col-4">
            <button class="btn w-100 btn-primary" disabled>Submit</button>
          </div>
        </div>
      </div>
    `;

    this.setGeneralElements();
    this.setTeamItemElements();
    this.setMatchItemElements();
    this.setEventListeners();

    if (!session.adminControls) this.disableEditMode();
    this.teamIds.forEach(teamId => {
      const teamItem = this.getTeamItem(teamId);
      const listener = new FavTeamListener(teamItem);
      listener.setAnchor('.team-record');
    });

    return this;
  }

  /* ----- push match updates ----- */

  async pushMatchUpdates() {

    const gameId = this.data.id;
    const weekId = this.data.week;
    const refs = session.getLeague().refs;
    const allGames = await session.getOnce(refs.games);
    const weeks = Object.keys(allGames);
    const teams = Object.keys(this.data.teams);

    // update game matches
    const updates = {};
    updates[`${refs.games}/${weekId}/${gameId}/matches`] = this.newMatches;

    // update weekly and overall team stats
    teams.forEach(teamId => {

      // init stats
      const stats = {};
      stats.overall = { count: 0, wins: 0, losses: 0, record: '0-0', winPct: 0 };
      weeks.forEach(week => {
        stats[week] = { count: 0, wins: 0, losses: 0, record: '0-0', winPct: 0 };
      });

      // update stats
      weeks.forEach(week => {

        const teamGames = Object.values(allGames[week]).filter(game => game.teams[teamId]);
        teamGames.forEach(game => {

          const matchesPost = (game.id == gameId)
            ? Object.values(this.newMatches).filter(match => match.status == 'POST')
            : Object.values(game.matches).filter(match => match.status == 'POST');

          matchesPost.forEach(match => {
            ['overall', week].forEach(key => {
              const s = stats[key];
              s.count++;
              s.wins += (match.winner == teamId) ? 1 : 0;
              s.losses += (match.winner != teamId) ? 1 : 0;
              s.record = s.wins + '-' + s.losses;
              s.winPct = s.wins / s.count;
            });
          });
        });
      });

      // append stats to updates
      updates[`${refs.teams}/${teamId}/stats/games`] = stats.overall;
      updates[`${refs.stats}/${weekId}/${teamId}/games`] = stats[weekId];
    });

    // push updates
    console.log('updates:', updates);
    await session.update(updates);
  }


  /* ----- handle game data updates ----- */

  updateTeamRecord(teamId, record) {

    if (!this.data.teams[teamId]) return this;
    this.data.teams[teamId].record = record;
    this.setTeamItemElements();
  }

  /* ----- handle match data updates ----- */

  updateMatchResults(newMatches) {

    this.data.matches = newMatches;
    this.classList.remove('pre', 'in', 'post');
    this.classList.add(this.getGameStatus().toLowerCase());

    const pending = this.classList.contains('pending');
    const form = this.form;
    const state = (!form) ? 'formClosed' : (pending) ? 'formOpenUserChange' : 'formOpenDiffUserChange';

    if (state == 'formClosed') {
      this.setMatchItemElements();
    }

    if (state == 'formOpenUserChange') {
      this.classList.remove('pending');
      this.toggleForm();
      this.setMatchItemElements();
      this.setSaveButton();
    }

    if (state == 'formOpenDiffUserChange') {
      this.newMatches = JSON.parse(JSON.stringify(newMatches));
      this.setMatchItemElements();
      this.setSaveButton();
      this.showAlert('danger', 'Game updated by another user.');
    }
  }

}

customElements.define('game-item', GameItem);

/* ------------------------------------------------ */
