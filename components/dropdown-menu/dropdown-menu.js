import '/components/svg/expand-more.js';
import '/components/svg/expand-less.js';
import '/components/svg/done-icon.js';

const template = document.createElement('template');
template.innerHTML = /* html */ `
  <style>
    @import "/components/dropdown-menu/dropdown-menu.css";
  </style>
  <button></button>
  <div class="options-container"></div>
  <datalist>
    <slot></slot>
  </datalist>
`;

customElements.define(
  'dropdown-menu',
  class extends HTMLElement {
    static get observedAttributes() {
      return ['placeholder', 'open', 'selected', 'width', 'variant'];
    }

    get placeholder() {
      return this.getAttribute('placeholder') || '';
    }

    get open() {
      return this.hasAttribute('open') && this.getAttribute('open') !== false;
    }

    set open(value) {
      value === true ? this.setAttribute('open', '') : this.removeAttribute('open');
    }

    get selected() {
      return this.getAttribute('selected') || '';
    }

    set selected(value) {
      if (!this.hasAttribute('selected') || this.getAttribute('selected') !== value) {
        const inputs = this.shadowRoot.querySelectorAll('input');
        for (const input of inputs) {
          if (input.value === value) {
            input.checked = true;
            this.setAttribute('selected', value);
            break;
          }
        }
      }
    }

    get width() {
      return this.getAttribute('width') || 'auto';
    }

    set width(value) {
      this.setAttribute('width', value);
    }

    get variant() {
      return this.getAttribute('variant') || '';
    }

    set variant(value) {
      if (value === '') {
        this.removeAttribute('variant');
      } else {
        this.setAttribute('variant', value);
      }
    }

    constructor() {
      super();
      const shadowRoot = this.attachShadow({mode: 'open'});
      shadowRoot.appendChild(template.content.cloneNode(true));
      this.tabIndex = 0;
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (name === 'width') {
        this.style.setProperty('--dropdown-width', newValue);
      } else if (name === 'open' || name === 'selected') {
        this.render();
      }
    }

    connectedCallback() {
      this.shadowRoot
        .querySelector('button')
        .addEventListener('click', (event) => this.toggle());
      this.createOptions();
      this.render();

      this.addEventListener('focusout', (event) => {
        if (!this.contains(event.relatedTarget)) {
          this.open = false;
        }
      });
    }

    createOptions() {
      const options = this.querySelectorAll('option');
      const optionsContainer = this.shadowRoot.querySelector('.options-container');

      options.forEach((option, index) => {
        const input = document.createElement('input');
        const label = document.createElement('label');
        const icon = document.createElement('done-icon');

        input.type = 'radio';
        input.name = 'dropdown-options';
        input.value = option.value;
        input.id = `dropdown-option-${index}`;

        if (this.selected === option.value) {
          input.checked = true;
        }

        label.setAttribute('for', input.id);
        label.appendChild(icon);
        icon.setAttribute('class', 'labelIcon');
        const span = document.createElement('span');
        span.innerHTML = option.textContent;
        span.setAttribute('class', 'labelText');
        label.appendChild(span);

        const div = document.createElement('div');
        div.setAttribute('class', 'option');

        div.appendChild(input);
        div.appendChild(label);
        optionsContainer.appendChild(div);

        input.addEventListener('change', () => {
          this.setAttribute('selected', input.value);
          this.open = false;
          this.dispatchEvent(
            new CustomEvent('DropdownChange', {
              detail: input.value,
            })
          );
        });
      });
    }

    toggle() {
      this.open = !this.open;
    }

    render() {
      const button = this.shadowRoot.querySelector('button');
      button.textContent = `${this.placeholder} ${this.selected ? this.selected : ''}`;

      const currentIcon = button.querySelector('expand-more', 'expand-less');
      if (currentIcon) {
        currentIcon.remove();
      }

      const icon = document.createElement(this.open ? 'expand-less' : 'expand-more');
      button.appendChild(icon);
    }
  }
)