/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @description Backend Suitelet for Assignment Dashboard, returns JSON for GET/POST.
 *
 * @scriptName NST_SWMS_Assign_Dashboard_BE.js
 *
 * @version 1.0
 * @date August 25th 2025
 * @author Ramesh Gantala
 */
define(['N/search', 'N/record', '../NSWMS V3 Globals/utility_module'], function (search, record, utility) {
  const AssignDashboard = {
    testIds: ['2929721', '2929723', '2929728', '2929729', '2930533'],
    pendingStatusIds: ['1', '2'],
    deliveryTypeListId: 'customlist_itbs_so_delivery_option',
    headerRecordType: 'customrecord_nst_wms_v3_so_assign_header',
    lineRecordType: 'recmachcustrecord_ns_wms_pia_parent_rec',
    onRequest: function (context) {
      this.subsidiaryId = '3';

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
        response['subsidiaryId'] = this.subsidiaryId;
        response['locationsList'] = utility.getLocationBySubsidiary(this.subsidiaryId);
        response['deliveryType'] = utility.getList(this.deliveryTypeListId);
      } else if (this.params['ref'] == 'get_pending_orders') {
        response = this.get_pending_orders();
      } else if (this.params['ref'] == 'get_assignment_history') {
        response['history'] = this.get_assignment_history();
      }
      return response;
    },

    handlePost: function () {
      let response = {};
      if (this.params['ref'] == 'assign_items_to_pickers') {
        response = this.assign_items_to_pickers();
      }
      return response;
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

    get_pending_orders: function () {
      let salesOrdersMap = {},
        ordersCount = 0,
        totalQty = 0;

      let pickersRaw = this.get_pickers_data();
      let { pickers, lineUniqueKeys: ExistingLineUniqueKeys } = this.get_assigned_items_line_unique_keys(pickersRaw);

      let transactionSearchObj = search.create({
        type: 'transaction',
        filters: [
          ['status', 'anyof', 'SalesOrd:B', 'SalesOrd:E'],
          'AND',
          ['internalid', 'anyof', this.testIds],
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

        if (ExistingLineUniqueKeys.includes(parseFloat(uniqueKey))) {
          return true; // skip already assigned lines
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
          draftPicker: null,
        });

        salesOrdersMap[soId].totalQty += qty;
        salesOrdersMap[soId].no_of_items++;
        totalQty++;

        return true;
      });

      let salesOrders = Object.keys(salesOrdersMap).map(function (soId) {
        return salesOrdersMap[soId];
      });

      let pickersArray = Object.keys(pickers).map(function (pid) {
        return pickers[pid];
      });

      return { orders: salesOrders, pickersList: pickersArray, ordersCount: ordersCount, totalQty: totalQty };
    },

    get_assigned_items_line_unique_keys: function (pickers) {
      let lineUniqueKeys = [];
      var customrecord_nst_wms_v3_picker_assignmenSearchObj = search.create({
        type: 'customrecord_nst_wms_v3_picker_assignmen',
        filters: [['custrecord_ns_wms_pia_status', 'anyof', this.pendingStatusIds], 'AND', ['isinactive', 'is', 'F']],
        columns: [
          { name: 'custrecord_ns_wms_pia_line_key', label: 'SO Line Key' },
          { name: 'custrecord_ns_wms_pia_picker', label: 'Picker' },
        ],
      });
      customrecord_nst_wms_v3_picker_assignmenSearchObj.run().each(function (result) {
        let pickerId = result.getValue({ name: 'custrecord_ns_wms_pia_picker' });
        pickers[pickerId].baseAssignedItems += 1;
        lineUniqueKeys.push(parseFloat(result.getValue({ name: 'custrecord_ns_wms_pia_line_key' })));
        return true;
      });

      return { lineUniqueKeys, pickers };
    },

    get_assignment_history: function () {
      let history = [];

      var assignmentSearch = search.create({
        type: 'customrecord_nst_wms_v3_picker_assignmen',
        filters: [['custrecord_ns_wms_pia_status', 'anyof', this.pendingStatusIds], 'AND', ['isinactive', 'is', 'F']],
        columns: [
          search.createColumn({ name: 'internalid', sort: search.Sort.DESC }), // for sorting
          search.createColumn({ name: 'name', label: 'ID' }),
          search.createColumn({ name: 'custrecord_ns_wms_pia_parent_rec', label: 'Assignment Header Link' }),
          search.createColumn({ name: 'custrecord_ns_wms_pia_sales_order', label: 'Sales Order' }),
          search.createColumn({ name: 'custrecord_ns_wms_pia_item', label: 'Item' }),
          search.createColumn({ name: 'custrecord_ns_wms_pia_picker', label: 'Assigned Picker' }),
          search.createColumn({ name: 'custrecord_ns_wms_pia_assigned_by', label: 'Assigned By' }),
          search.createColumn({ name: 'custrecord_ns_wms_pia_assign_type', label: 'Assignment Type' }),
          search.createColumn({ name: 'custrecord_ns_wms_pia_qty', label: 'Assigned Quantity' }),
        ],
      });

      var pagedData = assignmentSearch.runPaged({ pageSize: 100 });
      var page = pagedData.count > 0 ? pagedData.fetch({ index: 0 }) : null;

      if (page) {
        page.data.forEach(function (result) {
          history.push({
            assignmentId: result.getValue({ name: 'name' }),
            assignmentHeaderLink: result.getText({ name: 'custrecord_ns_wms_pia_parent_rec' }),
            salesOrder: result.getText({ name: 'custrecord_ns_wms_pia_sales_order' }),
            item: result.getText({ name: 'custrecord_ns_wms_pia_item' }),
            picker: result.getText({ name: 'custrecord_ns_wms_pia_picker' }),
            assignedBy: result.getText({ name: 'custrecord_ns_wms_pia_assigned_by' }),
            assignType: result.getText({ name: 'custrecord_ns_wms_pia_assign_type' }),
            qty: result.getValue({ name: 'custrecord_ns_wms_pia_qty' }),
          });
        });
      }

      return history;
    },

    assign_items_to_pickers: function () {
      let assignments = this.body['assignments'] || [];
      let empId = this.body['empId'];

      if (!empId) {
        return { error: 'Employee ID is required' };
      }

      this.log('Assigning items to pickers', { empId: empId, assignments: assignments });

      assignments.forEach((order) => {
        this.create_update_assignment_record(order, empId);
      });

      return { success: true, message: 'Items assigned to pickers successfully' };
    },

    create_update_assignment_record: function (orderObj, empId) {
      let assignmentId = orderObj['assignmentId'];
      let items = orderObj['items'];
      let assignmentRecord;

      if (assignmentId) {
        assignmentRecord = record.load({
          type: this.headerRecordType,
          id: assignmentId,
          isDynamic: true,
        });
      } else {
        assignmentRecord = record.create({
          type: this.headerRecordType,
          isDynamic: true,
        });
        assignmentRecord.setValue({ fieldId: 'custrecord_ns_wms_soah_sales_order', value: orderObj['id'] });
        assignmentRecord.setValue({ fieldId: 'custrecord_ns_wms_soah_customer', value: orderObj['customerId'] });
        assignmentRecord.setValue({ fieldId: 'custrecord_ns_wms_soah_no_of_items', value: orderObj['no_of_items'] });
        assignmentRecord.setValue({ fieldId: 'custrecord_ns_wms_soah_total_qty', value: orderObj['totalQty'] });
      }

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
            value: 2,
          });

          assignmentRecord.commitLine({ sublistId: this.lineRecordType });
        }
      });

      return assignmentRecord.save();
    },

    log: function (title, details) {
      log.debug({ title: title, details: JSON.stringify(details) });
    },
  };

  return { onRequest: AssignDashboard.onRequest.bind(AssignDashboard) };
});
