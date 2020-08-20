"use strict";
/**
@function IListRESTRequest  -- constructor for interface to making REST request for SP Lists
@param {object:
server: {string} server domain
site: {string} subsite domain name
list: {string} name of SP list
listItemEntityType: {string} (optional) entity type for list full name
relativeUrl: {string} the offset URL for doc libs
debugging: {boolean} set to true or property just existing, will ensure
console.log activity
}
Methods:
.getLastRequest()
.directRequest()
.getListItemCount()
.loadListIds()
.isValidID(itemId)
.getListIds()
.getNextListId()
.getPreviousListId()
.getFirstListId()
.getListProperties()
.getListItemData({itemId:,query:})
.getAllListItemsOptionalQuery({[query:]})
.createList({name: OR body:})
.updateListByMerge({})
.deleteList()
.createListItem({body:})
.updateListItem({itemId:,body:})
.deleteListItem({itemId:})
.getAllDocLibFiles()
.getFolderFilesOptionalQuery({folder:|folderPath:,
query:|select:|filter:|expand:})
.getDocLibItemByFileName({fileName:})
.getDocLibItemMetadata({itemId:,passthru:})
.getDocLibItemFileData({itemId:,passthru:})
.uploadItemToDocLib({itemName:,body:,willOverwrite:true|false})
.createLinkToDocItemInDocLib({itemName:string,fields:string,willOverwrite:true|false})
.renameItem({itemId:,itemName:}) or ({itemId:,newName:})
.renameFile({itemId:,itemName:}) or ({itemId:,newName:})
.renameFile() equiv to .renameItem()
.renameItemWithCheckout({itemId:,itemName:}) or ({itemId:,newName:})
.checkOutDocLibItem({itemName:})
.checkInDocLibItem({itemName:,CheckInComment:})
.deleteDocLibItem({path:,recycle:[false=hard delete])})
.getFieldsAndProperties()
.getFieldChoices({fieldName:})
.getFieldProps({fieldGuid:})
.createField({body:})
.getFieldTypeAsText(fTypeValue)
.getFieldTypeAsDescription(fTypeValue)
*/
var IGNORE_NO_EXIST = 0x0001,
	IGNORE_THIS_USER_CHECKOUT = 0x0002;

