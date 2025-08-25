var app = angular.module("myApp", []);
// alert(app);
app.controller(
  "binputawayController",
  function ($scope, $window, $filter, $http) {
    c = console.log.bind(document);
    $scope.urlObj = document.getElementById("myDataObj").innerHTML;
    $scope.urlObj = JSON.parse($scope.urlObj);
    var ajaxUrl = $scope.urlObj["ajaxUrl"];
    ($scope.loading = false), $scope.backUpRecId, $scope.backUpRecText;
    $scope.goBack = function () {
      $window.history.back();
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
            $scope.items = response["data"]["allItems"];
            //c("SetupData::" + JSON.stringify($scope.setUpData));
            $scope.loading = false;
          },
          function (response) {
            $scope.loading = false;
            alert("error::::::");
          }
        );
    };
    $scope.getSetUpData();
    //Auto suggestions
    $scope.searchText = "";
    $scope.results = [];
    $scope.showSuggestions = false;
    $scope.search = function () {
      $scope.results = [];
      $scope.showSuggestions = false;
      if ($scope.searchText.length >= 4) {
        angular.forEach($scope.items, function (item) {
          if (
            item.name.toLowerCase().indexOf($scope.searchText.toLowerCase()) >=
            0
          ) {
            $scope.results.push(item);
          }
        });
        $scope.showSuggestions = true;
      }
    };

    $scope.selectResult = function (result) {
      $scope.searchText = result.name;
      $scope.results = [];
      $scope.showSuggestions = false;
      if (result.name) {
        $scope.searchName = result.name;
        $scope.getItemDetails();
      } else {
        $scope.searchName = "";
      }
    };
    function myClick(event) {
      if (event.data[1] == "scanning") {
        $scope.scannedItem = event.data[0];
        $scope.getItemDetails();
      }
      $window.removeEventListener("message", myClick);
    }

    $scope.openScanner = function () {
      $window.parent.postMessage(
        { func: "pickscanBarcode", message: "scanning" },
        "*"
      );
      $window.addEventListener("message", myClick);
    };

    $scope.getBinPutAwayItems = function () {
      $scope.loading = true;
      $http
        .get(
          ajaxUrl +
          "&ref=getBinPutAwayItems" +
          "&locationId=" +
          $scope.urlObj["locationId"]
        )
        .then(
          function (response) {
            $scope.binPutAwayItems = response["data"]["binPutAwayItems"];
            //c("binPutAwayItems::" + JSON.stringify($scope.binPutAwayItems));
            $scope.loading = false;
          },
          function (response) {
            $scope.loading = false;
            alert("error::::::");
          }
        );
    };
    $scope.getBinPutAwayItems();
    $scope.setPreferedBin = function () {
      $scope.positiveAdj.binNO = $scope.itemData.preBin;
      $scope.positiveAdj.binNoText = $scope.itemData.preBinText;
    };
    $scope.enterQuantity = function () {
      if ($scope.positiveAdj.selectedStatus) {
        if (
          Number($scope.positiveAdj.qty) > Number($scope.positiveAdj.avlQty)
        ) {
          alert(
            "You only have " +
            $scope.positiveAdj.avlQty +
            " available. Please enter a different quantity."
          );
          $scope.positiveAdj.qty = "";
        }
      }
    };
    $scope.calculateTotalQty = function () {
      var totalQty = $scope.configuredItems.reduce(
        (total, item) => total + parseInt(item.qty, 10),
        0
      );
      if (!$scope.positiveAdj.qty) {
        $scope.positiveAdj.qty = 0;
      }
      $scope.itemData["putAwayQty"] =
        Number(totalQty) + Number($scope.positiveAdj.qty);
    };

    $scope.deleteConfiguredItem = function (index) {
      const confirmation = confirm("Are you sure you want to delete?");
      if (confirmation) {
        $scope.configuredItems.splice(index, 1);
        $scope.allStatus = [];
        $scope.calculateTotalQty();
      }
    };
    $scope.viewItem = function (itemObj) {
      $scope.scannedItem = itemObj.itemName;
      $scope.getItemDetails();
    };
    $scope.getItemDetails = function () {
      if ($scope.scannedItem || $scope.searchName) {
        var item = "";
        if ($scope.scannedItem) {
          item = $scope.scannedItem;
        } else {
          item = $scope.searchName;
        }

        var obj = $scope.binPutAwayItems.find((u) => u.itemName == item);
        if (!obj) {
          return alert("Item doesn't exists!!");
        } else {
        }
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
            $scope.urlObj["locationId"]
          )
          .then(
            function (response) {
              var data = response["data"];
              if (data["status"] == "success") {
                $scope.itemData = data;
                // c(JSON.stringify($scope.itemData));
                $scope.allBins = $scope.itemData.allBins;
                $scope.allStatus = $scope.itemData.allStatus;
                $scope.putAwayDetails = $scope.itemData.putAwayDetails;
                delete $scope.itemData.allBins;
                delete $scope.itemData.putAwayDetails;
                if (obj) {
                  $scope.itemData.preBinText = obj.preBinText;
                  $scope.itemData.preBin = obj.preBin;
                  $scope.itemData.qty = obj.qty;
                  $scope.itemData.putAwayQty = obj.putAwayQty;
                }
                ($scope.positiveAdj = {}),
                  ($scope.configuredItems = obj.configuredItems),
                  ($scope.disableQty = false),
                  ($scope.allStatus = []),
                  ($scope.scannedItem = ""),
                  ($scope.searchName = ""),
                  ($scope.searchText = "");
                if ($scope.itemData.preBin) {
                  $scope.setPreferedBin();
                }
                var myModalEl = document.getElementById("exampleModal");
                $scope.myModal = new bootstrap.Modal(myModalEl, {
                  keyboard: false,
                });
                $scope.myModal.show();
              } else {
                $scope.itemData = {};
                $scope.scannedItem = "";
                $scope.searchName = "";
                $scope.searchText = "";
                alert(data["message"]);
              }
              $scope.loading = false;
            },
            function (response) {
              $scope.loading = false;
              alert("error::::::");
            }
          );
      } else {
      }
    };
    $scope.scanSerialItem = function (serialNo) {
      if (!serialNo) {
        $scope.allStatus = [];
        $scope.positiveAdj = {};
        $scope.setPreferedBin();
        return "";
      }
      var obj = $scope.putAwayDetails.find((u) => u.invNoText == serialNo);
      if (obj) {
        var cObj = $scope.configuredItems.find((u) => u.serialNO == serialNo);
        if (cObj) {
          alert("Serial No Already Configured!!");
          $scope.positiveAdj.serialNO = "";
          $scope.setPreferedBin();
        } else {
          $scope.allStatus.push(obj);
          $scope.disableQty = true;
          $scope.positiveAdj.qty = 1;
        }
      } else {
        alert("Serial No Doesn't Exists!!");
        $scope.positiveAdj.serialNO = "";
      }
    };
    $scope.scanLotItem = function () {
      if ($scope.positiveAdj.lotNO) {
        $scope.allStatus = $filter("filter")(
          $scope.putAwayDetails,
          {
            invNoText: $scope.positiveAdj.lotNO,
          },
          true
        );
        if ($scope.allStatus.length <= 0) {
          $scope.positiveAdj.lotNO = "";
          return alert("LOT number not found!!");
        }
      } else {
        $scope.allStatus = [];
        $scope.positiveAdj = {};
        $scope.setPreferedBin();
      }
    };
    $scope.scanItemUpc = function (itemUpc) {
      if (!itemUpc) {
        $scope.allStatus = [];
        $scope.positiveAdj = {};
        $scope.setPreferedBin();
        return;
      }

      if (
        $scope.itemData.itemName == itemUpc ||
        $scope.itemData.upc == itemUpc
      ) {
        $scope.allStatus = $scope.putAwayDetails;
      } else {
        alert("Invalid Item/UPC!!");
        $scope.positiveAdj.itemOrUpc = "";
      }
    };
    $scope.selectPosStatus = function () {
      if ($scope.positiveAdj.selectedStatus) {
        var obj = $scope.allStatus.find(
          (u) => u.invStatusId == $scope.positiveAdj.selectedStatus
        );
        $scope.positiveAdj.selectedStatusText = obj["invStatus"];
        $scope.positiveAdj.avlQty = obj["onHand"];
        $scope.positiveAdj.date = obj["date"];
      } else {
        $scope.positiveAdj.selectedStatusText = "";
      }
    };
    $scope.selectPosBin = function () {
      if ($scope.positiveAdj.binNO) {
        var obj = $scope.allBins[$scope.positiveAdj.binNO];
        $scope.positiveAdj.binNoText = obj["value"];
      } else {
        $scope.positiveAdj.binNoText = "";
      }
    };
    $scope.addPosConfiguredItem = function () {

      var avlQty = $scope.itemData.qty;
      var putawayQty = parseFloat($scope.itemData.putAwayQty);
      var currentQty = parseFloat($scope.positiveAdj.qty);
      var totalQty = putawayQty + currentQty;

      if (avlQty < totalQty) {
        alert("You only have " + avlQty + " availabe. Please enter a different quanity.")

        return $scope.positiveAdj.qty = "";
      }

      if (
        !$scope.positiveAdj.lotNO &&
        $scope.setUpData["useLot"] == true &&
        $scope.itemData["isLotItem"] == true
      ) {
        return alert("Please scan LOT No!!");
      }
      if (
        !$scope.positiveAdj.serialNO &&
        $scope.setUpData["useSerial"] == true &&
        $scope.itemData["isSerialItem"] == true
      ) {
        return alert("Please scan Serial No!!");
      }
      if (
        !$scope.positiveAdj.binNO &&
        $scope.setUpData["useBins"] == true &&
        $scope.itemData["isBinItem"] == true
      ) {
        return alert("Please select Bin No!!");
      }
      if (
        !$scope.positiveAdj.selectedStatus &&
        $scope.setUpData["useInvStatus"] == true
      ) {
        return alert("Please select status!!");
      }
      if (!$scope.positiveAdj.qty) {
        return alert("Please enter quantity!!");
      } else {
        if (Number($scope.positiveAdj.qty) <= 0) {
          $scope.positiveAdj.qty = "";
          return alert("Quantity should be greaterthan zero!!");
        }
      }
      const result = $scope.configuredItems.find(
        (item) =>
          item.lotNO == $scope.positiveAdj.lotNO &&
          item.binNO == $scope.positiveAdj.binNO &&
          item.selectedStatus == $scope.positiveAdj.selectedStatus
      );
      if (result) {
        alert("Configured with same data already!!");
        $scope.positiveAdj = {};
        return $scope.setPreferedBin();
      }
      $scope.calculateTotalQty();
      $scope.configuredItems.push($scope.positiveAdj);
      $scope.positiveAdj = {};
      $scope.setPreferedBin();
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
          $scope.itemObj = $scope.itemData;
          const index = $scope.binPutAwayItems.findIndex(
            (item) => item.itemName == $scope.itemObj.itemName
          );
          if (index > -1) {
            $scope.binPutAwayItems[index]["putAwayQty"] =
              $scope.itemObj["putAwayQty"];
            $scope.binPutAwayItems[index]["configuredItems"] =
              $scope.configuredItems;
          }
          //c("$scope.backUpRecordData!!" + JSON.stringify($scope.backUpRecId));
        },
        function (response) {
          $scope.loading = false;
          alert("error::::::");
        }
      );
    };
    $scope.approveCompleteBackUp = function () {
      // $scope.backUpRecId = 256;
      if ($scope.backUpRecId <= 0) {
        return alert("Please Setup Data..!!");
      }
      $scope.loading = true;
      var dataObj = {
        recId: $scope.backUpRecId,
      };
      $http
        .post(ajaxUrl + "&ref=apprCmpltBackup", JSON.stringify(dataObj))
        .then(
          function (response) {
            var data = response["data"];
            $scope.loading = false;
            alert(
              "BinPut Away Worksheet created successfully " + data.tranIdText
            );
            $window.location.reload();
          },
          function (response) {
            $scope.loading = false;
            alert("error::" + response.data);
          }
        );
    };
  }
);
