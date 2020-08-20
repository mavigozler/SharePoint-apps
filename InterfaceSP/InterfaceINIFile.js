"use strict";

// "class" iniFile
function IniFile(filePath) {
	var thisInstance = this;
	this.iniFilePath = filePath;
	this.iniFileContents = [];
	this.setSection;
	this.waitIniFileLoad = function () {
		return new RSVP.Promise(function (resolve, reject) {
			$.ajax({
				url: thisInstance.iniFilePath,
				method: "GET",
				xhrFields: {
					responseType: "blob"
				},
				success: function (blob, responseStatus, reqObj) {
					var fReader = new FileReader();
					fReader.onload = function (evt) {
						if (thisInstance.parseIniText(evt.target.result) == true)
							resolve(reqObj.status);
					};
					fReader.readAsText(blob);
				},
				error: function (reqObj, responseStatus, errorThrown) {
					console.log("Error in recovering INI file\n" +
						"HTTP Response: " + reqObj.status);
					reject(reqObj.status);
				}
			});
		});
	};
	this.parseIniText = function (textContent) {
		var lines = textContent.match(/\[\w+\]|\s*[#;]\s*.*|\w+=[a-zA-Z \._\d\/\{\}",\-%:;@]+/g),
			i, j, item, idx, sectionPart, value, variable;
		for (i = 0, j = 1; i < lines.length; i++) {
			if ((item = lines[i].match(/^\s*[#;]\s*(.*)/)) != null) { // comment
				if (sectionPart)
					sectionPart.nvPairs.push({
						name: "comment" + j++,
						value: item[1]
					});
			}
			else if ((item = lines[i].match(/\[(\w+)\]/)) != null) {
				idx = this.iniFileContents.push({
					sectionName: item[1]
				});
				sectionPart = this.iniFileContents[idx - 1];
				sectionPart.nvPairs = [];
			}
			else if ((item = lines[i].match(/(\w+)=(.*)/)) != null) { // nv pair
				// check for variables in the value part
				value = item[1];
				while (value.search(/@@/) >= 0) {
					variable = value.match(/(@@.*@@)/g)[1];
					value = value.replace(variable, this.searchName(value.match(/@@(.*)@@/g)[1]));
				}
				sectionPart.nvPairs.push({
					name: item[1],
					value: item[2]
				});
			}
		}
		return true;
	};
	this.setSection = function (secname) {
		var i;
		for (i = 0; i < this.iniFileContents.length; i++)
			if (this.iniFileContents[i].sectionName == secname)
				break;
		if (i == this.iniFileContents.length) {
			this.selectedSection = null;
			return false;
		}
		this.selectedSection = this.iniFileContents[i];
		return true;
	};
	this.getValue = function (name) {
		var i, value;
		for (i = 0; i < this.selectedSection.nvPairs.length; i++)
			if (this.selectedSection.nvPairs[i].name == name) {
				value = this.selectedSection.nvPairs[i].value;
				if (value == "true")
					return true;
				else if (value == "false")
					return false;
				else
					return value;
			}
		return null;
	};
	this.searchName = function (name) {
		for (i = 0; i < this.iniFileContents.length; i++)
			for (j = 0; j < this.iniFileContents[i].nvPairs.length; j++)
				if (name == this.iniFileContents[i].nvPairs[j].name)
					break;
		return this.iniFileContents[i].nvPairs[j].value;
	};
}
/* file contents read in as object into this.iniFileContents
[ { sectionName: <name>, nvPairs:
[ { name: <prop>, value: <propValue> },
]
},
]
*/