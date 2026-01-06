import {
  setRootFolderId,
  createRootFolder
} from '/externs/bookmark.js';
import '/components/set-extension-folder/folder-node.js';
import '/components/themed-button/themed-button.js';
import '/components/svg-icon/svg-icon.js';

const template = document.createElement('template');
template.innerHTML = /* html */ `
  <style>
    @import "/components/set-extension-folder/set-extension-folder.css";
  </style>
  
  <div id="tab-container">
    <button id="create-button" class="tab-button">
      <span>Create</span>
      <span class="small-text">(recommended)</span>
    </button>
    <button id="existing-button" class="tab-button">Use Existing Folder</button>
  </div>

  <div id="content-container">
    <div id="inner-container">
      <div id="selected-wrapper">
        <div id="select-description"></div>
        <span id="selected-folder"></span>      
      </div>

      <div id="tree-wrapper" tabindex=1>
        <div id="tree-container">
          <folder-node></folder-node>
        </div>
      </div>

      <div id="input-container">
        <label for="create-input">Name:</label>
        <input id="create-input" type="text" placeholder="New Folder Name" name="create-input"/>        
      </div>

      <div id="confirm-container">
        <div id="error-message"></div>
        <themed-button id="confirm-button">Set Folder</themed-button>
      </div>          
    </div>

    <div id="warning-overlay">
      <p>
        <strong>Warning:</strong> This options allows you to select an existing bookmark folder 
        to store all content saved by this extension. This is only recommended if you already
        have a folder created by this extension.
      </p>

      <div id="warning-button-container">
        <themed-button id="warning-button">I Understand</themed-button>
      </div>
    </div>

  </div>
`;

