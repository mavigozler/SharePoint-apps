"use strict";
// CATinit.js
// anonymous function -- script entry point for document
// @return void
// @pre window loading of HTML document
// @post selected process requests
var urlSearchParams = new URLSearchParams(location.search);
var browserStorage;
$(document).ready(function () {
	var source, nodes, today = new Date(),
		controlForm = document.getElementById("control"),
		outgoingDropZone = document.getElementById("outgoing-drop-zone"),
		iniFileInstance = new IniFile(INI_FILE_PATH);
	if (!environment)
		return environmentErrorPage();
	window.addEventListener('error', errorHandler);
	if (environment == "PROD")
		browserStorage = sessionStorage;
	else {
		browserStorage = localStorage;
		if (TestCases)
			TestCases();
	}
	//        PCCCJS_initialize(environment);
	getSharePointCurrentUserInfo().then(function (response) {
		currentUserInfo = response;
	}).catch(function (response) {
		alert("Problem getting current user info");
	});
	// input tags initialize
	//        controlForm["incomingLetterNumber"].value = "DF16-18-03245-ASO";
	//        controlForm["receivedDate"].valueAsDate = new Date(new Date().getTime() - (5 * 1000 * 3600 * 24));
	//        controlForm["letterSubject"].value = "Resubmission of EDI Companion Guide -- Deliverable M029";
	controlForm["outgoingLetterNumber"].value = "SC16-" + (today.getYear() - 100) + "-xxxxx";
	// controlForm["incoming-received-date"].value = "";
	if (controlForm["mailingDate"].type == "date")
		controlForm["mailingDate"].valueAsDate = today;
	else
		controlForm["mailingDate"].value = (today.getMonth() + 1) + "/" + today.getDate() + "/" + today.getFullYear();
	if (controlForm["execReviewDate"].type == "date")
		controlForm["execReviewDate"].valueAsDate = new Date(today.getTime() - (1 * 1000 * 3600 * 24));
	else {
		today = new Date(today.getTime() - (1 * 1000 * 3600 * 24));
		controlForm["execReviewDate"].value = (today.getMonth() + 1) + "/" + today.getDate() + "/" + today.getFullYear();
	}
	iniFileInstance.waitIniFileLoad().then(function (response) {
		iniFileInstance.setSection(environment);
		CORRESPONDENCE_LIST_NAME =
			iniFileInstance.getValue("MasterLogListName");
		CORRESPONDENCE_LIST_ITEM_ENTITY_TYPE_FULL_NAME =
			iniFileInstance.getValue("MasterLogListItemEntityTypeFullName");
		CORRESPONDENCE_LIBRARY_NAME =
			iniFileInstance.getValue("MasterLogDocumentsName");
		CORRESPONDENCE_LIBRARY_RELATIVE_URL =
			iniFileInstance.getValue("MasterLogDocumentsRelativeUrl");
		CORRESPONDENCE_LIBRARY_ITEM_ENTITY_TYPE_FULL_NAME =
			iniFileInstance.getValue("MasterLogDocumentItemEntityTypeFullName");
		CORRESPONDENCE_LINK_TO_DOCUMENT_CONTENT_TYPE_ID =
			iniFileInstance.getValue("MasterLogDocumentsLinkToDocumentContentTypeId");
		incomingAsLinks = iniFileInstance.getValue("IncomingAsLinks");
		if (location.search.search(/uselinks/) >= 0) // URL override
			incomingAsLinks = true;
		useDragAndDrop = iniFileInstance.getValue("UseDragAndDrop");
		NO_DEV_EMAILS = iniFileInstance.getValue("NoDevEmails");
		NO_COORDINATOR_CC = iniFileInstance.getValue("NoCoordinatorCc");
		TEMPLATES_FOLDER = iniFileInstance.getValue("TemplatesFolder");
		CC_ADDRESSEE = iniFileInstance.getValue("CcAddressee");
		iniFileInstance.setSection("APP");
		LINK_STYLE = iniFileInstance.getValue("LinkStyle");
		if (LINK_STYLE == null)
			LINK_STYLE = "anchored";
		MAX_FILE_DESCRIPTION_LENGTH =
			iniFileInstance.getValue("MaxFileDescriptionLength");
		MAJOR_VERSION = iniFileInstance.getValue("MajorVersion");
		MINOR_VERSION = iniFileInstance.getValue("MinorVersion");
		RELEASE = iniFileInstance.getValue("Release");
		iniFileInstance.setSection("ROLES");
		DEVELOPER_EMAIL_ADDRESS =
			iniFileInstance.getValue("DeveloperEmail");
		CORRESPONDENCE_COORDINATOR_EMAIL_ADDRESS =
			iniFileInstance.getValue("CoordinatorEmail");
		CC_ADDRESSEE = CC_ADDRESSEE.replace(/@@DeveloperEmail@@/, DEVELOPER_EMAIL_ADDRESS).
		replace(/@@CoordinatorEmail@@/, CORRESPONDENCE_COORDINATOR_EMAIL_ADDRESS);
		nodes = document.querySelectorAll("span.file-name-char-limit");
		for (var i = 0; i < nodes.length; i++)
			nodes[i].appendChild(document.createTextNode(MAX_FILE_DESCRIPTION_LENGTH));
		source = urlSearchParams.get(CatCONST.QUERY_STRING_NAME_SOURCE);
		if (source == null || source == "email")
			presentForm();
		else // source == "form"
			processFormAction();
	}).catch(function (response) {
		emailDeveloper({
			subject: "INI File Load Issue",
			body: "<p>Catch block of document.ready() in CATinit.js called</p>" +
				"<p style=\"white-space:pre;font:normal 10pt monospace;\">response object:<br />" +
				EnhancedJsonStringify(response, null, "  ") + "</p>"
		});
	});
});

