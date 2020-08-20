"use strict";

 

// CATMgmt.js

/** @function getUnits

*  @return  {Promise} all items of units obtained from the CAT Units-Reviewers list

*

*/

function getUnits() {

          var i, j,

                     iCATUnitsReviewerList = new IListRESTRequest({

                               server: SERVER_NAME,

                               site: CAT_UNITS_REVIEWERS_SITE_NAME,

                               listName: CAT_UNITS_REVIEWERS_LIST_NAME,

                     }),

                     iCATWorkflowList = new IListRESTRequest({

                               server: SERVER_NAME,

                               site: CAT_WORKFLOW_SITE_NAME,

                               listName: CAT_WORKFLOW_LIST_NAME,

                     });

 

          return new RSVP.Promise(function (resolve, reject) {

                     iCATWorkflowList.getAllListItemsOptionalQuery({

                               query: "$select=" + CAT_WORKFLOW_LIST_Unit_COLUMN

                     }).then(function (response) {

                               var WorkflowUnits = [ ], results = response.responseJSON.d.results;

                              

                               for (i = 0; i < results.length; i++)

                               WorkflowUnits.push(results[i][CAT_WORKFLOW_LIST_Unit_COLUMN]);

                               WorkflowUnits.sort();

                               iCATUnitsReviewerList.getAllListItemsOptionalQuery({

                                         query: "$select=" + CAT_UNITS_REVIEWERS_LIST_Unit_Section_Name_COLUMN + ","

                                                              + CAT_UNITS_REVIEWERS_LIST_MDSDP_ID_COLUMN

                               }).then(function (response) {

                                         var UnitList = [ ], UnitsWithReviewers = [ ],

                                                              results = response.responseJSON.d.results;

                                        

                                         for (i = 0; i < WorkflowUnits.length; i++)

                                                   UnitsWithReviewers.push(results.find(function (elem) {

                                                              return elem[CAT_UNITS_REVIEWERS_LIST_Unit_Section_Name_COLUMN] ==

                                                                                  WorkflowUnits[i];

                                                   }));

                                         UnitsWithReviewers.sort(function (a, b) {

                                                   if (a[CAT_UNITS_REVIEWERS_LIST_MDSDP_ID_COLUMN] <

                                                                                  b[CAT_UNITS_REVIEWERS_LIST_MDSDP_ID_COLUMN])

                                                              return -1;

                                                   else if (a[CAT_UNITS_REVIEWERS_LIST_MDSDP_ID_COLUMN] >

                                                                                  b[CAT_UNITS_REVIEWERS_LIST_MDSDP_ID_COLUMN])

                                                              return 1;

                                                   return 0;

                                         });

                                         for (i = j = 0; i < UnitsWithReviewers.length; i++) {

                                                   if (typeof UnitsWithReviewers[i] == "undefined")

                                                              continue;

                                                   if (i > 0 && UnitsWithReviewers[i][CAT_UNITS_REVIEWERS_LIST_MDSDP_ID_COLUMN] ==

                                                                                            UnitsWithReviewers[i - 1][CAT_UNITS_REVIEWERS_LIST_MDSDP_ID_COLUMN])

                                                              UnitList[j - 1] += "/" + UnitsWithReviewers[i][CAT_UNITS_REVIEWERS_LIST_Unit_Section_Name_COLUMN];

                                                   else

                                                              UnitList[j++] = UnitsWithReviewers[i][CAT_UNITS_REVIEWERS_LIST_Unit_Section_Name_COLUMN];

                                         }

                                         resolve(UnitList);

                               }).catch(function (response) {

                                         console.log("getUnits()::CAT Units/Rev::getAllListItemsOptionalQuery() response = " + JSON.stringify(response));

                                         reject(response);

                               });

                     }).catch(function (response) {

                        console.log("getUnits()::WorkflowList::getAllListItemsOptionalQuery response = " + JSON.stringify(response));

                               reject(response);

                     });

          });

}

 

function getUnitAnalysts(parameters) {

          if (!parameters.unit)

                     throw "argument must be object in form {unit: <unit-name>}";

          return getCATPersonnelData({unit: parameters.unit});

}

 

