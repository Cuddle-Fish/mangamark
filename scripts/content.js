let blurEnabled = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getCover') {
    blurEnabled = !blurEnabled;
    applyBlur();

    const cover = document.querySelector('img[src*="cover" i]');
    if (cover) {
      sendResponse(cover.src);
    } else {
      sendResponse(null);
    }
    
    // document.addEventListener('click', function (event) {
    //   var element = event.target;
    //   if (element.tagName === 'IMG') {
    //     alert(element.src);
    //   }
    // }, { once: true });
    return true;
  }
});

function applyBlur() {
  const elementsToBlur = document.querySelectorAll('body *:not(img)');

  elementsToBlur.forEach(element => {
    if (blurEnabled && !containsImage(element)) {
      element.style.filter = 'blur(5px)';
    } else {
      element.style.filter = 'none';
    }
  });
}

function containsImage(element) {
  if (element.tagName === 'IMG') {
    return true;
  }

  if (element.children.length > 0) {
    for (const child of element.children) {
      if (containsImage(child)) {
        return true;
      }
    }
  }

  return false;
}

// document.addEventListener("mouseover", function (e) {
//   if (e.target.tagName === "IMG") {
//     e.target.style.border = "2px solid red";
//   }
// });

// document.addEventListener("mouseout", function (e) {
//   if (e.target.tagName === "IMG") {
//     e.target.style.border = "none";
//   }
// });
