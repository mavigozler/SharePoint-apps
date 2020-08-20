"use strict";
// CATFormSubmit.js
/********************************************************************************************************
 ********************************** Button OK Handler    ************************************************
 ********************************************************************************************************/
// FormOKHandler() processes the user HTML form upon submit. It validates the input data and state of files as
//    much as possible, then creates constructs URL with query and loads the URL
// @calledBy
// @param state number integer representing the state of the correspondence flow
// @param form HtmlFormObject contains the data for the form submitted
// @param query string contains the name=values pairs in the URL
// @pre
// @post
function FormOKHandler(state, form, query) {
	// OK button: take form data to the process side. Do NOT adjust state, only keep task
	var itemId;
	if (fileErrors && (fileErrors & (MISSING_LETTER |
			ATTACH_SEQUENCE | MIXED_NUMBERS)) != 0x0) {
		alert("There is a problem with the uploaded queued files!\n\n" +
			"See the errors indicated on the page and clear them\n" +
			"before submitting.");
		return false;
	}
	itemId = urlSearchParams.get(CatCONST.QUERY_STRING_NAME_ITEM_ID);
	if (itemId != null && isNaN(itemId = parseInt(itemId)) == false)
		findCheckedOutFiles(itemId, state, form, query);
	else
		formSubmit(state, form, query);
}

