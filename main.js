// In order to have a clean global namespace
// we wrap the whole library in a function
var GoogleAPIMailClient = window.GoogleAPIMailClient || (function() {

  var clientId, 
      apiKey,
      scopes = 'https://www.googleapis.com/auth/gmail.readonly',
      Messages = {};

  // Your Client ID can be retrieved from your project in the Google
  USER_QUERY = decodeURIComponent(getUrlVars()["q"]);
  USER_MAXRESULTS = getUrlVars()["maxResults"];
  USER_LABEL = decodeURIComponent(getUrlVars()["label"]);

  // update interface
  if(USER_QUERY !== 'undefined'){
    document.getElementById('q').value = USER_QUERY;
  }
  if(USER_MAXRESULTS !== 'undefined'){
    document.getElementById('maxResults').value = USER_MAXRESULTS;
  }
  if(USER_LABEL !== 'undefined'){
    document.getElementById('label').value = USER_LABEL;
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
        gapi.client.load('gmail', 'v1', displayInbox);
        break;
      case ('parsed'):
        gapi.client.load('gmail', 'v1', displayParsed);
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
        var row = $('#option-template').html()
        var renderedRow = Mustache.render(row, {
          messageLabelId : labels[key_super]['id'],
          messageLabelType : labels[key_super]['type'],
          messageLabelName : labels[key_super]['name'],
          messageLabelSelected : (USER_LABEL === labels[key_super]['id']) ? 'selected' : ''
        });
        $('#label').append(renderedRow);
      }

    });
  }

  function displayInbox() {
    var request = gapi.client.gmail.users.messages.list({
      userId: 'me',
      labelIds: (USER_LABEL) ? USER_LABEL: 'INBOX',
      maxResults: (USER_MAXRESULTS) ? USER_MAXRESULTS: 1,
      'q': (USER_QUERY) ? USER_QUERY: ''
    });

    listLabels();

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


  function displayParsed() {

    console.log('displaying parsed');
    var aParsed = [];

    var request = gapi.client.gmail.users.messages.list({
      userId: 'me',
      labelIds: (USER_LABEL) ? USER_LABEL: 'INBOX',
      maxResults: (USER_MAXRESULTS) ? USER_MAXRESULTS: 1,
      'q': (USER_QUERY) ? USER_QUERY: ''
    });

    listLabels();

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

        var aParsed = [];

        // Finally, process the messages
        messages.forEach(function(message){

          var pm = parseMessage(message);

          if (!$.isEmptyObject(pm)) {
            aParsed.push(pm);
          }

        })

        console.log(aParsed);

        // Visualise parsed data

        // DOM element where the Timeline will be attached
        var container = document.getElementById('visualization');

        // Create a DataSet (allows two way data-binding)
        /*var items = new vis.DataSet([
          {id: 1, content: 'item 1', start: '2013-04-20'},
          {id: 2, content: 'item 4', start: '2013-04-16', end: '2013-04-19'},
          {id: 3, content: 'item 6', start: '2013-04-27'}
        ]);*/

        var aV = [];
        for(var i= 0, len=(aParsed.length-1); i<len; i++){
          var oV = {id: aParsed[i]['order_id'], content: '<img src="http://www.google.com/s2/favicons?domain='+aParsed[i]['shop_url']+'" /><span class="ui__vis-group__item-toggle">'+aParsed[i]["order_id"]+'</span>', start: aParsed[i]['order_date']};
          aV.push(oV);
        }


        // set items for visualisation
        var items = new vis.DataSet(aV);

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
          if(items.length > 0) {
            var $el = $the_target.find("[data-orderid='" + items[0] + "']").eq(0);
            $el.parents('tr').eq(0).addClass('ui-highlighted');
            $('html, body').animate({scrollTop: $el.offset().top}, 500);
          }

        });

      });

    });
  }



  function parseMessage(message) {

    var row = $('#row-parsed-template').html();
    var messageBody = getBody(message.payload).toString();
    var oMessage = {};

    // regex collection
    // aliexpress regex:
    // $1 - order id,
    // $2 - order title,
    // $3 - shop url,
    // $4 - shop name,
    // $5 - order date,
    // $6 - order time
    var regexes = [];
    var regex1 = 'order_id=(\\d+).*?<strong>(.*)<\/strong><\/a>.*?<a.*?href="(.*?)">(.*)<\/a>.*?([0-9]+.[0-9]+.[0-9]+)\\s([0-9]+:[0-9]+)';
    regexes.push(regex1);
    var regex2 = 'order_id=(\\d+).*?<\/a><span.*?><strong>(.*?)<\/strong>.*?<a.*?href="(.*?)">(.*)<\/a>.*?([0-9]+.[0-9]+.[0-9]+)\\s([0-9]+:[0-9]+)';
    regexes.push(regex2);

    // preprocess message body (remove line feed/carriage return) to nicely play with js regex
    var str = messageBody.replace(new RegExp( "\\r|\\n", "g" ), "   ");

    for(var i = 0; i < regexes.length; i++) {
      var this_pattern = regexes[i];
      var this_regexp = new RegExp(this_pattern);

      var this_result = (str.match(this_regexp)) ? str.match(this_regexp) : [];

      if(this_result.length > 0 ) {

        if(this_result[1]){
          //console.log(' MATCH 1: > ' + this_result[1]);
          oMessage['order_id'] = this_result[1];
        }
        if(this_result[2]) {
          //console.log(' MATCH 2: > ' + this_result[2].trim());
          oMessage['order_title'] = this_result[2].trim();
        }
        if(this_result[3]) {
          //console.log(' MATCH 3: > ' + this_result[3]);
          oMessage['shop_url'] = this_result[3];
        }
        if(this_result[4]) {
          //console.log(' MATCH 4: > ' + this_result[4]);
          oMessage['shop_name'] = this_result[4];
        }
        if(this_result[5]) {
          //console.log(' MATCH 5: > ' + this_result[5]);
          oMessage['order_date'] = this_result[5];
        }
        if(this_result[6]) {
          //console.log(' MATCH 6: > ' + this_result[6]);
          oMessage['order_time'] = this_result[6];
        }

      }

    }

    if (!$.isEmptyObject(oMessage)) {

      var renderedRow = Mustache.render(row, {
        messageId : message.id,
        shop_logo : oMessage.shop_url,
        shop_name : oMessage.shop_name,
        order_id : oMessage.order_id,
        order_date : oMessage.order_date,
        order_time : oMessage.order_time,
        order_title : oMessage.order_title,
      });
      $('.table-inbox tbody').append(renderedRow);

    }

    return oMessage;

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
      $('#myModalTitle').text(title);

      iframe = $('#message-iframe')[0].contentWindow.document;
      // The message body goes to the iframe's content
      messageBody = getBody(Messages[id].payload);
      $('body', iframe).html(messageBody);
      
      // Show the modal window
      $('#message-modal').modal('show');

    });


    // parse message in modal
    /*$('.table-inbox tbody').on('click', 'a.parse-link', function(e) {

      var id, title, messageBody, messageBodyRaw;
      id = $(this).data('id').split('-')[2];
      title = getHeader(Messages[id].payload.headers, 'Subject');
      messageBody = getBody(Messages[id].payload);
      messageBodyRaw = Messages[id].payload;
      //console.log(messageBody);

      title = getHeader(Messages[id].payload.headers, 'Subject');
      $('#myModalTitle').text(title);

      if(!localStorage.getItem('msg')){
        localStorage.setItem('msg', messageBody);
        console.log('msg set');
      }

      the_msg = (localStorage.getItem('msg')) ? localStorage.getItem('msg') : messageBody;
      iframe = $('#message-iframe')[0].contentWindow.document;
      iframeBody = $('body', iframe);
      iframeBody.html('<section contenteditable="true" id="editable">'+the_msg+'</section><div class="row"><input type="button" id="clear" value="Clear editor" class="btn btn-default" /><input type="button" id="save-template" value="Save template" class="btn btn-default" /></div>');

      initEditable(iframeBody.find('#editable'), iframeBody.find('#clear'), iframeBody.find('#save-template'));

      //console.log('inited editable');

      // Show the modal window
      $('#message-modal').modal('show');

      /!*$('#message-modal').on('hidden.bs.modal', function (e) {
        localStorage.clear();
        console.clear();
        console.log('editable clear');
      });*!/

    });*/



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



















