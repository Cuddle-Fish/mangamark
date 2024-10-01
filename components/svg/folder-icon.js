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
    <path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/>
  </svg>
`;

customElements.define(
  'folder-icon',
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