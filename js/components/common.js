import { createElement } from "../util.js";
import { session } from "../firebase.js";

/* ------------------------------------------------ */
// helpers

function stdInput(input) {

  let content = input;

  if (typeof input === 'string') {

    if (input.includes('<')) {
      const div = document.createElement('div');
      div.innerHTML = input;
      content = div.firstChild;
    } else {
      content = document.createElement('span');
      content.textContent = input;
    }
  }

  return content;
}

/* ------------------------------------------------ */
// cont card

export class ContCard extends HTMLElement {

  constructor(title, body) {
    super();
    this.title = title || '';
    this.body = body || '';
    this.render();
  }

  render() {
    this.classList.add('cont-card');
    this.innerHTML = `
      <div class="cont-card-title"></div>
      <div class="cont-card-body"></div>
      <div class="cont-card-footer"></div>
    `;

    if (this.title !== '') this.addTitle(this.title);
    if (this.body !== '') this.addContent(this.body);

    return this;
  }

  addTitle(title) {
    const div = this.querySelector('.cont-card-title');
    const content = stdInput(title);
    div.appendChild(content);
    return this;
  }

  addContent(content) {
    const div = this.querySelector('.cont-card-body');
    const item = stdInput(content);
    div.appendChild(item);
    return this;
  }

  addFooter(footer) {
    const div = this.querySelector('.cont-card-footer');
    const content = stdInput(footer);
    div.appendChild(content);
    return this;
  }
}

// define the custom element
customElements.define('cont-card', ContCard);

/* ------------------------------------------------ */
// menu item

export class MenuItem extends HTMLElement {

  constructor() {
    super();
    this.render();
  }

  // method for rendering the component
  render() {
    this.classList.add('menu-item');
    this.innerHTML = `
      <div class="label"></div>
      <div class="contents">
        <div class="main"></div>
        <div class="info"></div>
        <div class="trail"></div>
      </div>
    `;

    return this;
  }

  addClass(classStr) {
    if (classStr.includes(' ')) {
      const classes = classStr.split(' ');
      classes.forEach(cls => {
        this.classList.add(cls);
      });
    } else {
      this.classList.add(classStr);
    }
    return this;
  }

  addDataset(key, value) {
    this.dataset[key] = value;
    return this;
  }

  // enable nav
  enableNav() {
    const drill = document.createElement('div');
    drill.classList.add('drill');
    drill.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';

    this.setAttribute('role', 'button');
    this.querySelector('.trail').appendChild(drill);
    return this;
  }

  // set either text or element content for label
  addLabel(label) {
    const div = this.querySelector('.label');
    const content = stdInput(label);
    div.appendChild(content);
    return this;
  }

  // set either text or element content for title
  addMain(main) {
    const div = this.querySelector('.main');
    const content = stdInput(main);
    div.appendChild(content);
    return this;
  }

  addSubMain(subMain) {
    const div = this.querySelector('.main');
    const content = stdInput(subMain);
    content.classList.add('sub-main');
    div.appendChild(content);
    return this;
  }


  addInfo(info) {
    const div = this.querySelector('.info');
    const content = stdInput(info);
    div.appendChild(content);
    return this;
  }

  addTrail(trail) {
    const div = this.querySelector('.trail');
    const content = stdInput(trail);
    if (div.querySelector('.drill')) {
      div.insertBefore(content, div.querySelector('.drill'));
    } else {
      div.appendChild(content);
    }
    return this;
  }
}

// define the custom element
customElements.define('menu-item', MenuItem);

/* ------------------------------------------------ */
// radio menu

export class RadioMenu extends HTMLElement {

  constructor(selectedOnTop) {
    super();
    this.selectedOnTop = selectedOnTop || false;
    this.value = null;
    this.appendOrder = [];
    this.checkClass = 'bi bi-check-circle-fill';
    this.uncheckClass = 'bi bi-circle';
    this.render();
  }

  render() {
    this.classList.add('radio-menu');
    return this;
  }

  addOption(title, value, checked = false) {
    const item = new MenuItem();
    // const check = createElement('<i class="fa-regular fa-circle"></i>');
    const check = document.createElement('i');
    check.className = checked ? this.checkClass : this.uncheckClass;
    if (checked === true) {
      this.value = value;
      item.classList.add('selected');
    }
    item.addMain(title);
    item.addTrail(check);
    item.addDataset('value', value);
    item.setAttribute('role', 'button');
    item.classList.add('radio-menu-item');
    item.addEventListener('click', () => {
      this.selectOption(item);
    });
    this.appendChild(item);
    this.appendOrder.push(value);

    if (this.selectedOnTop === true) {
      const items = this.querySelectorAll('.menu-item');
      const sortedItems = Array.from(items).sort((a, b) => {
        if (a.dataset.value == this.value) return -1;
        if (b.dataset.value == this.value) return 1;
        const aIndex = this.appendOrder.indexOf(a.dataset.value);
        const bIndex = this.appendOrder.indexOf(b.dataset.value);
        return aIndex - bIndex;
      });
      this.innerHTML = '';
      sortedItems.forEach(item => {
        this.appendChild(item);
      });
    }

    return this;
  }

