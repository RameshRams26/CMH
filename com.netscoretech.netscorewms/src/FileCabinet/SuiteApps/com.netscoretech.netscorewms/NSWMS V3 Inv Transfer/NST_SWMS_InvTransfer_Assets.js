var app = angular.module("myApp", []);
// alert(app);
app.controller(
  "invtransferController",
  function ($scope, $http, $window, $timeout, $filter) {
    c = console.log.bind(document);
    $scope.urlObj = document.getElementById("myDataObj").innerHTML;
    $scope.urlObj = JSON.parse($scope.urlObj);
    var ajaxUrl = $scope.urlObj["ajaxUrl"];
    var loginUrl = $scope.urlObj["logIn"];
    ($scope.loading = false), ($scope.disableToLocation = false);
    $scope.backUpRecId, $scope.backUpRecText, ($scope.backUpRecordData = {});
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
            $scope.locationList = response["data"]["locations"];
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
      var flage = false;
      $scope.results = [];
      $scope.showSuggestions = false;
      if ($scope.searchText.length >= 4) {
        angular.forEach($scope.items, function (item) {
          if (
            item.name.toLowerCase().indexOf($scope.searchText.toLowerCase()) >=
            0
          ) {
            $scope.results.push(item);
            flage = true;
          }
        });
        $scope.showSuggestions = true;
      }
      if ($scope.searchText.length >= 4 && flage == false) {
        alert("Item not found!!");
        $scope.searchText = "";
        document.getElementById("myInput").focus();
        return false;
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
    // function myClick(event) {
    //   if (event.data[1] == "scanning") {
    //     $scope.scannedItem = event.data[0];
    //     $scope.getItemDetails();
    //   }
    //   if (event.data[1] == "serial") {
    //     $scope.$apply(function () {
    //       $scope.positiveAdj.serialNO = event.data[0];
    //       $scope.scanSerialItem($scope.positiveAdj.serialNO);
    //     });
    //   }
    //   $window.removeEventListener("message", myClick);
    // }

    $scope.openScanner = function () {
      $window.parent.postMessage(
        { func: "pickscanBarcodeforV3", message: "scanning" },
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
      /* $timeout(function () {
        document.getElementById(fieldId).focus();
      }); */
      var element = document.getElementById(fieldId);
      if(element){
        element.focus();
      }
    };
    $scope.getItemDetails = function () {
      if (!$scope.toLocation) {
        $scope.scannedItem = "";
        $scope.searchName = "";
        $scope.searchText = "";
        return alert("Please select TO LOCATION!!.");
      }
      if ($scope.scannedItem || $scope.searchName) {
        var item = "";
        if ($scope.scannedItem) {
          item = $scope.scannedItem;
        } else {
          item = $scope.searchName;
        }
        if (item) {
          console.log(item);
          var obj = $scope.items.find((e)=> e.name == item || e.upc == item);
          console.log(obj);
          if (obj) {
            item = obj.id
          } else {
            return alert ('Item not found!!');
          }
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
              $scope.urlObj["locationId"] +
              "&tolocationId=" +
              $scope.toLocation
          )
          .then(
            function (response) {
              var data = response["data"];
              if (data["status"] == "success") {
                $scope.itemData = data;
                c(JSON.stringify($scope.itemData));
                $scope.allBins = $scope.itemData.allBins;
                $scope.allStatus = $scope.itemData.allStatus;
                $scope.invTransData = $scope.itemData.invTransData;
                $scope.binsWithQty = []
                $scope.inventoryDetail = $scope.itemData?.invBalance?.[$scope.urlObj["locationId"]]?.['inventoryDetail'];
               //$scope.inventoryDetail = $scope.itemData.invBalance;
                console.log($scope.inventoryDetail);
                if ($scope.itemData['isSerialItem'] == true) {
                  $scope.findBinCount( $scope.inventoryDetail  , 'binNoText');
                } else {
                  $scope.inventoryDetail?.forEach(element => {
                    if (element.binNoText) {
                      $scope.binsWithQty.push({binNo : element.binNo, binNoText : element.binNoText , binCount : element.available})  
                    }
                  });
                }
                delete $scope.itemData.allBins;
                delete $scope.itemData.allStatus;
                delete $scope.itemData.invTransData;
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
                setTimeout(() => {
                  $scope.moveFocusToNextField('modelItem');
                }, 2000);
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
              alert("error::::::");
              $scope.scannedItem = "";
              $scope.searchName = "";
              $scope.searchText = "";
              $scope.loading = false;
            }
          );
      } else {
      }
    };
    $scope.setPreferedBin = function () {
      $scope.positiveAdj.toBinNo = $scope.itemData.preBin;
      $scope.positiveAdj.toBinNoText = $scope.itemData.preBinText;
      $scope.positiveAdj.toStatusId = "1";
      $scope.positiveAdj.toStatusIdText = "Good";
    };
    $scope.enterQuantity = function () {
      // var adjQty = Math.trunc($scope.positiveAdj.adjQty);
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
        if ($scope.setUpData["useInvStatus"] == true) {
          alert("Please select from status..!");
          $scope.positiveAdj.adjQty = 0;
        }
      }
      // if($scope.positiveAdj.adjQty == adjQty){
      //   alert()
      // }
    };
    $scope.scanLotItem = function () {
      if ($scope.positiveAdj.lotNO) {
        if ($scope.itemData["isBinItem"] == true) {
          $scope.fromBinAllStatus = $filter("filter")(
            $scope.invTransData,
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
          $scope.fromStatus = $filter("filter")(
            $scope.invTransData,
            {
              invNoText: $scope.positiveAdj.lotNO,
            },
            true
          );
          if ($scope.fromStatus.length <= 0) {
            $scope.positiveAdj.lotNO = "";
            $scope.moveFocusToNextField("modelItem");
            return alert("LOT number not found!!");
          }

          $scope.moveFocusToNextField("fromStatus");
        }
      } else {
        $scope.fromBinAllStatus = [];
        $scope.fromBins = [];
        $scope.positiveAdj = {};
        $scope.setPreferedBin();
      }
    };
    $scope.scanSerialItem = function (serialNo , transferAll) {
      if (!serialNo) {
        $scope.fromBins = [];
        $scope.fromStatus = [];
        $scope.positiveAdj = {};
        $scope.setPreferedBin();
        return "";
      }
      var obj = $scope.invTransData.find((u) => u.invNoText == serialNo);
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
          if (transferAll) {
            $scope.addPosConfiguredItem();
          }
          $scope.moveFocusToNextField("toBinNO")
        }
      } else {
        alert("Serial No Doesn't Exists!!");
        $scope.positiveAdj.serialNO = "";
        $scope.moveFocusToNextField("modelItem")
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
        $scope.fromBins = $scope.invTransData;
        $scope.fromStatus = $scope.invTransData;
        if ($scope.fromStatus.length == 1) {
          $scope.positiveAdj.avlQty = $scope.fromStatus[0]["avlQty"];
        }
        var focusField =
        $scope.itemData?.isBinItem == true ? "fromBin" : "adjQty";
        $scope.moveFocusToNextField(focusField);
      } else {
        alert("Invalid Item/UPC!!");
        $scope.positiveAdj.itemOrUpc = "";
        $scope.moveFocusToNextField("modelItem")
        $scope.setPreferedBin();
      }
    };
    $scope.selectFromBin = function () {
      console.log("A::", $scope.positiveAdj);
      if ($scope.positiveAdj.fromBinNO) {
        $scope.fromStatus = $filter("filter")(
          $scope.fromStatus,
          {
            binNO: $scope.positiveAdj.fromBinNO,
          },
          true
        );
        var obj = $scope.fromBins.find(
          (u) => u.binNO == $scope.positiveAdj.fromBinNO
        );
        $scope.positiveAdj.fromBinNOText = obj["binNOText"];
        $scope.positiveAdj.avlQty = obj["avlQty"];
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
        $scope.moveFocusToNextField("adjQty");
      } else {
        $scope.positiveAdj.toBinNoText = "";
      }
    };
    $scope.openScanner = function (from) {
      $window.parent.postMessage(
        { func: "pickscanBarcodeforV3", message: from },
        "*"
      );
      $window.addEventListener("message", myClick);
    };
    function myClick(event) {
      console.log(event);
      if (event.data[1] == "scannedItem") {
        $scope.$apply(function () {
          $scope.scannedItem = event.data[0];
          $scope.getItemDetails();
        });
      } else if (event.data[1] == "upc") {
        $scope.$apply(function () {
          $scope.positiveAdj.itemOrUpc = event.data[0];
          $scope.scanItemUpc($scope.positiveAdj.itemOrUpc);
        });
      }
      else if (event.data[1] == "serial") {
        $scope.$apply(function () {
          $scope.positiveAdj.serialNO = event.data[0];
          $scope.scanSerialItem($scope.positiveAdj.serialNO);
        });
      } else if (event.data[1] == "lot") {
        $scope.$apply(function () {
          $scope.positiveAdj.lotNO = event.data[0];
          $scope.scanLotItem();
        });
      } 
      $window.removeEventListener("message", myClick);
    }
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
        if ($scope.setUpData["useInvStatus"] == true) {
          $scope.positiveAdj.avlQty = "";
        }
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

      if (
        !$scope.positiveAdj.fromBinNO &&
        $scope.itemData["isBinItem"] == true &&
        $scope.setUpData["useBins"] == true
      ) {
        return alert("Please select From Bin!!");
      }
      if (
        !$scope.positiveAdj.toBinNO &&
        $scope.itemData["isBinItem"] == true &&
        $scope.setUpData["useBins"] == true
      ) {
        return alert("Please select To Bin!!");
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
      if ($scope.positiveAdj.avlQty < $scope.positiveAdj.adjQty) {
        $scope.positiveAdj.adjQty = '';
        $scope.moveFocusToNextField('adjQty');
        return alert('Please check available quantity!!')
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
        $scope.searchBinText = '';
        document.getElementById('toBinNO').value = '';
        $scope.setPreferedBin();
        $scope.moveFocusToNextField("modelItem");
        return;
      }
      $scope.configuredItems.push($scope.positiveAdj);
      c(JSON.stringify($scope.configuredItems));
      $scope.positiveAdj = {};
      $scope.searchBinText = '';
      //document.getElementById('toBinNO').value = '';
      $scope.moveFocusToNextField("modelItem");
      $scope.setPreferedBin();
    };
    $scope.deleteConfiguredItem = function (index) {
      const confirmation = confirm("Are you sure you want to delete?");
      if (confirmation) {
        $scope.configuredItems.splice(index, 1);
        $scope.moveFocusToNextField('modelItem');
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
          if (!$scope.disableToLocation) {
            $scope.disableToLocation = true;
          }
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
    $scope.logOut = function () {
      const confirmation = confirm("Are you sure you want to logout?");
      if (confirmation) {
        $window.location.href = $scope.urlObj["logIn"];
      }
    };
    $scope.approveCompleteBackUp = function () {
      //$scope.backUpRecId = 281;
      if (!$scope.backUpRecId) {
        return alert("Please add atleast one item.");
      }
      $scope.loading = true;
      var dataObj = {
        recId: $scope.backUpRecId,
        toLocation: $scope.toLocation,
      };
      $http
        .post(ajaxUrl + "&ref=apprCmpltBackup", JSON.stringify(dataObj))
        .then(
          function (response) {
            var data = response["data"];
            $scope.loading = false;
            alert(
              "Inventory Transfer created successfully!!" + data.tranIdText
            );
            $window.location.reload();
          },
          function (response) {
            $scope.loading = false;
            alert("error::" + response.data);
          }
        );
    };
    $scope.selectToLocation = function () {
      if (toLocation) {
          $scope.moveFocusToNextField('scanitem');
      }
    }
    $scope.showBinsCard = false;
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
    }; 
    $scope.showBinsQtyCard = function() {
      $scope.showBinsCard = !$scope.showBinsCard;
      if ($scope.showBinsCard) {
        $scope.moveFocusToNextField('toBinNO');
      }
    }
    $scope.searchBins = function (searchBinText) {
      $scope.binResults = [];
      $scope.showBinSuggestions = false;
      $scope.searchBinText = searchBinText
      if ($scope.searchBinText.length >= 1) {
        angular.forEach($scope.allBins, function (bin) {
          //  console.log(bin);
          if (
            bin.value.toLowerCase().indexOf($scope.searchBinText.toLowerCase()) >=
            0
          ) {
            $scope.binResults.push(bin);
          }
        });
        $scope.showBinSuggestions = true;
      }
    };
    $scope.selectBinResult = function (result) {
      $scope.binResults = [];
      $scope.showBinSuggestions = false;
      if (result.value) {
        $scope.searchBinText = result.value;
       document.getElementById('toBinNO').value = result.value;
        if ($scope.positiveAdj) {
          $scope.positiveAdj.toBinNO = result.id;
        }
        $scope.moveFocusToNextField('adjQty');
       // $scope.searchName = result.value;
       // $scope.scannedBin = result.value;
       $scope.selectToBin();
      } else {
        $scope.searchBinText = "";
        document.getElementById('toBinNO').value = '';
      }
    };
    $scope.transferAll = function (binNo , binNoText, searchBinText) {
        console.log(binNo , binNoText, searchBinText);
        if (!searchBinText) {
          alert("Please Select To Bin!!");
        } else {
          if ($scope.itemData.isSerialItem) {
              console.log($scope.inventoryDetail[0]);
            for (let i = 0; i < $scope.inventoryDetail.length; i++) {
              if ($scope.inventoryDetail[i].binNoText == binNoText) {
                $scope.positiveAdj.toBinNO = searchBinText;
                var obj = $scope.allBins[$scope.positiveAdj.toBinNO];
                $scope.positiveAdj.toBinNOText = obj?.value;
                $scope.positiveAdj.toBinNoText = obj?.value;
                $scope.positiveAdj.serialNO =$scope.inventoryDetail[i].invNoText;
                $scope.scanSerialItem($scope.positiveAdj.serialNO, true);
              }
            }
          } else {
              $scope.positiveAdj.itemOrUpc = $scope.itemData.itemName;
              $scope.scanItemUpc($scope.positiveAdj.itemOrUpc);
              $scope.positiveAdj.toBinNO = searchBinText;
              var toBinObj = $scope.allBins[$scope.positiveAdj.toBinNO];
              $scope.positiveAdj.toBinNOText = toBinObj?.value;
              $scope.positiveAdj.toBinNoText = toBinObj?.value;
              $scope.positiveAdj.fromBinNO = binNo;
              var fromBinObj = $scope.allBins[$scope.positiveAdj.fromBinNO];
              $scope.positiveAdj.fromBinNOText = fromBinObj?.value;
              $scope.selectFromBin()
              $scope.positiveAdj.adjQty = $scope.positiveAdj.avlQty;
              $scope.addPosConfiguredItem();
          }
        }
      };
    $scope.moveFocusToNextField("toLocation");
  }
);
