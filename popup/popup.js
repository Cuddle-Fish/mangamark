const button = document.querySelector('button');

button.addEventListener('click', async () => {
  var textField = document.getElementById("titleField");
  chrome.tabs.query({active: true, lastFocusedWindow: true}, tabs => {
    var urlNode = document.createTextNode(tabs[0].url);
    var titleNode = document.createTextNode(tabs[0].title);
    textField.appendChild(urlNode);
    textField.appendChild(document.createElement("br"));
    textField.appendChild(document.createElement("br"));
    textField.appendChild(titleNode);
  })
  textField.style.display = "block";
});