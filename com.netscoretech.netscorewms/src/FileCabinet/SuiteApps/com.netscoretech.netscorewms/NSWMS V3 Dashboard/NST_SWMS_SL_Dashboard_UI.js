/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
  "N/https",
  "N/search",
  "N/url",
  "../NSWMS V3 Globals/utility_module",
], /**
 * @param{https} https
 * @param{search} search
 * @param{url} url
 */ (https, search, url, utility) => {
  /**
   * Defines the Suitelet script trigger point.
   * @param {Object} scriptContext
   * @param {ServerRequest} scriptContext.request - Incoming request
   * @param {ServerResponse} scriptContext.response - Suitelet response
   * @since 2015.2
   */
  const onRequest = (scriptContext) => {
    try {
      if (scriptContext.request.method === "GET") {
        var setUpID = scriptContext.request.parameters.setUpId;
        var empId = scriptContext.request.parameters.empId;
        var urlObj = {
          ajaxUrl: "",
          setUpId: setUpID,
          empId: empId,
        };
        urlObj.ajaxUrl = utility.getScriptUrl(
          "customscript_nst_wms_dashboard_page",
          "customdeploy_nst_wms_dashboard_page"
        );
        var Html,
          filesObj = utility.getFilesInFolder("NSWMS V3 Dashboard", true),
          images = utility.getFilesInFolder("NSWMS V3 Images", true);
        Html = https.get({
          url: filesObj["NST_SWMS_Dashboard_Template.html"],
        });
        log.debug("filesObj", JSON.stringify(filesObj));

        var HtmlDocument = Html.body;
        HtmlDocument = HtmlDocument.replace(
          "customJs",
          filesObj["NST_SWMS_Dashboard_Assets.js"]
        );
        HtmlDocument = HtmlDocument.replace(
          "customCss",
          filesObj["NST_SWMS_Dashboard_Style.css"]
        );
        HtmlDocument = HtmlDocument.replace(
          "companyLogo",
          images["nswms_login_logo.png"]
        );
        HtmlDocument = HtmlDocument.replace(
          "loaderUrl",
          images["nswms_loader.svg"]
        );
        var serializedObject = urlObj;
        HtmlDocument = HtmlDocument.replace(
          "dataObj",
          JSON.stringify(serializedObject)
        );
        HtmlDocument = HtmlDocument.replace(
          "InvLookup",
          images["nswmv3_Inventory_lookup.svg"]
        );
        HtmlDocument = HtmlDocument.replace("print1", images["print1.png"]);
        HtmlDocument = HtmlDocument.replace("print2", images["print2.png"]);
        HtmlDocument = HtmlDocument.replace(
          "AdjQty",
          images["nswmv3_Adj_Qty.svg"]
        );
        HtmlDocument = HtmlDocument.replace(
          "PickList",
          images["nswmv3_Pick_list.svg"]
        );
        HtmlDocument = HtmlDocument.replace(
          "PackOrder",
          images["nswmv3_Pack_Order.svg"]
        );
        HtmlDocument = HtmlDocument.replace(
          "ShipTransferOrder",
          images["Ship Transfer Order.svg"]
        );
        HtmlDocument = HtmlDocument.replace(
          "inbound1",
          images["nswmv3_Ship_transferorder.svg"]
        );
        HtmlDocument = HtmlDocument.replace(
          "PackList",
          images["nswmv3_Pack_list.svg"]
        );
        HtmlDocument = HtmlDocument.replace(
          "ReceiveList",
          images["nswmv3_Receive_list.svg"]
        );
        HtmlDocument = HtmlDocument.replace(
          "ShipOrder",
          images["nswmv3_Ship_Order.svg"]
        );
        HtmlDocument = HtmlDocument.replace(
          "AssignOrderToPicker",
          images["nswmv3_Assign_Order_to_picker.svg"]
        );
        HtmlDocument = HtmlDocument.replace(
          "Bin_PutAway",
          images["nswmv3_Bin_Put_Away.svg"]
        );
        HtmlDocument = HtmlDocument.replace(
          "Cart_PutAway",
          images["nswmv3_Bin_Put_Away.svg"]
        );
        HtmlDocument = HtmlDocument.replace(
          "BinTransfer",
          images["nswmv3_Bin_transfer.svg"]
        );
        HtmlDocument = HtmlDocument.replace(
          "InvTransfer",
          images["nswmv3_Inventory_transfer.svg"]
        );
        HtmlDocument = HtmlDocument.replace(
          "invStatusChange",
          images["nswmv3_Inventory_transfer.svg"]
        );
        HtmlDocument = HtmlDocument.replace(
          "PrintLabels",
          images["nswmv3_Print_labels.svg"]
        );
        HtmlDocument = HtmlDocument.replace(
          "ReAssignOrders",
          images["nswmv3_Re_Assign_Order.svg"]
        );
        HtmlDocument = HtmlDocument.replace(
          "ReceiveRMA",
          images["nswmv3_Receive_RMA.svg"]
        );
        HtmlDocument = HtmlDocument.replace(
          "ReceiveIBS",
          images["nswmv3_Receive_IBS.svg"]
        );
        HtmlDocument = HtmlDocument.replace(
          "ReceiveOrder",
          images["nswmv3_Receive_Order.svg"]
        );
        HtmlDocument = HtmlDocument.replace(
          "StageTransfer",
          images["nswmv3_Stage_Bin_Transfer.svg"]
        );
        HtmlDocument = HtmlDocument.replace(
          "ReceiveTransferOrder",
          images["Receive Transfer Order.svg"]
        );
        HtmlDocument = HtmlDocument.replace(
          "CreateCount",
          images["Create Count Record.svg"]
        );
        HtmlDocument = HtmlDocument.replace(
          "CountList",
          images["Inventory Count List.svg"]
        );
        HtmlDocument = HtmlDocument.replace(
          "CountList1",
          images["Inventory Count List.svg"]
        );
        HtmlDocument = HtmlDocument.replace(
          "BinCount",
          images["Bin Count.svg"]
        );

        scriptContext.response.write(HtmlDocument);
      } else {
        var params = scriptContext.request.parameters;
        var body = JSON.parse(scriptContext.request.body);
        log.debug(JSON.stringify(params), JSON.stringify(body));
        var response = {};
        if (params["ref"] == 1000) {
          response = utility.getDashBoardData(body);
        } else if (params["ref"] == 1001) {
          response = utility.getScreenUrls(body);
        }
        scriptContext.response.setHeader({
          name: "Content-Type",
          value: "application/json",
        });
        scriptContext.response.write(JSON.stringify(response));
      }
    } catch (e) {
      log.error("Catch Block Message In nst_wms_SL_LogIn_UI::", e);
    }
  };

  return { onRequest };
});
