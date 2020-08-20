"use strict";
// CATProcessForm.js
/* *******************************************************************************************************
 **************************  PROCESS FORM ACTION   ******************************************************
 ******************************************************************************************************* */
/** @function processFormAction()
 *    main entry into the code that takes form input and processes it as follows
 *   1. routes to file uploading main processes during steps involving file uploading
 *   2. typically reads and updates Master Log list item metadata to control state of the workflow
 *   3. routes at end of processing to the entry point for emailing the next role in the workflow
 */
var testIndex = 1;

function processFormAction() {
	// get list and item
	var itemId = parseInt(urlSearchParams.get(CatCONST.QUERY_STRING_NAME_ITEM_ID)),
		stateInUrl = parseInt(urlSearchParams.get(CatCONST.QUERY_STRING_NAME_STATE)),
		unit = null,
		listItemData = null,
		stateInUrl,
		ICorrespondenceList = new IListRESTRequest({
			server: SERVER_NAME,
			site: SITE_NAME,
			listName: CORRESPONDENCE_LIST_NAME,
			listItemEntityType: CORRESPONDENCE_LIST_ITEM_ENTITY_TYPE_FULL_NAME,
			debugging: true,
			loggingFunction: "updateListItem"
		}),
		ICorrespondenceLibrary = new IListRESTRequest({
			server: SERVER_NAME,
			site: SITE_NAME,
			listName: CORRESPONDENCE_LIBRARY_NAME,
			relativeUrl: CORRESPONDENCE_LIBRARY_RELATIVE_URL,
			listItemEntityType: CORRESPONDENCE_LIBRARY_ITEM_ENTITY_TYPE_FULL_NAME,
			linkToDocumentContentTypeId: CORRESPONDENCE_LINK_TO_DOCUMENT_CONTENT_TYPE_ID
		});
	if (isNaN(itemId) == false) { // item ID exists
		ICorrespondenceList.getListItemData({
			itemId: itemId
		}).then(function (response) {
			var itemState, notifyStatus, skipUR, itemData;
			listItemData = response.responseJSON.d;
			itemState = parseInt(listItemData[CatCONST.CORRESPONDENCE_LIST_STATE_COLUMN_NAME]);
			notifyStatus = listItemData[CatCONST.CORRESPONDENCE_LIST_WORKFLOW_URL_HOLDER_COLUMN_NAME];
			// post-submit refresh error catch
			if (environment == "PROD" && location.search.search(/allowrefresh=true/) < 0)
				if (itemState > stateInUrl ||
					((stateInUrl == PROCESS_STATE_UNIT_CHIEF_REVIEW_TASK ||
							stateInUrl == PROCESS_STATE_UNIT_CHIEF_REVIEW_REDO_REQUIRED ||
							stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW ||
							stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW_REDO_REQUIRED) &&
						(notifyStatus && notifyStatus.search(/MR2/) >= 0) ||
						(notifyStatus && notifyStatus.search(/MR1-notified/) >= 0)) ||
					((stateInUrl == PROCESS_STATE_SECTION_CHIEF_REVIEW_TASK ||
							stateInUrl == PROCESS_STATE_SECTION_CHIEF_REVIEW_REDO_REQUIRED ||
							stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW ||
							stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW_REDO_REQUIRED) &&
						(notifyStatus && notifyStatus.search(/notified/) >= 0))) {
					return document.getElementById("postsubmit-refresh-error").style.display = "block";
				}
			unit = listItemData[CatCONST.CORRESPONDENCE_LIST_ASSIGNED_UNIT_COLUMN_NAME];
			itemData = listItemData[CatCONST.CORRESPONDENCE_LIST_ITEM_DATA_COLUMN_NAME];
			ICorrespondenceList.updateListItem({
				itemId: itemId,
				body: formatRESTBody([
					[CatCONST.CORRESPONDENCE_LIST_PRIOR_ITEM_DATA_COLUMN_NAME, itemData]
				])
			}).then(function (response) {
				var specialData = JSON.parse(itemData);
				continueProcessForm({
					stateInUrl: stateInUrl,
					itemId: itemId,
					listItemData: listItemData,
					unit: unit,
					iCorrespondenceLibrary: ICorrespondenceLibrary,
					iCorrespondenceList: ICorrespondenceList,
					specialData: specialData,
				});
			}).catch(function (response) {
				emailDeveloper({
					subject: "catch block access in .updateListItem() " +
						"of processFormAction() block for Item=" + itemId,
					body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +
						JSON.stringify(response, null, "  ") + "</p>"
				});
			});
		}).catch(function (response) {
			emailDeveloper({
				subject: "List Item Data Retrieval Catch Block Error in ProcessForm for Item=" + itemId,
				body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +
					EnhancedJsonStringify(response, null, "  ") + "</p>"
			});
		});
	}
	else if (stateInUrl == PROCESS_STATE_CREATE_INCOMING_TASK ||
		stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_START)
		if (environment == "DEV" || location.search.search(/allowrefresh=true/) >= 0)
			continueProcessForm({
				stateInUrl: stateInUrl,
				iCorrespondenceLibrary: ICorrespondenceLibrary,
				iCorrespondenceList: ICorrespondenceList,
			});
		else {
			// need to check for post-submission refresh action
			// check on letter subject
			ICorrespondenceList.getAllListItemsOptionalQuery({
				query: "$filter=" + CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME + " eq '" +
					urlSearchParams.get(CatCONST.QUERY_STRING_NAME_LETTER_SUBJECT) + "'"
			}).then(function (response) {
				if (response.responseJSON.d.results.length == 0)
					continueProcessForm({
						stateInUrl: stateInUrl,
						iCorrespondenceLibrary: ICorrespondenceLibrary,
						iCorrespondenceList: ICorrespondenceList,
					});
				else
					return document.getElementById("postsubmit-refresh-error").style.display = "block";
			}).catch(function (response) {});
		}
	else
	;
	// TODO   Report error if not valid state or no item ID
}

