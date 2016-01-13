// In order to have a clean global namespace
// we wrap the whole library in a function
var GoogleAPIMailClient = window.GoogleAPIMailClient || (function() {

  var clientId, 
      apiKey,
      scopes = 'https://www.googleapis.com/auth/gmail.readonly',
      Messages = {};

  // getting url form values
  function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
      vars[key] = value;
    });
    return vars;
  }

  // Your Client ID can be retrieved from your project in the Google
  USER_QUERY = decodeURIComponent(getUrlVars()["q"]);
  USER_MAXRESULTS = getUrlVars()["maxResults"];

  // update interface
  if(USER_QUERY !== 'undefined'){
    document.getElementById('q').value = USER_QUERY;
  }
  if(USER_MAXRESULTS !== 'undefined'){
    document.getElementById('maxResults').value = USER_MAXRESULTS;
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
    gapi.client.load('gmail', 'v1', displayInbox);
  }

  function displayInbox() {
    var request = gapi.client.gmail.users.messages.list({
      userId: 'me',
      labelIds: 'INBOX',
      maxResults: (USER_MAXRESULTS) ? USER_MAXRESULTS: 1,
      'q': (USER_QUERY) ? USER_QUERY: ''
    });

    request.execute(function(response) {
      var promises = [];

      $.each(response.messages, function() {
        var messageRequest = gapi.client.gmail.users.messages.get({
          userId: 'me',
          id: this.id
        });

        // Since Google api is asyncronous, we need to wrap all server responses in a Promise.all()
        var promise = $.Deferred();
        promises.push(promise);

        messageRequest.execute(function(message) {
          // Save the message in a collection 
          Messages[message.id] = message;
          promise.resolve(message);
        });

      });

      $.when.all(promises).then(function(messages){ 

        // Sort messages by date in descending order
        messages.sort(function(a, b) {
          var d1 = new Date(getHeader(a.payload.headers, 'Date')).valueOf();
          var d2 = new Date(getHeader(b.payload.headers, 'Date')).valueOf();
          return d1 < d2 ? 1 : (d1 > d2 ? -1 : 0);
        });

        // Finally, process the messages
        messages.forEach(function(message){
          processMessage(message);
        })

      });

    });
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
    for(var x = 0; x < arr.length; x++)
    {
      if(typeof arr[x].parts === 'undefined')
      {
        if(arr[x].mimeType === 'text/html')
        {
          return arr[x].body.data;
        }
      }
      else
      {
        return getHTMLPart(arr[x].parts);
      }
    }
    return '';
  }

  // Initialize UI events
  function init() {

    $('#authorize-button').on('click', function(){
      handleAuthClick();
    });
    
    $('.table-inbox tbody').on('click', 'a.message-link', function(e) {
      var id, title, iframe, messageBody;

      id = $(this).attr('id').split('-')[2];
      
      title = getHeader(Messages[id].payload.headers, 'Subject');
      $('#myModalTitle').text(title);

      iframe = $('#message-iframe')[0].contentWindow.document;
      // The message body goes to the iframe's content
      messageBody = getBody(Messages[id].payload);
      $('body', iframe).html(messageBody);
      
      // Show the modal window
      $('#message-modal').modal('show');

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

/**
*
* The jQuery library does not feature a `when.all` function
* to handle an array of promises, so we put up a polyfill
*
*/
if (jQuery.when.all === undefined) {
    jQuery.when.all = function(deferreds) {
        var deferred = new jQuery.Deferred();
        
        $.when.apply(jQuery, deferreds).then(
            function() {
                deferred.resolve(Array.prototype.slice.call(arguments));
            },
            function() {
                deferred.fail(Array.prototype.slice.call(arguments));
            });

        return deferred;
    }
}
