define([
  'core/js/adapt'
], function (Adapt) {
  function ppj_start (adp) {

      var api_key = 'SDyOS93tTG37IopubAbnO6EFpgtkHPARa4u32Ecq';
      var ucat = '';
      var debug_log = true;

      console.log("ppjSCO js starting...");

      // todo: if we are NOT in PPJ LMS then we have big problems
      if (ucat == null) {
      	ucat = getQueryVariable('ucat');
      }

      // DEBUG?
      if (debug_log == null) {debug_log = getQueryVariable('ppj_debug');}

      var ocID = getQueryVariable('org_course_id');
      ppjConsoleLog('ucat: ' + ucat);
      ppjConsoleLog('ocID: ' + ocID);

      if (ucat === undefined) {
        // If querystring not defined then we must be in non PPJ LMS
      }
      else {
        // PPJ LMS Proxy
        ppjConsoleLog('In PPJ LMS');
        window.API = new PPJScormProxy(ucat);
      }

      // AJAX Util function, always sends ucat
      function ajaxPPJ(type, endpoint, payload){
      	var ajax_url = 'https://api.getinclusive.com/prod' + endpoint;
        ppjConsoleLog('Ajax call to: ' + ajax_url);

        return $.ajax({
          url: ajax_url,
          method: type,
          cache: false,
          crossDomain: true,
          headers:{'x-api-key': api_key},
          data: {ucat: ucat, data: payload},
        })
        .done( function(ret) { console.log('Done:' + JSON.stringify(ret)); })
        .fail( function(jqXHR, txtStatus) { console.log('Err:' + txtStatus); });
      }

      // PPJ SCORM API PROXY //
      function PPJScormProxy (ucat) {
        // https://scorm.com/scorm-explained/technical-scorm/run-time/run-time-reference/

        this.userCourseAuthToken = ucat;

        // LMSInitialize( “” ) : bool – Begins a communication session with the LMS.
        this.LMSInitialize = function (p) {
          ppjConsoleLog ('Initializing PPJ LMS wrapper');

          ajaxPPJ('GET','/student/validate')
          .done(function(retJson){
            console.log(">>>>>>Validated Student: " + retJson.status=='success');
          })
          .fail(function(jqXHR, txtStatus) { console.log("Error"); });

          // todo: Get from PPJ LMS
          // window.localStorage.setItem('cmi.core.student_id', 'ali@getinclusive.com');
          // window.localStorage.setItem('cmi.core.student_name', 'Ali, Waqar');
          // window.localStorage.setItem('cmi.core.first_name', 'WaqarF');
          // window.localStorage.setItem('cmi.core.last_name', 'AliL');

          return "true";
        };

        // LMSFinish( “” ) : bool – Ends a communication session with the LMS.
        this.LMSFinish = function (p) {
          return 'true';
        };

        // LMSGetLastError() : CMIErrorCode – Returns the error code that resulted from the last API call.
        this.LMSGetLastError = function () {
          // No error (0) No error occurred, the previous API call was successful.
          // General Exception (101) No specific error code exists to describe the error. Use LMSGetDiagnostic for more information.
          // Invalid argument error (201) Indicates that an argument represents an invalid data model element or is otherwise incorrect.
          // Element cannot have children (202) Indicates that LMSGetValue was called with a data model element name that ends in “_children” for a data model element that does not support the “_children” suffix.
          // Element not an array. Cannot have count. (203) Indicates that LMSGetValue was called with a data model element name that ends in “_count” for a data model element that does not support the “_count” suffix.
          // Not initialized (301) Indicates that an API call was made before the call to LMSInitialize.
          // Not implemented error (401) The data model element indicated in a call to LMSGetValue or LMSSetValue is valid, but was not implemented by this LMS. SCORM 1.2 defines a set of data model elements as being optional for an LMS to implement.
          // Invalid set value, element is a keyword (402) Indicates that LMSSetValue was called on a data model element that represents a keyword (elements that end in “_children” and “_count”).
          // Element is read only. (403) LMSSetValue was called with a data model element that can only be read.
          // Element is write only (404) LMSGetValue was called on a data model element that can only be written to.
          // Incorrect Data Type (405) LMSSetValue was called with a value that is not consistent with the data format of the supplied data model element.
          return 0;
        };

        // LMSGetErrorString( errorCode : CMIErrorCode ) : string – Returns a short string describing the specified error code.
        this.LMSGetErrorString = function (errorCode) {
          return '';
        };

        // LMSGetDiagnostic( errorCode : CMIErrorCode ) : string – Returns detailed information about the last error that occurred.
        this.LMSGetDiagnostic = function (errorCode) {
          return '';
        };

        // LMSGetValue( element : CMIElement ) : string – Retrieves a value from the LMS.
        this.LMSGetValue = function (name) {
          if (localStorage.getItem(name) == null) {
            switch (name) {
              case 'cmi.core.lesson_status':
              localStorage.setItem(name, 'incomplete');
                break;
              case 'cmi.suspend_data':
                localStorage.setItem(name, '');
                break;
            }
          }
          {
            // DATA MODEL //
            // cmi.core._children (student_id, student_name, lesson_location, credit, lesson_status, entry, score, total_time, lesson_mode, exit, session_time, RO) Listing of supported data model elements
            // cmi.core.student_id (CMIString (SPM: 255), RO) Identifies the student on behalf of whom the SCO was launched
            // cmi.core.student_name (CMIString (SPM: 255), RO) Name provided for the student by the LMS
            // cmi.core.lesson_location (CMIString (SPM: 255), RW) The learner’s current location in the SCO
            // cmi.core.credit (“credit”, “no-credit”, RO) Indicates whether the learner will be credited for performance in the SCO
            // cmi.core.lesson_status (“passed”, “completed”, “failed”, “incomplete”, “browsed”, “not attempted”, RW) Indicates whether the learner has completed and satisfied the requirements for the SCO
            // cmi.core.entry (“ab-initio”, “resume”, “”, RO) Asserts whether the learner has previously accessed the SCO
            // cmi.core.score_children (raw,min,max, RO) Listing of supported data model elements
            // cmi.core.score.raw (CMIDecimal, RW) Number that reflects the performance of the learner relative to the range bounded by the values of min and max
            // cmi.core.score.max (CMIDecimal, RW) Maximum value in the range for the raw score
            // cmi.core.score.min (CMIDecimal, RW) Minimum value in the range for the raw score
            // cmi.core.total_time (CMITimespan, RO) Sum of all of the learner’s session times accumulated in the current learner attempt
            // cmi.core.lesson_mode (“browse”, “normal”, “review”, RO) Identifies one of three possible modes in which the SCO may be presented to the learner
            // cmi.core.exit (“time-out”, “suspend”, “logout”, “”, WO) Indicates how or why the learner left the SCO
            // cmi.core.session_time (CMITimespan, WO) Amount of time that the learner has spent in the current learner session for this SCO
            // cmi.suspend_data (CMIString (SPM: 4096), RW) Provides space to store and retrieve data between learner sessions
            // cmi.launch_data (CMIString (SPM: 4096), RO) Data provided to a SCO after launch, initialized from the dataFromLMS manifest element
            // cmi.comments (CMIString (SPM: 4096), RW) Textual input from the learner about the SCO
            // cmi.comments_from_lms (CMIString (SPM: 4096), RO) Comments or annotations associated with a SCO
            // cmi.objectives._children (id,score,status, RO) Listing of supported data model elements
            // cmi.objectives._count (non-negative integer, RO) Current number of objectives being stored by the LMS
            // cmi.objectives.n.id (CMIIdentifier, RW) Unique label for the objective
            // cmi.objectives.n.score._children (raw,min,max, RO) Listing of supported data model elements
            // cmi.objectives.n.score.raw (CMIDecimal, RW) Number that reflects the performance of the learner, for the objective, relative to the range bounded by the values of min and max
            // cmi.objectives.n.score.max (CMIDecimal, Rw) Maximum value, for the objective, in the range for the raw score
            // cmi.objectives.n.score.min (CMIDecimal, RW) Minimum value, for the objective, in the range for the raw score
            // cmi.objectives.n.status (“passed”, “completed”, “failed”, “incomplete”, “browsed”, “not attempted”, RW) Indicates whether the learner has completed or satisfied the objective
            // cmi.student_data._children (mastery_score, max_time_allowed, time_limit_action, RO) Listing of supported data model elements
            // cmi.student_data.mastery_score (CMIDecimal, RO) Passing score required to master the SCO
            // cmi.student_data.max_time_allowed (CMITimespan, RO) Amount of accumulated time the learner is allowed to use a SCO
            // cmi.student_data.time_limit_action (exit,message,” “exit,no message”,” continue,message”, “continue, no message”, RO) Indicates what the SCO should do when max_time_allowed is exceeded
            // cmi.student_preference._children (audio,language,speed,text, RO) Listing of supported data model elements
            // cmi.student_preference.audio (CMISInteger, RW) Specifies an intended change in perceived audio level
            // cmi.student_preference.language (CMIString (SPM: 255), RW) The student’s preferred language for SCOs with multilingual capability
            // cmi.student_preference.speed (CMISInteger, RW) The learner’s preferred relative speed of content delivery
            // cmi.student_preference.text (CMISInteger, RW) Specifies whether captioning text corresponding to audio is displayed
            // cmi.interactions._children (id,objectives,time,type,correct_responses,weighting,student_response,result,latency, RO) Listing of supported data model elements
            // cmi.interactions._count (CMIInteger, RO) Current number of interactions being stored by the LMS
            // cmi.interactions.n.id (CMIIdentifier, WO) Unique label for the interaction
            // cmi.interactions.n.objectives._count (CMIInteger, RO) Current number of objectives (i.e., objective identifiers) being stored by the LMS for this interaction
            // cmi.interactions.n.objectives.n.id (CMIIdentifier, WO) Label for objectives associated with the interaction
            // cmi.interactions.n.time (CMITime, WO) Point in time at which the interaction was first made available to the student for student interaction and response
            // cmi.interactions.n.type (“true-false”, “choice”, “fill-in”, “matching”, “performance”, “sequencing”, “likert”, “numeric”, WO) Which type of interaction is recorded
            // cmi.interactions.n.correct_responses._count (CMIInteger, RO) Current number of correct responses being stored by the LMS for this interaction
            // cmi.interactions.n.correct_responses.n.pattern (format depends on interaction type, WO) One correct response pattern for the interaction
            // cmi.interactions.n.weighting (CMIDecimal, WO) Weight given to the interaction relative to other interactions
            // cmi.interactions.n.student_response (format depends on interaction type, WO) Data generated when a student responds to an interaction
            // cmi.interactions.n.result (“correct”, “wrong”, “unanticipated”, “neutral”, “x.x [CMIDecimal]”, WO) Judgment of the correctness of the learner response
            // cmi.interactions.n.latency (CMITimespan, WO) Time elapsed between the time the interaction was made available to the learner for response and the time of the first response
          }
          return localStorage.getItem(name);

        };

        // LMSSetValue( element : CMIElement, value : string) : string – Saves a value to the LMS.
        this.LMSSetValue = function (name, val) {
          window.localStorage.setItem(name, val);

          ajaxPPJ('GET', '/student/session_data')
          .done( function(retVal) {
            var retJson;
            if (retVal['data'] == null) {
              retJson = {'session_data':{}};
            } else {
              retJson = retVal['data'];
            }
            retJson['session_data'][name] = val;
            ajaxPPJ('POST', '/student/session_data', retJson)
            .done( function(session_data) {ppjConsoleLog('LMS Committed: ' + retJson); })
          })
          .fail( function(retVal) {ppjConsoleLog('LMS SetValue Error: ' + JSON.stringify(retVal)); });

          // todo: register completion with LMS
          if (name === 'cmi.core.lesson_status' && val === 'completed') {
            ppjConsoleLog('Send Completion to LMS');
          }

          // When lesson location changes then calculate percentage unless the course is completed
          // then ignore
          // todo: register with server
          if (name === 'cmi.core.lesson_location' && window.API.LMSGetValue('cmi.core.lesson_status') !== 'completed') {
            var completionStr = JSON.parse(window.API.LMSGetValue('cmi.suspend_data')).completion;
            var completionPct = calculatePercentage(completionStr);
            window.localStorage.setItem('ppj.completion_percent', completionPct);
            ppjConsoleLog('Completion: ' + completionPct);
          }

          return 'true';
        };

        // LMSCommit( “” ) : bool – Indicates to the LMS that all data should be persisted (not required).
        this.LMSCommit = function (p) {
          ppjConsoleLog('Scorm Commit Called');

          var qs = {
            ucat: ucat,
            data: {
              "cmi.suspend_data": JSON.parse(window.API.LMSGetValue('cmi.suspend_data')),
              "cmi.core_lesson_status": window.API.LMSGetValue('cmi.core.lesson_status'),
              "cmi.core_lesson_location": window.API.LMSGetValue('cmi.core.lesson_location'),
              "cmi.core_session_time": window.API.LMSGetValue('cmi.core.session_time'),
              "cmi.student_preference.language": window.API.LMSGetValue('cmi.student_preference.language'),
              "ppj.completion_percent": window.API.LMSGetValue('ppj.completion_percent')
            }
          }
          ppjConsoleLog(JSON.stringify(qs));

          ajaxPPJ('POST', '/student/session_data', qs)
          .done( function(retVal) {ppjConsoleLog('LMS Committed: ' + retVal); return 'true';})
          .fail( function(retVal) {ppjConsoleLog('LMS Commit Error: ' + JSON.stringify(retVal)); return 'false';});

        };
      }

      // //////QUERY STRING PARSER /////////
      function getQueryVariable (variable) {
        var query = window.location.search.substring(1);
        var vars = query.split('&');
        for (var i = 0; i < vars.length; i++) {
          var pair = vars[i].split('=');
          if (decodeURIComponent(pair[0]) == variable) {
            return decodeURIComponent(pair[1]);
          }
        }
        ppjConsoleLog('Query variable not found,'+ variable);
      }
      // ///////////////////////////////////

      function ppjConsoleLog (msg) {
      	if (debug_log) {
        	console.log(' *** PPJ *** ' + msg);
        }
      }

      // -- Calculate Percent using Adapt completion STRING
      function calculatePercentage (completionStr) {
        // -- Calculate Percent using component collection
        // cc.first().attributes._isComplete
        // var p = adp.components.filter(function(m) { return m.get('_isComplete') == true; } ).length / adp.components.length

        var roundedPct = 0;
        ppjConsoleLog('Completion calc for: ' + completionStr);

        if (completionStr !== undefined) {
          var counts = _.countBy(completionStr.split(''));
          var pct = counts[1] / (counts[0] + counts[1]);
          roundedPct = Math.round(pct * 100);
        }

        return roundedPct;
      }

      // var url = 'https://s3.amazonaws.com/getinclusive-assets/adapt/build/index_lms.html?ucat=aa887e951e0b869a96271763612640a9&org_course_id=392';
      // https://assets.getinclusive.com/adapt/build/index_lms.html?ucat=aa887e951e0b869a96271763612640a9&org_course_id=392#/

      console.log($.fn.jquery);

      ajaxPPJ('GET', '/student/resources')
      .done(function(retJson){
        console.log(">>>>>>Obtained Org Resources: " + Object.keys(retJson.result).length);
        console.log(retJson.result);
        // console.log("Adapt:" + Adapt.course._globals._learnerInfo.jfk);
        var g = Adapt.course.get('_globals');
        g.org_resources = retJson.result;
        ppjConsoleLog('Adapt:' + Adapt.course.get('_globals')._learnerInfo.xyz);
      });

      // Filename
      var url = window.location.pathname;
      var filename = url.substring(url.lastIndexOf('/')+1);
      ppjConsoleLog("Filename: " + filename);

      var orgResources = {
        'hr_contact': 'Mr. Jack Johnson <br/> 917-444-2121',
        'org_name': 'Acme Corporation.'
      };

      // Adapt.course._globals._learnerInfo.jfk = 'UPDATED';

    }

  ppj_start(Adapt);

  console.log('Plugin Starting');
  // $.getScript('https://s3.amazonaws.com/getinclusive-assets/adapt/ppjSCO.js', function(){
  //   ppj_start(Adapt);
  // });

  // Setup all Event handlers
  Adapt.on('adapt:initialize', function () {
    console.log('In Adapt Initialize');

    // Todo navigate to element using a.navigateToElement('.c-15')
    // https://github.com/adaptlearning/adapt_framework/wiki/Adapt-API#adaptnavigatetoelement
    Adapt.components.on('change:_isComplete', function(model) {
      console.log('This component just changed complete status', model.get('_id'));
    });

  });
});

// todo - close the module window if the launcher window is closed
// var courseWindow = window.open('index_lms.html', 'courseWin', options);
// $(window).on('beforeunload', function() {
//     if(courseWindow) {
//         courseWindow.close();
//     }
// });
