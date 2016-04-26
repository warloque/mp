// In order to have a clean global namespace
// we wrap the whole library in a function
var GoogleAPIMailClient = window.GoogleAPIMailClient || (function() {

  var clientId, 
      apiKey,
      scopes = 'https://www.googleapis.com/auth/gmail.readonly',
      Messages = {};

  // Your Client ID can be retrieved from your project in the Google
  sUSER_QUERY = getUrlVars()["q"];
  aUSER_QUERY = (sUSER_QUERY) ? decodeURIComponent(sUSER_QUERY).split(',') : ''; //2do: allow sending alphanumeric and commas only
  sUSER_MAXRESULTS = getUrlVars()["maxResults"];
  sUSER_LABEL = decodeURIComponent(getUrlVars()["label"]);

  // update interface
  if(aUSER_QUERY !== 'undefined'){
    document.getElementById('q').value = aUSER_QUERY;
  }
  if(sUSER_MAXRESULTS !== 'undefined'){
    document.getElementById('maxResults').value = sUSER_MAXRESULTS;
  }
  if(sUSER_LABEL !== 'undefined'){
    document.getElementById('label').value = sUSER_LABEL;
  }

  function config(config) {
    clientId = config.clientId;
    apiKey = config.apiKey;
  }

  function clientLoad() {
    gapi.client.setApiKey(apiKey);
    window.setTimeout(checkAuth, 1);
  }

  function checkAuth() {
    gapi.auth.authorize({
      client_id: clientId,
      scope: scopes,
      immediate: true
    }, handleAuthResult);
  }

  function handleAuthClick() {
    gapi.auth.authorize({
      client_id: clientId,
      scope: scopes,
      immediate: false
    }, handleAuthResult);
    return false;
  }

  function handleAuthResult(authResult) {
    var $authorizeBtn = $('#authorize-button');

    if(authResult && !authResult.error) {
      loadGmailApi();
      $authorizeBtn.off();
      $authorizeBtn.remove();
      $('.table-inbox, #filters').removeClass("hidden");
    } else {
      $authorizeBtn.removeClass("hidden");
    }
  }


  function loadGmailApi() {

    var url = window.location.toString();
    var page = (url.indexOf('page') > -1) ? /page=([^&]+)?/.exec(url)[1] : 'inbox'; // find 'page' param, otherwise show 'inbox' page

    switch (page) {

      case ('inbox'):
        console.log(' >>> displaying inbox');

        // display inbox
        gapi.client.load('gmail', 'v1', function(){ displayInbox(); listLabels(); });

        break;

      case ('parsed'):
        console.log(' >>> displaying parsed');
        gapi.client.load('gmail', 'v1', function(){

          // visualised objects array
          aV = [];
          // parsed messages array
          aParsed = [];
          // flagged-as-matched messages array
          aFlagged = []
          // regex collection


          // parse messages for every item in search query
          var aPromises = [];

          for (var iDP = 0, lenDP = (aUSER_QUERY.length - 1); iDP <= lenDP; ++iDP) {
            the_promise = $.Deferred();
            aPromises.push(the_promise);
            displayParsed(iDP,the_promise);
          }

          $.when.all(aPromises).then(function () {
            // load visualization if any parsed data available
            if(!isEmpty(aPromises[1])) {
              visualize('visualization', aV);
            } else {
              $('#alert')
                .removeClass('hidden').addClass('alert alert-warning')
                .html('nothing parsed');
              $('.table-inbox').addClass('hidden');
            }
          });

          // ui labels
          listLabels();

        });
        break;

      default:
        gapi.client.load('gmail', 'v1', displayInbox);

    }

  }


  function listLabels(callback) {
    var request = gapi.client.gmail.users.labels.list({
      'userId': 'me'
    });
    request.execute(function(resp) {
      var labels = resp.labels;

      //callback(labels);
      //console.log(labels);

      for (var key_super in labels) {
        var row = $('#option-template').html();
        var renderedRow = Mustache.render(row, {
          messageLabelId : labels[key_super]['id'],
          messageLabelType : labels[key_super]['type'],
          messageLabelName : labels[key_super]['name'],
          messageLabelSelected : (sUSER_LABEL === labels[key_super]['id']) ? 'selected' : ''
        });
        $('#label').append(renderedRow);
      }

    });
  }



  function displayInbox() {

    for (var i = 0, len = (aUSER_QUERY.length - 1); i <= len; i++) {

      var request = gapi.client.gmail.users.messages.list({
        userId: 'me',
        labelIds: (sUSER_LABEL) ? sUSER_LABEL : 'INBOX',
        maxResults: (sUSER_MAXRESULTS) ? sUSER_MAXRESULTS : 1,
        'q': (aUSER_QUERY) ? aUSER_QUERY[i] : ''
      });

      request.execute(function (response) {

        var promises = [];

        $.each(response.messages, function () {
          var messageRequest = gapi.client.gmail.users.messages.get({
            userId: 'me',
            id: this.id
          });
          // Since Google api is asyncronous, we need to wrap all server responses in a Promise.all()
          var promise = $.Deferred();
          promises.push(promise);
          messageRequest.execute(function (message) {
            // Save the message in a collection
            Messages[message.id] = message;
            promise.resolve(message);
          });

        });

        $.when.all(promises)
          .then(function (messages) {
            // Sort messages by date in descending order
            messages.sort(function (a, b) {
              var d1 = new Date(getHeader(a.payload.headers, 'Date')).valueOf();
              var d2 = new Date(getHeader(b.payload.headers, 'Date')).valueOf();
              return d1 < d2 ? 1 : (d1 > d2 ? -1 : 0);
            });
            // Finally, process the messages
            messages.forEach(function (message) {
              processMessage(message);
            });
          })

      });

    }
    
  }



  function displayParsed(iii,the_promise) {

    var request = gapi.client.gmail.users.messages.list({
      userId: 'me',
      labelIds: (sUSER_LABEL) ? sUSER_LABEL : 'INBOX',
      // disabling with maxResults for parsing messages (2do: remove it or redesign limit parameter)
      //maxResults: (sUSER_MAXRESULTS) ? sUSER_MAXRESULTS : 1,
      'q': (aUSER_QUERY) ? aUSER_QUERY[iii] : ''
    });

    request.execute(function (response) {

      var promises = [];

      $.each(response.messages, function () {

        var messageRequest = gapi.client.gmail.users.messages.get({
          userId: 'me',
          id: this.id
        });

        // Since Google api is asyncronous, we need to wrap all server responses in a Promise.all()
        var promise = $.Deferred();
        promises.push(promise);
        messageRequest.execute(function (message) {
          // Save the message in a collection
          Messages[message.id] = message;
          promise.resolve(message);
        });

      });

      $.when.all(promises)
        .then(function (messages) {
          // Sort messages by date in descending order
          messages.sort(function (a, b) {
            var d1 = new Date(getHeader(a.payload.headers, 'Date')).valueOf();
            var d2 = new Date(getHeader(b.payload.headers, 'Date')).valueOf();
            return d1 < d2 ? 1 : (d1 > d2 ? -1 : 0);
          });
          // Finally, process the messages
          messages.forEach(function (message, iDP) {
            var pm = parseMessage(message,iii);
          });
        })
        .then(function(){
          the_promise.resolve();
        });

    });

  }



  function visualize(jContainer,aMessages) {

    // visualisation dom
    var container = document.getElementById(jContainer);

    // set items for visualisation
    var items = new vis.DataSet(aMessages);

    // Configuration for the Timeline
    var options = {};

    // Create a Timeline
    var timeline = new vis.Timeline(container, items, options);

    // timeline events
    timeline.on('select', function (properties) {
      var items = properties['items'];
      var $the_target = $('.table-inbox');
      var $the_rows = $('tr', $the_target);
      $the_rows.removeClass('ui-highlighted');
      if (items.length > 0) {
        var $el = $the_target.find("[data-orderid='" + items[0] + "']").eq(0);
        $el.parents('tr').eq(0).addClass('ui-highlighted');
        $('html, body').animate({scrollTop: $el.offset().top}, 500);
      }
    });

  }



  function parseMessage(message,i) {

    var row = $('#row-parsed-template').html();
    var messageBody = getBody(message.payload).toString();
    var oMessage = {};
    var regexes = [];
    var structure = [];

    if (aFlagged.indexOf(message.id) > -1) {
      console.log(' __added to aFlagged ___ ' + message.id);
      return;
    }

    aFlagged.push(message.id);

    //console.log('     ');
    //console.log('i = ' + i);
    //console.log('MESSAGE ID = ' + message['id']);
    //console.log('search string = ' + aUSER_QUERY[i]);

    // looking for index letter match
    for (var k in GoogleAPIMailClient.oRegexes) {
      // if first letter matches index
      if (k === aUSER_QUERY[i].charAt(0)) {
        // look for full match
        for (var key in GoogleAPIMailClient.oRegexes[k]) {
          // get exact pattern
          if (key.indexOf(aUSER_QUERY[i]) != 0) {
            var set = GoogleAPIMailClient.oRegexes[k];
            var result = set.filter(function (entry) {
              // match pattern names against search query
              if (entry.name.indexOf(aUSER_QUERY[i]) > -1) {
                return entry.name;
              }
            });
            regexes = result[0]['pattern'];
            structure = result[0]['structure'];
          }
        }
      }
    }

    // preprocess message body (remove line feed/carriage return) to nicely play with js regex
    var str = messageBody.replace(new RegExp( "\\r|\\n", "g" ), "   ");

    for(var ii = 0; ii < regexes.length; ii++) {

      var this_pattern = regexes[ii];
      var this_regexp = new RegExp(this_pattern);
      var this_result = (str.match(this_regexp)) ? str.match(this_regexp) : [];

      if(this_result.length > 0 ) {

        // save matched pattern parts from message body into oMessage fields
        for (var iRes = 1; iRes<this_result.length; ++iRes) {

          //console.log(' | ' + iRes + ' ' + structure[(iRes-1)]);

          if(structure[(iRes-1)] == 'date'){

            // 2do: auto detect locale of a date string/body string of the message being parsed
            console.log('дата исходная: ' + this_result[iRes]);
            moment.locale('ru');
            console.log('moment локаль: ' + moment.locale());
            //var locale = window.navigator.userLanguage || window.navigator.language;
            //console.log('locale = ' + locale);

            var this_date_str = this_result[iRes].replace('г.','года');
            //console.log( this_date_str );
            var this_date = Date.create(this_date_str, 'ru').format('{yyyy}-{MM}-{dd}');
            //console.log( this_date );
            var oDate = new Date(this_date);
            //console.log( 'oDate = ' + oDate );

            oMessage['date'] = oDate;
            //oMessage['order_date'] = moment(oDate).format('DD MMM, YYYY');
            oMessage['order_date'] = moment(oDate).format('LL');

            //console.log(oDate);
            //console.log(oMessage['order_date']);

          } else {

            oMessage[structure[(iRes-1)]] = this_result[iRes].trim();

          }

          // 2do: add time to Date object oMessage['order_date']
          /*if(structure[(iRes-1)] == 'time'){

            var out_time = ((this_result[iRes])) ? this_result[iRes] : '00:00';

            //var timeFields   = out_time.split( ':' );
            //myDateObj.setHours( parseInt( timeFields[ 0 ], 10 ) );
            //myDateObj.setMinutes( parseInt( timeFields[ 1 ], 10 ) );

            //oMessage['order_date'] = moment(new Date(out_date+' '+out_time)).format('DD MMM, YYYY HH:mm');
            oMessage['order_date'] = moment(myDateObj).format('DD MMM, YYYY HH:mm');

            console.log(' oMessage['order_date'] = ' + oMessage['order_date']);
          }*/

        }

      }

    }


    if (!$.isEmptyObject(oMessage)) {

      // append object to array for visualization part
      var oV = {
        id: oMessage['id'],
        content: '<img src="http://www.google.com/s2/favicons?domain=' + oMessage['url'] + '" /><span class="ui__vis-group__item-toggle">' + oMessage["id"] + '</span>',
        //start: oMessage['date'] // date object
        start: this_date // yyyy-mm-dd date string for vis plugin
      };
      aV.push(oV);

      // render table item
      var renderedRow = Mustache.render(row, {
        messageId : message.id,
        shop_logo : oMessage.url,
        shop_name : oMessage.name,
        order_id : oMessage.id,
        order_date : oMessage.order_date,
        order_title : oMessage.title
      });
      $('.table-inbox tbody').append(renderedRow);

    }

  }


  function processMessage(message) {

    var row = $('#row-template').html();
    var sender = getHeader(message.payload.headers, 'From');
    var subject = getHeader(message.payload.headers, 'Subject');
    var date = moment(new Date(getHeader(message.payload.headers, 'Date'))).format('DD MMM, YY HH:mm');
    // Remove the email address, leave only sender's name
    var from = sender.replace(/<\S+@\S+\.\S{2,8}>/g, '').replace(/"+/g, '');
    from = from.trim() || sender;

    var renderedRow = Mustache.render(row, {
      from : from,
      subject : subject,
      messageId : message.id,
      date : date
    });
    
    $('.table-inbox tbody').append(renderedRow);
  }

  function getHeader(headers, index) {
    var header = '';
    $.each(headers, function(){
      if(this.name === index)
      {
        header = this.value;
      }
    });
    return header;
  }

  function getBody(message) {
    var encodedBody = '';
    encodedBody = message.parts ? getHTMLPart(message.parts) : message.body.data;
    encodedBody = encodedBody.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
    return decodeURIComponent(escape(window.atob(encodedBody)));
  }

  function getHTMLPart(arr) {
    for(var x = 0; x < arr.length; x++) {
      if(typeof arr[x].parts === 'undefined') {
        if(arr[x].mimeType === 'text/html') {
          return arr[x].body.data;
        }
      } else {
        return getHTMLPart(arr[x].parts);
      }
    }
    return '';
  }


  // Initialize UI events
  function init() {


    // log into gmail
    $('#authorize-button').on('click', function(){
      handleAuthClick();
    });


    // show message in modal
    $('.table-inbox tbody').on('click', 'a.message-link', function(e) {
      var id, title, iframe, messageBody;
      id = $(this).attr('id').split('-')[2];
      title = getHeader(Messages[id].payload.headers, 'Subject');
      // Set modal title
      $('#myModalTitle').text(title);
      iframe = $('#message-iframe')[0].contentWindow.document;
      // The message body goes to the iframe's content
      messageBody = getBody(Messages[id].payload);
      $('body', iframe).html(messageBody);
      // Show the modal window
      $('#message-modal').modal('show');
    });


    // parse bulk
    $('#js_ui-parse').on('click', function(e) {
      $('#filters')
        .append('<input type="hidden" name="page" value="parsed" />')
        .submit();
    });

  }

  init();

  return {
    config : config,
    clientLoad : clientLoad
  };

})();

function handleClientLoad() {
  // The configuration - ClientId & APIKey - is loaded from config.js,
  // which allows to prevent from uploading the secrets to the github repo
  // Note: `config.js` is part of `.gitignore`
  GoogleAPIMailClient.config(config);
  GoogleAPIMailClient.clientLoad();
}
