var app = angular.module("myApp", []);
app.controller(
  "InboundShipmentsController",
  function ($scope, $window, $http, $filter, $timeout) {
    $scope.urlObj = document.getElementById("myDataObj").innerHTML;
    $scope.urlObj = JSON.parse($scope.urlObj);
    var ajaxUrl = $scope.urlObj["ajaxUrl"];
    var PrintUrl = $scope.urlObj["PrintUrl"];
    ($scope.loading = false),
      ($scope.ListView = true),
      ($scope.viewMode = {}),
      ($scope.listMode = {});
    $scope.backUpRecId, $scope.backUpRecText;
    // $scope.goBack = function () {
    //   $window.history.back();
    // };
    $scope.goBack = function () {
      if ($scope.ListView) {
        $window.history.back();
      } else {
        $scope.getShipmentsList();
        $scope.selectedResult;
        $scope.ListView = true;
      }
    };
    $scope.moveFocusToNextField = function (fieldId) {
      $timeout(function () {
        document.getElementById(fieldId).focus();
      });
    };
    function myClick(event) {
      if (event.data[1] == "scanorder") {
        $scope.$apply(function () {
          $scope.listMode.orderScan = "";
          $scope.listMode.orderScan = event.data[0];
          $scope.scanOrder($scope.listMode.orderScan);
        });
      } else if (event.data[1] == "scanItem") {
        $scope.$apply(function () {
          $scope.viewMode.item = "";
          $scope.viewMode.item = event.data[0];
          $scope.scanItem();
        });
      } else if (event.data[1] == "lot") {
        $scope.$apply(function () {
          $scope.positiveAdj.lotNo = "";
          $scope.positiveAdj.lotNo = event.data[0];
          $scope.scanLotItem();
        });
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
            $scope.getShipmentsList();
          },
          function (response) {
            $scope.loading = false;
            alert("error::::::");
          }
        );
    };
    $scope.getSetUpData();
    //LISTMODE LOGIC START
    $scope.getShipmentsList = function () {
      $scope.loading = true;
      $http
        .get(
          ajaxUrl +
            "&ref=getOrders" +
            "&empId=" +
            $scope.urlObj["empId"] +
            "&locationId=" +
            $scope.urlObj["locationId"]
        )
        .then(
          function (response) {
            $scope.allInbounds = response.data.inboundList;
            $scope.inboundList = $scope.allInbounds;
            $scope.loading = false;
          },
          function (response) {
            $scope.loading = false;
            alert("error::::::");
          }
        );
    };
    $scope.selectShipment = function (shipObj) {
      $scope.selectedResult = shipObj;
      $scope.listMode.orderScan = $scope.selectedResult.docNumber;
    };

    $scope.scanOrder = function (from) {
      if (from) {
        var data = $filter("filter")($scope.allInbounds, {
          docNumber: from,
        });
        if (!data.length) {
          $scope.listMode.orderScan = "";
          alert("Shipment not found!!.");
          $scope.moveFocusToNextField("scanInbound");
          $scope.inboundList = $scope.allInbounds;
          return;
        }
        $scope.inboundList = data;
        if (data.length == 1) {
          $scope.selectShipment(data[0]);
        }
      } else {
        $scope.inboundList = $scope.allInbounds;
      }
    };

    $scope.pickOrder = function () {
      if ($scope.selectedResult) {
        $scope.ListView = false;
        $scope.getShipMentData();
        $scope.sourced = true;
        $scope.viewMode.docNumber = $scope.selectedResult["docNumber"];
        $scope.viewMode.shipId = $scope.selectedResult["id"];
      } else {
        alert("Please select order!!");
      }
    };

    $scope.moveFocusToNextField("scanInbound");
    //LISTMODE LOGIC END

    //VIEWMODE LOGIC START
    function setBin() {
      for (var bin in $scope.allBins) {
        var obj = $scope.allBins[bin];
        $scope.positiveAdj.binNo = obj.id;
        $scope.positiveAdj.binNoText = obj.value;
        break;
      }
    }
    function setInvData(obj) {
      $scope.positiveAdj.invId = obj.id;
      $scope.positiveAdj.lotNoId = obj.invNo;
      $scope.positiveAdj.qty = obj.qty;
      if (obj.date) {
        var dateString = obj.date;
        var dateComponents = dateString.split("/");
        var year = parseInt(dateComponents[2]);
        var month = parseInt(dateComponents[1]) - 1; // Months are zero-based
        var day = parseInt(dateComponents[0]);
        $scope.positiveAdj.date = new Date(year, month, day);
        const filteredObjects = $scope.configuredItems.filter(
          (item) =>
            item.lotNoId == obj.invNo &&
            new Date(item.date).getTime() == $scope.positiveAdj.date.getTime()
        );
        $scope.positiveAdj.dateKey = obj.date;
        var addedQty = 0;
        for (var key in filteredObjects) {
          var invObj = filteredObjects[key];
          addedQty += parseFloat(invObj.qty);
        }
        $scope.positiveAdj.qty = parseFloat($scope.positiveAdj.qty) - addedQty;
      }
      $scope.positiveAdj.selectedStatus = "1";
      $scope.positiveAdj.selectedStatusText = "Good";

      setBin();
    }
    function setBinAndStatus() {
      for (var bin in $scope.allBins) {
        var obj = $scope.allBins[bin];
        $scope.positiveAdj.binNo = obj.id;
        $scope.positiveAdj.binNoText = obj.value;
        break;
      }
      $scope.positiveAdj.selectedStatus = "1";
      $scope.positiveAdj.selectedStatusText = "Good";
      $scope.positiveAdj.qty = $scope.itemObj["qty"];
    }

    $scope.getShipMentData = function () {
      $scope.loading = true;
      $http
        .get(
          ajaxUrl +
            "&ref=getShipmentData" +
            "&shipmentId=" +
            $scope.selectedResult["docNumber"] +
            "&locationId=" +
            $scope.urlObj["locationId"]
        )
        .then(
          function (response) {
            var Data = response["data"]["Data"];
            //console.log(JSON.stringify(Data));
            $scope.poList = Data.poList;
            $scope.serailNumbers = Data.serailNumbers;
            $scope.allItemsInShipment = Data.items;
            $scope.items = Data.items;
            $scope.loading = false;

            $scope.moveFocusToNextField("selectPo");
            if ($scope.viewMode.poNumber) {
              $scope.selectPo();
            }
          },
          function (response) {
            $scope.loading = false;
            alert("error::::::");
          }
        );
      $scope.backUpRecId = "";
    };
    $scope.selectPo = function () {
      if ($scope.viewMode.poNumber) {
        $scope.poItems = $filter("filter")($scope.allItemsInShipment, {
          po: $scope.viewMode.poNumber,
        });
        $scope.optionsForItem = [...$scope.poItems];
        $scope.items = $scope.poItems;
      } else {
        $scope.items = $scope.allItemsInShipment;
      }

      $scope.allowClick = false;
      $scope.viewMode.item = "";
    };
    $scope.scanItem = function () {
      $scope.allowClick = false;
      if ($scope.viewMode.item) {
        var obj = $scope.items.find((u) => u.itemText == $scope.viewMode.item);
        if (!obj) {
          alert("Item doesn't exist in this PO!!.");
          $scope.moveFocusToNextField("scanItem");
          return ($scope.viewMode.item = "");
        }
        $scope.items = $filter("filter")(
          $scope.items,
          {
            itemText: $scope.viewMode.item,
          },
          true
        );
        if ($scope.items.length > 1) {
          $scope.allowClick = true;
        } else if ($scope.items.length) {
          $scope.viewItem($scope.items[0]);
        }
      } else {
        $scope.items = $scope.poItems;
      }
    };
    $scope.closeModal = function () {
      $scope.viewMode.item = "";
      $scope.items = $scope.poItems;
      $scope.myModal.hide();
    };
    $scope.viewItem = function (itemObj) {
      //console.log(JSON.stringify(itemObj));
      $scope.getItemDetails(itemObj);
    };
    $scope.getItemDetails = function (itemObj) {
      // console.log("itemobj:::" + JSON.stringify(itemObj));
      if (itemObj.item) {
        $scope.loading = true;
        $scope.itemObj = itemObj;
        var displayName = "";
        var supplier = "";
        if ($scope.itemObj.displayName) {
          displayName = angular.copy($scope.itemObj.displayName);
          delete $scope.itemObj.displayName;
        }
        supplier = angular.copy($scope.itemObj.vendorText);
        delete $scope.itemObj.vendorText;

        $http
          .get(
            ajaxUrl +
              "&ref=itemData" +
              "&setUpData=" +
              JSON.stringify($scope.setUpData) +
              "&itemObj=" +
              JSON.stringify(itemObj) +
              "&locationId=" +
              $scope.urlObj["locationId"]
          )
          .then(
            function (response) {
              var data = response["data"];
              // console.log(JSON.stringify(data));
              $scope.itemObj.displayName = displayName;
              $scope.itemObj.vendorText = supplier;
              $scope.itemData = data.itemObj;
              $scope.invDetail = data.invDetail;
              $scope.allStatus = data.status;
              $scope.allBins = data.bins;
              $scope.disableQty = false;
              $scope.fullText =
                $scope.itemObj.itemText + " - " + $scope.itemData.displayName;
              $scope.isExpanded = false;
              $scope.showReadMoreLink = $scope.fullText.length > 12; // Show link if fullText length exceeds 50 characters
              $scope.truncatedText = $scope.fullText.slice(0, 12) + "...";

              ($scope.positiveAdj = {}), ($scope.configuredItems = []);
              var myModalEl = document.getElementById("exampleModal");
              $scope.configuredItems = angular.copy(itemObj.configuredItems);
              $scope.itemData.rQty = itemObj.rQty;
              $scope.myModal = new bootstrap.Modal(myModalEl, {
                keyboard: false,
              });
              $scope.myModal.show();
              $scope.myModal._element.addEventListener(
                "shown.bs.modal",
                function () {
                  if (
                    $scope.itemData.isLotItem == false &&
                    $scope.itemData.isSerialItem == false
                  ) {
                    document.getElementById("qty").focus();
                  } else {
                    document.getElementById("scanInvOrUpc").focus();
                  }
                }
              );
              if (
                $scope.itemData.isLotItem == false &&
                $scope.itemData.isSerialItem == false
              ) {
                setBinAndStatus();
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
    $scope.toggleText = function () {
      $scope.isExpanded = !$scope.isExpanded;
    };
    $scope.scanLotItem = function () {
      if ($scope.positiveAdj.lotNo) {
        if ($scope.invDetail[$scope.positiveAdj.lotNo]) {
          var obj = $scope.invDetail[$scope.positiveAdj.lotNo];
          setInvData(obj);
          $scope.disableQty = false;
          //console.log(JSON.stringify($scope.positiveAdj));
        } else {
          const confirmation = confirm(
            "This is not a configured Lot No. Are you sure you want to add it!!."
          );
          if (!confirmation) {
            $scope.positiveAdj.lotNo = "";
            $scope.moveFocusToNextField("scanInvOrUpc");
          } else {
            $scope.disableQty = false;
            $scope.positiveAdj.selectedStatus = "1";
            $scope.positiveAdj.selectedStatusText = "Good";
            $scope.positiveAdj.newLot = true;
            setBin();
          }
        }
      }
    };
    $scope.scanSerialItem = function () {
      if ($scope.positiveAdj.serialNO) {
        if ($scope.serailNumbers[$scope.positiveAdj.serialNO]) {
          alert("This Serial Number already exists!!");
          $scope.positiveAdj.serialNO = "";
          $scope.moveFocusToNextField("scanInvOrUpc");
        } else {
          var obj = $scope.configuredItems.find(
            (u) => u.serialNO == $scope.positiveAdj.serialNO
          );
          if (obj) {
            alert("This Serial Number already exists!!");
            $scope.positiveAdj.serialNO = "";
            return $scope.moveFocusToNextField("scanInvOrUpc");
          }
          $scope.disableQty = true;
          $scope.positiveAdj.qty = "1";
          $scope.positiveAdj.selectedStatus = "1";
          $scope.positiveAdj.selectedStatusText = "Good";
          setBin();
          $scope.moveFocusToNextField("selectStatus");
        }
      } else {
        // $scope.disableQty = true;
        // $scope.positiveAdj.qty = "";
        // $scope.positiveAdj.selectedStatus = "1";
        // $scope.positiveAdj.selectedStatusText = "Good";
      }
    };
    $scope.selectLotNo = function () {
      if ($scope.positiveAdj.selectlotNo) {
        if ($scope.invDetail[$scope.positiveAdj.selectlotNo]) {
          var obj = $scope.invDetail[$scope.positiveAdj.selectlotNo];
          $scope.positiveAdj.lotNo = $scope.positiveAdj.selectlotNo;
          setInvData(obj);
          $scope.disableQty = false;
          //console.log(JSON.stringify($scope.positiveAdj));
        }
      } else {
        $scope.positiveAdj.invId = "";
        $scope.positiveAdj.lotNoId = "";
        $scope.positiveAdj.lotNo = "";
        $scope.positiveAdj.qty = "";
        $scope.positiveAdj.date = "";
      }
    };
    $scope.selectPosBin = function () {
      if ($scope.positiveAdj.binNo) {
        var obj = $scope.allBins[$scope.positiveAdj.binNo];
        $scope.positiveAdj.binNo = obj.id;
        $scope.positiveAdj.binNoText = obj.value;
      } else {
        $scope.positiveAdj.binNo = "";
        $scope.positiveAdj.binNoText = "";
      }
    };
    $scope.selectPosStatus = function () {
      if ($scope.positiveAdj.selectedStatus) {
        var obj = $scope.allStatus[$scope.positiveAdj.selectedStatus];
        $scope.positiveAdj.selectedStatus = obj.id;
        $scope.positiveAdj.selectedStatusText = obj.value;
      } else {
        $scope.positiveAdj.selectedStatus = "";
        $scope.positiveAdj.selectedStatusText = "";
      }
    };
    $scope.addPosConfiguredItem = function () {
      if (
        !$scope.positiveAdj.lotNo &&
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
        $scope.setUpData["useLot"] == true &&
        $scope.itemData["isLotItem"] == true
      ) {
        if ($scope.positiveAdj.date) {
          var date = $scope.positiveAdj.date;
          const options = { year: "numeric", month: "long", day: "numeric" };
          const formattedDate = date.toLocaleDateString("en-US", options);
          const day = ("0" + date.getDate()).slice(-2);
          const month = ("0" + (date.getMonth() + 1)).slice(-2);
          const year = date.getFullYear();
          const dateKey = `${day}/${month}/${year}`;
          $scope.positiveAdj.dateText = formattedDate;
          $scope.positiveAdj.dateKey = dateKey;
          // console.log($scope.positiveAdj.dateKey);
        } else {
          return alert("Please select Exp Date!!");
        }
      }

      if (!$scope.positiveAdj.qty) {
        return alert("Please enter quantity!!");
      } else {
        if (Number($scope.positiveAdj.qty) <= 0) {
          $scope.positiveAdj.qty = "";
          return alert("Quantity should be greaterthan zero!!");
        }
      }

      // const result = $scope.configuredItems.find(
      //   (item) =>
      //     item.lotNO == $scope.positiveAdj.lotNO &&
      //     item.binNO == $scope.positiveAdj.binNO &&
      //     item.selectedStatus == $scope.positiveAdj.selectedStatus
      // );

      // if (result) {
      //   alert("Configured with same data already!!");
      //   return ($scope.positiveAdj = {});
      // }
      var totalQty = $scope.configuredItems.reduce(
        (total, item) => total + parseInt(item.qty, 10),
        0
      );
      if (
        Number(totalQty) + Number($scope.positiveAdj.qty) >
        Number($scope.itemObj["qty"])
      ) {
        return alert("Receiving quantity is greaterthan order quantity");
      }
      $scope.itemData["rQty"] =
        Number(totalQty) + Number($scope.positiveAdj.qty);

      // if (!$scope.itemData.isDangereous && !$scope.itemData.isColdChain) {
      //   const confirmation = confirm(
      //     "Do you want to create pallet for this batch.!!"
      //   );
      //   if (confirmation) {
      //     const index = $scope.configuredItems.findIndex(
      //       (item) =>
      //         item.lotNoId === $scope.positiveAdj.lotNoId &&
      //         new Date(item.date).getTime() ===
      //           $scope.positiveAdj.date.getTime()
      //     );
      //     if (index > -1) {
      //       const confirmation = confirm(
      //         "Pallet has been alreay created for this batch,Do you want to keep this in same pallet.!!"
      //       );
      //       if (confirmation) {
      //         var obj = $scope.configuredItems[index];
      //         obj.qty =
      //           parseFloat(obj.qty) + parseFloat($scope.positiveAdj.qty);
      //         $scope.configuredItems[index] = obj;
      //         console.log(JSON.stringify($scope.configuredItems));
      //         $scope.positiveAdj = {};
      //         $scope.moveFocusToNextField("scanInvOrUpc");
      //         return;
      //       } else {
      //         $scope.positiveAdj.pallet = generatePalletNo();
      //       }
      //     } else {
      //       $scope.positiveAdj.pallet = generatePalletNo();
      //     }
      //   } else {
      //     $scope.positiveAdj.pallet = "";
      //   }
      // }
      $scope.positiveAdj.pallet = "";
      $scope.configuredItems.push($scope.positiveAdj);
      $scope.positiveAdj = {};
      if ($scope.itemData["isSerialItem"] == true) {
        $scope.disableQty = true;
        $scope.positiveAdj.qty = "1";
        $scope.positiveAdj.selectedStatus = "1";
        $scope.positiveAdj.selectedStatusText = "Good";
        setBin();
      }
      if (
        $scope.itemData.isLotItem == false &&
        $scope.itemData.isSerialItem == false
      ) {
        $scope.moveFocusToNextField("qty");
      } else {
        setBin();
        $scope.positiveAdj.selectedStatus = "1";
        $scope.positiveAdj.selectedStatusText = "Good";
        $scope.moveFocusToNextField("scanInvOrUpc");
      }
    };
    $scope.deleteConfiguredItem = function (index) {
      const confirmation = confirm("Are you sure you want to delete?");
      if (confirmation) {
        $scope.configuredItems.splice(index, 1);
      }
      var totalQty = $scope.configuredItems.reduce(
        (total, item) => total + parseInt(item.qty, 10),
        0
      );
      $scope.itemData["rQty"] = totalQty;
    };
    $scope.submitConfiguredItem = function () {
      if ($scope.configuredItems.length <= 0) {
        return alert("Please Configure Data!!.");
      }

      $scope.loading = true;
      var dataObj = {
        empId: $scope.urlObj["empId"],
        setUpData: $scope.setUpData,
        isPositive: true,
        itemData: $scope.itemData,
        locationid: $scope.urlObj["locationId"],
        configuredItems: $scope.configuredItems,
        backUpRecId: $scope.backUpRecId,
        shipData: $scope.viewMode,
      };
      $http.post(ajaxUrl + "&ref=createBackup", JSON.stringify(dataObj)).then(
        function (response) {
          var data = response["data"];
          //console.log("$scope.backUpRecordData!!" + JSON.stringify(data));
          if (data.status) {
            alert(data.message);
            $scope.loading = false;
          } else {
            $scope.loading = false;
            $scope.backUpRecId = data.backUpRecId;
            $scope.backUpRecText = data.backUpRecText;
            var palletIds = data.palletIds;
            var configuredItems = data.configuredItems;
            var index = $scope.allItemsInShipment.findIndex(
              (u) => u.lineuniqueKey == $scope.itemData.lineuniqueKey
            );
            if (index > -1) {
              $scope.allItemsInShipment[index]["configuredItems"] =
                configuredItems;
              $scope.allItemsInShipment[index]["isConfigured"] = true;
              $scope.allItemsInShipment[index]["rQty"] = $scope.itemData.rQty;
            }
            $scope.viewMode.item = "";
            $scope.scanItem();
            $scope.myModal.hide();
            if (
              !$scope.itemData.isDangereous &&
              !$scope.itemData.isColdChain &&
              palletIds.length
            ) {
              const confirmation = confirm(
                "Do you want to print pallets labels..?"
              );
              if (confirmation) {
                $scope.printLabels(palletIds);
              }
            }
          }
        },
        function (response) {
          $scope.loading = false;
          alert("error::::::");
        }
      );
    };
    $scope.printLabels = function (dataObj) {
      PrintUrl = PrintUrl + "&from=lookup" + "&data=" + JSON.stringify(dataObj);
      //console.log("PrintUrl::" + PrintUrl);
      $http.get(PrintUrl).then(
        function (response) {
          var data = response["data"];
          //console.log("RESPONSE FROM PS::" + JSON.stringify(data));

          $window.parent.postMessage(
            { func: "printMultiLabels", message: JSON.stringify(data) },
            "*"
          );
          $window.addEventListener("message", myClick);
        },
        function (response) {
          $scope.loading = false;
          alert("error::::::");
        }
      );
    };
    $scope.receiveOrder = function () {
      if (!$scope.backUpRecId) {
        return alert("Please configure items to receive.");
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
            if (data.status == "success") {
              $timeout(function () {
                alert(
                  "Inbound Shipment " +
                    data.tranIdText +
                    " submitted for bulk proceesing, please wait while it completed."
                );
                $scope.loading = false;
                $scope.getShipMentData();
              }, 20000);
            } else if (data.status == "notSuccess") {
              $scope.loading = false;
              return alert("Unable to receive Inbound Shipment!!.");
            } else {
              $scope.loading = false;
              return alert(data.message);
            }

            // $window.location.reload();
          },
          function (response) {
            $scope.loading = false;
            alert("error::" + response.data);
          }
        );
    };
  }
);