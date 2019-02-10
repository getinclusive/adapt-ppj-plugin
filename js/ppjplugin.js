define([
  './timeme.js/timeme',
  'core/js/adapt'
], function (TimeMe, Adapt) {

  var PPJPlugin = (function(){

      // Read values from QS or LS
      var api_key =  getQueryVariable('api_key') || window.localStorage.getItem('ppj.api_key');
      var ucat = getQueryVariable('ucat') || window.localStorage.getItem('ppj.ucat'); // Read from QS, if not avail then from LocalStorage
      var debug_log = getQueryVariable('debug_log') || window.localStorage.getItem('ppj.debug_log');

      // LocalStorage Variables to ignore during LMSCommit call, also variables starting with ppj_
      var commit_ignore = [
                           'cmi.core.student_id',
                           'cmi.core.first_name',
                           'cmi.core.last_name',
                           'cmi.core.student_name',
                           ];
      var ignore_namespace = 'ppj.'; // any localstorage variable starting with this will be ignored

      ppjConsoleLog('ppjSCO js starting...');

      ppjConsoleLog('QS ucat: ' + ucat);
      ppjConsoleLog('QS debug: ' + debug_log);

      if (ucat === undefined || ucat == '') {
        alert('Please contact success@getinclusive.com [ERROR: ucat not available]');
      }
      else {
        // PPJ LMS Proxy
        ppjConsoleLog('ucat defined, instantiating PPJProxy');
        var ppjProxy = PPJScormProxy(ucat);

        // ppjProxy.preloadData();
        window.API = ppjProxy;

      }

      function idleCallback() {
        alert('Course Progress timer is resuming after being paused due to switching tabs / closing window or idle inactivity');
      }

      TimeMe.callWhenUserReturns(idleCallback, 1);

      function saveTime() {
        var storage = window.localStorage;

        var session_time_current = TimeMe.getTimeOnCurrentPageInSeconds();
        //var session_time_total = Number(storage.getItem('session_time_total') || 0.0) + session_time_current;

        // or TimeMe.getTimeOnAllPagesInSeconds();

        console.log(session_time_current);
        storage.setItem('session_time_current', session_time_current);
        //storage.setItem('session_time_total',  session_time_total);

      }

      // Save the value
      setInterval(function() {
          saveTime();
      }, 5 * 1000); // 60 * 1000 milsec

      //==========================================================================
      //==== AJAX Util function, always sends ucat
      //==========================================================================
      function ajaxPPJ(type, endpoint, payload){
        var ajax_url = 'https://api.getinclusive.com/prod' + endpoint;
        ppjConsoleLog('Ajax call: ' + type + ' ' + ajax_url);
        api_data = _.extend( {'ucat': ucat}, payload);

        return $.ajax({
          url: ajax_url,
          method: type,
          cache: false,
          //crossDomain: true,
          headers:{'x-api-key': api_key},
          data: api_data,
        })
        .done( function(ret) { ppjConsoleLog('Ajax call Done:' + ajax_url); })
        .fail( function(jqXHR, txtStatus) {
          console.log('Err:' + txtStatus);
        });
      }

      //==========================================================================
      //==== Post completion percent
      //==========================================================================
      function course_completion_percent_post (percent_completed) {
        ajaxPPJ('POST', '/student/course_percent_completed', {percent: percent_completed})
        .done( function(retVal) {ppjConsoleLog('Percent info sent: ' + JSON.stringify(retVal)); })
        .fail( function(retVal) {ppjConsoleLog('Percent post ERROR: ' + JSON.stringify(retVal)); });
        return true;
      }

      //==========================================================================
      //==== POST user_event
      //==========================================================================
      function user_event_post (user_event) {
        ajaxPPJ('POST', '/student/user_event', {user_event: user_event})
        .done( function(retVal) {ppjConsoleLog('User event posted sent: ' + JSON.stringify(retVal)); })
        .fail( function(retVal) {ppjConsoleLog('User event post ERROR: ' + JSON.stringify(retVal)); });
        return true;
      }

      //==========================================================================
      //==== log activity in localstorage, todo: add unique objects only
      //==========================================================================
      function log_activity (activityObject) {
        var logKey = 'activityLog';
        var existinglogObjects = JSON.parse(window.localStorage.getItem(logKey)) || [];


        activityObject.timestamp = js_yyyy_mm_dd_hh_mm_ss();
        existinglogObjects.push(activityObject);

        // if ( _.findWhere(existinglogObjects, activityObject) == null ) {
        // }

        setLocalStorage(logKey, JSON.stringify(existinglogObjects));

        return true;
      }

      // PPJ SCORM API PROXY //
      function PPJScormProxy (ucat) {
        // https://scorm.com/scorm-explained/technical-scorm/run-time/run-time-reference/

        ppjConsoleLog('=== PPJSCORMPROXY STARTING ===');

        // LMSInitialize( “” ) : bool – Begins a communication session with the LMS.
        this.LMSInitialize = function (p) {
          ppjConsoleLog ('LMSInitialize called');

          if (window.localStorage.getItem('ppj.lms_loaded') == 'true') {
            return 'true';
          } else {
            var preloaderURL = localStorage.getItem('ppj.reloadlocation');
            if (!preloaderURL)
              window.location.replace(preloaderURL);
            else
              return 'false';
          }
        };

        // LMSFinish( “” ) : bool – Ends a communication session with the LMS.
        this.LMSFinish = function (p) {
          ppjConsoleLog('LMSFinish called');
          //window.localStorage.setItem('ppj.lms_loaded', "false");
          if ( confirm('Your Session has ended, your progress has been saved.  Now returning you to the origin.') ) {
            window.location = window.localStorage.getItem('ppj.return_path_url');
          }
          return 'true';
          // todo: cmi.exit
          // What does cmi.exit do? It provides some context to the LMS regarding why
          // the course was closed. For instance, if the course was closed because it was
          // completed by the learner, the exit status should be set to "logout".
          // Likewise, if the course was closed before it was completed (and the learner
          // intends to resume where they left off), the exit status should be set to "suspend".
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

        // LMSGetValue( element : CMIElement ) : string – Returns value from LocalStorage
        // and refreshes the localStorage from the LMS.
        this.LMSGetValue = function (name) {
          return window.localStorage.getItem(name) || '';
        };

        // LMSSetValue( element : CMIElement, value : string) : string –
        // Saves a value to localStorage and if LMS Intiialized then also to LMS.
        this.LMSSetValue = function (name, val) {
          ppjConsoleLog('LMSSetValue for: ' + name + ' = [' + val + ']');

          // todo: register completion with LMS if we switched status from incomplete to complete
          if (name === 'cmi.core.lesson_status' &&
              this.LMSGetValue('cmi.core.lesson_status') != 'completed' &&
              val === 'completed')
          {
            ppjConsoleLog('Sending Completion to LMS: percent: 100% and user_event: course_end');
            course_completion_percent_post(100);
            user_event_post('course_end');
          }

          setLocalStorage(name, val);

          return 'true';
        };

        // SCO method to persist data
        this.LMSCommit = function (p) {
          if (window.localStorage.getItem('ppj.lms_loaded') == 'true') {
            var localStorageKeys = _.chain(window.localStorage)
                                    .keys()
                                    .filter(function(a){ return a.search(ignore_namespace); })
                                    .difference(commit_ignore)
                                    .value();

            ppjConsoleLog('Commiting values for LocalStorage Keys: ' + localStorageKeys);

            // if (PPJScormProxy.session_data_initialized) {
            ppjConsoleLog('Scorm Commit - local variables had been initialized');

            var session_data_obj = {};

            localStorageKeys.forEach(function(item, i){
              session_data_obj[item] = window.API.LMSGetValue(item);
            });

            var cmi_data = {
              'session_data': session_data_obj
            };

            ppjConsoleLog('Committing CMI Data: ' + JSON.stringify(cmi_data));

            ajaxPPJ('POST', '/student/session_data', {'data': cmi_data})
            .done( function(retVal) {ppjConsoleLog('LMS Committed: ' + JSON.stringify(retVal)); return 'true';})
            .fail( function(retVal) {ppjConsoleLog('LMS Commit Error: ' + JSON.stringify(retVal)); return 'false';});
            return 'true';

          } else {
            // Lost connection from the LMS
            ppjConsoleLog('ppj.lms_loaded is falsy, cannot commit');
            return 'false';

          }
        };

        this.LMSStore = function (p){
          ppjConsoleLog('LMSStore called');
        };

        this.LMSFetch = function (p){
          ppjConsoleLog('LMSFetch called');
        };

        this.LMSClear = function (p){
          ppjConsoleLog('LMSClear called');
        };

        return this;
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

      /////////////////////////////////////

      function ppjConsoleLog (msg) {
      	if (debug_log == 'true') {
        	console.log(' *** PPJ *** ' + js_yyyy_mm_dd_hh_mm_ss() + ': ' + msg);
        }
      }

      function setLocalStorage (key, val) {
        if ( val != undefined) {
          window.localStorage.setItem(key, val);
        } else {
          ppjConsoleLog('Skipping LocalStorage set to Undefined Value');
        }
      }

      function setLocalStorageIfBlank (k, default_val) {
        var lsval = window.localStorage.getItem(k);

        if ( lsval == null) {
          ppjConsoleLog('Setting blank value of LocalStorage: ' + k + ' - to: [' + default_val + ']');
          window.localStorage.setItem(k, default_val);
        } else {
          ppjConsoleLog('LocalStorage value non blank, leaving it alone: ' + k + ': [' + lsval + ']');
        }
        return true;
      }

      // -- Calculate Percent using Adapt completion STRING
      function calculatePercentage () {
        // -- Calculate Percent using component collection
        // cc.first().attributes._isComplete
        // var p = adp.components.filter(function(m) { return m.get('_isComplete') == true; } ).length / adp.components.length

        var completionStr = JSON.parse(window.localStorage.getItem('cmi.suspend_data')).completion;
        var roundedPct = 0;
        ppjConsoleLog('Completion calc for: ' + completionStr);

        if (completionStr !== undefined) {
          var counts = _.countBy(completionStr.split(''));
          var pct = counts[1] / (counts[0] + counts[1]);
          roundedPct = Math.round(pct * 100);
        }

        return roundedPct;
      }

      function js_yyyy_mm_dd_hh_mm_ss () {
        now = new Date();
        year = '' + now.getFullYear();
        month = '' + (now.getMonth() + 1); if (month.length == 1) { month = '0' + month; }
        day = '' + now.getDate(); if (day.length == 1) { day = '0' + day; }
        hour = '' + now.getHours(); if (hour.length == 1) { hour = '0' + hour; }
        minute = '' + now.getMinutes(); if (minute.length == 1) { minute = '0' + minute; }
        second = '' + now.getSeconds(); if (second.length == 1) { second = '0' + second; }
        return year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second;
      }

      console.log($.fn.jquery);

      return {
        ppjConsoleLog: ppjConsoleLog,
        calculatePercentage: calculatePercentage,
        course_completion_percent_post: course_completion_percent_post,
        log_activity: log_activity,
        ajaxPPJ: ajaxPPJ
      };
    })();

  console.log('PPJ Plugin Starting');

  window.PPJ = PPJPlugin;

  // $.getScript('https://s3.amazonaws.com/getinclusive-assets/adapt/ppjSCO.js', function(){
  //   ppj_start(Adapt);
  // });

  // Setup all Event handlers
  Adapt.on('adapt:initialize', function () {

    console.log('In Adapt Initialize');

    // We should already have org Resources, part of PPJ plugin intitialization
    // todo exception handle if we do not have it
    var g = Adapt.course.get('_globals');
    g.org_resources = window.localStorage.getItem('ppj.org_resources');

    console.log('Adapt _globals variable:' + JSON.stringify(g.org_resources));

    TimeMe.initialize({
      currentPageName: "my-home-page", // current page
      idleTimeoutInSeconds: 30 // seconds
    });

    // Todo navigate to element using a.navigateToElement('.c-15')
    // https://github.com/adaptlearning/adapt_framework/wiki/Adapt-API#adaptnavigatetoelement
    Adapt.components.on('change:_isComplete', function(model) {
      var component_id = model.get('_id');
      var course_percent_completed = PPJ.calculatePercentage();

      PPJ.ppjConsoleLog('This component just changed complete status: ' + component_id + ' competion %: ' + course_percent_completed);
      PPJ.course_completion_percent_post(course_percent_completed);
      PPJ.log_activity({'id': component_id});
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
// TODO Build steps:
//    grunt tracking-insert

//   // DATA MODEL //
//   // cmi.core._children (student_id, student_name, lesson_location, credit, lesson_status, entry, score, total_time, lesson_mode, exit, session_time, RO) Listing of supported data model elements
//   // cmi.core.student_id (CMIString (SPM: 255), RO) Identifies the student on behalf of whom the SCO was launched
//   // cmi.core.student_name (CMIString (SPM: 255), RO) Name provided for the student by the LMS
//   // cmi.core.lesson_location (CMIString (SPM: 255), RW) The learner’s current location in the SCO
//   // cmi.core.credit (“credit”, “no-credit”, RO) Indicates whether the learner will be credited for performance in the SCO
//   // cmi.core.lesson_status (“passed”, “completed”, “failed”, “incomplete”, “browsed”, “not attempted”, RW) Indicates whether the learner has completed and satisfied the requirements for the SCO
//   // cmi.core.entry (“ab-initio”, “resume”, “”, RO) Asserts whether the learner has previously accessed the SCO
//   // cmi.core.score_children (raw,min,max, RO) Listing of supported data model elements
//   // cmi.core.score.raw (CMIDecimal, RW) Number that reflects the performance of the learner relative to the range bounded by the values of min and max
//   // cmi.core.score.max (CMIDecimal, RW) Maximum value in the range for the raw score
//   // cmi.core.score.min (CMIDecimal, RW) Minimum value in the range for the raw score
//   // cmi.core.total_time (CMITimespan, RO) Sum of all of the learner’s session times accumulated in the current learner attempt
//   // cmi.core.lesson_mode (“browse”, “normal”, “review”, RO) Identifies one of three possible modes in which the SCO may be presented to the learner
//   // cmi.core.exit (“time-out”, “suspend”, “logout”, “”, WO) Indicates how or why the learner left the SCO
//   // cmi.core.session_time (CMITimespan, WO) Amount of time that the learner has spent in the current learner session for this SCO
//   // cmi.suspend_data (CMIString (SPM: 4096), RW) Provides space to store and retrieve data between learner sessions
//   // cmi.launch_data (CMIString (SPM: 4096), RO) Data provided to a SCO after launch, initialized from the dataFromLMS manifest element
//   // cmi.comments (CMIString (SPM: 4096), RW) Textual input from the learner about the SCO
//   // cmi.comments_from_lms (CMIString (SPM: 4096), RO) Comments or annotations associated with a SCO
//   // cmi.objectives._children (id,score,status, RO) Listing of supported data model elements
//   // cmi.objectives._count (non-negative integer, RO) Current number of objectives being stored by the LMS
//   // cmi.objectives.n.id (CMIIdentifier, RW) Unique label for the objective
//   // cmi.objectives.n.score._children (raw,min,max, RO) Listing of supported data model elements
//   // cmi.objectives.n.score.raw (CMIDecimal, RW) Number that reflects the performance of the learner, for the objective, relative to the range bounded by the values of min and max
//   // cmi.objectives.n.score.max (CMIDecimal, Rw) Maximum value, for the objective, in the range for the raw score
//   // cmi.objectives.n.score.min (CMIDecimal, RW) Minimum value, for the objective, in the range for the raw score
//   // cmi.objectives.n.status (“passed”, “completed”, “failed”, “incomplete”, “browsed”, “not attempted”, RW) Indicates whether the learner has completed or satisfied the objective
//   // cmi.student_data._children (mastery_score, max_time_allowed, time_limit_action, RO) Listing of supported data model elements
//   // cmi.student_data.mastery_score (CMIDecimal, RO) Passing score required to master the SCO
//   // cmi.student_data.max_time_allowed (CMITimespan, RO) Amount of accumulated time the learner is allowed to use a SCO
//   // cmi.student_data.time_limit_action (exit,message,” “exit,no message”,” continue,message”, “continue, no message”, RO) Indicates what the SCO should do when max_time_allowed is exceeded
//   // cmi.student_preference._children (audio,language,speed,text, RO) Listing of supported data model elements
//   // cmi.student_preference.audio (CMISInteger, RW) Specifies an intended change in perceived audio level
//   // cmi.student_preference.language (CMIString (SPM: 255), RW) The student’s preferred language for SCOs with multilingual capability
//   // cmi.student_preference.speed (CMISInteger, RW) The learner’s preferred relative speed of content delivery
//   // cmi.student_preference.text (CMISInteger, RW) Specifies whether captioning text corresponding to audio is displayed
//   // cmi.interactions._children (id,objectives,time,type,correct_responses,weighting,student_response,result,latency, RO) Listing of supported data model elements
//   // cmi.interactions._count (CMIInteger, RO) Current number of interactions being stored by the LMS
//   // cmi.interactions.n.id (CMIIdentifier, WO) Unique label for the interaction
//   // cmi.interactions.n.objectives._count (CMIInteger, RO) Current number of objectives (i.e., objective identifiers) being stored by the LMS for this interaction
//   // cmi.interactions.n.objectives.n.id (CMIIdentifier, WO) Label for objectives associated with the interaction
//   // cmi.interactions.n.time (CMITime, WO) Point in time at which the interaction was first made available to the student for student interaction and response
//   // cmi.interactions.n.type (“true-false”, “choice”, “fill-in”, “matching”, “performance”, “sequencing”, “likert”, “numeric”, WO) Which type of interaction is recorded
//   // cmi.interactions.n.correct_responses._count (CMIInteger, RO) Current number of correct responses being stored by the LMS for this interaction
//   // cmi.interactions.n.correct_responses.n.pattern (format depends on interaction type, WO) One correct response pattern for the interaction
//   // cmi.interactions.n.weighting (CMIDecimal, WO) Weight given to the interaction relative to other interactions
//   // cmi.interactions.n.student_response (format depends on interaction type, WO) Data generated when a student responds to an interaction
//   // cmi.interactions.n.result (“correct”, “wrong”, “unanticipated”, “neutral”, “x.x [CMIDecimal]”, WO) Judgment of the correctness of the learner response
//   // cmi.interactions.n.latency (CMITimespan, WO) Time elapsed between the time the interaction was made available to the learner for response and the time of the first response
