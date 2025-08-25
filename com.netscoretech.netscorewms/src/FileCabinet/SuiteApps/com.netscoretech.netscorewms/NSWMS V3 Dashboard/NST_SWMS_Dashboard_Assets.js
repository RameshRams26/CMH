var app = angular.module("myApp", []);

app.controller("DashboardController", function ($scope, $http, $window) {
  $scope.urlObj = document.getElementById("myDataObj").innerHTML;
  $scope.urlObj = JSON.parse($scope.urlObj);
  var ajaxUrl = $scope.urlObj["ajaxUrl"];
  //console.log("$scope.urlObj ", JSON.stringify($scope.urlObj));
  $scope.loading = false;
  $scope.dashBoardData = function () {
    $scope.loading = true;
    var dataObj = {
      empId: $scope.urlObj["empId"],
      setUpId: $scope.urlObj["setUpId"],
    };
    $http.post(ajaxUrl + "&ref=1000", JSON.stringify(dataObj)).then(
      function (response) {
        var data = response["data"];
        $scope.locationList = data["locations"];
        $scope.empData = data["empData"];
        $scope.setUpData = data["setUpData"];
        $scope.location = $scope.setUpData["location"];
        $scope.eFeatures = $scope.empData["features"].split(",");
        $scope.licenseData = data?.["licenseFeatures"];
        var lFeatures = $scope.licenseData?.["ActiveFeatures"];

        $scope.lFeatures = lFeatures?.map((featuresObj) => {
          return featuresObj.Name.replace("Basic_", "");
        });

        //console.log("lFeatures::" + JSON.stringify($scope.lFeatures));

        $scope.getScreenUrls();
      },
      function (response) {
        $scope.loading = false;
        alert("error::::::");
      }
    );
  };

  $scope.dashBoardData();

  $scope.getScreenUrls = function () {
    $scope.loading = true;
    $http.post(ajaxUrl + "&ref=1001", JSON.stringify({})).then(
      function (response) {
        var data = response["data"];
        $scope.featureUrls = data;
        $scope.loading = false;
        // console.log("empData::" + JSON.stringify($scope.featureUrls));
        //checkLicense();
      },
      function (response) {
        $scope.loading = false;
        alert("error::::::");
      }
    );
  };

  function checkLicense() {
    if (parseFloat($scope.licenseData["RemainingDays"]) <= 0) {
      alert(`your license has expired, please contact Netscore support team.`);
      $scope.openScreen("Login");
    }
  }

  $scope.openScreen = function (screenId) {
    if (screenId == "Login") {
      $window.location.href = $scope.featureUrls[screenId];
    } else {
      if ($scope.location) {
        $window.location.href =
          $scope.featureUrls[screenId] +
          "&empId=" +
          $scope.urlObj["empId"] +
          "&setUpId=" +
          $scope.urlObj["setUpId"] +
          "&locationId=" +
          $scope.location;
      } else {
        alert("Please select location!!");
      }
    }
  };

  function myClick(event) {
    if (event.data[1] == "showSetPrinterAlert") {
    }
    $window.removeEventListener("message", myClick);
  }
  $scope.setPrinteroptions = function () {
    $window.parent.postMessage(
      { func: "showSetPrinterAlert", message: "printer" },
      "*"
    );
    $window.addEventListener("message", myClick);
  };
  $scope.setPrinteroptions();

  $scope.connectPrinter = function () {
    $window.parent.postMessage({ func: "setPrinter", message: "printer" }, "*");
    $window.addEventListener("message", myClick);
  };

  $scope.printerSettings = function () {
    $window.parent.postMessage(
      { func: "printerSettings", message: "printer" },
      "*"
    );
    $window.addEventListener("message", myClick);
  };
});
