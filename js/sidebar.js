var SAMPLE_SERVER_BASE_URL = 'https://archiving-app-sample.herokuapp.com'; 

// Represents whether we are currently recording or not
var recordingStatusSidebar = false;

// When user tries to close app, intercept with confirmation menu
DRSidebarSDK.interceptStop(() => { 
	if (recordingStatusSidebar == true) {
    // If currently recording, ask for confirmation, stop archive if user wishes to close app
		if (confirm("Are you sure you'd like to close this app? This will stop the recording.")) { 
            stopArchive();
            DRSidebarSDK.stop();
		} 
    // If not recording, simply close app
	} else {
		DRSidebarSDK.stop();
	}
});

// Calls to start/stop archiving based on our current recording status
function updateRecordingStatusSidebar() {
  // Flip recording status (as we want to change)
  recordingStatusSidebar = !recordingStatusSidebar;
  // Update Display
  updateButtonDisplay();
  // Call D3 to start/stop archiving and update its own display
  updateD3();
}

// Updates current button and subheading display on Sidebar to match the current recording status
function updateButtonDisplay() {
    var SubHeading = q("Recording Status Sidebar");
    var currentButtonDisplay = q("Recording Button Sidebar")
    if (recordingStatusSidebar == true) {
        currentButtonDisplay.value = "Stop Recording";
        SubHeading.innerHTML = 'Status: Currently Recording';
    } else if (recordingStatusSidebar == false) {
        currentButtonDisplay.value = "Start Recording";
        SubHeading.innerHTML = 'Status: Not Recording';
    }
}

// Send message to D3 to either Stop/Start Recording. Manually called in rest of functions to send after we change the state of the Sidebar window
function updateD3()  {
    if (recordingStatusSidebar == true) {
        DRSidebarSDK.sendMessage({ text: 'D3: Start Recording'});
    } else if (recordingStatusSidebar == false) {
        DRSidebarSDK.sendMessage({ text: 'D3: Stop Recording'});
    }
}

// Query to find an element's id by name
function q(q) { return document.getElementById(q); }

// Receive Message from D3. Based on message, will update to stop or start archiving
DRSidebarSDK.onmessage = (message) => {
  // Set to true to stop it from sending a message back to D3
    if (message.text == 'Sidebar: Stop Recording') {
      recordingStatusSidebar = false;
    } else if (message.text == "Sidebar: Start Recording") {
      recordingStatusSidebar = true;
    } 
    updateButtonDisplay();
};

// Variables represent the apiKeys, SessionID, and token for the current call for this app
var apiKey = "47298074";
var api_secret = "6d715657bb12f02c654e2aa20829adbad07c6ca8";
var sessionId = "YOUR_SESSION_ID";
var token = "YOUR_TOKEN";
  
// Run once page is ready
$(document).ready(function ready() {
    archiveID = null;
    // Make an Ajax request to get the OpenTok API key, session ID, and token from the server
    $.get(SAMPLE_SERVER_BASE_URL + '/session', function get(res) {
      apiKey = res.apiKey;
      sessionId = res.sessionId;
      token = res.token;
    // Then, start session using common API key, session ID, and token
      initializeSession();
    });
  });  
  
// Handling all of our errors here by alerting them
function handleError(error) {
    if (error) {
      alert(error.message);
    }
  }
  
// Subscribes to the online TokBox Session to be able to record the call
function initializeSession() {

  // initialize session
  var session = OT.initSession(apiKey, sessionId);

  // called once the session starts
  session.on('streamCreated', function(event) {
    // Set params of the stream we subscribe to
      session.subscribe(event.stream, 'subscriber', {
        subscribeToAudio:false,
        subscribeToVideo:true,
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
      recordingStatusSidebar = true;
      updateButtonDisplay();
      updateD3();
    });

  // handles archiveStopped event - use it to update button display on both sides of the call
  session.on('archiveStopped', function archiveStopped(event) {
      archiveID = event.id;
      console.log('Archive stopped ' + archiveID);
      recordingStatusSidebar = false;
      updateButtonDisplay();
      updateD3();
      $('#view').prop('disabled', false);
    });
  
  // handle sessionDisconnected event, log reason for disconnect
  session.on('sessionDisconnected', function sessionDisconnected(event) {
      console.log('You were disconnected from the session.', event.reason);
    });
  
    // Connect to the session
  session.connect(token, function connectCallback(error) {
      // If the connection is successful, initialize a publisher and publish to the session
      if (!error) {
        // set params for publishing own stream (if no error)
        var publisherOptions = {
          insertMode: 'append',
          width: '5%',
          height: '5%'
        };

        // publish stream, handle errors and log them
        var publisher = OT.initPublisher('publisher', publisherOptions, function initCallback(err) {
          if (err) {
            console.log('There was an error initializing the publisher: ', err.name, err.message);
            return;
            // There was an error initializing the publisher:
            // OT_USER_MEDIA_ACCESS_DENIEDOT.
            // Publisher Access Denied: Permission Denied: End-user denied permission to hardware devices (getUserMedia error: NotAllowedError) 
            // Note: Check that the iframe has the allow attribute for camera and microphone
          }
          session.publish(publisher, function publishCallback(pubErr) {
            if (pubErr) {
              console.log('There was an error publishing: ', pubErr.name, pubErr.message);
            }
          });
        });
      } else {
        console.log('There was an error connecting to the session: ', error.name, error.message);
       
      }
    });
    subscriber.subscribeToAudio(false);
}

// Start recording
function startArchive() { // eslint-disable-line no-unused-vars
  // AJAX request to server to start archiving
  $.ajax({
    url: SAMPLE_SERVER_BASE_URL + '/archive/start',
    type: 'POST',
    contentType: 'application/json', // send as JSON
    data: JSON.stringify({'sessionId': sessionId}),

    complete: function complete() {
      // called when complete
      console.log('startArchive() complete');
    },

    success: function success() {
      // called when successful
      recordingStatusSidebar = true;
      updateButtonDisplay();
      updateD3();
      console.log('successfully called startArchive()');
    },

    error: function error() {
      // called when there is an error
      // resets to not record
      // stopArchive();
      console.log('error calling startArchive()');
    }
  });
}
  
  // Stop recording
  function stopArchive() { // eslint-disable-line no-unused-vars
    $.post(SAMPLE_SERVER_BASE_URL + '/archive/' + archiveID + '/stop');
    recordingStatusSidebar = false;
    updateButtonDisplay();
    updateD3();
   // Enable view button, as archive will now be available
    $('#view').prop('disabled', false);
    }

    // Get the archive status. If it is  "available", download it. Otherwise, keep checking
    // every 5 secs until it is "available"
    function viewArchive() { // eslint-disable-line no-unused-vars
      $('#view').prop('disabled', true);
      window.location = SAMPLE_SERVER_BASE_URL + /archive/ + archiveID + '/view';
    }