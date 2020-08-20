// CATPresentForm.js
function addContainerText(nodeName, className, text) {
	var i, elements = document.getElementsByTagName(nodeName);
	for (i = 0; i < elements.length; i++)
		if (elements[i].className == className)
			elements[i].appendChild(document.createTextNode(text));
}
var subjectSet = false;

function fixSubject(obj, choiceObjName, subjectField) {
	var i, textval, words, option = null;
	if (obj.nodeName.toLowerCase() == "button") {
		textval = obj.form[subjectField].value;
		option = getCheckedRadioValue(obj.form[choiceObjName]);
	}
	else if (subjectSet == true)
		return;
	else
		textval = obj.value;
	if (textval == "")
		return;
	words = textval.match(/[^\s\-]+|\-/g);
	for (i = 0; i < words.length; i++)
		if (words[i] != "-" && words[i][0] != "(") {
			if (option == "upper")
				words[i] = words[i].toUpperCase();
			else
				words[i] = words[i][0] + words[i].substr(1).toLowerCase();
		}
	for (i = 0, textval = ""; i < words.length; i++) {
		textval += words[i];
		if (i < words.length - 1 && words[i + 1] != "-" && words[i] != "-")
			textval += " ";
	}
	obj.form[subjectField].value = textval;
	subjectSet = true;
}
/* *******************************************************************************************************
 **************************  SET UP FORM FOR STATE  *****************************************************
 ******************************************************************************************************* */
// presentForm() shows a form to be filled for teh correct state of correspondence flow and form
//     selection is state-dependent
// @param queryPart string the part of the URL that contains name=value pairs (after the '?' char)
// @return void
// @pre multiple states of an item in a SharePoint list with correct data determine what form and how it is initialized
// @post selects for display the correct HTML markup elements (text blocks) in CAT.html file to create a form for
//        user input
function presentForm() {
	// get list and item and state
	var itemId = null,
		unit = null,
		listItemData = null,
		stateInUrl = parseInt(urlSearchParams.get(CatCONST.QUERY_STRING_NAME_STATE)),
		ICorrespondenceList = new IListRESTRequest({
			server: SERVER_NAME,
			site: SITE_NAME,
			listName: CORRESPONDENCE_LIST_NAME,
			listEntityTypeName: CORRESPONDENCE_LIST_ITEM_ENTITY_TYPE_FULL_NAME
		}),
		ICorrespondenceLibrary = new IListRESTRequest({
			server: SERVER_NAME,
			site: SITE_NAME,
			listName: CORRESPONDENCE_LIBRARY_NAME,
			relativeUrl: CORRESPONDENCE_LIBRARY_RELATIVE_URL,
			listEntityTypeName: CORRESPONDENCE_LIBRARY_ITEM_ENTITY_TYPE_FULL_NAME
		});
	itemId = parseInt(urlSearchParams.get(CatCONST.QUERY_STRING_NAME_ITEM_ID));
	if (isNaN(itemId) == false) // item ID found
		ICorrespondenceList.getListItemData({
			itemId: itemId,
		}).then(function (response) {
			listItemData = response.responseJSON.d;
			dataCheck(listItemData);
			if (stateInUrl > listItemData[CatCONST.CORRESPONDENCE_LIST_STATE_COLUMN_NAME])
				return stateErrorPage();
			continuePresentForm({
				stateInUrl: stateInUrl,
				itemId: itemId,
				listItemData: listItemData,
				unit: listItemData[CatCONST.CORRESPONDENCE_LIST_ASSIGNED_UNIT_COLUMN_NAME],
				ICorrespondenceLibrary: ICorrespondenceLibrary,
				ICorrespondenceList: ICorrespondenceList
			});
		}).catch(function (response) {
			var node = document.getElementById("present-form-error-message");
			document.getElementById("present-form-error").style.display = "block";
			node.appendChild(document.createTextNode(
				response.httpStatus + ": " + response.responseMessage));
			node.appendChild(document.createElement("br"));
			node.appendChild(document.createTextNode("Item " + itemId));
		});
	else {
		if (isNaN(stateInUrl) == true) // no state value found
			stateInUrl = PROCESS_STATE_CREATE_INCOMING_TASK;
		continuePresentForm({
			stateInUrl: stateInUrl,
			itemId: itemId,
			listItemData: listItemData,
			unit: unit,
			ICorrespondenceLibrary: ICorrespondenceLibrary,
			ICorrespondenceList: ICorrespondenceList
		});
	}
}

