import { getGroupsWithFolders, addGroup, getDefaultGroupName, setDefaultGroupName, setAllGroups } from "/externs/settings.js";
import { getFolderNames, reorderFolders } from "/externs/bookmark.js";
import "/components/svg/arrow-back.js";

addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get()
    .then((results) => {
      console.log(results);
      const listContainer = document.getElementById('sync-list');
      Object.entries(results).forEach(([key, value]) => {
        const outerDiv = document.createElement('div');
        outerDiv.textContent = key;
        outerDiv.style.fontWeight = 'bold';
        const innerDiv = document.createElement('div');
        if (typeof value === 'object') {
          innerDiv.textContent = JSON.stringify(value);
        } else {
          innerDiv.textContent = value;          
        }
        innerDiv.style.fontWeight = 'normal';
        innerDiv.style.marginLeft = '10px';
        outerDiv.appendChild(innerDiv);
        listContainer.appendChild(outerDiv);
      });
    });

  setupNavigationOptions();
});

// #region Folder Options

function setupFolderOptions() {
  // rename folders
}

// #endregion

// #region Navigation Options

let _groups = [];

async function setupNavigationOptions() {
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
  _groups = await getGroupsWithFolders();
  updateDefaultSelection();
  updateRemoveDisplay();
  updateGroupList();
}

function groupInputHandler(event) {
  const createGroup = document.getElementById('create-group');
  const value = event.target.value;
  const result = _groups.some(({ name }) => name === value);
  createGroup.disabled = result;
}

async function createGroupHandler(event) {
  const inputGroup = document.getElementById('input-group');
  const newGroupName = inputGroup.value;
  await addGroup(newGroupName);
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
  await setDefaultGroupName(newDefault);
  await updateNavigationDisplay();
}

async function selectRemoveHandler(event) {
  const selectedValue = event.target.value;

  const removeGroupElement = document.getElementById('remove-group');
  const defaultGroupName = await getDefaultGroupName();
  removeGroupElement.disabled = selectedValue === '' || selectedValue === defaultGroupName;
  const selectedGroup = _groups.find(({ name }) => name === selectedValue);

  const relocateText = document.getElementById('relocate-text');
  const relocateSelect = document.getElementById('select-relocation');
  if (selectedGroup?.numFolders) {
    relocateText.classList.remove('obscure');
    relocateSelect.disabled = false;
  } else {
    relocateText.classList.add('obscure');
    relocateSelect.disabled = true;
  }

  if (relocateSelect.value === selectedValue) {
    relocateSelect.value = defaultGroupName;
  }

  for (const option of relocateSelect.options) {
    if (option.value === selectedValue) {
      option.disabled = true;
    } else {
      option.disabled = false;
    }
  }
}

async function removeGroupHandler(event) {
  try {
    const removeName = document.getElementById('select-remove').value;
    const groups = await getGroupsWithFolders();
    const removeGroup  = groups.find(({ name }) => name === removeName);
    if (removeGroup.numFolders) {
      const relocationName = document.getElementById('select-relocation').value;
      const relocationGroup = groups.find(({ name }) => name === relocationName);

      relocationGroup.folders.push(...removeGroup.folders);
      relocationGroup.numFolders += removeGroup.numFolders;

      const removeIndex = groups.findIndex(({ name }) => name === removeName);
      groups.splice(removeIndex, 1);

      const updatedFolders = groups.flatMap(({ folders }) => folders);
      const updateGroups = groups.map(({ name, numFolders }) => ({ name, numFolders }));

      await reorderFolders(updatedFolders);
      await setAllGroups(updateGroups);
      await updateNavigationDisplay();
    }
  } catch (error) {
    console.error('Error performing remove group action:', error);
  }
}

async function confirmDisplayHandler(event) {
  const groupList = document.querySelectorAll('#group-list > .group-item');
  const updatedGroups = [];
  const updatedFolders = [];

  groupList.forEach(groupElement => {
    const groupName = groupElement.childNodes[0].nodeValue.trim();
    const folderList = groupElement.querySelectorAll('.folder-list > li');

    const group = { name: groupName, numFolders: folderList.length };
    updatedGroups.push(group);

    folderList.forEach(folder => {
      const folderName = folder.textContent.trim();
      updatedFolders.push(folderName);
    });
  });

  await setAllGroups(updatedGroups);
  await reorderFolders(updatedFolders);

  await updateNavigationDisplay();
}

async function updateDefaultSelection() {
  const defaultGroup = await getDefaultGroupName();
  const fragment = document.createDocumentFragment();
  _groups.forEach(group => {
    const option = document.createElement('option');
    option.value = group.name;
    option.textContent = group.name;

    if (group.name === defaultGroup) {
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

    removeOption.textContent = group.name;
    relocateOption.textContent = group.name;
    removeOption.value = group.name;
    relocateOption.value = group.name;

    if (group.name === defaultGroup) {
      removeOption.disabled = true;
      relocateOption.selected = true;
      removeOption.textContent += ' - (default)';
      relocateOption.textContent += ' - (default)';
    } else if (!group.numFolders) {
      removeOption.textContent += ' - (empty)';
    }

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
    groupItem.textContent = group.name;

    const folderList = document.createElement('ul');
    folderList.classList.add('folder-list');
    groupItem.appendChild(folderList);

    for (const folder of group.folders) {
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