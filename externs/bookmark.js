import { groupsHandleFolderRemove } from "/externs/settings.js";

let _preventListeners = false;

/**
 * @returns regex for matching bookmark, if string matches regex values will be:
 *  1. Title
 *  2. Chapter Number
 *  3. Tags, string of comma seperated values
 */
function bookmarkRegex() {
  return /^(.*?) - Chapter (\d*\.\d+|\d+)(?: - Tags (.+))?$/;
}

/**
 * create a bookmark title properly formatted for this extension
 * 
 * @param {string} title title of content
 * @param {string} chapterNum current chapter number
 * @param {Array.<string>} tags list of tags associated with bookmark
 * @returns extension formatted bookmark title
 */
function createBookmarkTitle(title, chapterNum, tags=[]) {
  const tagSection = tags.length > 0 ? ` - Tags ${tags.join(',')}` : '';
  return `${title} - Chapter ${chapterNum}${tagSection}`;
}

/**
 * set bookmark id for extensions root folder
 * 
 * @param {string} id bookmark id associated with root folder
 */
async function setRootFolderId(id) {
  await chrome.storage.sync.set({ 'rootFolderId': id });
}

/**
 * create and set folder for extensions root folder
 * 
 * @param {string} name folder name of root folder
 * @param {string} parentId bookmark id of folder to place root folder in
 * @returns Promise that will be fulfilled with the bookmark id for extension's root folder
 */
async function createRootFolder(name, parentId) {
  const bookmark = await chrome.bookmarks.create({ parentId: parentId, title: name });
  await setRootFolderId(bookmark.id);
  return bookmark.id;
}

/**
 * check if extensions root folder id has been saved
 * 
 * @returns Promise that will be fulfilled with true if rootFolderId has been set, otherwise false
 */
async function hasRootFolderId() {
  const result = await chrome.storage.sync.get('rootFolderId');
  return result.rootFolderId ? true : false;
}

/**
 * get the bookmark id for extensions root folder
 * 
 * @returns Promise that will be fulfilled with the bookmark id for extension's root folder
 */
async function getRootFolderId() {
  try {
    const result = await chrome.storage.sync.get('rootFolderId');
    if (!result.rootFolderId) {
      throw new Error('no rootFolderId in browser sync storage');
    }
    await chrome.bookmarks.get(result.rootFolderId);
    return result.rootFolderId;
  } catch (error) {
    throw new Error('GET_ROOT_FOLDER', { cause: error });
  }
}

async function getRootFolderName() {
  try {
    const result = await chrome.storage.sync.get('rootFolderId');
    if (!result.rootFolderId) {
      throw new Error('no rootFolderId in browser sync storage');
    }
    const [rootFolder] = await chrome.bookmarks.get(result.rootFolderId);
    return rootFolder.title;
  } catch (error) {
    throw new Error('GET_ROOT_FOLDER', { cause: error });
  }
}

/**
 * get path for extensions root folder
 * 
 * @returns Promise that will be fulfilled with a List of objects containing the name and id of all folders in path
 * ordered from parent to child, ending with extension root folder.
 */
async function getRootFolderPath() {
  const rootId = await getRootFolderId();
  let folder = await chrome.bookmarks.get(rootId);
  const path = [{name: folder.name, id: folder.id}];
  while (folder.id !== '0') {
    folder = await chrome.bookmarks.get(folder.parentId);
    path.unshift({name: folder.name, id: folder.id});
  }
  return path;
}

/**
 * get bookmark subtree for extensions root folder
 * 
 * @returns Promise that will be fulfilled with a list of all children in extension's root folder
 */
async function getExtensionSubtree() {
  const rootId = await getRootFolderId();
  const subTree = await chrome.bookmarks.getSubTree(rootId);
  return subTree[0].children;
}

/**
 * get all existing tags
 * 
 * @returns Promise that will be fulfilled with a Set containing all bookmark tags
 */
async function getExtensionTags() {
  const tree = await getExtensionSubtree();
  return getTagsFromFolder(tree);
}

/**
 * find all unique bookmark tags within folder tree structure
 *
 * @param {chrome.bookmarks.BookmarkTreeNode} folderBookmark bookmark folder to search through
 */
