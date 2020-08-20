/*  SP User via REST
How to get the current user:
getSharePointCurrentUserInfo().then(function (response) {
response is IUserInfo object!
});
How to get info on another user by ID:
getSharePointUserInfo({
userId: <id-value>
}).then(function (response) {
response is IUserInfo object!
});
How to get info on another user by name:
getSharePointUserInfo({
firstName: "firstName",
lastName: "lastName"
}).then(function (response) {
response is IUserInfo object!
});
How to get info on all users through siteuserinfolist:
getAllSharePointUsersInfo({
server: [required]
query: [ optional ]
}).then(function (response) {
response is results array of all users
});
*/
function getSharePointCurrentUserInfo() {
	return new RSVP.Promise(function (resolve, reject) {
		var iUserRequest = new IUserRESTRequest({
				server: "mdsd"
			}),
			iUserInfo = new IUserInfo({});
		iUserInfo.populateUserData(iUserRequest).then(function (response) {
			resolve(response);
		}).catch(function (response) {
			reject(null);
		});
	});
}

function getSharePointUserInfo(parameters) {
	return new RSVP.Promise(function (resolve, reject) {
		var iUserRequest = new IUserRESTRequest({
				server: "mdsd"
			}),
			iUserInfo;
		if (parameters.userId)
			iUserInfo = new IUserInfo({
				userId: parameters.userId
			});
		else
			iUserInfo = new IUserInfo({
				firstName: parameters.firstName,
				lastName: parameters.lastName
			});
		iUserInfo.populateUserData(iUserRequest).then(function (response) {
			resolve(response);
		}).catch(function (response) {
			reject(null);
		});
	});
}
var CollectedResults;

function getAllSharePointUsersInfo(parameters) {
	return new RSVP.Promise(function (resolve, reject) {
		$.ajax({
			method: "GET",
			url: parameters.url ? parameters.url : "https://" + parameters.server + "/_api/web/siteuserinfolist/items" +
				(parameters.query ? "?" + parameters.query : ""),
			headers: {
				"Content-Type": "application/json;odata=verbose",
				"Accept": "application/json;odata=verbose"
			},
			success: function (responseJSON, responseStatus, promiseObj) {
				if (!CollectedResults)
					CollectedResults = responseJSON.d.results;
				else
					CollectedResults = CollectedResults.concat(responseJSON.d.results);
				if (responseJSON.d.__next)
					resolve(getAllSharePointUsersInfo({
						url: responseJSON.d.__next
					}));
				else
					resolve(CollectedResults);
			},
			error: function (promiseObj, responseStatus, responseMessage) {
				reject(responseMessage);
			}
		});
	});
}
/** @function IUserInfo -- class to store user information from the SharePoint system
 *  @param  {object} search
 *       {object} [required] any of the following property combinations will be evaluated
 *          {} - empty object: current user info will be returned
 *                                      {.userId: <valid-numeric-ID-for-user> }  user whose ID is used will have info returned
 *                                      {.lastName: "<last-name>" }   first user with that last name will be returned
 *                                      {.lastName: "<last-name>", .firstName: "<first-name>" }
 *          {.debugging: true...sets for debugger}
 */
