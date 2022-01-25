var SAMPLE_SERVER_BASE_URL = 'https://archiving-app-sample.herokuapp.com'; 

// Represents whether we are currently recording or not
var recordingStatusD3 = false;
// Represents whether or not the camera output has been enabled yet
var haveWeUpdatedCameraOutput = false;
// Represents whether a certain Start/Stop Archiving call came from a button press or from the sidebar
//var sentFromSidebar = false;

/*
// Event created
// Event is dispatched when we want to start/stop archiving
const varChangeEvent = document.createEvent('Event');
varChangeEvent.initEvent('Variable Change', true, true);

// Calls start/stop archiving once dispatched
// Starts or stops based on the current recordingStatusD3 value
window.addEventListener("Variable Change", function() {
    var SubHeading = q("Recording Status D3");
    SubHeading.innerHTML += '<p>' + 'VarChangeEvent caught' + '</p>';
    if (recordingStatusD3 == false) {
        startArchive();
    } else if (recordingStatusD3 == true) {
        stopArchive();
    }
}, false);
*/

// If we haven't updated the camera output yet, sends an API command to output to 
// both WebRtc (base call) and v4l2 (which we will use for the TokBox call/Recording)
function cameraOutputUpdate() {
    if (haveWeUpdatedCameraOutput == false) {
      // API call to D3 hardware
        DRDoubleSDK.sendCommand("camera.output", {
            "template": ["h264ForWebRTC", "v4l2"],
        });	
            haveWeUpdatedCameraOutput = true;	
    } 
}

// Calls to start/stop archiving based on our current recording status
function updateRecordingStatusD3() {
    if (recordingStatusD3 == false) {
      startArchive();
  } else if (recordingStatusD3 == true) {
      stopArchive();
  }	
    //window.dispatchEvent(varChangeEvent);
}

// Updates current button and subheading display on D3 to match the current recording status
function updateButtonDisplayD3() {
    var SubHeading = q("Recording Status D3");
    var currentButtonDisplay = q("Recording Button D3");
    if (recordingStatusD3 == true) {
        currentButtonDisplay.value += "Stop Recording";
        SubHeading.innerHTML += '<p>' + 'Status: Currently Recording' + '</p>';
    } else if (recordingStatusD3 == false) {
        currentButtonDisplay.value += "Start Recording";
        SubHeading.innerHTML += '<p>' + 'Status: Not Recording' + '</p>';
    }
}

// API call to send a message to the sidebar
function sendMessage(message) {
    DRDoubleSDK.sendCommand('endpoint.driverSidebar.sendMessage', {
        message: message,
        targetOrigin: '*'
    });
}

// Send a message to SideBar to either start or stop recording
function updateSidebar() {
    if (recordingStatusD3 == true) {
        sendMessage({ text: 'Sidebar: Start Recording'});
    } else if (recordingStatusD3 == false) {
        sendMessage({ text: 'Sidebar: Stop Recording'});
    }
}

// Query to find an element's id by name
function q(q) { return document.getElementById(q); }

// Receive message from sidebar to start or stop archiving
function handleMesage(message) {
  if (message.text == "D3: Stop Recording") {
    stopArchive();
      //recordingStatusD3 = false;
    } else if (message.text == "D3: Start Recording") {
    startArchive();
      //recordingStatusD3 = true;
    }
    //updateButtonDisplayD3();
}

// Message handler
if ("DRDoubleSDK" in window) {
    DRDoubleSDK.on("event", (message) => {
        switch (message.class +"."+ message.key) {
            case "DREndpointModule.messageFromDriverSidebar": {
                if (message.data) {
                    handleMesage(message.data);
                }
                break;
            }
        }
    });
    // Subscribe to incoming messages, run on load
    DRDoubleSDK.on("connect", () => {
        DRDoubleSDK.sendCommand("events.subscribe", {
            events: [
                "DREndpointModule.messageFromDriverSidebar"
            ]
        });
    });
}

// Variables represent the apiKeys, SessionID, and token for the current call for this app
var apiKey = "47298074";
var api_secret = "6d715657bb12f02c654e2aa20829adbad07c6ca8";
var sessionId = "YOUR_SESSION_ID";
var token = "YOUR_TOKEN";

// Run once page is ready
$(document).ready(function ready() {
  // Set correct camera outputs on load if not done already
    cameraOutputUpdate();
    archiveID = null;
  
    // Make an Ajax request to get the OpenTok API key, session ID, and token from the server
    $.get(SAMPLE_SERVER_BASE_URL + '/session', function get(res) {
      apiKey = res.apiKey;
      sessionId = res.sessionId;
      token = res.token;
  
     // Then, start session using common API key, session ID, and token
      initializeSession();
    });
    var SubHeading = q("Recording Status D3");
    SubHeading.innerHTML += '<p>' + 'End of $.get' + '</p>';
});

// Handling all of our errors here by alerting by sending a message
function handleError(error) {
    if (error) {
      var SubHeading = q("Recording Status D3");
      alert(error.message);
      SubHeading.innerHTML += '<p>' + 'handleError Called' + '</p>';
    }
}

