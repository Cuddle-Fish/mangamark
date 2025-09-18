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

const sheet = new CSSStyleSheet();
fetch('/components/bookmark-card/bookmark-card.css')
  .then((response) => response.text())
  .then((cssText) => sheet.replace(cssText));

const template = document.createElement('template');
template.innerHTML = /* html */ `
  <div class="highlight-wrapper">
    <div class="card-container">
      <a id="card-anchor" href="">
        <div>
          <div class="title-container">
            <div id="title">Lorem ipsum dolor sit amet</div>
            <div id="reading-status" class="alignment-wrapper"></div>
          </div>
          <div class="alignment-wrapper">
            <time id="date-read">month, day, year</time>
          </div>
        </div>
        <div>
          <div>
            <span>Chapter</span>
            <span id="chapter-number">##</span>
          </div>
          <div class="domain-container">
            <svg-icon type="link"></svg-icon>
            <span id="domain">domain name</span>
          </div>
        </div>
        <ul id="tags"><li>time-loop</li><li>magic</li></ul>
      </a>
      <button id="toggle-options">
        <span>Edit</span>
        <svg-icon type="expand-more"></svg-icon>
      </button>
    </div>
  </div>
  <div id="options-wrapper"></div>
`;

const optionsTemplate = document.createElement('template');
optionsTemplate.innerHTML = /* html */ `
  <div id="options-container">
    <div id="options-menu">
      <themed-button id="title-option">Edit Title</themed-button>
      <themed-button id="tag-option">Add/Remove Tags</themed-button>
      <themed-button id="folder-option">Change Folder</themed-button>
      <themed-button id="reading-status-option">Set Reading Status</themed-button>
      <themed-button id="delete-option" variant="warning">Delete Bookmark</themed-button>
    </div>
    <input id="title-input" type="text" placeholder="Enter Title" class="hidden" />
    <tag-input id="edit-tags" class="hidden"></tag-input>
    <input id="folder-input" list="folder-autofill" type="text" placeholder="Enter Folder" class="hidden" />
    <datalist id="folder-autofill"></datalist>
    <div id="reading-status-options" class="hidden">
      <input type="radio" id="reading" name="reading-status-input" value="reading" />
      <label for="reading">Reading</label>
      <input type="radio" id="completed" name="reading-status-input" value="Completed" />
      <label for="completed" class="green-highlight">Completed</label>
      <input type="radio" id="plan-to-read" name="reading-status-input" value="Plan to Read" />
      <label for="plan-to-read" class="orange-highlight">Plan to Read</label>
      <input type="radio" id="re-reading" name="reading-status-input" value="Re-Reading" />
      <label for="re-reading" class="purple-highlight">Re-Reading</label>
      <input type="radio" id="on-hold" name="reading-status-input" value="On Hold" />
      <label for="on-hold" class="red-highlight">On Hold</label>
    </div>
    <div id="warning-text" class="hidden">WARNING: This action is permanent</div>
    <div id="option-buttons" class="hidden">
      <themed-button id="confirm-button">Confirm</themed-button>
      <themed-button id="cancel-button">Cancel</themed-button>
    </div>
  </div>
`;

