import "/components/tag-elements/tag-button.js";
import { hasRootFolderId, getExtensionTags } from "/externs/bookmark.js";

const template = document.createElement('template');
template.innerHTML = /* html */ `
  <style>
    @import "/components/tag-input/tag-input.css";
  </style>
  <div class="input-container">
    <input id="tag-input" placeholder="Add Tag" list="existing-tags"/>
    <datalist id="existing-tags"></datalist>
  </div>

  <div class="description-container">
    <div>
      Press <b>enter</b> or <b>comma</b> to add a tag
    </div>
    <div>
      Press <b>backspace</b> when input is empty to edit last tag
    </div>
  </div>
`;

customElements.define(
  'tag-input',
  class extends HTMLElement {
    #tagList = [];
    #event = new Event('tagChange');

    static get observedAttributes() {
      return ['inputHidden'];
    }

    get inputHidden() {
      return this.hasAttribute('inputHidden') && this.getAttribute('inputHidden') !== false;
    }

    set inputHidden(value) {
      value === true ? this.setAttribute('inputHidden', '') : this.removeAttribute('inputHidden');
    }

    constructor() {
      super();
      const shadowRoot = this.attachShadow({ mode: 'open'});
      shadowRoot.appendChild(template.content.cloneNode(true));
    }

    connectedCallback() {
      const input = this.shadowRoot.getElementById('tag-input');
      this.populateDatalist();
      input.addEventListener('keydown', (event) => this.inputKeyListener(event));
    }

    inputKeyListener(event) {
      const inputValue = event.target.value;
      if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault();
        const tagName = inputValue.replace(/[\s,]+/g, ' ').trim().toLowerCase();
        if (tagName !== '') {
          this.addTag(tagName);
        }
        event.target.value = '';
      }
      if (event.key === 'Backspace' && inputValue === '' && this.#tagList.length !== 0) {
        event.preventDefault();
        const tagName = this.removeLastTag();
        event.target.value = tagName
      }
    }

    async populateDatalist() {
      const hasRoot = await hasRootFolderId();
      const tags = hasRoot ? await getExtensionTags() : new Set();
      const fragment = document.createDocumentFragment();
      tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        if (this.#tagList.includes(tag)) {
          option.disabled = true;
        }
        fragment.appendChild(option);
      });
      const datalist = this.shadowRoot.getElementById('existing-tags');
      datalist.replaceChildren(fragment);
    }

    getTags() {
      return [...this.#tagList];
    }

    equals(tags) {
      if (!Array.isArray(tags)) {
        throw new Error('tag-input.equals() recieved non array argument');
      }

      if (this.#tagList.length !== tags.length) {
        return true;
      }

      for (let i = 0; i < this.#tagList.length; i++) {
        if (this.#tagList[i] !== tags[i]) {
          return true;
        }
      }

      return false;
    }

    replaceAllTags(tags) {
      this.#tagList = [...tags];
      const tagElements = this.shadowRoot.querySelectorAll('tag-button');
      tagElements.forEach(tagElement => tagElement.remove());

      const dataList = this.shadowRoot.getElementById('existing-tags');
      const options = dataList.querySelectorAll('option');
      options.forEach(option => option.disabled = false);
      
      const input = this.shadowRoot.getElementById('tag-input');
      tags.forEach(tag => {
        const tagElement = this.createTagElement(tag);
        input.insertAdjacentElement('beforebegin', tagElement);
        this.toggleOption(tag, true);
      });
    }
    
    addTag(tagName) {
      if (this.#tagList.includes(tagName)) {
        this.indicateTag(tagName);
        return;
      }
      this.#tagList.push(tagName);
      
      const tagElement = this.createTagElement(tagName);
      const input = this.shadowRoot.getElementById('tag-input');
      input.insertAdjacentElement('beforebegin', tagElement);
      this.toggleOption(tagName, true);
      this.dispatchEvent(this.#event);
    }
    
    indicateTag(tagName) {
      const tagElements = this.shadowRoot.querySelectorAll('tag-button');
      for (const tagButton of tagElements) {
        if (tagButton.textContent === tagName) {
          tagButton.animate();
          break;
        }
      }
    }

    removeLastTag() {
      const tagName = this.#tagList.pop();
      const tagElements = this.shadowRoot.querySelectorAll('tag-button');
      for (const tagButton of tagElements) {
        if (tagButton.textContent === tagName) {
          this.toggleOption(tagName, false);
          tagButton.remove();
          break;
        }
      }
      this.dispatchEvent(this.#event);
      return tagName;
    }

    createTagElement(tagName) {
      const tagElement = document.createElement('tag-button');
      tagElement.textContent = tagName;

      tagElement.addEventListener('click', () => {
        const index = this.#tagList.indexOf(tagName);
        if (index !== -1) {
          this.#tagList.splice(index, 1);
        }
        this.toggleOption(tagName, false);
        tagElement.remove();
        this.dispatchEvent(this.#event);
      });

      return tagElement;
    }

    toggleOption(tagName, isDisabled) {
      const datalist = this.shadowRoot.getElementById('existing-tags');
      const option = Array.from(datalist.options).find(option => option.value === tagName);
      if (option) {
        option.disabled = isDisabled;
      }
    }

    clearInput() {
      const input = this.shadowRoot.getElementById('tag-input');
      input.value = '';
    }
  }
);