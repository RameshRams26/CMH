/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(["N/search", "N/record" ,"../NSWMS V3 Globals/utility_module" , 'N/action'], (
  search,
  record,
  utility,
  actionMod
) => {
  const onRequest = (scriptContext) => {
    log.debug("params", JSON.stringify(scriptContext.request.parameters));
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
      } else if (params["ref"] == "itemData") {
        response = getItemData(
          params["setUpData"],
          params["scannedItem"],
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
      if (params["ref"] == "createBackup") {
        response = utility.createBackupRecord(body, "invtcount");
      } else if (params["ref"] == "apprCmpltBackup") {
        try {
          response = createCountRecord(body.recId);
        } catch (e) {
          response["status"] = "failure";
          response["message"] = e;
        }
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

    return itemObj;
  };
  const createCountRecord = (backUpRecId) => {
    var dataObj = utility.getBackUpRecordData(backUpRecId);
    var items = dataObj.Items;

    var tranRecObj = record.create({
      type: record.Type.INVENTORY_COUNT,
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
      fieldId: "account",
      value: dataObj.accId,
    });
    tranRecObj.setValue({
      fieldId: "custbody_nst_wms_trans_created_by",
      value: dataObj.wmsuser,
    });

    var allItems = [];
    for (var i = 0; i < items.length; i++) {
      var invDetail = items[i].InvDetail;
      allItems = allItems.concat(invDetail);
    }

    for (var i = 0; i < allItems.length; i++) {
      var obj = allItems[i];
      tranRecObj.selectNewLine({
        sublistId: "item",
      });
      tranRecObj.setCurrentSublistValue({
        sublistId: "item",
        fieldId: "item",
        value: obj.itemID,
      }); // item
      if (obj.fromBinNO) {
        tranRecObj.setCurrentSublistValue({
          sublistId: "item",
          fieldId: "binnumber",
          value: Number(obj.fromBinNO),
        });
      }
      tranRecObj.commitLine({ sublistId: "item" });
    }

    var tranRecObjId = tranRecObj.save({
      enableSourcing: false,
      ignoreMandatoryFields: true,
    });
    var result = actionMod.execute({id: 'startcount', recordType: 'inventorycount', params: {recordId: tranRecObjId}});
    var response = {};
    response["tranId"] = tranRecObjId;
    var tranlookUp = utility.fieldLookUp("inventorycount", tranRecObjId, [
      "tranid",
    ]);
    response["tranIdText"] = tranlookUp.tranid;

    return response;
  };
  return { onRequest };
});
