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
        var setUpId = scriptContext.request.parameters.setUpId;
        var empId = scriptContext.request.parameters.empId;
        var locationId = scriptContext.request.parameters.locationId;
        var urlObj = {
          ajaxUrl: "",
          setUpId: setUpId,
          empId: empId,
          locationId: locationId,
        };
        urlObj.ajaxUrl = utility.getScriptUrl(
          "customscript_nst_wms_changepin_page",
          "customdeploy_nst_wms_changepin_page"
        );
        urlObj.logUrl = utility.getScriptUrl(
          "customscript_nst_wms_login_page",
          "customdeploy_nst_wms_login_page"
        );
        var Html,
          filesObj = utility.getFilesInFolder("NSWMS V3 Change Pin", true),
          globalFiles = utility.getFilesInFolder("NSWMS V3 Globals", true),
          images = utility.getFilesInFolder("NSWMS V3 Images", true);
        Html = https.get({
          url: filesObj["NST_SWMS_ChangePin_Template.html"],
        });

        var HtmlDocument = Html.body;
        log.debug("HtmlDocument", HtmlDocument);
        HtmlDocument = HtmlDocument.replace(
          "customJs",
          filesObj["NST_SWMS_ChangePin_Assets.js"]
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
      } else {
        var params = scriptContext.request.parameters;
        var body = JSON.parse(scriptContext.request.body);
        var response = {};
        if (params["ref"] == 1000) {
          var oldPwd = utility.fieldLookUp("employee", body["empId"], [
            "custentity_nst_wms_pin",
          ]);
          if (oldPwd["custentity_nst_wms_pin"] == body["oldpwd"]) {
            response["empId"] = utility.submitFields(
              "employee",
              body["empId"],
              {
                custentity_nst_wms_pin: body["newpwd"],
              }
            );
            response["status"] = "success";
          } else {
            response["status"] = "failure";
          }
        }
        scriptContext.response.write(JSON.stringify(response));
      }
    } catch (e) {
      log.error("Catch Block Message In nst_wms_SL_ChangePin_UI::", e);
    }
  };

  return { onRequest };
});
