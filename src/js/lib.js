define(["config", "src/participantsRemovedCollector", "src/volumeCollector", "src/cameraCollector", "src/heartbeat", "src/charts", "src/consent", "feathers", "socketio", "underscore", "gapi", "jquery"],
       function(config, participantsRemovedCollector, volumeCollector, cameraCollector, heartbeat, charts, consent, feathers, io, underscore, gapi, $) {

         // initialize global state object
         window.state = {};
         window.state.url = '<%=serverUrl%>';
         console.log("connecting to:", window.state.url);

         var api_key = null;
         var app = null;
         var socket = null;
         var hangout = window.gapi.hangout;

         /////////////////////////////////////////////////////////////////////
         // UI stuff
         $(document).ready(function() {
           $('#move-footer').click(function() {
             console.log("clicked!");
             if ($('#footer').hasClass('slide-up')) {
               $('#footer').addClass('slide-down', 150, 'linear');
               $('#footer').removeClass('slide-up');
               $('#upbutton').removeClass('upside-down', 150, 'linear');
             } else {
               $('#footer').removeClass('slide-down');
               $('#footer').addClass('slide-up', 150, 'linear');
               $('#upbutton').addClass('upside-down', 150, 'linear');
             }
           });

           $('#mm-holder-consent').hide();
           $('#mm-holder-error').hide();

           // all links need to open in new tab.
           $('a').each(function() {
             var a = new RegExp('/' + window.location.host + '/');
             if (!a.test(this.href)) {
               $(this).click(function(event) {
                 event.preventDefault();
                 event.stopPropagation();
                 window.open(this.href, '_blank');
               });
             }
           });
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
                            meeting: hangout.getHangoutId(),
                            name: p.person.displayName,
                            locale: p.locale,
                          };
                        });
         }


         // once the google api is ready...
         hangout.onApiReady.add(function(eventObj) {
           var start_data = JSON.parse(hangout.getStartData());

           // If there is not start data pull
           // the apikey from the shared state
           if (start_data == null) {
             var state = hangout.data.getState();
             console.log('start data:', start_data)
             console.log('start data:', state)
             if (_.has(state, 'apikey')) {
               api_key = state.apikey;
             } else {
               $("#mm-holder-error").show();
             }
           } else {
             hangout.data.submitDelta(start_data);
             api_key = start_data.apikey;
           }

           socket = io(window.state.url, {
             'transports': [
               'websocket',
               'flashsocket',
               'htmlfile',
               'xhr-polling',
               'jsonp-polling'
             ]
           })

           app = feathers()
             .configure(feathers.hooks())
             .configure(feathers.socketio(socket))
             .configure(feathers.authentication())

           app.authenticate({
             type: 'token',
             'token': api_key
           }).then(function(result) {
             console.log("Authenticated!")
             console.log("hangoutId:", hangout.getHangoutId());

             var participants = get_participant_objects(hangout.getParticipants());

             var localParticipant = hangout.getLocalParticipant();

             volumeCollector.onParticipantsChanged(hangout.getParticipants());

             var start_data = hangout.getStartData();

             socket.emit("meetingJoined", {
               participant: localParticipant.person.id,
               name: localParticipant.person.displayName,
               participant_locale: localParticipant.locale,
               participants: participants,
               meeting: hangout.getHangoutId(),
               meetingTopic: hangout.getTopic(),
               meetingUrl: hangout.getHangoutUrl(),
               meta: start_data
             });

             function process_consent(consentVal) {
               console.log("processing consent");
               // get rid of those stupid click events; if we
               // don't, they will be called twice later... (god I hate jquery)
               $('#consent-button').off('click.consent');
               $('#no-consent-button').off('click.consent');
               if (consentVal === true) {
                 addHangoutListeners();
                 charts.start_meeting_mediator(window.gapi, app);
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

             setTimeout(function() {
               consent.get_consent(app,
                                   localParticipant.person.id,
                                   hangout.getHangoutId(),
                                   process_consent);
             }, 2000);

             $('#post-hoc-consent').on('click.consent', function(evt) {
               consent.display_consent(process_consent);
             });

             $('#consent-checkbox').on('change', function(evt) {
               consent.display_consent(process_consent);
             });
           }).catch(function(error) {
             $("#mm-holder-error").show();
             console.error('Error authenticating!', error);
           });

           function addHangoutListeners() {
             console.log("adding hangout listeners...");
             volumeCollector.startVolumeCollection(app);

             hangout.onParticipantsChanged.add(function(participantsChangedEvent) {
               console.log("participants changed:", participantsChangedEvent.participants);
               var currentParticipants = _.map(_.filter(participantsChangedEvent.participants,
                                                        function(p) {
                                                          return p.hasAppEnabled
                                                        }),
                                               function(p) {
                                                 return p.person.id
                                               })

               // send the new participants to the volume collector, to reset volumes etc.
               volumeCollector.onParticipantsChanged(participantsChangedEvent.participants);

               console.log("sending:", currentParticipants);
               const meetingService = app.service('meetings');
               meetingService.patch(hangout.getHangoutId(), {
                 participants: currentParticipants // change to only participants with app
               })

               const participantEventService = app.service('participantEvents')
               participantEventService.create({
                 meeting: hangout.getHangoutId(),
                 participants: _.pluck(currentParticipants, 'participant')
               })
             });

             volumeCollector.registerOnMicrophoneMuteListener(window.gapi, socket);
             cameraCollector.registerOnCameraMuteListener(window.gapi, socket);
             participantsRemovedCollector.registerOnParticipantsRemovedListener(window.gapi, app)
           }
         })
       })
