
import Home from '../home.js';
import Standings from '../standings.js';
import Schedule from '../schedule.js';

/* ------------------------------------------------ */

const navbar = document.querySelector('.navbar');
const navbarBorder = document.querySelector('#navbar-border');

/* ------------------------------------------------ */
// Nav: handles navigation between sections

export default class Nav {

  static active = null;

  static init() {

    Nav.addEventListeners();
    Nav.show(Home);
  }

  static addEventListeners() {

    Home.navLink.addEventListener('click', () => Nav.show(Home));
    Standings.navLink.addEventListener('click', () => Nav.show(Standings));
    Schedule.navLink.addEventListener('click', () => Nav.show(Schedule));

  }

  static show(section) {

    [Home, Standings, Schedule].forEach(section => section.hide());
    [Home.navLink, Standings.navLink, Schedule.navLink].forEach(link => link.classList.remove('active'));

    section.show();
    section.navLink.classList.add('active');
    Nav.active = section;

    navbarBorder.style.width = `${section.navLink.offsetWidth}px`;
    navbarBorder.style.left = `${section.navLink.offsetLeft}px`;
  }

}

/* ------------------------------------------------ */

Nav.init();
