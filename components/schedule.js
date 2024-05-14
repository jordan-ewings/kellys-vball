
import { session } from "../js/firebase.js";
import { createAlert } from "../js/util.js";

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

  /* ----- handle editing ----- */

  enableEditMode() {
    this.querySelector('.team-col').classList.replace('col-9', 'col-8');
    this.querySelector('.stat-col').classList.replace('col-3', 'col-4');
    this.getButton().classList.remove('d-none');

    return this;
  }

  disableEditMode() {
    this.querySelector('.team-col').classList.replace('col-8', 'col-9');
    this.querySelector('.stat-col').classList.replace('col-4', 'col-3');
    this.getButton().classList.add('d-none');

    return this;
  }

  /* ----- init element content/attributes ----- */

  setProps() {
    this.id = 'game-' + this.data.id;
    this.dataset.game_id = this.data.id;
    this.classList.add('game-item', 'row', 'g-0');
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
    this.querySelector('.match-headers').classList.toggle('d-none', !this.form);
    this.hideAlert();

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
    const isWinner = (match.winner) ? match.winner == teamId : false;
    if (isWinner) {
      delete match.winner;
      match.status = 'PRE';
    } else {
      match.winner = teamId;
      match.status = 'POST';
    }

    this.hideAlert();
    this.setMatchItemElements();
    this.setSaveButton();
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
        const teamId = matchItem.dataset.team_id;
        const isWinner = (match.winner) ? match.winner == teamId : false;
        matchItem.classList.toggle('fa-circle-check', isWinner);
        matchItem.classList.toggle('fa-circle', !isWinner);
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
      return `<i class="match-item result fa-regular fa-circle" data-match_id="${matchIds[matchIdx]}" data-team_id="${teamIds[teamIdx]}"></i>`;
    };

    const teamItem = (teamIdx) => {
      return `
        <div class="team-item d-flex align-items-center column-gap-2 team-item-${teamIdx + 1}" data-team_id="${teamIds[teamIdx]}">
          <span class="team-nbr"></span>
          <span class="team-name"></span>
          <span class="team-record"></span>
          ${session.favTeam == this.data.teams[teamIds[teamIdx]].name ? '<i class="fa-solid fa-user fav-team"></i>' : ''}
          <div class="ms-auto d-flex justify-content-end column-gap-2">
            ${matchItem(0, teamIdx)}
            ${matchItem(1, teamIdx)}
          </div>
        </div>
      `;
    };

    const matchHeaders = () => {
      return `
        <div class="match-headers d-flex justify-content-end column-gap-2 ${this.form ? '' : 'd-none'}">
          <div>G1</div>
          <div>G2</div>
        </div>
      `;
    };

    const formFooter = () => {
      return `
        <div class="form-footer row g-0 collapse">
          <div class="col-8 alert-col"></div>
          <div class="col-4 ps-3 pe-1">
            <button class="btn w-100 btn-primary" disabled>Submit</button>
          </div>
        </div>
      `;
    };

    const html = `
      <div class="team-col col-8 pe-2 d-flex flex-column row-gap-1 justify-content-center">
        ${teamItem(0)}
        ${teamItem(1)}
        ${matchHeaders()}
      </div>
      <div class="stat-col col-4 ps-3 d-flex justify-content-between column-gap-1">
        <div class="d-flex flex-column justify-content-start">
          <span class="game-time"></span>
          <span class="game-court"></span>
        </div>
        <div class="d-flex flex-column justify-content-start pe-1">
          <div class="edit-icon-circle admin-control" role="button">
            <i class="fa-solid fa-pen edit-icon"></i>
          </div>
        </div>
      </div>
      ${formFooter()}
    `;

    this.innerHTML = html;
    this.setGeneralElements();
    this.setTeamItemElements();
    this.setMatchItemElements();
    this.setEventListeners();
    if (!session.adminControls) this.disableEditMode();

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
