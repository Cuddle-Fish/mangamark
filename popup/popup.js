import {
  hasRootFolderId,
  findDefaultFolder,
  bookmarkRegex,
  searchForBookmark,
} from "/externs/bookmark.js";
import "/components/themed-button/themed-button.js";
import "/components/svg-icon/svg-icon.js";
import "/components/set-extension-folder/set-extension-folder.js";
import "/popup/screens/update-create/update-create.js";
import "/popup/screens/find-title/find-title.js";

document.addEventListener('DOMContentLoaded', () => {
  addListeners();
  setInitialScreen();
});

function addListeners() {
  const manageButton = document.getElementById('manage-button');
  manageButton.addEventListener('click', openManager);

  const infoOverlay = document.getElementById('info-overlay');
  const infoButton = document.getElementById('info-button');
  infoButton.addEventListener('click', () => infoOverlay.classList.remove('hidden'));
  const closeInfo = document.getElementById('close-info');
  closeInfo.addEventListener('click', () => infoOverlay.classList.add('hidden'));

  const updateCreateScreen = document.getElementById('main-screen');
  updateCreateScreen.addEventListener('findTitle', findTitleHandler);

  document.addEventListener('folderSet', folderSetHandler);
  document.addEventListener('findTitleAction', findTitleActionHandler);

  const resetExtensionFolder = document.getElementById('reset-ext-folder');
  resetExtensionFolder.addEventListener('click', openRootFolderScreen);
}

async function setInitialScreen() {
  let hasRoot;
  try {
    hasRoot = await hasRootFolderId();
  } catch (error) {
    const warningOverlay = document.getElementById('warning-overlay');
    warningOverlay.classList.remove('hidden');
    console.warn(error);
    return;
  }

  if (hasRoot) {
    await setupMainScreen();
  } else {
    openRootFolderScreen();
  }
}

function openManager(event) {
  chrome.tabs.create({url: chrome.runtime.getURL('manager/manager.html')});
}

async function setupMainScreen() {
  const queryTabs = await chrome.tabs.query({active: true, currentWindow: true});
  const activeTab = queryTabs[0];
  const url = activeTab.url;
  const domain = new URL(url).hostname;
  const defaultFolder = await findDefaultFolder(domain);
  const tabTitle = activeTab.title;
  const numbersInTitle = tabTitle.match(/-?\d+(\.\d+)?/g) || [];

  const result = await searchForBookmark(tabTitle);
  let existingBookmarkInfo;
  if (result) {
    setScreenInfo('update');
    const { bookmark, subFolder, folderName } = result;
    const bookmarkContents = extractBookmarkContents(bookmark.title);

    existingBookmarkInfo = { 
      id: bookmark.id, 
      title: bookmarkContents.title, 
      chapter: bookmarkContents.chapter, 
      folder: folderName,
      tags: bookmarkContents.tags, 
      readingStatus: subFolder 
    };
  } else {
    setScreenInfo('create');
    existingBookmarkInfo = null;
  }
  const mainScreen = document.getElementById('main-screen');
  mainScreen.setup(url, tabTitle, defaultFolder, numbersInTitle, existingBookmarkInfo);
  mainScreen.classList.remove('hidden');
}

function openRootFolderScreen() {
  const warningOverlay = document.getElementById('warning-overlay');
  warningOverlay.classList.add('hidden');
  setScreenInfo('setFolder');
  const screenContainer = document.getElementById('alt-screen-container');
  const rootFolderScreen = document.createElement('set-extension-folder');
  screenContainer.replaceChildren(rootFolderScreen);
}

function folderSetHandler(event) {
  event.stopPropagation();
  const screenContainer = document.getElementById('alt-screen-container');
  screenContainer.replaceChildren();
  setupMainScreen();
}

function findTitleHandler(event) {
  const showCreate = event.detail;
  const screenContainer = document.getElementById('alt-screen-container');
  const findTitleScreen = document.createElement('find-title');
  screenContainer.replaceChildren(findTitleScreen);

  if (showCreate) {
    setScreenInfo('findOrCreate');
    findTitleScreen.showCreateButton(true);
  } else {
    setScreenInfo('find');
  }
  const mainScreen = document.getElementById('main-screen');
  mainScreen.classList.add('hidden');
}

function findTitleActionHandler(event) {
  event.stopPropagation();
  const action = event.detail.action;
  const mainScreen = document.getElementById('main-screen');
  switch (action) {
    case 'update':
      setScreenInfo('update');
      const bookmarkInfo = event.detail.bookmarkInfo;
      mainScreen.setUpdate(bookmarkInfo);
      break;
    case 'create':
      setScreenInfo('create');
      mainScreen.setCreate();
      break;
    default:
      const mode = mainScreen.getMode();
      setScreenInfo(mode);
  }

  const screenContainer = document.getElementById('alt-screen-container');
  screenContainer.replaceChildren();
  mainScreen.classList.remove('hidden');
}

function setScreenInfo(screenType) {
  let title, info;
  switch (screenType) {
    case 'update':
      title = 'Update Bookmark';
      info = /* html */ `
        <p>Update a previously saved bookmark.</p>
        <p>
          If the title listed is incorrect and does not match the 
          content you are currently reading click 'Create/Find Title' 
          to find a different bookmark to update or create a new one.
        </p>
        <p>
          Use the 'Manage' button to search through saved bookmarks, 
          edit, and navigate to bookmark.
        </p>
      `;
      break;
    case 'create':
      title = 'Create Bookmark';
      info = /* html */ `
        <p>Create a new bookmark to be added to your specified extension folder.</p>
        <p>
          <strong>IMPORTANT:</strong> For update detection, it is 
          recommended you only change the title input by removing 
          anything that is not the title of what you are reading.
        </p>
        <p>
          If this extension failed to find an existing title you 
          want to update click the 'Find Title' button.
        </p>
        <p>
          Use the 'Manage' button to search through saved bookmarks, 
          edit, and navigate to bookmark.
        </p>
      `;
      break;
    case 'setFolder':
      title = 'Set Extension Folder';
      info = /* html */ `
        <p>Setup a bookmark folder to store all bookmarks created by this extension.</p>
        <p>
          <strong>Note:</strong> Any bookmarks in this folder not created 
          by this extension will likely not be found within the management 
          page or recognized for updates.
        </p>
      `;
      break;
    case 'find':
      title = 'Find Title';
      info = /* html */ `
        <p>Find a bookmark previously saved by this extension in order to select it for updating.</p>
        <p>You may search by Title, Folder, and/or Tags.</p>
      `;
      break;
    case 'findOrCreate':
      title = 'Create or Find Title';
      info = /* html */ `
        <p>Go to bookmark creation.</p>
        <p><strong>OR</strong></p>
        <p>Find a bookmark previously saved by this extension in order to select it for updating.</p>
        <p>You may search by Title, Folder, and/or Tags.</p>
      `;
      break;
    default:
      return;
  }

  const screenTitle = document.getElementById('screen-title');
  screenTitle.textContent = title;
  const infoTitle = document.getElementById('info-title');
  infoTitle.textContent = title;
  const infoText = document.getElementById('info-text');
  infoText.innerHTML = info;
}

function extractBookmarkContents(bookmarkTitle) {
    const matches = bookmarkTitle.match(bookmarkRegex());
    const [, title, chapter] = matches;
    const tags = matches[3] ? matches[3].split(',') : [];
    return { title: title, chapter: chapter, tags: tags};
}