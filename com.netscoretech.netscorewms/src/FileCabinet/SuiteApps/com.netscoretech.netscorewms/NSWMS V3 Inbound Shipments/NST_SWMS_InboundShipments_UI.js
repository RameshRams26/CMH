/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
  "N/https",
  "N/query",
  "N/url",
  "../NSWMS V3 Globals/utility_module",
], /**
 * @param{https} https
 * @param{query} query
 * @param{url} url
 */ (https, query, url, utility) => {
  /**
   * Defines the Suitelet script trigger point.
   * @param {Object} scriptContext
   * @param {ServerRequest} scriptContext.request - Incoming request
   * @param {ServerResponse} scriptContext.response - Suitelet response
   * @since 2015.2
   */
  const onRequest = (scriptContext) => {
    try {
      var setUpId = scriptContext.request.parameters.setUpId;
      var empId = scriptContext.request.parameters.empId;
      var locationId = scriptContext.request.parameters.locationId;
      var urlObj = {
        ajaxUrl: "",
        shipOrd: "",
        shipTo: "",
        setUpId: setUpId,
        empId: empId,
        locationId: locationId,
      };
      urlObj.ajaxUrl = utility.getScriptUrl(
        "customscript_nst_wms_inboundshipment_be",
        "customdeploy_nst_wms_inboundshipment_be"
      );
      urlObj.logIn = utility.getScriptUrl(
        "customscript_nst_wms_login_page",
        "customdeploy_nst_wms_login_page"
      );

      var Html,
        filesObj = utility.getFilesInFolder("NSWMS V3 Inbound Shipments", true),
        globalFiles = utility.getFilesInFolder("NSWMS V3 Globals", true),
        images = utility.getFilesInFolder("NSWMS V3 Images", true);
      Html = https.get({
        url: filesObj["NST_SWMS_InboundShipments_Template.html"],
      });

      var HtmlDocument = Html.body;
      log.debug("HtmlDocument", HtmlDocument);
      HtmlDocument = HtmlDocument.replace(
        "customJs",
        filesObj["NST_SWMS_InboundShipments_Assets.js"]
      );
      var serializedObject = urlObj;
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
      log.error("Catch Block Message In nst_wms_InboundShipments_UI::", e);
    }
  };

  return { onRequest };
});
