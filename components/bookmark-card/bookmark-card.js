import {
  getExtensionFolders,
  updateBookmarkTitle,
  moveBookmark,
  addFolder,
  removeBookmark
} from "/externs/bookmark.js";
import "/components/svg-icon/svg-icon.js";
import "/components/themed-button/themed-button.js";
import "/components/tag-input/tag-input.js";
import "/components/tag-elements/tag-li.js";

const cardTemplate = document.createElement('template');
cardTemplate.innerHTML = /* html */ `
  <div class="highlight-container">
    <div class="card-container">
      <a id="card-anchor" href="" class="card">
        <div class="link-container">
          <div id="bookmark-title" class="title">Bookmark Title</div>
          <div class="chapter">
            <span>Chapter</span>
            <span id="bookmark-chapter">##</span>
          </div>
          <div class="domain-date">
            <div id="bookmark-domain">Domain</div>
            <time id="bookmark-date-created"></time>
          </div>
        </div>
      </a>
      <div class="tags-and-edit-button-container">
        <ul id="bookmark-tags"></ul>
        <button id="edit-button" title="Edit Bookmark"><svg-icon type='edit'></svg-icon></button>
      </div>
    </div>
  </div>
  <div id="options-wrapper" class="options-wrapper"></div>
`;

const sheet = new CSSStyleSheet();
fetch('/components/bookmark-card/bookmark-card.css')
  .then((response) => response.text())
  .then((cssText) => sheet.replace(cssText));

const optionsTemplate = document.createElement('template');
optionsTemplate.innerHTML = /* html */ `
  <div class="options-container">
    <div class="info-container">
      <svg-icon type="info"></svg-icon>
      <span id="info-text">Select action to perform</span>
    </div>
    <div id="options-menu" class="edit-nav">
      <themed-button id="edit-title-option">Edit Title</themed-button>
      <themed-button id="open-tag-option">Edit Tags</themed-button>
      <themed-button id="change-folder-option">Change Folder</themed-button>
      <themed-button id="open-reading-status-option">Reading Status</themed-button>
      <themed-button id="open-delete-option" variant="warning">Delete Bookmark</themed-button>
      <themed-button id="close-button">Close</themed-button>
    </div>
    <input id="change-title-input" type="text" placeholder="Enter Title" class="hidden" />
    <tag-input id="edit-tags" class="hidden"></tag-input>
    <input list="existing-folders" id="change-folder-input" type="text" placeholder="Enter Folder" class="hidden" />
    <datalist id="existing-folders"></datalist>
    <div id="edit-reading-status" class="reading-status-container hidden">
      <div>
        <input type="radio" id="reading" name="reading-status-input" value="reading" />
        <label for="reading">Reading</label>
      </div>
      <div>
        <input type="radio" id="completed" name="reading-status-input" value="Completed" />
        <label for="completed" class="green-highlight">Completed</label>
      </div>
      <div>
        <input type="radio" id="plan-to-read" name="reading-status-input" value="Plan to Read" />
        <label for="plan-to-read" class="orange-highlight">Plan to Read</label>
      </div>
      <div>
        <input type="radio" id="re-reading" name="reading-status-input" value="Re-Reading" />
        <label for="re-reading" class="purple-highlight">Re-Reading</label>
      </div>
      <div>
        <input type="radio" id="on-hold" name="reading-status-input" value="On Hold" />
        <label for="on-hold" class="red-highlight">On Hold</label>
      </div>
    </div>
    <div id="warning-text" class="warning-text hidden">WARNING: This action is permanent</div>
    <div id="cancel-confirm-option" class="edit-options hidden">
      <themed-button id="confirm-button">Confirm</themed-button>
      <themed-button id="cancel-button">Cancel</themed-button>
    </div>
  </div>
`;

