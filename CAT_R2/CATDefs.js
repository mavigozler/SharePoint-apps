"use strict";
// CATDefs.js
// globals set from INI file configuration
var MAJOR_VERSION = 2,
	MINOR_VERSION = 0,
	RELEASE = 2,
	LINK_STYLE, // alternative is "anchored" for old style links
	TEMPLATES_FOLDER,
	incomingAsLinks,
	useDragAndDrop,
	MAX_FILE_DESCRIPTION_LENGTH,
	DEBUG_MODE, // set to false when no debug is wanted
	NO_DEV_EMAILS,
	NO_COORDINATOR_CC,
	CC_ADDRESSEE;
var currentUserInfo,
	LIST = 10000,
	LIBRARY = 10001,
	EMAIL_TEMPLATES_FILE = location.origin + pathname(location.pathname) +
	"/CATemailTemplates.html";
// Other constants particular to the system, not configurable    
var LISTING_ROW_COUNT = 20,
	ITEM_ID_PAGE_SIZE = 500,
	LETTER_ID_LENGTH = "DF16-18-00000-ASO".length,
	mode = LIST;
var AFTER = 0,
	BEFORE = 1,
	LETTER_STATE_FINISHED = 9996,
	LETTER_STATE_UNFINISHED = 9997,
	LETTER_STATE_BOTH = 9998,
	LETTER_STATE_MY_QUEUE = 9999,
	DEVELOPER = 1010,
	COORDINATOR = 1008,
	TESTER = 1006,
	EXECUTIVE = 1005,
	SECTION_CHIEF = 1004,
	UNIT_CHIEF = 1002,
	STAFF = 1000;
var CORRESPONDENCE_LIST_NAME,
	CORRESPONDENCE_LIST_ITEM_ENTITY_TYPE_FULL_NAME,
	CORRESPONDENCE_LIBRARY_NAME,
	CORRESPONDENCE_LIBRARY_RELATIVE_URL,
	CORRESPONDENCE_LIBRARY_ITEM_ENTITY_TYPE_FULL_NAME,
	CORRESPONDENCE_LINK_TO_DOCUMENT_CONTENT_TYPE_ID;
var DEVELOPER_EMAIL_ADDRESS,
	CORRESPONDENCE_COORDINATOR_EMAIL_ADDRESS;
var MDSD_PERSONNEL_ROLES = [{
		mdsdPersRole: "Staff",
		cadRoleIDMatch: STAFF
	},
	{
		mdsdPersRole: "Mgr 1",
		cadRoleIDMatch: UNIT_CHIEF
	},
	{
		mdsdPersRole: "Mgr 2",
		cadRoleIDMatch: SECTION_CHIEF
	}
];
var MDSD_PERSONNEL_LIST_COLUMNS_INTERNAL_NAMES = {
	ID: "ID", // single line text
	Last_Name: "Title", // single line text
	First_Name: "First_x0020_Name", // single line text
	Position: "Position", // choice: job titles
	Phone: "Phone", // single line of text
	Email_Address: "Email", // single line text
	Unit: "Unit", // choice: unit names
	Role: "Manager_x003f_", // choice: staff, manager 1, manager 2
	Active: "Active", // 'Yes','No'
	Name_Used: "Name_x0020_Used", // calculated: concat used first name + last name
	Used_First_Middle_Name: "Used_x0020_First_x002f_Middle_x0", // this too?
	Acting_Manager: "Acting_x0020_Mgr_x003f_", // yes/no
};
var CAD_ROLES = [{
		roleID: DEVELOPER,
		roleName: "Developer"
	},
	{
		roleID: COORDINATOR,
		roleName: "Correspondence Coordinator"
	},
	{
		roleID: TESTER,
		roleName: "Tester"
	},
	{
		roleID: SECTION_CHIEF,
		roleName: "Section Chief"
	},
	{
		roleID: UNIT_CHIEF,
		roleName: "Unit Chief"
	},
	{
		roleID: STAFF,
		roleName: "Staff"
	},
	{
		roleID: EXECUTIVE,
		roleName: "Executive"
	}
];
var ROLE_ASSIGNMENTS = [{
		roleID: DEVELOPER,
		holder: "Mitch Halloran"
	},
	{
		roleID: COORDINATOR,
		holder: "Emily Watts"
	},
	{
		roleID: EXECUTIVE,
		holder: "Alani Jackson"
	},
	{
		roleID: EXECUTIVE,
		holder: "Carolyn Brookins"
	},
	{
		roleID: TESTER,
		holder: "Arjan Salimi"
	},
	{
		roleID: TESTER,
		holder: "Leonard Johnson III"
	},
	{
		roleID: TESTER,
		holder: "Shirley Chan"
	}
];
var SERVER_NAME = "mdsd",
	SITE_NAME = "";
