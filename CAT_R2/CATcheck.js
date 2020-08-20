"use strict";

 

// CATDefs.js

          // globals set from INI file configuration

var MAJOR_VERSION = 2,

          MINOR_VERSION = 0,

          RELEASE = 2,

          LINK_STYLE,  // alternative is "anchored" for old style links

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

         

var AFTER = 0, BEFORE = 1,

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

         

var      CORRESPONDENCE_LIST_NAME,

                    CORRESPONDENCE_LIST_ITEM_ENTITY_TYPE_FULL_NAME,

                     CORRESPONDENCE_LIBRARY_NAME,

                     CORRESPONDENCE_LIBRARY_RELATIVE_URL,

                  CORRESPONDENCE_LIBRARY_ITEM_ENTITY_TYPE_FULL_NAME,

                   CORRESPONDENCE_LINK_TO_DOCUMENT_CONTENT_TYPE_ID;

                   

var      DEVELOPER_EMAIL_ADDRESS,

                     CORRESPONDENCE_COORDINATOR_EMAIL_ADDRESS;

         

var MDSD_PERSONNEL_ROLES = [

          { mdsdPersRole: "Staff", cadRoleIDMatch: STAFF },

          { mdsdPersRole: "Mgr 1", cadRoleIDMatch: UNIT_CHIEF },

          { mdsdPersRole: "Mgr 2", cadRoleIDMatch: SECTION_CHIEF }

];

 

var MDSD_PERSONNEL_LIST_COLUMNS_INTERNAL_NAMES = {

          ID : "ID", // single line text

          Last_Name : "Title", // single line text

          First_Name : "First_x0020_Name", // single line text

          Position : "Position", // choice: job titles

          Phone : "Phone", // single line of text

          Email_Address : "Email", // single line text

          Unit : "Unit", // choice: unit names

          Role : "Manager_x003f_", // choice: staff, manager 1, manager 2

          Active : "Active", // 'Yes','No'

          Name_Used : "Name_x0020_Used", // calculated: concat used first name + last name

          Used_First_Middle_Name : "Used_x0020_First_x002f_Middle_x0", // this too?

          Acting_Manager : "Acting_x0020_Mgr_x003f_", // yes/no

};

 

var CAD_ROLES = [

          { roleID : DEVELOPER, roleName : "Developer" },

          { roleID : COORDINATOR, roleName : "Correspondence Coordinator" },

          { roleID : TESTER, roleName : "Tester" },

          { roleID : SECTION_CHIEF, roleName : "Section Chief" },

          { roleID : UNIT_CHIEF, roleName : "Unit Chief" },

          { roleID : STAFF, roleName : "Staff" },

          { roleID : EXECUTIVE, roleName : "Executive" }

];

 

