import "/components/svg/expand-more.js";

const template = document.createElement('template');
template.innerHTML = /* html */ `
  <style>
    @import "/components/input-select/input-select.css";
  </style>
  <input id="input-area" class="input-area" />
  <expand-more></expand-more>
  <div id="suggestions-container" class="suggestions-container hidden"></div>
  <datalist id="options">
    <slot></slot>
  </datalist>
`;

customElements.define(
  'input-select',
  class extends HTMLElement {
    static get observedAttributes() {
      return ['type', 'required', 'placeholder', 'step', 'input-width'];
    }

    get type() {
      return this.getAttribute('type') || 'text';
    }

    set type(value) {
      if (this.isValidType(value)) {
        this.setAttribute('type', value);
      } else if (value === '') {
        this.removeAttribute('type');
      }
    }

    isValidType(value) {
      const validTypes = ['number', 'text', 'textarea'];
      return validTypes.includes(value);
    }

    get required() {
      return this.hasAttribute('required') && this.getAttribute('required') !== false;
    }

    set required(value) {
      value === true ? this.setAttribute('required', '') : this.removeAttribute('required');
    }

    get placeholder() {
      return this.getAttribute('placeholder') || '';
    }

    set placeholder(value) {
      if (value) {
        this.setAttribute('placeholder', value);
      } else {
        this.removeAttribute('placeholder');
      }
    }

    get step() {
      return this.getAttribute('step') || '';
    }

    set step(value) {
      if (this.type === 'number') {
        this.setAttribute('type', value);
      } else if (value === '') {
        this.removeAttribute('step');
      } 
    }

    get value() {
      const input = this.shadowRoot.getElementById('input-area');
      const isValid = input.checkValidity();
      return {
        valid: isValid,
        value: input.value
      };
    }

    set value(value) {
      const input = this.shadowRoot.getElementById('input-area');
      input.value = value;
    }

    constructor() {
      super();
      const shadowRoot = this.attachShadow({ mode: 'open'});
      shadowRoot.appendChild(template.content.cloneNode(true));
    }

    connectedCallback() {
      this.populateSuggestions();

      const input = this.shadowRoot.getElementById('input-area');
      input.addEventListener('focus', () => this.displaySuggestions());
      input.addEventListener('blur', () => {
        setTimeout(() => this.hideSuggestions(), 100);
      });
      input.addEventListener('click', () => this.displaySuggestions());

      this.shadowRoot.getElementById('suggestions-container')
      .addEventListener('mousedown', (event) => {
        event.preventDefault();
      });

      const arrow = this.shadowRoot.querySelector('expand-more');
      arrow.addEventListener('mousedown', (event) => {
        event.preventDefault();
        input.focus();
        this.displaySuggestions()
      });

      const slot = this.shadowRoot.querySelector('slot');
      slot.addEventListener('slotchange', () => {
        this.populateSuggestions();
      });
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (name === 'type' && this.isValidType(this.type)) {
        if (newValue !== 'number') {
          this.step = '';
        }
        this.setInputType();
      } else if (name === 'step' && this.type === 'number') {
        this.setStep();
      } else if (name === 'required') {
        const input = this.shadowRoot.getElementById('input-area');
        input.required = this.required;
      } else if (name === 'placeholder') {
        this.setPlaceholder();
      } else if (name === 'input-width') {
        this.style.setProperty('--input-width', newValue);
      }
    }

    setInputType() {
      const currentInputArea = this.shadowRoot.getElementById('input-area');
      if (this.type === 'textarea') {
        var newInputeArea = document.createElement('textarea');
        newInputeArea.classList.add('input-area');
        newInputeArea.id = 'input-area';
        currentInputArea.replaceWith(newInputeArea);
      } else if (currentInputArea.tagName.toLowerCase() === 'input') {
        var newInputeArea = currentInputArea;
        if (currentInputArea.type === 'number') {
          currentInputArea.removeAttribute('step');
        }
        currentInputArea.type = this.type;
      } else {
        var newInputeArea = document.createElement('input');
        newInputeArea.type = this.type;
        newInputeArea.classList.add('input-area');
        newInputeArea.id = 'input-area';
        currentInputArea.replaceWith(newInputeArea);
      }

      newInputeArea.required = this.required;
      if (this.type === 'number') {
        this.setStep();
      } else {
        this.step = '';
      }
      this.setPlaceholder();
    }
    
    setStep() {
      const inputArea = this.shadowRoot.getElementById('input-area');
      if (this.step) {
        inputArea.step = this.step;
      } else {
        inputArea.removeAttribute('step');
      }
    }

    setPlaceholder() {
      const inputArea = this.shadowRoot.getElementById('input-area');
      if (this.placeholder) {
        inputArea.placeholder = this.placeholder;
      } else {
        inputArea.removeAttribute('placeholder');
      }
    }

    populateSuggestions() {
      const container = this.shadowRoot.getElementById('suggestions-container');
      const arrow = this.shadowRoot.querySelector('expand-more');
      const options = this.querySelectorAll('option');

      if (options.length > 0) {
        container.classList.remove('keep-hidden');
        arrow.classList.remove('keep-hidden');

        const fragement = document.createDocumentFragment();
        options.forEach(option => {
          const div = document.createElement('div');
          div.textContent = option.value;
          div.addEventListener('click', () => {
            this.value = option.value;
            this.hideSuggestions();
          });
          fragement.appendChild(div);
        });
        container.replaceChildren(fragement);
      } else {
        container.classList.add('keep-hidden');
        arrow.classList.add('keep-hidden');
      }
    }

    displaySuggestions() {
      const container = this.shadowRoot.getElementById('suggestions-container');

      if (!container.classList.contains('hidden') || container.classList.contains('keep-hidden')) {
        return;
      }
      container.classList.remove('hidden');
      const scrollHeight = container.scrollHeight;
      container.classList.add('hidden');

      const input = this.shadowRoot.getElementById('input-area');
      const rect = input.getBoundingClientRect();
      const availableSpaceBelow = window.innerHeight - rect.bottom - 10;
      const availableSpaceAbove = rect.top;

      container.style.top = '';
      container.style.bottom = '';
      container.style.maxHeight = '';
      if (availableSpaceBelow > scrollHeight) {
        container.style.bottom = `-${scrollHeight + 10}px`;
      } else if (availableSpaceAbove > scrollHeight) {
        container.style.top = `-${scrollHeight + 10}px`;
      } else if (availableSpaceBelow > availableSpaceAbove) {
          container.style.bottom = `-${availableSpaceBelow}px`;
          container.style.maxHeight = `${availableSpaceBelow - 18}px`;
      } else {
        container.style.top = `-${availableSpaceAbove}px`;
        container.style.maxHeight = `${availableSpaceAbove - 18}px`;
      }

      container.classList.remove('hidden');
    }

    hideSuggestions() {
      const container = this.shadowRoot.getElementById('suggestions-container');
      container.classList.add('hidden');
    }

    flashWarning() {
      const input = this.shadowRoot.getElementById('input-area');
      input.classList.add('flash-warning');
      setTimeout(() => input.classList.remove('flash-warning'), 800);
    }
  }
);



//TODO
// suggestion arrow