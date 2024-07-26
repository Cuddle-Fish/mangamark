import { bookmarkRegex, getFolderNames, getMangamarkSubTree } from "/externs/bookmark.js";
import "/components/svg/search-icon.js";
import "/components/themed-button/themed-button.js";

customElements.define(
  'find-title-screen',
  class extends HTMLElement {
    #changeFolderMode = false;

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
      this.attachShadow({mode: 'open'});
    }

    connectedCallback() {
      this.shadowRoot.innerHTML = /* html */ `
        <style>
          @import "/popup/find-title-screen/find-title-screen.css";
        </style>
        <div class="title-container">
          <span id="update-indicator">Update:</span>
          <span id="update-title" class="red-text">No Title Selected</span>
        </div>
        <div class="folder-container">
          <div>Folder: <span id="folder-name">&lt;Folder Name&gt;</span></div>
          <themed-button id="folder-button" variant="secondary" size="small">Change Folder</themed-button>
        </div>
        <div class="selection-container">
          <div id="description" class="description">Select Title to Update:</div>
          <div id="empty-indicator" class="empty-indicator">
            <span>No Bookmarks:</span> Selected folder is empty.
          </div>
          <div id="search-container" class="search-container">
            <input type="text" placeholder="Filter Titles" name="search-input" id="search-input" />
            <label for="search-input"><search-icon></search-icon></label>          
          </div>
          <div id="list-container" class="list-container"></div>
        </div>
        <div class="buttons-container">
          <themed-button id="cancel-button">Cancel</themed-button>
          <themed-button id="confirm-button" disabled>Confirm</themed-button>
        </div>
      `;

      this.setupSearch();
      this.setupButtons();
    }

    setupSearch() {
      const searchBar = this.shadowRoot.getElementById('search-input');
      const listContainer = this.shadowRoot.getElementById('list-container');

      searchBar.addEventListener("keyup", () => {
        const value = searchBar.value.toLowerCase();
        if (this.#changeFolderMode) {
          var listItems = Array.from(listContainer.getElementsByClassName('folder-selection'));
        } else {
          var listItems = Array.from(listContainer.getElementsByClassName('bookmark-title'));
        }
        if (value === '') {
          listItems.forEach(item => {
            item.classList.remove('hidden');
          });
        } else {
          listItems.forEach(item => {
            if (this.#changeFolderMode) {
              var itemName = item.textContent.toLowerCase();
            } else {
              var itemName = item.querySelector('span').textContent.toLowerCase();
            }
            if (itemName.includes(value)) {
              item.classList.remove('hidden');
            } else {
              item.classList.add('hidden');
            }
          });
        }
      });
    }

    setupButtons() {
      const folderButton = this.shadowRoot.getElementById('folder-button');
      const cancelButton = this.shadowRoot.getElementById('cancel-button');
      const confirmButton = this.shadowRoot.getElementById('confirm-button');

      folderButton.addEventListener('click', () => {
        this.changeMode(true);

        getFolderNames()
        .then((folderNames) => {
          if (folderNames.length === 0) {
            this.setEmptyIndicator(
              true, 
              `<span>No Folders:</span> Mangamark has no titles to update.`
            );
          } else {
            this.setEmptyIndicator(false);
          }
          const fragment = document.createDocumentFragment();
          folderNames.forEach(folder => {
            fragment.appendChild(this.createFolderListing(folder));
          });
          const listContainer = this.shadowRoot.getElementById('list-container');
          listContainer.replaceChildren(fragment);
        });
      });

      confirmButton.addEventListener('click', () => {
        this.dispatchEvent(
          new CustomEvent('closeTitleScreen', {
            detail: {
              action: 'confirm',
              updateTitle: this.selectedTitle,
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
              updateTitle: '',
            },
          })
        );
        this.closeScreen();
      });
    }

    closeScreen() {
      this.open = false;
      this.changeMode(false);
    }

    openScreen(currentFolder) {
      const folderName = this.shadowRoot.getElementById('folder-name');
      folderName.textContent = currentFolder;
      this.populateBookmarkList(currentFolder);
      this.open = true;
    }

    populateBookmarkList(folderName) {
      getMangamarkSubTree()
      .then((tree) => {
        const mangamarkContents = tree[0].children;
        let folder;
        for (const item of mangamarkContents) {
          if (item.children && item.title === folderName) {
            folder = item.children;
            break;
          }
        }

        const fragment = document.createDocumentFragment();
        const titles = folder ? this.getFolderTitles(folder) : [];

        if (titles.length === 0) {
          this.setEmptyIndicator(
            true, 
            `<span>No Bookmarks:</span> Selected folder is empty.`
          );
        } else {
          this.setEmptyIndicator(false);
        }

        titles.forEach(title => {
          fragment.appendChild(this.createBookmarkListing(title));
        });
        const listContainer = this.shadowRoot.getElementById('list-container');
        listContainer.replaceChildren(fragment);
      });
    }

    getFolderTitles(folder, getSubFolderTitle=true) {
      const titles = [];
      folder.forEach(item => {
        if (item.url) {
          const bookmark = this.getTitleAndChapter(item.title);
          if (bookmark) {
            titles.push({...bookmark, bookmarkTitle: item.title});
          }
        } else if (getSubFolderTitle && item.children) {
          titles.push(...this.getFolderTitles(item.children, false));
        }
      });
      return titles;
    }

    getTitleAndChapter(bookmarkTitle) {
      const matches = bookmarkTitle.match(bookmarkRegex());
      if (!matches) {
        return '';
      } else {
        return {contentTitle: matches[1], chapter: matches[2]};
      }
    }

    createBookmarkListing(bookmark) {
      const container = document.createElement('div');
      container.classList.add('bookmark-title');

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'update-option';
      input.value = bookmark.bookmarkTitle;
      input.id = bookmark.bookmarkTitle;

      const label = document.createElement('label');
      label.htmlFor = bookmark.bookmarkTitle;

      const span = document.createElement('span');
      span.textContent = `${bookmark.contentTitle} - ${bookmark.chapter}`;

      const doneIcon = document.createElement('done-icon');

      label.appendChild(span);
      label.appendChild(doneIcon);

      container.appendChild(input);
      container.appendChild(label);

      const updateTitle = this.shadowRoot.getElementById('update-title');
      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      input.addEventListener('change', () => {
        this.selectedTitle = input.value;
        updateTitle.textContent = bookmark.contentTitle;
        updateTitle.classList.remove('red-text');
        confirmButton.disabled = false;
      });
      return container;
    }

    createFolderListing(folderName) {
      const folderElement = document.createElement('div');
      folderElement.classList.add('folder-selection');
      folderElement.textContent = folderName;

      folderElement.addEventListener('click', () => {
        this.changeMode(false);
        this.openScreen(folderName);
      });
      return folderElement;
    }

    changeMode(folderMode) {
      this.selectedTitle = '';
      const updateTitle = this.shadowRoot.getElementById('update-title');
      updateTitle.textContent = 'No Title Selected';
      updateTitle.classList.add('red-text');
      const searchBar = this.shadowRoot.getElementById('search-input');
      searchBar.value = '';
      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      confirmButton.disabled = true;

      const updatepdateIndicator = this.shadowRoot.getElementById('update-indicator');
      const description = this.shadowRoot.getElementById('description');
      const searchInput = this.shadowRoot.getElementById('search-input');
      const folderButton = this.shadowRoot.getElementById('folder-button');
      if (folderMode) {
        this.#changeFolderMode = true;
        updatepdateIndicator.classList.add('blur-text');
        updateTitle.classList.add('blur-text');
        description.textContent = 'Select Folder:';
        searchInput.placeholder = 'Filter Folders';
        folderButton.disabled = true;
      } else {
        this.#changeFolderMode = false;
        updatepdateIndicator.classList.remove('blur-text');
        updateTitle.classList.remove('blur-text');
        description.textContent = 'Select Title to Update:';
        searchInput.placeholder = 'Filter Titles';
        folderButton.disabled = false;
      }
    }

    setEmptyIndicator(show, message='') {
      const searchContainer = this.shadowRoot.getElementById('search-container');
      const emptyIndicator = this.shadowRoot.getElementById('empty-indicator');
      emptyIndicator.innerHTML = message;
      if (show) {
        emptyIndicator.classList.remove('hidden');
        searchContainer.classList.add('hidden');
      } else {
        emptyIndicator.classList.add('hidden');
        searchContainer.classList.remove('hidden');
      }
    }
  }
)