function getTagsFromFolder(folderBookmark) {
  let tags = new Set();
  folderBookmark.forEach(node => {
    if (node.url) {
      const matches = node.title.match(bookmarkRegex());
      if (matches && matches[3]) {
        const bookmarkTags = new Set(matches[3].split(','));
        tags = tags.union(bookmarkTags);
      }
    } else if (node.children) {
      tags = tags.union(getTagsFromFolder(node.children));
    }
  });
  return tags;
}

/**
 * get title and id for all top-level extension folders
 * 
 * @returns Promise that will be fulfilled with a Map of folder titles to folder IDs
 */
async function getExtensionFolders() {
  const rootId = await getRootFolderId();
  return await getFoldersFromId(rootId);
}

/**
 * get all top-level folders associated with given ID
 * 
 * @param {string} folderId bookmark id associated with folder to search through
 * @returns Promise that will be fulfilled with a Map of folder titles to folder IDs
 */
async function getFoldersFromId(folderId) {
  const bookmarkFolders = new Map();
  const children = await chrome.bookmarks.getChildren(folderId);
  for (const folder of children) {
    if (folder.url === undefined) {
      bookmarkFolders.set(folder.title, folder.id);
    }
  }
  return bookmarkFolders;
}

/**
 * rename a bookmark folder
 * 
 * @param {string} folderId bookmark id of folder to be renamed
 * @param {string} newName new title for folder
 */
async function renameFolder(folderId, newName) {
  const folder = await chrome.bookmarks.get(folderId);
  if (folder.url) throw new Error('recieved bookmark id not folder id');
  await chrome.bookmarks.update(folderId, { title: newName });
}

/**
 * create a new top-level folder in extension's root folder
 * 
 * @param {string} name title for new folder
 * @returns Promise that will be fulfilled with the bookmark id for the created folder
 */
async function addFolder(name) {
  const rootId = await getRootFolderId();
  const bookmark = await chrome.bookmarks.create({ parentId: rootId, title: name });
  return bookmark.id;
}

/**
 * Retrieve the ID for the specifed subfolder, if the subfolder does not exist it will be created
 * 
 * @param {string} folderId bookmark ID for parent folder
 * @param {string} subfolderName readingStatus name of the subfolder. Valid reading statuses are:
 * 'Completed', 'Plan to Read', 'Re-Reading', 'On Hold'
 * @returns Promise that will be fulfilled with the bookmark id of the desired subfolder
 */
async function getSubfolderId(folderId, subfolderName) {
  const validSubFolders = ['Completed', 'Plan to Read', 'Re-Reading', 'On Hold'];
  if (!validSubFolders.includes(subfolderName)) throw new Error(`invalid subfolder name provided`);

  const children = await chrome.bookmarks.getChildren(folderId);
  const subFolder = children.find((child) => child.title === subfolderName);
  if (subFolder) {
    return subFolder.id;
  } else {
    const newSubFolder = await chrome.bookmarks.create({ parentId: folderId, title: subfolderName });
    return newSubFolder.id;
  }
}

/**
 * Locates the top-level folder that contains the most occurrences of the given domain.
 * Returns given domain if no folder exist with domain
 * 
 * @param {string} domain domain to search for 
 * @returns Promise that will be fulfilled with the title of the domain's default folder
 */
async function findDefaultFolder(domain) {
  const tree = await getExtensionSubtree();
  let defaultFolder = domain.startsWith('www.') ? domain.substring(4) : domain;
  let largestBookmarkCount = 0;
  for (const node of tree) {
    if (node.children) {
      const count = getDomainCount(node.children, domain);
      if (count > largestBookmarkCount) {
        defaultFolder = node.title;
        largestBookmarkCount = count;
      }
    }
  }
  return defaultFolder;
}

/**
 * Helper function for findDefaultFolder().
 * Searches given folder tree for all occurrences of the given domain
 * 
 * @param {chrome.bookmarks.BookmarkTreeNode[]} tree bookmark folder contents
 * @param {string} domain domain to search for
 * @returns count of occurrences of the given domain
 */
function getDomainCount(tree, domain) {
  let count = 0;
  tree.forEach(node => {
    if (node.url) {
      const urlDomain = new URL(node.url).hostname;
      if (urlDomain === domain) {
        count++;
      }
    } else if (node.children) {
      count += getDomainCount(node.children, domain);
    }
  });
  return count;
}

/**
 * Reorder top-level folders to match specified order, all bookmarks will be moved to top
 * 
 * @param {} orderedFolders array of all folder titles in extension's root folder
 */
