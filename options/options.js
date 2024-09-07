import { 
  getNavigationGroups, addNavigationGroup, changeNavigationGroupOrder ,removeNavigationGroup, 
  getDefaultGroupName, changeDefaultGroup, 
  getGroupFolders, updateGroupFolders, moveGroupFolders, removeDeadFolders
} from "/externs/settings.js";

import "/components/svg/arrow-back.js";

addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get()
    .then((results) => {
      console.log(results);
      const listContainer = document.getElementById('sync-list');
      Object.entries(results).forEach(([key, value]) => {
        const div = document.createElement('div');
        div.textContent = `key: ${key} : value: ${value}`;
        listContainer.appendChild(div);
      });
    });

  setupNavigationOptions();
});

// #region Folder Options

function setupFolderOptions() {

}

// #endregion

// #region Navigation Options

let _groups = [];

async function setupNavigationOptions() {
  await removeDeadFolders();
  await updateNavigationDisplay();

  document.getElementById('input-group').addEventListener('input', groupInputHandler);
  document.getElementById('create-group').addEventListener('click', createGroupHandler);

  document.getElementById('select-default').addEventListener('change', selectDefaultHandler);
  document.getElementById('change-default').addEventListener('click', changeDefaultHandler);

  document.getElementById('select-remove').addEventListener('change', selectRemoveHandler);
  document.getElementById('remove-group').addEventListener('click', removeGroupHandler);

  document.getElementById('reset-display').addEventListener('click', updateGroupList);
  document.getElementById('confirm-display').addEventListener('click', confirmDisplayHandler);
}

async function updateNavigationDisplay() {
  _groups = await getNavigationGroups();
  updateDefaultSelection();
  updateRemoveDisplay();
  updateGroupList();
}

function groupInputHandler(event) {
  const createGroup = document.getElementById('create-group');
  const value = event.target.value;
  createGroup.disabled = value === '' || _groups.includes(value);
}

async function createGroupHandler(event) {
  const inputGroup = document.getElementById('input-group');
  const newGroupName = inputGroup.value;
  await addNavigationGroup(newGroupName);
  inputGroup.value = '';
  event.target.disabled = true;

  await updateNavigationDisplay();
}

async function selectDefaultHandler(event) {
  const defaultGroup = await getDefaultGroupName();
  const changeDefault = document.getElementById('change-default');
  changeDefault.disabled = event.target.value === defaultGroup;
}

async function changeDefaultHandler(event) {
  const defaultSelection = document.getElementById('select-default');
  const newDefault = defaultSelection.value;
  await changeDefaultGroup(newDefault);
  await updateNavigationDisplay();
}

function selectRemoveHandler(event) {
  const selectedValue = event.target.value;
  const prefix = selectedValue.substring(0, 3);
  const actualValue = selectedValue.substring(3);

  const removeGroup = document.getElementById('remove-group');
  removeGroup.disabled = selectedValue === '' || prefix === '_d_';

  const relocateText = document.getElementById('relocate-text');
  const relocateSelect = document.getElementById('select-relocation');
  if (prefix === '_f_') {
    relocateText.classList.remove('obscure');
    relocateSelect.disabled = false;
  } else {
    relocateText.classList.add('obscure');
    relocateSelect.disabled = true;
  }

  if (relocateSelect.value === actualValue) {
    const defaultOption = event.target.querySelector(`option[value^='_d_']`);
    relocateSelect.value = defaultOption.value.substring(3);
  }

  for (const option of relocateSelect.options) {
    if (option.value === actualValue) {
      option.disabled = true;
    } else {
      option.disabled = false;
    }
  }
}

async function removeGroupHandler(event) {
  const selectedRemoveValue = document.getElementById('select-remove').value;
  const prefix = selectedRemoveValue.substring(0, 3);
  const groupToRemove = selectedRemoveValue.substring(3);

  if (prefix === '_f_') {
    const relocationFolder = document.getElementById('select-relocation').value;
    await moveGroupFolders(relocationFolder, groupToRemove);
  }

  await removeNavigationGroup(groupToRemove);
  await updateNavigationDisplay();
}

