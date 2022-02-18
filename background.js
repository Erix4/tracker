
let color = '#3aa757';

chrome.runtime.onInstalled.addListener(() => {
    //chrome.storage.sync.set({ color });
    console.log('Default background color set to %cgreen', `color: ${color}`);
    //
    /*chrome.storage.sync.set({"trackedSites": []}, function() {
        console.log('Value is set to ' + []);
    });*/
});