async function reorderFolders(orderedFolders) {
  const rootId = await getRootFolderId();
  const children = await chrome.bookmarks.getChildren(rootId);
  const bookmarks = [];
  const folders = [];
  for (const child of children) {
    if (child.url) bookmarks.push(child);
    else folders.push(child);
  }

  if (orderedFolders.length !== folders.length) {
    throw new Error('number of folders recieved does not match amount in root folder');
  }
  const orderedBookmarkFolders = orderedFolders.map((title) => {
    const matchingFolder = folders.find(folder => folder.title === title);
    if (!matchingFolder) {
      throw new Error('received folder title that does not exist');
    }
    return matchingFolder;
  });

  // move all non-folder bookmarks to front
  for (let i = 0; i < bookmarks.length; i++) {
    await chrome.bookmarks.move(bookmarks[i].id, { parentId: rootId, index: i });
  }

  // move all folders to desired position
  for (let i = 0; i < orderedBookmarkFolders.length; i++) {
    await chrome.bookmarks.move(orderedBookmarkFolders[i].id, { parentId: rootId, index: i + bookmarks.length });
  }
}

/**
 * check if given folder is empty and remove if so
 * 
 * @param {string} folderId bookmark ID of folder to check
 */
async function removeIfEmptyFolder(folderId) {
  const [folder] = await chrome.bookmarks.get(folderId);
  if (folder.url) throw new Error('parameter folderId associated with bookmark not folder');
  const parentId = folder.parentId;

  const children = await chrome.bookmarks.getChildren(folderId);
  if (children.length === 0) {
    const rootId = await getRootFolderId();

    if (parentId === rootId) {
      const rootChildren = await chrome.bookmarks.getChildren(rootId);
      const folders = rootChildren.filter(node => !node.url);
      const folderIndex = folders.findIndex(folder => folder.id === folderId);
      
      await chrome.bookmarks.remove(folderId);
      await groupsHandleFolderRemove(folderIndex);
    } else {
      await chrome.bookmarks.remove(folderId);
      await removeIfEmptyFolder(parentId);
    }
  }
}

/**
 * search extension's root folder tree hierarchy for a bookmark that contains the given content title
 * 
 * @param {string} contentTitle reading title of the content associated with the bookmark
 * @returns Promise that will be fulfilled with an object containing 
 * bookmark node, parent folder name and reading status subfolder name, if applicable.
 * Or null if the bookmark could not be found
 */
async function searchForBookmark(contentTitle) {
  const tree = await getExtensionSubtree();
  for (const node of tree) {
    if (node.children) {
      const result = searchFolder(node.children, contentTitle);
      if (result) {
        return {...result, folderName: node.title};
      }
    }
  }
  return null;
}

/**
 * Search tree hierarchy for bookmark matching desired title
 *
 * @param {chrome.bookmarks.BookmarkTreeNode[]} tree children of folder to search within
 * @param {string} searchTitle title to search for
 * @param {boolean} exactMatch specify if searchTitle should match bookmark entry exactly or contain title
 * @returns {{bookmark: chrome.bookmarks.BookmarkTreeNode, subFolder: string|null}|null} 
 * object containing the matching bookmark and sub-folder name, or null if no match is found
 */
function searchFolder(tree, searchTitle, exactMatch=false) {
  for (var i = 0; i < tree.length; i++) {
    const node = tree[i];
    if (node.url) {
      const matches = node.title.match(bookmarkRegex());
      if (!matches) {
        continue;
      }
      const titlePortion = matches[1];

      if (exactMatch) {
        if (node.title === searchTitle) {
          return { bookmark: node, subFolder: null };
        }
      } else {
        if (searchTitle.includes(titlePortion)) {
          return { bookmark: node, subFolder: null };
        }
      }
    } else if (node.children) {
      for (var j = 0; j < node.children.length; j++) {
        const folderResult = searchFolder(node.children, searchTitle, exactMatch);
        if (folderResult) {
          folderResult.subFolder = node.title;
          return folderResult;
        }
      }
    }
  }

  return null;
}

/**
 * create a new bookmark
 * 
 * @param {string} title reading title of content
 * @param {string} chapter chapter number
 * @param {Array.<string>} tags list of tags associated with bookmark
 * @param {string} url bookmark URL
 * @param {string} folderId ID for top-level folder to add bookmark to
 * @param {string} subFolderName name of sub folder, if applicable
 * @returns Promise that will be fulfilled with the createad bookmarks title
 */
