import { bookmarkRegex, findBookmark, addBookmark, removeBookmark } from "/externs/bookmark.js";
import "/components/themed-button/themed-button.js";
import "/components/svg/check-box.js";
import "/components/svg/done-icon.js";
import "/components/svg/managamark-logo.js";
import "/components/info-tooltip/info-tooltip.js";
import "/popup/tags-screen/tags-screen.js";
import "/popup/find-title-screen/find-title-screen.js";

const GlobalDataStore = (() => {
  let _state = '';
  let _title = '';
  let _chapter = '';
  let _folder  = '';
  let _url = '';
  let _tags = [];
  let _updateTitle = '';

  const hasArg = arg => {
    if (arg === undefined) {
      throw new Error('Undefined passed as argument to Store');
    }
  }

  const Store = {
    setState: state => {
      hasArg(state);
      _state = state;
    },
    getState: () => _state,
    setData: data => {
      hasArg(data);
      _title = data.title ?? _title;
      _chapter = data.chapter ?? _chapter;
      _folder = data.folder ?? _folder;
      _url = data.url ?? _url;
      _updateTitle = data.updateTitle ?? _updateTitle;

      if (data.tags !== undefined && !Array.isArray(data.tags)) {
        throw new Error('tags on data, passed as argument to Store, must be an array argument');
      }
      if (data.tags !== undefined) {
        _tags = [...data.tags];
      }
    },
    getData: () => ({
      title: _title,
      chapter: _chapter,
      folder: _folder,
      url: _url,
      tags: [..._tags],
      updateTitle: _updateTitle
    }),
    setTitle: title => {
      hasArg(title);
      _title = title;
    },
    getTitle: () => _title,
    setChapter: chapter => {
      hasArg(chapter);
      _chapter = chapter;
    },
    getChapter: () => _chapter,
    setFolder: folder => {
      hasArg(folder);
      _folder = folder;
    },
    getFolder: () => _folder,
    setUrl: url => {
      hasArg(url);
      _url = url;
    },
    getUrl: () => _url,
    setTags: tags => {
      hasArg(tags);
      if (!Array.isArray(tags)) {
        throw new Error('tags must be passed as array argument to Store');
      }
      _tags = [...tags];
    },
    getTags: () => [..._tags],
    setUpdateTitle: updateTitle => {
      hasArg(updateTitle);
      _updateTitle = updateTitle;
    },
    getUpdateTitle: () => _updateTitle
  }

  return Store;
})();

document.getElementById('manage-button').addEventListener('click', function() {
  chrome.tabs.create({url: chrome.runtime.getURL('manager/manager.html')});
});

chrome.tabs.query({active: true, currentWindow: true})
  .then((tabs) => {
    const activeTab = tabs[0];
    GlobalDataStore.setUrl(activeTab.url);
    let domain = new URL(activeTab.url).hostname;
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }
    GlobalDataStore.setFolder(domain);
    domainDisplay(domain);
    const title = activeTab.title;
    return findBookmark(title, domain)
      .then((bookmark) => [bookmark, title]);
  })
  .then(([bookmark, title]) => {
    const numsInTitle = title.match(/\d+/g) || [];
    if (bookmark) {
      console.log('bookmark exists');
      GlobalDataStore.setState('update');
      const bookmarkInfo = getBookmarkContents(bookmark.title);
      GlobalDataStore.setData({
        title: bookmarkInfo.title,
        tags: bookmarkInfo.tags,
        updateTitle: bookmark.title
      });

      setActionDisplay(true);
      titleDisplay(bookmarkInfo.title);
      chapterDisplay(numsInTitle, bookmarkInfo.chapter);
      tagDisplay(bookmarkInfo.tags);
    } else {
      console.log('new title');
      GlobalDataStore.setState('create');
      GlobalDataStore.setTitle(title);

      setActionDisplay(false);
      titleDisplay(title);
      chapterDisplay(numsInTitle);
    }
  })
  .catch((err) => console.error(err));

/**
 * Set domain name displayed in popup
 * 
 * @param {string} domain name of current page's domain
 */
function domainDisplay(domain) {
  const domainElement = document.getElementById('domain');
  domainElement.textContent = domain;
}

/**
 * Set up popup display for updating or creating a bookmark
 * 
 * @param {boolean} update define display type, true for updating, false for creating
 */
function setActionDisplay(update) {
  const actionTitle = document.getElementById('bookmark-action');
  const actionButton = document.getElementById('action-button');
  const oldChapter = document.getElementById('old-chapter');
  const chapterArrow = document.getElementById('chapter-arrow');
  const newChapter = document.getElementById('new-chapter');
  const modeChangeButton = document.getElementById('change-mode');
  if (update) {
    actionTitle.textContent = 'Update Bookmark';
    actionButton.textContent = "Update";

    oldChapter.classList.remove('hidden');
    chapterArrow.classList.remove('hidden');
    newChapter.classList.add('bright-text');

    modeChangeButton.textContent = 'Create Mode';
  } else {
    actionTitle.textContent = 'Create Bookmark';
    actionButton.textContent = "Create";
    
    oldChapter.classList.add('hidden');
    chapterArrow.classList.add('hidden');
    newChapter.classList.remove('bright-text');

    modeChangeButton.textContent = 'Update Mode';
  }
}

