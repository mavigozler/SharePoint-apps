"use strict";
// CATerror.js
// errorHandler() is a general global error handler
// @param msg string description of error; provided by the error object
// @param src string what the URL is that generated the error
// @param line string line number where error occurred
// @param col string column number where error occurred
// @param errObj object the error object, if passed
// @return void
// @pre an unhandled exception
// @post information about error emailed to developer
function errorHandler(msg, src, line, col, errObj) {
	var body, errMsg,
		ToAddressee = CatCONST.DEVELOPER_EMAIL_ADDRESS,
		emailService = new SPUtilityEmailService({
			server: SERVER_NAME,
			site: SITE_NAME
		});
	if (environment == "TEST")
		ToAddressee += ";" + currentUserInfo.emailAddress;
	body = "<html><head></head><body><ul>";
	if (msg instanceof ErrorEvent) {
		body +=
			"<li>User: " + currentUserInfo.firstName + " " +
			currentUserInfo.lastName + "</li>" +
			"<li>Message: " + msg.message + "</li>" +
			"<li>URL: " + msg.filename + "</li>" +
			"<li>Line: " + msg.lineno + "</li>" +
			"<li>Column: " + msg.colno + "</li></ul>" +
			"<p style=\"font:normal 10pt 'Courier',monospace;white-space:pre;\">" +
			"Stack trace: " + msg.error.stack + "</p></li>";
	}
	else {
		body += "<li>Message: " + msg + "</li>";
		if (src)
			body += "<li>URL: " + src + "</li>";
		if (line)
			body += "<li>Line: " + line + "</li>";
		if (col)
			body += "<li>Column: " + col + "</li>";
		if (errObj && errObj.description)
			body += "<li>Description: " + errObj.description + "</li>";
		if (errObj && errObj.number)
			body += "<li>Number: " + errObj.number + "</li>";
		body += "</ul>";
	}
	body += "</body></html>";
	emailService.sendEmail({
		From: "",
		To: "Stephen.Halloran@dhcs.ca.gov",
		Subject: "Unhandled Exception in Correspondence System",
		Body: body
	});
	location.assign("CATerror.html");
}

function stateErrorPage() {
	return document.getElementById("state-advanced-error").style.display = "block";
}

function environmentErrorPage() {
	return document.getElementById("environment-error").style.display = "block";
}