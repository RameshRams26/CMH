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
          true,
          true
        );
      }
      scriptContext.response.write(JSON.stringify(response));
    } else {
      var params = scriptContext.request.parameters;
      var body = JSON.parse(scriptContext.request.body);
      var response = {};
      try {
        if (params["ref"] == "createBackup") {
          response = utility.createBackupRecord(body, "receivetransferorder");
        } else if (params["ref"] == "apprCompltBackup") {
          response = createItemReceiptRecord(body.recId);
        }
      } catch (e) {
        log.error("error in " + params["ref"], e);
        response["status"] = "failure";
        response["message"] = e.message;
      }
      scriptContext.response.write(JSON.stringify(response));
    }
  };

  const getOrderData = (body) => {
    var scannedOrder = body["scannedOrder"],
      locationId = body["locationId"],
      //setUpData = JSON.parse(body["setUpData"]),
      orderObj = {
        orderId: "",
        orderText: scannedOrder,
        invDetails: {},
        bins: getStagingBins(locationId),
        items: [],
      };
    let itemIds = [];
    var transferorderSearchObj = search.create({
      type: "transferorder",
      filters: [
        ["type", "anyof", "TrnfrOrd"],
        "AND",
        ["status", "anyof", "TrnfrOrd:D", "TrnfrOrd:E", "TrnfrOrd:F"],
        "AND",
        ["numbertext", "is", scannedOrder],
        "AND",
        ["mainline", "is", "F"],
        "AND",
        [
          "formulanumeric: NVL(ABS({transferorderquantityshipped}), 0) -  NVL({transferorderquantityreceived}, 0)",
          "greaterthan",
          "0",
        ],
        "AND",
        ["transactionlinetype", "anyof", "ITEM"],
        "AND",
        ["transferlocation", "anyof", locationId],
      ],
      columns: [
        search.createColumn({ name: "item" }),
        search.createColumn({
          name: "itemid",
          join: "item",
        }),
        search.createColumn({
          name: "upccode",
          join: "item",
        }),
        search.createColumn({
          name: "usebins",
          join: "item",
        }),
        search.createColumn({
          name: "islotitem",
          join: "item",
        }),
        search.createColumn({
          name: "isserialitem",
          join: "item",
        }),
        search.createColumn({
          name: "transactionlinetype",
        }),
        search.createColumn({
          name: "formulanumeric",
          formula:
            "NVL(ABS({transferorderquantityshipped}), 0) -  NVL({transferorderquantityreceived}, 0)",
        }),
        search.createColumn({ name: "custcol_nst_wms_nestcoreid" }),
      ],
    });
    transferorderSearchObj.run().each(function (r) {
      if (!orderObj.orderId) {
        orderObj.orderId = r.id;
      }
      itemIds.push(r.getValue({ name: "item" }));
      orderObj.items.push({
        itemID: r.getValue({ name: "item" }),
        itemName: r.getText({ name: "item" }),
        upc: r.getValue({ name: "upccode", join: "item" }),
        quantity: r.getValue({
          name: "formulanumeric",
          formula:
            "NVL(ABS({transferorderquantityshipped}), 0) -  NVL({transferorderquantityreceived}, 0)",
        }),
        configuredItems: [],
        isBinItem: r.getValue({ name: "usebins", join: "item" }),
        isSerialItem: r.getValue({ name: "isserialitem", join: "item" }),
        isLotItem: r.getValue({ name: "islotitem", join: "item" }),
        lineuniquekey: r.getValue({ name: "custcol_nst_wms_nestcoreid" }),
      });
      return true;
    });
    orderObj.invDetails = getInventoryDetails(itemIds, orderObj.orderId);
    var ifIds = getIfIds(itemIds, orderObj.orderId);
    for (var i = 0; i < orderObj.items.length; i++) {
      let obj = orderObj.items[i];
      let itemId = obj.itemID;
      let uniquekey = parseFloat(obj.lineuniquekey) + 1;
      if (ifIds[itemId + "_" + uniquekey]) {
        obj.ifId = ifIds[itemId + "_" + uniquekey];
      } else {
        obj.ifId = "";
      }
      orderObj.items[i] = obj;
    }
    return orderObj;
  };
  const getInventoryDetails = (itemIds, toId) => {
    var inventoryDetails = {};
    if (!itemIds.length) return inventoryDetails;

    var itemfulfillmentSearchObj = search.create({
      type: "itemfulfillment",
      filters: [
        ["type", "anyof", "ItemShip"],
        "AND",
        ["createdfrom", "anyof", toId],
        "AND",
        ["taxline", "is", "F"],
        "AND",
        ["cogs", "is", "F"],
        "AND",
        ["item", "anyof", itemIds],
      ],
      columns: [
        search.createColumn({ name: "item" }),
        search.createColumn({
          name: "inventorynumber",
          join: "inventoryDetail",
        }),
      ],
    });
    itemfulfillmentSearchObj.run().each(function (r) {
      var itemId = r.getValue({ name: "item" });
      if (!inventoryDetails[itemId]) {
        inventoryDetails[itemId] = [];
      }
      inventoryDetails[itemId].push(
        r.getText({ name: "inventorynumber", join: "inventoryDetail" })
      );
      return true;
    });
    return inventoryDetails;
  };
  const getIfIds = (itemIds, toId) => {
    var ifDetails = {};
    if (!itemIds.length) return ifDetails;
    var transferorderSearchObj = search.create({
      type: "transferorder",
      filters: [
        ["type", "anyof", "TrnfrOrd"],
        "AND",
        ["internalid", "anyof", toId],
        "AND",
        ["transactionlinetype", "anyof", "SHIPPING"],
        "AND",
        ["item", "anyof", itemIds],
        "AND",
        ["applyingtransaction.type", "anyof", "ItemShip"],
      ],
      columns: [
        search.createColumn({ name: "item" }),
        search.createColumn({
          name: "custcol_nst_wms_nestcoreid",
        }),
        search.createColumn({ name: "applyingtransaction" }),
      ],
    });
    transferorderSearchObj.run().each(function (r) {
      let itemId = r.getValue({ name: "item" });
      let uniqueKey = r.getValue({ name: "custcol_nst_wms_nestcoreid" });
      ifDetails[itemId + "_" + uniqueKey] = r.getValue({
        name: "applyingtransaction",
      });
      return true;
    });
    return ifDetails;
  };
  const getStagingBins = (locationId) => {
    var bins = [];
    var binSearchObj = search.create({
      type: "bin",
      filters: [
        // ["custrecord_nst_wms_staging_bin", "is", "T"],
        // "AND",
        ["inactive", "is", "F"],
        "AND",
        ["location", "anyof", locationId],
      ],
      columns: [
        search.createColumn({
          name: "binnumber",
          sort: search.Sort.ASC,
        }),
      ],
    });
    binSearchObj.run().each(function (r) {
      bins.push({
        id: r.id,
        value: r.getValue({ name: "binnumber", sort: search.Sort.ASC }),
      });
      return true;
    });
    return bins;
  };
  const createItemReceiptRecord = (backUpRecId) => {
    var dataObj = utility.getBackUpRecordData(backUpRecId);
    var items = dataObj.Items,
      receipts = "",
      receiptIds = [],
      ifObj = {};
    items.forEach((itemObj) => {
      if (ifObj[itemObj.tranNO] == undefined) {
        ifObj[itemObj.tranNO] = [];
      }
      ifObj[itemObj.tranNO].push(itemObj);
    });

    for (var key in ifObj) {
      if (key && ifObj[key]) {
        let reponseObj = transformRecord(dataObj.soId, key, ifObj[key]);
        log.audit("receipt created:", JSON.stringify(reponseObj));
        receiptIds.push(reponseObj.id);
        let docNo = reponseObj.docNo;
        receipts += receipts ? "," : "";
        receipts += docNo;
      }
    }
    utility.submitFields("customrecord_nst_wms_v3_br_rec", backUpRecId, {
      custrecord_ns_wms_v3_ref_transaction: receiptIds,
    });
    return receipts;
  };
  const transformRecord = (toId, ifId, items) => {
    log.debug(toId + "--" + ifId, JSON.stringify(items));
    var tranRecObj = record.transform({
      fromType: record.Type.TRANSFER_ORDER,
      toType: record.Type.ITEM_RECEIPT,
      fromId: toId,
      isDynamic: true,
      defaultValues: {
        itemfulfillment: ifId,
      },
    });
    var existingLines = tranRecObj.getLineCount({
      sublistId: "item",
    });
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
      var adjQty = itemObj.AdjQty;
      adjQty = parseInt(adjQty);
      var invDetail = itemObj.InvDetail;
      var lineNumber = tranRecObj.findSublistLineWithValue({
        sublistId: "item",
        fieldId: "custcol_nst_wms_nestcoreid",
        value: itemObj.lineNO,
      });
      if (lineNumber > -1) {
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
        if (isBin || isSer || isLot) {
          if (invDetail) {
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
            for (var j = 0; j < invDetail.length; j++) {
              var invDetailObj = invDetail[j];

              subRecordObj.selectNewLine({
                sublistId: "inventoryassignment",
              });
              if (isSer) {
                subRecordObj.setCurrentSublistValue({
                  sublistId: "inventoryassignment",
                  fieldId: "receiptinventorynumber",
                  value: invDetailObj.serialNO,
                  ignoreFieldChange: false,
                });
              } else if (isLot) {
                subRecordObj.setCurrentSublistValue({
                  sublistId: "inventoryassignment",
                  fieldId: "receiptinventorynumber",
                  value: invDetailObj.lotNO,
                  ignoreFieldChange: false,
                });
              }
              if (isBin) {
                subRecordObj.setCurrentSublistValue({
                  sublistId: "inventoryassignment",
                  fieldId: "binnumber",
                  value: invDetailObj.binNO,
                  ignoreFieldChange: false,
                });
              }
              subRecordObj.setCurrentSublistValue({
                sublistId: "inventoryassignment",
                fieldId: "quantity",
                value: parseFloat(invDetailObj.qty),
                ignoreFieldChange: false,
              });
              subRecordObj.commitLine({
                sublistId: "inventoryassignment",
              });
            }
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
    response["id"] = tranRecObjId;
    var tranlookUp = utility.fieldLookUp("itemreceipt", tranRecObjId, [
      "tranid",
    ]);
    response["docNo"] = tranlookUp.tranid;
    return response;
  };

  return { onRequest };
});
