/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(["N/search", "N/record", "../NSWMS V3 Globals/utility_module"], (
  search,
  record,
  utility
) => {
  var transcationCreated = []
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
        response["allBins"] = utility.getAllBinsByLocation(
          params["locationId"]
        );
        response["allItems"] = utility.getItems();
        response["allStatus"] = utility.getAllStatus();
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
          params["fromStatus"]
        );
      }
      scriptContext.response.write(JSON.stringify(response));
    } else {
      var params = scriptContext.request.parameters;
      var body = JSON.parse(scriptContext.request.body);
      var response = {};
      if (params["ref"] == "createBackup") {
        response = utility.createBackupRecord(body, "invstatusChange");
        log.debug("createBackupRecord", response);
      } else if (params["ref"] == "apprCmpltBackup") {
        try {
          response = arrangeBackUpRecData(body.recId);
        } catch (e) {
          response["status"] = "failure";
          response["message"] = e;
        }
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
        ["internalid", "is", "20160"],
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

  const getStageBinitems = (locationId, selectedstagebin) => {
    log.debug("stagebin", selectedstagebin);
    let Stagebinitems = [];
    var stagebinitemSearchObj = search.create({
      type: "inventorybalance",
      filters: [
        ["item.isinactive", "is", "F"],
        "AND",
        ["binnumber.binnumber", "is", selectedstagebin],
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
      ],
    });
    var start = 0;
    do {
      var binItemsResult = stagebinitemSearchObj.run().getRange({
        start: start,
        end: start + 1000,
      });
      for (var i = 0; i < binItemsResult.length; i++) {
        // stagebinitemSearchObj.run().each(function (r) {
        var Stagebinitemsobj = {};
        Stagebinitemsobj.itemid = binItemsResult[i].getValue({
          name: "item",
          summary: "GROUP",
          sort: search.Sort.ASC,
          label: "Item",
        });
        Stagebinitemsobj.itemName = binItemsResult[i].getText({
          name: "item",
          summary: "GROUP",
          sort: search.Sort.ASC,
          label: "Item",
        });
        Stagebinitemsobj.binnumber = binItemsResult[i].getValue({
          name: "binnumber",
          summary: "GROUP",
          label: "Bin Number",
        });
        Stagebinitemsobj.quantityavailable = binItemsResult[i].getValue({
          name: "onhand",
          summary: "SUM",
          label: "On Hand",
        });
        Stagebinitemsobj.quantityonhand = binItemsResult[i].getValue({
          name: "available",
          summary: "SUM",
          label: "Available",
        });

        Stagebinitems.push(Stagebinitemsobj);
      }
      start += 1000;
    } while (binItemsResult.length == 1000);
    return Stagebinitems;
  };
  //});
  // log.debug("Stagebinitems", Stagebinitems);
  // return Stagebinitems;
  //};
  const getItemData = (setUpData, scannedItem, locationId, fromStatus) => {
    var setUpData = JSON.parse(setUpData);
    var filtersary = [
      ["name", "is", scannedItem],
      "OR",
      ["inventorynumber.inventorynumber", "is", scannedItem],
    ];
    //filtersary.push(["name", "is", scannedItem]);
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
      return;
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
      itemObj["invBalance"] = utility.getInventoryBalanceByLocation(
        setUpData,
        itemObj["itemID"],
        locationId
      );
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

    return itemObj;
  };
  const arrangeBackUpRecData = (backUpRecId) => {
    var dataObj = utility.getBackUpRecordData(backUpRecId);
    log.debug("dataObj", JSON.stringify(dataObj));

    // Rearranging the data
    const outputData = [];

    dataObj.Items.forEach((item) => {
      const invDetails = item.InvDetail;

      invDetails.forEach((detail) => {
        const statusKey =
          detail.selectedFromStatus + "|" + detail.selectedToStatus;

        let group = outputData.find(
          (g) =>
            g.fromStatus === detail.selectedFromStatus &&
            g.toStatus === detail.selectedToStatus
        );

        if (!group) {
          group = {
            fromStatus: detail.selectedFromStatus,
            toStatus: detail.selectedToStatus,
            Items: [],
            soId:dataObj.soId,
            locId: dataObj.locId,
            subId: dataObj.subId,
            accId:dataObj.accId,
            shipId:dataObj.shipId,
            wmsuser: dataObj.wmsuser
          };
          outputData.push(group);
        }

        const existingItem = group.Items.find((i) => i.itemId === item.itemId);

        if (existingItem) {
          // If item already exists, update the existing item
          existingItem.totalQty =
            (detail.qty ? Number(detail.qty) : 0) +
            (existingItem.totalQty ? Number(existingItem.totalQty) : 0);

          if (!existingItem.invDetail) {
            existingItem.invDetail = [];
          }

          if (detail.serialNO || detail.binNO || detail.lotNO) {
            existingItem.invDetail.push({
              serialNO: detail.serialNO,
              binNO: detail.binNO,
              binNoText: detail.binNoText,
              lotNO: detail.lotNO,
              totalQty: detail.qty,
            });
          }
        } else {
          // Add new item
          const newItem = {
            itemId: item.itemId,
            itemOrUpc: detail.itemOrUpc,
            selectedFromStatusText: detail.selectedFromStatusText,
            avlqty: detail.avlqty,
            totalQty: detail.qty,
            isBin: item.isBin,
            isSer: item.isSer,
            isLot: item.isLot,
            invDetail: [
                  {
                    serialNO: detail.serialNO,
                    binNO: detail.binNO,
                    lotNO: detail.lotNO,
                    binNoText: detail.binNoText,
                    totalQty: detail.qty,
                  },
                ]
          };

          group.Items.push(newItem);
        }
      });
    });

    // Display the structured data in the console
    log.debug("outputData", outputData.length);
    let response = {}
    for (let i = 0; i < outputData.length; i++) {
      try {
       response =  createInvStatusChangeRec(outputData[i] , backUpRecId);
      } catch (error) {
        response = error
        log.debug('error in Inv status cHANGE' , error)
      }
    }
    return response;
  };

  ///////
  const createInvStatusChangeRec = (dataObj , backUpRecId) => {
    var items = dataObj.Items;
    log.debug('items' , items);
      var tranRecObj = record.create({
        type: record.Type.INVENTORY_STATUS_CHANGE,
        isDynamic: true,
      });
      tranRecObj.setValue({
        fieldId: "subsidiary",
        value: dataObj.subId,
      });
      tranRecObj.setValue({
        fieldId: "location",
        value: dataObj.locId,
      });
      tranRecObj.setValue({
        fieldId: "previousstatus",
        value: dataObj.fromStatus,
      });
      tranRecObj.setValue({
        fieldId: "revisedstatus",
        value: dataObj.toStatus,
      });
      tranRecObj.setValue({
        fieldId: "custbody_nst_wms_trans_created_by",
        value: dataObj.wmsuser,
      });
      tranRecObj.setValue({
        fieldId: "custbodynst_wms_v3_backup_record",
        value: backUpRecId,
      });
      for (var i = 0; i < items.length; i++) {
        var itemObj = items[i];
        var isBin = itemObj.isBin;
        log.debug('isBin' , isBin)
        var isLot = itemObj.isLot;
        var isSer = itemObj.isSer;
        var itemId = itemObj.itemId;
        var adjQty = parseFloat(itemObj.totalQty);
        var invDetail = itemObj.invDetail;
        var line = tranRecObj.selectNewLine({
          sublistId: "inventory",
        });
        tranRecObj.setCurrentSublistValue({
          sublistId: "inventory",
          fieldId: "item",
          value: itemId,
        }); // item
        log.debug('item' , itemId)
        tranRecObj.setCurrentSublistValue({
          sublistId: "inventory",
          fieldId: "quantity",
          value: adjQty,
        });
        if (isBin || isLot || isSer) {
          log.debug('inventorydetail' , 'ENTERED')
          var subRecordObj = tranRecObj.getCurrentSublistSubrecord({
            sublistId: "inventory",
            fieldId: "inventorydetail",
          });
          log.debug('subRecordObj' , JSON.stringify(subRecordObj));
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
            var fromBinNo = invDetailObj.binNO;
            var lineQty = parseInt(invDetailObj.totalQty);
            subRecordObj.selectNewLine({
              sublistId: "inventoryassignment",
            });
            if (isLot) {
              subRecordObj.setCurrentSublistValue({
                sublistId: "inventoryassignment",
                fieldId: "receiptinventorynumber",
                value: lotNo,
              });
            }
            if (isSer) {
              subRecordObj.setCurrentSublistValue({
                sublistId: "inventoryassignment",
                fieldId: "receiptinventorynumber",
                value: serNo,
              });
              log.debug('serNo' , subRecordObj.getCurrentSublistValue({
                sublistId: "inventoryassignment",
                fieldId: "receiptinventorynumber",
              }))
            }
            if (isBin) {
              subRecordObj.setCurrentSublistValue({
                sublistId: "inventoryassignment",
                fieldId: "binnumber",
                value: fromBinNo,
              });
              log.debug('bin' , fromBinNo)
            }
            subRecordObj.setCurrentSublistValue({
              sublistId: "inventoryassignment",
              fieldId: "quantity",
              value: parseFloat(lineQty),
            });
            log.debug('lineQty' , lineQty);
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
      transcationCreated.push(response.tranId);
      response["tranId"] = tranRecObjId;
      var tranlookUp = utility.fieldLookUp("inventorystatuschange", tranRecObjId, [
        "tranid",
      ]);
      response["tranIdText"] = tranlookUp.tranid;
      log.debug("response", JSON.stringify(response.tranIdText));
      log.debug("backUpRecId", backUpRecId);

      record.submitFields({
        type: "customrecord_nst_wms_v3_br_rec",
        id: backUpRecId,
        values: {
          custrecord_ns_wms_v3_ref_transaction: response.tranId,
        },
      });
      return response;
  }

  function checkItemExistsWithAdjType(
    itemID,
    adjType,
    parentId,
    lienNo,
    itemData
  ) {
    var recId,
      filters = [
        ["custrecord_ns_wms_v3_item_name", "anyof", itemID],
        "AND",
        ["custrecord_ns_wms_adjustment_type", "is", adjType],
        "AND",
        ["custrecord_ns_wms_v3_parent_rec", "anyof", parentId],
      ];
    if (itemData.isBinItem) {
      filters.push("AND");
      filters.push([
        "custrecord_nst_wms_v3_bin_count_bin",
        "anyof",
        itemData.binCountBin,
      ]);
    }
    if (lienNo) {
      filters.push("AND");
      filters.push([
        "custrecord_ns_wms_v3_transaction_line_no",
        "equalto",
        lienNo,
      ]);
    }
    var backup_child_recSearchObj = search.create({
      type: "customrecord_nst_wms_v3_br_crec",
      filters: filters,
    });
    backup_child_recSearchObj.run().each(function (result) {
      recId = result.id;
    });

    return recId;
  }
  function submitFields(recordType, recordId, filedsObj) {
    return record.submitFields({
      type: recordType,
      id: recordId,
      values: filedsObj,
    });
  }


  return { onRequest };
});