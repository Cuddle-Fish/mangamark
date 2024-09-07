

const template = document.createElement('template');
template.innerHTML = /* html */ `
  <style>
    :host svg {
      display: flex;
      height: var(--icon-size, 24px);
      width: var(--icon-size, 24px);
    }
  </style>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
    <path d="M120-240v-80h520v80H120Zm664-40L584-480l200-200 56 56-144 144 144 144-56 56ZM120-440v-80h400v80H120Zm0-200v-80h520v80H120Z"/>
  </svg>
`;

customElements.define(
  'menu-icon',
  class extends HTMLElement {
    static get observedAttributes() {
      return ['fill', 'size'];
    }

    constructor() {
      super();
      const shadowRoot = this.attachShadow({ mode: 'open' });
      shadowRoot.appendChild(template.content.cloneNode(true));
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (name === 'fill') {
        this.shadowRoot.querySelector('svg').setAttribute('fill', newValue);
      } else if (name === 'size') {
        this.style.setProperty('--icon-size', newValue);
      }
    }
  }
);