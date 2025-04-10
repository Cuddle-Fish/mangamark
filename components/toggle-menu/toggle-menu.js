import '/components/svg-icon/svg-icon.js';

const template = document.createElement('template');
template.innerHTML = /* html */ `
  <style>
    @import "/components/toggle-menu/toggle-menu.css";
  </style>
  <button>
    <span id="button-text"></span>
    <svg-icon id="button-icon" type="expand-more"></svg-icon>
  </button>
  <div></div>
  <datalist>
    <slot></slot>
  </datalist>
`;

customElements.define(
  'toggle-menu',
  class extends HTMLElement {
    static get observedAttributes() {
      return ['selected', 'open'];
    }

    get selected() {
      return this.getAttribute('selected');
    }
    
    set selected(value) {
      if (!this.hasAttribute('selected') || this.getAttribute('selected') !== value) {
        const inputs = this.shadowRoot.querySelectorAll('input');
        for (const input of inputs) {
          if (input.value === value) {
            input.checked = true;
            this.setAttribute('selected', value);
            this.renderButton();
            break;
          }
        }
      }
    }

    get open() {
      return this.hasAttribute('open') && this.getAttribute('open') !== false;
    }

    set open(value) {
      value === true ? this.setAttribute('open', '') : this.removeAttribute('open');
    }

    constructor() {
      super();
      const shadowRoot = this.attachShadow({ mode: 'open'});
      shadowRoot.appendChild(template.content.cloneNode(true));
      this.tabIndex = 0;
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (name === 'open') {
        this.renderButton();
      }
    }

    connectedCallback() {
      this.shadowRoot.querySelector('button').addEventListener('click', (event) => this.toggle());
      this.createOptions();

      this.addEventListener('focusout', (event) => {
        if (!this.contains(event.relatedTarget)) {
          this.open = false;
        }
      });
    }

    createOptions() {
      const options = this.querySelectorAll('option');
      const div = this.shadowRoot.querySelector('div');

      options.forEach((option, index) => {
        const input = document.createElement('input');
        const label = document.createElement('label');

        input.type = 'radio';
        input.name = 'toggle-options';
        input.value = option.value;
        input.id = `toggle-option-${index}`;

        if (this.selected === option.value) {
          input.checked = true;
          this.renderButton();
        }

        label.setAttribute('for', input.id);
        label.textContent = option.textContent;

        div.appendChild(input);
        div.appendChild(label);

        input.addEventListener('change', () => {
          this.setAttribute('selected', input.value);
          this.open = false;
          this.renderButton();
          this.dispatchEvent(
            new CustomEvent('toggleMenuChange', {
              detail: input.value,
            })
          );
        });
      });
    }

    renderButton() {
      const text = this.shadowRoot.getElementById('button-text');
      if (!this.selected) {
        text.textContent = '';
      } else {
        text.textContent = this.selected;
      }

      const icon = this.shadowRoot.getElementById('button-icon');
      icon.type = this.open ? 'expand-less' : 'expand-more';
    }

    toggle() {
      this.open = !this.open;
    }
  }
);