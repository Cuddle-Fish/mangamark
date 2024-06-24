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

    get variant() {
      return this.getAttribute('variant') || '';
    }

    set variant(value) {
      const validVariants = ['addToBookmark', 'active', 'filter', 'delete', 'noAction'];
      if (validVariants.includes(value)) {
        this.setAttribute('variant', value);
      }
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
      if (this.variant === 'noAction') {
        this.selected = false;
      }
      this.shadowRoot
        .querySelector('button')
        .addEventListener('click', (event) => this.toggle());
    }

    toggle() {
      if (this.variant !== 'noAction') {
        this.selected = !this.selected;
      }
    }
  }
);