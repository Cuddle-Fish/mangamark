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
    <path d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z"/>
  </svg>
`;

customElements.define(
  'arrow-back',
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