import { getFolderNames } from "/externs/bookmark.js";

function getStatusFilter() {
  return chrome.storage.sync.get('_int_managerStatusFilter')
    .then((result) => result._int_managerStatusFilter || 'all')
    .catch((error) => {
      console.error(`Error retrieving _int_managerStatusFilter: ${error}`);
      return 'all';
    });
}

function setStatusFilter(readingStatus) {
  const validStatuses = ['all', 'reading', 'Completed', 'Plan to Read', 'Re-Reading', 'On Hold'];
  if (!validStatuses.includes(readingStatus)) {
    return Promise.reject(new Error(`Invalid reading status: ${readingStatus}`));
  }

  return chrome.storage.sync.set({'_int_managerStatusFilter': readingStatus});
}

function getDisplayOrder() {
  return chrome.storage.sync.get('_int_managerOrder')
  .then((result) => result._int_managerOrder || 'Recent')
  .catch((error) => {
    console.error(`Error retrieving _int_managerOrder: ${error}`);
    return 'Recent';
  });
}

function setDisplayOrder(order) {
  const validOrders = ['Recent', 'Oldest', 'Az', 'Za'];
  if (!validOrders.includes(order)) {
    return Promise.reject(new Error(`Invalid reading status: ${order}`));
  }

  return chrome.storage.sync.set({'_int_managerOrder': order});
}

function getDisplaySettings() {
  return chrome.storage.sync.get(['_int_managerOrder', '_int_managerStatusFilter'])
    .then((result) => {
      const order = result._int_managerOrder || 'Recent';
      const status = result._int_managerStatusFilter || 'all';
      return { order, status };
    })
    .catch((error) => {
      console.error(`Error retrieving manager settings: ${error}`);
      return { order: 'Recent', status: 'all' };
    });
}

function getNavigationGroups() {
  return chrome.storage.sync.get('_int_navGroups')
    .then((result) => {
      if (result._int_navGroups) {
        return result._int_navGroups;
      } else {
        return getDefaultGroupName().then((defaultGroup) => [defaultGroup]);
      }
    })
    .catch((error) => console.error(`Error retrieving navigation groups: ${error}`));
}

function addNavigationGroup(newGroupName) {
  getNavigationGroups()
    .then((groups) => {
      if (groups.includes(newGroupName)) {
        throw new Error('addNavigationGroup recieved group name that already exists.');
      }

      return groups.push(newGroupName);
    })
    .then((updatedGroups) => chrome.storage.sync.set({ '_int_navGroups': updatedGroups }))
    .catch((error) => console.error(`Error adding navigation group: ${error}`));
}

function changeNavigationGroupOrder(orderedGroups) {
  getNavigationGroups()
    .then((groups) => {
      if (!Array.isArray(orderedGroups)) {
        throw new Error('changeNavigationGroupOrder recieved non array argument');
      }
      if (groups.length !== orderedGroups.length) {
        throw new Error('changeNavigationGroupOrder all groups not present in orderedGroups');
      }

      const sortedGroups = [...groups].sort();
      const sortedNewOrder = [...orderedGroups].sort();
      for (let i = 0; i < sortedGroups.length; i++) {
        if (sortedGroups[i] !== sortedNewOrder[i]) {
          throw new Error('changeNavigationGroupOrder all groups not present in orderedGroups');
        }
      }

      chrome.storage.sync.set({ '_int_navGroups': orderedGroups});
    })
    .catch((error) => console.error(`Error changing navigation group order: ${error}`));
}

async function removeNavigationGroup(groupName) {
  try {
    const defaultGroup = await getDefaultGroupName();
    if (groupName === defaultGroup) {
      throw new Error('removeNavigationGroup can not remove default group.');
    }

    const groups = await getNavigationGroups();
    if (!groups.includes(groupName)) {
      throw new Error('removeNavigationGroup recieved group name that does not exist.');
    }

    const groupFolder = await getGroupFolders(groupName);
    if (groupFolder.length !== 0) {
      throw new Error('removeNavigationGroup attempt to remove non empty group, all folders must be moved/removed first.');
    }

    await chrome.storage.sync.remove(`_g_${groupName}`);
    const updatedGroups = groups.filter(group => group !== groupName);
    await chrome.storage.sync.set({ '_int_navGroups': updatedGroups });
  } catch (error) {
    console.error(`Error removing navigation group: ${error}`);
  }
}

function getDefaultGroupName() {
  return chrome.storage.sync.get('_int_defaultGroup')
    .then((result) => result._int_defaultGroup || 'Folders')
    .catch((error) => console.error(`Error retrieving default group: ${error}`));
}