function continuePresentForm(parameters) {
	var i, theForm, pageTitle, pageSubTitle, itemState, inLetterNumber, outLetterNumber, inVendor, outVendor,
		unit, analyst, incomingStatus, processState, nodes, pNode, node, node2,
		fieldsetElem, docLibIds, receivedDate, letterSubject, decision, textValue,
		incomingLetterFieldset, outgoingLetterFieldset, specialData,
		query = "",
		elements, extraForm,
		stateInUrl = parameters.stateInUrl,
		itemId = parameters.itemId,
		listItemData = parameters.listItemData,
		unit = parameters.unit,
		ICorrespondenceLibrary = parameters.ICorrespondenceLibrary,
		ICorrespondenceList = parameters.ICorrespondenceList;
	if (listItemData) {
		itemState = listItemData[CatCONST.CORRESPONDENCE_LIST_STATE_COLUMN_NAME];
		if (itemState > stateInUrl) {
			document.getElementById("footing").style.display = "none";
			document.getElementById("larger-container").style.display = "none";
			document.getElementById("error-container").style.display = "block";
			return document.getElementById("dated-form-use-error").style.display = "block";
		}
		inLetterNumber = listItemData[CatCONST.CORRESPONDENCE_LIST_INCOMING_LETTER_NUMBER_COLUMN_NAME];
		outLetterNumber = listItemData[CatCONST.CORRESPONDENCE_LIST_OUTGOING_LETTER_NUMBER_COLUMN_NAME];
		receivedDate = new Date(listItemData[CatCONST.CORRESPONDENCE_LIST_INCOMING_RECEIVED_DATE_COLUMN_NAME]);
		letterSubject = listItemData[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME];
		inVendor = listItemData[CatCONST.CORRESPONDENCE_LIST_INCOMING_VENDOR_COLUMN_NAME];
		outVendor = listItemData[CatCONST.CORRESPONDENCE_LIST_OUTGOING_VENDOR_COLUMN_NAME];
		unit = listItemData[CatCONST.CORRESPONDENCE_LIST_ASSIGNED_UNIT_COLUMN_NAME];
		analyst = listItemData[CatCONST.CORRESPONDENCE_LIST_ASSIGNED_ANALYST_COLUMN_NAME];
		if (itemState >= PROCESS_STATE_INITIATE_OUTGOING_START)
			incomingStatus = false;
		else {
			incomingStatus = true;
			docLibIds = listItemData[CatCONST.CORRESPONDENCE_LIST_DOCLIB_INCOMING_IDS_COLUMN_NAME].split(", ");
		}
		specialData = JSON.parse(
			listItemData[CatCONST.CORRESPONDENCE_LIST_ITEM_DATA_COLUMN_NAME]
		);
		addContainerText("span", "in-letter-id", inLetterNumber);
		addContainerText("span", "receivedDateInHeader", sharePointDateFormat(receivedDate));
		addContainerText("span", "letter-subject", letterSubject);
		addContainerText("span", "in-vendor", inVendor);
		addContainerText("span", "out-vendor", outVendor);
		addContainerText("span", "analyst-name", analyst);
		addContainerText("span", "out-letter-id", outLetterNumber);
	}
	document.getElementById("templates-folder").setAttribute("href", TEMPLATES_FOLDER);
	theForm = document.getElementById("control");
	theForm.style.display = "block";
	processState = getProcessState(stateInUrl);
	// depending on state, ensure text for incoming letters vs outgoing letters is displayed
	elements = ["p", "span"];
	nodes = document.getElementsByTagName("p");
	for (var j = 0; j < elements.length; j++) {
		nodes = document.getElementsByTagName(elements[j]);
		for (i = 0; i < nodes.length; i++)
			if (processState.incoming == true) {
				if (nodes[i].className.search(/for-incoming/) >= 0)
					if (processState.redo == true)
						if (nodes[i].className.search(/redo/) >= 0)
							nodes[i].style.display = "";
						else
							nodes[i].style.display = "none"; // initial state
				else if (nodes[i].className.search(/redo/) < 0)
					nodes[i].style.display = ""; // not redo but incoming
				else
				; // node not labeled 'for-incoming'
			}
		else { // processState.incoming == false
			if (nodes[i].className.search(/for-outgoing/) >= 0)
				if (processState.redo == true)
					if (nodes[i].className.search(/redo/) >= 0)
						nodes[i].style.display = "";
					else
						nodes[i].style.display = "none"; // initial state
			else
				nodes[i].style.display = ""; // not redo but outgoing
			else
			;
		}
	}
	///////////////// Eliminate this code block below in production
	if (environment == "TEST" &&
		(stateInUrl == PROCESS_STATE_CREATE_INCOMING_TASK ||
			stateInUrl == PROCESS_STATE_DRAFT_RESPONSE_TASK || // state == 6
			stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_ANALYST_UPLOAD))
		emailDeveloper({
			subject: "User Opens CAT Page In Test Environment",
			body: "<p>User " + currentUserInfo.firstName + " " +
				currentUserInfo.lastName + " was presented form in state '" +
				(stateInUrl == PROCESS_STATE_CREATE_INCOMING_TASK ?
					"Incoming Task" :
					(stateInUrl == PROCESS_STATE_DRAFT_RESPONSE_TASK ?
						"Draft Response Upload" : "Initiate Letter Upload")) +
				"'</p>"
		});
	//////////////////// end eliminate
	switch (stateInUrl) {
		case PROCESS_STATE_CREATE_INCOMING_TASK: // state == 0
			pageTitle = "Create Entry for Incoming Letter";
			theForm.incomingLetterNumber.required = true;
			theForm.receivedDate.required = true;
			if (incomingAsLinks == true)
				pageSubTitle = "DMS Links Upload Interface";
			else
				pageSubTitle = "File Upload Interface";
			if (incomingAsLinks == true)
				node = document.getElementById("incoming-url-inputs-block");
			else
				node = document.getElementById("file-upload-controls");
			document.getElementById("new-item-fieldset").appendChild(node);
			node.style.display = "block";
			ICorrespondenceList.getFieldChoices({
				fieldName: CatCONST.CORRESPONDENCE_LIST_CORRESPONDENCE_TYPE_COLUMN_NAME,
			}).then(function (response) {
				var i, node, node2, choices = response.fieldValues;
				node = document.getElementById("correspondenceType");
				for (i = 0; i < choices.length; i++) {
					if (choices[i] == "?")
						continue;
					node2 = document.createElement("option");
					node2.appendChild(document.createTextNode(choices[i]));
					node.appendChild(node2);
				}
				document.getElementById("new-item").style.display = "block";
			}).catch(function (response) {
				// TODO
				emailDeveloper({
					subject: "PROCESS_STATE_CREATE_INCOMING_TASK: getFieldChoices() caught",
					body: "<p>Item ID: " + itemID + "</p>"
				});
			});
			document.getElementById("attachment-limit").appendChild(
				document.createTextNode(CatCONST.INCOMING_ATTACHMENT_LIMIT));
			/*  EXCISABLE FROM PRODUCTION == START
			if (environment != "PROD") {
			var node = document.getElementById("notice")
			node.innerHTML = document.getElementById("create-entry-testing-notice").innerHTML;
			node.style.display = "block";
			}
			EXCISABLE FROM PRODUCTION == END */
			break;
		case PROCESS_STATE_ASSIGN_UNIT_TASK: // state == 1
			pageTitle = "Assign Unit";
			document.getElementById("assign-unit").style.display = "block";
			// Get the units names from the Personnel list
			getUnits().then(function (unitNames) {
				unitNames.sort();
				fieldsetElem = document.getElementById("unit-fieldset");
				for (i = 0; i < unitNames.length; i++) {
					pNode = document.createElement("span");
					pNode.className = "unit-options";
					fieldsetElem.appendChild(pNode);
					node = document.createElement("input");
					node.type = "radio";
					node.name = CatCONST.QUERY_STRING_NAME_ASSIGNED_UNIT;
					node.value = unitNames[i];
					pNode.appendChild(node);
					pNode.appendChild(document.createTextNode(unitNames[i]));
				}
			}).catch(function (response) {
				// TODO                            
				emailDeveloper({
					subject: "PROCESS_STATE_ASSIGN_UNIT_TASK: getUnits() caught",
					body: "<p>Item ID: " + itemId + "</p>"
				});
			});
			incomingLetterFieldset = document.getElementById("incoming-letter-links");
			break;
		case PROCESS_STATE_ASSIGN_ANALYST_TASK: // state == 2
			pageTitle = "Assign Analyst";
			node = document.getElementById("assign-error-mailto");
			node.href = "mailto:MDSDCorrespondence@dhcs.ca.gov?" +
				"subject=Request%20To%20Reassign%20Unit%20For%20Incoming%20Letter" +
				"&body=Letter%20in%20Master%20Log%20item%20ID%20=%20" + itemId +
				"%20should%20be%20reassigned,%20please";
			document.getElementById("assign-analyst").style.display = "block";
			//  REST call for analysts for unit
			getUnitsAnalysts({
				units: unit
			}).then(function (response) {
				var j, unitAnalysts;
				// if assigner has more than one unit, then get all analysts of all units for the assigner
				//  response is array of this object: {unit:<unitname>,analysts:[{analystinfo},...]}
				fieldsetElem = document.getElementById("select-analyst-fieldset");
				for (i = 0; i < response.length; i++) {
					unitAnalysts = [];
					for (j = 0; j < response[i].unitAnalysts.length; j++)
						unitAnalysts.push(
							response[i].unitAnalysts[j].usedName + "," +
							response[i].unitAnalysts[j].emailAddress + "," +
							response[i].unitName + "," +
							response[i].unitAnalysts[j].id
						);
					if (response.length > 1) {
						node = document.createElement("p");
						node.appendChild(document.createTextNode(response[i].unitName));
						node.className = "assign-analyst-sub-heading-unit";
						fieldsetElem.appendChild(node);
					}
					for (j = 0; j < unitAnalysts.length; j++) {
						pNode = document.createElement("span");
						pNode.className = "unit-analyst-options";
						fieldsetElem.appendChild(pNode);
						node = document.createElement("input");
						node.type = "radio";
						node.name = CatCONST.QUERY_STRING_NAME_ASSIGNED_ANALYST;
						node.value = unitAnalysts[j];
						pNode.appendChild(node);
						pNode.appendChild(document.createTextNode(unitAnalysts[j].split(",")[0]));
					}
					if (i < response.length - 1) {
						node = document.createElement("hr");
						node.className = "dividerLine";
						fieldsetElem.appendChild(node);
					}
				}
			}).catch(function (response) {
				emailDeveloper({
					subject: "PROCESS_STATE_ASSIGN_ANALYST_TASK: getAnalystsOfAssigner() caught",
					body: "<p>Item ID: " + itemId + "</p>"
				});
			});
			incomingLetterFieldset = document.getElementById("incoming-letter-links");
			break;
		case PROCESS_STATE_DECIDE_RESPONSE_TASK: // state == 3
			pageTitle = "Decide Response";
			document.getElementById("analyst-response-decision").style.display = "block";
			incomingLetterFieldset = document.getElementById("incoming-letter-links");
			break;
		case PROCESS_STATE_UNIT_CHIEF_REEVALUATE: // state == 4
			pageTitle = "Confirm That No Response is Required";
			incomingLetterFieldset = document.getElementById("incoming-letter-links");
			document.getElementById("unit-chief-reevaluate").style.display = "block";
			break;
		case PROCESS_STATE_DRAFT_RESPONSE_TASK: // state == 4
		case PROCESS_STATE_ANALYST_RESPONSE_DIRECTED: // state == 6
		case PROCESS_STATE_INITIATE_OUTGOING_ANALYST_UPLOAD: // state == 102
			document.getElementById("analyst-letter-draft").style.display = "block";
			node = document.getElementById("file-upload-controls");
			document.getElementById("yes-decision").appendChild(node);
			node.style.display = "block";
			pageTitle = "Draft Response";
			pageSubTitle = "File Upload Interface";
			if (stateInUrl != PROCESS_STATE_INITIATE_OUTGOING_ANALYST_UPLOAD) {
				decision = listItemData[CatCONST.CORRESPONDENCE_LIST_RESPONSE_REQUIRED_COLUMN_NAME];
				if (decision.toLowerCase() == "yes") {
					document.getElementById("yes-decision").style.display = "block";
					if (stateInUrl == PROCESS_STATE_ANALYST_RESPONSE_DIRECTED) {
						document.getElementById("unit-chief-decision-necessary-prompt").style.display = "block";
						document.getElementById("state-4-text").style.display = "none";
					}
					else
						document.getElementById("unit-chief-decision-necessary-prompt").style.display = "none";
				}
				else if (response.toLowerCase() == "no")
					document.getElementById("no-decision").style.display = "block";
				incomingLetterFieldset = document.getElementById("incoming-letter-links");
			}
			else if (stateInUrl == PROCESS_STATE_ANALYST_RESPONSE_DIRECTED) {
				document.getElementById("unit-chief-decision-necessary-prompt").style.display = "block";
				document.getElementById("yes-decision").style.display = "block";
			}
			else { // initiate
				pageTitle = "Draft Outgoing Letter";
				document.getElementById("yes-decision").style.display = "block";
				document.getElementById("init-outgoing-upload-prompt").style.display = "block";
			}
			break;
		case PROCESS_STATE_ANALYST_REDO_REQUIRED: // state == 7
		case PROCESS_STATE_INITIATE_OUTGOING_ANALYST_REDO_REQUIRED: // state == 103
			pageTitle = "Analyst Re-Edit";
			document.getElementById("analyst-file-interface-input").value = EnhancedJsonStringify(listItemData);
			document.getElementById("analyst-redo").style.display = "block";
			if (specialData.ManagerReject == "M1R")
				if (stateInUrl == PROCESS_STATE_ANALYST_REDO_REQUIRED)
					document.getElementById("review-mgr-incoming").appendChild(document.createTextNode(
						"Unit Chief"));
				else // if (stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_ANALYST_REDO_REQUIRED)
					document.getElementById("review-mgr-outgoing").appendChild(document.createTextNode(
						"Unit Chief"));
			else { // == "M2R"
				if (stateInUrl == PROCESS_STATE_ANALYST_REDO_REQUIRED)
					document.getElementById("review-mgr-incoming").appendChild(document.createTextNode(
						"Section Chief"));
				else // if (stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_ANALYST_REDO_REQUIRED)
					document.getElementById("review-mgr-outgoing").appendChild(document.createTextNode(
						"Section Chief"));
			}
			document.getElementById("review-comment").appendChild(document.createTextNode(listItemData[CatCONST.CORRESPONDENCE_LIST_REVIEWER_COMMENT_COLUMN_NAME]));
			if (stateInUrl == PROCESS_STATE_ANALYST_REDO_REQUIRED)
				incomingLetterFieldset = document.getElementById("incoming-letter-links");
			outgoingLetterFieldset = document.getElementById("outgoing-letter-links");
			break;
		case PROCESS_STATE_UNIT_CHIEF_REVIEW_TASK: // state == 10
		case PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW: // state == 104
		case PROCESS_STATE_UNIT_CHIEF_REVIEW_REDO_REQUIRED: // state = 8
		case PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW_REDO_REQUIRED: // state == 106
			if (stateInUrl == PROCESS_STATE_UNIT_CHIEF_REVIEW_REDO_REQUIRED ||
				stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW_REDO_REQUIRED) {
				pageTitle = "Unit Chief Re-Review";
				document.getElementById("mgr1-review").style.display = "block";
				if (stateInUrl == PROCESS_STATE_UNIT_CHIEF_REVIEW_REDO_REQUIRED)
					incomingLetterFieldset = document.getElementById("incoming-letter-links");
			}
			else { // code current incoming and outgoing files + attachments
				pageTitle = "Unit Chief Review";
				document.getElementById("mgr1-review").style.display = "block";
				/*                           
				if (stateInUrl == PROCESS_STATE_UNIT_CHIEF_REVIEW_TASK) {
				// TODO what goes here???
				} else {
				document.getElementById("unit-chief-review-text").style.display = "inline";
				document.getElementById("initiated-letter-draft-ready").style.display = "block";
				}
				*/
			}
			// code for file link and attachments and for review
			if (stateInUrl == PROCESS_STATE_UNIT_CHIEF_REVIEW_TASK)
				incomingLetterFieldset = document.getElementById("incoming-letter-links");
			outgoingLetterFieldset = document.getElementById("outgoing-letter-links");
			break;
		case PROCESS_STATE_SECTION_CHIEF_REVIEW_TASK: // state = 9
		case PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW: // state = 105
		case PROCESS_STATE_SECTION_CHIEF_REVIEW_REDO_REQUIRED: // state = 11
		case PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW_REDO_REQUIRED: // state = 107
			if (stateInUrl == PROCESS_STATE_SECTION_CHIEF_REVIEW_REDO_REQUIRED ||
				stateInUrl == PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW_REDO_REQUIRED) {
				pageTitle = "Section Chief Re-Review";
				document.getElementById("mgr2-review").style.display = "block";
				if (stateInUrl == PROCESS_STATE_SECTION_CHIEF_REVIEW_REDO_REQUIRED)
					incomingLetterFieldset = document.getElementById("incoming-letter-links");
			}
			else { // code current incoming and outgoing files + attachments
				pageTitle = "Section Chief Review";
				document.getElementById("mgr2-review").style.display = "block";
				/*
				if (stateInUrl == PROCESS_STATE_SECTION_CHIEF_REVIEW_TASK) {
				// TODO what goes here???
				} else {
				document.getElementById("section-chief-review-text").style.display = "inline";
				document.getElementById("initiated-letter-draft-ready").style.display = "block";
				}
				*/
				// code for file link and attachments and review
				if (stateInUrl == PROCESS_STATE_SECTION_CHIEF_REVIEW_TASK)
					incomingLetterFieldset = document.getElementById("incoming-letter-links");
			}
			outgoingLetterFieldset = document.getElementById("outgoing-letter-links");
			break;
		case PROCESS_STATE_STAMPING_TASK: // state = 12
		case PROCESS_STATE_INITIATE_OUTGOING_STAMPING_TASK: // state = 108
			pageTitle = "Letter Number and Date Assignment";
			document.getElementById("letter-branding").style.display = "block";
			/*
			if (stateInUrl == PROCESS_STATE_STAMPING_TASK)
			theForm["incoming-received-date"].value =
			sharePointDateFormat(new Date(
			listItemData[CatCONST.CORRESPONDENCE_LIST_INCOMING_RECEIVED_DATE_COLUMN_NAME]));
			*/
			// code for file link and attachments
			if (inVendor.length <= 3)
				setCheckedRadioValue(theForm.outgoingVendor, inVendor);
			else if ((outVendor = listItemData[CatCONST.CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME].match(/ASO|FI/)) != null)
				setCheckedRadioValue(theForm.outgoingVendor, outVendor[0]);
			if (stateInUrl == PROCESS_STATE_STAMPING_TASK)
				incomingLetterFieldset = document.getElementById("incoming-letter-links");
			outgoingLetterFieldset = document.getElementById("outgoing-letter-links");
			/*  EXCISABLE FROM PRODUCTION == START
			if (environment != "PROD") {
			var node = document.getElementById("notice")
			node.innerHTML = document.getElementById("numbering-dating-testing-notice").innerHTML;
			node.style.display = "block";
			}
			EXCISABLE FROM PRODUCTION == END */
			break;
		case PROCESS_STATE_SIGNED_AND_MAILED: // state = 13
		case PROCESS_STATE_INITIATE_OUTGOING_SIGNED_AND_MAILED: // state = 109
			pageTitle = "Scanning & Mailing";
			document.getElementById("signature-affirm").style.display = "block";
			node = document.getElementById("file-upload-controls");
			document.getElementById("scanning-mailing-controls").appendChild(node);
			node.style.display = "block";
			// code indicating completion of signature
			outgoingLetterFieldset = document.getElementById("outgoing-letter-links");
			break;
			// COMPARE against code for PROCESS_STATE_ASSIGN_UNIT above.
		case PROCESS_STATE_INITIATE_OUTGOING_START:
			pageTitle = "Create Entry for Initiated Outgoing Letter";
			theForm.letterSubjectInitiate.required = true;
			document.getElementById("initiated-outgoing").style.display = "block";
			elements = [CatCONST.QUERY_STRING_NAME_ASSIGNED_UNIT_INITIATE,
				CatCONST.QUERY_STRING_NAME_VENDOR_INITIATE,
				CatCONST.QUERY_STRING_NAME_LETTER_SUBJECT_INITIATE,
				CatCONST.QUERY_STRING_NAME_ASSIGNED_ANALYST_INITIATE
			];
			for (i = 0; i < elements.length; i++) {
				textValue = urlSearchParams.get(elements[i]);
				if (textValue == "FA")
					textValue = "ASO & FI";
				document.getElementById(elements[i]).appendChild(document.createTextNode(textValue));
			}
			ICorrespondenceList.getFieldChoices({
				fieldName: CatCONST.CORRESPONDENCE_LIST_CORRESPONDENCE_TYPE_COLUMN_NAME,
			}).then(function (response) {
				var i, node, node2, choices = response.fieldValues;
				node = document.getElementById("initCorrespondenceType");
				for (i = 0; i < choices.length; i++) {
					if (choices[i] == "?")
						continue;
					node2 = document.createElement("option");
					node2.appendChild(document.createTextNode(choices[i]));
					node.appendChild(node2);
				}
			}).catch(function (response) {
				emailDeveloper({
					subject: "PROCESS_STATE_INITIATE_OUTGOING_START: getFieldChoices() caught",
					body: "<p></p>"
				});
			});
			break;
		default:
			// TODO ???
			break;
	}
	if (incomingLetterFieldset) {
		constructLinks(
			"incoming",
			listItemData[CatCONST.CORRESPONDENCE_LIST_DOCLIB_INCOMING_IDS_COLUMN_NAME].split(","),
			incomingLetterFieldset,
			ICorrespondenceLibrary, !outgoingLetterFieldset ? true : false
		);
		incomingLetterFieldset.style.display = "block";
	}
	if (outgoingLetterFieldset) {
		constructLinks(
			"outgoing",
			listItemData[CatCONST.CORRESPONDENCE_LIST_DOCLIB_OUTGOING_IDS_COLUMN_NAME].split(","),
			outgoingLetterFieldset,
			ICorrespondenceLibrary,
			true
		);
		outgoingLetterFieldset.style.display = "block";
	}
	document.getElementById("footing").style.display = "block";
	document.getElementsByTagName("title")[0].firstChild.data = pageTitle + ": Formal Correspondence Control";
	document.getElementById("page-title").appendChild(document.createTextNode(pageTitle));
	if (pageSubTitle) {
		node = document.getElementById("page-subtitle");
		node.style.display = "block";
		node.appendChild(document.createTextNode(pageSubTitle));
	}
	if (itemId && itemId != null)
		query = CatCONST.QUERY_STRING_NAME_ITEM_ID + "=" + itemId;
	query = "source=form&" + CatCONST.QUERY_STRING_NAME_STATE + "=" +
		((typeof stateInUrl == "undefined" || stateInUrl == "undefined") ? "0" : stateInUrl) +
		"&" + query;
	addEventHandler(document.getElementById("OK-button"), "onclick",
		(function (stateInUrl, form, query) {
			return FormOKHandler.bind(this, stateInUrl, form, query);
		})(stateInUrl, theForm, query));
}
var setupWithBrowser = function (fileLink) {
		return function () {
			var url = "https://" + SERVER_NAME;
			if (SITE_NAME.length > 0)
				url += "/" + SITE_NAME;
			url += fileLink + "?web=1";
			open(url);
		};
	},
	setupWithApp = function (fileLink) {
		return function () {
			var url, ftype,
				domain = "https://" + SERVER_NAME;
			if (SITE_NAME.length > 0)
				domain += "/" + SITE_NAME;
			if (fileLink.charAt(0) == "/") // avoids problem of "//"
				url = domain + fileLink;
			else
				url = domain + "/" + fileLink;
			ftype = fileLink.substring(fileLink.lastIndexOf("."));
			if (ftype.search(/\.(doc|docx)$/) == 0)
				ftype = "ms-word";
			else if (ftype.search(/\.(xls|xlsx)$/) == 0)
				ftype = "ms-excel";
			else if (ftype.search(/\.(ppt|pptx)$/) == 0)
				ftype = "ms-powerpoint";
			_WriteDocEngagement('DocLibECB_Click_ID_EditIn_Word',
				'OneDrive_DocLibECB_Click_ID_EditIn_Word');
			editDocumentWithProgID2(
				url,
				"",
				"SharePoint.OpenDocuments",
				"1",
				domain,
				"0",
				ftype
			);
		};
		// <span type="option" text="Open in Word"
		// onmenuclick="_WriteDocEngagement('DocLibECB_Click_ID_EditIn_Word',
		//     'OneDrive_DocLibECB_Click_ID_EditIn_Word');
		//    editDocumentWithProgID2('\u002f16 Contract FIASO Correspondence Master Log Docume\u002fSC16-19-00000-XX MCD 19196 modify report - Rev Resp - ASO.docx',
		//  '', 'SharePoint.OpenDocuments', '1', 'https://mdsd', '0', 'ms-word')"
		//    iconsrc="/_layouts/15/images/icdocx.png" iconalttext="" sequence="110"
		//  id="ID_EditIn_Word"></span>
		// Edit in Word Online
		/*
		_WriteDocEngagement('DocLibECB_Click_CustomAction',
		'OneDrive_DocLibECB_Click_CustomAction', {
		CustomAction : 'ID_CA_Open_in_Word_Online'});
		window.open('https:\u002f\u002fmdsd\u002f_layouts\u002f15\u002fWopiFrame.aspx?sourcedoc=\u00252F16\u002520Contract\u002520FIASO\u002520Correspondence\u002520Master\u002520Log\u002520Docume\u00252FSC16\u00252D19\u00252D00000\u00252DXX\u002520MCD\u00252019196\u002520modify\u002520report\u002520\u00252D\u002520Rev\u002520Resp\u002520\u00252D\u002520ASO\u00252Edocx\u0026action=view\u0026source=https\u00253A\u00252F\u00252Fmdsd\u00252F16\u00252520Contract\u00252520FIASO\u00252520Correspondence\u00252520Master\u00252520Log\u00252520Docume\u00252FForms\u00252FAllItems\u00252Easpx\u002523InplviewHash80bf5ebd\u00252Dd9c7\u00252D49b9\u00252Da5b8\u00252Db0126c5649fa\u00253DSortField\u0025253DID\u00252DSortDir\u0025253DDesc', '_blank'); addWopiPerfMark(1);
		*/
	},
	setupWithDefault = function (fileLink) {
		return function () {
			var url = "https://" + SERVER_NAME;
			if (SITE_NAME.length > 0)
				url += "/" + SITE_NAME;
			url += fileLink;
			open(url);
		};
	};

