"use strict";

// SP-REST-API-utility.js

function constructQueryParameters(parameters) {

          var query = "";

 

          if (!parameters)

                     return null;

          if (!parameters.query) {

                     if (parameters.select)

                               if (parameters.select instanceof Array == true)

                                         // [field1,field2,field3]

                                         query += parameters.select.join(",");

                               else

                                         query += parameters.select.search(/\s*\$select=/) == 0

                                                   ? parameters.select : "$select=" + parameters.select;

                     if (parameters.filter)

                               query += parameters.filter.search(/\s*\$filter=/) == 0

                                                   ? parameters.filter : "$filter=" + parameters.filter;

                     if (parameters.expand)

                               query += parameters.expand.search(/\s*\$expand=/) == 0

                                                   ? parameters.expand : "$expand=" + parameters.expand;

          } else

                     query = parameters.query;

          query = query.charAt(0) == "?" ? query : "?" + query;

          return query;

}

 

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

 

 