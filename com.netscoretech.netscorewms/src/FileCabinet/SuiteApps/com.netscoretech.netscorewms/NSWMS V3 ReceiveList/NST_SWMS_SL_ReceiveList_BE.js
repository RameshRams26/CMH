/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
  "N/search",
  "N/file",
  "N/record",
  "../NSWMS V3 Globals/utility_module",
], /**
 * @param{https} https
 * @param{search} search
 * @param{url} url
 */ (search, file, record, utility) => {
    /**
     * Defines the Suitelet script trigger point.
     * @param {Object} scriptContext
     * @param {ServerRequest} scriptContext.request - Incoming request
     * @param {ServerResponse} scriptContext.response - Suitelet response
     * @since 2015.2
     */
    const onRequest = (scriptContext) => {
      if (scriptContext.request.method === "GET") {
        var params = scriptContext.request.parameters;
        var response = {};
        if (params["ref"] == "getSetUpData") {
          response["locationObj"] = utility.fieldLookUp(
            "location",
            params["locationId"],
            ["name"]
          ); //get Location name from SetupRecord
          var locationId = params["locationId"];
          log.debug("locationId", locationId)
          var poReceiveList = getPoReceiveList(locationId);
          response["poReceivesIFs"] = poReceiveList;
        }

        scriptContext.response.write(JSON.stringify(response));
      } else {
        var params = scriptContext.request.parameters;
        var body = JSON.parse(scriptContext.request.body);
        var response = {};
        if (params["ref"] == "imageUpload") {
        }

        scriptContext.response.write(JSON.stringify(response));
      }
      function getPoReceiveList(locationId) {
        log.debug("location Enter", locationId)
        var receiveList = [];

        var transactionSearchObj = search.create({
          type: "transaction",
          filters:
            [
              ["type", "anyof", "RtnAuth", "PurchOrd", "TrnfrOrd"],
              "AND",
              // ["location","anyof",locationId], 
              //  "AND", 
              // ["status","anyof","RtnAuth:B","PurchOrd:D","PurchOrd:E","PurchOrd:B","TrnfrOrd:F","TrnfrOrd:E","TrnfrOrd:D"], 
              //  "AND", 
              ["quantity", "greaterthan", "0"],
              "AND",
              ["mainline", "is", "F"],
              "AND",
              [
                [
                  [
                    ["type", "anyof", "TrnfrOrd"],
                    "AND",
                    ["transferlocation", "anyof", locationId],
                    "AND",
                    ["status", "anyof", "TrnfrOrd:F", "TrnfrOrd:E", "TrnfrOrd:D"],
                  ],
                ],
                  "OR",
                  [
                    [
                      ["type", "anyof", , "PurchOrd", "RtnAuth"],
                      "AND",
                      ["location", "anyof", locationId],
                      "AND",
                      ["status", "anyof", "RtnAuth:B", "PurchOrd:D", "PurchOrd:E", "PurchOrd:B"],
                    ],
                   
                  ],
                
                ],
            ],
          columns:
            [
              search.createColumn({ name: "tranid", summary: "GROUP", label: "Document Number" }),
              search.createColumn({ name: "entityid", join: "vendor", summary: "GROUP", label: "Name" }),
              search.createColumn({ name: "recordtype", summary: "GROUP", label: "Record Type" }),
              search.createColumn({ name: "trandate", summary: "GROUP", label: "Date" }),
              search.createColumn({ name: "entity", summary: "GROUP", label: "Customer" }),
              //search.createColumn({name: "custbody_to_fromlocation",summary: "GROUP",label: "From Location"}),
              search.createColumn({ name: "location", summary: "GROUP", label: "From To Location" }),
              search.createColumn({ name: "transferlocation", summary: "GROUP", label: "To Location" }),
            ]
        });
        var searchResultCount = transactionSearchObj.runPaged().count;
        log.debug("transactionSearchObj  result count", searchResultCount);
        var seenOrders = new Set();
        transactionSearchObj.run().each(function (result) {
          var orderNo = result.getValue({ name: "tranid", summary: "GROUP" });

          // If this order number was already processed, skip it
          if (seenOrders.has(orderNo)) {
            return true;
          }
          
          seenOrders.add(orderNo);
          var receiveObj = {};
          //receiveObj["orderNo"] = result.getValue({ name: "tranid", summary: "GROUP", label: "Document Number" });
          receiveObj["orderNo"] = orderNo;
          receiveObj["vendorName"] = result.getValue({ name: "entityid", join: "vendor", summary: "GROUP", label: "Name" });
          receiveObj["recordType"] = result.getValue({ name: "recordtype", summary: "GROUP", label: "Record Type" });
          receiveObj["date"] = result.getValue({ name: "trandate", summary: "GROUP", label: "Date" });
          receiveObj["customer"] = result.getValue({ name: "entity", summary: "GROUP", label: "Customer" });
          receiveObj["customername"] = result.getText({ name: "entity", summary: "GROUP", label: "Customer" });
          receiveObj["fromlocation"] = result.getValue({ name: "location", summary: "GROUP", label: "From To Location" });
          receiveObj["fromlocationText"] = result.getText({ name: "location", summary: "GROUP", label: "From To Location" });
          receiveObj["toLocationText"] = result.getText({ name: "transferlocation", summary: "GROUP", label: "To Location" });

          receiveList.push(receiveObj)
          //log.debug("receiveList",JSON.stringify(receiveList))
          return true;
        });
        return receiveList;
      }
    };
    return { onRequest };
  });
