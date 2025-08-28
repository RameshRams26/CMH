/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/https', 'N/query', 'N/url', '../NSWMS V3 Globals/utility_module'], /**
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
        ajaxUrl: '',
        shipOrd: '',
        shipTo: '',
        setUpId: setUpId,
        empId: empId,
        locationId: locationId,
      };
      urlObj.logIn = utility.getScriptUrl('customscript_nst_wms_login_page', 'customdeploy_nst_wms_login_page');
      urlObj.ajaxUrl = utility.getScriptUrl('customscript_nst_wms_picklist_be', 'customdeploy_nst_wms_picklist_be');
      urlObj.shipOrd = utility.getScriptUrl(
        'customscript_nst_wms_shiporder_page',
        'customdeploy_nst_wms_shiporder_page',
      );
      urlObj.shipTo = '';
      var Html,
        filesObj = utility.getFilesInFolder('NSWMS V3 PickList', true),
        // globalFiles = utility.getFilesInFolder('NSWMS V3 Globals', true),
        images = utility.getFilesInFolder('NSWMS V3 Images', true);
      Html = https.get({
        url: filesObj['NST_SWMS_PickList_Template.html'],
      });
      var HtmlDocument = Html.body;
      log.debug('HtmlDocument', HtmlDocument);
      HtmlDocument = HtmlDocument.replace('customJs', filesObj['NST_SWMS_PickList_Assets.js']);
      var serializedObject = urlObj;
      HtmlDocument = HtmlDocument.replace('dataObj', JSON.stringify(serializedObject));
      HtmlDocument = HtmlDocument.replace('loaderUrl', images['nswms_loader.svg']);
      HtmlDocument = HtmlDocument.replace('customCss', filesObj['NST_SWMS_PickList.css']);

      // HtmlDocument = HtmlDocument.replace('responsiveCss', globalFiles['NSWMS_Global_Responsive.css']);
      scriptContext.response.write(HtmlDocument);
    } catch (e) {
      log.error('Catch Block Message In nst_wms_SL_PickList_UI::', e);
    }
  };

  return { onRequest };
});
