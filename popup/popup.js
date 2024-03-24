import { findBookmark, addBookmark, removeBookmark } from "../bookmark.js";

const editButton = document.getElementById('editButton');
const updateButton = document.getElementById('updateButton');
const createButton = document.getElementById('createButton');
const manageButton = document.getElementById('manageButton');
const titleElement = document.getElementById('contentTitle');
const oldChapterElement = document.getElementById('oldChapter');
var pageURL = '';

chrome.tabs.query({active: true, currentWindow: true})
  .then((tabs) => {
    const activeTab = tabs[0];
    pageURL = activeTab.url;
    const domain = new URL(activeTab.url).hostname;
    const title = activeTab.title;
    return findBookmark(title, domain)
      .then((bookmark) => [bookmark, domain, title]);
  })
  .then(([bookmark, domain, title]) => {
    domainDisplay(domain);
    const numsInTitle = title.match(/\d+/g) || [];
    if (bookmark) {
      console.log('bookmark exists');
      setDisplayElements(true);
      const bookmarkInfo = bookmarkTitleAndChapter(bookmark.title);
      titleDisplay(bookmarkInfo.title);
      chapterDisplay(numsInTitle, bookmarkInfo.chapter);
    } else {
      console.log('new title');
      setDisplayElements(false);
      titleDisplay(title);
      chapterDisplay(numsInTitle);
    }
  })
  .catch((err) => console.error(err));

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
  const regex = /^(.*?) - Chapter (\d+)$/i;
  const matches = bookmarkTitle.match(regex);
    const [, title, chapter] = matches;
    console.log(`'${title}' - '${chapter}'`);
    return { title: title, chapter: chapter};
}

/**
 * Set up popup display for updating or creating a bookmark
 * 
 * @param {boolean} update define display type, true for updating, false for creating
 */
function setDisplayElements(update) {
  const actionType = document.getElementById('actionType');
  if (update) {
    actionType.textContent = 'Update Title';
    updateButton.classList.remove('hidden');
    const chapterArrow = document.getElementById('chapterArrow');
    oldChapterElement.classList.remove('hidden');
    chapterArrow.classList.remove('hidden');
  } else {
    actionType.textContent = 'Add Title';
    createButton.classList.remove('hidden');
    editButton.classList.remove('hidden');
  }
}

/**
 * Set title to be displayed in popup
 *  
 * @param {string} title 
 */
function titleDisplay(title) {
  titleElement.value = title.replace(/\n/g, '');
  titleElement.resize();
}

titleElement.addEventListener('input', function() {
  this.resize();
});

HTMLTextAreaElement.prototype.resize = function() {
  this.style.height = '';
  this.style.height = this.scrollHeight + 'px';
}

/**
 * Set chapter information displayed in popup
 * 
 * @param {Array} numsInTitle list of all numbers in url title
 * @param {*=} oldChapter previous chapter number, if applicable
 */
function chapterDisplay(numsInTitle, oldChapter) {
  if (oldChapter) {
    oldChapterElement.textContent = oldChapter;
  }

  const chapterInput = document.getElementById('chapterInput');
  if (oldChapter && numsInTitle.length > 1) {
    var defaultVal = numsInTitle.reduce((prev, curr) => {
      return (Math.abs(curr - oldChapter) < Math.abs(prev - oldChapter) ? curr : prev);
    });
    chapterInput.value = defaultVal;
  } else if (numsInTitle.length > 0) {
    chapterInput.value = numsInTitle[0];
  }

  const chapterSelect = document.getElementById('chapterSelect');
  if (numsInTitle.length > 1) {
    chapterSelect.classList.remove('hidden');
    numsInTitle.forEach(number => {
      const option = document.createElement('option');
      option.value = number;
      option.textContent = number;
      chapterSelect.appendChild(option);
    });

    chapterSelect.addEventListener('change', () => {
      chapterInput.value = chapterSelect.value;
    });
  }
}

/**
 * Set domain name displayted in popup
 * 
 * @param {string} domain name of current page's domain
 */
function domainDisplay(domain) {
  const domainElement = document.getElementById('domain');
  domainElement.textContent = domain;
}

manageButton.addEventListener('click', function() {
  chrome.tabs.create({url: chrome.runtime.getURL('manager/manager.html')});
});

editButton.addEventListener('click', function() {
  if (titleElement.readOnly) {
    titleElement.readOnly = false;
    titleElement.classList.remove('readOnly');
    titleElement.classList.add('editable');
    editButton.textContent = 'Done';
  } else {
    titleElement.readOnly = true;
    titleElement.value = titleElement.value.replace(/\n/g, '');
    titleElement.resize();
    titleElement.classList.remove('editable');
    titleElement.classList.add('readOnly');
    editButton.textContent = 'Edit';
  }
});

/**
 * @typedef {Object} BookmarkData
 * @property {string} title - title of content
 * @property {string} chapter - chapter number
 * @property {string} folderName - name of folder
 * @property {string} url - url for bookmark
 */

/**
 * Get all data for creating a bookmark
 * 
 * @returns {BookmarkData} Object with title of content, chapter number,
 * name of bookmark folder and bookmark url
 */
function getData() {
  const title = titleElement.value;
  const chapterInput = document.getElementById('chapterInput');
  const chapter = chapterInput.value;
  const domainElement = document.getElementById('domain');
  const folderName = domainElement.textContent;
  return {
    title: title,
    chapter: chapter,
    folderName: folderName,
    url: pageURL
  }
}

updateButton.addEventListener('click', function() {
  const resultElement = document.getElementById('result');
  const oldChapter = oldChapterElement.textContent;
  const data = getData();
  addBookmark(data.title, data.chapter, data.url, data.folderName)
    .then((bookmarkTitle) => {resultElement.textContent = 'Bookmark updated: ' + bookmarkTitle})
    .then(() => removeBookmark(data.title, oldChapter, data.folderName))
    .catch((err) => {
      resultElement.textContent = 'Error updating bookmark';
      console.error('Error creating bookmark:', err);
    });

  updateButton.disabled = true;
});

createButton.addEventListener('click', function() {
  const resultElement = document.getElementById('result');
  const data = getData();
  addBookmark(data.title, data.chapter, data.url, data.folderName)
    .then((bookmarkTitle) => {resultElement.textContent = 'Bookmark created: ' + bookmarkTitle})
    .catch((err) => {
      resultElement.textContent = 'Error creating bookmark';
      console.error('Error creating bookmark:', err);
    });

  createButton.disabled = true;
});