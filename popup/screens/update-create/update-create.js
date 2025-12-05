import {
  addFolder,
  getExtensionFolders,
  addBookmark,
  removeBookmark
} from "/externs/bookmark.js";
import "/components/themed-button/themed-button.js";
import "/components/dropdown-menu/dropdown-menu.js";
import '/components/tag-input/tag-input.js';
import "/components/svg-icon/svg-icon.js";

const template = document.createElement('template');
template.innerHTML = /* html */ `
  <style>
    @import "/popup/screens/update-create/update-create.css";
  </style>
  <div class="grid-container">
    <span id="title-label">Title</span>
    <span id="title-display" contenteditable="plaintext-only" aria-labelledby="title-label"></span>

    <label for="chapter-input">Chapter</label>
    <div class="chapter-container">
      <span id="old-chapter" class="hidden"></span>
      <span id="chapter-arrow" class="hidden">--&gt;</span>
      <input type="number" required placeholder="##" step="0.01" name="chapter-input" list="number-options" id="chapter-input" />
      <datalist id="number-options"></datalist>
      <dropdown-menu selected="Reading">
        <option value="Reading">Reading</option>
        <option value="Completed">Completed</option>
        <option value="Plan to Read">Plan to Read</option>
        <option value="Re-Reading">Re-Reading</option>
        <option value="On Hold">On Hold</option>
      </dropdown-menu>
    </div>

    <label for="folder-input">Folder</label>
    <input type="text" required pattern=".*\\S+.*" placeholder="Folder Name" name="folder-input" list="folder-options" id="folder-input"/>
    <datalist id="folder-options"></datalist>

    <tag-input compact class="full-width"></tag-input>

    <div id="error-text" class="full-width hidden"></div>
  </div>

  <div id="button-container">
    <themed-button id="search-button">Find Title</themed-button>
    <themed-button id="confirm-button">Create</themed-button>
  </div>

  <div id="completed-container" class="hidden">
    <svg-icon type="check-mark" style="--icon-size: 36px"></svg-icon>
    <span id="completed-text"></span>
  </div>
`;

