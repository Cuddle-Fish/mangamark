import { getFolderNames } from "/externs/bookmark.js";

function getStatusFilter() {
  return chrome.storage.sync.get('displaySettings')
    .then((result) => result.displaySettings?.status || 'all')
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

  return chrome.storage.sync.get('displaySettings')
    .then((result) => {
      const displaySettings = result.displaySettings || {};
      displaySettings.status = readingStatus;
      return chrome.storage.sync.set({ displaySettings });
    });
}

function getDisplayOrder() {
  return chrome.storage.sync.get('displaySettings')
    .then((result) => result.displaySettings?.order || 'Recent')
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

  return chrome.storage.sync.get('displaySettings')
    .then((result) => {
      const displaySettings = result.displaySettings || {};
      displaySettings.order = order;
      return chrome.storage.sync.set({ displaySettings });
    });
}

function getDisplaySettings() {
  return chrome.storage.sync.get(['displaySettings'])
    .then((result) => {
      const { order = 'Recent', status = 'all' } = result.displaySettings || {};
      return { order, status };
    })
    .catch((error) => {
      console.error(`Error retrieving manager settings: ${error}`);
      return { order: 'Recent', status: 'all' };
    });
}

async function getGroups() {
  try {
    const result = await chrome.storage.sync.get('groups');
    return result.groups || [{ name: 'Folders', numFolders: 0 }];
  } catch (error) {
    console.error('Error getting groups:', error);
    return [{ name: 'Folders', numFolders: 0 }];
  }
}

async function getGroupsWithFolders() {
  try {
    const groups = await getGroups();
    const defaultGroupName = await getDefaultGroupName();
    const defaultGroup = groups.find(({ name }) => name === defaultGroupName);
    
    const folders = await getFolderNames();

    for (const group of groups) {
      group.folders = folders.splice(0, group.numFolders);
    }
    defaultGroup.folders.push(...folders);

    return groups;
  } catch (error) {
    console.error('Error getting groups with ordered folders:', error);
  }
}

async function setAllGroups(groups) {
  try {
    const defaultGroupName = await getDefaultGroupName();
    if (!groups.some(({ name }) => name === defaultGroupName)) {
      throw new Error('setGroups recived groups parameter that does not contain the default group.');
    }

    await chrome.storage.sync.set({ 'groups': groups });
  } catch (error) {
    console.error('Error getting groups:', error);
  }
}

async function addGroup(groupName) {
  try {
    const groups = await getGroups();
    if (groups.some(({ name }) => name === groupName)) {
      throw new Error(`addGroup recieved group name '${groupName}' that already exist.`);
    }
    groups.push({ name: groupName, numFolders: 0 });
    await chrome.storage.sync.set({ 'groups': groups });
  } catch (error) {
    console.error('Error adding group:', error);
  }
}

async function changeGroupName(oldGroupName, newGroupName) {
  try {
    const groups = await getGroups();
    if (!groups.some(({ name }) => name === oldGroupName)) {
      throw new Error(`changeGroupName recieved old group name '${oldGroupName}' that does not exist.`);
    }
    if (groups.some(({ name }) => name === newGroupName)) {
      throw new Error(`changeGroupName recieved new group name '${newGroupName}' that already exist.`);
    }
    
    const defaultGroupName = await getDefaultGroupName();
    if (oldGroupName === defaultGroupName) {
      await setDefaultGroupName(newGroupName);
    }

    const group = groups.find(({ name }) => name === oldGroupName);
    group.name = newGroupName;

    await chrome.storage.sync.set({ 'groups': groups });
  } catch (error) {
    console.error('Error changing group name:', error);
  }
}

async function getDefaultGroupName() {
  try {
    const result = await chrome.storage.sync.get('defaultGroup');
    return result.defaultGroup || 'Folders';
  } catch (error) {
    console.error('Error getting default group name:', error);
  }
}

async function setDefaultGroupName(groupName) {
  try {
    const groups = await getGroups();
    if (!groups.some(({ name }) => name === groupName)) {
      throw new Error(`setDefaultGroupName recieved group name '${groupName}', that does not exist as a group.`);
    }

    await chrome.storage.sync.set({ 'defaultGroup': groupName });
  } catch (error) {
    console.error('Error setting default group name:', error);
  }
}

async function groupsHandleFolderRemove(numFolderRemoved) {
  try {
    console.log(`recieved index: ${numFolderRemoved}`);
    if (numFolderRemoved < 0) {
      throw new Error(`groupsHandleFolderRemove recieved out of bounds index ${numFolderRemoved}`);
    }

    const groups = await getGroups();
    const numStored = groups.reduce((accumulator, currentValue) => accumulator + currentValue.numFolders, 0);
    console.log(numStored);
    if (numStored <= numFolderRemoved) {
      return;
    }

    let currentIndex = 0;
    for (const group of groups) {
      console.log(`groups: ${group.name}`);
      if (currentIndex + group.numFolders > numFolderRemoved) {
        console.log('remove');
        group.numFolders--;
        await chrome.storage.sync.set({ 'groups': groups });
        break;
      }
      currentIndex += group.numFolders;
    }
  } catch (error) {
    console.error('Error setting handling folder remove for groups:', error);
  }
}

export { getStatusFilter, setStatusFilter, getDisplayOrder, setDisplayOrder, getDisplaySettings, 
  getGroupsWithFolders, setAllGroups, addGroup, changeGroupName, getDefaultGroupName, setDefaultGroupName, groupsHandleFolderRemove
};