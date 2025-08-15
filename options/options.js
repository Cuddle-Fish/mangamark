import {
  hasRootFolderId,
  getRootFolderName,
  getExtensionFolders,
  renameFolder,
  reorderFolders,
  registerBookmarkListener
} from "/externs/bookmark.js";

import "/components/themed-button/themed-button.js";
import "/components/dropdown-menu/dropdown-menu.js";
import "/components/svg-icon/svg-icon.js";
import "/components/set-extension-folder/set-extension-folder.js";

addEventListener('DOMContentLoaded', async () => {
  await storeExtensionFolders();
  setupFolderOptions();
  setupNavOptions();
});

let _folders = new Map();

async function storeExtensionFolders() {
  let hasRoot;
  try {
    hasRoot = await hasRootFolderId();
  } catch (error) {
    hasRoot = false;
    console.warn(error);
  }

  if (hasRoot) {
    _folders = await getExtensionFolders();
  } else {
    _folders.clear();
  }
}

// #region Folder Options

function setupFolderOptions() {
  updateFolderOptionsDisplay();
  document.getElementById('folder-rename-select').addEventListener('dropdownChange', selectFolderRenameHandler);
  document.getElementById('folder-rename-input').addEventListener('input', inputFolderRenameHandler);
  document.getElementById('folder-rename-confirm').addEventListener('click', changeFolderNameHandler);
  document.getElementById('edit-extension-folder').addEventListener('click', toggleRootFolderScreen);
  document.getElementById('set-extension-folder').addEventListener('folderSet', rootSetHandler);
}

function updateFolderOptionsDisplay() {
  updateFolderRenameSelection();
  displayRootFolder();
}

function selectFolderRenameHandler(event) {
  const renameInput = document.getElementById('folder-rename-input');
  renameInput.value = '';
  renameInput.disabled = event.detail === '';

  const renameFolderButton = document.getElementById('folder-rename-confirm');
  renameFolderButton.disabled = true;
}

function inputFolderRenameHandler(event) {
  const value = event.target.value.replace(/\s+/g, ' ').trim();
  const normalizedValue = value.toLowerCase();
  let isInvalid = false;
  if (value === '') {
    isInvalid = true
  } else {
    for (const title of _folders.values()) {
      if (title.trim().toLowerCase() === normalizedValue) {
        isInvalid = true;
        break;
      }
    }    
  }

  const renameFolderButton = document.getElementById('folder-rename-confirm');
  renameFolderButton.disabled = isInvalid;
}

async function changeFolderNameHandler(event) {
  const folderId = document.getElementById('folder-rename-select').selected;
  const input = document.getElementById('folder-rename-input');
  const newFolderName = input.value.replace(/\s+/g, ' ').trim();
  await renameFolder(folderId, newFolderName);
}

function updateFolderRenameSelection() {
  const renameSelect = document.getElementById('folder-rename-select');
  const fragement = document.createDocumentFragment();

  const defaultOptions = document.createElement('option');
  defaultOptions.textContent = '-- Choose a Folder --';
  defaultOptions.value = '';
  fragement.appendChild(defaultOptions);

  if (_folders.size === 0) {
    renameSelect.disabled = true;
  } else {
    renameSelect.disabled = false;
    for (const [id, title] of _folders) {
      const option = document.createElement('option');
      option.textContent = title;
      option.value = id;
      fragement.appendChild(option);
    }
  }

  renameSelect.replaceChildren(fragement);

  const input = document.getElementById('folder-rename-input');
  input.value = '';
  input.disabled = true;
  const renameFolderButton = document.getElementById('folder-rename-confirm');
  renameFolderButton.disabled = true;
}

async function displayRootFolder() {
  const displayElement = document.getElementById('extension-folder-name');
  let hasRoot;
  try {
    hasRoot = await hasRootFolderId();
  } catch (error) {
    hasRoot = false;
    console.warn(error);
  }
  if (hasRoot) {
    const rootName = await getRootFolderName();
    displayElement.textContent = rootName;
  } else {
    displayElement.textContent = '';
  }
}

function toggleRootFolderScreen(event) {
  const button = event.currentTarget;
  const setExtensionElement = document.getElementById('set-extension-folder');

  const isVisible = setExtensionElement.style.display === 'block';
  setExtensionElement.style.display = isVisible ? 'none' : 'block';
  button.textContent = isVisible ? 'Change' : 'Close';
}

async function rootSetHandler(event) {
  const editExtensionButton = document.getElementById('edit-extension-folder');
  const setExtensionElement = document.getElementById('set-extension-folder');

  editExtensionButton.textContent = 'Change';
  setExtensionElement.style.display = 'none';
  await storeExtensionFolders();
  updateFolderOptionsDisplay();
  updateDisplayOrder();
}

// #endregion

// #region Navigation Options

let _navOrder;
let _draggedId = null;

function setupNavOptions() {
  updateDisplayOrder();
  document.getElementById('reset-nav-order').addEventListener('click', resetOrderHandler);
  document.getElementById('change-nav-order').addEventListener('click', changeOrderHandler);
}

