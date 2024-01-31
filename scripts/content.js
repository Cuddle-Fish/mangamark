let blurEnabled = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch(message.action) {
    case 'getCover':
      sendResponse(getCover());
      break;
    case 'getImage':
      blurEnabled = !blurEnabled;
      applyBlur();
      break;
  }

  return true;

    // document.addEventListener('click', function (event) {
    //   var element = event.target;
    //   if (element.tagName === 'IMG') {
    //     alert(element.src);
    //   }
    // }, { once: true });
    
});

function getCover() {
  let cover = document.querySelector('img[src*="cover" i]');
  if (cover) {
    return cover.src;
  }

  cover = document.querySelector("meta[property='og:image']").getAttribute("content");
  if (cover) {
    return cover;
  } else {
    return null;
  }
}

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
