import { getGroupsWithFolders, addGroup, changeGroupName, getDefaultGroupName, setDefaultGroupName, setAllGroups } from "/externs/settings.js";
import { getFolderNames, renameBookmarkFolder, reorderFolders, registerBookmarkListener } from "/externs/bookmark.js";

import "/components/themed-button/themed-button.js";
import "/components/dropdown-menu/dropdown-menu.js";

import "/components/svg/arrow-back.js";
import "/components/svg/folder-icon.js";
import "/components/svg/side-navigation.js";
import "/components/svg/drag-indicator.js"

addEventListener('DOMContentLoaded', () => {
  setupFolderOptions();
  setupGroupOptions();
});

// #region Folder Options

let _folders = [];

function setupFolderOptions() {
  updateFolderOptionsDisplay();
  document.getElementById('folder-rename-select').addEventListener('DropdownChange', selectFolderRenameHandler);
  document.getElementById('folder-rename-input').addEventListener('input', inputFolderRenameHandler);
  document.getElementById('folder-rename-confirm').addEventListener('click', changeFolderNameHandler);
}

async function updateFolderOptionsDisplay() {
  _folders = await getFolderNames();
  updateFolderRenameSelection();
}

function selectFolderRenameHandler(event) {
  const renameInput = document.getElementById('folder-rename-input');
  renameInput.disabled = false;
}

function inputFolderRenameHandler(event) {
  const value = event.target.value.replace(/\s+/g, ' ').trim();
  const isInvalid = value === '' || _folders.some((folder) => folder === value);
  const renameFolderButton = document.getElementById('folder-rename-confirm');
  renameFolderButton.disabled = isInvalid;
}

async function changeFolderNameHandler(event) {
  const selectedFolderName = document.getElementById('folder-rename-select').selected;
  const input = document.getElementById('folder-rename-input');
  const newFolderName = input.value.replace(/\s+/g, ' ').trim();
  await renameBookmarkFolder(selectedFolderName, newFolderName);
}

function updateFolderRenameSelection() {
  const fragement = document.createDocumentFragment();
  _folders.forEach(folder => {
    const option = document.createElement('option');
    option.textContent = folder;
    option.value = folder;
    fragement.appendChild(option);
  });

  const renameSelect = document.getElementById('folder-rename-select');
  renameSelect.replaceChildren(fragement);
  renameSelect.updateOptions('');

  const input = document.getElementById('folder-rename-input');
  input.value = '';
  input.disabled = true;
  const renameFolderButton = document.getElementById('folder-rename-confirm');
  renameFolderButton.disabled = true;
}

// #endregion

// #region Navigation Options

let _groups = [];

function setupGroupOptions() {
  updateGroupOptionsDisplay();

  document.getElementById('group-create-input').addEventListener('input', groupInputHandler);
  document.getElementById('group-create-confirm').addEventListener('click', createGroupHandler);

  document.getElementById('group-rename-select').addEventListener('DropdownChange', selectGroupRenameHandler)
  document.getElementById('group-rename-input').addEventListener('input', inputGroupRenameHandler);
  document.getElementById('group-rename-confirm').addEventListener('click', changeGroupNameHandler);

  document.getElementById('group-default-select').addEventListener('DropdownChange', selectDefaultHandler);
  document.getElementById('group-default-confirm').addEventListener('click', changeDefaultHandler);

  document.getElementById('group-remove-select').addEventListener('DropdownChange', selectRemoveHandler);
  document.getElementById('group-remove-confirm').addEventListener('click', removeGroupHandler);

  document.getElementById('group-display-reset').addEventListener('click', updateDisplayOrderList);
  document.getElementById('group-display-confirm').addEventListener('click', confirmDisplayHandler);
}

async function updateGroupOptionsDisplay() {
  _groups = await getGroupsWithFolders();
  updateGroupRenameSelection();
  updateDefaultSelection();
  updateRemoveDisplay();
  updateDisplayOrderList();
}

function groupInputHandler(event) {
  const createGroupButton = document.getElementById('group-create-confirm');
  const value = event.target.value.replace(/\s+/g, ' ').trim();
  const isInvalid = value === '' ||  _groups.some(({ name }) => name === value);
  createGroupButton.disabled = isInvalid;
}