var ROLE_ASSIGNMENTS = [

          { roleID: DEVELOPER, holder: "Mitch Halloran" },

          { roleID: COORDINATOR, holder: "Emily Watts" },

          { roleID: EXECUTIVE, holder: "Alani Jackson" },

          { roleID: EXECUTIVE, holder: "Carolyn Brookins" },

          { roleID: TESTER, holder: "Arjan Salimi" },

          { roleID: TESTER, holder: "Leonard Johnson III" },

          { roleID: TESTER, holder: "Shirley Chan" }

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

          CAT_WORKFLOW_LIST_Unit_COLUMN = "Title",  // SLoT

          CAT_WORKFLOW_LIST_Unit_Chief_COLUMN = "Unit_x0020_Chief", // Lookup column

          CAT_WORKFLOW_LIST_Section_COLUMN = "To_x0020_Section",  // SLoT

          CAT_WORKFLOW_LIST_Section_Chief_COLUMN = "Section_x0020_Chief", // Lookup_column

         

          CAT_UNITS_REVIEWERS_LIST_ITEM_ID_COLUMN = "Id",

          CAT_UNITS_REVIEWERS_LIST_Unit_Section_Name_COLUMN = "Title",

// the Reviewer column is a Site column and contains the ID

          CAT_UNITS_REVIEWERS_LIST_MDSDP_ID_COLUMN = "Name_x0020_on_x0020_Personnel_x0Id";

 

var CatCONST = {

 

          INCOMING_ATTACHMENT_LIMIT : 99,

                    

          CORRESPONDENCE_LIST_ITEM_ID_COLUMN_NAME : "ID", // SP List item ID -- built-in SP list feature

          CORRESPONDENCE_LIST_STATUS_COLUMN_NAME : "Status", // single line of text

CORRESPONDENCE_LIST_INCOMING_LETTER_NUMBER_COLUMN_NAME : "Title", // the vendor's letter ID designation: namely DF16-YY-NNNNNa-vv

          CORRESPONDENCE_LIST_LETTER_SUBJECT_COLUMN_NAME : "SUBJECT_x0020_", //

CORRESPONDENCE_LIST_INCOMING_RECEIVED_DATE_COLUMN_NAME : "Date", // date letter MDSD says it received letter

CORRESPONDENCE_LIST_CORRESPONDENCE_TYPE_COLUMN_NAME : "Correspondence_x0020_Type", // choice

        CORRESPONDENCE_LIST_INCOMING_VENDOR_COLUMN_NAME : "Vendor_x0020_ID", // choice: ?, ASO, FI

        CORRESPONDENCE_LIST_LAST_ACTION_DATE_COLUMN_NAME : "Last_x0020_Action_x0020_Date", // date

          CORRESPONDENCE_LIST_ASSIGNED_UNIT_COLUMN_NAME : "Manager",     // single line of text representing unit assigned letter

        CORRESPONDENCE_LIST_ASSIGNED_ANALYST_COLUMN_NAME : "Staff",  // single line of text representing 1st and last name of assigned analyst

          CORRESPONDENCE_LIST_ASSIGNED_DATE_COLUMN_NAME : "Assigned_x0020_Date", // date analyst got assigned the task

     CORRESPONDENCE_LIST_RESPONSE_REQUIRED_COLUMN_NAME : "SC_x0020_Required_x003f_",

       CORRESPONDENCE_LIST_DOCUMENT_LIBRARY_COLUMN_NAME : "Document_x0020_Library", // multiple lines of rich text

          CORRESPONDENCE_LIST_UNIT_CHIEF_NAME_COLUMN_NAME : "Manager_x0020_I_x0020_review_x00", //single line of text: first+last name of manager I

    CORRESPONDENCE_LIST_SECTION_CHIEF_NAME_COLUMN_NAME : "Manager_x0020_II_x0020_review_x0", //single line of text: first+last name of manager II

CORRESPONDENCE_LIST_OUTGOING_LETTER_NUMBER_COLUMN_NAME : "SC_x0023_", // single line of test

        CORRESPONDENCE_LIST_OUTGOING_VENDOR_COLUMN_NAME : "Outgoing_x0020_Vendor", // choice: ASO, FI

CORRESPONDENCE_LIST_EXEC_ROUTING_REVIEW_DATE_COLUMN_NAME : "Date_x0020_Routed_x0020_for_x002", // date

          CORRESPONDENCE_LIST_SIGNATURE_COLUMN_NAME : "Signature_x003f_", // choice: signed, not signed

          CORRESPONDENCE_LIST_DATE_SENT_COLUMN_NAME : "Date_x0020_sent", // date and time

          CORRESPONDENCE_LIST_COMMENTS_COLUMN_NAME : "Comments", // single line of text

      CORRESPONDENCE_LIST_REVIEWER_COMMENT_COLUMN_NAME : "Reviewer_x0020_Comment", // single line of text

  CORRESPONDENCE_LIST_DOCLIB_INCOMING_IDS_COLUMN_NAME : "DocLib_x0020_Incoming_x0020_IDs", // single line of text

  CORRESPONDENCE_LIST_DOCLIB_OUTGOING_IDS_COLUMN_NAME : "DocLib_x0020_Outgoing_x0020_IDs", // single line of text

          CORRESPONDENCE_LIST_STATE_COLUMN_NAME : "State", // number

          CORRESPONDENCE_LIST_STATE_CONFIRM_COLUMN_NAME : "State_x0020_Confirm", // number

CORRESPONDENCE_LIST_EMAIL_ADDRESS_HOLDER_COLUMN_NAME : "Workflow_x0020_Email_x0020_Addre", // single line of text

CORRESPONDENCE_LIST_WORKFLOW_URL_HOLDER_COLUMN_NAME : "Workflow_x0020_URL_x0020_Holder", // single line of text

          CORRESPONDENCE_LIST_ITEM_DATA_COLUMN_NAME : "Peer_x0020_review", // single line of text added item data

          CORRESPONDENCE_LIST_PRIOR_ITEM_DATA_COLUMN_NAME : "Prior_x0020_Item_x0020_Data", // backup to item data

          CORRESPONDENCE_LIST_MODIFIED_COLUMN_NAME : "Modified", // date and time

          CORRESPONDENCE_LIST_CREATED_BY_COLUMN_NAME : "Author", // person or group

          CORRESPONDENCE_LIST_MODIFIED_BY_COLUMN_NAME : "Editor", // person or group

         

          CORRESPONDENCE_LIBRARY_ID_COLUMN_NAME : "ID", // SP List item ID -- built-in SP list feature

          CORRESPONDENCE_LIBRARY_FILENAME_COLUMN_NAME : "FileLeafRef", // filename, not changed

CORRESPONDENCE_LIBRARY_ASSOCIATED_LIST_ID_COLUMN_NAME : "Associated_x0020_List_x0020_ID", // number

          CORRESPONDENCE_LIBRARY_FILETYPE_COLUMN_NAME : "FileType", // choice with fill-in

          CORRESPONDENCE_LIBRARY_DMS_URL_COLUMN_NAME : "DMS_x0020_URL", // choice "?","Incoming","Outgoing"

          CORRESPONDENCE_LIBRARY_DIRECTION_COLUMN_NAME : "Direction", // choice "?","Incoming","Outgoing"

          CORRESPONDENCE_LIBRARY_CREATED_COLUMN_NAME : "Created", // date and time

          CORRESPONDENCE_LIBRARY_MODIFIED_COLUMN_NAME : "Modified", // date and time

          CORRESPONDENCE_LIBRARY_CREATED_BY_COLUMN_NAME : "Author", // person or group

          CORRESPONDENCE_LIBRARY_MODIFIED_BY_COLUMN_NAME : "Editor", // person or group

    CORRESPONDENCE_LIBRARY_CHECKED_OUT_TO_COLUMN_NAME : "CheckoutUser", // person or group

// undeletable, available, but not utilized

      CORRESPONDENCE_LIBRARY_DOCUMENT_TITLE_COLUMN_NAME : "Title", // single line of text

CORRESPONDENCE_LIBRARY_ATTACHMENT_NUMBER_COLUMN_NAME : "Attachment_x0020_No_x002e_", // number

          CORRESPONDENCE_LIBRARY_DESCRIPTION_COLUMN_NAME : "DocumentSetDescription", // multiple lines of text

 

//  FORM and QUERY STRING literals

         

          QUERY_STRING_NAME_STATE : "state",

          QUERY_STRING_NAME_ITEM_ID : "itemid",

//        QUERY_STRING_NAME_EMAIL_BODIES_HREF : "itemid",

          QUERY_STRING_NAME_RECEIVED_DATE : "receivedDate",

          QUERY_STRING_NAME_INCOMING_LETTER_NUMBER : "incomingLetterNumber",

          QUERY_STRING_NAME_LETTER_SUBJECT : "letterSubject",

          QUERY_STRING_NAME_CORRESPONDENCE_TYPE : "correspondenceType",

          QUERY_STRING_NAME_INIT_CORRESPONDENCE_TYPE : "initCorrespondenceType",

          QUERY_STRING_NAME_LETTER_URL : "letterUrl",

          QUERY_STRING_NAME_ASSIGNED_UNIT : "unit",

          QUERY_STRING_NAME_ASSIGNED_ANALYST : "analyst",

          QUERY_STRING_NAME_RESPONSE_DECISION : "responseDecision",

          QUERY_STRING_NAME_MGR1_REVIEWER : "mgr1Decision",

          QUERY_STRING_NAME_MGR1_COMMENT : "mgr1RedoComment",

          QUERY_STRING_NAME_MGR2_REVIEWER : "mgr2Decision",

          QUERY_STRING_NAME_MGR2_COMMENT : "mgr2RedoComment",

          QUERY_STRING_NAME_OUTGOING_LETTER_NUMBER : "outgoingLetterNumber",

          QUERY_STRING_NAME_OUTGOING_VENDOR : "outgoingVendor",

          QUERY_STRING_NAME_SHORT_DESCRIPTION : "shortDesc",

          QUERY_STRING_NAME_EXEC_REVIEW_DATE : "execReviewDate",

          QUERY_STRING_NAME_MAILING_DATE : "mailingDate",

          QUERY_STRING_NAME_SOURCE : "source",

          QUERY_STRING_NAME_UPLOADED_FILES : "uploadFiles",

          QUERY_STRING_NAME_ASSIGNED_UNIT_INITIATE : "unitInitiate",

          QUERY_STRING_NAME_VENDOR_INITIATE : "vendorInitiate",

          QUERY_STRING_NAME_LETTER_SUBJECT_INITIATE : "letterSubjectInitiate",

          QUERY_STRING_NAME_ASSIGNED_ANALYST_INITIATE : "assignedAnalystInitiate",

       QUERY_STRING_NAME_UNIT_CHIEF_REEVALUATION_DECISION : "reevaluationDecision",

         

          GET_INCOMING_FILE_SET : 100,

          GET_OUTGOING_FILE_SET : 101,

 

          INCOMING_LETTER_AND_ATTACHMENT_NUMBER_PATTERN :

                               /^\s*(DF16\-\d{2}\-\d{5})(\s?|[a-z]{1,2})\-(FI|ASO|FA)\s?/,

          OUTGOING_LETTER_AND_ATTACHMENT_NAME_PATTERN :

                               /^\s*(SC16\-\d{2}\-\d{5})(\s?|[a-z]{1,2})\-([Xx]{2}|FI|ASO)\s([\w\s\-_\.]{1,50})/,

          INCOMING_LETTER_NUMBER_PATTERN :

                               /^\s*DF16\-\d{2}\-\d{5}\s?\-(FI|ASO|FA)\s*/,

          OUTGOING_LETTER_NAME_PATTERN :

                               /^\s*SC16\-\d{2}\-00000\s?\-([Xx]{2}|FI|ASO)\s([\w\s\-_\.]{1,50})/,

          INCOMING_ATTACHMENT_NUMBER_PATTERN :

                               /^\s*(DF16\-\d{2}\-\d{5})([a-z]{1,2})\-(FI|ASO|FA)\s?/,

          OUTGOING_ATTACHMENT_NAME_PATTERN :

                               /^\s*SC16\-\d{2}\-00000([a-z]{1,2})\-([Xx]{2}|FI|ASO)\s[\w\s\-_]{1,50}/

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

                     PROCESS_STATE_ERROR : STATUS_CRITICAL_ERROR,

                     PROCESS_STATE_ASSIGN_UNIT_TASK : STATUS_NEW_ITEM,

                     PROCESS_STATE_ASSIGN_ANALYST_TASK : STATUS_UNIT_ASSIGNED,

                     PROCESS_STATE_DECIDE_RESPONSE_TASK : STATUS_ANALYST_ASSIGNED,

                     PROCESS_STATE_DRAFT_RESPONSE_TASK : STATUS_ANALYST_DECIDED_YES,

                    PROCESS_STATE_NO_RESPONSE_REQUIRED_COMPLETE : STATUS_ANALYST_DECIDED_NO,

                     PROCESS_STATE_ANALYST_RESPONSE_DIRECTED : STATUS_ANALYST_RESPONSE_REQUIRED,

                     PROCESS_STATE_UNIT_CHIEF_REVIEW_TASK : STATUS_RESPONSE_LETTER_DRAFTED,

                     PROCESS_STATE_SECTION_CHIEF_REVIEW_TASK : STATUS_UNIT_CHIEF_REVIEW_DONE,

              PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW : STATUS_UNIT_CHIEF_REVIEW_DONE,

                     PROCESS_STATE_STAMPING_TASK : STATUS_SECTION_CHIEF_REVIEW_DONE,

                     PROCESS_STATE_SIGNED_AND_MAILED : STATUS_STAMPING_DONE,

                   PROCESS_STATE_INITIATE_OUTGOING_SIGNED_AND_MAILED : STATUS_STAMPING_DONE,

                     PROCESS_STATE_COMPLETE : STATUS_SIGNED_MAILED,

                     PROCESS_STATE_INITIATE_OUTGOING_COMPLETE : STATUS_SIGNED_MAILED,

                     PROCESS_STATE_UNIT_CHIEF_REEVALUATE : STATUS_NO_RESPONSE_NECESSARY,

                     PROCESS_STATE_ANALYST_REDO_REQUIRED : STATUS_ANALYST_REDO_NEEDED,

          PROCESS_STATE_INITIATE_OUTGOING_ANALYST_REDO_REQUIRED : STATUS_ANALYST_REDO_NEEDED,

                    PROCESS_STATE_UNIT_CHIEF_REVIEW_REDO_REQUIRED : STATUS_UNIT_CHIEF_REDO_NEEDED,

          PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW_REDO_REQUIRED : STATUS_UNIT_CHIEF_REDO_NEEDED,

                    PROCESS_STATE_SECTION_CHIEF_REVIEW_REDO_REQUIRED : STATUS_SECTION_CHIEF_REDO_NEEDED,

          PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW_REDO_REQUIRED: STATUS_SECTION_CHIEF_REDO_NEEDED,

                    PROCESS_STATE_INITIATE_OUTGOING_ANALYST_UPLOAD : STATUS_NEW_ITEM_OUTGOING

          };

          if (stateStatus[state] == null)

                     return "Undefined status from state";

          return stateStatus[state];

}

 

