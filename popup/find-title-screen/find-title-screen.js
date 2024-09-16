import { bookmarkRegex, getMangamarkSubTree } from "/externs/bookmark.js";
import "/components/svg/search-icon.js";
import "/components/themed-button/themed-button.js";

const template = document.createElement('template');
template.innerHTML = /* html */ ` 
  <style>
    @import "/popup/find-title-screen/find-title-screen.css";
  </style>
  <div class="title-container">
    <span id="update-indicator">Update:</span>
    <span id="update-title" class="red-text">No Title Selected</span>
  </div>
  <div class="selection-container">
    <div id="description" class="description">
      <span>Select Title to Update:</span>
    </div>
    <div id="search-container" class="search-container">
      <input type="text" placeholder="Search Folder and/or Title" name="search-input" id="search-input" list="folder-options" />
      <label for="search-input"><search-icon></search-icon></label>
      <datalist id="folder-options"></datalist>
    </div>
    <div id="list-container" class="list-container"></div>
    <div id="empty-indicator" class="empty-indicator hidden">No Bookmarks Found</div>
  </div>
  <div class="buttons-container">
    <themed-button id="cancel-button">Cancel</themed-button>
    <themed-button id="confirm-button" disabled>Confirm</themed-button>
  </div>
  `;

customElements.define(
  'find-title-screen',
  class extends HTMLElement {
    #bookmarkData;
    #selectedBookmark;

    static get observedAttributes() {
      return ['open'];
    }

    get open() {
      return this.hasAttribute('open') && this.getAttribute('open') !== false;
    }

    set open(value) {
      value === true ? this.setAttribute('open', '') : this.removeAttribute('open');
    }

    constructor() {
      super();
      const shadowRoot = this.attachShadow({ mode: 'open' });
      shadowRoot.appendChild(template.content.cloneNode(true));
    }

    connectedCallback() {
      this.setupButtons();
      this.shadowRoot.getElementById('search-input')
        .addEventListener('keyup', (event) => this.searchHandler(event));
    }

    searchHandler(event) {
      const searchValue = event.target.value;
      const searchTokens = searchValue ? searchValue.toLowerCase().split(/\s+/) : [];
      const listContainer = this.shadowRoot.getElementById('list-container');
      const listItems = Array.from(listContainer.getElementsByClassName('bookmark-title'));

      let hasBookmarks = false;
      if (!searchTokens.length) {
        hasBookmarks = true;
        listItems.forEach(item => {
          item.classList.remove('hidden');
        });
      } else {
        listItems.forEach(item => {
          const itemValue = item.querySelector('input').value.toLowerCase();
          if (searchTokens.every(token => itemValue.includes(token))) {
            hasBookmarks = true;
            item.classList.remove('hidden');
          } else {
            item.classList.add('hidden');
          }
        });
      }

      const emptyIndicator = this.shadowRoot.getElementById('empty-indicator');
      if (hasBookmarks) {
        emptyIndicator.classList.add('hidden');
      } else {
        emptyIndicator.classList.remove('hidden');
      }
    }

    setupButtons() {
      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      const cancelButton = this.shadowRoot.getElementById('cancel-button');

      confirmButton.addEventListener('click', () => {
        this.dispatchEvent(
          new CustomEvent('closeTitleScreen', {
            detail: {
              action: 'confirm',
              updateInfo: {...this.#selectedBookmark},
            },
          })
        );
        this.closeScreen();
      });

      cancelButton.addEventListener('click', () => {
        this.dispatchEvent(
          new CustomEvent('closeTitleScreen', {
            detail: {
              action: 'cancel',
              updateInfo: '',
            },
          })
        );
        this.closeScreen();
      });
    }

    closeScreen() {
      this.#selectedBookmark = {};
      const updateTitle = this.shadowRoot.getElementById('update-title');
      updateTitle.textContent = 'No Title Selected';
      updateTitle.classList.add('red-text');
      const searchInput = this.shadowRoot.getElementById('search-input');
      searchInput.value = '';
      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      confirmButton.disabled = true;
      this.open = false;
    }

    async openScreen() {
      await this.#getBookmarkData();
      this.#populateBookmarkList();
      this.#populateFolderOptions();
      this.open = true;
    }

    async #getBookmarkData() {
      this.#bookmarkData = {};
      const tree = await getMangamarkSubTree();
      for (const node of tree[0].children) {
        if (node.children) {
          const folderContents = {Reading: []};
          for (const folderNode of node.children) {
            if (folderNode.url) {
              const matches = folderNode.title.match(bookmarkRegex());
              if (!matches) {
                continue;
              }
              folderContents.Reading.push(folderNode.title);
            } else if (folderNode.children) {
              const validSubfolders = ['Completed', 'Plan to Read', 'Re-Reading', 'On Hold'];
              if (validSubfolders.includes(folderNode.title)) {
                folderContents[folderNode.title] = this.#getSubfolderBookmarks(folderNode.children);
              }
            }
          }
          this.#bookmarkData[node.title] = folderContents;
        }
      }
    }

    #getSubfolderBookmarks(tree) {
      const bookmarks = [];
      for (const node of tree) {
        if (node.url) {
          const matches = node.title.match(bookmarkRegex());
          if (!matches) {
            continue;
          }
          bookmarks.push(node.title)
        }
      }
      return bookmarks;
    }

    #populateBookmarkList() {
      const fragment = document.createDocumentFragment();

      let hasBookmarks = false;
      for (const folderName in this.#bookmarkData) {
        const subfolders = this.#bookmarkData[folderName];
        for (const subfolderName in subfolders) {
          const bookmarks = subfolders[subfolderName];
          bookmarks.forEach(title => {
            hasBookmarks = true;
            const listElement = this.createBookmarkListing(folderName, subfolderName, title);
            fragment.appendChild(listElement);
          });
        }
      }

      const list = this.shadowRoot.getElementById('list-container');
      list.replaceChildren(fragment);

      const emptyIndicator = this.shadowRoot.getElementById('empty-indicator');
      if (hasBookmarks) {
        emptyIndicator.classList.add('hidden');
      } else {
        emptyIndicator.classList.remove('hidden');
      }
    }

    createBookmarkListing(folder, readingStatus, bookmarkTitle) {
      const container = document.createElement('div');
      container.classList.add('bookmark-title');
      const matches = bookmarkTitle.match(bookmarkRegex());

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'update-option';
      input.value = folder + matches[1];
      input.id = folder + bookmarkTitle;

      const label = document.createElement('label');
      label.htmlFor = folder + bookmarkTitle;

      const infoContainer = document.createElement('div');

      const titleAndChapter = document.createElement('div');
      titleAndChapter.textContent = `${matches[1]} - ${matches[2]}`;
      titleAndChapter.classList.add('title-info');

      const folderInfoContainer = document.createElement('div');
      folderInfoContainer.classList.add('folder-info');

      const folderElement = document.createElement('div');
      folderElement.textContent = `Folder: ${folder}`;
      const readingStatusElement = document.createElement('div');
      readingStatusElement.textContent = `Reading Status: ${readingStatus}`;

      folderInfoContainer.appendChild(folderElement);
      folderInfoContainer.appendChild(readingStatusElement);

      infoContainer.appendChild(titleAndChapter);
      infoContainer.appendChild(folderInfoContainer);

      const doneIcon = document.createElement('done-icon');

      label.appendChild(infoContainer);
      label.appendChild(doneIcon);

      container.appendChild(input);
      container.appendChild(label);

      const updateTitle = this.shadowRoot.getElementById('update-title');
      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      input.addEventListener('change', () => {
        this.#selectedBookmark = {folder: folder, readingStatus: readingStatus, bookmarkTitle: bookmarkTitle};
        updateTitle.textContent = matches[1];
        updateTitle.classList.remove('red-text');
        confirmButton.disabled = false;
      });
      return container;
    }

    #populateFolderOptions() {
      const fragement = document.createDocumentFragment();
      for (const folder in this.#bookmarkData) {
        const option = document.createElement('option');
        option.value = folder;
        fragement.appendChild(option);
      }

      const folderOptions = this.shadowRoot.getElementById('folder-options');
      folderOptions.replaceChildren(fragement);
    }
  }
)