customElements.define(
  'bookmark-card',
  class extends HTMLElement {
    #bookmarkId;
    #date;
    #folderName;
    #folderId;

    #stateEnum = Object.freeze({
      DEFAULT: 0,
      MENU: 1,
      TITLE: 2,
      TAGS: 3,
      FOLDER: 4,
      READING_STATUS: 5,
      DELETE: 6
    });
    #currentState = this.#stateEnum.DEFAULT;
    #states = {
      [this.#stateEnum.DEFAULT]: {
        enter: this.#enterDefault,
        exit: this.#exitDefault
      },
      [this.#stateEnum.MENU]: {
        enter: this.#enterMenu,
        exit: this.#exitMenu
      },
      [this.#stateEnum.TITLE]: {
        enter: this.#enterTitle,
        exit: this.#exitTitle,
        confirm: this.#changeTitle
      },
      [this.#stateEnum.TAGS]: {
        enter: this.#enterTags,
        exit: this.#exitTags,
        confirm: this.#changeTags
      },
      [this.#stateEnum.FOLDER]: {
        enter: this.#enterFolder,
        exit: this.#exitFolder,
        confirm: this.#changeFolder
      },
      [this.#stateEnum.READING_STATUS]: {
        enter: this.#enterReadingStatus,
        exit: this.#exitReadingStatus,
        confirm: this.#changeReadingStatus
      },
      [this.#stateEnum.DELETE]: {
        enter: this.#enterDelete,
        exit: this.#exitDelete,
        confirm: this.#handleDelete
      }
    };

    #toggleOptions;
    #optionsWrapper;

    get title() {
      return this.shadowRoot.getElementById('title').textContent;
    }

    get date() {
      return this.#date;
    }

    get readingStatus() {
      return this.getAttribute('reading-status') || 'reading';
    }

    set readingStatus(value) {
      const validStatuses = ['reading', 'Completed', 'Plan to Read', 'Re-Reading', 'On Hold'];
      if (value === '') {
        this.removeAttribute('reading-status');
      } else if (validStatuses.includes(value)) {
        this.setAttribute('reading-status', value);
      }
    }

    constructor() {
      super();
      const shadowRoot = this.attachShadow({ mode: 'open'});
      shadowRoot.appendChild(template.content.cloneNode(true));
      shadowRoot.adoptedStyleSheets = [sheet];

      this.#toggleOptions = shadowRoot.getElementById('toggle-options');
      this.#optionsWrapper = shadowRoot.getElementById('options-wrapper');
      this.#toggleOptions.addEventListener('click', () => this.#toggleHandler());
    }

    setup(
      title,
      chapter,
      tags,
      url,
      date,
      readingStatus,
      bookmarkId,
      folderName,
      folderId
    ) {
      this.shadowRoot.getElementById('title').textContent = title;
      this.shadowRoot.getElementById('chapter-number').textContent = chapter;
      this.#renderTags(tags);
      this.shadowRoot.getElementById('card-anchor').href = url;

      let domain = new URL(url).hostname;
      if (domain.startsWith('www.')) domain = domain.substring(4);
      this.shadowRoot.getElementById('domain').textContent = domain;

      this.#date = date;
      const dateObj = new Date(date);
      const displayDate = dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const datetimeValue = dateObj.toISOString();
      const dateRead = this.shadowRoot.getElementById('date-read');
      dateRead.dateTime = datetimeValue;
      dateRead.textContent =displayDate;

      this.readingStatus = readingStatus;

      this.#bookmarkId = bookmarkId;
      this.#folderName = folderName;
      this.#folderId = folderId;
    }

    #renderTags(newTags) {
      const fragment = document.createDocumentFragment();
      newTags.forEach(tag => {
        const li = document.createElement('li');
        li.textContent = tag;
        fragment.appendChild(li);
      });
      const tags = this.shadowRoot.getElementById('tags');
      tags.replaceChildren(fragment);
    }

    #setState(newState) {
      if (newState === this.#currentState) return;
      const oldState = this.#currentState;
      this.#states[oldState]?.exit.call(this);
      this.#currentState = newState;
      this.#states[newState]?.enter.call(this);
    }

    #enterDefault() {
      this.#optionsWrapper.replaceChildren();
      this.#toggleOptions.classList.remove('open');
      const span = this.#toggleOptions.querySelector('span');
      const icon = this.#toggleOptions.querySelector('svg-icon');
      span.textContent = 'Edit';
      icon.type = 'expand-more';
    }

    #exitDefault() {
      this.#optionsWrapper.replaceChildren(optionsTemplate.content.cloneNode(true));
      this.#toggleOptions.classList.add('open');
      const span = this.#toggleOptions.querySelector('span');
      const icon = this.#toggleOptions.querySelector('svg-icon');
      span.textContent = 'Close';
      icon.type = 'expand-less';

      const editTags = this.shadowRoot.getElementById('edit-tags');
      editTags.populateDatalist();

      this.#addOptionListeners();
    }

    #enterMenu() {
      const optionsMenu = this.shadowRoot.getElementById('options-menu');
      optionsMenu.classList.remove('hidden');
    }

    #exitMenu() {
      const optionsMenu = this.shadowRoot.getElementById('options-menu');
      optionsMenu.classList.add('hidden');
    }

    #enterTitle() {
      const titleInput = this.shadowRoot.getElementById('title-input');
      titleInput.value = this.title;
      titleInput.classList.remove('hidden');

      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      confirmButton.disabled = true;
      this.#showOptionButtons();
    }

    #exitTitle() {
      const titleInput = this.shadowRoot.getElementById('title-input');
      titleInput.classList.add('hidden');
      this.#hideOptionButtons();
    }

    #enterTags() {
      const editTags = this.shadowRoot.getElementById('edit-tags');
      const tags = this.shadowRoot.getElementById('tags');
      const tagList = Array.from(tags.children, li => li.textContent);
      editTags.replaceAllTags(tagList);
      editTags.clearInput();
      editTags.classList.remove('hidden');

      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      confirmButton.disabled = true;
      this.#showOptionButtons();
    }

    #exitTags() {
      const editTags = this.shadowRoot.getElementById('edit-tags');
      editTags.classList.add('hidden');
      this.#hideOptionButtons();
    }

    #enterFolder() {
      this.#populateFolderOptions();

      const folderInput = this.shadowRoot.getElementById('folder-input');
      folderInput.value = this.#folderName;
      folderInput.classList.remove('hidden');

      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      confirmButton.disabled = true;
      this.#showOptionButtons();
    }

    #exitFolder() {
      const folderInput = this.shadowRoot.getElementById('folder-input');
      folderInput.classList.add('hidden');
      this.#hideOptionButtons();
    }

    #enterReadingStatus() {
      const statusOptions = this.shadowRoot.getElementById('reading-status-options');
      statusOptions.classList.remove('hidden');
      const matchingInput = this.shadowRoot.querySelector(`input[name="reading-status-input"][value="${this.readingStatus}"]`);
      matchingInput.checked = true;

      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      confirmButton.disabled = true;
      this.#showOptionButtons();
    }

    #exitReadingStatus() {
      const statusOptions = this.shadowRoot.getElementById('reading-status-options');
      statusOptions.classList.add('hidden');
      this.#hideOptionButtons();
    }

    #enterDelete() {
      const warningText = this.shadowRoot.getElementById('warning-text');
      warningText.classList.remove('hidden');

      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      confirmButton.disabled = false;
      confirmButton.variant = 'warning';
      this.#showOptionButtons();

      const optionsContainer = this.shadowRoot.getElementById('options-container');
      optionsContainer.classList.add('reverse');
    }

    #exitDelete() {
      const warningText = this.shadowRoot.getElementById('warning-text');
      warningText.classList.add('hidden');
      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      confirmButton.variant = '';
      this.#hideOptionButtons();

      const optionsContainer = this.shadowRoot.getElementById('options-container');
      optionsContainer.classList.remove('reverse');
    }

    #showOptionButtons() {
      const optionButtons = this.shadowRoot.getElementById('option-buttons');
      optionButtons.classList.remove('hidden');
    }

    #hideOptionButtons() {
      const optionButtons = this.shadowRoot.getElementById('option-buttons');
      optionButtons.classList.add('hidden');
    }

    #toggleHandler() {
      const newState = this.#currentState === this.#stateEnum.DEFAULT
        ? this.#stateEnum.MENU
        : this.#stateEnum.DEFAULT;
      this.#setState(newState);
    }

    #addOptionListeners() {
      const titleOption = this.shadowRoot.getElementById('title-option');
      titleOption.addEventListener('click', () => this.#setState(this.#stateEnum.TITLE));

      const tagOption = this.shadowRoot.getElementById('tag-option');
      tagOption.addEventListener('click', () => this.#setState(this.#stateEnum.TAGS));

      const folderOption = this.shadowRoot.getElementById('folder-option');
      folderOption.addEventListener('click', () => this.#setState(this.#stateEnum.FOLDER));

      const readingStatusOption = this.shadowRoot.getElementById('reading-status-option');
      readingStatusOption.addEventListener('click', () => this.#setState(this.#stateEnum.READING_STATUS));

      const deleteOption = this.shadowRoot.getElementById('delete-option');
      deleteOption.addEventListener('click', () => this.#setState(this.#stateEnum.DELETE));

      const cancelButton = this.shadowRoot.getElementById('cancel-button');
      cancelButton.addEventListener('click', () => this.#setState(this.#stateEnum.MENU));

      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      confirmButton.addEventListener('click', () => this.#confirmHandler())

      const titleInput = this.shadowRoot.getElementById('title-input');
      titleInput.addEventListener('input', (event) => this.#titleInputHandler(event));

      const editTags = this.shadowRoot.getElementById('edit-tags');
      editTags.addEventListener('tagChange', (event) => this.#tagInputHandler(event));

      const folderInput = this.shadowRoot.getElementById('folder-input');
      folderInput.addEventListener('input', (event) => this.#folderInputHandler(event));

      const statusInputs = this.shadowRoot.querySelectorAll('input[name="reading-status-input"]');
      statusInputs.forEach(input => {
        input.addEventListener('change', (event) => this.#statusChangeHandler(event));
      });
    }

    async #populateFolderOptions() {
      const folders = await getExtensionFolders();
      const fragment = document.createDocumentFragment();
      for (const title of folders.values()) {
        if (title === this.#folderName) continue;
        const option = document.createElement('option');
        option.value = title;
        fragment.appendChild(option);
      }
      const folderOptions = this.shadowRoot.getElementById('folder-autofill');
      folderOptions.replaceChildren(fragment);
    }

    #titleInputHandler(event) {
      const cleanedInput = event.target.value.replace(/\s+/g, ' ').trim();
      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      confirmButton.disabled = cleanedInput === '' || cleanedInput === this.title;
    }

    #tagInputHandler(event) {
      const tags = this.shadowRoot.getElementById('tags');
      const tagList = Array.from(tags.children, li => li.textContent);
      
      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      confirmButton.disabled = event.target.equals(tagList);
    }

    #folderInputHandler(event) {
      const cleanedInput = event.target.value.replace(/\s+/g, ' ').trim();
      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      confirmButton.disabled = cleanedInput === '' || cleanedInput === this.#folderName;
    }

    #statusChangeHandler(event) {
      const selected = event.target.value;
      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      confirmButton.disabled = selected === this.readingStatus;
    }

    #confirmHandler() {
      if (
        this.#currentState === this.#stateEnum.DEFAULT 
        || this.#currentState === this.#stateEnum.MENU
      ) return;

      this.#states[this.#currentState]?.confirm.call(this);
    }

    async #changeTitle() {
      const titleInput = this.shadowRoot.getElementById('title-input');
      const newTitle = titleInput.value.replace(/\s+/g, ' ').trim();

      const chapter = this.shadowRoot.getElementById('chapter-number').textContent;

      const tagsElement = this.shadowRoot.getElementById('tags');
      const tags = Array.from(tagsElement.children, li => li.textContent);

      await updateBookmarkTitle(this.#bookmarkId, newTitle, chapter, tags, true);
      this.shadowRoot.getElementById('title').textContent = newTitle;
      this.#setState(this.#stateEnum.MENU);
      this.dispatchEvent(
        new CustomEvent('titleChanged', {
          bubbles: true,
          composed: true,
          detail: {
            folderId: this.#folderId,
            readingStatus: this.readingStatus,
            bookmarkId: this.#bookmarkId,
            title: newTitle,
          }
        })
      );
    }

    async #changeTags() {
      const chapter = this.shadowRoot.getElementById('chapter-number').textContent;
      const newTags = this.shadowRoot.getElementById('edit-tags').getTags();

      await updateBookmarkTitle(this.#bookmarkId, this.title, chapter, newTags, true);
      this.#renderTags(newTags);
      this.#setState(this.#stateEnum.MENU);
      this.dispatchEvent(
        new CustomEvent('tagsChanged', {
          bubbles: true,
          composed: true,
          detail: {
            folderId: this.#folderId,
            readingStatus: this.readingStatus,
            bookmarkId: this.#bookmarkId,
            tags: newTags,
          }
        })
      );
    }

    async #changeFolder() {
      const folderInput = this.shadowRoot.getElementById('folder-input');
      const newFolder = folderInput.value.replace(/\s+/g, ' ').trim();

      let folderId;
      const normalizedFolderName = newFolder.toLowerCase();
      const folders = await getExtensionFolders();
      for (const [id, title] of folders) {
        if (title.trim().toLowerCase() === normalizedFolderName) {
          folderId = id;
          this.#folderName = title;
          break;
        }
      }
      if (folderId === undefined) {
        folderId = await addFolder(newFolder);
        this.#folderName = newFolder;
      }

      await moveBookmark(this.#bookmarkId, folderId, this.readingStatus, true);
      const oldFolderId = this.#folderId;
      this.#folderId = folderId;
      this.#setState(this.#stateEnum.MENU);
      this.dispatchEvent(
        new CustomEvent('bookmarkMoved', {
          bubbles: true,
          composed: true,
          detail: {
            bookmarkId: this.#bookmarkId,
            source: {id: oldFolderId, readingStatus: this.readingStatus},
            destination: {id: folderId, readingStatus: this.readingStatus}
          }
        })
      );
    }

    async #changeReadingStatus() {
      const checkedInput = this.shadowRoot.querySelector('input[name="reading-status-input"]:checked');
      const newSubFolder = checkedInput.value;

      await moveBookmark(this.#bookmarkId, this.#folderId, newSubFolder, true);
      const oldReadingStatus = this.readingStatus;
      this.readingStatus = newSubFolder;
      this.#setState(this.#stateEnum.MENU);
      this.dispatchEvent(
        new CustomEvent('bookmarkMoved', {
          bubbles: true,
          composed: true,
          detail: {
            bookmarkId: this.#bookmarkId,
            source: {id: this.#folderId, readingStatus: oldReadingStatus},
            destination: {id: this.#folderId, readingStatus: newSubFolder}
          }
        })
      );
    }

    #handleDelete() {
      removeBookmark(this.#bookmarkId);
    }
  }
)