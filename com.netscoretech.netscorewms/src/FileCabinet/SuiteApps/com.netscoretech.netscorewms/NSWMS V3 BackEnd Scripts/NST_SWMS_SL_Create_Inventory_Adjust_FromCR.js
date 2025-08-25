/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(["N/record", "N/search"], /**
 * @param{record} record
 * @param{search} search
 */ (record, search) => {
  const onRequest = (scriptContext) => {
    try {
      if (scriptContext.request.method === "POST") {
      //var cRecId = scriptContext.request.parameters.cId; // on approve button
      //on complete button 
    //  var body = JSON.parse(scriptContext.request.body);
    //  var cRecId = body.cId;
    /* var body = JSON.parse(scriptContext.request.body);
    var cRecId = body.cId;
    
    if(!cRecId) {
      var cRecId = scriptContext.request.parameters.cId;
    } */
        var cRecId = scriptContext.request.parameters.cId;

      if (!cRecId) {
        try {
         var body = JSON.parse(scriptContext.request.body);
         cRecId = body.cId;
        } catch (e) {
         log.error("Error parsing body", e.message);
        }
     }
      log.debug('params',scriptContext.request.parameters);
    
      log.debug("cRecId", cRecId);

      var invadjData = {
        subsidiary: "",
        location: "",
        account: "",
        empId: "",
        positiveItems: [],
        negativeItems: [],
      };
      //var createdinvAdjRecs = [];

      var cusRecObj = search.create({
        type: "customrecord_nst_wms_v3_br_rec",
        filters: [
        ["isinactive", "is", "F"],
        "AND",
        ["internalid", "anyof", cRecId],
        ],

        columns: [
        search.createColumn({
          name: "internalid",
          label: "Internal ID",
        }),
        search.createColumn({
          name: "custrecord_nst_wms_v3_subsidiary",
          label: "NST|SWMS|V3|Subsidiary",
        }),
        search.createColumn({
          name: "custrecord_ns_wms_v3_backuprec_status",
          label: "NST|SWMS|V3|Status",
        }),
        search.createColumn({
          name: "custrecord_ns_wmsv3_location",
          label: "Location",
        }),
        search.createColumn({
          name: "custrecord_ns_wms_v3_adj_account",
          label: "Account",
        }),
        search.createColumn({
          name: "custrecord_ns_wms_v3_rec_created_by",
          label: "Created By",
        }),
        search.createColumn({
          name: "custrecord_ns_wms_adjustment_type",
          join: "CUSTRECORD_NS_WMS_V3_PARENT_REC",
          label: "Adjustment Type Is Positive",
        }),
        search.createColumn({
          name: "custrecord_ns_wms_v3_item_inv_detail",
          join: "CUSTRECORD_NS_WMS_V3_PARENT_REC",
          label: "Inv Detail",
        }),
        search.createColumn({
          name: "custrecord_ns_wms_v3_is_bin_item",
          join: "CUSTRECORD_NS_WMS_V3_PARENT_REC",
          label: "Is Bin",
        }),
        search.createColumn({
          name: "custrecord_ns_wms_v3_is_lot_item",
          join: "CUSTRECORD_NS_WMS_V3_PARENT_REC",
          label: "Is Lot",
        }),
        search.createColumn({
          name: "custrecord_ns_wms_v3_is_serial_item",
          join: "CUSTRECORD_NS_WMS_V3_PARENT_REC",
          label: "Is Serial",
        }),
        search.createColumn({
          name: "custrecord_ns_wms_v3_item_name",
          join: "CUSTRECORD_NS_WMS_V3_PARENT_REC",
          label: "Item Name",
        }),
        search.createColumn({
          name: "custrecord_ns_wms_v3_quantity",
          join: "CUSTRECORD_NS_WMS_V3_PARENT_REC",
          label: "Quantity",
        }),
        ],
      });
      var searchResultCount = cusRecObj.runPaged().count;
      log.debug("cusRecObj result count", searchResultCount);
      cusRecObj.run().each(function (result) {
        if (!invadjData.subsidiary) {
        invadjData.subsidiary = result.getValue({
          name: "custrecord_nst_wms_v3_subsidiary",
        });
        }
        if (!invadjData.location) {
        invadjData.location = result.getValue({
          name: "custrecord_ns_wmsv3_location",
        });
        }
        if (!invadjData.account) {
        invadjData.account = result.getValue({
          name: "custrecord_ns_wms_v3_adj_account",
        });
        }
        if (!invadjData.empId) {
        invadjData.empId = result.getValue({
          name: "custrecord_ns_wms_v3_rec_created_by",
        });
        }

        var cRecData = {};
        cRecData["adjType"] = result.getValue({
        name: "custrecord_ns_wms_adjustment_type",
        join: "CUSTRECORD_NS_WMS_V3_PARENT_REC",
        label: "Adjustment Type Is Positive",
        });
        cRecData["InvDetail"] = result.getValue({
        name: "custrecord_ns_wms_v3_item_inv_detail",
        join: "CUSTRECORD_NS_WMS_V3_PARENT_REC",
        label: "Inv Detail",
        });
        cRecData["InvDetail"] = JSON.parse(cRecData["InvDetail"]);
        cRecData["isBin"] = result.getValue({
        name: "custrecord_ns_wms_v3_is_bin_item",
        join: "CUSTRECORD_NS_WMS_V3_PARENT_REC",
        label: "Is Bin",
        });
        cRecData["isLot"] = result.getValue({
        name: "custrecord_ns_wms_v3_is_lot_item",
        join: "CUSTRECORD_NS_WMS_V3_PARENT_REC",
        label: "Is Lot",
        });
        cRecData["isSer"] = result.getValue({
        name: "custrecord_ns_wms_v3_is_serial_item",
        join: "CUSTRECORD_NS_WMS_V3_PARENT_REC",
        label: "Is Serial",
        });
        cRecData["itemId"] = result.getValue({
        name: "custrecord_ns_wms_v3_item_name",
        join: "CUSTRECORD_NS_WMS_V3_PARENT_REC",
        label: "Item Name",
        });
        cRecData["AdjQty"] = result.getValue({
        name: "custrecord_ns_wms_v3_quantity",
        join: "CUSTRECORD_NS_WMS_V3_PARENT_REC",
        label: "Quantity",
        });

        if (cRecData.adjType === true) {
        invadjData.positiveItems.push(cRecData);
        } else {
        invadjData.negativeItems.push(cRecData);
        }
        log.debug("cRecData", cRecData);
        return true;
      });
      var adjIds = [];
      if (invadjData.positiveItems.length > 0) {
        try{
        adjIds.push(
        createAdjRecord(invadjData, "positive", record, cRecId, search)
        );
        }catch(e){
        log.error("Positive Adjustment Error", e.message);
       adjIds.push({ status: "Error", message: "Positive Adjustment: " + e.message });
         }
      }
      if (invadjData.negativeItems.length > 0) {
        try{
        adjIds.push(
        createAdjRecord(invadjData, "negative", record, cRecId, search)
        );
        }catch(e){
        log.error("Negative Adjustment Error", e.message);
       adjIds.push({ status: "Error", message: "Negative Adjustment: " + e.message });
       }
      } //
      log.debug("adjIds :::", adjIds);
      var adjId = Object.keys(adjIds).length;
      if (adjId) {
        var response = {};
        record.submitFields({
        type: "customrecord_nst_wms_v3_br_rec",
        id: cRecId,
        values: {
          custrecord_ns_wms_v3_ref_transaction: adjIds[0].adjustmentId,
          custrecord_ns_wms_v3_backuprec_status: "Approved",
        },
        });
      }
      scriptContext.response.write(JSON.stringify(adjIds)); //['adjustmentIdText']
      return {
        AdjItems: invadjData,
      };
      }
    } catch (e) {
      log.debug("Suitelet Exception", e);
      scriptContext.response.write(
        JSON.stringify({ status: "failure", message: e.message })
      );
    }
  }; //on ReqClose
  return {
    onRequest,
  };
});

