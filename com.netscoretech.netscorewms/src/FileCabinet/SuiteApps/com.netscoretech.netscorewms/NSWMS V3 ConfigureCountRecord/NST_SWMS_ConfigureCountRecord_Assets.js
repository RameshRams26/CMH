var app = angular.module("myApp", []);
// alert(app);
app.controller(
  "configurecountrecordController",
  function ($scope, $http, $window, $filter, $timeout) {
    c = console.log.bind(document);
    $scope.urlObj = document.getElementById("myDataObj").innerHTML;
    $scope.urlObj = JSON.parse($scope.urlObj);
    var ajaxUrl = $scope.urlObj["ajaxUrl"];
    ($scope.loading = false),
      $scope.backUpRecId,
      $scope.backUpRecText,
      ($scope.backUpRecordData = []);
    $scope.goBack = function () {
      $window.history.back();
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
            $scope.urlObj["locationId"] +
            "&tranId=" +
            $scope.urlObj["tranId"]
        )
        .then(
          function (response) {
            $scope.setUpData = response["data"]["setUpData"];
            $scope.locObj = response["data"]["locationObj"];
            $scope.invCountRecdata = response["data"]["invCountRecdata"];
            $scope.backUpRecId = $scope.invCountRecdata.backUpRecId;
            $scope.backUpRecText = $scope.invCountRecdata.backUpRecText;
            $scope.loading = false;
            //c(JSON.stringify(response["data"]));
          },
          function (response) {
            $scope.loading = false;
            alert("error::::::");
          }
        );
    };
    $scope.getSetUpData();
    function myClick(event) {
      if (event.data[1] == "scanning") {
        $scope.scannedItem = event.data[0];
        $scope.getItemDetails();
      } else if (event.data[1] == "upc") {
        $scope.$apply(function () {
          $scope.positiveAdj.itemOrUpc = event.data[0];
          $scope.scanItem();
        });
      } else if (event.data[1] == 'serial') {
        $scope.$apply(function () {
          $scope.positiveAdj.serialNo = event.data[0];
          $scope.scanItem();
        });
      } else if (event.data[1] == 'lot') {
        $scope.positiveAdj.lotNO = event.data[0];
        $scope.scanItem();
      }
      $window.removeEventListener("message", myClick);
    }
    $scope.openScanner = function (from) {
      $window.parent.postMessage(
        { func: "pickscanBarcodeforV3", message: from },
        "*"
      );
      $window.addEventListener("message", myClick);
    };
    $scope.increment = function () {
      if (!$scope.positiveAdj.adjQty) {
        $scope.positiveAdj.adjQty = 1;
      } else {
        $scope.positiveAdj.adjQty++;
      }
    };
    $scope.decrement = function () {
      if ($scope.positiveAdj.adjQty > 0) {
        $scope.positiveAdj.adjQty--;
      }
    };
    $scope.moveFocusToNextField = function (fieldId) {
      $timeout(function () {
        document.getElementById(fieldId).focus();
      });
    };
    $scope.deleteConfiguredItem = function (index) {
      const confirmation = confirm("Are you sure you want to delete?");
      if (confirmation) {
        $scope.configuredItems.splice(index, 1);
      }
    };
    $scope.getItemDetails = function (itemObj, index) {
      var item = itemObj.itemId;
      $scope.selectedIndex = index;
      $scope.loading = true;
      $http
        .get(
          ajaxUrl +
            "&ref=itemData" +
            "&setUpData=" +
            JSON.stringify($scope.setUpData) +
            "&scannedItem=" +
            item +
            "&locationId=" +
            $scope.urlObj["locationId"] +
            "&binNo=" +
            itemObj.binNo
        )
        .then(
          function (response) {
            var data = response["data"];
            if (data["status"] == "success") {
              $scope.itemData = data;
              c('$scope.itemData',JSON.stringify($scope.itemData));
              $scope.allStatus = $scope.itemData.allstatus;
              delete $scope.itemData.allstatus;
              $scope.itemData.lineNo = itemObj.lineNo;
              ($scope.positiveAdj = {}),
                ($scope.disableQty = false),
                ($scope.configuredItems = []);
              $scope.configuredItems =
                $scope.invCountRecdata["items"][$scope.selectedIndex][
                  "configuredItems"
                ];
              $scope.itemData.quantity =
                $scope.invCountRecdata["items"][$scope.selectedIndex][
                  "quantity"
                ];
              var myModalEl = document.getElementById("exampleModal");
              $scope.myModal = new bootstrap.Modal(myModalEl, {
                keyboard: false,
              });
              $scope.myModal.show();
              $scope.positiveAdj.itemOrUpc = $scope.itemData.itemName;
              // $scope.scanItem();
              $scope.scanItemUpc($scope.itemData.itemName);
            

            } else {
              $scope.itemData = {};
              alert(data["message"]);
              $scope.loading = false;
            }

            $scope.loading = false;
          },
          function (response) {
            $scope.loading = false;
            alert("error::::::");
          }
        );
        
    };
    
    $scope.scanItem = function () {
      if (
        !$scope.positiveAdj.serialNo &&
        !$scope.positiveAdj.itemOrUpc &&
        !$scope.positiveAdj.lotNO
      ) {
        return $scope.moveFocusToNextField("scanitem");
      }

      if (
        $scope.positiveAdj.serialNo &&
        $scope.setUpData["useSerial"] == true &&
        $scope.itemData["isSerialItem"] == true
      ) {
        $scope.positiveAdj.adjQty = 1;
        $scope.disableQty = true;
      } else if (
        $scope.itemData.itemName !== $scope.positiveAdj.itemOrUpc &&
        $scope.itemData.upc !== $scope.positiveAdj.itemOrUpc &&
        $scope.itemData["isLotItem"] == false &&
        $scope.itemData["isSerialItem"] == false
      ) {
        alert("Invalid Item/UPC!!");
        $scope.positiveAdj.itemOrUpc = "";
        $scope.moveFocusToNextField("scanitem");
        return;
      }
      $scope.moveFocusToNextField("status");
    };
    $scope.scanItemUpc = function (itemUpc) {
      if (!itemUpc) {
        return;
      }
      if ($scope.itemData.type == "Kit") {
        var obj = $scope.configuredItems.find(
          (item) => item.itemName == itemUpc || item.skuNumber == itemUpc
        );
        if (obj) {
          $scope.disableUpc = true;
          if (!$scope.negativeAdj.itemOrUpc) {
            $scope.negativeAdj.itemOrUpc = itemUpc;
          }
          $scope.moveFocusToNextField("status");
        } else {
          $scope.moveFocusToNextField("scanItemUpc");
          $scope.negativeAdj.itemOrUpc = "";
          return alert("Wrong item scanned");
        }
      } else {
        if (
          $scope.itemData.itemName == itemUpc ||
          $scope.itemData.upc == itemUpc
        ) {
          $scope.disableUpc = true;
          if ($scope.itemData["isBinItem"] == true) {
            $scope.moveFocusToNextField("status");
          } else {
            // $scope.moveFocusToNextField("selectStatus");
            $scope.moveFocusToNextField("adjQty");
          }
          
        } else {
          $scope.negativeAdj.itemOrUpc = "";
          $scope.positiveAdj.itemOrUpc = "";
          alert("Invalid Item/UPC!!");
          $scope.moveFocusToNextField("scanInvOrUpc");
        }
      }
    };
    $scope.selectPosStatus = function () {
      if ($scope.positiveAdj.selectedStatus) {
        var obj = $scope.allStatus.find(
          (u) => u.id == $scope.positiveAdj.selectedStatus
        );
        $scope.positiveAdj.selectedStatusText = obj["text"];
      } else {
        $scope.positiveAdj.selectedStatusText = "";
      }
      $scope.moveFocusToNextField("adjQty");
    };
    $scope.addPosConfiguredItem = function () {
      if (
        !$scope.positiveAdj.lotNO &&
        $scope.setUpData["useLot"] == true &&
        $scope.itemData["isLotItem"] == true
      ) {
        return alert("Please scan LOT No!!");
      }
      if (
        !$scope.positiveAdj.serialNo &&
        $scope.setUpData["useSerial"] == true &&
        $scope.itemData["isSerialItem"] == true
      ) {
        return alert("Please scan Serial No!!");
      }
      if (
        !$scope.positiveAdj.selectedStatus &&
        $scope.setUpData["useInvStatus"] == true
      ) {
        return alert("Please select status!!");
      }
      if (!$scope.positiveAdj.adjQty) {
        return alert("Please enter quantity!!");
      } else {
        if (Number($scope.positiveAdj.adjQty) <= 0) {
          $scope.positiveAdj.adjQty = "";
          return alert("Quantity should be greaterthan zero!!");
        }
      }

      var result;
      if (
        $scope.setUpData["useLot"] == true &&
        $scope.itemData["isLotItem"] == true
      ) {
        result = $scope.configuredItems.find(
          (item) =>
            item.lotNO == $scope.positiveAdj.lotNO &&
            item.selectedStatus == $scope.positiveAdj.selectedStatus
        );
      } else if (
        $scope.setUpData["useSerial"] == true &&
        $scope.itemData["isSerialItem"] == true
      ) {
        result = $scope.configuredItems.find(
          (item) =>
            item.serialNo == $scope.positiveAdj.serialNo &&
            item.selectedStatus == $scope.positiveAdj.selectedStatus
        );
      } else if (
        $scope.itemData["isLotItem"] == false &&
        $scope.itemData["isSerialItem"] == false
      ) {
        result = $scope.configuredItems.find(
          (item) =>
            item.itemOrUpc == $scope.positiveAdj.itemOrUpc &&
            item.selectedStatus == $scope.positiveAdj.selectedStatus
        );
      }

      if (result) {
        alert("Configured with same data already!!");
        $scope.positiveAdj = {};
        return "";
      }
      $scope.configuredItems.push($scope.positiveAdj);
      var totalQty = $scope.configuredItems.reduce(
        (total, item) => total + parseInt(item.adjQty, 10),
        0
      );
      $scope.itemData.quantity = totalQty;
      $scope.positiveAdj = {};
      $scope.moveFocusToNextField("scanitem");
    };
    $scope.submitConfiguredItem = function () {
      if (!$scope.configuredItems.length) {
        return alert("Please add atleast one configuration!!");
      }

      $scope.loading = true;
      var dataObj = {
        empId: $scope.urlObj["empId"],
        setUpData: $scope.setUpData,
        isPositive: true,
        itemData: $scope.itemData,
        configuredItems: $scope.configuredItems,
        backUpRecId: $scope.backUpRecId,
        locationid: $scope.urlObj["locationId"],
      };
      $http.post(ajaxUrl + "&ref=createBackup", JSON.stringify(dataObj)).then(
        function (response) {
          var data = response["data"];
          $scope.loading = false;
          $scope.backUpRecId = data.backUpRecId;
          $scope.backUpRecText = data.backUpRecText;
          $scope.myModal.hide();
          $scope.invCountRecdata["items"][$scope.selectedIndex]["quantity"] =
            $scope.itemData.quantity;
          $scope.invCountRecdata["items"][$scope.selectedIndex][
            "configuredItems"
          ] = $scope.configuredItems;
        },
        function (response) {
          $scope.loading = false;
          alert("error::::::");
        }
      );
    };
    $scope.approveCompleteBackUp = function () {
      if (!$scope.backUpRecId) {
        return alert("Please add atleast one item.");
      }
      $scope.loading = true;
      var dataObj = {
        recId: $scope.backUpRecId,
        tranId: $scope.urlObj["tranId"],
      };
      $http
        .post(ajaxUrl + "&ref=apprCmpltBackup", JSON.stringify(dataObj))
        .then(
          function (response) {
            var data = response["data"];
            $scope.loading = false;
            if (data.status) {
              return alert(data.message.message);
            }
            alert("Count Record configured successfully " + data.tranIdText);
            // $window.location.reload();
            $scope.goToInvcountList();

          },
          function (response) {
            $scope.loading = false;
            alert("error::" + response.data);
          }
        );
    };
    $scope.goToInvcountList = function () {
      var url = $scope.urlObj["invcountlist"];
      url +=
        "&empId=" +
        $scope.urlObj["empId"] +
        "&setUpId=" +
        $scope.urlObj["setUpId"] +
        "&locationId=" +
        $scope.urlObj["locationId"];
      $window.location.href = url;
    };
  }
);
