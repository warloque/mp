// 'bodyPos' and 'mail' from above
var bodyLines = mail.substring(bodyPos);
var contentType = (/^Content-Type: (.+)$/im).exec(bodyLines)[1];
// check whether body is multipart (grouping not further used here)
var mpRegEx = /^multipart\/(.+);/i;
// if multipart then the body is a container otherwise a fragment
var parsedBody;
if (mpRegEx.test(contentType))
  parsedBody = parseMimeContainer(bodyLines);
else
  parsedBody = parseMimeFragment(bodyLines);