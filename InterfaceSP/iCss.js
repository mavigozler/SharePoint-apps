"use strict";
var iCSS = {
	CSS_SUM: 1,
	CSS_MULTIPLY: 2,
	/**
	* createStyleSheet() creates a style sheet within the DOM
	* @param urlOrRules {String|undefined|null}
	- url path to a file of type 'css' that specifies an external stylesheet
	- a long string of one or more valid rules in "selector {propertyName:propertyValue;...} format
	as one might find in the contained text of a style element
	the string MUST be stripped of all newlines '\n' characters
	- if undefined or null, will create an internal stylesheet
	* @returns object reference of type styleSheet in Windows or of type style or link element
	*  if using IE 5 and later for Macintosh
	*/
	createStyleSheet: function (doc, urlOrRules) {
		var i, returnedValue, styleSheet, rules, rule,
			rulesRE = /([\w\-]?[#\.]?[\w\-]+(\s+[\w\-\*>]+)*)\s*\{([^\}]+)\}/g,
			ruleRE = /(.*)\s*\{([^\}]+)\}/,
			allRules = [];

		function getFirstInternalStylesheet(doc, createIfNull) {
			var i, href, node;
			for (i = 0; i < doc.styleSheets.length; i++) {
				href = doc.styleSheets[i].href;
				if (href == null || href == false || href == "")
					break;
			}
			if (i == doc.styleSheets.length) {
				if (createIfNull != true)
					return null;
				node = doc.createElement("style");
				node.type = "text/css";
				doc.head.appendChild(node);
				return getFirstInternalStylesheet(doc, false);
			}
			return doc.styleSheets[i];
		}
		if (typeof urlOrRules == "string")
			rules = urlOrRules.match(rulesRE);
		/*
		if (document.createStyleSheet) {
		if (typeof urlOrRules == "undefined" || urlOrRules == null)
		return document.createStyleSheet();
		else if (typeof rules == "undefined" || rules == null)
		return document.createStyleSheet(urlOrRules);
		styleSheet = document.createStyleSheet();
		} else if (typeof urlOrRules == "undefined" || urlOrRules == null) {
		*/
		if (typeof urlOrRules == "undefined" || urlOrRules == null) {
			// an empty internal style sheet is wanted and returned
			styleSheet = doc.createElement("style");
			styleSheet.type = "text/css";
			styleSheet.setAttribute("media", "screen");
			styleSheet.appendChild(doc.createTextNode("")); //WebKit hack
			doc.head.appendChild(styleSheet);
			return getFirstInternalStylesheet(doc);
		}
		else if (typeof rules == "undefined" || rules == null) {
			// an external style sheet is called, the string must be a URL
			styleSheet = doc.createElement("link");
			styleSheet.type = "text/css";
			styleSheet.href = urlOrRules;
			doc.head.appendChild(styleSheet);
			return getFirstInternalStylesheet(doc);
		}
		// get the document's internal stylesheet
		if ((styleSheet = getFirstInternalStylesheet(doc, true)) == null)
			throw "iCss.createStyleSheet(): unable to return internal stylesheet";
		for (i = 0; i < rules.length; i++)
			if ((rule = rules[i].match(ruleRE)) != null)
				allRules.push(rule[1], rule[2]);
		if (styleSheet.insertRule) {
			for (i = 0; i < allRules.length; i += 2)
				if ((returnedValue = styleSheet.insertRule(
						allRules[i] + " { " + allRules[i + 1] + " } ",
						styleSheet.cssRules.length)) < 0)
					throw "styleSheet.insertRule() exception #" + returnedValue;
				else
					console.log("insertRule: " + allRules[i] + " { " + allRules[i + 1] + " } ");
		}
		else if (styleSheet.addRule) {
			for (i = 1; i < allRules.length; i += 2)
				styleSheet.addRule(allRules[i], allRules[i + 1]);
			//               console.log("addRule: " + allRules[i] +","+ allRules[i + 1] + " } ");
		}
		return styleSheet;
	},
	/**
	 * findStyleSheet(hrefPart) returns a CSSStyleSheet object whose name is contained
	 *   and any part of the parameter
	 * @param {String} hrefPart: a substring of any stylesheet href part
	 * @returns CSSStyleSheet object from documents.styleSheets collection
	 */
	findStyleSheet: function (hrefPart) {
		var i, hrefPartRegex = new RegExp(hrefPart);
		if (!document || !document.styleSheets)
			throw "'document' object or its property 'styleSheets' collection not found";
		for (i = 0; i < document.styleSheets.length; i++)
			if (document.styleSheets[i].href.search(hrefPart) >= 0)
				return document.styleSheets[i];
		return null;
	},
	/**
	 * getCssRule() returns a CSS rule from inspecting one or all style sheets
	 * @param {String} selector: the element, id or class attribute for which the rule is wanted
	 * @param {StyleSheet} styleSheet [optional]: will only search this stylesheet
	 * @returns a cssRule object as specified in the DOM Style specification
	 *      this should be an enumeration of CSS properties and their values
	 */
	getCssRule: function (selector, styleSheet) {
		var i, j, cssRule, sheet;
		if (typeof selector != "string")
			throw "a selector parameter of type 'string' is required";
		if (styleSheet) { // search this one
			if (styleSheet.rules) // an IE feature
				rule = searchThisStyleSheet(selector, styleSheet, true);
			else
				rule = searchThisStyleSheet(selector, styleSheet, false);
		}
		else //  search all stylesheets
			for (i = 0; i < document.styleSheets.length; i++) {
				if (document.styleSheets.item) {
					if ((rule = searchThisStyleSheet(
							selector,
							document.styleSheets.item(i),
							true
						)) != null)
						break;
				}
				else if ((rule = searchThisStyleSheet(
						selector,
						document.styleSheets[i],
						false
					)) != null)
					break;
			}
		return rule;

		function searchThisStyleSheet(selector, sheet, isIE) {
			if (isIE == true)
				for (j = 0; j < sheet.rules.length; j++) {
					cssRule = sheet.rules[j];
					// Rule Types not defined in IE DOM
					if (cssRule.selectorText.toLowerCase() == selector.toLowerCase())
						return cssRule;
				}
			else // standard CSS DOM
				for (j = 0; j < sheet.cssRules.length; j++) {
					cssRule = sheet.cssRules[j];
					// Rule Type 1 is a Style Rule
					if (cssRule.type == 1 && (cssRule.selectorText.toLowerCase() ==
							selector.toLowerCase()))
						return cssRule;
				}
			return null;
		}
	},
	/**
	 * setCssRule() returns a CSS rule from inspecting one or all style sheets
	 * @param {String} selector: the element, id or class attribute for which the rule is wanted
	 * @param {String} properties: properties to be created
	 * @param {StyleSheet} styleSheet [optional]: can be numeric for index
	 *    of document stylesheet or string naming a css file
	 *      if omitted; if styleSheet does not exist, returns failure
	 * @returns {boolean} true if successful, false if not
	 */
	setCssRule: function (selector, properties, styleSheet) {
		var i, j, cssRule, sheet;
		if (typeof selector != "string")
			throw "a selector parameter of type 'string' is required";
		if (typeof properties != "string")
			throw "a selector parameter of type 'string' is required";
		if (styleSheet) {
			if (typeof styleSheet == "number" && document.styleSheets[styleSheet])
				styleSheet = document.styleSheets[styleSheet];
			else {
				var regex = new RexExp(styleSheet);
				for (i = 0; i < document.styleSheets.length; i++)
					if (document.styleSheets[i].href.search(regex) >= 0)
						break;
				if (i < document.styleSheets.length)
					styleSheet = document.styleSheets[i];
			}
		}
		else
			styleSheet = document.styleSheets[0];
		if (properties.search(/^\s*\{/) < 0)
			properties = "{" + properties + "}";
		try { // IE gives a problem!
			styleSheet.insertRule(selector + " " + properties);
		}
		catch (exception) {
			styleSheet.insertRule(selector + " " + properties, 0);
		}
	},
	/**
	 * getElemComputedStyle() looks for the particular style property of the
	 *   specified element elem, and whether there is a pseudo element attached
	 *   e.g. hover, visited, etc.
	 * @param {object} elem the reference to the DOM object of type ELEMENT
	 * @param {string} pseudoElem the class modification to the element, where possible
	 * @param {string} styleProperty the string specifying a valid CSS property
	 * @param {boolean} persistentSearch default=false; if true, the property value
	 *    will be searched for a non-null value in all ancestors (containing
	 *    parent elements) in a recursive way
	 * @returns can return a wide variety of values, usually strings, and with
	 *   valid CSS values; will return a value of 'undefined' if no value found
	 */
	getElemComputedStyle: function (elem, pseudoElem, styleProperty, persistentSearch) {
		var t, computedValue,
			node = elem;
		if (typeof elem == "undefined" || elem == null)
			return undefined;
		do {
			if (typeof window.getComputedStyle == "function" &&
				(computedValue = window.getComputedStyle(node, pseudoElem).getPropertyValue(styleProperty)).length > 0)
				t = null;
			else if (document.defaultWindow && document.defaultWindow.getComputedStyle &&
				(computedValue = document.defaultWindow.getComputedStyle(node, pseudoElem).styleProperty).length > 0)
				t = null;
			else if (typeof node.style != "undefined" &&
				(computedValue = node.style[styleProperty]).length > 0)
				t = null;
			else if (typeof node.currentStyle != "undefined" &&
				(computedValue = node.currentStyle[styleProperty]).length > 0 &&
				computedValue != "auto")
				t = null;
			else if (typeof node.offsetLeft != "undefined" && typeof node.offsetWidth != "undefined")
				computedValue = node.offsetWidth - node.offsetLeft;
		} while ((computedValue == null ||
				(typeof computedValue == "string" && computedValue.toLowerCase() == "transparent")) &&
			(node = node.parentNode) != null);
		return computedValue;
	},
	cssNumberRE: /\d+%|\d*\.\d+%/,
	cssLengthRE: /(\d+|\d*\.\d+)(em|px|cm|in|mm|pt|pc|ex)/,
	/**
	 * isCssAboluteSize() determines whether a size was given as "absolute", either
	 *   as a string of "xx-small" to "xx-large" or as a number from 1 to 7
	 *   this function provides a support role for other functions in this JS file
	 * @param {String|Number} cssVal type must be string or number corresponding to special css Value
	 * @returns boolean true if value is a CSS absolute value, false if anything else
	 */
	isCssAbsoluteSize: function (cssVal) {
		if (typeof cssVal == "string") {
			var absoluteSizeVals = ["xx-small", "x-small", "small", "medium",
				"large", "x-large", "xx-large"
			];
			for (var i = 0; i < absoluteSizeVals.length; i++)
				if (cssVal == absoluteSizeVals[i])
					return true;
		}
		else if (typeof cssVal == "number")
			if (cssVal === parseInt(cssVal) && cssVal >= 1 && cssVal <= 7)
				return true;
		return false;
	},
	/**
	 * isCssRelativeSize() determines whether a size was given as relative
	 *   i.e., CSS value was something like "larger" or "smaller"
	 *   this function provides a support role for other functions in this JS file
	 * @param {no restriction} cssVal type must be string or number corresponding to special css Value
	 * @returns boolean true if value a CSS relative value, viz. strings "larger" or "smaller"
	 *    false if anything else
	 */
	isCssRelativeSize: function (cssVal) {
		if (cssVal == "larger" || cssVal == "smaller")
			return true;
		return false;
	},
	/**
	 * isCssFontWeight() determines whether a font weighting was given as a word value
	 *   such as "normal", "bold", etc or as a number of some kind
	 *   this function provides a support role for other functions in this JS file
	 * @param {String|Number} cssVal type must be string or number corresponding to special css Value
	 * @returns boolean true if value is a valid CSS font weighting value
	 *    false if anything else
	 */
	isCssFontWeight: function (cssVal) {
		var i;
		if (isNaN(parseInt(cssVal)) == false) {
			for (i = 0, cssVal = Number(cssVal); i < 9; i++)
				if (cssVal === (i + 1) * 100)
					return true;
		}
		else if (typeof (cssVal) == "string") {
			for (var i = 0, c = ["normal", "bold", "bolder", "lighter"]; i < c.length; i++)
				if (cssVal == c[i])
					return true;
		}
		return false;
	},
	/**
	 * getCssLineHeight() obtains the numeric value for a line height specifier in a CSS
	 *   font size property value.  CSS lets a font size have the form "1.4em/1.7em"
	 *   where the format is font-size/line-height
	 *   this function is largely handled by getCssFontSize(), as it has same method
	 * @param {String|Number} cssVal type must be string or number
	 * @returns Number corresponding to the line height
	 */
	getCssLineHeight: function (cssVal) {
		return getCssFontSize(cssVal, true);
	},
	/**
	 * getCssFontSize() obtains the numeric value for a font size specifier in a CSS
	 *   font size property value.  CSS lets a font size have the form "1.4em/1.7em"
	 *   where the format is font-size/line-height
	 *   this function is provides a support role for other functions in the JS file
	 * @param {String|Number} cssVal type must be string or number
	 * @param {boolean} getLineHeight unset or undefined if getCssFontSize called, but
	 *     true if getCssLineHeight called it, in order to find y in the format x/y
	 * @returns Number corresponding to the font size
	 */
	getCssFontSize: function (cssVal, getLineHeight) {
		if (typeof cssVal == "number")
			return cssVal;
		else if (typeof cssVal == "string") {
			if (typeof getLineHeight == "boolean" && getLineHeight == true)
				if (cssVal.search(/\//) > 0)
					cssVal = cssVal.split("/")[1];
				else
					return null;
			else if (cssVal.search(/\//) > 0)
				cssVal = cssVal.split("/")[0];
			if (cssVal == "inherit")
				return cssVal;
			if (cssVal.search(cssNumberRE) == 0 ||
				isCssAbsoluteSize(cssVal) == true ||
				isCssRelativeSize(cssVal) == true ||
				isCssLength(cssVal) == true)
				return cssVal;
		}
		return null;
	},
	// support functions
	isFontWeight: function (testString) {
		var i,
			fontWeights = ["normal", "bold", "bolder", "lighter", "100", "200", "300",
				"400", "500", "600", "700", "800", "900"
			];
		for (i = 0; i < fontWeights.length; i++)
			if (testString === fontWeights[i])
				return true;
		return false;
	},
	isCssLength: function (testString) {
		var cssLengthRE = /\d{1,3}\.?\d?(%|em|ex|px|in|cm|mm|pt|pc)/;
		if (testString.trim().search(cssLengthRE) >= 0)
			return true;
		return false;
	},
	/**
	* cssParser() takes a CSS definition AS A string, and uses it to style a DOM element
	*  or to divide the definition into an array of strings.
	* @param {object|array} domElemOrArray if DOM element, the style is made
	*   attributes of element; if array, string is split and returned in the array
	* @param {string} cssDef contains the definition (selectors and their properties)
	*    in valid CSS
	* @return {boolean|array} true if DOM element was passed and the CSS definition
	*   was successfully parsed and attributed; false if there was a problem of any kind;
	*   returns an array if array was passed and the CSS definition successfully parsed
	* @type Boolean or Array
	The CSS spec for 'font' property is:
	[[<font-style>||<font-variant>||<font-weight>]? <font-size>[/<line-height>]?
	<font-family>]|caption|icon|menu|message-box|small-caption|status-bar|inherit
	Permitted values are
	font-style: normal|italic|oblique|inherit
	font-variant: normal|small-caps|inherit
	font-weight: normal|bold|bolder|lighter|100|200|300|400|500|600|700|800|900|inherit
	font-size: <absolute-size>|<relative-size>|<length>|<percentage>|inherit
	line-height: normal|<number>|<length>|<percentage>|inherit
	font-family: [[<family-name>|<generic-family>][,family-name|<generic-family>]*]|inherit
	Note that
	*/
	cssParser: function (domElemOrArray, cssDef) {
		var i, j, property,
			parsedProperties = [],
			properties = cssDef.split(";"),
			def,
			val,
			box,
			modifier,
			obj = domElemOrArray,
			firstPart,
			fontCategories = ["caption", "icon", "menu", "message-box",
				"small-caption", "status-bar"
			],
			fontWeight, fontSize, fontVariant, lineHeight, cssFont, fontFamily, fontStyle,
			colorValueRE = /#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgb\(\d{1,3}%?\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*\)|rgb\(\-?\d{1,3}\s*,\-?\s*\d{1,3}\s*,\s*\-?\d{1,3}\s*\)/;
		if (typeof domElemOrArray == "undefined" ||
			(typeof domElemOrArray.nodeType != "undefined" &&
				domElemOrArray.nodeType != 1 && domElemOrArray instanceof Array == false))
			return false;
		if (typeof cssDef != "string")
			return false;
		for (i = 0; i < properties.length; i++) {
			property = properties[i].split(":");
			switch (property[0]) { // property name
				case "color":
				case "background-color":
					if (property[1].search(colorValueRE) < 0)
						continue;
					if (property[0] == "background-color")
						property[0] = "backgroundColor";
					if (obj instanceof Array == true)
						obj.push(property[0], property[1]);
					else
						obj.style[property[0]] = property[1];
					break;
				case "width":
				case "height":
					if ((val = doCssMath(CSS_SUM, property[1], 0)) == null)
						continue;
					if (obj instanceof Array == true)
						obj.push(property[0], val);
					else
						obj.style[property[0]] = val;
					break;
				case "font":
					for (j = 0; j < fontCategories.length; j++)
						if (property[1] == fontCategories[j])
							break;
					if (j == fontCategories.length) {
						// check for multiple font families with comma (,) character
						def = property[1].replace(/"/, "'");
						if (def.search(/'/) >= 0) { // font family with quotes
							def = def.split(/'/);
							firstPart = def.shift().split(/\s+/);
							for (j = firstPart.length - 1; j >= 0; j--)
								if (firstPart[j].search(/,/) >= 0)
									def.unshift(firstPart.pop());
							for (j = 0; j < def.length; j++)
								if (def[j].search(/\s/) >= 0)
									def[j] = "'" + def[j] + "'";
							def = def.join("");
						}
						else { // font family with perhaps only commas
							def = def.split(/,/);
							firstPart = def.shift().split(/\s+/);
							def.unshift(firstPart.pop());
							def = def.join(",");
						}
						def = firstPart.concat(def);
						for (j = def.length - 1; j >= 0; j--)
							if (def[j] == "")
								def.splice(j, 1);
						for (j = 0; j < def.length; j++)
							if (def[j] == "normal") {
								switch (def.length) {
									case 2:
										if (j > 0)
											return false;
										fontStyle = def[j];
										break;
									case 3:
										if (j > 1)
											return false;
										if (j == 1)
											fontWeight = def[j];
										else
											fontStyle = def[j];
										break;
									case 4:
										if (j > 2)
											return false;
										if (j == 2)
											fontWeight = def[j];
										else if (j == 1)
											fontVariant = def[j];
										else
											fontStyle = def[j];
										break;
									case 5:
										if (j == 0)
											fontStyle = def[j];
										else if (j == 1)
											fontVariant = def[j];
										else if (j == 2)
											fontWeight = def[j];
										else
											return false;
									default:
										return false; // formatting error
								}
							}
						else if (def[j] == "italic" || def[j] == "oblique")
							fontStyle = def[j];
						else if (def[j] == "small-caps")
							fontVariant = def[j];
						else if (isFontWeight(def[j]) == true)
							fontWeight = def[j];
						else if ((val = getCssLineHeight(def[j])) != null)
							lineHeight = val;
						else if ((val = getCssFontSize(def[j])) != null)
							fontSize = val;
						else { // likely a font family
							def.splice(0, j);
							fontFamily = def.join("");
							j = def.length;
						}
					}
					else
						cssFont = property[1];
					break;
				case "font-size":
					if (property[0] == "font-size" &&
						(val = getCssFontSize(property[1])) != null)
						fontSize = val;
					break;
				case "font-weight":
					if (property[0] == "font-weight" &&
						isFontWeight(property[1]) == true)
						fontWeight = properties[i + 1];
					break;
				case "font-family":
					if (property[0] == "font-family")
						fontFamily = property[1];
					break;
				case "font-style":
					if (property[0] == "font-size" &&
						(property[1] == "italic" || property[1] == "oblique"))
						fontStyle = property[1];
					break;
				case "line-height":
					if (property[0] == "line-height" &&
						(val = getCssLineHeight(property[1])) != null)
						lineHeight = val;
					break;
				case "float":
					if (obj instanceof Array == true)
						obj.push("cssFloat", property[1]);
					else
						obj.style.cssFloat = property[1];
					break;
				default:
					if ((box = property[0].match(/margin|padding|border/)) != null) {
						if ((modifier = property[0].match(/\-(top|bottom|right|left)/)) != null)
							modifier = modifier[1].charAt(0).toUpperCase() + modifier[1].substr(1);
						else // no modifier!
							modifier = "";
						/*
						if (box[0] == property[0]) {
						propValues = property[1].split(/\s+/)
						if (propValues.length == 1)
						else if (propValues.length == 2)
						else if (propValues.length == 4)
						else
						return false;
						}
						*/
						obj.style[box + modifier] = property[1];
					}
					else if ((box = property[0].match(/(\w+)\-(\w)(\w+)/)) != null)
						obj.style[box[1] + box[2].toUpperCase() + box[3]] = property[1];
					else if (property[0].length > 0)
						obj.style[property[0]] = property[1];
					break;
			}
		}
		// specially defined properties
		if (domElemOrArray instanceof Array == false) {
			if (typeof fontSize != "undefined")
				domElemOrArray.style.fontSize = fontSize;
			if (typeof lineHeight != "undefined")
				domElemOrArray.style.lineHeight = lineHeight;
			if (typeof fontWeight != "undefined")
				domElemOrArray.style.fontWeight = fontWeight;
			if (typeof fontStyle != "undefined")
				domElemOrArray.style.fontStyle = fontStyle;
			if (typeof fontFamily != "undefined")
				domElemOrArray.style.fontFamily = fontFamily;
			if (typeof cssFont != "undefined")
				domElemOrArray.style.font = cssFont;
		}
		else {
			if (typeof fontSize != "undefined")
				domElemOrArray.push("font-size", fontSize);
			if (typeof lineHeight != "undefined")
				domElemOrArray.push("line-height", lineHeight);
			if (typeof fontWeight != "undefined")
				domElemOrArray.push("font-weight", fontWeight);
			if (typeof fontStyle != "undefined")
				domElemOrArray.push("font-style", fontStyle);
			if (typeof fontFamily != "undefined")
				domElemOrArray.push("font-family", fontFamily);
			if (typeof cssFont != "undefined")
				domElemOrArray.push("font", font);
		}
		if (domElemOrArray instanceof Array == true)
			return domElemOrArray;
		return true;
	},
	/**
	 * doCssMath() allows math operations (CSS_SUM or CSS_MULTIPLY) to be done on
	 *   CSS values having different dimensions
	 * @param {constant} a number which must be either CSS_SUM or CSS_MULTIPLY
	 * @param {string|array|number} val1  this can be any valid CSS value, including
	 *   numbers with dimensions as strings.  If it is an array, its elements will
	 *   be evaluated
	 * @param {string|array|number} val2 can be the same type as val1 and val1
	 *   description applies
	 * @return {string} the evaluation of the operated parameters with the dimension
	 *   found
	 */
	doCssMath: function (operation, val1, val2) {
		var setDim,
			val_dim,
			val_dim2,
			sum = 0,
			prod = 0,
			components; // match results of examing a CSS length string
		function extractValueDim(cssVal) {
			var components;
			if (typeof cssVal === "number")
				return [cssVal];
			if (typeof cssVal !== "string")
				return undefined;
			if ((components = cssVal.match(cssLengthRE)) == null)
				return undefined;
			if (components.length != 3 && cssVal != components[1])
				return undefined;
			return [components[1], components[2]];
		}
		if ((typeof val1 == "string" && val1.search(cssLengthRE) < 0) ||
			(typeof val2 == "string" && val2.search(cssLengthRE) < 0))
			return undefined;
		if (operation == CSS_SUM) {
			if (val1 instanceof Array == true)
				for (i = 0; i < val1.length; i++) {
					if ((val_dim = extractValueDim(val1[i])) == undefined)
						return undefined;
					if (i == 0)
						setDim = val_dim[1];
					else if (val_dim[1] != setDim)
						return undefined;
					sum += Number(val_dim[0]);
				}
			else {
				val_dim = extractValueDim(val1);
				val_dim2 = extractValueDim(val2);
				if (val_dim[0] == 0 && val_dim2[0] != 0)
					val_dim[1] = val_dim2[1];
				else if (val_dim[0] != 0 && val_dim2[0] == 0)
					val_dim2[1] = val_dim[1];
				if (val_dim[1] != val_dim2[1])
					return undefined;
				sum = Number(val_dim[0]) + Number(val_dim2[0]);
			}
			return sum + val_dim[1];
		}
		else if (operation == CSS_MULTIPLY) {
			if (val1 instanceof Array == true)
				for (i = 0; i < val1.length; i++) {
					if ((val_dim = extractValueDim(val1[i])) == undefined)
						return undefined;
					if (i == 0)
						setDim = val_dim[1];
					else if (val_dim[1] != setDim)
						return undefined;
					prod *= Number(val_dim[0]);
				}
			else {
				val_dim = extractValueDim(val1);
				var val_dim2 = extractValueDim(val2);
				if (val2 != val_dim2[0] && val1 != val_dim[0] && val_dim[1] != val_dim2[1])
					return undefined;
				if (val_dim[1])
					setDim = val_dim[1];
				else
					setDim = val_dim2[1];
				prod = val_dim[0] * val_dim2[0];
			}
			return prod.toString() + setDim;
		}
		return undefined;
	},
	getClientWidth: function () {
		var theWidth;
		if (window.innerWidth)
			theWidth = window.innerWidth;
		else if (document.documentElement && document.documentElement.clientWidth)
			theWidth = document.documentElement.clientWidth;
		else if (document.body)
			theWidth = document.body.clientWidth;
		return theWidth;
	},
	getClientHeight: function () {
		var theHeight;
		if (window.innerHeight)
			theHeight = window.innerHeight;
		else if (document.documentElement && document.documentElement.clientHeight)
			theHeight = document.documentElement.clientHeight;
		else if (document.body)
			theHeight = document.body.clientHeight;
		return theHeight;
	}
};
/*
The complete ECMAScript [ECMAScript] binding for the Level 2 Document Object Model
Style definitions. The definitions are divided into StyleSheets and CSS
Note that the DOM CSS is really a superset of the DOM StyleSheets
==== DOM StyleSheets
Object StyleSheet {
type:                           string / ro
disabled:                       boolean
ownerNode:                      Node object / ro
parentStyleSheet:               StyleSheet object / ro
href:                           string / ro
title:                          string / ro
media:                          MediaList object / ro
}
Object StyleSheetList {
length:                         number / ro
item(Number index):             returns StyleSheet object
returned object can be dereferenced using square bracket notation (e.g. obj[1]).
Dereferencing with an integer index is equivalent to invoking the item
method with that index.
}
Object MediaList {
mediaText:                      string /  can raise a DOMException object on setting
length:                         number / ro
item(Number index):             returns string
returned object can be dereferenced using square bracket notation (e.g. obj[1]).
Dereferencing with an integer index is equivalent to invoking the item
method with that index.
deleteMedium(string oldMedium): no return value
This method can raise a DOMException object.
appendMedium(string newMedium): no return value
This method can raise a DOMException object.
}
Object LinkStyle {
sheet:                          StyleSheet object / ro
}
Object DocumentStyle
styleSheets:                    StyleSheetList object / ro
}
==== DOM CSS
Object CSSStyleSheet : StyleSheet {
type:                           string / ro
disabled:                       boolean
ownerNode:                      Node object / ro
parentStyleSheet:               StyleSheet object / ro
href:                           string / ro
title:                          string / ro
media:                          MediaList object / ro
ownerRule:                      CSSRule object / ro
cssRules:                       CSSRuleList object / ro
insertRule(
string rule,
number index):                returns number
This method can raise a DOMException object
deleteRule(number index):       no return value
This method can raise a DOMException object
}
Object CSSRuleList {
length:                         number / ro
item(number index):             returns CSSRule object
returned object can be dereferenced using square bracket notation (e.g. obj[1]).
Dereferencing with an integer index is equivalent to invoking the item
method with that index.
}
Prototype Object CSSRule {
CSSRule.UNKNOWN_RULE:           number, constant value = 0
CSSRule.STYLE_RULE:             number, constant value = 1
CSSRule.CHARSET_RULE
CSSRule.IMPORT_RULE
CSSRule.MEDIA_RULE
CSSRule.FONT_FACE_RULE
CSSRule.PAGE_RULE
}
Object CSSRule {
type:                           number / ro
cssText:                        string / can raise a DOMException object on setting
parentStyleSheet:               CSSStyleSheet object / ro
parentRule:                     CSSRule object / ro
}
Object CSSStyleRule : CSSRule {
type:                           number / ro
cssText:                        string / can raise a DOMException object on setting
parentStyleSheet:               CSSStyleSheet object / ro
parentRule:                     CSSRule object / ro
selectorText:                   string / can raise a DOMException object on setting
style:                          CSSStyleDeclaration object / ro
}
Object CSSMediaRule : CSSRule {
type:                           number / ro
cssText:                        string / can raise a DOMException object on setting
parentStyleSheet:               CSSStyleSheet object / ro
parentRule:                     CSSRule object / ro
media:                          MediaList object / ro
cssRules:                       CSSRuleList object / ro
insertRule(
string rule,
number index):                returns number
This method can raise a DOMException object
deleteRule(number index):       no return value
This method can raise a DOMException object
}
Object CSSFontFaceRule : CSSRule {
type:                           number / ro
cssText:                        string / can raise a DOMException object on setting
parentStyleSheet:               CSSStyleSheet object / ro
parentRule:                     CSSRule object / ro
style:                    CSSStyleDeclaration object / ro
}
Object CSSPageRule : CSSRule {
type:                           number / ro
cssText:                        string / can raise a DOMException object on setting
parentStyleSheet:               CSSStyleSheet object / ro
parentRule:                     CSSRule object / ro
selectorText:             string / can raise a DOMException object on setting
style:                    CSSStyleDeclaration object / ro
Object CSSImportRule : CSSRule {
type:                           number / ro
cssText:                        string / can raise a DOMException object on setting
parentStyleSheet:               CSSStyleSheet object / ro
parentRule:                     CSSRule object / ro
href:                     string / ro
media:                    MediaList object / ro
styleSheet:               CSSStyleSheet object / ro
}
Object CSSCharsetRule : CSSRule {
type:                           number / ro
cssText:                        string / can raise a DOMException object on setting
parentStyleSheet:               CSSStyleSheet object / ro
parentRule:                     CSSRule object / ro
encoding:                   string / can raise a DOMException object on setting
}
Object CSSUnknownRule : CSSRule {
type:                           number / ro
cssText:                        string / can raise a DOMException object on setting
parentStyleSheet:               CSSStyleSheet object / ro
parentRule:                     CSSRule object / ro
}
Object CSSStyleDeclaration {
cssText:                    string / can raise a DOMException object on setting.
length:                     number / ro
parentRule:                 CSSRule object / ro
getPropertyValue(
string propertyName):     returns string
getPropertyCSSValue(
string propertyName):     returns CSSValue object
removeProperty(
string propertyName):     returns string
This method can raise a DOMException object
getPropertyPriority(
string propertyName):     returns string
setProperty(
string propertyName,
string value,
string priority):         returns no value
This method can raise a DOMException object
item(
number index):            returns string
Note: This object can also be dereferenced using square bracket
notation (e.g. obj[1]).  Dereferencing with an integer index is
equivalent to invoking the item method with that index.
}
Prototype Object CSSValue {
CSSValue.CSS_INHERIT:           number / constant value = 0
CSSValue.CSS_PRIMITIVE_VALUE    number / constant value = 1
CSSValue.CSS_VALUE_LIST         number / constant value = 2
CSSValue.CSS_CUSTOM             number / constant value = 3
}
Object CSSValue {
cssText:                    string / can raise a DOMException object on setting
cssValueType:               number / ro
}
Prototype Object CSSPrimitiveValue {
CSSPrimitiveValue.CSS_UNKNOWN
CSSPrimitiveValue.CSS_NUMBER
CSSPrimitiveValue.CSS_PERCENTAGE
CSSPrimitiveValue.CSS_EMS
CSSPrimitiveValue.CSS_EXS
CSSPrimitiveValue.CSS_PX
CSSPrimitiveValue.CSS_CM
CSSPrimitiveValue.CSS_MM
CSSPrimitiveValue.CSS_IN
CSSPrimitiveValue.CSS_PT
CSSPrimitiveValue.CSS_PC
CSSPrimitiveValue.CSS_DEG
CSSPrimitiveValue.CSS_RAD
CSSPrimitiveValue.CSS_GRAD
CSSPrimitiveValue.CSS_MS
CSSPrimitiveValue.CSS_S
CSSPrimitiveValue.CSS_HZ
CSSPrimitiveValue.CSS_KHZ
CSSPrimitiveValue.CSS_DIMENSION
CSSPrimitiveValue.CSS_STRING
CSSPrimitiveValue.CSS_URI
CSSPrimitiveValue.CSS_IDENT
CSSPrimitiveValue.CSS_ATTR
CSSPrimitiveValue.CSS_COUNTER
CSSPrimitiveValue.CSS_RECT
CSSPrimitiveValue.CSS_RGBCOLOR
}
Object CSSPrimitiveValue :  CSSValue {
cssText:                    string / can raise a DOMException object on setting
cssValueType:               number / ro
primitiveType:                    number / ro
setFloatValue(
number unitType,
float floatValue):              returns no value
This method can raise a DOMException object
getFloatValue(number unitType):   returns float object
This method can raise a DOMException object.
setStringValue(
number stringType,
string stringValue):            returns no value
This method can raise a DOMException object
getStringValue():                 returns string
This method can raise a DOMException object
getCounterValue():                returns Counter object
This method can raise a DOMException object
getRectValue():                   returns Rect object
This method can raise a DOMException object
getRGBColorValue():               returns RGBColor object
This method can raise a DOMException object
}
Object CSSValueList : CSSValue {
cssText:                    string / can raise a DOMException object on setting
cssValueType:               number / ro
length:                         number / ro
item(number index):             returns CSSValue object
Note: This object can be dereferenced using square bracket notation (e.g. obj[1]).
Dereferencing with an integer index is equivalent to invoking the item
method with that index.
}
Object RGBColor {
red:                            CSSPrimitiveValue object / ro
green:                          CSSPrimitiveValue object / ro
blue:                           CSSPrimitiveValue object / ro
}
Object Rect {
top:                            CSSPrimitiveValue object / ro
right:                          CSSPrimitiveValue object / ro
bottom:                         CSSPrimitiveValue object / ro
left:                           CSSPrimitiveValue object / ro
}
Object Counter {
identifier:                     string / ro
listStyle:                      string / ro
separator:                      string / ro
}
Object ViewCSS : AbstractView {
getComputedStyle(
Element elt,
string pseudoElt):          returns CSSStyleDeclaration object
}
Object DocumentCSS : DocumentStyle {
getOverrideStyle(
Element elt,
string pseudoElt):          returns CSSStyleDeclaration object
}
Object DOMImplementationCSS : DOMImplementation {
createCSSStyleSheet(
string title,
string media):              returns CSSStyleSheet object
This method can raise a DOMException object
}
Object ElementCSSInlineStyle {
style:                        CSSStyleDeclaration object / ro
}
Object CSS2Properties {
// all properties below are string value and can raise DOMException on setting
azimuth:
background
backgroundAttachment
backgroundColor
backgroundImage
backgroundPosition
backgroundRepeat
border
borderCollapse
borderColor
borderSpacing
borderStyle
borderTop
borderRight
borderBottom
borderLeft
borderTopColor
borderRightColor
borderBottomColor
borderLeftColor
borderTopStyle
borderRightStyle
borderBottomStyle
borderLeftStyle
borderTopWidth
borderRightWidth
borderBottomWidth
borderLeftWidth
borderWidth
bottom
captionSide
clear
clip
color
content
counterIncrement
counterReset
cue
cueAfter
cueBefore
cursor
direction
display
elevation
emptyCells
cssFloat
font
fontFamily
fontSize
fontSizeAdjust
fontStretch
fontStyle
fontVariant
fontWeight
height
left
letterSpacing
lineHeight
listStyle
listStyleImage
listStylePosition
listStyleType
margin
marginTop
marginRight
marginBottom
marginLeft
markerOffset
marks
maxHeight
maxWidth
minHeight
minWidth
orphans
outline
outlineColor
outlineStyle
outlineWidth
overflow
padding
paddingTop
paddingRight
paddingBottom
paddingLeft
page
pageBreakAfter
pageBreakBefore
pageBreakInside
pause
pauseAfter
pauseBefore
pitch
pitchRange
playDuring
position
quotes
richness
right
size
speak
speakHeader
speakNumeral
speakPunctuation
speechRate
stress
tableLayout
textAlign
textDecoration
textIndent
textShadow
textTransform
top
unicodeBidi
verticalAlign
visibility
voiceFamily
volume
whiteSpace
widows
width
wordSpacing
zIndex
}
*/