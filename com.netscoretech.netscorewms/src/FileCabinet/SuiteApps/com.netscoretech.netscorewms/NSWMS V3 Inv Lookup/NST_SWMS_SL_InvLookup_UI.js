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
        logIn: "",
      };
      urlObj.ajaxUrl = utility.getScriptUrl(
        "customscript_nst_wms_invlookup_be",
        "customdeploy_nst_wms_invlookup_be"
      );
      urlObj.logIn = utility.getScriptUrl(
        "customscript_nst_wms_login_page",
        "customdeploy_nst_wms_login_page"
      );
      urlObj.PrintUrl = utility.getScriptUrl(
        "customscript_nst_wms_printlabel_page",
        "customdeploy_nst_wms_printlabel_page"
      );

      var Html,
        filesObj = utility.getFilesInFolder("NSWMS V3 Inv Lookup", true),
        globalFiles = utility.getFilesInFolder("NSWMS V3 Globals", true),
        images = utility.getFilesInFolder("NSWMS V3 Images", true);
      Html = https.get({
        url: filesObj["NST_SWMS_InvLookup_Template.html"],
      });
      var HtmlDocument = Html.body;
      HtmlDocument = HtmlDocument.replace(
        "customJs",
        filesObj["NST_SWMS_InvLookup_Assets.js"]
      );
      var serializedObject = urlObj;
      log.debug("serobj", JSON.stringify(serializedObject))
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
      log.error("Catch Block Message In nst_wms_SL_LogIn_UI::", e);
    }
  };

  return { onRequest };
});
