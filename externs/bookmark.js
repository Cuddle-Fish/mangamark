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
 * Search tree hierarchy for bookmark matching desired title
 * 
 * @param {chrome.bookmarks.BookmarkTreeNode[]} tree children of folder to search within
 * @param {string} searchTitle title to search for
 * @param {boolean} completeTitle specify if searchTitle should match bookmark entry exactly or contain title
 * @returns {chrome.bookmarks.BookmarkTreeNode|null} 
 * BookmarkTreeNode matching searchTitle or null if no matching title
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
          return node;
        }
      } else {
        if (searchTitle.includes(titlePortion)) {
           return node;
        }
      }
    } else if (node.children) {
      for (var j = 0; j < node.children.length; j++) {
        const folderResult = searchFolder(node.children, searchTitle, completeTitle);
        if (folderResult) {
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
  .then((bookmark) => bookmark ? performRemove(bookmark) : Promise.reject('Remove failed, could not find bookmark'))
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
  console.log(oldBookmarkTitle);
  const newBookmarkTitle = createBookmarkTitle(title, chapterNum, newTags);
  return getMangamarkFolderId()
  .then((mangamarkId) => getFolderId(mangamarkId, folderName))
  .then((folderId) => folderId ? chrome.bookmarks.getSubTree(folderId) : Promise.reject('Folder does not exist'))
  .then((tree) => searchFolder(tree[0].children, oldBookmarkTitle, true))
  .then((bookmark) => bookmark
    ? chrome.bookmarks.update(bookmark.id, {title: newBookmarkTitle}) 
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
function moveBookmark(title, chapter, domain, tags, readingStatus) {
  const bookmarkTitle = createBookmarkTitle(title, chapter, tags);
  return getMangamarkFolderId()
  .then((mangamarkId) => getFolderId(mangamarkId, domain))
  .then((folderId) => {
    const bookmark = chrome.bookmarks.getSubTree(folderId)
      .then((tree) => searchFolder(tree[0].children, bookmarkTitle, true));
    
    const destinationId = readingStatus === 'reading' ? folderId : getFolderId(folderId, readingStatus, true);

    Promise.all([bookmark, destinationId]).then((values) => {
      console.log(values[0].parentId, values[1]);
      chrome.bookmarks.move(values[0].id, {parentId: values[1]})
      .then(() => chrome.bookmarks.getChildren(values[0].parentId))
      .then((children) => children.length === 0 ? chrome.bookmarks.remove(values[0].parentId) : Promise.resolve());
    });
  })
}

export {bookmarkRegex, getMangamarkSubTree, findBookmark, addBookmark, removeBookmark, updateBookmarkTags, moveBookmark}