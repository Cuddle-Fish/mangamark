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

async function getDomainRegex() {
  const result = await chrome.storage.sync.get('regexEntries');
  if (result.regexEntries) {
    return new Map(Object.entries(result.regexEntries));
  } else {
    return new Map();
  }
}

async function setDomainRegex(domain, title, chapter) {
  const domainRegex = await getDomainRegex();
  domainRegex.set(domain, {title, chapter});
  const regexEntries = Object.fromEntries(domainRegex);
  await chrome.storage.sync.set({ regexEntries });
}

async function removeDomainRegex(domain) {
  const domainRegex = await getDomainRegex();
  const isRemoved = domainRegex.delete(domain);
  if (isRemoved) {
    const regexEntries = Object.fromEntries(domainRegex);
    await chrome.storage.sync.set({ regexEntries });
  }
}

export { 
  getStatusFilter, 
  setStatusFilter, 
  getDisplayOrder, 
  setDisplayOrder, 
  getDisplaySettings,
  getDomainRegex,
  setDomainRegex,
  removeDomainRegex
};