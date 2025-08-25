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
        response['locationObj'] = utility.fieldLookUp('location', params['locationId'], ['name']); //get Location name from SetupRecord
        let locationId = params['locationId'];
        let pickedStatusIFs = getPickedStatusIFs(locationId);
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
    //get IFs with picked status
    function getPickedStatusIFs(locationId) {
      try {
        log.debug({
          title: 'pickstatustriggered==loc',
          details: locationId,
        });

        let pickedIFs = [];

        let itemfulfillmentSearchObj = search.create({
          type: 'itemfulfillment',
          filters: [
            ['type', 'anyof', 'ItemShip'],
            'AND',
            ['status', 'anyof', 'ItemShip:A', 'ItemShip:B'],
            'AND',
            ['location', 'anyof', locationId],
            'AND',
            ['mainline', 'is', 'T'],
          ],
          columns: [
            search.createColumn({ name: 'tranid' }),
            search.createColumn({ name: 'createdfrom' }),
            search.createColumn({ name: 'statusref' }),
            search.createColumn({ name: 'trandate' }),
            search.createColumn({
              name: 'recordtype',
              join: 'createdFrom',
              label: 'Record Type',
            }),
          ],
        });

        let searchResultCount = itemfulfillmentSearchObj.runPaged().count;
        log.debug({
          title: 'itemfulfillmentSearchObj result count',
          details: searchResultCount,
        });
        itemfulfillmentSearchObj.run().each(function (result) {
          let pickStatusIF = {};
          pickStatusIF['orderNo'] = result.getValue({
            name: 'tranid',
          });
          pickStatusIF['createdFrom'] = result.getText({
            name: 'createdfrom',
          });
          pickStatusIF['IFstatus'] = result.getValue({
            name: 'statusref',
          });
          pickStatusIF['tranDates'] = result.getValue({
            name: 'trandate',
          });

          let formateddate = result.getValue({
            name: 'trandate',
          });

          let parsedDate = format.parse({
            value: formateddate,
            type: format.Type.DATE,
          });
          let day = parsedDate.getDate();
          let month = parsedDate.getMonth() + 1;
          let year = parsedDate.getFullYear();

          pickStatusIF['tranDate'] = day + '/' + month + '/' + year;

          // let converteddate = formateddate.split("/");
          // pickStatusIF["tranDate"] =
          //   converteddate[1] + "/" + converteddate[0] + "/" + converteddate[2];

          log.debug('checkdate', pickStatusIF['tranDate']);
          pickStatusIF['tranDateString'] = result.getValue({
            name: 'trandate',
          });
          pickStatusIF['recordType'] = result.getValue({
            name: 'recordtype',
            join: 'createdFrom',
            label: 'Record Type',
          });
          //let parsedtrandate=new Date(pickStatusIF["tranDate"]);
          pickedIFs.push(pickStatusIF);
          return true;
        });

        return pickedIFs;
      } catch (e) {
        log.error('error in getPickedStatusIFs ', e);
        var response = { status: 'error', message: e.message };
        return response;
      }
    }
  };
  return {
    onRequest: onRequest,
  };
});
