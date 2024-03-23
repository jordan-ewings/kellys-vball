import * as util from './util.js';
import * as gest from './gestures.js';
// import { db } from './firebase.js';
// import { ref, get, child, onValue, set, update, remove, onChildAdded, onChildChanged, onChildRemoved } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';
// import { DBold } from './data.js';

// /* ------------------------------------------------ */

// newDB();

// async function newDB() {

//   await DBold.load('Schedule2');
//   await DBold.load('Teams2');

//   let newDB = {
//     games: {},
//     teams: {}
//   };

//   DBold.get('Schedule2').forEach(g => {
//     newDB.games[g.game_id] = g;
//   });

//   DBold.get('Teams2').forEach(t => {
//     newDB.teams[t.id] = t;
//   });

//   console.log('newDB', newDB);
//   console.log(JSON.stringify(newDB));
// }

