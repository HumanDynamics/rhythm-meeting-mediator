define(["cs!src/charts/coffee/pieChart", "cs!src/charts/coffee/mm", "feathers", "underscore", "underscore_string", "jquery"], function(pieChart, MM, feathers, _, s, $) {

  var mm = null;
  var mm_width = 300;
  var mm_height = 300;

  // just sums up values of the turns object.
  function get_total_transitions(turns) {
    return _.reduce(_.values(turns), function(m, n){return m+n;}, 0);
  }

  // transform to the right data to send to chart
  function transform_turns(participants, turns) {
    console.log("transforming turns:", turns);

    // filter out turns not by present participants
    var filtered_turns = _.filter(turns, function(turn){
      return _.contains(participants, turn.participant);
    });
    return filtered_turns;

  }

  // update MM turns if it matches this hangout.
  function maybe_update_mm_turns(data) {
    console.log("mm data turns:", data);
    if (data.meeting == window.gapi.hangout.getHangoutId()) {
      mm.updateData({participants: mm.data.participants,
                     transitions: data.transitions,
                     turns: transform_turns(mm.data.participants, data.turns)});
    }
  }

  // update MM participants if it matches this hangout.
  // removes the local participants from the list.
  function maybe_update_mm_participants(participantsChangedEvent) {
    console.log('maybe updating mm partcipants...', participantsChangedEvent)
    var participants = _.map(_.filter(participantsChangedEvent.participants,
                                      function (p) { return p.hasAppEnabled }),
                             function (p) { return p.person.id })
    mm.updateData({participants: participants,
                   transitions: mm.data.transitions,
                   turns: mm.data.turns});
  }

  function start_meeting_mediator (gapi, app) {
    console.log('>> Starting meeting mediator...')

    if (!($('#meeting-mediator').is(':empty'))) {
      return
    }

    var turns = app.service('turns')
    var participants = _.map(_.filter(gapi.hangout.getParticipants(),
                                      function (p) { return p.hasAppEnabled }),
                             function (p) { return p.person.id })
    var localParticipantId = window.gapi.hangout.getLocalParticipant().person.id
    if (!_.contains(participants, localParticipantId)) {
      participants.push(localParticipantId)
    }
    console.log('MM participants:', participants)
    mm = new MM({participants: participants,
                 transitions: 0,
                 turns: []},
                localParticipantId,
                mm_width,
                mm_height)
    mm.render('#meeting-mediator');
    turns.on("created", maybe_update_mm_turns);
    gapi.hangout.onParticipantsChanged.add(maybe_update_mm_participants)
  }

  return {
    start_meeting_mediator: start_meeting_mediator
  };
});