var StateStatusAssociation = [

          // { state: PROCESS_STATE_ , status: STATUS_ , flow: "incoming"|"initiated"|null }

          { state:         PROCESS_STATE_ERROR, status: STATUS_CRITICAL_ERROR, flow: null },

          { state: PROCESS_STATE_ASSIGN_UNIT_TASK, status: STATUS_NEW_ITEM, flow: "incoming" },

          { state: PROCESS_STATE_ASSIGN_ANALYST_TASK, status: STATUS_UNIT_ASSIGNED, flow: "incoming" },

          { state: PROCESS_STATE_DECIDE_RESPONSE_TASK, status: STATUS_ANALYST_ASSIGNED, flow: "incoming" },

          { state: PROCESS_STATE_DRAFT_RESPONSE_TASK, status: STATUS_ANALYST_DECIDED_YES, flow: "incoming" },

          { state: PROCESS_STATE_NO_RESPONSE_REQUIRED_COMPLETE, status: STATUS_ANALYST_DECIDED_NO, flow: "incoming" },

          { state: PROCESS_STATE_ANALYST_RESPONSE_DIRECTED, status: STATUS_ANALYST_RESPONSE_REQUIRED, flow: "incoming" },

          { state: PROCESS_STATE_UNIT_CHIEF_REVIEW_TASK, status: STATUS_RESPONSE_LETTER_DRAFTED, flow: "incoming" },

          { state: PROCESS_STATE_SECTION_CHIEF_REVIEW_TASK, status: STATUS_UNIT_CHIEF_REVIEW_DONE, flow: "incoming" },

          { state: PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW, status: STATUS_UNIT_CHIEF_REVIEW_DONE, flow: "initiated" },

          { state: PROCESS_STATE_STAMPING_TASK, status: STATUS_SECTION_CHIEF_REVIEW_DONE, flow: "incoming" },

          { state: PROCESS_STATE_SIGNED_AND_MAILED, status: STATUS_STAMPING_DONE, flow: "incoming" },

          { state: PROCESS_STATE_INITIATE_OUTGOING_SIGNED_AND_MAILED, status: STATUS_STAMPING_DONE, flow: "initiated" },

          { state: PROCESS_STATE_COMPLETE, status: STATUS_SIGNED_MAILED, flow: "incoming" },

          { state: PROCESS_STATE_INITIATE_OUTGOING_COMPLETE, status: STATUS_SIGNED_MAILED, flow: "initiated" },

          { state: PROCESS_STATE_UNIT_CHIEF_REEVALUATE, status: STATUS_NO_RESPONSE_NECESSARY, flow: "incoming" },

          { state: PROCESS_STATE_ANALYST_REDO_REQUIRED, status: STATUS_ANALYST_REDO_NEEDED, flow: "incoming" },

          { state: PROCESS_STATE_INITIATE_OUTGOING_ANALYST_REDO_REQUIRED, status: STATUS_ANALYST_REDO_NEEDED, flow: "initiated" },

          { state: PROCESS_STATE_UNIT_CHIEF_REVIEW_REDO_REQUIRED, status: STATUS_UNIT_CHIEF_REDO_NEEDED, flow: "incoming" },

          { state: PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW_REDO_REQUIRED, status: STATUS_UNIT_CHIEF_REDO_NEEDED, flow: "initiated" },

          { state: PROCESS_STATE_SECTION_CHIEF_REVIEW_REDO_REQUIRED, status: STATUS_SECTION_CHIEF_REDO_NEEDED, flow: "incoming" },

          { state: PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW_REDO_REQUIRED, status: STATUS_SECTION_CHIEF_REDO_NEEDED, flow: "initiated" },

          { state: PROCESS_STATE_INITIATE_OUTGOING_ANALYST_UPLOAD, status: STATUS_NEW_ITEM_OUTGOING, flow: "initiated" }

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

          var pState = {incoming: false, redo: false};

         

          switch (state) {

          case PROCESS_STATE_ERROR:

          case PROCESS_STATE_NO_RESPONSE_REQUIRED_COMPLETE:

          case PROCESS_STATE_COMPLETE:

          case PROCESS_STATE_INITIATE_OUTGOING_COMPLETE:

                     pState = { };

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

 

 

 

body {

          font:normal 12pt Arial,Helvetica,sans-serif;

          background-image: url("CAT images/cats-photo-montage-faded.jpg");

          background-repeat: repeat;

}

fieldset {

          border:1px solid black;

}

.underline {

          text-decoration:underline;

}

input, textarea {font-size:11pt;}

ul, ol {

          padding-left: 1em;

}

input[type=radio] {

    margin-right: 0.75em;

}

legend {

          color:navy;

          font:bold 95% Verdana,Tahoma,sans-serif;

          padding:0 0.5em 0.5em;

}

label {

          vertical-align:top;

          font:bold 85% Arial,Helvetica,sans-serif;

          color:navy;

          margin-top:0.5em;

          margin-right:1em;

}

 

/* input, textarea {margin:0.2em 1em;} */

label.form-1-label {

          display:inline-block;

          margin:0.5em auto;

          width:11em;

          vertical-align:middle;

}

label.form-100-label {

          display:inline-block;

}

 

div#larger-container {

          padding:1em;

          width:51em;

          margin:0 auto;

          background-color:white;

          z-index:0;

          position:relative;

}

div.std-grid {

          display:-ms-grid;

          display:grid;

          -ms-grid-columns:auto 1fr;

          grid-template-columns:auto 1fr;

          row-gap:5px;

          -ms-row-gap:5px;

}

.doc-control-set {

          display:inline-block;

          border:1px dotted silver;

          height:24px;

          vertical-align:middle;

          margin-right:2em;

}

.doc-type-label {

          display:inline-block;

          font:bold 11pt Arial,sans-serif;

          margin:0.1em 0.5em;

          color: rgb(64, 16, 92);

}

.doc-edit-button {

          font:normal 9pt "Arial Narrow",Arial,sans-serif;

          padding:0.1em;

          margin:0 0.5em;

}

select#correspondence-type {

          -ms-grid-row:4;

          -ms-grid-column:2;

}

