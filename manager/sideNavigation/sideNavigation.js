import { getExtensionFolders } from "/externs/bookmark.js";
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
      const selectedElement = this.shadowRoot.querySelector(`input[name="nav-item"]:checked`);
      return selectedElement ? selectedElement.value : '';
    }

    connectedCallback() {
      this.setAttribute('open', '');

      this.shadowRoot.getElementById('close-button')
        .addEventListener('click', () => this.closeNav());

      this.shadowRoot.getElementById('all-bookmarks')
        .addEventListener('change', (event) => this.inputChangeHandler(event));

      this.shadowRoot.getElementById('overlay')
        .addEventListener('click', () => this.closeNav());

      this.renderFolders();
    }

    openNav() {
      this.setAttribute('open', '');
    }

    closeNav() {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('navClosed'));
    }

    async renderFolders() {
      const selectedId = this.shadowRoot.querySelector(`input[name="nav-item"]:checked`).id;
      const fragment = document.createDocumentFragment();
      const extensionFolders = await getExtensionFolders();

      let selectedRemoved = true;
      for (const [id, title] of extensionFolders) {
        let inputOption;
        if (selectedId === id) {
          inputOption = this.#createFolderOption(id, title, true);
          selectedRemoved = false;
        } else {
          inputOption = this.#createFolderOption(id, title);
        }

        fragment.appendChild(inputOption);
      }

      if (selectedRemoved) {
        const allBookmarks = this.shadowRoot.getElementById('all-bookmarks');
        allBookmarks.checked = true;        
      }

      const foldersContainer = this.shadowRoot.getElementById('folders-container');
      foldersContainer.replaceChildren(fragment);
    }

    #createFolderOption(id, folderName, selected = false) {
      const container = document.createElement('div');

      const input = document.createElement('input');
      input.type = 'radio';
      input.id = id;
      input.name = 'nav-item';
      input.value = folderName;
      input.addEventListener('change', (event) => this.inputChangeHandler(event));
      input.checked = selected;

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

    hideSelected() {
      this.setAttribute('hide-selected', '');
    }

    showSelected() {
      this.removeAttribute('hide-selected');
    }
  }
)