// CAT UnitsReviewers SP List and Workflow SP List Info
var
	CAT_WORKFLOW_SITE_NAME = "FormalCorrespondenceAuto",
	CAT_WORKFLOW_LIST_NAME = "CAT Workflow",
	CAT_UNITS_REVIEWERS_SITE_NAME = "FormalCorrespondenceAuto",
	CAT_UNITS_REVIEWERS_LIST_NAME = "CAT Units & Reviewers",
	CAT_WORKFLOW_LIST_ITEM_ID_COLUMN = "Id", // Number
	CAT_WORKFLOW_LIST_Workflow_COLUMN = "WorkFlow", // Number
	CAT_WORKFLOW_LIST_Unit_COLUMN = "Title", // SLoT
	CAT_WORKFLOW_LIST_Unit_Chief_COLUMN = "Unit_x0020_Chief", // Lookup column
	CAT_WORKFLOW_LIST_Section_COLUMN = "To_x0020_Section", // SLoT
	CAT_WORKFLOW_LIST_Section_Chief_COLUMN = "Section_x0020_Chief", // Lookup_column
	CAT_UNITS_REVIEWERS_LIST_ITEM_ID_COLUMN = "Id",
	CAT_UNITS_REVIEWERS_LIST_Unit_Section_Name_COLUMN = "Title",
	// the Reviewer column is a Site column and contains the ID
	CAT_UNITS_REVIEWERS_LIST_MDSDP_ID_COLUMN = "Name_x0020_on_x0020_Personnel_x0Id";
