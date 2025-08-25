/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/search', 'N/file', 'N/record', '../NSWMS V3 Globals/utility_module'], /**
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
    if (scriptContext.request.method === 'GET') {
      var params = scriptContext.request.parameters;
      var response = {};
      if (params['ref'] == 'getSetUpData') {
        response['setUpData'] = utility.getSetUpRecordData(params['setUpId']);
        response['locationObj'] = utility.fieldLookUp('location', params['locationId'], ['name']);
      } else if (params['ref'] == 'getOrderData') {
        response = getOrderData(params);
      } else if (params['ref'] == 'itemData') {
        response = getItemData(params['setUpData'], params['scannedItem'], params['locationId'], true);
      }
      scriptContext.response.write(JSON.stringify(response));
    } else {
      var params = scriptContext.request.parameters;
      var body = JSON.parse(scriptContext.request.body);
      var response = {};
      if (params['ref'] == 'createBackup') {
        log.debug('body', body);
        response = utility.createBackupRecord(body, 'shiporder');
      } else if (params['ref'] == 'apprCmpltBackup') {
        try {
          response = createFullfillmentRecord(body.recId, body.status);
        } catch (e) {
          response['status'] = 'failure';
          response['message'] = e;
          log.debug('error in createFullfillmentRecord', e);
        }
      }
      log.debug('response', response);

      scriptContext.response.setHeader({
        name: 'Content-Type',
        value: 'application/json',
      });

      scriptContext.response.write(JSON.stringify(response));
    }

    function getOrderData(body) {
      var scannedOrder = body['scannedOrder'];
      var locationId = body['locationId'];
      var setUpData = JSON.parse(body['setUpData']);
      var isLineNumberAvl = false;
      log.debug('setUpData::', JSON.stringify(setUpData));
      var columnsary = [
        search.createColumn({ name: 'item' }),
        search.createColumn({ name: 'unitstype', join: 'item' }),
        search.createColumn({ name: 'unit' }),

        search.createColumn({
          name: 'entity',
        }),
        search.createColumn({
          name: 'specialorder',
          label: 'Special Order',
        }),
        // search.createColumn({
        //   name: "custbody_msi_trans_created_by",
        //   label: "createdBy",
        // }),
        search.createColumn({
          name: 'salesrep',
          label: 'createdBy',
        }),
        search.createColumn({
          name: 'custcol_nst_wms_nestcoreid',
        }),
        search.createColumn({
          name: 'formulatext',
          formula:
            'NVL({quantity}-NVL({quantity}-NVL({quantitycommitted},0)-NVL({quantityshiprecv},0),0),0)-NVL({quantitypicked},0)',
        }),
        search.createColumn({
          name: 'formulanumeric',
          formula: '{quantity}-{quantitypicked}',
          label: 'Formula (Numeric)',
        }),
        search.createColumn({
          name: 'type',
          join: 'item',
        }),

        search.createColumn({ name: 'tranid' }),
        search.createColumn({ name: 'location' }),
      ];

      if (setUpData['useUpc'] == true) {
        columnsary.push(
          search.createColumn({
            name: 'upccode',
            join: 'item',
          }),
        );
      }
      if (setUpData['useBins'] == true) {
        columnsary.push(
          search.createColumn({
            name: 'usebins',
            join: 'item',
          }),
        );
      }
      if (setUpData['useSerial'] == true) {
        columnsary.push(
          search.createColumn({
            name: 'isserialitem',
            join: 'item',
          }),
        );
      }
      if (setUpData['useLot'] == true) {
        columnsary.push(
          search.createColumn({
            name: 'islotitem',
            join: 'item',
          }),
        );
      }

      var orderObj = {
        orderId: '',
        orderText: '',
        customer: '',
        createdBy: '',
        salesRep: '',
        customerText: '',
        items: [],
        itemDescription: {},
        itemLocations: [],
        backUpRecId: '',
        backUpRecData: '',
      };
      var transactionSearchObj = search.create({
        type: 'transaction',
        filters: [
          ['mainline', 'is', 'F'],
          'AND',
          ['numbertext', 'is', scannedOrder],
          'AND',
          ['shipping', 'is', 'F'],
          'AND',
          ['taxline', 'is', 'F'],
          'AND',
          ['cogs', 'is', 'F'],
          'AND',
          ['status', 'anyof', 'SalesOrd:D', 'SalesOrd:E', 'SalesOrd:B'],
          'AND',
          ['transactionlinetype', 'anyof', '@NONE@'],

          'AND',

          [
            [
              ['item.type', 'anyof', 'InvtPart', 'Kit', 'Assembly'],
              'AND',
              [
                'formulanumeric: NVL({quantity}-NVL({quantity}-NVL({quantitycommitted},0)-NVL({quantityshiprecv},0),0),0)-NVL({quantitypicked},0)',
                'greaterthan',
                '0',
              ],
            ],
            'OR',
            [
              ['item.type', 'anyof', 'NonInvtPart'],
              'AND',
              ['formulanumeric: NVL({quantity},0)-NVL({quantitypicked},0)', 'greaterthan', '0'],
            ],
          ],
        ],
        columns: columnsary,
      });
      var searchResultCount = transactionSearchObj.runPaged().count;
      log.debug('searchResultCount', searchResultCount);

      if (searchResultCount > parseFloat(0)) {
        transactionSearchObj.run().each(function (result) {
          if (!orderObj.customer) {
            orderObj.customer = result.getValue({
              name: 'entity',
            });
          }

          if (!orderObj.salesRep) {
            orderObj.salesRep = result.getText({
              name: 'salesrep',
            });
          }
          if (!orderObj.customerText) {
            orderObj.customerText = result.getText({
              name: 'entity',
            });
          }
          if (!orderObj.orderId) {
            orderObj.orderId = result.id;
            if (orderObj.orderId) {
              var soRecObj = record.load({
                type: 'salesorder',
                id: orderObj.orderId,
                isDynamic: true,
              });
              var lineCount = soRecObj.getLineCount({ sublistId: 'item' });
              for (var i = 0; i < lineCount; i++) {
                orderObj.itemDescription[
                  soRecObj.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_nst_wms_nestcoreid',
                    line: i,
                  })
                ] = soRecObj.getSublistValue({
                  sublistId: 'item',
                  fieldId: 'description',
                  line: i,
                });
              }
            }
          }
          if (!orderObj.orderText) {
            orderObj.orderText = result.getValue({
              name: 'tranid',
            });
          }
          var itemObj = {};
          itemObj['itemID'] = result.getValue({ name: 'item' });
          itemObj['itemName'] = result.getText({ name: 'item' });
          itemObj['orderdUom'] = result.getValue({ name: 'unit' });

          itemObj['type'] = result.getValue({ name: 'type', join: 'item' });
          itemObj['units'] = result.getText({ name: 'unitstype', join: 'item' });

          itemObj['lineNo'] = result.getValue({
            name: 'custcol_nst_wms_nestcoreid',
          });
          itemObj['description'] = orderObj.itemDescription[itemObj['lineNo']];

          itemObj['locationName'] = result.getText({ name: 'location' });
          itemObj['specialOrderId'] = result.getValue({ name: 'specialorder' });
          if (itemObj['specialOrderId'].length) {
            var supplier = utility.fieldLookUp('purchaseorder', itemObj['specialOrderId'], ['entity']);
            itemObj['supplier'] = supplier.entity[0].text;
            itemObj['specialOrder'] = result.getText({ name: 'specialorder' }).replace(/.*#/, '').trim();
          }
          if (itemObj['type'] == 'NonInvtPart') {
            itemObj['quantity'] = result.getValue({
              name: 'formulanumeric',
              formula: '{quantity}-{quantitypicked}',
              label: 'Formula (Numeric)',
            });
          } else {
            itemObj['quantity'] = result.getValue({
              name: 'formulatext',
              formula:
                'NVL({quantity}-NVL({quantity}-NVL({quantitycommitted},0)-NVL({quantityshiprecv},0),0),0)-NVL({quantitypicked},0)',
            });
          }
          if (itemObj['type'] == 'Kit') {
          }
          itemObj['pickQty'] = 0;
          if (itemObj['lineNo']) {
            isLineNumberAvl = true;
          } else {
            isLineNumberAvl = false;
          }
          orderObj.lineNumber = isLineNumberAvl;
          itemObj['configuredItems'] = [];
          itemObj['kitConfiguredItems'] = {};
          if (setUpData['useUpc'] == true) {
            itemObj['upc'] = result.getValue({ name: 'upccode', join: 'item' });
          } else {
            itemObj['upc'] = false;
          }
          if (setUpData['useBins'] == true) {
            itemObj['isBinItem'] = result.getValue({
              name: 'usebins',
              join: 'item',
            });
          } else {
            itemObj['isBinItem'] = false;
          }
          if (setUpData['useSerial'] == true) {
            itemObj['isSerialItem'] = result.getValue({
              name: 'isserialitem',
              join: 'item',
            });
          } else {
            itemObj['isSerialItem'] = false;
          }
          if (setUpData['useLot'] == true) {
            itemObj['isLotItem'] = result.getValue({
              name: 'islotitem',
              join: 'item',
            });
          } else {
            itemObj['isLotItem'] = false;
          }
          itemObj['invBalance'] = utility.getInventoryBalanceByLocation(
            setUpData,
            itemObj['itemID'],
            locationId,
            itemObj['isSerialItem'],
          );

          orderObj.items.push(itemObj);

          return true;
        });
        orderObj.status = 'Success';
        orderObj.message = '';
      } else {
        orderObj.status = 'Error';
        orderObj.message = 'No Match Found';
      }
      orderObj['itemLocations'] = orderObj['itemLocations'].filter((obj, index, arr) => {
        return arr.findIndex((t) => t.id === obj.id) === index;
      });
      return orderObj;
    }

    function createFullfillmentRecord(backUpRecId, status, binTransfer) {
      var kititemObj;
      var dataObj = utility.getBackUpRecordData(backUpRecId);

      const data = dataObj.Items;
      log.debug('DATA',data);
      const kits = {};
      const finalArray = [];

      data.forEach((item) => {
        log.debug('kitid',item.kitId);
        if (item.kitId) {
          if (!kits[item.kitId]) {
            kits[item.kitId] = {
              isKit: true,
              itemID: item.kitId,
              //lineNO: item.kitId,
              AdjQty: item.kitQty,
              keykitmembers: [item],
            };
          } else {
            kits[item.kitId].keykitmembers.push(item);
          }
        } else {
          finalArray.push(item);
        }
      });

      const groupedKitArray = Object.values(kits);
      var items = [...finalArray, ...groupedKitArray];

      var itemTypes = dataObj.itemTypes;
      log.debug('itemTypes', itemTypes);

      var wmsuser = dataObj.wmsuser;
      var tranRecObj = record.transform({
        fromType: 'salesorder',
        fromId: dataObj.soId,
        toType: 'itemfulfillment',
        isDynamic: false,
      });

      tranRecObj.setValue({ fieldId: 'customform', value: 40 });
      if (status == true || status == 'true') {
        tranRecObj.setValue({ fieldId: 'shipstatus', value: 'A' });
      } else {
        tranRecObj.setValue({ fieldId: 'shipstatus', value: 'A' });
      }
      tranRecObj.setValue({
        fieldId: 'custbody_nst_wms_trans_created_by',
        value: wmsuser,
      });
      if (binTransfer) {
        tranRecObj.setValue({
          fieldId: 'custbody_nst_wms_v3_related_bin_trans',
          value: binTransfer,
        });
      }
      var existingLines = tranRecObj.getLineCount({
        sublistId: 'item',
      });
      for (var i = 0; i < existingLines; i++) {
        tranRecObj.setSublistValue({
          sublistId: 'item',
          fieldId: 'itemreceive',
          line: i,
          value: false,
        });
      }
      for (var i = 0; i < items.length; i++) {
        var itemObj = items[i];
        log.debug('itemObj', JSON.stringify(itemObj));
        log.debug('itemlineNO',items[i].lineNO);

        var isBin = itemObj.isBin;
        var isLot = itemObj.isLot;
        var isSer = itemObj.isSer;
        var itemId = itemObj.itemId;
        var adjQty = itemObj.AdjQty;
        adjQty = parseFloat(adjQty);
        var invDetail = itemObj.InvDetail;
        log.debug('invDetail',invDetail);
        var lineNumber = tranRecObj.findSublistLineWithValue({
          sublistId: 'item',
          fieldId: 'custcol_nst_wms_nestcoreid',
          value: items[i].lineNO,
        });
        log.debug('lineNumber', lineNumber);

        if (lineNumber >= -1) {
          tranRecObj.setSublistValue({
            sublistId: 'item',
            fieldId: 'itemreceive',
            line: lineNumber,
            value: true,
          });
          tranRecObj.setSublistValue({
            sublistId: 'item',
            fieldId: 'quantity',
            line: lineNumber,
            value: adjQty,
          });
          if (itemObj.isKit) {
            let kitItemArray = itemObj.keykitmembers;
            log.debug('kitItemArray', kitItemArray);
            for (let k = 0; k < kitItemArray.length; k++) {
              var componentObj = kitItemArray[k];
              log.debug('componentObj', JSON.stringify(componentObj));
              if (itemTypes[componentObj.itemId] == 'NonInvtPart') {
                log.debug('noninv item' + componentObj.itemId, itemTypes[componentObj.itemId]);
                continue;
              }
              let invDetail = componentObj.InvDetail;
              for (let kitLines = 0; kitLines < kitItemArray.length; kitLines++) {
                var currentItem = tranRecObj.getSublistValue({
                  sublistId: 'item',
                  fieldId: 'item',
                  line: parseFloat(lineNumber) + kitLines + 1,
                });
                log.debug('component item', currentItem);
                if (currentItem == componentObj.itemId) {
                  log.debug(
                    'currentItem',
                    currentItem +
                      '---' +
                      tranRecObj.getSublistText({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: parseFloat(lineNumber) + kitLines + 1,
                      }),
                  );
                  tranRecObj.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: parseFloat(lineNumber) + kitLines + 1,
                    value: componentObj.AdjQty,
                  });

                  if (componentObj.isBin || componentObj.isLot || componentObj.isSer) {
                    var subRecordObj = tranRecObj.getSublistSubrecord({
                      sublistId: 'item',
                      fieldId: 'inventorydetail',
                      line: parseFloat(lineNumber) + kitLines + 1,
                    });
                    var subRecordLineCount = subRecordObj.getLineCount({
                      sublistId: 'inventoryassignment',
                    });
                    for (var u = subRecordLineCount - 1; u >= 0; u--) {
                      subRecordObj.removeLine({
                        sublistId: 'inventoryassignment',
                        line: u,
                      });
                    }
                    if (invDetail && invDetail.length) {
                      for (var j = 0; j < invDetail.length; j++) {
                        var invDetailObj = invDetail[j];
                        var invStatus = invDetailObj.selectedStatusText;
                        var invStatusId = invDetailObj.selectedStatus;
                        var lineQty = invDetailObj.qty;
                        var lotNo = invDetailObj.lotNO;
                        var serNo = invDetailObj.serialNO;
                        var binNo = invDetailObj.binNO;
                        lineQty = parseFloat(lineQty);

                        log.debug('invDetailObj', JSON.stringify(invDetailObj));
                        if (componentObj.isLot) {
                          subRecordObj.setSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'receiptinventorynumber',
                            line: j,
                            value: lotNo,
                            ignoreFieldChange: false,
                          });
                        }
                        if (componentObj.isSer) {
                          subRecordObj.setSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'receiptinventorynumber',
                            line: j,
                            value: serNo,
                            ignoreFieldChange: false,
                          });
                        }
                        if (componentObj.isBin) {
                          subRecordObj.setSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'binnumber',
                            line: j,
                            value: binNo,
                            ignoreFieldChange: false,
                          });
                        }
                        if (invStatusId) {
                          subRecordObj.setSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'inventorystatus',
                            line: j,
                            value: invStatusId,
                            ignoreFieldChange: false,
                          });
                        }
                        subRecordObj.setSublistValue({
                          sublistId: 'inventoryassignment',
                          fieldId: 'quantity',
                          line: j,
                          value: lineQty,
                          ignoreFieldChange: false,
                        });
                      }
                    }
                  }
                }
              }
            }
          } else {
            if (isBin || isLot || isSer) {
              var subRecordObj = tranRecObj.getSublistSubrecord({
                sublistId: 'item',
                fieldId: 'inventorydetail',
                line: lineNumber,
              });
              var subRecordLineCount = subRecordObj.getLineCount({
                sublistId: 'inventoryassignment',
              });
              for (var u = subRecordLineCount - 1; u >= 0; u--) {
                subRecordObj.removeLine({
                  sublistId: 'inventoryassignment',
                  line: u,
                });
              }
              if (invDetail && invDetail.length) {
                for (var j = 0; j < invDetail.length; j++) {
                  var invDetailObj = invDetail[j];
                  var invStatus = invDetailObj.selectedStatusText;
                  var invStatusId = invDetailObj.selectedStatus;
                  var lineQty = invDetailObj.qty;
                  var lotNo = invDetailObj.lotNO;
                  var serNo = invDetailObj.serialNO;
                  var binNo = invDetailObj.binNO;
                  lineQty = parseFloat(lineQty);

                  log.debug('invDetailObj', JSON.stringify(invDetailObj));
                  if (isLot) {
                    subRecordObj.setSublistValue({
                      sublistId: 'inventoryassignment',
                      fieldId: 'receiptinventorynumber',
                      line: j,
                      value: lotNo,
                      ignoreFieldChange: false,
                    });
                  }
                  if (isSer) {
                    subRecordObj.setSublistValue({
                      sublistId: 'inventoryassignment',
                      fieldId: 'receiptinventorynumber',
                      line: j,
                      value: serNo,
                      ignoreFieldChange: false,
                    });
                  }
                  if (isBin) {
                    log.debug('isBin', isBin + '--' + binNo);
                    subRecordObj.setSublistValue({
                      sublistId: 'inventoryassignment',
                      fieldId: 'binnumber',
                      line: j,
                      value: binNo,
                      ignoreFieldChange: false,
                    });
                    log.debug('binnum', binNo);
                  }
                  if (invStatusId) {
                    log.debug('invStatusId', invStatusId);
                    subRecordObj.setSublistValue({
                      sublistId: 'inventoryassignment',
                      fieldId: 'inventorystatus',
                      line: j,
                      value: invStatusId,
                      ignoreFieldChange: false,
                    });
                  }
                  subRecordObj.setSublistValue({
                    sublistId: 'inventoryassignment',
                    fieldId: 'quantity',
                    line: j,
                    value: lineQty,
                    ignoreFieldChange: false,
                  });
                  log.debug('lineQty', lineQty);
                }
              }
            }
          }
        }
        log.debug('Processed item::', JSON.stringify(itemObj));
      }

      var tranRecObjId = tranRecObj.save({
        enableSourcing: false,
        ignoreMandatoryFields: true,
      });

      var response = {};
      response['tranId'] = tranRecObjId;
      var tranlookUp = utility.fieldLookUp('itemfulfillment', tranRecObjId, ['tranid']);
      response['tranIdText'] = tranlookUp.tranid;
      record.submitFields({
        type: 'customrecord_nst_wms_v3_br_rec',
        id: backUpRecId,
        values: {
          custrecord_ns_wms_v3_ref_transaction: response.tranId,
        },
      });
      log.debug('response of fulfilment record', JSON.stringify(response));
      return response;
    }
    function getItemData(setUpData, scannedItem, locationId, inventoryAdjustment) {
      var setUpData = JSON.parse(setUpData);

      var filtersary = [['name', 'is', scannedItem], 'OR', ['internalid', 'anyof', scannedItem]];
      filtersary.push('AND'), filtersary.push(['isinactive', 'is', 'F']);

      if (!inventoryAdjustment) {
        filtersary.push('AND'), filtersary.push(['locationquantityonhand', 'greaterthan', '0']);
      }

      var columnsary = [
        search.createColumn({ name: 'itemid' }),
        search.createColumn({ name: 'unitstype' }),
        search.createColumn({ name: 'stockunit' }),
        search.createColumn({ name: 'locationquantityonhand' }),
        search.createColumn({ name: 'locationquantityavailable' }),
        search.createColumn({ name: 'quantitycommitted' }),
        search.createColumn({ name: 'salesdescription' }),
        search.createColumn({ name: 'baseprice' }),
        search.createColumn({ name: 'displayname' }),
        search.createColumn({ name: 'custitem_nst_wms_lookup_uploaded_image' }),
        search.createColumn({ name: 'type' }),
      ];

      if (setUpData['useUpc'] == true) {
        columnsary.push(
          search.createColumn({
            name: 'upccode',
          }),
        );
      }
      if (setUpData['useBins'] == true) {
        columnsary.push(
          search.createColumn({
            name: 'usebins',
          }),
        );
      }
      if (setUpData['useSerial'] == true) {
        columnsary.push(
          search.createColumn({
            name: 'isserialitem',
          }),
        );
      }
      if (setUpData['useLot'] == true) {
        columnsary.push(
          search.createColumn({
            name: 'islotitem',
          }),
        );
      }

      var itemDataSearch = search.create({
        type: 'item',
        filters: filtersary,
        columns: columnsary,
      });

      var itemDataCount = itemDataSearch.runPaged().count;
      if (itemDataCount <= 0) {
        return { status: 'failure', message: 'Item not found!!.' };
      }

      var itemObj = { status: 'success' };
      itemDataSearch.run().each(function (result) {
        itemObj['itemID'] = result.id;
        itemObj['itemName'] = result.getValue({ name: 'itemid' });
        itemObj['units'] = result.getText({ name: 'unitstype' });
        itemObj['stockUnit'] = result.getText({ name: 'stockunit' });
        itemObj['onHand'] = result.getValue({ name: 'locationquantityonhand' });
        itemObj['available'] = result.getValue({
          name: 'locationquantityavailable',
        });
        itemObj['itemDesc'] = result.getValue({ name: 'salesdescription' });
        itemObj['basePrice'] = result.getValue({ name: 'baseprice' });
        itemObj['displayName'] = result.getValue({ name: 'displayname' });
        itemObj['committed'] = result.getValue({ name: 'quantitycommitted' });
        itemObj['type'] = result.recordType;
        if (itemObj['type'] == 'kititem') {
          itemObj.kitMemberArr = utility.getKitItemMembers(itemObj['itemID'], setUpData, locationId);
        }

        var fileId = result.getValue({
          name: 'custitem_nst_wms_lookup_uploaded_image',
        });
        if (fileId) {
          itemObj['image'] = utility.getFileUrl(fileId);
        } else {
          itemObj['image'] =
            'https://st4.depositphotos.com/14953852/22772/v/450/depositphotos_227725052-stock-illustration-image-available-icon-flat-vector.jpg';
        }
        if (setUpData['useUpc'] == true) {
          itemObj['upc'] = result.getValue({ name: 'upccode' });
        } else {
          itemObj['upc'] = false;
        }
        if (setUpData['useBins'] == true) {
          itemObj['isBinItem'] = result.getValue({ name: 'usebins' });
        } else {
          itemObj['isBinItem'] = false;
        }
        if (setUpData['useSerial'] == true) {
          itemObj['isSerialItem'] = result.getValue({ name: 'isserialitem' });
        } else {
          itemObj['isSerialItem'] = false;
        }
        if (setUpData['useLot'] == true) {
          itemObj['isLotItem'] = result.getValue({ name: 'islotitem' });
        } else {
          itemObj['isLotItem'] = false;
        }
      });
      itemObj['invBalance'] = {};
      itemObj['invBalance'] = utility.getInventoryBalanceByLocation(
        setUpData,
        itemObj['itemID'],
        locationId,
        itemObj['isSerialItem'],
      );
      itemObj['preferdBins'] = utility.getItemWisePreferredBin(itemObj['itemID'], locationId);
      log.debug('locationId::', locationId);
      if (locationId) {
        itemObj['allBins'] = utility.getAllBinsByLocation(locationId);
        itemObj['allStatus'] = utility.getAllStatus();
      }
      log.debug('itemObj::', itemObj);
      return itemObj;
    }
  };
  return { onRequest };
});
