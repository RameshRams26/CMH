var app = angular.module("myApp", []);
app.controller(
  "ReceiveOrderController",
  function ($scope, $window, $timeout, $http) {
    c = console.log.bind(document);
    $scope.urlObj = document.getElementById("myDataObj").innerHTML;
    $scope.urlObj = JSON.parse($scope.urlObj);
    var ajaxUrl = $scope.urlObj["ajaxUrl"];
    $scope.loading = false;
    $scope.showBinsCard = false;
    $scope.goBack = function () {
      $window.history.back();
    };

    $scope.value = 0;
    $scope.increment = function () {
      alert("testing");
      $scope.value++;
    };
    $scope.decrement = function () {
      alert("test");
      if ($scope.value > 0) {
        $scope.value--;
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
            }
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

    $scope.quantity = 0;

    $scope.updateQuantity = function () {
      // Perform any additional logic when the quantity changes
      console.log("Quantity updated:", $scope.quantity);
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

    $scope.scanOrder = function () {
      //alert($scope.scanOrder);
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
              if (data.status == "Error") {
                alert(data.message);
                $scope.scannedOrder = "";
              }
              $scope.orderId = data.orderId;
              $scope.orderText = data.orderText;
              $scope.vendor = data.vendor;
              $scope.vendorText = data.vendorText;
              $scope.orderItems = data.items;
              console.log("all items", $scope.orderItems);
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
    $scope.viewItem = function (itemObj) {
      $scope.scannedItem = itemObj.itemName;
      $scope.getItemDetails(itemObj);
      setTimeout(() => {
        $scope.moveFocusToNextField("scanitemfocus");
      }, 1000);
    };

    $scope.selectPosBin = function () {
      if ($scope.positiveAdj.binNO) {
        var obj = $scope.allBins[$scope.positiveAdj.binNO];
        $scope.positiveAdj.binNoText = obj["value"];
      } else {
        $scope.positiveAdj.binNoText = "";
      }
    };
    $scope.selectPosStatus = function () {
      if ($scope.positiveAdj.selectedStatus) {
        var obj = $scope.allStatus[$scope.positiveAdj.selectedStatus];
        $scope.positiveAdj.selectedStatusText = obj["value"];
      } else {
        $scope.positiveAdj.selectedStatusText = "";
      }

      $scope.moveFocusToNextField("qty");
    };
    $scope.updateValue = function () {
      // if ($scope.positiveAdj.qty > $scope.itemData["orderQty"]){
      //    alert("Qty exceeds")
      //    $scope.positiveAdj.qty = "";
      //    $scope.moveFocusToNextField("qty");
      // }

      var totalQty = $scope.configuredItems.reduce(
        (total, item) => total + parseInt(item.qty, 10),
        0
      );
      if (
        Number(totalQty) + Number($scope.positiveAdj.qty) >
        Number($scope.itemData["orderQty"])
      ) {
        alert("Received quantity is greaterthan order quantity");
        $scope.positiveAdj.qty = "";
        $scope.moveFocusToNextField("qty");
        return false;
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
        alert("Please scan Serial No!!");
        return document.getElementById("scanitemfocus").focus();
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
        $scope.positiveAdj.qty = "";
        return alert("Please enter quantity!!");
      } else {
        if (Number($scope.positiveAdj.qty) <= 0) {
          $scope.positiveAdj.qty = "";
          return alert("Quantity should be greaterthan zero!!");
        }
      }
      if ($scope.itemData["isLotItem"] == true) {
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

      if ($scope.positiveAdj.date) {
        const dateKey = $scope.positiveAdj.date;
        var date = new Date(dateKey);
        const options = { year: "numeric", month: "long", day: "numeric" };
        const formattedDate = date.toLocaleDateString("en-US", options);

        $scope.positiveAdj.dateText = formattedDate;
      }

      $scope.configuredItems.push($scope.positiveAdj);
      // $scope.positiveAdj = {};
      if ($scope.generatedSerials) {
        var usedSerials = $scope.configuredItems.map((item) => item.serialNO);
        var nextSerialIndex = $scope.generatedSerials.findIndex(
          (serial) => !usedSerials.includes(serial)
        );
        $scope.serialIndex =
          nextSerialIndex >= 0
            ? nextSerialIndex
            : $scope.configuredItems.length;
        $scope.positiveAdj = {};
        $scope.positiveAdj.serialNO =
          $scope.generatedSerials[$scope.serialIndex] || "";
      } else {
        $scope.positiveAdj = {};
      }
    };

    $scope.deleteConfiguredItem = function (index) {
      const confirmation = confirm("Are you sure you want to delete?");
      if (confirmation) {
        $scope.configuredItems.splice(index, 1);
        if ($scope.generatedSerials) {
          var usedSerials = $scope.configuredItems.map((item) => item.serialNO);
          var nextSerialIndex = $scope.generatedSerials.findIndex(
            (serial) => !usedSerials.includes(serial)
          );
          $scope.serialIndex =
            nextSerialIndex >= 0
              ? nextSerialIndex
              : $scope.configuredItems.length;
          $scope.positiveAdj.serialNO =
            $scope.generatedSerials[$scope.serialIndex] || "";
        }
      }
    };
    // $scope.scanSerialItem = function (serialNo) {
    //   alert("alert 2");
    //   if (!serialNo) {
    //     return "";
    //   }
    //   var obj = $scope.invBalance.inventoryDetail.find(
    //     (u) => u.invNoText == serialNo
    //   );

    //   if ($scope.isPositive) {
    //     if (obj) {
    //       alert("Serial No Already Exists!!");
    //       $scope.positiveAdj.serialNO = "";
    //     } else {
    //       var obj = $scope.configuredItems.find((u) => u.serialNO == serialNo);
    //       if (obj) {
    //         alert("Serial No Already Exists!!");
    //         $scope.positiveAdj.serialNO = "";
    //       } else {
    //         $scope.disableQty = true;
    //         $scope.positiveAdj.qty = 1;
    //       }
    //     }
    //   } else {
    //     if (obj) {
    //       const result = $scope.configuredItems.find(
    //         (item) => item.serialNO == serialNo
    //       );
    //       if (result) {
    //         alert("Configured with same data already!!");
    //         return ($scope.negativeAdj = {});
    //       }

    //       $scope.negativeAdj = {
    //         serialNO: serialNo,
    //         binNO: obj.binNo,
    //         binNoText: obj.binNo,
    //         avlqty: "",
    //         selectedStatus: obj.invStatusId,
    //         qty: obj.onHand,
    //         selectedStatusText: obj.invStatus,
    //       };
    //       var totalQty = $scope.configuredItems.reduce(
    //         (total, item) => total + parseInt(item.qty, 10),
    //         0
    //       );
    //       if (
    //         Number(totalQty) + Number($scope.negativeAdj.qty) >
    //         Number($scope.itemData["orderQty"])
    //       ) {
    //         return alert("Receiving quantity is greaterthan order quantity");
    //       }
    //       $scope.itemData["pickQty"] =
    //         Number(totalQty) + Number($scope.negativeAdj.qty);
    //       $scope.configuredItems.push($scope.negativeAdj);
    //       $scope.negativeAdj = {};
    //     } else {
    //       $scope.negativeAdj.serialNO = "";
    //       return alert("Serial No Not Found!!");
    //     }
    //   }
    // };

    $scope.getItemDetails = function (itemobj) {
      if ($scope.scannedItem) {
        var obj;
        if (itemobj) {
          obj = itemobj;
        } else {
          obj = $scope.orderItems.find(
            (u) =>
              (u.itemName == $scope.scannedItem ||
                u.upc == $scope.scannedItem) &&
              u.pickQty !== u.quantity
          );
          if (!obj) {
            alert("Item not found!!");
            return ($scope.scannedItem = "");
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
                $scope.receivingBins = $scope.setUpData["useStageBins"]
                  ? $scope.itemData.stageBins
                  : $scope.itemData.allBins;
                $scope.allStatus = $scope.itemData.allStatus;
                const index = $scope.orderItems.findIndex(
                  (item) => item.lineNo == $scope.itemData.lineNo
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
                ($scope.isPositive = true), ($scope.disableQty = false);
                ($scope.positiveAdj = {}),
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
                $scope.myModal.show();
                $scope.positiveAdj.itemOrUpc = $scope.itemData.itemName;
                $scope.scanItemUpc($scope.positiveAdj.itemOrUpc);
                $scope.inventoryDetail = $scope.invBalance?.inventoryDetail;
                $scope.binsWithQty = [];
                if ($scope.itemData["isSerialItem"]) {
                  $scope.findBinCount($scope.inventoryDetail, "binNoText");
                } else {
                  $scope.inventoryDetail?.forEach((element) => {
                    if (element.binNoText) {
                      $scope.binsWithQty.push({
                        binNoText: element.binNoText,
                        binCount: element.available,
                      });
                    }
                  });
                }
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
          document.getElementById("scanitemfocus").focus();
        } else {
          var obj = $scope.configuredItems.find((u) => u.serialNO == serialNo);
          if (obj) {
            alert("Serial No Already Exists!!");
            $scope.positiveAdj.serialNO = "";
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
      $scope.moveFocusToNextField("scanitem");
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
        } else {
          if ($scope.itemData["isBinItem"] == true) {
            $scope.negativeBins = $scope.invBalance.inventoryDetail;
          } else {
            $scope.negativeStatus = $scope.invBalance.inventoryDetail;
            c(JSON.stringify($scope.negativeStatus));
          }
        }
      } else {
        $scope.scanItemUpc = "";
        alert("Invalid Item/UPC!!");
        $scope.positiveAdj.itemOrUpc = "";
        $scope.moveFocusToNextField("scanitemfocus");
      }
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
      console.log("dataObj_dataObj" + JSON.stringify(dataObj));
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
          const index = $scope.orderItems.findIndex(
            (item) => item.lineNo == $scope.itemObj.lineNo
            //item.isPositive == $scope.isPositive
          );
          if (parseInt(index) > parseInt(-1)) {
            $scope.orderItems[index]["pickQty"] = $scope.itemObj.adjQty; //["pickQty"];
            $scope.orderItems[index]["configuredItems"] =
              $scope.configuredItems;
          }

          console.log(
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
      if (!$scope.backUpRecId) {
        return alert("Please scan item!!");
      }
      $scope.backUpRecId = $scope.backUpRecId; //83;
      $scope.loading = true;
      var dataObj = {
        recId: $scope.backUpRecId,
      };
      $http
        .post(ajaxUrl + "&ref=apprCompltBackup", JSON.stringify(dataObj))
        .then(
          function (response) {
            var data = response["data"];
            console.log("data", data);
            $scope.loading = false;
            if (data.status === "failure") {
              return alert(data.e.message);
            }
            alert("Receipt is created successfully " + data.tranIdText);
            $window.location.reload();
          }

          // function (response) {
          //   console.log(response.e.message);
          //   $scope.loading = false;
          //  var errorMsg = response.data?.e?.message;
          //   alert(errorMsg);
          //   /* var parser = new DOMParser();
          //   var doc = parser.parseFromString(response.data, "text/html");
          //   var errorMessage = doc.querySelector(".uir-error-page-message")?.textContent;
          //   alert(errorMessage); */
          // }
        );
    };
    $scope.moveFocusToNextField = function (fieldId) {
      $timeout(function () {
        document.getElementById(fieldId).focus();
      });
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
    };
    // to show or hide stock bins
    $scope.showBinsQtyCard = function () {
      if ($scope.itemData.isBinItem) {
        $scope.showBinsCard = !$scope.showBinsCard;
      } else {
        $scope.showBinsCard = false;
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
      if (event.data[1] == "scanning") {
        $scope.scannedItem = event.data[0];
        $scope.getItemDetails();
      } else if (event.data[1] == "scanitem") {
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
      } else if (event.data[1] == "scanorder") {
        $scope.$apply(function () {
          $scope.scannedOrder = event.data[0];
          $scope.scanOrder();
        });
      }
      $window.removeEventListener("message", myClick);
    }
    $scope.generateSerials = function () {
      console.log("Trigger");
      /*  if(!$scope.itemData.itemID || !$scope.$scope.itemData.orderQty){
        alert('Item and Quantity are required');
      } */
      var requestData = {
        itemId: $scope.itemData.itemID,
        qty: $scope.itemData.orderQty,
      };
      console.log("requestData", requestData);
      $http
        .post(
          ajaxUrl + "&ref=generateSerialNumbers",
          JSON.stringify(requestData)
        )
        .then(
          function (response) {
            console.log("serials", response.data);
            if (response.data) {
              $scope.generatedSerials = response.data.serials;
              if (!$scope.configuredItems) {
                $scope.configuredItems = [];
              }
              var usedSerials = $scope.configuredItems.map(
                (item) => item.serialNO
              );
              var nextSerialIndex = $scope.generatedSerials.findIndex(
                (serial) => !usedSerials.includes(serial)
              );

              $scope.serialIndex =
                nextSerialIndex >= 0
                  ? nextSerialIndex
                  : $scope.configuredItems.length;
              $scope.positiveAdj.serialNO =
                $scope.generatedSerials[$scope.serialIndex] || "";
            } else {
              alert("No serials generated.");
            }
          },
          function (error) {
            alert("Failed to generate serial numbers.");
            console.log(error);
          }
        );
    };
  }
);
app.directive("focusOnLoad", function () {
  return {
    restrict: "A",
    link: function (scope, element) {
      element[0].focus();
    },
  };
});