var CatCONST = {
	INCOMING_ATTACHMENT_LIMIT: 99,
	CORRESPONDENCE_LIST_ITEM_ID_COLUMN_NAME: "ID", // SP List item ID -- built-in SP list feature
	CORRESPONDENCE_LIST_STATUS_COLUMN_NAME: "Status", // single line of text
	CORRESPONDENCE_LIST_INCOMING_LETTER_NUMBER_COLUMN_NAME: "Title", // the vendor's letter ID designation: namely DF16-YY-NNNNNa-vv
	CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME: "LetterSubject", //
	CORRESPONDENCE_LIST_INCOMING_RECEIVED_DATE_COLUMN_NAME: "ReceivedDate", // date letter MDSD says it received letter
	CORRESPONDENCE_LIST_CORRESPONDENCE_TYPE_COLUMN_NAME: "CorrespondenceType", // choice
	CORRESPONDENCE_LIST_INCOMING_VENDOR_COLUMN_NAME: "IncomingVendor", // choice: ?, ASO, FI
	CORRESPONDENCE_LIST_LAST_ACTION_DATE_COLUMN_NAME: "LastActionDate", // date
	CORRESPONDENCE_LIST_ASSIGNED_UNIT_COLUMN_NAME: "AssignedUnit", // single line of text representing unit assigned letter
	CORRESPONDENCE_LIST_ASSIGNED_ANALYST_COLUMN_NAME: "AssignedAnalyst", // single line of text representing 1st and last name of assigned analyst
	CORRESPONDENCE_LIST_ASSIGNED_DATE_COLUMN_NAME: "AssignedDate", // date analyst got assigned the task
	CORRESPONDENCE_LIST_RESPONSE_REQUIRED_COLUMN_NAME: "ResponseRequired",
	CORRESPONDENCE_LIST_DOCUMENT_LIBRARY_COLUMN_NAME: "DocumentLibraryLinks", // multiple lines of rich text
	CORRESPONDENCE_LIST_UNIT_CHIEF_NAME_COLUMN_NAME: "UnitChiefReviewing", //single line of text: first+last name of manager I
	CORRESPONDENCE_LIST_SECTION_CHIEF_NAME_COLUMN_NAME: "SectionChiefReviewing", //single line of text: first+last name of manager II
	CORRESPONDENCE_LIST_OUTGOING_LETTER_NUMBER_COLUMN_NAME: "OutgoingLetterNumber", // single line of test
	CORRESPONDENCE_LIST_OUTGOING_VENDOR_COLUMN_NAME: "OutgoingVendor", // choice: ASO, FI
	CORRESPONDENCE_LIST_EXEC_ROUTING_REVIEW_DATE_COLUMN_NAME: "ExecRoutingReviewDate", // date
	CORRESPONDENCE_LIST_SIGNATURE_COLUMN_NAME: "Signature", // choice: signed, not signed
	CORRESPONDENCE_LIST_DATE_SENT_COLUMN_NAME: "DateSent", // date and time
	CORRESPONDENCE_LIST_COMMENTS_COLUMN_NAME: "Comments", // single line of text
	CORRESPONDENCE_LIST_REVIEWER_COMMENT_COLUMN_NAME: "ReviewerComment", // single line of text
	CORRESPONDENCE_LIST_DOCLIB_INCOMING_IDS_COLUMN_NAME: "Doclib Incoming IDs", // single line of text
	CORRESPONDENCE_LIST_DOCLIB_OUTGOING_IDS_COLUMN_NAME: "Doclib Outgoing IDs", // single line of text
	CORRESPONDENCE_LIST_STATE_COLUMN_NAME: "State", // number
	CORRESPONDENCE_LIST_STATE_CONFIRM_COLUMN_NAME: "StateConfirm", // number
	CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME: "EmailAddressHolder", // single line of text
	CORRESPONDENCE_LIST_WORKFLOW_URL_HOLDER_COLUMN_NAME: "Workflow URL Holder", // single line of text
	CORRESPONDENCE_LIST_ITEM_DATA_COLUMN_NAME: "ListItemJSON", // single line of text added item data
	CORRESPONDENCE_LIST_PRIOR_ITEM_DATA_COLUMN_NAME: "PriorListItemJSON", // backup to item data
	CORRESPONDENCE_LIST_MODIFIED_COLUMN_NAME: "Modified", // date and time
	CORRESPONDENCE_LIST_CREATED_BY_COLUMN_NAME: "Author", // person or group
	CORRESPONDENCE_LIST_MODIFIED_BY_COLUMN_NAME: "Editor", // person or group
	
	CORRESPONDENCE_LIBRARY_ID_COLUMN_NAME: "ID", // SP List item ID -- built-in SP list feature
	CORRESPONDENCE_LIBRARY_FILENAME_COLUMN_NAME: "FileLeafRef", // filename, not changed
	CORRESPONDENCE_LIBRARY_ASSOCIATED_LIST_ID_COLUMN_NAME: "Title", // number
	CORRESPONDENCE_LIBRARY_FILETYPE_COLUMN_NAME: "FileType", // choice with fill-in
	CORRESPONDENCE_LIBRARY_DMS_URL_COLUMN_NAME: "DMS_x0020_URL", // choice "?","Incoming","Outgoing"
	CORRESPONDENCE_LIBRARY_DIRECTION_COLUMN_NAME: "Direction", // choice "?","Incoming","Outgoing"
	CORRESPONDENCE_LIBRARY_CREATED_COLUMN_NAME: "Created", // date and time
	CORRESPONDENCE_LIBRARY_MODIFIED_COLUMN_NAME: "Modified", // date and time
	CORRESPONDENCE_LIBRARY_CREATED_BY_COLUMN_NAME: "Author", // person or group
	CORRESPONDENCE_LIBRARY_MODIFIED_BY_COLUMN_NAME: "Editor", // person or group
	CORRESPONDENCE_LIBRARY_CHECKED_OUT_TO_COLUMN_NAME: "CheckoutUser", // person or group
		// undeletable, available, but not utilized
	CORRESPONDENCE_LIBRARY_DOCUMENT_TITLE_COLUMN_NAME: "Title", // single line of text
	CORRESPONDENCE_LIBRARY_ATTACHMENT_NUMBER_COLUMN_NAME: "Attachment_x0020_No_x002e_", // number
	CORRESPONDENCE_LIBRARY_DESCRIPTION_COLUMN_NAME: "DocumentSetDescription", // multiple lines of text
	
	
	//  FORM and QUERY STRING literals
	QUERY_STRING_NAME_STATE: "state",
	QUERY_STRING_NAME_ITEM_ID: "itemid",
	//        QUERY_STRING_NAME_EMAIL_BODIES_HREF : "itemid",
	QUERY_STRING_NAME_RECEIVED_DATE: "receivedDate",
	QUERY_STRING_NAME_INCOMING_LETTER_NUMBER: "incomingLetterNumber",
	QUERY_STRING_NAME_LETTER_SUBJECT: "letterSubject",
	QUERY_STRING_NAME_CORRESPONDENCE_TYPE: "correspondenceType",
	QUERY_STRING_NAME_INIT_CORRESPONDENCE_TYPE: "initCorrespondenceType",
	QUERY_STRING_NAME_LETTER_URL: "letterUrl",
	QUERY_STRING_NAME_ASSIGNED_UNIT: "unit",
	QUERY_STRING_NAME_ASSIGNED_ANALYST: "analyst",
	QUERY_STRING_NAME_RESPONSE_DECISION: "responseDecision",
	QUERY_STRING_NAME_MGR1_REVIEWER: "mgr1Decision",
	QUERY_STRING_NAME_MGR1_COMMENT: "mgr1RedoComment",
	QUERY_STRING_NAME_MGR2_REVIEWER: "mgr2Decision",
	QUERY_STRING_NAME_MGR2_COMMENT: "mgr2RedoComment",
	QUERY_STRING_NAME_OUTGOING_LETTER_NUMBER: "outgoingLetterNumber",
	QUERY_STRING_NAME_OUTGOING_VENDOR: "outgoingVendor",
	QUERY_STRING_NAME_SHORT_DESCRIPTION: "shortDesc",
	QUERY_STRING_NAME_EXEC_REVIEW_DATE: "execReviewDate",
	QUERY_STRING_NAME_MAILING_DATE: "mailingDate",
	QUERY_STRING_NAME_SOURCE: "source",
	QUERY_STRING_NAME_UPLOADED_FILES: "uploadFiles",
	QUERY_STRING_NAME_ASSIGNED_UNIT_INITIATE: "unitInitiate",
	QUERY_STRING_NAME_VENDOR_INITIATE: "vendorInitiate",
	QUERY_STRING_NAME_LETTER_SUBJECT_INITIATE: "letterSubjectInitiate",
	QUERY_STRING_NAME_ASSIGNED_ANALYST_INITIATE: "assignedAnalystInitiate",
	QUERY_STRING_NAME_UNIT_CHIEF_REEVALUATION_DECISION: "reevaluationDecision",
	GET_INCOMING_FILE_SET: 100,
	GET_OUTGOING_FILE_SET: 101,
	INCOMING_LETTER_AND_ATTACHMENT_NUMBER_PATTERN: /(DF16\-\d{2}\-\d{5})(\s?|[a-z]{1,2})\-(FI|ASO|FA)\s?/,
	OUTGOING_LETTER_AND_ATTACHMENT_NAME_PATTERN: /(SC16\-\d{2}\-\d{5})(\s?|[a-z]{1,2})\-([Xx]{2}|FI|ASO)\s([\w\s\-_\.]{1,50})/,
	INCOMING_LETTER_NUMBER_PATTERN: /DF16\-\d{2}\-\d{5}\s?\-(FI|ASO|FA)\s*/,
	OUTGOING_LETTER_NAME_PATTERN: /SC16\-\d{2}\-00000\s?\-([Xx]{2}|FI|ASO)\s([\w\s\-_\.]{1,50})/,
	INCOMING_ATTACHMENT_NUMBER_PATTERN: /(DF16\-\d{2}\-\d{5})([a-z]{1,2})\-(FI|ASO|FA)\s?/,
	OUTGOING_ATTACHMENT_NAME_PATTERN: /SC16\-\d{2}\-00000([a-z]{1,2})\-([Xx]{2}|FI|ASO)\s[\w\s\-_]{1,50}/
};
// To find, use <site>/_api/Web/Lists/GetByTitle('<list name>')/ListItemEntityTypeFullName
var LIST = 2000,
	LIBRARY = 2001;
