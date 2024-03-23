import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

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
const db = getDatabase(app);

// local data
const APP = {

};

// export
export { db, APP };











// my data looks like this:
// {
//   "games": {
//     "0001": {
//       "game_id": "0001",
//       "week": "1",
//       "week_label": "Week 1",
//       "time": "6:00 PM",
//       "court": "Court 1",
//       "team1_id": "12",
//       "team1_name": "Bid D Energy",
//       "team1_record": "1-1",
//       "team2_id": "14",
//       "team2_name": "Practice Safe Sets",
//       "team2_record": "1-1",
//       "status": "POST",
//       "winner_id": "12"
//     },
//     "0002": {
//       "game_id": "0002",
//       "week": "1",
//       "week_label": "Week 1",
//       "time": "6:00 PM",
//       "court": "Court 2",
//       "team1_id": "11",
//       "team1_name": "We Showed Up",
//       "team1_record": "0-2",
//       "team2_id": "2",
//       "team2_name": "FXB",
//       "team2_record": "1-1",
//       "status": "POST",
//       "winner_id": "2"
//     },
//     ...
//   },
//   "teams": {
//     "001": {
//       "id": "001",
//       "name": "Bid D Energy",
//       "wins": "1",
//       "losses": "1"
//     },
//     "002": {
//       "id": "002",
//       "name": "FXB",
//       "wins": "1",
//       "losses": "1"
//     },
//     ...
//   }
// }


