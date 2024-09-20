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
 * Get the chrome bookmark ID for Mangamark folder, creates folder if does not exist
 * 
 * @returns resolves promise with bookmark ID, rejects if multiple folders titled Mangamark found
 */
function getMangamarkFolderId() {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.search({title: 'Mangamark'})
    .then((results) => {
      if (results.length == 1) {
        const mangamarkFolder = results[0];
        resolve(mangamarkFolder.id);
      } else if (results.length > 1) {
        reject(`Found ${results.length} folders titled 'Mangamark'.`);
      } else {
        chrome.bookmarks.create({title: 'Mangamark'})
        .then((mangamarkFolder) => {
          const managerUrl = chrome.runtime.getURL('manager/manager.html');
          chrome.bookmarks.create({parentId: mangamarkFolder.id, title: 'Manage Mangamarks', url: managerUrl});
          resolve(mangamarkFolder.id);
        });
      }
    });
  });
}

function getFolderNames() {
  return getMangamarkFolderId()
    .then((mangamarkId) => chrome.bookmarks.getChildren(mangamarkId))
    .then((children) => children.filter(child => child.url === undefined).map(folder => folder.title));
}

function findDefaultFolder(domain) {
  return getMangamarkSubTree()
    .then((tree) => {
      let defaultFolder = domain.startsWith('www.') ? domain.substring(4) : domain;
      let LargestBookmarkCount = 0;
      for (const node of tree[0].children) {
        if (node.children) {
          const count = getDomainCount(node.children, domain);
          if (count > LargestBookmarkCount) {
            defaultFolder = node.title;
            LargestBookmarkCount = count;
          }
        }
      }
      return defaultFolder
    });
}

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
 * Gets the Id of a given folder within the parentId
 * 
 * @param {string} parentId bookmark ID of parent folder
 * @param {string} folderName name of desired folder
 * @param {boolean} create specify rather to create folder if does not exist (default: false)
 * @returns Id of folderName if exists, otherwise null
 */
function getFolderId(parentId, folderName, create=false) {
  return chrome.bookmarks.getChildren(parentId)
    .then((children) => {
      const folder = children.find((child) => child.title === folderName);
      if (folder) {
        return folder.id;
      } else {
        if (create) {
          return chrome.bookmarks.create({parentId: parentId, title: folderName})
            .then((newFolder) => newFolder.id);
        } else {
          return null;
        }
      }
    });
}

/**
 * @typedef {Object} searchResult
 * @property {chrome.bookmarks.BookmarkTreeNode} bookmark - A node in the bookmark tree
 * @property {string} subFolder - name of reading status subFolder, if relevant. Otherwise null
 */

/**
 * Search tree hierarchy for bookmark matching desired title
 * 
 * @param {chrome.bookmarks.BookmarkTreeNode[]} tree children of folder to search within
 * @param {string} searchTitle title to search for
 * @param {boolean} completeTitle specify if searchTitle should match bookmark entry exactly or contain title
 * @returns {searchResult|null} object containing the matching bookmark and sub-folder name, or null if no match is found
 */
