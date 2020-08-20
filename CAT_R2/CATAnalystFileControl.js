"use strict";

 

// CATAnalystFileControl.js

//////////////  ANALYST FILE MANIPULATION INTERFACE ///////////////////

/**  global object */

var interfaceControl = { };

 

/** @function updateItemData

*   used for a refresh of the item data from SP server after any update operation

* @param {(string|integer)} itemId - ID of the item whose metadata is to be retrieved

*/

function updateItemData(itemId) {

          var iCorrespondenceList = new IListRESTRequest({

                     server: SERVER_NAME,

                     site: SITE_NAME,

                     listName: CORRESPONDENCE_LIST_NAME,

                     listItemEntityType: CORRESPONDENCE_LIST_ITEM_ENTITY_TYPE_FULL_NAME

          });

          iCorrespondenceList.getListItemData({

                     itemId: itemId

          }).then(function (response) {

                     document.getElementById("analyst-file-interface-input").value =

                                         EnhancedJsonStringify(response.responseJSON.d);

          }).catch(function (response) {

                     emailDeveloper({

                               subject: "File rename failure",

                               body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +

                                                   EnhancedJsonStringify(response, null, "  ") + "</p>"

                     });

                     performAnalystFileControl(interfaceControl, "error");

          });

}

 

/** @function undisplayFormParts

*   helper function to undisplay many of the HTML elements involved

 * @param {object} interfaceControl - contains information about state of the interface

*/

function undisplayFormParts(interfaceControl) {

          interfaceControl.exchangeRenamePanel.style.display = "none";

          interfaceControl.addPanel.style.display = "none";

          interfaceControl.deletePanel.style.display = "none";

 

          interfaceControl.exchangeHelp.style.display = "none";

          interfaceControl.addHelp.style.display = "none";

          interfaceControl.deleteHelp.style.display = "none";

          interfaceControl.renameHelp.style.display = "none";

 

          interfaceControl.verifyBlock.style.display = "none";

          interfaceControl.uploadDragDropNode.style.display = "none";

          interfaceControl.commonFooter.style.display = "none";

          document.getElementById("add-prompt").style.display = "none";

          document.getElementById("rename-input-block").style.display = "none";

          interfaceControl.scFilesTable.style.display = "none";

          interfaceControl.addFilesTable.style.display = "none";

          interfaceControl.form.style.height = "";

          interfaceControl.form.style.width = "";

          interfaceControl.form.style.overflowY = "";

          interfaceControl.form.style.marginTop = "";

          interfaceControl.form.style.marginLeft = "";

          document.getElementById("analyst-file-control-process-done").style.display = "none";

          document.getElementById("analyst-files-interface-files-list").style.display = "none";

          document.getElementById("analyst-file-load-errors").style.display = "none";

          document.getElementById("exchange-rename-block").style.display = "none";

}

 

/** @function displayAnalystFileControlForm

*   controls the initialization of each of the 4 forms and other set up operations

*  

 * @param {object} interfaceControl - name of replaced file

* @param {(string|boolean)} action - used to slot the operation/processing choice

*/

