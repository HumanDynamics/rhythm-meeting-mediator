// Listener registeres all the primus listeners for this plugin
// instance.
define(["underscore"], function(underscore) {

  var HEARTBEAT_FREQUENCY = 500;

  var _socket = null;

  var heartbeat_id = null;

  function send_heartbeat() {
    _socket.emit("heartbeat-start",
                 {
                   meeting: window.gapi.hangout.getHangoutId(),
                   participant: window.gapi.hangout.getLocalParticipant().person.id
                 });
  }

  function startHeartbeat() {
    console.log("starting the heartbeat...");
    send_heartbeat();
    var heartbeat = window.setInterval(send_heartbeat, HEARTBEAT_FREQUENCY);
    return heartbeat;
  }

  function stopHeartBeat() {
    window.clearInterval(heartbeat_id);
    heartbeat_id = null;
    console.log("stopping the heartbeat...");
    _socket.emit('heartbeat-stop',
                 {
                   heartbeat: window.gapi.hangout.getHangoutId(),
                   participant: window.gapi.hangout.getLocalParticipant().person.id
                 });
  }

  function maybeStartHeartbeat(participants) {
    if (heartbeat_id === null) {
      heartbeat_id = startHeartbeat();
    }
  }

  //TODO: How do we handle when someone joins???

  function registerHeartbeat(socket) {
    console.log("registering heartbeat listener");
    _socket = socket;
    window.gapi.hangout.onParticipantsChanged.add(function(event) {
      maybeStartHeartbeat(event.participants);
    });
  }

  return {
    register_heartbeat: registerHeartbeat,
    maybe_start_heartbeat: maybeStartHeartbeat
  };
});