// can contain multiple units separated by commas

function getUnitReviewersData(units) {

          var i, requests = [ ], buildQuery = "$filter=",

                     iCATUnitsReviewerList = new IListRESTRequest({

                               server: SERVER_NAME,

                               site: CAT_UNITS_REVIEWERS_SITE_NAME,

                               listName: CAT_UNITS_REVIEWERS_LIST_NAME,

                     });

 

          if (!units)

                     throw "argument must be string with one or more delimited (/ or comma) unit names";

          if (units.search(/\//) > 0) // this is a multiple unit selection where one reviewer exists

                     units = units.replace(/\//g, ",");

          units = units.split(",");

 

          buildQuery = "$filter=";

          for (i = 0; i < units.length; i++) {

                     if (i > 0)

                               buildQuery += " or ";

                     buildQuery += CAT_UNITS_REVIEWERS_LIST_Unit_Section_Name_COLUMN + " eq '"

                                         + units[i] + "'";

          }

          return new RSVP.Promise(function (resolve, reject) {

                     iCATUnitsReviewerList.getAllListItemsOptionalQuery({

                               query: buildQuery

                     }).then(function (response) {

                               var data = [ ], results = response.responseJSON.d.results;

 

                               for (i = 0; i < results.length; i++)

                               data.push(results[i][CAT_UNITS_REVIEWERS_LIST_MDSDP_ID_COLUMN]);

                               data = dedup(data.sort());

                               if (data.length > 0) {

                                         requests.push(new RSVP.Promise(function (resolve, reject) {

                                                   for (i = 0; i < data.length; i++) {

                                                              getCATPersonnelData({

                                                                        ID: data[i]

                                                              }).then(function (response) {

                                                                        resolve(response);

                                                              }).catch(function (response) {

                                                                        reject(response);

                                                              });

                                                   }

                                         }));

                                         RSVP.all(requests).then(function (response) {

                                                   resolve(response[0]);

                                         }).catch(function (response) {

                                                   console.log("getUnitReviewersData()::requests.all() response = " + JSON.stringify(response));

                                                   reject(response)

                                         });

                               } else

                                         throw "Unexpected association of a unit or units with more than one ID"

                     }).catch(function (response) {

                     console.log("getUnitReviewersData()::iCATUnitsReviewerList.getAllListItemsOptionalQuery() response = " + JSON.stringify(response));

                               reject(response);

                     });

          });

}

 

/** @function getWorkflowUnitReviewer

*  @param {string} unit - name/acronym of unit (not section) to check workflow

*  @returns {Object} - {level:"unit"|"section",reviewer:"reviewer name",email:"email@address"}

*/

function getWorkflowUnitReviewer(unit) {

          var iCATWorkflowList = new IListRESTRequest({

                               server: SERVER_NAME,

                               site: CAT_WORKFLOW_SITE_NAME,

                               listName: CAT_WORKFLOW_LIST_NAME

                     });

 

          return new RSVP.Promise(function (resolve, reject) {

                     iCATWorkflowList.getAllListItemsOptionalQuery({

                               filter: CAT_WORKFLOW_LIST_Unit_COLUMN + " eq '" + unit + "'"

                     }).then(function (response) {

                               var results = response.responseJSON.d.results;

                              

                               if (results.length > 1)

                                         throw "Expected only one result, got one different than one";

                               if (results[0][CAT_WORKFLOW_LIST_Section_COLUMN].search(/\*/) > 0)

                                         getUnitReviewersData(

                                         results[0][CAT_WORKFLOW_LIST_Section_COLUMN].match(/(\w+)\*/)[1]

                                         ).then(function (response) {

                                                   resolve({

                                                              level:"section",

                                                              reviewer: response[0].usedName,

                                                              email: response[0].emailAddress

                                                   });

                                         }).catch(function (response) {

                                         console.log("getWorkflowUnitReviewer()::iCATWorkflowList.getAllListItemsOptionalQuery() response = " + JSON.stringify(response));

                                                   reject(response);

                                         });

                               else

                                         getUnitReviewersData(

                                                   results[0][CAT_WORKFLOW_LIST_Unit_COLUMN]

                                         ).then(function (response) {

                                                   resolve({

                                                              level:"unit",

                                                              reviewer: response[0].usedName,

                                                              email: response[0].emailAddress

                                                   });

                                         }).catch(function (response) {

                                                   console.log("getWorkflowUnitReviewer()::* NOT in search//getUnitReviewersData() response = " + JSON.stringify(response));

                                                   reject(response);

                                         });

                     }).catch(function (response) {

                               console.log("getWorkflowUnitReviewer()::* NOT in search//getUnitReviewersData() response = " + JSON.stringify(response));

                               reject(response);

                     });

          });

}

 

function getWorkflowSectionReviewer(unit) {

          var iCATWorkflowList = new IListRESTRequest({

                               server: SERVER_NAME,

                               site: CAT_WORKFLOW_SITE_NAME,

                               listName: CAT_WORKFLOW_LIST_NAME

                     });

          return new RSVP.Promise(function (resolve, reject) {

                     iCATWorkflowList.getAllListItemsOptionalQuery({

                               filter: CAT_WORKFLOW_LIST_Unit_COLUMN + " eq '" + unit + "'"

                     }).then(function (response) {

                               var results = response.responseJSON.d.results;

                              

                               if (results.length > 1)

                                         throw "Expected only one result, got one different than one";

                               if (results[0][CAT_WORKFLOW_LIST_Section_COLUMN].search(/\*/) > 0)

                                         resolve("skip review");

                               else {

                                         getUnitReviewersData(

                                         results[0][CAT_WORKFLOW_LIST_Section_COLUMN].match(/(\w+)/)[1]

                                         ).then(function (response) {

                                                   resolve({

                                                              level:"section",

                                                              reviewer: response[0].usedName,

                                                              email: response[0].emailAddress

                                                   });

                                         }).catch(function (response) {

                                         console.log("getWorkflowSectionReviewer()::getUnitReviewersData() response = " + JSON.stringify(response));

                                                   reject(response);

                                         });

                               }

                     }).catch(function (response) {

                     console.log("getWorkflowUnitReviewer()::iCATWorkflowList.getAllListItemsOptionalQuery() response = " + JSON.stringify(response));

                               reject(response);

                     });

          });               

}

 

/** @function getUnitsAnalysts

*  @param {Object} parameters

*  @param {string} parameters.units - delimited string or array on unit names allowed

*  @returns {[Object],...} - array of objects with following format

*      [{unitName:"unitNameString",

*         unitAnalysts:[{id:<integer>,firstName:<string>,lastName:<string>,

*                                                           usedName:<string>,unit:<string>,role:<string>,

*                                                           emailAddress:<string>}]},...]

*/

function getUnitsAnalysts(parameters) {

          var units;

         

          if (typeof parameters.units == "undefined")

                     throw "argument requires unit name in form '{units:&lt;unitName1&gt;,&lt;unitName2&gt;,...}'";

          if (typeof parameters.units == "string") {

                     if ((units = parameters.units.split("/")) == parameters.units)

                               units = parameters.units.split(",");

          } else

                     units = parameters.units;

          return new RSVP.Promise(function (resolve, reject) {

                     var i, analystQueries = [ ];

                    

                     for (i = 0; i < units.length; i++)

                               analystQueries.push(new RSVP.Promise(function (resolve, reject) {

                                         getUnitAnalysts(units[i]).then(function (response) {

                                                   resolve(response);

                                         }).catch(function (response) {

                                                   reject(response);

                                         });

                               }));

                     RSVP.all(analystQueries).then(function (response) {

                               var unit;

                              

                               units = [ ];                        

                               for (i = 0; i < response.length; i++) {

                                         unit = response[i].unit;

                                         units.push({

                                                   unitName: unit,

                                                   unitAnalysts: response[i].analysts

                                         });

                               }

                               resolve(units);

                     }).catch(function (response) {

                               reject(response);

                     });

          }).catch(function (response) {

                     reject(response);

          });

}

 

function getUnitAnalysts(unit) {

          return new RSVP.Promise(function (resolve, reject) {

                     getCATPersonnelData({unit:unit}).then(function (response) {

                               resolve({unit:unit,analysts:response});

                     }).catch(function (response) {

                               reject(response);

                     });

          });

}

 

function getItemAnalyst(itemId) {

          return new RSVP.Promise(function (resolve, reject) {

                     getCATPersonnelData({

                               ID: itemId

                     }).then(function (response) {

                               resolve(response[0]);

                     }).catch(function (response) {

                               reject(response);

                     });

          });

}

 

/** @function getEmailAddressFromFullName

*    This function will make an attempt to get the email address of a person who

*     is an item in the MDSD Personnel list. Some users have three parts to their

 *     names (two-word first names, two-word last names)

*       @param {string} fullName - Enters the full 3-word name

*       @returns {Promise:string} - email address of user

*/

function getEmailAddressFromFullName(fullName) {

          return new RSVP.Promise(function (resolve, reject) {

                     var i, text = "", nameParts = fullName.split(" ");

                    

                     if (nameParts.length > 2) { // is the name return more than 2 words?

                               for (i = 1; i < nameParts.length; i++)

//                                       if (nameParts[i].toUpperCase() != "ACTING") eliminate ACTING from DB

                                         text += (text.length > 0 ? " " : "") + nameParts[i]; // unify the 2nd, 3rd, etc

                               nameParts[1] = text;

                     }

                     getCATPersonnelData({names:[

                               {first: nameParts[0],

                               last: nameParts[1]}

                     ]}).then(function (response) {

                               if (response instanceof Array && response.length == 0)

                                         getCATPersonnelData({names:[

                                                   {first: nameParts[0] + " " + nameParts[1].split(" ")[0],

                                                   last: nameParts[1].split(" ")[1]}

                                         ]}).then(function (response) {

                                                   resolve(response[0].emailAddress);

                                         }).catch(function (response)          {

                                                   reject(response);

                                         });

                               else

                                         resolve(response[0].emailAddress);

                     }).catch(function (response) {

                               reject(response);

                     });

          });

}

 

/** @function getCATPersonnelData

*       @param {object} parameters -- the object should have the named properties, if used:

*       @param {string} unit - will filter the return of staff for specified unit

*                              if unit == "*" or "all", will return a list of unit names instead

*       @param {string} role - should be one of the defined constant string values under

*                            the object PERSONNEL_LIST_CONST

*       @param {integer} ID -  the value of the item ID for the user in the personnel list

*       @param {[object: first:,last:}]} nameObject - array of objects with property 'first'

*                                      and 'last' being first and last names

*                                      { first: <first-name>, last: <last-name> }

*                                      can be used to retrieve specific user when first three arguments have null value

*       @param {boolean} doSearch - when set true, will not require that name filter be equal

*                            but contain partial strings useful in returning search results

*      

*       Note that the empty object can be passed

*       @returns {Object}

 *      1. if persons are returned, they are returned array of objects with following

*         properties

*                      { id: ID, usedName: "used name", unit: "unit", role: "role",

 *                                 emailAddress: "email address" }

*            2. if only unit is specified as "*" or "all", array of unit names returned

*/

function getCATPersonnelData(parameters) {

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

                                        

                     if (!envPersonnel)

                               throw "Global 'envPersonnel' not defined\n\n"

                                         + "Must include the 'MDSDPersonnelDefs.js' file and define "

                                         + "this global as 'DEV_PERSONNEL', 'TEST_PERSONNEL' or 'PROD_PERSONNEL'";

                     IMdsdPersonnelList = new IListRESTRequest({

                               server: envPersonnel.SERVER_NAME,

                               site: envPersonnel.SITE_NAME,

                               list: envPersonnel.PERSONNEL_LIST_NAME,

                     });

                     if (parameters.unit && (parameters.unit == "*" || parameters.unit.toLowerCase() == "all"))

                               IMdsdPersonnelList.getFieldChoices({

                                         fieldName: envPersonnel.LIST_Unit_COLUMN_NAME

                               }).then(function (response) {

                                         resolve (response.fieldValues);

                               });

                     else {

                               if (typeof parameters.doSearch == "undefined")

                                         parameters.doSearch = false;

                               listSelect = "$select=" + standardColumns;

                               listFilter = "$filter=";

                               if (parameters.names) {

                                         var names = parameters.names;

                                        

                                         if (names instanceof Array == false)

                                                   throw "argument 'names' is not Array type";

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

                               } else if (parameters.ID) {

                                         listFilter +=

                                                   envPersonnel.LIST_ID_COLUMN_NAME + " eq '" +

                                                   parameters.ID + "'";

                               } else {

                                         if (parameters.unit && !parameters.role && !parameters.ID) {

                                         listFilter +=

                                                   envPersonnel.LIST_Unit_COLUMN_NAME + " eq '"

                                                              + parameters.unit + "' and "

                                                   + envPersonnel.LIST_Role_COLUMN_NAME + " eq '"

                                                              + MDSDP_LIST_Staff_Role_CHOICE_VALUE + "' and "

                                                   + envPersonnel.LIST_Active_COLUMN_NAME + " ne 'No'";

                                         } else if (parameters.unit && parameters.role && !parameters.ID) {

                                                   if (parameters.names)

                                                              listFilter += " and ";

                                                   listFilter +=

                                                             envPersonnel.LIST_Unit_COLUMN_NAME + " eq '"

                                                                        +          parameters.unit + "' and "

                                                              + envPersonnel.LIST_Role_COLUMN_NAME + " eq '"

                                                                + parameters.role + "' and "

                                                              + envPersonnel.LIST_Active_COLUMN_NAME + " ne 'No'";

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

                                         console.log("getCATPersonnelData() response = " + JSON.stringify(response));

                                         reject(response);

                               });

                     }

          });

}

 

/* *********************************************************

   CAT Rules on Workflow Reviewers

          1. Three SP lists are read by CAT and must be Maintained:

            (i)   MDSD Personnel - analysts and managers must be named and include

               email addresses; analysts must be associated with a unit name in the

                       other lists. Unit associations are not necessarily required in Personnel list

            (ii)  CAT Units-Reviewers -- links a unit or section name with a manager (reviewer)

            (iii) CAT Workflow - shows a unit ==> section sequence for each workflow

          2. All units and sections used in the CAT Workflow list must be defined

             with the unit/section and named reviewer in the CAT Unit-Reviewer list

          3  In the CAT Units-Reviewers list, the following rules & conditions apply:

            (a) Duplicate unit names are not permitted

            (b) Names in the Reviewer column can be duplicated

            (c) Since in rule 4(b) a unit name cannot flow to a section name

               where the names are identical, it is purposeful to create

                       a fake section name where necessary to flow reviews especially

                       in order to skip a review step

          4. In the Workflow, the following rules and principles apply:

            (a) A unit name is fundamentally understood to contain a group of

                analysts which can be referenced in the MDSD Personnel list

            (b) A unit and section in the same item cannot have identical acronyms

               For example, the Unit cannot be defined "SDU" and the Section cannot also be same.

                       If no section exists on the org chart, make up one from the unit,

                       for example SDUS from SDU

            (c) No two items (rows) in the list can have identical unit names: that

               column must have unique names

            (d) In any item (workflow), a section name can be duplicated; in fact that

              is fundamentally necessary since there is a many-to-one unit-to-section

                     relationship and not a one-to-many unit-to-section relationship

            (e) If in any workflow the unit reviewer and section reviewer

              have the same name, the section review will be skipped and review

                     will only be at the unit level

            (f) If it is desired that the unit review be skipped and the section

              review be done, then the section name should contain an asterisk (*)

                     character at the end of the section name. The reviewer names for the

                     flow must still be identical as a condition of using this feature.

                     It is not necessary to define the section name in the Unit-Reviewers list

                     with an asterisk.

   These rules are intended to cover a multitude of two-step review possibilities.

   ********************************************************* */
