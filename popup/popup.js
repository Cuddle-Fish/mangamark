import { bookmarkRegex, findBookmark, addBookmark, removeBookmark } from "/externs/bookmark.js";
import "/components/themed-button/themed-button.js";
import "/components/svg/check-box.js";
import "/components/svg/done-icon.js";
import "/components/info-tooltip/info-tooltip.js";
import "/popup/tags-screen/tags-screen.js";

//#region Buttons
const manageButton = document.getElementById('manage-button');
const findTitleButton = document.getElementById('find-update');
const modeChangeButton = document.getElementById('change-mode');
const cancelButton = document.getElementById('cancel-edit');
const confirmButton = document.getElementById('confirm-edit');
const editButton = document.getElementById('edit-button');
const actionButton = document.getElementById('action-button');
const editTagsButton = document.getElementById('edit-tags-mode');
//#endregion

var pageURL = '';

manageButton.addEventListener('click', function() {
  chrome.tabs.create({url: chrome.runtime.getURL('manager/manager.html')});
});

chrome.tabs.query({active: true, currentWindow: true})
  .then((tabs) => {
    const activeTab = tabs[0];
    pageURL = activeTab.url;
    let domain = new URL(activeTab.url).hostname;
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }
    const title = activeTab.title;
    return findBookmark(title, domain)
      .then((bookmark) => [bookmark, domain, title]);
  })
  .then(([bookmark, domain, title]) => {
    domainDisplay(domain);
    const numsInTitle = title.match(/\d+/g) || [];
    if (bookmark) {
      console.log('bookmark exists');
      setActionDisplay(true);
      const bookmarkInfo = bookmarkTitleAndChapter(bookmark.title);
      titleDisplay(bookmarkInfo.title);
      chapterDisplay(numsInTitle, bookmarkInfo.chapter);
      tagDisplay(bookmarkInfo.tags);
    } else {
      console.log('new title');
      setActionDisplay(false);
      titleDisplay(title);
      chapterDisplay(numsInTitle);
    }
  })
  .catch((err) => console.error(err));

/**
 * Set domain name displayted in popup
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
  const oldChapter = document.getElementById('old-chapter');
  const chapterArrow = document.getElementById('chapter-arrow');
  const newChapter = document.getElementById('new-chapter');
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
 * Extracts title of content and chapter number from bookmark title
 * 
 * Expects to recieve a bookmark title with valid format
 * 
 * @param {string} bookmarkTitle Title of bookmark
 * @returns {Object} Object with title and chapter number
 * @property {string} title - Extracted title
 * @property {string} chapter - Extracted chapter number
 */
function bookmarkTitleAndChapter(bookmarkTitle) {
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
  titleElement.textContent = title.replace(/\n/g, '');
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
  } else if (numsInTitle.length > 0) {
    newChapter.textContent = numsInTitle[0];
  } else {
    actionButton.disabled = true;
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

/**
 * @typedef {Object} BookmarkData
 * @property {string} title - title of content
 * @property {string} chapter - chapter number
 * @property {string} folderName - name of folder
 * @property {string} url - url for bookmark
 * @property {Array.<string>} tags - list of tags
 */

/**
 * Get all data for creating a bookmark
 * 
 * @returns {BookmarkData} Object with title of content, chapter number,
 * name of bookmark folder and bookmark url
 */
function getData() {
  const titleElement = document.getElementById('content-title');
  const title = titleElement.textContent;
  const newChapter = document.getElementById('new-chapter');
  const chapter = newChapter.textContent;
  const domainElement = document.getElementById('domain');
  const folderName = domainElement.textContent;
  const bookmarkTags = document.getElementById('bookmark-tags');
  const tagList = Array.from(bookmarkTags.children, li => li.textContent);
  return {
    title: title,
    chapter: chapter,
    folderName: folderName,
    url: pageURL,
    tags: tagList
  }
}

actionButton.addEventListener('click', () => {
  const data = getData();
  if (actionButton.textContent === 'Update') {
    const oldChapterElement = document.getElementById('old-chapter');
    const oldChapter = oldChapterElement.textContent;
    createBookmark(data)
      .then((bookmarkTitle) => console.log(`Bookmark updated: ${bookmarkTitle}`))
      .then(() => removeBookmark(data.title, oldChapter, data.folderName))
      .catch((err) => console.error('Error updating bookmark', err));
  } else {
    createBookmark(data)
      .then((bookmarkTitle) => console.log(`Bookmark created: ${bookmarkTitle}`))
      .catch((err) => console.error('Error creating bookmark:', err));
  }
  actionButton.disabled = true;
});

/**
 * 
 * @param {BookmarkData} data information to create bookmark
 * @returns Promise resolves with title of bookmark created
 */
function createBookmark(data) {
  const completeChecked = document.getElementById('completed').checked;
  if (completeChecked) {
    return addBookmark(data.title, data.chapter, data.url, data.folderName, data.tags, 'completed');
  } else {
    return addBookmark(data.title, data.chapter, data.url, data.folderName, data.tags);
  }
}

editButton.addEventListener('click', () => {
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

  if (actionButton.textContent === 'Update') {
    findTitleButton.classList.remove('hidden');
  } else {
    const titleElement = document.getElementById('content-title');
    const editTitle = document.getElementById('title-edit');
    editTitle.value = titleElement.textContent;
    titleElement.classList.add('hidden');

    const editTitleContainer = document.getElementById('title-edit-container');
    editTitleContainer.classList.remove('hidden');
  }
});

cancelButton.addEventListener('click', () => hideEditElements());

confirmButton.addEventListener('click', () => {
  const titleElement = document.getElementById('content-title');
  const editTitle = document.getElementById('title-edit');
  const newTitle = editTitle.value.replace(/\n/g, '')
  titleElement.textContent = newTitle;

  const editChapter = document.getElementById('edit-chapter');
  const newChapter = document.getElementById('new-chapter');
  newChapter.textContent = editChapter.value;

  if (newTitle === '' || editChapter.value === '') {
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

  if (actionButton.textContent === 'Update') {
    findTitleButton.classList.add('hidden');
  } else {
    const titleElement = document.getElementById('content-title');
    const editTitleContainer = document.getElementById('title-edit-container');
    editTitleContainer.classList.add('hidden');
    titleElement.classList.remove('hidden');
  }

  const newChapter = document.getElementById('new-chapter');
  newChapter.classList.remove('hidden');
  const editChapter = document.getElementById('edit-chapter');
  editChapter.classList.add('hidden');
  editChapter.value = '';
}

editTagsButton.addEventListener('click', () => {
  const titleElement = document.getElementById('content-title');
  const tagsScreen = document.getElementById('tags-screen');
  const bookmarkTags = document.getElementById('bookmark-tags');
  const tagList = Array.from(bookmarkTags.children, li => li.textContent);
  tagsScreen.openScreen(titleElement.textContent, tagList);
  const updateCreateContainer = document.getElementById('update-create');
  updateCreateContainer.classList.add('hidden');
});

document.getElementById('tags-screen').addEventListener('finishEdit', (event) => {
  const updateCreateContainer = document.getElementById('update-create');
  updateCreateContainer.classList.remove('hidden');
  const action = event.detail.action;
  if (action === 'confirm') {
    const newTags = event.detail.bookmarkTags;
    tagDisplay(newTags);
  }
});