import { getCustomFolderNames, findFolderWithDomain } from "/externs/folder.js";

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
 * Attempts to find a bookmark by title within the given folderName
 * 
 * @param {string} contentTitle title of content
 * @param {string} folderName name of folder to search for title
 * @returns BookmarkTreeNode for title or null if does not exist
 */
function findBookmark(contentTitle, folderName) {
  return getMangamarkFolderId()
    .then((mangamarkId) => getFolderId(mangamarkId, folderName))
    .then((folderId) => folderId ? chrome.bookmarks.getSubTree(folderId) : null)
    .then((tree) => tree ? searchFolder(tree[0].children, contentTitle) : null);
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

/**
 * removes bookmark and associated folder if empty
 * 
 * @param {BookmarkTreeNode} bookmark chrome bookmark to be removed
 */
function performRemove(bookmark) {
  chrome.bookmarks.remove(bookmark.id)
  .then(() => chrome.bookmarks.getChildren(bookmark.parentId))
  .then((children) => children.length === 0 ? chrome.bookmarks.remove(bookmark.parentId) : Promise.resolve());
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
function removeBookmark(folderName, details) {
  if (details.bookmarkTitle !== undefined) {
    var bookmarkTitle = details.bookmarkTitle;
  } else if (details.title !== undefined && details.chapter !== undefined) {
    var bookmarkTitle = createBookmarkTitle(details.title, details.chapter, details.tags);
  } else {
    throw new Error('removeBookmark recieved invalid recieved invalid details, could not create title');
  }
  getMangamarkFolderId()
    .then((mangamarkId) => getFolderId(mangamarkId, folderName))
    .then((folderId) => folderId ? chrome.bookmarks.getSubTree(folderId) : Promise.reject('Folder does not exist'))
    .then((tree) => searchFolder(tree[0].children, bookmarkTitle, true))
    .then((searchResult) => searchResult ? performRemove(searchResult.bookmark) : Promise.reject('Remove failed, could not find bookmark'));
}

/**
 * Update tags associated with a bookmark
 * 
 * @param {string} title title of content 
 * @param {string} chapterNum chapter number of title
 * @param {string} folderName name of folder containing bookmark
 * @param {Array.<string>} oldTags current tags associated with bookmark
 * @param {Array.<string>} newTags new tags to be associated with bookmark
 */
function updateBookmarkTags(title, chapterNum, folderName, oldTags, newTags) {
  const oldBookmarkTitle = createBookmarkTitle(title, chapterNum, oldTags);
  const newBookmarkTitle = createBookmarkTitle(title, chapterNum, newTags);
  return getMangamarkFolderId()
  .then((mangamarkId) => getFolderId(mangamarkId, folderName))
  .then((folderId) => folderId ? chrome.bookmarks.getSubTree(folderId) : Promise.reject('Folder does not exist'))
  .then((tree) => searchFolder(tree[0].children, oldBookmarkTitle, true))
  .then((searchResult) => searchResult
    ? chrome.bookmarks.update(searchResult.bookmark.id, {title: newBookmarkTitle}) 
    : Promise.reject('Could not find bookmark'));
}

/**
 * Move a bookmark to a new location
 * 
 * @param {string} title title of content 
 * @param {string} chapter chapter number of title
 * @param {string} domain name of main folder containing bookmark
 * @param {Array.<string>} tags tags associated with bookmark 
 * @param {string} readingStatus indicates name of subFolder to move bookmark to or 'reading' for main folder
 */
function changeSubFolder(title, chapter, domain, tags, readingStatus) {
  const bookmarkTitle = createBookmarkTitle(title, chapter, tags);
  return getMangamarkFolderId()
  .then((mangamarkId) => getFolderId(mangamarkId, domain))
  .then((folderId) => {
    const bookmark = chrome.bookmarks.getSubTree(folderId)
      .then((tree) => searchFolder(tree[0].children, bookmarkTitle, true))
      .then((searchResult) => searchResult ? searchResult.bookmark : null);
    
    const destinationId = readingStatus === 'reading' ? folderId : getFolderId(folderId, readingStatus, true);

    Promise.all([bookmark, destinationId]).then((values) => {
      chrome.bookmarks.move(values[0].id, {parentId: values[1]})
      .then(() => chrome.bookmarks.getChildren(values[0].parentId))
      .then((children) => children.length === 0 ? chrome.bookmarks.remove(values[0].parentId) : Promise.resolve());
    });
  })
}

/**
 * Move all bookmarks associated with domain to a new folder
 * 
 * @param {string} domain target domain to be moved
 * @param {string} folder destination folder name
 */
async function moveBookmarksWithDomain(domain, folder) {
  try {
    const folders = await getCustomFolderNames();
    if (folders.has(folder)) {
      const associatedFolder = await findFolderWithDomain(domain);
      if (associatedFolder !== folder) {
        throw new Error(`Attempt to move unassociated domain ${domain} to custom folder ${folder}`);
      }
    }

    const tree = await getMangamarkSubTree();
    const folderId = await getFolderId(tree[0].id, folder, true);

    const folderMovePromises = tree[0].children.map(node => {
      if (node.children) {
        return moveFromFolder(node, domain, folderId);
      } else {
        return Promise.resolve();
      }
    });

    await Promise.all(folderMovePromises);
  } catch (error) {
    console.error('Error moving domain:', error);
  }
}

/**
 * move all bookmarks for a domain within given folder tree to a new folder
 * 
 * @param {chrome.bookmarks.BookmarkTreeNode} folderTree folder subTree
 * @param {string} domain target domain to move
 * @param {string} destinationId bookmark Id for destination
 * @param {string=} subFolderName name of bookmarks subfolder, if relevant
 */
function moveFromFolder(folderTree, domain, destinationId, subFolderName) {
  const movePromises = [];
  folderTree.children.forEach(node => {
    if (node.url && new URL(node.url).hostname.includes(domain)) {
      let movePomise;

      if (subFolderName) {
        movePomise = getFolderId(destinationId, subFolderName, true)
          .then((subFolderId) => chrome.bookmarks.move(node.id, {parentId: subFolderId}));
      } else {
        movePomise = chrome.bookmarks.move(node.id, {parentId: destinationId});
      }
      
      movePromises.push(movePomise);
    } else if (node.children) {
      movePromises.push(moveFromFolder(node, domain, destinationId, node.title));
    }
  });

  return Promise.all(movePromises)
    .then(() => chrome.bookmarks.getChildren(folderTree.id))
    .then((children) => children.length === 0 ? chrome.bookmarks.remove(folderTree.id) : Promise.resolve())
    .catch((error) => console.error('Error faild to move domain out of folder:', error));
}

export { bookmarkRegex, getFolderNames, getMangamarkSubTree, findBookmark, addBookmark, removeBookmark, updateBookmarkTags, changeSubFolder, moveBookmarksWithDomain }