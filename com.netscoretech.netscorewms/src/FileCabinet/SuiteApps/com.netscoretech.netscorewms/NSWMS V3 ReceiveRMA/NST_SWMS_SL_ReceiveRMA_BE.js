/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(["N/search", "N/record", "../NSWMS V3 Globals/utility_module"], (
  search,
  record,
  utility
) => {
  const onRequest = (scriptContext) => {
    if (scriptContext.request.method === "GET") {
      var params = scriptContext.request.parameters;
      var response = {};
      try {
        if (params["ref"] == "getSetUpData") {
          response["setUpData"] = utility.getSetUpRecordData(params["setUpId"]);
          response["locationObj"] = utility.fieldLookUp(
            "location",
            params["locationId"],
            ["name"]
          );
        } else if (params["ref"] == "getrmas") {
          response = getPendingRmas(
            params["scannedOrder"],
            params["locationId"]
          );
        } else if (params["ref"] == "itemData") {
          response = getItemData(
            params["setUpData"],
            params["itemObj"],
            params["locationId"]
          );
        }
      } catch (e) {
        log.error("error in " + params["ref"], e);
        response["status"] = "failure";
        response["message"] = e.message;
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
          response = utility.createBackupRecord(body, "rma");
          response.configuredItems = body.configuredItems;
        } else if (params["ref"] == "apprCmpltBackup") {
          response = receiveRMA(body.recId);
        }
      } catch (e) {
        log.error("error in " + params["ref"], e);
        response["status"] = "failure";
        response["message"] = e.message;
      }
      scriptContext.response.write(JSON.stringify(response));
    }
  };
  const getPendingRmas = (scannedOrder, locationId) => {
    var dataObj = { items: [], poList: [], serailNumbers: {}, poId: "", isLineNumberAvl: false };
    var poIds = [];

    var inboundshipmentSearchObj = search.create({
      type: "returnauthorization",
      filters: [
        ["type", "anyof", "RtnAuth"],
        "AND",
        ["status", "anyof", "RtnAuth:E", "RtnAuth:D", "RtnAuth:B"],
        "AND",
        ["mainline", "is", "F"],
        "AND",
        ["taxline", "is", "F"],
        "AND",
        ["cogs", "is", "F"],
        "AND",
        ["shipping", "is", "F"],
        "AND",
        ["shipping", "is", "F"],
        "AND",
        ["tranid", "is", scannedOrder],
        "AND",
        ["location", "anyof", locationId],
      ],
      columns: [
        search.createColumn({
          name: "tranid",
          join: "createdFrom",
          label: "createdFrom",
        }),
        search.createColumn({
          name: "tranid",
          sort: search.Sort.DESC,
          label: "docNo",
        }),
        search.createColumn({ name: "item", label: "item" }),
        search.createColumn({ name: "upccode", join: "item" }),
        //search.createColumn({name : 'custitem_nst_wms_item_cust_ref' , join: "item"}),
        search.createColumn({
          name: "displayname",
          join: "item",
          label: "Displayname",
        }),
        search.createColumn({
          name: "formulanumeric",
          formula: "NVL(ABS({quantity}), 0) -  NVL({quantityshiprecv}, 0)",
          label: "quantity",
        }),
        search.createColumn({ name: "unit", label: "Units" }),
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
        search.createColumn({
          name: "linesequencenumber",
          label: "lineSequenceNo",
        }),
        search.createColumn({
          name: "custcol_nst_wms_nestcoreid",
        }),
      ],
    });
    var serialItemExists = false;
    inboundshipmentSearchObj.run().each(function (r) {
      dataObj.poId = r.id;
      var tempObj = {
        id: r.id,
        value: r.getValue({
          name: "tranid",
          sort: search.Sort.DESC,
          label: "docNo",
        }),
      };
      if (poIds.indexOf(tempObj.id) <= -1) {
        poIds.push(tempObj.id);
        dataObj.poList.push(tempObj);
      }
      var purchaseUnit = r.getValue({ name: "unit", label: "Units" });
      var netscoreLineuniqueKey = r.getValue({
        name: "custcol_nst_wms_nestcoreid",
      });
      log.debug('netscoreLineuniqueKey', netscoreLineuniqueKey);
      if (netscoreLineuniqueKey) {
        dataObj.isLineNumberAvl = true
      } else {
        dataObj.isLineNumberAvl = false;
      }
      var PoQty = r.getValue({
        name: "formulanumeric",
        formula: "NVL(ABS({quantity}), 0) -  NVL({quantityshiprecv}, 0)",
        label: "quantity",
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
      if (qty > 0) {
              dataObj.items.push({
        createdFrom: r.getValue({
          name: "tranid",
          join: "createdFrom",
          label: "createdFrom",
        }),
        po: tempObj.id,
        poText: tempObj.value,
        item: r.getValue({ name: "item" }),
        itemText: r.getText({ name: "item" }),
        upc: r.getValue({ name: "upccode", join: "item" }),
        // itemCustRef : r.getValue({name : 'custitem_nst_wms_item_cust_ref' , join: "item"}),
        displayName: r.getValue({ name: "displayname", join: "item" }),
        qty: qty,
        rQty: 0,
        // lineuniqueKey: r.getValue({
        //   name: "item",
        // }),
        lineuniqueKey: r.getValue({
          name: "custcol_nst_wms_nestcoreid",
        }),

        lineSequenceNo: r.getValue({
          name: "linesequencenumber",
          label: "lineSequenceNo",
        }),
        configuredItems: [],
        isConfigured: false,
        isSerialItem: isSerialItem,
        isLotItem: isLotItem,
        rQty: 0,
      });
      }
      return true;
    });
    if (serialItemExists) {
      dataObj.serailNumbers = getUsedSerialnumbers();
    }
    return dataObj;
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

  const getItemData = (setUpData, itemData, locationId) => {
    var setUpData = JSON.parse(setUpData);
    var itemData = JSON.parse(itemData);
    var itemObj = {},
      invDetail = {},
      columns = [
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
          name: "islotitem",
          join: "item",
        }),
        search.createColumn({
          name: "isserialitem",
          join: "item",
        }),
        search.createColumn({
          name: "usebins",
          join: "item",
        }),
        search.createColumn({
          name: "upccode",
          join: "item",
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
      ];
    log.debug('setUpData["useInvStatus"]', setUpData["useInvStatus"])
    if (setUpData["useInvStatus"]) {
      columns.push(
        search.createColumn({
          name: "status",
          join: "inventoryDetail",
        })
      );
    }
    var purchaseorderSearchObj = search.create({
      type: "returnauthorization",
      filters: [
        ["internalid", "anyof", itemData.po],
        "AND",
        ["mainline", "is", "F"],
        "AND",
        ["linesequencenumber", "equalto", itemData.lineSequenceNo],
      ],
      columns: columns,
    });
    var getItemDetails = true,
      invNos = [];
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
      invDetail = getInventoryBalanceByLocation(
        setUpData,
        itemObj["itemID"],
        locationId
      );
      return true;
    });

    return {
      itemObj: itemObj,
      invDetail: invDetail,
      status: utility.getAllStatus(),
      bins: getStagingBins(locationId),
      stageBins: utility.getStageBinsForLocation(locationId),
    };
  };

  function getInventoryBalanceByLocation(setUpData, itemId, locationId) {
    var locationData = {};
    var columns = [
      search.createColumn({ name: "item" }),
      search.createColumn({ name: "location" }),
      search.createColumn({ name: "onhand" }),
      search.createColumn({ name: "available" }),

    ];
    if (setUpData["useBins"] == true) {
      columns.push(
        search.createColumn({
          name: "binnumber",
        })
      );
    }
    if (setUpData["useSerial"] == true || setUpData["useLot"] == true) {
      columns.push(
        search.createColumn({
          name: "inventorynumber",
        })
      );
    }
    if (setUpData["useLot"] == true) {
      columns.push(
        search.createColumn({
          name: "expirationdate",
          join: "inventoryNumber",
        })
      );
    }

    if (setUpData["useInvStatus"] == true) {
      columns.push(
        search.createColumn({
          name: "status",
        })
      );
    }
    var filters = [
      ["item", "anyof", itemId],
      "AND",
      ["onhand", "greaterthan", "0"],
      "AND",
      ["available", "greaterthan", "0"],
    ];
    if (locationId) {
      filters.push("AND");
      filters.push(["location", "anyof", locationId]);
    }

    var inventorybalanceSearchObj = search.create({
      type: "inventorybalance",
      filters: filters,
      columns: columns,
    });
    inventorybalanceSearchObj.run().each(function (result) {
      var locationText = result.getValue({ name: "location" });
      var onHand = result.getValue({ name: "onhand" });
      var available = result.getValue({
        name: "available",
        label: "Available",
      });

      var location = result.getText({
        name: "location",
        label: "Location",
      });

      if (locationData[locationText] == undefined) {
        locationData[locationText] = {};
      }
      if (locationData[locationText]["locationId"] == undefined) {
        locationData[locationText]["locationId"] = location;
        locationData[locationText]["location"] = locationText;
      }

      if (locationData[locationText]["onHand"] == undefined) {
        locationData[locationText]["onHand"] = 0;
      }
      locationData[locationText]["onHand"] += Number(onHand);

      if (locationData[locationText]["available"] == undefined) {
        locationData[locationText]["available"] = 0;
      }
      locationData[locationText]["available"] += Number(available);

      if (locationData[locationText]["inventoryDetail"] == undefined) {
        locationData[locationText]["inventoryDetail"] = [];
      }
      var inventoryDetailObj = {};
      inventoryDetailObj["id"] = result.id;
      if (setUpData["useBins"] == true) {
        inventoryDetailObj["binNo"] = result.getValue({ name: "binnumber" });
        inventoryDetailObj["binNoText"] = result.getText({
          name: "binnumber",
        });
      }
      if (setUpData["useSerial"] == true || setUpData["useLot"] == true) {
        inventoryDetailObj["invNo"] = result.getValue({
          name: "inventorynumber",
        });
        inventoryDetailObj["invNoText"] = result.getText({
          name: "inventorynumber",
        });
      }
      if (setUpData["useInvStatus"] == true) {
        inventoryDetailObj["invStatus"] = result.getText({
          name: "status",
        });
        inventoryDetailObj["invStatusId"] = result.getValue({
          name: "status",
        });
      }
      if (setUpData["useLot"] == true) {
        inventoryDetailObj["expirationDate"] = result.getValue({
          name: "expirationdate",
          join: "inventoryNumber",
        });
      }
      inventoryDetailObj["onHand"] = onHand;
      inventoryDetailObj["qty"] = available;
      locationData[locationText]["inventoryDetail"].push(inventoryDetailObj);
      return true;
    });

    return locationData;
  }


  const getStagingBins = (locationId) => {
    var bins = [];
    var binSearchObj = search.create({
      type: "bin",
      filters: [
        // ["custrecord_staging_bin", "is", "T"],
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

  const receiveRMA = (backUpRecId) => {
    var dataObj = utility.getBackUpRecordData(backUpRecId);
    var wmsUser = dataObj.wmsuser;
    lg("dataObj", dataObj);
    var items = dataObj.Items,
      needSave = false;
    if (!dataObj.soId) {
      log.error("shipment Id not found", dataObj.shipId);
      return { status: "error", message: "Transaction ID not found." };
    }

    var tranRecObj = record.transform({
      fromType: record.Type.RETURN_AUTHORIZATION,
      fromId: dataObj.soId,
      toType: record.Type.ITEM_RECEIPT,
      isDynamic: false,
    });
    tranRecObj.setValue({
      fieldId: "custbody_nst_wms_trans_crtdby",
      value: dataObj.createdBy,
    });
    tranRecObj.setValue({
      fieldId: "custbody_nst_wms_trans_created_by",
      value: wmsUser,
    });
    var existingLines = tranRecObj.getLineCount({
      sublistId: "item",
    });
    for (var i = 0; i < existingLines; i++) {
      tranRecObj.setSublistValue({
        sublistId: "item",
        fieldId: "itemreceive",
        line: i,
        value: false,
      });
    }

    for (var item = 0; item < items.length; item++) {
      var itemObj = items[item];
      log.debug('itemObj', JSON.stringify(itemObj));
      var invDetail = itemObj.InvDetail;
      var isBin = itemObj.isBin;
      var isLot = itemObj.isLot;
      var isSer = itemObj.isSer;
      var lineNumber = tranRecObj.findSublistLineWithValue({
        sublistId: "item",
        fieldId: "custcol_nst_wms_nestcoreid",
        value: itemObj.lineNO,
      });
      log.debug('lineNumber', lineNumber);
      if (lineNumber > -1) {
        needSave = true;
        tranRecObj.setSublistValue({
          sublistId: "item",
          fieldId: "itemreceive",
          line: lineNumber,
          value: true,
        });
        tranRecObj.setSublistValue({
          sublistId: "item",
          fieldId: "quantity",
          line: lineNumber,
          value: parseFloat(itemObj.AdjQty),
        });
        var subRecordObj = tranRecObj.getSublistSubrecord({
          sublistId: "item",
          fieldId: "inventorydetail",
          line: lineNumber,
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
            if (isLot) {
              subRecordObj.setSublistValue({
                sublistId: "inventoryassignment",
                fieldId: "receiptinventorynumber",
                line: j,
                value: invDetailObj.lotNo,
                ignoreFieldChange: false,
              });
            }
            if (isBin) {
              subRecordObj.setSublistValue({
                sublistId: "inventoryassignment",
                fieldId: "binnumber",
                line: j,
                value: invDetailObj.binNo,
                ignoreFieldChange: false,
              });
            }
            if (isSer) {
              subRecordObj.setSublistValue({
                sublistId: "inventoryassignment",
                fieldId: "receiptinventorynumber",
                line: j,
                value: invDetailObj.serialNO,
                ignoreFieldChange: false,
              });
            }
            if (invDetailObj.selectedStatus) {
              subRecordObj.setSublistValue({
                sublistId: "inventoryassignment",
                fieldId: "inventorystatus",
                line: j,
                value: invDetailObj.selectedStatus,
                ignoreFieldChange: false,
              });
            }
            subRecordObj.setSublistValue({
              sublistId: "inventoryassignment",
              fieldId: "quantity",
              line: j,
              value: invDetailObj.qty,
              ignoreFieldChange: false,
            });
          }
        } else {
          log.error(
            "inventory detail not found for tran::" + dataObj.soId,
            itemObj.itemId
          );
        }
      } else {
        lg("lineNumber", "Not Found");
      }
    }
    if (!needSave) return "";
    var tranRecObjId = tranRecObj.save({
      enableSourcing: false,
      ignoreMandatoryFields: true,
    });
    var tranlookUp = utility.fieldLookUp(
      record.Type.ITEM_RECEIPT,
      tranRecObjId,
      ["tranid"]
    );
    var response = {};
    response["tranId"] = tranRecObjId;
    record.submitFields({
      type: 'customrecord_nst_wms_v3_br_rec',
      id: backUpRecId,
      values: {
        'custrecord_ns_wms_v3_ref_transaction': response.tranId,
      }
    });
    return {
      tranId: tranlookUp.tranid,
      tranRecObjId: tranRecObjId,
    };
  };

function lg(title, message) {
  log.debug(title, JSON.stringify(message));
}
return { onRequest };
});