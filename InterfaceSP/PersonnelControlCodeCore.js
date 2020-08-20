 

"use strict";

 

/* Design NOTES at bottom of code */

 

var

          Is_PCCCJS_initialized = false,

          PersonnelListName,

 

          CC_ADDRESSEE = "Stephen.Halloran@dhcs.ca.gov;Emily.Watts@dhcs.ca.gov",

          FROM_ADDRESSEE = "",

 

          DEV_PERSONNEL = {

                     SERVER_NAME: "mdsd",

                     SITE_NAME: "",

                     PERSONNEL_LIST_NAME: "MDSD Personnel",

                     PERSONNEL_LIST_ITEM_ENTITY_TYPE_FULL_NAME : "SP.Data.Test_x0020_MDSD_x0020_PersonnelListItem",

 

                     LIST_ID_COLUMN_NAME : "ID", // single line text

                     LIST_MDSD_Member_COLUMN_NAME: "MDSD_x0020_MemberId", // SharePoint AD User ID

                     LIST_Last_Name_COLUMN_NAME : "Title", // single line text

                     LIST_First_Name_COLUMN_NAME : "First_x0020_Name", // single line text

                     LIST_Position_COLUMN_NAME : "Position", // choice: job titles

                     LIST_Phone_COLUMN_NAME : "Phone", // single line of text

                     LIST_Email_Address_COLUMN_NAME : "Email", // single line text

                     LIST_Unit_COLUMN_NAME : "Unit", // choice: unit names

                     LIST_Role_COLUMN_NAME : "Manager_x003f_", // choice: staff, manager 1, manager 2

                     LIST_Active_COLUMN_NAME : "Active", // yes/no

                     LIST_Name_Used_COLUMN_NAME : "Name_x0020_Used", // calculated: concat used first name + last name

                     LIST_Used_First_Middle_Name_COLUMN_NAME : "Used_x0020_First_x002f_Middle_x0", // this too?

                     LIST_Acting_Manager_COLUMN_NAME : "Acting_x0020_Mgr_x003f_", // yes/no

                    

                     CC_ADDRESSEE : "",

                     FROM_ADDRESSEE : "Stephen.Halloran@dhcs.ca.gov"

          },

 

          TEST_PERSONNEL = {

                     SERVER_NAME: "mdsd",

                     SITE_NAME: "",

                     PERSONNEL_LIST_NAME: "Test MDSD Personnel",

                     PERSONNEL_LIST_ITEM_ENTITY_TYPE_FULL_NAME : "SP.Data.Test_x0020_MDSD_x0020_PersonnelListItem",

 

                     CC_ADDRESSEE : "Stephen.Halloran@dhcs.ca.gov",

                     FROM_ADDRESSEE : ""

          },

         

          PROD_PERSONNEL = {

                     SERVER_NAME: "mdsd",

                     SITE_NAME: "",

                     PERSONNEL_LIST_NAME : "MDSD Personnel",    

                     PERSONNEL_LIST_ITEM_ENTITY_TYPE_FULL_NAME : "SP.Data.MDSD_x0020_PersonnelListItem",

 

                     LIST_ID_COLUMN_NAME : "ID", // single line text

                     LIST_MDSD_Member_COLUMN_NAME: "MDSD_x0020_MemberId", // People Picker

                     LIST_Last_Name_COLUMN_NAME : "Title", // single line text

                     LIST_First_Name_COLUMN_NAME : "First_x0020_Name", // single line text

                     LIST_Position_COLUMN_NAME : "Position", // choice: job titles

                     LIST_Phone_COLUMN_NAME : "Phone", // single line of text

                     LIST_Email_Address_COLUMN_NAME : "Email", // single line text

                     LIST_Unit_COLUMN_NAME : "Unit", // choice: unit names

                     LIST_Role_COLUMN_NAME : "Manager_x003f_", // choice: staff, manager 1, manager 2

                     LIST_Active_COLUMN_NAME : "Active", // yes/no

                     LIST_Name_Used_COLUMN_NAME : "Name_x0020_Used", // calculated: concat used first name + last name

                     LIST_Used_First_Middle_Name_COLUMN_NAME : "Used_x0020_First_x002f_Middle_x0", // this too?

//                  LIST_Acting_Manager_COLUMN_NAME : "Acting_x0020_Mgr_x003f_", // yes/no

},

 