function IUserInfo(search) {
	var thisInstance = this;
	this.search;
	this.userId; // numeric SP ID
	this.loginName; //i:0#.w|domain\\user name
	this.title; // "<last name>, <first name> <org>
	this.email;
	this.emailAddress;
	this.userName;
	this.firstName;
	this.lastName;
	this.workPhone;
	this.created;
	this.modified;
	this.jobTitle;
	this.dataComplete = false;
	this.debugging = search.debugging ? search.debugging : false;
	//        storeData = storeDataEx.bind(null, this);
	if (!search || typeof search != "object")
		throw "Input to the constructor must include a search property with defined object: { .search: {...} }";
	this.search = search;
	if (search.id)
		this.search.userId = search.id;
	this.populateUserData = function (userRestReqObj) {
		if (this.debugging == true) {
			this.reqObjGuid = userRestReqObj.guid;
			console.log("IUserInfo.populateUserData(IUserRESTRequest) call:" +
				"\n         IUserInfo.guid = " + this.guid +
				"\n  IUserRESTRequest.guid = " + userRestReqObj.guid +
				(this.userId ? "\n              search.userId = " + this.userId : ""));
		}
		return new RSVP.Promise(function (resolve, reject) {
			if (thisInstance.search.userId)
				userRestReqObj.requestUserInfo({
					uiObject: thisInstance,
					type: TYPE_ID,
					args: {
						userId: thisInstance.search.userId
					}
				}).then(function (response) {
					resolve(storeData(response.uiObject, response.result));
				}).catch(function (response) {
					reject(console.log(JSON.stringify(response, null, "  ")));
				});
			else if (thisInstance.search.lastName) {
				if (thisInstance.search.firstName)
					userRestReqObj.requestUserInfo({
						uiObject: thisInstance,
						type: TYPE_FULL_NAME,
						args: {
							lastName: thisInstance.search.lastName,
							firstName: thisInstance.search.firstName
						}
					}).then(function (response) {
						resolve(storeData(response.uiObject, response.result));
					}).catch(function (response) {
						reject(console.log(JSON.stringify(response, null, "  ")));
					});
				else
					userRestReqObj.requestUserInfo({
						uiObject: thisInstance,
						type: TYPE_LAST_NAME,
						args: {
							lastName: thisInstance.search.lastName
						}
					}).then(function (response) {
						resolve(storeData(response.uiObject, response.result));
					}).catch(function (response) {
						reject(console.log(JSON.stringify(response, null, "  ")));
					});
			}
			else
				userRestReqObj.requestUserInfo({
					uiObject: thisInstance,
					type: TYPE_CURRENT_USER
				}).then(function (response) {
					resolve(storeData(response.uiObject, response.result));
				}).catch(function (response) {
					reject(console.log(JSON.stringify(response, null, "  ")));
				});
		});
	};

	function storeData(userInfoObj, userData) {
		userInfoObj.email = userInfoObj.emailAddress = userData.EMail;
		userInfoObj.userId = userData.Id;
		userInfoObj.loginName = userData.Name;
		userInfoObj.title = userData.Title;
		userInfoObj.jobTitle = userData.JobTitle;
		userInfoObj.lastName = userData.LastName;
		userInfoObj.firstName = userData.FirstName;
		userInfoObj.workPhone = userData.WorkPhone;
		userInfoObj.userName = userData.UserName;
		userInfoObj.created = userData.Created;
		userInfoObj.modified = userData.Modified;
		userInfoObj.dataComplete = true;
		if (userInfoObj.debugging == true)
			console.log("IUserInfo.storeData() call:" +
				"\n    IUserInfo.guid = " + userInfoObj.guid
			);
		return userInfoObj;
	}
	this.getFullName = function () {
		return this.firstName + " " + this.lastName;
	};
	this.getLastName = function () {
		return this.lastName;
	};
	this.getFirstName = function () {
		return this.firstName;
	};
	this.getUserId = function () {
		return this.userId;
	};
	this.getUserLoginName = function () {
		return this.loginName;
	};
	this.getUserEmail = function () {
		return this.emailAddress;
	};
	if (this.debugging == true)
		this.guid = createGuid();
}
var TYPE_CURRENT_USER = 0,
	TYPE_ID = 1,
	TYPE_LAST_NAME = 2,
	TYPE_FULL_NAME = 3;
/** @function IUserRESTRequest -- class to set up REST interface to get user info on SharePoint server
 *  @param {object} the following properties are defined
 *        .protocol {string} [optional]...either "http" (default used) or "https"
 *        .server  {string} [required]   domain name of server
 *        .site {string} [optional]  site within server site collection, empty string is default
 *        .debugging {boolean}  if true, set to debugging
 */
