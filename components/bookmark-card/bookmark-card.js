import { getTags } from "/externs/tags.js";
import { updateBookmarkTags, changeSubFolder, removeBookmark } from "/externs/bookmark.js";
import "/components/svg/edit-icon.js";
import "/components/svg/info-icon.js";
import "/components/themed-button/themed-button.js";
import "/components/tag-button/tag-button.js";

customElements.define(
  'bookmark-card',
  class extends HTMLElement {
    #folderName;

    static get observedAttributes() {
      return ['state', 'readingStatus'];
    }

    get state() {
      return this.getAttribute('state');
    }

    set state(value) {
      const validStates = ['default', 'editing', 'tags', 'readingStatus', 'delete'];
      if (validStates.includes(value)) {
        this.setAttribute('state', value);
      } else {
        this.setAttribute('state', 'default');
      }
    }

    get readingStatus() {
      return this.getAttribute('readingStatus') || '';
    }

    set readingStatus(value) {
      const formattedValue = value.replace(/\s+/g, '-').toLowerCase();
      const validStatuses = ['reading', 'completed', 'plan-to-read', 're-reading', 'on-hold'];
      if (formattedValue === '') {
        this.removeAttribute('readingStatus');
      } else if (validStatuses.includes(formattedValue)) {
        this.setAttribute('readingStatus', formattedValue);
      }
    }

    constructor() {
      super();
      this.attachShadow({ mode: 'open'});
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

      this.shadowRoot.innerHTML = /* html */ `
        <style>
          @import "/components/bookmark-card/bookmark-card.css";
        </style>
        <div class="highlight-container">
          <div class="card-container">
            <a href="${url}" class="card">
              <div class="link-container">
                <div class="title-container">
                  <span id="bookmark-title" class="title">${title}</span>
                  ${readingStatus !== 'reading' ? `<span class="readingStatus">${readingStatus}</span>` : ''}
                </div>
                <div class="chapter">
                  <span>Chapter</span>
                  <span id="bookmark-chapter">${chapterNumber}</span>
                </div>
                <div class="domain-date">
                  <div id="bookmark-domain">${domain}</div>
                  <time datetime="${datetimeValue}">${displayDate}</time>
                </div>
              </div>
            </a>
            <div class="active-tags-edit">
              <ul id="bookmark-tags">
                ${activeTags.length > 0
                  ? activeTags.map(tag => `<li>${tag}</li>`).join('')
                  : ''
                }
              </ul>
              <button id="edit-button" title="Edit Bookmark"><edit-icon></edit-icon></button>                
            </div>
          </div>
        </div>
        <div class="edit-container">
          <div class="info-container">
            <info-icon></info-icon>
            <span id="info-text">Select action to perform</span>
          </div>
          <div class="edit-nav">
            <themed-button id="tag-option">Edit Tags</themed-button>
            <themed-button id="status-option">Reading Status</themed-button>
            <themed-button id="delete-option" variant="warning">Delete Bookmark</themed-button>
            <themed-button id="close-button">Close</themed-button>        
          </div>
          <div id="extension-tags" class="tag-list"></div>
          <div class="reading-status-container">
            <div>
              <input type="radio" id="reading" name="reading-status-input" value="reading" />
              <label for="reading">Reading</label>
            </div>
            <div>
              <input type="radio" id="completed" name="reading-status-input" value="completed" />
              <label for="completed" class="green-highlight">Completed</label>
            </div>
            <div>
              <input type="radio" id="plan-to-read" name="reading-status-input" value="plan-to-read" />
              <label for="plan-to-read" class="orange-highlight">Plan to Read</label>
            </div>
            <div>
              <input type="radio" id="re-reading" name="reading-status-input" value="re-reading" />
              <label for="re-reading" class="purple-highlight">Re-Reading</label>
            </div>
            <div>
              <input type="radio" id="on-hold" name="reading-status-input" value="on-hold" />
              <label for="on-hold" class="red-highlight">On Hold</label>
            </div>
          </div>
          <div class="warning-text">WARNING: This action is permanent</div>
          <div class="edit-options">
            <themed-button id="confirm-button">Confirm</themed-button>
            <themed-button id="cancel-button">Cancel</themed-button>
          </div>
        </div>
      `;

      this.initializeButtons();
      this.initializeReadingInput(readingStatus);
    }

    initializeButtons() {
      const editButton = this.shadowRoot.getElementById('edit-button');
      editButton.addEventListener('click', (event) => this.toggleOptions());

      const tagsOption = this.shadowRoot.getElementById('tag-option');
      tagsOption.addEventListener('click', (event) => this.setEditTags());

      const statusOption = this.shadowRoot.getElementById('status-option');
      statusOption.addEventListener('click', (event) => this.setEditReadingStatus());

      const deleteOption = this.shadowRoot.getElementById('delete-option');
      deleteOption.addEventListener('click', (event) => this.setEditDelete());

      const closeButton = this.shadowRoot.getElementById('close-button');
      closeButton.addEventListener('click', (event) => this.toggleOptions());

      const cancelButton = this.shadowRoot.getElementById('cancel-button');
      cancelButton.addEventListener('click', (event) => this.setEditing());

      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      confirmButton.addEventListener('click', () => {
        const title = this.shadowRoot.getElementById('bookmark-title').textContent;
        const chapter = this.shadowRoot.getElementById('bookmark-chapter').textContent;
        const bookmarkTags = this.shadowRoot.getElementById('bookmark-tags');
        const tags = Array.from(bookmarkTags.children, li => li.textContent);    

        switch(this.state) {
          case 'tags':
            this.handleTagsChange(title, chapter, tags);
            break;
          case 'readingStatus':
            this.handleReadingStatusChange(title, chapter, tags);
            break;
          case 'delete':
            removeBookmark(this.#folderName, {title: title, chapter: chapter, tags: tags});
            break;
          default:
            console.error('Error, bookmark-card confirm pressed in invalid state', this.state);
        }
      });
    }

    initializeReadingInput(currentStatus) {
      const inputs = this.shadowRoot.querySelectorAll('input[name="reading-status-input"]');
      inputs.forEach(input => {
        if (input.value === currentStatus) {
          input.checked = true;
        }

        input.addEventListener('change', () => {
          const confirmButton = this.shadowRoot.getElementById('confirm-button');
          if (input.value === this.readingStatus) {
            confirmButton.disabled = true;
          } else {
            confirmButton.disabled = false;
          }
        });
      });
    }

    toggleOptions() {
      if (this.state === 'default') {
        this.setEditing();
      } else {
        if (this.state === 'delete') {
          const confirmButton = this.shadowRoot.getElementById('confirm-button');
          confirmButton.variant = '';
        }
        this.state = 'default';
      }
    }

    setEditing() {
      if (this.state === 'delete') {
        const confirmButton = this.shadowRoot.getElementById('confirm-button');
        confirmButton.variant = '';
      } 
      this.changeInfoText('Select action to perform');
      this.state = 'editing';
    }

    setEditTags() {
      this.changeInfoText('Click any unmarked tag to add it. Click any selected tag to remove it');
      this.state = 'tags';
      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      confirmButton.disabled = true;
      
      getTags()
      .then((tags) => {
        const extensionTags = this.shadowRoot.getElementById('extension-tags');
        const bookmarkTags = this.shadowRoot.getElementById('bookmark-tags');
        const tagList = Array.from(bookmarkTags.children, li => li.textContent);
        
        const fragment = document.createDocumentFragment();
        tags.forEach((tag) => {
          const tagButton = document.createElement('tag-button');
          tagButton.textContent = tag;
          if (tagList.includes(tag)) {
            tagButton.variant = 'active';
          }
          tagButton.addEventListener('click', () => {
            if (this.hasBookmarkTagsChanged()) {
              confirmButton.disabled = false;
            } else {
              confirmButton.disabled = true;
            }
          });
          fragment.appendChild(tagButton);
        });
        extensionTags.replaceChildren(fragment);
      });
    }

    hasBookmarkTagsChanged() {
      const extensionTags = this.shadowRoot.getElementById('extension-tags');
      return Array.from(extensionTags.querySelectorAll('tag-button'))
        .some(tagButton => tagButton.selected);
    }

    setEditReadingStatus() {
      const currentStatusInput = this.shadowRoot.querySelector(`input[name="reading-status-input"][value="${this.readingStatus}"]`);
      if (currentStatusInput) {
        currentStatusInput.checked = true;
      }
      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      confirmButton.disabled = true;
      this.changeInfoText('Select a new reading status.');
      this.state = 'readingStatus';
    }

    setEditDelete() {
      this.changeInfoText('Confirm you wish to delete this bookmark');
      this.state = 'delete';
      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      confirmButton.variant = 'warning';
      confirmButton.disabled = false;
    }

    changeInfoText(string) {
      const infoText = this.shadowRoot.getElementById('info-text');
      infoText.innerHTML = string;
    }

    handleTagsChange(title, chapter, tags) {
      const extensionTags = this.shadowRoot.getElementById('extension-tags');
      const tagButtons = Array.from(extensionTags.querySelectorAll('tag-button'));
      const newTags = tagButtons.filter(tagButton => 
        (tagButton.selected && tagButton.variant !== 'active') ||
        (!tagButton.selected && tagButton.variant === 'active')
      ).map(tagButton => tagButton.textContent);
      updateBookmarkTags(title, chapter, this.#folderName, tags, newTags)
      .then(() => {
        const fragment = document.createDocumentFragment();
        newTags.forEach(tag => {
          const li = document.createElement('li');
          li.textContent = tag;
          fragment.appendChild(li);
        });
        const bookmarkTags = this.shadowRoot.getElementById('bookmark-tags');
        bookmarkTags.replaceChildren(fragment);
      });
    }

    handleReadingStatusChange(title, chapter, tags) {
      const statusMap = {
        'reading': 'reading',
        'completed': 'Completed',
        'plan-to-read': 'Plan to Read',
        're-reading': 'Re-Reading',
        'on-hold': 'On Hold'
      };
      const checkedInput = this.shadowRoot.querySelector('input[name="reading-status-input"]:checked');
      const newSubFolder = statusMap[checkedInput.value];

      changeSubFolder(title, chapter, this.#folderName, tags, newSubFolder)
      .then(() => this.readingStatus = checkedInput.value);
    }
  }
);