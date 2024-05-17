/* ------------------------------------------------ */
// helpers

import { createElement } from "../js/util.js";

// helper to create a new element
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
    const html = `
      <div class="cont-card-title"></div>
      <div class="cont-card-body"></div>
      <div class="cont-card-footer"></div>
    `;

    this.classList.add('cont-card');
    this.innerHTML = html;
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
    const html = `
      <div class="label"></div>
      <div class="contents">
        <div class="main"></div>
        <div class="info"></div>
        <div class="trail"></div>
      </div>
    `;

    this.classList.add('menu-item');
    this.innerHTML = html;

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

  // trail contains action button(s)
  // if not nav, user can add action buttons
  addTrail(trail) {
    const div = this.querySelector('.trail');
    const content = stdInput(trail);
    // if drill in trail div, append just before it
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
    this.render();
  }

  render() {
    this.classList.add('radio-menu');
    return this;
  }

  addOption(title, value, checked = false) {
    const item = new MenuItem();
    const check = createElement('<i class="fa-regular fa-circle"></i>');
    if (checked === true) {
      this.value = value;
      item.classList.add('selected');
      check.className = 'fa-solid fa-circle-check';
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
    this.value = item.dataset.value;
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
      check.className = isValue ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle';
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