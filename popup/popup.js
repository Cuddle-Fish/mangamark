import { bookmarkRegex, findBookmark, addBookmark, removeBookmark } from "/externs/bookmark.js";
import "/components/themed-button/themed-button.js";
import "/components/svg/check-box.js";
import "/components/svg/done-icon.js";
import "/components/svg/managamark-logo.js";
import "/components/info-tooltip/info-tooltip.js";
import "/components/input-select/input-select.js";
import "/popup/tags-screen/tags-screen.js";
import "/popup/find-title-screen/find-title-screen.js";

const GlobalDataStore = (() => {
  let _state = '';
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
      folder: _folder,
      url: _url,
      tags: [..._tags],
      updateTitle: _updateTitle
    }),
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
  const chapterInput = document.getElementById('chapter-input');
  const modeChangeButton = document.getElementById('change-mode');
  const completedText = document.getElementById('completed-text');
  if (update) {
    actionTitle.textContent = 'Update Bookmark';
    actionButton.textContent = "Update";
    completedText.textContent = "Bookmark Updated";

    oldChapter.classList.remove('hidden');
    chapterArrow.classList.remove('hidden');
    chapterInput.inputStyle = 'color: var(--accent-bright)';

    modeChangeButton.textContent = 'Create Mode';
  } else {
    actionTitle.textContent = 'Create Bookmark';
    actionButton.textContent = "Create";
    completedText.textContent = "Bookmark Created";
    
    oldChapter.classList.add('hidden');
    chapterArrow.classList.add('hidden');
    chapterInput.inputStyle = '';

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
  const titleInput = document.getElementById('title-input');
  titleInput.value = title;
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

  const chapterInput = document.getElementById('chapter-input');
  if (oldChapter && numsInTitle.length > 1) {
    var defaultVal = numsInTitle.reduce((prev, curr) => {
      return (Math.abs(curr - oldChapter) < Math.abs(prev - oldChapter) ? curr : prev);
    });
    chapterInput.value = defaultVal;
  } else if (numsInTitle.length > 0) {
    chapterInput.value = numsInTitle[0];
  } else {
    chapterInput.value = '1';
  }

  if (numsInTitle.length > 0) {
    numsInTitle.forEach(number => {
      const option = document.createElement('option');
      option.value = number;
      chapterInput.appendChild(option);
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
  const titleInput = document.getElementById('title-input');
  titleInput.value = titleInput.value.replace(/\s+/g, ' ').trim();
  const invalidTitle = document.getElementById('invalid-title');
  const chapterInput = document.getElementById('chapter-input');
  const invalidChapter = document.getElementById('invalid-chapter');
  let isInvalid = false;
  if (titleInput.checkValidity()) {
    invalidTitle.classList.add('hidden');
  } else {
    invalidTitle.classList.remove('hidden');
    titleInput.flashWarning();
    isInvalid = true;
  }
  if (chapterInput.checkValidity()) {
    invalidChapter.classList.add('hidden');
  } else {
    invalidChapter.classList.remove('hidden');
    chapterInput.flashWarning();
    isInvalid = true;
  }
  if (isInvalid) {
    return;
  }

  const state = GlobalDataStore.getState();
  const data = GlobalDataStore.getData();
  if (state === 'update') {
    createBookmark(data)
      .then((bookmarkTitle) => console.log(`Bookmark updated: ${bookmarkTitle}`))
      .then(() => removeBookmark(data.folder, {bookmarkTitle: data.updateTitle}))
      .catch((err) => console.error('Error updating bookmark', err));
  } else {
    createBookmark(data)
      .then((bookmarkTitle) => console.log(`Bookmark created: ${bookmarkTitle}`))
      .catch((err) => console.error('Error creating bookmark:', err));
  }

  hideEditElements();
  const actionContainer = document.getElementById('action-button-container');
  const completedContainer = document.getElementById('completed-container');
  actionContainer.classList.add('hidden');
  completedContainer.classList.remove('hidden');
});

/**
 * 
 * @param {Object} data information to create bookmark
 * @returns Promise resolves with title of bookmark created
 */
function createBookmark(data) {
  const completeChecked = document.getElementById('completed').checked;
  const title = document.getElementById('title-input').value;
  const chapter = document.getElementById('chapter-input').value;
  if (completeChecked) {
    return addBookmark(title, chapter, data.url, data.folder, data.tags, 'completed');
  } else {
    return addBookmark(title, chapter, data.url, data.folder, data.tags);
  }
}

document.getElementById('edit-button').addEventListener('click', function() {
  this.classList.add('hidden');

  const editOptions = document.getElementById('edit-options');
  editOptions.classList.remove('hidden');

  const chapterInput = document.getElementById('chapter-input');
  chapterInput.readonly = false;

  titleEditing(true);
});

function titleEditing(isEditing) {
  const titleInput = document.getElementById('title-input');
  const titleTooltip = document.getElementById('title-tooltip');
  const findUpdateButton = document.getElementById('find-update');
  const state = GlobalDataStore.getState();
  if (state === 'update') {
    titleInput.readonly = true;
    titleTooltip.classList.add('hidden');
    if (isEditing) {
      titleInput.inputWidth = '270px';
      findUpdateButton.classList.remove('hidden');
    } else {
      titleInput.inputWidth = '370px';
      findUpdateButton.classList.add('hidden');
    }
  } else {
    findUpdateButton.classList.add('hidden');
    if (isEditing) {
      titleInput.inputWidth = '336px';
      titleInput.readonly = false;
      titleTooltip.classList.remove('hidden');
    } else {
      titleInput.inputWidth = '370px';
      titleInput.readonly = true;
      titleTooltip.classList.add('hidden');
    }
  }
}

function hideEditElements() {
  const editOptions = document.getElementById('edit-options');
  editOptions.classList.add('hidden');

  titleEditing(false);

  const chapterInput = document.getElementById('chapter-input');
  chapterInput.readonly = true;
}

document.getElementById('edit-tags-mode').addEventListener('click', () => {
  const tagsScreen = document.getElementById('tags-screen');
  const titleInput = document.getElementById('title-input');
  const title = titleInput.value;
  const tags = GlobalDataStore.getTags();
  tagsScreen.openScreen(title, tags);
  const updateCreateContainer = document.getElementById('update-create');
  updateCreateContainer.classList.add('hidden');
});

document.getElementById('change-mode').addEventListener('click', () => {
  const state = GlobalDataStore.getState();
  if (state === 'update') {
    GlobalDataStore.setState('create');
    GlobalDataStore.setUpdateTitle('');
    setActionDisplay(false);
    titleEditing(true);
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
      tags: bookmarkInfo.tags,
      updateTitle: event.detail.updateTitle
    });
  }
  const state = GlobalDataStore.getState();
  if (action === 'confirm' && state === 'create') {
    GlobalDataStore.setState('update');
    setActionDisplay(true);
    titleEditing(true);
  }
});