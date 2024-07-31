import { getCustomFolderNames, addFolder, findFolderWithDomain, addDomain, moveDomain } from "/externs/folder.js";
import "/components/info-tooltip/info-tooltip.js";
import "/components/svg/search-icon.js";
import "/components/themed-button/themed-button.js";

const template = document.createElement('template');
template.innerHTML = /* html */ `
  <style>
    @import "/popup/change-folder/change-folder.css";
  </style>
  <div class="title-container">
    <div>
      <span>Domain:</span>
      <span id="domain-name">&lt;Domain Name&gt;</span>    
    </div>
    <info-tooltip>
      <div slot="title">Set custom folder:</div>
      <p slot="description">
        Select or create a folder that will be associated with this domain 
        (can be changed in manager).
        <br>
        All existing and future bookmarks under this domain will located in this folder.
      </p>
    </info-tooltip>
  </div>
  <div class="action-container">
    <div>
      <span id="action-title">Change Folder:</span>
      <span id="associated-folder">&lt;Folder Name&gt;</span>
    </div>
    <themed-button id="cancel-button">Cancel</themed-button>
  </div>
  <div class="selection-container">
    <div class="description">Select Folder:</div>
    <div id="search-container" class="search-container">
      <input type="text" placeholder="Search Folders" name="search-input" id="search-input" />
      <label for="search-input"><search-icon></search-icon></label>   
    </div>
    <div id="empty-indicator" class="empty-indicator">
      <span>No Folders:</span> No custom folders have been created. Must create a folder.
    </div>
    <div id="list-container" class="list-container"></div>
  </div>
  <div class="use-selected-container">
    <div class="selected-text">
      <span>Folder:</span>
      <span id="selected-folder" class="red-text">No Folder Selected</span>
    </div>
    <themed-button id="selected-button" disabled>Use Selected</themed-button>
  </div>
  <div class="creation-container">
    <input id="create-input" type="text" placeholder="Create Folder" title="Create unique custom folder"/>
    <themed-button id="create-folder-button" disabled>Create</themed-button>
  </div>
`;

