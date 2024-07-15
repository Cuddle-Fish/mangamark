const template = document.createElement('template');
template.innerHTML = /* html */ `
  <style>
    :host svg {
      display: flex;
    }
  </style>
<svg width="44" height="61" viewBox="0 0 44 61" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M33 10V0H39.6C44 0 44 10 44 10H33Z" fill="#32465E"/>
  <path d="M4 61L18 44.3636V0H4V61Z" fill="#3C5B7F"/>
  <path d="M32 61L18 44.3636V0H32V61Z" fill="#3C5B7F"/>
  <path d="M17.6604 24L0 15.6456V3C0 1 2 0 3 0L36 2.12391e-06L39.5 0C37.5 0 36 2 36 7.49998V15.6456L17.6604 24Z" fill="#3C5B7F"/>
  <path d="M36 13V41.958L32 42V20L19.0162 38.0216H16.9838L4 20V41.958L0 41.958V13L4 13L18 33L32 13L36 13Z" fill="#DCDEDF"/>
</svg>
`;

customElements.define(
  'managamark-logo',
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