var app = angular.module("myApp", []);
app.controller(
  "ReceiveTOController",
  function ($scope, $window, $filter, $http, $timeout) {
    c = console.log.bind(document);
    $scope.urlObj = document.getElementById("myDataObj").innerHTML;
    $scope.urlObj = JSON.parse($scope.urlObj);
    var ajaxUrl = $scope.urlObj["ajaxUrl"];
    ($scope.loading = false), $scope.backUpRecId, $scope.backUpRecText;
    $scope.goBack = function () {
      $window.history.back();
    };
    $scope.orderId,
      $scope.orderText,
      $scope.customer,
      $scope.customerText,
      ($scope.quantity = 0);

    $scope.updateQuantity = function () {
      // Perform any additional logic when the quantity changes
    };

    $scope.moveFocusToNextField = function (fieldId) {
      $timeout(function () {
        document.getElementById(fieldId).focus();
      });
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
            if ($scope.urlObj["tranId"]) {
              $scope.scannedOrder = $scope.urlObj["tranId"];
              $scope.scanOrder();
            } else {
              $scope.loading = false;
            }
          },
          function (response) {
            $scope.loading = false;
            alert("error::::::");
          }
        );
    };
    $scope.getSetUpData();

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
              $scope.orderItems = data.items;
              if (!$scope.orderItems.length) {
                $scope.loading = false;
                $scope.scannedOrder = '';
                return alert('Order not found');
              }
              $scope.invDetail = data.invDetails;
              $scope.allBins = data.bins;
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
    $scope.openScanner = function (from) {
      $window.parent.postMessage(
        { func: "pickscanBarcodeforV3", message: from },
        "*"
      );
      $window.addEventListener("message", myClick);
    };

    function myClick(event) {
      if (event.data[1] == "scanItem") {
        $scope.$apply(function () {
          $scope.scannedItem = event.data[0];
          $scope.getItemDetails();
        });
      } else if (event.data[1] == "scanOrder") {
        $scope.$apply(function () {
          $scope.scannedOrder = event.data[0];
          $scope.scanOrder();
        });
      } else if (event.data[1] == "itemOrUpc") {
        $scope.$apply(function () {
          $scope.positiveAdj.itemOrUpc = event.data[0];
          $scope.scanItemUpc($scope.positiveAdj.itemOrUpc);
        });
      } else if (event.data[1] == "serial") {
        $scope.$apply(function () {
          $scope.positiveAdj.serialNO = event.data[0];
          $scope.scanSerialItem();
        });
      }
      $window.removeEventListener("message", myClick);
    }
    $scope.getItemDetails = function (itemObj) {
      $scope.scannedSerialNo = "";
      if ($scope.scannedItem) {
        var obj = $scope.orderItems.find((u) =>
          u?.invBalance?.$scope.urlObj["locationId"]?.inventoryDetail.find(
            (i) => i.invNoText == $scope.scannedItem
          )
        );
        if (obj) {
          $scope.scannedSerialNo = $scope.scannedItem;
          $scope.scannedItem = obj.itemName;
        } else {
          $scope.scannedSerialNo = "";
        }
        if (!itemObj) {
          console.log("getItemDetails");
          var sameItemsArray = $scope.orderItems.filter(function (item) {
            return (
              item.itemName === $scope.scannedItem &&
              item.pickQty != item.quantity
            );
          });
          console.log(sameItemsArray);
          itemObj = sameItemsArray[0];
          if (!sameItemsArray.length) {
            $scope.scannedItem = "";
            $scope.moveFocusToNextField("scanitem");
            return alert("Quantity is already picked!!");
          }
        }
        if ($scope.scannedItem) {
          var obj = $scope.orderItems.find(
            (u) => u.itemName == $scope.scannedItem
          );
          c(JSON.stringify(obj));
          // if (obj) {
          //   $scope.scannedItem = obj.itemID;
          // }
          if (!obj) {
            alert("Item not found!!");
            return ($scope.scannedItem = "");
          }
          if (itemObj) {
            var obj = $scope.orderItems.find((u) => u.lineNo == itemObj.lineNo);
           // $scope.scannedItem = obj.itemID;
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
                  $scope.urlObj["locationId"] + //$scope.urlObj["locationId"] , $scope.orderId //obj.toLocation +
                  "&PoId=" +
                  $scope.orderId
              )
              .then(
                function (response) {
                  var data = response["data"];
                  if (data["status"] == "success") {
                    $scope.itemData = itemObj;
                    $scope.itemData.orderQty = obj.quantity;
                    $scope.invBalance =
                      $scope.invDetail[$scope.itemData.itemID];
                    const index = $scope.orderItems.findIndex(
                      (item) =>
                        item.lineuniquekey == $scope.itemData.lineuniquekey
                    );
                    if (index > -1) {
                      $scope.itemData["pickQty"] =
                        $scope.orderItems[index]["pickQty"];
                      $scope.itemData["tranNo"] =
                        $scope.orderItems[index]["ifId"];
                      $scope.receivingBins = $scope.setUpData["useStageBins"] ? data.stageBins: $scope.allBins ;
                      $scope.itemData["lineNo"] =
                        $scope.orderItems[index]["lineuniquekey"];
                          $scope.allStatus = data.allStatus;
                    }
                    $scope.scannedItem = "";
                    ($scope.isPositive = true), ($scope.disableQty = false);
                    ($scope.positiveAdj = {}),
                      ($scope.positiveAdjs = {}),
                      ($scope.configuredItems = []);
                    c("$scope.itemData::" + JSON.stringify($scope.itemData));
                    c(
                      "$scope.invBalance::" + JSON.stringify($scope.invBalance)
                    );
                    if (index > -1) {
                      $scope.configuredItems =
                        $scope.orderItems[index]["configuredItems"];
                    }
                    var myModalEl = document.getElementById("itemDataModal");
                    $scope.myModal = new bootstrap.Modal(myModalEl, {
                      keyboard: false,
                    });
                    setStageBin();
                    $scope.myModal.show();
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
                  alert("error::: No Match Found !!");
                }
              );
          }
        }
      }
    };

    $scope.viewItem = function (itemObj) {
      $scope.scannedItem = itemObj.itemName;
      $scope.getItemDetails(itemObj);
    };

    $scope.scanLotItem = function (lotitemName) {
      if ($scope.isPositive) {
        const filteredData = $scope.itemOrderData.filter(
          (item) => item.itemLotName === lotitemName
        );
        const itemStatusesAndQtys = [];
        filteredData.forEach((item) => {
          const itemStatusAndQty = {
            itemStatusText: item.itemStatusText,
            itemStatusId: item.itemStatus,
            itemQty: item.itemQty,
            lotExpirDate: item.itemExpirDate,
          };
          itemStatusesAndQtys.push(itemStatusAndQty);
        });
        //console.log("itemStatuses", itemStatusesAndQtys);
        if (itemStatusesAndQtys.length <= 0) {
          $scope.positiveAdj.lotNO = "";
          return alert("LOT number not found!!");
        }
        $scope.toStatus = itemStatusesAndQtys;
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
        }
      }
    };
    $scope.scanSerialItem = function () {
      if (!$scope.positiveAdj.serialNO) {
        return "";
      }
      const result = $scope.configuredItems.find(
        (item) => item.serialNO == $scope.positiveAdj.serialNO
      );
      console.log(JSON.stringify(result));
      if (result) {
        alert("Configured with same data already!!");
        $scope.moveFocusToNextField("scanInvOrUpc");
        $scope.positiveAdj.serialNO = "";
        return setStageBin();
      }
      if (!$scope.invBalance.includes($scope.positiveAdj.serialNO)) {
        $scope.positiveAdj.serialNO = "";
        $scope.moveFocusToNextField("scanInvOrUpc");
        alert("This is not a cofigured inventory in item fullfillment.");
        return setStageBin();
      } else {
        $scope.positiveAdj.qty = 1;
        $scope.addPosConfiguredItem();
      }
    };

    $scope.scanItemUpc = function (itemUpc) {
      const filteredData = $scope.itemOrderData?.filter(
        (item) => item.transferItemName === itemUpc
      );

      const itemStatusesAndQtys = [];
      filteredData?.forEach((item) => {
        const itemStatusAndQty = {
          itemStatusText: item.itemStatusText,
          itemStatusId: item.itemStatus,
          itemQty: item.itemQty,
        };

        itemStatusesAndQtys.push(itemStatusAndQty);
      });
      //console.log("itemStatuses", itemStatusesAndQtys);
      $scope.toStatus = itemStatusesAndQtys;
      if (!itemUpc) {
        return;
      }

      if (
        $scope.itemData.itemName == itemUpc ||
        $scope.itemData.upc == itemUpc
      ) {
        if ($scope.isPositive) {
        } else {
          if ($scope.itemData["isBinItem"] == true) {
            $scope.negativeBins = $scope.invBalance.inventoryDetail;
          } else {
            $scope.negativeStatus = $scope.invBalance.inventoryDetail;
            c(JSON.stringify($scope.negativeStatus));
          }
        }
      } else {
        $scope.positiveAdj.itemOrUpc = '';
        return alert("Invalid Item/UPC!!");
      }
    };
    $scope.selectPosBin = function () {
      if ($scope.positiveAdj.binNO) {
        var obj = $scope.allBins.find((u) => u.id == $scope.positiveAdj.binNO);
        $scope.positiveAdj.binNoText = obj["value"];
      } else {
        $scope.positiveAdj.binNoText = "";
      }
    };

    function setStageBin() {
      if ($scope.allBins.length) {
        // $scope.positiveAdj.binNO = $scope.allBins[0]["id"];
        // $scope.positiveAdj.binNoText = $scope.allBins[0]["value"];
      }
      if ($scope.itemData.isSerialItem) {
        $scope.positiveAdj.qty = 1;
        $scope.disableQty = true;
      } else if (!$scope.itemData.isSerialItem && !$scope.itemData.isLotItem) {
        $scope.positiveAdj.itemOrUpc = $scope.itemData.itemName;
      }
      $scope.myModal._element.addEventListener("shown.bs.modal", function () {
        if (
          $scope.itemData.isLotItem == false &&
          $scope.itemData.isSerialItem == false
        ) {
          document.getElementById("qty").focus();
        } else {
          document.getElementById("scanInvOrUpc").focus();
        }
      });
    }

    $scope.selectPosStatus = function () {
      if ($scope.positiveAdj.selectedStatus) {
        var obj = $scope.allStatus[$scope.positiveAdj.selectedStatus];
        $scope.positiveAdj.selectedStatusText = obj["value"];
      } else {
        $scope.positiveAdj.selectedStatusText = "";
      }
    };
    $scope.selectReceiveStatus = function () {
      if ($scope.positiveAdjs.selectedStatus) {
        var obj = $scope.toStatus.find(
          (u) => u.itemStatusId == $scope.positiveAdjs.selectedStatus
        );
        ///console.log("obj", obj);
        $scope.positiveAdj.avlqty = obj["itemQty"];
        $scope.positiveAdj.date = obj["lotExpirDate"];
      } else {
        $scope.positiveAdj.selectedStatusText = "";
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
        }
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
        $scope.itemData["isLotItem"] == false &&
        $scope.itemData["isSerialItem"] == false
      ) {
        return alert("Please scan item / UPC");
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

      var totalQty = $scope.configuredItems.reduce(
        (total, item) => total + parseInt(item.qty, 10),
        0
      );
      var addedtoatalQty =
        parseInt(totalQty) + parseInt($scope.positiveAdj.qty);
      if (
        $scope.positiveAdj.qty > $scope.itemData.orderQty ||
        addedtoatalQty > $scope.itemData.orderQty
      ) {
        alert("Your trying to pick more than order qty !!");
        $scope.positiveAdj.qty = "";
        return false;
      }

      if (
        $scope.setUpData["useLot"] == true &&
        $scope.itemData["isLotItem"] == true
      ) {
        const result = $scope.configuredItems.find(
          (item) =>
            item.lotNO == $scope.positiveAdj.lotNO &&
            item.binNO == $scope.positiveAdj.binNO &&
            item.selectedStatus == $scope.positiveAdj.selectedStatus
        );
        if (result) {
          alert("Configured with same data already!!");
          return ($scope.positiveAdj = {});
        }
      }

      console.log(JSON.stringify($scope.positiveAdj));
      if ($scope.positiveAdj.date) {
        const dateKey = $scope.positiveAdj.date;
        var date = new Date(dateKey);
        const options = { year: "numeric", month: "long", day: "numeric" };
        const formattedDate = date.toLocaleDateString("en-US", options);
        $scope.positiveAdj.dateText = formattedDate;
      }

      $scope.itemData["pickQty"] = $scope.positiveAdj.qty;
      $scope.configuredItems.push($scope.positiveAdj);
      $scope.positiveAdj = {};
      setStageBin();
    };

    $scope.deleteConfiguredItem = function (index) {
      const confirmation = confirm("Are you sure you want to delete?");
      if (confirmation) {
        $scope.configuredItems.splice(index, 1);
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
      $http.post(ajaxUrl + "&ref=createBackup", JSON.stringify(dataObj)).then(
        function (response) {
          var data = response["data"];
          $scope.loading = false;
          $scope.backUpRecId = data.backUpRecId;
          $scope.backUpRecText = data.backUpRecText;
          $scope.myModal.hide();
          console.log("Backup Created Successfully!!" + JSON.stringify(data));
          $scope.itemObj = $scope.itemData;
          //$scope.itemObj.onHand = $scope.invBalance["onHand"];
          //$scope.itemObj.available = $scope.invBalance["available"];
          var totalQty = $scope.configuredItems.reduce(
            (total, item) => total + parseInt(item.qty, 10),
            0
          );
          $scope.itemObj.adjQty = totalQty;
          const index = $scope.orderItems.findIndex(
            (item) => item.lineuniquekey == $scope.itemObj.lineuniquekey
          );
          if (index > -1) {
            $scope.orderItems[index]["pickQty"] = $scope.itemObj.adjQty; // $scope.itemObj["pickQty"];
            $scope.orderItems[index]["configuredItems"] =
              $scope.configuredItems;
            $scope.orderItems[index]["isConfigured"] = true;
          }
        },
        function (response) {
          $scope.loading = false;
          alert("error::::::");
        }
      );
    };
    $scope.approveCompleteBackUp = function () {
      //$scope.backUpRecId = 324;
      console.log();
      if (!$scope.backUpRecId || $scope.backUpRecId <= 0) {
        return alert("Please scan item!!");
      }
      $scope.backUpRecId = $scope.backUpRecId;
      $scope.loading = true;
      var dataObj = {
        recId: $scope.backUpRecId,
      };
      $http
        .post(ajaxUrl + "&ref=apprCompltBackup", JSON.stringify(dataObj))
        .then(
          function (response) {
            var data = response["data"];
            $scope.loading = false;
            alert("Transfer Order received successfully " + data);
            //$window.location.reload();
          },
          function (response) {
            $scope.loading = false;
            alert("error::::::");
          }
        );
    };
  }
);
