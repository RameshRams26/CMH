/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
 define([
  "N/currentRecord",
  "N/record",
  "N/search",
  "N/https",
  "N/ui/message",
], function (currentRecord, record, search, https, message) {
  function fieldChanged(scriptContext) {}
  function onButtonClick() {
    try {
      var custRecObj = currentRecord.get();
      var custId = custRecObj.id;
      if (custId) {
        var processingMessage = message.create({
          title: "Processing",
          message:
            "Please wait while the InventoryAdjustment Record is creating....",
          type: message.Type.CONFIRMATION,
        });
        processingMessage.show();
        //loader
        jQuery(".body_2010").css({
          opacity: "0.3",
          "background-color": "#000",
        });
        jQuery("#custbody_wms_info_loading_image").css("display", "block");

        // Send the request to the creation of InvAdj Suitelet
        https.requestSuitelet
          .promise({
            scriptId: "customscript_nst_wms_crt_inv_adjust",
            deploymentId: "customdeploy_nst_wms_crt_inv_adjust",
            method: https.Method.POST,
            body: {
              ref: "createBackup",
              recId: custId,
            },
            urlParams: {
              cId: custId,
            },
          })
          .then(function (response) {
            // Hide the processing message when the response is received
            processingMessage.hide();
            try {
              var responseBody = JSON.parse(response.body);
              console.log("ResponseBody",responseBody);
              if (responseBody[0].status === "Error") {
                /* alert(
                  "Adjustment Record Creation Failed!!" +
                  JSON.parse(response["body"])
                ); */
                return alert(responseBody[0].message);
              } else {
                var data = JSON.parse(response["body"]);
                alert(
                  "Adjustment record created successfully " +
                    data[0].adjustmentIdText
                );
                window.location.reload();
              }

              return true;
            } catch (e) {
              console.error("Error parsing JSON response: " + e.toString());
            }
          })
          .catch(function (error) {
            console.error("Error:", error);
            processingMessage.hide();
          });
      }
    } catch (e) {
      alert(e);
    }
  }
  function rejectAdj() {
    try {
      var custRecObj = currentRecord.get();
      var custId = custRecObj.id;
      if (custId) {
        var rejectReason = prompt("Enter Reject Reason");
        if (rejectReason) {
          record.submitFields({
            type: "customrecord_nst_wms_v3_br_rec",
            id: custId,
            values: {
              custrecord_nst_wms_v3_memo: rejectReason,
              custrecord_ns_wms_v3_backuprec_status: "Rejected",
              isinactive: "T",
            },
          });
        }
        location.reload();
      }
    } catch (e) {
      alert(e);
    }
  }

  return {
    fieldChanged: fieldChanged,
    onButtonClick: onButtonClick,
    rejectAdj: rejectAdj,
  };
});