var PROCESS_STATE_ERROR = -1,
	PROCESS_STATE_CREATE_INCOMING_TASK = 0,
	PROCESS_STATE_ASSIGN_UNIT_TASK = 1,
	PROCESS_STATE_ASSIGN_ANALYST_TASK = 2,
	PROCESS_STATE_DECIDE_RESPONSE_TASK = 3,
	PROCESS_STATE_DRAFT_RESPONSE_TASK = 4,
	PROCESS_STATE_UNIT_CHIEF_REEVALUATE = 5,
	PROCESS_STATE_ANALYST_RESPONSE_DIRECTED = 6,
	PROCESS_STATE_UNIT_CHIEF_REVIEW_TASK = 7,
	PROCESS_STATE_SECTION_CHIEF_REVIEW_TASK = 8,
	PROCESS_STATE_ANALYST_REDO_REQUIRED = 9,
	PROCESS_STATE_UNIT_CHIEF_REVIEW_REDO_REQUIRED = 10,
	PROCESS_STATE_SECTION_CHIEF_REVIEW_REDO_REQUIRED = 11,
	PROCESS_STATE_STAMPING_TASK = 12,
	PROCESS_STATE_SIGNED_AND_MAILED = 13,
	PROCESS_STATE_INFORM_ON_NO_INCOMING_RESPONSE = 15,
	PROCESS_STATE_INCOMING_ANALYST_PROOF_UPLOAD = 16,
	PROCESS_STATE_INITIATED_ANALYST_PROOF_UPLOAD = 17,
	PROCESS_STATE_COMPLETE = 99,
	PROCESS_STATE_INITIATE_OUTGOING_START = 100,
	PROCESS_STATE_INITIATE_OUTGOING_ANALYST_UPLOAD = 101,
	PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW = 102,
	PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW = 103,
	PROCESS_STATE_INITIATE_OUTGOING_ANALYST_REDO_REQUIRED = 104,
	PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW_REDO_REQUIRED = 105,
	PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW_REDO_REQUIRED = 106,
	PROCESS_STATE_INITIATE_OUTGOING_STAMPING_TASK = 107,
	PROCESS_STATE_INITIATE_OUTGOING_SIGNED_AND_MAILED = 108,
	PROCESS_STATE_INITIATE_OUTGOING_COMPLETE = 199,
	PROCESS_STATE_NO_RESPONSE_REQUIRED_COMPLETE = 999;
