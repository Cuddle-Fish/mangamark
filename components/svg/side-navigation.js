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
    <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm280-80h280v-560H480v560Z"/>
  </svg>
`;

customElements.define(
  'side-navigation',
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