const template = document.createElement('template');
template.innerHTML = /* html */ `
  <style>
    @import "/components/themed-button/themed-button.css";
  </style>
  <button>
    <slot></slot>
  </button>
`;

customElements.define(
  'themed-button',
  class extends HTMLElement {
    static get observedAttributes() {
      return ['disabled', 'variant', 'size'];
    }

    get disabled() {
      return this.hasAttribute('disabled') && this.getAttribute('disabled') !== false;
    }

    set disabled(value) {
      value === true ? this.setAttribute('disabled', '') : this.removeAttribute('disabled');
    }

    get variant() {
      return this.getAttribute('variant') || 'primary';
    }

    set variant(value) {
      const validVariants = ['primary', 'secondary', 'warning'];
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
      shadowRoot.querySelector('button')
        .addEventListener('click', (event) => this.handleClick(event));
    }

    handleClick(event) {
      if (this.disabled) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
    }
  }
);