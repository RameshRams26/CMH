var app = angular.module('myApp', []);
app.controller('ShipOrderController', function ($scope, $window, $filter, $http, $timeout) {
  c = console.log.bind(document);
  $scope.urlObj = document.getElementById('myDataObj').innerHTML;
  $scope.urlObj = JSON.parse($scope.urlObj);
  var ajaxUrl = $scope.urlObj['ajaxUrl'];
  var PrintUrl = $scope.urlObj['PrintUrl'];
  ($scope.loading = false), $scope.backUpRecId, $scope.backUpRecText;
  $scope.allowClick = false;
  $scope.disableUpc = false;
  $scope.goBack = function (type) {
    if(type === 'kit'){
      $scope.isKit= false;
    }else{
      $window.history.back();
    }
  };

  $scope.quantity = 0;
  $scope.pickQty = 0;
  $scope.showBinsCard = false;

  $scope.logOut = function () {
    const confirmation = confirm('Are you sure you want to logout?');
    if (confirmation) {
      $window.location.href = $scope.urlObj['logIn'];
    }
  };
  $scope.getSetUpData = function () {
    $scope.loading = true;
    $http
      .get(
        ajaxUrl +
          '&ref=getSetUpData' +
          '&setUpId=' +
          $scope.urlObj['setUpId'] +
          '&locationId=' +
          $scope.urlObj['locationId'],
      )
      .then(
        function (response) {
          $scope.setUpData = response['data']['setUpData'];
          $scope.locObj = response['data']['locationObj'];
          if ($scope.urlObj['tranId']) {
            $scope.scannedOrder = $scope.urlObj['tranId'];
            $scope.scannedOrderStatus = $scope.urlObj['status'];
            $scope.scanOrder();
          }
          $scope.loading = false;
        },
        function (response) {
          $scope.loading = false;
          alert('error::::::');
        },
      );
  };
  $scope.getSetUpData();
  
  $scope.scanOrder = function () {
    if ($scope.scannedOrder) {
      $scope.moveFocusToNextField('scanitem');
      $scope.loading = true;
      $http
        .get(
          ajaxUrl +
            '&ref=getOrderData' +
            '&setUpData=' +
            JSON.stringify($scope.setUpData) +
            '&scannedOrder=' +
            $scope.scannedOrder +
            '&locationId=' +
            $scope.urlObj['locationId'],
        )
        .then(
          function (response) {
            var data = response['data'];
            if (data.status == 'Error') {
              $scope.scannedOrder = '';
              $scope.loading = false;
              $scope.moveFocusToNextField('scanorder');
              $scope.orderItems = [];
              return alert(data.message);
            }
            if (!data.items.length) {
              $scope.loading = false;
              $scope.scannedOrder = '';
              $scope.moveFocusToNextField('scanorder');
              return alert('Items not found');
            }
            $scope.orderId = data.orderId;
            $scope.orderText = data.orderText;
            $scope.customer = data.customer;
            $scope.customerText = data.customerText;
            $scope.createdBy = data.createdBy;
            $scope.salesRep = data.salesRep;
            if (!data.lineNumber) {
              // $window.location.reload();
              $scope.scannedOrder = '';
              $scope.orderText = '';
              $scope.loading = false;
              $scope.moveFocusToNextField('scanorder');
              return alert('NetScore unique id is missing!!\n Please edit and save the SO#!');
            } else {
              $scope.orderItems = data.items;
            }
            $scope.loading = false;
          },
          function (response) {
            $scope.loading = false;
            alert('error::::::');
          },
        );
    } else {
    }
  };

  $scope.kitConfigurations = {};

  $scope.getItemDetails = function (itemObj) {
    if ( $scope.isKit == true) {
      return $scope.getKitItemDetails();
    }
    $scope.disableUpc = false;
    $scope.isKit = false;
    $scope.labelQty = 1;
    $scope.scannedSerialNo = '';
    if ($scope.scannedItem) {
      if ($scope.scannedItem) {
        var obj = $scope.orderItems?.find((u) => u.upc == $scope.scannedItem || u.itemName.toLowerCase() == $scope.scannedItem.toLowerCase());
        console.log('Obj:::::' + JSON.stringify(obj));
        if (obj) {
          $scope.scannedItem = obj.itemID;
        } else {
          $scope.scannedSerialNo = '';
          $scope.scannedItem = '';
          $scope.moveFocusToNextField('scanitem');
          return alert('Item not found!!');
        }
        if (!itemObj) {
          var sameItemsArray = $scope.orderItems.filter(function (item) {
            return (
              item.itemID === $scope.scannedItem
              // &&item.pickQty != item.quantity
            );
          });
          if (sameItemsArray.length > 1) {
            $scope.allowClick = true;
            return ($scope.sameItems = sameItemsArray);
          } else {
            itemObj = sameItemsArray[0];
          }
          // if (!sameItemsArray.length) {
          //   $scope.scannedItem = "";
          //   $scope.moveFocusToNextField('scanitem');
          //   return alert('Quantity is already picked!!');
          // }
          console.log(sameItemsArray);
        }
        console.log('order items',$scope.orderItems);
        if (itemObj) {
          var obj = $scope.orderItems.find((u) => u.lineNo == itemObj.lineNo);
          if (obj.pickQty == obj.quantity) {
            $scope.scannedItem = '';
            $scope.moveFocusToNextField('scanitem');
            //return alert('Quantity is already picked!!');
          }
          $scope.itemData = itemObj;
          $scope.itemData.orderQty = obj.quantity;
          $scope.itemData.pickedQty = obj.pickQty;
          $scope.itemData.lineNo = obj.lineNo;
          $scope.loading = true;
          $http
            .get(
              ajaxUrl +
                '&ref=itemData' +
                '&setUpData=' +
                JSON.stringify($scope.setUpData) +
                '&scannedItem=' +
                obj.itemID +
                '&locationId=' +
                $scope.urlObj['locationId'],
            )
            .then(function (response) {
              $scope.loading = false;
              var data = response['data'];
              console.log('JSON.stringify(data)' + JSON.stringify(data));
              $scope.itemData.image = data.image;
              $scope.itemData.itemDesc = data.itemDesc;
              $scope.itemData.unitstype = data.units;
              $scope.unittype = data.units;
              $scope.type = data.type;

              console.log('type', $scope.type);
              $scope.invBalance = data.invBalance[$scope.urlObj['locationId']];
              $scope.preferdBins = data.preferdBins;
              $scope.allBins = data.allBins;
              $scope.allStatus = data.allStatus;
              $scope.inventoryDetail = data?.invBalance?.[$scope.urlObj['locationId']]?.inventoryDetail;
              console.log('mul bins',$scope.inventoryDetail);
              $scope.uniqueArray=[];
              $scope.uniqueArray   =  $scope.inventoryDetail ? $scope.inventoryDetail.filter((item, index, self) =>
                index === self.findIndex(other => other.binNo === item.binNo)
            ) : [];
              //console.log('unique',$scope.uniqueArray);   
              const index = $scope.orderItems.findIndex((item) => item.lineNo == $scope.itemData.lineNo);
              $scope.scannedItem = '';
              $scope.sameItems = [];
              $scope.allowClick = false;
              $scope.isPositive = false;
              ($scope.negativeAdj = {}),
                ($scope.negativeBins = []),
                ($scope.negativeStatus = []),
                ($scope.negBinsAllStatus = []),
                ($scope.configuredItems = []);
              if (data.type == 'kititem') {
                $scope.isKit = true;
                $scope.kitData = data;
                $scope.kitData.kitQuantity = obj.quantity;
                console.log('kqty',obj.quantity,$scope.kitData);
                console.log(obj.itemID,$scope.kitConfigurations[obj.itemID]);
                var kitobj = $scope.kitData.kitMemberArr.find(k => k.kitId == itemObj.itemID );
                console.log('kitobj',kitobj);
              //   if ($scope.kitConfigurations[obj.itemID]) {
              //     $scope.kitData.kitMemberArr = $scope.kitConfigurations[obj.itemID].kitMemberArr;
              //     if ($scope.kitData.kitMemberArr.length > 0) {
              //       $scope.getKitItemDetails($scope.kitData.kitMemberArr[0]);
              //   }
              // } else {
              //     $scope.kitData.kitMemberArr.forEach((element) => {
              //         element.orderQty = Number(element.memberQty) * Number(obj.quantity);
              //     });
              // }
              /* $scope.kitData.kitMemberArr.forEach((element) => {
                element.orderQty = Number(element.memberQty) * Number(obj.quantity);
                
                if ($scope.orderItems[index]?.kitConfiguredItems?.[element.itemID]) {
                    element.configuredItems = $scope.orderItems[index].kitConfiguredItems[element.itemID];
        
                }
            }); */
            var kitindex = $scope.orderItems.findIndex(i => i.itemID == itemObj.itemID);
            console.log(kitindex);
            console.log($scope.orderItems[kitindex]);
            if(kitindex > -1 ){
              $scope.kitData.kitMemberArr.forEach(element => {
                element.configuredItems = $scope.orderItems[kitindex].kitConfiguredItems[element.itemID] ? $scope.orderItems[kitindex].kitConfiguredItems[element.itemID]:[];
                element.pickQty = element.configuredItems.reduce((sum, item) => {
                  return sum + (item.qty ? Number(item.qty) : 0);
                }, 0);
                element.lineNo = $scope.orderItems[kitindex].lineNo;
              });
            }

                $scope.kitData.kitMemberArr.forEach((element) => {
                  element.orderQty = Number(element.memberQty) * Number(obj.quantity);
                });
                console.log('datakit',$scope.kitData.kitMemberArr);
                
               // $scope.getKitItemDetails(itemObj);
                // $scope.configuredItems = data.kitMemberArr;
                // if ($scope.itemData['pickedQty'] > 0) {
                //   $scope.configuredItems.forEach((element) => {
                //     element.qty = Number(element.memberQty) * Number($scope.itemData['pickedQty']);
                //   });
                // }
              } else {
                $scope.configuredItems = $scope.orderItems[index]['configuredItems'];
                var myModalEl = document.getElementById('itemDataModal');
                $scope.myModal = new bootstrap.Modal(myModalEl, {
                  keyboard: false,
                });
                $scope.inventoryDetail = $scope.invBalance?.inventoryDetail;
                $scope.binsWithQty = [];
                if ($scope.itemData['isSerialItem']) {
                  $scope.findBinCount($scope.inventoryDetail, 'binNoText');
                } else {
                  $scope.inventoryDetail?.forEach((element) => {
                    if (element.binNoText) {
                      $scope.binsWithQty.push({
                        binNoText: element.binNoText,
                        binCount: element.available,
                      });
                    }
                  });
                  console.log($scope.binsWithQty);
                }

                $scope.myModal.show();
                if ($scope.negativeStatus.length == '1') {
                  $scope.negativeAdj.selectedStatus = $scope.negativeStatus[0].invStatusId;
                  $scope.selectNegStatus($scope.negativeAdj.selectedStatus);
                }

                if ($scope.scannedSerialNo) {
                  $scope.positiveAdj = true;
                  $scope.scanSerialItem($scope.scannedSerialNo);
                }
                $scope.myModal._element.addEventListener('shown.bs.modal', function () {
                  if ($scope.type == 'kititem' || $scope.type == 'serializedassemblyitem' || $scope.type == 'serializedinventoryitem') {
                    $scope.moveFocusToNextField('scanItemUpc');
                  } else {
                    $scope.negativeAdj.itemOrUpc = $scope.itemData.itemName;
                    $scope.scanItemUpc($scope.itemData.itemName);
                    // $scope.moveFocusToNextField("qty");
                  }
                });
              }

              $scope.loading = false;
            });
        } else {
          $scope.loading = false;
          $scope.scannedItem = '';
          $scope.moveFocusToNextField('scanitem');
          return alert('Item not found');
        }
      }
    }
  };

  $scope.getKitItemDetails = function(itemObj){
 console.log('triggered',$scope.kitData.kitMemberArr);
 $scope.disableUpc = false;
    //$scope.isKit = false;
    $scope.labelQty = 1;
    $scope.scannedSerialNo = '';
    if ($scope.kitConfigurations[$scope.kitData.kitId]) {
      $scope.kitData.kitMemberArr = $scope.kitConfigurations[$scope.kitData.kitId].kitMemberArr;
  }
  
    if ($scope.scannedItem) {
      if ($scope.scannedItem) {
        var obj = $scope.kitData.kitMemberArr?.find((u) => u.upc == $scope.scannedItem || u.itemName == $scope.scannedItem);
        var qty_kit = $scope.kitData.kitQuantity;
        console.log('kitquantity',qty_kit);
        console.log('Obj:::::' + JSON.stringify(obj));
        if (obj) {
          $scope.scannedItem = obj.itemID;
        } else {
          $scope.scannedSerialNo = '';
          $scope.scannedItem = '';
          $scope.moveFocusToNextField('scanitem');
          return alert('Item not found!!');
        }
        if (!itemObj) {
          var sameItemsArray = $scope.kitData.kitMemberArr.filter(function (item) {
            return (
              item.itemID === $scope.scannedItem
              // &&item.pickQty != item.quantity
            );
          });
          if (sameItemsArray.length > 1) {
            $scope.allowClick = true;
            return ($scope.sameItems = sameItemsArray);
          } else {
            itemObj = sameItemsArray[0];
          }
          // if (!sameItemsArray.length) {
          //   $scope.scannedItem = "";
          //   $scope.moveFocusToNextField('scanitem');
          //   return alert('Quantity is already picked!!');
          // }
          console.log(sameItemsArray);
        }
        console.log('order items',$scope.orderItems);
        if (itemObj) {
          var obj = $scope.kitData.kitMemberArr.find((u) => u.itemID == itemObj.itemID);
          console.log('kitobj',obj);
          if (obj.pickQty == obj.orderQty) {
            $scope.scannedItem = '';
            $scope.moveFocusToNextField('scanitem');
            //return alert('Quantity is already picked!!');
          }
          $scope.itemData = itemObj;
          $scope.itemData.orderQty = obj.orderQty;
          $scope.itemData.pickedQty = obj.pickQty;
          $scope.itemData.pickQty = obj.pickQty;
          $scope.loading = true;
          $http
            .get(
              ajaxUrl +
                '&ref=itemData' +
                '&setUpData=' +
                JSON.stringify($scope.setUpData) +
                '&scannedItem=' +
                obj.itemID +
                '&locationId=' +
                $scope.urlObj['locationId'],
            )
            .then(function (response) {
              $scope.loading = false;
              var data = response['data'];
              console.log('JSON.stringify(data)' + JSON.stringify(data));
              $scope.itemData.image = data.image;
              $scope.itemData.itemDesc = data.itemDesc;
              $scope.itemData.unitstype = data.units;
              $scope.unittype = data.units;
              $scope.type = data.type;

              console.log('type', $scope.type);
              $scope.invBalance = data.invBalance[$scope.urlObj['locationId']];
              $scope.preferdBins = data.preferdBins;
              $scope.allBins = data.allBins;
              $scope.allStatus = data.allStatus;
              if (obj.kitName) {
                $scope.itemData.isKitMember = true;
                $scope.itemData.kitName	= obj.kitName;
                $scope.itemData.kitId	= obj.kitId;
                $scope.itemData.kitQuantity = qty_kit;
              } else {
                $scope.itemData.isKitMember = false;
              }
              $scope.inventoryDetail = data?.invBalance?.[$scope.urlObj['locationId']]?.inventoryDetail;
              console.log('mul bins',$scope.inventoryDetail);
              $scope.uniqueArray=[];
              $scope.uniqueArray   =  $scope.inventoryDetail ? $scope.inventoryDetail.filter((item, index, self) =>
                index === self.findIndex(other => other.binNo === item.binNo)
            ) : [];
              console.log('unique',$scope.uniqueArray);   
              const index = $scope.kitData.kitMemberArr.findIndex((item) => item.itemID == $scope.itemData.itemID);
              $scope.scannedItem = '';
              $scope.sameItems = [];
              $scope.allowClick = false;
              $scope.isPositive = false;
              ($scope.negativeAdj = {}),
                ($scope.negativeBins = []),
                ($scope.negativeStatus = []),
                ($scope.negBinsAllStatus = []),
                ($scope.configuredItems = []);
              // if (data.type == 'kititem') {
              //   $scope.isKit = true;
              //   $scope.kitData = data;
              //   $scope.kitData.kitQuantity = obj.quantity;
              //   $scope.kitData.kitMemberArr.forEach((element) => {
              //     element.orderQty = Number(element.memberQty) * Number(obj.quantity);
              //   });
              //   // $scope.configuredItems = data.kitMemberArr;
              //   // if ($scope.itemData['pickedQty'] > 0) {
              //   //   $scope.configuredItems.forEach((element) => {
              //   //     element.qty = Number(element.memberQty) * Number($scope.itemData['pickedQty']);
              //   //   });
              //   // }
              // } else {
                $scope.configuredItems = $scope.kitData.kitMemberArr[index]['configuredItems'];
                console.log('conf',$scope.kitData.kitMemberArr[index]['configuredItems']);
                var myModalEl = document.getElementById('itemDataModal');
                $scope.myModal = new bootstrap.Modal(myModalEl, {
                  keyboard: false,
                });
                $scope.inventoryDetail = $scope.invBalance?.inventoryDetail;
                $scope.binsWithQty = [];
                if ($scope.itemData['isSerialItem']) {
                  $scope.findBinCount($scope.inventoryDetail, 'binNoText');
                } else {
                  $scope.inventoryDetail?.forEach((element) => {
                    if (element.binNoText) {
                      $scope.binsWithQty.push({
                        binNoText: element.binNoText,
                        binCount: element.available,
                      });
                    }
                  });
                  console.log($scope.binsWithQty);
                }

                $scope.myModal.show();
                if ($scope.negativeStatus.length == '1') {
                  $scope.negativeAdj.selectedStatus = $scope.negativeStatus[0].invStatusId;
                  $scope.selectNegStatus($scope.negativeAdj.selectedStatus);
                }

                if ($scope.scannedSerialNo) {
                  $scope.positiveAdj = true;
                  $scope.scanSerialItem($scope.scannedSerialNo);
                }
                $scope.myModal._element.addEventListener('shown.bs.modal', function () {
                  if ($scope.type == 'kititem' || $scope.type == 'serializedassemblyitem' || $scope.type == 'serializedinventoryitem') {
                    $scope.moveFocusToNextField('scanItemUpc');
                  } else {
                    $scope.negativeAdj.itemOrUpc = $scope.itemData.itemName;
                    $scope.scanItemUpc($scope.itemData.itemName);
                    // $scope.moveFocusToNextField("qty");
                  }
                });
              //}

              $scope.loading = false;
            });
        } else {
          $scope.loading = false;
          $scope.scannedItem = '';
          $scope.moveFocusToNextField('scanitem');
          return alert('Item not found');
        }
      }
    }
  }

  $scope.viewItem = function (itemObj) {
    $scope.scannedItem = itemObj.itemName;
    if($scope.isKit){
      $scope.getKitItemDetails(itemObj);
    }else{
      $scope.getItemDetails(itemObj);
    }
    //$scope.getItemDetails(itemObj);
   
  };

  $scope.scanLotItem = function () {
    if ($scope.isPositive) {
    } else {
      if ($scope.itemData['isBinItem'] == true) {
        if ($scope.negativeAdj.lotNO) {
          $scope.negBinsAllStatus = $filter('filter')(
            $scope.invBalance.inventoryDetail,
            {
              invNoText: $scope.negativeAdj.lotNO,
            },
            true,
          );
          if ($scope.negBinsAllStatus.length <= 0) {
            $scope.negativeAdj.lotNO = '';
            return alert('LOT number not found!!');
          }
          $scope.negativeBins = $scope.negBinsAllStatus.filter(function (item, index, self) {
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
        $scope.negativeStatus = $filter('filter')(
          $scope.invBalance.inventoryDetail,
          {
            invNoText: $scope.negativeAdj.lotNO,
          },
          true,
        );
      }
      if ($scope.negativeStatus.length === 1) {
        $scope.negativeAdj.selectedStatus = $scope.negativeStatus[0].invStatusId;
        $scope.negativeAdj.avlqty = $scope.negativeStatus[0]['available'];
        $scope.negativeAdj.selectedStatusText = $scope.negativeStatus[0]['invStatus'];
      }
    }
  };
  $scope.scanSerialItem = function (serialNo) {
    if (!serialNo) {
      return '';
    }
    var obj = $scope.inventoryDetail.find((u) => u.invNoText == serialNo);
    if ($scope.isPositive) {
      if (obj) {
        alert('Serial No Already Exists!!');
        $scope.positiveAdj.serialNO = '';
      } else {
        var obj = $scope.configuredItems.find((u) => u.serialNO == serialNo);
        if (obj) {
          alert('Serial No Already Exists!!');
          $scope.positiveAdj.serialNO = '';
        } else {
          $scope.disableQty = true;
          $scope.positiveAdj.qty = 1;
        }
      }
    } else {
      if (obj) {
        const result = $scope.configuredItems.find((item) => item.serialNO == serialNo);
        if (result) {
          alert('Configured with same data already!!');
          return ($scope.negativeAdj = {});
        }
        // if ($scope.itemInventoryDetail.length) {
        //   var obj = $scope.itemInventoryDetail.find(
        //     (u) => u.invNoText == serialNo
        //   );
        // }
        $scope.negativeAdj = {
          serialNO: serialNo,
          binNO: obj.binNo,
          binNoText: obj.binNoText,
          avlqty: obj.available,
          selectedStatus: obj.invStatusId,
          qty: obj.onHand ? obj.onHand : obj.invQty,
          selectedStatusText: obj.invStatus,
        };
        var totalQty = $scope.configuredItems.reduce((total, item) => total + parseInt(item.qty, 10), 0);
        if (Number(totalQty) + Number($scope.negativeAdj.qty) > Number($scope.itemData['orderQty'])) {
          $scope.negativeAdj.qty = '';
          $scope.moveFocusToNextField('qty');
          return alert('Picked quantity is greaterthan order quantity');
        }
        $scope.pickQty = Number(totalQty) + Number($scope.negativeAdj.qty);
        $scope.configuredItems.push($scope.negativeAdj);
        $scope.negativeAdj = {};
      } else {
        $scope.negativeAdj.serialNO = '';
        return alert('Serial No Not Found!!');
      }
      if ($scope.negativeStatus.length === 1) {
        $scope.negativeAdj.selectedStatus = $scope.negativeStatus[0].invStatusId;
        $scope.negativeAdj.avlqty = $scope.negativeStatus[0]['available'];
        $scope.negativeAdj.selectedStatusText = $scope.negativeStatus[0]['invStatus'];
      }
    }
  };
  $scope.scanItemUpc = function (itemUpc) {
    if (!itemUpc) {
      return;
    }
    if ($scope.itemData.type == 'Kit') {
    //if($scope.isKitCon){
      var obj = $scope.configuredItems.find((item) => item.itemName == itemUpc || item.skuNumber == itemUpc);
      if (obj) {
        $scope.disableUpc = true;
        if (!$scope.negativeAdj.itemOrUpc) {
          $scope.negativeAdj.itemOrUpc = itemUpc;
        }
        $scope.moveFocusToNextField('qty');
      } else {
        $scope.moveFocusToNextField('scanItemUpc');
        $scope.negativeAdj.itemOrUpc = '';
        return alert('Wrong item scanned');
      }
    } else {
      if ($scope.itemData.itemName == itemUpc || $scope.itemData.upc == itemUpc) {
        $scope.disableUpc = true;
        if ($scope.isPositive) {
          if ($scope.itemData['isBinItem'] == true) {
            $scope.moveFocusToNextField('bin');
          } else {
            // $scope.moveFocusToNextField("selectStatus");
            $scope.moveFocusToNextField('qty');
          }
        } else {
          if ($scope.itemData['isBinItem'] == true) {
            //$scope.negativeBins = $scope.invBalance?.inventoryDetail;
            $scope.negativeBins = $scope.uniqueArray;
            $scope.moveFocusToNextField('bin');
          } else {
            $scope.negativeStatus = $scope.invBalance.inventoryDetail;
           // $scope.negativeAdj.avlqty = $scope.inventoryDetail?.[0]?.available;
            $scope.moveFocusToNextField('qty');
          }
        }
      } else {
        alert('Invalid Item/UPC!!');
        $scope.negativeAdj.itemOrUpc = '';
        $scope.positiveAdj.itemOrUpc = '';
        $scope.moveFocusToNextField('scanInvOrUpc');
      }
    }
  };
  $scope.selectNegBin = function () {
    if ($scope.negativeAdj.binNO) {
      if ($scope.negativeAdj.lotNO) {
        $scope.negativeStatus = $filter('filter')(
          $scope.negBinsAllStatus,
          {
            binNo: $scope.negativeAdj.binNO,
          },
          true,
        );
      } else if ($scope.negativeAdj.itemOrUpc) {
       // $scope.negativeBins = $scope.inventoryDetail;
        console.log('check',$scope.negativeBins);
        $scope.negativeStatus = $filter('filter')(
          $scope.inventoryDetail,
          {
            binNo: $scope.negativeAdj.binNO,
          },
          true,
        );
        $scope.selectNegStatus();
      }

      var obj = $scope.negativeBins.find((u) => u.binNo == $scope.negativeAdj.binNO);
      $scope.negativeAdj.binNoText = obj['binNoText'];
      $scope.negativeAdj.avlqty = obj['available'];
      var splObj = $scope.inventoryDetail.find((u) => u.binNo == $scope.negativeAdj.binNO);
      $scope.negativeAdj.avlqty = obj['available'];
      if (splObj) {
        $scope.negativeAdj.qty = splObj?.invQty ? Number(splObj?.invQty) : '';
        $scope.negativeAdj.avlqty = splObj?.available ? Number(splObj?.available) : '';
      }
      $scope.moveFocusToNextField('selectstatus');
    } else {
      $scope.negativeStatus = [];
      $scope.negativeAdj.binNoText = '';
      $scope.negativeAdj.avlqty = '';
      $scope.negativeAdj.qty = '';
    }
    // $scope.negativeAdj.avlqty = "";
    $scope.negativeAdj.selectedStatus = '';
    //  $scope.negativeAdj.qty = "";
    $scope.negativeAdj.selectedStatusText = '';
  };

  $scope.selectNegStatus = function () {
    if ($scope.negativeStatus?.length) {
      $scope.negativeAdj.avlqty = $scope.negativeStatus[0]['available'];
    }
    // $scope.moveFocusToNextField("qty");
    // // if ($scope.negativeAdj.selectedStatus) {
    // //   var obj = $scope.negativeStatus.find(
    // //     (u) => u.invStatusId == $scope.negativeAdj.selectedStatus
    // //   );
    // //   $scope.negativeAdj.avlqty = obj["available"];
    // //   $scope.negativeAdj.selectedStatusText = obj["invStatus"];
    // // } else {
    // //   $scope.negativeAdj.avlqty = "";
    // //   $scope.negativeAdj.qty = "";
    // //   $scope.negativeAdj.selectedStatusText = "";
    // // }

    if ($scope.negativeStatus?.length) {
      $scope.negativeAdj.selectedStatus = $scope.negativeStatus[0].invStatusId;
    }

    // if ($scope.negativeAdj.lotNO || $scope.negativeAdj.serialNO){
    //   if ($scope.negativeStatus.length === 1 ){
    //     $scope.negativeAdj.selectedStatus = $scope.negativeStatus[0].invStatusId;
    //   }
    // }
    if ($scope.negativeAdj?.selectedStatus) {
      var obj = $scope.negativeStatus.find((u) => u.invStatusId == $scope.negativeAdj.selectedStatus);
      $scope.negativeAdj.avlqty = obj['available'];
      $scope.negativeAdj.selectedStatusText = obj['invStatus'];
      $scope.moveFocusToNextField('qty');
    } else {
      // $scope.negativeAdj.avlqty = "";
      // $scope.negativeAdj.qty = "";
      // $scope.negativeAdj.selectedStatusText = "";
    }
  };

  $scope.enterQuantity = function () {
    if ($scope.negativeAdj.selectedStatus) {
      if (Number($scope.negativeAdj.qty) > Number($scope.negativeAdj.avlqty)) {
        alert('You only have ' + $scope.negativeAdj.avlqty + ' available. Please enter a different quantity.');
        $scope.negativeAdj.qty = '';
      }
    }
  };

  $scope.addNegConfiguredItem = function () {
    //$scope.itemData.type == 'Kit'
    console.log('configuration',$scope.configuredItems);
    if ($scope.itemData.type == 'Kit') {
      var obj = $scope.configuredItems.find(
        (item) => item.skuNumber == $scope.negativeAdj.itemOrUpc || item.itemName == $scope.negativeAdj.itemOrUpc,
      );
      if (obj) {
        obj.qty = obj.qty ? obj.qty : 0;
        var totalQty = Number(obj.qty) + Number($scope.negativeAdj.qty);
        console.log(totalQty);
        if (!$scope.negativeAdj.qty || $scope.negativeAdj.qty == 0) {
          $scope.moveFocusToNextField('qty');
          return alert('Please enter quantity!!');
        }
        if ($scope.negativeAdj.qty < 0) {
          $scope.moveFocusToNextField('qty');
          return alert('Quantity should be greaterthan 0');
        }
        if (obj.type !== 'NonInvtPart') {
          if (totalQty > obj['available']) {
            $scope.negativeAdj = {};
            $scope.disableUpc = false;
            $scope.moveFocusToNextField('scanItemUpc');
            return alert('Please check available quantity!!');
          }
        }
        if (totalQty > Number(obj.memberQty * $scope.itemData['orderQty'])) {
          $scope.negativeAdj = {};
          $scope.disableUpc = false;
          $scope.moveFocusToNextField('scanItemUpc');
          return alert('Picked quantity is greaterthan order quantity');
        }
        obj.qty = totalQty;
        $scope.negativeAdj = {};
        $scope.disableUpc = false;
        $scope.moveFocusToNextField('scanItemUpc');
        $scope.configuredItems = $scope.configuredItems.sort((a, b) => {
          const qtyA = a.qty ? Number(a.qty) : 0;
          const qtyB = b.qty ? Number(b.qty) : 0;
          return qtyA - qtyB;
        });
      }
      console.log('dataObj', JSON.stringify(obj));
      // let allowPrinting = confirm("Do you want to print the Labels?");
      // if (allowPrinting) {
      //   let numberOfLabels = prompt(
      //     "How many labels do you want to print?",
      //     1
      //   );
      //   numberOfLabels = parseInt(numberOfLabels, 10);
      //   obj.itemDesc = obj.description;
      //   $scope.printLables(numberOfLabels, obj);
      // }
    } else {
      if (!$scope.negativeAdj.lotNO && $scope.setUpData['useLot'] == true && $scope.itemData['isLotItem'] == true) {
        return alert('Please scan LOT No!!');
      }
      if (
        !$scope.negativeAdj.serialNO &&
        $scope.setUpData['useSerial'] == true &&
        $scope.itemData['isSerialItem'] == true
      ) {
        return alert('Please scan Serial No!!');
      }
      if (
        !$scope.negativeAdj.itemOrUpc &&
        $scope.itemData['isLotItem'] == false &&
        $scope.itemData['isSerialItem'] == false
      ) {
        return alert('Please scan Item/UPC!!');
      }
      if (!$scope.negativeAdj.binNO && $scope.setUpData['useBins'] == true && $scope.itemData['isBinItem'] == true) {
        return alert('Please select Bin No!!');
      }
      if($scope.type !='noninventoryitem'){
        if (!$scope.negativeAdj.selectedStatus && $scope.setUpData['useInvStatus'] == true) {
          return alert('Please select status!!');
        }
      }
      if (!$scope.negativeAdj.qty || $scope.negativeAdj.qty == 0) {
        $scope.moveFocusToNextField('qty');
        return alert('Please enter quantity!!');
      }
      if ($scope.negativeAdj.qty < 0) {
        $scope.moveFocusToNextField('qty');
        return alert('Quantity should be greaterthan 0');
      }
      if ($scope.itemData.type == 'InvtPart') {
        if ($scope.negativeAdj.avlqty < $scope.negativeAdj.qty || !$scope.negativeAdj.avlqty) {
          $scope.negativeAdj.qty = '';
          $scope.moveFocusToNextField('qty');
          return alert('Please check available Quantity');
        }
      }
      const result = $scope.configuredItems.find(
        (item) =>
          item.lotNO == $scope.negativeAdj.lotNO &&
          item.binNO == $scope.negativeAdj.binNO &&
          item.selectedStatus == $scope.negativeAdj.selectedStatus,
      );

      if (result) {
        alert('Configured with same data already!!');
        $scope.negativeAdj = {};
        $scope.negativeAdj.itemOrUpc = $scope.itemData.itemName;
        return $scope.scanItemUpc($scope.itemData.itemName);
      }

      var totalQty = Number($scope.itemData.pickedQty) + Number($scope.negativeAdj.qty);
      if (totalQty > Number($scope.itemData['orderQty'])) {
        $scope.negativeAdj.qty = '';
        $scope.moveFocusToNextField('qty');
        return alert('Picked quantity is greaterthan order quantity');
      } else {
       $scope.itemData.pickedQty = Number($scope.itemData.pickedQty) + Number($scope.negativeAdj.qty);
      }
      //  $scope.pickQty =
      //    Number(totalQty) + Number($scope.negativeAdj.qty);
      $scope.pickQty = $scope.itemData.pickedQty;
      //$scope.negativeAdj.qty = $scope.itemData.pickedQty;
      $scope.negativeAdj.itemName = $scope.itemData.itemName;
      $scope.negativeAdj.itemDesc = $scope.itemData.itemDesc;
      $scope.negativeAdj.unitstype = $scope.itemData.units == 'UoM' ? $scope.itemData.orderdUom : $scope.itemData.units;
      $scope.configuredItems.push($scope.negativeAdj);
      $scope.negativeAdj = {};
      $scope.negativeAdj.itemOrUpc = $scope.itemData.itemName;
      $scope.scanItemUpc($scope.itemData.itemName);
      $scope.moveFocusToNextField('scanItemUpc');
    }
  };

  $scope.deleteConfiguredItem = function (index, item) {
    const confirmation = confirm('Are you sure you want to delete?');
    if (confirmation) {
      $scope.configuredItems.splice(index, 1);
      $scope.itemData['pickedQty'] = $scope.configuredItems.length;
      $scope.itemData['pickQty'] = $scope.configuredItems.length;
    }
  };

  $scope.openScanner = function (from) {
    $scope.from = from;
    $window.parent.postMessage({ func: 'pickscanBarcodeforV3', message: $scope.from }, '*');
    $window.addEventListener('message', myClick);
  };
  function myClick(event) {
    if (event.data[1] == 'scanItem') {
      $scope.$apply(function () {
        $scope.scannedItem = event.data[0];
        $scope.getItemDetails();
      });
    } else if (event.data[1] == 'scanOrder') {
      $scope.$apply(function () {
        $scope.scannedOrder = event.data[0];
        $scope.scanOrder();
      });
    } else if (event.data[1] == 'itemOrUpc') {
      $scope.$apply(function () {
        $scope.negativeAdj.itemOrUpc = event.data[0];
        $scope.scanItemUpc($scope.negativeAdj.itemOrUpc);
      });
    } else if (event.data[1] == 'serialNO') {
      $scope.$apply(function () {
        $scope.negativeAdj.serialNO = event.data[0];
        $scope.scanSerialItem($scope.negativeAdj.serialNO);
      });
    }
    $window.removeEventListener('message', myClick);
  }

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
            k['binCount']++;
          }
        });
      } else {
        let a = {};
        a[key] = x[key];
        a['binCount'] = 1;
        if (a[key] !== $scope.selectstagebin) {
          $scope.binsWithQty.push(a);
        }
      }
    });
    console.log($scope.binsWithQty);
  };

  // to show or hide stock bins
  $scope.showBinsQtyCard = function () {
    if ($scope.itemData.isBinItem) {
      $scope.showBinsCard = !$scope.showBinsCard;
    } else {
      $scope.showBinsCard = false;
    }
  };

  $scope.submitConfiguredItem = function () {
    console.log('saving',$scope.type);
    //if ($scope.itemData.type == 'Kit') {
    if($scope.isKit == true){
      return $scope.submitKitConfiguredItem();
    }
    /* if($scope.isKit) {
      console.log($scope.configuredItems);
      for (let i = 0; i < $scope.configuredItems.length; i++) {
        let item = $scope.configuredItems[i];
        item.isItemPicked = false;
        console.log(parseFloat(item.qty) % parseFloat(item.memberQty));
        console.log(typeof(item.qty), typeof(obj.memberQty));
        if (parseFloat(item.qty) % parseFloat(item.memberQty) == 0) {
          item.isItemPicked = true;
          //  if (parseFloat(item.qty)/parseFloat(item.memberQty)) {
          item.kitQty = parseFloat(item.qty) / parseFloat(item.memberQty);
          //  }
        } else {
          return alert(`${item.itemName} component is not properly picked`);
        }
      }
      let allowKit = $scope.configuredItems.every((item) => item.kitQty == $scope.configuredItems[0].kitQty);
      if (!allowKit) {
        return alert('Please pick all components properly');
      } else {
        $scope.itemData.pickQty = $scope.configuredItems[0].kitQty;
      }
    } */
    $scope.loading = true;
    var dataObj = {
      empId: $scope.urlObj['empId'],
      setUpData: $scope.setUpData,
      isPositive: $scope.isPositive,
      itemData: $scope.itemData,
      locationid: $scope.urlObj['locationId'],
      configuredItems: $scope.configuredItems,
      backUpRecId: $scope.backUpRecId,
      soId: $scope.orderId,
      binTransfer: $scope.tranId,
    };
    console.log('check dataobj',dataObj);
    $http.post(ajaxUrl + '&ref=createBackup', JSON.stringify(dataObj)).then(
      function (response) {
        console.log('invresponse',response);
        var data = response['data'];
        $scope.loading = false;
        $scope.backUpRecId = data.backUpRecId;
        $scope.backUpRecText = data.backUpRecText;
        $scope.myModal.hide();
        $scope.itemObj = $scope.itemData;
        $scope.itemObj.onHand = $scope.invBalance?.['onHand'];
        $scope.itemObj.available = $scope.invBalance?.['available'];
        console.log('orderitems',$scope.orderItems);
        const index = $scope.orderItems.findIndex((item) => item.lineNo == $scope.itemObj.lineNo);
        if (index > -1 && $scope.itemData.type !== 'Kit') {
          $scope.orderItems[index]['pickQty'] = $scope.pickQty;
          $scope.orderItems[index]['configuredItems'] = $scope.configuredItems;
        }
        $scope.orderItems = $scope.orderItems.sort((a, b) => a.pickQty - b.pickQty);
        // if ($scope.itemData.type == 'InvtPart') {
        // let allowPrinting = confirm("Do you want to print the Labels?");
        // if (allowPrinting) {
        //   let numberOfLabels = prompt(
        //     "How many labels do you want to print?",
        //     1
        //   );
        //   numberOfLabels = parseInt(numberOfLabels, 10);
        //   if ($scope.itemData.type == "Kit") {
        //     $scope.itemData.qty = $scope.itemData.orderQty;
        //     $scope.itemData.skuNumber = $scope.itemData.upc;
        //     $scope.printLables(numberOfLabels, $scope.itemData);

        //   } else {
        //     $scope.printLables(numberOfLabels);

        //   }
        // }
        //}
      },
      function (response) {
        $scope.loading = false;
        alert('Please add inventory to item');
      },
    );
  };

  $scope.submitKitConfiguredItem = function () {
    console.log('kit saving',$scope.type);
    $scope.isItemPicked = false;
    $scope.loading = true;
    var dataObj = {
      empId: $scope.urlObj['empId'],
      setUpData: $scope.setUpData,
      isPositive: $scope.isPositive,
      itemData: $scope.itemData,
      locationid: $scope.urlObj['locationId'],
      configuredItems: $scope.configuredItems,
      backUpRecId: $scope.backUpRecId,
      soId: $scope.orderId,
      binTransfer: $scope.tranId,
    };
    console.log('DATAOBJ',dataObj);
    $http.post(ajaxUrl + '&ref=createBackup', JSON.stringify(dataObj)).then(
      function (response) {
        console.log('response',response);
        var data = response['data'];
        $scope.loading = false;
        $scope.backUpRecId = data.backUpRecId;
        $scope.backUpRecText = data.backUpRecText;
        $scope.myModal.hide();
        $scope.itemObj = $scope.itemData;
        $scope.itemObj.onHand = $scope.invBalance?.['onHand'];
        $scope.itemObj.available = $scope.invBalance?.['available'];
        console.log('kit',$scope.kitData.kitMemberArr);
        const index = $scope.kitData.kitMemberArr.findIndex((item) => item.itemID == $scope.itemObj.itemID);
        /* if (index > -1 && $scope.itemData.type !== 'Kit') {
          $scope.orderItems[index]['pickQty'] = $scope.pickQty;
          $scope.orderItems[index]['configuredItems'] = $scope.configuredItems;
        } */
         if (index > -1 && $scope.itemData.type !== 'Kit') {
          $scope.kitData.kitMemberArr[index]['pickQty'] = $scope.pickQty;
          $scope.kitData.kitMemberArr[index]['configuredItems'] = $scope.configuredItems;
        }
        var mainindex = $scope.orderItems.findIndex((item) => item.itemID == $scope.itemObj.kitId);
        if (mainindex > -1 &&  $scope.itemData.type !== 'Kit'){
          const componentId = $scope.itemObj.itemID;
         $scope.orderItems[mainindex]['kitConfiguredItems'][componentId] = $scope.configuredItems;
         console.log('kitconfigurationdata',$scope.orderItems[mainindex]['kitConfiguredItems']);

         const unconfiguredItems = $scope.kitData.kitMemberArr.filter(member => {
          const configuredItems = $scope.orderItems[mainindex]['kitConfiguredItems'][member.itemID] || [];
          const totalPickedQty = configuredItems.reduce((sum, item) => sum + (item.qty ? Number(item.qty) : 0), 0);
          return totalPickedQty < member.orderQty;
      });

      if (unconfiguredItems.length === 0) {
          $scope.orderItems[mainindex].pickQty = $scope.kitData.kitQuantity;
          console.log(`Updated pickQty for kit: ${$scope.kitData.kitQuantity}`);
      }
        }
        console.log('mainindex',mainindex);
      
        $scope.kitData.kitMemberArr = $scope.kitData.kitMemberArr.sort((a, b) => a.pickQty - b.pickQty);
        // if ($scope.itemData.type == 'InvtPart') {
        // let allowPrinting = confirm("Do you want to print the Labels?");
        // if (allowPrinting) {
        //   let numberOfLabels = prompt(
        //     "How many labels do you want to print?",
        //     1
        //   );
        //   numberOfLabels = parseInt(numberOfLabels, 10);
        //   if ($scope.itemData.type == "Kit") {
        //     $scope.itemData.qty = $scope.itemData.orderQty;
        //     $scope.itemData.skuNumber = $scope.itemData.upc;
        //     $scope.printLables(numberOfLabels, $scope.itemData);

        //   } else {
        //     $scope.printLables(numberOfLabels);

        //   }
        // }
        //}
      },
      function (response) {
        $scope.loading = false;
        alert('Please add inventory to item');
      },
    );
  };

  $scope.approveCompleteBackUp = function () {
    if (!$scope.backUpRecId) {
      $scope.moveFocusToNextField('scanitem');
      return alert('Please scan item!!');
    }
    var containsKit = $scope.orderItems.find((item) => item.type == 'Kit');
    if (containsKit) {
        const mainIndex = $scope.orderItems.findIndex(item => item.itemID === containsKit.itemID);
        if (mainIndex > -1 && $scope.orderItems[mainIndex]['kitConfiguredItems']) {
            const kitConfiguredItems = $scope.orderItems[mainIndex]['kitConfiguredItems'];

            const unconfiguredItems = $scope.kitData?.kitMemberArr ? $scope.kitData?.kitMemberArr.filter(member => {
                const componentId = member.itemID;
                const configuredItems = kitConfiguredItems[componentId] || [];
                const totalPickedQty = configuredItems.reduce((sum, item) => sum + (item.qty ? Number(item.qty) : 0), 0);

                return totalPickedQty < member.orderQty;
            }) : [];

            if (unconfiguredItems.length > 0) {
                const missingItems = unconfiguredItems.map(item => item.itemName || item.itemID).join(', ');
                return alert(`Configuration is missing or incomplete for the following kit items: ${missingItems}`);
            }
           
        }
  }
    $scope.backUpRecId = $scope.backUpRecId;
    $scope.loading = true;
    var dataObj = {
      recId: $scope.backUpRecId,
      status: $scope.scannedOrderStatus,
    };
    $http.post(ajaxUrl + '&ref=apprCmpltBackup', JSON.stringify(dataObj)).then(
      function (response) {
        var data = response['data'];
        if (data['status'] == 'failure') {
          $scope.loading = false;
          return alert(data.message.message);
        }
        $scope.loading = false;
        alert('Shipment created successfully ' + data.tranIdText);
        $scope.packItems(data.tranIdText);
        $scope.goToPickList();

        //$window.location.reload();
      },
      function (response) {
        $scope.loading = false;
        alert('Please scan Order!!');
      },
    );
  };
  $scope.moveFocusToNextField = function (fieldId) {
    $timeout(function () {
      document.getElementById(fieldId).focus();
    });
  };

  $scope.printLables = function (numberOfLabels, obj) {
    var printObj;
    if (obj) {
      printObj = [obj];
      if (printObj[0]?.memberQty) {
        printObj[0].kitQty = printObj[0].memberQty;
      } else {
        printObj[0].kitQty = 1;
      }
    } else {
      printObj = $filter('filter')($scope.configuredItems);
    }
    alert(JSON.stringify(printObj));
    if (!printObj.length) {
      return alert('Please select atleast one item..!');
    }
    if ($scope.itemData.isSerialItem) {
      for (let i = 0; i < printObj.length; i++) {
        let invNoText = printObj[i].serialNO;
        printObj[i].invNoText = invNoText;
      }
    }
    var dataObj = {
      itemName: $scope.itemData.itemName,
      upc: $scope.itemData.upc,
      itemDesc: $scope.itemData.itemDesc,
      isBinItem: $scope.itemData.isBinItem,
      isSerialItem: $scope.itemData.isSerialItem,
      isLotItem: $scope.itemData.isLotItem,
      printObj: printObj,
      numberOfLabels: numberOfLabels,
      skuNumber: $scope.itemData.upc,
      unittype: $scope.itemData.unitstype,
      quantity: printObj[0].qty,
      unitstype: $scope.unittype,
      orderText: $scope.orderText,
    };
    console.log(JSON.stringify(dataObj));

    var sendPrint = angular.copy(PrintUrl);
    sendPrint = sendPrint + '&from=shippingLabel' + '&data=' + JSON.stringify(dataObj);
    console.log('PrintUrl::' + sendPrint);

    $http.get(sendPrint).then(
      function (response) {
        var data = response['data'];
        console.log(data.length);
        console.log(`RESPONSE FROM PS::${data.length}` + JSON.stringify(data));
        $window.parent.postMessage(
          { func: 'printMultiLabels', message: JSON.stringify(data) }, //printMultiLabels
          '*',
        );
        $window.addEventListener('message', myClick);
      },
      function (response) {
        $scope.loading = false;
        alert('error::::::');
      },
    );
  };

  $scope.goToPickList = function () {
    var url = $scope.urlObj['pickList'];
    url +=
      '&empId=' +
      $scope.urlObj['empId'] +
      '&setUpId=' +
      $scope.urlObj['setUpId'] +
      '&locationId=' +
      $scope.urlObj['locationId'];
    $window.location.href = url;
  };
  // Redirects to pack order screen
  $scope.packItems = function (shipmentId) {
    if (shipmentId) {
      var url = $scope.urlObj['packshipOrd'];
      url +=
        '&empId=' +
        $scope.urlObj['empId'] +
        '&setUpId=' +
        $scope.urlObj['setUpId'] +
        '&locationId=' +
        $scope.urlObj['locationId'] +
        '&tranId=' +
        shipmentId;
      $window.location.href = url;
    }
  };
});
