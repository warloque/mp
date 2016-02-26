// 'mail' is a variable holding the email string
// RegEx matching first occurrence of 'Content-Type: ' - start of mail body
var eohRegEx = /^Content-Type: /im;
var bodyPos = mail.indexOf(eohRegEx.exec(mail)); // holds pos of C in 'Content-Type: '
var headerLines = mail.substring(0, bodyPos); // ends with \r\n
// now determine the present headers and store them in an object
var headers = new Object();
var headerRegExp = /^(.+?): ((.|\r\n\s)+)\r\n/mg;
var h;
while (h = headerRegExp.exec(headerLines))
  headers[h[1]] = h[2];
// on a website you now can annoy the visitor with all headers and their values
for(var field in headers) {
  console.log(field + ": " + headers[field]);
}