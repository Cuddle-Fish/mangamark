import "/components/svg/info-icon.js";

const template = document.createElement('template');
template.innerHTML = /* html */ `
  <style>
    @import "/components/info-tooltip/info-tooltip.css";
  </style>
  <info-icon></info-icon>
  <slot></slot>
`;

customElements.define(
  'info-tooltip',
  class extends HTMLElement {
    constructor() {
      super();
      const shadowRoot = this.attachShadow({ mode: 'open'});
      shadowRoot.appendChild(template.content.cloneNode(true));
    }
  }
);