  async selectOption(item) {
    // this.value = item.dataset.value;

    // if item is already selected, clear value
    const sameValue = item.dataset.value == this.value;
    this.value = sameValue ? null : item.dataset.value;

    await this.updateElements();
    this.dispatchEvent(new CustomEvent('change', { detail: this.value }));

    return this;
  }

  getValue() {
    return this.value;
  }

  async updateElements() {
    const items = this.querySelectorAll('.menu-item');
    items.forEach(item => {
      const trail = item.querySelector('.trail');
      const check = trail.querySelector('i');
      const isValue = item.dataset.value == this.value;
      check.className = isValue ? this.checkClass : this.uncheckClass;
      item.classList.toggle('selected', isValue);
    });

    if (this.selectedOnTop === true) {

      // get new order
      const sortedItems = Array.from(items).sort((a, b) => {
        if (a.dataset.value == this.value) return -1;
        if (b.dataset.value == this.value) return 1;
        const aIndex = this.appendOrder.indexOf(a.dataset.value);
        const bIndex = this.appendOrder.indexOf(b.dataset.value);
        return aIndex - bIndex;
      });

      // get positions of each item
      let positions = [];
      items.forEach(item => {
        positions.push(item.getBoundingClientRect().top);
      });

      // translate items to new positions
      items.forEach(item => {
        const index = sortedItems.indexOf(item);
        const newTop = positions[index];
        const currentTop = item.getBoundingClientRect().top;
        const diff = newTop - currentTop;
        item.style.transition = 'transform 0.3s ease-in-out';
        item.style.transform = `translateY(${diff}px)`;
      });

      // after transition, overwrite this with items in new order
      await new Promise(resolve => {
        setTimeout(() => {
          this.innerHTML = '';
          sortedItems.forEach(item => {
            this.appendChild(item);
            item.style.transition = '';
            item.style.transform = '';
          });
          resolve();
        }, 300);
      });
    }

    return this;
  }
}

customElements.define('radio-menu', RadioMenu);

/* ------------------------------------------------ */
// stepper

export class Stepper extends HTMLElement {

  constructor(value) {
    super();
    this.initial = value || 0;
    this.value = value || 0;
    this.change = 0;
    this.render();
  }

  render() {

    this.classList.add('stepper-item');
    this.innerHTML = `
      <div class="stepper-count-initial d-none">${this.initial}</div>
      <div class="stepper-count">${this.value}</div>
      <div class="stepper-container admin-control">
        <div class="stepper">
          <div role="button" class="stepper-btn stepper-down">
            <i class="fa-solid fa-minus"></i>
          </div>
          <div class="separator"></div>
          <div role="button" class="stepper-btn stepper-up">
            <i class="fa-solid fa-plus"></i>
          </div>
        </div>
      </div>
    `;

    this.setListeners();
    return this;
  }

  disableEditMode() {
    this.querySelector('.stepper-container').classList.add('d-none');
    return this;
  }

  enableEditMode() {
    this.querySelector('.stepper-container').classList.remove('d-none');
    return this;
  }

  setListeners() {
    const btns = this.querySelectorAll('.stepper-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const diff = btn.classList.contains('stepper-up') ? 1 : -1;
        if (this.value + diff < 0) return;
        this.value += diff;
        this.change = this.value - this.initial;
        this.updateElements();
        this.dispatchEvent(new CustomEvent('change', { detail: this.change }));
      });
    });
  }

  reset() {
    this.value = this.initial;
    this.change = 0;
    this.updateElements();
  }

  resetWith(value) {
    this.initial = value;
    this.value = value;
    this.change = 0;
    this.updateElements();
  }

  updateElements() {
    const anyChange = this.change != 0;
    this.classList.toggle('changed', anyChange);
    this.querySelector('.stepper-count').textContent = this.value;
    this.querySelector('.stepper-count-initial').textContent = this.initial;
    this.querySelector('.stepper-count-initial').classList.toggle('d-none', !anyChange);

    // if !anyChange and this.value == 0, add css class to show '0' as gray
    this.querySelector('.stepper-count').classList.toggle('zero', !anyChange && this.value == 0);
  }
}

customElements.define('stepper-item', Stepper);

/* ------------------------------------------------ */
// button

export class Button extends HTMLElement {

  constructor(className, innerHTML) {
    super();
    this.initial = {
      innerHTML: innerHTML || '',
      className: 'action-button' + (className ? ' ' + className : ''),
    };
    this.render();
  }

  render() {
    this.role = 'button';
    this.reset();
    return this;
  }

  show() {
    this.classList.remove('d-none');
    this.initial.className = this.className;
    this.reset();
    return this;
  }

  hide() {
    this.classList.add('d-none');
    this.initial.className = this.className;
    return this;
  }

  // setting states
  reset() {
    this.innerHTML = this.initial.innerHTML;
    this.className = this.initial.className;
    return this;
  }

  enable() {
    this.classList.remove('disabled');
    return this;
  }

  disable() {
    this.classList.add('disabled');
    return this;
  }

