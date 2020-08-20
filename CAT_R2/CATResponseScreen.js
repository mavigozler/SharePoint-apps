"use strict";
//   CATResponseScreen.js
/*
How it works
1. Assemble the Action Taken headers and text as an object
using the guide below. Generally it will be a list structure, with
headers and plain text.
2. The root node is defined as a global variable in this JS file
actionScreenStruct = {}
3. As an example of a more complex Action Taken list, it starts
an object showing an unordered list with 'id' attribute
'action-taken-list' (id's and class'es used for CSS). An items
array is defined.  Items are then added as headers, text or
as sublists, using properties to specify content or other attributes
(for CSS). Loops can also be used to iterate pushed items.
Anything with * is required
actionScreenStruct = {
*listType: "ul",
*listId: "action-taken-list",
*items: [ ]
};
actionScreenStruct.items.push({
className: "action-taken-list-title",
*title: "Results of Link To Document Item Creation in the Master Log documents library:",
titleId: "files-created-header",
*listType: "ol",
listId: "files-created-list",
*items: [ ]
});
for (var i = 0; i < response.length; i++)
actionScreenStruct.items[0].items.push({
textClass: "files-created-list-item",
textId:
*text: "<span class=\"good-upload-span\">Link To Document Created: " +
"<a class=\"file-name-anchors\" target=\"_blank\" " +
"href=\"" + response[i].data.url + "\">" +
basename(response[i].data.url) + "</a></span>"
});
actionScreenStruct.items.push({
*element: any valid HTML elements
attribs: ["key=value",...]
data:  container text
})
4. After building the object, it must then be passed to
createActionTakenList() which dynamically assembles the DOM
elements
5. This is appended as a child to the actionTakenDiv node as
JS global variable, which points to the DIV element in the
single-page web app (CAT.html), which then is displayed at at the
end of processing
ASSEMBLING THE JSON OBJECT of Action Taken:
listData should be an JSON object with the following allowed properties
{
listType: "ul"|"ol" allowed
listId: standard html 'id' attribute
listClass: standard html 'class' attribute
items: [ ] ...must be array, see items definition
}
each items instance in array must be object in JSON format with following
allowed properties
{
listId: standard html id for any list item
listClass: standard html class for any list item
listType: "ul" | "ol" for multi-level list (must include items definition)
items: [ ]   required if listtype is defined and not allowed if not defined
title: places first line text (like a header) of the list item, default styling
titleId: standard html id attribute for the 'title' part
titleClass: standard html class attribute for the 'title' part
text: places text following first line if 'title' is defined
**** text can include HTML markup in it, as it is rendered as an 'innerHTML' assignment ****
textId: standard html id attribute for the 'text' element
textClass: standard html class attribute for the 'text' element
}
List item at high level
* title: serves as a "header" to list item
text: will be subsequent line text if 'title' is specified
list: a list item can be a list in a multi-level way
*/
var actionTakenDiv;
var actionScreenStruct = {};

function finishSuccess(parameters) {
	actionTakenDiv.appendChild(createActionTakenList(actionScreenStruct));
	document.getElementsByTagName("title")[0].firstChild.data =
		parameters.pageTitle + ": Formal Correspondence Control";
	document.getElementById("page-subtitle").appendChild(document.createTextNode(
		parameters.pageTitle + ": Response"));
	document.getElementById("reaction-section").style.display = "block";
	browserStorage.removeItem("actionScreen");
	parameters.actionListDone = true;
}

