// replace these values with those generated in your TokBox Account
var apiKey = "47259754";
var sessionId = "YOUR_SESSION_ID";
var token = "YOUR_TOKEN";

// (optional) add server code here
// (optional) add server code here
var SERVER_BASE_URL = 'https://d3robotappidealab.herokuapp.com';
fetch(SERVER_BASE_URL + '/session').then(function(res) {
  return res.json()
}).then(function(res) {
  apiKey = res.apiKey;
  sessionId = res.sessionId;
  token = res.token;
  initializeSession();
}).catch(handleError);


// Handling all of our errors here by alerting them
function handleError(error) {
    if (error) {
      alert(error.message);
    }
  }
  
  function initializeSession() {
    var session = OT.initSession(apiKey, sessionId);
  
    // Subscribe to a newly created stream
    //Finally, we want clients to be able to subscribe to (or view) each other's streams in the session. -> THIS IS WHAT LETS US SEE.
    // So, we will want to connect this into our media capture
    session.on('streamCreated', function(event) {
        session.subscribe(event.stream, 'subscriber', {
          insertMode: 'append',
          width: '100%',
          height: '100%'
        }, handleError);
      });
  
    // Create a publisher
    var publisher = OT.initPublisher('publisher', {
      insertMode: 'append',
      width: '100%',
      height: '100%'
    }, handleError);
  
    // Connect to the session
    session.connect(token, function(error) {
      // If the connection is successful, publish to the session
      if (error) {
        handleError(error);
      } else {
        session.publish(publisher, handleError);
      }
    });
  }

  //Finally, we want clients to be able to subscribe to (or view) each other's streams in the session.