async function addBookmark(title, chapter, tags, url, folderId, subFolderName) {
  const bookmarkTitle = createBookmarkTitle(title, chapter, tags);
  const destinationId = subFolderName ? await getSubfolderId(folderId, subFolderName) : folderId;
  const bookmark = await chrome.bookmarks.create({ parentId: destinationId, title: bookmarkTitle, url: url });
  return bookmark.title;
}

/**
 * remove a specifed bookmark, removes containing folder if empty
 * 
 * @param {string} bookmarkId ID of bookmark to remove
 */
async function removeBookmark(bookmarkId) {
  try {
    _preventListeners = true;
    const [bookmark] = await chrome.bookmarks.get(bookmarkId);
    await chrome.bookmarks.remove(bookmarkId);
    await removeIfEmptyFolder(bookmark.parentId);
    _preventListeners = false;
    document.dispatchEvent(new Event('bookmarkChanged'));
  } catch (error) {
    _preventListeners = false;
    throw error;
  }
}

/**
 * change bookmark title
 * 
 * @param {string} bookmarkId ID of bookmark
 * @param {string} title reading title of content
 * @param {string} chapter chapter number
 * @param {Array.<string>} tags list of tags associated with bookmark
 * @param {boolean} pauseListeners set to true to prevent registered event listeners from firing, defaults to false
 */
async function updateBookmarkTitle(bookmarkId, title, chapter, tags, pauseListeners=false) {
  const newTitle = createBookmarkTitle(title, chapter, tags);
  _preventListeners = pauseListeners;
  try {
    await chrome.bookmarks.update(bookmarkId, { title: newTitle });
  } finally {
    _preventListeners = false;
  }
}

/**
 * change bookmarks location based on supplied destination folder ID and reading status
 * 
 * @param {string} bookmarkId ID of bookmark
 * @param {string} destinationFolderId ID of top-level destination folder
 * @param {string} readingStatus bookmark reading status. Identifies destination within top-level folder.
 * Valid reading statuses are: 'reading', 'Completed', 'Plan to Read', 'Re-Reading', 'On Hold'
 * @param {boolean} pauseListeners set to true to prevent registered event listeners from firing, defaults to false
 */
async function moveBookmark(bookmarkId, destinationFolderId, readingStatus, pauseListeners=false) {
  const destinationId = readingStatus === 'reading' 
    ? destinationFolderId 
    : await getSubfolderId(destinationFolderId, readingStatus);

  try {
    _preventListeners = true;
    const [bookmark] = await chrome.bookmarks.get(bookmarkId);
    const parentId = bookmark.parentId;
    await chrome.bookmarks.move(bookmarkId, { parentId: destinationId });
    await removeIfEmptyFolder(parentId);
    _preventListeners = false;

    if (!pauseListeners) document.dispatchEvent(new Event('bookmarkChanged'));
  } catch (error) {
    _preventListeners = false;
    throw error;
  }
}

/**
 * register listeners for all bookmark related events
 * 
 * @param {Function} listenerFn callback function to invoke when a bookmark related event is triggered
 */
function registerBookmarkListener(listenerFn) {
  const wrapperFn = () => {
    if (!_preventListeners) {
      listenerFn();
    }
  }

  chrome.bookmarks.onChanged.addListener(wrapperFn);
  chrome.bookmarks.onChildrenReordered.addListener(wrapperFn);
  chrome.bookmarks.onCreated.addListener(wrapperFn);
  chrome.bookmarks.onMoved.addListener(wrapperFn);
  chrome.bookmarks.onRemoved.addListener(wrapperFn);
  document.addEventListener('bookmarkChanged', wrapperFn);
}

export {
  bookmarkRegex,
  setRootFolderId,
  createRootFolder,
  hasRootFolderId,
  getRootFolderId,
  getRootFolderName,
  getRootFolderPath,
  getExtensionSubtree,
  getExtensionTags,
  getExtensionFolders,
  getFoldersFromId,
  renameFolder,
  addFolder,
  findDefaultFolder,
  reorderFolders,
  searchForBookmark,
  addBookmark,
  removeBookmark,
  updateBookmarkTitle,
  moveBookmark,
  registerBookmarkListener
}