// ROLE column values

          MDSDP_LIST_Staff_Role_CHOICE_VALUE = "Staff",

          MDSDP_LIST_Unit_Chief_Role_CHOICE_VALUE = "Mgr 1",

          MDSDP_LIST_Section_Chief_Role_CHOICE_VALUE = "Mgr 2";

         

function setEditMode(state) {

          var i, setDisabled, controls, displayState;

         

          if (state == "on") {

                     setDisabled = false;

                     displayState = "";

          } else {

                     setDisabled = true;

                     displayState = "none";

          }

          controls = document.getElementsByTagName("input");

          for (i = 0; i < controls.length; i++)

                     if (controls[i].className == "editable")

                               controls[i].disabled = setDisabled;

          controls = document.getElementsByTagName("button");

          for (i = 0; i < controls.length; i++)

                     if (controls[i].className == "edit-control")

                               controls[i].style.display = displayState;

}

 

// Initialize

// This JS file uses the following:

// 1) InterfaceSPListRESTv2.js

// 2) InterfaceINIFile.js

// make sure these are loaded before this JS file

 

function PCCCJS_initialize(environment) {

          var CATAdminListInfo, iList, iniFileInstance, msg;

         

          if (!environment)

                     msg = "missing argument for 'environment' parameter. Fix code.";

          if (typeof IListRESTRequest == "undefined")

                     msg = "InteraceSPListRESTv2.js must be loaded";

          if (typeof IniFile == "undefined")

                     msg = "InterfaceINIFile.js must be loaded";

          if (typeof RSVP == "undefined")

                     msg = "rsvp.min.js must be loaded";

          if (typeof jQuery == "undefined")

                     msg = "jQuery AJAX must be loaded";

         

          if (msg) {

                     alert(msg);

                     throw msg;

                     return;

          }

 

          return new RSVP.Promise(function (resolve, reject) {

                     iniFileInstance = new IniFile("https://mdsd/SiteAssets/PersonnelControl/PersonnelControlConfig.ini");

 

                     iniFileInstance.waitIniFileLoad().then(function (response) {

                               if (iniFileInstance.setSection(environment) == false)

                                         throw "PersonnelControlCodeCore.js::IniFile.setSection--"

                                         + "\n   Invalid environment argument"

                                         + "\n\n Use valid environment argument to find section"

                                         + "\nin INI file";

 

                               PersonnelListName = iniFileInstance.getValue("PersonnelListName");

                               Is_PCCCJS_initialized = true;

                               resolve(true)

                     }).catch(function (response) {

                               reject(false);

                     });

          });

}

 

/** @function getPersonnelData

*       @param {object} parameters -- the object should have the named properties, if used:

*    no arg/no object: all items are returned, active and inactive

*                  .unit {string} -- will filter the return of staff for specified unit

*                              if unit == "*" or "all", will return a list of unit names instead

*                  .role {string} -- should be one of the defined constant string values under

*                                      the object PERSONNEL_LIST_CONST

*                  .ID {integer} --  the value of the item ID for the user in the personnel list

*                  .names [{object: first:,last:}] nameObject -- array of objects with property 'first'

*                                      and 'last' being first and last names

*                                      { first: <first-name>, last: <last-name> }

*                                      can be used to retrieve specific user when first three arguments have null value

*                  .doSearch {boolean} -- when set true, will not require that name filter be equal

*                            but contain partial strings useful in returning search results

*      

*       Note that the empty object can be passed

*       @returns value:

*       1. if persons are returned, they are returned array of objects with following

*      properties

*                  { id: ID, usedName: "used name", unit: "unit", role: "role",

 *                            emailAddress: "email address" }

*       2. if only unit is specified as "*" or "all", array of unit names returned

*/

