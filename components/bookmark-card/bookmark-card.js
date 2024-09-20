import { updateBookmarkTags, changeSubFolder, removeBookmark } from "/externs/bookmark.js";
import "/components/svg/edit-icon.js";
import "/components/svg/info-icon.js";
import "/components/themed-button/themed-button.js";
import "/components/tag-input/tag-input.js";
import "/components/tag-elements/tag-li.js";

const cardTemplate = document.createElement('template');
cardTemplate.innerHTML = /* html */ `
  <style>
    @import "/components/bookmark-card/bookmark-card.css";
  </style>
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
        <button id="edit-button" title="Edit Bookmark"><edit-icon></edit-icon></button>
      </div>
    </div>
  </div>
  <div id="options-wrapper" class="options-wrapper"></div>
`;

const optionsTemplate = document.createElement('template');
optionsTemplate.innerHTML = /* html */ `
  <div class="options-container">
    <div class="info-container">
      <info-icon></info-icon>
      <span id="info-text">Select action to perform</span>
    </div>
    <div id="options-menu" class="edit-nav">
      <themed-button id="open-tag-option">Edit Tags</themed-button>
      <themed-button id="open-reading-status-option">Reading Status</themed-button>
      <themed-button id="open-delete-option" variant="warning">Delete Bookmark</themed-button>
      <themed-button id="close-button">Close</themed-button>
    </div>
    <tag-input id="edit-tags" class="hidden"></tag-input>
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
    #folderName;
    #editingOptions = Object.freeze({
      closed: 0,
      menu: 1,
      tags: 2,
      readingStatus: 3,
      delete: 4
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
      } else {
        this.#editingState = this.#editingOptions.closed;
        optionsWrapper.replaceChildren();
      }
    }

    setupOptionsEventListeners() {
      const editTagsButtons = this.shadowRoot.getElementById('open-tag-option');
      editTagsButtons.addEventListener('click', (event) => this.selectEditOption(this.#editingOptions.tags));
      this.setupChangeTagsInput();

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
        default:
          break;
      }
    }

    #openOptionsMenu() {
      this.changeInfoText('Select action to perform');
      const optionsMenu = this.shadowRoot.getElementById('options-menu');
      optionsMenu.classList.remove('hidden');
    }

    #openTagOption() {
      this.changeInfoText('Input any desired tag name or click on an existing tag to remove.');
      const bookmarkTags = this.shadowRoot.getElementById('bookmark-tags');
      const tagList = Array.from(bookmarkTags.children, li => li.textContent);
      const tagsInput = this.shadowRoot.getElementById('edit-tags');
      tagsInput.replaceAllTags(tagList);
      tagsInput.clearInput();
      tagsInput.classList.remove('hidden');
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
      const bookmarkTags = this.shadowRoot.getElementById('bookmark-tags');
      const tags = Array.from(bookmarkTags.children, li => li.textContent);

      switch(this.#editingState) {
        case this.#editingOptions.tags:
          this.#handleTagsChange(title, chapter, tags);
          break;
        case this.#editingOptions.readingStatus:
          this.#handleReadingStatusChange(title, chapter, tags);
          break;
        case this.#editingOptions.delete:
          this.#handleDeleteBookmark(title, chapter, tags);
          break;
        default:
          console.error('Error, bookmark-card confirm pressed in invalid state', this.#editingState);
      }
    }

    initialize(title, chapterNumber, url, date, readingStatus, activeTags, domain, folderName) {
      this.#folderName = folderName;
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

    #handleTagsChange(title, chapter, oldTags) {
      const newTags = this.shadowRoot.getElementById('edit-tags').getTags();
      updateBookmarkTags(title, chapter, this.#folderName, oldTags, newTags, true)
        .then(() => {
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
        });
    }

    #handleReadingStatusChange(title, chapter, tags) {
      const checkedInput = this.shadowRoot.querySelector('input[name="reading-status-input"]:checked');
      const newSubFolder = checkedInput.value;

      changeSubFolder(title, chapter, this.#folderName, tags, newSubFolder, true)
        .then(() => {
          this.readingStatus = checkedInput.value
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
        });
    }

    #handleDeleteBookmark(title, chapter, tags) {
      removeBookmark(this.#folderName, {title: title, chapter: chapter, tags: tags});
    }
  }
);