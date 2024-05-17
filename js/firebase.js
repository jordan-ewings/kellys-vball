import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';
import { ref, get, child, onValue, set, update, remove, onChildAdded, onChildChanged, onChildRemoved } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js';

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
export const db = getDatabase(app);
export const auth = getAuth(app);

/* ------------------------------------------------ */

export const session = {

  // meta
  leagues: {},

  // session specific
  league: {},
  teams: {},
  weeks: {},
  games: {},

  // user specific
  user: null,
  admin: false,
  adminControls: false,

  // my team
  favTeam: null,

  // run on page load
  init: async function () {

    // get leagues and set league
    this.leagues = await this.getOnce('leagues');
    this.league = this.leagues[Object.keys(this.leagues)[0]];

    let leagueId = localStorage.getItem('leagueId');
    if (leagueId && this.leagues[leagueId]) {
      this.league = this.leagues[leagueId];
    }

    // get league specific data
    this.teams = await this.getOnce('teams/' + this.league.id);
    this.weeks = await this.getOnce('weeks/' + this.league.id);
    this.games = await this.getOnce('games/' + this.league.id);

    let favTeam = localStorage.getItem('favTeam');
    let teamNames = Object.values(this.teams).map(t => t.name);
    if (favTeam && teamNames.includes(favTeam)) {
      this.favTeam = favTeam;
    }

    console.log('Session initialized:', this);
    return this;
  },

  // run on user change
  setUserProps: function (user) {
    this.user = user;
    this.admin = user ? !user.isAnonymous : false;
    this.adminControls = user ? !user.isAnonymous : false;
  },

  // run on league change
  setLeagueProps: async function (leagueId) {

    const league = this.leagues[leagueId];
    if (league) {
      this.league = league;
      this.teams = await this.getOnce('teams/' + leagueId);
      this.weeks = await this.getOnce('weeks/' + leagueId);
      this.games = await this.getOnce('games/' + leagueId);
      localStorage.setItem('leagueId', leagueId);

      // check if favTeam is in new league
      let favTeam = localStorage.getItem('favTeam');
      let teamNames = Object.values(this.teams).map(t => t.name);
      if (favTeam && teamNames.includes(favTeam)) {
        this.favTeam = favTeam;
      } else {
        this.favTeam = null;
      }
    } else {
      console.error('League not found:', leagueId, 'setUserLeague() cancelled');
    }
  },

  setFavTeam: function (teamName) {
    if (teamName) {
      this.favTeam = teamName;
      localStorage.setItem('favTeam', teamName);
    } else {
      this.favTeam = null;
      localStorage.removeItem('favTeam');
    }
  },

  // set .admin-control elements visibility
  enableAdminControls: function () {
    const controls = document.querySelectorAll('.admin-control');
    controls.forEach(control => {
      control.classList.remove('hidden-control');
    });
  },

  disableAdminControls: function () {
    const controls = document.querySelectorAll('.admin-control');
    controls.forEach(control => {
      control.classList.add('hidden-control');
    });
  },

  // sign out
  signOut: async function () {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  },

  // sign in user
  signIn: async function (password) {
    try {
      await signInWithEmailAndPassword(
        auth,
        'jordanewings@outlook.com',
        password
      );
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  },


  getLeague: function () {
    return this.league;
  },

  getOnce: async function (path) {
    const data = await get(child(ref(db), path)).then(s => s.val());
    return data;
  },

  update: async function (updates) {
    return await update(ref(db), updates);
  },
}
