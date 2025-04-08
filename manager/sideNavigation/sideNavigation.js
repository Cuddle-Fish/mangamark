import { getGroupsWithFolders, registerGroupChangeListener } from "/externs/settings.js";

import "/components/svg/close-icon.js";
import "/components/svg/expand-less.js";
import "/components/svg/expand-more.js";
import "/components/svg/settings-icon.js"

const template = document.createElement('template');
template.innerHTML = /* html */ `
  <style>
    @import "/manager/sideNavigation/sideNavigation.css";
  </style>
  <div id="overlay" class="overlay"></div>
  <div id="wrapper" class="wrapper">
    <div class="close-container">
      <a href="/options/options.html" class="icon-button"><settings-icon></settings-icon></a>
      <button id="close-button" class="icon-button"><close-icon size="18px"></close-icon></button>
    </div>
    <div class="all-selection">
      <input type="radio" id="all-bookmarks" name="nav-item" value="" checked />
      <label for="all-bookmarks">Show All</label>
    </div>

    <div id="groups-container" class="groups-container"></div>
  </div>
`;

customElements.define(
  'side-navigation',
  class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open'});
      this.shadowRoot.appendChild(template.content.cloneNode(true));
    }

    get selected() {
      return this.getAttribute('selected') || '';
    }

    set selected(value) {
      if (!this.hasAttribute('selected') || this.getAttribute('selected') !== value) {
        const navItems = this.shadowRoot.querySelectorAll('input[name="nav-item"]');
        for (const input of navItems) {
          if (input.value === value) {
            input.checked = true;
            this.setAttribute('selected', value);
            break;
          }
        }
      }
    }

    connectedCallback() {
      this.setAttribute('selected', '');
      this.setAttribute('open', '');

      this.shadowRoot.getElementById('close-button')
        .addEventListener('click', () => this.closeNav());

      this.shadowRoot.getElementById('all-bookmarks')
        .addEventListener('change', (event) => this.inputChangeHandler(event));

      this.shadowRoot.getElementById('overlay')
        .addEventListener('click', () => this.closeNav());

      this.renderGroups();
      registerGroupChangeListener(this.renderGroups.bind(this));
    }

    openNav() {
      this.setAttribute('open', '');
    }

    closeNav() {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('navClosed'));
    }

    async renderGroups() {
      const fragment = document.createDocumentFragment();
      const groups = await getGroupsWithFolders();

      let selectedRemoved = true;

      for (const group of groups) {
        const sectionContainer = document.createElement('div');
        sectionContainer.classList.add('section-container');

        const collapseButton = document.createElement('button');
        collapseButton.classList.add('collapse-button');
        const div = document.createElement('div');
        div.textContent = group.name;
        collapseButton.appendChild(div);
        const expandLess = document.createElement('expand-less');
        const exapndMore = document.createElement('expand-more');
        expandLess.setAttribute('size', '26px');
        exapndMore.setAttribute('size', '26px');
        collapseButton.appendChild(expandLess);
        collapseButton.appendChild(exapndMore);
        sectionContainer.appendChild(collapseButton);

        const folderContainer = document.createElement('div');
        folderContainer.classList.add('items-container');

        for (const folder of group.folders) {
          const input = document.createElement('input');
          input.type = 'radio';
          input.id = folder;
          input.name = 'nav-item';
          input.value = folder;
          input.addEventListener('change', (event) => this.inputChangeHandler(event));

          const label = document.createElement('label');
          label.htmlFor = folder;
          label.textContent = folder;
          label.lang = 'en';

          if (folder === this.selected) {
            selectedRemoved = false;
          }

          folderContainer.appendChild(input);
          folderContainer.appendChild(label);
        }

        sectionContainer.appendChild(folderContainer);
        collapseButton.addEventListener('click', () => this.toggleSection(folderContainer));

        fragment.appendChild(sectionContainer);
      }

      if (selectedRemoved) this.setAttribute('selected', '');

      const groupsContainer = this.shadowRoot.getElementById('groups-container');
      groupsContainer.replaceChildren(fragment);
    }

    inputChangeHandler(event) {
      this.setAttribute('selected', event.target.value);
      this.dispatchEvent(
        new CustomEvent('navChange', {
          detail: event.target.value,
        })
      );
    }

    toggleSection(itemsContainer) {
      if (itemsContainer.hasAttribute('collapsed')) {
        itemsContainer.removeAttribute('collapsed');
        itemsContainer.style.display = 'flex';
      } else {
        itemsContainer.setAttribute('collapsed', '');
        itemsContainer.style.display = 'none';
      }
    }

    hideSelected() {
      const navItems = this.shadowRoot.querySelectorAll('input[name="nav-item"]');
      for (const input of navItems) {
        if (input.checked) {
          input.checked = false;
          break;
        }
      }
    }

    showSelected() {
      const navItems = this.shadowRoot.querySelectorAll('input[name="nav-item"]');
      for (const input of navItems) {
        if (input.value === this.selected) {
          input.checked = true;
          break;
        }
      }
    }
  }
)