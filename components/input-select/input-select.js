import "/components/svg/expand-more.js";

const template = document.createElement('template');
template.innerHTML = /* html */ `
  <style>
    @import "/components/input-select/input-select.css";
  </style>
  <input id="input-area" class="input-area" />
  <expand-more></expand-more>
  <div id="suggestions-wrapper" class="suggestions-wrapper hidden">
    <div id="suggestions-container" class="suggestions-container"></div>
  </div>
  <datalist id="options">
    <slot></slot>
  </datalist>
`;

customElements.define(
  'input-select',
  class extends HTMLElement {
    static get observedAttributes() {
      return ['type', 'required', 'placeholder', 'readonly', 'step', 'input-style'];
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

    get readonly() {
      return this.hasAttribute('readonly') && this.getAttribute('readonly') !== false;
    }

    set readonly(value) {
      value === true ? this.setAttribute('readonly', '') : this.removeAttribute('readonly');
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

    get inputWidth() {
      return this.style.getPropertyValue('--input-width');
    }

    set inputWidth(value) {
      if (value) {
        this.style.setProperty('--input-width', value);
      } else {
        this.style.removeProperty('--input-width');
      }
    }

    get inputStyle() {
      return this.getAttribute('input-style') || '';
    }

    set inputStyle(value) {
      if (value) {
        this.setAttribute('input-style', value);
      } else {
        this.removeAttribute('input-style');
      }
    }

    get value() {
      const input = this.shadowRoot.getElementById('input-area');
      if (this.type === 'textarea') {
        return input.innerText;
      } else {
        return input.value;
      }
    }

    set value(value) {
      const input = this.shadowRoot.getElementById('input-area');
      if (this.type === 'textarea') {
        input.innerHTML = value;
        if (this.required && !value.trim()) {
          input.classList.add('invalid');
        } else {
          input.classList.remove('invalid');
        }
      } else {
        input.value = value;
      }
    }

    constructor() {
      super();
      const shadowRoot = this.attachShadow({ mode: 'open'});
      shadowRoot.appendChild(template.content.cloneNode(true));
    }

    connectedCallback() {
      this.#populateSuggestions();
      this.#addInputListeners();

      this.shadowRoot.getElementById('suggestions-container')
      .addEventListener('mousedown', (event) => {
        event.preventDefault();
      });
      
      const input = this.shadowRoot.getElementById('input-area');
      const arrow = this.shadowRoot.querySelector('expand-more');
      arrow.addEventListener('mousedown', (event) => {
        event.preventDefault();
        input.focus();
        this.displaySuggestions()
      });

      const slot = this.shadowRoot.querySelector('slot');
      slot.addEventListener('slotchange', () => {
        this.#populateSuggestions();
      });
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (name === 'type' && this.isValidType(this.type)) {
        this.#setInputType(newValue);
      } else if (name === 'required') {
        this.#setRequired();
      } else if (name === 'step' && this.type === 'number') {
        this.#setStep();
      } else if (name === 'placeholder') {
        this.#setPlaceholder();
      } else if (name === 'readonly') {
        this.#setReadonly();
      } else if (name === 'input-style') {
        this.#setInputStyle();
      }
    }

    #addInputListeners() {
      const input = this.shadowRoot.getElementById('input-area');
      input.addEventListener('focus', () => this.displaySuggestions());
      input.addEventListener('blur', () => {
        setTimeout(() => this.hideSuggestions(), 100);
      });
      input.addEventListener('click', () => this.displaySuggestions());

      if (this.type === 'textarea') {
        input.addEventListener('keyup', () => {
          if (input.innerText === '\n') {
            input.innerHTML = '';
          }
          if (this.required) {
            if (this.value.trim()) {
              input.classList.remove('invalid');
            } else {
              input.classList.add('invalid');
            }
          }
        });
      }
    }

    #setInputType(newType) {
      const currentInputArea = this.shadowRoot.getElementById('input-area');
      let replaced = false;
      if (newType === 'textarea') {
        var newInputArea = document.createElement('span');
        currentInputArea.replaceWith(newInputArea);
        replaced = true;
      } else if (currentInputArea.tagName.toLowerCase() === 'input') {
        var newInputArea = currentInputArea;
        if (currentInputArea.type === 'number') {
          currentInputArea.removeAttribute('step');
        }
        currentInputArea.type = newType;  
      } else {
        var newInputArea = document.createElement('input');
        newInputArea.type = newType;
        currentInputArea.replaceWith(newInputArea);
        replaced = true;
      }

      if (replaced) {
        newInputArea.id = 'input-area';
        newInputArea.classList.add('input-area');
        this.#addInputListeners();
        this.#setRequired();
        this.#setReadonly();
        this.#setPlaceholder();
        this.#setInputStyle();
      }

      if (newType === 'number') this.#setStep();
    }
    
    #setStep() {
      const inputArea = this.shadowRoot.getElementById('input-area');
      if (this.step) {
        inputArea.step = this.step;
      } else {
        inputArea.removeAttribute('step');
      }
    }

    #setRequired() {
      const inputArea = this.shadowRoot.getElementById('input-area');
      if (this.type === 'textarea') {
        if (!this.required) {
          inputArea.classList.remove('invalid');
        } else if (!this.value.trim()) {
          inputArea.classList.add('invalid');
        }
      } else {
        inputArea.required = this.required;
        if (this.required) {
          inputArea.pattern = '.*\\S+.*';
        } else {
          inputArea.removeAttribute('pattern');
        }
      }
    }

    #setPlaceholder() {
      const inputArea = this.shadowRoot.getElementById('input-area');
      if (this.placeholder) {
        if (this.type === 'textarea') {
          inputArea.style.setProperty('--textarea-placeholder', `'${this.placeholder}'`);
        } else {
          inputArea.placeholder = this.placeholder;
        }
      } else {
        if (this.type === 'textarea') {
          inputArea.style.removeProperty('--textarea-placeholder');
        } else {
          inputArea.removeAttribute('placeholder');
        }
      }
    }

    #setReadonly() {
      const inputArea = this.shadowRoot.getElementById('input-area');
      if (this.type === 'textarea') {
        inputArea.contentEditable = this.readonly ? 'false' : 'plaintext-only';
      } else {
        inputArea.readOnly = this.readonly;
      }

      const wrapper = this.shadowRoot.getElementById('suggestions-wrapper');
      const arrow = this.shadowRoot.querySelector('expand-more');
      if (this.readonly) {
        wrapper.classList.add('read-only');
        arrow.classList.add('read-only');
      } else {
        wrapper.classList.remove('read-only');
        arrow.classList.remove('read-only');
      }
    }

    #setInputStyle() {
      const inputArea = this.shadowRoot.getElementById('input-area');
      inputArea.style.cssText = this.inputStyle || '';
      if (this.placeholder && this.type === 'textarea') {
        inputArea.style.setProperty('--textarea-placeholder', `'${this.placeholder}'`);
      }
    }

    #populateSuggestions() {
      const wrapper = this.shadowRoot.getElementById('suggestions-wrapper');
      const arrow = this.shadowRoot.querySelector('expand-more');
      const options = this.querySelectorAll('option');

      if (options.length > 0) {
        wrapper.classList.remove('keep-hidden');
        arrow.classList.remove('keep-hidden');
        
        const fragement = document.createDocumentFragment();
        options.forEach(option => {
          const div = document.createElement('div');
          div.textContent = option.value;
          div.addEventListener('click', () => {
            this.hideSuggestions();
            if (this.value === option.value) {
              return;
            }
            this.value = option.value;
            if (this.type === 'textarea') {
              const range = document.createRange();
              const inputArea = this.shadowRoot.getElementById('input-area');
              if (option.value) inputArea.classList.remove('invalid');
              range.selectNodeContents(inputArea);
              range.collapse(false);
              const selection = window.getSelection();
              selection.removeAllRanges();
              selection.addRange(range);
            }
          });
          fragement.appendChild(div);
        });

        const container = this.shadowRoot.getElementById('suggestions-container');
        container.replaceChildren(fragement);
      } else {
        wrapper.classList.add('keep-hidden');
        arrow.classList.add('keep-hidden');
      }
    }

    displaySuggestions() {
      const wrapper = this.shadowRoot.getElementById('suggestions-wrapper');
      const container = this.shadowRoot.getElementById('suggestions-container');

      if (
        !wrapper.classList.contains('hidden') || 
        wrapper.classList.contains('keep-hidden') || 
        this.readonly) {
        return;
      }
      wrapper.classList.remove('hidden');
      const scrollHeight = container.scrollHeight;
      wrapper.classList.add('hidden');

      const input = this.shadowRoot.getElementById('input-area');
      const rect = input.getBoundingClientRect();
      const availableSpaceBelow = window.innerHeight - rect.bottom - 10;
      const availableSpaceAbove = rect.top;

      wrapper.style.top = '';
      wrapper.style.bottom = '';
      wrapper.classList.remove('top', 'bottom');
      container.style.maxHeight = '';
      if (availableSpaceBelow > scrollHeight) {
        wrapper.style.bottom = `-${scrollHeight + 10}px`;
        wrapper.classList.add('bottom');
      } else if (availableSpaceAbove > scrollHeight) {
        wrapper.style.top = `-${scrollHeight + 10}px`;
        wrapper.classList.add('top');
      } else if (availableSpaceBelow > availableSpaceAbove) {
          wrapper.style.bottom = `-${availableSpaceBelow}px`;
          container.style.maxHeight = `${availableSpaceBelow - 18}px`;
          wrapper.classList.add('bottom');
      } else {
        wrapper.style.top = `-${availableSpaceAbove}px`;
        container.style.maxHeight = `${availableSpaceAbove - 18}px`;
        wrapper.classList.add('top');
      }

      wrapper.classList.remove('hidden');
    }

    hideSuggestions() {
      const wrapper = this.shadowRoot.getElementById('suggestions-wrapper');
      wrapper.classList.add('hidden');
    }

    checkValidity() {
      const input = this.shadowRoot.getElementById('input-area');
      if (this.type === 'textarea') {
        return this.value.trim() ? true : false;
      } else {
        return input.checkValidity();
      }
    }

    flashWarning() {
      const input = this.shadowRoot.getElementById('input-area');
      input.classList.add('flash-warning');
      setTimeout(() => input.classList.remove('flash-warning'), 800);
    }
  }
);