function createAdjRecord(items, type, record, backUpRecId, search) {
  try {
    log.debug("adjtype", type);
    
     var isPositive = type === "positive";
     var adjItems = isPositive ? items.positiveItems : items.negativeItems;
     var qtyMultiplier = isPositive ? 1 : -1;

    var subs = items.subsidiary;
      var adjloc = items.location;
      var adjacc = items.account;
      var wmsuser = items.empId;

      var invAdjRec = record.create({
        type: "inventoryadjustment",
        isDynamic: true,
      });
      invAdjRec.setValue({
        fieldId: "subsidiary",
        value: subs,
      });

      invAdjRec.setValue({
        fieldId: "adjlocation",
        value: adjloc,
      });

      invAdjRec.setValue({
        fieldId: "account",
        value: adjacc,
      });

      invAdjRec.setValue({
        fieldId: "custbody_nst_wms_trans_created_by",
        value: wmsuser,
      });

      for (var i = 0; i < adjItems.length; i++) {
         var item = adjItems[i];
        log.debug(type + " adjitems", JSON.stringify(item));

        var isBin = item.isBin;
        var isLot = item.isLot;
        var isSer = item.isSer;
        var itemId = item.itemId;
        var adjQty = parseFloat(item.AdjQty) * qtyMultiplier;

        invAdjRec.selectNewLine({
            sublistId: "inventory",
          });
          invAdjRec.setCurrentSublistValue({
            sublistId: "inventory",
            fieldId: "item",
            value: itemId,
          });

          invAdjRec.setCurrentSublistValue({
            sublistId: "inventory",
            fieldId: "location",
            value: adjloc,
          });

          invAdjRec.setCurrentSublistValue({
            sublistId: "inventory",
            fieldId: "adjustqtyby",
            value: adjQty,
          });

        var subRecordObj = invAdjRec.getCurrentSublistSubrecord({
          sublistId: "inventory",
          fieldId: "inventorydetail",
        });

         var subRecordLineCount = subRecordObj.getLineCount({ sublistId: "inventoryassignment" });
        for (var u = 0; u < subRecordLineCount; u++) {
          subRecordObj.removeLine({ sublistId: "inventoryassignment", line: u });
        }

        if (item.InvDetail && item.InvDetail.length > 0) {
          for (var j = 0; j < item.InvDetail.length; j++) {
            var invDetail = item.InvDetail[j];
            var invStatusId = invDetail.selectedStatus;
            var lineQty = parseFloat(invDetail.qty) * qtyMultiplier;
            var lotNo = invDetail.lotNO;
            var serNo = invDetail.serialNO;
            var binNo = invDetail.binNO;
            var expDate = invDetail.dateText;

            subRecordObj.selectNewLine({ sublistId: "inventoryassignment" });

            if (isLot) {
            subRecordObj.setCurrentSublistValue({
              sublistId: "inventoryassignment",
              fieldId: "receiptinventorynumber",
              value: lotNo,
              ignoreFieldChange: false,
            });
            subRecordObj.setCurrentSublistValue({
              sublistId: "inventoryassignment",
              fieldId: "expirationdate",
              value: expDate ? new Date(expDate) : null,
              ignoreFieldChange: false,
             });
          } else if (isSer) {
            subRecordObj.setCurrentSublistValue({
              sublistId: "inventoryassignment",
              fieldId: "receiptinventorynumber",
              value: serNo,
              ignoreFieldChange: false,
            });
          }

          if (isBin) {
            subRecordObj.setCurrentSublistValue({
              sublistId: "inventoryassignment",
              fieldId: "binnumber",
              value: binNo,
              ignoreFieldChange: false,
            });
          }

          subRecordObj.setCurrentSublistValue({
            sublistId: "inventoryassignment",
            fieldId: "inventorystatus",
            value: invStatusId,
            ignoreFieldChange: false,
          });

          subRecordObj.setCurrentSublistValue({
            sublistId: "inventoryassignment",
            fieldId: "quantity",
            value: lineQty,
            ignoreFieldChange: false,
          });

          subRecordObj.commitLine({
            sublistId: "inventoryassignment",
          });

          }
        }
        invAdjRec.commitLine({
            sublistId: "inventory",
          });
      }
     var invAdjRecId = invAdjRec.save({
        enableSourcing: false,
        ignoreMandatoryFields: true,
      });
       if (invAdjRecId) {
        log.debug(
          (isPositive ? "Inventory Adjustment Created" : "Negative Inventory Adjustment Created::" + backUpRecId),
          "ID: " + invAdjRecId
        );
        var response = {};
        response["adjustmentId"] = invAdjRecId;
        var adjustLookup = search.lookupFields({
          type: "inventoryadjustment",
          id: invAdjRecId,
          columns: ["tranid"],
        });
        response["adjustmentIdText"] = adjustLookup.tranid;
        return response;
      } else {
        log.error(
          "Failed to Create Inventory Adjustment",
          "The inventory adjustment record was not created!!"
        );
        return { status: "Error", message: "Failed to create inventory adjustment" };
      }
    
  } catch (e) {
    log.error("errormessage", e.message);
    return { status: "Error", message: e.message };
  }

}
