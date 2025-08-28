/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/search', 'N/file', 'N/record', 'N/format', '../NSWMS V3 Globals/utility_module'], (
  search,
  file,
  record,
  format,
  utility,
) => {
  /**
   * Defines the Suitelet script trigger point.
   * @param {Object} scriptContext
   * @param {ServerRequest} scriptContext.request - Incoming request
   * @param {ServerResponse} scriptContext.response - Suitelet response
   * @since 2015.2
   */
  const onRequest = (scriptContext) => {
    if (scriptContext.request.method === 'GET') {
      log.debug({
        title: 'packlistbe',
        details: 'triggered',
      });

      let params = scriptContext.request.parameters;
      log.debug({
        title: 'parameters',
        details: JSON.stringify(params),
      });

      let response = {};

      if (params['ref'] == 'getSetUpData') {
        response['setUpData'] = utility.getSetUpRecordData(params['setUpId']);
        response['locationObj'] = utility.fieldLookUp('location', params['locationId'], ['name']);
      }
      if (params['ref'] == 'getOrderDetails') {
        let pickedStatusIFs = getOrdersForDelivery();
        response['pickedStatusIFs'] = pickedStatusIFs;
      }

      scriptContext.response.write(JSON.stringify(response));
    } else {
      let params = scriptContext.request.parameters;
      let body = JSON.parse(scriptContext.request.body);
      let response = {};

      console.log(JSON.stringify(response));
      scriptContext.response.write(JSON.stringify(response));
    }
    function getOrdersForDelivery() {
      let ordersList = [];
      try {
        var customrecord_nst_wms_v3_picker_assignmenSearchObj = search.create({
          type: 'customrecord_nst_wms_v3_picker_assignmen',
          filters: [['isinactive', 'is', 'F'], 'AND', ['custrecord_ns_wms_pia_status', 'noneof', '4', '5']],
          columns: [
            search.createColumn({
              name: 'custrecord_ns_wms_pia_status',
              label: 'Status',
            }),
            search.createColumn({
              name: 'custrecord_ns_wms_pia_picker',
              label: 'Assigned Picker',
            }),
            search.createColumn({
              name: 'custrecord_ns_wms_pia_item',
              label: 'Item',
            }),
            search.createColumn({
              name: 'custrecord_ns_wms_pia_stage_out_bin',
              label: 'Stage Out Bin',
            }),
            search.createColumn({
              name: 'custrecord_ns_wms_pia_parent_rec',
              label: 'Assignment Header Link',
            }),
            search.createColumn({ name: 'name', label: 'ID' }),
            search.createColumn({
              name: 'custrecord_ns_wms_pia_sales_order',
              label: 'Sales Order',
            }),
            search.createColumn({
              name: 'custrecord_ns_wms_pia_fulfill_ref',
              label: 'Item Fulfillment',
            }),
            search.createColumn({
              name: 'custrecord_ns_wms_pia_picked_qty',
              label: 'Picked Quantity',
            }),
            search.createColumn({
              name: 'custrecord_ns_wms_soah_customer',
              join: 'CUSTRECORD_NS_WMS_PIA_PARENT_REC',
              label: 'Customer',
            }),
          ],
        });
        var searchResultCount = customrecord_nst_wms_v3_picker_assignmenSearchObj.runPaged().count;
        log.debug('customrecord_nst_wms_v3_picker_assignmenSearchObj result count', searchResultCount);
        customrecord_nst_wms_v3_picker_assignmenSearchObj.run().each(function (result) {
          var orderObj = {};
          orderObj.salesOrder = result.getText({
            name: 'custrecord_ns_wms_pia_sales_order',
            label: 'Sales Order',
          });
          orderObj.salesOrderId = result.getValue({
            name: 'custrecord_ns_wms_pia_sales_order',
            label: 'Sales Order',
          });
          orderObj.customer = result.getText({
            name: 'custrecord_ns_wms_soah_customer',
            join: 'CUSTRECORD_NS_WMS_PIA_PARENT_REC',
            label: 'Customer',
          });
          orderObj.itemFulfillment = result.getText({
            name: 'custrecord_ns_wms_pia_fulfill_ref',
            label: 'Item Fulfillment',
          });
          orderObj.itemName = result.getText({
            name: 'custrecord_ns_wms_pia_item',
            label: 'Item',
          });
          orderObj.itemId = result.getValue({
            name: 'custrecord_ns_wms_pia_item',
            label: 'Item',
          });
          orderObj.status = result.getText({
            name: 'custrecord_ns_wms_pia_status',
            label: 'Status',
          });
          orderObj.assignedPicker = result.getText({
            name: 'custrecord_ns_wms_pia_picker',
            label: 'Assigned Picker',
          });
          orderObj.stageOutBin = result.getText({
            name: 'custrecord_ns_wms_pia_stage_out_bin',
            label: 'Stage Out Bin',
          });
          orderObj.assignmentLink = result.getValue({
            name: 'custrecord_ns_wms_pia_parent_rec',
            label: 'Assignment Header Link',
          });
          ordersList.push(orderObj);
          return true;
        });
        log.debug('OrdersList', ordersList);
        const grouped = Object.values(
          ordersList.reduce((acc, curr) => {
            const { salesOrder, salesOrderId, customer, assignmentLink, ...item } = curr;

            if (!acc[salesOrder]) {
              acc[salesOrder] = {
                salesOrder,
                salesOrderId,
                customer,
                assignmentLink,
                items: [],
              };
            }

            acc[salesOrder].items.push(item);

            return acc;
          }, {}),
        ).map((order) => {
          const statuses = order.items.map((i) => i.status);
          let status;
          if (statuses.every((s) => s === 'Staged')) {
            status = 'Completed';
          } else if (statuses.every((s) => s === 'Pending')) {
            status = 'Pending';
          } else {
            status = 'InProgress';
          }
          return {
            ...order,
            status,
          };
        });
        log.debug('grouped', grouped);
        return grouped;
      } catch (e) {
        log.error('error in getOrdersForDelivery ', e);
        var response = { status: 'error', message: e.message };
        return response;
      }
    }
  };
  return {
    onRequest: onRequest,
  };
});