customElements.define(
  'bookmark-card',
  class extends HTMLElement {
    #bookmarkId;
    #folderName;
    #folderId;
    #editingOptions = Object.freeze({
      closed: 0,
      menu: 1,
      tags: 2,
      readingStatus: 3,
      delete: 4,
      title: 5,
      folder: 6
    });
    #editingState = this.#editingOptions.closed;

    static get observedAttributes() {
      return ['readingStatus'];
    }

    get readingStatus() {
      return this.getAttribute('readingStatus') || '';
    }

    set readingStatus(value) {
      const validStatuses = ['reading', 'Completed', 'Plan to Read', 'Re-Reading', 'On Hold'];
      if (value === '') {
        this.removeAttribute('readingStatus');
      } else if (validStatuses.includes(value)) {
        this.setAttribute('readingStatus', value);
      }
    }

    constructor() {
      super();
      const shadowRoot = this.attachShadow({ mode: 'open'});
      shadowRoot.appendChild(cardTemplate.content.cloneNode(true));
      shadowRoot.adoptedStyleSheets = [sheet];
    }

    connectedCallback() {
      this.setupCardEventListeners();
    }

    setupCardEventListeners() {
      const editButton = this.shadowRoot.getElementById('edit-button');
      editButton.addEventListener('click', (event) => this.toggleOptions());
    }

    toggleOptions() {
      const optionsWrapper = this.shadowRoot.getElementById('options-wrapper');
      if (this.#editingState === this.#editingOptions.closed) {
        this.#editingState = this.#editingOptions.menu;
        optionsWrapper.replaceChildren(optionsTemplate.content.cloneNode(true));
        this.setupOptionsEventListeners();
        const tagsInput = this.shadowRoot.getElementById('edit-tags');
        tagsInput.populateDatalist();
      } else {
        this.#editingState = this.#editingOptions.closed;
        optionsWrapper.replaceChildren();
      }
    }

    setupOptionsEventListeners() {
      const editTitleButton = this.shadowRoot.getElementById('edit-title-option');
      editTitleButton.addEventListener('click',(event) => this.selectEditOption(this.#editingOptions.title));
      this.setupChangeTitleInput();

      const editTagsButton = this.shadowRoot.getElementById('open-tag-option');
      editTagsButton.addEventListener('click', (event) => this.selectEditOption(this.#editingOptions.tags));
      this.setupChangeTagsInput();

      const changeFolderButton = this.shadowRoot.getElementById('change-folder-option');
      changeFolderButton.addEventListener('click', (event) => this.selectEditOption(this.#editingOptions.folder));
      this.setupChangeFolderInput();

      const editReadingStatusButton = this.shadowRoot.getElementById('open-reading-status-option');
      editReadingStatusButton.addEventListener('click', (event) => this.selectEditOption(this.#editingOptions.readingStatus));
      this.setupChangeReadingStatus();

      const editDeleteButton = this.shadowRoot.getElementById('open-delete-option');
      editDeleteButton.addEventListener('click', (event) => this.selectEditOption(this.#editingOptions.delete));

      const closeButton = this.shadowRoot.getElementById('close-button');
      closeButton.addEventListener('click', (event) => this.toggleOptions());

      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      confirmButton.addEventListener('click', (event) => this.#confirmButtonHandler());
      
      const cancelButton = this.shadowRoot.getElementById('cancel-button');
      cancelButton.addEventListener('click', (event) => this.selectEditOption(this.#editingOptions.menu));
    }

    setupChangeTitleInput() {
      const titleInput = this.shadowRoot.getElementById('change-title-input');
      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      titleInput.addEventListener('input', (event) => {
        const cleanedInput = event.target.value.replace(/\s+/g, ' ').trim();
        const title = this.shadowRoot.getElementById('bookmark-title').textContent;
        confirmButton.disabled = cleanedInput === '' || cleanedInput === title;
      });
    }

    setupChangeTagsInput() {
      const tagsInput = this.shadowRoot.getElementById('edit-tags');
      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      tagsInput.addEventListener('tagChange', (event) => {
        const bookmarkTags = this.shadowRoot.getElementById('bookmark-tags');
        const currentTags = Array.from(bookmarkTags.children, li => li.textContent);
        if (event.target.equals(currentTags)) {
          confirmButton.disabled = false;
        } else {
          confirmButton.disabled = true;
        }
      });
    }

    setupChangeFolderInput() {
      const folderInput = this.shadowRoot.getElementById('change-folder-input');
      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      folderInput.addEventListener('input', (event) => {
        const cleanedInput = event.target.value.replace(/\s+/g, ' ').trim();
        confirmButton.disabled = cleanedInput === '' || cleanedInput === this.#folderName;
      });
    }

    setupChangeReadingStatus() {
      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      const inputs = this.shadowRoot.querySelectorAll('input[name="reading-status-input"]');
      inputs.forEach(input => {
        input.addEventListener('change', () => {
          if (input.value === this.readingStatus) {
            confirmButton.disabled = true;
          } else {
            confirmButton.disabled = false;
          }
        });
      });
    }

    selectEditOption(newEditingOption) {
      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      switch (this.#editingState) {
        case this.#editingOptions.menu:
          const optionsMenu = this.shadowRoot.getElementById('options-menu');
          optionsMenu.classList.add('hidden');
          break;
        case this.#editingOptions.tags:
          const tagsInput = this.shadowRoot.getElementById('edit-tags');
          tagsInput.classList.add('hidden');
          break;
        case this.#editingOptions.readingStatus:
          const editReadingStatus = this.shadowRoot.getElementById('edit-reading-status');
          editReadingStatus.classList.add('hidden');
          break;
        case this.#editingOptions.delete:
          const warningText = this.shadowRoot.getElementById('warning-text');
          warningText.classList.add('hidden');
          confirmButton.variant = '';
          break;
        case this.#editingOptions.title:
          const titleInput = this.shadowRoot.getElementById('change-title-input');
          titleInput.classList.add('hidden');
          break;
        case this.#editingOptions.folder:
          const folderInput = this.shadowRoot.getElementById('change-folder-input');
          folderInput.classList.add('hidden');
          break;
        default:
          break;
      }

      const cancelConfirm = this.shadowRoot.getElementById('cancel-confirm-option');
      if (newEditingOption === this.#editingOptions.menu) {
        cancelConfirm.classList.add('hidden');
      } else {
        cancelConfirm.classList.remove('hidden');
      }

      this.#editingState = newEditingOption;
      confirmButton.disabled = true;
      switch (newEditingOption) {
        case this.#editingOptions.menu:
          this.#openOptionsMenu();
          break;
        case this.#editingOptions.tags:
          this.#openTagOption();
          break;
        case this.#editingOptions.readingStatus:
          this.#openReadingStatusOption();
          break;
        case this.#editingOptions.delete:
          this.#openDeleteOption();
          break;
        case this.#editingOptions.title:
          this.#openTitleOption();
          break;
        case this.#editingOptions.folder:
          this.#openFolderOption();
          break;
        default:
          break;
      }
    }

    #openOptionsMenu() {
      this.changeInfoText('Select action to perform');
      const optionsMenu = this.shadowRoot.getElementById('options-menu');
      optionsMenu.classList.remove('hidden');
    }

    #openTitleOption() {
      this.changeInfoText('Enter a new title.');
      const titleInput = this.shadowRoot.getElementById('change-title-input');
      const title = this.shadowRoot.getElementById('bookmark-title').textContent;
      titleInput.value = title;
      titleInput.classList.remove('hidden');
    }

    #openTagOption() {
      this.changeInfoText('Enter any desired tag name or click on an existing tag to remove.');
      const bookmarkTags = this.shadowRoot.getElementById('bookmark-tags');
      const tagList = Array.from(bookmarkTags.children, li => li.textContent);
      const tagsInput = this.shadowRoot.getElementById('edit-tags');
      tagsInput.replaceAllTags(tagList);
      tagsInput.clearInput();
      tagsInput.classList.remove('hidden');
    }

    async #openFolderOption() {
      this.changeInfoText('Enter the name of an existing or new folder to move this bookmark.');
      const folderInput = this.shadowRoot.getElementById('change-folder-input');
      folderInput.value = '';

      const folders = await getExtensionFolders();
      const fragment = document.createDocumentFragment();
      for (const title of folders.values()) {
        if (title !== this.#folderName) {
          const option = document.createElement('option');
          option.value = title;
          fragment.appendChild(option);
        }
      }
      const dataList = this.shadowRoot.getElementById('existing-folders');
      dataList.replaceChildren(fragment);
      folderInput.classList.remove('hidden');
    }

    #openReadingStatusOption() {
      this.changeInfoText('Select a new reading status.');
      const inputForReadingStatus = this.shadowRoot.querySelector(`input[name="reading-status-input"][value="${this.readingStatus}"]`);
      if (inputForReadingStatus) {
        inputForReadingStatus.checked = true;
      }
      const editReadingStatus = this.shadowRoot.getElementById('edit-reading-status');
      editReadingStatus.classList.remove('hidden');
    }

    #openDeleteOption() {
      this.changeInfoText('Confirm you wish to delete this bookmark');
      const warningText = this.shadowRoot.getElementById('warning-text');
      warningText.classList.remove('hidden');
      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      confirmButton.variant = 'warning';
      confirmButton.disabled = false;
    }

    changeInfoText(string) {
      const infoText = this.shadowRoot.getElementById('info-text');
      infoText.innerHTML = string;
    }

    #confirmButtonHandler() {
      const title = this.shadowRoot.getElementById('bookmark-title').textContent;
      const chapter = this.shadowRoot.getElementById('bookmark-chapter').textContent;

      switch(this.#editingState) {
        case this.#editingOptions.tags:
          this.#handleTagsChange(title, chapter);
          break;
        case this.#editingOptions.readingStatus:
          this.#handleReadingStatusChange(title);
          break;
        case this.#editingOptions.delete:
          this.#handleDeleteBookmark();
          break;
        case this.#editingOptions.title:
          this.#handleTitleChange(title, chapter);
          break;
        case this.#editingOptions.folder:
          this.#handleFolderChange();
          break;
        default:
          console.error('Error, bookmark-card confirm pressed in invalid state', this.#editingState);
      }
    }

    initialize(title, chapterNumber, url, date, readingStatus, activeTags, domain, bookmarkId, folderName, folderId) {
      this.#bookmarkId = bookmarkId;
      this.#folderName = folderName;
      this.#folderId = folderId;
      this.state = 'default';
      this.readingStatus = readingStatus;

      const dateObj = new Date(date);
      const displayDate = dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const datetimeValue = dateObj.toISOString();
      
      this.shadowRoot.getElementById('card-anchor').href = url;
      this.shadowRoot.getElementById('bookmark-title').textContent = title;

      this.shadowRoot.getElementById('bookmark-chapter').textContent = chapterNumber;
      this.shadowRoot.getElementById('bookmark-domain').textContent = domain;

      const dateCreatedElement = this.shadowRoot.getElementById('bookmark-date-created');
      dateCreatedElement.dateTime = datetimeValue;
      dateCreatedElement.textContent = displayDate;

      this.#replaceCardTags(activeTags);
    }

    #replaceCardTags(newTags) {
      const fragment = document.createDocumentFragment();
      newTags.forEach(tag => {
        const li = document.createElement('tag-li');
        li.textContent = tag;
        fragment.appendChild(li);
      });
      const bookmarkTags = this.shadowRoot.getElementById('bookmark-tags');
      bookmarkTags.replaceChildren(fragment);
    }

    async #handleTitleChange(oldTitle, chapter) {
      const titleInput = this.shadowRoot.getElementById('change-title-input');
      const newTitle = titleInput.value.replace(/\s+/g, ' ').trim();
      const bookmarkTags = this.shadowRoot.getElementById('bookmark-tags');
      const tags = Array.from(bookmarkTags.children, li => li.textContent);

      await updateBookmarkTitle(this.#bookmarkId, newTitle, chapter, tags, true);
      this.shadowRoot.getElementById('bookmark-title').textContent = newTitle;
      this.selectEditOption(this.#editingOptions.menu);
      this.dispatchEvent(
        new CustomEvent('titleChanged', {
          bubbles: true,
          composed: true,
          detail: {
            folder: this.#folderName,
            readingStatus: this.readingStatus,
            oldTitle: oldTitle,
            newTitle: newTitle,
          }
        })
      );
    }

    async #handleTagsChange(title, chapter) {
      const newTags = this.shadowRoot.getElementById('edit-tags').getTags();
      await updateBookmarkTitle(this.#bookmarkId, title, chapter, newTags, true);
      this.#replaceCardTags(newTags);
      this.selectEditOption(this.#editingOptions.menu);
      this.dispatchEvent(
        new CustomEvent('tagsChanged', {
          bubbles: true,
          composed: true,
          detail: {
            folder: this.#folderName,
            readingStatus: this.readingStatus,
            title: title,
            newTags: newTags
          }
        })
      );
    }

    async #handleFolderChange() {
      const folderInput = this.shadowRoot.getElementById('change-folder-input');
      const newFolderName = folderInput.value.replace(/\s+/g, ' ').trim();
      
      let folderId;
      const normalizedFolderName = newFolderName.toLowerCase();
      const folders = await getExtensionFolders();
      for (const [id, title] of folders) {
        if (title.trim().toLowerCase() === normalizedFolderName) {
          folderId = id;
          break;
        }
      }
      if (folderId === undefined) {
        folderId = await addFolder(newFolderName);
      }

      await moveBookmark(this.#bookmarkId, folderId, this.readingStatus);
    }

    async #handleReadingStatusChange(title) {
      const checkedInput = this.shadowRoot.querySelector('input[name="reading-status-input"]:checked');
      const newSubFolder = checkedInput.value;

      await moveBookmark(this.#bookmarkId, this.#folderId, newSubFolder, true);
      this.readingStatus = checkedInput.value;
      this.selectEditOption(this.#editingOptions.menu);
      this.dispatchEvent(
        new CustomEvent('readingStatusChanged', {
          bubbles: true,
          composed: true,
          detail: {
            folder: this.#folderName,
            title: title,
            newReadingStatus: checkedInput.value
          }
        })
      );
    }

    #handleDeleteBookmark() {
      removeBookmark(this.#bookmarkId);
    }
  }
);