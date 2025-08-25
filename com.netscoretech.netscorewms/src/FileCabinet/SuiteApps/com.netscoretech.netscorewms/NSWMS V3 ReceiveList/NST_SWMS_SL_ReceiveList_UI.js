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
      var setUpId = scriptContext.request.parameters.setUpId;
      var empId = scriptContext.request.parameters.empId;
      var locationId = scriptContext.request.parameters.locationId;
      var urlObj = {
        ajaxUrl: "",
        setUpId: setUpId,
        empId: empId,
        locationId: locationId,
        recieveOrd: "",
        logIn: "",
        reieveTo: "",
      };
      urlObj.ajaxUrl = utility.getScriptUrl(
        "customscript_nst_wms_receivelist_page_be",
        "customdeploy_nst_wms_receivelist_page"
      );
      urlObj.recieveOrd = utility.getScriptUrl(
        "customscript_nst_wms_receiveorder_page",
        "customdeploy_nst_wms_receiveorder_page"
      );
      urlObj.reieveTo = utility.getScriptUrl(
        "customscript_nst_wms_receiveto_page",
        "customdeploy_nst_wms_receiveto"
      );
      urlObj.receiveRMA = utility.getScriptUrl(
        "customscript_nst_wms_receiverma_page",
        "customdeploy_nst_wms_receiverma_page"
      );
      urlObj.logIn = utility.getScriptUrl(
        "customscript_nst_wms_login_page",
        "customdeploy_nst_wms_login_page"
      );

      var Html,
        filesObj = utility.getFilesInFolder("NSWMS V3 ReceiveList", true),
        globalFiles = utility.getFilesInFolder("NSWMS V3 Globals", true),
        images = utility.getFilesInFolder("NSWMS V3 Images", true);
      Html = https.get({
        url: filesObj["NST_SWMS_ReceiveList_Template.html"],
      });

      var HtmlDocument = Html.body;
      log.debug("HtmlDocument", HtmlDocument);
      HtmlDocument = HtmlDocument.replace(
        "customJs",
        filesObj["NST_SWMS_ReceiveList_Assets.js"]
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
      log.error("Catch Block Message In nst_wms_SL_ReceiveList_UI::", e);
    }
  };

  return { onRequest };
});
