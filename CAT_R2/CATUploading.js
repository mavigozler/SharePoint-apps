"use strict";
// CATUploading.js
//////  GLOBAL SECTION start
var ATTACH_SEQUENCE = 0x0001,
	BAD_CHARACTERS = 0x0002,
	MIXED_NUMBERS = 0x0004,
	DUPLICATE_LETTER = 0x0008,
	BAD_FORMAT = 0x0010,
	DUPLICATE_ATTACHMENT = 0x0020,
	MISSING_LETTER = 0x0040,
	LENGTH = 0x0080,
	LETTER_NOT_ALLOWED = 0x0100,
	FORCE_NAME_CHANGE = 0x0200,
	SUBMISSION_ERRORS = 0x01FF;
var fileErrors,
	queuedFiles = {
		letterPattern: null,
		enclosurePattern: null,
		letter: null,
		enclosures: [],
		attempt: false
	},
	queuedLinks = [];
//////  GLOBAL SECTION end
/*
Links for testing (whole line)
https://denticalsharepoint.sharepoint.com/Corres/Submitted%20Letters/DF16-19-02856%20-FA%20DOIL-19-007%20Implmnt%20Manual%20and%20Auto%20Procss%20for%20Alt%20Formats.pdf https://denticalsharepoint.sharepoint.com/Corres/Submitted%20Letters/DF16-19-02856a-FA%20ASO%20Ack%20Ltr.pdf
*/
function parseLinks(textAreaObj) {
	var i, aNode, dropdownP, countSpan, DMSblobs = [],
		form = textAreaObj.form,
		urlRegEx = /(http[s]:\/\/[^\s+]*)/ig,
		textValue = decodeURIComponent(textAreaObj.value),
		details = textValue.match(/(DF16-\d{2}-\d{5}\s?-(FA|ASO|FI))\s+([\s\w\-]*)/),
		iFrameReader = document.getElementById("dms-transport");
	queuedLinks = textAreaObj.value.match(urlRegEx);
	queuedFilesCheck("links").then(function (response) {
		dropdownP = document.getElementById("links-select");
		while (dropdownP.firstChild)
			dropdownP.removeChild(dropdownP.firstChild);
		for (i = 0; i < queuedLinks.length; i++) {
			aNode = document.createElement("a");
			aNode.href = queuedLinks[i];
			aNode.target = "_blank";
			aNode.className = "links-select-anchors";
			aNode.appendChild(document.createTextNode(
				decodeURIComponent(queuedLinks[i].substring(queuedLinks[i].lastIndexOf("/") + 1))));
			dropdownP.appendChild(aNode);
			dropdownP.appendChild(document.createElement("br"));
		}
		dropdownP.style.marginTop = 0;
		document.getElementById("selected-links-block").style.display = "block";
		document.getElementById("links-selected-count").appendChild(
			document.createTextNode(i));
		form.incomingLetterNumber.value = details[1].replace(/\s/g, "");
		form.receivedDate.valueAsDate = new Date(new Date().getTime() - (5 * 1000 * 3600 * 24));
		checkFA(form.incomingLetterNumber);
		/*
		for (i = 0; i < queuedLinks.length; i++)
		DMSblobs.push(new RSVP.Promise(function (resolve, reject) {
		fetch(queuedLinks[i], {
		mode: "no-cors",
		credentials: "include"
		}).then(function (response) {
		if (response.ok == false)
		reject(response);
		else
		resolve(response.json());
		});
		}));
		RSVP.all(DMSblobs).then(function (response) {
		processInputFiles(response, form);
		}).catch(function (response) {
		response;
		});
		*/
	}).catch(function (response) {
		displayFilesFoundError(response, "links");
	});
}

function dragOver(evt) {
	evt.stopPropagation();
	evt.preventDefault();
	return false;
}

function fileDrop(evt, interfaceControl) {
	var node = evt.target,
		form;
	evt.stopPropagation();
	evt.preventDefault();
	while (node.nodeName.toLowerCase() != "form")
		node = node.parentNode;
	processInputFiles(evt.target.files || evt.dataTransfer.files, node, interfaceControl);
}

function processInputFiles(files, form, interfaceControl) {
	var i, which,
		names = [],
		urlParams = new URLSearchParams(location.search);
	if (isNaN(which = parseInt(urlParams.get("state"))) == true)
		which = "incoming";
	else if (which == PROCESS_STATE_DRAFT_RESPONSE_TASK ||
		which == PROCESS_STATE_INITIATE_OUTGOING_ANALYST_UPLOAD ||
		which == PROCESS_STATE_ANALYST_RESPONSE_DIRECTED)
		which = "outgoing";
	else if (which == PROCESS_STATE_ANALYST_REDO_REQUIRED ||
		which == PROCESS_STATE_INITIATE_OUTGOING_ANALYST_REDO_REQUIRED)
		which = "analyst-redo";
	else if (which == PROCESS_STATE_SIGNED_AND_MAILED ||
		which == PROCESS_STATE_INITIATE_OUTGOING_SIGNED_AND_MAILED)
		which = "scan";
	queuedFiles.attempt = true;
	if (interfaceControl) {
		interfaceControl.inputFiles = files;
		if (interfaceControl.focus == "add")
			return performAnalystFileControl(interfaceControl, "add-queueing");
		else if (interfaceControl.focus == "exchange")
			return performAnalystFileControl(interfaceControl, "exchange-queueing");
	}
	filesNameCheck({
		files: files,
		which: which,
		form: form,
		interfaceControl: interfaceControl
	});
	queuedFilesCheck("files").then(function (response) {
		if (which == "incoming")
			extractPdfLetterData(response);
		console.log("No existing files in queuedFilesCheck() run");
	}).catch(function (response) {
		displayFilesFoundError(response, "files");
	});
}

