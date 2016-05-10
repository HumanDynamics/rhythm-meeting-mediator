define(["jquery", "feathers", "socketio", "underscore"], function($, feathers, io, _) {
  var socket;
  var participant_id;
  var participant_db_id;
  var app;
  var participantService;

  // saves the consent choice for the stored participant in the
  // server.
  function saveConsent(consentVal, cb) {
    participantService.patch(
      participant_db_id,
      {
        consent: consentVal,
        consentDate: new Date()
      },
      {},
      function(error, data) {
        if (error) {
        } else {
          cb(consentVal);
        }
      }
    );
  }

  // displays the consent modal
  function displayConsent(cb) {
    console.log("displaying consent modal....");
    $('#consent-modal').openModal(
      {
        dismissible: false, // Modal can be dismissed by clicking outside of the modal
        opacity: .5, // Opacity of modal background
        in_duration: 300, // Transition in duration
        out_duration: 200 // Transition out duration
      }
    );

    $('#consent-button').on('click.consent', function(evt) {
      $('#consent-modal').closeModal();
      saveConsent(true, cb);
    });

    $('#no-consent-button').on('click.consent', function(evt) {
      $('#consent-modal').closeModal();
      saveConsent(false, cb);
    });
  }


  // Attempts to get consent from the user for this hangout.
  // cb is the callback to call, with a value of 'true' or 'false',
  // depending on whether or not the user has provided consent.
  function getConsent(socket, participant_id, hangout_id, cb) {
    socket = socket;
    participant_id = participant_id;
    app = feathers().configure(feathers.socketio(socket));
    console.log('app:', app)
    participantService = app.service('participants');

//    socket.emit('participants::get', participant_id, (error, participant) => {
//      console.log('Found message', participant);
//    });

    console.log("getting participant info for:", participant_id, hangout_id);


    participantService.get(participant_id,
                           {},
                           function(error, participant) {
                             console.log('>>>> what?')
                             if (error || !participant) {
                               console.log("didn't find any participants...", error, participant);
                             } else {
                               console.log("consent, found participant:", participant);
                               participant_db_id = participant._id;
                               if (participant.consent == true) {
                                 cb(true);
                               } else {
                                 displayConsent(cb);
                               }
                             }
                           }
    );
  }

  return {
    get_consent: getConsent,
    display_consent: displayConsent
  };
});