function formSubmit(state, form, query) {
	var value, formInput, selectObj, date1, date2;
	// OK button: take form data to the process side. Do NOT adjust state, only keep task
	actionScreenStruct = {
		listType: "ul",
		listId: "action-taken-list",
		items: []
	};
	switch (state) {
		case PROCESS_STATE_CREATE_INCOMING_TASK: // state = 0
			if ((formInput = form[CatCONST.QUERY_STRING_NAME_INCOMING_LETTER_NUMBER].value) == "") {
				alert("Letter Number/ID missing in form");
				return false;
			}
			// Compare the input of the form to the file name inputs for incoming
			query += "&" + CatCONST.QUERY_STRING_NAME_INCOMING_LETTER_NUMBER + "=" + encodeURIComponent(formInput);
			/*
			if (formInput.search(/\-FA/) > 0)
			actionScreenStruct.items.push({
			className: "action-taken-list-title",
			title: "Results of Link To Document Item Creation in the Master Log documents library:",
			titleId: "files-created-header",
			listType: "ol",
			listId: "files-created-list",
			});
			*/
			if ((formInput = form[CatCONST.QUERY_STRING_NAME_RECEIVED_DATE].value) == "") {
				if (environment == "DEV") {
					var date;
					formInput = ((date = new Date()).getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear();
				}
				else {
					alert("Date letter received missing in form");
					return false;
				}
			}
			date2 = new Date(formInput);
			query += "&" + CatCONST.QUERY_STRING_NAME_RECEIVED_DATE + "=" + encodeURIComponent(formInput);
			if (date2 < date1) {
				alert("A letter can not be received on a date before the date printed on the letter");
				return false;
			}
			if (date2 > date1 + 5 && confirm("Confirm that the received date of the letter is " +
					"\nmore than 5 days after the date printed on the letter") == false) {
				alert("Please correct the received date of the letter");
				return false;
			}
			if ((formInput = form[CatCONST.QUERY_STRING_NAME_LETTER_SUBJECT].value) == "") {
				alert("Letter Subject missing");
				return false;
			}
			query += "&" + CatCONST.QUERY_STRING_NAME_LETTER_SUBJECT + "=" + encodeURIComponent(formInput);
			selectObj = form[CatCONST.QUERY_STRING_NAME_CORRESPONDENCE_TYPE];
			if (selectObj.selectedIndex < 0)
				formInput = selectObj.options[0].value;
			else
				formInput = selectObj.options[selectObj.selectedIndex].value;
			query += "&" + CatCONST.QUERY_STRING_NAME_CORRESPONDENCE_TYPE + "=" + encodeURIComponent(formInput);
			document.getElementById("larger-container").style.display = "none";
			document.getElementById("submit-message").style.display = "block";
			window.scrollTo(0, 0);
			doUpload(state).then(function (response) {
				query += "&" + CatCONST.QUERY_STRING_NAME_UPLOADED_FILES + "=" +
					EnhancedJsonStringify(response);
				browserStorage.setItem("actionScreen", EnhancedJsonStringify(actionScreenStruct));
				location.assign(location.origin + location.pathname + "?" + query);
			}).catch(function (response) {
				finishError({
					mainMessage: "Error occurred while uploading your items",
					itemId: itemId,
					systemMessage: response.responseMessage
				});
			});
			return;
		case PROCESS_STATE_ASSIGN_UNIT_TASK: // state == 1
			if ((value = getCheckedRadioValue(form[CatCONST.QUERY_STRING_NAME_ASSIGNED_UNIT])) == null) {
				alert("A choice must be made for a unit");
				return false;
			}
			query += "&" + CatCONST.QUERY_STRING_NAME_ASSIGNED_UNIT + "=" + value;
			break;
		case PROCESS_STATE_ASSIGN_ANALYST_TASK: // state == 2
			if ((value = getCheckedRadioValue(form[CatCONST.QUERY_STRING_NAME_ASSIGNED_ANALYST])) == null) {
				alert("A choice must be made for an analyst");
				return false;
			}
			query += "&" + CatCONST.QUERY_STRING_NAME_ASSIGNED_ANALYST + "=" + value;
			break;
		case PROCESS_STATE_DECIDE_RESPONSE_TASK: // state == 3
			if ((value = getCheckedRadioValue(form[CatCONST.QUERY_STRING_NAME_RESPONSE_DECISION])) == null) {
				alert("A selection of Yes or No is required");
				return false;
			}
			query += "&" + CatCONST.QUERY_STRING_NAME_RESPONSE_DECISION + "=" + value;
			break;
		case PROCESS_STATE_UNIT_CHIEF_REEVALUATE: // state == 20
			if ((value = getCheckedRadioValue(form[CatCONST.QUERY_STRING_NAME_UNIT_CHIEF_REEVALUATION_DECISION])) == null) {
				alert("A selection to agree or NOT agree is required");
				return false;
			}
			query += "&" + CatCONST.QUERY_STRING_NAME_UNIT_CHIEF_REEVALUATION_DECISION + "=" + value;
			break;
		case PROCESS_STATE_DRAFT_RESPONSE_TASK: // state == 4
		case PROCESS_STATE_ANALYST_RESPONSE_DIRECTED: // state == 21
		case PROCESS_STATE_INITIATE_OUTGOING_ANALYST_UPLOAD: // state == 102
			if (queuedFiles.letter == null && queuedFiles.enclosures.length == 0)
				return alert("Nothing has been queued for upload");
			document.getElementById("larger-container").style.display = "none";
			document.getElementById("submit-message").style.display = "block";
			window.scrollTo(0, 0);
			doUpload(state).then(function (response) {
				query += "&" + CatCONST.QUERY_STRING_NAME_UPLOADED_FILES + "=" +
					EnhancedJsonStringify(response);
				browserStorage.setItem("actionScreen", EnhancedJsonStringify(actionScreenStruct));
				location.assign(location.origin + location.pathname + "?" + query);
			}).catch(function (response) {
				emailDeveloper({
					subject: "Catch block called in FormSubmit.js",
					body: "<p>Catch block called in FormSubmit.js, formSubmit function, " +
						"doUpload() promise</p>" +
						"<p style=\"white-space:pre;font:normal 10pt monospace;\">response object:<br />" +
						EnhancedJsonStringify(response, null, "  ") + "</p>"
				});
				finishError({
					mainMessage: "Error occurred while uploading your items",
					itemId: itemId,
					systemMessage: response.responseMessage
				});
			});
			return;
		case PROCESS_STATE_UNIT_CHIEF_REVIEW_TASK: // state == 7
		case PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW: // state == 105
		case PROCESS_STATE_UNIT_CHIEF_REVIEW_REDO_REQUIRED: // state == 8
		case PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW_REDO_REQUIRED: // state == 106
			formInput = getCheckedRadioValue(form[CatCONST.QUERY_STRING_NAME_MGR1_REVIEWER]);
			if (formInput == null) {
				alert("A choice must be made to approve or disapprove with comment");
				return false;
			}
			query += "&" + CatCONST.QUERY_STRING_NAME_MGR1_REVIEWER + "=" + formInput;
			if (formInput == "reject") {
				if ((formInput = form[CatCONST.QUERY_STRING_NAME_MGR1_COMMENT].value).length < 10) {
					alert("A meaningful comment more than 10 characters long is required for the analyst");
					return false;
				}
				query += "&" + CatCONST.QUERY_STRING_NAME_MGR1_COMMENT + "=" + formInput;
			}
			break;
		case PROCESS_STATE_SECTION_CHIEF_REVIEW_TASK: // state == 8
		case PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW: // state == 106
		case PROCESS_STATE_SECTION_CHIEF_REVIEW_REDO_REQUIRED: // state == 53
		case PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW_REDO_REQUIRED: // state == 153
			formInput = getCheckedRadioValue(form[CatCONST.QUERY_STRING_NAME_MGR2_REVIEWER]);
			if (formInput == null) {
				alert("A choice must be made to approve or disapprove with comment");
				return false;
			}
			query += "&" + CatCONST.QUERY_STRING_NAME_MGR2_REVIEWER + "=" + formInput;
			if (formInput == "reject") {
				if ((formInput = form[CatCONST.QUERY_STRING_NAME_MGR2_COMMENT].value).length < 10) {
					alert("A meaningful comment more than 10 characters long is required for the analyst");
					return false;
				}
				query += "&" + CatCONST.QUERY_STRING_NAME_MGR2_COMMENT + "=" + formInput;
			}
			break;
		case PROCESS_STATE_STAMPING_TASK: // state == 9
		case PROCESS_STATE_INITIATE_OUTGOING_STAMPING_TASK: // state == 107
			// Validation steps
			formInput = form[CatCONST.QUERY_STRING_NAME_OUTGOING_LETTER_NUMBER].value;
			if (formInput == "")
				return showAlert("missing letter number", state);
			else if (formInput.search(/^SC16-\d{2}-\d{5}$/) != 0) {
				alert("Field 'Outgoing SC Number' is not in the correct format");
				return false;
			}
			query += "&" + CatCONST.QUERY_STRING_NAME_OUTGOING_LETTER_NUMBER + "=" + formInput;
			formInput = getCheckedRadioValue(form[CatCONST.QUERY_STRING_NAME_OUTGOING_VENDOR]);
			if (formInput == null) {
				alert("A selection was not made for the outgoing vendor\n\n" +
					"Return to the form to make a selection of the vendor");
				return false;
			}
			query += "&" + CatCONST.QUERY_STRING_NAME_OUTGOING_VENDOR + "=" + formInput;
			formInput = new Date(form[CatCONST.QUERY_STRING_NAME_EXEC_REVIEW_DATE].value);
			if (state == PROCESS_STATE_STAMPING_TASK && // incoming letters only block
				new Date(form["incoming-received-date"].value) > formInput)
				if (confirm("Confirm that the executive review date actually precedes " +
						"the date which the letter was received") == false) {
					alert("Please correct the executive review date");
					return false;
				}
			if (daysDifference(new Date(), formInput) > 4)
				if (confirm("Confirm that the executive review date should differ from " +
						"today's date by four calendar days") == false) {
					alert("Please correct the executive review date");
					return false;
				}
			query += "&" + CatCONST.QUERY_STRING_NAME_EXEC_REVIEW_DATE + "=" + sharePointDateFormat(formInput);
			if (confirm("Confirm that the letter has been edited for dating and numbering") == false) {
				alert("Remember to save your email message with link to open this form when ready");
				return false;
			}
			break;
		case PROCESS_STATE_SIGNED_AND_MAILED: // state == 10
		case PROCESS_STATE_INITIATE_OUTGOING_SIGNED_AND_MAILED: // state == 108
			if (confirm("Confirm that the signature of the letter is complete and it is mailed") == false) {
				alert("Remember to save your email message with link to open this form when ready");
				return false;
			}
			if ((formInput = form[CatCONST.QUERY_STRING_NAME_MAILING_DATE].value) == "") {
				alert("A mailing date must be entered");
				return false;
			}
			query += "&" + CatCONST.QUERY_STRING_NAME_MAILING_DATE + "=" + formInput;
			document.getElementById("larger-container").style.display = "none";
			document.getElementById("submit-message").style.display = "block";
			window.scrollTo(0, 0);
			doUpload(state).then(function (response) {
				query += "&" + CatCONST.QUERY_STRING_NAME_UPLOADED_FILES + "=" +
					EnhancedJsonStringify(response);
				browserStorage.setItem("actionScreen", EnhancedJsonStringify(actionScreenStruct));
				location.assign(location.origin + location.pathname + "?" + query);
			}).catch(function (response) {
				emailDeveloper({
					subject: "Catch block called in FormSubmit.js",
					body: "<p>Catch block called in FormSubmit.js, formSubmit function, " +
						"doUpload() promise</p>" +
						"<p style=\"white-space:pre;font:normal 10pt monospace;\">response object:<br />" +
						EnhancedJsonStringify(response, null, "  ") + "</p>"
				});
				finishError({
					mainMessage: "Error occurred while uploading scanned file",
					itemId: itemId,
					systemMessage: response.responseMessage
				});
			});
			return;
		case PROCESS_STATE_ANALYST_REDO_REQUIRED: // state == 7
		case PROCESS_STATE_INITIATE_OUTGOING_ANALYST_REDO_REQUIRED: // state == 103
			if (form["redo-ready"].checked == false) {
				alert("You must acknowledge that the outgoing materials are ready.");
				return false;
			}
			break;
		case PROCESS_STATE_INITIATE_OUTGOING_START: // state == 100
			if (getCheckedRadioValue(form.initiateDecision) == "reject") {
				if (form.rejectReason.value.length <= 4)
					return alert("A reason for rejection is expected to be more than 4 characters long");
				return $.ajax({
					url: location.origin + pathname(location.pathname) + "/CATemailTemplates.html",
					method: "GET",
					success: function (responseText, responseStatus, reqObj) {
						var bodyText,
							emailService = new SPUtilityEmailService({
								server: SERVER_NAME,
								site: SITE_NAME
							});
						bodyText = (new DOMParser().parseFromString(responseText,
							"text/html")).getElementById("rejected-initiated-letter-form").outerHTML;
						bodyText = bodyText.replace(/\$\$href\$\$/g,
							location.hostname +
							location.pathname.substr(0, location.pathname.lastIndexOf("/")) +
							"/CATLetterInitiate.html?" +
							location.search.substr(location.search.search(
								CatCONST.QUERY_STRING_NAME_ASSIGNED_ANALYST_INITIATE)) +
							"&rejectReason=" + encodeURIComponent(form.rejectReason.value)
						);
						emailService.sendEmail({
							//                                       To: CORRESPONDENCE_COORDINATOR_EMAIL_ADDRESS,
							To: urlSearchParams.get("emailAddress"),
							Subject: "Issue with Initiated Letter Request",
							Body: bodyText
						});
						return document.getElementById("userEmailed").style.display = "block";
					},
					error: function (reqObj, responseStatus, errorThrown) {
						return emailDeveloper({
							subject: "CRITICAL ERROR IN CAT: Email Templates HTML File Not Obtained",
							body: "<p>The CATemailtempates.html file could not be obtained for emailing</p>" +
								"<p style=\"white-space:pre;font:normal 10pt monospace;\">response object:<br />" +
								EnhancedJsonStringify(response, null, "  ") + "</p>"
						});
					}
				});
			}
			query +=
				CatCONST.QUERY_STRING_NAME_LETTER_SUBJECT_INITIATE + "=" +
				encodeURIComponent(form[CatCONST.QUERY_STRING_NAME_LETTER_SUBJECT_INITIATE].value) +
				"&" + CatCONST.QUERY_STRING_NAME_VENDOR_INITIATE + "=" +
				location.search.match(new RegExp(
					CatCONST.QUERY_STRING_NAME_VENDOR_INITIATE + "=([^&]+)"))[1] +
				"&" + CatCONST.QUERY_STRING_NAME_ASSIGNED_ANALYST_INITIATE + "=" +
				encodeURIComponent(
					decodeURIComponent(location.search.match(new RegExp(
						CatCONST.QUERY_STRING_NAME_ASSIGNED_ANALYST_INITIATE + "=([^&]+)"))[1]) + "," +
					decodeURIComponent(location.search.match("emailAddress=([^&]+)")[1])
				) +
				"&" + CatCONST.QUERY_STRING_NAME_ASSIGNED_UNIT_INITIATE + "=" +
				location.search.match(new RegExp(
					CatCONST.QUERY_STRING_NAME_ASSIGNED_UNIT_INITIATE + "=([^&]+)"))[1];
			selectObj = form[CatCONST.QUERY_STRING_NAME_INIT_CORRESPONDENCE_TYPE];
			if (selectObj.selectedIndex < 0)
				formInput = selectObj.options[0].value;
			else
				formInput = selectObj.options[selectObj.selectedIndex].value;
			query += "&" + CatCONST.QUERY_STRING_NAME_INIT_CORRESPONDENCE_TYPE + "=" +
				encodeURIComponent(formInput);
			break;
	}
	location.assign(location.origin + location.pathname + "?" + query);
}
// findCheckedOutFiles() determines if a user has clicked OK on the submit and still has files that are checked
//    out of the document library. It opens a new (child) window, gives links to checked out files with
//    instruction to check them in before re-submitting
// @param itemId integer corresponds to the item in the Master Log SP list being controlled
// @return boolean true: no checked out files found for item; false: checked out files found
// @pre SP list item containing (or not) associated documents in Master Log doc lib with incoming and outgoing item
//     IDs accessible by REST queries
// @post
function findCheckedOutFiles(itemId, state, form, query) {
	var ICorrespondenceList = new IListRESTRequest({
			server: SERVER_NAME,
			site: SITE_NAME,
			listName: CORRESPONDENCE_LIST_NAME,
			listItemEntityType: CORRESPONDENCE_LIST_ITEM_ENTITY_TYPE_FULL_NAME
		}),
		ICorrespondenceLibrary = new IListRESTRequest({
			server: SERVER_NAME,
			site: SITE_NAME,
			listName: CORRESPONDENCE_LIBRARY_NAME,
			relativeUrl: CORRESPONDENCE_LIBRARY_RELATIVE_URL,
			listItemEntityType: CORRESPONDENCE_LIBRARY_ITEM_ENTITY_TYPE_FULL_NAME
		});
	// get the doc lib incoming and outgoing ids
	ICorrespondenceList.getListItemData({
		itemId: itemId,
		query: "$select=" +
			CatCONST.CORRESPONDENCE_LIST_DOCLIB_INCOMING_IDS_COLUMN_NAME + "," +
			CatCONST.CORRESPONDENCE_LIST_DOCLIB_OUTGOING_IDS_COLUMN_NAME
	}).then(function (response) {
		var checkedIDs = [],
			data = response.responseJSON.d;
		data = (data[CatCONST.CORRESPONDENCE_LIST_DOCLIB_INCOMING_IDS_COLUMN_NAME] +
			(data[CatCONST.CORRESPONDENCE_LIST_DOCLIB_OUTGOING_IDS_COLUMN_NAME] != null ?
				"," + data[CatCONST.CORRESPONDENCE_LIST_DOCLIB_OUTGOING_IDS_COLUMN_NAME] : "")).split(",");
		for (var i = 0; i < data.length; i++) {
			if (data[i] == "N/A")
				continue;
			checkedIDs.push(new RSVP.Promise(function (resolve, reject) {
				ICorrespondenceLibrary.getDocLibItemFileAndMetaData({
					itemId: data[i]
				}).then(function (response) {
					var libData = response.responseJSON.d;
					if (libData.CheckOutType == 0) // checked out
						resolve({
							url: libData.ServerRelativeUrl,
							name: libData.Name
						});
					else
						resolve(null);
				}).catch(function (response) {
					emailDeveloper({
						subject: "Caught getDocLibItemFileAndMetaData() call in findCheckedOutFiles()",
						body: "<p>Error occurred while looking for checked-out files</p>" +
							"<p style=\"white-space:pre;font:normal 10pt monospace;\">response object:<br />" +
							EnhancedJsonStringify(response, null, "  ") + "</p>"
					});
					finishError({
						mainMessage: "This error occurred while attempting to look " +
							"for checked-out files",
						itemId: itemId,
						systemMessage: response.responseMessage
					})
				});
			}));
		}
		RSVP.all(checkedIDs).then(function (response) {
			var j, divNode, url, responseCount = 0,
				bodyNode, pNode, node, node2, trNode, tdNode,
				checkOutform = document.getElementById("checkout-form"),
				tBodyNode = document.getElementById("checkOutDocTbody");
			for (var i = 0; i < response.length; i++)
				if (response[i] != null)
					break;
			if (i == response.length)
				return formSubmit(state, form, query);
			document.getElementById("checkout-form").style.display = "block";
			for (i = j = 0; i < response.length; i++) {
				if (response[i] == null)
					continue;
				responseCount++;
				trNode = document.createElement("tr");
				if (i % 2 == 1)
					trNode.className = "even";
				tBodyNode.appendChild(trNode);
				tdNode = document.createElement("td");
				tdNode.className = "linktd";
				trNode.appendChild(tdNode);
				node = document.createElement("button");
				node.type = "button";
				node.className = "link-as-button";
				url = "https://mdsd" + response[i].url + "?web=1";
				node.addEventListener("click", function () {
					var cw;
					if ((cw = open(url, "_blank", "top=50,left=50,height=800,width=1400")) == null) {
						document.getElementById("popup-issue").style.display = "block";
						cw.moveBy(0, -50);
						cw.resizeBy(0, 100);
					}
				}, false);
				node.appendChild(document.createTextNode(basename(response[i].name)));
				tdNode.appendChild(node);
				tdNode = document.createElement("td");
				tdNode.className = "actiontd";
				trNode.appendChild(tdNode);
				node = document.createElement("input");
				node.type = "radio";
				node.name = "ID-" + j;
				node.value = "CI:" + basename(response[i].name);
				tdNode.appendChild(node);
				node = document.createElement("label");
				node.appendChild(document.createTextNode("Check In"));
				tdNode.appendChild(node);
				node = document.createElement("input");
				node.type = "radio";
				node.name = "ID-" + j++;
				node.value = "DCO:" + basename(response[i].name);
				tdNode.appendChild(node);
				node = document.createElement("label");
				node.appendChild(document.createTextNode("Discard Check Out"));
				tdNode.appendChild(node);
			} // hidden input
			checkOutform.itemCount.value = responseCount;
			node = document.getElementById("larger-container");
			node.addEventListener("click", captureDocClicksCheckOut, true);
			document.addEventListener("keydown", function (evt) {
				if (evt.key == "Escape")
					closeCheckOutWin();
			}, false);
		}).catch(function (response) {
			// TODO  RSVP.all() catch block
			emailDeveloper({
				subject: "Caught RSVP.all() call in findCheckedOutFiles()",
				body: "<p>Error occurred while looking for checked-out files</p>" +
					"<p style=\"white-space:pre;font:normal 10pt monospace;\">response object:<br />" +
					EnhancedJsonStringify(response, null, "  ") + "</p>"
			});
			finishError({
				mainMessage: "This error occurred while attempting to look " +
					"for checked-out files",
				itemId: itemId,
				systemMessage: response.responseMessage
			});
		});
	}).catch(function (response) {
		// TODO  getListItemData() catch block
		emailDeveloper({
			subject: "Caught getListItemData() call in findCheckedOutFiles()",
			body: "<p>Error occurred while looking for checked-out files</p>" +
				"<p style=\"white-space:pre;font:normal 10pt monospace;\">response object:<br />" +
				EnhancedJsonStringify(response, null, "  ") + "</p>"
		});
		finishError({
			mainMessage: "This error occurred while attempting to look " +
				"for checked-out files",
			itemId: itemId,
			systemMessage: response.responseMessage
		});
	});
}

function captureDocClicksCheckOut(evt) {
	evt.stopPropagation();
}

function processCheckOuts() {
	var i, processes = [],
		value,
		formObj = document.getElementById("checkout-form"),
		checkOutProcessDiv = document.getElementById("checked-out-docs-list"),
		counts = formObj.itemCount.value,
		actions = [],
		ICorrespondenceLibrary = new IListRESTRequest({
			server: SERVER_NAME,
			site: SITE_NAME,
			listName: CORRESPONDENCE_LIBRARY_NAME,
			relativeUrl: CORRESPONDENCE_LIBRARY_RELATIVE_URL,
			listItemEntityType: CORRESPONDENCE_LIBRARY_ITEM_ENTITY_TYPE_FULL_NAME
		});
	for (i = 0; i < counts; i++) {
		if ((value = getCheckedRadioValue(formObj["ID-" + i])) == null) {
			alert("Some items have no selection\n" +
				"A selection of 'Check In' or 'Discard Check Out' must be made");
			return false;
		}
		actions.push(value.split(":"));
	}
	for (i = 0; i < actions.length; i++)
		processes.push(new RSVP.Promise(function (resolve, reject) {
			if (actions[i][0] == "CI")
				ICorrespondenceLibrary.checkInDocLibItem({
					itemName: actions[i][1]
				}).then(function (response) {
					resolve(i + 1);
				}).catch(function (response) {
					reject(actions[i][1]);
				});
			else // "DCO"
				ICorrespondenceLibrary.discardCheckOutDocLibItem({
					itemName: actions[i][1]
				}).then(function (response) {
					resolve(i + 1);
				}).catch(function (response) {
					reject(actions[i][1]);
				});
		}));
	RSVP.all(processes).then(function (response) {
		checkOutProcessDiv.style.borderColor = "LimeGreen";
		document.getElementById("ckout-process-button").style.display = "none";
		document.getElementById("complete-process").style.display = "block";
		document.getElementById("close-button").style.display = "block";
	}).catch(function (response) {
		var i, text = "";
		if (response.length)
			for (i = 0; i < response.length; i++)
				text += "Item " + (i + 1) + ": " + response[i];
		else if (typeof response == "string")
			text = response;
		emailDeveloper({
			subject: "Problem with User Attempting to Dispose of Checked Out Documents",
			body: text
		});
		document.getElementById("ckout-process-button").style.display = "none";
		document.getElementById("complete-process-errors").style.display = "block";
		document.getElementById("close-button-container").style.display = "block";
	});
}

function closeCheckOutWin() {
	document.getElementById("checkout-form").style.display = "none";
	document.getElementById("larger-container").removeEventListener("click", captureDocClicksCheckOut, true);
}

function blockerWarning(fromProcessClick) {
	return location.assign("BlockerWarning.html?fromProcessClick=true");
}

function loadBlockerInfo() {
	var node = document.getElementById("blocker-info");
	node.src = "BlockerWarning.html"
	node.style.display = "block";
}