"use strict";
//   CATProcessEmailing.js
function formProcessActionEmail(parameters) {
	// get the email templates document object
	// if success, continue working
	$.ajax({
		url: EMAIL_TEMPLATES_FILE,
		method: "GET",
		success: function (responseText, responseStatus, reqObj) {
			continueProcessingEmail({
				otherParams: parameters,
				docObj: responseText
			});
		},
		error: function (reqObj, responseStatus, errorThrown) {
			emailDeveloper({
				subject: "CRITICAL ERROR IN CAT: Email Templates HTML File Not Obtained",
				body: "<p>The CATemailtempates.html file could not be obtained for emailing</p>"
			});
		}
	});
}

function continueProcessingEmail(parameters) {
	var i, ToAddressee, CcAddressee, bodyText, emailBodies, fullName,
		MessageSubject = "",
		MessageBody, letterSubject,
		incomingNumber, unit, state,
		o = parameters.otherParams,
		htmlParser = new DOMParser(),
		listItemData = o.listItemData;
	if (parameters.emailBodies)
		emailBodies = parameters.emailBodies;
	else
		emailBodies = htmlParser.parseFromString(parameters.docObj, "text/html");
	CcAddressee = CC_ADDRESSEE;
	parameters.emailBodies = emailBodies;
	incomingNumber = listItemData[CatCONST.CORRESPONDENCE_LIST_INCOMING_LETTER_NUMBER_COLUMN_NAME];
	unit = listItemData[CatCONST.CORRESPONDENCE_LIST_ASSIGNED_UNIT_COLUMN_NAME];
	if (parameters.state)
		state = parameters.state;
	else
		state = listItemData[CatCONST.CORRESPONDENCE_LIST_STATE_COLUMN_NAME];
	if (o.resend && o.resend == true)
		MessageSubject += "RESEND--";
	if (incomingNumber.search(/DF/) == 0) {
		MessageSubject = "Incoming " + incomingNumber;
		if (incomingNumber.search(/-FA/) > 0) {
			letterSubject = listItemData[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME];
			if (letterSubject.search(/\(ASO\)/) > 0)
				MessageSubject += " [Response to ASO]";
			else
				MessageSubject += " [Response to FI]";
		}
	}
	else
		MessageSubject += "Initiated Letter To " +
		listItemData[CatCONST.CORRESPONDENCE_LIST_OUTGOING_VENDOR_COLUMN_NAME];;
	o.incomingNumber = incomingNumber;
	switch (state) {
		case PROCESS_STATE_ERROR:
			ToAddressee = CORRESPONDENCE_COORDINATOR_EMAIL_ADDRESS;
			bodyText = emailBodies.getElementById("critical-error-body").outerHTML;
			MessageSubject = "CRITICAL ERROR in Correspondence Flow| ATTENTION REQUIRED";
			break;
		case PROCESS_STATE_ASSIGN_UNIT_TASK: // 1
			ToAddressee = CORRESPONDENCE_COORDINATOR_EMAIL_ADDRESS;
			bodyText = emailBodies.getElementById("assign-unit-body").outerHTML;
			MessageSubject = "Unit Assignment: " + MessageSubject;
			break;
		case PROCESS_STATE_ASSIGN_ANALYST_TASK: // 2
			ToAddressee = listItemData[CatCONST.CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME];
			bodyText = emailBodies.getElementById("assign-analyst-body").outerHTML;
			MessageSubject = "Analyst Assignment: " + MessageSubject;
			break;
		case PROCESS_STATE_DECIDE_RESPONSE_TASK:
			ToAddressee = listItemData[CatCONST.CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME];
			bodyText = emailBodies.getElementById("decide-response-body").outerHTML;
			MessageSubject = "Response Required Decision: " + MessageSubject;
			break;
		case PROCESS_STATE_UNIT_CHIEF_REEVALUATE:
			ToAddressee = listItemData[CatCONST.CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME];
			bodyText = emailBodies.getElementById("unit-chief-reevaluate-body").outerHTML;
			MessageSubject = "Unit Chief Re-evaluate: " + MessageSubject;
			if (parameters.skipUR && parameters.skipUR == true) {
				bodyText = bodyText.replace(/\$\$WHICH-CHIEF\$\$/, "Section");
				bodyText = bodyText.replace(/\$\$FOLLOW-TEXT\$\$/, ", as there is no Unit Chief for this process.");
			}
			else {
				bodyText = bodyText.replace(/\$\$WHICH-CHIEF\$\$/, "Unit");
				bodyText = bodyText.replace(/\$\$FOLLOW-TEXT\$\$/, ".");
			}
			break;
		case PROCESS_STATE_INFORM_ON_NO_INCOMING_RESPONSE:
			getWorkflowSectionReviewer({
				unit: unit
			}).then(function (response) {
				var linksQueue = [],
					docLibIds = listItemData[CatCONST.CORRESPONDENCE_LIST_DOCLIB_INCOMING_IDS_COLUMN_NAME].split(",");
				ToAddressee = response[0].emailAddress;
				bodyText = emailBodies.getElementById("no-incoming-response-info-body").outerHTML;
				MessageSubject = "Information About No Response Required: " + MessageSubject;
				for (i = 0; i < docLibIds.length; i++)
					linksQueue.push(new RSVP.Promise(function (resolve, reject) {
						o.iCorrespondenceLibrary.getDocLibItemFileAndMetaData({
							itemId: docLibIds[i]
						}).then(function (response) {
							var libItemFileData = response.responseJSON.d,
								markup, seq;
							markup = "<a target=\"_blank\" href=\"https://" + SERVER_NAME +
								(SITE_NAME.length > 0 ? "/" + SITE_NAME : "") +
								libItemFileData["ServerRelativeUrl"] + "\">";
							if (libItemFileData.ListItemAllFields.FileType == "letter") {
								seq = 0;
								markup += "Letter";
							}
							else {
								seq = parseInt(libItemFileData.ListItemAllFields.FileType.match(/attach(\d*)/)[1]);
								markup += "Enclosure #" + seq;
							}
							markup += "</a>\n";
							resolve({
								seq: seq,
								markup: markup
							});
						}).catch(function (response) {
							emailDeveloper({
								subject: "CATProcessEmailing.js: continueProcessingEmail(): " +
									"getDocLibItemFileAndMetaData() caught",
								body: "<p></p>"
							});
							reject(response);
						});
					}));
				RSVP.all(linksQueue).then(function (response) {
					var incomingLinks = "";
					response.sort(function (a, b) {
						return a.seq > b.seq ? 1 : a.seq < b.seq ? -1 : 0;
					});
					for (var i = 0; i < response.length; i++)
						incomingLinks += response[i].markup + "<br />";
					o.Subject = MessageSubject;
					o.Body = bodyText;
					o.To = ToAddressee;
					o.CC = CcAddressee;
					o.incomingLinks = incomingLinks;
					finalizeEmailing(parameters);
				}).catch(function (response) {
					emailDeveloper({
						subject: "CATProcessEmailing.js: continueProcessingEmail(): " +
							"RSVP.all(linksQueue) caught",
						body: "<p></p>"
					});
				});
			});
			return;
		case PROCESS_STATE_INCOMING_ANALYST_PROOF_UPLOAD:
		case PROCESS_STATE_INITIATED_ANALYST_PROOF_UPLOAD:
			getEmailAddressFromFullName(
				listItemData[CatCONST.CORRESPONDENCE_LIST_ASSIGNED_ANALYST_COLUMN_NAME]
			).then(function (response) {
				ToAddressee = response;
				CcAddressee = "Stephen.Halloran@dhcs.ca.gov";
				if (state == PROCESS_STATE_INCOMING_ANALYST_PROOF_UPLOAD) {
					bodyText = emailBodies.getElementById("for-incoming-analyst-upload-proof-body").outerHTML;
					MessageSubject = "Proof of Analyst Upload of Response for Incoming Letter " + incomingNumber;
				}
				else {
					bodyText = emailBodies.getElementById("for-initiated-analyst-upload-proof-body").outerHTML;
					MessageSubject = "Proof of Analyst Upload of Initiated Letter: " + MessageSubject;
				}
				bodyText = bodyText.replace(/CurrentItem-LinksMarkup/,
					setUpLetterSetsForMail(listItemData));
				o.Subject = MessageSubject;
				o.Body = bodyText;
				o.To = ToAddressee;
				o.CC = CcAddressee;
				finalizeEmailing(parameters);
			}).catch(function (response) {
				emailDeveloper({
					subject: "CATProcessEmailing.js: continueProcessingEmail(): " +
						"getEmailAddressFromFullName() caught",
					body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +
						JSON.stringify(response, null, "  ") + "</p>"
				});
			});
			return;
		case PROCESS_STATE_ANALYST_RESPONSE_DIRECTED:
			ToAddressee = listItemData[CatCONST.CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME];
			bodyText = emailBodies.getElementById("analyst-redirect-body").outerHTML;
			MessageSubject = "Analyst Direction to Write: " + MessageSubject;
			break;
		case PROCESS_STATE_DRAFT_RESPONSE_TASK:
			ToAddressee = listItemData[CatCONST.CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME];
			bodyText = emailBodies.getElementById("draft-response-body").outerHTML;
			MessageSubject = "Draft Response Letter: " + MessageSubject;
			break;
		case PROCESS_STATE_UNIT_CHIEF_REVIEW_TASK:
			ToAddressee = listItemData[CatCONST.CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME];
			bodyText = emailBodies.getElementById("mgr1-review-body").outerHTML;
			MessageSubject = "Unit Chief Review: " + MessageSubject;
			break;
		case PROCESS_STATE_SECTION_CHIEF_REVIEW_TASK:
			ToAddressee = listItemData[CatCONST.CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME];
			bodyText = emailBodies.getElementById("mgr2-review-body").outerHTML;
			MessageSubject = "Section Chief Review: " + MessageSubject;
			break;
		case PROCESS_STATE_ANALYST_REDO_REQUIRED:
		case PROCESS_STATE_INITIATE_OUTGOING_ANALYST_REDO_REQUIRED:
			ToAddressee = listItemData[CatCONST.CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME];
			if (state == PROCESS_STATE_ANALYST_REDO_REQUIRED) {
				o.Subject = "Analyst Re-Edit Outgoing Draft: " + MessageSubject;
				o.Body = emailBodies.getElementById("analyst-re-do-body").outerHTML;
			}
			else { // state == PROCESS_STATE_INITIATE_OUTGOING_ANALYST_REDO_REQUIRED
				o.Subject = "Analyst Re-Edit Initiated Outgoing Draft: " + MessageSubject;
				o.Body = emailBodies.getElementById("analyst-re-do-outgoing-body").outerHTML;
			}
			getItemAnalyst(
				o.specialData.analystId
			).then(function (response) {
				o.CC = CcAddressee + ";" + response.email;
				o.To = ToAddressee;
				if (JSON.parse(listItemData[CatCONST.CORRESPONDENCE_LIST_ITEM_DATA_COLUMN_NAME]).ManagerReject.search(/M1R/i) >= 0)
					o.Body = o.Body.replace(/CurrentItem-ReturningReviewer/g, "Unit Chief");
				else
					o.Body = o.Body.replace(/CurrentItem-ReturningReviewer/g, "Section Chief");
				finishAnalystRedo(parameters);
			}).catch(function (response) {
				emailDeveloper({
					subject: "getWorkflowUnitReviewer() caught in CATProcessEmailing.js:continueProcessingEmail()" +
						"--switch case: ANALYST REDO REQUIRED",
					body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +
						JSON.stringify(response, null, "  ") + "</p>"
				});
			});
			return;
		case PROCESS_STATE_UNIT_CHIEF_REVIEW_REDO_REQUIRED:
			ToAddressee = listItemData[CatCONST.CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME];
			bodyText = emailBodies.getElementById("mgr1-re-review-body").outerHTML;
			MessageSubject = "Unit Chief Re-Review: " + MessageSubject;
			break;
		case PROCESS_STATE_SECTION_CHIEF_REVIEW_REDO_REQUIRED:
			ToAddressee = listItemData[CatCONST.CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME];
			bodyText = emailBodies.getElementById("mgr2-re-review-body").outerHTML;
			MessageSubject = "Section Chief Re-Review: " + MessageSubject;
			break;
		case PROCESS_STATE_STAMPING_TASK:
			ToAddressee = CORRESPONDENCE_COORDINATOR_EMAIL_ADDRESS;
			bodyText = emailBodies.getElementById("stamping-letter-body").outerHTML;
			MessageSubject = "Numbering & Dating: " + MessageSubject;
			break;
		case PROCESS_STATE_SIGNED_AND_MAILED:
			ToAddressee = CORRESPONDENCE_COORDINATOR_EMAIL_ADDRESS;
			bodyText = emailBodies.getElementById("scanning-mailing-body").outerHTML;
			bodyText = bodyText.replace(/\$\$CurrentItem-scanname\$\$/g,
				"scanname=" + encodeURIComponent(o.scanname));
			MessageSubject = "Scanning & Mailing: " + MessageSubject;
			break;
		case PROCESS_STATE_INITIATE_OUTGOING_ANALYST_UPLOAD:
			ToAddressee = listItemData[CatCONST.CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME];
			bodyText = emailBodies.getElementById("outgoing-upload-body").outerHTML;
			MessageSubject = "Analyst Upload: " + MessageSubject;
			break;
		case PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW:
			ToAddressee = listItemData[CatCONST.CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME];
			bodyText = emailBodies.getElementById("mgr1-review-outgoing-body").outerHTML;
			MessageSubject = "Unit Chief Review: " + MessageSubject;
			break;
		case PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW:
			ToAddressee = listItemData[CatCONST.CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME];
			bodyText = emailBodies.getElementById("mgr2-review-outgoing-body").outerHTML;
			MessageSubject = "Section Chief Review: " + MessageSubject;
			break;
		case PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW_REDO_REQUIRED:
			ToAddressee = listItemData[CatCONST.CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME];
			bodyText = emailBodies.getElementById("mgr1-re-review-outgoing-body").outerHTML;
			MessageSubject = "Unit Chief Re-Review: " + MessageSubject
			break;
		case PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW_REDO_REQUIRED:
			ToAddressee = listItemData[CatCONST.CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME];
			bodyText = emailBodies.getElementById("mgr2-re-review-outgoing-body").outerHTML;
			MessageSubject = "Section Chief Re-Review: " + MessageSubject;
			break;
		case PROCESS_STATE_INITIATE_OUTGOING_STAMPING_TASK:
			ToAddressee = CORRESPONDENCE_COORDINATOR_EMAIL_ADDRESS;
			bodyText = emailBodies.getElementById("branding-outgoing-body").outerHTML;
			MessageSubject = "Initiated Letter Numbering & Dating: " + MessageSubject;
			break;
		case PROCESS_STATE_INITIATE_OUTGOING_SIGNED_AND_MAILED:
			ToAddressee = CORRESPONDENCE_COORDINATOR_EMAIL_ADDRESS;
			bodyText = emailBodies.getElementById("signing-mailing-outgoing-body").outerHTML;
			bodyText = bodyText.replace(/\$\$CurrentItem-scanname\$\$/g,
				"scanname=" + encodeURIComponent(o.scanname));
			MessageSubject = "Initiated Letter Scanning & Mailing: " + MessageSubject;
			break;
		case PROCESS_STATE_INITIATE_OUTGOING_COMPLETE:
		case PROCESS_STATE_NO_RESPONSE_REQUIRED_COMPLETE:
		case PROCESS_STATE_COMPLETE:
			ToAddressee = listItemData[CatCONST.CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME];
			getEmailAddressFromFullName(
				listItemData[CatCONST.CORRESPONDENCE_LIST_ASSIGNED_ANALYST_COLUMN_NAME]
			).then(function (response) {
				var funcToCall, args;
				ToAddressee = response;
				getEmailAddressFromFullName(
					parameters.skipUR == false ?
					listItemData[CatCONST.CORRESPONDENCE_LIST_UNIT_CHIEF_NAME_COLUMN_NAME] :
					listItemData[CatCONST.CORRESPONDENCE_LIST_SECTION_CHIEF_NAME_COLUMN_NAME]
				).then(function (response) {
					ToAddressee += ";" + (typeof response == "string" ? response : response[0].emailAddress);
					if (state == PROCESS_STATE_NO_RESPONSE_REQUIRED_COMPLETE) {
						funcToCall = getWorkflowSectionReviewer;
						args = {
							unit: unit
						};
					}
					else {
						funcToCall = getEmailAddressFromFullName;
						args = listItemData[CatCONST.CORRESPONDENCE_LIST_SECTION_CHIEF_NAME_COLUMN_NAME];
					}
					funcToCall(
						args
					).then(function (response) {
						ToAddressee += ";" + (typeof response == "string" ? response : response[0].emailAddress);
						if (state == PROCESS_STATE_INITIATE_OUTGOING_COMPLETE) {
							bodyText = emailBodies.getElementById("outgoing-process-complete-body").outerHTML;
							MessageSubject = "Process Completion: " + MessageSubject;
						}
						else if (state == PROCESS_STATE_NO_RESPONSE_REQUIRED_COMPLETE) {
							bodyText = emailBodies.getElementById("confirm-no-decision-body").outerHTML;
							MessageSubject = "Confirmed: No Response Required : Process Complete: " + MessageSubject;
						}
						else { // state == PROCESS_STATE_COMPLETE
							bodyText = emailBodies.getElementById("process-complete-body").outerHTML;
							MessageSubject = "Process Completion: " + MessageSubject;
						}
						bodyText = bodyText.replace(/CurrentItem-LinksMarkup/,
							setUpLetterSetsForMail(listItemData));
						o.Subject = MessageSubject;
						o.Body = bodyText;
						o.To = ToAddressee;
						o.CC = CcAddressee;
						finalizeEmailing(parameters);
					}).catch(function (response) {
						emailDeveloper({
							subject: "CATProcessEmailing.js:continueProcessingEmail() -- getEmailAddressFromFullName(SECTION CHIEF) caught",
							body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +
								JSON.stringify(response, null, "  ") + "</p>"
						});
					});
				}).catch(function (response) {
					emailDeveloper({
						subject: "CATProcessEmailing.js:continueProcessingEmail() -- getEmailAddressFromFullName(UNIT CHIEF) caught",
						body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +
							JSON.stringify(response, null, "  ") + "</p>"
					});
				});
			}).catch(function (response) {
				emailDeveloper({
					subject: "CATProcessEmailing.js:continueProcessingEmail() -- getEmailAddressFromFullName(ANALYST) caught",
					body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +
						JSON.stringify(response, null, "  ") + "</p>"
				});
			});
			return;
		default:
			ToAddressee = CORRESPONDENCE_COORDINATOR_EMAIL_ADDRESS + ";" +
				DEVELOPER_EMAIL_ADDRESS;
			bodyText = emailBodies.getElementById("no-process-state-defined-body").outerHTML;
			bodyText = bodyText.replace(/CurrentItem-ID/, parameters.itemId);
			bodyText = bodyText.replace(/Process-State/, state);
			MessageSubject = "ERROR in Email System: No Email Body for this Process State";
			CcAddressee = "";
	}
	o.Subject = MessageSubject;
	o.Body = bodyText;
	o.To = ToAddressee;
	o.CC = CcAddressee;
	finalizeEmailing(parameters);
}