h1 {

          margin-bottom:0;

          font:bold 135% Tahoma,Arial,sans-serif;

          color:#050;

}

p#page-title {

          margin:0;

          font:bold 16pt Verdana,Arial,sans-serif;

          color:rgb(64,16,92);

}

p#page-subtitle {

          display:none;

          margin:0;

          font:bold 13pt "Segoe UI",Tahoma,sans-serif;

          color:black;

}

 

p.note {

          font:normal 83% Arial,Helvetica,sans-serif;

          color:#800020;

}

p#heading {margin-bottom:0!important;}

p#submit-controls {margin-top:1em;}

div#footing {

          margin:1em 0 0 0;

          font:normal 75% Tahoma,Verdana,sans-serif;

          color:#999;

}

div.form-part {display:none;margin-top:0!important;}

form#control {

          display:none;

          width:45em;

          margin:1.5em auto 0 auto;

          border-left:1px solid black;

          border-top:1px solid black;

          border-right:4px solid #aaa;

          border-bottom:4px solid #aaa;

          border-radius:5px;

          background-color:#f8f8f8;

          padding:1em 3em;

}

 

/* Incoming URL box styling */

/*

.url-div-set {

          display:-ms-grid;

          display:grid;

          -ms-grid-columns:8em 1fr;

          grid-template-columns:8em 1fr;

}

.check-url-button {

          font-size:8pt;

          width:6em;

          padding:0;

          -ms-grid-row:1;

          -ms-grid-column:1;

}

 

.url-status {

          -ms-grid-row:1;

          -ms-grid-column:2;

}

.url-input {

          -ms-grid-row: 2;

          -ms-grid-column: 1;

          -ms-grid-column-span: 2;

          grid-column: 1 / span 2;

          width:95%;

}*/

div#selected-block, div#selected-links-block,

div#analyst-file-selected-block {

          display:none;

          font:bold 9pt Arial,sans-serif;

}

#dropzone-grid {

          display:-ms-grid;

          display:grid;

          -ms-grid-columns:50% 50%;

          grid-template-columns:50% 50%;

          grid-column-gap:1%;

}

div#drop-zone {

          border: 1px solid blue;

          padding: 0.1em 0.3em;

          font:normal 9pt Arial,sans-serif;

          border-radius: 8px;

          background-color: #f0f0ff;

          height: 110px;

          -ms-grid-row:1;

          -ms-grid-column:1;

}

#file-upload-controls {

          margin:1em -0.2em 0 -0.2em;

          padding:0.2em;

          border:1px dotted black;

}

#file-load-errors, #analyst-file-load-errors {

          display:none;

          padding:0.3em;

          border:1px double red;

          font:normal 9pt Arial,sans-serif;

          -ms-grid-row:1;

          -ms-grid-column:2;

}

#file-load-errors ul, #analyst-file-load-errors ul {

          padding-left:1.5em;

}

.file-load-errors-list-item {

          display:list-item;

          margin:0.1em 1.5em;

}

#link-load-errors {

          display:none;

          float: right;

          padding:0.3em;

          border:1px double red;

          font:normal 9pt Arial,sans-serif;

}

 

#clear-files-button {

          display:none;

}

#files-select, #analyst-files-select {

          font:normal 9pt "Courier New",Courier,monospace;

}

 

input.inputfile {

          width: 0.1px;

          height: 0.1px;

          opacity: 0;

          overflow: hidden;

          position: absolute;

          z-index: -1;

}

.inputfile + label {

    font-size: 11pt;

    font-weight:bold;

          padding:0.3em 0.5em;

          border:1px solid black;

          border-radius:5px;

    color: black;

          vertical-align:middle;

    background-color: #fbb;

    display: inline-block;

          cursor:pointer;

}

 

.inputfile:focus + label {

          outline: 1px dotted #000;

          outline: -webkit-focus-ring-color auto 5px;

}

.inputfile + label:hover {

    background-color:black;

          color:white;

}

 

option:checked {

          background-color:white;

}

 

span.in-letter-id, span.letter-number,

span.incoming-letter-number, .out-letter-id { /* latter generated in code */

          font:bold 105% 'Segoe UI',Tahoma,Verdana,sans-serif;

          color:rgb(91,24,130);

}