function IUserRESTRequest(parameters) {
	var response, filter,
		IListRESTRequestInstance = this;
	if (!parameters.server)
		throw "Input to the constructor must include a server property: { .server: <string> }";
	this.protocol = parameters.protocol ? parameters.protocol : "https";
	this.server = parameters.server;
	this.site = parameters.site ? parameters.site : "";
	this.debugging = parameters.debugging ? parameters.debugging : false;
	UrlPrefix = (this.protocol.search(/:\/\//) < 0 ? this.protocol + "://" :
			this.protocol) + this.server + "/" +
		(this.site.length > 0 ? this.site + "/" : "");
	/** @method  .requestUserInfo -- class to set up REST interface to get user info on SharePoint server
	 *  @param {object} has following properties
	 *                              .uiObject: {IUserInfo object} [required] need to associate
	 *           .type: {numeric} required to be TYPE_ID, TYPE_LAST_NAME, TYPE_FULL_NAME
	 *           .args: {object} optional. depends on .type setting, properties should be
	 *                 .id: {numeric} ID of user on SP system
	 *                 .lastName: {string}  present if TYPE_LAST_NAME or TYPE_FULL_NAME
	 *                 .firstName: {string}  must be present if TYPE_FULL_NAME
	 */
	this.requestUserInfo = function (parameters) {
		if (parameters.uiObject instanceof IUserInfo == false)
			throw "IUserRESTRequest.requestUserInfo(): missing 'uiObject' parameter or parameter not IUserInfo class";
		return new RSVP.Promise(function (resolve, reject) {
			var filter;
			if (parameters.type == TYPE_CURRENT_USER)
				IListRESTRequestInstance.processRequest({
					url: UrlPrefix + "_api/web/currentuser"
				}).then(function (response) {
					IListRESTRequestInstance.processRequest({
						url: UrlPrefix + "_api/web/siteuserinfolist/items(" +
							response.responseObj.d.Id + ")"
					}).then(function (response) {
						resolve({
							uiObject: parameters.uiObject,
							result: response.responseObj.d
						});
					}).catch(function (response) {
						reject(response);
					});
				}).catch(function (response) {
					// need something here                                               
				});
			else if (parameters.type == TYPE_ID)
				IListRESTRequestInstance.processRequest({
					url: UrlPrefix + "_api/web/siteuserinfolist/items(" +
						parameters.args.userId + ")"
				}).then(function (response) {
					resolve({
						uiObject: parameters.uiObject,
						result: response.responseObj.d
					});
				}).catch(function (response) {
					reject(response);
				});
			else { // type == TYPE_FULL_NAME or TYPE_LAST_NAME
				filter = "$filter=lastName eq '" + parameters.args.lastName + "'";
				if (parameters.tyep == TYPE_FULL_NAME)
					filter += " and firstName eq '" + parameters.args.firstName + "'";
				IListRESTRequestInstance.processRequest({
					url: UrlPrefix + "_api/web/siteuserinfolist/items?" +
						filter
				}).then(function (response) {
					resolve({
						uiObject: parameters.uiObject,
						result: response.responseObj.d
					});
				}).catch(function (response) {
					reject(response);
				});
			}
		});
	};
	this.processRequest = function (parameters) {
		return new RSVP.Promise(function (resolve, reject) {
			$.ajax({
				method: parameters.method ? parameters.method : "GET",
				url: parameters.url,
				/*
				beforeSend: function () {
				if (parameters.needDigest && parameters.needDigest == true)
				this.headers["X-RequestDigest"] = this.getDigestValue();
				},
				*/
				headers: {
					"Content-Type": "application/json;odata=verbose",
					"Accept": "application/json;odata=verbose"
				},
				success: function (responseJSON, responseStatus, promiseObj) {
					if (IListRESTRequestInstance.debugging == true) {
						console.log(
							"\n=== HTTP Response: SUCCESS ===" +
							"\ncode: " + promiseObj.status +
							"\nResponse Obj [JSON]: " +
							JSON.stringify(responseJSON, null, "  ") +
							"\nrequest URL: " + this.url
						);
					}
					resolve({
						responseObj: responseJSON,
						responseStatus: responseStatus,
						promiseObj: promiseObj,
						reqObj: this,
					});
				},
				error: function (promiseObj, responseStatus, responseMessage) {
					if (IListRESTRequestInstance.debugging == true) {
						console.log(
							"\n=== HTTP Response: ERROR ===" +
							"\ncode: " + promiseObj.status +
							"\nmessage: " + responseMessage + ": " +
							"\nrequest URL: " + this.url
						);
					}
					reject({
						responseObj: promiseObj.responseJSON,
						responseStatus: responseStatus,
						responseMessage: responseMessage,
						reqObj: this,
					});
				}
			});
		});
	};
	if (this.debugging == true) {
		this.guid = createGuid();
		console.log("Object IUserRESTRequest created" +
			"\nGUID: " + this.guid);
	}
}