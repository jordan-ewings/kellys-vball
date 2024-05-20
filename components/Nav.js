
import Home from '../js/home.js';
import Standings from '../js/standings.js';
import Schedule from '../js/schedule.js';

/* ------------------------------------------------ */

const navbar = document.querySelector('.navbar');

/* ------------------------------------------------ */
// Nav: handles navigation between sections

class Nav {

  constructor() {
    this.sections = {
      home: Home,
      standings: Standings,
      schedule: Schedule
    };
    this.links = {
      home: navbar.querySelector('#nav-index'),
      standings: navbar.querySelector('#nav-standings'),
      schedule: navbar.querySelector('#nav-schedule')
    };
    this.activeBorder = navbar.querySelector('#navbar-border');
    this.active = null;
    this.addEventListeners();
    return this;
  }

  /* ------------------------------------------------ */
  // listeners

  addEventListeners() {

    Object.keys(this.sections).forEach(name => {
      this.links[name].addEventListener('click', () => this.show(name));
    });
  }

  /* ------------------------------------------------ */
  // public methods

  show(name) {

    Object.values(this.sections).forEach(section => section.hide());
    Object.values(this.links).forEach(link => link.classList.remove('active'));

    this.sections[name].show();
    this.links[name].classList.add('active');

    this.active = name;
    this.activeBorder.style.width = `${this.links[name].offsetWidth}px`;
    this.activeBorder.style.left = `${this.links[name].offsetLeft}px`;
  }
}

/* ------------------------------------------------ */

const nav = new Nav();
export default nav;

