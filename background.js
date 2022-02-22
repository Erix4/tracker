
let color = '#3aa757';

chrome.runtime.onInstalled.addListener((details) => {
    //
    if(details.reason == "install"){
        console.log("This is a first install!");
        chrome.storage.sync.set({"trackedSites": []}, function() {//initialize storage
            console.log('Value is set to ' + []);
        });
    }else if(details.reason == "update"){
        var thisVersion = chrome.runtime.getManifest().version;
        console.log("Updated from " + details.previousVersion + " to " + thisVersion + "!");
    }else{
        console.log("Extraneous install");
    }   
});