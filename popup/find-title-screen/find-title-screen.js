import { bookmarkRegex, getMangamarkSubTree } from "/externs/bookmark.js";
import "/components/svg/search-icon.js";
import "/components/themed-button/themed-button.js";

customElements.define(
  'find-title-screen',
  class extends HTMLElement {
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
          <span>Update:</span>
          <span id="update-title" class="red-text">No Title Selected</span>
        </div>
        <div class="selection-container">
          <div class="description">Select Title to Update:</div>
          <div class="search-container">
            <input type="text" placeholder="Search Titles" name="search-input" id="search-input" />
            <label for="search-input"><search-icon></search-icon></label>          
          </div>
          <div id="bookmark-list" class="bookmark-list"></div>
        </div>
        <div class="buttons-container">
          <themed-button id="cancel-button">Cancel</themed-button>
          <themed-button id="confirm-button">Confirm</themed-button>
        </div>
      `;

      this.setupSearch();
      this.setupButtons();
    }

    setupSearch() {
      const searchBar = this.shadowRoot.getElementById('search-input');
      const bookmarkList = this.shadowRoot.getElementById('bookmark-list');

      searchBar.addEventListener("keyup", () => {
        const value = searchBar.value.toLowerCase();
        console.log(value);        
        const bookmarks = Array.from(bookmarkList.getElementsByClassName('bookmark-title'));
        if (value === '') {
          bookmarks.forEach(bookmark => {
            bookmark.classList.remove('hidden');
          });
        } else {
          bookmarks.forEach(bookmark => {
            const input = bookmark.querySelector('input[type="radio"]').value.toLowerCase();
            if (input.includes(value)) {
              bookmark.classList.remove('hidden');
            } else {
              bookmark.classList.add('hidden');
            }
          });
        }
      });
    }

    setupButtons() {
      const cancelButton = this.shadowRoot.getElementById('cancel-button');
      const confirmButton = this.shadowRoot.getElementById('confirm-button');

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
      this.selectedTitle = '';
    }

    openScreen(currentFolder) {
      this.populateBookmarkList(currentFolder);
      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      confirmButton.disabled = true;
      const updateTitle = this.shadowRoot.getElementById('update-title');
      updateTitle.textContent = 'No Title Selected';
      updateTitle.classList.add('red-text');
      this.open = true;
    }

    populateBookmarkList(folderName) {
      getMangamarkSubTree()
      .then((tree) => {
        const mangamarkContents = tree[0].children;
        let folder;
        for (const item of mangamarkContents) {
          console.log(item);
          if (item.children && item.title === folderName) {
            folder = item.children;
            break;
          }
        }

        const fragment = document.createDocumentFragment();
        const titles = folder ? this.getFolderTitles(folder) : [];
        titles.forEach(title => {
          fragment.appendChild(this.createBookmarkListing(title));
        });
        const bookmarkList = this.shadowRoot.getElementById('bookmark-list');
        bookmarkList.replaceChildren(fragment);
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
      console.log(bookmark);
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
  }
)