function displayAnalystFileControlForm(interfaceControl, action) {

          // closing and opening action in this script

          var node;

         

          if (typeof action == "boolean") {

                     var form = document.getElementById("analyst-file-control");

                    

                     interfaceControl.form = form;

                     form.reset();

                     /*

                     if (document.getElementById("analyst-file-active-interface") == null) {

                               node = document.createElement("input");

                               node.id = "analyst-file-active-interface";

                               node.type = "hidden";

                               form.appendChild(node);

                     } */

                     if (action == true)

                               form.style.display = "block";

                     else

                               form.style.display = "none";

 

                     if (!interfaceControl.initialized || interfaceControl.initialized != true) {

                               interfaceControl.exchangeRenamePanel = document.getElementById("exchange-interface");

                               interfaceControl.addPanel = document.getElementById("add-interface");

                               interfaceControl.deletePanel = document.getElementById("delete-interface");

 

                               interfaceControl.exchangeHelp = document.getElementById("exchange-help");

                               interfaceControl.addHelp = document.getElementById("add-help");

                               interfaceControl.deleteHelp = document.getElementById("delete-help");

                               interfaceControl.renameHelp = document.getElementById("rename-help");

 

                               interfaceControl.uploadDragDropNode = document.getElementById("upload-drag-and-drop");

                               interfaceControl.commonFooter = document.getElementById("common-footer");

                              

                               interfaceControl.verifyBlock = document.getElementById("verify-block");

                               interfaceControl.exchangeSelectVerify = document.getElementById("verify-exchange-file");

                               interfaceControl.scFilesTable = document.getElementById("analyst-control-current-scfiles");

                               interfaceControl.addFilesTable = document.getElementById("analyst-control-add-files-table");

                               interfaceControl.initialized = true;

                     }

                     undisplayFormParts(interfaceControl);

          } else if (action == "reset") {

                     // reset add

                     undisplayFormParts(interfaceControl);

                     if (interfaceControl.focus == "add") {

                               document.getElementById("analyst-control-add-files-table").style.display = "none";

                     // reset exchange

                     } else if (interfaceControl.focus == "exchange" ||

                                                                        interfaceControl.focus == "rename") {

                               var node;

                              

                               document.getElementById("exchangeable-files-list").selectedIndex = -1;

                               interfaceControl.uploadDragDropNode.style.display = "none";

                               interfaceControl.verifyBlock.style.display = "none";

                               node = document.getElementById("analyst-file-load-errors");

                               node.style.display = "none";

                               while (node.firstChild)

                                         node.removeChild(node.firstChild);

                               document.getElementById("analyst-file-selected-block").style.display = "none";

                               node = document.getElementById("analyst-files-select");

                               while (node.firstChild)

                                         node.removeChild(node.firstChild);

                               document.getElementById("exchange-rename-block").style.display = "none";

                     // reset delete

                     } else { // interfaceControl.focus == "delete"

                               interfaceControl.uploadDragDropNode.style.display = "none";

                               document.getElementById("analyst-files-interface-files-list").style.display = "none";

                               interfaceControl.form.reset();

                               setCheckedRadioValue(

                                         interfaceControl.form["analyst-file-control-select"],

                                         "delete"

                               );

                     }

                     return displayAnalystFileControlForm(interfaceControl, interfaceControl.focus);

          } else {

          // includes building of separate interfaces

          // get the item ID and get the files associated with it

                     var i, urlParts,

                               itemData = JSON.parse(document.getElementById("analyst-file-interface-input").value),

                               OutItemIds = itemData[CatCONST.CORRESPONDENCE_LIST_DOCLIB_OUTGOING_IDS_COLUMN_NAME].split(","),

                               urls = itemData[CatCONST.CORRESPONDENCE_LIST_DOCUMENT_LIBRARY_COLUMN_NAME].

                                         match(/<a href="([^<]+)<\/a>/ig);

 

                     interfaceControl.itemData = itemData;

                     interfaceControl.itemId = itemData[CatCONST.CORRESPONDENCE_LIST_ITEM_ID_COLUMN_NAME];

                     interfaceControl.OutItemIds = OutItemIds;

                     interfaceControl.urls = urls;

                     interfaceControl.focus = action;

                     undisplayFormParts(interfaceControl);

                    

                     // trim DF16 files from urls

                     while (urls[0].search(/DF16/) >= 0)

                               urls.shift();

                     if (urls.length != OutItemIds.length) {

                               emailDeveloper({

                                         subject: "Data consistency error",

                                         body: "<p>There are " + urls.length + " URLs in the Doc Lib column "

                                                   + "of the Master Log item " + interfaceControl.itemId + " and "

                                                   + OutItemIds.length + " numbers in the DocLib Outgoing IDs column</p>"

                               });

                               location.assign("CATerror.html");

                     }

                     // parse the file names and their IDs

/*                 interfaceControl.filesAffectedNode =

                                         document.getElementById("analyst-files-interface-files-list");

                     interfaceControl.filesAffectedNode.style.display = "none"; */

                     if (action == "exchange" || action == "rename") {

                               var fnames = [ ],

                               selectObj = document.getElementById("exchangeable-files-list");

                              

                               // put the file names in the select list

                               interfaceControl.exchangeRenamePanel.style.display = "block";

                               if (action == "exchange")

                                         interfaceControl.exchangeHelp.style.display = "block";

                               else

                                         interfaceControl.renameHelp.style.display = "block";

                               document.getElementById("exchange-prompt").style.display = "block";

 

                               if (action == "exchange")

                                         interfaceControl.focus = "exchange";

                               else // rename

                                         interfaceControl.focus = "rename";

                               while (selectObj.firstChild)

                                         selectObj.removeChild(selectObj.firstChild);

                               node = document.createElement("option");

                               selectObj.appendChild(node);

                               node.appendChild(document.createTextNode(

                                                   "(select a file to "

                                                   + (action == "exchange" ? "replace" : "rename")

                                                   + ")"

                               ));

                               for (i = 0; i < urls.length; i++) {

                                         node = document.createElement("option");

                                         selectObj.appendChild(node);

                                         urls[i] = decodeURIComponent(urls[i]);

                                         urlParts = urls[i].match(/<a href="([^"]+)">([^>]+)<\/a>/);

                                         node.value = EnhancedJsonStringify({

                                                   itemId: OutItemIds[i],

                                                   fname: urlParts[2],

                                                   href: urlParts[1]

                                         });

                                         node.appendChild(document.createTextNode(

                                                   urlParts[2]

                                         ));

                               }

                               if (selectObj.size < 5)

                                         selectObj.size = selectObj.options.length;

                               else

                                         selectObj.size = 5;

                               selectObj.selectedIndex = -1;

                               if ((node = document.getElementById("analyst-control-current-scfiles")) != null)

                                         node.style.display = "none";

                     // add interface

                     } else if (interfaceControl.focus == "add") {

                               var trNode, tdNode;

                    

                               interfaceControl.addPanel.style.display = "block";

                               interfaceControl.addHelp.style.display = "block";

                               document.getElementById("add-prompt").style.display = "block";

                               interfaceControl.uploadDragDropNode.style.display = "block";

                               interfaceControl.commonFooter.style.display = "none";

 

                               document.getElementById("analyst-file-selected-block").style.display = "none";

                               node = document.getElementById("sc-files-tbody");

                               while (node.firstChild)

                                         node.removeChild(node.firstChild);

                               for (i = 0; i < urls.length; i++) {

                                         urls[i] = decodeURIComponent(urls[i]);

                                         trNode = document.createElement("tr");

                                         node.appendChild(trNode);

                                         tdNode = document.createElement("td");

                                         trNode.appendChild(tdNode);

                                         tdNode.appendChild(document.createTextNode(

                                                   urls[i].match(/(^|>)(SC16-\d{2}-00000[a-z]{0,1}-\w{2,3}\s[^<]+)/)[2]

                                         ));

                               }

                               interfaceControl.scFilesTable.style.display = "table";

                     // delete interface

                     } else if (interfaceControl.focus == "delete") {

                               var cNode,

                                         deleteInterfaceNode = document.getElementById("delete-interface");

                              

                               while (deleteInterfaceNode.firstChild)

                                     deleteInterfaceNode.removeChild(deleteInterfaceNode.firstChild);

                              

                               interfaceControl.deletePanel.style.display = "block";

                               interfaceControl.deleteHelp.style.display = "block";

                              

                               interfaceControl.uploadDragDropNode.style.display = "none";

                               interfaceControl.commonFooter.style.display = "none";

                               interfaceControl.focus = "delete";

                               for (i = 1; i < urls.length; i++) {

                                         urlParts = urls[i].match(/<a href="([^"]+)">([^>]+)<\/a>/);

                                         node = document.createElement("span");

                                         deleteInterfaceNode.appendChild(node);

                                         node.className = "analyst-delete-interface-option";

                                          cNode = document.createElement("input");

                                         node.appendChild(cNode);

                                         cNode.type = "checkbox";

                                         cNode.className = "deleteFilesCheckbox";

                                         cNode.value = EnhancedJsonStringify({

                                                   itemId: OutItemIds[i],

                                                   fname: urlParts[2],

                                                   href: urlParts[1]

                                         });

                                         cNode.addEventListener("change", function () {

                                                   performAnalystFileControl(interfaceControl, this);

                                         }, false);

                                         node.appendChild(document.createTextNode(

                                                   urlParts[2]

                                         ));

                               }

                               if ((node = document.getElementById("analyst-control-current-scfiles")) != null)

                                         node.style.display = "none";

                     }

          }

          queuedFiles.letterPattern = null;

          queuedFiles.enclosurePattern = null;

          queuedFiles.letter = null;

          queuedFiles.enclosures = [ ];

          queuedFiles.attempt = false;

          adjustForm(interfaceControl);

}

 

