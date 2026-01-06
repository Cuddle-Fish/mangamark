import "/components/svg-icon/svg-icon.js";
import "/components/themed-button/themed-button.js";

const template = document.createElement('template');
template.innerHTML = /* html */ `
  <style>
    @import "/components/set-extension-folder/folder-node.css";
  </style>
  <div id="container">
    <div id="arrow-wrapper">
      <svg-icon id="expand-arrow" type="expand-more"></svg-icon>
    </div>
    <div id="title-container">
      <div id="inner-container">
        <svg-icon type="folder"></svg-icon>
        <div id="folder-title"></div>
      </div>
    </div>
  </div>
  <div id="children" style="display: none">
  </div>
`;

customElements.define(
  'folder-node',
  class extends HTMLElement {
    #bookmarkId;

    get title() {
      const titleElement = this.shadowRoot.getElementById('folder-title');
      return titleElement.textContent;
    }

    get id() {
      return this.#bookmarkId;
    }

    get selected() {
      return this.hasAttribute('is-selected') && this.getAttribute('is-selected') !== false;
    }

    set selected(value) {
      value === true ? this.setAttribute('is-selected', '') : this.removeAttribute('is-selected');
    }

    constructor() {
      super();
      const shadowRoot = this.attachShadow({ mode: 'open' });
      shadowRoot.appendChild(template.content.cloneNode(true));
    }

    connectedCallback() {
      const titleContainer = this.shadowRoot.getElementById('container');
      titleContainer.addEventListener('click', (event) => this.titleSelectHandler(event));

      const expandArrow = this.shadowRoot.getElementById('expand-arrow');
      expandArrow.addEventListener('click', (event) => this.expandHandler(event));
    }

    createNode(node, depth, selectedId) {
      this.#bookmarkId = node.id;
      const folderTitle = this.shadowRoot.getElementById('folder-title');
      folderTitle.textContent = node.title;
      this.style.setProperty('--depth', depth);

      let matchingNode = null;
      if (selectedId && selectedId === node.id) {
        this.selected = true;
        matchingNode = this;
      }

      const fragment = document.createDocumentFragment();
      let hasFolders = false;
      for (const child of node.children) {
        if (!child.url) {
          hasFolders = true;
          const childNode = document.createElement('folder-node');
          const hasMatching = childNode.createNode(child, depth + 1, selectedId);
          if (hasMatching) matchingNode = hasMatching;
          fragment.appendChild(childNode);
        }
      }
      const arrowWrapper = this.shadowRoot.getElementById('arrow-wrapper');
      arrowWrapper.style.visibility = hasFolders ? "visible" : "hidden";
      const childrenElement = this.shadowRoot.getElementById('children');
      childrenElement.replaceChildren(fragment);

      return matchingNode;
    }

    expandHandler(event) {
      event.stopPropagation();
      const expandArrow = this.shadowRoot.getElementById('expand-arrow');
      const children = this.shadowRoot.getElementById('children');
      if (expandArrow.type === 'expand-more') {
        expandArrow.type = 'expand-less';
        children.style.display = "block";
      } else {
        expandArrow.type = 'expand-more';
        children.style.display = "none";
      }
    }

    titleSelectHandler(event) {
      this.dispatchEvent(new CustomEvent('folder-selected', {
        bubbles: true,
        composed: true,
        detail: { selectedNode: this }
      }));
    }
  }
)