/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
 define(["N/ui/serverWidget" , "N/file"], function (serverWidget , file) {
  function beforeLoad(context) {
    if (context.type == context.UserEventType.VIEW) {
      context.form.clientScriptModulePath = "./nst_wms_CL_CreateInvAdjOnClick.js";

      var transferType = context.newRecord.getText({
        fieldId: "custrecord_ns_wms_v3_created_from",
      });
      var status = context.newRecord.getText({
        fieldId: "custrecord_ns_wms_v3_backuprec_status",
      });
      // log.error("transferType" + transferType);
      //log.error("status" + status);
      if (
        transferType == "Inventory Adjustments" &&
        status == "Pending Approval"
      ) {
        context.form.addButton({
          id: "custpage_mybutton",
          label: "Approve",
          functionName: "onButtonClick",
          // context: {
          //   action: "approve",
          // },
        });
        context.form.addButton({
          id: "custpage_reject",
          label: "Reject",
          functionName: "rejectAdj",
        });

        //=================Progress Bar Code START=============
        var progressBarField = context.form.addField({
          id: "custpage_wms_progress_bar",
          type: serverWidget.FieldType.INLINEHTML,
          label: "Progress bar",
        });

          let loaderFile = file.load({
        id: '../NSWMS V3 Images/nswms_loader.svg' 
      });

        var loadingUrl =  loaderFile.url;
        var html =
          "<div><img id='custbody_wms_info_loading_image' style='width: 110px; top: 36%;left: 47%; float: right;position: absolute;display: none;z-index: 999;'  src='" +
          loadingUrl +
          "'/></div>"; //display: none;
        progressBarField.defaultValue = html;
        //======================Progress Bar Code END=====================
      } else {
      }
    }
  }
  return {
    beforeLoad: beforeLoad,
  };
});