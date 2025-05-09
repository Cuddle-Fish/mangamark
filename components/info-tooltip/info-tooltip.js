import "/components/svg-icon/svg-icon.js"

const template = document.createElement('template');
template.innerHTML = /* html */ `
  <style>
    @import "/components/info-tooltip/info-tooltip.css";
  </style>
  <svg-icon type="info"></svg-icon>
  <div class="message-container">
    <slot name="title"></slot>
    <div class="description-container">
      <slot name="description" class="description"></slot>
    </div>
  </div>
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