function getPersonnelData(parameters) {

          return new RSVP.Promise( function (resolve, reject) {

                     var i, listSelect, listFilter,

                               IMdsdPersonnelList, results = [ ],

                               standardColumns =

                                         envPersonnel.LIST_ID_COLUMN_NAME + "," +

                                         envPersonnel.LIST_Last_Name_COLUMN_NAME + "," +

                                         envPersonnel.LIST_First_Name_COLUMN_NAME + "," +

                                         envPersonnel.LIST_Name_Used_COLUMN_NAME + "," +

                                         envPersonnel.LIST_Unit_COLUMN_NAME + "," +

                                         envPersonnel.LIST_Role_COLUMN_NAME + "," +

                                         envPersonnel.LIST_Email_Address_COLUMN_NAME;

                                        

                     if (Is_PCCCJS_initialized == false)

                               throw "PersonnelControlCodeCore.js not initialized. "

                                         + "\n\nMust call function PCCCJS_initialize(<environment>)"

                                         + "\nwhere <environment> is INI file section name"

                                         + "usually 'DEV', 'TEST', or 'PROD";

                     IMdsdPersonnelList = new IListRESTRequest({

                               server: envPersonnel.SERVER_NAME,

                               site: envPersonnel.SITE_NAME,

                               list: envPersonnel.PERSONNEL_LIST_NAME,

                     });

// parameters.unit

                     if (parameters.unit && (parameters.unit == "*" || parameters.unit.toLowerCase() == "all"))

                               IMdsdPersonnelList.getFieldChoices({

                                         fieldName: envPersonnel.LIST_Unit_COLUMN_NAME

                               }).then(function (response) {

                                         resolve (response);

                               });

                     else {

                               if (typeof parameters.doSearch == "undefined")

                                         parameters.doSearch = false;

                               listSelect = "$select=" + standardColumns;

                               listFilter = "$filter=";

// parameters.role

                               if (parameters.role == envPersonnel.LIST_Section_Chief_Role_CHOICE_VALUE)

                                         parameters.unit = UnitsAndChiefs[parameters.unit][1];

// parameters.names

                               if (parameters.names) {

                                         var names = parameters.names;

                                        

                                         if (names instanceof Array == false)

                                                   reject("argument 'names' is not Array type");

                                         for (i = 0; i < names.length; i++) {

                                                   if (i > 0)

                                                              listFilter += " or ";

                                                   if (names[i].first) {

                                                              if (parameters.doSearch == true)

                                                                        listFilter +=

                                                                                  "startswith(" +

                                                                                  envPersonnel.LIST_First_Name_COLUMN_NAME + ",'" +

                                                                                  names[i].first + "')" +

                                                                                  " or startswith(" +

                                                                                  envPersonnel.LIST_Used_First_Middle_Name_COLUMN_NAME + ",'" +

                                                                                  names[i].first + "')";

                                                              else

                                                                        listFilter +=

                                                                                  "(" +

                                                                                  envPersonnel.LIST_First_Name_COLUMN_NAME + " eq '" +

                                                                                  names[i].first + "'" +

                                                                                  " or " +

                                                                                  envPersonnel.LIST_Used_First_Middle_Name_COLUMN_NAME + " eq '" +

                                                                                  names[i].first + "')";

                                                   }

                                                   if (names[i].last) {

                                                              if (names[i].first)

                                                                        listFilter += " and ";

                                                              if (parameters.doSearch == true)

                                                                        listFilter += "startswith(" +

                                                                                  envPersonnel.LIST_Last_Name_COLUMN_NAME + ",'" +

                                                                                  names[i].last + "')";

                                                              else

                                                                        listFilter +=

                                                                                  envPersonnel.LIST_Last_Name_COLUMN_NAME + " eq '" +

                                                                                  names[i].last + "'";

                                                   }

                                         }

// parameters.ID

                               } else if (parameters.ID) {

                                         listFilter +=

                                                   envPersonnel.LIST_ID_COLUMN_NAME + " eq '" +

                                                   parameters.ID + "'";

                               } else {

                                         if (parameters.unit && !parameters.role && !parameters.ID) {

                                         listFilter +=

                                                   envPersonnel.LIST_Unit_COLUMN_NAME + " eq '" +

                                                              parameters.unit + "' and " +

                                                   envPersonnel.LIST_Role_COLUMN_NAME + " eq '" +

                                                             envPersonnel.LIST_Staff_Role_CHOICE_VALUE + "'";

                                         } else if (parameters.unit && parameters.role && !parameters.ID) {

                                                   if (parameters.names)

                                                              listFilter += " and ";

                                                   listFilter +=

                                                             envPersonnel.LIST_Unit_COLUMN_NAME + " eq '" +

                                                              parameters.unit + "'" +

                                                              " and " +

                                                             envPersonnel.LIST_Role_COLUMN_NAME + " eq '" +

                                                              parameters.role + "'"

                                                   + " and "

                                                              + envPersonnel.LIST_Active_COLUMN_NAME + " ne 'No'"

                                                              ;

                                         }

                               }

                               IMdsdPersonnelList.getAllListItemsOptionalQuery({

                                         query: listSelect + "&" + listFilter

                               }).then (function (response) {

                                         var responseResults = response.responseJSON.d;

                                        

                                         if (responseResults.results)

                                                   responseResults = responseResults.results;

                                         if (responseResults.length && responseResults.length == 0) // no results

                                                    resolve (null);

                                         for (i = 0; i < responseResults.length; i++)

                                                   results.push({

                                                              id: responseResults[i][envPersonnel.LIST_ID_COLUMN_NAME],

                                                              firstName: responseResults[i][envPersonnel.LIST_First_Name_COLUMN_NAME],

                                                              lastName: responseResults[i][envPersonnel.LIST_Last_Name_COLUMN_NAME],

                                                              usedName: responseResults[i][envPersonnel.LIST_Name_Used_COLUMN_NAME],

                                                              unit: responseResults[i][envPersonnel.LIST_Unit_COLUMN_NAME],

                                                              role: responseResults[i][envPersonnel.LIST_Role_COLUMN_NAME],

                                                              emailAddress: responseResults[i][envPersonnel.LIST_Email_Address_COLUMN_NAME],

                                                   });

                                         resolve (results);

                               }).catch(function (response) {

                                         reject(response);

                               });

                     }

          });

}

         

