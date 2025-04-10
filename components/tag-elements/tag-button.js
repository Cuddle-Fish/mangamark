import "/components/svg-icon/svg-icon.js";

const template = document.createElement('template');
template.innerHTML = /* html */ `
  <style>
    @import "/components/tag-elements/tag-elements.css";
  </style>
  <button id="element-button">
    <span><slot></slot></span>
    <div class="vertical-line"></div>
    <svg-icon type="close" style="--icon-size: 20px"></svg-icon>
  </button>
`;

customElements.define(
  'tag-button',
  class extends HTMLElement {
    constructor() {
      super();
      const shadowRoot = this.attachShadow({ mode: 'open'});
      shadowRoot.appendChild(template.content.cloneNode(true));
    }

    animate() {
      const button = this.shadowRoot.getElementById('element-button');
      button.classList.add('flash-button');
      setTimeout(() => button.classList.remove('flash-button'), 1200);
    }
  }
);