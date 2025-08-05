import "/components/svg-icon/svg-icon.js";

const template = document.createElement('template');
template.innerHTML = /* html */ `
  <style>
    @import "/popup/screens/find-title/bookmark-option.css";
  </style>
  <div class="main-container">
    <button id="select-button"></button>
    <button id="expand-button"><svg-icon id="expand-arrow" type="expand-more"></svg-icon></button>
  </div>

  <div id="info-wrapper" class="hidden">
    <div class="info-container">
      <div class="folder-reading-container">
        <div>
          <span>Folder:</span>
          <span id="folder-display"></span>
        </div>
        <span id="reading-status-display"></span>
      </div>
      <div class="tags-container">
        <span>Tags:</span>
        <span id="tags-list"></span>
      </div>
    </div>
  </div>
`;

customElements.define(
  'bookmark-option',
  class extends HTMLElement {
    #id;

    get id() {
      return this.#id;
    }

    get selected() {
      return this.hasAttribute('selected') && this.getAttribute('selected') !== false;
    }

    set selected(value) {
      value === true ? this.setAttribute('selected', '') : this.removeAttribute('selected');
    }

    constructor() {
      super();
      const shadowRoot = this.attachShadow({ mode: 'open'});
      shadowRoot.appendChild(template.content.cloneNode(true));
    }

    connectedCallback() {
      const selectButton = this.shadowRoot.getElementById('select-button');
      selectButton.addEventListener('click', (event) => this.#selecteHandler(event));

      const expandButton = this.shadowRoot.getElementById('expand-button');
      expandButton.addEventListener('click', (event) => this.#expandHandler(event));
    }

    setup(id, info) {
      this.#id = id;
      
      const selectButton = this.shadowRoot.getElementById('select-button');
      selectButton.textContent = `${info.title} - ${info.chapter}`;

      const folderDisplay = this.shadowRoot.getElementById('folder-display');
      folderDisplay.textContent = info.folder;

      const readingStatusDisplay = this.shadowRoot.getElementById('reading-status-display');
      readingStatusDisplay.textContent = info.readingStatus || "Reading";

      const tagsList = this.shadowRoot.getElementById('tags-list');
      tagsList.textContent = info.tags.join(', ');
    }

    #selecteHandler(event) {
      this.dispatchEvent(new CustomEvent('selectBookmark', {
        bubbles: true,
        composed: true,
        detail: { bookmarkElement: this }
      }));
    }

    #expandHandler(event) {
      this.dispatchEvent(new CustomEvent('expandBookmark', {
        bubbles: true,
        composed: true,
        detail: { bookmarkElement: this }
      }));
    }

    expandInfo() {
      const expandArrow = this.shadowRoot.getElementById('expand-arrow');
      const infoWrapper = this.shadowRoot.getElementById('info-wrapper');
      expandArrow.type = 'expand-less';
      infoWrapper.classList.remove('hidden');
    }

    collapseInfo() {
      const expandArrow = this.shadowRoot.getElementById('expand-arrow');
      const infoWrapper = this.shadowRoot.getElementById('info-wrapper');
      expandArrow.type = 'expand-more';
      infoWrapper.classList.add('hidden');
    }
  }
);