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
      log.debug("params::", JSON.stringify(params));
      var response = {};
      if (params["ref"] == "getSetUpData") {
        response["setUpData"] = utility.getSetUpRecordData(params["setUpId"]);
        response["locationObj"] = utility.fieldLookUp(
          "location",
          params["locationId"],
          ["name"]
        );
        response["allItems"] = utility.getItems();
      } else if (params["ref"] == "getStageBins") {
        response["stageBins"] = getStageBins(params["locationId"]);
      } else if (params["ref"] == "stagebinitems") {
        response["stageBinitems"] = getStageBinitems(params["locationId"], [
          params["selectedstagebin"],
        ]);
      } else if (params["ref"] == "itemData") {
        response = getItemData(
          params["setUpData"],
          params["scannedItem"],
          params["locationId"],
          params["stageBin"]
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
      if (params["ref"] == "createBackup") {
        response = utility.createBackupRecord(body, "bintansfer");
      } else if (params["ref"] == "apprCmpltBackup") {
        response = createBinTransfer(body.recId);
      }
      scriptContext.response.write(JSON.stringify(response));
    }
  };

  const getStageBins = (locationId) => {
    let Bins = [];
    var binSearchObj = search.create({
      type: "bin",
      filters: [
        ["location", "anyof", locationId],
        "AND",
        ["custrecord_staging_bin", "is", "T"],
      ],
      columns: [
        search.createColumn({
          name: "binnumber",
          sort: search.Sort.ASC,
        }),
      ],
    });
    binSearchObj.run().each(function (r) {
      Bins.push({
        id: r.id,
        value: r.getValue({
          name: "binnumber",
          sort: search.Sort.ASC,
        }),
      });
      return true;
    });
    return Bins;
  };

  // const getStageBinitems = (locationId,selectedstagebin) => {
  //   let Stagebinitems = [];
  //   var stagebinitemSearchObj = search.create({
  //     type: "inventoryitem",
  //     filters:
  //     [
  //       ["upccode","isnotempty",""],
  //       "AND",
  //       ["type","anyof","InvtPart"],
  //       "AND",
  //       ["binnumber.custrecord_staging_bin","is","T"],
  //       "AND",
  //       ["location","anyof",locationId],
  //       "AND",
  //       ["binnumber.binnumber","is","2001"]
  //    ],
  //     columns:
  //     [
  //       search.createColumn({ name: "itemid",sort: search.Sort.ASC,label: "Name" }),
  //       search.createColumn({name: "binnumber", label: "Bin Number"}),
  //       search.createColumn({name: "quantityavailable", label: "Available"}),
  //       search.createColumn({name: "quantityonhand", label: "On Hand"}),
  //     ]
  //  });

  //   stagebinitemSearchObj.run().each(function(r){
  //   var Stagebinitemsobj = {};
  //   Stagebinitemsobj.itemid = r.getValue({ name: "itemid",sort: search.Sort.ASC,label: "Name" })
  //   Stagebinitemsobj.binnumber = r.getValue({ binnumber: "binnumber",sort: search.Sort.ASC,label: "binnumber" })
  //   Stagebinitemsobj.quantityavailable = r.getValue({ avlqty: "quantityavailable",sort: search.Sort.ASC,label: "quantityavailable" })
  //   Stagebinitemsobj.quantityonhand = r.getValue({ onhandqty: "quantityonhand",sort: search.Sort.ASC,label: "quantityonhand" })

  //   Stagebinitems.push(Stagebinitemsobj);
  //     return true;
  //  });

  //  return Stagebinitems;
  // };

  function getItemData(setUpData, scannedItem, locationId , stageBinNo) {
    var setUpData = JSON.parse(setUpData);
    log.debug("scannedItem", scannedItem);
    var filtersary = [
      ["name", "is", scannedItem],
      "OR",
      ["inventorynumber.inventorynumber", "is", scannedItem],
    ];
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
    log.debug("itemDataCount", itemDataCount);
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
      setUpData,
      stageBinNo
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
    //itemObj["allStatus"] = [];
    itemObj["binTransData"] = binTransData.data;
    log.debug("itemObj", itemObj);
    return itemObj;
  };
  
  const getItemBinTransferData = (locationId, itemId, setUpData , stageBinNO) => {
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
        ["binnumber.internalid","anyof", stageBinNO],
       // ["binnumber", "noneof", "@NONE@"],
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
      log.debug("tempObj", tempObj);
      data.push(tempObj);

      return true;
    });
    log.debug("data", JSON.stringify(data));
    return { data: data, totalAvail: totalAvail };
  };
  const getStageBinitems = (locationId, selectedstagebin) => {
    log.debug("stagebin", selectedstagebin);
    let Stagebinitems = [];
    var stagebinitemSearchObj = search.create({
      type: "inventorybalance",
      filters: [
        ["item.isinactive", "is", "F"],
        "AND",
        ["binnumber.internalid", "anyof", selectedstagebin],
        // ["binnumber.binnumber", "is", "Receiving_Staging"],
        "AND",
        ["available", "greaterthan", "0"],
      ],
      columns: [
        search.createColumn({
          name: "item",
          summary: "GROUP",
          sort: search.Sort.ASC,
          label: "Item",
        }),
        search.createColumn({
          name: "binnumber",
          summary: "GROUP",
          label: "Bin Number",
        }),
        search.createColumn({
          name: "onhand",
          summary: "SUM",
          label: "On Hand",
        }),
        search.createColumn({
          name: "available",
          summary: "SUM",
          label: "Available",
        }),

         search.createColumn({
          name: "upccode",
          join: 'item',
          summary: "GROUP",
          label: "UPC Code ",
        }),
      ],
    });

    stagebinitemSearchObj.run().each(function (r) {
      var Stagebinitemsobj = {};
      Stagebinitemsobj.itemid = r.getValue({
        name: "item",
        summary: "GROUP",
        sort: search.Sort.ASC,
        label: "Item",
      });
      Stagebinitemsobj.itemName = r.getText({
        name: "item",
        summary: "GROUP",
        sort: search.Sort.ASC,
        label: "Item",
      });
      Stagebinitemsobj.binnumber = r.getValue({
        name: "binnumber",
        summary: "GROUP",
        label: "Bin Number",
      });
      Stagebinitemsobj.quantityavailable = r.getValue({
        name: "onhand",
        summary: "SUM",
        label: "On Hand",
      });
      Stagebinitemsobj.quantityonhand = r.getValue({
        name: "available",
        summary: "SUM",
        label: "Available",
      });

      Stagebinitemsobj.upccode = r.getValue({
        name: "upccode",
          join: 'item',
          summary: "GROUP",
          label: "UPC Code ",
      });

      Stagebinitems.push(Stagebinitemsobj);
      return true;
    });
    log.debug("Stagebinitems", Stagebinitems);
    return Stagebinitems;
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
        var fromStatus = invDetailObj.fromStatusId; //fromStatusText
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
        if (fromStatus) {
          subRecordObj.setCurrentSublistValue({
            sublistId: "inventoryassignment",
            fieldId: "inventorystatus",
            value: fromStatus,
            ignoreFieldChange: false,
          });
        }

        if (toStatus) {
          subRecordObj.setCurrentSublistValue({
            sublistId: "inventoryassignment",
            fieldId: "toinventorystatus",
            value: toStatus,
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
