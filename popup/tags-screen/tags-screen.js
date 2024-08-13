import "/components/themed-button/themed-button.js";
import "/components/svg/info-icon.js";
import "/components/tag-input/tag-input.js";

customElements.define(
  'tags-screen',
  class extends HTMLElement {
    #bookmarkTags = [];

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
          @import "/popup/tags-screen/tags-screen.css";
        </style>
        <div class="tags-title-container">
          <span>Title:</span>
          <span id="bookmark-title">&lt;Bookmark title&gt;</span>
        </div>
        <div class="tags-content-container">
          <div class="tags-title-container">Edit Tags</div>
          <div class="tags-info-container">
            <info-icon></info-icon>
            <span>Input any desired tag name or click on an existing tag to remove.</span>
          </div>
          <tag-input id="tags-input"></tag-input>
        </div>
        <div class="finish-edit">
          <themed-button id="cancel-tag-edit">Cancel</themed-button>
          <themed-button id="confirm-tag-edit">Confirm</themed-button>
        </div>
      `;

      this.setupTagInput();
      this.setupFinishButtons();
    }

    setupTagInput() {
      const confirmButton = this.shadowRoot.getElementById('confirm-tag-edit');
      const tagsInput = this.shadowRoot.getElementById('tags-input');
      tagsInput.addEventListener('tagChange', (event) => {
        if (tagsInput.equals(this.#bookmarkTags)) {
          confirmButton.disabled = false;
        } else {
          confirmButton.disabled = true;
        }
      });
    }

    setupFinishButtons() {
      const cancelButton = this.shadowRoot.getElementById('cancel-tag-edit');
      const confirmButton = this.shadowRoot.getElementById('confirm-tag-edit');

      confirmButton.addEventListener('click', () => {
        const bookmarkTags = this.shadowRoot.getElementById('tags-input').getTags();
        this.dispatchEvent(
          new CustomEvent('finishEdit', {
            detail: {
              action: 'confirm',
              bookmarkTags: bookmarkTags
            },
          })
        );
        this.closeScreen();
      });

      cancelButton.addEventListener('click', () => {
        this.dispatchEvent(
          new CustomEvent('finishEdit', {
            detail: {
              action: 'cancel',
              bookmarkTags: []
            },
          })
        );
        this.closeScreen();
      });
    }

    openScreen(title, bookmarkTags) {
      this.setTitle(title);
      this.#bookmarkTags = bookmarkTags;
      this.shadowRoot.getElementById('tags-input').replaceAllTags(bookmarkTags);
      const confirmButton = this.shadowRoot.getElementById('confirm-tag-edit');
      confirmButton.disabled = true;
      this.open = true;
    }

    setTitle(title) {
      this.shadowRoot.getElementById('bookmark-title').textContent = title;
    }

    closeScreen() {
      this.open = false;
      const tagsInput = this.shadowRoot.getElementById('tags-input');
      tagsInput.clearInput();
    }
  }
)