async function confirmDisplayHandler(event) {
  const groupList = document.querySelectorAll('#group-list > .group-item');
  const groups = {};

  groupList.forEach(group => {
    const groupName = group.childNodes[0].nodeValue.trim();
    const folderList = group.querySelectorAll('.folder-list > li');
    const folders = [];

    folderList.forEach(folder => {
      const folderName = folder.textContent.trim();
      folders.push(folderName);
    });

    groups[groupName] = folders;
  });

  console.log(Object.keys(groups));
  await changeNavigationGroupOrder(Object.keys(groups));

  for (const [groupName, folders] of Object.entries(groups)) {
    await updateGroupFolders(groupName, folders);
  }
  await updateNavigationDisplay();
}

async function updateDefaultSelection() {
  const defaultGroup = await getDefaultGroupName();
  const fragment = document.createDocumentFragment();
  _groups.forEach(group => {
    const option = document.createElement('option');
    option.value = group;
    option.textContent = group;

    if (group === defaultGroup) {
      option.selected = true;
      option.textContent += ' - (default)';
    }

    fragment.appendChild(option);
  });

  const selectDefault = document.getElementById('select-default');
  selectDefault.replaceChildren(fragment);

  const changeDefault = document.getElementById('change-default');
  changeDefault.disabled = true;
}

async function updateRemoveDisplay() {
  const defaultGroup = await getDefaultGroupName();
  const removeOptionsFrag = document.createDocumentFragment();
  const relocateOptionsFrag = document.createDocumentFragment();

  const removeDefaultOption = document.createElement('option');
  removeDefaultOption.value = '';
  removeDefaultOption.textContent = '--Select Group to Remove--';
  removeDefaultOption.selected = true;
  removeOptionsFrag.appendChild(removeDefaultOption);

  for (const group of _groups) {
    const removeOption = document.createElement('option');
    const relocateOption = document.createElement('option');

    removeOption.textContent = group;
    relocateOption.textContent = group;

    if (group === defaultGroup) {
      removeOption.disabled = true;
      relocateOption.selected = true;

      removeOption.textContent += ' - (default';
      relocateOption.textContent += ' - (default)'

      removeOption.value = '_d_';
    } else {
      const folders = await getGroupFolders(group);
      if (folders.length === 0) {
        removeOption.textContent += ' - (empty)';
        removeOption.value = '_e_';
      } else {
        removeOption.value = '_f_';
      }
    }

    removeOption.value += group;
    relocateOption.value = group;

    removeOptionsFrag.appendChild(removeOption);
    relocateOptionsFrag.appendChild(relocateOption);
  }

  const selectRemove = document.getElementById('select-remove');
  const selectRelocate = document.getElementById('select-relocation');
  selectRemove.replaceChildren(removeOptionsFrag);
  selectRelocate.replaceChildren(relocateOptionsFrag);

  const relocateText = document.getElementById('relocate-text');
  relocateText.classList.add('obscure');

  const relocateSelect = document.getElementById('select-relocation');
  relocateSelect.disabled = true;

  const removeGroup = document.getElementById('remove-group');
  removeGroup.disabled = true;
}

async function updateGroupList() {
  const fragment = document.createDocumentFragment();
  for (const group of _groups) {
    const groupItem = document.createElement('li');
    groupItem.classList.add('group-item');
    groupItem.draggable = true;
    groupItem.textContent = group;

    const folderList = document.createElement('ul');
    folderList.classList.add('folder-list');
    groupItem.appendChild(folderList);

    const folders = await getGroupFolders(group);
    for (const folder of folders) {
      const folderItem = document.createElement('li');
      const span = document.createElement('span');
      folderItem.appendChild(span);
      folderItem.appendChild(document.createTextNode(folder));
      folderItem.draggable = true;
      folderList.appendChild(folderItem);
    }

    fragment.appendChild(groupItem);
  }
  const groupList = document.getElementById('group-list');
  groupList.replaceChildren(fragment);
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
  document.getElementById('group-list').classList.add('dragging');
  setTimeout(() => {
    _dragItem.style.display = 'none';
  }, 0);
}

function dragendHandler(event) {
  document.getElementById('group-list').classList.remove('dragging');
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
    const listElement = document.getElementById('group-list');
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