function commentingSet(control, commentSectionId) {
	var commentNode = document.getElementById(commentSectionId);
	if (control.value == "reject")
		commentNode.style.display = "block";
	else
		commentNode.style.display = "none";
}
// clearForm() clears the form in the page, resetting numerous specific fields
// @calledby onclick attribute event handler for BUTTON element
// @return void
// @pre HTML form with fields filled in or not, some are named or else reference error
// @post resetting of HTML form fields
function clearForm(form) {
	var elem, i, nodes;
	nodes = document.getElementsByTagName("div");
	for (i = 0; i < nodes.length; i++)
		if (nodes[i].className.search(/clear-disnone/) >= 0)
			nodes[i].style.display = "none";
	nodes = document.getElementsByTagName("select");
	for (i = 0; i < nodes.length; i++)
		if (nodes[i].className.search(/clear-select/) >= 0)
			while (nodes[i].firstChild)
				nodes[i].removeChild(nodes[i].firstChild);
	clearFiles();
	subjectSet = false;
	form.reset();
}

function credits() {
	var head, node, chldDoc,
		options = "height=800,width=600,top=100,left=200,menubar=yes",
		creditsWin = window.open("", "", options);
	//        node = document.getElementById("release-info");
	//        node.appendChild(document.createTextNode(RELEASE));
	chldDoc = creditsWin.document;
	head = chldDoc.getElementsByTagName("head")[0];
	node = chldDoc.createElement("style");
	node.innerHTML = document.getElementById("credits-style").innerHTML;
	head.appendChild(node);
	//        creditsWin.document.body.innerHTML = document.getElementById("no-credits").innerHTML;
	creditsWin.document.body.innerHTML = document.getElementById("credits").innerHTML;
}
/* Useful properties of the IUserInfo object
this.id; // numeric SP ID
this.loginName;  //i:0#.w|domain\\user name
this.title;  // "<last name>, <first name> <org>
this.email;
this.userName;
this.firstName;
this.lastName;
this.workPhone;
this.created;
this.modified;
this.jobTitle;
*/
/* JSLink code to style web parts
(function () {
var overrideContext = {};  // parent object, can be named anything
overrideContext.Templates = {};
overrideContext.Templates.Item = overrideTemplate;
SPClientTemplates.TemplateManager.RegisterTemplateOverrides(overrideContext);
})();
function overrideTemplate(ctx) {
return "<div style='font-size:32px;border:solid 1px Silver;'>" +
ctx.CurrentItem.Title + "</div>";
}
*/