/** @function performAnalystFileControl

*   contains the routines that do much of the processing of the 4 possible operations

*     see comments in blocks

 * @param {object} interfaceControl - name of replaced file

* @param {(string|boolean)} action - used to slot the operation/processing choice

*/

function performAnalystFileControl(interfaceControl, action) {

          // exchange, add, delete actions in this function

 

          var form = interfaceControl.form;

          // exchange select object

          if (action.id && action.id == "exchangeable-files-list") {

                    

                     if (action.selectedIndex > 0) {

                               var json = JSON.parse(action.options[action.selectedIndex].value);

                              

                               interfaceControl.commonFooter.style.display = "block";

                               interfaceControl.selectionName = json.fname;

                               interfaceControl.selectionId = json.itemId;

                               if (interfaceControl.focus == "exchange") {

                                         interfaceControl.uploadDragDropNode.style.display = "block";

                                         interfaceControl.verifyBlock.style.display = "block";

                                         // update verify file part

                               interfaceControl.exchangeSelectVerify.replaceChild(document.createTextNode(

                                                   json.fname

                                         ), interfaceControl.exchangeSelectVerify.firstChild);

                                         interfaceControl.exchangeSelectVerify.href = json.href;

                               } else if (interfaceControl.focus == "rename") {

                                         document.getElementById("rename-input-block").style.display = "block";

                                         document.getElementById("exchange-input-block").style.display = "none";

                                         document.getElementById("exchange-rename-block").style.display = "block";

                                         interfaceControl.renameNumber = json.fname.match(

                                                   /SC16-\d{2}-\d{5}[ a-z]?[a-z]?-([Xx]{2}|ASO|FI)/

                                         )[0];

                                         interfaceControl.fnametype = json.fname.match(/\.\w+$/)[0];

                                         node = document.getElementById("new-name-value");

                                         node.replaceChild(document.createTextNode(

                                                   interfaceControl.renameNumber + " ________"), node.firstChild);

                                         document.getElementById("analyst-rename-input").value = "";

                               }

                     } else {

                               interfaceControl.selectionId = -1;

                               interfaceControl.uploadDragDropNode.style.display = "none";

                               interfaceControl.commonFooter.style.display = "none";

                               interfaceControl.verifyBlock.style.display = "none";

                               document.getElementById("rename-input-block").style.display = "none";

                     }

          } else if (action.checked) {

                     // delete checkbox clicked

                     var i, j, node, cNode, cNode2, json;

 

                     for (i = 0; i < form.elements.length; i++)

                               if (form.elements[i].className && form.elements[i].className == "deleteFilesCheckbox")

                                         if (form.elements[i].checked == true)

                                                   break;

                     if (i == form.elements.length) { // remove the Process files fieldset

                               interfaceControl.commonFooter.style.display = "none";

                     }

                     else { // show Process files and list of file?

                               interfaceControl.commonFooter.style.display = "block";

                               node = document.getElementById("action-on-files");

                               node.replaceChild(document.createTextNode("deleted"), node.firstChild);

                               node = document.getElementById("analyst-action-file-list");

                               while (node.firstChild)

                                         node.removeChild(node.firstChild);

                               for (i = j = 0; i < form.elements.length; i++)

                                         if (form.elements[i].className &&

                                                                        form.elements[i].className == "deleteFilesCheckbox" &&

                                                                        form.elements[i].checked == true) {

                                                   cNode = document.createElement("li");

                                                   node.appendChild(cNode);

                                                   cNode2 = document.createElement("a");

                                                   cNode.appendChild(cNode2);

                                                   json = JSON.parse(form.elements[i].value);

                                                   cNode2.href = json.href;

                                                   cNode2.setAttribute("target", "_blank");

                                                   cNode2.appendChild(document.createTextNode(json.fname));

                                                   j++;

                                         }

                               if (j > 0)

                                         document.getElementById("analyst-files-interface-files-list").style.display = "block";

                     } /*  EXCHANGE QUEUEING */

          } else if (action == "exchange-queueing") {

                     var partsRE = /((SC16|DF16)-\d{2}-\d{5}[ a-z]{0,2}-\w+)?\s?(.*)\.(\w+)$/,

                               replaced = interfaceControl.selectionName.match(partsRE),

                               replacing = interfaceControl.inputFiles[0].name.match(partsRE);

                    

                     document.getElementById("exchange-rename-block").style.display = "block";

                     document.getElementById("exchange-input-block").style.display = "block";

                     node = document.getElementById("exchange-input");

          node.replaceChild(document.createTextNode(interfaceControl.inputFiles[0].name),

                                                   node.firstChild);

                     // employ replacing[3]=descriptive, replacing[4]=file type/extension

                     if (replacing[3].length > MAX_FILE_DESCRIPTION_LENGTH) {

                               node = document.getElementById("analyst-file-load-errors");

                               node.style.display = "block";

                               while (node.firstChild)

                                         node.removeChild(node.firstChild);

                               cNode = document.createElement("p");

                               cNode.className = "file-load-errors-list-item";

                       cNode.appendChild(document.createTextNode(fileUploadError("add-exchange-q-length")));

                               node.appendChild(cNode);

                               replacing[3] = replacing[3].substr(0, 50);

                     }

                     interfaceControl.exchangeNew =  replaced[1] + " " + replacing[3] + "." + replaced[4];

//  Files of different type (extension) must have a delete & add operation

//   others can just be replaced by an overwrite

                     if (replaced[4].toLowerCase() == replacing[4].toLowerCase())

                               interfaceControl.deleteAndAdd = false;

                     else

                               interfaceControl.deleteAndAdd = true;

                     node = document.getElementById("new-name-value");

          node.replaceChild(document.createTextNode(interfaceControl.exchangeNew),

                                                   node.firstChild);

                    

          } else if (action == "add-queueing") {

                     var trNode, tdNode, sequence, parts, j,

                               itemData = JSON.parse(document.getElementById("analyst-file-interface-input").value),

                               urls = itemData[CatCONST.CORRESPONDENCE_LIST_DOCUMENT_LIBRARY_COLUMN_NAME].

                                         match(/<a href="([^<]+)<\/a>/ig);

 

                     while (urls[0].search(/DF16-/) >= 0)

                               urls.splice(i, 1);

                     sequence = "a".charCodeAt(0) + urls.length +

                                         queuedFiles.enclosures.length - 1; // numerical for Char Code

                     parts = urls[0].match(/SC16-(\d{2})-00000.?-([Xx]{1,2}|ASO|FI)/);

                     interfaceControl.commonFooter.style.display = "block";

                     interfaceControl.scFiles = [ ];

 

                     node = document.getElementById("add-files-tbody");

                     if (interfaceControl.addFilesTable.style.display == "none")

                               while (node.firstChild)

                                         node.removeChild(node.firstChild);

                     else if (node.lastChild)

                               node.lastChild.lastChild.style.borderBottom = "2px solid black";

                     for (i = 0; i < interfaceControl.inputFiles.length; i++) {

                               trNode = document.createElement("tr");

                               node.appendChild(trNode);

                               tdNode = document.createElement("td");

                               trNode.appendChild(tdNode);

                               trNode = document.createElement("tr");

                               node.appendChild(trNode);

                               tdNode.appendChild(document.createTextNode(

                                         interfaceControl.inputFiles[i].name + " \u27a8"

                               ));

                               tdNode = document.createElement("td");

                               trNode.appendChild(tdNode);

                               if (i < interfaceControl.inputFiles.length - 1)

                                         tdNode.style.borderBottom = "2px solid black";

                               tdNode.style.textAlign = "right";

                               queuedFiles.enclosures.push(interfaceControl.inputFiles[i]);

                               j = interfaceControl.inputFiles[i].name.match(

                                         /(SC16-\d{2}-00000|DF16-\d{2}-\d{5}).?-([Xx]{1,2}|ASO|FI|FA)?\s?(.*)/)[3];

                               if (j.length > MAX_FILE_DESCRIPTION_LENGTH) {

                                         node = document.getElementById("analyst-file-load-errors");

                                         node.style.display = "block";

                                         while (node.firstChild)

                                                    node.removeChild(node.firstChild);

                                         cNode = document.createElement("p");

                                         cNode.className = "file-load-errors-list-item";

                                 cNode.appendChild(document.createTextNode(fileUploadError("add-exchange-q-length")));

                                         node.appendChild(cNode);

                                         j = j.substr(0, 50);

                               }

                               j = interfaceControl.scFiles.push(

                                                   "SC16-" + parts[1] + "-00000" + String.fromCharCode(sequence++)

                                                   + "-" + parts[2] + " " + j);

                               tdNode.appendChild(document.createTextNode(

                                         "\u27a8 " + interfaceControl.scFiles[j - 1]

                               ));

                     }

                     interfaceControl.addFilesTable.style.display = "table";

                     adjustForm(interfaceControl);

 

/* PROCESSING */

          } else if (action == "process") {

                     var node, value, deleteOps = [ ], notDeleted = [ ], deleteItem,

                               itemData = interfaceControl.itemData,

                               doclibIds = itemData[CatCONST.CORRESPONDENCE_LIST_DOCLIB_OUTGOING_IDS_COLUMN_NAME],

                               urls = itemData[CatCONST.CORRESPONDENCE_LIST_DOCUMENT_LIBRARY_COLUMN_NAME].

                                                              match(/<a href="([^<]+)<\/a>/ig),

                               json = JSON.parse(itemData[CatCONST.CORRESPONDENCE_LIST_ITEM_DATA_COLUMN_NAME]),

                               processAction = document.getElementById("analyst-file-interface-input").value,

                                         iCorrespondenceList = new IListRESTRequest({

                                                   server: SERVER_NAME,

                                                   site: SITE_NAME,

                                                   listName: CORRESPONDENCE_LIST_NAME,

                                                   listItemEntityType: CORRESPONDENCE_LIST_ITEM_ENTITY_TYPE_FULL_NAME

                                         }),

                                         iCorrespondenceLibrary = new IListRESTRequest({

                                                   server: SERVER_NAME,

                                                   site: SITE_NAME,

                                                   listName: CORRESPONDENCE_LIBRARY_NAME,

                                                   relativeUrl: CORRESPONDENCE_LIBRARY_RELATIVE_URL,

                                                   listItemEntityType:         CORRESPONDENCE_LIBRARY_ITEM_ENTITY_TYPE_FULL_NAME

                                         });

 

                     switch(interfaceControl.focus) {

// EXCHANGE PROCESSING

                     case "exchange":

                               if (queuedFiles.attempt == false)

                                         return alert("No attempt has been made to upload a file");

                               // check out doc lib item

                               document.getElementById("analyst-file-control-wait").style.display = "block";

                               node = document.getElementById("wait-message");

                               node.replaceChild(document.createTextNode("This could take 10-15 seconds"),

                                                   node.firstChild);

                               if (interfaceControl.deleteAndAdd == false)

                                         iCorrespondenceLibrary.checkOutDocLibItem({

                                                   itemName: interfaceControl.selectionName

                                         }).then(function (response) {

                                                   iCorrespondenceLibrary.renameFile({

                                                              itemId: interfaceControl.selectionId,

                                                              newName: interfaceControl.exchangeNew

                                                   }).then(function (response) {

                                                             iCorrespondenceLibrary.getDocLibItemMetadata({

                                                                        itemId: interfaceControl.selectionId

                                                              }).then(function (response) {

                                                                        var LibItemMetadata = response.responseJSON.d,

                                                                                  fReader = new FileReader();

                                                                                 

                                                                        fReader.fileName = interfaceControl.exchangeNew;

                                                                        fReader.onload = function (event) {

                                                                                  iCorrespondenceLibrary.uploadItemToDocLib({

                                                                                            itemName: interfaceControl.exchangeNew,

                                                                                            willOverwrite: true,

                                                                                             body: event.target.result

                                                                                  }).then(function (response) {

                                                                                            iCorrespondenceLibrary.updateListItem({

                                                                                                       itemId: interfaceControl.selectionId,

                                                                                                       body: formatRESTBody([

                                                                                                       [ CatCONST.CORRESPONDENCE_LIBRARY_ASSOCIATED_LIST_ID_COLUMN_NAME,

                                                                                                                  LibItemMetadata[CatCONST.CORRESPONDENCE_LIBRARY_ASSOCIATED_LIST_ID_COLUMN_NAME] ],

                                                                                                       [ CatCONST.CORRESPONDENCE_LIBRARY_FILETYPE_COLUMN_NAME,

                                                                                                                  LibItemMetadata[CatCONST.CORRESPONDENCE_LIBRARY_FILETYPE_COLUMN_NAME] ],

                                                                                                       [ CatCONST.CORRESPONDENCE_LIBRARY_DIRECTION_COLUMN_NAME,

                                                                                                                  LibItemMetadata[CatCONST.CORRESPONDENCE_LIBRARY_DIRECTION_COLUMN_NAME] ],

                                                                                                       ])

                                                                                            }).then(function (response) {

                                                                                                       iCorrespondenceLibrary.checkInDocLibItem({

                                                                                                                  itemName: interfaceControl.exchangeNew

                                                                                                       }).then(function (response) {

                                                                                                                  exchangeRenameFinish(interfaceControl, iCorrespondenceLibrary, iCorrespondenceList, json);

                                                                                                       }).catch(function (response) {

                                                                                                                  emailDeveloper({

                                                                                                                            subject: "Check in failure",

                                                                                                                           body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +

                                                                                                                                                EnhancedJsonStringify(response, null, "  ") + "</p>"

                                                                                                                  });

                                                                                                                  performAnalystFileControl(interfaceControl, "error");

                                                                                                       });

                                                                                            }).catch(function (response) {

                                                                                             });

                                                                                  }).catch(function (response) {

                                                                                            emailDeveloper({

                                                                                                       subject: "Item upload overwrite failure",

                                                                                                       body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +

                                                                                                                  EnhancedJsonStringify(response, null, "  ") + "</p>"

                                                                                             });

                                                                                            performAnalystFileControl(interfaceControl, "error");

                                                                                  });

                                                                        };

                                                                        fReader.readAsArrayBuffer(interfaceControl.inputFiles[0]);

                                                              }).catch(function (response) {

                                                                        emailDeveloper({

                                                                                  subject: "File rename failure",

                                                                                  body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +

                                                                                                       EnhancedJsonStringify(response, null, "  ") + "</p>"

                                                                        });

                                                              });

                                                   }).catch(function (response) {

                                                              emailDeveloper({

                                                                        subject: "File rename failure",

                                                                        body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +

                                                                                            EnhancedJsonStringify(response, null, "  ") + "</p>"

                                                              });

                                                             performAnalystFileControl(interfaceControl, "error");

                                                   });

                                         }).catch(function (response) {

                                                   emailDeveloper({

                                                              subject: "File CheckOut Failure",

                                                              body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +

                                                                        EnhancedJsonStringify(response, null, "  ") + "</p>"

                                                   });

                                                   performAnalystFileControl(interfaceControl, "error");

                                         });

                               else // delete and add ( == true)

                                         iCorrespondenceLibrary.deleteDocLibItem({

                                                   path: interfaceControl.selectionName

                                         }).then(function (response) {

                                                   var fReader = new FileReader();

                                                   fReader.fileName = interfaceControl.exchangeNew;

                                                   fReader.onload = function (event) {

                                                             iCorrespondenceLibrary.uploadItemToDocLib({

                                                                        itemName: interfaceControl.exchangeNew,

                                                                        willOverwrite: true,

                                                                        body: event.target.result

                                                              }).then(function (response) {

                                                                        iCorrespondenceLibrary.checkInDocLibItem({

                                                                                  itemName: interfaceControl.exchangeNew

                                                                        }).then(function (response) {

                                                                                  exchangeRenameFinish(interfaceControl, iCorrespondenceLibrary, iCorrespondenceList, json);

                                                                                  updateItemData(interfaceControl.itemId);

                                                                        }).catch(function (response) {

                                                                                  emailDeveloper({

                                                                                            subject: "Check in failure",

                                                                                             body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +

                                                                                                                  EnhancedJsonStringify(response, null, "  ") + "</p>"

                                                                                  });

                                                                                  performAnalystFileControl(interfaceControl, "error");

                                                                        });

                                                              }).catch(function (response) {

                                                                        emailDeveloper({

                                                                                  subject: "Item upload overwrite failure",

                                                                                  body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +

                                                                                            EnhancedJsonStringify(response, null, "  ") + "</p>"

                                                                        });

                                                                        performAnalystFileControl(interfaceControl, "error");

                                                              });

                                                   };

                                                   fReader.readAsArrayBuffer(interfaceControl.inputFiles[0]);

                                         }).catch(function (response) {

                                                   emailDeveloper({

                                                              subject: "Delete Doc Lib Item Failure",

                                                              body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +

                                                                                  EnhancedJsonStringify(response, null, "  ") + "</p>"

                                                   });

                                                   performAnalystFileControl(interfaceControl, "error");

                                         });

                               break;

// RENAME PROCESSING

                     case "rename":

                               if ((value = document.getElementById("analyst-rename-input").value) == "")

                                         return alert("No text was entered for the rename");

                               if (value.search(/[\~\#\%\&\*\{\}\\:<>\?\/\|"]/) >= 0)

                                         return alert("Please change the text.\n\nThe following characters "

                                                   + "should not be used in filenames:\n\n"

                                                   + "~ # % &  * { } \\ : < > ? / | \"");

                               if (filesNameCheck({

                                         form: form,

                                         files: [{name: interfaceControl.renameNumber + " " + value}],

                                         which: "analyst-redo",

                                         interfaceControl: interfaceControl

                               }) == false)

                                         return alert("There was a problem with the file name\n\nPlease rename");

                               value = interfaceControl.renameNumber + " " + value + interfaceControl.fnametype;

                               queuedFiles.letter = {name: value};

                               queuedFilesCheck("files").then(function (response) {

                                         iCorrespondenceLibrary.renameItemWithCheckout({

                                                   itemId: interfaceControl.selectionId,

                                                   currentFileName: interfaceControl.selectionName,

                                                   newFileName: value

                                         }).then(function (response) {

                                                   exchangeRenameFinish(interfaceControl, iCorrespondenceLibrary, iCorrespondenceList, json);

                                                   displayAnalystFileControlForm(interfaceControl, 'reset');

                                         }).catch(function (response) {

                                                   emailDeveloper({

                                                              subject: "Analyst Control Files: renameItemWithCheckout() failure",

                                                              head: "body {white-space:pre;}",

                                                              body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +

                                                                        EnhancedJsonStringify(response, null, "  ") + "</p>"

                                                   });

                                                   performAnalystFileControl(interfaceControl, "error");

                                         });

                               }).catch(function (response) {

                                         displayFilesFoundError(response, "files");

                               });

                               break;

// ADD PROCESSING

                     case "add":

                               if (queuedFiles.attempt == false)

                                         return alert("No attempt has been made to upload a file");

                               document.getElementById("analyst-file-control-wait").style.display = "block";

                               node = document.getElementById("wait-message");

                               node.replaceChild(document.createTextNode("Could take about 5-10 seconds for each file"),

                                                   node.firstChild);

                               doUpload("analyst-control", interfaceControl.scFiles).then(function (response) {

                                         // Master Log item metadata updating

                                         var process = [ ], newItemIds = response.doclibItemIds;

                                        

                                         doclibIds += "," + newItemIds.join(",");

                                         for (i = 0; i < newItemIds.length; i++) {

                                                   urls.push("<br /><a href=\"https://" + SERVER_NAME + SITE_NAME + response.spUrls[i] + "\">"

                                                              + basename(response.spUrls[i]) + "<\/a>");

                                                   json.OutgoingSet.push({

                                                              id:newItemIds[i],

                                                              url: response.spUrls[i],

                                                              description: "Enclosure " + response.fTypes[i].match(/attach(\d+)/)[1]

                                                   });

                                                   iCorrespondenceLibrary.updateLibItemWithCheckout({

                                                              itemId: newItemIds[i],

                                                              fileName: basename(response.spUrls[i]),

                                                              body: formatRESTBody([

                                                                        [ CatCONST.CORRESPONDENCE_LIBRARY_ASSOCIATED_LIST_ID_COLUMN_NAME,

                                                                                            interfaceControl.itemData.Id ],

                                                                        [ CatCONST.CORRESPONDENCE_LIBRARY_FILETYPE_COLUMN_NAME, response.fTypes[i] ],

                                                                        [ CatCONST.CORRESPONDENCE_LIBRARY_DIRECTION_COLUMN_NAME, "Outgoing" ]

                                                              ])

                                                   }).then(function (response) {

                                                              // because there is a split updating lib item and updating

                                                              //    list item, both processes will be monitored as complete

                                                              process[0] = true;

                                                              if (process[1] && process[1] == true) {

                                                                        document.getElementById("analyst-file-control-process-done").style.display = "block";

                                                                        document.getElementById("analyst-file-control-wait").style.display = "none";

                                                              }

                                                   }).catch(function (response) {

                                                              emailDeveloper({

                                                                        subject: "Analyst Control Files: Add Files update lib item failure",

                                                                        body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +

                                                                                  EnhancedJsonStringify(response, null, "  ") + "</p>"

                                                              });

                                                             performAnalystFileControl(interfaceControl, "error");

                                                   });

                                         }

                                         // update Outgoing_DoclibsIDs, Document Library, Last Action Date,

                                         //  Item Data, Prior Item Data

                                         json.doclibOutgoingIds = doclibIds;

                                         iCorrespondenceList.updateListItem({

                                                   itemId: interfaceControl.itemData.Id,

                                                   body: formatRESTBody([

                                                              [ CatCONST.CORRESPONDENCE_LIST_DOCLIB_OUTGOING_IDS_COLUMN_NAME, doclibIds ],

                                                              [ CatCONST.CORRESPONDENCE_LIST_DOCUMENT_LIBRARY_COLUMN_NAME, urls.join("\n") ],

                                                              [ CatCONST.CORRESPONDENCE_LIST_LAST_ACTION_DATE_COLUMN_NAME,

                                                                                                                            sharePointDateFormat(new Date()) ],

                                                              [ CatCONST.CORRESPONDENCE_LIST_ITEM_DATA_COLUMN_NAME, EnhancedJsonStringify(json) ],

                                                              [ CatCONST.CORRESPONDENCE_LIST_PRIOR_ITEM_DATA_COLUMN_NAME,

                                                                        interfaceControl.itemData[CatCONST.CORRESPONDENCE_LIST_ITEM_DATA_COLUMN_NAME] ]

                                                   ])

                                         }).then(function (response) {

                                                   process[1] = true;

                                                   if (process[0] && process[0] == true) {

                                                             document.getElementById("analyst-file-control-process-done").style.display = "block";

                                                             document.getElementById("analyst-file-control-wait").style.display = "none";

                                                   }

                                                   updateItemData(interfaceControl.itemId);

                                         }).catch(function (response) {

                                                   emailDeveloper({

                                                              subject: "Analyst Control Files: Add Files update list item failure",

                                                              body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +

                                                                        EnhancedJsonStringify(response, null, "  ") + "</p>"

                                                   });

                                                   performAnalystFileControl(interfaceControl, "error");

                                         });

                               }).catch(function (response) {

                                         emailDeveloper({

                                                   subject: "Analyst Control Files: Add Files doUpload() failure",

                                                   body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +

                                                             EnhancedJsonStringify(response, null, "  ") + "</p>"

                                         });

                                         performAnalystFileControl(interfaceControl, "error");

                               });

                               break;

// DELETE PROCESSING

                     case "delete":

                               // try delete without check out

                               for (i = 0; i < form.elements.length; i++)

                                         if (form.elements[i].className == "deleteFilesCheckbox")

                                                   if (form.elements[i].checked == true) {

                                                              deleteItem = JSON.parse(form.elements[i].value);

                                                              deleteOps.push(new RSVP.Promise(function (resolve, reject) {

                                                                        iCorrespondenceLibrary.deleteDocLibItem({

                                                                                  path: deleteItem.href,

                                                                                  passthru: deleteItem

                                                                        }).then(function (response) {

                                                                                  resolve(response);

                                                                        }).catch(function (response) {

                                                                                  reject(response);

                                                                        });

                                                              }));

                                                   } else

                                                             notDeleted.push(form.elements[i].value);

                               RSVP.all(deleteOps).then(function (response) {

// loop through the urls, ids of deleted items and remove

                                         var doclibIds = "", parts, newValue;

                                        

                                         for (i = urls.length - 1; i >= 0; i--)

                                                   if (urls[i].search(/SC16-\d{2}-00000[ \-](A|F|X|x)/) >= 0)

                                                              break;

                                         urls.splice(i + 1);

                                         json.OutgoingSet.splice(1);

                                         doclibIds += json.OutgoingSet[0].id;

                                         for (i = 0; i < notDeleted.length; i++) {

                                                   value = JSON.parse(notDeleted[i]);

                                                   // value properties:  .itemId, .fname, .href

                                                   newValue = {id: parseInt(value.itemId)};

                                                   if (value.fname.match(/SC16-\d{2}-00000([a-z]{0,2})/)[1].charCodeAt(0)

                                                                                  != "a".charCodeAt(0) + i) {

                                                              parts = value.href.match(/^(.*)(\/SC16-\d{2}-00000)[a-z]{0,2}(.*)/);

                                                              newValue.url = parts[1] + parts[2] +

                                                                                  String.fromCharCode("a".charCodeAt(0) + i) + parts[3];

                                                   } else

                                                              newValue.url = value.href;

                                                   newValue.description = "Enclosure " + (i + 1);

                                                   // json.OutgoingSet[x] properties: .id, .url, .description

                                                   json.OutgoingSet.push(newValue);

                                                   urls.push("<a href=\"" + newValue.url + "\">"

                                                                        + basename(newValue.url) + "<\/a>");

                                                   doclibIds += "," + newValue.id;

                                         }

                                         json.doclibOutgoingIds = doclibIds;

                                         iCorrespondenceList.updateListItem({

                                                   itemId: interfaceControl.itemId,

                                                   body: formatRESTBody([

                                                              [ CatCONST.CORRESPONDENCE_LIST_DOCLIB_OUTGOING_IDS_COLUMN_NAME, doclibIds ],

                                                              [ CatCONST.CORRESPONDENCE_LIST_DOCUMENT_LIBRARY_COLUMN_NAME, urls.join("\n") ],

                                                              [ CatCONST.CORRESPONDENCE_LIST_LAST_ACTION_DATE_COLUMN_NAME,

                                                                                                                            sharePointDateFormat(new Date()) ],

                                                              [ CatCONST.CORRESPONDENCE_LIST_ITEM_DATA_COLUMN_NAME, EnhancedJsonStringify(json) ],

                                                              [ CatCONST.CORRESPONDENCE_LIST_PRIOR_ITEM_DATA_COLUMN_NAME,

                                                                        interfaceControl.itemData[CatCONST.CORRESPONDENCE_LIST_ITEM_DATA_COLUMN_NAME] ]

                                                   ])

                                         }).then(function (response) {

                                                   updateItemData(interfaceControl.itemId);

                                                    document.getElementById("analyst-file-control-process-done").style.display = "block";

                                         }).catch(function (response) {

                                                   emailDeveloper({

                                                              subject: "Analyst Control Files: Delete Files updateListItem() failure",

                                                              body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +

                                                                        EnhancedJsonStringify(response, null, "  ") + "</p>"

                                                   });

                                                   performAnalystFileControl(interfaceControl, "error");

                                         });

                               }).catch(function (response) {

                                         emailDeveloper({

                                                   subject: "Analyst Control Files: Delete Files deleteOps array deleteDocLibItem() failure",

                                                   body: "<p style=\"font:normal 10pt monospace;\">response object:<br />"

                                                              + EnhancedJsonStringify(response, null, "  ") + "</p>"

                                         });

                                         performAnalystFileControl(interfaceControl, "error");

                               });

                               // report on deletion success or failure

                               break;

                     }

          } else if (action == "cancel") {

                     interfaceControl.form.style.display = "none";

                     document.getElementById("control")["analyst-file-interface-cbox"].checked = false;

                     document.getElementById("analyst-file-control-process-problem").style.display = "none";

          } else if (action == "reset") {

                     document.getElementById("analyst-file-load-errors").style.display = "none";

                     document.getElementById("analyst-file-selected-block").style.display = "none";

                     if (interfaceControl.focus == "exchange") {

                               interfaceControl.uploadDragDropNode.style.display = "none";

                               interfaceControl.commonFooter.style.display = "none";

                     } else if (interfaceControl.focus == "add") {

                     } else if (interfaceControl.focus == "delete") {

                               interfaceControl.uploadDragDropNode.style.display = "none";

                               interfaceControl.commonFooter.style.display = "none";

                     }

          } else if (action == "error") {

                     document.getElementById("analyst-file-control-wait").style.display = "none";

                     document.getElementById("analyst-file-control-process-problem").style.display = "block";

          }

}

 

/** @function exchangeRenameFinish

*   finishes file operations related to exchanging or renaming by

*   updating the Master Log list metadata

* @param {object} interfaceControl - interface setup data

* @param {object} iList - List Request class

*/

function exchangeRenameFinish(interfaceControl, iLib, iList, newItemData) {

          var i, itemRequests = [ ], newDoclibAnchors = "", doclibAnchors,

                     outgoingIDs = interfaceControl.itemData[

                     CatCONST.CORRESPONDENCE_LIST_DOCLIB_OUTGOING_IDS_COLUMN_NAME].split(","),

                     anchorRE = new RegExp(interfaceControl.selectionName.replace("(",

                  "\\(").replace(")", "\\)").replace(".", "\\."), "g");

          // prepare metadata column Document Links

         

          for (i = 0; i < outgoingIDs.length; i++)

                     itemRequests.push(new RSVP.Promise(function (resolve, reject) {

                               iList.getDocLibItemFileAndMetaData({

                                         itemId: outgoingIDs[i]

                               }).then(function (response) {

                                         resolve(response);

                               }).catch(function (response) {

                                         reject(response);

                               });

                     }));

          RSVP.all(itemRequests).then(function (response) {

                     doclibAnchors = decodeURIComponent(interfaceControl.itemData[

                               CatCONST.CORRESPONDENCE_LIST_DOCUMENT_LIBRARY_COLUMN_NAME]).match(

                                         /<a href="([^<]+)<\/a>/ig);

                     for (i = 0; i < doclibAnchors.length; i++)

                               if (doclibAnchors[i].search(/>DF16-/) >= 0)

                                         newDoclibAnchors += doclibAnchors[i] + "<br />";

                     for (i = 0; i < response.length; i++)

                               newDoclibAnchors += "<a href=\""

                                                   + response.ServerRelativeUrl + "\">"

                                                   + basename(response.ServerRelativeUrl) + "</a><br />";

                     iList.updateListItem({

                               itemId: interfaceControl.itemData.Id,

                               body: formatRESTBody([

                                 [ CatCONST.CORRESPONDENCE_LIST_DOCUMENT_LIBRARY_COLUMN_NAME,

                                                              newDoclibAnchors ],

                                         [ CatCONST.CORRESPONDENCE_LIST_LAST_ACTION_DATE_COLUMN_NAME,

                                                              sharePointDateFormat(new Date()) ],

                                         [ CatCONST.CORRESPONDENCE_LIST_ITEM_DATA_COLUMN_NAME,

                                                             EnhancedJsonStringify(newItemData) ],

                                         [ CatCONST.CORRESPONDENCE_LIST_PRIOR_ITEM_DATA_COLUMN_NAME,

                                                   interfaceControl.itemData[CatCONST.CORRESPONDENCE_LIST_ITEM_DATA_COLUMN_NAME] ]

                               ])

                     }).then(function (response) {

                               // show completion message

                               updateItemData(interfaceControl.itemId);

                               document.getElementById("analyst-file-control-process-done").style.display = "block";

                               document.getElementById("analyst-file-control-wait").style.display = "none";

                     }).catch(function (response) {

                               emailDeveloper({

                                         subject: "exchangeRenameFinish()::update metadata failure",

                                         body: "<p style=\"font:normal 10pt monospace;\">response object:<br />" +

                                                   EnhancedJsonStringify(response, null, "  ") + "</p>"

                               });

                               performAnalystFileControl(interfaceControl, "error");

                     });

          }).catch(function (response) {

          });

}

 

/** @function adjustForm

*   involved with vertical and horizontal centering of the interface form

* @param {object} interfaceControl - holds a lot of information about the interface setup

*/

function adjustForm(interfaceControl) {

          var form = interfaceControl.form,

                     formDimensions = window.getComputedStyle(form);

         

          if (form.style.overflowY == "scroll" )

                     return;

          while (parseFloat(formDimensions.height) / window.innerHeight > 0.80 &&

                               parseFloat(formDimensions.width) / window.innerWidth < 0.75) {

                     form.style.width = (parseFloat(formDimensions.width) * 1.15) + "px";

                     formDimensions = window.getComputedStyle(form);

                     form.style.marginLeft = -(parseFloat(formDimensions.width) / 2) + "px";

          }

          if (parseFloat(formDimensions.width) / window.innerWidth >= 0.75) {

                     form.style.overflowY = "scroll";

                     form.style.height = parseInt(window.innerHeight * 0.75) + "px";

          }

          form.style.marginTop = -(parseFloat(formDimensions.height) / 2) + "px";

}
