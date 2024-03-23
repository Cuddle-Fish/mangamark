import { findBookmark, addBookmark, removeBookmark } from "../bookmark.js";

const manageButton = document.getElementById('manageButton');
const editButton = document.getElementById('editButton');
const updateButton = document.getElementById('updateButton');
const createButton = document.getElementById('createButton');

const titleElement = document.getElementById('contentTitle');

var pageURL = '';

HTMLTextAreaElement.prototype.resize = function() {
  this.style.height = '';
  this.style.height = this.scrollHeight + 'px';
}

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

      changeActionType('Update Title');
      setDisplayElements(true);

      const bookmarkInfo = bookmarkTitleAndChapter(bookmark.title);

      titleDisplay(bookmarkInfo.title);

      chapterDisplay(numsInTitle, bookmarkInfo.chapter);
    } else {
      console.log('new title');

      changeActionType('Add Title');
      setDisplayElements(false);

      titleDisplay(title);

      chapterDisplay(numsInTitle);
    }
  })
  .catch((err) => console.error(err));

function bookmarkTitleAndChapter(bookmarkTitle) {
  const regex = /^(.*?) - Chapter (\d+)$/i;
  const matches = bookmarkTitle.match(regex);
  if (matches) {
    const [, title, chapter] = matches;
    return { title: title.trim(), chapter: parseInt(chapter)};
  } else {
    return null;
  }
}

function changeActionType(displyStr) {
  const actionType = document.getElementById('actionType');
  actionType.textContent = displyStr;
}

function setDisplayElements(update) {
  if (update) {
    updateButton.classList.remove('hidden');

    const oldChapter = document.getElementById('oldChapter');
    const chapterArrow = document.getElementById('chapterArrow');
    oldChapter.classList.remove('hidden');
    chapterArrow.classList.remove('hidden');
  } else {
    createButton.classList.remove('hidden');

    editButton.classList.remove('hidden');
  }
}

function titleDisplay(title) {
  titleElement.value = title.replace(/\n/g, '');
  titleElement.resize();
}

function chapterDisplay(numsInTitle, oldChapter) {
  if (oldChapter) {
    const oldChapterElement = document.getElementById('oldChapter');
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

function domainDisplay(domain) {
  const domainElement = document.getElementById('domain');
  domainElement.textContent = domain;
}

manageButton.addEventListener('click', function() {
  chrome.tabs.create({url: chrome.runtime.getURL('manager/manager.html')});
});

titleElement.addEventListener('input', function() {
  this.resize();
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
  const oldChapterElement = document.getElementById('oldChapter');
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