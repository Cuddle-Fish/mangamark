const template = document.createElement('template');
template.innerHTML = /* html */ `
  <style>
    @import "/components/tag-elements/tag-elements.css";
  </style>
  <li>
    <slot></slot>
  </li>
`;

customElements.define(
  'tag-li',
  class extends HTMLElement {
    get variant() {
      return this.getAttribute('variant') || 'default';
    }

    set variant(value) {
      const validVariants = ['default', 'small'];
      if (value === '') {
        this.removeAttribute('variant');
      } else if (validVariants.includes(value)) {
        this.setAttribute('variant', value);
      }
    }

    constructor() {
      super();
      const shadowRoot = this.attachShadow({ mode: 'open'});
      shadowRoot.appendChild(template.content.cloneNode(true));
    }
  }
);