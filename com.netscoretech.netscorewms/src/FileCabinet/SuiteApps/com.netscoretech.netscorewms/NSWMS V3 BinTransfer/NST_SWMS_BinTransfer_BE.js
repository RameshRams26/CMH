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
      if (params["ref"] == "getSetUpData") {
        response["setUpData"] = utility.getSetUpRecordData(params["setUpId"]);
        response["locationObj"] = utility.fieldLookUp(
          "location",
          params["locationId"],
          ["name"]
        );
        response["allItems"] = utility.getItems();
      } else if (params["ref"] == "itemData") {
        response = getItemData(
          params["setUpData"],
          params["scannedItem"],
          params["locationId"]
        );
      }
      scriptContext.response.write(JSON.stringify(response));
    } else {
      var params = scriptContext.request.parameters;
      var body = JSON.parse(scriptContext.request.body);
      var response = {};
      if (params["ref"] == "createBackup") {
        response = utility.createBackupRecord(body, "bintansfer");
      } else if (params["ref"] == "apprCmpltBackup") {
        response = createBinTransfer(body.recId);
      }
      scriptContext.response.write(JSON.stringify(response));
    }
  };
  const getItemData = (setUpData, scannedItem, locationId) => {
    var setUpData = JSON.parse(setUpData);
    var filtersary = [];
    filtersary.push(["name", "is", scannedItem]);
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
    });
    var binTransData = getItemBinTransferData(
      locationId,
      itemObj["itemID"],
      setUpData
    );
    itemObj["Available"] = binTransData.totalAvail;
    if (setUpData["usePrefBin"]) {
      var prefBin = utility.getPreffredBinsForItemsInLocation(
        [itemObj["itemID"]],
        locationId
      );
      if (prefBin[itemObj["itemID"]]) {
        var obj = prefBin[itemObj["itemID"]];
        itemObj["preBin"] = obj["id"];
        itemObj["preBinText"] = obj["text"];
      } else {
        itemObj["preBin"] = "";
        itemObj["preBinText"] = "";
      }
    }
    itemObj["allBins"] = utility.getAllBinsByLocation(locationId);
    itemObj["allStatus"] = utility.getAllStatus();
    itemObj["binTransData"] = binTransData.data;

    return itemObj;
  };
  const getItemBinTransferData = (locationId, itemId, setUpData) => {
    var data = [],
      columns = [
        search.createColumn({ name: "available", summary: "SUM" }),
        search.createColumn({ name: "binnumber", summary: "GROUP" }),
        search.createColumn({ name: "status", summary: "GROUP" }),
      ];
    if (setUpData["useSerial"] == true || setUpData["useLot"] == true) {
      columns.push(
        search.createColumn({
          name: "inventorynumber",
          summary: "GROUP",
        })
      );
    }
    if (setUpData["useLot"] == true) {
      columns.push(
        search.createColumn({
          name: "expirationdate",
          join: "inventoryNumber",
          summary: "GROUP",
        })
      );
    }
    var totalAvail = 0;
    var inventorybalanceSearchObj = search.create({
      type: "inventorybalance",
      filters: [
        ["item", "anyof", itemId],
        "AND",
        ["location", "anyof", locationId],
        "AND",
        ["available", "greaterthan", "0"],
        "AND",
        ["item.usebins", "is", "T"],
        "AND",
        ["binnumber", "noneof", "@NONE@"],
      ],
      columns: columns,
    });
    inventorybalanceSearchObj.run().each(function (result) {
      var tempObj = {
        invNo: "",
        invNoText: "",
        invStatus: result.getText({ name: "status", summary: "GROUP" }),
        invStatusId: result.getValue({ name: "status", summary: "GROUP" }),
        binNO: result.getValue({ name: "binnumber", summary: "GROUP" }),
        binNOText: result.getText({ name: "binnumber", summary: "GROUP" }),
        onHand: result.getValue({ name: "available", summary: "SUM" }),
        date: "",
        available: result.getValue({name: "available", summary: "SUM"}),
      };
      if (setUpData["useLot"] == true) {
        tempObj.date = result.getValue({
          name: "expirationdate",
          join: "inventoryNumber",
        });
      }
      if (setUpData["useSerial"] == true || setUpData["useLot"] == true) {
        tempObj.invNo = result.getValue({
          name: "inventorynumber",
          summary: "GROUP",
        });
        tempObj.invNoText = result.getText({
          name: "inventorynumber",
          summary: "GROUP",
        });
      }
      totalAvail += parseFloat(tempObj.onHand);
      data.push(tempObj);

      return true;
    });

    return { data: data, totalAvail: totalAvail };
  };
  const createBinTransfer = (backUpRecId) => {
    var dataObj = utility.getBackUpRecordData(backUpRecId);
    var items = dataObj.Items;
    var tranRecObj = record.create({
      type: record.Type.BIN_TRANSFER,
      isDynamic: true,
    });
    tranRecObj.setValue({
      fieldId: "location",
      value: dataObj.locId,
    });
    tranRecObj.setValue({
      fieldId: "custbody_nst_wms_trans_created_by",
      value: dataObj.wmsuser,
    });

    for (var i = 0; i < items.length; i++) {
      var itemObj = items[i];
      var isBin = itemObj.isBin;
      var isLot = itemObj.isLot;
      var isSer = itemObj.isSer;
      var itemId = itemObj.itemId;
      var adjQty = parseFloat(itemObj.AdjQty);
      var invDetail = itemObj.InvDetail;

      tranRecObj.setCurrentSublistValue({
        sublistId: "inventory",
        fieldId: "item",
        value: itemId,
      }); // item
      tranRecObj.setCurrentSublistValue({
        sublistId: "inventory",
        fieldId: "quantity",
        value: adjQty,
      });
      var subRecordObj = tranRecObj.getCurrentSublistSubrecord({
        sublistId: "inventory",
        fieldId: "inventorydetail",
      });
      var subRecordLineCount = subRecordObj.getLineCount({
        sublistId: "inventoryassignment",
      });
      for (var u = 0; u < subRecordLineCount; u++) {
        subRecordObj.removeLine({
          sublistId: "inventoryassignment",
          line: u,
        });
      }

      for (var j = 0; j < invDetail.length; j++) {
        var invDetailObj = invDetail[j];

        var lotNo = invDetailObj.lotNO;
        var serNo = invDetailObj.serialNO;
        var fromBinNo = invDetailObj.fromBinNO;
        var toBinNo = invDetailObj.toBinNO;
        var fromStatus = invDetailObj.fromStatusId;
        var toStatus = invDetailObj.toStatusId;
        var lineQty = parseInt(invDetailObj.adjQty);

        subRecordObj.selectNewLine({
          sublistId: "inventoryassignment",
        });

        if (isLot == true) {
          subRecordObj.setCurrentSublistValue({
            sublistId: "inventoryassignment",
            fieldId: "receiptinventorynumber",
            value: lotNo,
            ignoreFieldChange: false,
          });
        } else if (isSer == true) {
          subRecordObj.setCurrentSublistValue({
            sublistId: "inventoryassignment",
            fieldId: "receiptinventorynumber",
            value: serNo,
            ignoreFieldChange: false,
          });
        }
        subRecordObj.setCurrentSublistValue({
          sublistId: "inventoryassignment",
          fieldId: "binnumber",
          value: fromBinNo,
          ignoreFieldChange: false,
        });
        subRecordObj.setCurrentSublistValue({
          sublistId: "inventoryassignment",
          fieldId: "tobinnumber",
          value: toBinNo,
          ignoreFieldChange: false,
        });
        subRecordObj.setCurrentSublistValue({
          sublistId: "inventoryassignment",
          fieldId: "inventorystatus",
          value: fromStatus,
          ignoreFieldChange: false,
        });
        subRecordObj.setCurrentSublistValue({
          sublistId: "inventoryassignment",
          fieldId: "toinventorystatus",
          value: toStatus,
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

      tranRecObj.commitLine({ sublistId: "inventory" });
    }

    var tranRecObjId = tranRecObj.save({
      enableSourcing: false,
      ignoreMandatoryFields: true,
    });

    var response = {};
    response["tranId"] = tranRecObjId;
    var tranlookUp = utility.fieldLookUp("bintransfer", tranRecObjId, [
      "tranid",
    ]);
    response["tranIdText"] = tranlookUp.tranid;

    return response;
  };

  return { onRequest };
});