function constructLinks(style, docLibIds, fieldset, iLib, addExplanation) {
	var i, docItemInfo = [];
	for (i = 0; i < docLibIds.length; i++) {
		docItemInfo.push(new RSVP.Promise(function (resolve, reject) {
			iLib.getDocLibItemFileAndMetaData({
				itemId: parseInt(docLibIds[i]),
			}).then(function (response) {
				resolve(response.responseJSON.d);
			}).catch(function (response) {
				reject(response);
			});
		}));
	}
	RSVP.all(docItemInfo).then(function (response) {
		var i, node, pNode, node2, fName, extension, libItemFileData, libItemMetaData, fileType;
		// sort the data by letter, attach1, attach2, etc
		response.sort(function (a, b) {
			var aIndex, bIndex;
			if (a.ListItemAllFields.FileType == "letter")
				return -1;
			if (b.ListItemAllFields.FileType == "letter")
				return 1;
			aIndex = a.Name.match(/-\d{5}([a-z])/)[1];
			bIndex = b.Name.match(/-\d{5}([a-z])/)[1];
			if (aIndex < bIndex)
				return -1;
			return 1;
		});
		for (i = 0; i < response.length; i++) {
			libItemFileData = response[i];
			libItemMetaData = libItemFileData.ListItemAllFields;
			fileType = libItemMetaData[CatCONST.CORRESPONDENCE_LIBRARY_FILETYPE_COLUMN_NAME];
			fName = libItemFileData.Name;
			if ((extension = fName.substring(fName.lastIndexOf(".") + 1).toLowerCase()) == "aspx") {
				if (style == "incoming" && incomingAsLinks == true)
					fName = libItemMetaData[CatCONST.CORRESPONDENCE_LIBRARY_DMS_URL_COLUMN_NAME];
				else
					fName = libItemMetaData.URL.Url;
				extension = fName.substring(fName.lastIndexOf(".") + 1).toLowerCase();
			}
			pNode = document.createElement("div");
			pNode.className = "doc-control-set";
			fieldset.appendChild(pNode);
			node = document.createElement("span");
			node.className = "icon-image";
			node2 = document.createElement("img");
			node2.src = "CAT%20images/" + extension + "-icon.png";
			node2.alt = extension + " icon";
			node.appendChild(node2);
			if (libItemFileData.CheckOutType == 0) {
				node2 = document.createElement("img");
				node2.src = "CAT%20images/checkoutoverlay.gif";
				node2.alt = " ";
				node2.className = "icon-overlay";
				node.appendChild(node2);
			}
			pNode.appendChild(node);
			if (LINK_STYLE == "anchored") {
				node = document.createElement("a");
				node.className = "incoming-letter-anchors";
				if (style == "incoming" && incomingAsLinks == true)
					node.setAttribute("href",
						libItemMetaData[CatCONST.CORRESPONDENCE_LIBRARY_DMS_URL_COLUMN_NAME] + "?web=1");
				else
					node.setAttribute("href", "https://" + SERVER_NAME +
						(SITE_NAME.length > 0 ? "/" + SITE_NAME : "") +
						libItemFileData["ServerRelativeUrl"] + "?web=1");
				node.setAttribute("target", "_blank");
				if (fileType == "letter")
					node.appendChild(document.createTextNode("Letter"));
				else
					node.appendChild(document.createTextNode("Enclosure #" +
						fileType.match(/attach(\d*)/i)[1]));
				pNode.appendChild(node);
				if (addExplanation == true && response.passthru == true) {
					node = document.createElement("p");
					node.className = "links-info";
					node.appendChild(document.createTextNode(
						"PDFs will open in new window or tab. Office documents may (request to)" +
						" download for opening in host application."));
					fieldset.appendChild(node);
				}
			}
			else { // LINK_STYLE : edit in browser, edit in app
				node = document.createElement("span");
				pNode.appendChild(node);
				node.className = "doc-type-label";
				node.appendChild(document.createTextNode(
					fileType == "letter" ? "Letter: " : "Enclosure #" +
					fileType.match(/attach(\d*)/i)[1] + ": "
				));
				if (extension.search(/pdf$/) == 0) {
					node = document.createElement("button");
					pNode.appendChild(node);
					node.type = "button";
					node.className = "doc-edit-button";
					node.addEventListener("click",
						setupWithDefault(libItemFileData["ServerRelativeUrl"]),
						false
					);
					node.appendChild(document.createTextNode("Open default"));
				}
				else {
					node = document.createElement("button");
					pNode.appendChild(node);
					node.type = "button";
					node.className = "doc-edit-button";
					if (style == "incoming" && incomingAsLinks == true)
						node.addEventListener("click",
							setupWithBrowser(libItemMetaData[CatCONST.CORRESPONDENCE_LIBRARY_DMS_URL_COLUMN_NAME]),
							false
						);
					else
						node.addEventListener("click",
							setupWithBrowser(libItemFileData["ServerRelativeUrl"]),
							false
						);
					node.appendChild(document.createTextNode("Open with browser"));
					node = document.createElement("button");
					pNode.appendChild(node);
					node.type = "button";
					node.className = "doc-edit-button";
					if (style == "incoming" && incomingAsLinks == true)
						node.addEventListener("click",
							setupWithApp(libItemMetaData[CatCONST.CORRESPONDENCE_LIBRARY_DMS_URL_COLUMN_NAME]),
							false
						);
					else
						node.addEventListener("click",
							setupWithApp(libItemFileData["ServerRelativeUrl"]),
							false
						);
					node.appendChild(document.createTextNode("Open with app"));
				}
				if (addExplanation == true && i == response.length - 1) {
					node = document.createElement("p");
					node.className = "links-info";
					node.appendChild(document.createTextNode(
						"PDFs will open in new window or tab. Office documents may (request to)" +
						" download for opening in host application."));
					fieldset.appendChild(node);
				}
			}
		}
	}).catch(function (response) {
		var node = document.createElement("p");
		node.style.color = "red";
		node.style.fontSize = "14pt";
		node.style.fontFamily = "Arial,sans-serif";
		node.appendChild(document.createTextNode("An error occurred in setting up the documents. Contact Administrator"));
		fieldset.appendChild(node);
		emailDeveloper({
			subject: "CATPresentForm.js::constructLinks() caught",
			head: "<style>#json {white-space:pre;font:normal 10pt 'Courier New',Courier,monospace;}</style>",
			body: "<p>Error occurred while constructing links of Incoming or Outgoing file sets.</p>" +
				"<p>response object:<br /><span id=\"json\">" +
				EnhancedJsonStringify(response, null, "  ").replace(/\n/g, "\r") + "</span></p>"
		});
	});
}