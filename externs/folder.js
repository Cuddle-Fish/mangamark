/**
 * get all custom folder names associated with extension
 * 
 * @returns a Set of all folder names
 */
async function getAllFolders() {
  const result = await chrome.storage.sync.get('folders');
  if (result.folders) {
    const folderSet = new Set(result.folders);
    return folderSet;
  } else {
    return new Set();
  }
}

/**
 * add a unique folder name to extension, all names will be converted to lowercase
 * 
 * @param {string} folderName name of folder to add
 */
function addFolder(folderName) {
  return getAllFolders()
    .then((folders) => {
      const nameToLower = folderName.toLowerCase();
      if (folders.has(nameToLower)) {
        throw new Error(`Duplicate folder name ${folderName} cannot be added`);
      }
      folders.add(nameToLower);
      const folderList = Array.from(folders);

      return chrome.storage.sync.set({ 'folders': folderList })
        .then(() => chrome.storage.sync.set({ [nameToLower]: [] }));
    })
    .catch((error) => console.error('Error adding folder to storage:', error));
}

/**
 * remove a folder from extension and dissociate all domains
 * 
 * @param {string} folderName name of folder to remove
 */
function removeFolder(folderName) {
  const nameToLower = folderName.toLowerCase();
  return getAllFolders()
    .then((folders) => {
      if (!folders.has(nameToLower)) {
        throw new Error(`Folder name ${folderName} does not exist`);
      }
      return chrome.storage.sync.remove(nameToLower)
        .then(() => folders);
    })
    .then((folders) => {
      folders.delete(nameToLower);
      const folderList = Array.from(folders);
      return chrome.storage.sync.set({ 'folders': folderList });
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
  const folders = await getAllFolders();
  folders.forEach(async folder => {
    const domains = await getFolderDomains(folder);
    if (domain.has(domain)) {
      return folder;
    }
  });
  return '';
}

/**
 * get all domains associated with a folder
 * 
 * @param {string} folderName name of folder containing domains
 * @returns a Set of all domains
 */
async function getFolderDomains(folderName) {
  const nameToLower = folderName.toLowerCase();
  const result = await chrome.storage.sync.get(nameToLower);
  if (result[nameToLower]) {
    const domainSet = new Set(result[nameToLower]);
    return domainSet;
  } else {
    throw new Error(`Folder ${folderName} not found`);
  }
}

/**
 * add a domain from folder
 * 
 * @param {string} folderName folder that contains domain
 * @param {string} domain domain to add
 */
function addDomain(folderName, domain) {
  return findFolderWithDomain(domain)
    .then((folderWithDomain) =>{
      if (!folderWithDomain) {
        throw new Error(`Domain ${domain} already associated with folder`);
      }
    })
    .then(() => getFolderDomains(folderName))
    .then((folderDomains) =>{
      const nameToLower = folderName.toLowerCase();
      folderDomains.add(domain);
      const domainList = Array.from(folderDomains);
      return chrome.storage.sync.set({ [nameToLower]: domainList });
    })
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
    const nameToLower = folderName.toLowerCase();
    folderDomains.delete(domain);
    const domainList = Array.from(folderDomains);
    return chrome.storage.sync.set({ [nameToLower]: domainList });
  })
  .catch((error) => console.error('Error removing domain:', error));
}