var LinkToDocumentASPXTemplate =
	"<%@ Assembly Name='Microsoft.SharePoint, Version=16.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c' %>\n" +
	"<%@ Register TagPrefix='SharePoint' Namespace='Microsoft.SharePoint.WebControls' Assembly='Microsoft.SharePoint' %>\n" +
	"<%@ Import Namespace='System.IO' %>\n" +
	"<%@ Import Namespace='Microsoft.SharePoint' %>\n" +
	"<%@ Import Namespace='Microsoft.SharePoint.Utilities' %>\n" +
	"<%@ Import Namespace='Microsoft.SharePoint.WebControls' %>\n" +
	"<html xmlns:mso=\"urn:schemas-microsoft-com:office:office\" xmlns:msdt=\"uuid:C2F41010-65B3-11d1-A29F-00AA00C14882\">\n" +
	"<head> <meta name='progid' content='SharePoint.Link' />\n" +
	"<!--[if gte mso 9]><SharePoint:CTFieldRefs runat=server Prefix=\"mso:\" FieldList=\"FileLeafRef,URL\"><xml>\n" +
	"<mso:CustomDocumentProperties>\n" +
	"<mso:ContentTypeId msdt:dt=\"string\">$$LinkToDocumentContentTypeId$$</mso:ContentTypeId>\n" +
	"<mso:IconOverlay msdt:dt=\"string\">|$$filetype$$|linkoverlay.gif</mso:IconOverlay>\n" +
	"<mso:URL msdt:dt=\"string\">$$LinkToDocUrl$$, $$LinkToDocUrl$$</mso:URL>\n" +
	"</mso:CustomDocumentProperties>\n" +
	"</xml></SharePoint:CTFieldRefs><![endif]-->\n" +
	"</head>\n" +
	"<body>\n" +
	"<form id='Form1' runat='server'>\n" +
	"<SharePoint:UrlRedirector id='Redirector1' runat='server' />\n" +
	"</form>\n" +
	"</body>\n" +
	"</html>\n";