/**
 * @typedef {Object} BookmarkContents
 * @property {string} title - bookmark contents title
 * @property {string} chapter - bookmark chapter number
 * @property {Array.<string>} tags - tags associated with bookmarks
 */

/**
 * Extracts title of content and chapter number from bookmark title
 * 
 * Expects to recieve a bookmark title with valid format
 * 
 * @param {string} bookmarkTitle Title of bookmark
 * @returns {BookmarkContents} Information contained in bookmark title
 */
function getBookmarkContents(bookmarkTitle) {
  const matches = bookmarkTitle.match(bookmarkRegex());
    const [, title, chapter] = matches;
    const tags = matches[3] ? matches[3].split(',') : [];
    console.log(`'${title}' - '${chapter}' - ${tags}`);
    return { title: title, chapter: chapter, tags: tags};
}

/**
 * Set title to be displayed in popup
 *  
 * @param {string} title 
 */
function titleDisplay(title) {
  const titleElement = document.getElementById('content-title');
  titleElement.textContent = title.trim();
}

/**
 * Set chapter information displayed in popup
 * 
 * @param {Array} numsInTitle list of all numbers in url title
 * @param {*=} oldChapter previous chapter number, if applicable
 */
function chapterDisplay(numsInTitle, oldChapter) {
  if (oldChapter) {
    const oldChapterElement = document.getElementById('old-chapter');
    oldChapterElement.textContent = oldChapter;
  }

  const newChapter = document.getElementById('new-chapter');
  if (oldChapter && numsInTitle.length > 1) {
    var defaultVal = numsInTitle.reduce((prev, curr) => {
      return (Math.abs(curr - oldChapter) < Math.abs(prev - oldChapter) ? curr : prev);
    });
    newChapter.textContent = defaultVal;
    GlobalDataStore.setChapter(defaultVal);
  } else if (numsInTitle.length > 0) {
    newChapter.textContent = numsInTitle[0];
    GlobalDataStore.setChapter(numsInTitle[0]);
  } else {
    GlobalDataStore.setChapter('0');
  }

  if (numsInTitle.length > 0) {
    const chapterSelect = document.getElementById('detected-nums');
    numsInTitle.forEach(number => {
      const option = document.createElement('option');
      option.value = number;
      chapterSelect.appendChild(option);
    });
  }
}

function tagDisplay(tags) {
  const fragment = document.createDocumentFragment();
  tags.forEach(tag => {
    const li = document.createElement('li');
    li.textContent = tag;
    fragment.appendChild(li);
  });
  const bookmarkTags = document.getElementById('bookmark-tags');
  bookmarkTags.replaceChildren(fragment);
}

document.getElementById('action-button').addEventListener('click', function() {
  const state = GlobalDataStore.getState();
  const data = GlobalDataStore.getData();
  if (state === 'update') {
    const updateBookmark = GlobalDataStore.getUpdateTitle();
    createBookmark(data)
      .then((bookmarkTitle) => console.log(`Bookmark updated: ${bookmarkTitle}`))
      .then(() => removeBookmark(data.folder, {bookmarkTitle: updateBookmark}))
      .catch((err) => console.error('Error updating bookmark', err));
  } else {
    createBookmark(data)
      .then((bookmarkTitle) => console.log(`Bookmark created: ${bookmarkTitle}`))
      .catch((err) => console.error('Error creating bookmark:', err));
  }
  this.disabled = true;
});

/**
 * 
 * @param {Object} data information to create bookmark
 * @returns Promise resolves with title of bookmark created
 */
function createBookmark(data) {
  const completeChecked = document.getElementById('completed').checked;
  if (completeChecked) {
    return addBookmark(data.title, data.chapter, data.url, data.folder, data.tags, 'completed');
  } else {
    return addBookmark(data.title, data.chapter, data.url, data.folder, data.tags);
  }
}

document.getElementById('edit-button').addEventListener('click', () => {
  const finishEditButtons = document.getElementById('finish-edit');
  finishEditButtons.classList.remove('hidden');

  const editOptions = document.getElementById('edit-options');
  editOptions.classList.remove('hidden');

  const actionContainer = document.getElementById('action-button-container');
  actionContainer.classList.add('hidden');

  const newChapter = document.getElementById('new-chapter');
  newChapter.classList.add('hidden');
  const editChapter = document.getElementById('edit-chapter');
  editChapter.classList.remove('hidden');
  editChapter.placeholder = GlobalDataStore.getChapter();

  const state = GlobalDataStore.getState();
  if (state === 'update') {
    const findTitleButton = document.getElementById('find-update');
    findTitleButton.classList.remove('hidden');
  } else {
    titleMode(true);
  }
});

