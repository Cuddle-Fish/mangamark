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
    <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
  </svg>
`;

customElements.define(
  'done-icon',
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

    connectedCallback() {
      if (this.hasAttribute('fill')) {
        this.attributeChangedCallback('fill', null, this.getAttribute('fill'));
      }
      if (this.hasAttribute('size')) {
        this.attributeChangedCallback('size', null, this.getAttribute('size'));
      }
    }
  }
);