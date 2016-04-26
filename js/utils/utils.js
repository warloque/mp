// utils.js

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



function isEmpty(obj) {
  if(isSet(obj)) {
    if (obj.length && obj.length > 0) {
      return false;
    }
    for (var key in obj) {
      if (hasOwnProperty.call(obj, key)) {
        return false;
      }
    }
  }
  return true;
}

function isSet(val) {
  return ((val != undefined) && (val != null));
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
/*Object.keyContains = function(obj, contains) {
  return Object.filter(obj, function(i, v) {
    return ~i.indexOf(contains);
  });
};*/
