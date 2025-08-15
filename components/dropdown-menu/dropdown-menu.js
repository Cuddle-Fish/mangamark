import '/components/svg-icon/svg-icon.js';

const template = document.createElement('template');
template.innerHTML = /* html */ `
  <style>
    @import "/components/dropdown-menu/dropdown-menu.css";
  </style>
  <button id="toggle-button">
    <span id="button-text"></span>
    <svg-icon id="button-arrow" type="expand-more"></svg-icon>
  </button>
  <div id="options-container" class="hidden"></div>
  <datalist>
    <slot></slot>
  </datalist>
`;

customElements.define(
  'dropdown-menu',
  class extends HTMLElement {
    #validVariants = ['checkmark', 'highlight'];
    #selections = new Map();

    static get observedAttributes() {
      return ['selected', 'disabled', 'variant'];
    }

    get selected() {
      if (!this.hasAttribute('selected')) {
        return null;
      }

      const value = this.getAttribute('selected');
      return this.#selections.has(value) ? value : null;
    }

    set selected(value) {
      if (!this.#selections.has(value)) {
        return;
      }

      this.setAttribute('selected', value);
    }

    get disabled() {
      return this.hasAttribute('disabled') && this.getAttribute('disabled') !== false;
    }

    set disabled(value) {
      value === true ? this.setAttribute('disabled', '') : this.removeAttribute('disabled');
    }

    get variant() {
      return this.getAttribute('variant') || 'checkmark';
    }

    set variant(value) {
      if (value === '') {
        this.removeAttribute('variant');
      } else if (this.#validVariants.includes(value)) {
        this.setAttribute('variant', value);
      }
    }

    constructor() {
      super();
      const shadowRoot = this.attachShadow({mode: 'open'});
      shadowRoot.appendChild(template.content.cloneNode(true));
      this.tabIndex = 0;
    }

    connectedCallback() {
      this.#renderOptions();
      this.#renderSelected();

      const slot = this.shadowRoot.querySelector('slot');
      slot.addEventListener('slotchange', (event) => {
        this.#renderOptions();
        this.#renderSelected();
      });

      this.addEventListener('focusout', (event) => {
        if (!this.contains(event.relatedTarget)) this.#closeMenu();
      });

      const toggleButton = this.shadowRoot.getElementById('toggle-button');
      toggleButton.addEventListener('click', (event) => this.#toggleMenu(event));
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (name === 'selected' && oldValue !== newValue) {
        if (this.#selections.has(newValue)) {
          this.#selections.get(newValue).input.checked = true;
        } else if (this.#selections.has(oldValue)) {
          this.#selections.get(oldValue).input.checked = false;
        }
        this.#renderSelected();
      }
    }

    #toggleMenu(event) {
      if (this.disabled) {
        return;
      }

      const toggleButton = this.shadowRoot.getElementById('toggle-button');
      const toggleArrow = this.shadowRoot.getElementById('button-arrow');
      const optionsContainer = this.shadowRoot.getElementById('options-container');
      if (toggleButton.classList.contains('open')) {
        toggleButton.classList.remove('open');
        optionsContainer.classList.add('hidden');
        toggleArrow.type = 'expand-more';
      } else {
        toggleButton.classList.add('open');
        optionsContainer.classList.remove('hidden');
        toggleArrow.type = 'expand-less';
      }
    }

    #closeMenu() {
      const toggleButton = this.shadowRoot.getElementById('toggle-button');
      const optionsContainer = this.shadowRoot.getElementById('options-container');
      const toggleArrow = this.shadowRoot.getElementById('button-arrow');
      toggleButton.classList.remove('open');
      optionsContainer.classList.add('hidden');
      toggleArrow.type = 'expand-more';
    }

    #renderOptions() {
      const options = this.querySelectorAll('option');
      const fragement = document.createDocumentFragment();
      this.#selections.clear();

      options.forEach((option, index) => {
        if (this.#selections.has(option.value)) {
          throw new Error('invalid options, can not have duplicate option values.');
        }

        const selectedLabel = option.getAttribute('selected-label') || option.textContent;
        const {container, input} = this.#createOption(option.textContent, option.value, index);
        this.#selections.set(option.value, {input, selectedLabel});
        input.addEventListener('change', () => {
          this.selected = option.value;
          this.#closeMenu();
          this.dispatchEvent(new CustomEvent('dropdownChange', {
            detail: option.value
          }));
        });

        fragement.appendChild(container);
      });

      const optionsContainer = this.shadowRoot.getElementById('options-container');
      optionsContainer.replaceChildren(fragement);

      if (this.selected === null) {
        this.selected = this.#selections.keys().next().value;
      }
    }

    #createOption(text, value, index) {
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'dropdown-options';
      input.value = value;
      input.id = `option-${index}`;
      if (this.getAttribute('selected') === value) {
        input.checked = true;
      }

      const label = document.createElement('label');
      label.htmlFor = `option-${index}`;
      const icon = document.createElement('svg-icon');
      icon.type = 'check-mark';      
      const span = document.createElement('span');
      span.textContent = text;
      label.appendChild(icon);
      label.appendChild(span);

      const container = document.createElement('div');
      container.classList.add('option');
      container.appendChild(input);
      container.appendChild(label);

      return {container, input};
    }

    #renderSelected() {
      const buttonText = this.shadowRoot.getElementById('button-text');
      if (!this.#selections.has(this.selected)) {
        buttonText.textContent = '';
      } else {
        buttonText.textContent = this.#selections.get(this.selected).selectedLabel;
      }
    }
  }
)