function searchFolder(tree, searchTitle, completeTitle=false) {
  for (var i = 0; i < tree.length; i++) {
    const node = tree[i];
    if (node.url) {
      const matches = node.title.match(bookmarkRegex());
      if (!matches) {
        continue;
      }
      const titlePortion = matches[1];

      if (completeTitle) {
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
        const folderResult = searchFolder(node.children, searchTitle, completeTitle);
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
 * get bookmark subTree for Mangamark folder
 * 
 * @returns Mangamark sub tree
 */
function getMangamarkSubTree() {
  return getMangamarkFolderId()
    .then((mangamarkId) => chrome.bookmarks.getSubTree(mangamarkId));
}

/**
 * Attempts to find a bookmark with a matching title portion
 * 
 * @param {string} contentTitle title of content
 * @returns If bookmark found returns {BookmarkTreeNode, subFolderName}, otherwise null
 */
async function findBookmark(contentTitle) {
  const tree = await getMangamarkSubTree();
  for (const node of tree[0].children) {
    if (node.children) {
      const result = searchFolder(node.children, contentTitle);
      if (result) {
        return {...result, folderName: node.title};
      }
    }
  }
  return null;
}

function createBookmarkTitle(title, chapterNum, tags=[]) {
  const tagSection = tags.length > 0 ? ` - Tags ${tags.join(',')}` : '';
  return `${title} - Chapter ${chapterNum}${tagSection}`;
}

/**
 * adds a bookmark to the Mangamark folder under the specifed folderName
 * 
 * @param {string} title title of content
 * @param {string} chapterNum current chapter number
 * @param {string} url URL navigated to when user clicks bookmark
 * @param {string} folderName name of folder to contain bookmark
 * @param {Array.<string>} tags list of tags associated with bookmark
 * @param {string=} subFolderName name of sub folder, if applicable
 * @returns title of created bookmark
 */
function addBookmark(title, chapterNum, url, folderName, tags, subFolderName) {
  const bookmarkTitle = createBookmarkTitle(title, chapterNum, tags);
  return getMangamarkFolderId()
    .then((mangamarkId) => getFolderId(mangamarkId, folderName, true))
    .then((mainFolderId) => subFolderName ? getFolderId(mainFolderId, subFolderName, true) : mainFolderId)
    .then((folderId) => chrome.bookmarks.create({parentId: folderId, title: bookmarkTitle, url: url}))
    .then((bookmark) => bookmark.title);
}

async function removeIfEmptyFolder(folderId) {
  try {
    const folder = await chrome.bookmarks.get(folderId);
    if (folder[0].url) {
      throw new Error('removeIfEmptyFolder recieved bookmark not folder');
    }

    const children = await chrome.bookmarks.getChildren(folderId);
    if (children.length === 0) {
      _preventListeners = true;
      await chrome.bookmarks.remove(folderId);

      const mangamarkId = await getMangamarkFolderId();
      const mangamarkChildren = await chrome.bookmarks.getChildren(mangamarkId);
      const numBookmarks = mangamarkChildren.filter(node => node.url !== undefined).length;
      await groupsHandleFolderRemove(folder[0].index - numBookmarks);
      _preventListeners = false;
      document.dispatchEvent(new Event('folderRemoved'));
    }
  } catch (error) {
    console.error('Error removing empty folder:', error);
  }
}

/**
 * remove a bookmark from specified folder within the Mangamark folder
 * 
 * The function expects `details` to contain either:
 *  - `bookmarkTitle`
 * 
 *  OR
 * 
 *  - `title`
 *  - `chapter`
 *  - `tags` (optional)
 * 
 * @param {string} folderName name of folder containing bookmark
 * @param {object} details title information for bookmark to remove
 * @param {string} [details.bookmarkTitle] complete title of the bookmark, exactly as saved
 * @param {string} [details.title] title of content associated with bookmark
 * @param {string} [details.chapter] chapter number for bookmark
 * @param {Array.<string>} [details.tags] tags associated with bookmark
 */
async function removeBookmark(folderName, details) {
  try {
    let bookmarkTitle;
    if (details.bookmarkTitle !== undefined) {
      bookmarkTitle = details.bookmarkTitle;
    } else if (details.title !== undefined && details.chapter !== undefined) {
      bookmarkTitle = createBookmarkTitle(details.title, details.chapter, details.tags);
    } else {
      return Promise.reject(new Error('Invalid details, could not create title'));
    }

    const mangamarkId = await getMangamarkFolderId();
    const folderId = await getFolderId(mangamarkId, folderName);
    if (!folderId) {
      throw new Error(`Folder '${folderName}' does not exist`);
    }

    const tree = await chrome.bookmarks.getSubTree(folderId);
    const result = searchFolder(tree[0].children, bookmarkTitle, true);
    if (!result) {
      throw new Error(`Bookmark '${bookmarkTitle}' not found in Folder '${folderName}'`);
    }

    await chrome.bookmarks.remove(result.bookmark.id);
    await removeIfEmptyFolder(result.bookmark.parentId);
  } catch (error) {
    console.error('Error failed to remove bookmark:', error)
  }
}

/**
 * Update tags associated with a bookmark
 * 
 * @param {string} title title of content 
 * @param {string} chapterNum chapter number of title
 * @param {string} folderName name of folder containing bookmark
 * @param {Array.<string>} oldTags current tags associated with bookmark
 * @param {Array.<string>} newTags new tags to be associated with bookmark
 * @param {boolean?} pauseListeners set to true to prevent registered event listeners from firing, default = false
 */
async function updateBookmarkTags(title, chapterNum, folderName, oldTags, newTags, pauseListeners = false) {
  try {
    _preventListeners = pauseListeners;
    const oldBookmarkTitle = createBookmarkTitle(title, chapterNum, oldTags);
    const newBookmarkTitle = createBookmarkTitle(title, chapterNum, newTags);
    const mangamarkId = await getMangamarkFolderId();
    const folderId = await getFolderId(mangamarkId, folderName);
    if (!folderId) {
      throw new Error(`Could not find folder '${folderName}'`);
    }
    const tree = await chrome.bookmarks.getSubTree(folderId);
    const searchResult = searchFolder(tree[0].children, oldBookmarkTitle, true);
    if (!searchResult) {
      throw new Error(`Could not find bookmark '${oldBookmarkTitle}' to update`);
    }
    await chrome.bookmarks.update(searchResult.bookmark.id, { title: newBookmarkTitle });
    _preventListeners = false;
  } catch (error) {
    console.error('Error upating bookmark tags:', error);
  }
}

/**
 * Move a bookmark to a new location
 * 
 * @param {string} title title of content 
 * @param {string} chapter chapter number of title
 * @param {string} folderName name of main folder containing bookmark
 * @param {Array.<string>} tags tags associated with bookmark 
 * @param {string} readingStatus indicates name of subFolder to move bookmark to or 'reading' for main folder
 * @param {boolean?} pauseListeners set to true to prevent registered event listeners from firing, default = false
 */
async function changeSubFolder(title, chapter, folderName, tags, readingStatus, pauseListeners = false) {
  try {
    _preventListeners = pauseListeners;
    const bookmarkTitle = createBookmarkTitle(title, chapter, tags);

    const mangamarkId = await getMangamarkFolderId();
    const folderId = await getFolderId(mangamarkId, folderName);

    const tree = await chrome.bookmarks.getSubTree(folderId);
    const result = searchFolder(tree[0].children, bookmarkTitle, true);
    if (!result) {
      throw new Error(`Bookmark '${bookmarkTitle}' not found in Folder '${folderName}'`);
    }

    const bookmark = result.bookmark;
    const destinationId = readingStatus === 'reading' ? folderId : await getFolderId(folderId, readingStatus, true);
    
    await chrome.bookmarks.move(bookmark.id, { parentId: destinationId });
    const children = await chrome.bookmarks.getChildren(bookmark.parentId);
    if (children.length === 0) {
      await chrome.bookmarks.remove(bookmark.parentId);
    }
    _preventListeners = false; 
  } catch (error) {
    console.error('Error changing subfolder:', error);
  }
}

/**
 * get all existing unique bookmark tags
 * 
 * @returns Set of all bookmark tags
 */
function getAllBookmarkTags() {
  return getMangamarkSubTree()
    .then((tree) => getTagsFromFolder(tree[0]));
}

/**
 * find all unique bookmark tags within folder tree structure
 * 
 * @param {chrome.bookmarks.BookmarkTreeNode} folderBookmark bookmark folder to searcg through
 */
function getTagsFromFolder(folderBookmark) {
  let tags = new Set();
  folderBookmark.children.forEach(node => {
    if (node.url) {
      const matches = node.title.match(bookmarkRegex());
      if (matches && matches[3]) {
        const bookmarkTags = new Set(matches[3].split(','));
        tags = tags.union(bookmarkTags);
      }
    } else if (node.children) {
      tags = tags.union(getTagsFromFolder(node));
    }
  });
  return tags;
}

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
  document.addEventListener('folderRemoved', wrapperFn);
}

async function reorderFolders(orderedFolders) {
  try {
    const mangamarkId = await getMangamarkFolderId();
    const children = await chrome.bookmarks.getChildren(mangamarkId);
    const bookmarks = children.filter(child => child.url);
    const bookmarkFolders = children.filter(child => !child.url);

    if (orderedFolders.length !== bookmarkFolders.length) {
      throw new Error(`reorderFolders recieved ${orderedFolders.length} folders, expected ${bookmarkFolders.length}`);
    }
    const orderedBookmarkFolders = orderedFolders.map((title) => {
      const matchingFolder = bookmarkFolders.find(folder => folder.title === title);
      if (!matchingFolder) {
        throw new Error(`reorderFolders recieved folder '${title}' that does not exist.`);
      }
      return matchingFolder;
    });

    for (let i = 0; i < bookmarks.length; i++) {
      await chrome.bookmarks.move(bookmarks[i].id, { parentId: mangamarkId, index: i });
    }

    for (let i = 0; i < bookmarkFolders.length; i++) {
      await chrome.bookmarks.move(orderedBookmarkFolders[i].id, { parentId: mangamarkId, index: i + bookmarks.length });
    }
  } catch (error) {
    console.error('Error reordering folders:', error);
  }
}

export { bookmarkRegex, getFolderNames, findDefaultFolder, getMangamarkSubTree, findBookmark, addBookmark, removeBookmark, updateBookmarkTags, changeSubFolder, getAllBookmarkTags, registerBookmarkListener, reorderFolders }