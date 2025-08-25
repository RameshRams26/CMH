/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
  "N/search",
  "N/record",
  "N/format",
  "../NSWMS V3 Globals/utility_module",
], (search, record, format, utility) => {
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
      } else if (params["ref"] == "getOrders") {
        response["inboundList"] = getShipmentsList(params["locationId"]);
      } else if (params["ref"] == "getShipmentData") {
        response["Data"] = getShipmentData(
          params["shipmentId"],
          params["locationId"]
        );
      } else if (params["ref"] == "itemData") {
        response = getItemData(
          params["setUpData"],
          params["itemObj"],
          params["locationId"]
        );
      }
      scriptContext.response.setHeader({
        name: "Content-Type",
        value: "application/json",
      });
      scriptContext.response.write(JSON.stringify(response));
    } else {
      var params = scriptContext.request.parameters;
      var body = JSON.parse(scriptContext.request.body);
      var response = {};
      try {
        if (params["ref"] == "createBackup") {
          response = createBackUpAndPalletRecords(body, "inbound");
        } else if (params["ref"] == "apprCmpltBackup") {
          response = receiveInboundShipMent(body.recId);
        }
      } catch (e) {
        log.error("error in " + params["ref"], e);
        response["status"] = "failure";
        response["message"] = e.message;
      }
      scriptContext.response.write(JSON.stringify(response));
    }
  };

  const getShipmentsList = (locationId) => {
    var inboundIds = [],
      inboundList = [];
    var inboundshipmentIds = search.create({
      type: "inboundshipment",
      filters: [
        ["status", "anyof", "inTransit", "partiallyReceived"],
        "AND",
        ["receivinglocation", "anyof", locationId],
      ],
      columns: [
        search.createColumn({
          name: "shipmentnumber",
          summary: "GROUP",
          sort: search.Sort.DESC,
        }),
        search.createColumn({
          name: "internalid",
          summary: "GROUP",
        }),
      ],
    });
    inboundshipmentIds.run().each(function (r) {
      inboundIds.push(
        r.getValue({
          name: "internalid",
          summary: "GROUP",
        })
      );
      return true;
    });
    if (inboundIds.length) {
      var inboundshipmentSearchObj = search.create({
        type: "inboundshipment",
        filters: [["internalid", "anyof", inboundIds]],
        columns: [
          search.createColumn({
            name: "shipmentnumber",
            sort: search.Sort.DESC,
          }),
          search.createColumn({ name: "status" }),
          search.createColumn({ name: "createddate" }),
        ],
      });
      inboundshipmentSearchObj.run().each(function (r) {
        inboundList.push({
          id: r.id,
          docNumber: r.getValue({
            name: "shipmentnumber",
            sort: search.Sort.DESC,
          }),
          status: r.getValue({ name: "status" }),
          date: r.getValue({ name: "createddate" }),
        });
        return true;
      });
    }
    //lg("inboundList::", inboundList);

    return inboundList;
  };
  const getShipmentData = (shipmentId, locationId) => {
    var dataObj = { items: [], poList: [], serailNumbers: {} };
    var poIds = [];

    var inboundshipmentSearchObj = search.create({
      type: "inboundshipment",
      filters: [
        ["shipmentnumber", "anyof", shipmentId],
        "AND",
        [
          "formulanumeric: {quantityexpected}-NVL({quantityreceived},0)",
          "greaterthan",
          "0",
        ],
      ],
      columns: [
        search.createColumn({
          name: "shipmentnumber",
          sort: search.Sort.DESC,
        }),
        search.createColumn({ name: "purchaseorder" }),
        search.createColumn({ name: "item" }),
        search.createColumn({
          name: "displayname",
          join: "item",
        }),
        search.createColumn({ name: "vendor" }),
        search.createColumn({
          name: "formulanumeric1",
          formula: "{quantityexpected}-NVL({quantityreceived},0)",
        }),
        search.createColumn({
          name: "linesequencenumber",
          join: "purchaseOrder",
        }),
        search.createColumn({
          name: "lineuniquekey",
          join: "purchaseOrder",
        }),
        search.createColumn({
          name: "inboundshipmentitemid",
          label: "Items - Line Id",
        }),
        search.createColumn({
          name: "quantityreceived",
          label: "Items - Quantity Received",
        }),
        search.createColumn({
          name: "purchaseunit",
          join: "item",
          label: "Primary Purchase Unit",
        }),
        search.createColumn({
          name: "isserialitem",
          join: "item",
          label: "Is Serialized Item",
        }),
        search.createColumn({
          name: "islotitem",
          join: "item",
          label: "Is Lot Numbered Item",
        }),
      ],
    });
    var serialItemExists = false;
    inboundshipmentSearchObj.run().each(function (r) {
      var tempObj = {
        id: r.getValue({ name: "purchaseorder" }),
        value: r.getText({ name: "purchaseorder" }),
      };
      if (poIds.indexOf(tempObj.id) <= -1) {
        poIds.push(tempObj.id);
        dataObj.poList.push(tempObj);
      }
      var purchaseUnit = r.getText({ name: "purchaseunit", join: "item" });
      var PoQty = r.getValue({
        name: "formulanumeric1",
        formula: "{quantityexpected}-NVL({quantityreceived},0)",
      });
      if (purchaseUnit) {
        if (purchaseUnit.includes("Box")) {
          var number = parseInt(purchaseUnit.match(/\d+/)[0]);
          var qty = parseFloat(PoQty) / number;
        } else {
          var qty = PoQty;
        }
      } else {
        var qty = PoQty;
      }
      let isSerialItem = r.getValue({
        name: "isserialitem",
        join: "item",
        label: "Is Serialized Item",
      });
      let isLotItem = r.getValue({
        name: "islotitem",
        join: "item",
        label: "Is Lot Numbered Item",
      });
      if (isSerialItem) serialItemExists = true;
      dataObj.items.push({
        docNumber: r.getValue({
          name: "shipmentnumber",
          sort: search.Sort.DESC,
        }),
        po: tempObj.id,
        poText: tempObj.value,
        item: r.getValue({ name: "item" }),
        itemText: r.getText({ name: "item" }),
        vendor: r.getValue({ name: "vendor" }),
        vendorText: r.getText({ name: "vendor" }),
        displayName: r.getValue({ name: "displayname", join: "item" }),
        qty: qty,
        rQty: 0,
        lineuniqueKey: r.getValue({
          name: "lineuniquekey",
          join: "purchaseOrder",
        }),
        lineSequenceNo: r.getValue({
          name: "linesequencenumber",
          join: "purchaseOrder",
        }),
        poRate: r.getValue({
          name: "inboundshipmentitemid",
          label: "Items - Line Id",
        }),
        configuredItems: [],
        isConfigured: false,
        isSerialItem: isSerialItem,
        isLotItem: isLotItem,
        receivedQty: utility.replaceWithZero(
          r.getValue({
            name: "quantityreceived",
            label: "Items - Quantity Received",
          })
        ),
        rQty: 0,
      });
      return true;
    });
    if (serialItemExists) {
      dataObj.serailNumbers = getUsedSerialnumbers();
    }
    return dataObj;
  };
  const getItemData = (setUpData, itemData, locationId) => {
    log.debug("itemData", JSON.stringify(itemData));
    var setUpData = JSON.parse(setUpData);
    var itemData = JSON.parse(itemData);
    var itemObj = {},
      invDetail = {};
         var   columns= [
        search.createColumn({ name: "item" }),
        search.createColumn({
          name: "internalid",
          join: "inventoryDetail",
        }),
        search.createColumn({
          name: "inventorynumber",
          join: "inventoryDetail",
        }),
        search.createColumn({
          name: "binnumber",
          join: "inventoryDetail",
        }),
        search.createColumn({
          name: "expirationdate",
          join: "inventoryDetail",
        }),
        search.createColumn({
          name: "quantity",
          join: "inventoryDetail",
        }),
        search.createColumn({
          name: "custitem_wms_lookup_uploaded_image",
          join: "item",
        }),
        search.createColumn({
          name: "displayname",
          join: "item",
        }),
        search.createColumn({
          name: "purchaseunit",
          join: "item",
          label: "Primary Purchase Unit",
        }),
      ]
       if (setUpData["useUpc"] == true) {
      columns.push(
        search.createColumn({
          name: "upccode",
          join: "item",
        })
      );
    }
    if (setUpData["useBins"] == true) {
      columns.push(
        search.createColumn({
          name: "usebins",
          join: "item",
        })
      );
    }
    if (setUpData["useSerial"] == true) {
      columns.push(
        search.createColumn({
          name: "isserialitem",
          join: "item",
        })
      );
    }
    if (setUpData["useLot"] == true) {
      columns.push(
        search.createColumn({
          name: "islotitem",
          join: "item",
        })
      );
    }
     if (setUpData["useInvStatus"] == true) {
      columns.push(
        search.createColumn({
        name: "status",
        join: "inventoryDetail",
        })
      );
    }

    var purchaseorderSearchObj = search.create({
      type: "purchaseorder",
      filters: [
        ["type", "anyof", "PurchOrd"],
        "AND",
        ["internalid", "anyof", itemData.po],
        "AND",
        ["mainline", "is", "F"],
        "AND",
        ["linesequencenumber", "equalto", itemData.lineSequenceNo],
      ],
      columns: columns
    });
    var getItemDetails = true;
    purchaseorderSearchObj.run().each(function (r) {
      if (getItemDetails) {
        itemObj["itemID"] = r.getValue({ name: "item" });
        itemObj["itemName"] = r.getText({ name: "item" });
        var fileId = r.getValue({
          name: "custitem_wms_lookup_uploaded_image",
          join: "item",
        });
        if (fileId) {
          itemObj["image"] = utility.getFileUrl(fileId);
        } else {
          itemObj["image"] =
            "https://st4.depositphotos.com/14953852/22772/v/450/depositphotos_227725052-stock-illustration-image-available-icon-flat-vector.jpg";
        }
        itemObj["upc"] = r.getValue({ name: "upccode", join: "item" });
        itemObj["isBinItem"] = r.getValue({ name: "usebins", join: "item" });
        itemObj["isSerialItem"] = r.getValue({
          name: "isserialitem",
          join: "item",
        });
        itemObj["isLotItem"] = r.getValue({ name: "islotitem", join: "item" });
        itemObj["displayName"] = r.getValue({
          name: "displayname",
          join: "item",
        });
        itemObj["rQty"] = 0;
        itemObj["lineSequenceNo"] = itemData.lineSequenceNo;
        itemObj["lineuniqueKey"] = itemData.lineuniqueKey;
        itemObj["poRate"] = itemData.poRate;
        itemObj["purchaseUnitType"] = r.getText({
          name: "purchaseunit",
          join: "item",
          label: "Primary Purchase Unit",
        });
        getItemDetails = false;
      }

      var tempObj = {
        id: r.getValue({ name: "internalid", join: "inventoryDetail" }),
        invNo: r.getValue({ name: "inventorynumber", join: "inventoryDetail" }),
        invNoText: r.getText({
          name: "inventorynumber",
          join: "inventoryDetail",
        }),
        binNo: r.getValue({ name: "binnumber", join: "inventoryDetail" }),
        binNoText: r.getText({
          name: "binnumber",
          join: "inventoryDetail",
        }),
        //qty: r.getValue({ name: "quantity", join: "inventoryDetail" }),
        invStatus: r.getText({ name: "status", join: "inventoryDetail" }),
        invStatusId: r.getValue({ name: "status", join: "inventoryDetail" }),
        date: r.getValue({
          name: "expirationdate",
          join: "inventoryDetail",
        }),
      };

      var qty = r.getValue({ name: "quantity", join: "inventoryDetail" });

      if (itemObj["purchaseUnitType"]) {
        var purchaseUnitType = itemObj["purchaseUnitType"];
        if (purchaseUnitType.includes("Box")) {
          var number = parseInt(purchaseUnitType.match(/\d+/)[0]);
          tempObj.qty = parseFloat(qty) / number;
        } else {
          tempObj.qty = qty;
        }
      } else {
        tempObj.qty = qty;
      }

      if (tempObj.invNoText) {
        invDetail[tempObj.invNoText] = tempObj;
      }

      return true;
    });

    return {
      itemObj: itemObj,
      invDetail: invDetail,
      status: utility.getAllStatus(),
      bins: utility.getAllBinsByLocation(locationId , setUpData["useStageBins"]),
    };
  };
  const createBackUpAndPalletRecords = (body, from) => {
    //lg("body", body);
    var configuredItems = body.configuredItems;
    var palletIds = [];

    var returnObj = utility.createBackupRecord(body, "inbound");
    returnObj.palletIds = palletIds;
    returnObj.configuredItems = configuredItems;

    return returnObj;
  };
  const receiveInboundShipMent = (backUpRecId) => {
    var dataObj = utility.getBackUpRecordData(backUpRecId);
    // lg("dataObj", dataObj);
    var items = dataObj.Items,
      received = false;
    if (!dataObj.shipId) {
      log.error("shipment Id not found", dataObj.shipId);
    }
    var shipmentRecord = record.load({
      type: record.Type.RECEIVE_INBOUND_SHIPMENT,
      id: dataObj.shipId,
      isDynamic: true,
    });
    var lineCount = shipmentRecord.getLineCount("receiveitems");
    for (var i = 0; i < lineCount; i++) {
      shipmentRecord.selectLine("receiveitems", i);
      shipmentRecord.setCurrentSublistValue(
        "receiveitems",
        "receiveitem",
        false
      );
      shipmentRecord.commitLine("receiveitems", i);
    }
    for (var item in items) {
      var obj = items[item];
      var invDetail = "";
      if (obj.InvDetail) {
        invDetail = obj.InvDetail;
      }
      var lineNo = shipmentRecord.findSublistLineWithValue({
        sublistId: "receiveitems",
        fieldId: "id",
        value: obj.lineNO,
      });
      if (lineNo > -1) {
        if (!received) {
          received = true;
        }

        shipmentRecord.selectLine("receiveitems", lineNo);
        var quantity = utility.replaceWithZero(
          shipmentRecord.getCurrentSublistValue("receiveitems", "quantity")
        );
        var rQuantity = utility.replaceWithZero(
          shipmentRecord.getCurrentSublistValue(
            "receiveitems",
            "quantityreceived"
          )
        );
        var totalQuantity = parseFloat(rQuantity) + parseFloat(obj.AdjQty);
        //lg("quantity", quantity);
        //lg("totalQuantity", totalQuantity);
        if (totalQuantity <= quantity) {
          lg(
            "adj quanity is lessthan originalquanity u can proceed",
            obj.AdjQty
          );
          shipmentRecord.setCurrentSublistValue(
            "receiveitems",
            "receiveitem",
            true
          );
          shipmentRecord.setCurrentSublistValue(
            "receiveitems",
            "quantitytobereceived",
            obj.AdjQty
          );
          if (invDetail) {
            var subRecordObj = shipmentRecord.getCurrentSublistSubrecord({
              sublistId: "receiveitems",
              fieldId: "inventorydetail",
            });
            var subRecordLineCount = subRecordObj.getLineCount({
              sublistId: "inventoryassignment",
            });
            //lg("subRecordLineCount", subRecordLineCount);
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
              if (obj.isLot == true) {
                subRecordObj.setCurrentSublistValue({
                  sublistId: "inventoryassignment",
                  fieldId: "receiptinventorynumber",
                  value: invDetailObj.lotNo,
                  ignoreFieldChange: false,
                });
              } else if (obj.isSer == true) {
                subRecordObj.setCurrentSublistValue({
                  sublistId: "inventoryassignment",
                  fieldId: "receiptinventorynumber",
                  value: invDetailObj.serialNO,
                  ignoreFieldChange: false,
                });
              }
              if (obj.isBin == true && invDetailObj.binNo) {
                subRecordObj.setCurrentSublistValue({
                  sublistId: "inventoryassignment",
                  fieldId: "binnumber",
                  value: invDetailObj.binNo,
                  ignoreFieldChange: false,
                });
              }
              if (invDetailObj.selectedStatus) {
                subRecordObj.setCurrentSublistValue({
                  sublistId: "inventoryassignment",
                  fieldId: "inventorystatus",
                  value: invDetailObj.selectedStatus,
                  ignoreFieldChange: false,
                });
              }

              if (invDetailObj.dateKey) {
                subRecordObj.setCurrentSublistValue({
                  sublistId: "inventoryassignment",
                  fieldId: "expirationdate",
                  value: format.parse({
                    value: invDetailObj.dateKey,
                    type: format.Type.DATE,
                  }),
                  ignoreFieldChange: false,
                });
              }

              subRecordObj.setCurrentSublistValue({
                sublistId: "inventoryassignment",
                fieldId: "quantity",
                value: parseInt(invDetailObj.qty),
                ignoreFieldChange: false,
              });

              subRecordObj.commitLine({
                sublistId: "inventoryassignment",
              });
            }
          }
          shipmentRecord.commitLine("receiveitems", lineNo);
        } else {
          log.audit(
            "Recieving Quantity exceeded for::" + dataObj.shipId,
            obj.lineNO
          );
        }
      }
    }
    if (received) {
      var shipId = shipmentRecord.save();
      var response = {};
      response["status"] = "success";
      response["tranId"] = shipId;
      var tranlookUp = utility.fieldLookUp("inboundshipment", shipId, [
        "shipmentnumber",
      ]);
      response["tranIdText"] = tranlookUp.shipmentnumber;
      return response;
    } else {
      return {
        status: "notSuccess",
      };
    }
  };
  const getUsedSerialnumbers = () => {
    const filters = [["item.isserialitem", "is", "T"]];
    const columns = [
      search.createColumn({
        name: "inventorynumber",
        label: "invNo",
      }),
      search.createColumn({ name: "available", label: "available" }),
    ];

    var mySearch = search.create({
      type: "inventorybalance",
      filters: filters,
      columns: columns,
    });
    var start = 0;
    var serialNos = {};
    do {
      var batchResult = mySearch.run().getRange({
        start: start,
        end: start + 1000,
      });
      for (var i = 0; i < batchResult.length; i++) {
        var invNo = batchResult[i].getText({
          name: "inventorynumber",
          label: "invNo",
        });
        if (!serialNos.hasOwnProperty(invNo)) {
          serialNos[invNo] = parseFloat(
            batchResult[i].getValue({
              name: "available",
              label: "available",
            })
          );
        }
      }
      start += 1000;
    } while (batchResult.length == 1000);
    //log.debug("serialNos", JSON.stringify(serialNos));
    return serialNos;
  };
  const lg = (title, message) => {
    log.debug(title, JSON.stringify(message));
  };

  return {
    onRequest: onRequest,
  };
});