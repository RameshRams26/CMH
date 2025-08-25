/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
  "N/https",
  "N/search",
  "N/url",
  "../NSWMS V3 Globals/utility_module",
  "N/render",
  "N/file",
  "N/encode",
], /**
 * @param{https} https
 * @param{search} search
 * @param{url} url
 */ (https, search, url, utility, render, file, encode) => {
    /**
     * Defines the Suitelet script trigger point.
     * @param {Object} scriptContext
     * @param {ServerRequest} scriptContext.request - Incoming request
     * @param {ServerResponse} scriptContext.response - Suitelet response
     * @since 2015.2
     */
    const onRequest = (scriptContext) => {
      try {
        log.debug("params::", JSON.stringify(scriptContext));
        var data = {};
        var packageDetailsArray = [];

        if (scriptContext.request.method == "GET") {
          if (scriptContext.request.parameters.id) {
            IFid = scriptContext.request.parameters.id;
            log.debug("id", IFid);
            var itemfulfillmentSearchObj = search.create({
              type: "itemfulfillment",
              settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
              filters:
                [
                  ["type", "anyof", "ItemShip"],
                  "AND",
                  ["internalid", "anyof", IFid],
                  "AND",
                  ["mainline", "is", "T"]
                ],
              columns:
                [
                  search.createColumn({ name: "custbody_nst_wms_v3_package_boxes", label: "Package Boxes" }),
                  search.createColumn({
                    name: "id",
                    join: "CUSTBODY_nst_wms_V3_PACKAGE_BOXES",
                    label: "ID"
                  }),
                  search.createColumn({
                    name: "custrecord_nst_wms_v3_item_fulfillment",
                    join: "CUSTBODY_nst_wms_V3_PACKAGE_BOXES",
                    label: "Item Fulfillment"
                  }),
                  search.createColumn({
                    name: "createdfrom",
                    label: "Sales Order"
                  }),
                  search.createColumn({
                    name: "custrecord_nst_wms_v3_weight",
                    join: "CUSTBODY_nst_wms_V3_PACKAGE_BOXES",
                    label: "Weight"
                  }),
                  search.createColumn({
                    name: "custrecord_nst_wms_v3_package_data",
                    join: "CUSTBODY_nst_wms_V3_PACKAGE_BOXES",
                    label: "Package Data"
                  }),
                  search.createColumn({
                    name: "custrecord_nst_wms_v3_packer_name",
                    join: "CUSTBODY_nst_wms_V3_PACKAGE_BOXES",
                    label: "Packer Name"
                  }),
                  search.createColumn({
                    name: "custrecord_nst_wms_v3_box_dimensions",
                    join: "CUSTBODY_nst_wms_V3_PACKAGE_BOXES",
                    label: "Box Dimensions (L *W * H )"
                  }),
                  search.createColumn({
                    name: "shipdate",
                    join: "createdFrom",
                    label: "Ship Date"
                 }),
                  search.createColumn({
                    name: "shipaddress",
                    label: "Ship Address"
                  }),
                  search.createColumn({
                    name: "entity",
                    label: "Customer"
                  }),
                  search.createColumn({
                    name: "shipmethod",
                    label: "Ship Method"
                  }),
                  search.createColumn({ name: "tranid", label: "Document Number" })
                ]
            });
            var searchResultCount = itemfulfillmentSearchObj.runPaged().count;
            log.debug("itemfulfillmentSearchObj result count", searchResultCount);
            itemfulfillmentSearchObj.run().each(function (r) {
              var data = {};

              data.packageBoxes = r.getValue({
                name: "id",
                join: "CUSTBODY_nst_wms_V3_PACKAGE_BOXES",
                label: "ID"
              });
              data.IFNO = r.getText({
                name: "custrecord_nst_wms_v3_item_fulfillment",
                join: "CUSTBODY_nst_wms_V3_PACKAGE_BOXES",
                label: "Item Fulfillment"
              });
              data.IFNO  = data.IFNO.replace("Item Fulfillment #", "");
              data.weight = r.getValue({
                name: "custrecord_nst_wms_v3_weight",
                join: "CUSTBODY_nst_wms_V3_PACKAGE_BOXES",
                label: "Item Fulfillment"
              });
              data.address = r.getValue({
                name: "shipaddress",
                label: "Ship Address"
              });
              data.boxdimensions = r.getText({
                name: "custrecord_nst_wms_v3_box_dimensions",
                join: "CUSTBODY_nst_wms_V3_PACKAGE_BOXES",
                label: "Box Dimensions (L *W * H )"
              });
              data.customer = r.getText({
                name: "entity",
                label: "Customer"
              });
              data.shipdate = r.getValue({
                name: "shipdate",
                join: "createdFrom",
                label: "Ship Date"
              });
             
              data.salesOrder = r.getText({
                name: "createdfrom",
                label: "Sales Order"
              });
              data.salesOrder = data.salesOrder.replace("Sales Order #", "");

              data.shipmethod = r.getText({
                name: "shipmethod",
                label: "Ship Method"
             });

              data.itemDetails = r.getValue({
                name: "custrecord_nst_wms_v3_package_data",
                join: "CUSTBODY_nst_wms_V3_PACKAGE_BOXES",
                label: "Package Data"
              });
              data.itemDetails = JSON.parse(data.itemDetails)
             

              
              packageDetailsArray.push(data)
              return true;

            });
            var boxlength = search.lookupFields({
              type: "itemfulfillment",
              id: IFid,
              columns: ["custbody_nst_wms_v3_package_boxes"],
            });

            log.debug("boxlength", boxlength)

            var pdfContent = `<?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">
          <pdf> 
          <head>
          <style>
            body {
                  font-family: Arial, sans-serif;
                  margin: 0;
                  padding: 0;
              }
              .label {
                  width: 4in;
                  height: 6in;
                  padding: 4px;
                  border: 1px solid #ccc;
                  box-sizing: border-box;
                 page-break-before: always;
              }
              table {
                  width: 100%;
                  border-collapse: collapse;
              }
              th, td {
                  border: 1px solid #000;
                  padding: 4px;
                  text-align: center;
                  font-size: 12px;
              }
              th {
                  background-color: #f2f2f2;
                  padding: 3px;
                  font-size: 12px;
                 
              }
              p {
                  font-size: 12px;
                  line-height: 12px;
              }
              img {
                  height: 70px;
                  width: 80%;
              }
         
          </style>
        </head>
        <body>`;
            for (
              var i = 0;
              i < packageDetailsArray.length;
              i++
            ) {
              var pageNumber = (i + 1) + " of " + packageDetailsArray.length;
              log.debug(' packageDetailsArray[i]', packageDetailsArray[i]);
              log.debug(' pageNumber', pageNumber)
              pdfContent += `<page>

            <div class="label">   
            <p><span><strong>Ship Date : </strong> ${packageDetailsArray[i].shipdate}</span></p>         
            <p><span><strong>Ship Method : </strong> ${packageDetailsArray[i].shipmethod}</span></p>
            <p><span><strong>IF Number : </strong> ${packageDetailsArray[i].IFNO}</span></p>
            <p><span><strong>Sales Order : </strong>${packageDetailsArray[i].salesOrder}</span></p>
            <p><strong>Customer Name : </strong> ${packageDetailsArray[i].customer} </p>
            <p><strong>Ship Address : </strong> ${packageDetailsArray[i].address}</p>
            
            <table>
                <thead>
                    <tr>
                        <th style="width:50%;"><b>Weight :</b>  ${packageDetailsArray[i].weight}</th>
                        <th style="width:50%;"><b>Box : </b>  ${packageDetailsArray[i].boxdimensions}</th>
                    </tr>
                </thead>
            </table>
            <table style="margin-top: 8px;">
                <thead>
                    <tr>
                        <th style="width:50%;"><b>ITEM NAME</b></th>
                        <th style="width:50%;"><b>ORDERED QUANTITY</b></th>
                    </tr>
                </thead>
                <tbody>`
              for (
                var k = 0;
                k < packageDetailsArray[i].itemDetails.length;
                k++
              ) {
                pdfContent +=
                  `<tr>
                        <td style="width:50%;">${packageDetailsArray[i].itemDetails[k].itemName}</td>
                        <td style="width:50%;">${packageDetailsArray[i].itemDetails[k].orderedQty}</td>
                    </tr>`
              }
              pdfContent += `</tbody>
            </table>
            <div class="">
              <p style="text-align:right;"><span><strong>${pageNumber}</strong></span></p>
              </div>

            </div> 
           </page>`;
            }
            pdfContent += `</body></pdf>`;
            if (pdfContent) {
              var pdfFile = render.xmlToPdf({
                xmlString: pdfContent,
              });
              scriptContext.response.writeFile({
                file: pdfFile,
                isInline: true,
              });
            } else {
              log.error(
                "No content to generate PDF",
                "no.of cartons is empty to print the packslip!"
              );
              scriptContext.response.write(
                "Number of cartons is empty to print the packslip!"
              );
            }

          }

        }
   else {
          data = JSON.parse(scriptContext.request.body);
        }
        data = JSON.parse(scriptContext.request.body);
        var htmlHead = `<!DOCTYPE html>
      <html>
      <head>
          <title>BarCode</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src='https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.0/JsBarcode.all.min.js'></script>
          <link href='https://fonts.googleapis.com/css?family=Libre Barcode 39' rel='stylesheet'>
          <script src='https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.5/JsBarcode.all.min.js' integrity='sha512-QEAheCz+x/VkKtxeGoDq6nsGyzTx/0LMINTgQjqZ0h3+NjP+bCsPYz3hn0HnBkGmkIFSr7QcEZT+KyEM7lbLPQ==' crossorigin='anonymous' referrerpolicy='no-referrer'></script>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  margin: 0;
                  padding: 0;
              }
              .label {
                  width: 4in;
                  height: 6in;
                  padding: 4px;
                  border: 1px solid #ccc;
                  box-sizing: border-box;
              }
              table {
                  width: 100%;
                  border-collapse: collapse;
              }
              th, td {
                  border: 1px solid #000;
                  padding: 4px;
                  text-align: center;
                  font-size: 12px;
              }
              th {
                  background-color: #f2f2f2;
                  padding: 3px;
                  font-size: 12px;
              }
              p {
                  font-size: 12px;
                  line-height: 12px;
              }
              img {
                  height: 70px;
                  width: 80%;
              }
          </style>
      </head>`;

        var html = htmlHead;
        html += '<body>';
        html += '    <div class="label">';
        html += '        <p><span><strong>Ship Method:</strong> DSD Full Service</span><span style="float: right;"><strong>Ship Date:</strong> date </span></p>';
        html += '        <p><span><strong>IF Number:</strong>' + data.itemFulfillment + '</span><span style="float: right;"><strong>Sales Order:</strong> ' + data.saleordername + '</span></p>';
        html += '        <p><strong>Customer Name:</strong>' + data.customerText + '</p>';
        html += '        <p><strong>Packer Name:</strong> ID-0014NW Melisa Hewson</p>';
        // html += '        <p style="text-align:center;"><img src="https://barcode.tec-it.com/barcode.ashx?data=ABC-abc-1234&code=Code128&translate-esc=on"></p>';
        html += ' <p style="text-align:center;"> <img id="barcode1" height="100px" width="100%" /> </p>';
        //  html +=
        //  '<script>JsBarcode("#barcode1", "' +
        //  data.saleorder +
        //  '", {format: "CODE128",displayValue: false});</script>';
        html += '        <p><strong>Ship Address:</strong>' + data.shipaddress + '</p>';
        html += '        <table>';
        html += '            <thead>';
        html += '                <tr>';
        html += '                    <th>Weight :' + data.selectedWeight + ' </th>';
        html += '                    <th>Dimensions : ' + data.selectedPackage + '</th>';
        html += '                </tr>';
        html += '            </thead>';
        html += '        </table>';

        html += '        <table style="margin-top: 8px;">';
        html += '            <thead>';
        html += '                <tr>';
        html += '                    <th><b>ITEM NAME</b></th>';
        html += '                    <th><b>Ordered Qty</b></th>';

        html += '                </tr>';
        html += '            </thead>';
        html += '            <tbody>';

        // Loop through items array and add rows
        data.items.forEach(item => {
          html += '            <tr>';
          html += '                <td>' + item.itemName + '</td>';
          html += '                <td>' + item.orderedQty + '</td>';
          html += '            </tr>';
        });
        html += '            </tbody>';
        html += '        </table>';
        html += '    </div>';
        html += '</body>';
        html += '</html>';

        // Log the HTML for debugging
        log.debug("Generated HTML", html);

        var MainJSONData = [];
        var dataFinal = encode.convert({
          string: html,
          inputEncoding: encode.Encoding.UTF_8,
          outputEncoding: encode.Encoding.BASE_64,
        });
        var jsonData = {
          base64: dataFinal,
          barcodeArray: [
            {
              id: "barcode1",
              name: data.saleordername,
            },
          ],
        };
        MainJSONData.push(jsonData);
        // Set content type to HTML
        // scriptContext.response.setHeader({
        //   name: 'Content-Type',
        //   value: 'text/html'
        // });

        if (scriptContext.request.method == "GET") {
          scriptContext.response.setHeader({
            name: 'Content-Type',
            value: 'text/html'
          });
          scriptContext.response.write(html)
        } else {
          scriptContext.response.write(JSON.stringify(MainJSONData));
        }
        //
      } catch (e) {
        log.error("Catch Block Message In nst_wms_SL_ShipOrder_UI::", e);
      }
    };

    return { onRequest };
  });
