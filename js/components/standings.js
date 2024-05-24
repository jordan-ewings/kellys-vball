
import { formatNumber, createElement } from "../util.js";
import { FavTeamListener } from "./common.js";

/* ------------------------------------------------ */
// leaderboard

export class Leaderboard extends HTMLElement {

  constructor(teams) {
    super();
    this.teams = teams || null;
    this.render();
  }

  render() {

    this.classList.add('leaderboard-table');
    this.innerHTML = `
      <div class="table-responsive">
        <table class="table table-borderless align-middle text-nowrap m-0">
          <thead>
            <tr>
              <th class="team">TEAM</th>
              <th class="wins">W</th>
              <th class="losses">L</th>
              <th class="winPct">PCT</th>
              <th class="drinks"><i class="fa-solid fa-beer"></i></th>
            </tr>
          </thead>
          <tbody>
          </tbody>
        </table>
      </div>
    `;

    this.update();

    return this;
  }

  update(teams) {
    if (teams) this.teams = teams;
    if (this.teams) this.setTableRows();
  }

  setTableRows() {

    const teams = this.teams;

    // process teams
    const teamsArr = Object.values(teams).map(team => {
      team.stats.games.winPct = team.stats.games.winPct || 0;
      return team;
    });

    teamsArr.sort((a, b) => {

      let aGS = a.stats.games;
      let bGS = b.stats.games;
      if (aGS.winPct != bGS.winPct) return bGS.winPct - aGS.winPct;
      if (aGS.wins != bGS.wins) return bGS.wins - aGS.wins;
      if (aGS.losses != bGS.losses) return aGS.losses - bGS.losses;
      if (a.id != b.id) return a.id - b.id;
      return 0;
    });

    // update table
    this.querySelector('tbody').innerHTML = '';
    teamsArr.forEach(team => {

      const row = document.createElement('tr');
      row.classList.add('leaderboard-item');
      row.dataset.team = team.id;
      row.innerHTML = `
        <td class="team">
          <div class="d-flex align-items-center column-gap-2">
            <span class="team-nbr">${team.nbr}</span>
            <span class="team-name">${team.name}</span>
          </div>
        </td>
        <td class="wins">${team.stats.games.wins}</td>
        <td class="losses">${team.stats.games.losses}</td>
        <td class="winPct">${formatNumber(team.stats.games.winPct, '0.000')}</td>
        <td class="drinks">${team.stats.drinks.count}</td>
      `;

      this.querySelector('tbody').appendChild(row);

      // fav team listener
      new FavTeamListener(row.querySelector('.d-flex'));
    });

  }
}

customElements.define('leaderboard-table', Leaderboard);

/* ------------------------------------------------ */
// stats content


