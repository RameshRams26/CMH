var app = angular.module("myApp", []);

app.controller(
  "binLookupController",
  function ($scope, $window, $filter, $http, $timeout) {
    $scope.urlObj = document.getElementById("myDataObj").innerHTML;
    $scope.urlObj = JSON.parse($scope.urlObj);
    var ajaxUrl = $scope.urlObj["ajaxUrl"];
    var PrintUrl = $scope.urlObj["PrintUrl"];
    //console.log("$scope.urlObj ", PrintUrl);
    //console.log("$scope.urlObj ", JSON.stringify($scope.urlObj));
    $scope.loading = false;
    $scope.select_all = false;
    $scope.itemData = {
      image: "https://sourceindia-electronics.com/assets/images/no_image.png",
    };
    $scope.goBack = function () {
      $window.history.back();
    };

    $scope.scannedBin;
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
          },
          function (response) {
            $scope.loading = false;
            alert("error::::::");
          }
        );
    };

    $scope.getSetUpData();

    $scope.getBinItems = function () {
      if ($scope.scannedBin || $scope.searchName) {
        $scope.loading = true;
        var bin = "";
        if ($scope.scannedBin) {
          bin = $scope.scannedBin;
        }

        $http
          .get(
            ajaxUrl +
              "&ref=binItemData" +
              "&setUpData=" +
              JSON.stringify($scope.setUpData) +
              "&scannedBin=" +
              bin +
              "&locationId=" +
              $scope.urlObj["locationId"]
          )
          .then(
            function (response) {
              var data = response["data"];
              if (data["status"] == "success") {
                $scope.itemData = data;
                $scope.scannedBinValue = bin;
                $scope.scannedBin = "";
                $scope.searchName = "";
                $scope.searchText = "";
                console.log(
                  "$scope.itemData++" + JSON.stringify($scope.itemData)
                );
              } else {
                if ($scope.scannedBin) {
                  $scope.moveFocusToNextField("scanbin");
                }
                $scope.scannedBin = "";
                $scope.searchName = "";
                $scope.searchText = "";
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

    $scope.selectResult = function (result) {
      $scope.searchText = result.name;
      $scope.results = [];
      $scope.showSuggestions = false;
      if (result.name) {
        $scope.searchName = result.name;
        $scope.getBinItems();
      } else {
        $scope.searchName = "";
      }
    };

    $scope.viewByItem = function (item) {
      $scope.invDetails = item
      console.log("locationData", JSON.stringify(item));
      $scope.invData = item.invBalance;
    };
    function myClick(event) {
      if (event.data[1] == "imageCapture") {
        $scope.uploadImagetoNS(event.data[0]);
      } else if (event.data[1] == "scanning") {
        $scope.scannedBin = event.data[0];
        $scope.getBinItems();
      }
      $window.removeEventListener("message", myClick);
    }

    $scope.addPhoto = function () {
      $window.parent.postMessage(
        { func: "showImageOptions", message: "imageCapture" },
        "*"
      );
      $window.addEventListener("message", myClick);
    };

    $scope.openScanner = function () {
      $window.parent.postMessage(
        { func: "pickscanBarcode", message: "scanning" },
        "*"
      );
      $window.addEventListener("message", myClick);
    };
    $scope.cardclick = function (inv) {
      inv.select = !inv.select;
    };
    $scope.uploadImagetoNS = function (imageData) {
      $scope.loading = true;
      $http
        .post(
          ajaxUrl + "&ref=imageUpload",
          JSON.stringify({
            imageData: imageData,
            itemName: $scope.itemData.itemName,
            itemID: $scope.itemData.itemID,
            type: $scope.itemData.type,
          })
        )
        .then(
          function (response) {
            var data = response["data"];
            $scope.itemData.image = data.data;
            $scope.loading = false;
          },
          function (response) {
            $scope.loading = false;
            alert("error::::::");
          }
        );
    };

    $scope.selectAll = function (select_all) {
      $scope.indData = $scope.indData.map((obj) => ({
        ...obj,
        select: !select_all,
      }));
    };

    $scope.printLables = function () {
      var printObj = $filter("filter")(
        $scope.indData,
        {
          select: true,
        },
        true
      );
      if (!printObj.length) {
        return alert("Please select atleast one checkbox..!");
      }
      var dataObj = {
        itemName: $scope.itemData.itemName,
        upc: $scope.itemData.upc,
        itemDesc: $scope.itemData.itemDesc,
        isBinItem: $scope.itemData.isBinItem,
        isSerialItem: $scope.itemData.isSerialItem,
        isLotItem: $scope.itemData.isLotItem,
        printObj: printObj,
      };
      console.log(JSON.stringify(dataObj));

      PrintUrl = PrintUrl + "&from=lookup" + "&data=" + JSON.stringify(dataObj);
      console.log("PrintUrl::" + PrintUrl);
      $http.get(PrintUrl).then(
        function (response) {
          var data = response["data"];
          console.log("RESPONSE FROM PS::" + JSON.stringify(data));

          $window.parent.postMessage(
            { func: "printwmsMultiLabels", message: data },
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

    $scope.logOut = function () {
      const confirmation = confirm("Are you sure you want to logout?");
      if (confirmation) {
        $window.location.href = $scope.urlObj["logIn"];
      }
    };
    $scope.moveFocusToNextField = function (fieldId) {
      $timeout(function () {
        document.getElementById(fieldId).focus();
      });
    };
    $scope.moveFocusToNextField("scanbin");
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
