/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/https', 'N/search', 'N/url', '../NSWMS V3 Globals/utility_module'], /**
 * @param{https} https
 * @param{search} search
 * @param{url} url
 */ (https, search, url, utility) => {
  /**
   * Defines the Suitelet script trigger point.
   * @param {Object} scriptContext
   * @param {ServerRequest} scriptContext.request - Incoming request
   * @param {ServerResponse} scriptContext.respo	nse - Suitelet response
   * @since 2015.2
   */
  const onRequest = (scriptContext) => {
    try {
      let setUpId = scriptContext.request.parameters.setUpId;
      let empId = scriptContext.request.parameters.empId;
      let locationId = scriptContext.request.parameters.locationId;
      let urlObj = {
        ajaxUrl: '',
        packshipOrd: '',
        setUpId: setUpId,
        empId: empId,
        locationId: locationId,
        logIn: '',
      };
      urlObj.ajaxUrl = utility.getScriptUrl('customscript_nst_wms_packlist_be', 'customdeploy_nst_wms_packlist_be');
      urlObj.packshipOrd = utility.getScriptUrl(
        'customscript_nst_wms_v3_order_deliver_ui',
        'customdeploy_nst_wms_v3_order_deliver_ui',
      );
      urlObj.logIn = utility.getScriptUrl('customscript_nst_wms_login_page', 'customdeploy_nst_wms_login_page');

      let Html,
        filesObj = utility.getFilesInFolder('NSWMS V3 PackList', true),
        globalFiles = utility.getFilesInFolder('NSWMS V3 Globals', true),
        images = utility.getFilesInFolder('NSWMS V3 Images', true);
      Html = https.get({
        url: filesObj['NST_SWMS_PackList_Template.html'],
      });

      let HtmlDocument = Html.body;
      log.debug('HtmlDocument', HtmlDocument);
      HtmlDocument = HtmlDocument.replace('customJs', filesObj['NST_SWMS_PackList_Assets.js']);
      let serializedObject = urlObj;
      HtmlDocument = HtmlDocument.replace('dataObj', JSON.stringify(serializedObject));
      HtmlDocument = HtmlDocument.replace('loaderUrl', images['nswms_loader.svg']);
      HtmlDocument = HtmlDocument.replace('customCss', filesObj['NST_SWMS_PackList.css']);
      HtmlDocument = HtmlDocument.replace('responsiveCss', globalFiles['NSWMS_Global_Responsive.css']);
      scriptContext.response.write(HtmlDocument);
    } catch (e) {
      log.error('Catch Block Message In nst_wms_SL_PackList_UI::', e);
    }
  };
  return { onRequest };
});