/*

//  Main Objects

 

/** WorkContext is an object that masters all related objects to the application

    It maintains a reference to the UserContext and ListContext Objects and to the

          Dashboard HTML Form object

          @param {string} dashboardFormId - should be the string of the id element of html form instance

 

function WorkContext(dashboardFormId) {

          this.userContext;

          this.listContext;

          this.dashboardForm = document.getElementById(dashboardFormId);

          this.debugMode = false;  // will be set on initialization if global DEBUG_MODE is set true;

          this.debugState = false; // boolean which will be affected by debugMode and user role

          this.rawJsonResponse;

 

          this.getForm = function () {

                     return this.dashboardForm;

          };

          this.getListContext = function () {

                     return this.listContext;

          };

          this.setListContext = function (listContext) {

                     this.listContext = listContext;

          };

          this.getUserContext = function () {

                     return this.userContext;

          };

          this.setUserContext = function (userContext) {

                     this.userContext = userContext;

          };

         

          this.saveRawJsonResponse = function (json) {

                     this.rawJsonResponse = json;

          };

          this.getLastRawJsonResponse = function () {

                     return this.rawJsonResponse;

          };

}       

 

function UserContext(workContext) {

          // Dependent on loading of 'InterfaceSPUserREST.js' and on 'MDSDPersonnel.js'

          // SP AD info about user

          this.spUserRESTObj = new SPUserREST("https", "mdsd", "", SP_USER_REST_CURRENT_USER); 

          this.SPUserId = this.spUserRESTObj.id;

 

          // {[[mp]id:,unit:,usedName:,role:("Staff","Mgr 1","Mgr 2"),emailAddress:}

          this.usedName = this.userData.usedName;

          this.roleType; // DEVELOPER, COORDINATOR, UNIT_CHIEF, SECTION_CHIEF, TESTER

          this.roleName; // string of roleType

          // impersonating

          this.impersonatingUserData;

          this.impersonatingUsedName;

          this.impersonatingRoleType;

          this.impersonatingRoleName;

 

          if (workContext instanceof WorkContext == false)

                     throw "UserContext() constructor requires a valid WorkContext instance as parameter";

          this.currentWorkContext = workContext;

          workContext.setUserContext(this);

         

          this.impersonate = function(mpid) {

                     this.impersonatingUserData = getPersonnelData(null, null, mpid)[0];

                     this.impersonatingUsedName = this.impersonatingUserData.userName;

                     this.impersonatingRoleType = this.impersonatingUserData.userRole;

          };

         

          this.getEffectiveUserRole = function () {

                     return this.impersonatingRoleType ? this.impersonatingRoleType : this.userRole;

          };

         

          this.getEffectiveUserName = function () {

                     return this.impersonatingUsedName ? this.impersonatingUsedName : this.usedName;

          };

         

          this.getEffectiveUnit = function () {

                     return this.impersonatingUserData ? this.impersonatingUserData.unit : this.userData.unit;

          };

         

          this.getEffectiveEmailAddress = function () {

                     return this.impersonatingUserData ? this.impersonatingUserData.emailAddress : this.userData.emailAddress;

          };

}

         

         

/**

*  Object ListContext has two purposes

*    1) maintains the state information for interaction with the Master Log SP list

*    2) maintains information for connecting to the Dashboard Form HTML Select object giving the listing     

 *  @function ListContext

*  @param {HTMLSelect Node} listingDomObj - the HTMLSelectNode it will manage

*  @param {SPListRestInterface} SPList - reference to an object which manages

*                  a SharePoint list

*  @return void - used with 'new' to return instance of object

 

function ListContext(workContext, listingDomObj, SPList) {

          this.selectObj = listingDomObj;

          this.selectObj.size = LISTING_ROW_COUNT;

          this.SPList = SPList;  // this is actually an interface to the list

 

          this.listItemsTotal;  // total number of items in the list

         

          if (workContext instanceof WorkContext == false)

                     throw "UserContext() constructor requires a valid WorkContext instance as parameter";

          this.currentWorkContext = workContext;

          workContext.setListContext(this);

 

          this.getSPList  = function () {

                     return this.SPList;

          };

 

          this.setupNamesAndCharacteristics = function (namesSelectListId, detailDivId) {

                     var i, results, field, node, cnode,

                               fieldsSelect = "",

                               keys = Object.keys(PERSONNEL_LIST_CONST),

                               selectObj = document.getElementById(namesSelectListId),

                               detailDivObj = document.getElementById(detailDivId),

                               listRequest = new IListRESTRequest({

                                         server: "mdsd", list: envPersonnel.PERSONNEL_LIST_NAME

                               });

                              

                     listRequest.getFieldsAndProperties(

                               function (responseData, responseStatus, reqObj) {

                                         var j, fieldValue, lineNode, belowNode,

                                                   InternalNameAndTypeSet = {},

                                                   results = responseData.d.results;

                                        

                                         for (i = 0; i < results.length; i++)

                                                   InternalNameAndTypeSet[results[i].InternalName] = results[i].TypeAsString;

 

                                         for (i = 0; i < keys.length; i++)

                                                   if ((field = keys[i].match(/LIST_([_\w]*)_COLUMN_NAME/)) != null) {

                                                              fieldValue = PERSONNEL_LIST_CONST[field[0]];

                                                              field = field[1].replace(/_/g, " ");

                                                              node = document.createElement("label");

                                                             node.appendChild(document.createTextNode(field));

                                                              cnode = document.createElement("input");

                                                              belowNode = null;

                                                              switch (InternalNameAndTypeSet[field]) {

                                                              case "Boolean":

                                                                        cnode.type = "checkbox";

                                                                        break;

                                                              case "Calculated":

                                                              case "Computed":

                                                                        cnode.type = "text";

                                                                        cnode.disabled = true;

                                                                        belowNode = cnode;

                                                                        if (!lineNode)

                                                                                  lineNode = cnode;

                                                                        break;

                                                              case "DateTime":

                                                                        cnode.type = "date";

                                                                        break;

                                                              default:

                                                                        cnode.type = "text";

                                                                        break;

                                                              }

                                                              cnode.name = fieldValue;

                                                              node.appendChild(cnode);

                                                              if (lineNode)

                                                                        if (belowNode == cnode)

                                                                                  detailDivObj.appendChild(node);

                                                                        else

                                                                                  detailDivObj.insertBefore(node, lineNode);

                                                              else

                                                                        detailDivObj.appendChild(node);

                                                   }

                               }

                     );

                    

                     results = listRequest.getAllListItemsOptionalQuery("$select=" +

                                         PERSONNEL_LIST_CONST.LIST_ID_COLUMN_NAME +

                               "," + PERSONNEL_LIST_CONST.LIST_Last_Name_COLUMN_NAME +

                               "," + PERSONNEL_LIST_CONST.LIST_First_Name_COLUMN_NAME

                     ).getJsonData(["results"]);

                     for (i = 0; i < results.length; i++) {

                               node = document.createElement("option");

                               node.value = results[i][PERSONNEL_LIST_CONST.LIST_ID_COLUMN_NAME];

                               node.appendChild(document.createTextNode(

                               results[i][PERSONNEL_LIST_CONST.LIST_First_Name_COLUMN_NAME] +

                                         " " +

                               results[i][PERSONNEL_LIST_CONST.LIST_Last_Name_COLUMN_NAME]));

                               selectObj.appendChild(node);

                     }

          };

 

          this.displayFieldsAndProperties = function (listSelectId, fieldPropertiesDivId) {

                     var listRequest = new IListRESTRequest({

                                         server: "mdsd", list: envPersonnel.PERSONNEL_LIST_NAME

                               }),

                               bodyElement = document.getElementsByTagName("body")[0],

                               listSelectObj = document.getElementById(listSelectId),

                               fieldPropsObj = document.getElementById(fieldPropertiesDivId),

                               workContext = this.currentWorkContext;

                    

                     listRequest.getFieldsAndProperties(

                               function (responseData, responseStatus, reqObj) {

                                         var i, node, keys, cnode, selectObjStyle, selectWidth,

                                                   subrequest = new IListRESTRequest({

                                                              server: "mdsd", list: envPersonnel.PERSONNEL_LIST_NAME

                                                   }),

                                                   results = responseData.d.results;

                                                  

                                         workContext.saveRawJsonResponse(responseData);

                                         while (listSelectObj.firstChild)

                                                   listSelectObj.removeChild(listSelectObj.firstChild);

                                         for (i = 0; i < results.length; i++) {

                                                   node = document.createElement("option");

                                                   node.value = results[i].Id;

                                                   node.appendChild(document.createTextNode(results[i].Title +

                                                              " [" + results[i].EntityPropertyName + "]"));

                                                   listSelectObj.appendChild(node);

                                         }

                                         if (i >= 20)

                                                   listSelectObj.size = 20;

                                         else

                                                   listSelectObj.size = i;

                                        

                                         for (i = 0, keys = Object.keys(SPBaseFieldProperties);

                                                                        i < keys.length; i++) {

                                                   cnode = document.createElement("input");

                                                   cnode.name = keys[i];

                                                   switch (SPBaseFieldProperties[keys[i]]) {

                                                   case clsRestReq_CONST.TYPE_BOOLEAN_RO:

                                                              cnode.type = "checkbox";

                                                              break;

                                                   case clsRestReq_CONST.TYPE_BOOLEAN_RW:

                                                              cnode.type = "checkbox";

                                                              cnode.className = "editable";

                                                              break;

                                                   case clsRestReq_CONST.TYPE_STRING_RO:

                                                              cnode.type = "text";

                                                              break;

                                                   case clsRestReq_CONST.TYPE_STRING_RW:

                                                              cnode.type = "text";

                                                              cnode.className = "editable";

                                                              break;

                                                   case clsRestReq_CONST.TYPE_INT32_RW:

                                                              cnode.type = "text";

                                                              cnode.className = "editable numeric";

                                                              break;

                                                   default:

                                                              throw "Unknown Field Property Type;"

                                                              break;

                                                   }

                                                   node = document.createElement("label");

                                                   node.appendChild(document.createTextNode(keys[i]))

                                                   node.appendChild(cnode);

                                                   fieldPropsObj.appendChild(node);

                                         }

                                         listSelectObj.selectedIndex = 0;

                                         listSelectObj.focus();

                                         selectWidth = parseInt(window.getComputedStyle

                                                             (listSelectObj).getPropertyValue("width"));

                                         showFldProps(listSelectObj);

                                         document.getElementById("rawcode").style.maxWidth = selectWidth + "px";

                                         bodyElement.style.width = (selectWidth +

                                                             parseInt(window.getComputedStyle

                                                             (fieldPropsObj).getPropertyValue("width")) + 80) + "px";

                               }

                     );

          };

         

          this.clearList = function () {

                     var selectObj = this.selectObj;

                    

                     while (selectObj.firstChild)

                               selectObj.removeChild(selectObj.firstChild);

          };

 

          this.getRecordDetail = function () {

                     var i, results, keys,

                               form = this.currentWorkContext.getForm(),

                               id = this.selectObj.options[this.selectObj.selectedIndex].value,

                               listRequest = new IListRESTRequest({

                                         server: "mdsd", list: envPersonnel.PERSONNEL_LIST_NAME

                               }),

                    

                     results = listRequest.getListItemData(id).getJsonData(["d"]);

                     keys = Object.keys(results);

                     for (i = 0; i < keys.length; i++) {

                               if (form[keys[i]]) {

                                         form[keys[i]].value = results[keys[i]];

                                         if (form[keys[i]].type && form[keys[i]].type == "text" &&

                                                                        form[i].size < results[keys[i]].length + 1)

                                                   form[i].size = results[keys[i]].length + 1;

                               }

                     }

          };

}

 

function showFldPropsEx(workContext, selectObj) {

          var listRequest = new IListRESTRequest({

                               server: "mdsd", list: envPersonnel.PERSONNEL_LIST_NAME

                     }),

                     form = workContext.getForm();

                    

          listRequest.getFieldProps(

                     selectObj.options[selectObj.selectedIndex].value,

                     function (responseData, responseStatus, reqObj) {

                               var i, node, cnode,

                                         addedPropsDiv = document.getElementById("additional-properties");

                                        

                               while (addedPropsDiv.firstChild)

                                         addedPropsDiv.removeChild(addedPropsDiv.firstChild);

                              

                               for (i in responseData.d) {

                                         if (!form[i]) {

                                                   if (typeof responseData.d[i] == "boolean" ||

                                                                                  typeof responseData.d[i] == "string") {

                                                              cnode = document.createElement("input");

                                                              if (typeof responseData.d[i] == "boolean") {

                                                                        cnode.type = "checkbox";

                                                                        cnode.checked = responseData.d[i] == false ? false : true;

                                                              } else {

                                                                        cnode.type = "text";

                                                                        cnode.value = responseData.d[i];

//                                                                     cnode.size = cnode.value.length + 1 < 20 ?

//                                                                               cnode.value.length + 1 : 20;

                                                              }

                                                              node = document.createElement("label");

                                                             node.appendChild(document.createTextNode(i));

                                                              node.appendChild(cnode);

                                                             addedPropsDiv.appendChild(node);

                                                   } else if (typeof responseData.d[i] == "object") {

                                                              cnode = document.createElement("button");

                                                              cnode.type = "button";

                                                              cnode.value = i;

                                                             cnode.appendChild(document.createTextNode("Show"));

                                                             cnode.addEventListener("click", function (evt) {

                                                                        var button = evt.target,

                                                                                  form = button.form;

 

                                                                        if (button.firstChild.data == "Show") {

                                                                                  form[button.value].style.display = "inline";

                                                                                  button.replaceChild(document.createTextNode("Hide"),

                                                                                            button.firstChild);

                                                                        } else {

                                                                                  form[button.value].style.display = "none";

                                                                                  button.replaceChild(document.createTextNode("Show"),

                                                                                            button.firstChild);

                                                                        }

                                                              });

                                                              node = document.createElement("label");

                                                             node.appendChild(document.createTextNode(i));

                                                              node.appendChild(cnode);

                                                             node.appendChild(document.createElement("br"));

                                                              cnode = document.createElement("textarea");

                                                              cnode.rows = 8;

                                                              cnode.cols = 30;

                                                              cnode.style.display = "none";

                                                              cnode.name = i;

                                                              cnode.value = JSON.stringify(responseData.d[i], null, "  ");

                                                              node.appendChild(cnode);

                                                             addedPropsDiv.appendChild(node);

                                                   }

                                         } else if (form[i].type == "checkbox")

                                                   if (responseData.d[i] == true)

                                                              form[i].checked = true;

                                                   else

                                                              form[i].checked = false;

                                         else if (responseData.d[i] == null) // form[i].type == "text"

                                                   form[i].value = "<no-value>";

                                         else if (responseData.d[i] == "")

                                                   form[i].value = "<empty-string>";

                                         else

                                                   form[i].value = responseData.d[i];

                                         if (form[i] && form[i].type == "text")

                                                   form[i].size = form[i].value.length + 1 < 30 ? form[i].value.length + 1 : 30;

                               }

                               if (addedPropsDiv.firstChild)

                                         document.getElementById("added-props").style.display = "block";

                     }

          );

 

}

 

function showRawEx(workContext, inputObj) {

          var tarea = workContext.getForm()["raw-response"];

         

          if (inputObj.checked == true) {

                     tarea.style.display = "inline";

                     tarea.value = JSON.stringify(workContext.getLastRawJsonResponse(), null, "  ");

          } else {

                     tarea.style.display = "none";

          }

}

 

 

 

function searchPersonnelData(parameters) {

          parameters.doSearch = true;

          return getPersonnelData(parameters);

}

 

function isUnitChiefRoleDefined(unit) {

          return UnitsAndChiefs[unit][0] == null ? false : true;

}

 

 

/*

   i. start reporting for SP list report

  ii. get query set from URL

iii. render form

  iv. xml http object with REST request to update SP list

   v. examine response

  vi. give OK or error report

  

   forms

   

   All query URLs: 

   ?state=[1-10,50-53]&source=[email|form]&itemid=[ItemId]&letterdate=[letterDate]&

    letternumber=[LetterNumber]&lettersubject=[LetterSubject]&vendor=[FI|ASO]&

          letterurl=[encodedLetterURL]

  

   

   1. Unit assigner      URL:  ?state=newItem =1

   2. Analyst assigner (unit chief)   ?state=unitAssigned =2

   3. Initial Analyst form: get documents, response required?  ?state=analystAssigned  =3

   4. Follow up Analyst form: link to draft, draft completed controls  ?state=ResponseYes =4

   5. Peer review assigner: list of unit personnel  ?state=DraftComplete  =5

   6. Manager I review: link to response letter, approval/denial + comment control ?state=PeerComplete =6

   7. Manager II review: same form as #6   ?state=MgrIComplete = 7

   8. Letter Branding-Number + Date  offer number , offer date form ?state=ToBrand =8

   9. Signature Task:  click if signature obtained   ?state=GetSig =9

  10. Letter Transmitted:  click to indicate signed letter  ?state=SigDone  =10

 

  11. Analyst Return: rejected letter   ?state=RedoLetter =50

  12. Peer Redo ?state=RedoByPeer =51

  13. Mgr I Redo  ?state=RedoByMgrI   =52

  14. Mgr II Redo  ?state=RedoByMgrII  =53

*/