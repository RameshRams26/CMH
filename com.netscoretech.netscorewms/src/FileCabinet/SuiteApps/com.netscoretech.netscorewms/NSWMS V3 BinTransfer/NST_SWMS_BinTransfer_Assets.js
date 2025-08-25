var app = angular.module("myApp", []);
// alert(app);
app.controller(
  "bintransferController",
  function ($scope, $http, $window, $filter, $timeout) {
    c = console.log.bind(document);
    $scope.urlObj = document.getElementById("myDataObj").innerHTML;
    $scope.urlObj = JSON.parse($scope.urlObj);
    var ajaxUrl = $scope.urlObj["ajaxUrl"];
    ($scope.loading = false),
      $scope.backUpRecId,
      $scope.backUpRecText,
      ($scope.backUpRecordData = {});
    $scope.noOfItems = Object.keys($scope.backUpRecordData).length;
    $scope.goBack = function () {
      $window.history.back();
    };

  $scope.showBinsCard = false;

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
            $scope.items = response["data"]["allItems"];
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
      $scope.scannedItem = $scope.searchText
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
    $scope.increment = function () {
      if (!$scope.positiveAdj.adjQty) {
        $scope.positiveAdj.adjQty = 1;
        $scope.enterQuantity();
      } else {
        $scope.positiveAdj.adjQty++;
        $scope.enterQuantity();
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

    $scope.getItemDetails = function () {
      if ($scope.scannedItem || $scope.searchName) {
        var item = "";
        if ($scope.scannedItem) {
          item = $scope.scannedItem;
        } else {
          item = $scope.searchName;
        }
        //alert(item)
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

                $scope.itemNameTrim = $scope.itemData["itemName"];
                if ($scope.itemData['isBinItem'] == false) {
                  $scope.loading = false;
                  $scope.scannedItem = '';
                  $scope.searchText = '';
                  $scope.searchName = ''
                  $scope.moveFocusToNextField('scanitem');
                  return alert('Scanned item is not a bin enabled item');
                }
                var modifiedItemName;
                if ($scope.itemNameTrim.length > 10) {
                  modifiedItemName =
                    $scope.itemNameTrim.substring(0, 10) + "...";
                  $scope.itemNameTrim = modifiedItemName;
                }
                $scope.allBins = $scope.itemData.allBins;
                $scope.allStatus = $scope.itemData.allStatus;
                $scope.binTransData = $scope.itemData.binTransData;
                c(JSON.stringify($scope.itemData));
                delete $scope.itemData.allBins;
                delete $scope.itemData.allStatus;
                delete $scope.itemData.binTransData;
                ($scope.positiveAdj = {}),
                  ($scope.disableQty = false),
                  ($scope.configuredItems = []),
                  ($scope.fromBins = []),
                  ($scope.fromStatus = []);
                if ($scope.itemData.preBin) {
                  $scope.setPreferedBin();
                }
                if ($scope.backUpRecordData[$scope.itemData["itemName"]]) {
                  var iObj =
                    $scope.backUpRecordData[$scope.itemData["itemName"]];
                  $scope.configuredItems = iObj.configData;
                }
                var myModalEl = document.getElementById("exampleModal");
                $scope.myModal = new bootstrap.Modal(myModalEl, {
                  keyboard: false,
                });
                $scope.myModal.show();

                //to sum the available quantity of the same bin number
                $scope.binsWithQty = [];

                console.log('hello', $scope.itemData);

                if ($scope.itemData["isSerialItem"]) {
                  $scope.findBinCount($scope.binTransData, "binNOText");
                } else {
                  const binMap = {}; // Object to store bins grouped by binNOText

                  $scope.binTransData?.forEach((element) => {
                    if (element.binNOText) {
                      if (!binMap[element.binNOText]) {
                        binMap[element.binNOText] = {
                          binNOText: element.binNOText,
                          binCount: 0, // Initialize binCount to 0
                        };
                      }

                      const availableQty = parseFloat(element.available) || 0; // Ensure available is a valid number
                      binMap[element.binNOText].binCount += availableQty; // Add available to binCount
                    }
                  });

                  // Convert binMap back to an array for display
                  $scope.binsWithQty = Object.values(binMap);

                  console.log('Bins with quantities:', $scope.binsWithQty);
                }
                

              } else {
                $scope.itemData = {};
                alert(data["message"]);
              }
              $scope.scannedItem = "";
              $scope.searchName = "";
              $scope.searchText = "";
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

    $scope.setPreferedBin = function () {
      $scope.positiveAdj.toBinNO = $scope.itemData.preBin;
      $scope.positiveAdj.toBinNOText = $scope.itemData.preBinText;
      $scope.positiveAdj.toStatusId = "1";
      $scope.positiveAdj.toStatusIdText = "Good";
    };
    $scope.enterQuantity = function () {
      if ($scope.positiveAdj.fromStatusId) {
        if (
          Number($scope.positiveAdj.adjQty) > Number($scope.positiveAdj.avlQty)
        ) {
          alert(
            "You only have " +
              $scope.positiveAdj.avlQty +
              " available. Please enter a different quantity."
          );
          $scope.positiveAdj.adjQty = 0;
        }
      } else {
        alert("Please select from status..!");
        $scope.positiveAdj.adjQty = 0;
      }
    };
    $scope.scanLotItem = function () {
      if ($scope.positiveAdj.lotNO) {
        $scope.fromBinAllStatus = $filter("filter")(
          $scope.binTransData,
          {
            invNoText: $scope.positiveAdj.lotNO,
          },
          true
        );
        if ($scope.fromBinAllStatus.length <= 0) {
          $scope.positiveAdj.lotNO = "";
          $scope.moveFocusToNextField("modelItem");
          return alert("LOT number not found!!");
        }
        $scope.fromBins = $filter("filter")(
          $scope.fromBinAllStatus,
          function (value, index, self) {
            return (
              self.findIndex((item) => item.binNO === value.binNO) === index
            );
          }
        );
        $scope.moveFocusToNextField("fromBin");
      } else {
        $scope.fromBinAllStatus = [];
        $scope.fromBins = [];
        $scope.positiveAdj = {};
        $scope.setPreferedBin();
      }
    };
    $scope.scanSerialItem = function (serialNo) {
      if (!serialNo) {
        $scope.fromBins = [];
        $scope.fromStatus = [];
        $scope.positiveAdj = {};
        $scope.setPreferedBin();
        return "";
      }
      var obj = $scope.binTransData.find((u) => u.invNoText == serialNo);
      if (obj) {
        var cObj = $scope.configuredItems.find((u) => u.serialNO == serialNo);
        if (cObj) {
          alert("Serial No Already Configured!!");
          $scope.positiveAdj.serialNO = "";
          $scope.setPreferedBin();
        } else {
          $scope.fromBins.push(obj);
          $scope.fromStatus.push(obj);
          $scope.positiveAdj.fromBinNOText = obj.binNOText;
          $scope.positiveAdj.fromBinNO = obj.binNO;
          $scope.positiveAdj.fromBinNOText = obj.binNOText;
          $scope.positiveAdj.fromBinNO = obj.binNO;
          $scope.positiveAdj.fromStatusIdText = obj["invStatus"];
          $scope.positiveAdj.fromStatusId = obj["invStatusId"];
          $scope.positiveAdj.avlQty = obj["onHand"];
          $scope.positiveAdj.adjQty = 1;
          $scope.disableQty = true;
          $scope.positiveAdj.available = obj["available"];
        }
      } else {
        alert("Serial No Doesn't Exists!!");
        $scope.positiveAdj.serialNO = "";
      }
    };
    $scope.scanItemUpc = function (itemUpc) {
      if (!itemUpc) {
        $scope.fromBins = [];
        $scope.fromStatus = [];
        $scope.positiveAdj = {};
        $scope.setPreferedBin();
        return;
      }

      if (
        $scope.itemData.itemName == itemUpc ||
        $scope.itemData.upc == itemUpc
      ) {
        $scope.fromBins = $scope.binTransData;
        $scope.fromBinAllStatus = $scope.binTransData;
        $scope.moveFocusToNextField("fromBin");
      } else {
        alert("Invalid Item/UPC!!");
        $scope.positiveAdj.itemOrUpc = "";
        $scope.setPreferedBin();
      }
    };
    $scope.selectFromBin = function () {
      if ($scope.positiveAdj.fromBinNO) {
        $scope.fromStatus = $filter("filter")(
          $scope.fromBinAllStatus,
          {
            binNO: $scope.positiveAdj.fromBinNO,
          },
          true
        );
        var obj = $scope.fromBins.find(
          (u) => u.binNO == $scope.positiveAdj.fromBinNO
        );
        $scope.positiveAdj.fromBinNOText = obj["binNOText"];
        $scope.moveFocusToNextField("toBinNO");
        $scope.selectFromStatus();
      } else {
        $scope.fromStatus = [];
        $scope.positiveAdj.fromBinNOText = "";
        $scope.positiveAdj.toBinNO = "";
        $scope.positiveAdj.toBinNoText = "";
        $scope.positiveAdj.avlQty = "";
      }
      $scope.positiveAdj.adjQty = "";
    };
    $scope.selectToBin = function () {
      if ($scope.positiveAdj.toBinNO) {
        var obj = $scope.allBins[$scope.positiveAdj.toBinNO];
        $scope.positiveAdj.toBinNoText = obj["value"];
        $scope.moveFocusToNextField("fromStatus");
      } else {
        $scope.positiveAdj.toBinNoText = "";
      }
    };
    $scope.selectFromStatus = function () {
      if ($scope.positiveAdj.fromStatusId) {
        var obj = $scope.fromStatus.find(
          (u) => u.invStatusId == $scope.positiveAdj.fromStatusId
        );
        if (!obj) {
          obj = { fromStatusIdText: "", avlQty: "", date: "" };
        }
        $scope.positiveAdj.fromStatusIdText = obj["invStatus"];
        $scope.positiveAdj.avlQty = obj["onHand"];
        $scope.positiveAdj.date = obj["date"];
        $scope.moveFocusToNextField("toStatus");
      } else {
        $scope.positiveAdj.fromStatusIdText = "";
        $scope.positiveAdj.avlQty = "";
        $scope.positiveAdj.date = "";
      }
    };
    $scope.selectToStatus = function () {
      if ($scope.positiveAdj.toStatusId) {
        var obj = $scope.allStatus[$scope.positiveAdj.toStatusId];
        $scope.positiveAdj.toStatusIdText = obj["value"];
        $scope.moveFocusToNextField("adjQty");
      } else {
        $scope.positiveAdj.toStatusIdText = "";
      }
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
        !$scope.positiveAdj.serialNO &&
        $scope.setUpData["useSerial"] == true &&
        $scope.itemData["isSerialItem"] == true
      ) {
        return alert("Please scan Serial No!!");
      }

      if (
        !$scope.positiveAdj.itemOrUpc &&
        $scope.setUpData["useSerial"] == false &&
        $scope.setUpData["useLot"] == false
      ) {
        return alert("Please Scan Item/UPC!!");
      }

      if (!$scope.positiveAdj.fromBinNO) {
        return alert("Please select From Bin!!");
      }
      if (!$scope.positiveAdj.toBinNO) {
        return alert("Please select To!!");
      }
      if ($scope.positiveAdj.fromBinNO == $scope.positiveAdj.toBinNO) {
        return alert("The from and to bins must be different!!");
      }
      if (
        !$scope.positiveAdj.fromStatusId &&
        $scope.setUpData["useInvStatus"] == true
      ) {
        return alert("Please select From Status!!");
      }
      if (
        !$scope.positiveAdj.toStatusId &&
        $scope.setUpData["useInvStatus"] == true
      ) {
        return alert("Please select To Status!!");
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
      if ($scope.positiveAdj.lotNO) {
        result = $scope.configuredItems.find(
          (item) =>
            item.lotNO == $scope.positiveAdj.lotNO &&
            item.fromBinNO == $scope.positiveAdj.fromBinNO &&
            item.toBinNO == $scope.positiveAdj.toBinNO &&
            item.fromStatusId == $scope.positiveAdj.fromStatusId &&
            item.toStatusId == $scope.positiveAdj.toStatusId
        );
      } else if ($scope.positiveAdj.itemOrUpc) {
        result = $scope.configuredItems.find(
          (item) =>
            item.lotNO == $scope.positiveAdj.lotNO &&
            item.fromBinNO == $scope.positiveAdj.fromBinNO &&
            item.toBinNO == $scope.positiveAdj.toBinNO &&
            item.fromStatusId == $scope.positiveAdj.fromStatusId &&
            item.toStatusId == $scope.positiveAdj.toStatusId
        );
      }

      if (result) {
        alert("Configured with same data already!!");
        $scope.positiveAdj = {};
        $scope.setPreferedBin();
        $scope.moveFocusToNextField("modelItem");
        return;
      }
      $scope.configuredItems.push($scope.positiveAdj);
      c(JSON.stringify($scope.configuredItems));
      $scope.positiveAdj = {};
      $scope.moveFocusToNextField("modelItem");
      $scope.setPreferedBin();
    };
    $scope.deleteConfiguredItem = function (index) {
      const confirmation = confirm("Are you sure you want to delete?");
      if (confirmation) {
        $scope.configuredItems.splice(index, 1);
      }
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
          var totalQty = $scope.configuredItems.reduce(
            (total, item) => total + parseInt(item.adjQty, 10),
            0
          );
          $scope.itemObj.adjQty = totalQty;
          $scope.itemObj.configData = $scope.configuredItems;
          $scope.backUpRecordData[$scope.itemObj.itemName] = $scope.itemObj;
          $scope.noOfItems = Object.keys($scope.backUpRecordData).length;
          c(
            "$scope.backUpRecordData!!" +
              JSON.stringify($scope.backUpRecordData)
          );
        },
        function (response) {
          $scope.loading = false;
          alert("error::::::");
        }
      );
    };
    $scope.approveCompleteBackUp = function () {
      //$scope.backUpRecId = 259;
      if (!$scope.backUpRecId) {
        return alert("Please add atleast one item.");
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
              "BinTransfer created successfully " + data.tranIdText
            );
            $window.location.reload();
          },
          function (response) {
            $scope.loading = false;
            alert("error::" + response.data);
          }
        );
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

    $scope.moveFocusToNextField("searchItem");
  }
);
