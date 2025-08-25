var app = angular.module("myApp", []);
// alert(app);
app.controller(
  "receivermaController",
  function ($scope, $http, $window, $timeout, $filter) {
    c = console.log.bind(document);
    $scope.urlObj = document.getElementById("myDataObj").innerHTML;
    $scope.urlObj = JSON.parse($scope.urlObj);
    var ajaxUrl = $scope.urlObj["ajaxUrl"];
    ($scope.loading = false), $scope.backUpRecId, $scope.backUpRecText;
    $scope.goBack = function () {
      $window.history.back();
    };
    $scope.viewMode = {};

    function myClick(event) {
      if (event.data[1] == "scanOrder") {
        $scope.viewMode.poNumber = event.data[0];
        $scope.getPendingRmas();
      }else if (event.data[1] == "upc") {
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
          $scope.positiveAdj.lotNo = event.data[0];
          $scope.scanLotItem();
        });
      } else if (event.data[1] == "scanItem") {
        $scope.$apply(function () {
          $scope.viewMode.item = event.data[0];
          $scope.scanItem();
        });
      } else if (event.data[1] == 'bin') {
        var result = findObjectByValue($scope.allBins, event.data[0]);
          if (result) {
            $scope.$apply(function () {
              $scope.positiveAdj.binNo = result["id"];
              $scope.selectPosBin();
            });
          } else {
           return alert('Bin not found!!');
          }
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

    $scope.moveFocusToNextField = function (fieldId) {
      $timeout(function () {
        document.getElementById(fieldId).focus();
      });
    };

    function findObjectByValue(obj, value) {
      for (var key in obj) {
        if (obj[key].value === value) {
          return obj[key];
        }
      }
      return null; // Return null if not found
    }

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
            if ($scope.urlObj["tranId"]) {
              $scope.viewMode.poNumber = $scope.urlObj["tranId"];
              $scope.getPendingRmas();
            } else {
              $scope.loading = false;
            }

            //$scope.loading = false;
          },
          function (response) {
            $scope.loading = false;
            alert("error::::::");
          }
        );
    };
    $scope.getSetUpData();
    //Auto suggestions
    $scope.getPendingRmas = function () {
      if ($scope.viewMode.poNumber.length) {
        $scope.loading = true;
        $http
          .get(
            ajaxUrl +
              "&ref=getrmas" +
              "&setUpId=" +
              $scope.urlObj["setUpId"] +
              "&locationId=" +
              $scope.urlObj["locationId"] +
              "&scannedOrder=" +
              $scope.viewMode.poNumber.trim()
          )
          .then(
            function (response) {
              var Data = response["data"];
              console.log('Response_Data : '+JSON.stringify(Data));
              $scope.loading = false;
              if (!Data?.items?.length) {
                $scope.viewMode.poNumber = '';
                $scope.moveFocusToNextField("selectPo");
                return alert ('RMA not found!!')
              }
              if (!Data.isLineNumberAvl) {
                return alert('Netscore unique id is missing \n Please edit and save the RMA#')
              }
              $scope.poList = Data.poList;
              $scope.viewMode.poId = Data.poId;
              $scope.serailNumbers = Data.serailNumbers;
              $scope.allItemsInShipment = Data.items;
              $scope.items = Data.items;
              if (!$scope.items?.length) {
                  $scope.viewMode.poNumber = '';
                  $scope.loading = false;
                  $scope.moveFocusToNextField("selectPo");
                  return alert('Order not found!!')
              }
              $scope.loading = false;
              $scope.moveFocusToNextField("scanItem");
              if ($scope.viewMode.poNumber) {
                $scope.selectPo();
              }
            },
            function (response) {
              $scope.loading = false;
              alert("error::::::");
            }
          );
      }
    };
    $scope.selectPo = function () {
      if ($scope.viewMode.poNumber) {
        $scope.poItems = $filter("filter")($scope.allItemsInShipment, {
          poText: $scope.viewMode.poNumber,
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
        var obj = $scope.items.find((u) => u.itemText == $scope.viewMode.item || u.upc == $scope.viewMode.item || u.itemCustRef == $scope.viewMode.item);
        if (!obj) {
          alert("Item doesn't exist in this RMA!!.");
          $scope.moveFocusToNextField("scanItem");
          return ($scope.viewMode.item = "");
        } else {
          $scope.viewMode.item = obj.itemText;
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
      $scope.items 
      if (itemObj.item) {
        $scope.loading = true;
        $scope.itemObj = itemObj;
        var displayName = "";
        if ($scope.itemObj.displayName) {
          displayName = angular.copy($scope.itemObj.displayName);
          delete $scope.itemObj.displayName;
        }

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
              console.log(JSON.stringify(data));
              $scope.itemObj.displayName = displayName;
              $scope.itemData = data.itemObj;
              $scope.invDetail = data.invDetail[$scope.urlObj["locationId"]];
              console.log("invDetail_invDetail"+ JSON.stringify($scope.invDetail));
              
              $scope.allStatus = data.status;
              console.log("allStatus_allStatus"+ JSON.stringify($scope.allStatus));

              $scope.allBins = data.bins;
              $scope.receivingBins = $scope.setUpData["useStageBins"] ? data.stageBins : $scope.allBins;
              console.log("allBins_allBins"+ JSON.stringify($scope.allBins));

              $scope.disableQty = false;
              $scope.fullText =
                $scope.itemObj.itemText + " - " + $scope.itemData?.displayName;
              $scope.isExpanded = false;
              $scope.itemData.lineNo = angular.copy(
                $scope.itemData.lineuniqueKey
              );
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
                    $scope.itemData.isLotItem ||
                    $scope.itemData.isSerialItem
                  ) {
                    document.getElementById("scanInvOrUpc").focus();
                  } else {
                    if ($scope.itemData.isBinItem) {
                      document.getElementById("selectBin").focus();
                    } else {
                    document.getElementById("qty").focus();
                    }
                  }
                }
              );
              if ($scope.allBins.length == 1) {
                $scope.positiveAdj.binNo = $scope.allBins[0].id;
                $scope.positiveAdj.binNoText = $scope.allBins[0].value;
              }
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
          console.log('$scope.positiveAdj_$scope.positiveAdj'+JSON.stringify($scope.positiveAdj));
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
            //setBin();
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
          $scope.positiveAdj.selectedStatus = "";
          $scope.positiveAdj.selectedStatusText = "";
          //setBin();
          //$scope.moveFocusToNextField("selectStatus");
        }
        $scope.positiveAdj.qty = 1;
        $scope.disableQty = true;
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
        //var obj = $scope.allBins[$scope.positiveAdj.binNo];
        var obj = $scope.allBins.find(
          (item) => item.id == $scope.positiveAdj.binNo
        );
        if (obj) {
          $scope.positiveAdj.binNo = obj.id;
          $scope.positiveAdj.binNoText = obj.value;
          $scope.moveFocusToNextField("selectStatus");
        } else {
          alert('Bin Not Found');
          $scope.positiveAdj.binNo = "";
          $scope.positiveAdj.binNoText = "";
        }
    
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
        $scope.moveFocusToNextField('qty')
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
      // if (
      //   !$scope.positiveAdj.itemOrUpc &&
      //   $scope.itemData["isLotItem"] == false &&
      //   $scope.itemData["isSerialItem"] == false
      // ) {
      //   return alert("Please scan Item/UPC!!");
      // }
      if (
        !$scope.positiveAdj.binNo &&
        $scope.setUpData["useBins"] == true &&
        $scope.itemData["isBinItem"] == true
      ) {
        $scope.moveFocusToNextField('scanBin');
        return alert("Please select Bin No!!");
      }
      if (
        !$scope.positiveAdj.selectedStatus &&
        $scope.setUpData["useInvStatus"] == true
      ) {
        return alert("Please select status!!");
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
      var totalQty = $scope.configuredItems.reduce(
        (total, item) => total + parseInt(item.qty, 10),
        0
      );
      if (
        Number(totalQty) + Number($scope.positiveAdj.qty) >
        Number($scope.itemObj["qty"])
      ) {
        alert("Receiving quantity is greaterthan order quantity");
        $scope.positiveAdj.qty = "";
        $scope.moveFocusToNextField('qty');
        return;
      }
      $scope.itemData["rQty"] =
        Number(totalQty) + Number($scope.positiveAdj.qty);
      $scope.positiveAdj.pallet = "";
      $scope.configuredItems.push($scope.positiveAdj);
      $scope.positiveAdj = {};
       if ($scope.itemData["isSerialItem"] == true) {
        $scope.disableQty = true;
        $scope.positiveAdj.qty = "1";
        $scope.positiveAdj.selectedStatus = "1";
        $scope.positiveAdj.selectedStatusText = "Good";
      }
      if (
        $scope.itemData.isLotItem == false &&
        $scope.itemData.isSerialItem == false
      ) {
        $scope.moveFocusToNextField("qty");
      } else {
        $scope.positiveAdj.selectedStatus = "1";
        $scope.positiveAdj.selectedStatusText = "Good";
        $scope.moveFocusToNextField("scanInvOrUpc");
      }
      $scope.moveFocusToNextField("qty");
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
        soId: $scope.viewMode.poId,

      };
      console.log('dataObj_dataObj'+JSON.stringify(dataObj))
      $http.post(ajaxUrl + "&ref=createBackup", JSON.stringify(dataObj)).then(
        function (response) {
          var data = response["data"];
          if (data.status) {
            alert(data.message);
            $scope.loading = false;
          } else {
            $scope.loading = false;
            $scope.backUpRecId = data.backUpRecId;
            $scope.backUpRecText = data.backUpRecText;
            var configuredItems = data.configuredItems;
            var index = $scope.allItemsInShipment.findIndex(
              (u) => u.lineuniqueKey == $scope.itemData.lineuniqueKey
            );
            if (index > -1) {
              $scope.allItemsInShipment[index]["configuredItems"] =
                configuredItems;
              $scope.allItemsInShipment[index]["rQty"] = $scope.itemData.rQty;
              if ( $scope.allItemsInShipment[index]["rQty"] ==  $scope.allItemsInShipment[index]["qty"]) {
                  $scope.allItemsInShipment[index]["isConfigured"] = true;
              } else {
                $scope.allItemsInShipment[index]["partiallyConfigured"] = true;
              }
            }
            $scope.viewMode.item = "";
            $scope.scanItem();
            $scope.myModal.hide();
          }
        },
        function (response) {
          $scope.loading = false;
          alert("error::::::");
        }
      );
    };

    function setInvData(obj) {
      console.log('obj_obj'+JSON.stringify(obj));
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

      //setBin();
    }
    function setBinAndStatus() {
      $scope.positiveAdj.selectedStatus = "1";
      $scope.positiveAdj.selectedStatusText = "Good";
      $scope.positiveAdj.qty = $scope.itemObj["qty"];
    }

    $scope.receiveOrder = function () {
      //$scope.backUpRecId = 201;
      if (!$scope.backUpRecId) {
        return alert("Please configure items to receive.");
      }
      var backUpRecId = angular.copy($scope.backUpRecId);

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
            if (data.status) {
              $scope.backUpRecId = angular.copy(backUpRecId);
              alert(data.message);
            } else {
              const confirmation = confirm(
                "RMA received successfully with shipment No:" + data.tranId
              );
              if (confirmation) {
                $window.location.reload();
              } else {
                $window.location.reload();
              }
              $scope.backUpRecId = "";
            }

            //
          },
          function (response) {
            $scope.loading = false;
            alert("error::" + response.data);
          }
        );
    };

    $scope.logOut = function () {
      const confirmation = confirm("Are you sure you want to logout?");
      if (confirmation) {
        $window.location.href = $scope.urlObj["logIn"];
      }
    };

    $scope.scanToBin = function () {
      if ($scope.positiveAdj.binNoText) {
        var result = findObjectByValue($scope.allBins, $scope.positiveAdj.binNoText);
        if (result) {
            $scope.positiveAdj.binNo = result["id"];
            $scope.positiveAdj.binNoText = result["value"];
        } else {
          $scope.positiveAdj.binNo = null;
          $scope.positiveAdj.binNoText = '';
          $scope.moveFocusToNextField('scanBin');
          return alert("Bin not found!!");
        }
      } else {
        $scope.positiveAdj.binNo = null;
      }
    };
  }
);