// text status updates
var
	STATUS_CRITICAL_ERROR = "The item is in a critical error state. See COMMENTS column for possible description",
	STATUS_NEW_ITEM = "New letter, pending unit assignment from Coordinator",
	STATUS_UNIT_ASSIGNED = "Unit assigned, pending analyst assignment",
	STATUS_ANALYST_ASSIGNED = "Analyst assigned, pending decision from Analyst if response required",
	STATUS_ANALYST_DECIDED_YES = "Analyst decided response needed, waiting for letter draft",
	STATUS_ANALYST_DECIDED_NO = "Analyst decided response not needed, waiting for unit chief evaluation",
	STATUS_ANALYST_RESPONSE_REQUIRED = "Unit chief has decided response necessary, analyst to draft letter",
	STATUS_RESPONSE_LETTER_DRAFTED = "Response letter drafted, pending Unit Chief Review",
	STATUS_RESPONSE_LETTER_DRAFTED_TO_SEC_CHIEF =
	"Response letter drafted, pending Section Chief Review",
	STATUS_UNIT_CHIEF_REVIEW_DONE = "Outgoing letter Unit Chief review complete, pending Section Chief review",
	STATUS_SECTION_CHIEF_REVIEW_DONE = "Outgoing letter Section Chief review complete, pending numbering & dating of letter by Coordinator",
	STATUS_STAMPING_DONE = "Outgoing letter numbered & dated, routed for signature",
	STATUS_SIGNED_MAILED = "Outgoing letter signed, uploaded and mailed to vendor",
	STATUS_NO_RESPONSE_NECESSARY = "Process complete: response letter determined to be not needed",
	STATUS_ANALYST_REDO_NEEDED = "Outgoing letter being re-done by analyst after initial review",
	STATUS_UNIT_CHIEF_REDO_NEEDED = "Outgoing letter back in Unit Chief review due to edits",
	STATUS_SECTION_CHIEF_REDO_NEEDED = "Outgoing letter back in Section Chief review due to edits",
	STATUS_NEW_ITEM_OUTGOING = "Outgoing letter initiated, waiting for analyst draft upload";

