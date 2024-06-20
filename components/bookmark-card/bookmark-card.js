import "/components/svg/edit-icon.js";
import "/components/svg/info-icon.js";
import "/components/themed-button/themed-button.js";
import "/components/tag-button/tag-button.js";

customElements.define(
  'bookmark-card',
  class extends HTMLElement {
    static get observedAttributes() {
      return ['state'];
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

    constructor() {
      super();
      this.attachShadow({ mode: 'open'});
    }

    initialize(title, url, chapterNumber, domain, date, activeTags) {
      this.state = 'default';

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
                <div class="title">${title}</div>
                <div class="chapter">Chapter ${chapterNumber}</div>
                <div class="domain-date">
                  <div>${domain}</div>
                  <time datetime="${datetimeValue}">${displayDate}</time>
                </div>
              </div>
            </a>
            <div class="active-tags-edit">
              <ul>
                ${activeTags.map(tag => `<li>${tag}</li>`).join('')}
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
            <themed-button id="status-option">Mark Reading</themed-button>
            <themed-button id="delete-option" variant="warning">Delete Bookmark</themed-button>
            <themed-button id="close-button">Close</themed-button>        
          </div>
          <div class="tag-list">
            <tag-button>TagName</tag-button>
          </div>
          <div class="warning-text">WARNING: This action is permanent</div>
          <div class="edit-options">
            <themed-button>Confirm</themed-button>
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

      // confirm button
    }

    toggleOptions() {
      if (this.state === 'default') {
        this.setEditing();
      } else {
        this.state = 'default';
      }
    }

    setEditing() {
      this.changeInfoText('Select action to perform');
      this.state = 'editing';
    }

    setEditTags() {
      this.changeInfoText('Click any unmarked tag to add it. Click any selected tag to remove it');
      this.state = 'tags';
      // show tag list and populate
    }

    setEditReadingStatus() {
      this.changeInfoText('Confirm you wish to mark this bookmark as completed');
      this.state = 'readingStatus';
    }

    setEditDelete() {
      this.changeInfoText('Confirm you wish to delete this bookmark');
      this.state = 'delete';
      // make confirm button red
    }

    changeInfoText(string) {
      const infoText = this.shadowRoot.getElementById('info-text');
      infoText.innerHTML = string;
    }
  }
);