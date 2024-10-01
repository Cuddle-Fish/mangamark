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
      return ['placeholder', 'placeholder-view', 'open', 'selected', 'selected-indicator', 'disabled'];
    }

    get placeholder() {
      return this.getAttribute('placeholder') || '';
    }

    get placeholderView() {
      return this.getAttribute('placeholder-view') || 'insertBefore';
    }

    set placeholderView(value) {
      const validViews = ['replace', 'insertBefore', 'insertAfter'];
      if (!value) {
        this.removeAttribute('placeholder-view');
      } else if (validViews.includes(value)) {
        this.setAttribute('placeholder-view', value);
      }
    }

    get open() {
      return this.hasAttribute('open') && this.getAttribute('open') !== false;
    }

    set open(value) {
      value === true && !this.disabled ? this.setAttribute('open', '') : this.removeAttribute('open');
    }

    get selected() {
      return this.getAttribute('selected') || '';
    }

    set selected(value) {
      const newSelectedInput = this.shadowRoot
        .querySelector(`input[name="dropdown-options"][value="${value}"]`);
      const oldSelectedInput = this.shadowRoot
        .querySelector(`input[name="dropdown-options"][value="${this.selected}"]`);

      if (oldSelectedInput) {
        oldSelectedInput.checked = false;
      }
      if (!newSelectedInput || !value) {
        this.removeAttribute('selected');
      } else {
        newSelectedInput.checked = true;
        this.setAttribute('selected', value);
      }
    }

    get disabled() {
      return this.hasAttribute('disabled') && this.getAttribute('disabled') !== false;
    }

    set disabled(value) {
      value === true ? this.setAttribute('disabled', '') : this.removeAttribute('disabled');
    }

    get options() {
      return this.shadowRoot.querySelector('slot').assignedElements();
    }

    constructor() {
      super();
      const shadowRoot = this.attachShadow({mode: 'open'});
      shadowRoot.appendChild(template.content.cloneNode(true));
      this.tabIndex = 0;
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (
        name === 'placeholder' || 
        name === 'open' || 
        name === 'selected' || 
        name === 'placeholder-view'
      ) {
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

    updateOptions(selectedValue) {
      this.createOptions();
      this.selected = selectedValue || '';
    }

    createOptions() {
      const options = this.querySelectorAll('option');
      const fragement = document.createDocumentFragment();

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

        label.part = "dropdown-option";
        label.htmlFor = input.id;
        label.appendChild(icon);
        icon.classList.add('labelIcon');
        const span = document.createElement('span');
        span.innerHTML = option.textContent;
        span.classList.add('labelText');
        label.appendChild(span);

        const div = document.createElement('div');

        div.appendChild(input);
        div.appendChild(label);
        fragement.appendChild(div);

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

      const optionsContainer = this.shadowRoot.querySelector('.options-container');
      optionsContainer.replaceChildren(fragement);
    }

    toggle() {
      if (this.disabled) {
        this.open = false;
        return;
      }

      this.open = !this.open;
    }

    setInputDisabled(inputValue, isDisabled) {
      const input = this.shadowRoot
        .querySelector(`input[name="dropdown-options"][value="${inputValue}"]`);
      input.disabled = isDisabled;
    }

    render() {
      const button = this.shadowRoot.querySelector('button');
      if (!this.selected) {
        button.textContent = this.placeholder;
      } else if (this.placeholderView === 'insertBefore') {
        button.textContent = `${this.placeholder} ${this.selected}`;
      } else if (this.placeholderView === 'insertAfter') {
        button.textContent = `${this.selected} ${this.placeholder} `;
      } else {
        button.textContent = this.selected;
      }

      const currentIcon = button.querySelector('expand-more', 'expand-less');
      if (currentIcon) {
        currentIcon.remove();
      }

      const icon = document.createElement(this.open ? 'expand-less' : 'expand-more');
      button.appendChild(icon);
    }
  }
)