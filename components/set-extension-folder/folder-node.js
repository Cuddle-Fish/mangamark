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
    #selectedNode = null;

    get title() {
      const titleElement = this.shadowRoot.getElementById('folder-title');
      return titleElement.textContent;
    }

    get id() {
      return this.#bookmarkId;
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

    buildTree(tree) {
      this.#selectedNode = null;
      this.addEventListener('folder-selected', (event) => this.#folderSelected(event));

      const container = this.shadowRoot.getElementById('container');
      container.style.display = "none";
      const childrenElement = this.shadowRoot.getElementById('children');
      childrenElement.style.display = "block";

      const fragment = document.createDocumentFragment();
      for (const child of tree.children) {
        const childNode = document.createElement('folder-node');
        childNode.createNode(child, 0);
        fragment.appendChild(childNode);
      }
      childrenElement.replaceChildren(fragment);
    }

    createNode(node, depth) {
      this.#bookmarkId = node.id;
      const folderTitle = this.shadowRoot.getElementById('folder-title');
      folderTitle.textContent = node.title;
      this.style.setProperty('--depth', depth);

      const fragment = document.createDocumentFragment();
      let hasFolders = false;
      for (const child of node.children) {
        if (!child.url) {
          hasFolders = true;
          const childNode = document.createElement('folder-node');
          childNode.createNode(child, depth + 1);
          fragment.appendChild(childNode);
        }
      }
      const arrowWrapper = this.shadowRoot.getElementById('arrow-wrapper');
      arrowWrapper.style.visibility = hasFolders ? "visible" : "hidden";
      const childrenElement = this.shadowRoot.getElementById('children');
      childrenElement.replaceChildren(fragment);
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

    #folderSelected(event) {
      event.stopPropagation();
      const selectedNode = event.detail.selectedNode;
      this.selectNode(selectedNode);
    }

    selectNode(node) {
      if (this.#selectedNode && this.#selectedNode !== node) {
        this.#selectedNode.removeAttribute('is-selected');
      }
      this.#selectedNode = node;
      node.setAttribute('is-selected', '');

      this.dispatchEvent(new CustomEvent('select', {
        detail: { title: node.title, id: node.id }
      }));
    }

    deselectFolder() {
      if (this.#selectedNode) {
        this.#selectedNode.removeAttribute('is-selected');
        this.#selectedNode = null;
      }
    }
  }
)