function finishError(parameters) {
	var node;
	node = document.getElementById("error-itemID");
	node.appendChild(document.createTextNode(
		parameters.itemId
	));
	node = document.getElementById("system-message");
	node.appendChild(document.createTextNode(
		parameters.systemMessage
	));
	node = document.getElementById("main-message");
	node.appendChild(document.createTextNode(
		parameters.mainMessage
	));
	document.getElementById("error-container").style.display = "block";
	document.getElementById("general-use-error").style.display = "block";
	document.getElementById("larger-container").style.display = "none";
}
// nnnnnn()
// @param 
// @return
// @pre
// @post
function createActionTakenList(listData) {
	var rootNode, i;
	if (!listData.listType) {
		node = document.createElement("p");
		node.setAttribute("style", "color:red;font-weight:bold;");
		node.appendChild(document.createTextNode("list structure error: " +
			"the base root node did not define a valid 'listType'"));
		return node;
	}
	rootNode = document.createElement(listData.listType);
	if (listData.listId)
		rootNode.setAttribute("id", listData.listId);
	if (listData.listClass)
		rootNode.setAttribute("class", listData.listClass);
	// root node set up above. Now to iterate items
	for (i = 0; i < listData.items.length; i++)
		rootNode.appendChild(buildItemNode(listData.items[i]));
	return rootNode;
}

function buildItemNode(itemObject) {
	var leafNode,
		array, i, nameval, text, sublistNode;
	// can be three object types, * = required
	// 1. sublist: {className:,*title,titleId,*listType,listId,*items[]}
	// 2. text item: {*text,textClass,textId}
	// 3. general element with attribs, container text
	if (itemObject.element) {
		leafNode = document.createElement(itemObject.element);
		if ((array = itemObject.attribs) ||
			(array = itemObject.attributes))
			for (i = 0; i < array.length; i++) {
				nameval = array[i].split("=");
				leafNode.setAttribute(nameval[0], nameval[1]);
			}
		if ((text = itemObject.data) ||
			(text = itemObject.text))
			leafNode.appendChild(document.createTextNode(text));
	}
	else if (itemObject.text) {
		leafNode = document.createElement("li");
		if (itemObject.textId)
			leafNode.id = itemObject.textId;
		if (itemObject.textClass)
			leafNode.className = itemObject.textClass;
		leafNode.appendChild(parseHTML(itemObject.text));
	}
	else if (itemObject.listType) {
		if (!itemObject.items || !itemObject.title)
			return null;
		leafNode = document.createElement("li");
		sublistNode = document.createElement(itemObject.listType);
		if (itemObject.listId)
			sublistNode.id = itemObject.listId;
		if (itemObject.titleId)
			leafNode.id = itemObject.titleId;
		if (itemObject.className)
			leafNode.className = itemObject.className;
		leafNode.appendChild(document.createTextNode(itemObject.title));
		leafNode.appendChild(sublistNode);
		for (i = 0; i < itemObject.items.length; i++)
			sublistNode.appendChild(buildItemNode(itemObject.items[i]));
	}
	return leafNode;
}

function parseHTML(markup) {
	var node, attribs, childNode, nameval,
		mainNode = new DocumentFragment(),
		currentElements = [],
		i, j, markupSub, markupFinal = [],
		markupParsed = markup.split("<");
	/* RULES
	1. markupFinal[0] = "" means "<"
	2. markupFinal[i] = "" means "><"
	3. markupFinal[odd number] is element
	*/
	for (i = 0; i < markupParsed.length; i++) {
		markupSub = markupParsed[i].split(">");
		markupFinal = markupFinal.concat(markupSub);
	}
	i = 0;
	if (markup.charAt(0) != "<") {
		i = 1;
		mainNode.appendChild(
			document.createTextNode(markupFinal[0])
		);
	}
	for (node = mainNode; i < markupFinal.length; i++)
		if (i % 2 == 1) {
			if (markupFinal[i].charAt(0) == "/")
				node = node.parentNode;
			else {
				//                                       currentElem.push(markupFinal[i]);
				childNode = document.createElement(
					markupFinal[i].match(/\s*(\w+)/)[1]);
				if ((attribs = markupFinal[i].match(/\s(\w+)="([^"]+)/g)) != null)
					for (j = 0; j < attribs.length; j++) {
						nameval = attribs[j].split("=\"");
						childNode.setAttribute(
							nameval[0].match(/(\w+)/)[1], nameval[1]);
					}
				node.appendChild(childNode);
				if (markupFinal[i].charAt(markupFinal[i].length - 1) != "/")
					node = childNode;
			}
		}
	else if (markupFinal[i] != "")
		node.appendChild(document.createTextNode(markupFinal[i]));
	return mainNode;
}