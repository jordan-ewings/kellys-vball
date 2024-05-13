
import { session } from "../js/firebase.js";
import { formatNumber, createAlert } from "../js/util.js";

/* ------------------------------------------------ */
// helpers

// helper to create a new element
function stdInput(input) {

  let content = input;

  if (typeof input === 'string') {

    if (input.includes('<')) {
      const div = document.createElement('div');
      div.innerHTML = input;
      content = div.firstChild;
    } else {
      content = document.createElement('span');
      content.textContent = input;
    }
  }

  return content;
}

/* ------------------------------------------------ */
// cont card

export class ContCard extends HTMLElement {

  constructor(title, body) {
    super();
    this.title = title || '';
    this.body = body || '';
    this.render();
  }

  render() {
    const html = `
      <div class="cont-card-title"></div>
      <div class="cont-card-body"></div>
      <div class="cont-card-footer"></div>
    `;

    this.classList.add('cont-card');
    this.innerHTML = html;
    if (this.title !== '') this.addTitle(this.title);
    if (this.body !== '') this.addContent(this.body);

    return this;
  }

  addTitle(title) {
    const div = this.querySelector('.cont-card-title');
    const content = stdInput(title);
    div.appendChild(content);
    return this;
  }

  addContent(content) {
    const div = this.querySelector('.cont-card-body');
    const item = stdInput(content);
    div.appendChild(item);
    return this;
  }

  addFooter(footer) {
    const div = this.querySelector('.cont-card-footer');
    const content = stdInput(footer);
    div.appendChild(content);
    return this;
  }
}

// define the custom element
customElements.define('cont-card', ContCard);

/* ------------------------------------------------ */
// menu item

export class MenuItem extends HTMLElement {

  constructor() {
    super();
    this.render();
  }

  // method for rendering the component
  render() {
    const html = `
      <div class="label"></div>
      <div class="contents">
        <div class="main"></div>
        <div class="info"></div>
        <div class="trail"></div>
      </div>
    `;

    this.classList.add('menu-item');
    this.innerHTML = html;

    return this;
  }

  addClass(classStr) {
    if (classStr.includes(' ')) {
      const classes = classStr.split(' ');
      classes.forEach(cls => {
        this.classList.add(cls);
      });
    } else {
      this.classList.add(classStr);
    }
    return this;
  }

  // enable nav
  enableNav() {
    const drill = document.createElement('div');
    drill.classList.add('drill');
    drill.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';

    this.setAttribute('role', 'button');
    this.querySelector('.trail').appendChild(drill);
    return this;
  }

  // set either text or element content for label
  addLabel(label) {
    const div = this.querySelector('.label');
    const content = stdInput(label);
    div.appendChild(content);
    return this;
  }

  // set either text or element content for title
  addMain(main) {
    const div = this.querySelector('.main');
    const content = stdInput(main);
    div.appendChild(content);
    return this;
  }

  addInfo(info) {
    const div = this.querySelector('.info');
    const content = stdInput(info);
    div.appendChild(content);
    return this;
  }

  // trail contains action button(s)
  // if not nav, user can add action buttons
  addTrail(trail) {
    const div = this.querySelector('.trail');
    const content = stdInput(trail);
    // if drill in trail div, append just before it
    if (div.querySelector('.drill')) {
      div.insertBefore(content, div.querySelector('.drill'));
    } else {
      div.appendChild(content);
    }
    return this;
  }
}

// define the custom element
customElements.define('menu-item', MenuItem);

/* ------------------------------------------------ */
// leaderboard item

export class LeaderboardItem extends HTMLElement {

  constructor(data) {
    super();
    this.data = data;
    this.render();
  }

  render() {

    const team = this.data;
    const html = `
      <table>
        <tbody>
          <tr class="leaderboard-item" id="leaderboard-${team.id}">
            <td class="team">
              <div class="d-flex align-items-center column-gap-2">
                <span class="team-nbr">${team.nbr}</span>
                <span class="team-name">${team.name}</span>
              </div>
            </td>
            <td class="wins">${team.wins}</td>
            <td class="losses">${team.losses}</td>
            <td class="winPct">${formatNumber(team.winPct, '0.000')}</td>
            <td class="drinks">${team.drinks}</td>
          </tr>
        </tbody>
      </table>
    `;

    this.innerHTML = html;
    return this;
  }

  element() {
    return this.querySelector('tr');
  }
}