function updateDisplayOrder() {
  _navOrder = Array.from(_folders.keys());
  const fragement = document.createDocumentFragment();
  for (const [id, title] of _folders) {
    const draggableFolder = createDraggableFolder(title, id);
    addDragListeners(draggableFolder);
    fragement.appendChild(draggableFolder);
  }

  const draggableFolderList = document.getElementById('draggable-folder-list');
  draggableFolderList.replaceChildren(fragement);
}

function createDraggableFolder(name, id) {
  const li = document.createElement('li');
  li.classList.add('draggable-folder');
  li.id = id;
  li.draggable = true;
  const icon = document.createElement('svg-icon');
  icon.type = 'drag-indicator';
  const span = document.createElement('span');
  span.textContent = name;
  li.appendChild(icon);
  li.appendChild(span);
  return li;
}

function addDragListeners(draggableFolder) {
  draggableFolder.addEventListener('dragstart', dragstartHandler);
  draggableFolder.addEventListener('dragend', dragendHandler);
  draggableFolder.addEventListener('dragover', dragoverHandler);
  draggableFolder.addEventListener('dragleave', dragleaveHandler);
  draggableFolder.addEventListener('drop', dropHandler);
}

function dragstartHandler(event) {
  const element = event.currentTarget;
  _draggedId = element.id;
  element.classList.add('dragging');

  const draggableFolderList = document.getElementById('draggable-folder-list');
  draggableFolderList.classList.add('dragging');
}

function dragendHandler(event) {
  _draggedId = null;
  event.currentTarget.classList.remove('dragging');

  const draggableFolderList = document.getElementById('draggable-folder-list');
  draggableFolderList.classList.remove('dragging');
}

function dragoverHandler(event) {
  event.preventDefault();
  
  const target = event.currentTarget;
  const rect = target.getBoundingClientRect();
  const offset = (event.clientY - rect.top) - (rect.height / 2);
  const dropPosition = getDropPosition(target.id, offset);

  if (dropPosition === 'above') {
    target.classList.remove('below-indicator');
    target.classList.add('above-indicator');
  } else if (dropPosition === 'below') {
    target.classList.remove('above-indicator');
    target.classList.add('below-indicator');
  }
}

function dragleaveHandler(event) {
  event.currentTarget.classList.remove('above-indicator', 'below-indicator');
}

function dropHandler(event) {
  event.preventDefault();

  const target = event.currentTarget;
  const rect = target.getBoundingClientRect();
  const offset = (event.clientY - rect.top) - (rect.height / 2);
  const dropPosition = getDropPosition(target.id, offset);

  if (!dropPosition) return;

  const draggedElement = document.getElementById(_draggedId);
  if (dropPosition === 'above') {
    target.insertAdjacentElement('beforebegin', draggedElement);
  } else if (dropPosition === 'below') {
    target.insertAdjacentElement('afterend', draggedElement);
  }

  target.classList.remove('above-indicator', 'below-indicator');

  const draggableFolderList = document.getElementById('draggable-folder-list');
  _navOrder = Array.from(draggableFolderList.children).map(child => child.id);

  let hasChanged = false;
  const currentOrder = Array.from(_folders.keys());
  for (let i = 0; i < currentOrder.length; i++) {
    if (_navOrder[i] !== currentOrder[i]) {
      hasChanged = true;
      break;
    }
  }

  const resetButton = document.getElementById('reset-nav-order');
  const changeOrderButton = document.getElementById('change-nav-order');
  if (hasChanged) {
    resetButton.disabled = false;
    changeOrderButton.disabled = false;
  } else {
    resetButton.disabled = true;
    changeOrderButton.disabled = true;
  }
}

function getDropPosition(targetId, offset) {
  if (targetId === _draggedId) return null;

  const targetIndex = _navOrder.indexOf(targetId);
  const draggedIndex = _navOrder.indexOf(_draggedId);

  if (draggedIndex === -1 || targetIndex === -1) return null;

  if (offset < 0 && draggedIndex !== targetIndex - 1) {
    return 'above';
  } else if (draggedIndex !== targetIndex + 1) {
    return 'below';
  } else {
    return null;
  }
}

function resetOrderHandler(event) {
  updateDisplayOrder();
  const resetButton = document.getElementById('reset-nav-order');
  const changeOrderButton = document.getElementById('change-nav-order');
  resetButton.disabled = true;
  changeOrderButton.disabled = true;
}

async function changeOrderHandler(event) {
  await reorderFolders(_navOrder);
  const resetButton = document.getElementById('reset-nav-order');
  const changeOrderButton = document.getElementById('change-nav-order');
  resetButton.disabled = true;
  changeOrderButton.disabled = true;
}

// #endregion

registerBookmarkListener(updateFolderInformation);

async function updateFolderInformation() {
  await storeExtensionFolders();
  updateFolderOptionsDisplay();
  updateDisplayOrder();
}