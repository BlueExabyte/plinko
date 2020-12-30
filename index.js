const apiKey1 = 'Bearer keynAF0BONvJvTIg6';

/* Config */
const twitchTvHandle = "BlueExabyte";
const PAUSE_DURATION = 30 * 1000; // 30 seconds
const DISPLAY_DURATION = 10 * 1000; // 10 seconds

/* DOM */
const container = document.querySelector(".alerts");
const img = new Image();
const queue = new Queue();

let playerQueue = [];
let airtable_read_endpoint = "https://api.airtable.com/v0/appe3WTSDmogEOAp7/Plinko"
let airtable_read_activeQueue = "https://api.airtable.com/v0/appe3WTSDmogEOAp7/ActiveQueue"
let airtableValues = null;
let activeQueue = null;

// Resolve promise after duration
const wait = async duration => {
  return new Promise(resolve => setTimeout(resolve, duration));
};

ComfyJS.Init(twitchTvHandle);
ComfyJS.onCommand = (user, command, message, flags, extra) => {
  console.log(`!${command} was typed in chat`);

  if(command == "plinko") {
    let pointsWager = parseInt(message);
    let userNameScore = userExistsinTablePlinko(user, pointsWager);

    // if the person doesn't exist in airtable, make new entry
    if(userNameScore["exists"] == false) {
      let initialPoints = 100;
      let validWager = (0 <= initialPoints - pointsWager);

      // if the wager is valid
      if(validWager) {
        var data = 
        {
            "records": [
                {
                    "fields": {
                        "User": String(user),
                        "Points": initialPoints - pointsWager,
                        "Wager": pointsWager,
                        "Queue": true
                    }
                }
            ]
        };

        let strResponseHttpRequest = sendJSON(data, airtable_read_endpoint);
        playerQueue.push(user);
      }
    }
  }
};

ComfyJS.onChat = (user, message, flags, self, extra) => {
  console.log(user + ":", message);
};

function load_plinko() {
  document.getElementById("includedContent").innerHTML='<object type="text/html" data="plinko/index.html" width="400px" height="800px" ></object>';
}

// run through the queue every 10 seconds
window.setInterval(function(){
  console.log(playerQueue);
  if(playerQueue.length > 0)  {
    //let playerName = document.getElementById("playerName");
    //playerName.innerHTML = "<h1>"+ String(playerQueue[0]) + "</h1>";
    //let queueList = document.getElementById("queueList");
    //queueList.innerHTML = "Queue: "+ String(playerQueue);
    load_plinko();
    
    playerQueue.splice(0, 1);
  }
  else {

    document.getElementById("playerName").innerHTML = "";
    document.getElementById("queueList").innerHTML = "";
    document.getElementById("includedContent").innerHTML = "";
  }
}, 10000);

// Updating API to store data -----------------------------------------------------------------------
updateAirtable();

function updateAirtable() {
  let strResponseHttpRequest = httpGetAsync(airtable_read_endpoint, function(responseText) {
    airtableValues = JSON.parse(responseText);
  });
}

// GET CALL
function httpGetAsync(url, callback)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
      if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
          callback(xmlHttp.responseText);
    }
    xmlHttp.open("GET", url, true);
    xmlHttp.setRequestHeader('Authorization', apiKey1);
    xmlHttp.send(null);
    return xmlHttp.responseText;
}

// POST CALL
function sendJSON(data, url, callback) {
  var json = JSON.stringify(data);

  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() { 
    if (xhr.readyState == 4 && xhr.status == 200)
        callback(xhr.responseText);
  }
  xhr.open("POST", url);
  xhr.setRequestHeader('Authorization', apiKey1);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.send(json);
  return xhr.responseText;
}

// PUT CALL
function putJSON(data, url) {

  var json = JSON.stringify(data);

  var xhr = new XMLHttpRequest();
  xhr.open("PUT", url);
  xhr.setRequestHeader('Authorization', apiKey1);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.send(json);
  return xhr.responseText;
}

// REMOVE CALL
function removeJSON(url, location, callback) {
  let urlNew = url + location;
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() { 
    if (xhr.readyState == 4 && xhr.status == 200)
        callback(xhr.responseText);
  }
  xhr.open("DELETE", urlNew);
  xhr.setRequestHeader('Authorization', apiKey1);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.send(null);
  return xhr.responseText;
}
// --------------------------------------------------------------------------------------------------

// check if user exists in table, if so check if wager is viable and add to active queue
function userExistsinTablePlinko(userName, pointsWager) {
  updateAirtable();
  let tempScore = -1;
  let tempExists = false;
  let p = airtableValues["records"]

  for (var key of Object.keys(p)) {
    if(p[key]["fields"]["User"] == userName) {
      tempScore = Number(p[key]["fields"]["Points"]);
      tempExists = true;
      
      let validWager = (0 <= tempScore - pointsWager);

      if(validWager) {
        let newData = 
        {
          "records": [
              {
                  "id": p[key]["id"],
                  "fields": {
                      "User": userName,
                      "Points": tempScore - pointsWager,
                      "Wager": pointsWager,
                      "Queue": true
                  }
              }
          ]
        };
        putJSON(newData, airtable_read_endpoint);
        playerQueue.push(userName);
      }
    }
  }
  return {"score": tempScore, "exists": tempExists};
}