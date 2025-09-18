import { hasRootFolderId, getExtensionFolders } from "/externs/bookmark.js";
import "/components/svg-icon/svg-icon.js";

const template = document.createElement('template');
template.innerHTML = /* html */ `
  <style>
    @import "/manager/sideNavigation/sideNavigation.css";
  </style>
  <div id="overlay" class="overlay"></div>
  <div id="wrapper" class="wrapper">
    <div class="close-container">
      <a href="/options/options.html" class="icon-button"><svg-icon type="settings"></svg-icon></a>
      <button id="close-button" class="icon-button"><svg-icon type="close" style="--icon-size: 30px"></svg-icon></button>
    </div>
    <div class="all-selection">
      <input type="radio" id="all-bookmarks" name="nav-item" value="" checked />
      <label for="all-bookmarks">Show All</label>
    </div>

    <hr />

    <div id="folders-container"></div>
  </div>
`;

customElements.define(
  'side-navigation',
  class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open'});
      this.shadowRoot.appendChild(template.content.cloneNode(true));
    }

    get selected() {
      const selectedElement = this.shadowRoot.querySelector('input[name="nav-item"]:checked');
      return selectedElement ? selectedElement.value : null;
    }

    set selected(value) {
      if (value === null) {
        const selectedElement = this.shadowRoot.querySelector('input[name="nav-item"]:checked');
        if (selectedElement) selectedElement.checked = false;
        return;
      }

      const inputs = this.shadowRoot.querySelectorAll('input[name="nav-item"]');
      for (const input of inputs) {
        if (input.value === value) {
          input.checked = true;
          break;
        }
      }
    }

    connectedCallback() {
      this.setAttribute('open', '');

      this.shadowRoot.getElementById('close-button')
        .addEventListener('click', () => this.closeNav());

      this.shadowRoot.getElementById('all-bookmarks')
        .addEventListener('change', (event) => this.inputChangeHandler(event));

      this.shadowRoot.getElementById('overlay')
        .addEventListener('click', () => this.closeNav());
    }

    openNav() {
      this.setAttribute('open', '');
    }

    closeNav() {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('navClosed'));
    }

    async renderFolders() {
      const hasRoot = await hasRootFolderId().catch(() => false);
      const extensionFolders =  hasRoot ? await getExtensionFolders() : new Map();
      const fragment = document.createDocumentFragment();

      for (const [id, title] of extensionFolders) {
        const inputOption = this.#createFolderOption(id, title);
        fragment.appendChild(inputOption);
      }

      const foldersContainer = this.shadowRoot.getElementById('folders-container');
      foldersContainer.replaceChildren(fragment);
    }

    #createFolderOption(id, folderName) {
      const container = document.createElement('div');

      const input = document.createElement('input');
      input.type = 'radio';
      input.id = id;
      input.name = 'nav-item';
      input.value = id;
      input.addEventListener('change', (event) => this.inputChangeHandler(event));

      const label = document.createElement('label');
      label.htmlFor = id;
      label.textContent = folderName;

      container.appendChild(input);
      container.append(label);
      return container;
    }

    inputChangeHandler(event) {
      this.dispatchEvent(
        new CustomEvent('navChange', {
          detail: event.target.value,
        })
      );
    }

    hasOption(option) {
      const inputs = this.shadowRoot.querySelectorAll('input[name="nav-item"]');
      let hasFoundOption = false;
      for (const input of inputs) {
        if (input.value === option) {
          hasFoundOption = true;
          break;
        }
      }
      return hasFoundOption;
    }
  }
)