// define the custom element
customElements.define('leaderboard-item', LeaderboardItem);

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

  toggleForm() {

    this.form = !this.form;
    this.classList.toggle('game-item-form', this.form);

    // button
    const btnIcon = this.getButton().querySelector('.edit-icon');
    btnIcon.classList.toggle('fa-pen', !this.form);
    btnIcon.classList.toggle('fa-xmark', this.form);

    // show/hide form elements
    this.querySelector('.form-footer').classList.toggle('d-none', !this.form);
    this.querySelector('.match-headers').classList.toggle('d-none', !this.form);
    if (this.querySelector('.alert')) this.querySelector('.alert').remove();

    // match item selections
    if (this.form) {
      this.newMatches = JSON.parse(JSON.stringify(this.data.matches));
    } else {
      this.newMatches = null;
      this.setMatchItemElements();
      this.querySelector('.form-footer button').disabled = true;
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

    // if alert exists, remove it
    if (this.querySelector('.alert')) {
      this.querySelector('.alert').remove();
    }

    this.setMatchItemElements();
    this.setSaveButton();
  }

  setSaveButton() {

    const changed = JSON.stringify(this.data.matches) != JSON.stringify(this.newMatches);
    const btn = this.querySelector('.form-footer button');
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

    let teamColClass = 'team-col col-8 pe-2 d-flex flex-column row-gap-1 justify-content-center';
    let statColClass = 'stat-col col-4 ps-3 d-flex justify-content-between column-gap-1';
    let teamItemClass = 'team-item d-flex align-items-center column-gap-2';
    const teamIds = Object.keys(this.data.teams);
    const matchIds = Object.keys(this.data.matches);

    const html = `
      <div class="${teamColClass}">
        <div class="${teamItemClass} team-item-1" data-team_id="${teamIds[0]}">
          <span class="team-nbr"></span>
          <span class="team-name"></span>
          <span class="team-record"></span>
          <i class="match-item result fa-regular fa-circle ms-auto" data-match_id="${matchIds[0]}" data-team_id="${teamIds[0]}"></i>
          <i class="match-item result fa-regular fa-circle" data-match_id="${matchIds[1]}" data-team_id="${teamIds[0]}"></i>
        </div>
        <div class="${teamItemClass} team-item-2" data-team_id="${teamIds[1]}">
          <span class="team-nbr"></span>
          <span class="team-name"></span>
          <span class="team-record"></span>
          <i class="match-item result fa-regular fa-circle ms-auto" data-match_id="${matchIds[0]}" data-team_id="${teamIds[1]}"></i>
          <i class="match-item result fa-regular fa-circle" data-match_id="${matchIds[1]}" data-team_id="${teamIds[1]}"></i>
        </div>
        <div class="match-headers d-flex justify-content-end column-gap-2 ${this.form ? '' : 'd-none'}">
          <div>G1</div>
          <div>G2</div>
        </div>
      </div>
      <div class="${statColClass}">
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
      <div class="form-footer row g-0 ${this.form ? '' : 'd-none'}">
        <div class="col-8 alert-col"></div>
        <div class="col-4 ps-3 pe-1">
          <button class="btn w-100 btn-primary" disabled>Submit</button>
        </div>
      </div>
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
    const teamIds = Object.keys(this.data.teams);
    const refs = session.getLeague().refs;
    const games = await session.getOnce(refs.games);
    let updates = {};

    // update matches
    updates[`${refs.games}/${weekId}/${gameId}/matches`] = this.newMatches;

    // update weekly and overall team stats
    teamIds.forEach(teamId => {

      // init stats
      const stats = {};
      stats['overall'] = { count: 0, wins: 0, losses: 0, record: '0-0', winPct: 0 };
      Object.keys(games).forEach(week => {
        stats[week] = { count: 0, wins: 0, losses: 0, record: '0-0', winPct: 0 };
      });

      // update stats
      Object.keys(games).forEach(week => {
        Object.values(games[week]).forEach(game => {

          if (!game.teams[teamId]) return;
          const matches = (game.id == gameId) ? Object.values(this.newMatches) : Object.values(game.matches);
          matches.forEach(match => {

            if (match.status != 'POST') return;

            ['overall', week].forEach(key => {
              stats[key].count++;
              stats[key].wins += (match.winner == teamId) ? 1 : 0;
              stats[key].losses += (match.winner != teamId) ? 1 : 0;
              stats[key].record = stats[key].wins + '-' + stats[key].losses;
              stats[key].winPct = stats[key].wins / stats[key].count;
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

    return this;
  }

  /* ----- handle match data updates ----- */

  updateMatchResults(newMatches) {

    this.data.matches = newMatches;

    if (this.form) {

      const userUpdate = this.classList.contains('pending');
      if (!userUpdate) {
        this.newMatches = JSON.parse(JSON.stringify(newMatches));
        const alert = createAlert('danger', 'Game updated by another user.');
        alert.querySelector('.btn-close').remove();
        this.querySelector('.alert-col').innerHTML = '';
        this.querySelector('.alert-col').appendChild(alert);
      } else {
        this.classList.remove('pending');
        this.toggleForm();
      }
    }

    this.setMatchItemElements();
    this.setSaveButton();

    // update game status
    const gameStatus = this.getGameStatus();
    this.classList.remove('pre', 'in', 'post');
    this.classList.add(gameStatus.toLowerCase());

    return this;
  }
}

customElements.define('game-item', GameItem);

/* ------------------------------------------------ */
