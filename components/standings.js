
import { session } from "../js/firebase.js";
import { formatNumber, createElement } from "../js/util.js";

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
    if (session.favTeam == team.name) {
      const star = createElement(`<i class="fa-solid fa-user fav-team"></i>`);
      this.querySelector('.d-flex').appendChild(star);
    }
    return this;
  }

  element() {
    return this.querySelector('tr');
  }
}

// define the custom element
customElements.define('leaderboard-item', LeaderboardItem);

/* ------------------------------------------------ */
