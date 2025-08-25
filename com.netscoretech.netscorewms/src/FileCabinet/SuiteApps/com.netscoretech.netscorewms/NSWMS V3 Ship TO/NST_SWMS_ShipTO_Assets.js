var app = angular.module("myApp", []);
app.controller("ShipTOController", function ($scope, $window, $filter, $http) {
  c = console.log.bind(document);
  $scope.urlObj = document.getElementById("myDataObj").innerHTML;
  $scope.urlObj = JSON.parse($scope.urlObj);
  var ajaxUrl = $scope.urlObj["ajaxUrl"];
  ($scope.loading = false), $scope.backUpRecId, $scope.backUpRecText;
  $scope.goBack = function () {
    $window.history.back();
  };

  $scope.quantity = 0;

  $scope.showBinsCard = false;


  $scope.updateQuantity = function () {
    // Perform any additional logic when the quantity changes
  };

  $scope.increment = function () {
    $scope.quantity++;
  };

  $scope.decrement = function () {
    if ($scope.quantity > 0) {
      $scope.quantity--;
    }
  };

  $scope.logOut = function () {
    const confirmation = confirm("Are you sure you want to logout?");
    if (confirmation) {
      $window.location.href = $scope.urlObj["logIn"];
    }
  };
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
          $scope.setUpData = response["data"]["setUpData"];
          $scope.locObj = response["data"]["locationObj"];
          c("SetupData::" + JSON.stringify($scope.setUpData));
          // console.log("$scope.urlObj", $scope.urlObj);
          if ($scope.urlObj["tranId"]) {
            $scope.scannedOrder = $scope.urlObj["tranId"];
            $scope.scanOrder();
          }
          document.getElementById('scanorder').focus();
          $scope.loading = false;
        },
        function (response) {
          $scope.loading = false;
          alert("error::::::");
        }
      );
  };
  $scope.getSetUpData();
  $scope.orderId, $scope.orderText, $scope.customer, $scope.customerText;
  $scope.scanOrder = function () {
    if ($scope.scannedOrder) {
      $scope.loading = true;
      $http
        .get(
          ajaxUrl +
            "&ref=getOrderData" +
            "&setUpData=" +
            JSON.stringify($scope.setUpData) +
            "&scannedOrder=" +
            $scope.scannedOrder +
            "&locationId=" +
            $scope.urlObj["locationId"]
        )
        .then(
          function (response) {
            var data = response["data"];
            console.log("Data::" + JSON.stringify(data));
            $scope.orderId = data.orderId;
            $scope.orderText = data.orderText;
            $scope.customer = data.customer;
            $scope.customerText = data.customerText;
            $scope.orderItems = data.items;
            console.log('all items',$scope.orderItems);
            $scope.loading = false;
            if ($scope.orderId) {
              document.getElementById('scanItem').focus();
            } else {
              alert('No match found!!');
              $scope.scannedOrder = '';
              document.getElementById('scanorder').focus();
            }
          },
          function (response) {
            $scope.loading = false;
            alert("error::::::");
          }
        );
    } else {
    }
  };

  $scope.getItemDetails = function () {
    if ($scope.scannedItem) {
      var obj = $scope.orderItems.find((u) => u.itemName == $scope.scannedItem && u.pickQty == 0);
      if (!obj) {
        alert("Item not found!!");
        return ($scope.scannedItem = "");
      }

      $scope.loading = true;
      $http
        .get(
          ajaxUrl +
            "&ref=itemData" +
            "&setUpData=" +
            JSON.stringify($scope.setUpData) +
            "&scannedItem=" +
            $scope.scannedItem +
            "&locationId=" +
            $scope.urlObj["locationId"]
        )
        .then(
          function (response) {
            var data = response["data"];
            if (data["status"] == "success") {
              $scope.itemData = data;
              $scope.itemData.orderQty = obj.quantity;
              $scope.itemData.lineNo = obj.lineNo;
              $scope.invBalance =
                $scope.itemData.invBalance[$scope.urlObj["locationId"]];
              $scope.preferdBins = $scope.itemData.preferdBins;
              $scope.allBins = $scope.itemData.allBins;
              $scope.allStatus = $scope.itemData.allStatus;
              const index = $scope.orderItems.findIndex(
                (item) => item.itemName == $scope.itemData.itemName && item.pickQty == 0
              );
              if (index > -1) {
                $scope.itemData["pickQty"] =
                  $scope.orderItems[index]["pickQty"];
              }
              delete $scope.itemData.invBalance;
              delete $scope.itemData.preferdBins;
              delete $scope.itemData.allBins;
              delete $scope.itemData.allStatus;
              $scope.scannedItem = "";
              $scope.isPositive = false;
              ($scope.negativeAdj = {}),
                ($scope.negativeBins = []),
                ($scope.negativeStatus = []),
                ($scope.negBinsAllStatus = []),
                ($scope.configuredItems = []);
              c("$scope.itemData::" + JSON.stringify($scope.itemData));
              c("$scope.invBalance::" + JSON.stringify($scope.invBalance));
              c("$scope.preferdBins::" + JSON.stringify($scope.preferdBins));
              c("$scope.allBins::" + JSON.stringify($scope.allBins));
              c("$scope.allStatus::" + JSON.stringify($scope.allStatus));
              if (index > -1) {
                $scope.configuredItems =
                  $scope.orderItems[index]["configuredItems"];
              }
              var myModalEl = document.getElementById("itemDataModal");
              $scope.myModal = new bootstrap.Modal(myModalEl, {
                keyboard: false,
              });



              // to display the binname and available quantity

             /*  $scope.binsWithQty = [];

              console.log('hello',$scope.itemData);

              if ($scope.itemData["isSerialItem"]) {
                $scope.findBinCount($scope.invBalance.inventoryDetail, "binNoText");
              } else {
                const binMap = {}; // Object to store bins grouped by binNoText

                $scope.invBalance.inventoryDetail?.forEach((element) => {
                  if (element.binNoText) {
                    if (!binMap[element.binNoText]) {

                      binMap[element.binNoText] = {
                        binNoText: element.binNoText,
                        binCount: 0,
                      };
                    }
                    // Add the available count to the bin
                    binMap[element.binNoText].binCount += element.available;
                  }
                });

                // Convert binMap back to an array for display
                $scope.binsWithQty = Object.values(binMap);

                console.log($scope.binsWithQty);
              } */


                $scope.binsWithQty = [];

                console.log('hello', $scope.itemData);

                if ($scope.itemData["isSerialItem"]) {
                  $scope.findBinCount($scope.invBalance.inventoryDetail, "binNoText");
                } else {
                  const binMap = {}; // Object to store bins grouped by binNoText

                  $scope.invBalance.inventoryDetail?.forEach((element) => {
                    if (element.binNoText) {
                      if (!binMap[element.binNoText]) {
                        binMap[element.binNoText] = {
                          binNoText: element.binNoText,
                          binCount: 0, // Initialize binCount to 0
                        };
                      }

                      const availableQty = parseFloat(element.available) || 0; // Ensure available is a valid number
                      binMap[element.binNoText].binCount += availableQty; // Add available to binCount
                    }
                  });

                  // Convert binMap back to an array for display
                  $scope.binsWithQty = Object.values(binMap);

                  console.log('Bins with quantities:', $scope.binsWithQty);
                }


              $scope.myModal.show();
              setTimeout(() => {
                document.getElementById('scanitem').focus();
              }, 1500);
            } else {
              $scope.itemData = {};
              $scope.invBalance = {};
              $scope.preferdBins = {};
              $scope.allBins = {};
              $scope.allStatus = {};
              $scope.scannedItem = "";
              alert(data["message"]);
            }

            $scope.loading = false;
          },
          function (response) {
            $scope.loading = false;
            alert("error::::::");
          }
        );
    }
  };

  $scope.viewItem = function (itemObj) {
    $scope.scannedItem = itemObj.itemName;
    $scope.getItemDetails();
  };

  $scope.scanLotItem = function () {
    if ($scope.isPositive) {
    } else {
      if ($scope.itemData["isBinItem"] == true) {
        if ($scope.negativeAdj.lotNO) {
          $scope.negBinsAllStatus = $filter("filter")(
            $scope.invBalance.inventoryDetail,
            {
              invNoText: $scope.negativeAdj.lotNO,
            },
            true
          );
          if ($scope.negBinsAllStatus.length <= 0) {
            $scope.negativeAdj.lotNO = "";
            document.getElementById('scanitem').focus();
            return alert("LOT number not found!!");
          }
          $scope.negativeBins = $scope.negBinsAllStatus.filter(function (
            item,
            index,
            self
          ) {
            return (
              index ===
              self.findIndex(function (t) {
                return t.binNo === item.binNo;
              })
            );
          });
          document.getElementById('negBin').focus();
        } else {
          $scope.negativeBins = [];
          $scope.negBinsAllStatus = [];
          $scope.negativeAdj = {};
        }
      } else {
        $scope.negativeStatus = $filter("filter")(
          $scope.invBalance.inventoryDetail,
          {
            invNoText: $scope.negativeAdj.lotNO,
          },
          true
        );
       // document.getElementById('status').focus();
        var statusElem = document.getElementById('status');
        if (statusElem) {
          statusElem.focus();
        }
      }
    }
  };
  $scope.scanSerialItem = function (serialNo) {
    if (!serialNo) {
      return "";
    }
    var obj = $scope.invBalance.inventoryDetail.find(
      (u) => u.invNoText == serialNo
    );

    if ($scope.isPositive) {
      if (obj) {
        alert("Serial No Already Exists!!");
        $scope.positiveAdj.serialNO = "";
        document.getElementById('scanitem').focus();
      } else {
        var obj = $scope.configuredItems.find((u) => u.serialNO == serialNo);
        if (obj) {
          alert("Serial No Already Exists!!");
          $scope.positiveAdj.serialNO = "";
          document.getElementById('scanitem').focus();
        } else {
          $scope.disableQty = true;
          $scope.positiveAdj.qty = 1;
        }
      }
    } else {
      if (obj) {
        const result = $scope.configuredItems.find(
          (item) => item.serialNO == serialNo
        );
        if (result) {
          alert("Configured with same data already!!");
          return ($scope.negativeAdj = {});
        }

        $scope.negativeAdj = {
          serialNO: serialNo,
          binNO: obj.binNo,
          binNoText: obj.binNo,
          avlqty: "",
          selectedStatus: obj.invStatusId,
          qty: obj.onHand,
          selectedStatusText: obj.invStatus,
        };
        var totalQty = $scope.configuredItems.reduce(
          (total, item) => total + parseInt(item.qty, 10),
          0
        );
        if (
          Number(totalQty) + Number($scope.negativeAdj.qty) >
          Number($scope.itemData["orderQty"])
        ) {
          $scope.negativeAdj.qty = "";
          document.getElementById('qty').focus();
          return alert("Picked quantity is greaterthan order quantity");
        }
        $scope.itemData["pickQty"] =
          Number(totalQty) + Number($scope.negativeAdj.qty);
        $scope.configuredItems.push($scope.negativeAdj);
        $scope.negativeAdj = {};
      } else {
        $scope.negativeAdj.serialNO = "";
        return alert("Serial No Not Found!!");
      }
    }
  };
  $scope.scanItemUpc = function (itemUpc) {
    if (!itemUpc) {
      return;
    }

    if ($scope.itemData.itemName == itemUpc || $scope.itemData.upc == itemUpc) {
      if ($scope.isPositive) {
      } else {
        if ($scope.itemData["isBinItem"] == true) {
          $scope.negativeBins = $scope.invBalance.inventoryDetail;
          document.getElementById('negBin').focus();
        } else {
          $scope.negativeStatus = $scope.invBalance.inventoryDetail;
          document.getElementById('status').focus();
          c(JSON.stringify($scope.negativeStatus));
        }
      }
    } else {
      alert("Invalid Item/UPC!!");
      $scope.negativeAdj.itemOrUpc = "";
      document.getElementById('scanitem').focus();
    }
  };
  $scope.selectNegBin = function () {
    if ($scope.negativeAdj.binNO) {
      if ($scope.negativeAdj.lotNO) {
        $scope.negativeStatus = $filter("filter")(
          $scope.negBinsAllStatus,
          {
            binNo: $scope.negativeAdj.binNO,
          },
          true
        );
      } else if ($scope.negativeAdj.itemOrUpc) {
        $scope.negativeStatus = $filter("filter")(
          $scope.negativeBins,
          {
            binNo: $scope.negativeAdj.binNO,
          },
          true
        );
        c(JSON.stringify($scope.negativeStatus));
      }

      var obj = $scope.negativeBins.find(
        (u) => u.binNo == $scope.negativeAdj.binNO
      );
      $scope.negativeAdj.binNoText = obj["binNoText"];
    } else {
      $scope.negativeStatus = [];
      $scope.negativeAdj.binNoText = "";
    }
    $scope.negativeAdj.avlqty = "";
    $scope.negativeAdj.selectedStatus = "";
    $scope.negativeAdj.qty = "";
    $scope.negativeAdj.selectedStatusText = "";
  };

  $scope.selectNegStatus = function () {
    if ($scope.negativeAdj.selectedStatus) {
      var obj = $scope.negativeStatus.find(
        (u) => u.invStatusId == $scope.negativeAdj.selectedStatus
      );
      $scope.negativeAdj.avlqty = obj["available"];
      $scope.negativeAdj.selectedStatusText = obj["invStatus"];
      document.getElementById('shipQty').focus();
    } else {
      $scope.negativeAdj.avlqty = "";
      $scope.negativeAdj.qty = "";
      $scope.negativeAdj.selectedStatusText = "";
    }
  };
  $scope.enterQuantity = function () {
    if ($scope.negativeAdj.selectedStatus) {
      if (Number($scope.negativeAdj.qty) > Number($scope.negativeAdj.avlqty)) {
        alert(
          "You only have " +
            $scope.negativeAdj.avlqty +
            " available. Please enter a different quantity."
        );
        $scope.negativeAdj.qty = "";
      }
    }
  };

  $scope.addNegConfiguredItem = function () {
    if (
      !$scope.negativeAdj.lotNO &&
      $scope.setUpData["useLot"] == true &&
      $scope.itemData["isLotItem"] == true
    ) {
      return alert("Please scan LOT No!!");
    }
    if (
      !$scope.negativeAdj.serialNO &&
      $scope.setUpData["useSerial"] == true &&
      $scope.itemData["isSerialItem"] == true
    ) {
      return alert("Please scan Serial No!!");
    }
    if (
      !$scope.negativeAdj.itemOrUpc &&
      $scope.itemData["isLotItem"] == false &&
      $scope.itemData["isSerialItem"] == false
    ) {
      return alert("Please scan Item/UPC!!");
     
    }
    if (
      !$scope.negativeAdj.binNO &&
      $scope.setUpData["useBins"] == true &&
      $scope.itemData["isBinItem"] == true
    ) {
      return alert("Please select Bin No!!");
    }
    if (
      !$scope.negativeAdj.selectedStatus &&
      $scope.setUpData["useInvStatus"] == true
    ) {
      return alert("Please select status!!");
    }
    if (!$scope.negativeAdj.qty) {
      return alert("Please enter quantity!!");
    }
    c("$scope.configuredItems::" + JSON.stringify($scope.configuredItems));
    const result = $scope.configuredItems.find(
      (item) =>
        item.lotNO == $scope.negativeAdj.lotNO &&
        item.binNO == $scope.negativeAdj.binNO &&
        item.selectedStatus == $scope.negativeAdj.selectedStatus
    );

    if (result) {
      alert("Configured with same data already!!");
      return ($scope.negativeAdj = {});
    }

    var totalQty = $scope.configuredItems.reduce(
      (total, item) => total + parseInt(item.qty, 10),
      0
    );
    if (
      Number(totalQty) + Number($scope.negativeAdj.qty) >
      Number($scope.itemData["orderQty"])
    ) {
       alert("Picked quantity is greaterthan order quantity");
       $scope.negativeAdj.qty = "";
       return  document.getElementById('shipQty').focus();
    }
    $scope.itemData["pickQty"] =
      Number(totalQty) + Number($scope.negativeAdj.qty);
      $scope.configuredItems.push($scope.negativeAdj);
      document.getElementById('scanitem').focus();
      $scope.negativeAdj = {};
  };

  $scope.deleteConfiguredItem = function (index) {
    const confirmation = confirm("Are you sure you want to delete?");
    if (confirmation) {
      $scope.configuredItems.splice(index, 1);
      document.getElementById('scanitem').focus();
    }
  };

  $scope.submitConfiguredItem = function () {
    $scope.loading = true;
    var dataObj = {
      empId: $scope.urlObj["empId"],
      setUpData: $scope.setUpData,
      isPositive: $scope.isPositive,
      itemData: $scope.itemData,
      locationid: $scope.urlObj["locationId"],
      configuredItems: $scope.configuredItems,
      backUpRecId: $scope.backUpRecId,
      soId: $scope.orderId,
    };
    console.log('(dataObj)::::',JSON.stringify(dataObj));
    $http.post(ajaxUrl + "&ref=createBackup", JSON.stringify(dataObj)).then(
      function (response) {
        var data = response["data"];
        $scope.loading = false;
        $scope.backUpRecId = data.backUpRecId;
        $scope.backUpRecText = data.backUpRecText;
        $scope.myModal.hide();
        console.log("Backup Created Successfully!!" + JSON.stringify(data));
        $scope.itemObj = $scope.itemData;
        $scope.itemObj.onHand = $scope.invBalance["onHand"];
        $scope.itemObj.available = $scope.invBalance["available"];

        const index = $scope.orderItems.findIndex(
          (item) => item.itemName == $scope.itemObj.itemName && item.pickQty == 0
        );
        if (index > -1) {
          $scope.orderItems[index]["pickQty"] = $scope.itemObj["pickQty"];
          $scope.orderItems[index]["configuredItems"] = $scope.configuredItems;
        }

        console.log(
          "$scope.backUpRecordData!!" + JSON.stringify($scope.backUpRecordData)
        );
      },
      function (response) {
        $scope.loading = false;
        alert("error::::::");
      }
    );
  };
  $scope.approveCompleteBackUp = function (approveOrComplete) {
    if ($scope.backUpRecordData <= 0) {
      return alert("Please scan item!!");
    }
    $scope.loading = true;
    var dataObj = {
      recId: $scope.backUpRecId,
    };
    $http
      .post(ajaxUrl + "&ref=apprCmpltBackup", JSON.stringify(dataObj))
      //"&ref=apprCmpltBackup" +"&cId=" +$scope.backUpRecId +

      .then(
        function (response) {
          var data = response["data"];
           if(data.error){
             $scope.loading = false;
            return alert(data.error);
          }
          $scope.loading = false;
          alert("Item Fulfillment created successfully!!" + data.tranIdText);
          $window.location.reload();
        },
       
      );
  };

  $scope.viewItem = function (itemObj) {
    $scope.scannedItem = itemObj.itemName;
    $scope.getItemDetails();
  };

 // to show or hide stock bins
 $scope.showBinsQtyCard = function () {
  if ($scope.itemData.isBinItem) {
    $scope.showBinsCard = !$scope.showBinsCard;
  } else {
    $scope.showBinsCard = false;
  }
};

  $scope.findBinCount = function (arr, key) {
  $scope.binsWithQty = [];
  arr?.forEach((x) => {
    if (
      $scope.binsWithQty.some((val) => {
        return val[key] == x[key];
      })
    ) {
      $scope.binsWithQty.forEach((k) => {
        if (k[key] === x[key]) {
          k["binCount"]++;
        }
      });
    } else {
      let a = {};
      a[key] = x[key];
      a["binCount"] = 1;
      if (a[key] !== $scope.selectstagebin) {
        $scope.binsWithQty.push(a);
      }
    }
  });
  console.log( $scope.binsWithQty);
  
};


});