span.in-vendor, span.out-vendor {

          color:rgb(91,24,130);

          font:bold 105% Tahoma,sans-serif;

}

span.receivedDateInHeader {

          color:rgb(91,24,130);

          font:bold 105% Tahoma,sans-serif;

}

#incoming-url-inputs-block {

          display:none;

          margin-top:1em;

}

#incoming-url-inputs-block textarea {

          font:normal 9pt Consolas,Courier,monospace;

          color:blue;

          width:initial;

}

a.links-select-anchors {

          font:normal 9pt Arial,sans-serif;

          cursor:pointer;

}

span.letter-subject {

          font:bold 105% 'Segoe UI',Tahoma,Verdana,sans-serif;

          color:rgb(91,24,130);

}

span.assigned-unit { /* generated in code */

          font:bold 105% 'Segoe UI',Tahoma,Verdana,sans-serif;

          color:rgb(91,24,130);

}

span.analyst-name, span.assigned-analyst,

span.analyst-name-initiated {

          font:bold 105% 'Segoe UI',Tahoma,Verdana,sans-serif;

          color:rgb(91,24,130);

}

span.unit-options {

          display:inline-block;

          width:8em;

          margin:0 1.5em;

          text-align:left;

          padding:0.2em 0;

          font:bold 11pt Verdana,Arial,sans-serif;

          color:black;

}

span.unit-analyst-options {

          display:inline-block;

          width:30%;

          text-align:left;

          padding:0.2em 0;

          font:normal 11pt Verdana,Arial,sans-serif;

          color:black;

}

fieldset#incoming-letter-links {

          display:none;

          margin-top:1em;

}

fieldset#outgoing-letter-links {

          display:none;

          margin-top:1em;

}

p#templates-found-here {

          text-align:center;

          font-size:85%;

}

a#templates-folder {

          font:bold 95% Verdana,Tahoma,sans-serif;

}

p.links-info {

          color:black;

          font:normal 80% 'Arial Narrow',Arial,sans-serif;

          margin-bottom:0;

}

span.icon-image {

          display:inline-block;

          margin-right:5px;

}

#new-item-warning {

  color:rgb(136,0,0);

  font:normal 83% Verdana,Arial,sans-serif;

  padding:0.5em 1em;

  margin:1em 5%;

  border:1px solid rgb(136,0,0);

}

p#count-error {

          display:none;

          color:darkred;

          border:2px solid darkred;

          padding:0.5em 1.0em;

          font:bold 100% Arial,Helvetica,sans-serif;

}

ul#action-taken-list > li > span {

          font: bold 95% Tahoma,sans-serif;

          color: darkgreen;

}

div#reaction-section {

          margin:auto -1em;

}

.action-taken-list-title {

          font:bold 11pt Verdana,Tahoma,sans-serif;

          color:blue;

          margin-top:0.5em;

}

li.action-taken-list-item {

          font:normal 12pt "Arial Narrow",Arial,sans-serif;

          color:black;

}

.action-error-list-item {

          color:red;

          font-weight:bold;

          list-style:none;

}

.action-error-detail-list-item {

          font:normal 12pt 'Segoe UI',Tahoma,sans-serif;

}

span.oldFile {

          font:bold 95% "Segoe UI","Arial Narrow",sans-serif;

          color:brown;

}

span.newFile {

          font:bold 95% "Segoe UI","Arial Narrow",sans-serif;

          color:green;

}

p#files-created-header {

          font:normal 100% Tahoma,sans-serif;

          color:purple;

}

ol#files-created-list li {

          margin-top:0;

}

a.incoming-letter-anchors, a.outgoing-letter-anchors  {

          display:inline-block;

          width:7em;

}

p.files-created-list-item {

          margin:0.5em 0;

}

a.file-name-anchors { /* generated in code */

          font:normal 105% "Arial Narrow",Helvetica,sans-serif;

}

span.good-upload-span { /* generated in code */

          color:green;

          font:bold 95% "Segoe UI",Tahoma,sans-serif;

}

span.error-upload-span { /* generated in code */

          color:darkred;

          font:bold 95% "Segoe UI",Tahoma,sans-serif;

}

span.itemid {

          color:navy;

}

div#error-container {

          padding:1em;

          width:40em;

          margin:0 auto;

          background-color:white;

          z-index:0;

          position:relative;

          display:none;

}

 

div#dated-form-use-error, div#postsubmit-refresh-error,

div#general-use-error, div#state-advanced-error,

div#environment-error, div#present-form-error,

div#data-integrity-error {

          display:none;

          border:1px solid darkred;

          padding:0.5em 1em;

          margin:4em auto 0;

   padding: 0.5em 2em;

   background-color: #fff8f8;

}

p#present-form-error-message {

          font:normal 13pt "Courier New",Courier,monospace;

          color:maroon;

          margin-left:5%;

}

#main-message {

          margin-left:5%;

          color:blue;

}

#error-itemID, #system-message {

          color:blue;

}

p#credits-link {

          margin-bottom:-1em;

          margin-right:-3em;

          text-align:right;

}

p#credits-link button {

          font:italic 60% Tahoma,Verdana,Arial,sans-serif;

          color:#a3a;

          border:none;

          background:none;

}

p#credits-link button:hover {

          text-decoration:underline;

          color:blue;

}

.credit-title {

          border-right:2px solid black;

}

.critical-error {color:darkred;font:bold 110% Arial,sans-serif;}

.critical-error blockquote {

          color:purple;

          font:normal 100% Tahoma,sans-serif;

}

span.http-status, span.http-status-code {

          font:bold 105% 'Segoe UI',Tahoma,Verdana,sans-serif;

          color:#fc9;

}

#review-comment {

          font:normal 100% 'Courier New',Courier,sans-serif;

          color:maroon;

}

.select-disable {

          overflow-y:hidden;

}

 

#submit-message-contents, #reload-message {

          text-align:center;

          width:20em;

          margin:2em auto 0;

          font:bold 18pt Arial,sans-serif;

          background-color: #fff;

          padding:0.5em 0;

          border:1px solid red;

}

.working {

          color:red;

          font-size:24pt;

}

#blocker-info {

          display:none;

          width:95%;

          margin:auto;

          border:1px solid green;

          height:600px;

}

#existing-files-processing {

          display:none;

          font:normal 9pt Arial,sans-serif;

          width:90%;

          margin:auto;

          border:3px solid red;

          background-color:white;

          padding:0.5em 1em;

}

table, #existing-files-processing table {

          margin-top:1em;

          border: 1px solid black;

}

th, #existing-files-processing th {

          background-color: black;

          color: yellow;

          font: bold 9pt Arial,sans-serif;

}

 

#analyst-control-add-files-table td {

          font: normal 9pt Arial,sans-serif;

}

span.icon-image {

          padding:2px;

          display:inline-block;

          vertical-align:middle;

}

img.icon-overlay {

          position:relative;

          right:5px;

          bottom:-2px;

          height:9px;

          width:9px;

}

#checkout-form {

          margin:auto;

          font:normal 12pt Arial,sans-serif;

          border:15px groove #cc3;

          background-color:#f0f0f0;

          padding:1em 2em;

          z-index:1;

          width:44em;

          position:fixed;

          top:50%;

          left:50%;

          margin-left:-25em;

          margin-top:-8em;

          display:none;

}

