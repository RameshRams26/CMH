var app = angular.module("myApp", []);
app.controller(
  "invStatusChangeController",
  function ($scope, $window, $http, $filter, $timeout) {
    c = console.log.bind(document);
    $scope.urlObj = document.getElementById("myDataObj").innerHTML;
    $scope.urlObj = JSON.parse($scope.urlObj);
    var ajaxUrl = $scope.urlObj["ajaxUrl"];
    ($scope.loading = false),
      $scope.backUpRecId,
      $scope.backUpRecText,
      ($scope.backUpRecordData = []),
      $scope.isPositive;

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
            $scope.allStatus = response['data']['allStatus'];
            c("SetupData::" + JSON.stringify($scope.setUpData));
            $scope.loading = false;
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
    $scope.getSetUpData();
    $scope.scannedItem;

    //Auto suggestions
    $scope.searchText = "";
    $scope.results = [];
    $scope.showSuggestions = false;
    $scope.search = function (searchText) {
      $scope.searchText = searchText;
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
        if ($scope.results.length === 0) {
          alert("No matching items found.");
          $scope.searchText = "";
          $scope.moveFocusToNextField("myInput");
        }
      }
    };
    //deleting in netsuite
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
      } else if ($scope.isPositive) {
        if (event.data[1] == "upc") {
          $scope.$apply(function () {
            $scope.positiveAdj.itemOrUpc = event.data[0];
            $scope.scanItemUpc($scope.positiveAdj.itemOrUpc);
          });
        } else if (event.data[1] == "serial") {
          $scope.$apply(function () {
            $scope.positiveAdj.serialNO = event.data[0];
            $scope.scanSerialItem($scope.positiveAdj.serialNO);
          });
        } else if (event.data[1] == "lot") {
          $scope.$apply(function () {
            $scope.positiveAdj.lotNO = event.data[0];
            $scope.scanLotItem();
          });
        } else if (event.data[1] == "bin") {
          var result = findObjectByValue($scope.allBins, event.data[0]);

          if (result) {
            $scope.$apply(function () {
              $scope.positiveAdj.binNO = result["id"];
              $scope.positiveAdj.binNoText = result["value"];
              $scope.moveFocusToNextField("selectStatus");
            });
          } else {
            return alert("Bin not found!!");
          }
        }
      } else {
        if (event.data[1] == "upc") {
          $scope.$apply(function () {
            $scope.negativeAdj.itemOrUpc = event.data[0];
            $scope.scanItemUpc($scope.negativeAdj.itemOrUpc);
          });
        } else if (event.data[1] == "serial") {
          $scope.$apply(function () {
            $scope.negativeAdj.serialNO = event.data[0];
            $scope.scanSerialItem($scope.negativeAdj.serialNO);
          });
        } else if (event.data[1] == "lot") {
          $scope.$apply(function () {
            $scope.negativeAdj.lotNO = event.data[0];
            $scope.scanLotItem();
          });
        }
      }
      $window.removeEventListener("message", myClick);
    }
    $scope.openScanner = function (from) {
      $scope.from = from;
      $window.parent.postMessage(
        { func: "pickscanBarcode", message: $scope.from },
        "*"
      );
      $window.addEventListener("message", myClick);
    };
    function findObjectByValue(obj, value) {
      for (var key in obj) {
        if (obj[key].value === value) {
          return obj[key];
        }
      }
      return null; // Return null if not found
    }

    // Call the function to find the object with "Staging bin" value
    $scope.getItemDetails = function () {
      if ($scope.scannedItem || $scope.searchName) {
        $scope.loading = true;
        var item = "";
        if ($scope.scannedItem) {
          item = $scope.scannedItem;
        } else {
          item = $scope.searchName;
        }
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
              "&fromStatus=" +
              $scope.selectedFromStatus
          )
          .then(
            function (response) {
              var data = response["data"];
              if (data["status"] == "success") {
                $scope.itemData = data;
                $scope.invBalance =
                  $scope.itemData.invBalance[$scope.urlObj["locationId"]];
                $scope.preferdBins = $scope.itemData.preferdBins;
                delete $scope.itemData.invBalance;
                delete $scope.itemData.preferdBins;
                $scope.scannedItem = "";
                $scope.searchName = "";
                $scope.searchText = "";
                c("$scope.itemData::" + JSON.stringify($scope.itemData));
                c("$scope.invBalance::" + JSON.stringify($scope.invBalance));
                c("$scope.preferdBins::" + JSON.stringify($scope.preferdBins));
                c("$scope.allBins::" + JSON.stringify($scope.allBins));
                c("$scope.allStatus::" + JSON.stringify($scope.allStatus));

                ($scope.isPositive = true), ($scope.disableQty = false);
                ($scope.positiveAdj = {}),
                  ($scope.negativeAdj = {}),
                  ($scope.negativeBins = []),
                  ($scope.negativeStatus = []),
                  ($scope.negBinsAllStatus = []),
                  ($scope.configuredItems = []);
                $scope.posConfig, $scope.negConfig;
                var isConfigured = checkConfiguredOrNot(item);
                if (isConfigured.length) {
                  $scope.posConfig = isConfigured.find(
                    (u) => u.isPositive == true
                  );
                  $scope.negConfig = isConfigured.find(
                    (u) => u.isPositive == false
                  );
                  if ($scope.posConfig) {
                    $scope.configuredItems = $scope.posConfig.configData;
                  }
                }
                var myModalEl = document.getElementById("exampleModal");
                $scope.myModal = new bootstrap.Modal(myModalEl, {
                  keyboard: false,
                });
                $scope.myModal.show();
                $scope.myModal._element.addEventListener(
                  "shown.bs.modal",
                  function () {
                    document.getElementById("scanInvOrUpc").focus();
                  }
                );
                $scope.isPositive = false;
                $scope.selectedFromStatus = null;
                $scope.selectedToStatus = null;
                $scope.negativeAdj.itemOrUpc = $scope.itemData.itemName;
              } else {
                if ($scope.scannedItem) {
                  $scope.moveFocusToNextField("scanitem");
                } else {
                  $scope.moveFocusToNextField("myInput");
                }
                $scope.itemData = {};
                $scope.invBalance = {};
                $scope.preferdBins = {};
                $scope.allBins = {};
                $scope.allStatus = {};
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

    function checkConfiguredOrNot(itemName) {
      var configuredData = $filter("filter")(
        $scope.backUpRecordData,
        {
          itemName: itemName,
        },
        true
      );
      return configuredData;
    }

    $scope.changeAdjustmentType = function () {
      $scope.isPositive = !$scope.isPositive;
      console.log("isPositive", $scope.isPositive);
      console.log("posConfig", JSON.stringify($scope.posConfig));
      console.log("negConfig", JSON.stringify($scope.negConfig));
      if ($scope.isPositive) {
        if ($scope.posConfig) {
          $scope.configuredItems = [];
          $scope.configuredItems = $scope.posConfig.configData;
        } else {
          $scope.configuredItems = [];
        }
      } else {
        if ($scope.negConfig) {
          $scope.configuredItems = [];
          $scope.configuredItems = $scope.negConfig.configData;
        } else {
          $scope.configuredItems = [];
        }
      }
      ($scope.positiveAdj = {}), ($scope.negativeAdj = {});
      $scope.moveFocusToNextField('scanInvOrUpc');
    };

    $scope.scanLotItem = function () {
      if ($scope.isPositive) {
        if ($scope.positiveAdj.lotNO) {
          if ($scope.itemData["isBinItem"] == true) {
            $scope.moveFocusToNextField("selectBin");
          } else {
            $scope.moveFocusToNextField("selectStatus");
          }
        } else {
          $scope.moveFocusToNextField("scanInvOrUpc");
        }
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
              $scope.moveFocusToNextField("scanInvOrUpc");
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
            $scope.moveFocusToNextField("selectBin");
          } else {
            $scope.negativeBins = [];
            $scope.negBinsAllStatus = [];
            $scope.negativeAdj = {};
            $scope.moveFocusToNextField("scanInvOrUpc");
          }
        } else {
          $scope.negativeStatus = $filter("filter")(
            $scope.invBalance.inventoryDetail,
            {
              invNoText: $scope.negativeAdj.lotNO,
            },
            true
          );
          if ($scope.negativeStatus.length <= 0) {
            $scope.negativeAdj.lotNO = "";
            return alert("LOT number not found!!");
          } else if ($scope.negativeStatus.length == 1) {
            $scope.negativeAdj.selectedStatus =
              $scope.negativeStatus[0]["invStatusId"];
            $scope.selectNegStatus();
          }
          $scope.moveFocusToNextField("selectStatus");
        }
      }
    };
    $scope.scanSerialItem = function (serialNo) {
      if (!serialNo) {
        return "";
      }
      var obj = $scope.invBalance?.inventoryDetail?.find(
        (u) => u.invNoText == serialNo
      );

      if ($scope.isPositive) {
        if (obj) {
          alert("Serial No Already Exists!!");
          $scope.positiveAdj.serialNO = "";
          $scope.moveFocusToNextField("scanInvOrUpc");
        } else {
          var obj = $scope.configuredItems.find((u) => u.serialNO == serialNo);
          if (obj) {
            alert("Serial No Already Exists!!");
            $scope.positiveAdj.serialNO = "";
            $scope.moveFocusToNextField("scanInvOrUpc");
          } else {
            $scope.disableQty = true;
            $scope.positiveAdj.qty = 1;
            if ($scope.itemData["isBinItem"] == true) {
              $scope.moveFocusToNextField("selectBin");
            } else {
              $scope.moveFocusToNextField("selectStatus");
            }
          }
        }
      } else {
        if (obj) {
          const result = $scope.configuredItems.find(
            (item) => item.serialNO == serialNo
          );
          if (result) {
            alert("Configured with same data already!!");
            $scope.moveFocusToNextField("scanInvOrUpc");
            return ($scope.negativeAdj = {});
          }
          $scope.negativeAdj = {
            itemOrUpc : $scope.itemData.itemName,
            serialNO: serialNo,
            binNO: obj.binNo,
            binNoText: obj.binNoText,
            avlqty: "",
            selectedFromStatus: obj.invStatusId,
            qty: obj.onHand,
            selectedFromStatusText: obj.invStatus,
            selectedToStatus : $scope.selectedToStatus,
            selectedToStatusText : $scope.allStatus[$scope.selectedToStatus]["value"]
          };
          $scope.configuredItems.push($scope.negativeAdj);
          $scope.negativeAdj = {};
          $scope.moveFocusToNextField("scanInvOrUpc");
        } else {
          $scope.negativeAdj.serialNO = "";
          $scope.moveFocusToNextField("scanInvOrUpc");
          return alert("Serial No Not Found!!");
        }
      }
    };
    $scope.scanItemUpc = function (itemUpc) {
      if (!itemUpc) {
        return;
      }

      if (
        $scope.itemData.itemName == itemUpc ||
        $scope.itemData.upc == itemUpc
      ) {
        if ($scope.isPositive) {
          if ($scope.itemData["isBinItem"] == true) {
            $scope.moveFocusToNextField("selectBin");
          } else {
            $scope.moveFocusToNextField("selectStatus");
          }
        } else {
          if ($scope.itemData["isBinItem"] == true) {
            $scope.negativeBins = $scope.invBalance.inventoryDetail;
            $scope.moveFocusToNextField("selectBin");
          } else {
            $scope.negativeStatus = $scope.invBalance.inventoryDetail;
            if ($scope.negativeStatus.length == 1) {
              $scope.negativeAdj.selectedFromStatus =
                $scope.negativeStatus[0]["invStatusId"];
              $scope.selectNegStatus();
              $scope.negativeAdj.selectedToStatus = $scope.selectedToStatus;
              $scope.negativeAdj.selectedToStatusText = $scope.allStatus[$scope.selectedToStatus].value;
              $scope.moveFocusToNextField("qty");
            }
          }
        }
      } else {
        $scope.negativeAdj.itemOrUpc = "";
        $scope.positiveAdj.itemOrUpc = "";
        alert("Invalid Item/UPC!!");
        $scope.moveFocusToNextField("scanInvOrUpc");
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
          $scope.moveFocusToNextField("selectStatus");
        } else if ($scope.negativeAdj.itemOrUpc) {
          $scope.negativeStatus = $filter("filter")(
            $scope.negativeBins,
            {
              binNo: $scope.negativeAdj.binNO,
            },
            true
          );
          $scope.moveFocusToNextField("selectStatus");
        }

        var obj = $scope.negativeBins.find(
          (u) => u.binNo == $scope.negativeAdj.binNO
        );
        console.log(obj);
        $scope.negativeAdj.binNoText = obj["binNoText"];
        $scope.negativeAdj.avlqty = obj.available;
        $scope.negativeAdj.selectedFromStatus = $scope.selectedFromStatus
      } else {
        $scope.negativeStatus = [];
        $scope.negativeAdj.binNoText = "";
        $scope.negativeAdj.avlqty = "";
        $scope.negativeAdj.selectedStatus = "";
        $scope.negativeAdj.qty = "";
        $scope.negativeAdj.selectedStatusText = "";
      }

    };

    $scope.selectNegStatus = function () {
      console.log($scope.negativeAdj.selectedFromStatus);
      
      if ($scope.negativeAdj.selectedFromStatus) {
        var obj = $scope.negativeStatus.find(
          (u) => u.invStatusId == $scope.negativeAdj.selectedFromStatus
        );
        $scope.negativeAdj.avlqty = obj?.["available"];
        $scope.negativeAdj.selectedFromStatusText = obj?.["invStatus"];
        $scope.moveFocusToNextField("qty");
      } else {
        $scope.negativeAdj.avlqty = "";
        $scope.negativeAdj.qty = "";
        $scope.negativeAdj.selectedStatusText = "";
        $scope.moveFocusToNextField("selectStatus");
      }
    };
    $scope.enterQuantity = function () {
      if ($scope.negativeAdj.selectedStatus) {
        if (
          Number($scope.negativeAdj.qty) > Number($scope.negativeAdj.avlqty)
        ) {
          alert(
            "You only have " +
              $scope.negativeAdj.avlqty +
              " available. Please enter a different quantity."
          );
          $scope.negativeAdj.qty = "";
        } else if (!/^\d+$/.test($scope.negativeAdj.qty)) {
          alert("Quantity should be a valid number.");
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
        $scope.moveFocusToNextField("selectBin"); 
        return alert("Please select Bin No!!");
      }
      if (
        !$scope.negativeAdj.selectedFromStatus &&
        $scope.setUpData["useInvStatus"] == true
      ) {
        $scope.moveFocusToNextField("selectStatus"); 
        return alert("Please select status!!");
      }
      if (!$scope.negativeAdj.avlqty || Number($scope.negativeAdj.avlqty) < Number($scope.negativeAdj.qty)) {
        $scope.negativeAdj.qty = "";
        $scope.moveFocusToNextField("qty");
        return alert("Please check available quantity!!");
      }
      if (!$scope.negativeAdj.qty) {
		  $scope.negativeAdj.qty = "";
		  $scope.moveFocusToNextField("qty"); 
        return alert("Please enter quantity!!");
	 }

      const result = $scope.configuredItems.find(
        (item) =>
          item.lotNO == $scope.negativeAdj.lotNO &&
          item.binNO == $scope.negativeAdj.binNO &&
          item.selectedFromStatus == $scope.negativeAdj.selectedFromStatus && 
          item.selectedToStatus == $scope.negativeAdj.selectedToStatus
      );

      if (result) {
        alert("Configured with same data already!!");
        return ($scope.negativeAdj = {});
      }
      $scope.configuredItems.push($scope.negativeAdj);
      $scope.negativeAdj = {};
      $scope.moveFocusToNextField("scanInvOrUpc");
    };

    $scope.selectPosBin = function () {
      if ($scope.positiveAdj.binNO) {
        var obj = $scope.allBins[$scope.positiveAdj.binNO];
        $scope.positiveAdj.binNoText = obj["value"];
        $scope.moveFocusToNextField("selectStatus");
      } else {
        $scope.positiveAdj.binNoText = "";
        $scope.moveFocusToNextField("selectBin");
      }
    };
    $scope.selectPosStatus = function () {
      if ($scope.positiveAdj.selectedStatus) {
        var obj = $scope.allStatus[$scope.positiveAdj.selectedStatus];
        $scope.positiveAdj.selectedStatusText = obj["value"];
        $scope.moveFocusToNextField("qty");
      } else {
        $scope.positiveAdj.selectedStatusText = "";
        $scope.moveFocusToNextField("selectStatus");
      }
    };
    $scope.deleteConfiguredItem = function (index) {
		$scope.moveFocusToNextField("scanInvOrUpc");
      const confirmation = confirm("Are you sure you want to delete?");
      if (confirmation) {
        $scope.configuredItems.splice(index, 1);
      }
    };
    $scope.decrement = function () {
      if ($scope.positiveAdj.qty > 0) {
        $scope.positiveAdj.qty--;
      }
    };
    $scope.increment = function () {
      if (!$scope.positiveAdj.qty) {
        $scope.positiveAdj.qty = 1;
        $scope.enterQuantity();
      } else {
        $scope.positiveAdj.qty++;
        $scope.enterQuantity();
      }
    };
    $scope.submitConfiguredItem = function () {
      if (!$scope.configuredItems.length) {
        $scope.moveFocusToNextField('scanInvOrUpc');
        return alert('Please configure the inventory');
      }
      $scope.loading = true;
      var dataObj = {
        empId: $scope.urlObj["empId"],
        setUpData: $scope.setUpData,
        isPositive: $scope.isPositive,
        itemData: $scope.itemData,
        locationid: $scope.urlObj["locationId"],
        fromStatus: $scope.selectedFromStatus,
        toStatus: $scope.selectedToStatus,
        configuredItems: $scope.configuredItems,
        backUpRecId: $scope.backUpRecId,
      };
      $http.post(ajaxUrl + "&ref=createBackup", JSON.stringify(dataObj)).then(
        function (response) {
          var data = response["data"];
          $scope.loading = false;
          $scope.backUpRecId = data.backUpRecId;
          $scope.backUpRecText = data.backUpRecText;
          $scope.myModal.hide();
          console.log("Backup Created Successfully!!" + JSON.stringify(data));
          $scope.itemObj = $scope.itemData;
          $scope.itemObj.onHand = $scope.invBalance?.["onHand"];
          $scope.itemObj.available = $scope.invBalance?.["available"];
          var totalQty = $scope.configuredItems.reduce(
            (total, item) => total + parseInt(item.qty, 10),
            0
          );
          $scope.itemObj.adjQty = totalQty;
          if ($scope.isPositive) {
            $scope.itemObj.newQty =
              parseInt(totalQty) + parseInt($scope.itemObj.onHand);
          } else {
            $scope.itemObj.newQty =
              parseInt($scope.itemObj.onHand) - parseInt(totalQty);
            $scope.itemObj.adjQty = -totalQty;
          }
          $scope.itemObj.isPositive = $scope.isPositive;
          $scope.itemObj.configData = $scope.configuredItems;

          const index = $scope.backUpRecordData.findIndex(
            (item) =>
              item.itemName == $scope.itemObj.itemName &&
              item.isPositive == $scope.isPositive
          );
          if (index > -1) {
            $scope.backUpRecordData[index] = $scope.itemObj;
          } else {
            $scope.backUpRecordData.push($scope.itemObj);
          }

          console.log(
            "$scope.backUpRecordData!!" +
              JSON.stringify($scope.backUpRecordData)
          );
        },
        function (response) {
          $scope.loading = false;
          alert("Please add inventory to item");
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
      };
      $http
        .post(ajaxUrl + "&ref=apprCmpltBackup", JSON.stringify(dataObj))
        .then(
          function (response) {
            var data = response["data"];
            console.log(data);
            
            $scope.loading = false;
            if (data.message) {
              return alert(data.message);
            } else {
              $window.location.reload();
              return alert('Inventory status change record created successfully!!');
            }
            //alert("Inventory status change record created successfully!!" + data.tranIdText);
            //$window.location.reload();
          },
          function (response) {
            $scope.loading = false;
            alert("error::" + response.data);
          }
        );
    };
    $scope.moveFocusToNextField = function (fieldId) {
      $timeout(function () {
        document.getElementById(fieldId).focus();
      });
    };
    $scope.inventoryDetail = [];
    $scope.selecStatus = function (from , selectedStatus) {
      console.log(selectedStatus);

     if (from == 'fromStatus') {
      if ($scope.selectedToStatus == selectedStatus) {
        $scope.selectedFromStatus = null;
        return alert ('From Status and To status can not be same');
      }
      $scope.selectedFromStatus = selectedStatus
      $scope.negativeAdj.selectedFromStatus = $scope.selectedFromStatus;
      if ($scope.itemData.isSerialItem || $scope.itemData.isLotItem) {
        $scope.inventoryDetail = $scope.invBalance.inventoryDetail.filter((item) => item.invStatusId == $scope.selectedFromStatus)
        console.log($scope.inventoryDetail);
      } else {
        $scope.scanItemUpc($scope.itemData.itemName);
        $scope.selectNegStatus();
      }
     } else if (from == 'toStatus') {
      if ($scope.selectedFromStatus == selectedStatus) {
        $scope.selectedToStatus = null;
        return alert ('From Status and To status can not be same');
      }
      $scope.selectedToStatus = selectedStatus;
      $scope.negativeAdj.selectedToStatus = $scope.selectedToStatus;
      $scope.negativeAdj.selectedToStatusText = $scope.allStatus[$scope.selectedToStatus]["value"];
     }
    };
    $scope.moveFocusToNextField("cameraDiv");
  }
);