async function createGroupHandler(event) {
  const inputGroup = document.getElementById('group-create-input');
  const newGroupName = inputGroup.value.replace(/\s+/g, ' ').trim();
  await addGroup(newGroupName);
  inputGroup.value = '';
  event.target.disabled = true;

  await updateGroupOptionsDisplay();
}

function selectGroupRenameHandler(event) {
  const renameInput = document.getElementById('group-rename-input');
  renameInput.disabled = false;
}

function inputGroupRenameHandler(event) {
  const value = event.target.value.replace(/\s+/g, ' ').trim();
  const isInvalid = value === '' || _groups.some(({ name }) => name === value);
  const renameGroupButton = document.getElementById('group-rename-confirm');
  renameGroupButton.disabled = isInvalid;
}

async function changeGroupNameHandler(event) {
  const selectedGroupName = document.getElementById('group-rename-select').selected;
  const newGroupName = document.getElementById('group-rename-input').value.replace(/\s+/g, ' ').trim();
  await changeGroupName(selectedGroupName, newGroupName);
  await updateGroupOptionsDisplay();
}

async function selectDefaultHandler(event) {
  const defaultGroup = await getDefaultGroupName();
  const changeDefaultButton = document.getElementById('group-default-confirm');
  changeDefaultButton.disabled = event.detail === defaultGroup;
}

async function changeDefaultHandler(event) {
  const defaultSelection = document.getElementById('group-default-select');
  const newDefault = defaultSelection.selected;
  await setDefaultGroupName(newDefault);
  await updateGroupOptionsDisplay();
}

async function selectRemoveHandler(event) {
  const selectedValue = event.detail;

  const confirmRemoveButton = document.getElementById('group-remove-confirm');
  const defaultGroupName = await getDefaultGroupName();
  confirmRemoveButton.disabled = selectedValue === defaultGroupName;
  const selectedGroup = _groups.find(({ name }) => name === selectedValue);

  const moveFoldersText = document.getElementById('group-remove-move-text');
  const moveFoldersSelect = document.getElementById('group-move-folders-select');
  if (selectedGroup?.numFolders) {
    moveFoldersText.classList.remove('obscure');
    moveFoldersSelect.disabled = false;
  } else {
    moveFoldersText.classList.add('obscure');
    moveFoldersSelect.disabled = true;
  }

  if (moveFoldersSelect.selected === selectedValue) {
    moveFoldersSelect.selected = defaultGroupName;
  }

  for (const option of moveFoldersSelect.options) {
    if (option.value === selectedValue) {
      moveFoldersSelect.setInputDisabled(option.value, true);
    } else {
      moveFoldersSelect.setInputDisabled(option.value, false);
    }
  }
}

async function removeGroupHandler(event) {
  try {
    const removeName = document.getElementById('group-remove-select').selected;
    const groups = await getGroupsWithFolders();
    const removeIndex = groups.findIndex(({ name }) => name === removeName);
    const [removeGroup] = groups.splice(removeIndex, 1);

    if (removeGroup.folders.length) {
      const relocationName = document.getElementById('group-move-folders-select').selected;
      const relocationGroup = groups.find(({ name }) => name === relocationName);
      relocationGroup.folders.push(...removeGroup.folders);
      relocationGroup.numFolders += removeGroup.numFolders;
      const updatedFolders = groups.flatMap(({ folders }) => folders);
      await reorderFolders(updatedFolders);
    }
    
    const updateGroups = groups.map(({ name, numFolders }) => ({ name, numFolders }));
    await setAllGroups(updateGroups);
    await updateGroupOptionsDisplay();
  } catch (error) {
    console.error('Error performing remove group action:', error);
  }
}

async function confirmDisplayHandler(event) {
  const groupList = document.querySelectorAll('#group-display-list > .group-item');
  const updatedGroups = [];
  const updatedFolders = [];

  groupList.forEach(groupElement => {
    const groupName = groupElement.querySelector('.group-name-container span').textContent;
    const folderList = groupElement.querySelectorAll('.folder-list > li');

    const group = { name: groupName, numFolders: folderList.length };
    updatedGroups.push(group);

    folderList.forEach(folder => {
      const folderName = folder.querySelector('.folder-name-container span').textContent;
      updatedFolders.push(folderName);
    });
  });

  if (updatedFolders.length !== 0) {
    await reorderFolders(updatedFolders);
  }
  await setAllGroups(updatedGroups);

  await updateGroupOptionsDisplay();
}

