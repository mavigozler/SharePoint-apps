"use strict";

 

function init() {

// get current user

          var node, form = document.getElementById("initiate-form");

         

          if (location.search.length > 0) {

                     document.getElementById("rejected").style.display = "block";

                     node = document.getElementById("reject-reason");

                     node.appendChild(document.createTextNode(

                     decodeURIComponent(location.search.match(/rejectReason=(.*)(&|$)?/)[1])

                     ));

                     setCheckedRadioValue(form.vendor, location.search.match(

                               new RegExp(CatCONST.QUERY_STRING_NAME_VENDOR_INITIATE + "=([^&]+)"))[1]);

                     form.letterSubject.value = decodeURIComponent(location.search.match(

                               new RegExp(CatCONST.QUERY_STRING_NAME_LETTER_SUBJECT_INITIATE + "=([^&]+)"))[1]);

          } else

                     document.getElementById("initial").style.display = "block";

          getSharePointCurrentUserInfo().then(function (response) {

                     var currentUserInfo = response;

                     form.analyst.value = currentUserInfo.getFullName();

                     form.emailAddress.value = currentUserInfo.getUserEmail();

                     getPersonnelData({

                               names: [{

                                         first: currentUserInfo.getFirstName(),

                                         last: currentUserInfo.getLastName()

                               }]

                     }).then(function (response) {

                               var i, node = form.unitInitiate;

                               setCheckedRadioValue(node, response[0].unit);

                               for (i = 0; i < node.length; i++)

                                         node[i].disabled = true;

                     });

                     console.log("Current User Info: " + EnhancedJsonStringify(response, null, "  "))

          }).catch(function (response) {

                     alert("Problem getting current user info");

          });

// get options for the unit

          getPersonnelData({

                     unit:"*"

          }).then(function (unitNames) {

                     var i, node, node2, pNode = document.getElementById("unit-initiating");

                    

                     while (pNode.firstChild)

                               pNode.removeChild(pNode.firstChild);

                     for (i = 0; i < unitNames.length; i++) {

                               if (unitNames[i].search(/SS$|AS$|DC$|DMCU$|RAU$/) >= 0 ||

                                                   unitNames[i].toLowerCase() == "exec" ||

                                                   unitNames[i].toLowerCase() == "eits")

                                         continue;

                               node = document.createElement("span");

                               node.className = "unit-options";

                               pNode.appendChild(node);

                               node2 = document.createElement("input");

                               node2.type = "radio";

                               node2.name = CatCONST.QUERY_STRING_NAME_ASSIGNED_UNIT_INITIATE;

                               node2.value = unitNames[i];

                               node.appendChild(node2);

                               node.appendChild(document.createTextNode(unitNames[i]));

                     }

          }).catch(function (response) {

// TODO

                     emailDeveloper({

                               subject: "CATLetterInitiate.js: global: getPersonnelData() caught",

                               body: "<p></p>"

                     });               

          });

}

 

function processForm(form) {

// form validation

          var unitValue, vendorValue;

         

          if ((unitValue = getCheckedRadioValue(form[CatCONST.QUERY_STRING_NAME_ASSIGNED_UNIT_INITIATE])) == null)

                     return alert("Unit has not been selected");

          if ((vendorValue = getCheckedRadioValue(form.vendor)) == null)

                     return alert("Vendor has not been selected");

          if (form.letterSubject.value == "")

                     return alert("No letter subject text entered/found");

          if (form.letterSubject.value.length > 255)

                     return alert("Letter subject text length exceeds 255 characters. Shorten it.");

// setup email message and send

 

          $.ajax({

                     url: location.origin + pathname(location.pathname) + "/CATemailTemplates.html",

                     method: "GET",

                     success: function (responseText, responseStatus, reqObj) {

                               var bodyText,          

                                         emailService = new SPUtilityEmailService({

                                                   server: SERVER_NAME,

                                                   site: SITE_NAME

                                         });

 

                               bodyText = (new DOMParser().parseFromString(responseText,

                                                   "text/html")).getElementById("initiated-letter-coordinator-start").outerHTML;

                               bodyText = bodyText.replace(/CurrentItem-Analyst-Name/, form.analyst.value);

                               bodyText = bodyText.replace(/\$\$href\$\$/g,

                                                   location.hostname +

                                                   location.pathname.substr(0, location.pathname.lastIndexOf("/")) +

                                                   "/CAT.html?source=email&amp;state=100&amp;" +

                                              CatCONST.QUERY_STRING_NAME_ASSIGNED_ANALYST_INITIATE + "=" +

                                                             encodeURIComponent(form.analyst.value) +

                                                   "&amp;" + CatCONST.QUERY_STRING_NAME_ASSIGNED_UNIT_INITIATE + "=" + unitValue +

                                                   "&amp;" + CatCONST.QUERY_STRING_NAME_LETTER_SUBJECT_INITIATE + "=" +

                                                             encodeURIComponent(form.letterSubject.value) +

                                                   "&amp;" + CatCONST.QUERY_STRING_NAME_VENDOR_INITIATE + "=" + vendorValue +

                                                   "&amp;emailAddress" + "=" + encodeURIComponent(form.emailAddress.value)

                                         );

                               emailService.sendEmail({

//                                       To: CatCONST.CORRESPONDENCE_COORDINATOR_EMAIL_ADDRESS,

                                         To: "Stephen.Halloran@dhcs.ca.gov",

                                         Subject: "Request to Initiate Letter",         

                                         Body: bodyText

                               });

                               document.getElementById("email-sent").style.display = "block";

                     },

                     error: function (reqObj, responseStatus, errorThrown) {

                               emailDeveloper({

                                         subject: "CRITICAL ERROR IN CAT: Email Templates HTML File Not Obtained",

                                         body: "<p>The CATemailtempates.html file could not be obtained for emailing</p>"

                               });

                     }

          });

}

 

function clearForm(form) {

          form.reset();

          init();

}
