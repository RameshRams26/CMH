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
      } else if (params["ref"] == "getBinPutAwayItems") {
        response["binPutAwayItems"] = getBinPutAwayItems(params["locationId"]);
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
        response = utility.createBackupRecord(body, "binputAway");
      } else if (params["ref"] == "apprCmpltBackup") {
        response = createBinPutAwayWorksheet(body.recId);
      }
      scriptContext.response.write(JSON.stringify(response));
    }
  };

  const getBinPutAwayItems = (locationId) => {
    var itemData = [];
    var inventorybalanceSearchObj = search.create({
      type: "inventorybalance",
      filters: [
        ["binnumber", "anyof", "@NONE@"],
        "AND",
        ["onhand", "greaterthan", "0"],
        "AND",
        ["available", "greaterthan", "0"],
        "AND",
        ["item.usebins", "is", "T"],
        "AND",
        ["location", "anyof", locationId],
      ],
      columns: [
        search.createColumn({
          name: "item",
          summary: "GROUP",
          sort: search.Sort.ASC,
        }),
        search.createColumn({
          name: "onhand",
          summary: "SUM",
        }),
      ],
    });
    inventorybalanceSearchObj.run().each(function (result) {
      var tempObj = {};
      tempObj["itemId"] = result.getValue({
        name: "item",
        summary: "GROUP",
        sort: search.Sort.ASC,
      });
      tempObj["itemName"] = result.getText({
        name: "item",
        summary: "GROUP",
        sort: search.Sort.ASC,
      });
      tempObj["qty"] = result.getValue({
        name: "onhand",
        summary: "SUM",
      });
      tempObj["preBin"] = "";
      tempObj["preBinText"] = "-none-";
      tempObj["putAwayQty"] = "0";
      tempObj["configuredItems"] = [];
      itemData.push(tempObj);
      return true;
    });

    var itemIds = itemData.map((item) => item.itemId);

    if (itemIds.length && locationId) {
      var itemsPrefBins = utility.getPreffredBinsForItemsInLocation(
        itemIds,
        locationId
      );
      for (var i = 0; i < itemData.length; i++) {
        var itemObj = itemData[i];
        if (itemsPrefBins[itemObj["itemId"]]) {
          var obj = itemsPrefBins[itemObj["itemId"]];
          itemObj["preBin"] = obj["id"];
          itemObj["preBinText"] = obj["text"];
        }
      }

      //log.debug("itemData", JSON.stringify(itemData));
    }

    return itemData;
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
    });
    itemObj["allBins"] = utility.getAllBinsByLocation(locationId);
    itemObj["putAwayDetails"] = getItemBinPutAwayDetails(
      locationId,
      itemObj["itemID"],
      setUpData
    );

    return itemObj;
  };

  const getItemBinPutAwayDetails = (locationId, itemId, setUpData) => {
    var data = [],
      columns = [
        search.createColumn({ name: "inventorynumber" }),
        search.createColumn({ name: "onhand" }),
        search.createColumn({ name: "status" }),
      ];
    if (setUpData["useLot"] == true) {
      columns.push(
        search.createColumn({
          name: "expirationdate",
          join: "inventoryNumber",
        })
      );
    }

    var inventorybalanceSearchObj = search.create({
      type: "inventorybalance",
      filters: [
        ["binnumber", "anyof", "@NONE@"],
        "AND",
        ["onhand", "greaterthan", "0"],
        "AND",
        ["available", "greaterthan", "0"],
        "AND",
        ["item.usebins", "is", "T"],
        "AND",
        ["location", "anyof", locationId],
        "AND",
        ["item", "anyof", itemId],
      ],
      columns: columns,
    });
    inventorybalanceSearchObj.run().each(function (result) {
      var tempObj = {
        invNo: result.getValue({ name: "inventorynumber" }),
        invNoText: result.getText({ name: "inventorynumber" }),
        onHand: result.getValue({ name: "onhand" }),
        invStatus: result.getText({ name: "status" }),
        invStatusId: result.getValue({ name: "status" }),
      };
      if (setUpData["useLot"] == true) {
        tempObj.date = result.getValue({
          name: "expirationdate",
          join: "inventoryNumber",
        });
      } else {
        tempObj.date = "";
      }
      data.push(tempObj);

      return true;
    });

    return data;
  };

  const createBinPutAwayWorksheet = (backUpRecId) => {
    var dataObj = utility.getBackUpRecordData(backUpRecId);
    var items = dataObj.Items;
    var tranRecObj = record.create({
      type: record.Type.BIN_WORKSHEET,
      isDynamic: true,
      defaultValues: {
        location: dataObj.locId,
      },
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
      var adjQty = itemObj.AdjQty;
      adjQty = parseInt(adjQty);
      var invDetail = itemObj.InvDetail;
      var lineNumber = tranRecObj.findSublistLineWithValue({
        sublistId: "item",
        fieldId: "item",
        value: itemId,
      });
      if (lineNumber >= 0) {
        //-1
        tranRecObj.selectLine({ sublistId: "item", line: lineNumber });
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
        for (var u = 0; u < subRecordLineCount; u++) {
          subRecordObj.removeLine({
            sublistId: "inventoryassignment",
            line: u,
          });
        }
        if (isBin == false && isSer == false && isLot == false) {
          if (invDetail && invDetail.length > 0) {
            for (var j = 0; j < invDetail.length; j++) {
              var invDetailObj = invDetail[j];

              var invStatus = invDetailObj.selectedStatusText;
              var invStatusId = invDetailObj.selectedStatus;
              var lineQty = invDetailObj.qty;
              lineQty = parseInt(lineQty);
              subRecordObj.selectNewLine({
                sublistId: "inventoryassignment",
              });

              subRecordObj.setCurrentSublistValue({
                sublistId: "inventoryassignment",
                fieldId: "inventorystatus",
                value: invStatusId,
                ignoreFieldChange: false,
              });

              subRecordObj.setCurrentSublistValue({
                sublistId: "inventoryassignment",
                fieldId: "quantity",
                value: parseFloat(lineQty).toFixed(3),
                ignoreFieldChange: false,
              });
              subRecordObj.commitLine({
                sublistId: "inventoryassignment",
              });
            }
          }
        } else if (isBin == true) {
          if (isLot == true || isSer == true) {
            for (var j = 0; j < invDetail.length; j++) {
              var invDetailObj = invDetail[j];

              var invStatus = invDetailObj.selectedStatusText;
              var invStatusId = invDetailObj.selectedStatus;
              var lineQty = invDetailObj.qty;
              lineQty = parseInt(lineQty);
              var lotNo = invDetailObj.lotNO;
              var serNo = invDetailObj.serialNO;
              var binNo = invDetailObj.binNO;

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
                value: binNo,
                ignoreFieldChange: false,
              });
              subRecordObj.setCurrentSublistValue({
                sublistId: "inventoryassignment",
                fieldId: "inventorystatus",
                value: invStatusId,
                ignoreFieldChange: false,
              });
              if (isLot == true) {
                subRecordObj.setCurrentSublistValue({
                  sublistId: "inventoryassignment",
                  fieldId: "quantity",
                  value: lineQty,
                  ignoreFieldChange: false,
                });
              } else {
                subRecordObj.setCurrentSublistValue({
                  sublistId: "inventoryassignment",
                  fieldId: "quantity",
                  value: parseFloat(1),
                  ignoreFieldChange: false,
                });
              }
              subRecordObj.commitLine({
                sublistId: "inventoryassignment",
              });
            }
          } else {
            for (var j = 0; j < invDetail.length; j++) {
              var invDetailObj = invDetail[j];
              var invStatus = invDetailObj.selectedStatusText;
              var invStatusId = invDetailObj.selectedStatus;
              var lineQty = invDetailObj.qty;
              lineQty = parseInt(lineQty);
              var binNo = invDetailObj.binNO;
              subRecordObj.selectNewLine({
                sublistId: "inventoryassignment",
              });

              subRecordObj.setCurrentSublistValue({
                sublistId: "inventoryassignment",
                fieldId: "binnumber",
                value: binNo,
                ignoreFieldChange: false,
              });
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

              var subRecordLineCount = subRecordObj.getLineCount({
                sublistId: "inventoryassignment",
              });

              log.debug("after adding each line lines::", subRecordLineCount);
            }
          } //bin--true,serial/lot-- false - close
        } else {
          //bin false
          if (isLot == true || isSer == true) {
            for (var j = 0; j < invDetail.length; j++) {
              var invDetailObj = invDetail[j];

              var invStatus = invDetailObj.selectedStatusText;
              var invStatusId = invDetailObj.selectedStatus;
              var lineQty = invDetailObj.qty;
              lineQty = parseFloat(lineQty);
              var lotNo = invDetailObj.lotNO;
              var serNo = invDetailObj.serialNO;
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
              }
              if (isSer == true) {
                subRecordObj.setCurrentSublistValue({
                  sublistId: "inventoryassignment",
                  fieldId: "receiptinventorynumber",
                  value: serNo,
                  ignoreFieldChange: false,
                });
              }
              subRecordObj.setCurrentSublistValue({
                sublistId: "inventoryassignment",
                fieldId: "inventorystatus",
                value: invStatusId,
                ignoreFieldChange: false,
              });
              log.debug("invStatus", invStatus);
              if (isLot == true) {
                subRecordObj.setCurrentSublistValue({
                  sublistId: "inventoryassignment",
                  fieldId: "quantity",
                  value: lineQty,
                  ignoreFieldChange: false,
                });
              } else {
                subRecordObj.setCurrentSublistValue({
                  sublistId: "inventoryassignment",
                  fieldId: "quantity",
                  value: 1,
                  ignoreFieldChange: false,
                });
              }
              subRecordObj.commitLine({
                sublistId: "inventoryassignment",
              });
            }
          } //bins false
        }

        tranRecObj.commitLine({ sublistId: "item" });
      }
    }

    var tranRecObjId = tranRecObj.save({
      enableSourcing: false,
      ignoreMandatoryFields: true,
    });

    var response = {};
    response["tranId"] = tranRecObjId;
    var tranlookUp = utility.fieldLookUp("binworksheet", tranRecObjId, [
      "tranid",
    ]);
    response["tranIdText"] = tranlookUp.tranid;

    return response;
  };

  return { onRequest };
});