  startSave() {
    this.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    this.disable();
    return this;
  }

  errorSave() {
    this.innerHTML = '<i class="fa-solid fa-exclamation-circle"></i>';
    return this;
  }

  endSave() {
    this.innerHTML = '<i class="fa-solid fa-check"></i>';
    return this;
  }
}

customElements.define('action-button', Button);

/* ------------------------------------------------ */
// favTeamIcon

export class FavTeamListener {

  /* ------------------------------------------------ */
  // static methods

  static instances = [];

  static updateAll() {
    FavTeamListener.instances = FavTeamListener.instances.filter(instance => {
      return document.body.contains(instance.element);
    });
    FavTeamListener.instances.forEach(instance => instance.update());
  }

  /* ------------------------------------------------ */
  // instance methods

  constructor(element) {
    this.element = element;
    this.teamNameElement = this.element.querySelector('.team-name');
    this.anchorElement = this.teamNameElement;
    this.update();

    FavTeamListener.instances.push(this);
  }

  // custom icon location (icon will be inserted after this element)
  setAnchor(selector) {
    const anchor = this.element.querySelector(selector);
    if (anchor) this.anchorElement = anchor;
    this.update();
  }

  // toggle icon based on session.favTeam
  update() {

    const isFav = session.favTeam == this.teamNameElement.textContent;
    const anchor = this.anchorElement;
    const icon = createElement('<i class="fa-solid fa-user fav-team"></i>');
    const iconOld = this.element.querySelector('i.fav-team');

    if (iconOld) iconOld.remove();
    if (isFav) anchor.after(icon);
  }
}

document.addEventListener('session-setFavTeam', FavTeamListener.updateAll);

/* ------------------------------------------------ */
// teamLabel
// often need to show team name alongside other team info (e.g., number, name), so this component is useful

export class TeamLabel extends HTMLElement {

  constructor(team) {
    super();
    this.team = team;
    this.render();

    this.favTeamListener = new FavTeamListener(this);
  }

  render() {
    this.classList.add('team-label');
    this.classList.add('d-flex', 'align-items-center', 'column-gap-2', 'flex-nowrap');
    this.innerHTML = `
      <span class="team-nbr">${this.team.nbr}</span>
      <span class="team-name">${this.team.name}</span>
    `;
    return this;
  }

  appendRecord() {
    const record = (this.team.stats) ? this.team.stats.games.record : this.team.record;
    const span = createElement(`<span class="team-record">${record}</span>`);
    this.appendChild(span);
  }

  setFavTeamIconAnchor(selector) {
    this.favTeamListener.setAnchor(selector);
  }

}

customElements.define('team-label', TeamLabel);

/* ------------------------------------------------ */
// Section
// a section component with a header and body
// "home page" of section is the first carousel item
// home page can contain elements that navigate to other sections
// from non-home pages, can navigate back to home page with back button in header
// (back button is hidden on home page)

export class Section extends HTMLElement {

  constructor() {
    super();
    this.render();
  }

  render() {
    this.classList.add('x-section');
    this.innerHTML = `
      <div class="main-header"></div>
      <div class="main-header main-header-subpage hidden">
        <div role="button" class="btn-back" data-x-nav-index="0">
          <i class="fa-solid fa-chevron-left"></i> Back
        </div>
        <div class="main-header-title">
          <span></span>
        </div>
      </div>
      <div class="main-body">
        <div class="carousel slide" data-bs-touch="false" data-bs-interval="false">
          <div class="carousel-inner">
            <div class="carousel-item active" data-x-content-index="0"></div>
          </div>
        </div>
      </div>
    `;

    this.carousel = this.querySelector('.carousel');
    this.carouselInner = this.querySelector('.carousel-inner');
    this.carouselBS = new bootstrap.Carousel(this.carousel);

    this.header = this.querySelector('.main-header');
    this.headerSub = this.querySelector('.main-header-subpage');
    this.headerSubTitle = this.headerSub.querySelector('.main-header-title span');
    this.headerSubBackBtn = this.headerSub.querySelector('.btn-back');
    this.headerSubBackBtn.addEventListener('click', () => {
      this.carouselBS.to(0);
      this.headerSub.classList.add('hidden');
      this.headerSubTitle.textContent = '';
      this.header.classList.remove('hidden');
      document.querySelector('nav').classList.remove('hidden');
    });

    return this;
  }

  // adding/linking nav buttons and content
  initializeLink(link, pageTitle = null) {
    const index = this.carouselInner.children.length;
    const content = document.createElement('div');
    content.classList.add('carousel-item');
    content.dataset.xContentIndex = index;
    this.carouselInner.appendChild(content);

    link.dataset.xNavIndex = index;
    link.addEventListener('click', () => {
      this.carouselBS.to(index);
      if (this.hasHome) {
        document.querySelector('nav').classList.add('hidden');
        this.header.classList.remove('hidden');
        this.headerTitle.textContent = pageTitle;
      }
    });
  }

  getPageForLink(link) {
    const index = link.dataset.xNavIndex;
    return this.carouselInner.querySelector(`.carousel-item[data-x-content-index="${index}"]`);
  }

}
