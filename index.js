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

    let userNameScore = userExistsinTable(user, pointsWager);

    // if the user doesn't exist in the table
    if(userNameScore["exists"] == false) {
      let initialPoints = 100;
      let validWager = (0 <= initialPoints - pointsWager);

      // if the wager is valid
      if(validWager) {

        // add a record
        var data = 
        {
            "records": [
                {
                    "fields": {
                        "User": String(user),
                        "Points": initialPoints - pointsWager
                    }
                }
            ]
        };
        let strResponseHttpRequest = sendJSON(data, airtable_read_endpoint, function(responseText) {
          let tempResponse = responseText;
          userExistsinTable(user, pointsWager);
        });
        /*
        // add to active queue
        var data = 
        {
          "records": [
              {
                  "fields": {
                      "User": user,
                      "Points": pointsWager,
                      "ID": ""
                  }
              }
          ]
        };
        
        // send to active queue and add to player queue in js
        sendJSON(data, "https://api.airtable.com/v0/appe3WTSDmogEOAp7/ActiveQueue");
        playerQueue.push(user);
        */
      }
    }
  }
};

ComfyJS.onChat = (user, message, flags, self, extra) => {
  console.log(user + ":", message);
};

function load_home() {
  document.getElementById("includedContent").innerHTML='<object type="text/html" data="test/index.html" width="400px" height="800px" ></object>';
}

// run through the queue every 10 seconds
window.setInterval(function(){
  updateActiveQueue();
  console.log(playerQueue);
  if(playerQueue.length > 0)  {
    let playerName = document.getElementById("playerName");
    playerName.innerHTML = "<h1>"+ String(playerQueue[0]) + "</h1>";
    let queueList = document.getElementById("queueList");
    queueList.innerHTML = "Queue: "+ String(playerQueue);
    load_home();
    
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

function updateActiveQueue() {
  let strResponseHttpRequest = httpGetAsync(airtable_read_activeQueue, function(responseText) {
    activeQueue = JSON.parse(responseText);
    

    if(activeQueue["records"][0] != null) {
      let location = "?records[]=" + activeQueue["records"][0]["id"];
      console.log(location);
      let strResponseHttpRequest = removeJSON(airtable_read_activeQueue, location, function(responseText) {});
    }
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
    xmlHttp.setRequestHeader('Authorization', 'Bearer keynAF0BONvJvTIg6');
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
  xhr.setRequestHeader('Authorization', 'Bearer keynAF0BONvJvTIg6');
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.send(json);
  return xhr.responseText;
}

// PUT CALL
function putJSON(userID, userName, userPoints, url) {
  let data =
  {
    "records": [
        {
            "id": userID,
            "fields": {
                "User": userName,
                "Points": userPoints
            }
        }
    ]
  };

  var json = JSON.stringify(data);

  var xhr = new XMLHttpRequest();
  xhr.open("PUT", url);
  xhr.setRequestHeader('Authorization', 'Bearer keynAF0BONvJvTIg6');
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.send(json);
  return xhr.responseText;
}

// REMOVE CALL
function removeJSON(url, location, callback) {
  let urlNew = url + location;
  console.log(urlNew);
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() { 
    if (xhr.readyState == 4 && xhr.status == 200)
        callback(xhr.responseText);
  }
  xhr.open("DELETE", urlNew);
  xhr.setRequestHeader('Authorization', 'Bearer keynAF0BONvJvTIg6');
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.send(null);
  return xhr.responseText;
}
// --------------------------------------------------------------------------------------------------

// check if user exists in table, if so check if wager is viable and add to active queue
function userExistsinTable(userName, pointsWager) {
  updateAirtable();
  let tempScore = -1;
  let tempExists = false;
  let p = airtableValues["records"]
  for (var key of Object.keys(p)) {
    if(p[key]["fields"]["User"] == userName) {
      tempScore = Number(p[key]["fields"]["Points"]);
      tempExists = true;
      
      let validWager = (0 <= tempScore - pointsWager);

      var data = 
      {
        "records": [
            {
                "fields": {
                    "User": userName,
                    "Points": pointsWager,
                    "PointTotal": tempScore - pointsWager,
                    "ID": p[key]["id"]
                }
            }
        ]
      };

      if(validWager) {
        putJSON(p[key]["id"], userName, tempScore - pointsWager, airtable_read_endpoint);
        let strResponseHttpRequest = sendJSON(data, "https://api.airtable.com/v0/appe3WTSDmogEOAp7/ActiveQueue", function(responseText) {});
        playerQueue.push(userName);
      }
    }
  }
  return {"score": tempScore, "exists": tempExists};
}