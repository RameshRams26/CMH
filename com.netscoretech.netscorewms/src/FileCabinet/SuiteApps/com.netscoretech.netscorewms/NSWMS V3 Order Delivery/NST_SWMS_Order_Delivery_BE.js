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
        response["orderData"] = getOrderData(params["assignmentId"]);
        response["deliveryExceptionTypes"] = getDeliveryExceptionTypes();
      }
      scriptContext.response.write(JSON.stringify(response));
    } else {
      var params = scriptContext.request.parameters;
      var body = JSON.parse(scriptContext.request.body);
      var response = {};
      if (params["ref"] == "createBackup") {
        log.debug("body", body);
        response = utility.createBackupRecord(body, "shiporder");
      } else if (params["ref"] == "apprCmpltBackup") {
        try {
          response = createFullfillmentRecord(body.recId, body.status);
        } catch (e) {
          response["status"] = "failure";
          response["message"] = e;
          log.debug("error in createFullfillmentRecord", e);
        }
      }
      log.debug("response", response);

      scriptContext.response.setHeader({
        name: "Content-Type",
        value: "application/json",
      });

      scriptContext.response.write(JSON.stringify(response));
    }

    function getOrderData(assignmentId) {
      log.debug("assignmentId", assignmentId);
      var orderObj = {
        orderId: "",
        orderText: "",
        customer: "",
        customerText: "",
        items: [],
        itemFulfillments: [],
      };
      try {
        var customrecord_nst_wms_v3_picker_assignmenSearchObj = search.create({
          type: "customrecord_nst_wms_v3_picker_assignmen",
          filters: [
            ["isinactive", "is", "F"],
            "AND",
            ["custrecord_ns_wms_pia_status", "noneof", "4", "5"],
            "AND",
            ["custrecord_ns_wms_pia_parent_rec", "anyof", assignmentId],
          ],
          columns: [
            search.createColumn({
              name: "custrecord_ns_wms_pia_status",
              label: "Status",
            }),
            search.createColumn({
              name: "custrecord_ns_wms_pia_picker",
              label: "Assigned Picker",
            }),
            search.createColumn({
              name: "custrecord_ns_wms_pia_item",
              label: "Item",
            }),
            search.createColumn({
              name: "custrecord_ns_wms_pia_stage_out_bin",
              label: "Stage Out Bin",
            }),
            search.createColumn({
              name: "custrecord_ns_wms_pia_parent_rec",
              label: "Assignment Header Link",
            }),
            search.createColumn({ name: "name", label: "ID" }),
            search.createColumn({
              name: "custrecord_ns_wms_pia_sales_order",
              label: "Sales Order",
            }),
            search.createColumn({
              name: "custrecord_ns_wms_pia_fulfill_ref",
              label: "Item Fulfillment",
            }),
            search.createColumn({
              name: "custrecord_ns_wms_pia_picked_qty",
              label: "Picked Quantity",
            }),
            search.createColumn({
              name: "custrecord_ns_wms_soah_customer",
              join: "CUSTRECORD_NS_WMS_PIA_PARENT_REC",
              label: "Customer",
            }),
            search.createColumn({name: "custrecord_ns_wms_pia_line_key", label: "SO Line Key"})
          ],
        });
        var searchResultCount =
          customrecord_nst_wms_v3_picker_assignmenSearchObj.runPaged().count;
        log.debug(
          "customrecord_nst_wms_v3_picker_assignmenSearchObj result count",
          searchResultCount
        );
        customrecord_nst_wms_v3_picker_assignmenSearchObj
          .run()
          .each(function (result) {
            if (!orderObj.orderId) {
              orderObj.orderId = result.getValue({
                name: "custrecord_ns_wms_pia_sales_order",
                label: "Sales Order",
              });
              orderObj.orderText = result.getText({
                name: "custrecord_ns_wms_pia_sales_order",
                label: "Sales Order",
              });
            }
            if (!orderObj.customer) {
              orderObj.customer = result.getValue({
                name: "custrecord_ns_wms_soah_customer",
                join: "CUSTRECORD_NS_WMS_PIA_PARENT_REC",
                label: "Customer",
              });
              orderObj.customerText = result.getText({
                name: "custrecord_ns_wms_soah_customer",
                join: "CUSTRECORD_NS_WMS_PIA_PARENT_REC",
                label: "Customer",
              });
            }
            var itemObj = {};
            itemObj.itemFulfillment = result.getText({
              name: "custrecord_ns_wms_pia_fulfill_ref",
              label: "Item Fulfillment",
            });
            itemObj.itemFulfillmentId = result.getValue({
              name: "custrecord_ns_wms_pia_fulfill_ref",
              label: "Item Fulfillment",
            });
            orderObj.itemFulfillments.push(itemObj.itemFulfillmentId);
            itemObj.itemName = result.getText({
              name: "custrecord_ns_wms_pia_item",
              label: "Item",
            });
            itemObj.itemId = result.getValue({
              name: "custrecord_ns_wms_pia_item",
              label: "Item",
            });
            itemObj.status = result.getText({
              name: "custrecord_ns_wms_pia_status",
              label: "Status",
            });
            itemObj.assignedPicker = result.getText({
              name: "custrecord_ns_wms_pia_picker",
              label: "Assigned Picker",
            });
            itemObj.stageOutBin = result.getText({
              name: "custrecord_ns_wms_pia_stage_out_bin",
              label: "Stage Out Bin",
            });
            itemObj.pickedQty = result.getValue({
              name: "custrecord_ns_wms_pia_picked_qty",
              label: "Picked Quantity",
            });
            itemObj.lineUniqueKey = result.getValue({name: "custrecord_ns_wms_pia_line_key", label: "SO Line Key"});
            itemObj.deliveringQty = Number(itemObj.pickedQty);
            itemObj.remainingQty = 0;
            (itemObj.reason = null),
              (itemObj.comments = ""),
              (itemObj.confirmed = false);
            orderObj.items.push(itemObj);
            return true;
          });
        let invDetailFromIF = getInveDetailFromItemFulfillment(orderObj.itemFulfillments);
        orderObj.items.forEach(item=>{
          item.invDetails = invDetailFromIF[item.lineUniqueKey];
          item.invNumbers = item.invDetails ? item.invDetails.map(i=>i.invNumber).join(", ") : "";
        });
        delete orderObj.itemFulfillments;
        return orderObj;
      } catch (e) {
        log.error("error in getOrdersForDelivery ", e);
        var response = { status: "error", message: e.message };
        return response;
      }
    }

    function getDeliveryExceptionTypes() {
      let deliveryExceptionTypes = [];
      var deliveryExceptionTypesSearch = search.create({
        type: "customlist_nst_wms_v3_exeption_types",
        filters: [["isinactive", "is", "F"]],
        columns: [
          search.createColumn({ name: "name", label: "Name" }),
          search.createColumn({ name: "internalid", label: "Internal ID" }),
        ],
      });
      var searchResultCount = deliveryExceptionTypesSearch.runPaged().count;
      log.debug("deliveryExceptionTypesSearch result count", searchResultCount);
      deliveryExceptionTypesSearch.run().each(function (result) {
        deliveryExceptionTypes.push({
          id: result.getValue({ name: "internalid", label: "Internal ID" }),
          value: result.getValue({ name: "name", label: "Name" }),
        });
        return true;
      });
      return deliveryExceptionTypes;
    }

    function getInveDetailFromItemFulfillment(itemFulfillments) {
      let invDetailFromIF  = [];
      var itemfulfillmentSearchObj = search.create({
        type: "itemfulfillment",
        settings: [{ name: "consolidationtype", value: "ACCTTYPE" }],
        filters: [
          ["type", "anyof", "ItemShip"],
          "AND",
          ["internalid", "anyof",itemFulfillments],
          "AND",
          ["taxline", "is", "F"],
          "AND",
          ["cogs", "is", "F"],
        ],
        columns: [
          search.createColumn({ name: "tranid", label: "Document Number" }),
          search.createColumn({ name: "item", label: "Item" }),
          search.createColumn({
            name: "inventorynumber",
            join: "inventoryDetail",
            label: " Number",
          }),
          search.createColumn({
            name: "quantity",
            join: "inventoryDetail",
            label: "Quantity",
          }),
          search.createColumn({
            name: "custcol_nst_wms_nestcoreid",
            label: "NetScore Unique Item ID",
          }),
        ],
      });
      var searchResultCount = itemfulfillmentSearchObj.runPaged().count;
      log.debug("itemfulfillmentSearchObj result count", searchResultCount);
      itemfulfillmentSearchObj.run().each(function (result) {
        let itemObj = {};
        itemObj.invNumber = result.getText({ name: "inventorynumber", join: "inventoryDetail", label: " Number" });
        itemObj.invQuantity = result.getValue({name: "quantity",join: "inventoryDetail",label: "Quantity"});
        itemObj.lineUniqueKey = result.getValue({ name: "custcol_nst_wms_nestcoreid", label: "NetScore Unique Item ID" });
        invDetailFromIF.push(itemObj);
        return true;
      });
       invDetailFromIF = invDetailFromIF.reduce((acc, { lineUniqueKey, invNumber, invQuantity }) => {
        if (!acc[lineUniqueKey]) {
          acc[lineUniqueKey] = [];
        }
        acc[lineUniqueKey].push({ invNumber, invQuantity });
        return acc;
      }, {});
      return invDetailFromIF;
    }
  };
  return { onRequest };
});
