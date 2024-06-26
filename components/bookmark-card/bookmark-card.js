import { getTags } from "/externs/tags.js";
import { bookmarkRegex, updateBookmarkTags, moveBookmark, removeBookmark } from "/externs/bookmark.js";
import "/components/svg/edit-icon.js";
import "/components/svg/info-icon.js";
import "/components/themed-button/themed-button.js";
import "/components/tag-button/tag-button.js";

customElements.define(
  'bookmark-card',
  class extends HTMLElement {
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
      const validStatuses = ['reading', 'completed'];
      if (value === '') {
        this.removeAttribute('readingStatus');
      } else if (validStatuses.includes(value)) {
        this.setAttribute('readingStatus', value);
      }
    }

    constructor() {
      super();
      this.attachShadow({ mode: 'open'});
    }

    initialize(title, chapterNumber, url, date, readingStatus, activeTags, folderName) {
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
                  <div id="bookmark-domain">${folderName}</div>
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
            <themed-button id="status-option">
              Mark ${readingStatus === 'reading' ? 'Completed' : 'Reading'}
            </themed-button>
            <themed-button id="delete-option" variant="warning">Delete Bookmark</themed-button>
            <themed-button id="close-button">Close</themed-button>        
          </div>
          <div id="extension-tags" class="tag-list"></div>
          <div class="warning-text">WARNING: This action is permanent</div>
          <div class="edit-options">
            <themed-button id="confirm-button">Confirm</themed-button>
            <themed-button id="cancel-button">Cancel</themed-button>
          </div>
        </div>
      `;

      this.initializeButtons();
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
        const folder = this.shadowRoot.getElementById('bookmark-domain').textContent;
        const bookmarkTags = this.shadowRoot.getElementById('bookmark-tags');
        const tags = Array.from(bookmarkTags.children, li => li.textContent);    

        switch(this.state) {
          case 'tags':
            this.handleTagsChange(title, chapter, folder, tags);
            break;
          case 'readingStatus':
            this.handleReadingStatusChange(title, chapter, folder, tags);
            break;
          case 'delete':
            this.handelDelete(title, chapter, folder, tags);
            console.log('confirm delete');
            break;
          default:
            console.error('Error, bookmark-card confirm pressed in invalid state', this.state);
        }
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
      const statusChange = this.readingStatus === 'reading' ? 'completed' : 'reading';
      this.changeInfoText(`Confirm you wish to mark this bookmark as ${statusChange}`);
      this.state = 'readingStatus';
    }

    setEditDelete() {
      this.changeInfoText('Confirm you wish to delete this bookmark');
      this.state = 'delete';
      const confirmButton = this.shadowRoot.getElementById('confirm-button');
      confirmButton.variant = 'warning';
    }

    changeInfoText(string) {
      const infoText = this.shadowRoot.getElementById('info-text');
      infoText.innerHTML = string;
    }

    handleTagsChange(title, chapter, folder, tags) {
      const extensionTags = this.shadowRoot.getElementById('extension-tags');
      const tagButtons = Array.from(extensionTags.querySelectorAll('tag-button'));
      const newTags = tagButtons.filter(tagButton => 
        (tagButton.selected && tagButton.variant !== 'active') ||
        (!tagButton.selected && tagButton.variant === 'active')
      ).map(tagButton => tagButton.textContent);
      updateBookmarkTags(title, chapter, folder, tags, newTags)
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

    handleReadingStatusChange(title, chapter, folder, tags) {
      const newReadingStatus = this.readingStatus === 'reading' ? 'completed' : 'reading';
      moveBookmark(title, chapter, folder, tags, newReadingStatus)
      .then(() => this.readingStatus = newReadingStatus);
    }

    handelDelete(title, chapter, folder, tags) {
      const bookmarkTitle = bookmarkRegex(title, chapter, tags);
      removeBookmark(bookmarkTitle, folder);
    }
  }
);