function parseMimeContainer(aContainerStr){
  // each container has a content type and boundary
  var cType = (/^Content-Type: ((.|\r\n )+)\r\n/m).exec(aContainerStr)[1];
  var boundary = (/^ boundary="(.+)"/m).exec(cType)[1];
  var result = new Object();
  result["contentType"] = cType;
  result["boundary"] = boundary;
  result["isFragment"] = false;
  // next fetch contents (everything after the first use of boundary)
  var contentRegEx =
    new RegExp("--" + boundary + "\r\n(((.|\\s)+)--" + boundary + ")--","img");
  var containerContents = contentRegEx.exec(aContainerStr)[1];
  // RegEx below determines where the next part ends
  var boundaryRegEx = new RegExp("^([\\s\\S]+?)--" + boundary, "m");
  var contents = new Object();
  // as long as there are more parts
  while(boundaryRegEx.test(containerContents)){
    // fetch next part, remove it from the remaining contents to be handled
    var nextPart = boundaryRegEx.exec(containerContents)[1];
    // + 4 is for the two dashes preceding the boundary value and \r\n
    containerContents =
      containerContents.substring(nextPart.length + boundary.length + 4);
    // is the current next part is of type multipart, we have a container
    if ((/^Content-Type: multipart\/(.+);/i).test(nextPart))
      contents.push(parseMimeContainer(nextPart));
    else
      contents.push(parseMimeFragment(nextPart));
  }
  result["contents"] = contents;
  return result;
}