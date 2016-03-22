/**
 *
 * getting url form values
 *
 */
function getUrlVars() {
  var vars = {};
  var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
    vars[key] = value;
  });
  return vars;
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


/**
 *
 * func to filter 'obj' keys by arg 'func'
 *
 */
Object.filter = function(obj, func) {
  var res = {};

  for(var key in obj) {
    // filter out own properties (not length) that pass the filter function
    if(obj.hasOwnProperty(key) && key !== "length" && func(key, obj[key])) {
      res[key] = obj[key];
    }
  }

  return res;
};


/**
 *
 * func to check if 'obj' key contains string from arg 'contains'
 *
 */
Object.keyContains = function(obj, contains) {
  return Object.filter(obj, function(i, v) {
    return ~i.indexOf(contains);
  });
};



/**
 *
 * func to word-by-word replace
 *
 */

function wordAccuracy(str1, str2) {

  var len = str1.length,
    words1 = str1.split(' '),
    words2 = str2.split(' ');

  return {

    fail: words1.filter(function(word, idx){
      var the_match = word.match(/{{.+}}/gi);
      if(the_match){
        console.log('variable' + word + ' replaced by: ' + words2[idx]);
      }
      return word != words2[idx];
    }).length
  }
}