function finishAnalystRedo(parameters) {
	var o = parameters.otherParams;
	o.iCorrespondenceList.updateListItem({
		itemId: o.itemId,
		body: formatRESTBody([
			[CatCONST.CORRESPONDENCE_LIST_WORKFLOW_URL_HOLDER_COLUMN_NAME,
				o.listItemData[CatCONST.CORRESPONDENCE_LIST_WORKFLOW_URL_HOLDER_COLUMN_NAME] +
				"-notified"
			]
		])
	}).then(function (response) {
		finalizeEmailing(parameters);
	}).catch(function (response) {
		emailDeveloper({
			subject: "Catch block called in CATProcessEmailing.js",
			body: "<p>Catch block called in CATProcessEmailing.js: finishAnalystRedo{}::iCorrList.updateListItem()</p>" +
				"<p style=\"white-space:pre;font:normal 10pt monospace;\">response object:<br />" +
				JSON.stringify(response, null, "  ") + "</p>"
		});
	});
}

function finalizeEmailing(parameters) {
	var state, BccAddressee, MessageBody,
		FromAddressee = (typeof FROM_ADDRESSEE == "undefined") ? "" : FROM_ADDRESSEE,
		o = parameters.otherParams,
		listItemData = o.listItemData,
		itemId = o.itemId,
		bodyText = o.Body,
		MessageSubject = o.Subject,
		ToAddressee = o.To,
		CcAddressee = o.CC,
		incomingNumber = listItemData[CatCONST.CORRESPONDENCE_LIST_INCOMING_LETTER_NUMBER_COLUMN_NAME],
		emailService = new SPUtilityEmailService({
			server: SERVER_NAME,
			site: SITE_NAME
		});
	if (parameters.state)
		state = parameters.state;
	else
		state = listItemData[CatCONST.CORRESPONDENCE_LIST_STATE_COLUMN_NAME];
	if (state != PROCESS_STATE_COMPLETE && state != PROCESS_STATE_INITIATE_OUTGOING_COMPLETE &&
		state != PROCESS_STATE_NO_RESPONSE_REQUIRED_COMPLETE)
		bodyText += parameters.emailBodies.getElementById("retain-email-paragraph").outerHTML;
	bodyText = bodyText.substr(0, bodyText.indexOf("<div") + 5) +
		"style=\"border:5px outset rgb(46,12,199);padding:1em 2em;margin:0 5%;\" " +
		bodyText.substr(bodyText.indexOf("<div") + 5);
	bodyText = "<html><head></head>" +
		"<body style=\"background-color:#eee;font:normal 12pt Segoe UI,Tahoma,Verdana,sans-serif;\">" +
		bodyText + "</body></html>";
	bodyText = bodyText.replace(/[\r\n]/g, " ");
	bodyText = bodyText.replace(/"/g, '\"');
	bodyText = bodyText.replace(/'/g, ''');
	//        MessageBody = bodyText.replace(/<\//g, "<\\/");
	MessageBody = bodyText.replace(/\$\$email-html-file-url\$\$/g, location.hostname + location.pathname);
	//        MessageBody = MessageBody.replace(/\$\$email-html-file-url\$\$/g, location.hostname + location.pathname);
	MessageBody = MessageBody.replace(/\$\$Templates-Folder\$\$/g, TEMPLATES_FOLDER);
	MessageBody = MessageBody.replace(/CurrentItem-state/g, state);
	MessageBody = MessageBody.replace(/CurrentItem-Incoming-Letter-Number/g, incomingNumber);
	MessageBody = MessageBody.replace(/CurrentItem-Outgoing-Letter-Number/g,
		listItemData[CatCONST.CORRESPONDENCE_LIST_OUTGOING_LETTER_NUMBER_COLUMN_NAME]);
	MessageBody = MessageBody.replace(/CurrentItem-Subject/g,
		listItemData[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME]);
	MessageBody = MessageBody.replace(/CurrentItem-Incoming-Vendor/g,
		listItemData[CatCONST.CORRESPONDENCE_LIST_INCOMING_VENDOR_COLUMN_NAME]);
	MessageBody = MessageBody.replace(/CurrentItem-Outgoing-Vendor/g,
		listItemData[CatCONST.CORRESPONDENCE_LIST_OUTGOING_VENDOR_COLUMN_NAME]);
	MessageBody = MessageBody.replace(/CurrentItem-Assigned-Analyst/g,
		listItemData[CatCONST.CORRESPONDENCE_LIST_ASSIGNED_ANALYST_COLUMN_NAME]);
	MessageBody = MessageBody.replace(/CurrentItem-ID/g, itemId);
	MessageBody = MessageBody.replace(/CurrentItem-Unit/g,
		listItemData[CatCONST.CORRESPONDENCE_LIST_ASSIGNED_UNIT_COLUMN_NAME]);
	MessageBody = MessageBody.replace(/CurrentItem-Comments/g,
		listItemData[CatCONST.CORRESPONDENCE_LIST_COMMENTS_COLUMN_NAME]);
	MessageBody = MessageBody.replace(/CurrentItem-ReviewerComments/g,
		listItemData[CatCONST.CORRESPONDENCE_LIST_REVIEWER_COMMENT_COLUMN_NAME]);
	MessageBody = MessageBody.replace(/CurrentItem-MgrIName/g,
		listItemData[CatCONST.CORRESPONDENCE_LIST_UNIT_CHIEF_NAME_COLUMN_NAME]);
	MessageBody = MessageBody.replace(/CurrentItem-ScanURL/g, "https://" +
		SERVER_NAME + (SITE_NAME != "" ? "/" + SITE_NAME : "") +
		listItemData[CatCONST.CORRESPONDENCE_LIST_WORKFLOW_URL_HOLDER_COLUMN_NAME]);
	if (o.incomingLinks)
		MessageBody = MessageBody.replace(/CurrentItem-IncomingLinks/g, o.incomingLinks);
	MessageBody = MessageBody.replace(/CurrentItem-Received-Date/g,
		sharePointDateFormat(new Date(listItemData[CatCONST.CORRESPONDENCE_LIST_INCOMING_RECEIVED_DATE_COLUMN_NAME])));
	MessageBody = MessageBody.replace(/CurrentItem-Date-Sent/g,
		sharePointDateFormat(new Date(listItemData[CatCONST.CORRESPONDENCE_LIST_DATE_SENT_COLUMN_NAME])));
	if (NO_COORDINATOR_CC == false) {
		if (ToAddressee.search(CORRESPONDENCE_COORDINATOR_EMAIL_ADDRESS) < 0)
			if (CcAddressee && CcAddressee.length > 0) {
				if (CcAddressee.search(new RegExp(CORRESPONDENCE_COORDINATOR_EMAIL_ADDRESS)) < 0)
					CcAddressee += ";" + CORRESPONDENCE_COORDINATOR_EMAIL_ADDRESS;
			}
		else
			CcAddressee = CORRESPONDENCE_COORDINATOR_EMAIL_ADDRESS;
	}
	if (NO_DEV_EMAILS == false && environment != "TEST")
		if (CcAddressee && CcAddressee.length > 0) {
			if (CcAddressee.search(new RegExp(DEVELOPER_EMAIL_ADDRESS)) < 0)
				CcAddressee += ";" + DEVELOPER_EMAIL_ADDRESS;
		}
	else
		CcAddressee = DEVELOPER_EMAIL_ADDRESS;
	// BEGIN excise for min
	if (environment != "PROD") {
		bodyText = parameters.emailBodies.getElementById("testing-email-addresses-block").outerHTML;
		bodyText = bodyText.replace(/\$\$ToAddresses\$\$/, ToAddressee);
		bodyText = bodyText.replace(/\$\$CcAddresses\$\$/, CcAddressee);
		MessageBody = bodyText + MessageBody;
		ToAddressee = currentUserInfo.emailAddress;
		CcAddressee = "";
		if (environment == "TEST" && ToAddressee != DEVELOPER_EMAIL_ADDRESS)
			BccAddressee = DEVELOPER_EMAIL_ADDRESS;
	}
	// END excise for min
	emailService.sendEmail({
		From: FromAddressee,
		To: ToAddressee,
		CC: CcAddressee,
		BCC: BccAddressee,
		Subject: MessageSubject,
		Body: MessageBody
	});
	if (state == PROCESS_STATE_UNIT_CHIEF_REEVALUATE) {
		parameters.state = PROCESS_STATE_INFORM_ON_NO_INCOMING_RESPONSE;
		continueProcessingEmail(parameters);
	}
	else if (state == PROCESS_STATE_UNIT_CHIEF_REVIEW_TASK) {
		parameters.state = PROCESS_STATE_INCOMING_ANALYST_PROOF_UPLOAD;
		continueProcessingEmail(parameters);
	}
	else if (state == PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW) {
		parameters.state = PROCESS_STATE_INITIATED_ANALYST_PROOF_UPLOAD;
		continueProcessingEmail(parameters);
	}
	return true;
}

function setUpLetterSetsForMail(listItemData) {
	var i, j, set,
		setStyle = "font-size:14pt;color:navy;font-weight:bold;margin-bottom:0;",
		markup = "<div>",
		sets = ["IncomingSet", "OutgoingSet", "Scan"],
		specialData = JSON.parse(
			listItemData[CatCONST.CORRESPONDENCE_LIST_ITEM_DATA_COLUMN_NAME]
		);
	for (i = 0; i < sets.length; i++) {
		if (set = specialData[sets[i]]) {
			markup += "\n<p style=\"" + setStyle + "\">" + sets[i] + "</p>" +
				"\n<p style=\"margin-top:0;\">"
			for (j = 0; j < set.length; j++) {
				if (set[j].url.search(/https/) < 0)
					set[j].url = "https://" + SERVER_NAME +
					(SITE_NAME.length > 0 ? "/" + SITE_NAME : "") +
					set[j].url;
				markup += "\n<a href=\"" + set[j].url + "\">" +
					set[j].description + "</a><br />";
			}
			markup += "\n</p>";
		}
	}
	markup += "\n</div>\n<p style=\"display:none;\">\n%%%" +
		listItemData[CatCONST.CORRESPONDENCE_LIST_ITEM_DATA_COLUMN_NAME] +
		"%%%</p>";
	return markup;
}