/*function initEditable(el,el_clear,el_save) {

  // define editable
  var editable = (el !== 'undefined') ? el : document.getElementById('editable');
  var clear_btn = (el_clear !== 'undefined') ? el_clear : document.getElementById('clear');
  var save_btn = (el_save !== 'undefined') ? el_save : document.getElementById('save-template');

  a_msg = localStorage.getItem('msg');

  // change blur to something in prod
  addEvent(editable, 'blur', function () {
    localStorage.setItem('msg', this.innerHTML);
    document.designMode = 'off';
    console.log('editable blur');
  });

  addEvent(editable, 'focus', function () {
    document.designMode = 'on';
    console.log('editable focus');
  });

  addEvent(clear_btn, 'click', function () {
    localStorage.clear();
    //window.location = window.location;
    console.log('editable clear');
  });

  addEvent(save_btn, 'click', function () {
    //localStorage.clear();
    //window.location = window.location;
    console.log('editable template saved');
  });


  /!*if (localStorage.getItem('msg')) {
    editable.innerHTML = a_msg;
    console.log('editable innerHTML set to a_msg: ' + a_msg);
  }*!/


  // editable select event
  editable.on('selectstart', function (e) {

    console.clear();
    console.log('editable selectstart');

    //$(document).on('mouseup', function(ee) {
    $(iframe).on('mouseup', function(ee) {
      //console.clear();
      console.log('document mouse up');

      //getselection();
      getIframeSelection('message-iframe');
      //replaceSelectedText('zzzz');
    });

  });


  // editable selection function
  function getselection(){
    var selectedtext;
    if(window.getSelection){
      selectedtext=window.getSelection().toString();
    }else if(document.selection.createRange){
      selectedtext=document.selection.createRange().text;
    }

    console.log('selectedtext: ' + selectedtext);

    var sel = window.getSelection();
    if (sel.rangeCount > 0) {
      var range = sel.getRangeAt(0);
      var parentElement = range.commonAncestorContainer;
      if (parentElement.nodeType == 3) {
        parentElement = parentElement.parentNode;
      }
    }

    console.log('parent: ' + parentElement);

  }



  // editable selection function (for iframe only)
  function getIframeSelection(iframe) {

    var sel = document.getElementById(iframe).contentDocument.getSelection();
    var selectedtext = sel.toString();
    if (sel.rangeCount > 0) {
      var range = sel.getRangeAt(0);
      var parentElement = range.commonAncestorContainer;
      if (parentElement.nodeType == 3) {
        parentElement = parentElement.parentNode;
      }
    }

    console.log('selectedtext: ' + selectedtext);
    console.log('parent: ' + parentElement);
    console.log(parentElement);

  }

}*/




