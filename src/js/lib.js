define(["config", "src/participantsRemovedCollector", "src/volumeCollector", "src/cameraCollector", "src/heartbeat", "src/charts", "src/consent", "feathers", "socketio", "underscore", "gapi", "jquery"],
       function(config, participantsRemovedCollector, volumeCollector, cameraCollector, heartbeat, charts, consent, feathers, io, underscore, gapi, $) {

         // initialize global state object
         window.state = {};
         window.state.url = '<%= serverUrl %>';
         console.log("connecting to:", window.state.url);

         // set up raw socket for custom events.
         var socket = io(window.state.url, {
           'transports': [
             'websocket',
             'flashsocket',
             'htmlfile',
             'xhr-polling',
             'jsonp-polling'
           ]
         })

         /////////////////////////////////////////////////////////////////////
         // UI stuff
         $('#move-footer').click(function() {
           console.log("clicked!");
           if($('#footer').hasClass('slide-up')) {
             $('#footer').addClass('slide-down', 150, 'linear');
             $('#footer').removeClass('slide-up');
             $('#upbutton').removeClass('upside-down', 150, 'linear');
           } else {
             $('#footer').removeClass('slide-down');
             $('#footer').addClass('slide-up', 150, 'linear');
             $('#upbutton').addClass('upside-down', 150, 'linear');
           }
         });

         $('#info-modal-trigger').leanModal();
         $('#mm-holder-consent').hide();

         // all links need to open in new tab.
         $('a').each(function() {
           var a = new RegExp('/' + window.location.host + '/');
           if(!a.test(this.href)) {
             $(this).click(function(event) {
               event.preventDefault();
               event.stopPropagation();
               window.open(this.href, '_blank');
             });
           }
         });

         function ui_consent(consentVal) {
           $('#consent-checkbox').prop('checked', consentVal);
           if (consentVal == true) {
             $('#mm-holder-consent').hide();
           } else {
             $('#mm-holder-consent').show();
           }

         }

         function collection_consent(consentVal) {
           if (!consentVal) {
             volumeCollector.consent = false;
           } else {
             volumeCollector.consent = true;
           }
         }

         function get_participant_objects(participants) {
           return _.map(participants,
                        function(p) {
                          return {
                            participant: p.person.id,
                            meeting: window.gapi.hangout.getHangoutId(),
                            name: p.person.displayName,
                            locale: p.locale,
                          };
                        });
         }

         var app = feathers()
           .configure(feathers.hooks())
           .configure(feathers.socketio(socket))

         // once the google api is ready...
         window.gapi.hangout.onApiReady.add(function(eventObj) {
           console.log('hangout object:',  window.gapi.hangout);
           var thisHangout = window.gapi.hangout;
           console.log("hangoutId:", thisHangout.getHangoutId());

           var participants = get_participant_objects(window.gapi.hangout.getParticipants());

           var localParticipant = window.gapi.hangout.getLocalParticipant();

           volumeCollector.onParticipantsChanged(window.gapi.hangout.getParticipants());

           var start_data = window.gapi.hangout.getStartData();

           socket.emit("meetingJoined",
                       {
                         participant: localParticipant.person.id,
                         name: localParticipant.person.displayName,
                         participant_locale: localParticipant.locale,
                         participants: participants,
                         meeting: thisHangout.getHangoutId(),
                         meetingTopic: thisHangout.getTopic(),
                         meetingUrl: thisHangout.getHangoutUrl(),
                         meta: start_data
                       });

           // the only other thing sent to maybe_start_heartbeat
           // is a gapi onparticipantsChanged event, so just follow the format...
           /* heartbeat.register_heartbeat(socket);
              heartbeat.maybe_start_heartbeat([localParticipant]); */

           function process_consent(consentVal) {
             console.log("processing consent");
             // get rid of those stupid click events; if we
             // don't, they will be called twice later... (god I hate jquery)
             $('#consent-button').off('click.consent');
             $('#no-consent-button').off('click.consent');
             if (consentVal === true) {
               addHangoutListeners();
               charts.start_meeting_mediator(window.gapi, socket);
               ui_consent(consentVal);
               collection_consent(consentVal);
               $('#post-hoc-consent').off('click.consent');
               $('#consent-checkbox').off('change');
               $('#consent-checkbox').prop('disabled', true);
             } else {
               console.log("didn't get consent from form...");
               ui_consent(consentVal);
               collection_consent(consentVal);
               $('consent-checkbox').prop('disabled', false);
             }
           }

           setTimeout(function()  {
             consent.get_consent(socket,
                                 localParticipant.person.id,
                                 thisHangout.getHangoutId(),
                                 process_consent);
           }, 2000);

           $('#post-hoc-consent').on('click.consent', function(evt) {
             consent.display_consent(process_consent);
           });

           $('#consent-checkbox').on('change', function(evt) {
             consent.display_consent(process_consent);
           });
         });

         function addHangoutListeners() {
           console.log("adding hangout listeners...");
           // start collecting volume data
           volumeCollector.startVolumeCollection(socket);

           // start heartbeat listener
           /* heartbeat.register_heartbeat(socket); */

           window.gapi.hangout.onParticipantsChanged.add(function(participantsChangedEvent) {
             console.log("participants changed:", participantsChangedEvent.participants);
             var currentParticipants = _.map(_.filter(participantsChangedEvent.participants,
                                                      function (p) { return p.hasAppEnabled }),
                                             function (p) { return p.person.id })

             // send the new participants to the volume collector, to reset volumes etc.
             volumeCollector.onParticipantsChanged(participantsChangedEvent.participants);

             console.log("sending:", currentParticipants);
             const meetingService = app.service('meetings');
             meetingService.patch(window.gapi.hangout.getHangoutId(), {
               participants: currentParticipants // change to only participants with app
             })

             const participantEventService = app.service('participantEvents')
             participantEventService.create({
               meeting: window.gapi.hangout.getHangoutId(),
               participants: _.pluck(currentParticipants, 'participant')
             })
           });

           volumeCollector.registerOnMicrophoneMuteListener(window.gapi, socket);
           cameraCollector.registerOnCameraMuteListener(window.gapi, socket);
           participantsRemovedCollector.registerOnParticipantsRemovedListener(window.gapi, app)
         }

       });