async function updateGroupRenameSelection() {
  const defaultGroup = await getDefaultGroupName();
  const fragment = document.createDocumentFragment();
  _groups.forEach(group => {
    const option = document.createElement('option');
    option.value = group.name;
    option.textContent = group.name;

    if (group.name === defaultGroup) {
      option.textContent += ' - (default)';
    }

    fragment.appendChild(option);
  });

  const renameSelect = document.getElementById('group-rename-select');
  renameSelect.replaceChildren(fragment);
  renameSelect.updateOptions('');

  const renameInput = document.getElementById('group-rename-input');
  renameInput.value = '';
  renameInput.disabled = true;

  const confirmRenameButton = document.getElementById('group-rename-confirm');
  confirmRenameButton.disabled = true;
}

async function updateDefaultSelection() {
  const defaultGroup = await getDefaultGroupName();
  const fragment = document.createDocumentFragment();
  _groups.forEach(group => {
    const option = document.createElement('option');
    option.value = group.name;
    option.textContent = group.name;

    if (group.name === defaultGroup) {
      option.textContent += ' - (default)';
    }

    fragment.appendChild(option);
  });

  const selectDefault = document.getElementById('group-default-select');
  selectDefault.replaceChildren(fragment);
  selectDefault.updateOptions(defaultGroup);

  const changeDefault = document.getElementById('group-default-confirm');
  changeDefault.disabled = true;
}

async function updateRemoveDisplay() {
  const defaultGroup = await getDefaultGroupName();
  const removeOptionsFrag = document.createDocumentFragment();
  const relocateOptionsFrag = document.createDocumentFragment();

  for (const group of _groups) {
    const removeOption = document.createElement('option');
    const relocateOption = document.createElement('option');

    removeOption.textContent = group.name;
    relocateOption.textContent = group.name;
    removeOption.value = group.name;
    relocateOption.value = group.name;

    if (group.name === defaultGroup) {
      removeOption.textContent += ' - (default)';
      relocateOption.textContent += ' - (default)';
    } else if (!group.numFolders) {
      removeOption.textContent += ' - (empty)';
    }

    removeOptionsFrag.appendChild(removeOption);
    relocateOptionsFrag.appendChild(relocateOption);
  }

  const selectRemove = document.getElementById('group-remove-select');
  const selectRelocate = document.getElementById('group-move-folders-select');
  selectRemove.replaceChildren(removeOptionsFrag);
  selectRemove.updateOptions('');
  selectRemove.setInputDisabled(defaultGroup, true);
  selectRelocate.replaceChildren(relocateOptionsFrag);
  selectRelocate.updateOptions(defaultGroup);
  selectRelocate.disabled = true;

  const relocateText = document.getElementById('group-remove-move-text');
  relocateText.classList.add('obscure');

  const removeGroupButton = document.getElementById('group-remove-confirm');
  removeGroupButton.disabled = true;
}

async function updateDisplayOrderList() {
  const fragment = document.createDocumentFragment();
  for (const group of _groups) {
    const groupItem = document.createElement('li');
    groupItem.classList.add('group-item');
    groupItem.draggable = true;
    const groupNameContainer = document.createElement('div');
    groupNameContainer.classList.add('group-name-container');
    const groupDragIndicator = document.createElement('drag-indicator');
    const groupNameText = document.createElement('span');
    groupNameText.textContent = group.name;
    groupNameContainer.appendChild(groupDragIndicator);
    groupNameContainer.appendChild(groupNameText);
    groupItem.appendChild(groupNameContainer);

    const folderList = document.createElement('ul');
    folderList.classList.add('folder-list');
    groupItem.appendChild(folderList);

    for (const folder of group.folders) {
      const folderItem = document.createElement('li');
      const div = document.createElement('div');
      div.classList.add('folder-name-container');
      const dragIndicator = document.createElement('drag-indicator');
      const text = document.createElement('span');
      text.textContent = folder;
      div.appendChild(dragIndicator);
      div.appendChild(text);
      folderItem.appendChild(div);
      folderItem.draggable = true;
      folderList.appendChild(folderItem);
    }

    fragment.appendChild(groupItem);
  }
  const groupList = document.getElementById('group-display-list');
  groupList.replaceChildren(fragment);
  const resetButton = document.getElementById('group-display-reset');
  resetButton.disabled = true;
  const confirmButton = document.getElementById('group-display-confirm');
  confirmButton.disabled = true;
  setupDragListeners();
}