function displayFilesFoundError(response, type) {
	var i, node, node2, divNode;
	if (type == "files")
		divNode = document.getElementById("file-load-errors");
	else
		divNode = document.getElementById("link-load-errors");
	if (divNode.firstChild)
		divNode.appendChild(document.createElement("hr"));
	divNode.appendChild(document.createTextNode(
		"Some or all of the queued " + type +
		" for upload already exist in the system:"
	));
	divNode.style.display = "block";
	node2 = document.createElement("ul");
	divNode.appendChild(node2);
	for (i = 0; i < response.length; i++)
		if (response[i].httpStatus < 400) {
			node = document.createElement("li");
			node.appendChild(document.createTextNode(basename(response[i].url)));
			node2.appendChild(node);
		}
	node = document.createElement("li");
	divNode.appendChild(document.createTextNode(
		"To proceed, it will be necessary to delete/overwrite all " +
		"existing files from the Master Log documents library"
	));
	node2 = document.createElement("p");
	divNode.appendChild(node2);
	node = document.createElement("a");
	node2.appendChild(node);
	node.appendChild(document.createTextNode("CAT Dashboard"));
	node.href = "https://mdsd/SiteAssets/CAT/CAD/CAT%20Dashboard.html";
	/*
	node2 = document.createElement("p");
	divNode.appendChild(node2);
	node = document.createElement("button");
	node2.appendChild(node);
	node.appendChild(document.createTextNode("Delete Files"));
	node.addEventListener("click", function () {
	deleteExistingFiles(response);
	}, false);
	*/
}

function fileUploadError(type) {
	var text;
	switch (type) {
		case "mixed numbers":
			text = "The file upload set has more than one letter number pattern. This " +
				"upload queue cannot be accepted. \u00a7";
			break;
		case "duplicate letter":
			text = "An attempt to queue a file with identical letter number pattern was " +
				"stopped. " +
				"Clear the entire file queue and re-queue if another file representing the " +
				"letter is to be uploaded.";
			break;
		case "format":
			text = "The system stopped an upload attempt for a file not " +
				"conforming to required naming standards for the current state. " +
				"Please consult Correspondence Coordinator if you require assistance."; +
			" Note that outgoing letters and enclosures must have a literal format of " +
			"'SC16-YY-00000*-XX' for letter or 'SC16-YY-00000m-XX' for enclosures " +
			"where 'm' can be 'a', 'b', etc for enclosures.";
			break;
		case "length":
			text = "File queueing was stopped for a file with name having a " +
				"descriptive field longer than " + MAX_FILE_DESCRIPTION_LENGTH + " characters. " +
				"Consult the Correspondence Coordinator if assistance is needed " +
				"to compose a short descriptive field of " + MAX_FILE_DESCRIPTION_LENGTH +
				" characters or less, not including the file type extension";
			break;
		case "duplicate enclosure":
			text = "An attempt to queue a file with an identical enclosure number pattern " +
				"was stopped. " +
				"Clear the entire file queue and re-queue if another file representing the " +
				"enclosure is to be uploaded.";
			break;
		case "missing letter":
			text = "The letter is currently missing from the file set queue. A letter will be " +
				"required before the process can be OK'ed \u00a7";
			break;
		case "attach sequence":
			text = "Attachments in the current file upload set are out of sequence. " +
				"Final upload set must have sequence 'a', 'b', 'c'... to be OK'ed for upload \u00a7";
			break;
		case "disallowed characters":
			text = "An attempt to queue a file with disallowed characters in the file name " +
				"was stopped. " +
				"Make sure the file names do not contain the following: ~ # % &  * { } \ : < > ? / | \"";
			break;
		case "no files":
			text = "No uploadable files were found in the queued set. Please review " +
				"instructions on acceptable naming of files. This error can also occur if " +
				"there is an attempt to upload a DF16 file when an SC16 file is expected, or " +
				"vice versa";
			break;
		case "letter not allowed":
			text = "Upload of a letter file is not allowed. To replace a letter, " +
				"use the interface to exchange/replace files.";
			break;
		case "force name change":
			text = "Uploaded letter has number pattern type different from file it " +
				"will replace: file rename of number will match replaced file.";
			break;
			// special for add queueing
		case "add-exchange-q-length":
			text = "Uploaded file name descriptive part exceeds the maximum length " +
				MAX_FILE_DESCRIPTION_LENGTH + " characters. It has been truncated to " +
				"the maximum. If this is not acceptable, reset the form, rename the " +
				"file to be upload, then try the upload again.";
			break;
		default:
			text = "This is an unknown error. If you are reading this, there is " +
				"probably a defect in the application. Contact the administrator.";
			break;
	}
	return text;
}
/** @function filesNameCheck() is triggered when a multiple file upload is engaged and the names of the files
 * @param {Object} will be composed of multiple properties as unordered arguments
 * @return boolean true if the upload was successfully validated
 * @pre a file named correctly was clicked for uploading
 * @post file
 */