function getStatusFromState(state) {
	var stateStatus = {
		PROCESS_STATE_ERROR: STATUS_CRITICAL_ERROR,
		PROCESS_STATE_ASSIGN_UNIT_TASK: STATUS_NEW_ITEM,
		PROCESS_STATE_ASSIGN_ANALYST_TASK: STATUS_UNIT_ASSIGNED,
		PROCESS_STATE_DECIDE_RESPONSE_TASK: STATUS_ANALYST_ASSIGNED,
		PROCESS_STATE_DRAFT_RESPONSE_TASK: STATUS_ANALYST_DECIDED_YES,
		PROCESS_STATE_NO_RESPONSE_REQUIRED_COMPLETE: STATUS_ANALYST_DECIDED_NO,
		PROCESS_STATE_ANALYST_RESPONSE_DIRECTED: STATUS_ANALYST_RESPONSE_REQUIRED,
		PROCESS_STATE_UNIT_CHIEF_REVIEW_TASK: STATUS_RESPONSE_LETTER_DRAFTED,
		PROCESS_STATE_SECTION_CHIEF_REVIEW_TASK: STATUS_UNIT_CHIEF_REVIEW_DONE,
		PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW: STATUS_UNIT_CHIEF_REVIEW_DONE,
		PROCESS_STATE_STAMPING_TASK: STATUS_SECTION_CHIEF_REVIEW_DONE,
		PROCESS_STATE_SIGNED_AND_MAILED: STATUS_STAMPING_DONE,
		PROCESS_STATE_INITIATE_OUTGOING_SIGNED_AND_MAILED: STATUS_STAMPING_DONE,
		PROCESS_STATE_COMPLETE: STATUS_SIGNED_MAILED,
		PROCESS_STATE_INITIATE_OUTGOING_COMPLETE: STATUS_SIGNED_MAILED,
		PROCESS_STATE_UNIT_CHIEF_REEVALUATE: STATUS_NO_RESPONSE_NECESSARY,
		PROCESS_STATE_ANALYST_REDO_REQUIRED: STATUS_ANALYST_REDO_NEEDED,
		PROCESS_STATE_INITIATE_OUTGOING_ANALYST_REDO_REQUIRED: STATUS_ANALYST_REDO_NEEDED,
		PROCESS_STATE_UNIT_CHIEF_REVIEW_REDO_REQUIRED: STATUS_UNIT_CHIEF_REDO_NEEDED,
		PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW_REDO_REQUIRED: STATUS_UNIT_CHIEF_REDO_NEEDED,
		PROCESS_STATE_SECTION_CHIEF_REVIEW_REDO_REQUIRED: STATUS_SECTION_CHIEF_REDO_NEEDED,
		PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW_REDO_REQUIRED: STATUS_SECTION_CHIEF_REDO_NEEDED,
		PROCESS_STATE_INITIATE_OUTGOING_ANALYST_UPLOAD: STATUS_NEW_ITEM_OUTGOING
	};
	if (stateStatus[state] == null)
		return "Undefined status from state";
	return stateStatus[state];
}
var StateStatusAssociation = [
	// { state: PROCESS_STATE_ , status: STATUS_ , flow: "incoming"|"initiated"|null }
	{
		state: PROCESS_STATE_ERROR,
		status: STATUS_CRITICAL_ERROR,
		flow: null
	},
	{
		state: PROCESS_STATE_ASSIGN_UNIT_TASK,
		status: STATUS_NEW_ITEM,
		flow: "incoming"
	},
	{
		state: PROCESS_STATE_ASSIGN_ANALYST_TASK,
		status: STATUS_UNIT_ASSIGNED,
		flow: "incoming"
	},
	{
		state: PROCESS_STATE_DECIDE_RESPONSE_TASK,
		status: STATUS_ANALYST_ASSIGNED,
		flow: "incoming"
	},
	{
		state: PROCESS_STATE_DRAFT_RESPONSE_TASK,
		status: STATUS_ANALYST_DECIDED_YES,
		flow: "incoming"
	},
	{
		state: PROCESS_STATE_NO_RESPONSE_REQUIRED_COMPLETE,
		status: STATUS_ANALYST_DECIDED_NO,
		flow: "incoming"
	},
	{
		state: PROCESS_STATE_ANALYST_RESPONSE_DIRECTED,
		status: STATUS_ANALYST_RESPONSE_REQUIRED,
		flow: "incoming"
	},
	{
		state: PROCESS_STATE_UNIT_CHIEF_REVIEW_TASK,
		status: STATUS_RESPONSE_LETTER_DRAFTED,
		flow: "incoming"
	},
	{
		state: PROCESS_STATE_SECTION_CHIEF_REVIEW_TASK,
		status: STATUS_UNIT_CHIEF_REVIEW_DONE,
		flow: "incoming"
	},
	{
		state: PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW,
		status: STATUS_UNIT_CHIEF_REVIEW_DONE,
		flow: "initiated"
	},
	{
		state: PROCESS_STATE_STAMPING_TASK,
		status: STATUS_SECTION_CHIEF_REVIEW_DONE,
		flow: "incoming"
	},
	{
		state: PROCESS_STATE_SIGNED_AND_MAILED,
		status: STATUS_STAMPING_DONE,
		flow: "incoming"
	},
	{
		state: PROCESS_STATE_INITIATE_OUTGOING_SIGNED_AND_MAILED,
		status: STATUS_STAMPING_DONE,
		flow: "initiated"
	},
	{
		state: PROCESS_STATE_COMPLETE,
		status: STATUS_SIGNED_MAILED,
		flow: "incoming"
	},
	{
		state: PROCESS_STATE_INITIATE_OUTGOING_COMPLETE,
		status: STATUS_SIGNED_MAILED,
		flow: "initiated"
	},
	{
		state: PROCESS_STATE_UNIT_CHIEF_REEVALUATE,
		status: STATUS_NO_RESPONSE_NECESSARY,
		flow: "incoming"
	},
	{
		state: PROCESS_STATE_ANALYST_REDO_REQUIRED,
		status: STATUS_ANALYST_REDO_NEEDED,
		flow: "incoming"
	},
	{
		state: PROCESS_STATE_INITIATE_OUTGOING_ANALYST_REDO_REQUIRED,
		status: STATUS_ANALYST_REDO_NEEDED,
		flow: "initiated"
	},
	{
		state: PROCESS_STATE_UNIT_CHIEF_REVIEW_REDO_REQUIRED,
		status: STATUS_UNIT_CHIEF_REDO_NEEDED,
		flow: "incoming"
	},
	{
		state: PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW_REDO_REQUIRED,
		status: STATUS_UNIT_CHIEF_REDO_NEEDED,
		flow: "initiated"
	},
	{
		state: PROCESS_STATE_SECTION_CHIEF_REVIEW_REDO_REQUIRED,
		status: STATUS_SECTION_CHIEF_REDO_NEEDED,
		flow: "incoming"
	},
	{
		state: PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW_REDO_REQUIRED,
		status: STATUS_SECTION_CHIEF_REDO_NEEDED,
		flow: "initiated"
	},
	{
		state: PROCESS_STATE_INITIATE_OUTGOING_ANALYST_UPLOAD,
		status: STATUS_NEW_ITEM_OUTGOING,
		flow: "initiated"
	}
];

