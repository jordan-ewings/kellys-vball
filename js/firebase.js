import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';
// import { ref, get, child, onValue, set, update, remove, onChildAdded, onChildChanged, onChildRemoved } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

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

// local data
export const APP = {

};
