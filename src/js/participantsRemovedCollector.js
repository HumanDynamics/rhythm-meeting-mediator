define(['feathers', 'socketio', 'underscore', 'underscore_string'], function (feathers, io, _, s) {

  function registerOnParticipantsRemovedListener (gapi, app) {
    gapi.hangout.onParticipantsRemoved.add(function (participantsRemovedEvent) {
      var removedParticipants = _.map(_.filter(participantsRemovedEvent.removedParticipants,
                                               function (p) { return p.hasAppEnabled }),
                                      function (p) { return p.person.id })
      app.service('meetings').patch(gapi.hangout.getHangoutId(), {},
                                    {remove_participants: removedParticipants})
    })
  }

  return {
    registerOnParticipantsRemovedListener: registerOnParticipantsRemovedListener
  }
})