#close-button {

          display:none;

          margin:0 auto;

          text-align:right;

}

#doc-table {font:bold 11pt Arial,sans-serif;margin:1em auto;}

#doc-table th {color:yellow;background-color:black;}

#doc-table tr.even {background-color:#f0f0f0;}

#doc-table td {padding:0.2em 0.5em;}

.link-as-button {background:none;border:none;color:blue;font-size:10pt;padding:0;

 cursor:pointer;text-decoration:underline;}

td.linktd {font:normal 10pt Arial,sans-serif;}

td.actiontd {font:normal 10pt Arial,sans-serif;}

#process-button {font-size:9pt;}

div#notice {

          display:none;

          clear:both;

          padding:0.75em 1.5em;

          margin:0 5%;

          border:2px solid blue;

          background-color:#f8f8ff;

          font:normal 9pt 'Segoe UI',Arial,sans-serif;

          color:#333;

}

.fixsubsect {

          font-size:75%;

          margin:0;"

          width:3em;

}

.fixsubsect input {

          margin: 0;

          padding: 0;

}

#userEmailed {

          display:none;

          font:bold 14pt Verdana,sans-serif;

          color:green;

          padding:0.5em 1.5em;

          border:1px solid red;

          margin:0 10%;

          text-align:center;

}

p#help-make-better {

          margin-bottom:-2em;

          margin-left:-3em;

          text-align:left;

}

p#help-make-better button {

          font:bold 75% Tahoma,Verdana,Arial,sans-serif;

          color:#a3a;

          border:none;

          background:none;

}

p#help-make-better button:hover {

          text-decoration:underline;

          color:blue;

}

#help-make-better-message {

          margin:auto;

          font:normal 12pt Arial,sans-serif;

          border:15px outset #33c;

          background-color:#f0f0f0;

          padding:1em 2em;

          z-index:1;

          width:35em;

          position:fixed;

          top:50%;

          left:50%;

          margin-left:-17em;

          margin-top:-10em;

          display:none;

}

button.close-button {

          padding:0;

          margin:0;

          background:none;

          border:none;

}

button.close-button img {

          width: 20px;

}

 

/*********************************

  ANALYST FILE CONTROL

**********************************/

form#analyst-file-control {

          margin:0 0 1em 1em;

          font:normal 12pt Arial,sans-serif;

          border:15px groove #c3c;

          background-color:#f8f8f8;

          padding:5px;

          z-index:1;

          width:46em;

          position:fixed;

          top:50%;

          left:50%;

          margin-left:-23em;

          margin-top:-12em;

          display:none;

}

div#analyst-file-control-grid {

          display:-ms-grid;

          display:grid;

          -ms-grid-columns:1fr 29em;

          grid-template-columns:1fr 29em;

}

div#common-footer {

 

}

p#analyst-file-interface-control {

          font:normal 11pt "Arial Narrow",Arial,sans-serif;

          color:navy;

          float:right;

          vertical-align:top;

          margin:0;

          grid-column: 1 / span 2;

}

div#analyst-files-interface-files-list {

          margin:1em 0;

          font-size: 10pt;

          border-bottom:1px dashed gray;

          border-top:1px dashed gray;

}

span.radio-control {

          display:inline-block;

          width:10em;

          padding:0.2em 0.5em;

          font:bold 12pt Verdana,sans-serif;

          color:#629;

}

div#exchange-help, div#add-help, div#delete-help,

div#rename-help {

          display:none;

          font-size:10pt;

          margin-top:2em;

          margin-left:1em;

}

div#interface-panel {

          padding-left:2em;

}

div#exchange-interface {

          display:none;

}

div#add-interface {

          display:none;

}

p#verify-exchange-file {

          display:none;

}

div#delete-interface {

          display:none;

          font-size: 11pt;

}

p#common-footer {

          display:none;

}

select#exchangeable-files-list {

          margin-bottom:1em;

}

div#upload-drag-and-drop {

          display:none;

          margin-bottom:1em;

}

div#analyst-refile-drop-zone {

          border: 1px solid blue;

          padding: 0.1em 0.3em;

          font:normal 9pt Arial,sans-serif;

          border-radius: 8px;

          background-color: #f0f0ff;

          height: 110px;

}

#add-prompt, #exchange-prompt {

          display:none;

}

span.analyst-delete-interface-option {

          display: inline-block;

          font-size: 9pt;

}

table#analyst-control-current-scfiles,

table#analyst-control-add-files-table {

          width:27em;

          display:none;

}

table#analyst-control-current-scfiles tr {

          font-size:9pt;

}

div#analyst-files-interface-files-list {

          display:none;

}

div#analyst-file-control-process-problem {

          margin:0 0 1em 1em;

          font:normal 12pt Arial,sans-serif;

          border:15px outset #c33;

          background-color:#f8f8f8;

          padding:5px;

          z-index:2;

          width:30em;

          position:fixed;

          top:50%;

          left:50%;

          margin-left:-15em;

          margin-top:-6em;

          display:none;

}

div#analyst-file-control-wait {

          margin:0 0 1em 1em;

          font:normal 18pt Arial,sans-serif;

          border:15px outset #cc3;

          background-color:#f8f8f8;

          padding:5px;

          z-index:2;

          width:20em;

          position:fixed;

          top:50%;

          left:50%;

          margin-left:-10em;

          margin-top:-4em;

          display:none;

}

div#analyst-file-control-process-done {

          margin:0 0 1em 1em;

          font:normal 24pt Arial,sans-serif;

          border:15px groove #3c3;

          background-color:#f8f8f8;

          padding:5px;

          z-index:2;

          width:12em;

          position:fixed;

          top:50%;

          left:50%;

          margin-left:-7em;

          margin-top:-2em;

          display:none;

}

input.deleteFilesCheckbox {

          margin-right:0.5em;

}

#debug-data {

          white-space:pre;

          font:normal 8pt 'Courier New',Courier,monospace;

          padding:0.5em 1em;

          background-color:white;

}

/* special */

