const updateButton = document.getElementById('updateButton');
const createButton = document.getElementById('createButton');
const editButton = document.getElementById('editButton');
const editDoneButton = document.getElementById('editDoneButton');
const getImageButton = document.getElementById('getImageButton');
const doneButton = document.getElementById('doneButton');

updateButton.addEventListener('click', function() {
  chrome.tabs.query({active: true, lastFocusedWindow: true}, tabs => {
    let activeTab = tabs[0];
    updateTitle(activeTab);
  });
});

createButton.addEventListener('click', function() {
  chrome.tabs.query({active: true, lastFocusedWindow: true}, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'getCover'}, coverSrc => createTitle(tabs[0], coverSrc));
  });
});

editButton.addEventListener('click', function() {
  let contentTitle = document.getElementById("contentTitle");
  contentTitle.readOnly = false;
  contentTitle.className = "titleEditable";
  editButton.style.display = 'none';
  editDoneButton.style.display = 'inline-block';
});

editDoneButton.addEventListener('click', function() {
  let contentTitle = document.getElementById("contentTitle");
  contentTitle.readOnly = true;
  contentTitle.className = "titleReadOnly";
  editDoneButton.style.display = 'none';
  editButton.style.display = 'inline-block';
});

getImageButton.addEventListener('click', function() {
  chrome.tabs.query({active: true, lastFocusedWindow: true}, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'getImage'});
  });
});

doneButton.addEventListener('click', function() {
  alert("Not yet implemented");
});

function updateTitle(activeTab) {
  let domain = new URL(activeTab.url).hostname;
  let contentTitle = document.getElementById("contentTitle");
  let contentSite = document.getElementById("contentSite");
  contentTitle.value = activeTab.title;
  contentSite.textContent = domain;
}

function createTitle(activeTab, coverSrc) {
  updateTitle(activeTab);
  displayCover(coverSrc);
}

function displayCover(coverSrc) {
  if (coverSrc) {
    const popupImage = document.getElementById('coverImage');
    popupImage.src = coverSrc;
  } else {
    document.getElementById("noImageText").style.display = 'block';
  }
}