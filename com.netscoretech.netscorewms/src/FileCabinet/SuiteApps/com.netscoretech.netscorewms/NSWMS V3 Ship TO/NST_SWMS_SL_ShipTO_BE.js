/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
  "N/search",
  "N/file",
  "N/record",
  "../NSWMS V3 Globals/utility_module",
], /**
 * @param{https} https
 * @param{search} search
 * @param{url} url
 */ (search, file, record, utility) => {
  /**
   * Defines the Suitelet script trigger point.
   * @param {Object} scriptContext
   * @param {ServerRequest} scriptContext.request - Incoming request
   * @param {ServerResponse} scriptContext.response - Suitelet response
   * @since 2015.2
   */
  const onRequest = (scriptContext) => {
    if (scriptContext.request.method === "GET") {
      var params = scriptContext.request.parameters;
      var response = {};
      if (params["ref"] == "getSetUpData") {
        response["setUpData"] = utility.getSetUpRecordData(params["setUpId"]);
        response["locationObj"] = utility.fieldLookUp(
          "location",
          params["locationId"],
          ["name"]
        );
      } else if (params["ref"] == "getOrderData") {
        response = getOrderData(params);
      } else if (params["ref"] == "itemData") {
        response = utility.getItemData(
          params["setUpData"],
          params["scannedItem"],
          params["locationId"],
          true
        );
      }
      scriptContext.response.write(JSON.stringify(response));
    } else {
      var params = scriptContext.request.parameters;
      var body = JSON.parse(scriptContext.request.body);
      var response = {};
      if (params["ref"] == "createBackup") {
        response = utility.createBackupRecord(body, "shiptransferorder");
      } else if (params["ref"] == "apprCmpltBackup") {
        response = createFullfillmentRecord(body.recId);
      }
      scriptContext.response.write(JSON.stringify(response));
    }

    function getOrderData(body) {
      var scannedOrder = body["scannedOrder"];
      var locationId = body["locationId"];
      var setUpData = JSON.parse(body["setUpData"]);
      log.debug("setUpData::", JSON.stringify(setUpData));

      var columnsary = [
        search.createColumn({ name: "item" }),
        search.createColumn({
          name: "entity",
        }),
        search.createColumn({
          name: "formulatext",
          formula:
            "NVL({quantity}-NVL({quantity}-NVL({quantitycommitted},0)-NVL({quantityshiprecv},0),0),0)-NVL({quantitypicked},0)",
        }),
        search.createColumn({ name: "tranid" }),
        search.createColumn({ name: "custcol_nst_wms_nestcoreid"}),
      ];

      if (setUpData["useUpc"] == true) {
        columnsary.push(
          search.createColumn({
            name: "upccode",
            join: "item",
          })
        );
      }
      if (setUpData["useBins"] == true) {
        columnsary.push(
          search.createColumn({
            name: "usebins",
            join: "item",
          })
        );
      }
      if (setUpData["useSerial"] == true) {
        columnsary.push(
          search.createColumn({
            name: "isserialitem",
            join: "item",
          })
        );
      }
      if (setUpData["useLot"] == true) {
        columnsary.push(
          search.createColumn({
            name: "islotitem",
            join: "item",
          })
        );
      }
      var orderObj = {
        orderId: "",
        orderText: "",
        customer: "",
        customerText: "",
        items: [],
      };
      var transactionSearchObj = search.create({
        type: "transaction",
        filters: [
          ["type", "anyof", "TrnfrOrd"],
          "AND",
          ["mainline", "is", "F"],
          "AND",
          ["numbertext", "is", scannedOrder],
          "AND",
          ["shipping", "is", "F"],
          "AND",
          ["taxline", "is", "F"],
          "AND",
          ["cogs", "is", "F"],
          "AND",
          ["status", "anyof", "TrnfrOrd:D", "TrnfrOrd:B", "TrnfrOrd:E"],
          "AND",
          ["location", "anyof", locationId],
          "AND",
          [
            "formulanumeric: NVL({quantity}-NVL({quantity}-NVL({quantitycommitted},0)-NVL({quantityshiprecv},0),0),0)-NVL({quantitypicked},0)",
            "greaterthan",
            "0",
          ],
        ],
        columns: columnsary,
      });
      transactionSearchObj.run().each(function (result) {
        if (!orderObj.customer) {
          orderObj.customer = result.getValue({
            name: "entity",
          });
        }
        if (!orderObj.customerText) {
          orderObj.customerText = result.getText({
            name: "entity",
          });
        }
        if (!orderObj.orderId) {
          orderObj.orderId = result.id;
        }
        if (!orderObj.orderText) {
          orderObj.orderText = result.getValue({
            name: "tranid",
          });
        }
        var itemObj = {};
        itemObj["itemID"] = result.getValue({ name: "item" });
        itemObj["itemName"] = result.getText({ name: "item" });
        itemObj["lineNo"] = result.getValue({name: "custcol_nst_wms_nestcoreid"});
        itemObj["quantity"] = result.getValue({
          name: "formulatext",
          formula:
            "NVL({quantity}-NVL({quantity}-NVL({quantitycommitted},0)-NVL({quantityshiprecv},0),0),0)-NVL({quantitypicked},0)",
        });
        itemObj["pickQty"] = 0;
        itemObj["configuredItems"] = [];

        if (setUpData["useUpc"] == true) {
          itemObj["upc"] = result.getValue({ name: "upccode", join: "item" });
        } else {
          itemObj["upc"] = false;
        }
        if (setUpData["useBins"] == true) {
          itemObj["isBinItem"] = result.getValue({
            name: "usebins",
            join: "item",
          });
        } else {
          itemObj["isBinItem"] = false;
        }
        if (setUpData["useSerial"] == true) {
          itemObj["isSerialItem"] = result.getValue({
            name: "isserialitem",
            join: "item",
          });
        } else {
          itemObj["isSerialItem"] = false;
        }
        if (setUpData["useLot"] == true) {
          itemObj["isLotItem"] = result.getValue({
            name: "islotitem",
            join: "item",
          });
        } else {
          itemObj["isLotItem"] = false;
        }

        itemObj["invBalance"] = utility.getInventoryBalanceByLocation(
          setUpData,
          itemObj["itemID"],
          locationId
        );

        orderObj.items.push(itemObj);
        return true;
      });
      //log.debug("orderObj::", JSON.stringify(orderObj));
      return orderObj;
    }

    function createFullfillmentRecord(backUpRecId) {
      try {
        log.debug("backUpRecId", backUpRecId);
        var dataObj = getBackUpRecordData(backUpRecId);
        var items = dataObj.Items;
        log.debug("dataObj", JSON.stringify(dataObj));
        var tranRecObj = record.transform({
          fromType: "transferorder",
          fromId: dataObj.soId,
          toType: "itemfulfillment",
          isDynamic: true,
        });
        tranRecObj.setValue({ fieldId: "customform", value: 40 });
        tranRecObj.setValue({ fieldId: "shipstatus", value: "C" });

        var existingLines = tranRecObj.getLineCount({
          sublistId: "item",
        });
        log.debug("existingLines", existingLines);
        for (var i = 0; i < existingLines; i++) {
          tranRecObj.selectLine({ sublistId: "item", line: i });
          tranRecObj.setCurrentSublistValue({
            sublistId: "item",
            fieldId: "itemreceive",
            value: false,
          });
          tranRecObj.commitLine({ sublistId: "item" });
        }

        for (var i = 0; i < items.length; i++) {
          var itemObj = items[i];
          var isBin = itemObj.isBin;
          var isLot = itemObj.isLot;
          var isSer = itemObj.isSer;
          var itemId = itemObj.itemId;
          var lineNo = itemObj.lineNo;         
          var adjQty = itemObj.AdjQty;
          adjQty = parseInt(adjQty);
          var invDetail = itemObj.InvDetail;
          var lineNumber = tranRecObj.findSublistLineWithValue({
            sublistId: "item",
            fieldId: "custcol_nst_wms_nestcoreid",
            value: lineNo,
          });
          log.debug("lineNumber", lineNumber);
          if (lineNumber > -1) {
            //-1
            tranRecObj.selectLine({ sublistId: "item", line: lineNumber });
            tranRecObj.setCurrentSublistValue({
              sublistId: "item",
              fieldId: "itemreceive",
              value: true,
            });
            tranRecObj.setCurrentSublistValue({
              sublistId: "item",
              fieldId: "quantity",
              value: parseFloat(adjQty),
            });
            //accessing Subrecord for inventory details
            var subRecordObj = tranRecObj.getCurrentSublistSubrecord({
              sublistId: "item",
              fieldId: "inventorydetail",
            });
            var subRecordLineCount = subRecordObj.getLineCount({
              sublistId: "inventoryassignment",
            });
            for (var u = subRecordLineCount - 1; u >= 0; u--) {
              subRecordObj.removeLine({
                sublistId: "inventoryassignment",
                line: u,
              });
            }

            if (invDetail && invDetail.length > 0) {
            for (var j = 0; j < invDetail.length; j++) {
              var invDetailObj = invDetail[j];
              var invStatusId = invDetailObj.selectedStatus;
              var lineQty = parseFloat(invDetailObj.qty);
              var lotNo = invDetailObj.lotNO;
              var serNo = invDetailObj.serialNO;
              var binNo = invDetailObj.binNO;

              subRecordObj.selectNewLine({ sublistId: "inventoryassignment" });

              if (isBin) {
                subRecordObj.setCurrentSublistValue({
                  sublistId: "inventoryassignment",
                  fieldId: "binnumber",
                  value: binNo,
                  ignoreFieldChange: false,
                });
              }

              if (isLot) {
                subRecordObj.setCurrentSublistValue({
                  sublistId: "inventoryassignment",
                  fieldId: "receiptinventorynumber",
                  value: lotNo,
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

              if (invStatusId) {
                subRecordObj.setCurrentSublistValue({
                  sublistId: "inventoryassignment",
                  fieldId: "inventorystatus",
                  value: invStatusId,
                  ignoreFieldChange: false,
                });
              }

              if (isLot) {
                subRecordObj.setCurrentSublistValue({
                  sublistId: "inventoryassignment",
                  fieldId: "quantity",
                  value: lineQty,
                  ignoreFieldChange: false,
                });
              } else if (isSer) {
                subRecordObj.setCurrentSublistValue({
                  sublistId: "inventoryassignment",
                  fieldId: "quantity",
                  value: 1,
                  ignoreFieldChange: false,
                });
              } else {
                subRecordObj.setCurrentSublistValue({
                  sublistId: "inventoryassignment",
                  fieldId: "quantity",
                  value: lineQty,
                  ignoreFieldChange: false,
                });
              }

              subRecordObj.commitLine({ sublistId: "inventoryassignment" });
            }
          }
            tranRecObj.commitLine({ sublistId: "item" });
          }

          log.debug("item found at line no::", lineNumber);
        }

        var tranRecObjId = tranRecObj.save({
          enableSourcing: false,
          ignoreMandatoryFields: true,
        });

        var response = {};
        response["tranId"] = tranRecObjId;
        var tranlookUp = utility.fieldLookUp("itemfulfillment", tranRecObjId, [
          "tranid",
        ]);
        response["tranIdText"] = tranlookUp.tranid;

        return response;
      } catch (e) {
        log.debug("error in createFullfillmentRecord", e);
        return {
        error: e.message
       };
      }
    }

    function getBackUpRecordData(backUpRecId) {
      var soData = {
        soId: "",
        Items: [],
      };
      var cusRecObj = search.create({
        type: "customrecord_nst_wms_v3_br_rec",
        filters: [
          ["isinactive", "is", "F"],
          "AND",
          ["internalid", "anyof", backUpRecId],
        ],

        columns: [
          search.createColumn({
            name: "internalid",
            label: "Internal ID",
          }),
          search.createColumn({
            name: "custrecord_ns_wms_v3_created_from_transa",
            label: "CREATED FROM TRANSACTION",
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
          search.createColumn({
            name: "custrecord_ns_wms_v3_transaction_line_no",
            join: "CUSTRECORD_NS_WMS_V3_PARENT_REC",
            label: "Line Number",
          }),
        ],
      });
      var searchResultCount = cusRecObj.runPaged().count;
      log.debug("cusRecObj result count", searchResultCount);
      cusRecObj.run().each(function (result) {
        if (!soData.soId) {
          soData.soId = result.getValue({
            name: "custrecord_ns_wms_v3_created_from_transa",
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
        cRecData["lineNo"] = result.getValue({
          name: "custrecord_ns_wms_v3_transaction_line_no",
          join: "CUSTRECORD_NS_WMS_V3_PARENT_REC",
          label: "Line Number",
        });

        soData.Items.push(cRecData);
        return true;
      });

      return soData;
    }

    //context close
  };
  return { onRequest };
});