function setupDragListeners() {
  document.querySelectorAll('.group-item[draggable="true"]').forEach(group => {
    group.addEventListener('dragstart', dragstartHandler);
    group.addEventListener('dragend', dragendHandler);
    group.addEventListener('dragover', dragoverHandler);
    group.addEventListener('dragleave', dragleaveHandler);
    group.addEventListener('drop', dropHandler);
  });

  document.querySelectorAll('.folder-list li[draggable="true"]').forEach(folder => {
    folder.addEventListener('dragstart', (event) => {
      event.stopPropagation();
      dragstartHandler(event);
    });
    folder.addEventListener('dragend', (event) => {
      event.stopPropagation();
      dragendHandler(event);
    });
  });
}

let _dragItem = null;

function dragstartHandler(event) {
  _dragItem = event.target;
  document.getElementById('group-display-list').classList.add('dragging');
  setTimeout(() => {
    _dragItem.style.display = 'none';
  }, 0);
}

function dragendHandler(event) {
  document.getElementById('group-display-list').classList.remove('dragging');
  setTimeout(() => {
    _dragItem.style.display = 'block';
    _dragItem = null;
  });
}

function dragoverHandler(event) {
  event.preventDefault();
  const { list, items } = getListAndItems(event.currentTarget);
  clearInsertionIndicator(list, items);
  if (items.length === 0) {
    list.classList.add('insert-after');
    return;
  }

  const { insertionElement, position } = getInsertionInfo(list, items, event.clientY);
  if (position === 'beforebegin') {
    insertionElement.classList.add('insert-before');
  } else {
    insertionElement.classList.add('insert-after');
  }
}

function dragleaveHandler(event) {
  const { list, items } = getListAndItems(event.currentTarget);
  clearInsertionIndicator(list, items);
}

function dropHandler(event) {
  const { list, items } = getListAndItems(event.currentTarget);
  clearInsertionIndicator(list, items);
  const resetButton = document.getElementById('group-display-reset');
  resetButton.disabled = false;
  const confirmButton = document.getElementById('group-display-confirm');
  confirmButton.disabled = false;

  if (items.length === 0) {
    list.appendChild(_dragItem);
    return;
  }

  const { insertionElement, position } = getInsertionInfo(list, items, event.clientY);
  insertionElement.insertAdjacentElement(position, _dragItem);
}

function clearInsertionIndicator(list, items) {
  list.classList.remove('insert-after');
  items.forEach(item => {
    item.classList.remove('insert-after', 'insert-before');
  });
}

function getListAndItems(currentTarget) {
  if (_dragItem.classList.contains('group-item')) {
    const listElement = document.getElementById('group-display-list');
    const listItems = listElement.querySelectorAll('.group-item');
    return { list: listElement, items: listItems };
  } else {
    const listElement = currentTarget.querySelector('ul');
    const listItems = listElement.querySelectorAll('li');
    return { list: listElement, items: listItems };
  }
}

function getInsertionInfo(listElement, nodeItems, clientY) {
  const listItems = [...nodeItems];
  const itemBelow = getListItemBelow(listItems, clientY);
  if (itemBelow) {
    return { insertionElement: itemBelow, position: 'beforebegin' };
  } else {
    return { insertionElement: listElement.lastElementChild, position: 'afterend' };
  }
}

function getListItemBelow(listItems, clientY) {
  return listItems.reduce((closest, child) => {
    const rect = child.getBoundingClientRect();
    const offset = clientY - rect.top - rect.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// #endregion

registerBookmarkListener(updateFolderInformation);

async function updateFolderInformation() {
  _folders = await getFolderNames();
  updateFolderRenameSelection();

  _groups = await getGroupsWithFolders();
  updateDisplayOrderList();
}