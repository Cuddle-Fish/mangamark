import { moveBookmarksWithDomain } from "/externs/bookmark.js";

/**
 * get all custom folder names associated with extension
 * 
 * @returns a Set of all folder names
 */
async function getCustomFolderNames() {
  const result = await chrome.storage.sync.get('_int_folders');
  if (result._int_folders) {
    const folderSet = new Set(result._int_folders);
    return folderSet;
  } else {
    return new Set();
  }
}

/**
 * add a unique folder name to extension
 * 
 * @param {string} folderName name of folder to add
 */
function addFolder(folderName) {
  return getCustomFolderNames()
    .then((folders) => {
      if (folders.has(folderName)) {
        throw new Error(`Duplicate folder name ${folderName} cannot be added`);
      }
      folders.add(folderName);
      const folderList = Array.from(folders);

      return chrome.storage.sync.set({ '_int_folders': folderList })
        .then(() => chrome.storage.sync.set({ [`_f_${folderName}`]: [] }));
    })
    .catch((error) => console.error('Error adding folder to storage:', error));
}

/**
 * remove a folder from extension and dissociate all domains
 * 
 * @param {string} folderName name of folder to remove
 */
function removeFolder(folderName) {
  return getCustomFolderNames()
    .then((folders) => {
      if (!folders.has(folderName)) {
        throw new Error(`Folder name ${folderName} does not exist`);
      }
      return chrome.storage.sync.remove(`_f_${folderName}`)
        .then(() => folders);
    })
    .then((folders) => {
      folders.delete(folderName);
      const folderList = Array.from(folders);
      return chrome.storage.sync.set({ '_int_folders': folderList });
    })
    .catch((error) => console.error('Error removing folder:', error));
}

/**
 * find the folder, if any, that contains domain
 * 
 * @param {string} domain 
 * @returns folder containing domain or if no folder contains domain an empty string
 */
async function findFolderWithDomain(domain) {
  const folders = await getCustomFolderNames();
  for (const folder of folders) {
    const domains = await getFolderDomains(folder);
    if (domains.has(domain)) {
      return folder;
    }
  }
  return '';
}

/**
 * get all domains associated with a folder
 * 
 * @param {string} folderName name of folder containing domains
 * @returns a Set of all domains
 */
async function getFolderDomains(folderName) {
  const result = await chrome.storage.sync.get(`_f_${folderName}`);

  if (!result.hasOwnProperty(folderName)) {
    throw new Error(`Folder ${folderName} not found`);
  } else {
    const domainSet = new Set(result[folderName]);
    return domainSet;
  }
}

/**
 * add a domain from folder, will move all extension bookmarks under domain to folder
 * 
 * @param {string} folderName folder that contains domain
 * @param {string} domain domain to add
 */
function addDomain(folderName, domain) {
  return findFolderWithDomain(domain)
    .then((folderWithDomain) =>{
      if (folderWithDomain) {
        throw new Error(`Domain ${domain} already associated with folder`);
      }
    })
    .then(() => getFolderDomains(folderName))
    .then((folderDomains) => {
      folderDomains.add(domain);
      const domainList = Array.from(folderDomains);
      return chrome.storage.sync.set({ [`_f_${folderName}`]: domainList });
    })
    .then(() => moveBookmarksWithDomain(domain, folderName))
    .catch((error) => console.error('Error adding domain', error));
}

/**
 * remove a domain from folder
 * 
 * @param {string} folderName folder that contains domain
 * @param {string} domain domain to remove
 */
function removeDomain(folderName, domain) {
  return getFolderDomains(folderName)
  .then((folderDomains) => {
    if (!folderDomains.has(domain)) {
      throw new Error(`Domain ${domain} not associated with folder ${folderName}`);
    }
    folderDomains.delete(domain);
    const domainList = Array.from(folderDomains);
    return chrome.storage.sync.set({ [`_f_${folderName}`]: domainList });
  })
  .catch((error) => console.error('Error removing domain:', error));
}

function moveDomain(newFolder, domain) {
  return findFolderWithDomain(domain)
    .then((folderWithDomain) => {
      if (!folderWithDomain) {
        throw new Error(`Domain ${domain} not associated with any folder`);
      }
      return removeDomain(folderWithDomain, domain);
    })
    .then(() => addDomain(newFolder, domain))
    .catch((error) => console.error('Error moving domain:', error));
}

export { getCustomFolderNames, addFolder, findFolderWithDomain, addDomain, moveDomain }