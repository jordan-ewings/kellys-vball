import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';
import { ref, get, child, onValue, set, update, remove, onChildAdded, onChildChanged, onChildRemoved } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

const firebaseConfig = {
  apiKey: "AIzaSyDIQtjpMrCnKYnm1ylGYevAT6uNsWytuFI",
  authDomain: "kellys-vball.firebaseapp.com",
  databaseURL: "https://kellys-vball-default-rtdb.firebaseio.com",
  projectId: "kellys-vball",
  storageBucket: "kellys-vball.appspot.com",
  messagingSenderId: "845238453911",
  appId: "1:845238453911:web:35d0b5c35fd25b3fac4bd2",
  measurementId: "G-09J76PZ3EG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the database service
export const db = getDatabase(app);

/* ------------------------------------------------ */

export const session = {

  user: {},
  cache: {},

  init: async function () {

    await this.getOnce('leagues', 'leagues');
    await this.getOnce('brackets/DE14', 'bracket');

    this.user = JSON.parse(localStorage.getItem('user'));
    if (this.user == null) {
      this.user = {
        leagueId: Object.keys(this.cache.leagues)[0],
        league: this.cache.leagues[Object.keys(this.cache.leagues)[0]]
      };
      localStorage.setItem('user', JSON.stringify(this.user));
    }

    // load nodes
    const getNodePath = (node) => `${node}/${this.user.leagueId}`;
    await this.getOnce(getNodePath('teams'), 'teams');
    await this.getOnce(getNodePath('weeks'), 'weeks');

  },

  setUserLeague: function (leagueId) {

    const league = this.cache.leagues[leagueId];
    if (league) {
      this.user.leagueId = leagueId;
      this.user.league = league;
      localStorage.setItem('user', JSON.stringify(this.user));
    } else {
      console.error('League not found:', leagueId, 'setUserLeague() cancelled');
    }
  },

  getOnce: async function (path, cacheKey) {
    return await get(child(ref(db), path)).then(snapshot => {
      if (snapshot.exists()) {
        if (cacheKey) this.cache[cacheKey] = snapshot.val();
        return snapshot.val();
      } else {
        console.error('No data found at', refPath, 'getOnce() cancelled');
        return null;
      }
    });
  },

  onTeamsValue: function (callback) {
    const path = this.user.league.refs.teams;
    onValue(ref(db, path), snapshot => {
      callback(snapshot.val());
    });
  },

  onValueOnceWith: function (nodes, callback) {
    let nodePaths = nodes.map(node => ref(db, this.user.league.refs[node]));
    let values = {};
    let count = 0;

    nodePaths.forEach((path, i) => {
      onValue(path, snapshot => {
        values[nodes[i]] = snapshot.val();
        count++;
        if (count == nodePaths.length) {
          callback(values);
        }
      }, { onlyOnce: true });
    });
  }

}
