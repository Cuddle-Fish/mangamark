import {
  hasRootFolderId,
  getRootFolderName,
  getExtensionFolders,
  renameFolder,
  reorderFolders,
  registerBookmarkListener,
  getExtensionSubtree
} from "/externs/bookmark.js";
import { getDomainRegex, setDomainRegex, removeDomainRegex } from '/externs/settings.js'

import "/components/themed-button/themed-button.js";
import "/components/dropdown-menu/dropdown-menu.js";
import "/components/svg-icon/svg-icon.js";
import "/components/set-extension-folder/set-extension-folder.js";

addEventListener('DOMContentLoaded', async () => {
  await storeExtensionFolders();
  setupFolderOptions();
  setupNavOptions();
  setupRegexOptions();
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
  setExtensionElement.buildTree();
  setExtensionElement.clearSelected();
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

// #region Regex Options

let _domainRegex;

async function setupRegexOptions() {
  _domainRegex = await getDomainRegex();
  updateRegexSelection();
  await Promise.resolve();
  selectRegex('');
  setDomainOptions();
  document.getElementById('regex-select')
    .addEventListener('dropdownChange', (event) => selectRegex(event.detail));
  
  document.getElementById('regex-domain').addEventListener('input', regexInputHandler);
  document.getElementById('regex-title').addEventListener('input', regexInputHandler);
  document.getElementById('regex-chapter').addEventListener('input', regexInputHandler);

  document.getElementById('regex-test-button').addEventListener('click', testRegex);
  document.getElementById('regex-remove').addEventListener('click', removeRegex);
  document.getElementById('regex-reset').addEventListener('click', resetRegex);
  document.getElementById('regex-confirm').addEventListener('click', addRegex);
}

function updateRegexSelection() {
  const fragement = document.createDocumentFragment();

  const createOption = document.createElement('option');
  createOption.textContent = '-- Create New Site Regex --';
  createOption.value = '';
  fragement.appendChild(createOption);

  for (const domain of _domainRegex.keys()) {
    const option = document.createElement('option');
    option.textContent = domain;
    fragement.appendChild(option);
  }

  const regexSelect = document.getElementById('regex-select');
  regexSelect.replaceChildren(fragement);
}

function setRegexInput(domain = '', title = '', chapter = '', clearTest = true) {
  const domainInput = document.getElementById('regex-domain');
  domainInput.value = domain;

  const titleInput = document.getElementById('regex-title');
  titleInput.value = title;

  const chapterInput = document.getElementById('regex-chapter');
  chapterInput.value = chapter;
  
  if (clearTest) {
    const testInput = document.getElementById('regex-test-input');
    testInput.value = '';
  }
}

async function getDomains() {
  const domains = new Set();

  function traverseTree(node) {
    if (node.url) {
      try {
        const url = new URL(node.url);
        const domain = url.hostname.startsWith('www.') ? url.hostname.substring(4) : url.hostname;
        domains.add(domain);
      } catch (error) {
        console.warn(`Invalid URL skipped: '${url}'`);
      }
    } else if (node.children) {
      node.children.forEach(child => traverseTree(child));
    }
  }

  const tree = await getExtensionSubtree();
  tree.forEach(node => traverseTree(node));
  return domains;
}

async function setDomainOptions() {
  const domains = await getDomains().then((domainSet) => domainSet.difference(new Set(_domainRegex.keys())));
  
  const domainOptions = document.getElementById('domain-options');
  const fragement = document.createDocumentFragment();
  for (const domain of domains) {
    const option = document.createElement('option');
    option.value = domain;
    fragement.appendChild(option);
  }
  domainOptions.replaceChildren(fragement);
}

function selectRegex(selection, hideText = true) {
  const removeButton = document.getElementById('regex-remove');
  removeButton.disabled = selection === '';

  if (selection === '') {
    setRegexInput();
  } else {
    const { title, chapter } = _domainRegex.get(selection);
    setRegexInput(selection, title, chapter);
  }

  const confirmButton = document.getElementById('regex-confirm');
  confirmButton.disabled = true;
  const resetButton =  document.getElementById('regex-reset');
  resetButton.disabled = true;

  if (hideText) {
    renderRegexTest({ hideContainer: true });
    renderNotificationText({ hideContainer: true });
  }
}

function regexInputHandler() {
  const domainInput = document.getElementById('regex-domain').value.trim();
  const titleInput = document.getElementById('regex-title').value;
  const chapterInput = document.getElementById('regex-chapter').value;
  const selected = document.getElementById('regex-select').selected;
  
  const resetButton =  document.getElementById('regex-reset');
  const confirmButton = document.getElementById('regex-confirm');

  const { title, chapter } = selected === '' ? {title: '', chapter: ''} : _domainRegex.get(selected);
  
  const hasNoChanges = (domainInput === selected && titleInput === title && chapterInput === chapter);
  resetButton.disabled = hasNoChanges;

  if (domainInput !== selected && _domainRegex.has(domainInput)) {
    confirmButton.disabled = true;
  } else if (!domainInput || !titleInput || !chapterInput) {
    confirmButton.disabled = true;
  } else {
    confirmButton.disabled = hasNoChanges;
  }
}

function renderRegexTest({
  title = '',
  chapter = '',
  titleError = false,
  chapterError = false,
  hideContainer = false
} = {}) {
  const resultContainer = document.getElementById('regex-test-results');
  const titleLabel = document.getElementById('test-title-label');
  const chapterLabel = document.getElementById('test-chapter-label');
  const titleValue = document.getElementById('title-result');
  const chapterValue = document.getElementById('chapter-result');

  if (titleError) {
    titleLabel.classList.add('warning-text');
  } else {
    titleLabel.classList.remove('warning-text');
  }

  if (chapterError) {
    chapterLabel.classList.add('warning-text');
  } else {
    chapterLabel.classList.remove('warning-text');
  }

  titleValue.textContent = title;
  chapterValue.textContent = chapter;

  resultContainer.style.display = hideContainer ? 'none' : 'block';
}

function testRegex() {
  const titleValue = document.getElementById('regex-title').value;
  const chapterValue = document.getElementById('regex-chapter').value;
  const testString = document.getElementById('regex-test-input').value;

  const results = { title: '', chapter: '', titleError: false, chapterError: false };

  try {
    const titleRegex = new RegExp(titleValue);
    const titleMatch = testString.match(titleRegex);
    results.title = titleMatch && titleMatch[1] ? titleMatch[1] : 'No Match Found';
  } catch (error) {
    console.log(error);
    results.title = 'ERROR (see console for more info)';
    results.titleError = true;
  }

  try {
    const chapterRegex = new RegExp(chapterValue);
    const chapterMatch = testString.match(chapterRegex);
    results.chapter = chapterMatch && chapterMatch[1] ? chapterMatch[1] : 'No Match Found';
  } catch (error) {
    console.log(error);
    results.chapter = 'ERROR (see console for more info)';
    results.chapterError = true;
  }

  renderRegexTest(results);
}

function renderNotificationText({
  labelText = '',
  errorText = '',
  removedDomain = '',
  setDomain = '',
  hideContainer = false
} = {}) {
  const notificationContainer = document.getElementById('regex-notification');
  const labelElement = notificationContainer.querySelector('.notification-label');
  const ErrorTextElement = notificationContainer.querySelector('.error-text');
  const removedElement = notificationContainer.querySelector('.removed-text');
  const setElement = notificationContainer.querySelector('.added-text');

  labelElement.textContent = labelText;
  ErrorTextElement.textContent = errorText;
  removedElement.textContent = removedDomain;
  setElement.textContent = setDomain;

  if (errorText) {
    labelElement.classList.add('warning-text');
  } else {
    labelElement.classList.remove('warning-text');
  }

  notificationContainer.style.display = hideContainer ? 'none' : 'block';
  if(!hideContainer && notificationContainer.getBoundingClientRect().bottom > window.innerHeight) {
    notificationContainer.scrollIntoView({ behavior: "instant", block: "end" });
  }
}

async function removeRegex() {
  const regexSelect = document.getElementById('regex-select');
  const domain = regexSelect.selected;
  if (domain === '') throw new Error('Error: remove regex attempted in invalid state.');

  try {
    await removeDomainRegex(domain);
    renderNotificationText({ labelText: 'Removed:', removedDomain: domain });
    _domainRegex = await getDomainRegex();
    setDomainOptions();
    updateRegexSelection();
    await Promise.resolve();
    selectRegex('', false);
  } catch (error) {
    console.error(error);
    renderNotificationText({ labelText: 'Error:', errorText: 'failed to remove domain' });
  }
}

function resetRegex() {
  const regexSelect = document.getElementById('regex-select');
  const domain = regexSelect.selected;
  if (domain === '') {
    setRegexInput('', '', '', false);
  } else {
    const { title, chapter } = _domainRegex.get(domain);
    setRegexInput(domain, title, chapter, false);
  }

  const confirmButton = document.getElementById('regex-confirm');
  confirmButton.disabled = true;
  const resetButton =  document.getElementById('regex-reset');
  resetButton.disabled = true;
}

async function addRegex() {
  const domain = document.getElementById('regex-domain').value.trim();
  const titleRegex = document.getElementById('regex-title').value;
  const chapterRegex = document.getElementById('regex-chapter').value;
  const selected = document.getElementById('regex-select').selected;

  if (!domain || !titleRegex || !chapterRegex) {
    return;
  }

  try {
    new RegExp(titleRegex);
    new RegExp(chapterRegex);
  } catch (error) {
    console.log(error);
    renderNotificationText({ labelText: 'Error:', errorText: 'Invalid Regex' });
    return;
  }

  try {
    const notificationText = { labelText: 'Set:' };
    if (selected != '' && selected !== domain) {
      await removeDomainRegex(selected);
      notificationText.removedDomain = selected;
    }
    await setDomainRegex(domain, titleRegex, chapterRegex);
    notificationText.setDomain = domain;
    renderNotificationText(notificationText);
    _domainRegex = await getDomainRegex();
    setDomainOptions();
    updateRegexSelection();
    await Promise.resolve();
    selectRegex('', false);
  } catch (error) {
    console.error(error);
    renderNotificationText({ labelText: 'Error:', errorText: 'failed to set domain' });
    return;
  }
}

// #endregion

registerBookmarkListener(updateFolderInformation);

async function updateFolderInformation() {
  await storeExtensionFolders();
  updateFolderOptionsDisplay();
  const setExtensionElement = document.getElementById('set-extension-folder');
  setExtensionElement.buildTree(true);
  updateDisplayOrder();
}