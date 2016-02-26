function parseMimeFragment(fragmentStr){
  var result = new Object();
  // each fragment has a content type and encoding
  result["contentType"] = (/^Content-Type: (.+)$/m).exec(fragmentStr)[1];
  result["encoding"] =
    (/^Content-Transfer-Encoding: (.+)$/m).exec(fragmentStr)[1];
  // not all fragments have a disposition or an id
  if ((/^Content-Disposition: ((.|\r\n )+)\r\n/mg).test(fragmentStr)){
    result["contentDisposition"] =
      (/^Content-Disposition: ((.|\r\n )+)\r\n/mg).exec(fragmentStr)[1];
  }
  if ((/^Content-ID: ((.|\r\n\t)+)\r\n/mg).test(fragmentStr)){
    result["contentId"] =
      (/^Content-ID: ((.|\r\n\t)+)\r\n/mg).exec(fragmentStr)[1];
  }
  // in my case between MIME headers and content where 2 \r\n,
  // may be only one if there are problems with this code
  result["contents"] = (/^.*\r\n\r\n([\s\S]+)\r\n/m).exec(fragmentStr)[1];
  result["isFragment"] = true;
  return result;
}