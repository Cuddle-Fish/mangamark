import "/components/option-data/option-data.js";

const template = document.createElement('template');
template.innerHTML = /* html */ `
  <style>
    @import "/components/toggle-menu/toggle-menu.css";
  </style>
  <div>
    <slot></slot>  
  </div>
`;

customElements.define(
  'toggle-menu',
  class extends HTMLElement {
    static get observedAttributes() {
      return ['selected'];
    }

    get selected() {
      return this.getAttribute('selected');
    }
    
    set selected(value) {
      console.log('called set selected');
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

    constructor() {
      super();
      const shadowRoot = this.attachShadow({ mode: 'open'});
      shadowRoot.appendChild(template.content.cloneNode(true));
    }

    connectedCallback() {
      this.createOptions();
    }

    createOptions() {
      const options = this.querySelectorAll('option-data');
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
        }

        label.setAttribute('for', input.id);
        label.textContent = option.label;

        div.appendChild(input);
        div.appendChild(label);

        input.addEventListener('change', () => {
          this.setAttribute('selected', input.value);
          this.dispatchEvent(
            new CustomEvent('toggleMenuChange', {
              detail: input.value,
            })
          );
        });
      });
    }
  }
);