customElements.define(
  'change-folder',
  class extends HTMLElement {
    #hasAssociatedFolder = false;
    #selectedFolder = '';

    get open() {
      return this.hasAttribute('open') && this.getAttribute('open') !== false;
    }

    set open(value) {
      value === true ? this.setAttribute('open', '') : this.removeAttribute('open');
    }

    constructor() {
      super();
      const shadowRoot = this.attachShadow({mode: 'open'});
      shadowRoot.appendChild(template.content.cloneNode(true));
    }

    connectedCallback() {
      const createInput = this.shadowRoot.getElementById('create-input');
      createInput.addEventListener('input', (event) => this.createInputListener(event));

      const createButton = this.shadowRoot.getElementById('create-folder-button');
      createButton.addEventListener('click', () => this.createButtonListener());

      const selectedButton = this.shadowRoot.getElementById('selected-button');
      selectedButton.addEventListener('click', () => this.selectedButtonListener());

      const cancelButton = this.shadowRoot.getElementById('cancel-button');
      cancelButton.addEventListener('click', () => this.cancelButtonListener());

      const searchInput = this.shadowRoot.getElementById('search-input');
      searchInput.addEventListener('keyup', (event) => this.searchListener(event));
    }

    createInputListener(event) {
      const input = event.target;
      const value = event.target.value;
      const createButton = this.shadowRoot.getElementById('create-folder-button');
      if (!value) {
        createButton.disabled = true;
        input.setCustomValidity('');
        return;
      }

      getCustomFolderNames()
      .then((folders) => {
        if (folders.has(value)) {
          createButton.disabled = true;
          input.setCustomValidity('Folder name already exists.');
        } else {
          createButton.disabled = false;
          input.setCustomValidity('');
        }
      });
    }

    createButtonListener() {
      const createInput = this.shadowRoot.getElementById('create-input');
      const newFolderName = createInput.value;
      const domain = this.shadowRoot.getElementById('domain-name').textContent;
      addFolder(newFolderName)
        .then(() => {
          if (this.#hasAssociatedFolder) {
            return moveDomain(newFolderName, domain);
          } else {
            return addDomain(newFolderName, domain);
          }
        })
        .then(() => {
          this.dispatchEvent(
            new CustomEvent('closeScreen', {
              detail: {
                action: 'change',
                folder: newFolderName,
              },
            })
          );
          this.closeScreen();
        });
    }

    selectedButtonListener() {
      const domain = this.shadowRoot.getElementById('domain-name').textContent;
      let promise;
      if (this.#hasAssociatedFolder) {
        promise = moveDomain(this.#selectedFolder, domain);
      } else {
        promise = addDomain(this.#selectedFolder, domain);
      }

      promise.then(() => {
        this.dispatchEvent(
          new CustomEvent('closeScreen', {
            detail: {
              action: 'change',
              folder: this.#selectedFolder,
            },
          })
        );
        this.closeScreen();
      });
    }

    cancelButtonListener() {
      this.dispatchEvent(
        new CustomEvent('closeScreen', {
          detail: {
            action: 'cancel',
            folder: '',
          },
        })
      );
      this.closeScreen();
    }

    searchListener(event) {
      const value = event.target.value.toLowerCase();
      const listContainer = this.shadowRoot.getElementById('list-container');
      const folders = Array.from(listContainer.getElementsByClassName('folder-container'));
      if (value === '') {
        folders.forEach(folder => {
          folder.classList.remove('hidden');
        });
      } else {
        folders.forEach(folder => {
          const name = folder.querySelector('span').textContent.toLowerCase();
          if (name.includes(value)) {
            folder.classList.remove('hidden');
          } else {
            folder.classList.add('hidden');
          }
        });
      } 
    }

    closeScreen() {
      const domainName = this.shadowRoot.getElementById('domain-name');
      domainName.textContent = '<Domain Name>';
      this.#selectedFolder = '';
      this.setAssociatedFolder();
      this.setEmptyIndicator(true);
      const searchInput = this.shadowRoot.getElementById('search-input');
      searchInput.value = '';
      const listContainer = this.shadowRoot.getElementById('list-container');
      listContainer.replaceChildren();
      const selectedFolderElement = this.shadowRoot.getElementById('selected-folder');
      selectedFolderElement.textContent = 'No Folder Selected';
      selectedFolderElement.classList.add('red-text');
      const selectedButton = this.shadowRoot.getElementById('selected-button');
      selectedButton.disabled = true;
      const createInput = this.shadowRoot.getElementById('create-input');
      createInput.value = '';
      const createButton = this.shadowRoot.getElementById('create-folder-button');
      createButton.disabled = true;
      this.open = false;
    }

    openScreen(domain) {
      const domainName = this.shadowRoot.getElementById('domain-name');
      domainName.textContent = domain;

      findFolderWithDomain(domain)
        .then((folder) => this.setAssociatedFolder(folder))
        .then(() => getCustomFolderNames())
        .then((folders) => {
          if (folders.size === 0) {
            this.setEmptyIndicator(true);
          } else {
            this.setEmptyIndicator(false);
          }

          const fragment = document.createDocumentFragment();
          folders.forEach(folder => {
            fragment.appendChild(this.folderElement(folder));
          });
          const listContainer = this.shadowRoot.getElementById('list-container');
          listContainer.replaceChildren(fragment);
        })
        .catch((error) => console.error('Error opening change folder screen', error));
      this.open = true;
    }

    setAssociatedFolder(folderName='') {
      const actionTitle = this.shadowRoot.getElementById('action-title');
      const associatedFolder = this.shadowRoot.getElementById('associated-folder');
      if (folderName) {
        this.#hasAssociatedFolder = true;
        actionTitle.textContent = 'Change Folder:';
        associatedFolder.textContent = folderName
        associatedFolder.classList.remove('hidden');
      } else {
        this.#hasAssociatedFolder = false;
        actionTitle.textContent = 'Add Custom Folder';
        associatedFolder.textContent = '';
        associatedFolder.classList.add('hidden');
      }
    }

    setEmptyIndicator(isEmpty) {
      const searchContainer = this.shadowRoot.getElementById('search-container');
      const emptyIndicator = this.shadowRoot.getElementById('empty-indicator');
      if (isEmpty) {
        searchContainer.classList.add('hidden');
        emptyIndicator.classList.remove('hidden');
      } else {
        searchContainer.classList.remove('hidden');
        emptyIndicator.classList.add('hidden');
      }
    }

    folderElement(folderName) {
      const container = document.createElement('div');
      container.classList.add('folder-container');
      
      const input = document.createElement('input');
      input.id = folderName;
      input.type = 'radio';
      input.name = 'folder-option';
      input.value = folderName;
      
      const label = document.createElement('label');
      label.htmlFor = folderName;
      
      const span = document.createElement('span');
      span.textContent = folderName;
      
      const doneIcon = document.createElement('done-icon');
      
      label.appendChild(span);
      label.appendChild(doneIcon);
      
      container.appendChild(input);
      container.appendChild(label);
      
      input.addEventListener('change', () => {
        this.#selectedFolder = folderName;
        console.log(`input event selected ${folderName} ... #selectedFolder = ${this.#selectedFolder}`);
        const selectedFolderElement = this.shadowRoot.getElementById('selected-folder');
        selectedFolderElement.textContent = folderName;
        selectedFolderElement.classList.remove('red-text');
        const selectedButton = this.shadowRoot.getElementById('selected-button');
        selectedButton.disabled = false;
      });
      
      return container;
    }
  }
)