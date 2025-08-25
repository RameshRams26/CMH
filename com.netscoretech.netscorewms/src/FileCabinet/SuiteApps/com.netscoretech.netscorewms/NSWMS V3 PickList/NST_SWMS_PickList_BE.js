/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
  "N/search",
  "N/query",
  "N/file",
  "N/record",
  "../NSWMS V3 Globals/utility_module",
], (search, query, file, record, utility) => {
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
        log.debug({
          title: "parameters",
          details: JSON.stringify(params),
        });
        var response = {};
        if (params["ref"] == "getSetUpData") {
          response["setUpData"] = utility.getSetUpRecordData(params["setUpId"]);
          response["locationObj"] = utility.fieldLookUp(
            "location",
            params["locationId"],
            ["name"]
          );
        } else if (params["ref"] == "getOrders") {
          response["OrdersListSoTo"] = getOrdersListSoTo(
            params["locationId"],
            params["empId"],
            params["assigned"]
          );
        }      
        scriptContext.response.write(JSON.stringify(response));
     
      
    } else {
        var params = scriptContext.request.parameters;
        var body = JSON.parse(scriptContext.request.body);
        var response = {};
        scriptContext.response.write(JSON.stringify(response));
      
    }
    function getOrdersListSoTo(locationId, empId, assigned) {
      try {
        log.debug('locationId', locationId);
        var soData = {
          ordersList: [],
        };
        log.debug('assigned', assigned);
        var transactionSearchObj = search.create({
          type: 'transaction',
          filters: [
            ['type', 'anyof', 'TrnfrOrd', 'SalesOrd'],
            'AND',
            ['location', 'anyof', locationId],
            'AND',
            ['status', 'anyof', 'SalesOrd:B', 'SalesOrd:D', 'SalesOrd:E', 'TrnfrOrd:B', 'TrnfrOrd:E', 'TrnfrOrd:D'],
          ],
          columns: [
            search.createColumn({
              name: 'tranid',
              summary: 'GROUP',
              label: 'Document Number',
            }),
            search.createColumn({
              name: 'internalid',
              summary: 'GROUP',
              label: 'Internal ID',
            }),
            // search.createColumn({
            //   name: "entity",
            //   summary: "GROUP",
            //   label: "Customer",
            // }),
            search.createColumn({
              name: 'trandate',
              summary: 'GROUP',
              label: 'Date',
            }),
            search.createColumn({
              name: 'type',
              summary: 'GROUP',
              label: 'Type',
            }),
          ],
        });
        var searchResultCount = transactionSearchObj.runPaged().count;
        log.debug('transactionSearchObj result count', searchResultCount);
        transactionSearchObj.run().each(function (result) {
          const salesOrderdata = new Object();
          salesOrderdata['docNumber'] = result.getValue({
            name: 'tranid',
            summary: 'GROUP',
            label: 'Document Number',
          });
          salesOrderdata['docNumberId'] = result.getValue({
            name: 'internalid',
            summary: 'GROUP',
            label: 'Internal ID',
          });
          // salesOrderdata["customerNames"] = result.getValue({
          //   name: "entity",
          //   summary: "GROUP",
          //   label: "Customer",
          // });
          salesOrderdata['Type'] = result.getText({
            name: 'type',
            summary: 'GROUP',
            label: 'Type',
          });
          salesOrderdata['dates'] = result.getValue({
            name: 'trandate',
            summary: 'GROUP',
            label: 'Date',
          });
          //salesOrderdata["checkbox"] = result[j].values[6];
          //salesOrderdata["emp"] = result[j].values[7];

          soData.ordersList.push(salesOrderdata);
          log.debug('soData', soData);
          return true;
        });
        return soData;
      } catch (e) {
        log.error('error in getOrdersListSoTo ', e);
        var response = { status: 'error', message: e.message };
        return response;
      }
      
    }
  };

  return {
    onRequest: onRequest,
  };
});
