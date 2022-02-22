// Initialize button with user's preferred color
let updateButton = document.getElementById("updateButton");
let storedSites;
let tabIdx;

chrome.storage.sync.get(["trackedSites"], async function(result) {
    console.log('Value currently is ' + result.trackedSites);
    storedSites = result.trackedSites;
    reloadList(storedSites);
    //
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabIdx = checkMatch(storedSites, tab.url);
    if(tabIdx == -1){
        // When the button is clicked, inject setPageBackgroundColor into current page
        updateButton.addEventListener("click", async () => addTab(tab), { once: true });
    }else{
        document.getElementById("updateButton").innerHTML = "Delete";
        document.getElementById("minute").value = storedSites[tabIdx][2];
        document.getElementById("info").value = storedSites[tabIdx][3];
        updateButton.addEventListener("click", async() => deleteTab(tab), { once: true });
    }
}); 

/*chrome.tabs.getSelected(null,function(tab) {
    var tablink = tab.url;
});*/

function addTab(tab){
    listAddition(tab.title, tab.url, document.getElementById("minute").value, document.getElementById("info").value);
    //
    document.getElementById("updateButton").innerHTML = "Stored!";
    setTimeout(function(){document.getElementById("updateButton").innerHTML = "Delete"}, 1000);
    updateButton.addEventListener("click", async() => deleteTab(tab), { once: true });
}

function deleteTab(tab){
    storedSites.splice(tabIdx, 1);
    chrome.storage.sync.set({"trackedSites": storedSites}, function() {
        console.log('Site deleted');
    });
    document.getElementById("updateButton").innerHTML = "Deleted!";
    reloadList(storedSites);
    setTimeout(function(){document.getElementById("updateButton").innerHTML = "Store"}, 500);
    updateButton.addEventListener("click", async () => addTab(tab), { once: true });
}

// The body of this function will be executed as a content script inside the current page
function setPageBackgroundColor() {
    chrome.storage.sync.get("color", ({ color }) => {
        document.body.style.backgroundColor = color;
    });
}

function listAddition(title, url, minute, info){
    let matchIdx = checkMatch(storedSites, url);
    console.log(`matchIdx: ${matchIdx}, title: ${title}, item: ${storedSites[matchIdx]}, length: ${storedSites.length}`);
    if(matchIdx == -1){
        let parsedTitle = parseTitle(title, url);
        storedSites.push([parsedTitle, url, minute, info, 0]);//the zero represents points
        //
        chrome.storage.sync.set({"trackedSites": storedSites}, function() {
            console.log('Element added ' + parsedTitle);
        });
        //
        var showText = document.createElement("p");
        showText.className = "listed";
        document.getElementById("storeList").appendChild(showText);
        showText.innerText = parsedTitle;
        showText.title = info;
        //
        showText.addEventListener("click", async() => openSite(storedSites[storedSites.length - 1]));
        showText.addEventListener("dblclick", async() => googleThing(isolateTitle(title, url)));
    }else{//this should never be true
        storedSites[matchIdx][2] = minute;
        //
        chrome.storage.sync.set({"trackedSites": storedSites}, function() {
            console.log('updated title ' + title);
        });
    }
}

function checkMatch(list, url){
    var idx = -1;
    for(var i = 0; i < list.length; i++){
        if(list[i][1] == url){
            idx = i;
            break;
        }
    }
    return idx;
}

function reloadList(list){//each item stored as [display text, url, minute, info]
    document.getElementById("storeList").innerHTML = "";
    var showText;
    //
    list.forEach(element => {
        showText = document.createElement("p");
        showText.className = "listed";
        document.getElementById("storeList").appendChild(showText);
        showText.innerText = element[0];
        showText.title = element[3];
        showText.addEventListener("click", async() => openSite(element));
    });
}

async function openSite(item){
    let minuteDisplay = document.getElementById("minuteDisplay");
    minuteDisplay.style = "display: block";
    minuteDisplay.innerText = `minute: ${item[2]}`;
    //
    setTimeout(function(){chrome.tabs.create({url: item[1]})}, 1000);
}

function googleThing(thing){
    //google url format: https://www.google.com/search?q=name+of+a+show
    let buildUrl = 'https://www.google.com/search?q=';
    let words = thing.split(" ");
    for(let i = 0; i < words.length - 2; i++){
        buildUrl += words[i] + "+";
    }
    buildUrl += words[words.length - 1];
    //
    chrome.tabs.create({url: buildUrl});
}

