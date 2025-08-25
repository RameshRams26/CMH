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
    if (scriptContext.request.method === "GET") {
      var urlObj = { ajaxUrl: "", dashBoardUrl: "", setUpId: "" };
      (urlObj.ajaxUrl = utility.getScriptUrl(
        "customscript_nst_wms_login_page",
        "customdeploy_nst_wms_login_page"
      )),
        (urlObj.dashBoardUrl = utility.getScriptUrl(
          "customscript_nst_wms_dashboard_page",
          "customdeploy_nst_wms_dashboard_page"
        ));
      if (scriptContext.request.parameters.setUpId) {
        urlObj.setUpId = scriptContext.request.parameters.setUpId;
      } else {
        urlObj.setUpId = 1;
      }
      //log.debug("urlObj", JSON.stringify(urlObj));

      var Html,
        filesObj = utility.getFilesInFolder("NSWMS V3 LogIn", true),
        images = utility.getFilesInFolder("NSWMS V3 Images", true);
      Html = https.get({
        url: filesObj["NST_SWMS_LogIn_Template.html"],
      });

      var HtmlDocument = Html.body;
      HtmlDocument = HtmlDocument.replace(
        "customJs",
        filesObj["NST_SWMS_LogIn_Assets.js"]
      );
      HtmlDocument = HtmlDocument.replace(
        "customCss",
        filesObj["NST_SWMS_LogIn_Style.css"]
      );
      HtmlDocument = HtmlDocument.replace(
        "companyLogo",
        images["nswms_login_logo.png"]
      );
      HtmlDocument = HtmlDocument.replace(
        "login_background",
        images["nswms_login_background2.jpg"]
      );
      HtmlDocument = HtmlDocument.replace(
        "login_bg_mobile",
        images["nswms_login_bg_mobile.jpg"]
      );
      HtmlDocument = HtmlDocument.replace(
        "login_bg_tablet",
        images["nswms_login_bg_tablet.jpg"]
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
      scriptContext.response.write(HtmlDocument);
    } else {
      var params = scriptContext.request.parameters;
      log.debug('Login_Body',scriptContext.request.body)
      var body = JSON.parse(scriptContext.request.body);
      log.debug('Request_Body',body)
      if (params["ref"] == 1000) {
        response = utility.validateCredentials(body);
      }
      scriptContext.response.write(JSON.stringify(response));
    }
  };

  return { onRequest };
});
