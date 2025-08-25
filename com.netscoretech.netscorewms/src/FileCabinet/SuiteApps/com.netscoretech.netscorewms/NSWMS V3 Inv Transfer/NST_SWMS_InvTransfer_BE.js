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
        response["locations"] = utility.getLocationBySubsidiary(
          response["setUpData"]["subsidiary"],
          params["locationId"]
        );
      } else if (params["ref"] == "itemData") {
        response = getItemData(
          params["setUpData"],
          params["scannedItem"],
          params["locationId"],
          params["tolocationId"]
        );
      }
      scriptContext.response.write(JSON.stringify(response));
    } else {
      var params = scriptContext.request.parameters;
      var body = JSON.parse(scriptContext.request.body);
      var response = {};
      if (params["ref"] == "createBackup") {
        response = utility.createBackupRecord(body, "invtansfer");
      } else if (params["ref"] == "apprCmpltBackup") {
        response = createInvTransfer(body.recId, body.toLocation);
      }
      scriptContext.response.write(JSON.stringify(response));
    }
  };
  const getItemData = (setUpData, scannedItem, locationId, tolocationId) => {
    log.debug("locationId", locationId);
    var setUpData = JSON.parse(setUpData);
    var filtersary = [
      //["name", "is", scannedItem],
      ["internalid","anyof", scannedItem],
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
    var invTransData = getInventoryTransferData(
      locationId,
      itemObj["itemID"],
      setUpData,
      itemObj["isBinItem"],
      itemObj["isSerialItem"]
    );
    itemObj["onHand"] = invTransData.totalOnHand;
    itemObj["avlQty"] = invTransData.totalAvlQty;

    if (setUpData["usePrefBin"]) {
      var prefBin = utility.getPreffredBinsForItemsInLocation(
        [itemObj["itemID"]],
        tolocationId
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
    
    itemObj["allBins"] = utility.getAllBinsByLocation(tolocationId);
    if (setUpData["useInvStatus"] == true) {
      itemObj["allStatus"] = utility.getAllStatus();
    }
    itemObj["invTransData"] = invTransData.data;
    itemObj["invBalance"] = getInventoryBalanceByLocation(
      setUpData,
      itemObj["itemID"],
      locationId,
      itemObj["isSerialItem"]
    );
    return itemObj;
  };

  const getInventoryTransferData = (
    locationId,
    itemId,
    setUpData,
    isBinItem,
    isserial
  ) => {
    var data = [],
      filters = [
        ["item", "anyof", itemId],
        "AND",
        ["location", "anyof", locationId],
      ],
      columns = [search.createColumn({ name: "onhand", label: "On Hand" })];
      if (isserial) {
        filters.push("AND");
        filters.push(["inventorynumber.quantityavailable", "greaterthan", "0"]); // newly added
        filters.push("AND");
        filters.push(["inventorynumber.location", "anyof", locationId]); // newly added
      }
    if (setUpData["useSerial"] == true || setUpData["useLot"] == true) {
      columns.push(
        search.createColumn({
          name: "inventorynumber",
          label: "Inventory Number",
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
    if (setUpData["useBins"] == true) {
      columns.push(
        search.createColumn({ name: "binnumber", label: "Bin Number" })
      );
    }
    if (setUpData["useInvStatus"] == true) {
      columns.push(search.createColumn({ name: "status", label: "Status" }));
    }
    columns.push(
      search.createColumn({ name: "available", label: "Available" })
    );

    var totalOnHand = 0;
    var totalAvlQty = 0;

    var inventorybalanceSearchObj = search.create({
      type: "inventorybalance",
      filters: filters,
      columns: columns,
    });
    inventorybalanceSearchObj.run().each(function (result) {
      var tempObj = {
        invNo: "",
        invNoText: "",
        invStatus: "",
        invStatusId: "",
        binNO: "",
        binNOText: "",
        onHand: result.getValue({ name: "onhand", label: "On Hand" }),
        avlQty: result.getValue({ name: "available", label: "Available" }),
        date: "",
      };
      if (setUpData["useLot"] == true) {
        tempObj.date = result.getValue({
          name: "expirationdate",
          join: "inventoryNumber",
        });
      }
      if (setUpData["useSerial"] == true || setUpData["useLot"] == true) {
        tempObj.invNo = result.getValue({ name: "inventorynumber" });
        tempObj.invNoText = result.getText({ name: "inventorynumber" });
      }
      if (setUpData["useInvStatus"] == true) {
        tempObj.invStatusId = result.getValue({
          name: "status",
          label: "Status",
        });
        tempObj.invStatus = result.getText({ name: "status", label: "Status" });
      }

      if (setUpData["useBins"] == true) {
        tempObj.binNO = result.getValue({ name: "binnumber" });
        tempObj.binNOText = result.getText({ name: "binnumber" });
      }

      totalOnHand = parseFloat(totalOnHand) + parseFloat(tempObj.onHand);
      totalAvlQty = parseFloat(totalAvlQty) + parseFloat(tempObj.avlQty);
      data.push(tempObj);

      return true;
    });

    return { data: data, totalOnHand: totalOnHand, totalAvlQty: totalAvlQty };
  };
  const createInvTransfer = (backUpRecId, toLocation) => {
    var dataObj = utility.getBackUpRecordData(backUpRecId);
    var items = dataObj.Items;
    var tranRecObj = record.create({
      type: record.Type.INVENTORY_TRANSFER,
      isDynamic: true,
    });
    if (dataObj.subId) {
      tranRecObj.setValue({
        fieldId: "subsidiary",
        value: dataObj.subId,
      });
    }

    tranRecObj.setValue({
      fieldId: "location",
      value: dataObj.locId,
    });
    tranRecObj.setValue({
      fieldId: "transferlocation",
      value: toLocation,
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
        fieldId: "adjustqtyby",
        value: adjQty,
      });
      if (isLot == true || isSer == true || isBin == true) {
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
          if (isBin == true) {
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
          }
          if (fromStatus) {
            subRecordObj.setCurrentSublistValue({
              sublistId: "inventoryassignment",
              fieldId: "inventorystatus",
              value: fromStatus,
              ignoreFieldChange: false,
            });
          } else if (toStatus) {
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
      }
      tranRecObj.commitLine({ sublistId: "inventory" });
    }

    var tranRecObjId = tranRecObj.save({
      enableSourcing: false,
      ignoreMandatoryFields: true,
    });
    log.debug("tranRecObjId", tranRecObjId);
    var response = {};
    response["tranId"] = tranRecObjId;
    var tranlookUp = utility.fieldLookUp("inventorytransfer", tranRecObjId, [
      "tranid",
    ]);
    response["tranIdText"] = tranlookUp.tranid;
    record.submitFields({
      type: "customrecord_nst_wms_v3_br_rec",
      id: backUpRecId,
      values: {
        custrecord_ns_wms_v3_ref_transaction: response.tranId,
      },
    });

    return response;
  };
  function getInventoryBalanceByLocation(setUpData, itemId, locationId,isserial) {
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
    
    if (isserial) {
      filters.push("AND");
      filters.push(["inventorynumber.quantityavailable", "greaterthan", "0"]); // newly added
      filters.push("AND");
      filters.push(["inventorynumber.location", "anyof", locationId]); // newly added
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

      if (
        locationData[locationText]["onHand"] == undefined ||
        locationData[locationText]["onHand"] == "" ||
        locationData[locationText]["onHand"] == " "
      ) {
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
      inventoryDetailObj["available"] = available;
      locationData[locationText]["inventoryDetail"].push(inventoryDetailObj);
      return true;
    });

    return locationData;
  }
  return { onRequest };
});