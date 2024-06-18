const template = document.createElement('template');
template.innerHTML = /* html */ `
  <style>
    @import "/components/tag-button/tag-button.css";
  </style>
  <button>
    <slot></slot>
  </button>
`;

customElements.define(
  'tag-button',
  class extends HTMLElement {
    static get observedAttributes() {
      return ['selected', 'variant', 'size'];
    }

    get selected() {
      return this.hasAttribute('selected') && this.getAttribute('selected') !== false;
    }

    set selected(value) {
      value === true ? this.setAttribute('selected', '') : this.removeAttribute('selected');
    }

    constructor() {
      super();
      const shadowRoot = this.attachShadow({ mode: 'open'});
      shadowRoot.appendChild(template.content.cloneNode(true));
    }

    connectedCallback() {
      this.shadowRoot
        .querySelector('button')
        .addEventListener('click', (event) => this.toggle());
    }

    toggle() {
      this.selected = !this.selected;
    }
  }
);