function IListRESTRequest(setup) {
	var IListRESTRequestInstance = this,
		urlPart;
	this.server;
	this.site;
	this.apiPrefix;
	this.listName;
	this.listGuid;
	this.listItemEntityTypeName;
	this.linkToDocumentContentTypeId;
	this.baseTemplate;
	this.itemCount; // only set when method is called
	this.listIds; // this must be loaded by call to .loadIds()
	this.currentListIdIndex = 0;
	this.checkOutCalls = [];
	this.checkOutCallsFNames = [];
	this.instanceCheckOuts = [];
	this.baseUrl;
	this.stdHeaders = {
		"Accept": "application/json;odata=verbose",
		"Content-Type": "application/json;odata=verbose"
	};
	this.debugging = false;
	this.loggingFunction;
	this.lastRequestUrl;
	this.lastRequestMethod;
	if (!setup || typeof setup != "object" ||
		!(setup.list || setup.listName || setup.listGuid || setup.guid))
		throw "Use of IListRESTRequest() constructor must include list name " +
			"or guid as property of object argument";
	if (setup.list)
		this.listName = setup.list;
	else if (setup.listName)
		this.listName = setup.listName;
	else if (setup.listGuid)
		this.listGuid = setup.listGuid;
	else if (setup.guid)
		this.listGuid = setup.guid;
	if (this.listGuid)
		this.listGuid = this.listGuid.match(/\{([\d\w\-]+)\}/)[1];
	if (setup.protocol)
		this.protocol = setup.protocol;
	else
		this.protocol = "https";
	if (!setup.server)
		throw "Constructor requires defining server as arg { server:<server> }";
	this.server = setup.server;
	if (setup.site)
		this.site = "/" + setup.site;
	else
		this.site = "";
	if (this.listGuid)
		urlPart = "(guid'" + this.listGuid + "')";
	else
		urlPart = "/GetByTitle('" + this.listName + "')";
	this.apiPrefix = this.protocol + "://" + this.server + this.site + "/_api";
	if (setup.linkToDocumentContentTypeId)
		this.linkToDocumentContentTypeId = setup.linkToDocumentContentTypeId;
	this.escapeApostrophe = function (string) {
		return encodeURIComponent(string).replace(/'/g, '\'\'');
	};
	// synchronous construction
	$.ajax({
		url: IListRESTRequestInstance.apiPrefix + "/web/lists" +
			urlPart + "?$expand=RootFolder,ContentTypes",
		method: "GET",
		async: false,
		headers: this.stdHeaders,
		success: function (responseData, responseStatus, reqObj) {
			var i, loopData;
			IListRESTRequestInstance.creationDate = responseData.d.Created;
			IListRESTRequestInstance.baseTemplate = responseData.d.BaseTemplate;
			if (!IListRESTRequestInstance.listName)
				IListRESTRequestInstance.listName = responseData.d.Title;
			if (!IListRESTRequestInstance.listGuid)
				IListRESTRequestInstance.listGuid = responseData.d.Id;
			if (!IListRESTRequestInstance.listItemEntityTypeName)
				IListRESTRequestInstance.listItemEntityTypeName = responseData.d.ListItemEntityTypeFullName;
			if (IListRESTRequestInstance.baseTemplate == 101 &&
				!IListRESTRequestInstance.baseUrl &&
				responseData.d.RootFolder.ServerRelativeUrl)
				IListRESTRequestInstance.baseUrl = "/" +
				responseData.d.DocumentTemplateUrl.match(/^\/([^\/]+)/)[1];
			// for doc libs, look for "Link To Document" content type and store its content type ID
			if (loopData = responseData.d.ContentTypes.results) {
				for (var i = 0; i < loopData.length; i++)
					if (loopData[i].Name == "Link to a Document")
						break;
				if (i < loopData.length)
					IListRESTRequestInstance.linkToDocumentContentTypeId = loopData[i].Id.StringValue;
			}
		},
		error: function (responseObj, responseStatus, responseMessage) {
			alert("initialization problem: " + responseMessage + "\n\n" +
				JSON.stringify(responseObj));
		}
	});
	if (setup.debugging && setup.debugging == true)
		this.debugging = true;
	if (setup.loggingFunction)
		this.loggingFunction = setup.loggingFunction;
	// No object initializing code below here
	/*
	if (!this.listGuid || !this.listItemEntityTypeName || !this.listName || !this.baseUrl ||
	!this.creationDate || !this.baseTemplate)
	this.loadListBasics();
	*/
	this.getListName = function () {
		return new RSVP.Promise(function (resolve, reject) {
			if (IListRESTRequestInstance.listName)
				resolve(IListRESTRequestInstance.listName);
			else
				IListRESTRequestInstance.loadListBasics().then(function () {
					resolve(IListRESTRequestInstance.listName);
				});
		})
	}
	this.setLinkToDocumentContentTypeId = function (hexAsString) {
		this.linkToDocumentContentTypeId = hexAsString;
	};
	this.getLastRequest = function () {
		return {
			url: this.lastRequestUrl,
			method: this.lastRequestMethod
		};
	};
	this.directRequest = function (parameters) {
		return httpRequest(parameters);
	};
	// if parameters.success not found the request will be SYNCHRONOUS and not ASYNC
	function httpRequest(parameters) {
		if (!parameters.body) parameters.body = null;
		if (!parameters.headers)
			parameters.headers = IListRESTRequestInstance.stdHeaders;
		else if (!parameters.headers["Accept"]) {
			parameters.headers["Accept"] = "application/json;odata=verbose";
			parameters.headers["Content-Type"] = "application/json;odata=verbose";
		}
		IListRESTRequestInstance.lastRequestUrl = parameters.url;
		IListRESTRequestInstance.lastRequestMethod = parameters.method;
		if (IListRESTRequestInstance.debugging == true) {
			console.log("=== HTTP Request: SETUP ===" +
				"\nurl = " + parameters.url +
				"\nmethod = " + parameters.method +
				"\nheaders = " + EnhancedJsonStringify(parameters.headers, null, "  ") +
				"\nbody = " + parameters.body);
		}
		return new RSVP.Promise(function (resolve, reject) {
			$.ajax({
				url: parameters.url,
				method: parameters.method,
				headers: parameters.headers,
				data: parameters.body,
				processData: false,
				success: function (responseJSON, responseStatus, responseObj) {
					if (IListRESTRequestInstance.debugging == true) {
						console.log(
							"\n=== HTTP Response: SUCCESS ===" +
							"\ncode: " + responseObj.status +
							"\nResponse Obj [JSON]: " +
							EnhancedJsonStringify(responseJSON, null, "  ") +
							"\nrequest URL: " + this.url
						);
					}
					resolve({
						responseJSON: responseJSON,
						responseStatusType: responseStatus,
						httpStatus: responseObj.status,
						requestObj: this,
						passthru: parameters.passthru
					});
				},
				error: function (responseObj, responseStatus, responseMessage) {
					if (IListRESTRequestInstance.debugging == true) {
						console.log(
							"\n=== HTTP RESPONSE: ERROR ===" +
							"\ncode: " + responseObj.status +
							"\nmessage: " + responseMessage + ": " +
							responseObj.responseJSON.error.message.value +
							"\nrequest URL: " + this.url
						);
					}
					reject({
						responseJSON: responseObj.responseJSON,
						responseStatusType: responseStatus,
						httpStatus: responseObj.status,
						responseMessage: responseMessage + ": " +
							responseObj.responseJSON.error.message.value,
						requestObj: this,
						passthru: parameters.passthru
					});
				},
			});
		});
	};

	function getRequestDigestValue() {
		return new RSVP.Promise(function (resolve, reject) {
			var reqParams = {
				url: IListRESTRequestInstance.apiPrefix + "/contextinfo",
				method: "POST",
				headers: IListRESTRequestInstance.stdHeaders
			};
			httpRequest(reqParams).then(function (response) {
				resolve(response.responseJSON.d.GetContextWebInformation.FormDigestValue);
			}).catch(function (response) {
				console.log(EnhancedJsonStringify(response, null, "  "));
				throw "Error in response to IListRESTRequest.getRequestDigestValue() call. See console log";
			});
		});
	}
	this.getListItemCount = function () {
		return new RSVP.Promise(function (resolve, reject) {
			return getRequestDigestValue().then(function (digestValue) {
				var reqParams = {
					url: IListRESTRequestInstance.apiPrefix + "/web/lists" +
						(IListRESTRequestInstance.listName ?
							"/GetByTitle('" + IListRESTRequestInstance.listName + "')" :
							"(guid'" + IListRESTRequestInstance.listGuid + "')") +
						"/?$count",
					method: "GET",
					headers: IListRESTRequestInstance.stdHeaders
				};
				httpRequest(reqParams).then(function (response) {
					resolve(response.responseJSON.d.ItemCount);
				}).catch(function (response) {
					reject("IListRESTRequest.getListItemCount(): error getting actual count" +
						"\nHTTP Status Code: " + response.httpStatus +
						"\nResponse message: " + response.responseMessage);
				});
			}).catch(function (response) {
				reject("IListRESTRequest.getListItemCount(): error getting a " +
					"request digest value\nHTTP Status Code: " + response.httpStatus +
					"\nResponse message: " + response.responseMessage);
			});
		});
	};
	this.loadListIds = function () {
		return new RSVP.Promise(function (resolve, reject) {
			if (IListRESTRequestInstance.listIds &&
				IListRESTRequestInstance.listIds.length > 0)
				resolve(IListRESTRequestInstance.listIds);
			else
				IListRESTRequestInstance.getListItemCount().then(function (response) {
					IListRESTRequestInstance.getAllListItemsOptionalQuery({
						query: "$top=" + (IListRESTRequestInstance.itemCount = response) +
							"&$select=ID"
					}).then(function (response) {
						var i, results = response.responseJSON.d.results,
							IDs = [];
						for (i = 0; i < results.length; i++)
							IDs.push(results[i].Id);
						IListRESTRequestInstance.listIds = IDs;
						resolve(IListRESTRequestInstance.listIds);
					}).catch(function (response) {
						console.log(EnhancedJsonStringify(response, null, "  "));
						throw "Error in response to IListRESTRequest.loadListIds() call. See console log";
					});
				}).catch(function (response) {
					console.log(EnhancedJsonStringify(response, null, "  "));
					throw "Error in response to IListRESTRequest.getListItemCount() call. See console log";
				});
		});
	};
	this.isValidID = function (itemId) {
		return new RSVP.Promise(function (resolve, reject) {
			IListRESTRequestInstance.getListIds().then(function (response) {
				resolve(response.includes(itemId));
			}).catch(function (response) {
				console.log(EnhancedJsonStringify(response, null, "  "));
				reject("Error in response to IListRESTRequest.isValidID() call. See console log");
			});
		});
	};
	this.getListIds = function () {
		return new RSVP.Promise(function (resolve, reject) {
			IListRESTRequestInstance.loadListIds().then(function (response) {
				resolve(IListRESTRequestInstance.listIds);
			}).catch(function (response) {
				console.log(EnhancedJsonStringify(response, null, "  "));
				reject("Error in response to IListRESTRequest.getListIds() call. See console log");
			});
		});
	};
	this.getNextListId = function () {
		return new RSVP.Promise(function (resolve, reject) {
			IListRESTRequestInstance.loadListIds().then(function (response) {
				if (IListRESTRequestInstance.currentListIdIndex == IListRESTRequestInstance.listIds.length)
					resolve(IListRESTRequestInstance.listIds[IListRESTRequestInstance.currentListIdIndex]);
				else
					resolve(IListRESTRequestInstance.listIds[++IListRESTRequestInstance.currentListIdIndex]);
			}).catch(function (response) {
				console.log(EnhancedJsonStringify(response, null, "  "));
				reject("Error in response to IListRESTRequest.getNextListId() call. See console log");
			});
		});
	};
	this.getPreviousListId = function () {
		return new RSVP.Promise(function (resolve, reject) {
			IListRESTRequestInstance.loadListIds().then(function (response) {
				if (IListRESTRequestInstance.currentListIdIndex == 0)
					resolve(IListRESTRequestInstance.listIds[IListRESTRequestInstance.currentListIdIndex]);
				else
					resolve(IListRESTRequestInstance.listIds[--IListRESTRequestInstance.currentListIdIndex]);
			}).catch(function (response) {
				console.log(EnhancedJsonStringify(response, null, "  "));
				reject("Error in response to IListRESTRequest.getPreviousListId() call. See console log");
			});
		});
	};
	this.getFirstListId = function () {
		return new RSVP.Promise(function (resolve, reject) {
			IListRESTRequestInstance.loadListIds().then(function (response) {
				resolve(IListRESTRequestInstance.listIds[IListRESTRequestInstance.currentListIdIndex = 0]);
			}).catch(function (response) {
				console.log(EnhancedJsonStringify(response, null, "  "));
				reject("Error in response to IListRESTRequest.getFirstListId() call. See console log");
			});
		});
	};
	this.setCurrentListId = function (itemId) {
		if (!this.listIds)
			throw "Cannot call IListRESTRequest.setCurrentListId() unless List IDs are loaded";
		if ((this.currentListIdIndex = this.listIds.indexOf(parseInt(itemId))) < 0)
			return false;
		return true;
	};
	// query: [optional]
	this.getProperties = function (parameters) {
		var query = constructQueryParameters(parameters),
			reqParams = {
				url: IListRESTRequestInstance.apiPrefix +
					"/web/lists(guid'" + this.listGuid + "')" + query,
				method: "GET",
				headers: IListRESTRequestInstance.stdHeaders
			};
		return httpRequest(reqParams);
	};
	this.getListItemData = function (parameters) {
		return getRequestDigestValue().then(function (digestValue) {
			var query = constructQueryParameters(parameters),
				reqParams = {
					url: IListRESTRequestInstance.apiPrefix + "/web/lists" +
						(IListRESTRequestInstance.listName ? "/GetByTitle('" +
							IListRESTRequestInstance.listName + "')" :
							"(guid'" + IListRESTRequestInstance.listGuid + "')") +
						"/items(" + parameters.itemId + ")" + query,
					method: "GET",
					headers: IListRESTRequestInstance.stdHeaders,
					passthru: parameters.passthru
				};
			return httpRequest(reqParams);
		});
	};
	/*
	Syntax--
	filter: "column/field operator 'value' boolean ..."
	select: "field1,field2,field3,..."
	*/
	this.listItemAllResults;
	this.getAllListItemsOptionalQuery = function (parameters) {
		var reqParams = {},
			query = constructQueryParameters(parameters);
		if (parameters && parameters.url) // for __next cycles
			reqParams.url = parameters.url;
		else
			reqParams.url = this.apiPrefix + "/web/lists" +
			(this.listName ? "/GetByTitle('" +
				this.listName + "')" :
				"(guid'" + this.listGuid + "')") +
			"/items" + (query ? query : "");
		if (parameters && parameters.method)
			reqParams.method = parameters.method;
		else
			reqParams.method = "GET";
		/*
		if (parameters)
		parameters.token = !parameters.token ? 0 : parameters.token;
		else
		parameters = {token: 0}; */
		if (parameters && parameters.passthru)
			reqParams.passthru = parameters.passthru;
		return new RSVP.Promise(function (resolve, reject) {
			httpRequest(reqParams).then(function (response) {
				if (!IListRESTRequestInstance.listItemAllResults)
					IListRESTRequestInstance.listItemAllResults = response;
				else
					IListRESTRequestInstance.listItemAllResults.responseJSON.d.results =
					IListRESTRequestInstance.listItemAllResults.responseJSON.d.results.concat(
						response.responseJSON.d.results
					);
				if (response.responseJSON.d.__next) {
					if (parameters && parameters.limit &&
						parameters.limit <
						IListRESTRequestInstance.listItemAllResults.responseJSON.d.results.length)
						resolve(IListRESTRequestInstance.listItemAllResults);
					else {
						parameters.token++;
						resolve(IListRESTRequestInstance.getAllListItemsOptionalQuery({
							url: response.responseJSON.d.__next,
							method: "GET",
						}));
					}
				}
				else
					resolve(IListRESTRequestInstance.listItemAllResults);
			}).catch(function (response) {
				reject(response);
			});
		});
	};
	// @param {object} must include properties {name: or body:}
	// body must be JSON with following format:
	// body: { '__metadata': { 'type': 'SP.List' }, 'AllowContentTypes': true, 'BaseTemplate': 100,
	//      ContentTypesEnabled': true, 'Description': 'My list description', 'Title': 'Test' }
	this.createList = function (parameters) {
		return getRequestDigestValue().then(function (digestValue) {
			var reqParams = {
				url: IListRESTRequestInstance.apiPrefix + "/web/lists",
				method: "POST",
				headers: {
					"X-RequestDigest": digestValue
				},
				data: parameters.body ? parameters.body : EnhancedJsonStringify({
					'__metadata': {
						'type': 'SP.List'
					},
					//                  'AllowContentTypes' : true,
					'BaseTemplate': 100,
					//                            'ContentTypesEnabled' : true,
					//                            'Description' : '',    // list description
					'Title': parameters.name
				})
			};
			return httpRequest(reqParams);
		});
	};
	// @param {object} must include properties {body:, success:}
	// body must be JSON with following format:
	// body: { '__metadata': { 'type': 'SP.List' }, 'Title': 'New title' }
	this.updateListByMerge = function (parameters) {
		// to be coded
		var reqParams = {
			url: IListRESTRequestInstance.apiPrefix + "/web/lists(guid'" +
				IListRESTRequestInstance.listGuid + "')",
			method: "POST",
			headers: {
				"X-RequestDigest": digestValue
			},
			data: parameters.body ? parameters.body : EnhancedJsonStringify({
				'__metadata': {
					'type': 'SP.List'
				},
				'Title': parameters.name
			})
		};
	};
	this.deleteList = function () {
		return getRequestDigestValue().then(function (digestValue) {
			var reqParams = {
				url: IListRESTRequestInstance.apiPrefix + "/web/lists(guid'" +
					IListRESTRequestInstance.listGuid + "')",
				method: "POST",
				headers: {
					"X-RequestDigest": digestValue,
					"X-HTTP-METHOD": "DELETE",
					"IF-MATCH": "*" // can also use etag
				}
			};
			return httpRequest(reqParams);
		});
	};
	// @param {object} parameters - should have at least {body:,success:}
	// body format: {string} " 'fieldInternalName': 'value', ...}
	this.createListItem = function (parameters) {
		return new RSVP.Promise(function (resolve, reject) {
			getRequestDigestValue().then(function (digestValue) {
				parameters.digestValue = digestValue;
				if (!IListRESTRequestInstance.listItemEntityTypeName)
					IListRESTRequestInstance.loadListBasics().then(function (response) {
						IListRESTRequestInstance.createListItemActual(parameters)
							.then(function (response) {
								resolve(response);
							}).catch(function (response) {
								reject(response);
							});
					});
				else
					IListRESTRequestInstance.createListItemActual(parameters)
					.then(function (response) {
						resolve(response);
					}).catch(function (response) {
						reject(response);
					});
			});
		});
	};
	this.createListItemActual = function (parameters) {
		var reqParams = {
			url: IListRESTRequestInstance.apiPrefix + "/web/lists" +
				(IListRESTRequestInstance.listName ?
					"/GetByTitle('" + IListRESTRequestInstance.listName + "')" :
					"(guid'" + IListRESTRequestInstance.listGuid + "')") + "/items",
			method: "POST",
			body: "{ '__metadata': { 'type': '" +
				IListRESTRequestInstance.listItemEntityTypeName + "' }, " +
				parameters.body + " }",
			headers: {
				"X-RequestDigest": parameters.digestValue
			},
			passthru: parameters.passthru
		};
		return httpRequest(reqParams);
	};
	/**
	applies to all lists and libraries to update metadata
	parameters properties should be
	.itemId [required]
	.body [required] -- must be formatted as REST odata
	.passthru -- [optional] especially to follow up on id affected
	*/
	this.updateListItem = function (parameters) {
		return getRequestDigestValue().then(function (digestValue) {
			var reqParams = {
				url: IListRESTRequestInstance.apiPrefix + "/web/lists" +
					(IListRESTRequestInstance.listName ?
						"/GetByTitle('" + IListRESTRequestInstance.listName + "')" :
						"(guid'" + IListRESTRequestInstance.listGuid + "')") +
					"/items(" + parameters.itemId + ")",
				method: "POST",
				body: "{ '__metadata': { 'type': '" + IListRESTRequestInstance.listItemEntityTypeName + "' }, " +
					parameters.body +
					" }",
				headers: {
					"X-RequestDigest": digestValue,
					"X-HTTP-METHOD": "MERGE",
					"IF-MATCH": "*" // can also use etag
				},
				passthru: parameters.passthru
			};
			return httpRequest(reqParams);
		});
	};
	/**
	applies to all lists
	parameters properties should be
	.itemId [required]
	.recycle [optional, default=true]. Use false to get hard delete
	*/
	this.deleteListItem = function (parameters) {
		var recycle;
		if (typeof parameters.recycle == "boolean" && parameters.recycle == false)
			recycle = false;
		else
			recycle = true;
		return getRequestDigestValue().then(function (digestValue) {
			var reqParams = {
				url: IListRESTRequestInstance.apiPrefix + "/web/lists" +
					(IListRESTRequestInstance.listName ?
						"/GetByTitle('" + IListRESTRequestInstance.listName + "')" :
						"(guid'" + IListRESTRequestInstance.listGuid + "')") +
					"/items(" + parameters.itemId + ")" +
					(recycle == true ? "/recycle()" : ""),
				method: recycle == true ? "POST" : "DELETE",
				headers: {
					"X-RequestDigest": digestValue,
					"IF-MATCH": "*" // can also use etag
				}
			};
			if (recycle == false)
				reqParams.headers["X-HTTP-METHOD"] = "DELETE";
			return httpRequest(reqParams);
		});
	};
	/*                 case clsRestReq_CONST.MULTIPLE_COLUMN_FILTER[0]:
	this.requestUrl += "/Web/lists/GetByTitle('" + this.urlParameters[clsRestReq_CONST.URL_LIST_NAME] +
	"')/field(" + this.urlParameters[clsRestReq_CONST.URL_SELECT_FIELD_NAME] +
	")?$filter=EntityPropertyName eq '" +
	this.urlParameters[clsRestReq_CONST.URL_FILTER_FIELD_NAME] + "'";
	break; */
	// ==============================================================================================
	// ======================================  DOCLIB related REST requests =========================
	// ==============================================================================================
	this.getAllDocLibFiles = function () {
		var reqParams = {
			url: IListRESTRequestInstance.apiPrefix + "/web/lists" +
				(IListRESTRequestInstance.listName ?
					"/GetByTitle('" + IListRESTRequestInstance.listName + "')" :
					"(guid'" + IListRESTRequestInstance.listGuid + "')") +
				"/Files",
			method: "GET",
			headers: IListRESTRequestInstance.stdHeaders
		};
		return httpRequest(reqParams);
	};
	/**
	.folder OR .folderPath: if empty, gets root folder files
	otherwise, gets files in the path of the document library
	.query, .select, .filter, .expand
	if .query present, all other properties ignored, but if others
	present they are used.
	.query requires user to use '$filter=', '$select=', '$expand='
	*/
	this.getFolderFilesOptionalQuery = function (parameters) {
		var reqParams, query = constructQueryParameters(parameters);
		if (!(parameters.folderPath || parameters.folder))
			throw "Method requires 'parameters.folderPath' or 'parameters.folder " +
				"which are not defined";
		reqParams = {
			url: IListRESTRequestInstance.apiPrefix +
				"/web/getFolderByServerRelativeUrl('" +
				IListRESTRequestInstance.baseUrl +
				parameters.folderPath + "')/Files" + query,
			method: "GET",
			headers: IListRESTRequestInstance.stdHeaders
		};
		return httpRequest(reqParams);
	};
	/** @method getDocLibItemByFileName
	retrieves item by file name and also returns item metadata
	* @param {Object} parameters
	* @param {string} parameters.fileName - name of file
	*/
	this.getDocLibItemByFileName = function (parameters) {
		var reqParams;
		if (!(parameters.fileName || parameters.itemName))
			throw "Method requires 'parameters.fileName' or 'parameters.itemName' " +
				"to be defined";
		reqParams = {
			url: IListRESTRequestInstance.apiPrefix +
				"/web/getFolderByServerRelativeUrl('" +
				IListRESTRequestInstance.baseUrl + "')/Files('" +
				this.escapeApostrophe(parameters.fileName) +
				"')?$expand=ListItemAllFields",
			method: "GET",
			headers: IListRESTRequestInstance.stdHeaders,
		};
		return httpRequest(reqParams);
	};
	/** @method getDocLibItemMetadata
	 * @param {Object} parameters
	 * @param {number|string} parameters.itemId - ID of item whose data is wanted
	 * @returns  {Object} returns only the metadata about the file item
	 */
	this.getDocLibItemMetadata = function (parameters) {
		var reqParams;
		if (!parameters.itemId)
			throw "Method requires 'parameters.itemId' to be defined";
		reqParams = {
			url: IListRESTRequestInstance.apiPrefix + "/web/lists" +
				(IListRESTRequestInstance.listName ? "/GetByTitle('" +
					IListRESTRequestInstance.listName + "')" :
					"(guid'" + IListRESTRequestInstance.listGuid + "')") +
				"/items(" + parameters.itemId + ")",
			method: "GET",
			headers: IListRESTRequestInstance.stdHeaders,
			passthru: parameters.passthru
		};
		return httpRequest(reqParams);
	};
	/** @method getDocLibItemFileData
	 * @param {Object} parameters
	 * @param {number|string} parameters.itemId - ID of item whose data is wanted
	 * @returns {Object} data about the file and metadata of the library item
	 */
	this.getDocLibItemFileAndMetaData = function (parameters) {
		var reqParams;
		if (!parameters.itemId)
			throw "Method requires 'parameters.itemId' to be defined";
		reqParams = {
			url: IListRESTRequestInstance.apiPrefix + "/web/lists" +
				(IListRESTRequestInstance.listName ? "/GetByTitle('" +
					IListRESTRequestInstance.listName + "')" :
					"(guid'" + IListRESTRequestInstance.listGuid + "')") +
				"/items(" + parameters.itemId + ")/File?$expand=ListItemAllFields",
			method: "GET",
			headers: IListRESTRequestInstance.stdHeaders,
			passthru: parameters.passthru
		};
		return httpRequest(reqParams);
	};
	/**
	arguments as parameters properties:
	.fileName or .itemName -- required which will be name applied to file data
	.folderPath -- optional, if omitted, uploaded to root folder
	.body  required file data (not metadata)
	.willOverwrite [optional, default = false]
	*/
	this.uploadItemToDocLib = function (parameters) {
		var reqParams, path;
		if (!(parameters.fileName || parameters.itemName))
			throw "Method requires 'parameters.fileName' or 'parameters.itemName' " +
				"to be defined";
		if (parameters.itemName)
			parameters.fileName = parameters.itemName;
		path = IListRESTRequestInstance.baseUrl;
		if (parameters.folderPath) {
			if (parameters.folderPath.charAt(0) == "/")
				path += parameters.folderPath;
			else
				path += parameters.folderPath;
		}
		if (!parameters.body)
			throw "Method requires 'parameters.body' with upload file data blob " +
				"to be defined";
		if (typeof parameters.willOverwrite == "undefined")
			parameters.willOverwrite = false;
		else
			parameters.willOverwrite = (parameters.willOverwrite == true ? "true" : "false");
		return getRequestDigestValue().then(function (digestValue) {
			reqParams = {
				url: IListRESTRequestInstance.apiPrefix +
					"/web/getFolderByServerRelativeUrl('" + path + "')" +
					"/Files/add(url='" + IListRESTRequestInstance.escapeApostrophe(parameters.fileName) +
					"',overwrite=" + parameters.willOverwrite +
					")?$expand=ListItemAllFields",
				method: "POST",
				headers: {
					"X-RequestDigest": digestValue,
					"IF-MATCH": "*" // can also use etag
				},
				body: parameters.body,
				passthru: parameters.passthru
			};
			return httpRequest(reqParams);
		});
	};
	/**
	required arguments as parameters properties:
	.fileName or .itemName
	.url   required string which is URL representing the link
	.fileType   required string
	.willOverwrite [optional, default = false]
	*/
	this.createLinkToDocItemInDocLib = function (parameters) {
		return new RSVP.Promise(function (resolve, reject) {
			if (!IListRESTRequestInstance.linkToDocumentContentTypeId) {
				IListRESTRequestInstance.loadListBasics().then(function (response) {
					resolve(IListRESTRequestInstance.continueCreateLinkToDocItemInDocLib(parameters));
				}).catch(function (response) {
					reject("createLinkToDocItemInDocLib() requires IListRESTRequest " +
						"property 'linkToDocumentContentTypeId' to be defined\n\n" +
						"Use setLinkToDocumentContentTypeId() method or define object with " +
						"initializing parameter");
					alert("There was a system error. Contact the administrator.");
				});
			}
			else
				resolve(IListRESTRequestInstance.continueCreateLinkToDocItemInDocLib(parameters));
		});
	};
	/**
	 *  helper function for one above
	 */
	this.continueCreateLinkToDocItemInDocLib = function (parameters) {
		if (!(parameters.fileName || parameters.itemName))
			throw "Method requires 'parameters.fileName' or 'parameters.itemName' " +
				"to be defined";
		if (parameters.itemName)
			parameters.fileName = parameters.itemName;
		if (typeof parameters.willOverwrite == "undefined")
			parameters.willOverwrite = false;
		else
			parameters.willOverwrite = (parameters.willOverwrite == true ? "true" : "false");
		return getRequestDigestValue().then(function (digestValue) {
			var reqParams = {
				url: IListRESTRequestInstance.apiPrefix +
					"/web/getFolderByServerRelativeUrl('" +
					IListRESTRequestInstance.baseUrl + "')" +
					"/Files/add(url='" + IListRESTRequestInstance.escapeApostrophe(
						parameters.fileName) + "',overwrite=" + parameters.willOverwrite +
					")?$expand=ListItemAllFields",
				method: "POST",
				headers: {
					"X-RequestDigest": digestValue
				},
				body: LinkToDocumentASPXTemplate.replace(/\$\$LinkToDocUrl\$\$/g, parameters.url).
				replace(/\$\$LinkToDocumentContentTypeId\$\$/,
					IListRESTRequestInstance.linkToDocumentContentTypeId).
				replace(/\$\$filetype\$\$/, parameters.fileType),
				passthru: parameters.passthru
			};
			return httpRequest(reqParams);
		});
	};
	/** @function checkOutDocLibItem
	 *         checks out a document library item where checkout is required
	 * @param {string} .fileName or .itemName -- required which will be name applied to file data
	 *       @param {string} .folderPath -- optional, if omitted, uploaded to root folder
	 * @param {byte} exceptions - flag on how to handle exceptions
	 *     only acceptable options are IGNORE_THIS_USER_CHECKOUT, IGNORE_NO_EXIST
	 * @param {object} exceptionsData. For IGNORE_THIS_USER_CHECKOUT, a string that
	 *     is part of the user name should be passed as {uname: <username string>}
	 */
	this.checkOutDocLibItem = function (parameters) {
		// parameters.tryCheckOutResolve == true will
		//   perform a user request of resolving without checking
		//   if user is identical with checked out user
		var path;
		if (!(parameters.fileName || parameters.itemName))
			throw "Method requires 'parameters.fileName' or 'parameters.itemName' " +
				"to be defined";
		if (parameters.itemName)
			parameters.fileName = parameters.itemName;
		path = IListRESTRequestInstance.baseUrl;
		if (parameters.folderPath) {
			if (parameters.folderPath.charAt(0) == "/")
				path += parameters.folderPath;
			else
				path += parameters.folderPath;
		}
		path += "/" + parameters.fileName;
		return new RSVP.Promise(function (resolve, reject) {
			return getRequestDigestValue().then(function (digestValue) {
				var reqParams = {
					url: IListRESTRequestInstance.apiPrefix +
						"/web/getFileByServerRelativeUrl('" +
						path + "')/CheckOut()",
					method: "POST",
					headers: {
						"X-RequestDigest": digestValue
					},
					passthru: parameters.passthru
				};
				httpRequest(reqParams).then(function (response) {
					resolve(response);
				}).catch(function (response) {
					// look for exceptions and consider 'resolve'd if conditions are OK
					if ((parameters.exceptions & IGNORE_NO_EXIST) != 0 &&
						response.httpStatus == 500) {
						console.log("IGNORE_NO_EXIST set: checkout not caught");
						resolve("File not existing OK. Proceed to thenable");
					}
					else if ((parameters.exceptions & IGNORE_THIS_USER_CHECKOUT) != 0 &&
						response.httpStatus == 423 &&
						response.responseMessage.search(/Locked/) >= 0 &&
						response.responseMessage.search(new RegExp(exceptionsData.uname))) {
						console.log("IGNORE_THIS_USER_CHECKOUT set: checkout not caught");
						resolve("User '" + exceptionsData.uname + "' checkout OK. Proceed to thenable");
					}
					else
						reject(response);
				});
			});
		});
	};
	/**
	arguments as parameters properties:
	.fileName or .itemName -- required which will be name applied to file data
	.folderPath -- optional, if omitted, uploaded to root folder
	.type,.checkinType,.checkInType,.checkintype -- optional with
	values of "[mM]inor" or 0, "[mM]ajor" or 1, "[oO]verwrite" or 2
	do not use "overwrite" for a
	*/
	this.checkInDocLibItem = function (parameters) {
		// checkintype = 0: minor version, = 1: major version, = 2: overwrite
		var path;
		if (!(parameters.fileName || parameters.itemName))
			throw "Method requires 'parameters.fileName' or 'parameters.itemName' " +
				"to be defined";
		if (parameters.itemName)
			parameters.fileName = parameters.itemName;
		path = IListRESTRequestInstance.baseUrl;
		if (parameters.folderPath) {
			if (parameters.folderPath.charAt(0) == "/")
				path += parameters.folderPath;
			else
				path += parameters.folderPath;
		}
		path += "/" + parameters.fileName;
		return new RSVP.Promise(function (resolve, reject) {
			return getRequestDigestValue().then(function (digestValue) {
				var reqParams, checkinType;
				checkinType = parameters.type || parameters.checkInType ||
					parameters.checkintype || parameters.checkinType;
				switch (checkinType) {
					case "minor":
					case "Minor":
						checkinType = 0;
						break;
					case "major":
					case "Major":
						checkinType = 1;
						break;
					case "overwrite":
					case "Overwrite":
					case null:
					case undefined:
						checkinType = 2;
						break;
				}
				if (!parameters.checkInComment)
					parameters.checkInComment = "";
				reqParams = {
					url: IListRESTRequestInstance.apiPrefix +
						"/web/GetFileByServerRelativeUrl('" + path + "')" +
						"/CheckIn(comment='" + parameters.checkInComment +
						"',checkintype=" + checkinType + ")",
					method: "POST",
					headers: {
						"X-RequestDigest": digestValue
					},
					passthru: parameters.passthru
				};
				httpRequest(reqParams).then(function (response) {
					resolve(response);
				}).catch(function (response) {
					// 500 error happens for overwrite on a new file
					// change checkin type to "minor"
					if (response.httpStatus == 500) {
						if (response.responseJSON.error.message.value.search(
								/cannot checkin.*overwrite.*published file/) >= 0)
							parameters.type = "minor";
						IListRESTRequestInstance.checkInDocLibItem(parameters).then(
							function (response) {
								resolve(response);
							}).catch(function (response) {
							reject(response);
						});
					}
					else
						reject(response);
				});
			});
		});
	};
	/** @method discardCheckOutDocLibItem
	 * @param {Object} parameters
	 * @param {string} parameters.(fileName|itemName) - name of file checked out
	 * @param {string} parameters.folderPath - path to file name in doc lib
	 */
	this.discardCheckOutDocLibItem = function (parameters) {
		var reqParams, path;
		if (!(parameters.fileName || parameters.itemName))
			throw "Method requires 'parameters.fileName' or 'parameters.itemName' " +
				"to be defined";
		if (parameters.itemName)
			parameters.fileName = parameters.itemName;
		path = IListRESTRequestInstance.baseUrl;
		if (parameters.folderPath) {
			if (parameters.folderPath.charAt(0) == "/")
				path += parameters.folderPath;
			else
				path += parameters.folderPath;
		}
		path += "/" + parameters.fileName;
		return getRequestDigestValue().then(function (digestValue) {
			reqParams = {
				url: IListRESTRequestInstance.apiPrefix +
					"/web/GetFileByServerRelativeUrl('" + path + "')" +
					"/UndoCheckout()",
				method: "POST",
				headers: {
					"X-RequestDigest": digestValue
				},
				passthru: parameters.passthru
			};
			return httpRequest(reqParams);
		});
	};
	this.renameFile = function (parameters) {
		return this.renameItem(parameters);
	};
	this.renameItem = function (parameters) {
		return getRequestDigestValue().then(function (digestValue) {
			var reqParams = {
				url: IListRESTRequestInstance.apiPrefix + "/web/lists" +
					(IListRESTRequestInstance.listName ? "/GetByTitle('" +
						IListRESTRequestInstance.listName + "')" :
						"(guid'" + IListRESTRequestInstance.listGuid + "')") +
					"/items(" + parameters.itemId + ")",
				method: "POST",
				headers: {
					"X-RequestDigest": digestValue,
					"X-HTTP-METHOD": "MERGE",
					"IF-MATCH": "*" // can also use etag
				},
				body: "{ '__metadata': { 'type': '" +
					IListRESTRequestInstance.listItemEntityTypeName +
					"' }, " + "'FileLeafRef':'" +
					(parameters.itemName ? parameters.itemName : parameters.newName) +
					"'}"
			};
			return httpRequest(reqParams);
		});
	};
	// 3 arguments are necessary:
	// .itemId: ID of file item
	// .currentFileName or .currentName:  the current name
	// .newFileName or .newName: name to be used in rename
	this.renameItemWithCheckout = function (parameters) {
		if (!parameters.itemId || isNaN(parameters.itemId) == true)
			throw "parameters.itemId not found or defined as number";
		if (!(parameters.currentFileName || parameters.currentName))
			throw "parameters.currentFileName or parameters.currentName " +
				"not found/defined: must be string";
		parameters.currentFileName = parameters.currentFileName || parameters.currentName;
		if (!(parameters.newFileName || parameters.newName))
			throw "parameters.newFileName or parameters.newName " +
				"not found/defined: must be string";
		parameters.newFileName = parameters.newFileName || parameters.newName;
		return new RSVP.Promise(function (resolve, reject) {
			return getRequestDigestValue().then(function (digestValue) {
				var checkinType, reqParams = {
					url: IListRESTRequestInstance.apiPrefix + "/web/lists" +
						(IListRESTRequestInstance.listName ? "/GetByTitle('" +
							IListRESTRequestInstance.listName + "')" :
							"(guid'" + IListRESTRequestInstance.listGuid + "')") +
						"/items(" + parameters.itemId + ")",
					method: "POST",
					headers: {
						"X-RequestDigest": digestValue,
						"X-HTTP-METHOD": "MERGE",
						"IF-MATCH": "*" // can also use etag
					},
					body: "{ '__metadata': { 'type': '" +
						IListRESTRequestInstance.listItemEntityTypeName + "' }, " +
						"'FileLeafRef':'" + parameters.newFileName + "'}"
				};
				checkinType = parameters.checkInType || parameters.checkinType ||
					parameters.checkintype || parameters.type;
				if (!checkinType || checkinType == null)
					checkinType = 2; // overwrite
				IListRESTRequestInstance.checkOutDocLibItem({
					fileName: parameters.currentFileName,
				}).then(function (response) {
					resolve(IListRESTRequestInstance.continueRenameItemWithCheckout(
						reqParams, checkinType, parameters
					));
				}).catch(function (response) {
					if (response.httpStatus == 423)
						resolve(IListRESTRequestInstance.continueRenameItemWithCheckout(
							reqParams, checkinType, parameters
						));
					else
						reject(response);
				});
			});
		});
	};
	// part 2 of the above process
	this.continueRenameItemWithCheckout = function (reqParams, checkinType, parameters) {
		return new RSVP.Promise(function (resolve, reject) {
			httpRequest(reqParams).then(function (response) {
				IListRESTRequestInstance.checkInDocLibItem({
					itemName: parameters.newFileName,
					checkinType: checkinType
				}).then(function (response) {
					resolve(response);
				}).catch(function (response) {
					reject(response);
				});
			}).catch(function (response) {
				reject(response);
			});
		});
	};
	/** @method updateLibItemWithCheckout
	 * @param {Object} parameters
	 * @param {string|number} parameters.(fileName|itemId) - id of lib item or name of file checked out
	 */
	this.updateLibItemWithCheckout = function (parameters) {
		return new RSVP.Promise(function (resolve, reject) {
			if ((!parameters.itemId || isNaN(parameters.itemId) == true) &&
				!parameters.fileName)
				throw "argument must contain {itemId:<value>} or {fileName:<name>}";
			if (!parameters.body)
				throw "parameters.body not found/defined: must be formatted JSON string";
			if (!parameters.fileName)
				IListRESTRequestInstance.getListItemData({
					itemId: parameters.itemId,
					expand: "File"
				}).then(function (response) {
					parameters.fileName = response.responseJSON.d.File.Name;
					IListRESTRequestInstance.continueupdateLibItemWithCheckout(parameters).then(function (response) {
						resolve(response);
					}).catch(function (response) {
						reject(response);
					});
				}).catch(function (response) {
					reject(response);
				});
			else
				IListRESTRequestInstance.continueupdateLibItemWithCheckout(parameters).then(function (response) {
					resolve(response);
				}).catch(function (response) {
					reject(response);
				});
		});
	};
	/** @method continueupdateLibItemWithCheckout
	 * @param {Object} parameters
	 * @param {string|number} parameters.(fileName|itemId) - id of lib item or name of file checked out
	 */
	this.continueupdateLibItemWithCheckout = function (parameters) {
		return new RSVP.Promise(function (resolve, reject) {
			return getRequestDigestValue().then(function (digestValue) {
				var checkinType,
					reqParams = {
						url: IListRESTRequestInstance.apiPrefix + "/web/lists" +
							(IListRESTRequestInstance.listName ? "/GetByTitle('" +
								IListRESTRequestInstance.listName + "')" :
								"(guid'" + IListRESTRequestInstance.listGuid + "')") +
							"/items(" + parameters.itemId + ")",
						method: "POST",
						body: "{ '__metadata': { 'type': '" +
							IListRESTRequestInstance.listItemEntityTypeName + "' }, " +
							parameters.body + " }",
						headers: {
							"X-RequestDigest": digestValue,
							"X-HTTP-METHOD": "MERGE",
							"IF-MATCH": "*" // can also use etag
						},
						passthru: parameters.passthru
					};
				checkinType = parameters.checkInType || parameters.checkinType ||
					parameters.checkintype || parameters.type;
				if (!checkinType || checkinType == null)
					checkinType = 2; // overwrite
				IListRESTRequestInstance.checkOutDocLibItem({
					itemName: parameters.fileName,
				}).then(function (response) {
					httpRequest(reqParams).then(function (response) {
						IListRESTRequestInstance.checkInDocLibItem({
							itemName: parameters.fileName,
							checkinType: checkinType
						}).then(function (response) {
							resolve(response);
						}).catch(function (response) {
							reject(response);
						});
					}).catch(function (response) {
						reject(response);
					});
				}).catch(function (response) {
					reject(response);
				});
			});
		});
	};
	/** @method discardCheckOutDocLibItem
	 * @param {Object} parameters
	 * @param {string} parameters.(fileName|itemName) - name of file checked out
	 * @param {string} parameters.folderPath - path to file name in doc lib
	 */
	this.updateDocLibItemMetadata = function (parameters) {
		return new RSVP.Promise(function (resolve, reject) {
			var itemName, majorResponse;
			IListRESTRequestInstance.getDocLibItemFileData({
				itemId: parameters.itemId
			}).then(function (response) {
				IListRESTRequestInstance.checkOutDocLibItem({
					itemName: itemName = response.responseJSON.d.Name
				}).then(function (response) {
					IListRESTRequestInstance.updateListItem({
						itemId: parameters.itemId,
						body: parameters.body
					}).then(function (response) {
						majorResponse = response;
						IListRESTRequestInstance.checkInDocLibItem({
							itemName: itemName
						}).then(function (response) {
							resolve(majorResponse);
						}).catch(function (response) { // check in failure
							reject(response);
						});
					}).catch(function (response) { // update failure
						reject(response);
					});
				}).catch(function (response) { // check out failure
					reject(response);
				});
			});
		});
	};
	/**
	required arguments as parameters properties:
	.sourceFileName [required]  the path to the source name
	.destinationFileName [required]  the path to the location to be copied,
	can have file name different than source name
	.willOverwrite [optional, default = false]
	*/
	this.copyDocLibItem = function (parameters) {
		var uniqueId;
		if (!parameters.sourceFileName)
			throw "parameters.sourceFileName not found/defined";
		if (!parameters.destinationFileName)
			throw "parameters.destinationFileName not found/defined";
		if (typeof parameters.willOverwrite == "undefined")
			parameters.willOverwrite = "false";
		else
			parameters.willOverwrite = (parameters.willOverwrite == true ? "true" : "false");
		return new RSVP.Promise(function (resolve, reject) {
			httpRequest({
				url: IListRESTRequestInstance.apiPrefix +
					"/web/GetFileByServerRelativeUrl('" +
					parameters.sourceFileName + "')?$expand=ListItemAllFields",
				method: "GET"
			}).then(function (response) {
				uniqueId = response.responseJSON.d.UniqueId;
				getRequestDigestValue().then(function (digestValue) {
					httpRequest({
						url: IListRESTRequestInstance.apiPrefix +
							"/web/GetFileById(guid'" + uniqueId +
							"')/CopyTo(strNewUrl='" + parameters.destinationFileName +
							"',bOverWrite=" + parameters.willOverwrite + ")",
						method: "POST",
						headers: {
							"X-RequestDigest": digestValue,
						}
					}).then(function (response) {
						// note that Check in is not needed
						resolve(response); // response is usually 'CopyTo: null'
					}).catch(function (response) {
						reject(response);
					});
				});
			});
		});
	};
	// .path
	// .folderPath
	// .fileName
	// .includeBaseUrl [optional, default=true]. Set to false if passing
	//    the item's .ServerRelativeUrl value
	//   set parameters.recycle = false to create a HARD delete (no recycle)
	// @return:
	//   for soft delete, responseJSON.d will be .Recycle property with GUID value
	this.deleteDocLibItem = function (parameters) {
		if (parameters.folderPath && parameters.fileName)
			parameters.path = parameters.folderPath + "/" + parameters.fileName;
		if (typeof parameters.includeBaseUrl == "undefined")
			parameters.includeBaseUrl = true;
		return getRequestDigestValue().then(function (digestValue) {
			var reqParams = {
				url: IListRESTRequestInstance.apiPrefix +
					"/web/GetFileByServerRelativeUrl('" +
					(parameters.includeBaseUrl == false ? "" :
						IListRESTRequestInstance.baseUrl) + parameters.path + "')" +
					((parameters.recycle && parameters.recycle == "false") ?
						"" : "/recycle()"),
				method: "POST",
				headers: {
					"X-RequestDigest": digestValue,
					"IF-MATCH": "*" // can also use etag
				},
				passthru: parameters.passthru
			};
			if (parameters.recycle && parameters.recycle == "false")
				reqParams.headers["X-HTTP-METHOD"] == "DELETE";
			return httpRequest(reqParams);
		});
	};
	// ==============================================================================================
	// ======================================  List Property/Structure requests =========================
	// ==============================================================================================
	this.getFieldsAndProperties = function (parameters) {
		var reqParams, query = parameters && parameters.query ? parameters.query : "";
		reqParams = {
			url: IListRESTRequestInstance.apiPrefix + "/web/lists" +
				(IListRESTRequestInstance.listName ? "/GetByTitle('" +
					IListRESTRequestInstance.listName + "')" :
					"(guid'" + IListRESTRequestInstance.listGuid + "')") +
				"/fields" + (query.length > 0 ? "?" + query : ""),
			method: "GET",
			headers: IListRESTRequestInstance.stdHeaders
		};
		return httpRequest(reqParams);
	};
	this.getFieldChoices = function (parameters) {
		return new RSVP.Promise(function (resolve, reject) {
			var reqParams = {
				url: IListRESTRequestInstance.apiPrefix + "/web/lists" +
					(IListRESTRequestInstance.listName ? "/GetByTitle('" +
						IListRESTRequestInstance.listName + "')" :
						"(guid'" + IListRESTRequestInstance.listGuid + "')") +
					"/fields?$filter=EntityPropertyName eq '" +
					parameters.fieldName + "'",
				method: "GET",
				headers: IListRESTRequestInstance.stdHeaders,
				passthru: parameters.passthru
			};
			httpRequest(reqParams).then(function (response) {
				if (!response.responseJSON.d.results[0].Choices)
					reject("no Choices property found in the field");
				else
					resolve({
						fieldValues: response.responseJSON.d.results[0].Choices.results,
						passthru: response.passthru
					});
			}).catch(function (response) {
				reject(response);
			});
		});
	};
	this.getFieldProps = function (parameters) {
		var reqParams = {
			url: IListRESTRequestInstance.apiPrefix + "/web/lists" +
				(IListRESTRequestInstance.listName ? "/GetByTitle('" +
					IListRESTRequestInstance.listName + "')" :
					"(guid'" + IListRESTRequestInstance.listGuid + "')") +
				"/fields(guid'" + parameters.fieldGuid + "')",
			method: "GET",
			headers: IListRESTRequestInstance.stdHeaders
		};
		return httpRequest(reqParams);
	};
	// Body: { '__metadata': { 'type': 'SP.Field' }, 'Title': 'field title', 'FieldTypeKind': FieldType value,
	// Required': 'true/false', 'EnforceUniqueValues': 'true/false','StaticName': 'field name'}
	this.createField = function (parameters) {
		return getRequestDigestValue().then(function (digestValue) {
			var reqParams = {
				url: IListRESTRequestInstance.apiPrefix + "/web/lists" +
					(IListRESTRequestInstance.listName ? ("/GetByTitle('" +
							IListRESTRequestInstance.listName + "')") :
						("(guid'" + IListRESTRequestInstance.listGuid + "')")) +
					"/fields",
				method: "POST",
				headers: {
					"X-RequestDigest": digestValue
				},
				body: parameters.body
			};
			return httpRequest(reqParams);
		});
	};
	/** @method .updateChoiceTypeField
	 *       @param {Object} parameters
	 *       @param {string} parameters.id - the field guid/id to be updated
	 *       @param {(array|arrayAsString)} parameters.choices - the elements that will
	 *     form the choices for the field, as an array or array written as string
	 */
	this.updateChoiceTypeField = function (parameters) {
		var choices;
		if (parameters.choices instanceof Array) {
			choices = JSON.stringify(parameters.choices);
			choices = choices.replace(/"/g, "'");
		}
		else if (typeof parameters.choice == "string")
			choices = parameters.choices.replace(/"/g, "'");
		else
			throw "parameters must include '.choices' property that is " +
				"either array or string";
		return getRequestDigestValue().then(function (digestValue) {
			var reqParams = {
				url: IListRESTRequestInstance.apiPrefix + "/web/lists" +
					(IListRESTRequestInstance.listName ? ("/GetByTitle('" +
							IListRESTRequestInstance.listName + "')") :
						("(guid'" + IListRESTRequestInstance.listGuid + "')")) +
					"/Fields(guid'" + parameters.id + "')",
				method: "POST",
				headers: {
					"IF-MATCH": "*",
					"X-HTTP-METHOD": "MERGE",
					"X-RequestDigest": digestValue
				},
				body: "{ '__metadata': { 'type': 'SP.FieldChoice' }, " +
					"'Choices': { '__metadata': { 'type': 'Collection(Edm.String)' }, " +
					"'results': " + choices + "} }"
			};
			return httpRequest(reqParams);
		});
	};
	this.getFieldTypeAsText = function (fTypeValue) {
		switch (fTypeValue) {
			case 0:
				return "Invalid";
			case 1:
				return "Integer";
			case 2:
				return "Text";
			case 3:
				return "Note";
			case 4:
				return "DateTime";
			case 5:
				return "Counter";
			case 6:
				return "Choice";
			case 7:
				return "Lookup";
			case 8:
				return "Boolean";
			case 9:
				return "Number";
			case 10:
				return "Currency";
			case 11:
				return "URL"
			case 12:
				return "Computed";
			case 13:
				return "Threading"
			case 14:
				return "Guid";
			case 15:
				return "MultiChoice";
			case 16:
				return "GridChoice";
			case 17:
				return "Calculated";
			case 18:
				return "File";
			case 19:
				return "Attachments";
			case 20:
				return "User";
			case 21:
				return "Recurrence";
			case 22:
				return "CrossProjectLink";
			case 23:
				return "ModStat";
			case 24:
				return "Error";
			case 25:
				return "ContentTypeId";
			case 26:
				return "PageSeparator";
			case 27:
				return "ThreadIndex";
			case 28:
				return "WorkflowStatus";
			case 29:
				return "AllDayEvent"
			case 30:
				return "WorkflowEventType";
			case 31:
				return "MaxItems";
			default:
				return "Undefined";
		}
	};
	this.getFieldTypeAsDescription = function (fTypeValue) {
		switch (fTypeValue) {
			case 0:
				return "Not used.";
			case 1:
				return "Field allows an integer value.";
			case 2:
				return "Field allows a limited-length string of text.";
			case 3:
				return "Field allows larger amounts of text.";
			case 4:
				return "Field allows full date and time values, as well as date-only values.";
			case 5:
				return "Counter is a monotonically increasing integer field, and " +
					"has a unique value in relation to other values that are stored for the " +
					"field in the list. Counter is used only for the list item identifier field, ";
			case 6:
				return "Field allows selection from a set of suggested values. A choice " +
					"field supports a field-level setting which specifies whether free-form values " +
					"are supported.";
			case 7:
				return "Field allows a reference to another list item. The field supports " +
					"specification of a list identifier for a targeted list. An optional " +
					"site identifier can also be specified, which specifies the site " +
					"of the list which contains the target of the lookup.";
			case 8:
				return "Field allows a true or false value.";
			case 9:
				return "Field allows a positive or negative number. A number field supports a " +
					"field level setting used to specify the number of decimal places to display.";
			case 10:
				return "Field allows for currency-related data. The Currency field has a " +
					"CurrencyLocaleId property which takes a locale identifier of the currency to use.";
			case 11:
				return "Field allows a URL and optional description of the URL.";
			case 12:
				return "Field renders output based on the value of other columns.";
			case 13:
				return "Contains data on the threading of items in a discussion board.";
			case 14:
				return "Specifies that the value of the field is a GUID.";
			case 15:
				return "Field allows one or more values from a set of specified choices. A " +
					"MultiChoice field can also support free-form values.";
			case 16:
				return "Grid choice supports specification of multiple number scales in a list.";
			case 17:
				return "Field value is calculated based on the value of other columns.";
			case 18:
				return "Specifies a reference to a file that can be used to retrieve the contents of that file.";
			case 19:
				return "Field describes whether one or more files are associated" +
					" with the item. See Attachments for more information on attachments. " +
					"true if a list item has attachments, and false if a list item does not" +
					" have attachments.";
			case 20:
				return "A lookup to a particular user in the User Info list.";
			case 21:
				return "Specifies whether a field contains a recurrence pattern for an item.";
			case 22:
				return "Field allows a link to a Meeting Workspace site.";
			case 23:
				return "Specifies the current status of a moderation process on the document. " +
					"Value corresponds to one of the moderation status values.";
			case 24:
				return "Specifies errors.";
			case 25:
				return "Field contains a content type identifier for an item. " +
					"ContentTypeId conforms to the structure defined in ContentTypeId.";
				"and not intended for use elsewhere.";
			case 26:
				return "Represents a placeholder for a page separator in a survey list. " +
					"PageSeparator is only intended to be used with a Survey list.";
			case 27:
				return "Contains a compiled index of threads in a discussion board.";
			case 28:
				return "Contains status on a running workflow for a particular item.";
			case 29:
				return "The AllDayEvent field is only used in conjunction with " +
					"an Events list. true if the item is an all day event (that is, does " +
					"not occur during a specific set of hours in a day).";
			case 30:
				return "A description of a type of a historical workflow event. See " +
					"WorkflowEventType Enumeration for more information.";
			case 31:
				return "Specifies the maximum number of items.";
			default:
				return "Not a defined field type";
		}
	};
	/**
	SPECIAL HTML MARKUP CREATION FUNCTIONS
	*/
	// Workhorse function to construct a columns/fields table with optional
	//    controls to view items. All markup is dynamically
	//        built; no HTML markup is required
	// parameters are:
	//   listPropDiv: [required] -- the DIV ID or node
	//   viewPropDiv: [optional] -- DIV id or node for displaying list views and their fields
	//      if not a legitimate ID or node, no views display done
	//   style: [optional] --
	//   styleSheet: need to define
	this.showListPropertiesViews = function (parameters) {
		if (!parameters.listPropDiv)
			throw ".listPropDiv is a required property of the parameters object";
		this.getProperties({
			query: "$expand=Views,Views/ViewFields"
		}).then(function (response) {
			var node, cNode, cNode2, viewsDiv, styleSheet,
				result = response.responseJSON.d,
				propertiesDiv = typeof parameters.listPropDiv == "string" ?
				document.getElementById(parameters.listPropDiv) : parameters.listPropDiv;
			if (!propertiesDiv.id)
				propertiesDiv.id = "list-main-node-id";
			if (parameters.viewPropDiv) {
				viewsDiv = typeof parameters.viewPropDiv == "string" ?
					document.getElementById(parameters.viewPropDiv) : parameters.viewPropDiv;
				buildPropertiesTable(
					propertiesDiv,
					"list-main",
					result,
					false,
					undefined, // insert array of style rules here if necessary
					parameters.styleSheet
				);
			}
			else {
				buildPropertiesTable(
					propertiesDiv,
					"list-main",
					result,
					true,
					undefined, // insert array of style rules here if necessary
					parameters.styleSheet
				);
			}
			styleSheet = iCSS.findStyleSheet("SPServMan");
			styleSheet.insertRule(
				"div#" + propertiesDiv.id + " {" +
				"\n  display:-ms-grid;" +
				"\n  display:grid;" +
				"\n  -ms-grid-columns:auto 1fr;" +
				"\n  grid-template-columns:auto 1fr;"
			);
			// views        
			if (viewsDiv) {
				var i, innerDiv = document.createElement("div");
				viewsDiv.appendChild(innerDiv);
				node = document.createElement("select");
				node.style.bottomMargin = "1em";
				innerDiv.appendChild(node);
				node.id = "list-views-select";
				node.addEventListener("change", function () {
					var properties;
					if (this.value == null || this.value == "")
						return;
					properties = JSON.parse(this.value);
					buildPropertiesTable(
						document.getElementById("view-properties"),
						"views",
						properties,
						false,
						undefined, // insert array of style rules here if necessary
						styleSheet
					);
					document.getElementById("view-fields-panel").style.display = "block";
					buildViewFieldsDisplay(
						document.getElementById("view-fields"),
						JSON.parse(properties.ViewFields).Items.results,
						false
					);
				}, false);
				result = result.Views.results; // array of available views
				for (i = 0; i < result.length; i++) {
					cNode = document.createElement("option");
					node.appendChild(cNode);
					if (i == 0) {
						cNode.appendChild(document.createTextNode(
							"(select a view)"
						));
					}
					else {
						cNode.value = EnhancedJsonStringify(result[i]);
						cNode.appendChild(document.createTextNode(
							result[i].ServerRelativeUrl.match(/([^\/]+)\.aspx/)[1]
						));
					}
				}
				// view fields panel div
				node = document.createElement("div");
				innerDiv.appendChild(node);
				node.id = "view-fields-panel";
				node.style.display = "none";
				node.style.padding = "0.5em 1.5em";
				node.style.border = "1px solid blue";
				cNode = document.createElement("span");
				node.appendChild(cNode);
				cNode.style.float = "right";
				cNode.style.margin = "0 0 1em 2em";
				cNode2 = document.createElement("input");
				cNode.appendChild(cNode2);
				cNode2.type = "checkbox";
				cNode2.addEventListener("change", function () {
					buildViewFieldsDisplay(
						document.getElementById("view-fields"),
						JSON.parse(properties.ViewFields).Items.results,
						this.checked
					);
				}, false);
				cNode.appendChild(document.createTextNode("Show Internal Names"));
				cNode = document.createElement("p");
				node.appendChild(cNode);
				cNode.appendChild(document.createTextNode("View Fields"));
				cNode.style.font = "bold 10pt Verdana,sans-serif";
				cNode.style.margin = "0 0 1em 2em";
				cNode = document.createElement("p");
				node.appendChild(cNode);
				cNode.id = "view-fields";
				styleSheet.insertRule(
					"#view-fields {" +
					"\n  font:normal 11pt 'Courier New',Courier,monospace;" +
					"\n}"
				);
				node = document.createElement("div");
				viewsDiv.appendChild(node);
				node.id = "view-properties";
				styleSheet.insertRule(
					"div#view-properties {" +
					"\n  display:-ms-grid;" +
					"\n  display:grid;" +
					"\n  -ms-grid-columns:auto auto;" +
					"\n  grid-template-columns:auto auto;" +
					"\n}"
				);
				styleSheet.insertRule(
					"div#" + viewsDiv.id + " {" +
					"\n  display:-ms-grid;" +
					"\n  display:grid;" +
					"\n  -ms-grid-columns:auto auto;" +
					"\n  grid-template-columns:auto auto;" +
					"\n}"
				);
			}
			// 'fields' should be an object of SP JSON
			function buildViewFieldsDisplay(node, fields, asInternal) {
				var i, cNode;
				while (node.firstChild)
					node.removeChild(node.firstChild);
				for (i = 0; i < fields.length; i++) {
					if (asInternal == false)
						fields[i] = fields[i].replace(/_x0020_/g, " ");
					node.appendChild(document.createTextNode(fields[i]));
					if (i < fields.length - 1)
						node.appendChild(document.createElement("br"));
				}
			}
		});
	};
	// Workhorse function to take a LIST REST Request instance and construct
	//   columns/fields table with controls to view items. All markup is dynamically
	//   built; no HTML markup is required
	// parameters are:
	//   form: [required] form id or form node, this must be contained in form
	//   div: [required] -- div id or div node, must be contained by form, everything built here
	//   fieldsList: [required] this is an array in order of field guids for the
	//       list that are to be displayed, in the order of the listing
	//   includeControls: [optional] -- will include
	//   style: [optional] --
	//   styleSheet: [optional] -- but will be built if not defined
	//   callback: [optional] -- called when the work is done
	this.buildListFieldsTable = function (parameters) {
		var i, node, cNode, spanNode, formNode,
			divNode, tSectNode, trNode, tdNode, tblNode, fieldsList,
			fieldProps = [];
		if (typeof parameters.form == "string")
			formNode = document.getElementById(parameters.form);
		else
			formNode = parameters.form;
		if (typeof parameters.div == "string")
			divNode = document.getElementById(parameters.div);
		else
			divNode = parameters.div;
		if (!parameters.fieldsList || parameters.fieldsList instanceof Array == false)
			throw "parameters.fieldsList is required & must be array of field guids of list";
		fieldsList = parameters.fieldsList;
		if (parameters.includeControls && parameters.includeControls == true) {
			// ITEM CONTROL PANEL CODE               
			node = document.createElement("p");
			divNode.appendChild(node);
			node.style.margin = 0;
			node.className = "item-control";
			cNode = document.createElement("button");
			node.appendChild(cNode);
			cNode.type = "button";
			cNode.appendChild(document.createTextNode("\u22b2"));
			cNode.addEventListener("click", function () {
				IListRESTRequestInstance.getPreviousListId().then(function (response) {
					IListRESTRequestInstance.fillItemValues(response);
				});
			}, false);
			cNode = document.createElement("input");
			// made a part of the object instance
			this.itemIdInputObject = cNode;
			node.appendChild(cNode);
			cNode.type = "text";
			cNode.name = "ListItemIdDisplay";
			cNode.size = 4;
			cNode.style.textAlign = "center";
			cNode.addEventListener("change", function () {
				IListRESTRequestInstance.fillItemValues(this.value);
			}, false);
			cNode = document.createElement("button");
			node.appendChild(cNode);
			cNode.type = "button";
			cNode.appendChild(document.createTextNode("\u22b3"));
			cNode.addEventListener("click", function () {
				IListRESTRequestInstance.getNextListId().then(function (response) {
					IListRESTRequestInstance.fillItemValues(response);
				});
			}, false);
			node = document.createElement("p");
			divNode.appendChild(node);
			node.style.margin = 0;
			node.appendChild(document.createTextNode("Sort by:"));
			spanNode = document.createElement("span");
			node.appendChild(spanNode);
			spanNode.className = "radio-control";
			cNode = document.createElement("input");
			spanNode.appendChild(cNode);
			cNode.type = "radio";
			cNode.name = "listfieldsort";
			cNode.value = "displayname";
			cNode.addEventListener("change", function () {
				listFieldSort(this.value);
			}, false);
			spanNode.appendChild(document.createTextNode("Display Name"));
			spanNode = document.createElement("span");
			node.appendChild(spanNode);
			spanNode.className = "radio-control";
			cNode = document.createElement("input");
			spanNode.appendChild(cNode);
			cNode.type = "radio";
			cNode.name = "listfieldsort";
			cNode.value = "internalname"
			cNode.addEventListener("change", function () {
				listFieldSort(this.value);
			}, false);
			spanNode.appendChild(document.createTextNode("Internal Name"));
			spanNode = document.createElement("span");
			node.appendChild(spanNode);
			spanNode.className = "radio-control";
			cNode = document.createElement("input");
			spanNode.appendChild(cNode);
			cNode.type = "radio";
			cNode.name = "listfieldsort";
			cNode.value = "fieldtype"
			cNode.addEventListener("change", function () {
				listFieldSort(this.value);
			}, false);
			spanNode.appendChild(document.createTextNode("Type"));
			node = document.createElement("p");
			node.id = "list-invalid-id";
			node.appendChild(document.createTextNode("Invalid ID"));
			divNode.appendChild(node);
			if (parameters.styleSheet)
				parameters.styleSheet.insertRule(
					"span.radio-control {" +
					"\n  display:inline-block;" +
					"\n  font:bold 9pt Arial,sans-serif;" +
					"\n  color:#993;" +
					"\n  padding:0 1em;" +
					"\n}"
				);
			else
				document.getElementsByTagName("style")[0].insertRule(
					"span.radio-control {" +
					"\n  display:inline-block;" +
					"\n  font:bold 9pt Arial,sans-serif;" +
					"\n  color:#993;" +
					"\n  padding:0 1em;" +
					"\n}"
				);
		}
		// ITEM DATA TABLE CODE
		tblNode = document.createElement("table");
		divNode.appendChild(tblNode);
		tblNode.id = "list-item-fields";
		// header building
		tSectNode = document.createElement("thead");
		tblNode.appendChild(tSectNode);
		trNode = document.createElement("tr");
		tSectNode.appendChild(trNode);
		tdNode = document.createElement("th");
		trNode.appendChild(tdNode);
		tdNode.style.width = "25%";
		tdNode.style.marginRight = "3em";
		tdNode.style.fontSize = "24pt";
		tdNode.appendChild(document.createTextNode("Field"));
		node = document.createElement("p");
		tdNode.appendChild(node);
		node.style.display = "inline-block";
		node.style.fontSize = "9pt";
		node.style.marginLeft = "1em";
		cNode = document.createElement("span");
		node.appendChild(cNode);
		cNode.style.backgroundColor = "white";
		cNode.style.color = "blue";
		cNode.appendChild(document.createTextNode("<Display Name>"));
		node.appendChild(document.createElement("br"));
		cNode = document.createElement("span");
		node.appendChild(cNode);
		cNode.style.backgroundColor = "white";
		cNode.style.color = "green";
		cNode.appendChild(document.createTextNode("<Internal Name>"));
		node.appendChild(cNode);
		node.appendChild(document.createElement("br"));
		cNode = document.createElement("span");
		node.appendChild(cNode);
		cNode.style.backgroundColor = "white";
		cNode.style.color = "maroon";
		cNode.appendChild(document.createTextNode("<Type>"));
		node.appendChild(cNode);
		tdNode = document.createElement("th");
		trNode.appendChild(tdNode);
		tdNode.style.fontSize = "24pt";
		tdNode.appendChild(document.createTextNode("Value"));
		// row building
		tSectNode = document.createElement("tbody");
		tblNode.appendChild(tSectNode);
		for (i = 0; i < fieldsList.length; i++)
			fieldProps.push(new RSVP.Promise(function (resolve, reject) {
				IListRESTRequestInstance.getFieldProps({
					fieldGuid: fieldsList[i]
				}).then(function (response) {
					resolve(response.responseJSON.d);
				}).catch(function (response) {
					reject("some kind of error");
				});
			}));
		RSVP.all(fieldProps).then(function (response) {
			var result, node2;
			for (i = 0; i < response.length; i++) {
				// 3 columns: Field, Type, Value
				result = response[i];
				trNode = document.createElement("tr");
				tdNode = document.createElement("td");
				tdNode.className = "field-cell";
				trNode.appendChild(tdNode);
				node = document.createElement("span");
				node.className = "display-name";
				node.appendChild(document.createTextNode(result.Title));
				tdNode.appendChild(node);
				tdNode.appendChild(document.createElement("br"));
				node = document.createElement("span");
				node.className = "internal-name";
				node.appendChild(document.createTextNode(result.InternalName));
				tdNode.appendChild(node);
				//                            tdNode.appendChild(document.createElement("br"));
				node = document.createElement("span");
				node.className = "field-type";
				node.appendChild(document.createTextNode(result.TypeDisplayName));
				tdNode.appendChild(node);
				tdNode = document.createElement("td"); // Value
				tdNode.className = "value-cell";
				trNode.appendChild(tdNode);
				tdNode.id = (IListRESTRequestInstance.listName + "-" + result.InternalName).replace(/\s/g, "-");
				tdNode.appendChild(document.createTextNode("\u00a0"));
				tSectNode.appendChild(trNode);
			}
			tblNode.style.display = "table";
			parameters.styleSheet.insertRule(
				"th {" +
				"\n  color:white;" +
				"\n  background-color:black;" +
				"\n  font:bold 10pt Arial,Helvetica,sans-serif;" +
				"\n}"
			);
			parameters.styleSheet.insertRule(
				"td.field-cell {" +
				"\n  font:normal 10pt Arial,Helvetica,sans-serif;" +
				"\n  border-bottom:1px solid gray;" +
				"\n  text-align:right;" +
				"\n  color:navy;" +
				"\n  padding-right:4px;" +
				"\n}"
			);
			parameters.styleSheet.insertRule(
				"td.value-cell {" +
				"\n  font:normal 12pt \"Courier New\",Courier,monospace;" +
				"\n  border-bottom:1px solid gray;" +
				"\n  white-space:pre-wrap;" +
				"\n}"
			);
			parameters.styleSheet.insertRule(
				"tr {" +
				"\n  border-bottom:1px solid gray;" +
				"\n}"
			);
			parameters.styleSheet.insertRule(
				".display-name {" +
				"\n  color:blue;" +
				"\n  font:bold 10pt Verdana,sans-serif;" +
				"\n}"
			);
			parameters.styleSheet.insertRule(
				".internal-name {" +
				"\n  color:green;" +
				"\n  font:normal 8pt Arial,sans-serif;" +
				"\n  margin-right:1em;" +
				"\n}"
			);
			parameters.styleSheet.insertRule(
				".field-type {" +
				"\n  color:brown;" +
				"\n  font:normal 8pt Arial,sans-serif;" +
				"\n}"
			);
			parameters.styleSheet.insertRule(
				".item-control button, .item-control input {" +
				"\n  margin:0;" +
				"\n}"
			);
			parameters.styleSheet.insertRule(
				"p#list-invalid-id  {" +
				"\n  font:bold 9pt Arial,Helvetica,sans-serif;" +
				"\n  color:red;" +
				"\n  margin-left:2em;" +
				"\n  display:inline-block;" +
				"\n}"
			);
			IListRESTRequestInstance.getFirstListId().then(function (response) {
				IListRESTRequestInstance.fillItemValues(response);
			});
			divNode.style.display = "block";
			if (parameters.callback)
				parameters.callback();
		});
	};
	// Support for buildListFieldsTable() method
	//   when passed a valid item ID from list, will retrieve values and fill the
	//    the "Values" column of the table
	// The TD cells are found using 'id' attributes of the dynamically built TD elements
	// itemId: a required parameter, invalid IDs throw errors
	this.fillItemValues = function (itemId) {
		var query = this.baseTemplate == "101" ? "$expand=FieldValuesAsText" : "";
		// baseTemplate ID: [101: doc lib, 120: custom list]
		this.isValidID(itemId).then(function (response) {
			var node = document.getElementById("list-invalid-id");
			if (response == false) {
				if (node)
					node.style.display = "inline-block";
				var i, nodes = document.querySelectorAll("[id^='" +
					IListRESTRequestInstance.listName.replace(/\s/g, "-") + "']");
				for (i = 0; i < nodes.length; i++)
					if (nodes[i].firstChild)
						nodes[i].replaceChild(document.createTextNode("\u00a0"), nodes[i].firstChild);
				return;
			}
			else if (node)
				node.style.display = "none";
			IListRESTRequestInstance.getListItemData({
				itemId: itemId,
				query: query
			}).then(function (response) {
				var nodeId, txtNode, prop, noUnderscoreProp, obj,
					result = [response.responseJSON.d, response.responseJSON.d.FieldValuesAsText];
				if (IListRESTRequestInstance.setCurrentListId(itemId) == false)
					throw "Problem setting index for current list IDs";
				for (i = 0; i < result.length; i++) {
					if (!(obj = result[i]))
						break;
					for (prop in obj) {
						noUnderscoreProp = prop.replace(/_x005f_/g, "_");
						nodeId = (IListRESTRequestInstance.listName + "-" + noUnderscoreProp).replace(/\s/g, "-");
						if ((node = document.getElementById(nodeId)) != null &&
							!(i > 0 && noUnderscoreProp in result[i - 1])) {
							if (prop.search(/date/i) >= 0 || (typeof obj[prop] == "string" &&
									obj[prop].search(/\d{4}-\d{2}-\d{2}T/) >= 0))
								obj[prop] = sharePointDateFormat(new Date(obj[prop]));
							if (typeof obj[prop] == "object")
								obj[prop] = obj[prop] == null ? "null" : EnhancedJsonStringify(obj[prop], null, "  ");
							else if (obj[prop] == "")
								obj[prop] = "<zero-length string>";
							if (node.firstChild && node.firstChild.nodeType == Node.ELEMENT_NODE) {
								if (node.firstChild.nodeName.toLowerCase() == "input" ||
									node.firstChild.nodeName.toLowerCase() == "textarea")
									node.firstChild.value = obj[prop];
								else if (node.firstChild.nodeName.toLowerCase() == "select") {
									var j,
										options = node.firstChild.options,
										selnode = node.firstChild;
									for (j = 0; j < options.length; j++)
										if (options[j].value == obj[prop] ||
											options[j].firstChild.data == obj[prop])
											break;
									if (j == options.length) {
										node = document.createElement("option");
										node.appendChild(document.createTextNode(obj[prop]));
										node.value = obj[prop];
										if (options.length == 0)
											selnode.insertBefore(node, selnode.firstChild);
										else
											selnode.appendChild(node);
										selnode.selectedIndex = 0;
									}
									else
										selnode.selectedIndex = options[j].index;
								}
							}
							else if (node.firstChild != null)
								node.replaceChild(document.createTextNode(obj[prop]), node.firstChild);
							else
								node.appendChild(document.createTextNode(obj[prop]));
						}
					}
				}
				IListRESTRequestInstance.itemIdInputObject.value = itemId;
			}).catch(function (response) {
				console.log(EnhancedJsonStringify(response, null, "  "));
				throw "Error in response to loadItem() call. See console log";
			});
		}).catch(function (response) {
			// valid ID issue
		});
	};
	/*      
	iListRESTReq.getListItemCount().then(function (itemCount) {
	var prop;
	iListRESTReq.getListIds().then(function (listIds) {
	if (listIds.length != itemCount) {
	formObj.TotalItems.className += " input-red";
	formObj.IdCount.className += " input-red";
	} else {
	formObj.TotalItems.className =
	formObj.TotalItems.className.replace(/ input-red/, "");
	formObj.IdCount.className =
	formObj.IdCount.className.replace(/ input-red/, "");
	}
	formObj.TotalItems.value = itemCount;
	formObj.FirstItemId.value = listIds[0] ? listIds[0] : "--";
	formObj.LastItemId.value = listIds[listIds.length - 1] ?
	listIds[listIds.length - 1] : "--";
	prop = String(iListRESTReq.baseTemplate);
	formObj.ListType.value = ListTemplates[prop] + " (" + prop + ")";
	formObj.ListName.value = iListRESTReq.listName;
	formObj.ListUrl.value = iListRESTReq.relativeUrl;
	formObj.IdCount.value = listIds.length;
	});
	});
	});
	*/
} // end brace of IListRESTRequest class
// USEFUL SUPPORT FUNCTION
function buildPropertiesTable(
	divNode,
	uniqueTableName,
	properties,
	includeViewsProperty,
	style,
	styleSheet
) {
	var i, pNode, node, propertiesElems, prop, strings, styleSheet,
		propertyFontSize = 10, // point size of the property names
		propertyValueFontSize = 11, // point size of property values
		urlExtract = /"(\w+)"\s*:\s*"(https?:\/\/[\da-z\.-]+\/[^\s\(']+[^,]+)"|"(\w+)"\s*:\s*"([\w\.]+|\\"\d*\\")"/g;
	// remove the old properties
	if (propertiesElems = document.querySelectorAll("p." + uniqueTableName + "-property"))
		for (i = 0; i < propertiesElems.length; i++)
			propertiesElems[i].parentNode.removeChild(propertiesElems[i]);
	if (propertiesElems = document.querySelectorAll("p." + uniqueTableName + "-prop-value"))
		for (i = 0; i < propertiesElems.length; i++)
			propertiesElems[i].parentNode.removeChild(propertiesElems[i]);
	// table building
	for (prop in properties) {
		pNode = document.createElement("p");
		pNode.className = uniqueTableName + "-property";
		pNode.appendChild(document.createTextNode(prop));
		divNode.appendChild(pNode);
		pNode = document.createElement("p");
		if (includeViewsProperty == false && prop == "Views") {
			pNode.appendChild(document.createTextNode(
				"Values of property 'Views' is shown in separate" +
				" fieldset below"
			));
			pNode.style.color = "#601";
			divNode.appendChild(pNode);
			continue;
		}
		pNode.className = uniqueTableName + "-prop-value";
		if (typeof properties[prop] == "object" && properties[prop] != null) {
			if (JSON.getValue(properties[prop], "__deferred") != null)
				properties[prop] = JSON.getValue(properties[prop], "__deferred");
			properties[prop] = EnhancedJsonStringify(properties[prop], null, "  ");
			if ((strings = properties[prop].match(urlExtract)) != null) {
				if (strings.length > 0) {
					var parts;
					pNode.appendChild(document.createTextNode("{ "));
					for (i = 0; i < strings.length; i++) {
						parts = strings[i].split(":");
						pNode.appendChild(document.createTextNode(parts[0] + ":"));
						if (parts[1].search(/\s*"https/) == 0)
							pNode.appendChild(makeAnchor(parts[1] + ":" + parts[2]));
						else
							pNode.appendChild(document.createTextNode(parts[1]));
						if (i < strings.length - 1)
							pNode.appendChild(document.createTextNode(", "));
					}
					pNode.appendChild(document.createTextNode(" }"));
					pNode.style.fontSize = "9pt";
				}
				else {
					pNode.appendChild(document.createTextNode(strings[1]));
					pNode.appendChild(makeAnchor(parts[2]));
				}
			}
			else
				pNode.appendChild(document.createTextNode(properties[prop]));
		}
		else if (typeof properties[prop] == "string") {
			// date string
			if (properties[prop].search(/\d{4}\-\d{2}\-\d{2}T\d{2}:\d{2}:\d{2}Z/) >= 0)
				pNode.appendChild(document.createTextNode(
					formatDateTime(new Date(properties[prop]), "d mmm yyyy hh:mm")));
			else { // regular string
				pNode.appendChild(document.createTextNode(properties[prop]));
				if (properties[prop].length > 80) {
					pNode.style.maxHeight = (propertyValueFontSize * 3.8) + "pt";
					pNode.style.fontSize = "9pt";
				}
				if (properties[prop].length > 240)
					pNode.style.overflowY = "scroll";
			}
		}
		else // unknown type?
			pNode.appendChild(document.createTextNode(properties[prop]));
		divNode.appendChild(pNode);
	}
	// add CSS
	/* set p nodes with
	class = 'uniqueTableName + "-property" ' with default style
	font:normal 10pt Arial,Helvetica,sans-serif;border-bottom:1px solid gray;
	border-right:1px dotted silver;text-align:right;color:navy;padding:0 8px 0 0;margin:0;
	class = 'uniqueTableName + "-prop-value" ' with default style
	font:normal 9pt "Courier New",Courier,monospace;border-bottom:1px solid gray;
	white-space:pre-wrap;padding:0;margin:0;
	*/
	if (style) {
		for (i = 0; i < style.length; i++)
			styleSheet.insertRule(style[i]);
	}
	else {
		styleSheet.insertRule(
			"p." + uniqueTableName + "-property {" +
			"\n  font:normal " + propertyFontSize +
			"pt Arial,Helvetica,sans-serif;" +
			"\n  border-bottom:1px solid gray;" +
			"\n  border-right:1px dotted silver;" +
			"\n  text-align:right;" +
			"\n  color:navy;" +
			"\n  padding:0 8px 0 0;" +
			"\n  margin:0;" +
			"\n}"
		);
		styleSheet.insertRule(
			"p." + uniqueTableName + "-prop-value {" +
			"\n  font:normal " + propertyValueFontSize +
			"pt \"Courier New\",Courier,monospace;" +
			"\n  border-bottom:1px solid gray;" +
			"\n  white-space:pre-wrap;" +
			"\n  padding:0;" +
			"\n  margin:0;" +
			"\n}"
		);
	}
}
/**
LIST FIELD PROPERTIES
CanBeDeleted           Gets a value that specifies whether the field can be deleted.
Context                                        Returns the context that is associated with the client object. (Inherited from ClientObject.)
DefaultValue             Gets or sets a value that specifies the default value for the field.
Description                         Gets or sets a value that specifies the description of the field.
Direction                            Gets or sets a value that specifies the reading order of the field.
EnforceUniqueValues <missing>
FieldTypeKind           Gets or sets a value that specifies the type of the field.
Filterable                            Gets a value that specifies whether list items in the list can be filtered by the field value.
FromBaseType                    Gets a Boolean value that indicates whether the field derives from a base field type.
Group                                          Gets or sets a value that specifies the field group.
Hidden                               Gets or sets a value that specifies whether the field is hidden in list views and list forms.
Id                                                           Gets a value that specifies the field identifier.
InternalName           Gets a value that specifies the field internal name.
ObjectData                         Gets the object data for the current client object. (Inherited from ClientObject.)
ObjectVersion           Gets a string that indicates the version of the current client object.
This member is reserved for internal use and is not intended to be used directly
from your code. (Inherited from ClientObject.)
Path                                             Tracks how a client object is created in the ClientRuntimeContext class,
so that the object can be re-created on the server. This member is
reserved for internal use and is not intended to be used directly from
your code. (Inherited from ClientObject.)
ReadOnlyField          Gets or sets a value that specifies whether the value of the field is read-only.
Required                                      Gets or sets a value that specifies whether the field requires a value.
SchemaXml                        Gets or sets a value that specifies the XML schema that defines the field.
Scope                                           Gets a value that specifies the server-relative URL of the list or the site
that the field belongs to.
Sealed                               Gets a value that specifies whether properties on the field cannot
be changed and whether the field cannot be deleted.
ServerObjectIsNull    Gets the server object and returns null if the server object is null.
(Inherited from ClientObject.)
Sortable                                       Gets a value that specifies whether list items in the list
can be sorted by the field value.
StaticName                         Gets or sets a value that specifies a customizable identifier of the field.
Tag                                              Gets or sets data that is associated with the client object.
(Inherited from ClientObject.)
Title                                             Gets or sets value that specifies the display name of the field.
TypeAsString            Gets or sets a value that specifies the type of the field.
TypeDisplayName     Gets a value that specifies the display name for the type of the field.
TypeShortDescription          Gets a value that specifies the description for the type of the field.
ValidationFormula     Gets or sets a value that specifies the data validation criteria
for the value of the field.
ValidationMessage    Gets or sets a value that specifies the error message returned
when data validation fails for the field.
*/