function filesNameCheck(parameters) {
	var i, j, node, letter, text,
		selectObj, uploadDiv, countSpan, parts, fileFlag,
		letterPattern, enclosurePattern, name, fileNames = [],
		files = parameters.files,
		which = parameters.which,
		interfaceControl = parameters.interfaceControl,
		attachs = [],
		attachSeqs = [],
		sessionFlag = 0x0,
		count = 0,
		errorsDiv;
	// which form is calling
	if (parameters.form.id == "analyst-file-control") {
		selectObj = document.getElementById("analyst-files-select");
		uploadDiv = document.getElementById("analyst-file-selected-block");
		countSpan = document.getElementById("analyst-files-selected-count");
		errorsDiv = document.getElementById("analyst-file-load-errors");
	}
	else { // standard upload control
		selectObj = document.getElementById("files-select");
		uploadDiv = document.getElementById("selected-block");
		countSpan = document.getElementById("files-selected-count");
		errorsDiv = document.getElementById("file-load-errors");
	}
	errorsDiv.style.display = "none";
	while (errorsDiv.firstChild)
		errorsDiv.removeChild(errorsDiv.firstChild);
	// depending on the state, pick the number pattern
	// when using .match() on strings:
	// DF16 letter: [1]=DF16,[2]=YY,[3]=NNNNN,[4]=ASO|FI|FA,[5]=desc
	// DF16 enclosure: [1]=DF16,[2]=YY,[3]=NNNNN,[4]=a-z,[5]=ASO|FI|FA,[6]=desc
	// SC16 letter: [1]=SC16,[2]=YY,[3]=ASO|FI|FA,[4]=desc
	// SC16 enclosure: [1]=SC16,[2]=YY,[3]=a-z,[4]=ASO|FI|FA,[5]=desc
	for (i = 0; i < files.length; i++)
		fileNames.push(files[i].name);
	if (which == "incoming") {
		letterPattern = /(DF16)-(\d{2})-(\d{5})\s?-(ASO|FI|FA)\s(.*)\.?(\w+)?$/;
		enclosurePattern = /(DF16)-(\d{2})-(\d{5})([a-z]{1,2})-(ASO|FI|FA)\s(.*)\.?(\w+)?$/;
	}
	else if (which == "outgoing" || which == "analyst-redo") {
		letterPattern = /(SC16)-(\d{2})-00000\s?-([Xx]{2}|FI|ASO)\s(.*)\.?(\w+)?$/;
		enclosurePattern = /(SC16)-(\d{2})-00000([a-z]{1,2})-([Xx]{2}|FI|ASO)\s(.*)\.?(\w+)?$/;
		if (which == "analyst-redo" && interfaceControl.focus == "exchange")
			fileNames.push(interfaceControl.selectionName);
	}
	else if (which == "scan") {
		var node2;
		if (names.length != 1 &&
			confirm("Confirm the intention to upload more than one file as a letter") == false) {
			alert("Please reset the form and try again.");
			return false;
		}
		node = document.createElement("option");
		node.appendChild(document.createTextNode(name[0]));
		node.value = 0;
		node.selected = true;
		selectObj.appendChild(node);
		/*
		selectObj.size = 1;
		selectObj.selectedIndex = 0;
		node.selected = false;
		selectObj.selectedIndex = -1;
		*/
		countSpan.replaceChild(document.createTextNode("1"), countSpan.firstChild);
		uploadDiv.style.display = "block";
		node = document.createElement("p");
		node.appendChild(
			document.createTextNode("The input file will be renamed ")
		);
		node2 = document.createElement("span");
		node2.style.fontWeight = "bold";
		node2.style.color = "navy";
		text = decodeURIComponent(
			decodeURIComponent(urlSearchParams.get("scanname"))
		);
		node2.appendChild(
			document.createTextNode(
				'"' + text.substr(0, text.lastIndexOf(".")) + " [scan]" +
				text.substr(text.lastIndexOf(".")) + '"'
			)
		);
		node.appendChild(node2);
		uploadDiv.appendChild(node);
		queuedFiles.letter = files[0];
		return true;
	}
	else
		throw "unknown file upload type from incoming|outgoing|scan: " + which;
	// Sort all names, then check name patterns
	for (i = 0; i < fileNames.length; i++) {
		name = fileNames[i];
		fileFlag = 0x0;
		if ((parts = name.match(letterPattern)) != null) { // check if letter is present with correct pattern
			// is queued letter the correct pattern identified in queuedFiles?
			if (queuedFiles.letterPattern && name.search(queuedFiles.letterPattern) < 0)
				fileFlag |= MIXED_NUMBERS;
			// does file have disallowed characters?
			if (name.search(/[#%&\*:<>\?\/\{\|\}]/) >= 0)
				fileFlag |= BAD_CHARACTERS;
			// if there is already a letter, this is an attempt at a duplicate
			if (queuedFiles.letter != null)
				fileFlag |= DUPLICATE_LETTER;
			/*  this is a special section for analyst control */
			if (which == "analyst-redo") {
				if (interfaceControl.focus == "add")
					fileFlag |= LETTER_NOT_ALLOWED;
				else if (interfaceControl.toExchange == "letter")
					fileFlag |= FORCE_NAME_CHANGE;
				if (i == 0) // interfaceControl.focus == "exchange"
					interfaceControl.toExchange = "letter";
			}
			/*  end of special section */
			parts = name.match(letterPattern);
			if (parts && ((parts[4].length && parts[4].length > MAX_FILE_DESCRIPTION_LENGTH) ||
					(parts[5] && parts[5].length && parts[5].length > MAX_FILE_DESCRIPTION_LENGTH)))
				fileFlag |= LENGTH;
			if (fileFlag == 0x0 && !(which == "analyst-redo" && i > 0 &&
					interfaceControl.focus == "exchange"))
				// the letter file checks out...make it the letter
				letter = files[i];
		}
		else if ((parts = name.match(enclosurePattern)) != null) { // file compared to enclosure pattern
			if (queuedFiles.enclosurePattern && name.search(queuedFiles.enclosurePattern) < 0)
				// check the numbering against an already identified numbering
				fileFlag |= MIXED_NUMBERS;
			parts = name.match(enclosurePattern);
			if (parts && ((parts[5].length && parts[5].length > MAX_FILE_DESCRIPTION_LENGTH) ||
					(parts[6] && parts[6].length && parts[6].length > MAX_FILE_DESCRIPTION_LENGTH)))
				fileFlag |= LENGTH;
			/*  this is a special section for analyst control */
			if (which == "analyst-redo" && interfaceControl.focus != "exchange") {
				if (i == 0) // interfaceControl.focus == "exchange"
					interfaceControl.toExchange = "enclosure";
				else if (interfaceControl.toExchange == "letter")
					fileFlag |= FORCE_NAME_CHANGE;
			}
			if (fileFlag == 0x0 && !(which == "analyst-redo" && i > 0 &&
					interfaceControl.focus == "exchange"))
				// no errors? add this
				attachs.push(files[i]);
			/*  end of special section */
		}
		else // a file with bad numbering was queued
			fileFlag |= BAD_FORMAT;
		sessionFlag |= fileFlag;
	}
	if (which == "analyst-redo" && interfaceControl.focus == "rename")
		return (fileFlag & BAD_FORMAT) != 0x0 ? false : true;
	// next block defines the pattern of the letter and/or enclosures in
	// queued files for comparison to follow-up queueing
	if (queuedFiles.letterPattern == null) { // letter pattern was not defined
		var set;
		if (letter)
			parts = letter.name.match(letterPattern);
		else if (attachs.length > 0)
			parts = attachs[0].name.match(enclosurePattern);
		// this section finalizes the pattern of letters and enclosures
		if (parts) {
			for (i = 3; i <= 5; i++)
				if (parts[i].toUpperCase() == "XX") {
					parts[i] = "[Xx]{2}";
					break;
				}
			else if (parts[i].toUpperCase() == "ASO") {
				parts[i] = "ASO";
				break;
			}
			else if (parts[i].toUpperCase() == "FI") {
				parts[i] = "FI";
				break;
			}
			set = parts[1] + "-" + (which == "analyst-redo" ? "\\d{2}" : parts[2]) + "-";
			if (parts[1] == "DF16") {
				set += parts[3];
				if (which == "analyst-redo" && interfaceControl.focus != "exchange")
					if (parts.length == 7)
						parts[5] = "([Xx]{2}|ASO|FI)";
					else
						parts[4] = "([Xx]{2}|ASO|FI)";
				if (parts.length == 7) {
					queuedFiles.enclosurePattern = RegExp(set + "([a-z]{1,2})-" + parts[5]);
					queuedFiles.letterPattern = RegExp(set + "-" + parts[5]);
				}
				else {
					queuedFiles.letterPattern = RegExp(set + parts[4]);
					queuedFiles.enclosurePattern = RegExp(set + "([a-z]{1,2})-" + parts[4]);
				}
			}
			else { // SC16
				set += "00000";
				if (which == "analyst-redo" && interfaceControl.focus != "exchange")
					if (parts.length == 6)
						parts[4] = "([Xx]{2}|ASO|FI)";
					else
						parts[3] = "([Xx]{2}|ASO|FI)";
				if (parts.length == 6) {
					queuedFiles.enclosurePattern = RegExp(set + "([a-z]{1,2})-" + parts[4]);
					queuedFiles.letterPattern = RegExp(set + "-" + parts[4])
				}
				else {
					queuedFiles.letterPattern = RegExp(set + "-" + parts[3]);
					queuedFiles.enclosurePattern = RegExp(set + "([a-z]{1,2})-" + parts[3]);
				}
			}
		}
	}
	// merge successful new enclosures with existing enclosures, then sort
	if (queuedFiles.enclosures.length > 0)
		attachs = attachs.concat(queuedFiles.enclosures);
	attachs.sort(function (a, b) {
		return ("" + a.name).localeCompare(b.name, "en-US");
	});
	// Now checking for errors: check for a missing letter, then take
	//   current enclosures and check for duplicate attachment or out-of-sequence attachments
	if (!(which == "analyst-redo" && interfaceControl.focus == "exchange")) {
		if (!letter && queuedFiles.letter == null &&
			(queuedFiles.enclosures.length > 0 || attachs.length > 0)) //
			sessionFlag |= MISSING_LETTER;
		// look for out of sequence or duplicate enclosures
		// this first loop creates a numbering sequence on enclosures, which should be 1, 2, 3, ...
		if ((sessionFlag & BAD_FORMAT) == 0x0) {
			for (i = 0; i < attachs.length; i++) {
				if (attachs[i].name.match(queuedFiles.enclosurePattern) == null) {
					sessionFlag |= MIXED_NUMBERS;
					break;
				}
				attachSeqs.push(attachs[i].name.match(
					queuedFiles.enclosurePattern)[1].charCodeAt(0) - "a".charCodeAt(0));
			}
			// now the 2nd loop checks the numbering sequence, looking for duplicates or out of sequence errors
			for (i = 0; i < attachSeqs.length; i++) {
				if (attachSeqs[i] == attachSeqs[i + 1]) {
					sessionFlag |= DUPLICATE_ATTACHMENT;
					attachs.splice(i + 1, 1);
					i++;
					continue;
				}
				if (i != attachSeqs[i])
					sessionFlag |= ATTACH_SEQUENCE;
			}
		}
	}
	// start displaying all the errors
	if ((sessionFlag & BAD_FORMAT) != 0)
		errorsDiv.appendChild(makeErrorListItem(fileUploadError("format")));
	if ((sessionFlag & LENGTH) != 0)
		errorsDiv.appendChild(makeErrorListItem(fileUploadError("length")));
	if ((sessionFlag & BAD_CHARACTERS) != 0)
		errorsDiv.appendChild(makeErrorListItem(fileUploadError("disallowed characters")));
	if ((sessionFlag & MISSING_LETTER) != 0)
		errorsDiv.appendChild(makeErrorListItem(fileUploadError("missing letter")));
	if ((sessionFlag & MIXED_NUMBERS) != 0)
		errorsDiv.appendChild(makeErrorListItem(fileUploadError("mixed numbers")));
	if ((sessionFlag & DUPLICATE_LETTER) != 0)
		errorsDiv.appendChild(makeErrorListItem(fileUploadError("duplicate letter")));
	if ((sessionFlag & DUPLICATE_ATTACHMENT) != 0)
		errorsDiv.appendChild(makeErrorListItem(fileUploadError("duplicate enclosure")));
	if ((sessionFlag & ATTACH_SEQUENCE) != 0)
		errorsDiv.appendChild(makeErrorListItem(fileUploadError("attach sequence")));
	if ((sessionFlag & LETTER_NOT_ALLOWED) != 0)
		errorsDiv.appendChild(makeErrorListItem(fileUploadError("letter not allowed")));
	if ((sessionFlag & FORCE_NAME_CHANGE) != 0) {
		errorsDiv.appendChild(makeErrorListItem(fileUploadError("force name change")));
		errorsDiv.style.display = "block";
	}
	queuedFiles.letter = letter ? letter : queuedFiles.letter;
	queuedFiles.enclosures = attachs;
	// create the select list of items uploaded
	while (selectObj.firstChild)
		selectObj.removeChild(selectObj.firstChild);
	if (queuedFiles.letter) {
		var pos, fname = queuedFiles.letter.name;
		pos = fname.indexOf(" ");
		if (fname.search(/\d{5}\-/) > 0)
			fname = fname.substring(0, pos) + '\u00a0' + fname.substring(pos);
		node = document.createElement("option");
		node.appendChild(document.createTextNode(fname));
		node.value = 0;
		selectObj.appendChild(node);
		count++;
	}
	for (i = 0; i < attachs.length; i++) {
		node = document.createElement("option");
		node.appendChild(document.createTextNode(attachs[i].name));
		node.value = i + 1;
		selectObj.appendChild(node);
		count++;
	}
	// display more things related to items
	if (count > 0)
		document.getElementById("clear-files-button").style.display = "inline";
	else {
		node = document.createElement("p");
		node.className = "file-load-errors-list-item";
		node.appendChild(document.createTextNode(fileUploadError("no files")));
		errorsDiv.appendChild(node);
	}
	selectObj.size = count >= 3 ? count : 2;
	selectObj.selectedIndex = -1;
	countSpan.replaceChild(document.createTextNode(count), countSpan.firstChild);
	uploadDiv.style.display = "block";
	// if no errors of consequence, return true; else indicate disqualifying errors
	if ((sessionFlag & SUBMISSION_ERRORS) == 0) {
		fileErrors = 0x0;
		return true;
	}
	fileErrors = sessionFlag;
	node = document.createElement("p");
	node.style.font = "normal 88% 'Arial Narrow',Arial,sans-serif";
	node.style.color = "#622";
	node.appendChild(document.createTextNode("\u00a7 - submission not allowed " +
		"while this error condition exists"));
	errorsDiv.appendChild(node);
	errorsDiv.style.display = "block";
	return false;
}

function makeErrorListItem(text) {
	var node = document.createElement("p");
	node.className = "file-load-errors-list-item";
	node.appendChild(document.createTextNode(text));
	return node;
}

function clearFiles() {
	var divNode = document.getElementById("file-load-errors");
	document.getElementById("selected-block").style.display = "none";
	while (divNode.firstChild)
		divNode.removeChild(divNode.firstChild);
	divNode.style.display = "none";
	fileErrors = 0x0;
	queuedFiles.letterPattern = null;
	queuedFiles.enclosurePattern = null;
	queuedFiles.letter = null;
	queuedFiles.enclosures = [];
	document.getElementById("clear-files-button").style.display = "none";
}
/** @function queuedFilesCheck()  does a check that the queued files are uploadable to Master Log DocLib
 *
 * @pre
 * @post
 */
function queuedFilesCheck(type) {
	return new RSVP.Promise(function (resolve, reject) {
		var i, alert = "",
			status, checkQueue,
			options = "height=400,width=700,top=100,left=200,menubar=yes",
			alertWin, queuedFileRun = [],
			ICorrespondenceLibrary = new IListRESTRequest({
				server: SERVER_NAME,
				site: SITE_NAME,
				listName: CORRESPONDENCE_LIBRARY_NAME,
				relativeUrl: CORRESPONDENCE_LIBRARY_RELATIVE_URL,
				listItemEntityType: CORRESPONDENCE_LIBRARY_ITEM_ENTITY_TYPE_FULL_NAME,
				debugging: true
			});
		if (type == "links") {
			for (i = 0, checkQueue = []; i < queuedLinks.length; i++)
				checkQueue.push(queuedLinks[i].substring(queuedLinks[i].lastIndexOf("/") + 1,
					queuedLinks[i].lastIndexOf(".")) + ".aspx");
		}
		else {
			checkQueue = [queuedFiles.letter].concat(queuedFiles.enclosures);
			for (i = 0; i < checkQueue.length; i++)
				if (checkQueue[i] && checkQueue[i].name) // necessary for other situations
					checkQueue[i] = checkQueue[i].name.replace(/'/g, "%27");
		}
		for (i = 0; i < checkQueue.length; i++) {
			if (checkQueue[i] == null || checkQueue[i] == "")
				continue;
			queuedFileRun.push(new RSVP.Promise(function (resolve, reject) {
				ICorrespondenceLibrary.getDocLibItemByFileName({
					fileName: checkQueue[i],
					passthru: checkQueue[i]
				}).then(function (response) {
					// if 200, this means the file is found, and this is not good
					if (environment != "PROD")
						console.log(
							"Function: queuedFilesCheck" +
							"\nDoc Name: " + response.passthru +
							"\nHTTP Status: " + response.httpStatus +
							"\nadded to badFiles[]"
						);
					resolve({
						url: response.responseJSON.d.ServerRelativeUrl,
						id: response.responseJSON.d.ListItemAllFields.ID,
						fType: response.responseJSON.d.ListItemAllFields.FileType,
						httpStatus: response.httpStatus
					});
				}).catch(function (response) {
					// if 404, this means file is NOT found, and this is good
					if (environment != "PROD")
						console.log(
							"Function: queuedFilesCheck" +
							"\nDoc Name: " + response.docName +
							"\nHTTP Status: " + response.httpStatus +
							"\nLack of presence is good"
						);
					resolve({
						fileData: response.passthru, // the original file data object
						httpStatus: response.httpStatus
					});
				});
			}));
		}
		RSVP.all(queuedFileRun).then(function (results) {
			for (var i = 0; i < results.length; i++)
				if (results[i].httpStatus < 400) {
					reject(results); // one file found means a problem
				}
			resolve(results);
		}).catch(function (results) {
			finishError({
				mainMessage: "Error occurred while checking for existing " +
					"items in the Master Log doc lib among your queued items",
				itemId: itemId,
				systemMessage: response.responseMessage
			});
			emailDeveloper({
				subject: "RSVP array catch block called in queuedFilesCheck()",
				body: "<p>Error occurred while checking for existing " +
					"items in the Master Log doc lib among your queued items</p>" +
					"<p><b>Item ID:</b>  " + itemId + "</p>" +
					"<p><b>System message:</b>  " + response.responseMessage + "</p>" +
					"<p style=\"white-space:pre;font:normal 10pt monospace;\">response object:<br />" +
					EnhancedJsonStringify(response, null, "  ") + "</p>"
			});
		});
	});
}
/** @function doUpload()
 * @param 
 * @return
 * @pre
 * @post
 */
function doUpload(state, options) {
	return new RSVP.Promise(function (resolve, reject) {
		if (incomingAsLinks == true && state == PROCESS_STATE_CREATE_INCOMING_TASK) {
			completeUploadAsUrls(queuedLinks).then(function (response) {
				resolve(response);
			}).catch(function (response) {
				// output of async function is the file data uploaded
				reject(response);
			});
		}
		else {
			queuedFilesCheck().then(function (a) {
				var i, fReader, readFiles = [],
					newQueue = queuedFiles.letter ? [queuedFiles.letter].concat(queuedFiles.enclosures) :
					queuedFiles.enclosures;
				for (i = 0; i < newQueue.length; i++) {
					readFiles.push(new RSVP.Promise(function (resolve, reject) {
						fReader = new FileReader();
						fReader.fileName = newQueue[i].name;
						fReader.onload = function (event) {
							resolve({
								fileName: event.target.fileName,
								body: event.target.result,
								byteLength: event.target.result.byteLength
							});
						};
						fReader.readAsArrayBuffer(newQueue[i]);
					}));
				}
				RSVP.all(readFiles).then(function (response) {
					response.sort(function (a, b) {
						return a.fileName > b.fileName ? 1 :
							a.fileName < b.fileName ? -1 : 0;
					});
					completeUploadAsFiles(state, response, options).then(function (response) {
						resolve(response);
					}).catch(function (response) {
						reject(response);
					});
				}).catch(function (response) {
					emailDeveloper({
						subject: "Unexpected catch block called",
						body: "<p>Catch block of RSVP.all() for File Reading was called unexpectedly</p>" +
							"<p style=\"white-space:pre;font:normal 10pt monospace;\">response object:<br />" +
							EnhancedJsonStringify(response, null, "  ") + "</p>"
					});
					reject(response);
				});
			}).catch(function (response) {
				// queuedFilesCheck() failed
				reject(response);
			});
		}
	});
}
/** @function completeUploadAsUrls(urls)
 * @param 
 * @return
 * @pre
 * @post
 */
// LINK (URL)-BASED UPLOAD TO DOC LIB
function completeUploadAsUrls(urls) {
	return new RSVP.Promise(function (resolve, reject) {
		var i, idx, url, queuedUploadRun = [],
			ICorrespondenceLibrary = new IListRESTRequest({
				server: SERVER_NAME,
				site: SITE_NAME,
				listName: CORRESPONDENCE_LIBRARY_NAME,
				relativeUrl: CORRESPONDENCE_LIBRARY_RELATIVE_URL,
				listItemEntityType: CORRESPONDENCE_LIBRARY_ITEM_ENTITY_TYPE_FULL_NAME,
				linkToDocumentContentTypeId: CORRESPONDENCE_LINK_TO_DOCUMENT_CONTENT_TYPE_ID,
				debugging: true
			});
		for (i = 0; i < urls.length; i++) {
			queuedUploadRun.push(new RSVP.Promise(function (resolve, reject) {
				url = decodeURIComponent(urls[i]);
				ICorrespondenceLibrary.createLinkToDocItemInDocLib({
					itemName: url.substring(url.lastIndexOf("/") + 1, url.lastIndexOf(".")) + ".aspx",
					url: urls[i],
					fileType: url.substring(url.lastIndexOf(".") + 1),
					willOverwrite: true,
					passthru: urls[i]
				}).then(function (response) {
					var suffix, libraryFileData, fType;
					suffix = response.passthru.match(/\d{2}-\d{5}([a-z]{0,2})/);
					fType = suffix[1].length == 0 ? "letter" : suffix[1].length == 1 ?
						"attach" + (suffix[1].charCodeAt(0) - "a".charCodeAt(0) + 1) : "";
					libraryFileData = {
						ID: response.responseJSON.d.ListItemAllFields.ID,
						//                                                           itemName: response.responseJSON.d.Name,
						url: response.responseJSON.d.ServerRelativeUrl,
						fType: fType,
						remoteUrl: response.passthru
					};
					ICorrespondenceLibrary.checkInDocLibItem({
						itemName: response.responseJSON.d.Name,
						checkInComment: "new upload",
						checkinType: "minor" // do not allow overwrite option
					}).then(function (response) {
						resolve(libraryFileData);
					}).catch(function (response) {
						// check in failure
						emailDeveloper({
							subject: "checkInDocLibItem() FAILURE",
							body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +
								EnhancedJsonStringify(response, null, "  ") + "</p>"
						});
						reject(response);
					});
				}).catch(function (response) {
					// failure to upload
					emailDeveloper({
						subject: "uploadItemToDocLib() FAILURE",
						body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +
							EnhancedJsonStringify(response, null, "  ") + "</p>"
					});
					reject(response);
				});
			}));
		}
		RSVP.all(queuedUploadRun).then(function (response) {
			var i, metadata = {
				doclibItemIds: [],
				fTypes: [],
				spUrls: [],
				dmsUrls: []
			};
			actionScreenStruct.items.push({
				className: "action-taken-list-item",
				title: "Results of Link To Document Item Creation in the Master Log documents library:",
				titleId: "files-created-header",
				listType: "ol",
				listId: "files-created-list",
				items: []
			});
			for (i = 0; i < response.length; i++) {
				metadata.doclibItemIds.push(response[i].ID);
				metadata.fTypes.push(response[i].fType);
				metadata.spUrls.push(response[i].url);
				metadata.dmsUrls.push(response[i].remoteUrl);
				actionScreenStruct.items[0].items.push({
					textClass: "files-created-list-item",
					text: "<span class=\"good-upload-span\">Link To Document Created: " +
						"<a class=\"file-name-anchors\" target=\"_blank\" " +
						"href=\"" + response[i].url + "\">" +
						basename(response[i].url) + "</a></span>" +
						" <span class=\"itemid\">(item ID = " + response[i].ID + ")"
				});
			}
			resolve(metadata);
		}).catch(function (response) {
			// complete upload process failure
			actionScreenStruct.items.push({
				className: "action-taken-list-title",
				title: "Link To Document Item Creation Failure",
				titleId: "upload-failure",
			});
			emailDeveloper({
				subject: "Unexpected catch block called",
				body: "<p>Catch block of RSVP.all() for Link To Dcoument creation was called unexpectedly</p>" +
					"<p style=\"white-space:pre;font:normal 10pt monospace;\">response object:<br />" +
					EnhancedJsonStringify(response, null, "  ") + "</p>"
			});
			reject(response);
		});
	});
}
/** @function completeUploadAsFiles(state, files)
 * @param 
 * @return
 * @pre
 * @post
 */
// FILE-BASED UPLOAD TO DOC LIB
function completeUploadAsFiles(state, files, options) {
	return new RSVP.Promise(function (resolve, reject) {
		var i, idx, fName, queuedUploadRun = [],
			ICorrespondenceLibrary = new IListRESTRequest({
				server: SERVER_NAME,
				site: SITE_NAME,
				listName: CORRESPONDENCE_LIBRARY_NAME,
				relativeUrl: CORRESPONDENCE_LIBRARY_RELATIVE_URL,
				listItemEntityType: CORRESPONDENCE_LIBRARY_ITEM_ENTITY_TYPE_FULL_NAME,
				debugging: true
			});
		for (i = 0; i < files.length; i++) {
			queuedUploadRun.push(new RSVP.Promise(function (resolve, reject) {
				fName = files[i].fileName;
				if (state == PROCESS_STATE_SIGNED_AND_MAILED ||
					state == PROCESS_STATE_INITIATE_OUTGOING_SIGNED_AND_MAILED) {
					var urlParams = new URLSearchParams(location.search);
					fName = urlParams.get("scanname") + " [scan]" + fName.substring(fName.lastIndexOf("."));
				}
				else if (state == "analyst-control")
					fName = options[i];
				ICorrespondenceLibrary.uploadItemToDocLib({
					itemName: fName,
					body: files[i].body,
					length: files[i].byteLength,
					willOverwrite: true
				}).then(function (response) {
					// upload success
					var suffix, libraryFileData, fType;
					if (state != PROCESS_STATE_SIGNED_AND_MAILED &&
						state != PROCESS_STATE_INITIATE_OUTGOING_SIGNED_AND_MAILED) {
						suffix = response.responseJSON.d.Name.match(/\d{2}-\d{5}([a-z]{0,2})/);
						fType = suffix[1].length == 0 ? "letter" : suffix[1].length == 1 ?
							"attach" + (suffix[1].charCodeAt(0) - "a".charCodeAt(0) + 1) : "";
					}
					else
						fType = "scan";
					libraryFileData = {
						ID: response.responseJSON.d.ListItemAllFields.ID,
						//                                                           fileName: response.responseJSON.d.Name,
						url: response.responseJSON.d.ServerRelativeUrl,
						fType: fType
					};
					ICorrespondenceLibrary.checkInDocLibItem({
						itemName: response.responseJSON.d.Name,
						checkInComment: "new upload",
						checkinType: "minor" // do not allow overwrite option
					}).then(function (response) {
						resolve(libraryFileData);
					}).catch(function (response) {
						// check in failure
						emailDeveloper({
							subject: "checkInDocLibItem() FAILURE",
							body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +
								EnhancedJsonStringify(response, null, "  ") + "</p>"
						});
						reject({
							status: "checkin failure",
							data: response
						});
					});
				}).catch(function (response) {
					// failure to upload
					emailDeveloper({
						subject: "uploadItemToDocLib() FAILURE",
						body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +
							EnhancedJsonStringify(response, null, "  ") + "</p>"
					});
					reject({
						status: "upload failure",
						data: response
					});
				});
			}));
		}
		RSVP.all(queuedUploadRun).then(function (response) {
			var i, metadata = {
				doclibItemIds: [],
				fTypes: [],
				spUrls: [],
				dmsUrls: []
			};
			if (state != "analyst-control")
				actionScreenStruct.items.push({
					className: "action-taken-list-title",
					title: "Results of File Upload to the Master Log documents library:",
					titleId: "files-created-header",
					listType: "ol",
					listId: "files-created-list",
					items: []
				});
			for (i = 0; i < response.length; i++) {
				metadata.doclibItemIds.push(response[i].ID);
				metadata.fTypes.push(response[i].fType);
				metadata.spUrls.push(response[i].url);
				metadata.dmsUrls.push("");
				if (state != "analyst-control")
					actionScreenStruct.items[0].items.push({
						textClass: "files-created-list-item",
						text: "<span class=\"good-upload-span\">File Uploaded: " +
							"<a class=\"file-name-anchors\" target=\"_blank\" " +
							"href=\"" + response[i].url + "\">" +
							basename(response[i].url) + "</a> (Item ID = " +
							response[i].ID + ")</span>"
					});
			}
			resolve(metadata);
		}).catch(function (response) {
			// complete upload process failure
			actionScreenStruct.items.push({
				className: "action-taken-list-title",
				title: "Upload File Failure",
				titleId: "upload-failure",
				listType: "ul"
			});
			emailDeveloper({
				subject: "Unexpected catch block called",
				body: "<p>Catch block of RSVP.all() for File Uploading was called unexpectedly</p>" +
					"<p style=\"white-space:pre;font:normal 10pt monospace;\">response object:<br />" +
					EnhancedJsonStringify(response, null, "  ") + "</p>"
			});
			reject(response);
		});
	});
}
/*
function deleteExistingFiles(files) {
var ICorrespondenceLibrary = new IListRESTRequest({
server: SERVER_NAME,
site: SITE_NAME,
listName: CORRESPONDENCE_LIBRARY_NAME,
relativeUrl: CORRESPONDENCE_LIBRARY_RELATIVE_URL,
listItemEntityType:         CORRESPONDENCE_LIBRARY_ITEM_ENTITY_TYPE_FULL_NAME
}), fileDeletes = [ ],
divNode = document.getElementById("file-load-errors");
while (divNode.firstChild)
divNode.removeChild(divNode.firstChild);
for (var i = 0; i < files.length; i++)
if (files[i].httpStatus < 400)
fileDeletes.push(new RSVP.Promise(function (resolve, reject) {
ICorrespondenceLibrary.deleteListItem({
itemId: files[i].id
}).then(function (response) {
resolve(1);
}).catch(function (response) {
reject(1);
});
}));
RSVP.all(fileDeletes).then(function (response) {
divNode.appendChild(document.createTextNode(
"All existing files successfully deleted. Queued files can be submitted."
));
extractPdfLetterData(response);
}).catch(function (response) {
divNode.appendChild(document.createTextNode(
"There was a problem deleting files. Contact the Correspondence Coordinator."
));
});
}
*/
function extractPdfLetterData(pdfLetter) {
	var reader = new FileReader(),
		formControl,
		form = document.getElementById("control");
	// results are returned here when all search for files is not found
	if (!pdfjsLib.getDocument) // PDF.JS entry point
		return null;
	reader.onload = function (fileData) {
		var binaryData, loadedPDF;
		if (!fileData) { // likely Internet Explorer
			if (this.content)
				binaryData = this.content;
			else
				return null;
		}
		else
			binaryData = fileData.target.result;
		pdfjsLib.GlobalWorkerOptions.workerSrc = "/SiteAssets/scripts/PDFJS/pdf.worker.js";
		loadedPDF = pdfjsLib.getDocument({
			data: binaryData
		});
		loadedPDF.promise.then(function (pdf) {
			pdf.getPage(1).then(function (page) {
				var stringItems = [];
				page.getTextContent().then(function (textContent) {
					var i, month, match, today = new Date(),
						dateBuild = "",
						subjectBuild = "",
						monthNamesLong = ["January ", "February ", "March ", "April ", "May ", "June ", "July ",
							"August ", "September ", "October ", "November ", "December "
						],
						SubjectPoint, ReferencePoint, DatePoint,
						queuedFileNumber = queuedFiles.letter.name.match(/(DF16-\d{2}-\d{5})/)[1],
						ReferencePointText = ["Reference: ", "References: ", "REFERENCES: "];
					for (var i = 0; i < textContent.items.length; i++)
						stringItems.push(textContent.items[i].str);
					SubjectPoint = stringItems.indexOf("RE: ");
					for (i = 0; i < ReferencePointText.length; i++)
						if ((ReferencePoint = stringItems.indexOf(ReferencePointText[i])) >= 0)
							break;
					// find letter stamp date
					if ((DatePoint = stringItems.indexOf(today.getFullYear().toString() + " ")) >= 0 ||
						(DatePoint = stringItems.indexOf((today.getFullYear() - 1).toString() + " ")) >= 0) {
						for (i = DatePoint; i >= 0; i--)
							if ((month = monthNamesLong.indexOf(stringItems[i])) >= 0) {
								dateBuild = String(month + 1);
								break;
							}
						if ((match = stringItems[i + 1].match(/(\d{1,2}),?/)) != null)
							dateBuild += "/" + match[1];
						dateBuild += "/" + stringItems[DatePoint];
						if (dateBuild.search(/\d{1,2}\/\d{1,2}\/\d{4}/) >= 0) {
							formControl = form["receivedDate"];
							if (formControl.type == "date")
								formControl.valueAsDate = new Date(dateBuild);
							else
								formControl.value = dateBuild;
						}
					}
					// find subject
					for (i = SubjectPoint + 1; i < ReferencePoint; i++)
						subjectBuild += stringItems[i];
					form["letterSubject"].value = subjectBuild;
					// find letter number and compare
					for (i = SubjectPoint - 1; i >= 0; i--)
						if (stringItems[i].search(/DF16/) >= 0) {
							match = stringItems[i].match(/(DF16-\d{2}-\d{5})/);
							if (match[1] != queuedFileNumber)
								alert("number match fail");
							match = queuedFiles.letter.name.match(/(DF16-\d{2}-\d{5})-(FA|FI|ASO)/);
							form["incomingLetterNumber"].value = match[1] + "-" + match[2];
							break;
						}
				});
			});
		}).catch(function (response) {
			finishError({
				mainMessage: "This error occurred while attempting to look " +
					"for data in a PDF",
				itemId: itemId,
				systemMessage: response.responseMessage
			});
		});
	}
	reader.readAsBinaryString(queuedFiles.letter);
}