function parseTitle(title, url){//goal: _title_, ep. _episode_
    let mainUrl = url.split("//")[1].split(".")[0];
    console.log(`mainUrl: ${mainUrl}`);
    //
    let titleSplit = title.split(" ");
    let titleBuild;
    var i;
    //
    switch(mainUrl){
        case "dramacool"://format: Watch _title_ (_year_) Episode _episode_ Online With English sub | Dramacool
            [titleBuild, i] = buildTitle(1, "Episode", titleSplit, "(");
            //
            let offset = titleSplit[i].charAt(0) == "(" ? 2 : 1;
            return `${titleBuild}, ep. ${titleSplit[i+offset]}`;
        case "animedao"://format: _title_ Episode _episode_ - AnimeDao
            [titleBuild, i] = buildTitle(0, "Episode", titleSplit);
            //
            return `${titleBuild}, ep. ${titleSplit[i+1]}`;
        case "kissorg"://format: Watch _title_ Episode _episode_ online with English sub | KissAsian
            [titleBuild, i] = buildTitle(1, "Episode", titleSplit);
            //
            return `${titleBuild}, ep. ${titleSplit[i+1]}`;
        case "www":
            switch(url.split("//")[1].split(".")[1]){
                case "youtube"://format: _title_ - YouTube
                    [titleBuild, i] = buildTitle(0, "-", titleSplit);
                    //
                    return `${titleBuild}`;
                case "viki"://format: _title_ - Episode _episode_ | Rakuten Viki
                    [titleBuild, i] = buildTitle(0, "-", titleSplit);
                    //
                    return `${titleBuild}, ep. ${titleSplit[i+2]}`;
                case "iq"://format: watch the latest _title_ Episode _episode_  with English subtitle – iQiyi | iQ.com
                    [titleBuild, i] = buildTitle(3, "Episode", titleSplit);
                    //
                    return `${titleBuild}, ep. ${titleSplit[i+1]}`;
                case "kocowa"://format: _title_: Watch Episode _episode_ Online - KOCOWA
                    [titleBuild, i] = buildTitle(0, "Watch", titleSplit);
                    //
                    titleBuild = titleBuild.split(":")[0];//remove colon from end
                    return `${titleBuild}, ep. ${titleSplit[i+2]}`;
            }
        default:
            console.log("not recognized :(");
            return title;
    }
}

function buildTitle(start, catches, splits, chars=[]){
    var titleBuild = splits[start];
    //
    var i;
    for(i = start + 1; i < splits.length && !catches.includes(splits[i]) && !chars.includes(splits[i].charAt(0)); i++){
        titleBuild += " " + splits[i];
    }
    //
    return [titleBuild, i];
}

function isolateTitle(title, url){
    let mainUrl = url.split("//")[1].split(".")[0];
    console.log(`mainUrl: ${mainUrl}`);
    //
    let titleSplit = title.split(" ");
    let titleBuild;
    var i;
    //
    switch(mainUrl){
        case "dramacool"://format: Watch _title_ (_year_) Episode _episode_ Online With English sub | Dramacool
            console.log("recognized!");
            titleBuild = titleSplit[1];
            //
            for(i = 2; i < titleSplit.length && titleSplit[i].charAt(0) != "("; i++){
                titleBuild += " " + titleSplit[i];
            }
            //
            return titleBuild;
        case "animedao"://format: _title_ Episode _episode_ - AnimeDao
            titleBuild = titleSplit[0];
            //
            for(i = 1; i < titleSplit.length && titleSplit[i].charAt(0) != "E"; i++){
                titleBuild += " " + titleSplit[i];
            }
            //
            return titleBuild;
        case "www":
            switch(url.split("//")[1].split(".")[1]){
                case "youtube"://format: _title_ - YouTube
                    titleBuild = titleSplit[0];
                    //
                    for(i = 1; i < titleSplit.length && titleSplit[i].charAt(0) != "-"; i++){
                        titleBuild += " " + titleSplit[i];
                    }
                    //
                    return titleBuild;
                case "viki"://format: _title_ - Episode _episode_ | Rakuten Viki
                    titleBuild = titleSplit[0];
                    //
                    for(i = 1; i < titleSplit.length && titleSplit[i].charAt(0) != "-"; i++){
                        titleBuild += " " + titleSplit[i];
                    }
                    //
                    return titleBuild;
            }
        default:
            console.log("not recognized :(");
            return title;
    }
}

document.getElementById("download").addEventListener("click", async() => downloadData());
function downloadData(){
    var fileString = "";
    storedSites.forEach(element => {
        fileString += `${element[0]}, ${element[1]}, ${element[2]}, ${element[3]}\n`;
    });
    //
    var blob = new Blob([fileString], {type: "text/plain"});
    var url = URL.createObjectURL(blob);
    chrome.downloads.download({
        url: url // The object URL can be used as download URL
        //...
    });
}