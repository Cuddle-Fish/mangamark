
import { bookmarkRegex, getExtensionSubtree } from "/externs/bookmark.js";
import "/components/themed-button/themed-button.js";
import "/components/svg-icon/svg-icon.js";
import "/popup/screens/find-title/bookmark-option.js";

const template = document.createElement('template');
template.innerHTML = /* html */ `
  <style>
    @import "/popup/screens/find-title/find-title.css";
  </style>
  <div id="create-container" class="hidden">
    <themed-button id="create-button">Create New Bookmark</themed-button>
    <hr />
  </div>

  <div class="search-wrapper">
    <div class="search-container">
      <input type=text placeholder="Search Bookmarks" id="search-input" />
      <button id="search-button"><svg-icon id="search-icon" type="search" style="--icon-size: 22px;"></svg-icon></button>
    </div>
  </div>

  <div id="list-container"></div>

  <div class="selection-display">
    <span>Update:</span>
    <span id="selected-title"></span>
  </div>

  <div class="update-buttons">
    <themed-button id="cancel-button">Cancel</themed-button>
    <themed-button id="confirm-update-button" disabled>Confirm</themed-button>
  </div>
`;

customElements.define(
  'find-title',
  class extends HTMLElement {
    #searchTimeout;
    #extensionBookmarks;
    #selectedId;
    #selectedOptionElement;
    #expandedBookmark;

    constructor() {
      super();
      const shadowRoot = this.attachShadow({ mode: 'open'});
      shadowRoot.appendChild(template.content.cloneNode(true));
    }

    connectedCallback() {
      this.#getBookmarkTree().then(() => this.#displayBookmarksOptions(this.#extensionBookmarks));

      this.shadowRoot.addEventListener('selectBookmark', (event) => this.#selectBookmarkHandler(event));
      this.shadowRoot.addEventListener('expandBookmark', (event) => this.#expandBookmarkHandler(event));

      const searchButton = this.shadowRoot.getElementById('search-button');
      searchButton.addEventListener('click', (event) => this.#searchButtonHandler(event));

      const searchInput = this.shadowRoot.getElementById('search-input');
      searchInput.addEventListener('input', (event) => this.#searchHandler(event));

      const createButton = this.shadowRoot.getElementById('create-button');
      createButton.addEventListener('click', (event) => this.#dispatchAction('create'));

      const cancelButton = this.shadowRoot.getElementById('cancel-button');
      cancelButton.addEventListener('click', (event) => this.#dispatchAction('cancel'));

      const confirmButton = this.shadowRoot.getElementById('confirm-update-button');
      confirmButton.addEventListener('click', (event) => this.#confirmUpdateHandler(event));
    }

    async #getBookmarkTree() {
      const tree = await getExtensionSubtree();
      this.#extensionBookmarks = new Map();

      for (const node of tree) {
        if (node.children) {
          const bookmarks = this.#getBookmarks(node.children, node.title, null);
          for (const mark of bookmarks) {
            this.#extensionBookmarks.set(mark.id, {
              title: mark.title,
              chapter: mark.chapter,
              folder: mark.folder,
              tags: mark.tags,
              readingStatus: mark.subFolder
            });
          }
        }
      }
    }

    #getBookmarks(tree, folder, subFolder) {
      const bookmarks = [];
      for (const node of tree) {
        if (node.url) {
          const matches = node.title.match(bookmarkRegex());
          if (!matches) {
            continue;
          }
          const [, title, chapter] = matches;
          const tags = matches[3] ? matches[3].split(',') : [];
          bookmarks.push({ id: node.id, title, chapter, folder, tags, subFolder});
        } else if (node.children  && !subFolder) {
          const validSubfolders = ['Completed', 'Plan to Read', 'Re-Reading', 'On Hold'];
          if (validSubfolders.includes(node.title)) {
            bookmarks.push(...this.#getBookmarks(node.children, folder, node.title));
          }
        }
      }

      return bookmarks;
    }

    #displayBookmarksOptions(bookmarks) {
      this.#selectedOptionElement = null;
      this.#expandedBookmark = null;
      const fragement = document.createDocumentFragment();
      for (const [id, info] of bookmarks) {
        const bookmarkOption = document.createElement('bookmark-option');
        bookmarkOption.setup(id, info);
        if (this.#selectedId && this.#selectedId === id) {
          bookmarkOption.selected = true;
          this.#selectedOptionElement = bookmarkOption;
        }
        fragement.appendChild(bookmarkOption);
      }

      const listContainer = this.shadowRoot.getElementById('list-container');
      listContainer.replaceChildren(fragement);
    }

    #selectBookmarkHandler(event) {
      event.stopPropagation();
      const selectedElement = event.detail.bookmarkElement;
      if (!this.#extensionBookmarks.has(selectedElement.id)) {
        throw new Error('Error: <bookmark-option> with invalid id was selected.');
      }

      if (this.#selectedOptionElement && this.#selectedOptionElement !== selectedElement) {
        this.#selectedOptionElement.selected = false;
      }

      this.#selectedId = selectedElement.id;
      this.#selectedOptionElement = selectedElement;
      selectedElement.selected = true;

      const titleDisplay = this.shadowRoot.getElementById('selected-title');
      const title = this.#extensionBookmarks.get(selectedElement.id).title;
      titleDisplay.textContent = title;

      const confirmButton = this.shadowRoot.getElementById('confirm-update-button');
      confirmButton.disabled = false;
    }

    #expandBookmarkHandler(event) {
      event.stopPropagation();
      const bookmarkElement = event.detail.bookmarkElement;
      if (this.#expandedBookmark) {
        this.#expandedBookmark.collapseInfo();
      }
      if (this.#expandedBookmark !== bookmarkElement) {
        this.#expandedBookmark = bookmarkElement;
        bookmarkElement.expandInfo();
      } else {
        this.#expandedBookmark = null;
      }
    }

    #searchHandler(event) {
      const searchInput = this.shadowRoot.getElementById('search-input');
      const searchValue = searchInput.value;
      const searchIcon = this.shadowRoot.getElementById('search-icon');
      if (searchValue === '' && searchIcon.type !== 'search') {
        searchIcon.type = 'search';
      } else if (searchValue !== '' && searchIcon.type !== 'close') {
        searchIcon.type = 'close';
      }

      if (this.#searchTimeout) {
        clearTimeout(this.#searchTimeout);
      }

      this.#searchTimeout = setTimeout(() => {
        const results = this.#searchBookmarks();
        this.#displayBookmarksOptions(results);        
      }, 300)
    }

    #searchBookmarks() {
      const searchInput = this.shadowRoot.getElementById('search-input');
      const searchValue = searchInput.value.trim().toLowerCase();
      if (!searchValue) return this.#extensionBookmarks;

      const tokens = searchValue.split(/\s+/);
      const results = new Map();
      for (const [id, info] of this.#extensionBookmarks) {
        const searchFields = [
          info.title.toLowerCase(),
          info.folder.toLowerCase(),
          ...info.tags.map(tag => tag.toLowerCase())
        ];

        const hasMatch = tokens.every(token => searchFields.some(field => field.includes(token)));
        if (hasMatch) {
          results.set(id, info);
        }
      }

      return results;
    }

    #searchButtonHandler(event) {
      const searchIcon = this.shadowRoot.getElementById('search-icon');
      const searchInput = this.shadowRoot.getElementById('search-input');
      if (searchIcon.type === 'search') {
        searchInput.focus();
      } else if (searchIcon.type === 'close') {
        searchInput.value = '';
        searchIcon.type = 'search';
        this.#displayBookmarksOptions(this.#extensionBookmarks);
      }
    }

    #dispatchAction(action, bookmarkInfo = undefined) {
      const detail = { action };
      if (bookmarkInfo !== undefined) {
        detail.bookmarkInfo = bookmarkInfo;
      }

      this.dispatchEvent(new CustomEvent('findTitleAction', {
        bubbles: true,
        composed: true,
        detail: detail
      }));
    }

    #confirmUpdateHandler(event) {
      if (!this.#extensionBookmarks.has(this.#selectedId)) {
        throw new Error('Error: <find-title> has bookmark ID that is invalid.');
      }

      const bookmarkInfo = { id: this.#selectedId, ...this.#extensionBookmarks.get(this.#selectedId)};
      this.#dispatchAction('update', bookmarkInfo);
    }

    showCreateButton(isVisible) {
      const createContainer = this.shadowRoot.getElementById('create-container');
      if (isVisible) {
        createContainer.classList.remove('hidden');
      } else {
        createContainer.classList.add('hidden');
      }
    }
  }
);