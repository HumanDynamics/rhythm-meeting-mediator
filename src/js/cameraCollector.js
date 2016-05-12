define(["feathers", "socketio", "underscore", 'underscore_string'], function(feathers, io, _, s) {

    function registerOnCameraMuteListener(gapi, socket) {
        gapi.hangout.av.onCameraMute.add(function(cameraMuteEvent){
            var participant = gapi.hangout.getLocalParticipant();

            socket.emit("cameraMute",
            {
                participant: participant.person.id,
                meetingId: gapi.hangout.getHangoutId(),
                isCameraMute: cameraMuteEvent.isCameraMute
            });
        })
    }

    return {
        registerOnCameraMuteListener: registerOnCameraMuteListener
    };

});