customElements.define(
  'set-extension-folder',
  class extends HTMLElement {
    #modes = ['create', 'existing'];
    #selectedNode = null;
    #invalidIds = [];

    static get observedAttributes() {
      return ['mode'];
    }

    get mode() {
      const mode = this.getAttribute('mode') || 'create';
      return this.#modes.includes(mode) ? mode : 'create';
    }

    set mode(value) {
      this.setAttribute('mode', value);
    }

    constructor() {
      super();
      const shadowRoot = this.attachShadow({ mode: 'open' });
      shadowRoot.appendChild(template.content.cloneNode(true));
    }

    connectedCallback() {
      this.buildTree();
      const treeContainer = this.shadowRoot.getElementById('tree-container');
      treeContainer.addEventListener('folder-selected', (event) => this.#selectFolderHandler(event));

      customElements.whenDefined('folder-node').then(() => {
        this.mode = 'create';
      });

      const createButton = this.shadowRoot.getElementById('create-button');
      createButton.addEventListener('click', () => this.mode = 'create');

      const existingButton = this.shadowRoot.getElementById('existing-button');
      existingButton.addEventListener('click', (event) => this.mode = 'existing');

      const warningButton = this.shadowRoot.getElementById('warning-button');
      warningButton.addEventListener('click', (event) => this.#acceptWarningHandler(event));

      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      confirmButton.addEventListener('click', (event) => this.#confirmButtonHandler(event));
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (name === 'mode' && newValue !== oldValue) {
        this.#switchMode();
      }
    }

    async buildTree(checkSelected = false) {
      const [tree] = await chrome.bookmarks.getTree();
      this.#invalidIds = tree.children.map(child => child.id);

      const fragment = document.createDocumentFragment();
      const selectedId = checkSelected && this.#selectedNode ? this.#selectedNode.id : null;

      let matchingNode = null;
      for (const child of tree.children) {
        if (child.id === 'mobile______') {
          continue;
        }
        const childNode = document.createElement('folder-node');
        const hasMatching = childNode.createNode(child, 0, selectedId);
        if (hasMatching) matchingNode = hasMatching;
        fragment.appendChild(childNode);
      }

      if (checkSelected && matchingNode) {
        this.#selectedNode = matchingNode;
      } else if (checkSelected) {
        this.clearSelected();
      }

      const treeContainer = this.shadowRoot.getElementById('tree-container');
      treeContainer.replaceChildren(fragment);
    }

    #switchMode() {
      this.clearSelected();

      const isCreate = this.mode === 'create';

      const selectDescription = this.shadowRoot.getElementById('select-description');
      selectDescription.textContent = isCreate ? 'Selected Location:' : 'Selected Extension Folder:';

      const inputContainer = this.shadowRoot.getElementById('input-container');
      inputContainer.style.display = isCreate ? 'flex' : 'none';

      const warningOverlay = this.shadowRoot.getElementById('warning-overlay');
      warningOverlay.style.display = isCreate ? 'none' : 'flex';
    }

    clearSelected() {
      if (this.#selectedNode) {
        this.#selectedNode.selected = false;
      }

      this.#selectedNode = null;
      const selectedFolderElement = this.shadowRoot.getElementById('selected-folder');
      selectedFolderElement.textContent = '';
      this.#displayError('');
      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      confirmButton.disabled = false;
    }

    #selectFolderHandler(event) {
      event.stopPropagation();
      const node = event.detail.selectedNode;
      if (this.#selectedNode && this.#selectedNode !== node) {
        this.#selectedNode.selected = false;
      }
      this.#selectedNode = node;
      node.selected = true;

      const selectedFolderElement = this.shadowRoot.getElementById('selected-folder');
      selectedFolderElement.textContent = node.title;

      if (this.mode === 'existing') {
        const isInvalid = this.#invalidIds.includes(node.id);
        const confirmButton = this.shadowRoot.getElementById('confirm-button');
        confirmButton.disabled = isInvalid;
        const errorMessage = isInvalid ? `Can not use '${node.title}' as extension folder` : '';
        this.#displayError(errorMessage);
      }
    }

    #acceptWarningHandler(event) {
      const warningOverlay = this.shadowRoot.getElementById('warning-overlay');
      warningOverlay.style.display = 'none';
    }

    #confirmButtonHandler(event) {
      let isInvalid = false;
      if (this.#selectedNode === null) {
        isInvalid = true;
        const treeWrapper = this.shadowRoot.getElementById('tree-wrapper');
        this.#flashInvalid(treeWrapper);
      }

      // sanity check
      if (this.mode === 'existing' && this.#selectedNode && this.#invalidIds.includes(this.#selectedNode.id)) {
        isInvalid = true;
        console.error('Error: confirm button should be disabled if in existing mode and id is invalid');
      }

      if (this.mode === 'create') {
        const input = this.shadowRoot.getElementById('create-input');
        const folderName = input.value.trim();
        if (folderName === '') {
          isInvalid = true;
          this.#flashInvalid(input);
        }        
      }

      if (isInvalid) return;
      else this.#setExtensionFolder();
    }

    #flashInvalid(element) {
      element.classList.add('flash');
      setTimeout(() => element.classList.remove('flash'), 1200);
    }

    #displayError(message) {
      const errorElement = this.shadowRoot.getElementById('error-message');
      errorElement.textContent = message;
    }

    async #setExtensionFolder() {
      this.#displayError('');

      let folderName = '';
      if (this.mode === 'existing') {
        const selectedFolderElement = this.shadowRoot.getElementById('selected-folder');
        folderName = selectedFolderElement.textContent;
        try {
          await setRootFolderId(this.#selectedNode.id);
        } catch (error) {
          console.error(error);
          this.#displayError('Error: Could not set extension folder');
          return;
        }
      } else {
        const input = this.shadowRoot.getElementById('create-input');
        const inputName = input.value.trim();
        folderName = inputName;
        try {
          await createRootFolder(inputName, this.#selectedNode.id);
        } catch (error) {
          console.error(error);
          this.#displayError('Error: Could not set extension folder');
          return;
        }
      }

      this.dispatchEvent(new CustomEvent('folderSet', {
        bubbles: true,
        composed: true,
        detail: { title: folderName }
      }));
    }
  }
);