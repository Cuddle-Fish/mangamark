customElements.define(
  'option-data',
  class extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
      this.style.display = "none";
    }

    get value() {
      return this.getAttribute('value');
    }

    get label() {
      return this.getAttribute('label');
    }
  }
);