function continueProcessForm(parameters) {
	var theForm, analyst, analystData, vendor, reaction,
		docLibIds, renamings, role,
		doclibItemMetaData,
		specialData = parameters.specialData,
		stateInUrl = parameters.stateInUrl,
		itemId = parameters.itemId,
		listItemData = parameters.listItemData,
		unit = parameters.unit,
		iCorrespondenceLibrary = parameters.iCorrespondenceLibrary,
		iCorrespondenceList = parameters.iCorrespondenceList;
	theForm = document.getElementById("control");
	theForm.style.display = "block";
	document.getElementById("submit-controls").style.display = "none";
	if ((actionScreenStruct = browserStorage.getItem("actionScreen")) == null)
		actionScreenStruct = {
			listType: "ul",
			listId: "action-taken-list",
			items: []
		};
	else
		actionScreenStruct = JSON.parse(actionScreenStruct);
	///////////////// Eliminate this code block below in production
	if (environment == "TEST" &&
		(stateInUrl == PROCESS_STATE_CREATE_INCOMING_TASK ||
			stateInUrl == PROCESS_STATE_DRAFT_RESPONSE_TASK || // state == 6
			stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_ANALYST_UPLOAD))
		emailDeveloper({
			subject: "User PROCESSED CAT Page In Test Environment",
			body: "<p>User " + currentUserInfo.firstName + " " +
				currentUserInfo.lastName + " ran a process in state '" +
				(stateInUrl == PROCESS_STATE_CREATE_INCOMING_TASK ?
					"Incoming Task" :
					(stateInUrl == PROCESS_STATE_DRAFT_RESPONSE_TASK ?
						"Draft Response Upload" : "Initiate Letter Upload")) +
				"'</p>"
		});
	//////////////////// end eliminate    
	switch (stateInUrl) {
		case PROCESS_STATE_ASSIGN_UNIT_TASK: // state == 1
			parameters.pageTitle = "Assign Unit";
			unit = urlSearchParams.get(CatCONST.QUERY_STRING_NAME_ASSIGNED_UNIT);
			getUnitReviewersData(
				unit
			).then(function (response) {
				// there should not be multiple units but just one!
				if (response.length > 1)
					throw "unexpected return of info of more than one reviewer";
				iCorrespondenceList.updateListItem({
					itemId: itemId,
					body: formatRESTBody([
						[CatCONST.CORRESPONDENCE_LIST_ASSIGNED_UNIT_COLUMN_NAME, unit],
						[CatCONST.CORRESPONDENCE_LIST_UNIT_CHIEF_NAME_COLUMN_NAME, response[0].usedName],
						[CatCONST.CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME, response[0].emailAddress],
						[CatCONST.CORRESPONDENCE_LIST_STATE_COLUMN_NAME, PROCESS_STATE_ASSIGN_ANALYST_TASK],
						[CatCONST.CORRESPONDENCE_LIST_STATUS_COLUMN_NAME, STATUS_UNIT_ASSIGNED]
					])
				}).then(function (response) {
					verifyUpdate(itemId, iCorrespondenceList, [{
						fld: CatCONST.CORRESPONDENCE_LIST_ASSIGNED_UNIT_COLUMN_NAME,
						val: unit
					}]).then(function (response) {
						actionScreenStruct.items.push({
							textClass: "action-taken-list-item",
							text: "Incoming letter <span class=\"letter-number\">" +
								listItemData[CatCONST.CORRESPONDENCE_LIST_INCOMING_LETTER_NUMBER_COLUMN_NAME] +
								"</span> with subject <span class=\"letter-subject\">" +
								listItemData[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME] +
								"</span> successfully updated to indicate incoming letter assigned to " +
								"<span class=\"assigned-unit\">" + unit + "</span>"
						});
						parameters.stateConfirm = PROCESS_STATE_ASSIGN_ANALYST_TASK;
						endProcessForm(parameters);
					}).catch(function (response) {
						// failed verify
						emailDeveloper({
							subject: "verifyUpdate() caught: CATProcessForm.js:PROCESS_STATE_ASSIGN_UNIT_TASK",
							body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +
								EnhancedJsonStringify(response, null, "  ") + "</p>"
						});
					});
				}).catch(function (response) {
					// TODO: must handle error here
					emailDeveloper({
						subject: "updateListItem() caught: CATProcessForm.js:PROCESS_STATE_ASSIGN_UNIT_TASK",
						body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +
							EnhancedJsonStringify(response, null, "  ") + "</p>"
					});
					actionScreenStruct.items.push({
						textClass: "action-taken-list-item",
						text: "<span class=\"red\">ERROR</span> in updating the Master Log " +
							"list for incoming letter <span class=\"letter-number\">" +
							listItemData[CatCONST.CORRESPONDENCE_LIST_INCOMING_LETTER_NUMBER_COLUMN_NAME] +
							"</span> with subject <span class=\"letter-subject\">" +
							listItemData[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME] +
							"</span><br />HTTP Status Code = <span class=\"http-status-code\">" +
							status + "</span>"
					});
				});
			}).catch(function (response) {
				// TODO: must handle error here
				emailDeveloper({
					subject: "Process Form Assign Unit caught getUnitReviewersData() problem",
					body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +
						EnhancedJsonStringify(response, null, "  ") + "</p>"
				});
			});
			break;
		case PROCESS_STATE_ASSIGN_ANALYST_TASK: // state == 2
			parameters.pageTitle = "Assign Analyst";
			// the query value has 3 comma-separated parts: analyst used name, email address, unit`
			analyst = urlSearchParams.get(CatCONST.QUERY_STRING_NAME_ASSIGNED_ANALYST).split(",");
			unit = analyst[2];
			specialData.analystId = analyst[3];
			specialData = JSON.stringify(specialData);
			listItemData[CatCONST.CORRESPONDENCE_LIST_ASSIGNED_UNIT_COLUMN_NAME] = unit;
			iCorrespondenceList.updateListItem({
				itemId: itemId,
				body: formatRESTBody([
					[CatCONST.CORRESPONDENCE_LIST_ASSIGNED_UNIT_COLUMN_NAME, unit],
					[CatCONST.CORRESPONDENCE_LIST_ASSIGNED_ANALYST_COLUMN_NAME, analyst[0]],
					[CatCONST.CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME, analyst[1]],
					[CatCONST.CORRESPONDENCE_LIST_ASSIGNED_DATE_COLUMN_NAME,
						sharePointDateFormat(new Date())
					],
					[CatCONST.CORRESPONDENCE_LIST_ITEM_DATA_COLUMN_NAME, specialData],
					[CatCONST.CORRESPONDENCE_LIST_STATE_COLUMN_NAME, PROCESS_STATE_DECIDE_RESPONSE_TASK],
					[CatCONST.CORRESPONDENCE_LIST_STATUS_COLUMN_NAME, STATUS_ANALYST_ASSIGNED]
				])
			}).then(function (response) {
				verifyUpdate(itemId, iCorrespondenceList, [{
						fld: CatCONST.CORRESPONDENCE_LIST_ASSIGNED_UNIT_COLUMN_NAME,
						val: unit
					},
					{
						fld: CatCONST.CORRESPONDENCE_LIST_ASSIGNED_ANALYST_COLUMN_NAME,
						val: analyst[0]
					},
					{
						fld: CatCONST.CORRESPONDENCE_LIST_ITEM_DATA_COLUMN_NAME,
						val: specialData
					},
					{
						fld: CatCONST.CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME,
						val: analyst[1]
					},
					{
						fld: CatCONST.CORRESPONDENCE_LIST_ASSIGNED_DATE_COLUMN_NAME,
						val: sharePointDateFormat(new Date())
					}
				]).then(function (response) {
					actionScreenStruct.items.push({
						textClass: "action-taken-list-item",
						text: "Incoming letter <span class=\"letter-number\">" +
							listItemData[CatCONST.CORRESPONDENCE_LIST_INCOMING_LETTER_NUMBER_COLUMN_NAME] +
							"</span> with subject <span class=\"letter-subject\">" +
							listItemData[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME] +
							"</span> successfully updated to indicate incoming letter assigned to " +
							"<span class=\"assigned-analyst\">" + analyst[0] + "</span>" +
							" of <span class=\"assigned-unit f105\">" +
							listItemData[CatCONST.CORRESPONDENCE_LIST_ASSIGNED_UNIT_COLUMN_NAME] + "</span>"
					});
					parameters.stateConfirm = PROCESS_STATE_DECIDE_RESPONSE_TASK;
					endProcessForm(parameters);
				}).catch(function (response) {
					emailDeveloper({
						subject: "Process Form Assign Analyst caught verifyUpdate() problem",
						body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +
							EnhancedJsonStringify(response, null, "  ") + "</p>"
					});
				});
			}).catch(function (response) {
				// TODO: must handle error here
				actionScreenStruct.items.push({
					textClass: "action-taken-list-item",
					text: "<span class=\"red\">ERROR</span> in updating the Master Log " +
						"list for incoming letter <span class=\"letter-number\">" +
						listItemData[CatCONST.CORRESPONDENCE_LIST_INCOMING_LETTER_NUMBER_COLUMN_NAME] +
						"</span> with subject <span class=\"letter-subject\">" +
						listItemData[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME] +
						"</span><br />HTTP Status Code = <span class=\"http-status-code\">" +
						status + "</span>"
				});
			});
			break;
		case PROCESS_STATE_DECIDE_RESPONSE_TASK: // state == 3
			parameters.pageTitle = "Decide Response";
			reaction = urlSearchParams.get(CatCONST.QUERY_STRING_NAME_RESPONSE_DECISION).toUpperCase();
			if (reaction == "YES")
				iCorrespondenceList.updateListItem({
					itemId: itemId,
					body: formatRESTBody([
						[CatCONST.CORRESPONDENCE_LIST_RESPONSE_REQUIRED_COLUMN_NAME, reaction],
						[CatCONST.CORRESPONDENCE_LIST_STATE_COLUMN_NAME, PROCESS_STATE_DRAFT_RESPONSE_TASK],
						[CatCONST.CORRESPONDENCE_LIST_STATUS_COLUMN_NAME, STATUS_ANALYST_DECIDED_YES]
					])
				}).then(function (response) {
					verifyUpdate(itemId, iCorrespondenceList, [{
						fld: CatCONST.CORRESPONDENCE_LIST_RESPONSE_REQUIRED_COLUMN_NAME,
						val: reaction
					}]).then(function (response) {
						actionScreenStruct.items.push({
							textClass: "action-taken-list-item",
							text: "Incoming letter <span class=\"letter-number\">" +
								listItemData[CatCONST.CORRESPONDENCE_LIST_INCOMING_LETTER_NUMBER_COLUMN_NAME] +
								"</span> with subject <span class=\"letter-subject\">" +
								listItemData[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME] +
								"</span> successfully updated to indicate decision to respond to " +
								"incoming letter is <span class=\"burgundy caps f105 Tahoma\">" +
								reaction + "</span>"
						});
						parameters.stateConfirm = PROCESS_STATE_DRAFT_RESPONSE_TASK;
						endProcessForm(parameters);
					}).catch(function (response) {
						// TODO: must handle error here
					});
				}).catch(function (response) {
					// TODO: must handle error here
					// error in updating list response for YES response required
					actionScreenStruct.items.push({
						textClass: "action-taken-list-item",
						text: "<span class=\"burgundy\">ERROR</span> in updating the Master Log " +
							"list for incoming letter <span class=\"letter-number\">" +
							listItemData[CatCONST.CORRESPONDENCE_LIST_INCOMING_LETTER_NUMBER_COLUMN_NAME] +
							"</span> with subject <span class=\"letter-subject\">" +
							listItemData[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME] +
							"</span><br />HTTP Status Code = <span class=\"http-status-code\">" +
							status + "</span>"
					});
				});
			else if (reaction == "NO") { // analyst decision == No
				getWorkflowUnitReviewer({
					unit: unit
				}).then(function (response) {
					iCorrespondenceList.updateListItem({
						itemId: itemId,
						body: formatRESTBody([
							[CatCONST.CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME, response.email],
							[CatCONST.CORRESPONDENCE_LIST_RESPONSE_REQUIRED_COLUMN_NAME, reaction],
							[CatCONST.CORRESPONDENCE_LIST_STATE_COLUMN_NAME, PROCESS_STATE_UNIT_CHIEF_REEVALUATE],
							[CatCONST.CORRESPONDENCE_LIST_STATUS_COLUMN_NAME, STATUS_ANALYST_DECIDED_NO]
						])
					}).then(function (response) {
						verifyUpdate(itemId, iCorrespondenceList, [{
							fld: CatCONST.CORRESPONDENCE_LIST_RESPONSE_REQUIRED_COLUMN_NAME,
							val: reaction
						}]).then(function (response) {
							actionScreenStruct.items.push({
								textClass: "action-taken-list-item",
								text: "Incoming letter <span class=\"letter-number\">" +
									listItemData[CatCONST.CORRESPONDENCE_LIST_INCOMING_LETTER_NUMBER_COLUMN_NAME] +
									"</span> with subject <span class=\"letter-subject\">" +
									listItemData[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME] +
									"</span> successfully updated to indicate decision to respond to " +
									"incoming letter is <span class=\"burgundy caps f105 Tahoma\">" +
									reaction + "</span>"
							});
							parameters.stateConfirm = PROCESS_STATE_UNIT_CHIEF_REEVALUATE;
							endProcessForm(parameters);
						}).catch(function (response) {
							actionScreenStruct.items.push({
								textClass: "action-taken-list-item",
								text: "<span class=\"burgundy\">ERROR</span> in updating the Master Log " +
									"list for incoming letter <span class=\"letter-number\">" +
									listItemData[CatCONST.CORRESPONDENCE_LIST_INCOMING_LETTER_NUMBER_COLUMN_NAME] +
									"</span> with subject <span class=\"letter-subject\">" +
									listItemData[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME] +
									"</span><br />HTTP Status Code = <span class=\"http-status-code\">" +
									status + "</span>"
							});
						});
					}).catch(function (response) {
						// TODO: must handle error here
						// error in updating list response for NO response required
						actionScreenStruct.items.push({
							textClass: "action-taken-list-item",
							text: "<span class=\"burgundy\">ERROR</span> in updating the Master Log " +
								"list for incoming letter <span class=\"letter-number\">" +
								listItemData[CatCONST.CORRESPONDENCE_LIST_INCOMING_LETTER_NUMBER_COLUMN_NAME] +
								"</span> with subject <span class=\"letter-subject\">" +
								listItemData[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME] +
								"</span><br />HTTP Status Code = <span class=\"http-status-code\">" +
								status + "</span>"
						});
					});
				}).catch(function (response) {
					// TODO: must handle error here
					// error in getting email address
					actionScreenStruct.items.push({
						textClass: "action-taken-list-item",
						text: "<span class=\"burgundy\">ERROR</span> in updating the Master Log " +
							"list for incoming letter <span class=\"letter-number\">" +
							listItemData[CatCONST.CORRESPONDENCE_LIST_INCOMING_LETTER_NUMBER_COLUMN_NAME] +
							"</span> with subject <span class=\"letter-subject\">" +
							listItemData[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME] +
							"</span><br />HTTP Status Code = <span class=\"http-status-code\">" +
							status + "</span>"
					});
				});
			}
			else
				actionScreenStruct.items.push({
					textClass: "action-taken-list-item",
					text: "<span class=\"burgundy\">ERROR</span> Unexpected error in reading " +
						"the form for item with letter subject " +
						"<span class=\"letter-subject\">" +
						listItemData[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME] +
						"</span>"
				});
			break;
		case PROCESS_STATE_UNIT_CHIEF_REEVALUATE: // state == 20
			parameters.pageTitle = "Confirm That No Response is Required";
			reaction = urlSearchParams.get(CatCONST.QUERY_STRING_NAME_UNIT_CHIEF_REEVALUATION_DECISION);
			getEmailAddressFromFullName(
				listItemData[CatCONST.CORRESPONDENCE_LIST_ASSIGNED_ANALYST_COLUMN_NAME]
			).then(function (response) {
				var newState, status;
				if (parameters.skipUR && parameters.skipUR == true)
					role = listItemData[CatCONST.CORRESPONDENCE_LIST_SECTION_CHIEF_NAME_COLUMN_NAME];
				else
					role = listItemData[CatCONST.CORRESPONDENCE_LIST_UNIT_CHIEF_NAME_COLUMN_NAME];
				getEmailAddressFromFullName(role).then(function (response) {
					var tempstring;
					if (reaction == "confirm") {
						reaction = "no";
						newState = PROCESS_STATE_NO_RESPONSE_REQUIRED_COMPLETE;
						status = STATUS_NO_RESPONSE_NECESSARY;
						tempstring = "response letter is <strong>not</strong> required";
					}
					else {
						reaction = "yes";
						newState = PROCESS_STATE_ANALYST_RESPONSE_DIRECTED;
						status = STATUS_ANALYST_RESPONSE_REQUIRED;
						tempstring = "response letter <strong>is</strong> required";
					}
					iCorrespondenceList.updateListItem({
						itemId: itemId,
						body: formatRESTBody([
							[CatCONST.CORRESPONDENCE_LIST_RESPONSE_REQUIRED_COLUMN_NAME, reaction],
							[CatCONST.CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME, response],
							[CatCONST.CORRESPONDENCE_LIST_STATE_COLUMN_NAME, newState],
							[CatCONST.CORRESPONDENCE_LIST_STATUS_COLUMN_NAME, status]
						]),
						passthru: response
					}).then(function (response) {
						verifyUpdate(itemId, iCorrespondenceList, [{
								fld: CatCONST.CORRESPONDENCE_LIST_RESPONSE_REQUIRED_COLUMN_NAME,
								val: reaction
							},
							{
								fld: CatCONST.CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME,
								val: response.passthru
							}
						]).then(function (response) {
							actionScreenStruct.items.push({
								textClass: "action-taken-list-item",
								text: "Incoming letter <span class=\"letter-number\">" +
									listItemData[CatCONST.CORRESPONDENCE_LIST_INCOMING_LETTER_NUMBER_COLUMN_NAME] +
									"</span> with subject <span class=\"letter-subject\">" +
									listItemData[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME] +
									"</span> successfully updated to indicate decision of " +
									((parameters.skipUR && parameters.skipUR) == true ? "Section" :
										"Unit") + " Chief that a " + tempstring
							});
							parameters.stateConfirm = newState;
							endProcessForm(parameters);
						}).catch(function (response) {
							emailDeveloper({
								subject: "updateListItem() caught: CATProcessForm.js:PROCESS_STATE_ASSIGN_UNIT_TASK",
								body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +
									EnhancedJsonStringify(response, null, "  ") + "</p>"
							});
						});
					}).catch(function (response) {
						// TODO: must handle error here
						actionScreenStruct.items.push({
							textClass: "action-taken-list-item",
							text: "<span class=\"burgundy\">ERROR</span> in updating the Master Log " +
								"list for incoming letter <span class=\"letter-number\">" +
								listItemData[CatCONST.CORRESPONDENCE_LIST_INCOMING_LETTER_NUMBER_COLUMN_NAME] +
								"</span> with subject <span class=\"letter-subject\">" +
								listItemData[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME] +
								"</span><br />HTTP Status Code = <span class=\"http-status-code\">" +
								status + "</span>"
						});
						emailDeveloper({
							subject: "updateListItem() caught: CATProcessForm.js:PROCESS_STATE_UNIT_CHIEF_REEVALUATE",
							body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +
								EnhancedJsonStringify(response, null, "  ") + "</p>"
						});
					});
				}).catch(function (response) {
					// TODO: must handle error here
					// error getting unit chief email info
					emailDeveloper({
						subject: "getEmailAddressFromFullName(UnitChief) caught: CATProcessForm.js:PROCESS_STATE_UNIT_CHIEF_REEVALUATE",
						body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +
							EnhancedJsonStringify(response, null, "  ") + "</p>"
					});
				});
			}).catch(function (response) {
				// TODO: must handle error here
				// error getting analyst email info
				emailDeveloper({
					subject: "getEmailAddressFromFullName(Analyst) caught: CATProcessForm.js:PROCESS_STATE_UNIT_CHIEF_REEVALUATE",
					body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +
						EnhancedJsonStringify(response, null, "  ") + "</p>"
				});
			});
			break;
		case PROCESS_STATE_DRAFT_RESPONSE_TASK: // state == 4
		case PROCESS_STATE_ANALYST_RESPONSE_DIRECTED: // state == 21
		case PROCESS_STATE_INITIATE_OUTGOING_ANALYST_UPLOAD: // state == 102
			parameters.pageTitle = "Draft Response Letter Upload";
			listItemCRUD(parameters);
			break;
		case PROCESS_STATE_ANALYST_REDO_REQUIRED: // state == 7
		case PROCESS_STATE_INITIATE_OUTGOING_ANALYST_REDO_REQUIRED: // state == 103
			parameters.pageTitle = "Analyst Re-Do";
			getWorkflowUnitReviewer(unit).then(function (response) {
				var newState, newStatus;
				if (listItemData[CatCONST.CORRESPONDENCE_LIST_UNIT_CHIEF_NAME_COLUMN_NAME] != "skipped") {
					if (stateInUrl == PROCESS_STATE_ANALYST_REDO_REQUIRED)
						newState = PROCESS_STATE_UNIT_CHIEF_REVIEW_REDO_REQUIRED;
					else
						newState = PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW_REDO_REQUIRED;
					newStatus = STATUS_UNIT_CHIEF_REDO_NEEDED;
				}
				else {
					if (stateInUrl == PROCESS_STATE_ANALYST_REDO_REQUIRED)
						newState = PROCESS_STATE_SECTION_CHIEF_REVIEW_REDO_REQUIRED;
					else
						newState = PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW_REDO_REQUIRED;
					newStatus = STATUS_SECTION_CHIEF_REDO_NEEDED;
				}
				iCorrespondenceList.updateListItem({
					itemId: itemId,
					body: formatRESTBody([
						[CatCONST.CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME, response.email],
						[CatCONST.CORRESPONDENCE_LIST_WORKFLOW_URL_HOLDER_COLUMN_NAME, ""],
						[CatCONST.CORRESPONDENCE_LIST_STATE_COLUMN_NAME, newState],
						[CatCONST.CORRESPONDENCE_LIST_STATUS_COLUMN_NAME, newStatus]
					])
				}).then(function (response) {
					actionScreenStruct.items.push({
						textClass: "action-taken-list-item",
						text: "System updated and next manager notified for re-review"
					});
					parameters.stateConfirm = newState;
					endProcessForm(parameters);
				}).catch(function (response) {
					emailDeveloper({
						subject: ".updateListItem() caught in ANALYST REDO on Item=" + itemId,
						body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +
							EnhancedJsonStringify(response, null, "  ") + "</p>"
					});
				});
			}).catch(function (response) {
				emailDeveloper({
					subject: "getItemAnalyst() caught in ANALYST REDO on Item=" + itemId,
					body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +
						EnhancedJsonStringify(response, null, "  ") + "</p>"
				});
				actionScreenStruct.items.push({
					className: "action-error-list-title",
					title: "Update Error",
					listType: "ul",
					items: []
				});
				actionScreenStruct.items[0].items.push({
					textClass: "action-error-detail-list-item",
					text: "<div><p>There was an error retrieving the email address of " +
						"the Unit Chief for unit <b>" + unit + "</b>. Check with " +
						"the Coordinator that the MDSD Personnel list is current." +
						"<br /><br />A message was sent to the Coordinator and developer."
				});
				endProcessForm(parameters);
			});
			break;
		case PROCESS_STATE_UNIT_CHIEF_REVIEW_TASK: // state == 7
		case PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW: // state == 103
		case PROCESS_STATE_UNIT_CHIEF_REVIEW_REDO_REQUIRED: // state == 10
		case PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW_REDO_REQUIRED: // state == 106
			parameters.pageTitle = "Unit Chief Review";
			reaction = urlSearchParams.get(CatCONST.QUERY_STRING_NAME_MGR1_REVIEWER);
			if (reaction == "approve")
				getWorkflowSectionReviewer(
					unit
				).then(function (response) {
					var SectionReviewer = response,
						newState, status = STATUS_UNIT_CHIEF_REVIEW_DONE;
					if (SectionReviewer == "skip review") {
						if (stateInUrl == PROCESS_STATE_UNIT_CHIEF_REVIEW_TASK ||
							stateInUrl == PROCESS_STATE_UNIT_CHIEF_REVIEW_REDO_REQUIRED)
							newState = PROCESS_STATE_STAMPING_TASK;
						else if (stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW ||
							stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW_REDO_REQUIRED)
							newState = PROCESS_STATE_INITIATE_OUTGOING_STAMPING_TASK;
					}
					else { // setting state when there is a section chief to review
						if (stateInUrl == PROCESS_STATE_UNIT_CHIEF_REVIEW_TASK)
							newState = PROCESS_STATE_SECTION_CHIEF_REVIEW_TASK;
						else if (stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW)
							newState = PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW;
						else if (stateInUrl == PROCESS_STATE_UNIT_CHIEF_REVIEW_REDO_REQUIRED) {
							if (specialData.ManagerReject == "M2R") {
								newState = PROCESS_STATE_SECTION_CHIEF_REVIEW_REDO_REQUIRED;
								status = STATUS_SECTION_CHIEF_REDO_NEEDED;
							}
							else
								newState = PROCESS_STATE_SECTION_CHIEF_REVIEW_TASK;
						}
						else {
							if (specialData.ManagerReject == "M2R") {
								newState = PROCESS_STATE_SECTION_CHIEF_REVIEW_REDO_REQUIRED;
								status = STATUS_SECTION_CHIEF_REDO_NEEDED;
							}
							else
								newState = PROCESS_STATE_SECTION_CHIEF_REVIEW_TASK;
						}
					}
					iCorrespondenceList.updateListItem({
						itemId: itemId,
						body: formatRESTBody([
							[CatCONST.CORRESPONDENCE_LIST_SECTION_CHIEF_NAME_COLUMN_NAME, response.reviewer],
							[CatCONST.CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME, response.email],
							[CatCONST.CORRESPONDENCE_LIST_STATE_COLUMN_NAME, newState],
							[CatCONST.CORRESPONDENCE_LIST_STATUS_COLUMN_NAME, status]
						])
					}).then(function (response) {
						var tempstring;
						if (stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW ||
							stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW_REDO_REQUIRED) {
							tempstring = "Outgoing letter with subject <span class=\"letter-subject\">" +
								listItemData[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME] +
								"</span> successfully updated to indicate unit chief review decision is to " +
								"<span style=\"color:rgb(139,0,0);font-weight:bold;font-size:110%;\">" + reaction + "</span>";
						}
						else {
							tempstring = "Incoming letter <span class=\"letter-number\">";
							tempstring += listItemData[CatCONST.CORRESPONDENCE_LIST_INCOMING_LETTER_NUMBER_COLUMN_NAME] +
								"</span> with subject <span class=\"letter-subject\">" +
								listItemData[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME] +
								"</span> successfully updated to indicate unit chief review decision for response letter is to " +
								"<span style=\"color:rgb(139,0,0);font-weight:bold;font-size:110%;\">" + reaction + "</span>";
						}
						actionScreenStruct.items.push({
							text: tempstring
						});
						parameters.stateConfirm = newState;
						endProcessForm(parameters);
					}).catch(function (response) {
						emailDeveloper({
							subject: ".updateListItem() caught in APPROVE block of Unit Chief Review on Item=" + itemId,
							body: "<p style=\"font:normal 10pt monospace;\">" +
								"state = " + getStatusFromState(stateInUrl) + "<br />" +
								"response object:<br />" +
								EnhancedJsonStringify(response, null, "  ") + "</p>"
						});
					});
				}).catch(function (response) {
					emailDeveloper({
						subject: ".getWorkflowSectionReviewer() caught in APPROVE block of Unit Chief Review on Item=" + itemId,
						body: "<p style=\"font:normal 10pt monospace;\">" +
							"state = " + getStatusFromState(stateInUrl) + "<br />" +
							"response object:<br />" +
							EnhancedJsonStringify(response, null, "  ") + "</p>"
					});
				});
			else { // reject analyst letter by Unit Chief
				getItemAnalyst(
					specialData.analystId
				).then(function (response) {
					var managerRejectStatus = specialData.ManagerReject;
					if (managerRejectStatus == null || managerRejectStatus == "") {
						managerRejectStatus = "M1R";
						parameters.pageTitle = "Unit Chief Review";
					}
					else if (managerRejectStatus.search(/M1R/) < 0) {
						managerRejectStatus += ";M1R";
						parameters.pageTitle = "Unit Chief Re-Review";
					}
					if (stateInUrl == PROCESS_STATE_UNIT_CHIEF_REVIEW_REDO_REQUIRED) {
						if (response == null || response.length == 0)
							stateInUrl = PROCESS_STATE_UNIT_CHIEF_REVIEW_TASK;
					}
					else if (stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW_REDO_REQUIRED) {
						if (response == null || response.length == 0)
							stateInUrl = PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW;
					}
					if (stateInUrl == PROCESS_STATE_UNIT_CHIEF_REVIEW_TASK)
						newState = PROCESS_STATE_ANALYST_REDO_REQUIRED;
					else if (stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW)
						newState = PROCESS_STATE_INITIATE_OUTGOING_ANALYST_REDO_REQUIRED;
					else if (stateInUrl == PROCESS_STATE_UNIT_CHIEF_REVIEW_REDO_REQUIRED)
						newState = PROCESS_STATE_ANALYST_REDO_REQUIRED;
					else
						newState = PROCESS_STATE_INITIATE_OUTGOING_ANALYST_REDO_REQUIRED;
					specialData.ManagerReject = managerRejectStatus;
					iCorrespondenceList.updateListItem({
						itemId: itemId,
						body: formatRESTBody([
							[CatCONST.CORRESPONDENCE_LIST_REVIEWER_COMMENT_COLUMN_NAME,
								urlSearchParams.get(CatCONST.QUERY_STRING_NAME_MGR1_COMMENT)
							],
							[CatCONST.CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME, response.emailAddress],
							// M1R = manager 1 rejected 
							[CatCONST.CORRESPONDENCE_LIST_ITEM_DATA_COLUMN_NAME,
								EnhancedJsonStringify(specialData)
							],
							[CatCONST.CORRESPONDENCE_LIST_STATE_COLUMN_NAME, newState],
							[CatCONST.CORRESPONDENCE_LIST_STATUS_COLUMN_NAME, STATUS_ANALYST_REDO_NEEDED]
						])
					}).then(function (response) {
						var tempstring;
						if (stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW ||
							stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW_REDO_REQUIRED) {
							tempstring = "Outgoing letter with subject <span class=\"letter-subject\">" +
								listItemData[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME] +
								"</span> successfully updated to indicate unit chief review decision is to " +
								"<span style=\"color:rgb(139,0,0);font-weight:bold;font-size:110%;\">" + reaction + "</span>";
						}
						else {
							tempstring = "Incoming letter <span class=\"letter-number\">";
							tempstring += listItemData[CatCONST.CORRESPONDENCE_LIST_INCOMING_LETTER_NUMBER_COLUMN_NAME] +
								"</span> with subject <span class=\"letter-subject\">" +
								listItemData[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME] +
								"</span> successfully updated to indicate unit chief review decision for response letter is to " +
								"<span style=\"color:rgb(139,0,0);font-weight:bold;font-size:110%;\">" + reaction + "</span>";
						}
						actionScreenStruct.items.push({
							text: tempstring
						});
						parameters.stateConfirm = newState;
						endProcessForm(parameters);
					}).catch(function (response) {
						if (stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW_REDO_REQUIRED ||
							stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW)
							tempstring = "Error in updating outgoing letter with subject <span class=\"letter-subject\">" +
							listItemData.getJsonData([CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME]) +
							"</span><p>Contact the Correspondence Coordinator</p>";
						else
							tempstring = "Error in updating response letter with for incoming letter with " +
							"subject <span class=\"letter-subject\">" +
							listItemData.getJsonData([CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME]) +
							"</span><p>Contact the Correspondence Coordinator</p>";
						emailDeveloper({
							subject: ".updateListItem() caught, Item=" + itemId,
							body: "<p style=\"font:normal 10pt monospace;\">" +
								"state = " + getStatusFromState(stateInUrl) + "<br />" +
								tempstring +
								"response object:<br />" +
								EnhancedJsonStringify(response, null, "  ") + "</p>"
						});
					});
				}).catch(function (response) {
					emailDeveloper({
						subject: ".getItemAnalyst() caught, Item=" + itemId,
						body: "<p style=\"font:normal 10pt monospace;\">" +
							"state = " + getStatusFromState(stateInUrl) + "<br />" +
							"response object:<br />" +
							EnhancedJsonStringify(response, null, "  ") + "</p>"
					});
				});
			}
			break;
		case PROCESS_STATE_SECTION_CHIEF_REVIEW_TASK: // state == 8
		case PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW: // state == 106
		case PROCESS_STATE_SECTION_CHIEF_REVIEW_REDO_REQUIRED: // state == 53
		case PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW_REDO_REQUIRED: // state == 153
			if (stateInUrl == PROCESS_STATE_SECTION_CHIEF_REVIEW_TASK ||
				stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW)
				parameters.pageTitle = "Section Chief Review";
			else
				parameters.pageTitle = "Section Chief Re-Review";
			reaction = urlSearchParams.get(CatCONST.QUERY_STRING_NAME_MGR2_REVIEWER);
			if (reaction == "approve") {
				var newState;
				if (stateInUrl == PROCESS_STATE_SECTION_CHIEF_REVIEW_TASK ||
					stateInUrl == PROCESS_STATE_SECTION_CHIEF_REVIEW_REDO_REQUIRED)
					newState = PROCESS_STATE_STAMPING_TASK;
				else // initiated letters
					newState = PROCESS_STATE_INITIATE_OUTGOING_STAMPING_TASK;
				iCorrespondenceList.updateListItem({
					itemId: itemId,
					body: formatRESTBody([
						[CatCONST.CORRESPONDENCE_LIST_STATE_COLUMN_NAME, newState],
						[CatCONST.CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME, null],
						[CatCONST.CORRESPONDENCE_LIST_STATUS_COLUMN_NAME, STATUS_SECTION_CHIEF_REVIEW_DONE]
					])
				}).then(function (response) {
					var tempstring;
					if (stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW_REDO_REQUIRED ||
						stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW) {
						tempstring = "Outgoing letter with subject <span class=\"letter-subject\">" +
							listItemData[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME] +
							"</span> successfully updated to indicate section chief review decision is to " +
							"<span style=\"color:rgb(139,0,0);font-weight:bold;font-size:110%;\">" + reaction + "</span>";
					}
					else {
						tempstring = "Incoming letter <span class=\"letter-number\">";
						tempstring += listItemData[CatCONST.CORRESPONDENCE_LIST_INCOMING_LETTER_NUMBER_COLUMN_NAME] +
							"</span> with subject <span class=\"letter-subject\">" +
							listItemData[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME] +
							"</span> successfully updated to indicate section chief review decision for response letter is to " +
							"<span style=\"color:rgb(139,0,0);font-weight:bold;font-size:110%;\">" + reaction + "</span>";
					}
					actionScreenStruct.items.push({
						text: tempstring
					});
					parameters.stateConfirm = newState;
					endProcessForm(parameters);
				}).catch(function (response) {
					if (stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW_REDO_REQUIRED ||
						stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW)
						tempstring = "Error in updating outgoing letter with subject <span class=\"letter-subject\">" +
						listItemData[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME] +
						"</span><p>Contact the Correspondence Coordinator</p>";
					else
						tempstring = "Error in updating response letter with for incoming letter with " +
						"subject <span class=\"letter-subject\">" +
						listItemData[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME] +
						"</span><p>Contact the Correspondence Coordinator</p>";
					actionScreenStruct.items.push({
						text: tempstring
					});
					emailDeveloper({
						subject: ".updateListItem() caught in APPROVE block of Section Chief Review on Item=" + itemId,
						body: "<p style=\"font:normal 10pt monospace;\">" +
							"state = " + getStatusFromState(stateInUrl) + "<br />" +
							tempstring +
							"response object:<br />" +
							EnhancedJsonStringify(response, null, "  ") + "</p>"
					});
				});
			}
			else // (reaction == "reject") {
				// if reject, get analyst email address
				getItemAnalyst(
					listItemData[CatCONST.CORRESPONDENCE_LIST_ASSIGNED_ANALYST_COLUMN_NAME]
				).then(function (response) {
					var newState, rejectStatus = specialData.ManagerReject;
					if (rejectStatus == null || rejectStatus == "")
						rejectStatus = "M2R";
					else if (rejectStatus.search(/M2R/) < 0)
						rejectStatus += ";M2R";
					if (stateInUrl == PROCESS_STATE_SECTION_CHIEF_REVIEW_TASK ||
						stateInUrl == PROCESS_STATE_SECTION_CHIEF_REVIEW_REDO_REQUIRED)
						newState = PROCESS_STATE_ANALYST_REDO_REQUIRED;
					else // stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW
						newState = PROCESS_STATE_INITIATE_OUTGOING_ANALYST_REDO_REQUIRED;
					specialData.ManagerReject = rejectStatus;
					iCorrespondenceList.updateListItem({
						itemId: itemId,
						body: formatRESTBody([
							[CatCONST.CORRESPONDENCE_LIST_REVIEWER_COMMENT_COLUMN_NAME,
								urlSearchParams.get(CatCONST.QUERY_STRING_NAME_MGR2_COMMENT)
							],
							[CatCONST.CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME, response.email],
							// Manager 2 reject
							[CatCONST.CORRESPONDENCE_LIST_ITEM_DATA_COLUMN_NAME, EnhancedJsonStringify(specialData)],
							[CatCONST.CORRESPONDENCE_LIST_STATE_COLUMN_NAME, newState],
							[CatCONST.CORRESPONDENCE_LIST_STATUS_COLUMN_NAME, STATUS_ANALYST_REDO_NEEDED]
						])
					}).then(function (response) {
						var tempstring;
						if (stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW_REDO_REQUIRED ||
							stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW) {
							tempstring = "Outgoing letter with subject <span class=\"letter-subject\">" +
								listItemData[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME] +
								"</span> successfully updated to indicate section chief review decision is to " +
								"<span style=\"color:rgb(139,0,0);font-weight:bold;font-size:110%;\">" + reaction + "</span>";
						}
						else {
							tempstring = "Incoming letter <span class=\"letter-number\">";
							tempstring += listItemData[CatCONST.CORRESPONDENCE_LIST_INCOMING_LETTER_NUMBER_COLUMN_NAME] +
								"</span> with subject <span class=\"letter-subject\">" +
								listItemData[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME] +
								"</span> successfully updated to indicate section chief review decision for response letter is to " +
								"<span style=\"color:rgb(139,0,0);font-weight:bold;font-size:110%;\">" + reaction + "</span>";
						}
						actionScreenStruct.items.push({
							text: tempstring
						});
						parameters.stateConfirm = newState;
						endProcessForm(parameters);
					}).catch(function (response) {
						if (stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW_REDO_REQUIRED ||
							stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW)
							tempstring = "Error in updating outgoing letter with subject <span class=\"letter-subject\">" +
							listItemData[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME] +
							"</span><p>Contact the Correspondence Coordinator</p>";
						else
							tempstring = "Error in updating response letter with for incoming letter with " +
							"subject <span class=\"letter-subject\">" +
							listItemData[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME] +
							"</span><p>Contact the Correspondence Coordinator</p>";
						actionScreenStruct.items.push({
							text: tempstring
						});
						emailDeveloper({
							subject: ".updateListItem() caught in REJECT block of Section Chief Review on Item=" + itemId,
							body: "<p style=\"font:normal 10pt monospace;\">" +
								"state = " + getStatusFromState(stateInUrl) + "<br />" +
								tempstring +
								"response object:<br />" +
								EnhancedJsonStringify(response, null, "  ") + "</p>"
						});
					});
				}).catch(function (response) {
					emailDeveloper({
						subject: ".getEmailAddressFromFullName() caught in REJECT block of Section Chief Review on Item=" + itemId,
						body: "<p style=\"font:normal 10pt monospace;\">" +
							"state = " + getStatusFromState(stateInUrl) + "<br />" +
							"response object:<br />" +
							EnhancedJsonStringify(response, null, "  ") + "</p>"
					});
				});
			break;
		case PROCESS_STATE_STAMPING_TASK: // state == 12
		case PROCESS_STATE_INITIATE_OUTGOING_STAMPING_TASK: // state == 108
			//                  var query = new URLSearchParams(parameters.queryPart.join("&"));
			parameters.pageTitle = "Letter Number and Date Assignment";
			docLibIds = listItemData[CatCONST.CORRESPONDENCE_LIST_DOCLIB_OUTGOING_IDS_COLUMN_NAME];
			docLibIds = docLibIds.split(",");
			actionScreenStruct.items.push({
				title: "File Re-Naming",
				listType: "ul",
				className: "action-taken-list-title",
				items: []
			});
			renamings = [];
			for (var i = 0; i < docLibIds.length; i++) {
				renamings.push(new RSVP.Promise(function (resolve, reject) {
					iCorrespondenceLibrary.getDocLibItemFileAndMetaData({
						itemId: docLibIds[i]
					}).then(function (response) {
						var newFileName,
							doclibItemFileData = response.responseJSON.d,
							currentNameParts = doclibItemFileData.Name.match(
								CatCONST.OUTGOING_LETTER_AND_ATTACHMENT_NAME_PATTERN);
						// doclibItemMetaData given function scope
						doclibItemMetaData = doclibItemFileData.ListItemAllFields;
						if (parseInt(doclibItemMetaData[CatCONST.CORRESPONDENCE_LIBRARY_ASSOCIATED_LIST_ID_COLUMN_NAME]) !=
							parseInt(itemId))
							emailDeveloper({
								subject: "Stamping And Dating Issue",
								body: "<p>Data consistency error!</p>" +
									"<p>Doc lib item id " + doclibItemMetaData.Id +
									" had Associated Item ID = " +
									doclibItemMetaData[CatCONST.CORRESPONDENCE_LIBRARY_ASSOCIATED_LIST_ID_COLUMN_NAME] +
									" but currently process Master Log item ID = " + itemId + "</p>"
							});
						newFileName =
							urlSearchParams.get(CatCONST.QUERY_STRING_NAME_OUTGOING_LETTER_NUMBER) +
							(currentNameParts[2] == " " ? "" : currentNameParts[2]) +
							"-" + currentNameParts[3] + " " + currentNameParts[4];
						if (currentNameParts[2] == " " || currentNameParts[2] == "")
							parameters.scanname = encodeURIComponent(newFileName);
						iCorrespondenceLibrary.renameItemWithCheckout({
							itemId: doclibItemMetaData.Id,
							currentFileName: doclibItemFileData.Name,
							newFileName: newFileName,
							checkintype: "overwrite"
						}).then(function (response) {
							var oldName =
								doclibItemFileData.Name.replace(/ /g, "\u00a0").replace(/-/g, "\u2011"),
								newName = newFileName.replace(/ /g, "\u00a0").replace(/-/g, "\u2011");
							actionScreenStruct.items[0].items.push({
								textClass: "action-taken-list-item",
								text: "File re-naming from <span class=\"oldFile\">" +
									oldName + "</span> to <span class=\"newFile\">" +
									newName + "</span> successful"
							});
							resolve(newFileName);
						}).catch(function (response) {
							// TODO                                       // failed rename with file checkout                    
							actionScreenStruct.items[0].items.push({
								textClass: "action-taken-list-item",
								text: "Error in file re-naming from <span class=\"oldFile\">" +
									doclibItemFileData.Name + "</span> to <span class=\"newFile\">" +
									newFileName + "</span>",
							});
						});
					}).catch(function (response) {
						// failed getDocLibItemFileAndMetaData() at stamping step
					});
				}));
			}
			RSVP.all(renamings).then(function (response) {
				var i, j, docLibLinksValue, matches, markup = [],
					specialData = JSON.parse(
						listItemData[CatCONST.CORRESPONDENCE_LIST_ITEM_DATA_COLUMN_NAME]
					);
				for (i = 0; i < response.length; i++)
					markup.push("<a href=\"" + iCorrespondenceLibrary.relativeUrl + "/" +
						response[i] + "\">" + response[i] + "</a>" +
						(i < response.length - 1 ? "<br />" : ""));
				if (stateInUrl == PROCESS_STATE_STAMPING_TASK) {
					docLibLinksValue = listItemData[CatCONST.CORRESPONDENCE_LIST_DOCUMENT_LIBRARY_COLUMN_NAME];
					if ((matches = docLibLinksValue.match(/<a.*?>.*?<\/a>/g)) != null) {
						docLibLinksValue = "";
						for (i = 0; i < matches.length; i++)
							if (matches[i].search(/DF16/) >= 0)
								docLibLinksValue += matches[i] + "<br />";
						docLibLinksValue += markup.join("\n");
					}
					else
						docLibLinksValue = markup.join("\n");
				}
				else // state == OUTGOING LETTER STAMPING TASK
					docLibLinksValue = markup.join("\n");
				iCorrespondenceList.updateListItem({
					itemId: itemId,
					body: formatRESTBody([
						[CatCONST.CORRESPONDENCE_LIST_DOCUMENT_LIBRARY_COLUMN_NAME, docLibLinksValue],
						[CatCONST.CORRESPONDENCE_LIST_OUTGOING_VENDOR_COLUMN_NAME,
							urlSearchParams.get(CatCONST.QUERY_STRING_NAME_OUTGOING_VENDOR)
						],
						[CatCONST.CORRESPONDENCE_LIST_OUTGOING_LETTER_NUMBER_COLUMN_NAME,
							urlSearchParams.get(CatCONST.QUERY_STRING_NAME_OUTGOING_LETTER_NUMBER) + "-" +
							urlSearchParams.get(CatCONST.QUERY_STRING_NAME_OUTGOING_VENDOR)
						],
						// root name
						[CatCONST.CORRESPONDENCE_LIST_COMMENTS_COLUMN_NAME,
							parameters.scanname
						],
						[CatCONST.CORRESPONDENCE_LIST_EXEC_ROUTING_REVIEW_DATE_COLUMN_NAME,
							urlSearchParams.get(CatCONST.QUERY_STRING_NAME_EXEC_REVIEW_DATE)
						],
						[CatCONST.CORRESPONDENCE_LIST_STATE_COLUMN_NAME,
							(stateInUrl == PROCESS_STATE_STAMPING_TASK) ?
							PROCESS_STATE_SIGNED_AND_MAILED : PROCESS_STATE_INITIATE_OUTGOING_SIGNED_AND_MAILED
						],
						[CatCONST.CORRESPONDENCE_LIST_STATUS_COLUMN_NAME, STATUS_STAMPING_DONE],
						[CatCONST.CORRESPONDENCE_LIST_ITEM_DATA_COLUMN_NAME, EnhancedJsonStringify(specialData)]
					])
				}).then(function (response) {
					actionScreenStruct.items.push({
						title: "Update of Master Log List DOCUMENT LIBRARY column values",
						listType: "ul",
						className: "action-taken-list-title",
						items: []
					});
					actionScreenStruct.items[1].items.push({
						textClass: "action-taken-list-item",
						text: "Doc lib column of list updated to reflect file name change"
						// create these as document properties in the Word document
					});
					parameters.stateConfirm = (stateInUrl == PROCESS_STATE_STAMPING_TASK) ?
						PROCESS_STATE_SIGNED_AND_MAILED : PROCESS_STATE_INITIATE_OUTGOING_SIGNED_AND_MAILED;
					endProcessForm(parameters);
				}).catch(function (response) {
					actionScreenStruct.items[1].items.push({
						textClass: "action-taken-list-item",
						text: "Error in updating list to reflect file name change",
					});
				});
			}).catch(function (response) {
				actionScreenStruct.items[0].items.push({
					textClass: "action-taken-list-item",
					text: "Error in file re-naming from [old file name] to '" + newFileName + "'",
				});
			});
			break;
		case PROCESS_STATE_SIGNED_AND_MAILED: // state == 13
		case PROCESS_STATE_INITIATE_OUTGOING_SIGNED_AND_MAILED: // state == 109
			parameters.pageTitle = "Scanning & Mailing";
			urlSearchParams.append("Comments",
				listItemData[CatCONST.CORRESPONDENCE_LIST_COMMENTS_COLUMN_NAME]);
			listItemCRUD(parameters);
			break;
		case PROCESS_STATE_INITIATE_OUTGOING_START: // state == 100
			parameters.pageTitle = "Create Entry for [Initiated] Outgoing Letter"
			unit = urlSearchParams.get(CatCONST.QUERY_STRING_NAME_ASSIGNED_UNIT_INITIATE)
			analystData = urlSearchParams.get(CatCONST.QUERY_STRING_NAME_ASSIGNED_ANALYST_INITIATE).split(",");
			vendor = urlSearchParams.get(CatCONST.QUERY_STRING_NAME_VENDOR_INITIATE);
			if (vendor == "FA")
				vendor = ["FI", "ASO"];
			else
				vendor = [vendor];
			for (i = 0; i < vendor.length; i++) {
				iCorrespondenceList.createListItem({
					body: formatRESTBody([
						[CatCONST.CORRESPONDENCE_LIST_ASSIGNED_UNIT_COLUMN_NAME, unit],
						[CatCONST.CORRESPONDENCE_LIST_ASSIGNED_ANALYST_COLUMN_NAME, analystData[0]],
						[CatCONST.CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME, analystData[1]],
						[CatCONST.CORRESPONDENCE_LIST_ASSIGNED_DATE_COLUMN_NAME,
							sharePointDateFormat(new Date())
						],
						[CatCONST.CORRESPONDENCE_LIST_RESPONSE_REQUIRED_COLUMN_NAME, "N/A"],
						[CatCONST.CORRESPONDENCE_LIST_INCOMING_LETTER_NUMBER_COLUMN_NAME, "N/A"],
						[CatCONST.CORRESPONDENCE_LIST_INCOMING_RECEIVED_DATE_COLUMN_NAME, null],
						[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME,
							decodeURIComponent(urlSearchParams.get(CatCONST.QUERY_STRING_NAME_LETTER_SUBJECT_INITIATE)) +
							(vendor.length < 2 ? "" : " (" + vendor[i] + ")")
						],
						[CatCONST.CORRESPONDENCE_LIST_INCOMING_VENDOR_COLUMN_NAME, "N/A"],
						[CatCONST.CORRESPONDENCE_LIST_OUTGOING_VENDOR_COLUMN_NAME, vendor[i]],
						[CatCONST.CORRESPONDENCE_LIST_DOCLIB_INCOMING_IDS_COLUMN_NAME, "N/A"],
						[CatCONST.CORRESPONDENCE_LIST_STATE_COLUMN_NAME, PROCESS_STATE_INITIATE_OUTGOING_ANALYST_UPLOAD],
						[CatCONST.CORRESPONDENCE_LIST_STATUS_COLUMN_NAME, STATUS_NEW_ITEM_OUTGOING],
						[CatCONST.CORRESPONDENCE_LIST_CORRESPONDENCE_TYPE_COLUMN_NAME,
							decodeURIComponent(
								urlSearchParams.get(CatCONST.QUERY_STRING_NAME_INIT_CORRESPONDENCE_TYPE))
						]
					]),
					passthru: vendor[i]
				}).then(function (response) {
					// need to clone the parameters to be separate
					var parametersClone = Object.assign({}, parameters);
					parametersClone.listItemData = response.responseJSON.d;
					parametersClone.itemId = response.responseJSON.d.ID;
					console.log("\n\nparameters ==>\n" +
						EnhancedJsonStringify(parameters, null, "  ") +
						"\n\nparametersClone ==>\n" +
						EnhancedJsonStringify(parametersClone, null, "  "));
					actionScreenStruct.items.push({
						textClass: "action-taken-list-item",
						text: "An outgoing letter item (ID = " + parametersClone.itemId +
							") to the " + response.passthru + " vendor was successfully created in the Master Log list." +
							" An email was sent to the analyst to proceed with letter drafting and upload."
					});
					parametersClone.stateConfirm = PROCESS_STATE_INITIATE_OUTGOING_ANALYST_UPLOAD;
					endProcessForm(parametersClone);
				}).catch(function (response) {
					actionScreenStruct.items.push({
						textClass: "action-taken-list-item",
						text: "<span class=\"red\">ERROR</span> in creating outgoing " +
							"letter entry in the Master Log list. Please contact the developer." +
							response
					});
					endProcessForm(parameters);
				});
			}
			break;
		default:
			parameters.pageTitle = "New Letter Upload & List Entry Creation";
			listItemCRUD(parameters);
			break;
	}
}