function titleMode(editing) {
  const titleElement = document.getElementById('content-title');
  const editTitleContainer = document.getElementById('title-edit-container');
  const editTitle = document.getElementById('title-edit');
  if (editing) {
    editTitle.value = GlobalDataStore.getTitle();
    titleElement.classList.add('hidden');
    editTitleContainer.classList.remove('hidden');
  } else {
    editTitle.value = '';
    titleElement.classList.remove('hidden');
    editTitleContainer.classList.add('hidden');
  }
}

document.getElementById('cancel-edit').addEventListener('click', () => hideEditElements());

document.getElementById('confirm-edit').addEventListener('click', () => {
  const state = GlobalDataStore.getState();
  const newTitle = document.getElementById('title-edit').value;
  if (state ===  'create' && newTitle !== '') {
    titleDisplay(newTitle);
    GlobalDataStore.setTitle(newTitle.trim());
  }

  const editValue = document.getElementById('edit-chapter').value;
  const newChapterElement = document.getElementById('new-chapter');
  if (editValue) {
    newChapterElement.textContent = editValue;
    GlobalDataStore.setChapter(editValue);
  }

  const title = GlobalDataStore.getTitle();
  const actionButton = document.getElementById('action-button');
  if (title === '') {
    actionButton.disabled = true;
  } else {
    actionButton.disabled = false;
  }

  hideEditElements();
});

function hideEditElements() {
  const actionContainer = document.getElementById('action-button-container');
  actionContainer.classList.remove('hidden');

  const editOptions = document.getElementById('edit-options');
  editOptions.classList.add('hidden');

  const finishEditButtons = document.getElementById('finish-edit');
  finishEditButtons.classList.add('hidden');

  const state = GlobalDataStore.getState();
  if (state === 'update') {
    const findTitleButton = document.getElementById('find-update');
    findTitleButton.classList.add('hidden');
  } else {
    titleMode(false);
  }

  const newChapter = document.getElementById('new-chapter');
  newChapter.classList.remove('hidden');
  const editChapter = document.getElementById('edit-chapter');
  editChapter.classList.add('hidden');
  editChapter.value = '';
}

document.getElementById('edit-tags-mode').addEventListener('click', () => {
  const tagsScreen = document.getElementById('tags-screen');  
  const title = GlobalDataStore.getTitle();
  const tags = GlobalDataStore.getTags();
  tagsScreen.openScreen(title, tags);
  const updateCreateContainer = document.getElementById('update-create');
  updateCreateContainer.classList.add('hidden');
});

document.getElementById('change-mode').addEventListener('click', () => {
  const findTitleButton = document.getElementById('find-update');
  const state = GlobalDataStore.getState();
  if (state === 'update') {
    GlobalDataStore.setState('create');
    GlobalDataStore.setUpdateTitle('');
    setActionDisplay(false);
    findTitleButton.classList.add('hidden');
    titleMode(true);
  } else {
    switchToFindTitle();
  }
});

function switchToFindTitle() {
  const findTitleScreen = document.getElementById('find-title-screen');
  const folder = GlobalDataStore.getFolder();
  findTitleScreen.openScreen(folder);
  const updateCreateContainer = document.getElementById('update-create');
  updateCreateContainer.classList.add('hidden');
}

document.getElementById('tags-screen').addEventListener('finishEdit', (event) => {
  const updateCreateContainer = document.getElementById('update-create');
  updateCreateContainer.classList.remove('hidden');
  const action = event.detail.action;
  if (action === 'confirm') {
    const newTags = event.detail.bookmarkTags;
    tagDisplay(newTags);
    GlobalDataStore.setTags(newTags);
  }
});

document.getElementById('find-update').addEventListener('click', () => switchToFindTitle());

document.getElementById('find-title-screen').addEventListener('closeTitleScreen', (event) => {
  const updateCreateContainer = document.getElementById('update-create');
  updateCreateContainer.classList.remove('hidden');
  const action = event.detail.action;
  if (action === 'confirm') {
    const bookmarkInfo = getBookmarkContents(event.detail.updateTitle);
    titleDisplay(bookmarkInfo.title);
    const oldChapterElement = document.getElementById('old-chapter');
    oldChapterElement.textContent = bookmarkInfo.chapter;
    tagDisplay(bookmarkInfo.tags);
    GlobalDataStore.setData({
      title: bookmarkInfo.title,
      tags: bookmarkInfo.tags,
      updateTitle: event.detail.updateTitle
    });
  }
  const state = GlobalDataStore.getState();
  if (action === 'confirm' && state === 'create') {
    GlobalDataStore.setState('update');
    setActionDisplay(true);
    titleMode(false);
  }
});