customElements.define(
  'update-create',
  class extends HTMLElement {
    #url;
    #tabTitle;
    #defaultFolder;
    #updatesBookmarkId = null;

    constructor() {
      super();
      const shadowRoot = this.attachShadow({ mode: 'open'});
      shadowRoot.appendChild(template.content.cloneNode(true));
    }

    connectedCallback() {
      this.#addEventListeners();
    }

    #addEventListeners() {
      const titleLabel = this.shadowRoot.getElementById('title-label');
      titleLabel.addEventListener('click', (event) => this.#titleLabelHandler(event));

      const titleDisplay = this.shadowRoot.getElementById('title-display');
      titleDisplay.addEventListener('input', (event) => this.#checkTitleEmpty(event));

      const searchButton = this.shadowRoot.getElementById('search-button');
      searchButton.addEventListener('click', (event) => this.#findTitleHandler(event));

      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      confirmButton.addEventListener('click', (event) => this.#confirmHandler(event));
    }

    #titleLabelHandler(event) {
      const titleDisplay = this.shadowRoot.getElementById('title-display');
      titleDisplay.focus();
    }

    #checkTitleEmpty(event) {
      const titleDisplay = this.shadowRoot.getElementById('title-display');
      const input = titleDisplay.textContent.trim();
      const isEmpty = input === '';
      if (isEmpty) {
        titleDisplay.innerHTML = '';
      }
    }

    #findTitleHandler(event) {
      const showCreate = this.#updatesBookmarkId !== null;
      this.dispatchEvent(
        new CustomEvent('findTitle', {
          detail: showCreate,
        })
      );
    }

    async #confirmHandler(event) {
      this.#setError('');
      if (!this.#url) {
        console.error('Error: not enough bookmark information. No call to setup() made.');
        return;
      }

      const titleDisplay = this.shadowRoot.getElementById('title-display');
      const chapterInput = this.shadowRoot.getElementById('chapter-input');
      const statusDropdown = this.shadowRoot.querySelector('dropdown-menu');
      const folderInput = this.shadowRoot.getElementById('folder-input');
      const tagInput = this.shadowRoot.querySelector('tag-input');

      const title = titleDisplay.textContent.replace(/\s+/g, ' ').trim();
      const chapter = chapterInput.value;
      const readingStatus = statusDropdown.selected !== 'Reading' ? statusDropdown.selected : undefined;
      const folder = folderInput.value.replace(/\s+/g, ' ').trim();
      const tags = tagInput.getTags();

      let isInvalid = false;
      if (title === '') {
        isInvalid = true;
        this.#flashInvalid(titleDisplay);
      }
      if (!chapterInput.checkValidity()) {
        isInvalid = true;
        this.#flashInvalid(chapterInput);
      }
      if (!folderInput.checkValidity()) {
        isInvalid = true;
        this.#flashInvalid(folderInput);
      }
      if (isInvalid) {
        return;
      }

      let folderId;
      try {
        folderId = await this.#getFolderId(folder);        
      } catch (error) {
        this.#setError(`Error: Bookmark not created.<br />Could not create or retrieve '${folder}'.`);
        console.error(error);
        return;
      }

      try {
        await addBookmark(title, chapter, tags, this.#url, folderId, readingStatus);
      } catch (error) {
        this.#setError('Error: Failed to create bookmark.');
        console.error(error);
        return;
      }

      if (this.#updatesBookmarkId) {
        try {
          await removeBookmark(this.#updatesBookmarkId);
        } catch (error) {
          this.#setError('Error: Failed to remove old bookmark entry.<br />You may remove old bookmark in the manager or manually.');
          console.warn(error);
        }
      }

      const completedText = this.shadowRoot.getElementById('completed-text');
      completedText.textContent = this.#updatesBookmarkId ? 'Bookmark Updated' : "Bookmark Created";
      const buttonContainer = this.shadowRoot.getElementById('button-container');
      buttonContainer.classList.add('hidden');
      const completedContainer = this.shadowRoot.getElementById('completed-container');
      completedContainer.classList.remove('hidden');
    }

    async #getFolderId(folder) {
      const normalizedFolder = folder.toLowerCase();
      const extensionFolders = await getExtensionFolders();
      let folderId;
      for (const [id, title] of extensionFolders) {
        if (title.trim().toLowerCase() === normalizedFolder) {
          folderId = id;
          break;
        }
      }
      if (folderId === undefined) {
        folderId = await addFolder(folder);
      }
      return folderId;
    }

    #flashInvalid(element) {
      element.classList.add('flash');
      setTimeout(() => element.classList.remove('flash'), 1200);
    }

    setup(url, tabTitle, defaultFolder, chapter, existingBookmarkInfo) {
      this.#url = url;
      this.#tabTitle = tabTitle;
      this.#defaultFolder = defaultFolder;

      this.#setupChapterInput(chapter);
      this.#setupFolderOptions();
      const tagInput = this.shadowRoot.querySelector('tag-input');
      tagInput.populateDatalist();

      if (existingBookmarkInfo) {
        this.setUpdate(existingBookmarkInfo);
      } else {
        this.setCreate();
      }
    }

    setUpdate(bookmarkInfo) {
      this.#updatesBookmarkId = bookmarkInfo.id;
      this.#setTitle(bookmarkInfo.title);
      this.#toggleOldChapter(bookmarkInfo.chapter);
      this.#setFolder(bookmarkInfo.folder);
      this.#setTags(bookmarkInfo.tags);
      const validSubFolders = ['Completed', 'Plan to Read', 'Re-Reading', 'On Hold'];
      const readingStatus = validSubFolders.includes(bookmarkInfo.readingStatus) 
        ? bookmarkInfo.readingStatus 
        : 'Reading';
      this.#setReadingStatus(readingStatus);
      this.#changeButtonText('Create/Find Title', 'Update');
    }

    setCreate() {
      this.#updatesBookmarkId = null;
      this.#setTitle(this.#tabTitle);
      this.#toggleOldChapter(null);
      this.#setFolder(this.#defaultFolder);
      this.#setTags([]);
      this.#setReadingStatus('Reading');
      this.#changeButtonText('Find Title', 'Create');
    }

    #setTitle(title) {
      const titleDisplay = this.shadowRoot.getElementById('title-display');
      titleDisplay.textContent = title;
    }

    #toggleOldChapter(chapter) {
      const oldChapter = this.shadowRoot.getElementById('old-chapter');
      const chapterArrow = this.shadowRoot.getElementById('chapter-arrow');
      if (chapter) {
        oldChapter.classList.remove('hidden');
        oldChapter.textContent = chapter;
        chapterArrow.classList.remove('hidden');
      } else {
        oldChapter.classList.add('hidden');
        oldChapter.textContent = '';
        chapterArrow.classList.add('hidden');
      }
    }

    #setupChapterInput(chapter) {
      const chapterInput = this.shadowRoot.getElementById('chapter-input');
      if (chapter.inputValue) {
        chapterInput.value = chapter.inputValue;
      } else {
        chapterInput.value = chapter.options.length > 0 ? chapter.options[0] : '0';
      }

      const fragement = document.createDocumentFragment();
      for (const number of chapter.options) {
        const option = document.createElement('option');
        option.value = number;
        fragement.appendChild(option);
      }
      const numberList = this.shadowRoot.getElementById('number-options');
      numberList.replaceChildren(fragement);
    }

    async #setupFolderOptions() {
      let extensionFolders;
      try {
        extensionFolders = await getExtensionFolders();
      } catch (error) {
        console.warn(error);
        return;
      }
      
      const fragement = document.createDocumentFragment();
      for (const title of extensionFolders.values()) {
        const option = document.createElement('option');
        option.value = title;
        fragement.appendChild(option);
      }
      const folderOptions = this.shadowRoot.getElementById('folder-options');
      folderOptions.replaceChildren(fragement);
    }

    #setFolder(folder) {
      const folderInput = this.shadowRoot.getElementById('folder-input');
      folderInput.value = folder;
    }

    #setTags(tags) {
      const tagInput = this.shadowRoot.querySelector('tag-input');
      tagInput.replaceAllTags(tags);
    }

    #setReadingStatus(status) {
      const statusDropdown = this.shadowRoot.querySelector('dropdown-menu');
      statusDropdown.selected = status;
    }

    #changeButtonText(searchText, confirmText) {
      const searchButton = this.shadowRoot.getElementById('search-button');
      searchButton.textContent = searchText;
      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      confirmButton.textContent = confirmText;
    }

    #setError(message) {
      const errorText = this.shadowRoot.getElementById('error-text');
      errorText.innerHTML = message;

      if (message === '') {
        errorText.classList.add('hidden');
      } else {
        errorText.classList.remove('hidden');
      }
    }

    getMode() {
      return this.#updatesBookmarkId === null ? 'create' : 'update';
    }
  }
);