async function changeDefaultGroup(groupName) {
  try {
    const groups = await getNavigationGroups();
    if (!groups.includes(groupName)) {
      throw new Error('changeDefaultGroup recieved group name that does not exist.');
    }

    const defaultGroup = await getDefaultGroupName();
    const defaultFolders = await getDefaultGroupFolders();
    await chrome.storage.sync.set({ [`_g_${defaultGroup}`]: defaultFolders });

    await chrome.storage.sync.remove(`_g_${groupName}`);
    await chrome.storage.sync.set({ '_int_defaultGroup': groupName });
  } catch (error) {
    console.error(`Error changing default group: ${error}`);
  }
}

async function getDefaultGroupFolders() {
  try {
    const groups = await getNavigationGroups();
    const defaultGroup = await getDefaultGroupName();
    const otherGroups = groups.filter(group => group !== defaultGroup);

    const storedFolders = [];
    for (const group of otherGroups) {
      const groupFolders = await getGroupFolders(group);
      storedFolders.push(...groupFolders);
    }

    const allFolders = await getFolderNames();
    const unassignedFolders = allFolders.filter(folder => !storedFolders.includes(folder));
    const result = await chrome.storage.sync.get(`_g_${defaultGroup}`);
    if (result[`_g_${defaultGroup}`]) {
      const defaultFolders = result[`_g_${defaultGroup}`];
      return defaultFolders.push(...unassignedFolders);
    } else {
      return unassignedFolders;
    }
  } catch (error) {
    console.error(`Error getting default group folders: ${error}`);
  }
}

async function getGroupFolders(groupName) {
  try {
    const groups = await getNavigationGroups();
    if (!groups.includes(groupName)) {
      throw new Error('getGroupFolders recieved group name that does not exist.');
    }

    const defaultGroup = await getDefaultGroupName();
    if (groupName === defaultGroup) {
      const defaultFolders = await getDefaultGroupFolders();
      return defaultFolders;
    }

    const result = await chrome.storage.sync.get(`_g_${groupName}`);
    return result[`_g_${groupName}`] ? result[`_g_${groupName}`] : [];
  } catch (error) {
    console.error(`Error getting group folder: ${error}`);
  }
}

async function updateGroupFolders(groupName, folders) {
  try {
    if (!Array.isArray(folders)) {
      throw new Error('updateGroupFolders recieved non-array argument folders');
    }

    const groups = await getNavigationGroups();
    if (!groups.includes(groupName)) {
      throw new Error('updateGroupFolders recieved group name that does not exist.');
    }

    await chrome.storage.sync.set({ [`_g_${groupName}`]: folders });
  } catch (error) {
    console.error(`Error adding folder to group: ${error}`);
  }
}

async function moveGroupFolders(destinationGroup, sourceGroup) {
  try {
    const groups = await getNavigationGroups();
    if (!groups.includes(destinationGroup) || !groups.includes(sourceGroup)) {
      throw new Error('moveGroupFolders recieved group name that does not exist.');
    }

    const sourceFolders = await getGroupFolders(sourceGroup);
    const destinationFolders = await getGroupFolders(destinationGroup);
    destinationFolders.push(...sourceFolders);
    await chrome.storage.sync.set({ [`_g_${destinationGroup}`]: destinationFolders });
    await chrome.storage.sync.set({ [`_g_${sourceGroup}`]: [] });    
  } catch (error) {
    console.error(`Error moving group folders: ${error}`);
  }
}

async function removeDeadFolders() {
  try {
    const bookmarkFolders = await getFolderNames();
    const bookmarkSet = new Set(bookmarkFolders);
    const groups = await getNavigationGroups();
    for (const group of groups) {
      const folders = await getGroupFolders(group);
      const groupSet = new Set(folders);
      if (!groupSet.isSubsetOf(bookmarkSet)) {
        const intersection = groupSet.intersection(bookmarkSet);
        const updatedFolders = Array.from(intersection);
        await chrome.storage.sync.set({ [`_g_${group}`]: updatedFolders });
      }
    }
  } catch (error) {
    console.error(`Error removing dead folders froms storage: ${error}`);
  }
}

export { getStatusFilter, setStatusFilter, getDisplayOrder, setDisplayOrder, getDisplaySettings, 
  getNavigationGroups, addNavigationGroup, changeNavigationGroupOrder, removeNavigationGroup, 
  getDefaultGroupName, changeDefaultGroup,
  getGroupFolders, updateGroupFolders, moveGroupFolders, removeDeadFolders };