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

// Get a reference to the database service
export const db = getDatabase(app);

/* ------------------------------------------------ */

export const auth = getAuth(app);

/* ------------------------------------------------ */

export const session = {

  // meta
  leagues: {},

  // session specific
  league: {},
  teams: {},
  weeks: {},

  // user specific
  user: null,
  admin: false,
  adminControls: false,

  // run on page load
  init: async function () {

    let leagues = await this.getOnce('leagues');
    let leagueId = localStorage.getItem('leagueId');
    let leagueIdValid = (leagueId && leagues[leagueId]);
    if (!leagueIdValid) {
      leagueId = Object.keys(leagues)[0];
    }

    this.leagues = leagues;
    this.setUserProps(auth.currentUser);
    await this.setLeagueProps(leagueId);

    console.log('Session initialized:', this);

    return this;
  },

  // run on auth state change
  setUserProps: function (user) {
    if (user) {
      this.user = user;
      this.admin = !user.isAnonymous;
      this.adminControls = !user.isAnonymous;
    } else {
      this.user = null;
      this.admin = false;
      this.adminControls = false;
    }
  },

  // run on league change
  setLeagueProps: async function (leagueId) {

    const league = this.leagues[leagueId];
    if (league) {
      this.league = league;
      this.teams = await this.getOnce('teams/' + leagueId);
      this.weeks = await this.getOnce('weeks/' + leagueId);
      localStorage.setItem('leagueId', leagueId);
      return true;
    } else {
      console.error('League not found:', leagueId, 'setUserLeague() cancelled');
      return false;
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
    return await get(child(ref(db), path)).then(snapshot => {
      if (snapshot.exists()) {
        return snapshot.val();
      } else {
        console.error('No data found at', path, 'getOnce() cancelled');
        return null;
      }
    });
  },
}
