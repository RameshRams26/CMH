/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
  "N/search",
  "N/file",
  "N/record",
  "N/query",
  "../NSWMS V3 Globals/utility_module",
], /**
 * @param{https} https
 * @param{search} search
 * @param{url} url
 */ (search, file, record, query, utility) => {
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
      } else if (params["ref"] == "getShipmentId") {
        var tranids = scriptContext.request.parameters.tranid;
        response["IFData"] = getShipmentId(params, tranids);
        response["PackageDetails"] = getPackageDetails();
      }
      scriptContext.response.write(JSON.stringify(response));
    } else {
      var params = scriptContext.request.parameters;
      var body = JSON.parse(scriptContext.request.body);
      var response = {};
      if (params["ref"] == "createPackage") {
        //  record.submitFields({
        //     type: record.Type.ITEM_FULFILLMENT,
        //     id: body.tranid,
        //     values: {
        //       custbody_nst_wms_v3_package_boxes: body.selectedPackageid
        //     },
        // });

        createShippingDetails(body);
      } else if (params["ref"] == "updateIFRecord") {
        if (body.statusref == "picked") {
          record.submitFields({
            type: record.Type.ITEM_FULFILLMENT,
            id: body.tranid,
            values: {
              shipstatus: "B",
            },
          });
        } else if (body.statusref == "packed") {
          record.submitFields({
            type: record.Type.ITEM_FULFILLMENT,
            id: body.tranid,
            values: {
              shipstatus: "C",
            },
          });
        }
      }
      scriptContext.response.write(JSON.stringify(response));
    }

    function createShippingDetails(data) {
      var recObj = record.create({
        type: "customrecord_nst_wms_v3_package_details",
        isDynamic: true,
      });
      recObj.setValue("custrecord_nst_wms_v3_item_fulfillment", data.tranid);
      recObj.setValue("custrecord_nst_wms_v3_weight", data.selectedWeight);
      recObj.setValue(
        "custrecord_nst_wms_v3_box_dimensions",
        data.selectedPackage
      );
      recObj.setValue("custrecord_nst_wms_v3_sales_order", data.saleorder);
      recObj.setValue("custrecord_nst_wms_v3_packer_name", data.empId);
      recObj.setValue("custrecord_nst_wms_v3_location", data.location);
      recObj.setValue(
        "custrecord_nst_wms_v3_package_data",
        JSON.stringify(data.items)
      );
      var newid = recObj.save();

      var existingPackageDetails = record.load({
        type: record.Type.ITEM_FULFILLMENT,
        id: data.tranid,
        isDynamic: true,
      });

      var previousifdata = existingPackageDetails.getValue({
        fieldId: "custbody_nst_wms_v3_package_boxes",
      });
      log.debug("previousifdata", previousifdata);
      if (previousifdata.length > 0) {
        previousifdata.push(newid);
      } else {
        previousifdata = newid;
      }

      record.submitFields({
        type: record.Type.ITEM_FULFILLMENT,
        id: data.tranid,
        values: {
          custbody_nst_wms_v3_package_boxes: previousifdata,
        },
      });
    }

    function getShipmentId(params, tranids) {
      var orderData = {
        statusref: "",
        tranid: "",
        tranidInternalId: "",
        customer: "",
        customertext: "",
        internalid: "",
        status: "",
        createdfromid: "",
        shipaddress: "",
        trandate: "",
        shipmethod: "",
        items: [],
      };
      var itemfulfillmentSearchObj = search.create({
        type: "itemfulfillment",
        filters: [
          ["type", "anyof", "ItemShip"],
          "AND",
          ["status", "anyof", "ItemShip:A", "ItemShip:B"],
          "AND",
          ["taxline", "is", "F"],
          "AND",
          ["cogs", "is", "F"],
          "AND",
          ["shipping", "is", "F"],
          "AND",
          ["numbertext", "is", tranids],
        ],
        columns: [
          search.createColumn({ name: "item", label: "Item" }),
          search.createColumn({ name: "quantity", label: "Quantity" }),
          search.createColumn({
            name: "description",
            join: "item",
            label: "Description",
          }),
          search.createColumn({
            name: "weight",
            join: "item",
            label: "Item Weight",
          }),
          search.createColumn({ name: "upccode", join: "item", label: "UPC" }),
          search.createColumn({ name: "tranid", label: "Document Number" }),
          search.createColumn({ name: "statusref", label: "Status" }),
          search.createColumn({ name: "createdfrom", label: "Created From" }),
          search.createColumn({ name: "entity", label: "Name" }),
          search.createColumn({ name: "internalid", label: "Internal ID" }),
          search.createColumn({ name: "shipaddress", label: "Ship Address" }),
          search.createColumn({ name: "trandate", label: "IF Date" }),
          search.createColumn({ name: "shipmethod", label: "Ship Method" }),
        ],
      });

      var searchResultCount = itemfulfillmentSearchObj.runPaged().count;
      if (searchResultCount > 0) {
        //log.debug("itemfulfillmentSearchObj result count", searchResultCount);
        itemfulfillmentSearchObj.run().each(function (result) {
          if (!orderData.statusref) {
            orderData.statusref = result.getValue({
              name: "statusref",
            });
          }
          if (!orderData.tranid) {
            orderData.tranid = result.getValue({
              name: "tranid",
            });
          }
          if (!orderData.customer) {
            orderData.customer = result.getValue({
              name: "entity",
            });
          }
          if (!orderData.customerText) {
            orderData.customerText = result.getText({
              name: "entity",
            });
          }
          if (!orderData.internalid) {
            orderData.internalid = result.getValue({
              name: "internalid",
            });
          }
          if (!orderData.createdfromname) {
            orderData.createdfromname = result.getText({
              name: "createdfrom",
              label: "Created From",
            });
          }

          if (!orderData.shipaddress) {
            orderData.shipaddress = result.getValue({
              name: "shipaddress",
              label: "Ship Address",
            });
          }
          if (!orderData.trandate) {
            orderData.trandate = result.getValue({
              name: "trandate",
              label: "IF Date",
            });
          }
          if (!orderData.shipmethod) {
            orderData.shipmethod = result.getText({
              name: "shipmethod",
              label: "Ship Method",
            });
          }

          var itemObj = {};
          itemObj["item"] = result.getText({ name: "item", label: "Item" });
          itemObj["quantity"] = result.getValue({
            name: "quantity",
            label: "Quantity",
          });
          itemObj["createdfrom"] = result.getValue({
            name: "createdfrom",
            label: "Created From",
          });
          itemObj["createdfromname"] = result.getText({
            name: "createdfrom",
            label: "Created From",
          });
          itemObj["createdfromname"] = result.getText({
            name: "createdfrom",
            label: "Created From",
          });
          itemObj["salesdescription"] = result.getValue({
            name: "description",
            join: "item",
            label: "Description",
          });
          itemObj["itemweight"] = result.getValue({
            name: "weight",
            join: "item",
            label: "Item Weight",
          });
          itemObj["UPC"] = result.getValue({
            name: "upccode",
            join: "item",
            label: "UPC",
          });

          itemObj["scanned"] = false;
          orderData.items.push(itemObj);
          orderData.status = "success";
          return true;
        });
      } else {
        orderData.status = "Order not found";
      }

      return orderData;
    }

    function getPackageDetails() {
      var packageDetailsArray = [];
      var packageSearchObj = search.create({
        type: "customrecord_nst_wms_v3_box_details",
        filters: [["isinactive", "is", "F"]],
        columns: [
          search.createColumn({ name: "name", label: "Name" }),
          search.createColumn({
            name: "custrecord_nst_wms_v3_box_length",
            label: "Length",
          }),
          search.createColumn({
            name: "custrecord_nst_wms_v3_box_width",
            label: "Width",
          }),
          search.createColumn({
            name: "custrecord_nst_wms_v3_box_height",
            label: "Height",
          }),
          search.createColumn({ name: "internalid", label: "Internal ID" }),
        ],
      });
      // packageSearchObj.run().each(function (result) {
      //     log.debug('result' , result)
      // });
      var searchResultCount = packageSearchObj.runPaged().count;
      //log.debug('searchResultCount' , searchResultCount)
      packageSearchObj.run().each(function (result) {
        var packagedata = {};
        packagedata.id = result.id;
        packagedata.name = result.getValue({
          name: "name",
        });
        packagedata.boxLength = result.getValue({
          name: "custrecord_nst_wms_v3_box_length",
        });
        packagedata.boxWidth = result.getValue({
          name: "custrecord_nst_wms_v3_box_width",
        });
        packagedata.boxHeight = result.getValue({
          name: "custrecord_nst_wms_v3_box_height",
        });
        packagedata.boxId = result.getValue({
          name: "internalid",
        });

        packageDetailsArray.push(packagedata);
        // log.debug('packagedata', packagedata)
        return true;
      });
      return packageDetailsArray;
    }
  };
  return { onRequest };
});
