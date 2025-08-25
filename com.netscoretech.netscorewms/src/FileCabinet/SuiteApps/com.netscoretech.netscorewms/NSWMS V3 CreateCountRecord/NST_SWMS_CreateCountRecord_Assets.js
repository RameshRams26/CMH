var app = angular.module("myApp", []);
// alert(app);
app.controller(
  "createcountrecordController",
  function ($scope, $http, $window, $filter, $timeout) {
    c = console.log.bind(document);
    $scope.urlObj = document.getElementById("myDataObj").innerHTML;
    $scope.urlObj = JSON.parse($scope.urlObj);
    var ajaxUrl = $scope.urlObj["ajaxUrl"];
    ($scope.loading = false),
      $scope.backUpRecId,
      $scope.backUpRecText,
      ($scope.backUpRecordData = []);
    $scope.noOfItems = $scope.backUpRecordData.length;
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
            $scope.loading = false;
            c(JSON.stringify($scope.setUpData));
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
        { func: "pickscanBarcodeforV3", message: "scanning" },
        "*"
      );
      $window.addEventListener("message", myClick);
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
                c(JSON.stringify($scope.itemData));
                $scope.configuredItems = [];
                if ($scope.itemData.isBinItem == true) {
                  $scope.allBins = $scope.itemData.allBins;
                  delete $scope.itemData.allBins;
                  ($scope.positiveAdj = {}), ($scope.disableQty = false);
                  $scope.configuredItems = $filter("filter")(
                    $scope.backUpRecordData,
                    {
                      itemName: $scope.itemData.itemName,
                    },
                    true
                  );
                  var indexes = findIndexesByItemName(
                    $scope.backUpRecordData,
                    $scope.itemData.itemName
                  );
                  indexes.sort(function (a, b) {
                    return b - a;
                  });
                  for (var i = 0; i < indexes.length; i++) {
                    $scope.backUpRecordData.splice(indexes[i], 1);
                  }
                  var myModalEl = document.getElementById("exampleModal");
                  $scope.myModal = new bootstrap.Modal(myModalEl, {
                    keyboard: false,
                  });
                  $scope.myModal.show();
                } else {
                  var obj = $scope.backUpRecordData.find(
                    (u) => u.itemName == $scope.itemData.itemName
                  );
                  if (obj) {
                    alert("Already this item configured!!.");
                    $scope.loading = false;
                  } else {
                    $scope.configuredItems.push({
                      fromBinNO: "",
                      fromBinNOText: "-none-",
                      itemID: $scope.itemData.itemID,
                      itemName: $scope.itemData.itemName,
                    });
                    $scope.submitConfiguredItem();
                  }
                }
              } else {
                $scope.itemData = {};
                alert(data["message"]);
                $scope.loading = false;
              }
              $scope.scannedItem = "";
              $scope.searchName = "";
              $scope.searchText = "";
              if ($scope.itemData.isBinItem == true) {
                $scope.loading = false;
              }
            },
            function (response) {
              $scope.loading = false;
              alert("error::::::");
            }
          );
      } else {
      }
    };
    function findIndexesByItemName(data, itemName) {
      const indexes = [];
      for (let i = 0; i < data.length; i++) {
        if (data[i].itemName === itemName) {
          indexes.push(i);
        }
      }
      return indexes;
    }
    $scope.selectFromBin = function () {
      if ($scope.positiveAdj.fromBinNO) {
        var obj = $scope.allBins[$scope.positiveAdj.fromBinNO];
        $scope.positiveAdj.fromBinNOText = obj["value"];
      } else {
        $scope.positiveAdj.fromBinNOText = "";
      }
    };
    $scope.addPosConfiguredItem = function () {
      if (
        !$scope.positiveAdj.fromBinNO &&
        $scope.itemData["isBinItem"] == true &&
        $scope.setUpData["useBins"] == true
      ) {
        return alert("Please select  Bin!!");
      }

      var result = $scope.configuredItems.find(
        (item) => item.fromBinNO == $scope.positiveAdj.fromBinNO
      );

      if (result) {
        alert("Configured with same data already!!");
        $scope.positiveAdj = {};
        $scope.moveFocusToNextField("fromBin");
        return;
      }
      $scope.positiveAdj.itemID = $scope.itemData["itemID"];
      $scope.positiveAdj.itemName = $scope.itemData["itemName"];
      $scope.configuredItems.push($scope.positiveAdj);
      c(JSON.stringify($scope.configuredItems));
      $scope.positiveAdj = {};
      $scope.moveFocusToNextField("fromBin");
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
          if ($scope.itemData.isBinItem == true) {
            $scope.myModal.hide();
          }
          $scope.backUpRecordData = $scope.backUpRecordData.concat(
            $scope.configuredItems
          );
          $scope.noOfItems = $scope.backUpRecordData.length;
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
            if (data.status) {
              return alert(data.message.message);
            }
            alert("Count Record created successfully " + data.tranIdText);
            $window.location.reload();
          },
          function (response) {
            $scope.loading = false;
            alert("error::" + response.data);
          }
        );
    };
    $scope.moveFocusToNextField("scanitem");
  }
);
