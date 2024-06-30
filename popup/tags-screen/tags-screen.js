import { createNewTag, getTags, hasTag } from "/externs/tags.js";
import "/components/themed-button/themed-button.js";
import "/components/svg/info-icon.js";
import "/components/tag-button/tag-button.js";

customElements.define(
  'tags-screen',
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
            <span>Click any unmarked tag to add it. Click any selected tag to remove it.</span>
          </div>
          <div id="extension-tags"></div>
          <div class="tags-creation-container">
            <input id="create-tag" class="create-tag" type="text" placeholder="Create New Tag"/>
            <themed-button id="create-tag-button" size="small" disabled>Create</themed-button>
          </div>
        </div>
        <div class="finish-edit">
          <themed-button id="cancel-tag-edit">Cancel</themed-button>
          <themed-button id="confirm-tag-edit">Confirm</themed-button>
        </div>
      `;

      this.setupCreate();
      this.setupFinishButtons();
    }

    setupCreate() {
      const createButton = this.shadowRoot.getElementById('create-tag-button');
      const createTagInput = this.shadowRoot.getElementById('create-tag');
      createTagInput.addEventListener('input', (event) => {
        const value = event.target.value;
        hasTag(value)
        .then((hasTagResult) => {
          if (value === '' || hasTagResult) {
            createButton.disabled = true;
          } else {
            createButton.disabled = false;
          }
        });
      });
      
      createButton.addEventListener('click', () => {
        createNewTag(createTagInput.value)
        .then((tagCreated) => {
          if (tagCreated) {
            const extensionTags = this.shadowRoot.getElementById('extension-tags');
            const tagButton = document.createElement('tag-button');
            tagButton.textContent = createTagInput.value.toLowerCase();
            extensionTags.appendChild(tagButton);
          }
          createTagInput.value = '';
          createButton.disabled = true;
        });
      });
    }

    setupFinishButtons() {
      const cancelButton = this.shadowRoot.getElementById('cancel-tag-edit');
      const confirmButton = this.shadowRoot.getElementById('confirm-tag-edit');

      confirmButton.addEventListener('click', () => {
        const tagsContainer = this.shadowRoot.getElementById('extension-tags');
        const tags = Array.from(tagsContainer.querySelectorAll('tag-button'));
        const bookmarkTags = tags.filter(tagButton => 
          (tagButton.selected && tagButton.variant !== 'active') ||
          (!tagButton.selected && tagButton.variant === 'active')
        ).map(tagButton => tagButton.textContent);

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
      this.setTags(bookmarkTags);
      const confirmButton = this.shadowRoot.getElementById('confirm-tag-edit');
      confirmButton.disabled = true;
      this.open = true;
    }

    setTitle(title) {
      this.shadowRoot.getElementById('bookmark-title').textContent = title;
    }

    setTags(bookmarkTags) {
      getTags()
      .then((tags) => {
        const extensionTags = this.shadowRoot.getElementById('extension-tags');
        const fragment = document.createDocumentFragment();
        const confirmButton = this.shadowRoot.getElementById('confirm-tag-edit');
        tags.forEach((tag) => {
          const tagButton = document.createElement('tag-button');
          tagButton.textContent = tag;
          if (bookmarkTags.includes(tag)) {
            tagButton.variant = 'active';
          }
          tagButton.addEventListener('click', () => {
            if (this.bookmarkTagsChanged()) {
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

    bookmarkTagsChanged() {
      const tagsContainer = this.shadowRoot.getElementById('extension-tags');
      return Array.from(tagsContainer.querySelectorAll('tag-button'))
        .some(tagButton => tagButton.selected);
    }

    closeScreen() {
      this.open = false;
      const createTagInput = this.shadowRoot.getElementById('create-tag');
      createTagInput.value = '';
    }
  }
)