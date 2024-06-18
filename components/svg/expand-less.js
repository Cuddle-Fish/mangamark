const template = document.createElement('template');
template.innerHTML = /* html */ `
  <style>
    :host svg {
      display: flex;
      height: 24px;
      width: 24px;
    }
  </style>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
    <path d="m296-345-56-56 240-240 240 240-56 56-184-184-184 184Z"/>
  </svg>
`;

customElements.define(
  'expand-less',
  class extends HTMLElement {
    static get observedAttributes() {
      return ['fill'];
    }

    constructor() {
      super();
      const shadowRoot = this.attachShadow({ mode: 'open' });
      shadowRoot.appendChild(template.content.cloneNode(true));
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (name === 'fill') {
        this.shadowRoot.querySelector('svg').setAttribute('fill', newValue);
      }
    }

    connectedCallback() {
      if (this.hasAttribute('fill')) {
        this.attributeChangedCallback('fill', null, this.getAttribute('fill'));
      }
    }
  }
);