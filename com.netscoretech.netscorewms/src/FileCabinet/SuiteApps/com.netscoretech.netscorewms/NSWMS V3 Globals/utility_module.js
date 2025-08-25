/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/search', 'N/url', 'N/record', 'N/runtime', 'N/https'], function (search, url, record, runtime, https) {
  function getSetUpRecordData(setUpRecID) {
    var setupData = {},
      filters = [],
      columns = [
        search.createColumn({
          name: 'custrecord_ns_wms_users',
        }),
        search.createColumn({
          name: 'custrecord_ns_wms_subsidiary',
        }),
        search.createColumn({
          name: 'custrecord_ns_wms_location',
        }),
        search.createColumn({
          name: 'custrecord_ns_wms_use_bin',
        }),
        search.createColumn({
          name: 'custrecord_ns_wms_serial_item',
        }),
        search.createColumn({
          name: 'custrecord_ns_wms_lot_items',
        }),
        search.createColumn({
          name: 'custrecord_ns_wms_use_upc',
        }),
        search.createColumn({
          name: 'custrecord_ns_wms_use_inv_status',
        }),
        search.createColumn({
          name: 'custrecord_ns_wms_preferred_bin',
        }),
        search.createColumn({
          name: 'custrecord_ns_wms_default_acccount',
        }),
        search.createColumn({
          name: 'custrecord_ns_wms_create_adj_on_approval',
        }),
        search.createColumn({
          name: 'custrecord_ns_wms_stage_bin',
        }),
        search.createColumn({
          name: 'custrecord_ns_wms_use_add_package',
        }),
      ];
    filters.push(['isinactive', 'is', 'F']);
    if (setUpRecID) {
      filters.push('AND');
      filters.push(['internalid', 'anyof', setUpRecID]);
    }

    var customrecord_nst_wms_v3_setupSearchObj = search.create({
      type: 'customrecord_nst_wms_v3_setup',
      filters: filters,
      columns: columns,
    });
    customrecord_nst_wms_v3_setupSearchObj.run().each(function (result) {
      setupData['users'] = result.getValue({
        name: 'custrecord_ns_wms_users',
      });
      setupData['subsidiary'] = result.getValue({
        name: 'custrecord_ns_wms_subsidiary',
      });
      setupData['location'] = result.getValue({
        name: 'custrecord_ns_wms_location',
      });
      setupData['useBins'] = result.getValue({
        name: 'custrecord_ns_wms_use_bin',
      });
      setupData['useSerial'] = result.getValue({
        name: 'custrecord_ns_wms_serial_item',
      });
      setupData['useLot'] = result.getValue({
        name: 'custrecord_ns_wms_lot_items',
      });
      setupData['useUpc'] = result.getValue({
        name: 'custrecord_ns_wms_use_upc',
      });
      setupData['addPackage'] = result.getValue({
        name: 'custrecord_ns_wms_use_add_package',
      });
      setupData['useInvStatus'] = result.getValue({
        name: 'custrecord_ns_wms_use_inv_status',
      });
      setupData['useStageBins'] = result.getValue({
        name: 'custrecord_ns_wms_stage_bin',
      });
      setupData['usePrefBin'] = result.getValue({
        name: 'custrecord_ns_wms_preferred_bin',
      });
      setupData['defaultAccnt'] = result.getValue({
        name: 'custrecord_ns_wms_default_acccount',
      });
      setupData['defaultAccntText'] = result.getText({
        name: 'custrecord_ns_wms_default_acccount',
      });
      setupData['approvalForAdj'] = result.getValue({
        name: 'custrecord_ns_wms_create_adj_on_approval',
      });
      // setupData["assigned"] = result.getValue({
      //   name: "custrecordns_wms_assign_orders",
      // });
    });

    return setupData;
  }

  function searchRecords(recordType, filters, columns, resultFormat) {
    var mySearch = search.create({
      type: recordType,
      filters: filters,
      columns: columns,
    });
    var start = 0;
    var searchResult = resultFormat === 'object' ? {} : [];
    do {
      var batchResult = mySearch.run().getRange({
        start: start,
        end: start + 1000,
      });
      if (resultFormat === 'array') {
        for (var i = 0; i < batchResult.length; i++) {
          var obj = {};
          for (var j = 0; j < columns.length; j++) {
            obj[columns[j].label] = batchResult[i].getValue(columns[j]);
          }
          searchResult.push(obj);
        }
      } else if (resultFormat === 'object') {
        for (var i = 0; i < batchResult.length; i++) {
          var recordId = batchResult[i].id;
          if (!searchResult.hasOwnProperty(recordId)) {
            searchResult[recordId] = {};
          }
          for (var j = 0; j < columns.length; j++) {
            searchResult[recordId][columns[j].label] = batchResult[i].getValue(columns[j]);
          }
        }
      }
      start += 1000;
    } while (batchResult.length == 1000);
    return searchResult;
  }

  function getFilesInFolder(fileName, withDomain) {
    var urlObj = {},
      domain = 'https://';
    if (withDomain) {
      domain += url.resolveDomain({ hostType: url.HostType.APPLICATION });
    }

    var folderSearchObj = search.create({
      type: 'folder',
      filters: [['name', 'is', fileName]],
      columns: [
        search.createColumn({ name: 'name', join: 'file', label: 'Name' }),
        search.createColumn({ name: 'url', join: 'file', label: 'URL' }),
        search.createColumn({ name: 'filetype', join: 'file', label: 'Type' }),
      ],
    });

    folderSearchObj.run().each(function (result) {
      var fileName = result.getValue({
        name: 'name',
        join: 'file',
        label: 'Name',
      });

      if (withDomain) {
        urlObj[fileName] = domain + result.getValue({ name: 'url', join: 'file', label: 'URL' });
      } else {
        urlObj[fileName] = result.getValue({
          name: 'url',
          join: 'file',
          label: 'URL',
        });
      }

      return true;
    });

    return urlObj;
  }

  function createRecord(recordType, fields) {
    var newRecord = record.create({
      type: recordType,
      isDynamic: true,
    });
    for (var field in fields) {
      newRecord.setValue({
        fieldId: field,
        value: fields[field],
      });
    }
    var recordId = newRecord.save();
    return recordId;
  }

  function getCurrentUser() {
    var user = runtime.getCurrentUser();
    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  }

  function getFileUrl(fileId) {
    var url = '';
    var fileSearchObj = search.create({
      type: 'file',
      filters: [['internalid', 'anyof', fileId]],
      columns: [search.createColumn({ name: 'url', label: 'URL' })],
    });
    fileSearchObj.run().each(function (result) {
      url = result.getValue({ name: 'url', label: 'URL' });
    });

    return url;
  }

  function getScriptUrl(scriptId, deploymentId) {
    return url.resolveScript({
      scriptId: scriptId,
      deploymentId: deploymentId,
      returnExternalUrl: true,
    });
  }

  function validateCredentials(dataObj) {
    var filtersary = [],
      empObj = {},
      setupData = getSetUpRecordData();
    filtersary.push(['isinactive', 'is', 'F']);
    if (dataObj['withPin'] == false) {
      filtersary.push('AND');
      filtersary.push(['email', 'is', dataObj['username']]);
      filtersary.push('AND');
      filtersary.push(['custentity_nst_wms_ipad_password', 'is', dataObj['password']]);
    } else {
      var qpin = '';
      for (var pin in dataObj['otp']) {
        qpin += dataObj['otp'][pin];
      }
      filtersary.push('AND');
      filtersary.push(['custentity_nst_wms_pin', 'is', qpin]);
    }
    var employeeSearch = search.create({
      type: search.Type.EMPLOYEE,
      filters: filtersary,
      columns: [
        search.createColumn({
          name: 'entityid',
          sort: search.Sort.ASC,
          label: 'Name',
        }),
        search.createColumn({
          name: 'internalid',
          label: 'Internal ID',
        }),
      ],
    });

    var searchResultCount = employeeSearch.runPaged().count;

    employeeSearch.run().each(function (result) {
      empObj['empname'] = result.getValue({
        name: 'entityid',
        sort: search.Sort.ASC,
        label: 'Name',
      });

      empObj['empid'] = result.getValue({
        name: 'internalid',
        label: 'Internal ID',
      });
    });
    if (searchResultCount > 0) {
      var registeredUsers = setupData['users'];
      registeredUsers = registeredUsers.split(',');
      var validUser = registeredUsers.indexOf(empObj['empid']);
      if (validUser < 0) {
        empObj['status'] = 'failure';
      } else {
        empObj['status'] = 'success';
      }
    } else {
      empObj['status'] = 'invalid';
    }
    return empObj;
  }

  function getDashBoardData(dataObj) {
    var dashBoardData = {};
    dashBoardData['setUpData'] = getSetUpRecordData(dataObj['setUpId']);
    dashBoardData['empData'] = getEmployeData(dataObj['empId']);
    dashBoardData['locations'] = getLocationBySubsidiary(dashBoardData['setUpData']['subsidiary']);
    dashBoardData['licenseFeatures'] = getLicenseFeatures(dataObj['setUpId']);

    return dashBoardData;
  }

  function getLicenseFeatures() {
    var requestUrl = 'https://license.netscoretech.com/api/Account/GetLicenseDeatails';

    var headers = {
      Authorization: 'Basic TmV0U2NvcmVUZWNoOk4zdCRDMHIzVEUoSF9uXm4=',
      'Content-Type': 'application/json',
    };

    var bodyObj = {
      accountId: 'TSTDRV1381315',
      productCode: 'WMSS',
      licenseCode: 'Net-TWVtNjEzOjkvMjAvMjAyMzpXTUVF',
    };

    var response = https.post({
      url: requestUrl,
      body: JSON.stringify(bodyObj),
      headers: headers,
    });

    var licenseData = JSON.parse(response.body);
    // log.debug({
    //   title: "licenseData",
    //   details: JSON.stringify(licenseData),
    // });

    return licenseData;
  }

  function getLocationBySubsidiary(subsidiaryId, locationId) {
    var locations = [],
      filters = [['subsidiary', 'anyof', subsidiaryId], 'AND', ['isinactive', 'is', 'F']];
    if (locationId) {
      filters.push('AND');
      filters.push(['internalid', 'noneof', locationId]);
    }

    var locationSearchObj = search.create({
      type: 'location',
      filters: filters,
      columns: [
        search.createColumn({
          name: 'name',
          sort: search.Sort.ASC,
        }),
      ],
    });
    locationSearchObj.run().each(function (result) {
      var tempObj = {};
      tempObj['name'] = result.getValue({
        name: 'name',
        sort: search.Sort.ASC,
        label: 'Name',
      });
      tempObj['id'] = result.id;
      locations.push(tempObj);

      return true;
    });

    return locations;
  }

  function getEmployeData(empId) {
    var empData = {},
      empimage = '';
    var employeeSearchObj = search.create({
      type: 'employee',
      filters: [['internalid', 'anyof', empId], 'AND', ['isinactive', 'is', 'F']],
      columns: [
        search.createColumn({
          name: 'entityid',
        }),
        search.createColumn({
          name: 'custentity_nst_wms_emp_image',
        }),
        search.createColumn({
          name: 'custentity_nst_wms_v3_features',
        }),
      ],
    });
    employeeSearchObj.run().each(function (result) {
      empData['empName'] = result.getValue({
        name: 'entityid',
      });
      empData['empimage'] = result.getText({
        name: 'custentity_nst_wms_emp_image',
        sort: search.Sort.ASC,
      });
      empData['features'] = result.getText({
        name: 'custentity_nst_wms_v3_features',
      });

      if (empimage) {
        empData['empimage'] = 'https://system.na1.netsuite.com' + empimage;
      } else {
        empData['empimage'] =
          'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSteItzPyeDKBxyWiOA8xrPZXIlxOYv1b1VVg&usqp=CAU';
      }
    });

    return empData;
  }

  function getScreenUrls() {
    var urlsObj = {};
    var scripIds = {
      invLookUp: {
        scriptId: 'customscript_nst_wms_invlookup_page',
        deploymentId: 'customdeploy_nst_wms_invlookup_page',
      },
      invAdj: {
        scriptId: 'customscript_nst_wms_invadjustment_page',
        deploymentId: 'customdeploy_nst_wms_invadjustment_page',
      },
      Login: {
        scriptId: 'customscript_nst_wms_login_page',
        deploymentId: 'customdeploy_nst_wms_login_page',
      },
      pickList: {
        scriptId: 'customscript_nst_wms_picklist_page',
        deploymentId: 'customdeploy_nst_wms_picklist_page',
      },
      packList: {
        scriptId: 'customscript_nst_wms_packlist_page',
        deploymentId: 'customdeploy_nst_wms_packlist_page',
      },
      shiporder: {
        scriptId: 'customscript_nst_wms_shiporder_page',
        deploymentId: 'customdeploy_nst_wms_shiporder_page',
      },
      changepin: {
        scriptId: 'customscript_nst_wms_changepin_page',
        deploymentId: 'customdeploy_nst_wms_changepin_page',
      },
      receivelist: {
        scriptId: 'customscript_nst_wms_receivelist_page',
        deploymentId: 'customdeploy_nst_wms_receivelist_page',
      },
      receiveorder: {
        scriptId: 'customscript_nst_wms_receiveorder_page',
        deploymentId: 'customdeploy_nst_wms_receiveorder_page',
      },
      packorder: {
        scriptId: 'customscript_nst_wms_pack_shiporder_page',
        deploymentId: 'customdeploy_nst_wms_pack_shiporder_page',
      },
      binputaway: {
        scriptId: 'customscript_nst_wms_binputaway_page',
        deploymentId: 'customdeploy_nst_wms_binputaway_page',
      },
      bintransfer: {
        scriptId: 'customscript_nst_wms_bintransfer_page',
        deploymentId: 'customdeploy_nst_wms_bintransfer_page',
      },
      invtransfer: {
        scriptId: 'customscript_nst_wms_invtransfer_page',
        deploymentId: 'customdeploy_nst_wms_invtransfer_page',
      },
      receiverma: {
        scriptId: 'customscript_nst_wms_receiverma_page',
        deploymentId: 'customdeploy_nst_wms_receiverma_page',
      },
      createcountrecord: {
        scriptId: 'customscript_nst_wms_cntrecd_page',
        deploymentId: 'customdeploy_nst_wms_cntrecd_page',
      },
      receiveto: {
        scriptId: 'customscript_nst_wms_receiveto_page',
        deploymentId: 'customdeploy_nst_wms_receiveto',
      },
      invcountlist: {
        scriptId: 'customscript_nst_wms_invcountlist_page',
        deploymentId: 'customdeploy_nst_wms_invcountlist_page',
      },
      configurecountrecord: {
        scriptId: 'customscript_nst_wms_confgrcntrecd_page',
        deploymentId: 'customdeploy_nst_wms_confgrcntrecd_page',
      },
      inboundshipments: {
        scriptId: 'customscript_nst_wms_inboundspmts_page',
        deploymentId: 'customdeploy_nst_wms_inboundspmts_page',
      },
      cartputaway: {
        scriptId: 'customscript_nst_wms_cartputaway_page',
        deploymentId: 'customdeploy_nst_wms_cartputaway_page',
      },
    };

    for (var script in scripIds) {
      var scriptObj = scripIds[script];
      urlsObj[script] = getScriptUrl(scriptObj['scriptId'], scriptObj['deploymentId']);
    }
    return urlsObj;
  }

  function getFolderId(folderName) {
    var folderId;
    var folderSearchObj = search.create({
      type: 'folder',
      filters: [['name', 'is', folderName]],
    });

    folderSearchObj.run().each(function (result) {
      folderId = result.id;
    });

    return folderId;
  }
  function submitFields(recordType, recordId, filedsObj) {
    return record.submitFields({
      type: recordType,
      id: recordId,
      values: filedsObj,
    });
  }
  function fieldLookUp(type, id, fields) {
    var fieldLookUp = search.lookupFields({
      type: type,
      id: id,
      columns: fields,
    });

    return fieldLookUp;
  }
  function getItemData(setUpData, scannedItem, locationId, getBinsStatus, getStageBins) {
    var setUpData = JSON.parse(setUpData);
    var filtersary = [];
    filtersary.push(['name', 'is', scannedItem]);
    filtersary.push('AND'), filtersary.push(['isinactive', 'is', 'F']);
    filtersary.push('AND'), filtersary.push(['locationquantityonhand', 'greaterthan', '0']);
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
        itemObj.kitMemberArr = getKitItemMembers(itemObj['itemID'], setUpData, locationId);
      }

      var fileId = result.getValue({
        name: 'custitem_nst_wms_lookup_uploaded_image',
      });
      if (fileId) {
        itemObj['image'] = getFileUrl(fileId);
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
    itemObj['invBalance'] = getInventoryBalanceByLocation(setUpData, itemObj['itemID'], locationId);
    itemObj['preferdBins'] = getItemWisePreferredBin(itemObj['itemID'], locationId);
    /* if (getBinsStatus && locationId) {
      itemObj["allBins"] = getAllBinsByLocation(locationId);
      itemObj["allStatus"] = getAllStatus();
    } */
    if (getBinsStatus && locationId && setUpData['useBins'] == true) {
      itemObj['allBins'] = getAllBinsByLocation(locationId);
    }
    if (getBinsStatus && locationId && setUpData['useInvStatus'] == true) {
      itemObj['allStatus'] = getAllStatus();
    }
    if (getStageBins && locationId && setUpData['useStageBins']) {
      itemObj['stageBins'] = getStageBinsForLocation(locationId);
    }
    return itemObj;
  }

  function getInventoryBalanceByLocation(setUpData, itemId, locationId) {
    var locationData = {};
    var columns = [
      search.createColumn({ name: 'item' }),
      search.createColumn({ name: 'location' }),
      search.createColumn({ name: 'onhand' }),
      search.createColumn({ name: 'available' }),
    ];
    if (setUpData['useBins'] == true) {
      columns.push(
        search.createColumn({
          name: 'binnumber',
        }),
      );
    }
    if (setUpData['useSerial'] == true || setUpData['useLot'] == true) {
      columns.push(
        search.createColumn({
          name: 'inventorynumber',
        }),
      );
    }
    columns.push(
      search.createColumn({
        name: 'custitemnumber_itbs_receipt_date',
        join: 'inventoryNumber',
      }),
    );

    if (setUpData['useInvStatus'] == true) {
      columns.push(
        search.createColumn({
          name: 'status',
        }),
      );
    }
    var filters = [
      ['item', 'anyof', itemId],
      'AND',
      ['onhand', 'greaterthan', '0'],
      'AND',
      ['available', 'greaterthan', '0'],
    ];
    if (locationId) {
      filters.push('AND');
      filters.push(['location', 'anyof', locationId]);
    }

    var inventorybalanceSearchObj = search.create({
      type: 'inventorybalance',
      filters: filters,
      columns: columns,
    });
    inventorybalanceSearchObj.run().each(function (result) {
      var locationText = result.getValue({ name: 'location' });
      var onHand = result.getValue({ name: 'onhand' });
      var available = result.getValue({
        name: 'available',
        label: 'Available',
      });

      var location = result.getText({
        name: 'location',
        label: 'Location',
      });

      if (locationData[locationText] == undefined) {
        locationData[locationText] = {};
      }
      if (locationData[locationText]['locationId'] == undefined) {
        locationData[locationText]['locationId'] = location;
        locationData[locationText]['location'] = locationText;
      }

      if (locationData[locationText]['onHand'] == undefined) {
        locationData[locationText]['onHand'] = 0;
      }
      locationData[locationText]['onHand'] += Number(onHand);

      if (locationData[locationText]['available'] == undefined) {
        locationData[locationText]['available'] = 0;
      }
      locationData[locationText]['available'] += Number(available);

      if (locationData[locationText]['inventoryDetail'] == undefined) {
        locationData[locationText]['inventoryDetail'] = [];
      }
      var inventoryDetailObj = {};
      if (setUpData['useBins'] == true) {
        inventoryDetailObj['binNo'] = result.getValue({ name: 'binnumber' });
        inventoryDetailObj['binNoText'] = result.getText({
          name: 'binnumber',
        });
      }
      if (setUpData['useSerial'] == true || setUpData['useLot'] == true) {
        inventoryDetailObj['invNo'] = result.getValue({
          name: 'inventorynumber',
        });
        inventoryDetailObj['invNoText'] = result.getText({
          name: 'inventorynumber',
        });
      }
      if (setUpData['useInvStatus'] == true) {
        inventoryDetailObj['invStatus'] = result.getText({
          name: 'status',
        });
        inventoryDetailObj['invStatusId'] = result.getValue({
          name: 'status',
        });
      }
      inventoryDetailObj['expirationDate'] = result.getValue({
        name: 'custitemnumber_itbs_receipt_date',
        join: 'inventoryNumber',
      });
      inventoryDetailObj['onHand'] = onHand;
      inventoryDetailObj['available'] = available;
      locationData[locationText]['inventoryDetail'].push(inventoryDetailObj);
      return true;
    });

    return locationData;
  }
  function getItemWisePreferredBin(itemId, locationId) {
    var data = {};
    var filters = [
      ['internalid', 'anyof', itemId],
      'AND',
      ['preferredbin', 'is', 'T'],
      'AND',
      ['binonhandavail', 'greaterthan', '0'],
    ];
    if (locationId) {
      filters.push('AND');
      filters.push(['binnumber.location', 'anyof', locationId]);
    }
    var itemSearchObj = search.create({
      type: 'item',
      filters: filters,
      columns: [
        search.createColumn({ name: 'binnumber', join: 'binNumber' }),
        search.createColumn({ name: 'location', join: 'binNumber' }),
      ],
    });
    itemSearchObj.run().each(function (result) {
      var locationId = result.getValue({
        name: 'location',
        join: 'binNumber',
      });
      data[locationId] = result.getValue({
        name: 'binnumber',
        join: 'binNumber',
      });
      return true;
    });

    return data;
  }
  function getAllBinsByLocation(locationId, getStageBins) {
    var allBins = {};
    let filters = [['location', 'anyof', locationId], 'AND', ['inactive', 'is', 'F']];
    if (getStageBins) {
      filters.push('AND');
      filters.push(['custrecord_staging_bin', 'is', 'T']);
    }
    var binSearchObj = search.create({
      type: 'bin',
      filters: filters,
      columns: [
        search.createColumn({
          name: 'binnumber',
          sort: search.Sort.ASC,
          label: 'Bin Number',
        }),
      ],
    });
    binSearchObj.run().each(function (result) {
      allBins[result.id] = {};
      allBins[result.id]['id'] = result.id;
      allBins[result.id]['value'] = result.getValue({
        name: 'binnumber',
        sort: search.Sort.ASC,
        label: 'Bin Number',
      });
      return true;
    });
    return allBins;
  }
  function getAllStatus() {
    var allStatus = {};
    var inventorystatusSearchObj = search.create({
      type: 'inventorystatus',
      filters: [['isinactive', 'is', 'F']],
      columns: [search.createColumn({ name: 'name' })],
    });
    inventorystatusSearchObj.run().each(function (result) {
      allStatus[result.id] = {};
      allStatus[result.id]['id'] = result.id;
      allStatus[result.id]['value'] = result.getValue({
        name: 'name',
      });
      return true;
    });

    return allStatus;
  }
  function createBackupRecord(body, from) {
    //log.debug("createBackupRecord from::" + from, JSON.stringify(body));
    var itemData = body.itemData;
    if (!itemData.lineNo) {
      itemData.lineNo = '';
    }
    var setUpData = body.setUpData;
    var configuredItems = body.configuredItems;
    var locationid = body.locationid;

    if (body['backUpRecId']) {
      var adjuRecObj = record.load({
        type: 'customrecord_nst_wms_v3_br_rec',
        id: body['backUpRecId'],
        isDynamic: true,
      });
      if (from == 'inbound') {
        itemData.lineNo = itemData.poRate;
        if (!itemData.lineNo) {
          itemData.lineNo = 0;
        }
      }
    } else {
      var adjuRecObj = record.create({
        type: 'customrecord_nst_wms_v3_br_rec',
        isDynamic: true,
      });

      var tranType;
      if (from == 'adjustment') {
        tranType = 2;
      } else if (from == 'shiporder') {
        tranType = 4;
        adjuRecObj.setValue({
          fieldId: 'custrecord_ns_wms_v3_created_from_transa',
          value: body.soId,
        });
      } else if (from == 'batchPicking') {
        tranType = 22;
        log.debug('SO', body.soId);
        adjuRecObj.setValue({
          fieldId: 'custrecord_ns_wms_v3_created_from_transa',
          value: body.soId,
        });
        adjuRecObj.setValue({
          fieldId: 'custrecord_nst_wms_v3_if_in_progress',
          value: true,
        });
      } else if (from == 'receivetransferorder') {
        tranType = 16;
        adjuRecObj.setValue({
          fieldId: 'custrecord_ns_wms_v3_created_from_transa',
          value: body.soId,
        });
      } else if (from == 'shiptransferorder') {
        tranType = 12;
        adjuRecObj.setValue({
          fieldId: 'custrecord_ns_wms_v3_created_from_transa',
          value: body.soId,
        });
      } else if (from == 'receiveorder') {
        tranType = 8;
        adjuRecObj.setValue({
          fieldId: 'custrecord_ns_wms_v3_created_from_transa',
          value: body.soId,
        });
      } else if (from == 'binputAway') {
        tranType = 9;
      } else if (from == 'bintansfer') {
        tranType = 10;
      } else if (from == 'invtansfer') {
        tranType = 13;
      } else if (from == 'invtcount') {
        tranType = 14;
      } else if (from == 'configcount') {
        tranType = 15;
      } else if (from == 'receivetransferorder') {
        tranType = 16;
      } else if (from == 'bincount') {
        tranType = 20;
      } else if (from == 'inbound') {
        tranType = 17;
        itemData.lineNo = itemData.poRate;
        adjuRecObj.setValue({
          fieldId: 'custrecord_ns_wms_v3_adj_inbound_ship',
          value: body.shipData.shipId,
        });
        if (!itemData.lineNo) {
          itemData.lineNo = 0;
        }
      } else if (from == 'rma') {
        tranType = 18;
        adjuRecObj.setValue({
          fieldId: 'custrecord_ns_wms_v3_created_from_transa',
          value: body.soId,
        });
      }

      adjuRecObj.setValue({
        fieldId: 'custrecord_ns_wmsv3_location',
        value: locationid, //setUpData.location,
      });
      adjuRecObj.setValue({
        fieldId: 'custrecord_ns_wms_v3_adj_account',
        value: setUpData.defaultAccnt,
      });
      adjuRecObj.setValue({
        fieldId: 'custrecord_ns_wms_v3_created_from',
        value: tranType,
      });
      adjuRecObj.setValue({
        fieldId: 'custrecord_ns_wms_v3_rec_created_by',
        value: body.empId,
      });
      adjuRecObj.setValue({
        fieldId: 'custrecord_nst_wms_v3_subsidiary',
        value: setUpData.subsidiary,
      });
    }

    var totalQty = 0;
    if (configuredItems[0]['qty']) {
      totalQty = configuredItems.reduce((total, item) => total + parseInt(item.qty, 10), 0);
    } else if (configuredItems[0]['adjQty']) {
      totalQty = configuredItems.reduce((total, item) => total + parseInt(item.adjQty, 10), 0);
    }

    // if (!body.isPositive) {
    //   totalQty = -totalQty;
    // }
    var existingItem;
    if (body['backUpRecId']) {
      existingItem = checkItemExistsWithAdjType(itemData.itemID, body.isPositive, body['backUpRecId'], itemData.lineNo);
    }

    log.debug('existingItem', existingItem);
    if (existingItem) {
    } else {
      adjuRecObj.selectNewLine({
        sublistId: 'recmachcustrecord_ns_wms_v3_parent_rec',
      });
      adjuRecObj.setCurrentSublistValue({
        sublistId: 'recmachcustrecord_ns_wms_v3_parent_rec',
        fieldId: 'custrecord_ns_wms_v3_item_name',
        value: itemData.itemID,
      });
      adjuRecObj.setCurrentSublistValue({
        sublistId: 'recmachcustrecord_ns_wms_v3_parent_rec',
        fieldId: 'custrecord_ns_wms_adjustment_type',
        value: body.isPositive,
      });
      adjuRecObj.setCurrentSublistValue({
        sublistId: 'recmachcustrecord_ns_wms_v3_parent_rec',
        fieldId: 'custrecord_ns_wms_v3_is_serial_item',
        value: itemData.isSerialItem,
      });
      adjuRecObj.setCurrentSublistValue({
        sublistId: 'recmachcustrecord_ns_wms_v3_parent_rec',
        fieldId: 'custrecord_ns_wms_v3_is_bin_item',
        value: itemData.isBinItem,
      });
      adjuRecObj.setCurrentSublistValue({
        sublistId: 'recmachcustrecord_ns_wms_v3_parent_rec',
        fieldId: 'custrecord_ns_wms_v3_is_lot_item',
        value: itemData.isLotItem,
      });
      if (itemData.isKitMember) {
        adjuRecObj.setCurrentSublistValue({
          sublistId: 'recmachcustrecord_ns_wms_v3_parent_rec',
          fieldId: 'custrecord_ns_wms_v3_is_kit_item',
          value: itemData.isKitMember,
        });
        adjuRecObj.setCurrentSublistValue({
          sublistId: 'recmachcustrecord_ns_wms_v3_parent_rec',
          fieldId: 'custrecord_ns_wms_v3_kit_parent_item',
          value: itemData.kitId,
        });
        adjuRecObj.setCurrentSublistValue({
          sublistId: 'recmachcustrecord_ns_wms_v3_parent_rec',
          fieldId: 'custrecord_nst_wms_v3_kit_quantity',
          value: itemData.kitQuantity,
        });
        adjuRecObj.setCurrentSublistValue({
          sublistId: 'recmachcustrecord_ns_wms_v3_parent_rec',
          fieldId: 'custrecord_nst_wms_type',
          value: itemData.type,
        });
      }

      adjuRecObj.setCurrentSublistValue({
        sublistId: 'recmachcustrecord_ns_wms_v3_parent_rec',
        fieldId: 'custrecord_ns_wms_v3_quantity',
        value: totalQty,
      });
      if (from == 'bincount') {
        adjuRecObj.setCurrentSublistValue({
          sublistId: 'recmachcustrecord_ns_wms_v3_parent_rec',
          fieldId: 'custrecord_nst_wms_v3_bin_count_bin',
          value: itemData.binCountBin,
        }); // bin count
      }
      adjuRecObj.setCurrentSublistValue({
        sublistId: 'recmachcustrecord_ns_wms_v3_parent_rec',
        fieldId: 'custrecord_ns_wms_v3_item_inv_detail',
        value: JSON.stringify(configuredItems),
      });

      if (itemData.lineNo) {
        adjuRecObj.setCurrentSublistValue({
          sublistId: 'recmachcustrecord_ns_wms_v3_parent_rec',
          fieldId: 'custrecord_ns_wms_v3_transaction_line_no',
          value: itemData.lineNo,
        });
      }

      adjuRecObj.commitLine('recmachcustrecord_ns_wms_v3_parent_rec');
    }

    var adjusRecId = adjuRecObj.save({
      enableSourcing: true,
      ignoreMandatoryFields: true,
    });
    if (existingItem) {
      var fieldObj = {
        custrecord_ns_wms_v3_item_inv_detail: JSON.stringify(configuredItems),
        custrecord_ns_wms_v3_quantity: totalQty,
      };
      submitFields('customrecord_nst_wms_v3_br_crec', existingItem, fieldObj);
    }

    var response = {};
    response['backUpRecId'] = adjusRecId;
    var adjustLookup = search.lookupFields({
      type: 'customrecord_nst_wms_v3_br_rec',
      id: adjusRecId,
      columns: ['name'],
    });
    response['backUpRecText'] = adjustLookup.name;
    if (from == 'batchPicking') {
      for (var i = 0; i < configuredItems.length; i++) {
        const element = configuredItems[i];
        var batchItemRec = record.load({
          type: 'customrecord_nst_wms_v3_batch_rec_items',
          id: element['id'],
          isDynamic: true,
        });
        batchItemRec.setValue({
          fieldId: 'custrecord_nst_wms_v3_batchitem_pickqty',
          value: element.qty,
        });
        var qty = batchItemRec.getValue({
          fieldId: 'custrecord_nst_wms_v3_batch_item_ordqty',
        });
        if (qty == element.orderQty) {
          batchItemRec.setValue({
            fieldId: 'custrecord_nst_wms_v3_pick_qty_complete',
            value: true,
          });
        }
        batchItemRec.save();
      }
      record.submitFields({
        type: 'customrecord_nst_wms_v3_batch_record',
        id: body.batchNo,
        values: {
          custrecord_nst_wms_v3_backuprecord: response['backUpRecId'],
          custrecord_nst_wms_v3_batch_in_progress: true,
        },
      });
    }
    log.debug('adjusRecId response', JSON.stringify(response));
    return response;
  }

  function checkItemExistsWithAdjType(itemId, adjType, parentId, lienNo) {
    var recId,
      filters = [
        ['custrecord_ns_wms_v3_item_name', 'anyof', itemId],
        'AND',
        ['custrecord_ns_wms_adjustment_type', 'is', adjType],
        'AND',
        ['custrecord_ns_wms_v3_parent_rec', 'anyof', parentId],
      ];
    if (lienNo) {
      filters.push('AND');
      filters.push(['custrecord_ns_wms_v3_transaction_line_no', 'equalto', lienNo]);
    }
    var backup_child_recSearchObj = search.create({
      type: 'customrecord_nst_wms_v3_br_crec',
      filters: filters,
    });
    backup_child_recSearchObj.run().each(function (result) {
      recId = result.id;
    });

    return recId;
  }

  function getPreffredBinsForItemsInLocation(items, locationId) {
    var obj = {};
    var prefBinSearch = search.create({
      type: 'item',
      filters: [
        ['preferredbin', 'is', 'T'],
        'AND',
        ['binonhandavail', 'greaterthan', '0'],
        'AND',
        ['binnumber.location', 'anyof', locationId],
        'AND',
        ['internalid', 'anyof', items],
      ],
      columns: [
        search.createColumn({ name: 'binnumber' }),
        search.createColumn({ name: 'internalid', join: 'binNumber' }),
      ],
    });

    prefBinSearch.run().each(function (result) {
      obj[result.id] = {
        id: result.getValue({ name: 'internalid', join: 'binNumber' }),
        text: result.getValue({ name: 'binnumber' }),
      };
      return true;
    });

    return obj;
  }
  function getBackUpRecordData(backUpRecId) {
    var soData = {
      soId: '',
      locId: '',
      subId: '',
      accId: '',
      shipId: '',
      Items: [],
    };
    var itemIds = [];
    var cusRecObj = search.create({
      type: 'customrecord_nst_wms_v3_br_rec',
      filters: [['isinactive', 'is', 'F'], 'AND', ['internalid', 'anyof', backUpRecId]],

      columns: [
        search.createColumn({
          name: 'internalid',
          label: 'Internal ID',
        }),
        search.createColumn({
          name: 'custrecord_ns_wms_v3_created_from_transa',
          label: 'CREATED FROM TRANSACTION',
        }),
        search.createColumn({
          name: 'custrecord_nst_wms_v3_subsidiary',
          label: 'NST|SWMS|V3|Subsidiary',
        }),
        search.createColumn({
          name: 'custrecord_ns_wms_v3_backuprec_status',
          label: 'NST|SWMS|V3|Status',
        }),
        search.createColumn({
          name: 'custrecord_ns_wmsv3_location',
          label: 'Location',
        }),
        search.createColumn({
          name: 'custrecord_ns_wms_v3_adj_account',
          label: 'Account',
        }),
        search.createColumn({
          name: 'custrecord_ns_wms_v3_rec_created_by',
          label: 'Created By',
        }),
        search.createColumn({
          name: 'custrecord_ns_wms_adjustment_type',
          join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
          label: 'Adjustment Type Is Positive',
        }),
        search.createColumn({
          name: 'custrecord_ns_wms_v3_item_inv_detail',
          join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
          label: 'Inv Detail',
        }),
        search.createColumn({
          name: 'custrecord_ns_wms_v3_is_bin_item',
          join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
          label: 'Is Bin',
        }),
        search.createColumn({
          name: 'custrecord_ns_wms_v3_is_lot_item',
          join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
          label: 'Is Lot',
        }),
        search.createColumn({
          name: 'custrecord_ns_wms_v3_is_serial_item',
          join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
          label: 'Is Serial',
        }),
        search.createColumn({
          name: 'custrecord_ns_wms_v3_item_name',
          join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
          label: 'Item Name',
        }),
        search.createColumn({
          name: 'custrecord_ns_wms_v3_quantity',
          join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
          label: 'Quantity',
        }),
        search.createColumn({
          name: 'custrecord_ns_wms_v3_transaction_line_no',
          join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
          label: 'Line Number',
        }),
        search.createColumn({
          name: 'custrecord_ns_wms_v3_adj_inbound_ship',
          label: 'Inbound Ship Id',
        }),
        search.createColumn({
          name: 'custrecord_nst_wms_v3_bin_count_bin',
          join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
          label: 'NST WMS V3 Bin Count Bin',
        }),
        search.createColumn({
          name: 'custrecord_ns_wms_v3_kit_parent_item',
          join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
          label: 'Kit ID',
        }),
        search.createColumn({
          name: 'custrecord_nst_wms_v3_kit_quantity',
          join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
          label: 'Kit Qty',
        }),
        search.createColumn({
          name: 'custrecord_nst_wms_type',
          join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
        }),
      ],
    });
    cusRecObj.run().each(function (result) {
      if (!soData.soId) {
        soData.soId = result.getValue({
          name: 'custrecord_ns_wms_v3_created_from_transa',
        });
        soData.wmsuser = result.getValue({
          name: 'custrecord_ns_wms_v3_rec_created_by',
        });
      }

      if (!soData.locId) {
        soData.locId = result.getValue({
          name: 'custrecord_ns_wmsv3_location',
        });
      }

      if (!soData.subId) {
        soData.subId = result.getValue({
          name: 'custrecord_nst_wms_v3_subsidiary',
          label: 'NST|SWMS|V3|Subsidiary',
        });
      }

      if (!soData.accId) {
        soData.accId = result.getValue({
          name: 'custrecord_ns_wms_v3_adj_account',
          label: 'Account',
        });
      }

      if (!soData.shipId) {
        soData.shipId = result.getValue({
          name: 'custrecord_ns_wms_v3_adj_inbound_ship',
          label: 'Inbound Ship Id',
        });
      }

      var cRecData = {};
      cRecData['adjType'] = result.getValue({
        name: 'custrecord_ns_wms_adjustment_type',
        join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
        label: 'Adjustment Type Is Positive',
      });
      cRecData['InvDetail'] = result.getValue({
        name: 'custrecord_ns_wms_v3_item_inv_detail',
        join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
        label: 'Inv Detail',
      });
      cRecData['InvDetail'] = JSON.parse(cRecData['InvDetail']);
      cRecData['isBin'] = result.getValue({
        name: 'custrecord_ns_wms_v3_is_bin_item',
        join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
        label: 'Is Bin',
      });
      cRecData['isLot'] = result.getValue({
        name: 'custrecord_ns_wms_v3_is_lot_item',
        join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
        label: 'Is Lot',
      });
      cRecData['isSer'] = result.getValue({
        name: 'custrecord_ns_wms_v3_is_serial_item',
        join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
        label: 'Is Serial',
      });
      cRecData['itemId'] = result.getValue({
        name: 'custrecord_ns_wms_v3_item_name',
        join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
        label: 'Item Name',
      });
      cRecData['AdjQty'] = result.getValue({
        name: 'custrecord_ns_wms_v3_quantity',
        join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
        label: 'Quantity',
      });
      cRecData['lineNO'] = result.getValue({
        name: 'custrecord_ns_wms_v3_transaction_line_no',
        join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
        label: 'Line Number',
      });
      cRecData['binNo'] = result.getValue({
        name: 'custrecord_nst_wms_v3_bin_count_bin',
        join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
      });
      cRecData['kitId'] = result.getValue({
        name: 'custrecord_ns_wms_v3_kit_parent_item',
        join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
        label: 'Kit ID',
      });
      cRecData['kitQty'] = result.getValue({
        name: 'custrecord_nst_wms_v3_kit_quantity',
        join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
        label: 'Kit Qty',
      });
      cRecData['type'] = result.getValue({
        name: 'custrecord_nst_wms_type',
        join: 'CUSTRECORD_NS_WMS_V3_PARENT_REC',
      });
      itemIds.push(cRecData['itemId']);
      soData.Items.push(cRecData);
      return true;
    });
    soData.itemTypes = getItemTypes(itemIds);
    return soData;
  }

  function getItemTypes(ids) {
    let types = {};
    if (!ids) {
      return types;
    }

    var itemSearchObj = search.create({
      type: 'item',
      filters: [['isinactive', 'is', 'F'], 'AND', ['internalid', 'anyof', ids]],
      columns: [{ name: 'type' }],
    });

    itemSearchObj.run().each(function (r) {
      types[r.id] = r.getValue({ name: 'type' });
      return true;
    });

    return types;
  }

  function getKitItemMembers(itemId, setUpData, locationId) {
    var kitMemberArr = [];
    var kititemSearchObj = search.create({
      type: 'kititem',
      filters: [['type', 'anyof', 'Kit'], 'AND', ['internalid', 'anyof', itemId]],
      columns: [
        search.createColumn({ name: 'memberitem', label: 'Member Item' }),
        search.createColumn({
          name: 'memberquantity',
          label: 'Member Quantity',
        }),
        search.createColumn({
          name: 'unitstype',
          join: 'memberItem',
          label: 'Primary Units Type',
        }),
        search.createColumn({
          name: 'type',
          join: 'memberItem',
        }),
        // search.createColumn({
        //   name: "locationquantityavailable",
        //   join: "memberItem",
        //   label: "Location Available"
        // }),
        search.createColumn({
          name: 'upccode',
          join: 'memberItem',
          label: 'UPC Code',
        }),
        search.createColumn({
          name: 'purchasedescription',
          join: 'memberItem',
          label: 'Purchase Description',
        }),
        search.createColumn({
          name: 'itemid',
        }),
        search.createColumn({
          name: 'isserialitem',
          join: 'memberItem',
          label: 'Is Serialized Item',
        }),
        search.createColumn({
          name: 'islotitem',
          join: 'memberItem',
          label: 'Is Lot Numbered Item',
        }),
        search.createColumn({
          name: 'usebins',
          join: 'memberItem',
          label: 'Use Bins',
        }),
      ],
    });
    var searchResultCount = kititemSearchObj.runPaged().count;
    log.debug('kititemSearchObj result count', searchResultCount);
    kititemSearchObj.run().each(function (result) {
      var itemObj = {};
      itemObj['kitName'] = result.getValue({ name: 'itemid' });
      itemObj['kitId'] = itemId;
      itemObj['itemID'] = result.getValue({ name: 'memberitem' });
      itemObj['itemName'] = result.getText({ name: 'memberitem' });
      itemObj['memberQty'] = Number(result.getValue({ name: 'memberquantity' }));
      itemObj['type'] = result.getValue({ name: 'type', join: 'memberItem' });
      if (setUpData['useUpc'] == true) {
        itemObj['skuNumber'] = result.getValue({
          name: 'upccode',
          join: 'memberItem',
        });
      } else {
        itemObj['upc'] = false;
      }
      if (setUpData['useBins'] == true) {
        itemObj['isBinItem'] = result.getValue({
          name: 'usebins',
          join: 'memberItem',
        });
      } else {
        itemObj['isBinItem'] = false;
      }
      if (setUpData['useSerial'] == true) {
        itemObj['isSerialItem'] = result.getValue({
          name: 'isserialitem',
          join: 'memberItem',
        });
      } else {
        itemObj['isSerialItem'] = false;
      }
      if (setUpData['useLot'] == true) {
        itemObj['isLotItem'] = result.getValue({
          name: 'islotitem',
          join: 'memberItem',
        });
      } else {
        itemObj['isLotItem'] = false;
      }

      itemObj['configuredItems'] = [];
      itemObj['kitConfiguredItems'] = {};

      itemObj['invBalance'] = getInventoryBalanceByLocation(
        setUpData,
        itemObj['itemID'],
        locationId,
        itemObj['isSerialItem'],
      );
      itemObj['available'] = result.getValue({
        name: 'locationquantityavailable',
        join: 'memberItem',
        label: 'Location Available',
      });
      itemObj['description'] = result.getValue({
        name: 'purchasedescription',
        join: 'memberItem',
        label: 'Purchase Description',
      });
      itemObj['unitstype'] = result.getText({
        name: 'unitstype',
        join: 'memberItem',
        label: 'Primary Units Type',
      });
      itemObj['component'] = true;
      itemObj['pickQty'] = 0;
      kitMemberArr.push(itemObj);
      return true;
    });
    return kitMemberArr;
  }

  function replaceWithZero(variable) {
    return variable || variable === 0 ? variable : 0;
  }
  const getStageBinsForLocation = (locationId) => {
    let Bins = [];
    var binSearchObj = search.create({
      type: 'bin',
      filters: [['location', 'anyof', locationId], 'AND', ['custrecord_staging_bin', 'is', 'T']],
      columns: [
        search.createColumn({
          name: 'binnumber',
          sort: search.Sort.ASC,
        }),
      ],
    });
    binSearchObj.run().each(function (r) {
      Bins.push({
        id: r.id,
        value: r.getValue({
          name: 'binnumber',
          sort: search.Sort.ASC,
        }),
      });
      return true;
    });
    return Bins;
  };

  function getItems() {
    var itemArray = [];
    var mySearch = search.create({
      type: search.Type.ITEM,
      filters: [['isinactive', search.Operator.IS, 'F']],
      columns: [
        search.createColumn({ name: 'itemid' }),
        search.createColumn({ name: 'displayname' }),
        search.createColumn({ name: 'upccode' }),
      ],
    });
    var start = 0;
    do {
      var batchResult = mySearch.run().getRange({
        start: start,
        end: start + 1000,
      });
      for (var i = 0; i < batchResult.length; i++) {
        var itemObj = {};
        itemObj['id'] = batchResult[i].id;
        itemObj['name'] = batchResult[i].getValue({ name: 'itemid' });
        itemObj['upc'] = batchResult[i].getValue({ name: 'upccode' });

        itemObj['displayname'] = itemObj['name'] + '-' + batchResult[i].getValue({ name: 'displayname' });
        itemArray.push(itemObj);
      }
      start += 1000;
    } while (batchResult.length == 1000);
    return itemArray;
  }

  return {
    searchRecords: searchRecords,
    getFilesInFolder: getFilesInFolder,
    createRecord: createRecord,
    getCurrentUser: getCurrentUser,
    getSetUpRecordData: getSetUpRecordData,
    validateCredentials: validateCredentials,
    getScriptUrl: getScriptUrl,
    getDashBoardData: getDashBoardData,
    getScreenUrls: getScreenUrls,
    getItems: getItems,
    getFileUrl: getFileUrl,
    getFolderId: getFolderId,
    submitFields: submitFields,
    fieldLookUp: fieldLookUp,
    getItemData: getItemData,
    getInventoryBalanceByLocation: getInventoryBalanceByLocation,
    getItemWisePreferredBin: getItemWisePreferredBin,
    getAllBinsByLocation: getAllBinsByLocation,
    getAllStatus: getAllStatus,
    getLocationBySubsidiary: getLocationBySubsidiary,
    createBackupRecord: createBackupRecord,
    getPreffredBinsForItemsInLocation: getPreffredBinsForItemsInLocation,
    replaceWithZero: replaceWithZero,
    getKitItemMembers: getKitItemMembers,
    getBackUpRecordData: getBackUpRecordData,
    getStageBinsForLocation: getAllBinsByLocation,
  };
});
