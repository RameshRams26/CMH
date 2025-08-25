var app = angular.module("myApp", []);
app.controller(
  "packShipOrderController",
  function ($scope, $window, $filter, $http) {
    c = console.log.bind(document);
    $scope.boxWeight = 0;
    $scope.urlObj = document.getElementById("myDataObj").innerHTML;
    $scope.urlObj = JSON.parse($scope.urlObj);
    var ajaxUrl = $scope.urlObj["ajaxUrl"];
    $scope.loading = false;
    $scope.goBack = function () {
      $window.history.back();
    };
    $scope.ifObj = { scannedItem: "" };
    $scope.getSetUpData = function () {
      $scope.loading = true;
      $http
        .get(
          ajaxUrl +
            "&ref=getSetUpData" +
            "&setUpId=" +
            $scope.urlObj["setUpId"] +
            "&locationId=" +
            $scope.urlObj["locationId"]
        )
        .then(
          function (response) {
            console.log("IFDATA::" + JSON.stringify(response.data));
            $scope.finaldata = [];
            $scope.setupdata = response["data"]["setUpData"];

            // console.log(setupdatanew)
            $scope.locObj = response["data"]["locationObj"];
            console.log(JSON.stringify($scope.receiveIFs));
            if ($scope.urlObj["tranId"]) {
              $scope.scannedOrder = $scope.urlObj["tranId"];
              $scope.getShipmentId();
            }
            document.getElementById("scanorder").focus();
            $scope.loading = false;
          },
          function (response) {
            $scope.loading = false;
            alert("error::::::");
          }
        );
    };
    $scope.getSetUpData();

    $scope.getShipmentId = function () {
      if ($scope.scannedOrder) {
        $scope.loading = true;
        $http
          .get(
            ajaxUrl +
              "&ref=getShipmentId" +
              "&setUpId=" +
              $scope.urlObj["setUpId"] +
              "&locationId=" +
              $scope.urlObj["locationId"] +
              "&tranid=" +
              $scope.scannedOrder
          )
          .then(
            function (response) {
              var data = response["data"]["IFData"];
              $scope.packagedata = response["data"]["PackageDetails"];
              if (data["status"] == "success") {
                console.log("data:::", JSON.stringify(data));
                if (data.error) {
                  alert("Invalid sales order number!");
                  $scope.loading = false;
                  return;
                }
                $scope.statusref = data.statusref;
                console.log($scope.statusref);
                $scope.tranid = data.tranid;
                $scope.customer = data.customer;
                $scope.customerText = data.customerText;
                $scope.createdfromname = data.createdfromname.replace(
                  "Sales Order #",
                  ""
                );
                $scope.createdfromid = data.createdfromid;
                $scope.internalid = data.internalid;
                $scope.shipaddress = data.shipaddress;
                $scope.trandate = data.trandate;
                $scope.shipmethod = data.shipmethod;
                $scope.receiveIFs = data.items;
                console.log($scope.receiveIFs);
                document.getElementById("scanitem").focus();
                //$scope.loading = false;
              } else {
                if (
                  $scope.urlObj["tranId"] &&
                  data["status"] == "Order not found"
                ) {
                  $scope.scannedOrder = "";
                  //$window.history.back();
                  var url = "";
                  url = $scope.urlObj["packList"];
                  $window.location.href =
                    url +
                    "&empId=" +
                    $scope.urlObj["empId"] +
                    "&setUpId=" +
                    $scope.urlObj["setUpId"] +
                    "&locationId=" +
                    $scope.urlObj["locationId"];
                } else {
                  alert(data["status"]);
                }
                $scope.loading = false;
                return false;
              }
              $scope.loading = false;
            },
            function (response) {
              $scope.loading = false;
              alert("Error::: "); //+ response.statusText
            }
          );
      } else {
      }
    };

    $scope.confirmItemName = function () {
      // $scope.scannedItem = document.getElementById('scanitem').value;
      console.log("confirmItemName", $scope.ifObj.scannedItem);
      if ($scope.ifObj.scannedItem) {
        $scope.loading = true;
        const index = $scope.receiveIFs.findIndex(
          (item) => item.item == $scope.ifObj.scannedItem
        );
        console.log(index);
        if (index > -1) {
          $scope.receiveIFs[index]["scanned"] = true;
          $scope.receiveIFs[index]["packQuantity"] =
            $scope.receiveIFs[index]["quantity"];
        } else {
          alert("Item not found!!");
        }
        $scope.loading = false;

        $scope.ifObj.scannedItem = "";
        document.getElementById("scanitem").focus();
      }
    };

    $scope.scanItemName = function () {
      if ($scope.scannedItem) {
        $scope.loading = true;
        const index = $scope.filteredIFs.findIndex(
          (item) =>
            item.item == $scope.scannedItem || item.UPC == $scope.scannedItem
        );
        // console.log(index);
        if (index > -1) {
          //console.log(index);
          // if ($scope.receiveIFs[index]["packQuantity"] === undefined) {
          //   $scope.receiveIFs[index]["packQuantity"] = 0;
          // }
          if (
            $scope.filteredIFs[index]["packquantity"] <
            $scope.filteredIFs[index]["remainQuantity"]
          ) {
            $scope.filteredIFs[index]["packquantity"] += 1;
          } else {
            alert("Quantity exceeds the limit!");
          }
        } else {
          alert("Item not found!!");
        }
        $scope.loading = false;
        $scope.scannedItem = "";
        document.getElementById("scanitem").focus();
      }
    };

    $scope.createIFRecord = function () {
      var orderQty = $scope.receiveIFs;
      for (var i = 0; i < orderQty.length; i++) {
        if (orderQty[i].quantity != orderQty[i].packQuantity) {
          alert("Please Pack all items");
          return false;
        }
      }
      var requestData = {
        tranid: $scope.internalid,
        statusref: $scope.statusref,
      };
      $scope.loading = true;
      // alert(JSON.stringify(requestData))
      $http
        .post(ajaxUrl + "&ref=updateIFRecord", JSON.stringify(requestData))
        .then(function (response) {
          $scope.loading = false;
          if (requestData.statusref == "picked") {
            alert("Order Status has updated to Packed.");
          } else if (requestData.statusref == "packed") {
            alert("Order Status has updated to Shipped.");
          }
          $window.location.reload();
          $scope.loading = true;
        })
        .catch(function (error) {
          $scope.loading = false;
          alert("Error: " + error.statusText);
        });
    };

    $scope.selectedPackage = {};
    $scope.selectPackage = function () {
      console.log($scope.selectedPackage.name);
      var obj = $scope.packagedata.find(
        (e) => e.id == $scope.selectedPackage.name
      );
      console.log(obj);
      if (obj) {
        $scope.selectedPackage.boxLength = obj.boxLength;
        $scope.selectedPackage.boxWidth = obj.boxWidth;
        $scope.selectedPackage.boxHeight = obj.boxHeight;
        $scope.selectedPackage.boxId = obj.boxId;
        $scope.packQuantity = obj.orders?.packQuantity;
      }
    };

    var myModalEl = document.getElementById("exampleModal");
    $scope.myModal = new bootstrap.Modal(myModalEl, {
      keyboard: false,
    });

    $scope.validatePackQuantity = function (order) {
      if (order.packquantity > order.remainQuantity) {
        alert("Pack Quantity cannot exceed Ordered Quantity.");
        order.packquantity = order.remainQuantity;
      }
    };

    $scope.enableFields = false;

    $scope.toggleFields = function () {
      alert("test");
      $scope.enableFields = !$scope.enableFields;
    };

    $scope.submitPackageDetails = function () {
      if (!$scope.selectedPackage || !$scope.selectedPackage.name) {
        alert("Please select a package before submitting.");
        return;
      }

      $scope.loading = true;
      var itemsArray = $scope.filteredIFs.map(function (order) {
        return {
          itemId: order.id,
          itemName: order.item,
          orderedQty: order.quantity,
        };
      });
      var dataObj = {
        empId: $scope.urlObj["empId"],
        selectedPackage: $scope.selectedPackage.name,
        selectedPackageid: $scope.selectedPackage.boxId,
        selectedWeight: $scope.boxWeight,
        tranid: $scope.internalid,
        location: $scope.urlObj["locationId"],
        saleorder: $scope.createdfromid.replace("Sales Order #", ""),
        saleordername: $scope.createdfromname,
        customerText: $scope.customerText,
        itemFulfillment: $scope.tranid,
        shipaddress: $scope.shipaddress,
        trandate: $scope.trandate,
        shipmethod: $scope.shipmethod,
        selectedPackage: $scope.selectedPackage.boxId,
        items: itemsArray,
      };

      console.log(JSON.stringify(dataObj));
      $http.post(ajaxUrl + "&ref=createPackage", JSON.stringify(dataObj)).then(
        function (response) {
          var data = response["data"];
          $scope.filteredIFs.map(function (order) {
            var obj = $scope.receiveIFs.find((e) => e.item == order.item);
            if (obj) {
              return (obj.packQuantity =
                Number(obj.packQuantity ? obj.packQuantity : 0) +
                Number(order.packquantity));
            }
          });
          alert("Package details submitted successfully!");
          $scope.loading = false;
          $scope.myModal.hide();
          if (confirm("Do you want to print label ?")) {
            $http.post(ajaxUrl, JSON.stringify(dataObj)).then(
              function (response) {
                var printData = response["data"];

                // $window.parent.postMessage(
                //   {
                //     func: "printMultiLabels",
                //     message: JSON.stringify(printData),
                //   }, //printMultiLabels
                //   "*"
                // );
                // $window.addEventListener("message", myClick);
                // alert("Printing initiated successfully!");
              },
              function (response) {
                alert("Error initiating printing.");
              }
            );
          }
        },
        function (response) {
          $scope.loading = false;
          alert("error::::::");
        }
      );
    };

    $scope.filterReceiveIFs = function () {
      //  $scope.selectedPackage.name ="";
      $scope.filteredIFs = $scope.receiveIFs.filter(function (item) {
        item.remainQuantity =
          Number(item.quantity) -
          Number(item.packQuantity ? item.packQuantity : 0);
        item.packquantity = 0;
        return item.quantity != item.packQuantity;
      });

      console.log($scope.filteredIFs);
    };
  }
);