function endProcessForm(parameters) {
	if (parameters.stateConfirm > -1) {
		console.log("endProcessForm():\n" +
			"parameters.listItemData[CatCONST.CORRESPONDENCE_LIST_ITEM_ID_COLUMN_NAME] => " +
			parameters.listItemData[CatCONST.CORRESPONDENCE_LIST_ITEM_ID_COLUMN_NAME]);
		parameters.iCorrespondenceList.updateListItem({
			itemId: parameters.listItemData[CatCONST.CORRESPONDENCE_LIST_ITEM_ID_COLUMN_NAME],
			body: formatRESTBody([
				[CatCONST.CORRESPONDENCE_LIST_STATE_CONFIRM_COLUMN_NAME, parameters.stateConfirm],
				[CatCONST.CORRESPONDENCE_LIST_LAST_ACTION_DATE_COLUMN_NAME, sharePointDateFormat(new Date())]
			]),
			passthru: parameters
		}).then(function (response) {
			console.log("\nendProcessForm()--updateListItem().then(response):" +
				"\nresponse.passthru.listItemData[CatCONST.CORRESPONDENCE_LIST_ITEM_ID_COLUMN_NAME] => " +
				response.passthru.listItemData[CatCONST.CORRESPONDENCE_LIST_ITEM_ID_COLUMN_NAME] +
				"\nparameters.listItemData[CatCONST.CORRESPONDENCE_LIST_ITEM_ID_COLUMN_NAME] => " +
				parameters.listItemData[CatCONST.CORRESPONDENCE_LIST_ITEM_ID_COLUMN_NAME]);
			document.getElementById("footing").style.display = "none";
			response.passthru.iCorrespondenceList.getListItemData({
				itemId: response.passthru.listItemData[CatCONST.CORRESPONDENCE_LIST_ITEM_ID_COLUMN_NAME],
				passthru: response.passthru
			}).then(function (response) {
				console.log("\nendProcessForm()--getListItemData().then(response):" +
					"\nresponse.passthru.listItemData[CatCONST.CORRESPONDENCE_LIST_ITEM_ID_COLUMN_NAME] => " +
					response.passthru.listItemData[CatCONST.CORRESPONDENCE_LIST_ITEM_ID_COLUMN_NAME] +
					"\nparameters.listItemData[CatCONST.CORRESPONDENCE_LIST_ITEM_ID_COLUMN_NAME] => " +
					parameters.listItemData[CatCONST.CORRESPONDENCE_LIST_ITEM_ID_COLUMN_NAME]);
				response.passthru.listItemData = response.responseJSON.d;
				//                                       console.log("\nendProcessForm()--getListItemData().then(response) AFTER ASSIGNING response to list item data:" +
				//                                       "\nresponse.passthru.listItemData[CatCONST.CORRESPONDENCE_LIST_ITEM_ID_COLUMN_NAME] => " +
				//                                       response.passthru.listItemData[CatCONST.CORRESPONDENCE_LIST_ITEM_ID_COLUMN_NAME]);
				formProcessActionEmail(response.passthru);
			}).catch(function (response) {
				// should not create a problem, but might
			});
		}).catch(function (response) {
			alert("Error updating status of Master Log Item. Contact Correspondence Coordinator and " +
				"note error is 'END PROCESS ACTION'");
		});
	}
	if (!parameters.actionListDone)
		finishSuccess(parameters);
	RunComplete = true;
	if (IntegrityErrors == true) {
		document.getElementById("error-container").style.display = "block";
		document.getElementById("data-integrity-error").style.display = "block";
	}
}

function verifyUpdate(itemId, iList, values) {
	return new RSVP.Promise(function (resolve, reject) {
		iList.getListItemData({
			itemId: itemId
		}).then(function (response) {
			var i, data, listItemData = response.responseJSON.d;
			for (i = 0; i < values.length; i++) {
				if ((data = listItemData[values[i].fld]).search(/\d{4}-\d{2}-\d{2}T.*Z/) >= 0)
					data = sharePointDateFormat(new Date(data));
				if (data != values[i].val)
					reject("Value for '" + values[i].fld + "' was stored as '" +
						data + "' instead of '" + values[i].val + "'");
			}
			if (i == values.length)
				resolve(true);
		}).catch(function (response) {
			reject(response);
		});
	});
}