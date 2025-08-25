var app = angular.module("myApp", []);
// alert(app);
app.controller(
  "cartputawayController",
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

    $timeout(function() {
      var dropdown = document.getElementById("scanitem");
      if(dropdown){
        dropdown.focus();
      }
  }, 1000);

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
    /* function myClick(event) {
      alert(JSON.stringify(event));
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
    }; */
    function myClick(event) {
     // alert(event.data[1]);
      if (event.data[1] == "scanning") {
        $scope.scannedItem = event.data[0];
        $scope.getItemDetails();
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
          $scope.positiveAdj.lotNO = event.data[0];
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

    $scope.selectstagebin = null;

    $scope.getStageBins = function () {
      $scope.loading = true;
      $http
        .get(
          ajaxUrl +
            "&ref=getStageBins" +
            "&locationId=" +
            $scope.urlObj["locationId"]
        )
        .then(
          function (response) {
            $scope.stageBins = response["data"]["stageBins"];
            c(JSON.stringify($scope.stageBins));
             console.log($scope.stageBins);
            $scope.loading = false;
             $scope.moveFocusToNextField("stagebin");
          },
          function (response) {
            $scope.loading = false;
            alert("error::::::");
          }
        );
    };

    $scope.getStageBins();

    $scope.getStageBinItems = function () {
      $scope.stagebins = $scope.selectstagebin;
      //alert($scope.stagebins);
      $scope.loading = true;
      var requestData = {
        ref: "stagebinitems",
        setUpData: JSON.stringify($scope.setUpData),
        selectedstagebin: $scope.stagebins,
        locationId: $scope.urlObj["locationId"],
      };
      $http
        .get(ajaxUrl, { params: requestData })
        .then(function (response) {
          // Handle the successful response here
          $scope.stagedBinItems = response.data['stageBinitems'];
          $scope.itemcount = $scope.stagedBinItems.length;
        })
        .finally(function () {
          $scope.loading = false;
        });
    };
    $scope.viewItem = function (itemObj) {
      $scope.scannedItem = itemObj.itemName;
      $scope.getItemDetails();
    };
   
    $scope.getItemDetails = function () {
      console.log('test scan',$scope.scannedItem);
      if ($scope.scannedItem || $scope.searchName) {
        var item = "";
        if ($scope.scannedItem) {
          item = $scope.scannedItem;
        } else {
          item = $scope.searchName;
        }
        var obj = $scope.stagedBinItems.find(
          (u) => u.itemName.toLowerCase() == $scope.scannedItem.toLowerCase() || u.upccode == $scope.scannedItem
        );
        if (!obj) {
          alert("Item not found!!");
          return ($scope.scannedItem = "");
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
              $scope.urlObj["locationId"] +
              "&stageBin=" + $scope.selectstagebin
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
               console.log('All Bins',$scope.binTransData);
              
               // console.log('obj',obj);
                $scope.positiveAdj={};
                if(!$scope.itemData["isSerialItem"]){
                  var obj = $scope.allBins[$scope.stagebins];
                  $scope.positiveAdj={
                    itemOrUpc:$scope.itemData.itemName,
                    fromBinNO:obj.id,
                    fromBinNOText:obj.value,
                    //fromStatusId:$scope.itemData.binTransData[0]?.invStatus,
                    //avlQty:$scope.itemData.binTransData[0]?.onHand
                    /* fromStatusId:$scope.itemData.binTransData[0]?.invStatusId,
                    fromStatusIdText:$scope.itemData.binTransData[0]?.invStatus, */
                    avlQty:$scope.itemData.binTransData[0]?.onHand,
                    //avlQty:$scope.itemData.Available
                  }

                  if($scope.binTransData.length == '1'){
                    $scope.positiveAdj={
                      itemOrUpc:$scope.itemData.itemName,
                      fromBinNO:obj.id,
                      fromBinNOText:obj.value,
                      fromStatusId:$scope.itemData.binTransData[0]?.invStatusId,
                      fromStatusIdText:$scope.itemData.binTransData[0]?.invStatus,
                      avlQty:$scope.itemData.binTransData[0]?.onHand,
                    }
                    //$scope.moveFocusToNextField("toBinNO");
                  }/* else{
                    $scope.moveFocusToNextField("fromStatus");
                  } */
                  console.log('positiveadj',$scope.positiveAdj);
                }
                //c(JSON.stringify($scope.itemData));
                delete $scope.itemData.allBins;
                delete $scope.itemData.allStatus;
                delete $scope.itemData.binTransData;
                //($scope.positiveAdj = {}),
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
                 //console.log('items con',iObj);
                var myModalEl = document.getElementById("exampleModal");
                $scope.myModal = new bootstrap.Modal(myModalEl, {
                  keyboard: false,
                });
                $scope.myModal.show();
                //$scope.moveFocusToNextField("modelItem");
                $scope.myModal._element.addEventListener(
                "shown.bs.modal",
                function () {
                  //document.getElementById("modelItem").focus();
                  if($scope.itemData["isSerialItem"]){
                    $scope.moveFocusToNextField("modelItem");
                  }
                  else if($scope.binTransData.length=='1'){
                    $scope.moveFocusToNextField("toBinNO");
                  }else{
                    $scope.moveFocusToNextField("fromStatus");
                  }
                  
                }
              );
              } else {
                $scope.itemData = {};
                alert('alert' ,data["message"]);
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

    $scope.scanItemUpc = function (itemUpc) {
      //console.log('itemupc',itemUpc, $scope.itemData);
      if (!itemUpc) {
        $scope.fromBins = [];
        $scope.fromStatus = [];
        $scope.positiveAdj = {};
        $scope.setPreferedBin();
        return;
      }

      if (
        $scope.itemData.itemName.toLowerCase() == itemUpc.toLowerCase() ||
        $scope.itemData.upc == itemUpc
      ) {
        console.log($scope.allStatus);
        $scope.fromBins = $scope.binTransData;
        //$scope.fromBinAllStatus = $scope.binTransData;
        $scope.positiveAdj.fromBinNO = $scope.binTransData[0]?.binNO;
        $scope.positiveAdj.fromBinNOText = $scope.binTransData[0]?.binNOText;
        $scope.selectFromBin();
        //$scope.moveFocusToNextField("fromBin");
      } else {
        alert("Invalid Item/UPC!!");
        $scope.positiveAdj.itemOrUpc = "";
        $scope.setPreferedBin();
      }
    };

    $scope.setPreferedBin = function () {
      $scope.positiveAdj.toBinNO = $scope.itemData.preBin;
      $scope.positiveAdj.toBinNOText = $scope.itemData.preBinText;
     // $scope.positiveAdj.toStatusId = "1";
      //$scope.positiveAdj.toStatusIdText = "Good";
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
        $scope.positiveAdj.avlQty = obj["onHand"];
        $scope.positiveAdj.fromStatusId = obj["invStatusId"];
        $scope.positiveAdj.fromStatusIdText = obj["invStatus"];
        $scope.moveFocusToNextField("toBinNO");
       // $scope.selectFromStatus();
      } else {
        $scope.fromStatus = [];
        $scope.positiveAdj.fromBinNOText = "";
        $scope.positiveAdj.toBinNO = "";
        $scope.positiveAdj.toBinNoText = "";
        $scope.positiveAdj.avlQty = "";
         $scope.positiveAdj.fromStatusIdText = "";
      }
      // $scope.positiveAdj.adjQty = "";
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
        return alert("Please select To Bin!!");
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
        } else if ($scope.positiveAdj.avlQty < $scope.positiveAdj.adjQty) {
          $scope.positiveAdj.adjQty = "";
          $scope.moveFocusToNextField('adjQty');
          return alert('Please check available quantity!!');
        }
        $scope.itemData['adjQty'] = $scope.positiveAdj.adjQty;
      }

      var result;
      if ($scope.positiveAdj.lotNO) {
        result = $scope.configuredItems.find(
          (item) =>
            item.lotNO == $scope.positiveAdj.lotNO &&
            item.fromBinNO == $scope.positiveAdj.fromBinNO &&
            item.toBinNO == $scope.positiveAdj.toBinNO &&
            item.fromStatusId == $scope.positiveAdj.fromStatusId &&
            item.toStatusIdText == $scope.positiveAdj.toStatusId 
        );
         console.log('con',$scope.configuredItems);
      } else if ($scope.positiveAdj.itemOrUpc) {
        console.log('configured items',$scope.configuredItems);
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
       // $scope.setPreferedBin();
        $scope.moveFocusToNextField("modelItem");
        return;
      }
      console.log($scope.positiveAdj);
      $scope.configuredItems.push($scope.positiveAdj);
      c(JSON.stringify($scope.configuredItems));
      $scope.positiveAdj = {};
      if($scope.itemData["isSerialItem"]){
        $scope.moveFocusToNextField("modelItem");
      }
      if(!$scope.itemData["isSerialItem"]){
        var obj = $scope.allBins[$scope.stagebins];
        $scope.positiveAdj={
          itemOrUpc:$scope.itemData.itemName,
          fromBinNO:obj.id,
          fromBinNOText:obj.value,
          avlQty:$scope.binTransData[0]?.onHand,
          
        }

        if($scope.binTransData.length == '1'){
          $scope.positiveAdj={
            itemOrUpc:$scope.itemData.itemName,
            fromBinNO:obj.id,
            fromBinNOText:obj.value,
            fromStatusId:$scope.binTransData[0]?.invStatusId,
            fromStatusIdText:$scope.binTransData[0]?.invStatus,
            avlQty:$scope.binTransData[0]?.onHand,
          }
          $scope.moveFocusToNextField("toBinNO");
        }
        console.log('positiveadj1',$scope.positiveAdj);
      }
     // $scope.setPreferedBin();
    };

    $scope.selectToBin = function () {
      if ($scope.positiveAdj.toBinNO) {
        var obj = $scope.allBins[$scope.positiveAdj.toBinNO];
        $scope.positiveAdj.toBinNoText = obj["value"];
        $scope.moveFocusToNextField("toStatus");
      } else {
        $scope.positiveAdj.toBinNoText = "";
      }
    };

    $scope.selectToStatus = function() {
      if ($scope.positiveAdj.toStatusId) {
        var obj = $scope.allStatus[$scope.positiveAdj.toStatusId];
        $scope.positiveAdj.toStatusIdText = obj["value"];
        $scope.moveFocusToNextField("adjQty");
      } else  {
        $scope.positiveAdj.toStatusIdText = '';
      }
    }

    $scope.deleteConfiguredItem = function (index) {
      const confirmation = confirm("Are you sure you want to delete?");
      if (confirmation) {
        $scope.configuredItems.splice(index, 1);
        $scope.itemData['adjQty'] = '';
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
          console.log(data);
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

          const index = $scope.stagedBinItems.findIndex(
            (item) => item.itemName == $scope.itemObj.itemName
          );
          if (index > -1) {
            $scope.stagedBinItems[index]["adjQty"] = $scope.itemObj["adjQty"];
            $scope.stagedBinItems[index]["configuredItems"] =
              $scope.configuredItems;
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
            $scope.loading = false;
            alert("BinTransfer created successfully " + data.tranIdText);
            $window.location.reload();
          },
          function (response) {
            $scope.loading = false;
            alert("error::" + response.data);
          }
        );
    };

    $scope.scanSerialItem = function (serialNo) {
      if (!serialNo) {
        $scope.fromBins = [];
        $scope.fromStatus = [];
        $scope.positiveAdj = {};
        //$scope.setPreferedBin();
        return "";
      }
      var obj = $scope.binTransData.find((u) => u.invNoText.toLowerCase() == serialNo.toLowerCase());
       console.log('object',obj);
      if (obj) {
        var cObj = $scope.configuredItems.find((u) => u.serialNO == serialNo);
        //console.log('con_obj',cObj,$scope.configuredItems);
        if (cObj) {
          alert("Serial No Already Configured!!");
          $scope.positiveAdj.serialNO = "";
          $scope.setPreferedBin();
        } else {
          $scope.fromBins.push(obj);
          $scope.fromStatus.push(obj);
          $scope.positiveAdj.fromBinNOText = obj.binNOText;
          $scope.positiveAdj.fromBinNO = obj.binNO;
          $scope.positiveAdj.fromStatusId = obj["invStatusId"];
          $scope.positiveAdj.fromStatusIdText = obj["invStatus"];
          $scope.positiveAdj.avlQty = obj["onHand"];
          $scope.positiveAdj.adjQty = 1;
          $scope.disableQty = true;
        }
        $scope.moveFocusToNextField("toBinNO");
      } else {
        alert("Serial No Doesn't Exists!!");
        $scope.positiveAdj.serialNO = "";
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
        console.log($scope.binTransData);
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
        $scope.positiveAdj.fromBinNO = $scope.binTransData[0]?.binNO;
        $scope.positiveAdj.fromBinNOText = $scope.binTransData[0]?.binNOText;
        $scope.selectFromBin();
        $scope.moveFocusToNextField("fromBin");
      } else {
        $scope.fromBinAllStatus = [];
        $scope.fromBins = [];
        $scope.positiveAdj = {};
        $scope.setPreferedBin();
      }
    };

     $scope.selectfromstatus = function(){
      var SelectedStatus = $scope.positiveAdj.fromStatusId;
      var obj = $scope.binTransData.find(
        (u) => u.invStatusId == SelectedStatus
      );
      console.log('From Obj',obj);
      $scope.positiveAdj.avlQty = obj["onHand"];
      $scope.positiveAdj.fromStatusId = obj["invStatusId"];
      $scope.positiveAdj.fromStatusIdText = obj["invStatus"];
    };
    $scope.moveFocusToNextField("stagebin");
  }
);