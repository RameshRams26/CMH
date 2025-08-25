/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(["N/search", "N/record", "../NSWMS V3 Globals/utility_module"], (
  search,
  record,
  utility
) => {
  const onRequest = (scriptContext) => {
    if (scriptContext.request.method === "GET") {
      var params = scriptContext.request.parameters;
      var response = {};
      if (params["ref"] == "getSetUpData") {
        response["setUpData"] = utility.getSetUpRecordData(params["setUpId"]);
        response["locationObj"] = utility.fieldLookUp(
          "location",
          params["locationId"],
          ["name"]
        );
        response["invenoryCountList"] = getInvenoryCountList(
          params["locationId"]
        );
      }
      scriptContext.response.write(JSON.stringify(response));
    } else {
      var params = scriptContext.request.parameters;
      var body = JSON.parse(scriptContext.request.body);
      var response = {};

      scriptContext.response.write(JSON.stringify(response));
    }
  };
  const getInvenoryCountList = (locationId) => {
    var dataObj = {};
    var inventorycountSearchObj = search.create({
      type: "inventorycount",
      filters: [
        ["type", "anyof", "InvCount"],
        "AND",
        ["status", "anyof", "InvCount:B"],
        "AND",
        ["mainline", "is", "T"],
        "AND",
        ["location", "anyof", locationId],
      ],
      columns: [
        search.createColumn({
          name: "tranid",
          label: "Document Number",
        }),
        search.createColumn({ name: "trandate", label: "Date" }),
        search.createColumn({
          name: "internalid",
          sort: search.Sort.DESC,
          label: "Date",
        }),
      ],
    });
    inventorycountSearchObj.run().each(function (result) {
      dataObj[result.id] = {
        id: result.id,
        tranNo: result.getValue({
          name: "tranid",
          label: "Document Number",
        }),
        tranDate: result.getValue({ name: "trandate", label: "Date" }),
      };
      return true;
    });
    log.debug("dataObj::", JSON.stringify(dataObj));
    return dataObj;
  };

  return { onRequest };
});
