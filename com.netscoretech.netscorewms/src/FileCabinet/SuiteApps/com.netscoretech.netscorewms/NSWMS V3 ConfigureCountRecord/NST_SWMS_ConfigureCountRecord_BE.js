/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(["N/search", "N/record", "../NSWMS V3 Globals/utility_module", 'N/action'], (
  search,
  record,
  utility,action
) => {
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
        response["invCountRecdata"] = getInvCountRecData(params["tranId"]);
      } else if (params["ref"] == "itemData") {
        response = getItemData(
          params["setUpData"],
          params["scannedItem"],
          params["locationId"],
          params["binNo"]
        );
      }
      scriptContext.response.write(JSON.stringify(response));
    } else {
      var params = scriptContext.request.parameters;
      var body = JSON.parse(scriptContext.request.body);
      var response = {};
      if (params["ref"] == "createBackup") {
        response = utility.createBackupRecord(body, "configcount");
      } else if (params["ref"] == "apprCmpltBackup") {
        try {
          response = createCnfigCountRecord(body.recId, body.tranId);
        } catch (e) {
          log.error("error in " + params["ref"], e);
          response["status"] = "failure";
          response["message"] = e;
        }
      }
      scriptContext.response.write(JSON.stringify(response));
    }
  };
  const getInvCountRecData = (tranId) => {
    var dataObj = { items: [], backUpRecId: "", backUpRecText: "" };
    var tranObj = record.load({
      type: record.Type.INVENTORY_COUNT,
      id: tranId,
      isDynamic: true,
    });

    dataObj.tranId = tranId;
    dataObj.tranNo = tranObj.getValue({
      fieldId: "transactionnumber",
    });

    var lineCount = tranObj.getLineCount({
      sublistId: "item",
    });
    var invDetailsIds = [];
    for (var i = 0; i < lineCount; i++) {
      var id = tranObj.getSublistValue({
        sublistId: "item",
        fieldId: "countdetail",
        line: i,
      });
      dataObj.items.push({
        itemId: tranObj.getSublistValue({
          sublistId: "item",
          fieldId: "item",
          line: i,
        }),
        itemName: tranObj.getSublistText({
          sublistId: "item",
          fieldId: "item",
          line: i,
        }),
        binNo: tranObj.getSublistValue({
          sublistId: "item",
          fieldId: "binnumber",
          line: i,
        }),
        binNoText: tranObj.getSublistText({
          sublistId: "item",
          fieldId: "binnumber",
          line: i,
        }),
        quantity: utility.replaceWithZero(
          tranObj.getSublistValue({
            sublistId: "item",
            fieldId: "countquantity",
            line: i,
          })
        ),
        lineNo: i + 1,
        invDetailId: id,
        configuredItems: [],
      });
      if (id) {
        invDetailsIds.push(id);
      }
    }

    if (invDetailsIds.length) {
      var obj = {};
      var inventorydetailSearchObj = search.create({
        type: "inventorydetail",
        filters: [["internalid", "anyof", invDetailsIds]],
        columns: [
          search.createColumn({
            name: "inventorynumber",
            sort: search.Sort.ASC,
          }),
          search.createColumn({ name: "status", label: "Status" }),
          search.createColumn({ name: "quantity", label: "Quantity" }),
          search.createColumn({
            name: "isserialitem",
            join: "item",
          }),
          search.createColumn({
            name: "islotitem",
            join: "item",
          }),
        ],
      });
      inventorydetailSearchObj.run().each(function (result) {
        if (!obj[result.id]) {
          obj[result.id] = [];
        }
        var isSerial = result.getValue({
          name: "isserialitem",
          join: "item",
        });
        var isLot = result.getValue({
          name: "islotitem",
          join: "item",
        });
        var tempObj = {};

        if (isSerial || isSerial == true) {
          tempObj["serialNo"] = result.getText({
            name: "inventorynumber",
            sort: search.Sort.ASC,
          });
          tempObj["serialNoId"] = result.getValue({
            name: "inventorynumber",
            sort: search.Sort.ASC,
          });
        } else if (isLot || isLot == true) {
          tempObj["lotNO"] = result.getText({
            name: "inventorynumber",
            sort: search.Sort.ASC,
          });
          tempObj["lotNOId"] = result.getValue({
            name: "inventorynumber",
            sort: search.Sort.ASC,
          });
        }
        tempObj["selectedStatus"] = result.getValue({
          name: "status",
          label: "Status",
        });
        tempObj["selectedStatusText"] = result.getText({
          name: "status",
          label: "Status",
        });
        tempObj["adjQty"] = result.getValue({
          name: "quantity",
          label: "Quantity",
        });
        obj[result.id].push(tempObj);
        return true;
      });
      for (var i = 0; i < dataObj.items.length; i++) {
        var itemObj = dataObj.items[i];
        if (itemObj["invDetailId"]) {
          if (obj[itemObj["invDetailId"]]) {
            itemObj["configuredItems"] = obj[itemObj["invDetailId"]];
          }
        }
      }
    }

    var customrecord_nst_wms_v3_br_recSearchObj = search.create({
      type: "customrecord_nst_wms_v3_br_rec",
      filters: [
        ["custrecord_ns_wms_v3_ref_transaction.internalid", "anyof", tranId],
        "AND",
        ["custrecord_ns_wms_v3_ref_transaction.mainline", "is", "T"],
      ],
      columns: [search.createColumn({ name: "name" })],
    });
    customrecord_nst_wms_v3_br_recSearchObj.run().each(function (result) {
      dataObj.backUpRecId = result.id;
      dataObj.backUpRecText = result.getValue({ name: "name" });
    });

    return dataObj;
  };
  const getItemData = (setUpData, scannedItem, locationId, binNo) => {
    var setUpData = JSON.parse(setUpData);
    var filtersary = filtersary = [
      ["name", "is", scannedItem],
         "OR",
      ["internalid","anyof", scannedItem]
    ];;
    // filtersary.push(["name", "is", scannedItem]);
    filtersary.push("AND"), filtersary.push(["isinactive", "is", "F"]);
    filtersary.push("AND"),
      filtersary.push(["locationquantityonhand", "greaterthan", "0"]);
    var columnsary = [
      search.createColumn({ name: "itemid" }),
      search.createColumn({ name: "unitstype" }),
      search.createColumn({ name: "stockunit" }),
      search.createColumn({ name: "locationquantityonhand" }),
      search.createColumn({ name: "locationquantityavailable" }),
      search.createColumn({ name: "quantitycommitted" }),
      search.createColumn({ name: "salesdescription" }),
      search.createColumn({ name: "baseprice" }),
      search.createColumn({ name: "displayname" }),
      search.createColumn({ name: "custitem_nst_wms_lookup_uploaded_image" }),
      search.createColumn({ name: "type" }),
    ];

    if (setUpData["useUpc"] == true) {
      columnsary.push(
        search.createColumn({
          name: "upccode",
        })
      );
    }
    if (setUpData["useBins"] == true) {
      columnsary.push(
        search.createColumn({
          name: "usebins",
        })
      );
    }
    if (setUpData["useSerial"] == true) {
      columnsary.push(
        search.createColumn({
          name: "isserialitem",
        })
      );
    }
    if (setUpData["useLot"] == true) {
      columnsary.push(
        search.createColumn({
          name: "islotitem",
        })
      );
    }

    var itemDataSearch = search.create({
      type: "item",
      filters: filtersary,
      columns: columnsary,
    });

    var itemDataCount = itemDataSearch.runPaged().count;
    if (itemDataCount <= 0) {
      return { status: "failure", message: "Item not found!!." };
    }

    var itemObj = { status: "success" };
    itemDataSearch.run().each(function (result) {
      itemObj["itemID"] = result.id;
      itemObj["itemName"] = result.getValue({ name: "itemid" });
      itemObj["units"] = result.getText({ name: "unitstype" });
      itemObj["stockUnit"] = result.getText({ name: "stockunit" });
      itemObj["onHand"] = result.getValue({ name: "locationquantityonhand" });
      itemObj["available"] = result.getValue({
        name: "locationquantityavailable",
      });
      itemObj["itemDesc"] = result.getValue({ name: "salesdescription" });
      itemObj["basePrice"] = result.getValue({ name: "baseprice" });
      itemObj["displayName"] = result.getValue({ name: "displayname" });
      itemObj["committed"] = result.getValue({ name: "quantitycommitted" });
      itemObj["type"] = result.recordType;

      var fileId = result.getValue({
        name: "custitem_nst_wms_lookup_uploaded_image",
      });
      if (fileId) {
        itemObj["image"] = utility.getFileUrl(fileId);
      } else {
        itemObj["image"] =
          "https://st4.depositphotos.com/14953852/22772/v/450/depositphotos_227725052-stock-illustration-image-available-icon-flat-vector.jpg";
      }
      if (setUpData["useUpc"] == true) {
        itemObj["upc"] = result.getValue({ name: "upccode" });
      } else {
        itemObj["upc"] = false;
      }
      if (setUpData["useBins"] == true) {
        itemObj["isBinItem"] = result.getValue({ name: "usebins" });
      } else {
        itemObj["isBinItem"] = false;
      }
      if (setUpData["useSerial"] == true) {
        itemObj["isSerialItem"] = result.getValue({ name: "isserialitem" });
      } else {
        itemObj["isSerialItem"] = false;
      }
      if (setUpData["useLot"] == true) {
        itemObj["isLotItem"] = result.getValue({ name: "islotitem" });
      } else {
        itemObj["isLotItem"] = false;
      }

      itemObj["allstatus"] = getInvStatusForItem(
        itemObj["itemID"],
        locationId,
        itemObj["isBinItem"],
        binNo
      );
    });
    return itemObj;
  };
  const getInvStatusForItem = (itemId, locationId, isBinItem, binNo) => {
    var filters = [
        ["item", "anyof", itemId],
        "AND",
        ["location", "anyof", locationId],
      ],
      status = [];
    if (isBinItem) {
      filters.push("AND");
      filters.push(["binnumber", "anyof", binNo]);
    }
    var inventorybalanceSearchObj = search.create({
      type: "inventorybalance",
      filters: filters,
      columns: [search.createColumn({ name: "status", summary: "GROUP" })],
    });
    inventorybalanceSearchObj.run().each(function (result) {
      status.push({
        id: result.getValue({ name: "status", summary: "GROUP" }),
        text: result.getText({ name: "status", summary: "GROUP" }),
      });
      return true;
    });
    if (!status.length) {
      status.push({ id: 1, text: "Good" });
    }

    return status;
  };
  const createCnfigCountRecord = (backUpRecId, tranId) => {
    var dataObj = utility.getBackUpRecordData(backUpRecId);
    var items = dataObj.Items;
    var tranRecObj = record.load({
      type: record.Type.INVENTORY_COUNT,
      id: tranId,
      isDynamic: true,
    });

    for (var i = 0; i < items.length; i++) {
      var itemObj = items[i];
      var isLot = itemObj.isLot;
      var isSer = itemObj.isSer;
      var lineNo = parseInt(itemObj.lineNO);
      var invDetail = itemObj.InvDetail;

      tranRecObj.selectLine({ sublistId: "item", line: lineNo - 1 });
      tranRecObj.setCurrentSublistValue({
        sublistId: "item",
        fieldId: "countquantity",
        value: parseInt(itemObj.AdjQty),
      });
      var subRecordObj = tranRecObj.getCurrentSublistSubrecord({
        sublistId: "item",
        fieldId: "countdetail",
      });
      var subRecordLineCount = subRecordObj.getLineCount({
        sublistId: "inventorydetail",
      });

      for (var u = subRecordLineCount - 1; u >= 0; u--) {
        subRecordObj.removeLine({
          sublistId: "inventorydetail",
          line: u,
        });
      }

      for (var j = 0; j < invDetail.length; j++) {
        var invDetailObj = invDetail[j];

        subRecordObj.selectNewLine({
          sublistId: "inventorydetail",
        });

        if (isLot == true) {
          subRecordObj.setCurrentSublistValue({
            sublistId: "inventorydetail",
            fieldId: "inventorynumber",
            value: invDetailObj.lotNO,
            ignoreFieldChange: false,
          });
        } else if (isSer == true) {
          subRecordObj.setCurrentSublistValue({
            sublistId: "inventorydetail",
            fieldId: "inventorynumber",
            value: invDetailObj.serialNo,
            ignoreFieldChange: false,
          });
        }
        subRecordObj.setCurrentSublistValue({
          sublistId: "inventorydetail",
          fieldId: "inventorystatus",
          value: invDetailObj.selectedStatus,
          ignoreFieldChange: false,
        });
        subRecordObj.setCurrentSublistValue({
          sublistId: "inventorydetail",
          fieldId: "quantity",
          value: parseInt(invDetailObj.adjQty),
          ignoreFieldChange: false,
        });

        subRecordObj.commitLine({
          sublistId: "inventorydetail",
        });
      }

      tranRecObj.commitLine({ sublistId: "item" });
    }

    var tranRecObjId = tranRecObj.save({
      enableSourcing: false,
      ignoreMandatoryFields: true,
    });
 
    var result = action.execute({id: 'completecount', recordType: 'inventorycount', params: {recordId: tranRecObjId}});

    var response = {};
    response["tranId"] = tranRecObjId;
    var tranlookUp = utility.fieldLookUp("inventorycount", tranRecObjId, [
      "tranid",
    ]);
    response["tranIdText"] = tranlookUp.tranid;
    utility.submitFields("customrecord_nst_wms_v3_br_rec", backUpRecId, {
      custrecord_ns_wms_v3_ref_transaction: tranRecObjId,
    });
    return response;
  };
  return { onRequest };
});