p.assign-analyst-sub-heading-unit {

    margin: 0 95% 0 1em;

    font: bold 12pt Arial,sans-serif;

    border: 1px solid navy;

    padding: 0 1em;

    color: blue;

    display: inline-block;

}

 

 

 

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

          } else {

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

 

 

"use strict";

 

 

// CATcheck.js

function dataCheck(listItemData) {

          var i, datum1, datum2, ids, outIDs, requests = [ ], errors = [ ], basenames = [ ],

                     boldcolor = "#663d89",

                     itemId = parseInt(listItemData[CatCONST.CORRESPONDENCE_LIST_ITEM_ID_COLUMN_NAME]),

                     state = listItemData[CatCONST.CORRESPONDENCE_LIST_STATE_COLUMN_NAME],

                     inIDs = listItemData[CatCONST.CORRESPONDENCE_LIST_DOCLIB_INCOMING_IDS_COLUMN_NAME].split(","),

                     anchors = listItemData[CatCONST.CORRESPONDENCE_LIST_DOCUMENT_LIBRARY_COLUMN_NAME],

                     specialData = JSON.parse(listItemData[CatCONST.CORRESPONDENCE_LIST_ITEM_DATA_COLUMN_NAME]),

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

 

          if ((outIDs = listItemData[CatCONST.CORRESPONDENCE_LIST_DOCLIB_OUTGOING_IDS_COLUMN_NAME]) != null) {

                     outIDs = outIDs.split(",");

                     ids = inIDs.concat(outIDs);

          } else

                     ids = inIDs;

         

          anchors = anchors.match(/<a href="([^<]+)<\/a>/ig);

          for (i = 0; i < anchors.length; i++)

            basenames.push(anchors[i].match(/<a[^>]+>([^<]+)<\/a>/)[1]);

          if (anchors.length != inIDs.length + (outIDs ? outIDs.length : 0))

                     errors.push("Count of Doc Lib Column anchors does not match sum of the "

                               + "incoming and outgoing IDs");

         

          for (i = 0; i < ids.length; i++)

                     requests.push(new RSVP.Promise(function (resolve, reject) {

                               ICorrespondenceLibrary.getDocLibItemFileAndMetaData({

                                         itemId: ids[i]

                               }).then(function (response) {

                                         resolve(response.responseJSON.d);

                               }).catch(function (response) {

                                         reject(response);

                               });

                     }));

          RSVP.all(requests).then(function (response) {

                     var metadata, libBody = [ ], listBody = [ ],

                                         today = new Date(), fname, fnames = [ ];

                    

                     specialData.errors = [ ];

                     for (i = 0; i < response.length; i++) {

                               fname = response[i].Name;

                               fnames.push(fname);

                               metadata = response[i].ListItemAllFields;

                               if (basenames.find(function (elem) {

                                         return elem == fname;

                               }) == null) {

                                         errors.push("Master Docs Lib Item ID <span style=\"color:" + boldcolor + ";\"><b>"

                                                   + metadata.Id + "</b></span> with file name <span style=\"color:" + boldcolor + ";\"><b>"

                                                   + fname + "</b></span> was not found in the Master Log Document Library field anchors strings");

                                         specialData.errors.push({

                                                   err: "DocLibItemNotInDocLibField",

                                                   libItem: metadata.Id,

                                                   fname:fname

                                         });

                               }

                               datum1 = parseInt(metadata[CatCONST.CORRESPONDENCE_LIBRARY_ASSOCIATED_LIST_ID_COLUMN_NAME]);

                               if (isNaN(datum1) == true) {

                                         errors.push("Associated List Item ID field is missing for this item. Should be " + itemId);

                               libBody.push([CatCONST.CORRESPONDENCE_LIBRARY_ASSOCIATED_LIST_ID_COLUMN_NAME, itemId ]);

                               }

                               else if (fname.search(/-FA/) >= 0)

                                         checkFAletter(response[i]).then(function (response) {

                                                   if (response.status == false) {

                                                              errors.push("FA letter issue: " + response.reason);

                                                              specialData.errors.push({

                                                                        err: "FALetterIssue",

                                                                        libItem: metadata.Id,

                                                                        associatedListId: datum1

                                                              });

                                                   }

                                         }).catch(function (response) {

                                         });

                               else if (datum1 != itemId) {

                                         errors.push("Associated List Item ID field value " + datum1 + " does not match "

                                                   + "Master Log Item ID value " + itemId);

                                         specialData.errors.push({

                                                   err: "AssociatedListIdNotMatching",

                                                   libItem: metadata.Id,

                                                   associatedListId: datum1,

                                                   badId: itemId

                                         });

                               }

                               if (fname.search(/DF16-/) >= 0) {

                                         datum1 = metadata[CatCONST.CORRESPONDENCE_LIBRARY_DIRECTION_COLUMN_NAME];

                                         if (datum1 == null || datum1 != "Incoming") {

                                                   errors.push("Direction column value is missing or has wrong value. This is "

                                                   + "immediately correctable and an attempt will be made to correct it.");

                                         libBody.push([CatCONST.CORRESPONDENCE_LIBRARY_DIRECTION_COLUMN_NAME, "Incoming" ])

                                         }

                                         datum1 = decodeURIComponent(metadata[CatCONST.CORRESPONDENCE_LIBRARY_DMS_URL_COLUMN_NAME]);

                                         if (datum1.search(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/) < 0) {

                                                   errors.push("DMS Links column value is missing or does not show a URL pattern "

                                                              + "even though item has DF16 name");

                                                   specialData.errors.push({

                                                              err: "DmsUrlMissingOrWrong",

                                                              libItem: metadata.Id,

                                                              badDmsUrlColumn: datum1

                                                   });

                                         }

                                         datum1 = listItemData[CatCONST.CORRESPONDENCE_LIST_INCOMING_RECEIVED_DATE_COLUMN_NAME];

                                         if (datum1 == null) {

                                                   errors.push("Received Date for this incoming letter is missing");

                                         } else if (new Date(datum1) > today) {

                                                   errors.push("Received Date for incoming letter comes after today");

                                         }

                               } else if (fname.search(/SC16-/) >= 0) {

                                         datum1 = metadata[CatCONST.CORRESPONDENCE_LIBRARY_DIRECTION_COLUMN_NAME];

                                         if (datum1 == null || datum1 != "Outgoing") {

                                                   errors.push("Direction column value is missing or wrong value for this item. "

                                                              + "Should be \"Outgoing\". This is immediately correctable and an attempt will be "

                                                              + "made to correct the value.");

                                         libBody.push([CatCONST.CORRESPONDENCE_LIBRARY_DIRECTION_COLUMN_NAME, "Outgoing" ])

                                         }

                               }

 

                               if (state > PROCESS_STATE_ASSIGN_ANALYST_TASK )

                                         ;// check if unit assigned

                               if (state > PROCESS_STATE_DECIDE_RESPONSE_TASK)

                                         ;// check if analyst assigned

                               if (state > PROCESS_STATE_DRAFT_RESPONSE_TASK)

                                         ;// check if response required setActive

                               if ((state > PROCESS_STATE_UNIT_CHIEF_REVIEW_TASK &&

                                                   state < PROCESS_STATE_COMPLETE) ||

                                         state > PROCESS_STATE_INITIATE_OUTGOING_UNIT_CHIEF_REVIEW)

                                         ;// check if outgoing uploaded

                               if ((state > PROCESS_STATE_SECTION_CHIEF_REVIEW_TASK &&

                                                   state < PROCESS_STATE_COMPLETE) ||

                                                   state > PROCESS_STATE_INITIATE_OUTGOING_SECTION_CHIEF_REVIEW)

                                         ;// check if unit review done

                               if ((state > PROCESS_STATE_STAMPING_TASK &&

                                                   state < PROCESS_STATE_COMPLETE) ||

                                                   PROCESS_STATE_INITIATE_OUTGOING_STAMPING_TASK)

                                         ;// check if section review done

                               if ((state > PROCESS_STATE_SIGNED_AND_MAILED &&

                                                   state < PROCESS_STATE_COMPLETE) ||

                                                 PROCESS_STATE_INITIATE_OUTGOING_SIGNED_AND_MAILED)

                                         ;// check if numbering and dating done

                               if (state == PROCESS_STATE_COMPLETE)

                                         ;// check any other incoming stuff

                               if (state == PROCESS_STATE_INITIATE_OUTGOING_COMPLETE)

                                         ;

                               if (state == PROCESS_STATE_NO_RESPONSE_REQUIRED_COMPLETE)

                                         ;

                               if (libBody.length > 0)

                                         ICorrespondenceLibrary.updateLibItemWithCheckout({

                                                   itemId: metadata.Id,

                                                   body: formatRESTBody(libBody)

                                         }).then(function (response) {

                                                   emailDeveloper({

                                                              subject: "Data Integrity/Consistency Errors in Item ID " + itemId,

                                                              body: "<p>Attempt to update immediately correctable errors succeeded</p>" +

                                                                        "<p style=\"font:normal 10pt monospace;\">response object:<br />" +

                                                                        JSON.stringify(response, null, "  ") + "</p>"

                                                   });

                                         }).catch(function (response) {

                                                   emailDeveloper({

                                                              subject: "Data Integrity/Consistency Errors in Item ID " + itemId,

                                                              body: "<p>Attempt to update immediately correctable errors failed</p>" +

                                                                        "<p style=\"font:normal 10pt monospace;\">response object:<br />" +

                                                                        JSON.stringify(response, null, "  ") + "</p>"

                                                   });

                                         });

                     }

                     for (i = 0; i < basenames.length; i++)

                               if (fnames.find(function (elem) {

                                         return elem == basenames[i];

                               }) == null)

                                         errors.push("URL with name <span style=\"color:" + boldcolor + ";\"><b>"

                                                   + basenames[i] + "</b></span> was not found in the Master Log Docs that associated "

                                                   + " with this Master Log item");

                     if (errors.length > 0) {

                               var html = "<div style=\"font:normal 10pt Verdana,Arial,sans-serif;\">"

                                                   + "<p>The following data integrity/consistency errors/issues were discovered "

                                                   + "in Master Log Item ID <span style=\"color:" + boldcolor + ";\"><b>" + itemId

                                                   + "</b></span></p><ul>";

                              

                               for (i = 0; i < errors.length; i++)

                                         html += "<li>" + errors[i] + "</li>";

                               html += "</ul><p>It may be possible to fix these issues by using "

                                         + "<a href=\"https://mdsd/SiteAssets/CAT/CAT%20Integrity%20&%20Repair/CATQuickRepair.html"

                                                   + "?repairItemId=" + itemId + "&data="

                                                   + encodeURIComponent(JSON.stringify(specialData.errors)) + "\">this repair</a></p>";

/* *************************************************

   DocLibItemNotInDocLibField: LibItem=,Fname= ; use lib id to get server relative url, insert in doc lib

          AssociatedListIdMissing: LibItem=, AssociatedListId= ; use lib id to update field with itemId (CorrectNow)

          AssociatedListIdNotMatching: LibItem=, AssociatedListId=given value, itemId= ;use lib id to update field to itemId

          DirectionMissingOrWrong: LibItem=,Direction=given value; use lib id to update field to correct direction

          DmsUrlMissingOrWrong: LibItem=,DmsUrlColumn=given value;use lib id to get user input for URL

*************************************************** */

                               if (listBody.length > 0) {

                                         listBody.push([ CatCONST.CORRESPONDENCE_LIST_ITEM_DATA_COLUMN_NAME, JSON.stringify(specialData) ])

                                         ICorrespondenceList.updateListItem({

                                                   itemId: itemId,

                                                   body: formatRESTBody(listBody)

                                         }).then(function (response) {

                                                   emailDeveloper({

                                                              subject: "Data Integrity/Consistency Errors in Item ID " + itemId,

                                                              body: "<p>Attempt to update metadata of list item succeeded</p>" +

                                                                        "<p style=\"font:normal 10pt monospace;\">response object:<br />" +

                                                                        JSON.stringify(response, null, "  ") + "</p>"

                                                   });

                                         }).catch(function (response) {

                                                   emailDeveloper({

                                                              subject: "Data Integrity/Consistency Errors in Item ID " + itemId,

                                                              body: "<p>Attempt to update metadata of list item failed</p>" +

                                                                        "<p style=\"font:normal 10pt monospace;\">response object:<br />" +

                                                                        JSON.stringify(response, null, "  ") + "</p>"

                                                   });

                                         });

                               }       

                               if (RunComplete == true) {

                                         document.getElementById("error-container").style.display = "block";

                                         document.getElementById("data-integrity-error").style.display = "block";

                               } else

                                         IntegrityErrors = true;

                               emailDeveloper({

                                         subject: "Data Integrity/Consistency Errors in Item ID " + itemId,

                                         body: html

                               });

                     }

          }).catch(function (response) {

          });

}

 

/** @function checkFAletter

*   use the library item data to determine if two Master Log items are properly associated

*  @param {Object} libItemData - the value returned from SP server for doc lib item metadata

*/

function checkFAletter(libItemData) {

          var i, requests = [ ],

                     libItemMetadata = libItemData.ListItemAllFields,

                     assocIds = libItemMetadata[CatCONST.CORRESPONDENCE_LIBRARY_ASSOCIATED_LIST_ID_COLUMN_NAME].split(","),

                     iList = new IListRESTRequest({

                               server: SERVER_NAME,

                               site: SITE_NAME,

                               listName: CORRESPONDENCE_LIST_NAME,

                               listEntityTypeName: CORRESPONDENCE_LIST_ITEM_ENTITY_TYPE_FULL_NAME

                     });

                    

          return new RSVP.Promise(function (resolve, reject) {

                     for (i = 0; i < assocIds.length; i++)

                               requests.push(new RSVP.Promise(function (resolve, reject) {

                                         iList.getListItemData({

                                                   itemId: assocIds[i]

                                         }).then(function (response) {

                                                   resolve(response.responseJSON.d);

                                         }).catch(function (response) {

                                                   reject(response);

                                         });

                               }));

                     RSVP.all(requests).then(function (response) {

                               var inIds = [ ];

                               if (response.length != 2)

                                         resolve({status:false,reason:"count of IDs not equal to 2"});

                               inIds[0] = response[0][CatCONST.CORRESPONDENCE_LIST_DOCLIB_INCOMING_IDS_COLUMN_NAME];

                               inIds[1] = response[1][CatCONST.CORRESPONDENCE_LIST_DOCLIB_INCOMING_IDS_COLUMN_NAME];

                               if (inIds[0] != inIds[1])

                                         resolve({status:false,reason:"incoming IDs set of paired Master Log items did not match"});

                               resolve({status:true});

                     }).catch(function (response) {

                               reject(response);

                     });

          });

}

 

 

 

"use strict";

 

// CATinit.js

// anonymous function -- script entry point for document

// @return void

// @pre window loading of HTML document

// @post selected process requests

var urlSearchParams = new URLSearchParams(location.search);

 

var browserStorage;

 

$(document).ready(function(){

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

                     else  // source == "form"

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