// Subscribes to the online TokBox Session to be able to record the call
function initializeSession() {
  var currentButtonDisplay = q("Recording Button D3");
  var SubHeading = q("Recording Status D3");
  // initialize session
  var session = OT.initSession(apiKey, sessionId);

  // called once the session starts
  session.on('streamCreated', function(event) {
    // Set params of the stream we subscribe to
      session.subscribe(event.stream, 'subscriber', {
        insertMode: 'append',
        width: '100%',
        height: '100%'
      }, handleError);
      // session subscribe
      session.subscribe(event.stream, 'subscriber', subscriberOptions, function callback(error) {
          if (error) {
            console.log('There was an error publishing: ', error.name, error.message);
          }
      });
    });

    // handles archiveStarted event - use it to update the button display on both sides of the call
  session.on('archiveStarted', function archiveStarted(event) {
      archiveID = event.id;
      console.log('Archive started ' + archiveID);
      recordingStatusD3 = true;
      updateButtonDisplayD3();	
      updateSidebar();
      SubHeading.innerHTML += '<p>' + 'archiveStartedEvent Called' + '</p>';
    });
  
    // handles archiveStopped event - use it to update button display on both sides of the call
  session.on('archiveStopped', function archiveStopped(event) {
      archiveID = event.id;
      console.log('Archive stopped ' + archiveID);
      recordingStatusD3 = false;
      updateButtonDisplayD3();	
      updateSidebar();
      SubHeading.innerHTML += '<p>' + 'archiveStoppedEvent Called' + '</p>';
    });
  
    // handle sessionDisconnected event, log reason for disconnect
  session.on('sessionDisconnected', function sessionDisconnected(event) {
      console.log('You were disconnected from the session.', event.reason);
      SubHeading.innerHTML += '<p>' + 'sessionDisconnectedEvent Called' + '</p>';
    });
  
    // Connect to the session
  session.connect(token, function connectCallback(error) {
    var listAudioDevices = OT.getDevices();
    SubHeading.innerHTML += listAudioDevices;
      // If the connection is successful, initialize a publisher and publish to the session
      if (!error) {
        // set params for publishing own stream (if no error)
        var publisherOptions = {
          //audioSource: '',
          insertMode: 'append',
          width: '20%',
          height: '20%'
        };
        /*
        Also need to add audio recording:
        . The default mic called d3_front_center is used for the live call. If you want to capture from a mic as well, you should use another one, such as 
        d3_front_left_right (has one mic on each of the two stereo channels).
        If it's not already included
        */

        // publish stream, handle errors and log them
        var publisher = OT.initPublisher('publisher', publisherOptions, function initCallback(err) {
          if (err) {
            console.log('There was an error initializing the publisher: ', err.name, err.message);
            SubHeading.innerHTML += '<p>' + 'error initializing publisher' + '</p>';

            return;
          }
          session.publish(publisher, function publishCallback(pubErr) {
            if (pubErr) {
              console.log('There was an error publishing: ', pubErr.name, pubErr.message);
              SubHeading.innerHTML += '<p>' + 'error publishing' + '</p>';
            }
          });
        });
      } else {
        console.log('There was an error connecting to the session: ', error.name, error.message);
        SubHeading.innerHTML += '<p>' + 'error publishing to the session' + '</p>';
      }
    });
   // stopArchive();
  }

    // Start recording
    // NOTE: Starting archiving will send a signal to turn off archiving on all other connected clients (as it's a shared recording)
    // Therefore, do not send a signal to stop on the other side when you want to stop, it will error
function startArchive() { // eslint-disable-line no-unused-vars
  var SubHeading = q("Recording Status D3");
  var currentButtonDisplay = q("Recording Button D3");
  // AJAX request to server to start archiving
    $.ajax({
      url: SAMPLE_SERVER_BASE_URL + '/archive/start',
      type: 'POST',
      contentType: 'application/json', // send as JSON
      data: JSON.stringify({'sessionId': sessionId}),
  
      complete: function complete() {
        // called when complete
        console.log('startArchive() complete');
        SubHeading.innerHTML += '<p>' + 'Complete StartArchive()' + '</p>';
      },
  
      success: function success() {
        // called when successful
        recordingStatusD3 = true;
        updateButtonDisplayD3();
        updateSidebar();
        console.log('successfully called startArchive()');
        SubHeading.innerHTML += '<p>' + 'Success StartArchive()' + '</p>';
      },
  
      error: function error() {
        // called when there is an error
        // resets to not record
        //stopArchive();
        console.log('error calling startArchive()');
        SubHeading.innerHTML += '<p>' + 'Error StartArchive()' + '</p>';
      }
    });
  }

// Stop recording
function stopArchive() { // eslint-disable-line no-unused-vars
    var currentButtonDisplay = q("Recording Button D3");
    var SubHeading = q("Recording Status D3");
    // send POST request to server to stop archiving
    $.post(SAMPLE_SERVER_BASE_URL + '/archive/' + archiveID + '/stop');
    recordingStatusD3 = false;
    // update button display since we are no longer archiving
    updateButtonDisplayD3();	
    // update Sidebar if archive was started from the D3-side of the call
    //if (sentFromSidebar == false) {
    updateSidebar();
    //}
    SubHeading.innerHTML += '<p>' + 'Success StopArchive()' + '</p>';
  }