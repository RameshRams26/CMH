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
      } else if (params["ref"] == "binItemData") {
        response = getItemsinBin(
          params["setUpData"],
          params["scannedBin"],
          params["locationId"]
        );
      }

      scriptContext.response.write(JSON.stringify(response));
    } else {
      var params = scriptContext.request.parameters;
      var body = JSON.parse(scriptContext.request.body);
      var response = {};
      if (params["ref"] == "imageUpload") {
        response = uploadImagetoNS(body);
      }

      scriptContext.response.write(JSON.stringify(response));
    }
    function getItemsinBin(setUpData, scannedBin, locationId) {
      var setUpData = JSON.parse(setUpData);
      var itemsinBin = [];
      var columns = [
        search.createColumn({
          name: "item",
          summary: "GROUP",
          sort: search.Sort.ASC,
          label: "Item",
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
          name: "location",
          summary: "GROUP",
          label: "Location",
        }),
        search.createColumn({
          name: "binnumber",
          summary: "GROUP",
          label: "Bin Number",
        }),
      ];
      if (setUpData["useUpc"] == true) {
        columns.push(
          search.createColumn({
            name: "upccode",
            join: "item",
            summary: "GROUP",
          })
        );
      }
      if (setUpData["useBins"] == true) {
        columns.push(
          search.createColumn({
            name: "usebins",
            join: "item",
            summary: "GROUP",
          })
        );
      }
      if (setUpData["useSerial"] == true) {
        columns.push(
          search.createColumn({
            name: "isserialitem",
            join: "item",
            summary: "GROUP",
          })
        );
      }
      if (setUpData["useLot"] == true) {
        columns.push(
          search.createColumn({
            name: "islotitem",
            join: "item",
            summary: "GROUP",
          })
        );
      }

      var filters = [
        ["binnumber.binnumber", "is", scannedBin],
        "AND",
        ["onhand", "greaterthan", "0"],
        "AND",
        ["available", "greaterthan", "0"],
      ];
      if (locationId) {
        filters.push("AND");
        filters.push(["location", "anyof", locationId]);
      }

      var itemsinBinSearch = search.create({
        type: "inventorybalance",
        filters: filters,
        columns: columns,
      });
      var itemsCount = itemsinBinSearch.runPaged().count;
      log.debug("itemDataCount", itemsCount);
      if (itemsCount <= 0) {
        return { status: "failure", message: "Items not found in Bin!!." };
      }

      itemsinBinSearch.run().each(function (result) {
        var itemData = {};
        /* itemData["locationId"] = result.getValue({
          name: "location",
          summary: "GROUP",
          label: "Location",
        });
        itemData["locationText"] = result.getText({
          name: "location",
          summary: "GROUP",
          label: "Location",
        });*/
        itemData["itemId"] = result.getValue({
          name: "item",
          summary: "GROUP",
          sort: search.Sort.ASC,
          label: "Item",
        });
        itemData["itemText"] = result.getText({
          name: "item",
          summary: "GROUP",
          label: "Item",
        });
        itemData["onHand"] = result.getValue({
          name: "onhand",
          summary: "SUM",
          label: "On Hand",
        });
        itemData["available"] = result.getValue({
          name: "available",
          summary: "SUM",
          label: "Available",
        });
        itemData["scannedBin"] = result.getText({
          name: "binnumber",
          summary: "GROUP",
          label: "Bin Number",
        });
        if (setUpData["useUpc"] == true) {
          itemData["upc"] = result.getValue({
            name: "upccode",
            join: "item",
            summary: "GROUP",
          });
        } else {
          itemData["upc"] = false;
        }
        if (setUpData["useBins"] == true) {
          itemData["isBinItem"] = result.getValue({
            name: "usebins",
            join: "item",
            summary: "GROUP",
          });
        } else {
          itemData["isBinItem"] = false;
        }
        if (setUpData["useSerial"] == true) {
          itemData["isSerialItem"] = result.getValue({
            name: "isserialitem",
            join: "item",
            summary: "GROUP",
          });
        } else {
          itemData["isSerialItem"] = false;
        }
        if (setUpData["useLot"] == true) {
          itemData["isLotItem"] = result.getValue({
            name: "islotitem",
            join: "item",
            summary: "GROUP",
          });
        } else {
          itemData["isLotItem"] = false;
        }
        //get invdetail for each item
        itemData["invBalance"] = {};
        itemData["invBalance"] = getInventoryBalanceByBin(
          setUpData,
          itemData["itemId"],
          itemData["scannedBin"],
          locationId
        );

        itemsinBin.push(itemData);
        return true;
      });

      log.debug("itemsinBin", JSON.stringify(itemsinBin));
      return { status: "success", items: itemsinBin };
    }

    function getInventoryBalanceByBin(
      setUpData,
      itemId,
      scannedBin,
      locationId
    ) {
      log.debug(scannedBin + itemId + locationId);
      var InvData = [];
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
        ["binnumber.binnumber", "is", scannedBin],
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

        /*if (locationData[locationText] == undefined) {
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
        }*/
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
        InvData.push(inventoryDetailObj);
        return true;
      });

      return InvData;
    }
  };
  return { onRequest };
});