// some diff tests
/*
var dmp = new diff_match_patch();

var difftest1 = "_TREBULATE_ string to everything here boat _Smooth_ beat and every cat knows his _surname_";
var difftest2 = "_BAD_ array for nothing special text boat _Nice_ drum or none dog follows her _name_";
var difftest3 = "_MAD_ object enter there _Tough_ goat and every horse sees mine _sniff_";
var difftest4 = "flowersome risky man doing art. footer";

console.log('string1: ' + difftest1);
console.log('string2: ' + difftest2);
console.log('string3: ' + difftest3);
console.log('string4: ' + difftest4);
console.log('     ');


//var differences = dmp.diff_main(difftest1, difftest2);
//var ds = dmp.diff_prettyHtml(differences);
//$('#test').html(ds);
//console.log('     ');


var diffs = dmp.diff_main(difftest1, difftest2);
console.log('diffs > ');
//console.log(dmp.diff_levenshtein(diffs));
//console.log('     ');
//console.log(diffs);


//var patches = dmp.patch_make(diffs);
//var patches = dmp.patch_make(difftest1, diffs);
var patches = dmp.patch_make(difftest1, difftest2);
//console.log('patch > ');
//console.log(patches);
//console.log('     ');


//var dmp_cleaned = dmp.diff_cleanupEfficiency(diffs);
//console.log('dmp_cleaned > ' + dmp_cleaned);
//console.log('     ');

//var dmp_cleaned = dmp.diff_cleanupEfficiency(diffs);
//console.log('dmp_cleaned > ' + dmp_cleaned);
//console.log('     ');


//console.log('patch to Text');
//console.log(dmp.patch_toText(patches));
//console.log('#############################################');


var patched = dmp.patch_apply(patches, difftest4);
console.log('patch apply >');
console.log(patched);
console.log('     ');


//console.log('match_main');
//var the_text = '';
//var the_pattern = '{{everything}}';
//var the_loc = '1';
//console.log(dmp.match_main(difftest1, the_pattern, the_loc));

*/









/* word replace tests */
/*var str1 = 'Lorem {{VAR1}} dolor sit amet consectetur {{VAR2}} elit';
var str2 = 'Lorme ipsum dolor sit maet cnsectetur adipiscing elot';
var str3 = 'Super otherside text coming to another bulletin adopting bucks';

console.log(str1);
console.log(str2);
console.log(str3);
console.log('########################################');
console.log(wordAccuracy(str1, str2));
console.log(wordAccuracy(str1, str3));*/
