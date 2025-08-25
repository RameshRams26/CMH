/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
  "N/search",
  "N/file",
  "N/record",
  "N/format",
  "../NSWMS V3 Globals/utility_module",
], /**
 * @param{https} https
 * @param{search} search
 * @param{url} url
 */ (search, file, record, format ,utility) => {
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
      log.debug("params::", JSON.stringify(params));
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
          true,
          true
        );
      }
      scriptContext.response.write(JSON.stringify(response));
    } else {
      var params = scriptContext.request.parameters;

      var body = JSON.parse(scriptContext.request.body);

      var response = {};
      if (params["ref"] == "createBackup") {
        response = utility.createBackupRecord(body, "receiveorder");
      } else if (params["ref"] == "apprCompltBackup") {
        response = createItemReceiptRecord(body.recId);
      } else if (params["ref"] == "generateSerialNumbers") {
        response = generateSerialNumbers(body);
      }
      scriptContext.response.write(JSON.stringify(response || {}));
    }

    function getOrderData(body) {
      log.debug("body::", JSON.stringify(body));
      var scannedOrder = body["scannedOrder"];
      var locationId = body["locationId"];
      var setUpData = JSON.parse(body["setUpData"]);
      log.debug("setUpData::", setUpData);

      var columnsary = [
        search.createColumn({ name: "item" }),
        search.createColumn({
          name: "entityid",
          join: "vendor",
        }),
        search.createColumn({
          name: "formulatext",
          formula: "NVL({quantity},0)-NVL({quantityshiprecv},0)",
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
        vendor: "",
        vendorText: "",
        items: [],
      };
      var transactionSearchObj = search.create({
        type: "transaction",
        filters: [
          ["type", "anyof", "PurchOrd"],
          "AND",
          ["mainline", "is", "F"],
          "AND",
          ["numbertext", "is", scannedOrder],
          "AND",
          
          // ["shipping", "is", "F"],
          // "AND",
          ["taxline", "is", "F"],
          "AND",
          ["cogs", "is", "F"],
          "AND",
          ["item.isinactive", "is", "F"],
          "AND",
          ["status", "anyof", "PurchOrd:B", "PurchOrd:D", "PurchOrd:E"],
          "AND",
          ["location", "anyof", locationId],
          "AND",
          [
            "formulanumeric: NVL({quantity},0)-NVL({quantityshiprecv},0)",
            "greaterthan",
            "0",
          ],
        ],
        columns: columnsary,
      });
      var searchResultCount = transactionSearchObj.runPaged().count;
      if (searchResultCount > parseInt(0)) {
        transactionSearchObj.run().each(function (result) {
          if (!orderObj.vendor) {
            orderObj.vendor = result.getValue({
              name: "entityid",
              join: "vendor",
            });
          }
          if (!orderObj.vendorText) {
            orderObj.vendorText = result.getText({
              name: "entityid",
              join: "vendor",
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
          itemObj["quantity"] = result.getValue({
            name: "formulatext",
            formula: "NVL('NVL({quantity},0)-NVL({quantityshiprecv},0)',0)",
          });
          itemObj["lineNo"] = result.getValue({name: "custcol_nst_wms_nestcoreid"});
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

          // itemObj["invBalance"] = utility.getInventoryBalanceByLocation(
          //   setUpData,
          //   itemObj["itemID"],
          //   locationId
          // );

          orderObj.items.push(itemObj);
          return true;
        });
        orderObj.status = "Success";
        orderObj.message = "";
      } else {
        orderObj.status = "Error";
        orderObj.message = "No Match Found";
      }
      //log.debug("orderObj::", JSON.stringify(orderObj));

      return orderObj;
    }
    function createItemReceiptRecord(backUpRecId) {
      try {
        var dataObj = getBackUpRecordData(backUpRecId);
        log.debug("dataObj::", JSON.stringify(dataObj));
        var items = dataObj.Items;
        var wmsUser = dataObj.wmsuser;

        var tranRecObj = record.transform({
          fromType: "purchaseorder",
          fromId: dataObj.poId,
          toType: "itemreceipt",
          isDynamic: true,
        });
        tranRecObj.setValue({ fieldId: "customform", value: 39 });
        tranRecObj.setValue({
          fieldId: "custbody_nst_wms_trans_created_by",
          value: wmsUser,
        });
        var existingLines = tranRecObj.getLineCount({
          sublistId: "item",
        });
        log.debug('existingLines',existingLines);
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
          log.debug('adjQty',adjQty);
          var invDetail = itemObj.InvDetail;
          var lineNumber = tranRecObj.findSublistLineWithValue({
            sublistId: "item",
            fieldId: "custcol_nst_wms_nestcoreid",
            value: lineNo,
          });
          log.debug('lineNumber' , lineNumber);
          if (lineNumber >= -1) {
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
            log.debug('subRecordLineCount',subRecordLineCount)
            for (var u = subRecordLineCount - 1; u >= 0; u--) {
              subRecordObj.removeLine({
                sublistId: "inventoryassignment",
                line: u,
              });
            }
              if (invDetail && invDetail.length > 0) {
                for (var j = 0; j < invDetail.length; j++) {
                  var invDetailObj = invDetail[j];
                  var invStatus = invDetailObj.selectedStatusText;
                  var expiration = invDetailObj.date;
                  var invStatusId = invDetailObj.selectedStatus;
                  var lineQty = invDetailObj.qty;
                  lineQty = parseInt(lineQty);
                  var lotNo = invDetailObj.lotNO;
                  var serNo = invDetailObj.serialNO;
                  var binNo = invDetailObj.binNO;
                  if (isLot) {
                    var date = new Date(expiration);
                    var expDate_ = date.toISOString().substring(0, 10);
                    var expdates = expDate_.split("-");
                    log.debug('expdates' , expdates)
                    var expirationDate =
                      expdates[2] + "/" + expdates[1] + "/" + expdates[0];
                  }
                   subRecordObj.selectNewLine({
                      sublistId: "inventoryassignment",
                    });
                  if (isLot) {
                    subRecordObj.setCurrentSublistValue({
                      sublistId: "inventoryassignment",
                      fieldId: "receiptinventorynumber",
                      value: lotNo,
                      ignoreFieldChange: false,
                    });
                  } 
                  if (isSer) {
                    subRecordObj.setCurrentSublistValue({
                      sublistId: "inventoryassignment",
                      fieldId: "receiptinventorynumber",
                      value: serNo,
                      ignoreFieldChange: false,
                    });
                  }
                  if (binNo) {
                    subRecordObj.setCurrentSublistValue({
                    sublistId: "inventoryassignment",
                    fieldId: "binnumber",
                    value: binNo,
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
                  if (expirationDate) {
                    log.debug('expirationDate' , expirationDate)
                    subRecordObj.setCurrentSublistText({
                      sublistId: "inventoryassignment",
                      fieldId: "expirationdate",
                      value: format.parse({
                        value: invDetailObj.date,
                        type: format.Type.DATE,
                      }),
                      ignoreFieldChange: false,
                    });
                  }
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
        var tranlookUp = utility.fieldLookUp("itemreceipt", tranRecObjId, [
          "tranid",
        ]);
        response["tranIdText"] = tranlookUp.tranid;

        return response;
      } catch (e) {
        log.debug("error in createItemReceiptRecord", e);
         return { e,
                status: 'failure'};
      }
    }
        function getBackUpRecordData(backUpRecId) {
      let poData = {
        poId: '',
        Items: [],
      };
      let cusRecObj = search.create({
        type: 'customrecord_nst_wms_v3_br_rec',
        filters: [['isinactive', 'is', 'F'], 'AND', ['internalid', 'anyof', backUpRecId]],

        columns: [
          search.createColumn({
            name: 'internalid',
            label: 'Internal ID',
          }),
          search.createColumn({
            name: 'custrecord_ns_wms_v3_created_from_transa',
            label: 'CREATED FROM TRANSACTION',
          }),
          search.createColumn({
            name: 'custrecord_ns_wmsv3_location',
            label: 'Location',
          }),
          search.createColumn({
            name: 'custrecord_ns_wms_v3_adj_account',
            label: 'Account',
          }),
          search.createColumn({
            name: 'custrecord_ns_wms_v3_rec_created_by',
            label: 'Created By',
          }),
          search.createColumn({
            name: 'custrecord_ns_wms_adjustment_type',
            join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
            label: 'Adjustment Type Is Positive',
          }),
          search.createColumn({
            name: 'custrecord_ns_wms_v3_item_inv_detail',
            join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
            label: 'Inv Detail',
          }),
          search.createColumn({
            name: 'custrecord_ns_wms_v3_is_bin_item',
            join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
            label: 'Is Bin',
          }),
          search.createColumn({
            name: 'custrecord_ns_wms_v3_is_lot_item',
            join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
            label: 'Is Lot',
          }),
          search.createColumn({
            name: 'custrecord_ns_wms_v3_is_serial_item',
            join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
            label: 'Is Serial',
          }),
          search.createColumn({
            name: 'custrecord_ns_wms_v3_item_name',
            join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
            label: 'Item Name',
          }),
          search.createColumn({
            name: 'custrecord_ns_wms_v3_quantity',
            join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
            label: 'Quantity',
          }),
          search.createColumn({
            name: 'custrecord_ns_wms_v3_transaction_line_no',
            join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
          }),
        ],
      });
      let searchResultCount = cusRecObj.runPaged().count;
      log.debug('cusRecObj result count', searchResultCount);
      cusRecObj.run().each(function (result) {
        if (!poData.poId) {
          poData.poId = result.getValue({
            name: 'custrecord_ns_wms_v3_created_from_transa',
          });
          poData.wmsuser = result.getValue({
            name: 'custrecord_ns_wms_v3_rec_created_by',
          });
        }

        let cRecData = {};
        cRecData['adjType'] = result.getValue({
          name: 'custrecord_ns_wms_adjustment_type',
          join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
          label: 'Adjustment Type Is Positive',
        });
        cRecData['InvDetail'] = result.getValue({
          name: 'custrecord_ns_wms_v3_item_inv_detail',
          join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
          label: 'Inv Detail',
        });
        cRecData['InvDetail'] = JSON.parse(cRecData['InvDetail']);
        cRecData['isBin'] = result.getValue({
          name: 'custrecord_ns_wms_v3_is_bin_item',
          join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
          label: 'Is Bin',
        });
        cRecData['isLot'] = result.getValue({
          name: 'custrecord_ns_wms_v3_is_lot_item',
          join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
          label: 'Is Lot',
        });
        cRecData['isSer'] = result.getValue({
          name: 'custrecord_ns_wms_v3_is_serial_item',
          join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
          label: 'Is Serial',
        });
        cRecData['itemId'] = result.getValue({
          name: 'custrecord_ns_wms_v3_item_name',
          join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
          label: 'Item Name',
        });
        cRecData['AdjQty'] = result.getValue({
          name: 'custrecord_ns_wms_v3_quantity',
          join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
          label: 'Quantity',
        });
        cRecData['lineNo'] = result.getValue({
          name: 'custrecord_ns_wms_v3_transaction_line_no',
          join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
        });
        poData.Items.push(cRecData);
        log.debug('poData', poData);
        return true;
      });

      return poData;
    }
    function generateSerialNumbers(body){
     try{
        var dataObj = body;
        log.debug("generateserial", JSON.stringify(dataObj));
        var itemId = body.itemId;
        var qty = body.qty;
        var item = search.lookupFields({
        type: search.Type.ITEM,
        id: itemId,
        columns: ['itemid']
      });
      log.debug('serial item',item);
       var itemName = item.itemid;
      log.debug('serial_itemname',itemName);
      var prefix = itemName ? itemName.substring(0, 3).toUpperCase() : 'ITM';

      // var maxSerial = 0;
      //   var serialNumberSearch = search.create({
      //     type: "inventorynumber",
      //     filters: [["item", "anyof", itemId]],
      //     columns: [
      //       search.createColumn({
      //         name: "inventorynumber",
      //         sort: search.Sort.DESC,
      //       }),
      //     ],
      //   });

      //   serialNumberSearch.run().each(function (result) {
      //     var serial = result.getValue("inventorynumber");
      //     var parts = serial.split("_");
      //     if (parts.length === 2 && !isNaN(parts[1])) {
      //       var num = parseInt(parts[1], 10);
      //       if (num > maxSerial) {
      //         maxSerial = num;
      //       }
      //     }
      //     return true;
      //   });

      //   var serials = [];
      //   for (var i = 1; i <= qty; i++) {
      //     var newSerialNumber = maxSerial + i;
      //     var serial = prefix + "_" + ("0" + newSerialNumber).slice(-2);
      //     serials.push(serial);
      //   }
     //new
       var existingSerialNumbers = [];
        var serialNumberSearch = search.create({
          type: "inventorynumber",
          filters: [["item", "anyof", itemId]],
          columns: [
            search.createColumn({
              name: "inventorynumber",
              sort: search.Sort.ASC,
            }),
          ],
        });

        serialNumberSearch.run().each(function (result) {
          var serial = result.getValue("inventorynumber");
          var parts = serial.split("_");
          if (parts.length === 2 && !isNaN(parts[1])) {
            existingSerialNumbers.push(parseInt(parts[1], 10));
          }
          return true;
        });

        existingSerialNumbers.sort(function (a, b) {
          return a - b;
        });

        var serials = [];
        var nextAvailableNumbers = [];
        var highestSerial = 0;

        for (
          var n = 1;
          n <= existingSerialNumbers[existingSerialNumbers.length - 1] ||
          n <= qty;
          n++
        ) {
          if (existingSerialNumbers.indexOf(n) === -1) {
            nextAvailableNumbers.push(n);
          }
          if (n > highestSerial) {
            highestSerial = n;
          }
          if (nextAvailableNumbers.length >= qty) {
            break;
          }
        }

        for (var p = nextAvailableNumbers.length; p < qty; p++) {
          highestSerial++;
          nextAvailableNumbers.push(highestSerial);
        }

        for (var i = 0; i < qty; i++) {
          var serialNum = nextAvailableNumbers[i];
          var serial = prefix + "_" + ("0" + serialNum).slice(-2);
          serials.push(serial);
        }

     return {status:"success",serials:serials};
      }catch(e){
        log.debug('Error in generating serial numbers',e);
      }
    }
    //context close
  };
  return { onRequest };
});