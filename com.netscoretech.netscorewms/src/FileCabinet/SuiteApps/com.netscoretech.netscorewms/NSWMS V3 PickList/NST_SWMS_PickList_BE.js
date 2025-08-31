/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @description Backend Suitelet for pick list and picking process, returns JSON for GET/POST.
 *
 * @scriptName NST_SWMS_PickList_BE.js
 *
 * @version 1.0
 * @date August 28th 2025
 * @author Ramesh Gantala
 */
define(['N/search', 'N/record', '../NSWMS V3 Globals/utility_module'], function (search, record, utility) {
  const picking = {
    subsidiaryId: 3, // Default Subsidiary ID
    headerRecordType: 'customrecord_nst_wms_v3_so_assign_header',
    lineRecordType: 'recmachcustrecord_ns_wms_pia_parent_rec',
    onRequest: function (context) {
      this.params = context.request.parameters;
      context.response.setHeader({
        name: 'Content-Type',
        value: 'application/json',
      });

      try {
        let result = {};
        if (context.request.method === 'GET') {
          result = this.handleGet(context.request);
        } else if (context.request.method === 'POST') {
          this.body = JSON.parse(context.request.body);
          result = this.handlePost();
        } else {
          result = { error: 'Unsupported request method' };
          context.response.status = 405;
        }
        context.response.write(JSON.stringify(result));
      } catch (e) {
        log.error({ title: 'Suitelet Error', details: e });
        context.response.status = 500;
        context.response.write(JSON.stringify({ error: e.message || e }));
      }
    },

    handleGet: function () {
      let response = {};
      if (this.params['ref'] == 'get_lists') {
        response['pickers'] = this.get_pickers_data();
        response['assigned_orders'] = this.get_assigned_orders();
        response['locationObj'] = utility.fieldLookUp('location', this.params['locationId'], ['name']);
      }
      if (this.params['ref'] == 'get_assignment_items' && this.params['assignmentId']) {
        response = this.get_assignment_items(this.params['assignmentId']);
      }
      return response;
    },

    handlePost: function () {
      let response = {};
      if (this.params['ref'] == 'assign_order') {
        response = this.assign_order();
      }
      return response;
    },

    get_assigned_orders: function () {
      var searchObj = search.create({
        type: 'customrecord_nst_wms_v3_picker_assignmen',
        filters: [
          ['isinactive', 'is', 'F'],
          'AND',
          ['custrecord_ns_wms_pia_status', 'anyof', '1', '2'],
          'AND',
          ['custrecord_ns_wms_pia_picker', 'anyof', this.params.empId],
          'AND',
          ['custrecord_ns_wms_pia_sales_order.mainline', 'is', 'T'],
        ],
        columns: [
          { name: 'custrecord_ns_wms_pia_status' },
          { name: 'custrecord_ns_wms_soah_customer', join: 'CUSTRECORD_NS_WMS_PIA_PARENT_REC' },
          { name: 'tranid', join: 'CUSTRECORD_NS_WMS_PIA_SALES_ORDER' },
          { name: 'name', join: 'CUSTRECORD_NS_WMS_PIA_PARENT_REC' },
          { name: 'internalid', join: 'CUSTRECORD_NS_WMS_PIA_PARENT_REC' },
          { name: 'custrecord_ns_wms_pia_item' },
          { name: 'custrecord_ns_wms_pia_qty' },
          { name: 'trandate', join: 'CUSTRECORD_NS_WMS_PIA_SALES_ORDER' },
        ],
      });

      var dataMap = {};

      searchObj.run().each(function (result) {
        var status = result.getValue({ name: 'custrecord_ns_wms_pia_status' });
        var customer = result.getText({
          name: 'custrecord_ns_wms_soah_customer',
          join: 'CUSTRECORD_NS_WMS_PIA_PARENT_REC',
        });
        var orderId = result.getValue({ name: 'tranid', join: 'CUSTRECORD_NS_WMS_PIA_SALES_ORDER' });
        var parentId = result.getValue({ name: 'name', join: 'CUSTRECORD_NS_WMS_PIA_PARENT_REC' });
        var parentRecordId = result.getValue({ name: 'internalid', join: 'CUSTRECORD_NS_WMS_PIA_PARENT_REC' });
        var qty = Number(result.getValue({ name: 'custrecord_ns_wms_pia_qty' })) || 0;
        var trandate = result.getValue({
          name: 'trandate',
          join: 'CUSTRECORD_NS_WMS_PIA_SALES_ORDER',
        });
        var itemId = result.getValue({ name: 'custrecord_ns_wms_pia_item' });
        var uniqueKey = result.getValue({ name: 'custrecord_ns_wms_pia_line_key' }) || '';

        // Group by orderId
        if (!dataMap[orderId]) {
          dataMap[orderId] = {
            id: parentRecordId,
            orderId: orderId,
            parentId: parentId,
            customer: customer,
            trandate: trandate,
            totalQty: 0,
            totalItems: 0,
            pendingItems: 0,
            pickedItems: 0,
            partiallyPickedItems: 0,
            _itemMap: {},
          };
        }

        // Group by unique item+line
        var itemKey = itemId + '|' + uniqueKey;
        if (!dataMap[orderId]._itemMap[itemKey]) {
          dataMap[orderId]._itemMap[itemKey] = { hasPending: false, hasPicked: false };
        }
        if (status === '1') dataMap[orderId]._itemMap[itemKey].hasPending = true;
        if (status === '2') dataMap[orderId]._itemMap[itemKey].hasPicked = true;

        dataMap[orderId].totalQty += qty;
        return true;
      });

      // Now, calculate counts
      Object.keys(dataMap).forEach(function (orderId) {
        var order = dataMap[orderId];
        var uniqueItems = Object.values(order._itemMap);

        order.totalItems = uniqueItems.length;
        order.pendingItems = uniqueItems.filter(function (item) {
          return item.hasPending && !item.hasPicked;
        }).length;
        order.pickedItems = uniqueItems.filter(function (item) {
          return item.hasPicked && !item.hasPending;
        }).length;
        order.partiallyPickedItems = uniqueItems.filter(function (item) {
          return item.hasPicked && item.hasPending;
        }).length;

        delete order._itemMap;
      });

      var finalData = Object.keys(dataMap).map(function (key) {
        return dataMap[key];
      });

      this.log('Final Grouped Data', finalData);
      return finalData;
    },

    get_pickers_data: function () {
      let pickers = {};
      let employeeSearchObj = search.create({
        type: 'employee',
        filters: [['isinactive', 'is', 'F'], 'AND', ['custentity_nst_wms_picker', 'is', 'T']],
        columns: [{ name: 'entityid' }],
      });
      employeeSearchObj.run().each(function (result) {
        pickers[result.id] = { id: result.id, name: result.getValue('entityid'), baseAssignedItems: 0 };
        return true;
      });

      return pickers;
    },

    assign_order: function () {
      var empId = this.body.empId;
      var assignOrder = this.body.assignOrder;
      var response = { assignmentId: null };

      var isAssigned = this.check_for_assigned(assignOrder);
      if (isAssigned) {
        response = { error: 'Order ' + assignOrder + ' is already assigned.' };
        return response;
      }

      var salesOrders = this.get_sales_order_data(assignOrder, empId);
      if (!salesOrders) {
        response = { error: 'Order ' + assignOrder + ' not found or no items to pick.' };
        return response;
      }
      this.log('Sales Orders to Assign', salesOrders);

      salesOrders.forEach((order) => {
        response.assignmentId = this.create_update_assignment_record(order, empId);
      });

      return response;
    },

    create_update_assignment_record: function (orderObj, empId) {
      let items = orderObj['items'];
      let assignmentRecord;

      assignmentRecord = record.create({
        type: this.headerRecordType,
        isDynamic: true,
      });
      assignmentRecord.setValue({ fieldId: 'custrecord_ns_wms_soah_sales_order', value: orderObj['id'] });
      assignmentRecord.setValue({ fieldId: 'custrecord_ns_wms_soah_customer', value: orderObj['customerId'] });
      assignmentRecord.setValue({ fieldId: 'custrecord_ns_wms_soah_no_of_items', value: orderObj['no_of_items'] });
      assignmentRecord.setValue({ fieldId: 'custrecord_ns_wms_soah_total_qty', value: orderObj['totalQty'] });

      items.forEach((item) => {
        if (item['draftPicker'].id) {
          assignmentRecord.selectNewLine({ sublistId: this.lineRecordType });
          assignmentRecord.setCurrentSublistValue({
            sublistId: this.lineRecordType,
            fieldId: 'custrecord_ns_wms_pia_locatio',
            value: item['locationId'],
          });
          assignmentRecord.setCurrentSublistValue({
            sublistId: this.lineRecordType,
            fieldId: 'custrecord_ns_wms_pia_sales_order',
            value: orderObj['id'],
          });
          assignmentRecord.setCurrentSublistValue({
            sublistId: this.lineRecordType,
            fieldId: 'custrecord_ns_wms_pia_item',
            value: item['itemId'],
          });
          assignmentRecord.setCurrentSublistValue({
            sublistId: this.lineRecordType,
            fieldId: 'custrecord_ns_wms_pia_line_key',
            value: item['uniqueKey'],
          });
          assignmentRecord.setCurrentSublistValue({
            sublistId: this.lineRecordType,
            fieldId: 'custrecord_ns_wms_pia_original_qty',
            value: item['qty'],
          });
          assignmentRecord.setCurrentSublistValue({
            sublistId: this.lineRecordType,
            fieldId: 'custrecord_ns_wms_pia_qty',
            value: item['qty'],
          });
          assignmentRecord.setCurrentSublistValue({
            sublistId: this.lineRecordType,
            fieldId: 'custrecord_ns_wms_pia_assigned_by',
            value: empId,
          });
          assignmentRecord.setCurrentSublistValue({
            sublistId: this.lineRecordType,
            fieldId: 'custrecord_ns_wms_pia_picker',
            value: item['draftPicker'].id,
          });
          assignmentRecord.setCurrentSublistValue({
            sublistId: this.lineRecordType,
            fieldId: 'custrecord_ns_wms_pia_status',
            value: 1,
          });
          assignmentRecord.setCurrentSublistValue({
            sublistId: this.lineRecordType,
            fieldId: 'custrecord_ns_wms_pia_assign_type',
            value: 1,
          });

          assignmentRecord.commitLine({ sublistId: this.lineRecordType });
        }
      });

      return assignmentRecord.save();
    },

    get_sales_order_data: function (soId, empId) {
      let salesOrdersMap = {};

      let transactionSearchObj = search.create({
        type: 'transaction',
        filters: [
          ['status', 'anyof', 'SalesOrd:B', 'SalesOrd:E'],
          'AND',
          ['numbertext', 'is', soId],
          'AND',
          ['mainline', 'is', 'F'],
          'AND',
          ['taxline', 'is', 'F'],
          'AND',
          ['shipping', 'is', 'F'],
          'AND',
          ['cogs', 'is', 'F'],
          'AND',
          [
            'formulanumeric: NVL({quantity}-NVL({quantity}-NVL({quantitycommitted},0)-NVL({quantityshiprecv},0),0),0)-NVL({quantitypicked},0)',
            'greaterthan',
            '0',
          ],
        ],
        columns: [
          { name: 'tranid' },
          { name: 'entity' },
          { name: 'custbody_itbs_del_option_so' },
          { name: 'trandate', label: 'Date' },
          { name: 'item' },
          { name: 'memo' },
          { name: 'inventorylocation' },
          {
            name: 'formulanumeric',
            formula:
              'NVL({quantity}-NVL({quantity}-NVL({quantitycommitted},0)-NVL({quantityshiprecv},0),0),0)-NVL({quantitypicked},0)',
          },
          { name: 'isserialitem', join: 'item' },
          { name: 'islotitem', join: 'item' },
          { name: 'custitemcust_cmhit_tracksnatdelivery', join: 'item' },
          { name: 'lineuniquekey' },
          { name: 'custbody_nst_wms_assignment_record' },
        ],
      });

      let ordersCount = transactionSearchObj.runPaged().count;

      if (ordersCount === 0) {
        return false;
      }

      transactionSearchObj.run().each(function (result) {
        let soId = result.getValue({ name: 'tranid' });
        let customer = result.getText({ name: 'entity' });
        let date = result.getValue({ name: 'trandate' });

        let deliveryOption = result.getText({ name: 'custbody_itbs_del_option_so' });
        let qty = parseFloat(result.getValue({ name: 'formulanumeric' })) || 0;

        let itemName = result.getText({ name: 'item' });
        let itemId = result.getValue({ name: 'item' });
        let memo = result.getValue({ name: 'memo' });
        let location = result.getText({ name: 'inventorylocation' });
        let locationId = result.getValue({ name: 'inventorylocation' });
        let uniqueKey = result.getValue({ name: 'lineuniquekey' });

        let serialFlag = result.getValue({ name: 'isserialitem', join: 'item' });
        let lotFlag = result.getValue({ name: 'islotitem', join: 'item' });
        let trackSerial = result.getValue({ name: 'custitemcust_cmhit_tracksnatdelivery', join: 'item' });

        let itemType = 'inv';
        if (serialFlag) {
          itemType = 'serial';
        } else if (lotFlag && trackSerial) {
          itemType = 'serial_lot';
        } else if (lotFlag) {
          itemType = 'lot';
        }

        if (!salesOrdersMap[soId]) {
          salesOrdersMap[soId] = {
            assignmentId: result.getValue({ name: 'custbody_nst_wms_assignment_record' }) || null,
            id: result.id,
            documentNumber: soId,
            customer: customer,
            customerId: result.getValue({ name: 'entity' }),
            date: date,
            totalQty: 0,
            type: itemType,
            deliveryOption: deliveryOption,
            no_of_items: 0,
            items: [],
          };

          ordersCount++;
        }

        salesOrdersMap[soId].items.push({
          item: itemName,
          itemId: itemId,
          description: memo,
          location: location,
          locationId: locationId,
          uniqueKey: uniqueKey,
          qty: qty,
          type: itemType,
          savedPicker: null,
          draftPicker: { id: empId },
        });

        salesOrdersMap[soId].totalQty += qty;
        salesOrdersMap[soId].no_of_items++;
        totalQty++;

        return true;
      });

      let salesOrders = Object.keys(salesOrdersMap).map(function (soId) {
        return salesOrdersMap[soId];
      });

      return salesOrders;
    },

    check_for_assigned: function (soId) {
      var headerSearchObj = search.create({
        type: 'customrecord_nst_wms_v3_so_assign_header',
        filters: [['custrecord_ns_wms_soah_sales_order.numbertext', 'is', soId], 'AND', ['isinactive', 'is', 'F']],
        columns: [{ name: 'name' }],
      });
      return headerSearchObj.runPaged().count > 0;
    },

    log: function (title, details) {
      log.debug({ title: title, details: JSON.stringify(details) });
    },

    get_assignment_items: function (assignmentHeaderId) {
      var resultObj = {
        orderId: null,
        customer: null,
        assignmentHeader: null,
        assignmentHeaderId: null,
        salesOrderId: null,
        items: [],
        inventoryData: [],
      };
      var itemMap = {};

      var itemIds = [];

      var searchObj = search.create({
        type: 'customrecord_nst_wms_v3_picker_assignmen',
        filters: [
          ['isinactive', 'is', 'F'],
          'AND',
          ['custrecord_ns_wms_pia_status', 'anyof', '1', '2'],
          'AND',
          ['custrecord_ns_wms_pia_picker', 'anyof', this.params.empId],
          'AND',
          ['custrecord_ns_wms_pia_sales_order.mainline', 'is', 'T'],
          'AND',
          ['custrecord_ns_wms_pia_parent_rec.internalidnumber', 'equalto', assignmentHeaderId],
        ],
        columns: [
          { name: 'custrecord_ns_wms_pia_status' },
          { name: 'custrecord_ns_wms_soah_customer', join: 'CUSTRECORD_NS_WMS_PIA_PARENT_REC' },
          { name: 'tranid', join: 'CUSTRECORD_NS_WMS_PIA_SALES_ORDER' },
          { name: 'name', join: 'CUSTRECORD_NS_WMS_PIA_PARENT_REC' },
          { name: 'custrecord_ns_wms_pia_parent_rec' },
          { name: 'custrecord_ns_wms_pia_locatio' },
          { name: 'custrecord_ns_wms_pia_item' },
          { name: 'custrecord_ns_wms_pia_qty' },
          { name: 'custrecord_ns_wms_pia_picked_qty' },
          { name: 'custrecord_ns_wms_pia_inv_detail' },
          { name: 'custrecord_ns_wms_pia_stage_out_bin' },
          { name: 'custrecord_ns_wms_pia_line_key' },
          { name: 'upccode', join: 'CUSTRECORD_NS_WMS_PIA_ITEM' },
          { name: 'displayname', join: 'CUSTRECORD_NS_WMS_PIA_ITEM' },
          { name: 'isserialitem', join: 'CUSTRECORD_NS_WMS_PIA_ITEM' },
          { name: 'islotitem', join: 'CUSTRECORD_NS_WMS_PIA_ITEM' },
          { name: 'custitemcust_cmhit_tracksnatdelivery', join: 'CUSTRECORD_NS_WMS_PIA_ITEM' },
          { name: 'internalid' },
          { name: 'internalid', join: 'CUSTRECORD_NS_WMS_PIA_SALES_ORDER' },
        ],
      });

      searchObj.run().each(function (result) {
        var orderId = result.getValue({ name: 'tranid', join: 'CUSTRECORD_NS_WMS_PIA_SALES_ORDER' });
        var customer = result.getText({
          name: 'custrecord_ns_wms_soah_customer',
          join: 'CUSTRECORD_NS_WMS_PIA_PARENT_REC',
        });
        var assignmentHeader = result.getText({ name: 'name', join: 'CUSTRECORD_NS_WMS_PIA_PARENT_REC' });
        var assignmentHeaderId = result.getValue({ name: 'custrecord_ns_wms_pia_parent_rec' });
        var salesOrderId = result.getValue({ name: 'internalid', join: 'CUSTRECORD_NS_WMS_PIA_SALES_ORDER' });
        var itemId = result.getValue({ name: 'custrecord_ns_wms_pia_item' });
        var soLineKey = result.getValue({ name: 'custrecord_ns_wms_pia_line_key' }) || '';

        if (!resultObj.orderId) {
          resultObj.orderId = orderId;
          resultObj.customer = customer;
          resultObj.assignmentHeader = assignmentHeader;
          resultObj.assignmentHeaderId = assignmentHeaderId;
          resultObj.salesOrderId = salesOrderId;
        }

        var itemKey = itemId + '|' + soLineKey;
        if (itemIds.indexOf(itemId) === -1) {
          itemIds.push(itemId);
        }

        if (!itemMap[itemKey]) {
          itemMap[itemKey] = {
            location: result.getValue({ name: 'custrecord_ns_wms_pia_locatio' }),
            locationText: result.getText({ name: 'custrecord_ns_wms_pia_locatio' }),
            itemId: itemId,
            itemName: result.getText({ name: 'custrecord_ns_wms_pia_item' }),
            displayName: result.getValue({ name: 'displayname', join: 'CUSTRECORD_NS_WMS_PIA_ITEM' }),
            upc: result.getValue({ name: 'upccode', join: 'CUSTRECORD_NS_WMS_PIA_ITEM' }),
            isSerial: result.getValue({ name: 'isserialitem', join: 'CUSTRECORD_NS_WMS_PIA_ITEM' }),
            isLot: result.getValue({ name: 'islotitem', join: 'CUSTRECORD_NS_WMS_PIA_ITEM' }),
            trackSNAtDelivery: result.getValue({
              name: 'custitemcust_cmhit_tracksnatdelivery',
              join: 'CUSTRECORD_NS_WMS_PIA_ITEM',
            }),
            totalAssignedQty: 0,
            totalPickedQty: 0,
            lines: [],
            totalInvDetail: [],
            bins: {},
          };
        }

        var assignedQty = Number(result.getValue({ name: 'custrecord_ns_wms_pia_qty' })) || 0;
        var pickedQty = Number(result.getValue({ name: 'custrecord_ns_wms_pia_picked_qty' })) || 0;

        itemMap[itemKey].totalAssignedQty += assignedQty;
        itemMap[itemKey].totalPickedQty += pickedQty;

        var invDetailJson = result.getValue({ name: 'custrecord_ns_wms_pia_inv_detail' });
        var invDetailArr = [];
        try {
          if (invDetailJson) {
            invDetailArr = JSON.parse(invDetailJson);
          }
        } catch (e) {
          invDetailArr = [];
        }

        itemMap[itemKey].totalInvDetail = itemMap[itemKey].totalInvDetail.concat(invDetailArr);

        invDetailArr.forEach(function (binObj) {
          var binId = binObj.bin || binObj.binId;
          if (!itemMap[itemKey].bins[binId]) {
            itemMap[itemKey].bins[binId] = {
              binId: binId,
              assigned: 0,
              picked: 0,
              status: binObj.status,
            };
          }
          itemMap[itemKey].bins[binId].assigned += Number(binObj.qty) || 0;
          if (binObj.status === 'Picked' || binObj.status === 2) {
            itemMap[itemKey].bins[binId].picked += Number(binObj.qty) || 0;
          }
        });

        itemMap[itemKey].lines.push({
          internalid: result.getValue({ name: 'internalid' }),
          status: result.getText({ name: 'custrecord_ns_wms_pia_status' }),
          assignedQty: assignedQty,
          pickedQty: pickedQty,
          pendingQty: assignedQty - pickedQty,
          bin: result.getText({ name: 'custrecord_ns_wms_pia_stage_out_bin' }),
          stageOutBin: result.getText({ name: 'custrecord_ns_wms_pia_stage_out_bin' }),
          soLineKey: soLineKey,
          location: result.getText({ name: 'custrecord_ns_wms_pia_locatio' }),
          invDetail: invDetailArr,
        });

        return true;
      });

      Object.keys(itemMap).forEach(function (key) {
        itemMap[key].assignedBins = Object.values(itemMap[key].bins);
        delete itemMap[key].bins;
      });

      var items = Object.values(itemMap);

      var inventoryData = this.get_inventory_balance(itemIds);
      resultObj.inventoryData = inventoryData;
      resultObj.items = this.assignBinsToItems(items, inventoryData);
      return resultObj;
    },

    get_inventory_balance: function (itemIds) {
      if (!itemIds || itemIds.length === 0) return [];
      var inventorybalanceSearchObj = search.create({
        type: 'inventorybalance',
        filters: [
          ['available', 'greaterthan', '0'],
          'AND',
          ['binnumber.custrecord_nst_wms_v3_type', 'anyof', '1', '2'],
          'AND',
          ['item', 'anyof', itemIds],
        ],
        columns: [
          { name: 'location', label: 'Location' },
          { name: 'item', label: 'Item' },
          { name: 'inventorynumber', label: 'Inventory Number' },
          {
            name: 'custitemnumber_itbs_receipt_date',
            join: 'inventoryNumber',
            sort: search.Sort.ASC,
            label: 'Receipt Date',
          },
          { name: 'binnumber', label: 'Bin Number' },
          {
            name: 'custrecord_nst_wms_v3_type',
            join: 'binNumber',
            label: 'NST WMS V3 TYPE',
          },
          {
            name: 'custrecord_nst_wms_v3_zone',
            join: 'binNumber',
            label: 'NST WMS V3 ZONE',
          },
          { name: 'status', label: 'Status' },
          { name: 'available', label: 'Available' },
          {
            name: 'displayname',
            join: 'item',
            label: 'Display Name',
          },
          {
            name: 'isserialitem',
            join: 'item',
            label: 'Is Serialized Item',
          },
          {
            name: 'islotitem',
            join: 'item',
            label: 'Is Lot Numbered Item',
          },
          {
            name: 'custitemcust_cmhit_tracksnatdelivery',
            join: 'item',
            label: 'Track S/N at Delivery',
          },
        ],
      });

      var binMap = {};

      inventorybalanceSearchObj.run().each(function (result) {
        var itemId = result.getValue({ name: 'item' });
        var locationId = result.getValue({ name: 'location' });
        var binId = result.getValue({ name: 'binnumber' });
        var isSerial = result.getValue({ name: 'isserialitem', join: 'item' });
        var isLot = result.getValue({ name: 'islotitem', join: 'item' });
        var lotId = result.getValue({ name: 'inventorynumber' });
        var lotText = result.getText({ name: 'inventorynumber' });
        var serialNumber = result.getText({ name: 'inventorynumber' });
        var qtyAvailable = parseFloat(result.getValue({ name: 'available' })) || 0;
        var receiptDate = result.getValue({
          name: 'custitemnumber_itbs_receipt_date',
          join: 'inventoryNumber',
          sort: search.Sort.ASC,
        });

        // Key logic
        var key;
        if (isLot) {
          key = itemId + '|' + locationId + '|' + binId + '|' + lotId + '|' + receiptDate;
        } else {
          key = itemId + '|' + locationId + '|' + binId + '|' + receiptDate;
        }

        if (!binMap[key]) {
          binMap[key] = {
            itemId: itemId,
            itemName: result.getText({ name: 'item' }),
            displayName: result.getValue({ name: 'displayname', join: 'item' }),
            locationId: locationId,
            locationText: result.getText({ name: 'location' }),
            binId: binId,
            binText: result.getText({ name: 'binnumber' }),
            binType: result.getValue({ name: 'custrecord_nst_wms_v3_type', join: 'binNumber' }),
            binTypeText: result.getText({ name: 'custrecord_nst_wms_v3_type', join: 'binNumber' }),
            binZone: result.getValue({ name: 'custrecord_nst_wms_v3_zone', join: 'binNumber' }),
            binZoneText: result.getText({ name: 'custrecord_nst_wms_v3_zone', join: 'binNumber' }),
            lotId: isLot ? lotId : undefined,
            lotText: isLot ? lotText : undefined,
            receiptDate: receiptDate,
            statusId: result.getValue({ name: 'status' }),
            statusText: result.getText({ name: 'status' }),
            isSerial: isSerial,
            isLot: isLot,
            trackSNDelivery: result.getValue({ name: 'custitemcust_cmhit_tracksnatdelivery', join: 'item' }),
            qtyAvailable: 0,
            serialNumbers: isSerial ? [] : undefined,
          };
        }

        if (isSerial) {
          // For serial items, push unique serial numbers
          if (serialNumber && binMap[key].serialNumbers.indexOf(serialNumber) === -1) {
            binMap[key].serialNumbers.push(serialNumber);
            binMap[key].qtyAvailable = binMap[key].serialNumbers.length;
          }
        } else {
          // For lot/normal items, sum qty
          binMap[key].qtyAvailable += qtyAvailable;
        }

        return true;
      });

      return Object.values(binMap);
    },

    assignBinsToItems: function (orderItems, binAvailability) {
      // Clone bins and sort FIFO
      const bins = [...binAvailability]
        .map((bin) => ({ ...bin }))
        .sort((a, b) => new Date(a.receiptDate) - new Date(b.receiptDate));

      // Group bins by itemId + location
      const binsByItemAndLocation = bins.reduce((acc, bin) => {
        const key = `${bin.itemId}||${bin.locationText}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(bin);
        return acc;
      }, {});

      return orderItems.map((order) => {
        const { itemId, lines } = order;
        var proposedBins = [];

        lines.forEach((line) => {
          let requiredQty = line.pendingQty; // use pendingQty instead of assignedQty
          const assignedBins = [];
          const key = `${itemId}||${line.location}`;
          const candidateBins = binsByItemAndLocation[key] || [];

          for (const bin of candidateBins) {
            if (requiredQty === 0) break;

            const pickQty = Math.min(requiredQty, bin.qtyAvailable);
            if (pickQty <= 0) continue;

            assignedBins.push({
              binId: bin.binId,
              binText: bin.binText,
              bintype: bin.binType,
              bintypeText: bin.binTypeText,
              binzone: bin.binZone,
              binzoneText: bin.binZoneText,
              lotId: bin.lotId,
              lotText: bin.lotText,
              receiptDate: bin.receiptDate,
              statusId: bin.statusId,
              statusText: bin.statusText,
              locationId: bin.locationId,
              locationText: bin.locationText,
              assignedQty: pickQty,
              originalQty: bin.qtyAvailable,
            });

            // Update quantities
            bin.qtyAvailable -= pickQty;
            requiredQty -= pickQty;
          }

          if (assignedBins.length > 0) {
            proposedBins = assignedBins;
          }
        });

        return { ...order, proposedBins };
      });
    },
  };

  return { onRequest: picking.onRequest.bind(picking) };
});
