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
      let setUpId = scriptContext.request.parameters.setUpId;
      let empId = scriptContext.request.parameters.empId;
      let locationId = scriptContext.request.parameters.locationId;
      let urlObj = {
        ajaxUrl: "",
        setUpId: setUpId,
        empId: empId,
        locationId: locationId,
        logIn: "",
        tranId: "",
        PrintUrl: "",
        packshipOrd: "",
        pickList: ""
      };
      if (scriptContext.request.parameters.tranId) {
        urlObj.tranId = scriptContext.request.parameters.tranId;
        urlObj.status = scriptContext.request.parameters.status;
      }
      urlObj.logIn = utility.getScriptUrl(
        "customscript_nst_wms_login_page",
        "customdeploy_nst_wms_login_page"
      );
      urlObj.ajaxUrl = utility.getScriptUrl(
        "customscript_nst_wms_shiporder_be",
        "customdeploy_nst_wms_shiporder_be"
      );
      urlObj.PrintUrl = utility.getScriptUrl(
        "customscript_nst_wms_printlabel_page",
        "customdeploy_nst_wms_printlabel_page"
      );
      urlObj.packshipOrd = utility.getScriptUrl(
        "customscript_nst_wms_pack_shiporder_page",
        "customdeploy_nst_wms_pack_shiporder_page"
      );
      urlObj.pickList = utility.getScriptUrl(
        "customscript_nst_wms_picklist_page",
        "customdeploy_nst_wms_picklist_page"
      );
      let Html,
        filesObj = utility.getFilesInFolder("NSWMS V3 Ship Order", true),
        globalFiles = utility.getFilesInFolder("NSWMS V3 Globals", true),
        images = utility.getFilesInFolder("NSWMS V3 Images", true);
      Html = https.get({
        url: filesObj["NST_SWMS_ShipOrder_Template.html"],
      });

      let HtmlDocument = Html.body;
      log.debug("HtmlDocument", HtmlDocument);
      HtmlDocument = HtmlDocument.replace(
        "customJs",
        filesObj["NST_SWMS_ShipOrder_Assets.js"]
      );
      let serializedObject = urlObj;
      HtmlDocument = HtmlDocument.replace(
        "dataObj",
        JSON.stringify(serializedObject)
      );
      HtmlDocument = HtmlDocument.replace(
        "loaderUrl",
        images["nswms_loader.svg"]
      );
      HtmlDocument = HtmlDocument.replace(
        "customCss",
        globalFiles["NSWMS_Global.css"]
      );
      HtmlDocument = HtmlDocument.replace(
        "responsiveCss",
        globalFiles["NSWMS_Global_Responsive.css"]
      );
      scriptContext.response.write(HtmlDocument);
    } catch (e) {
      log.error("Catch Block Message In nst_wms_SL_ShipOrder_UI::", e);
    }
  };
  return {onRequest};
});
