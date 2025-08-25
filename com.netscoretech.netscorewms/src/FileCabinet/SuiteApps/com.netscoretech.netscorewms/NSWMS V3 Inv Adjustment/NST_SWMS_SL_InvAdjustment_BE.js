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
        response["setUpData"] = utility.getSetUpRecordData(params["setUpId"]);
        response["locationObj"] = utility.fieldLookUp(
          "location",
          params["locationId"],
          ["name"]
        );
        response["allItems"] = utility.getItems();
      } else if (params["ref"] == "itemData") {
        response = utility.getItemData(
          params["setUpData"],
          params["scannedItem"],
          params["locationId"],
          true
        );
      }
      scriptContext.response.write(JSON.stringify(response));
    } else {
      var params = scriptContext.request.parameters;
      var body = JSON.parse(scriptContext.request.body);
      var response = {};
      if (params["ref"] == "createBackup") {
        response = utility.createBackupRecord(body, "adjustment");
      } else if (params["ref"] == "apprCmpltBackup") {
        var fieldObj = {
          custrecord_ns_wms_v3_backuprec_status: "Pending Approval",
        };
        response = utility.submitFields(
          "customrecord_nst_wms_v3_br_rec",
          body.cId,// body.recId,
          fieldObj
        );
      }
      scriptContext.response.write(JSON.stringify(response));
    }
  };
  return { onRequest };
});
