const updateButton = document.getElementById('updateButton');

updateButton.addEventListener('click', async () => {
  var textField = document.getElementById('titleField');
  chrome.tabs.query({active: true, lastFocusedWindow: true}, tabs => {
    var urlNode = document.createTextNode(tabs[0].url);
    var titleNode = document.createTextNode(tabs[0].title);
    textField.appendChild(urlNode);
    textField.appendChild(document.createElement('br'));
    textField.appendChild(document.createElement('br'));
    textField.appendChild(titleNode);
  })
  textField.style.display = 'block';
});

const addButton = document.getElementById('addButton');

addButton.addEventListener('click', function() {
  chrome.tabs.query({active: true, lastFocusedWindow: true}, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'getCover'}, coverSrc => displayCover(coverSrc));
  });
});

function displayCover(coverSrc) {
  const coverContainer = document.getElementById('coverContainer');
  
  while (coverContainer.firstChild) {
    coverContainer.removeChild(coverContainer.firstChild);
  }

  if (coverSrc) {
    const cover = document.createElement('img');
    cover.src = coverSrc;
    coverContainer.appendChild(cover);
  } else {
    const noCover = document.createElement('p');
    noCover.textContent = "Could not find cover image.";
    coverContainer.appendChild(noCover);
  }
}