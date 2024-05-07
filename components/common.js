
/* ------------------------------------------------ */
// helpers

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
    this.title = title;
    this.body = body;
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
    if (this.title) this.addTitle(this.title);
    if (this.body) this.addContent(this.body);

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

