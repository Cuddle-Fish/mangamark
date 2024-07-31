addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get()
    .then((results) => {
      console.log(results);
      const listContainer = document.getElementById('sync-list');
      Object.entries(results).forEach(([key, value]) => {
        const div = document.createElement('div');
        div.textContent = `key: ${key} : value: ${value}`;
        listContainer.appendChild(div);
      });
    })
});