function formatRESTBody(bodyArray) {
	var i, bodyString = "";
	for (i = 0; i < bodyArray.length; i++) {
		if (typeof bodyArray[i][1] == "string")
			bodyArray[i][1] = bodyArray[i][1].replace(/'/g, '\\\'');
		if (i > 0)
			bodyString += ",";
		if (bodyArray[i][1] == null)
			bodyString += "'" + bodyArray[i][0] + "':null";
		else
			bodyString += "'" + bodyArray[i][0] + "':'" + bodyArray[i][1] + "'";
	}
	return bodyString;
}

function getProcessState(state) {
	var pState = {
		incoming: false,
		redo: false
	};
	switch (state) {
		case PROCESS_STATE_ERROR:
		case PROCESS_STATE_NO_RESPONSE_REQUIRED_COMPLETE:
		case PROCESS_STATE_COMPLETE:
		case PROCESS_STATE_INITIATE_OUTGOING_COMPLETE:
			pState = {};
			break;
		case PROCESS_STATE_CREATE_INCOMING_TASK:
		case PROCESS_STATE_ASSIGN_UNIT_TASK:
		case PROCESS_STATE_ASSIGN_ANALYST_TASK:
		case PROCESS_STATE_DECIDE_RESPONSE_TASK:
		case PROCESS_STATE_DRAFT_RESPONSE_TASK:
		case PROCESS_STATE_UNIT_CHIEF_REEVALUATE:
		case PROCESS_STATE_ANALYST_RESPONSE_DIRECTED:
		case PROCESS_STATE_UNIT_CHIEF_REVIEW_TASK:
		case PROCESS_STATE_SECTION_CHIEF_REVIEW_TASK:
		case PROCESS_STATE_STAMPING_TASK:
		case PROCESS_STATE_SIGNED_AND_MAILED:
			pState.incoming = true;
			break;
		case PROCESS_STATE_ANALYST_REDO_REQUIRED:
		case PROCESS_STATE_UNIT_CHIEF_REVIEW_REDO_REQUIRED:
		case PROCESS_STATE_SECTION_CHIEF_REVIEW_REDO_REQUIRED:
			pState.incoming = true;
			pState.redo = true;
			break;
		case PROCESS_STATE_INITIATE_OUTGOING_ANALYST_UPLOAD:
		case PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW:
		case PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW:
		case PROCESS_STATE_INITIATE_OUTGOING_STAMPING_TASK:
		case PROCESS_STATE_INITIATE_OUTGOING_SIGNED_AND_MAILED:
			break;
		case PROCESS_STATE_INITIATE_OUTGOING_ANALYST_REDO_REQUIRED:
		case PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW_REDO_REQUIRED:
		case PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW_REDO_REQUIRED:
			pState.redo = true;
			break;
	}
	return pState;
}