var app = angular.module("myApp", []);

app.controller("logInController", function ($scope, $http, $window) {
  $scope.urlObj = document.getElementById("myDataObj").innerHTML;
  $scope.urlObj = JSON.parse($scope.urlObj);
  var ajaxUrl = $scope.urlObj["ajaxUrl"];
  $scope.loading = false;

  $scope.userData = {};
  ($scope.userData.otp = []), ($scope.userData.withPin = true);

  $scope.changeLogInType = function (qPin) {
    $scope.userData.withPin = qPin;
    $scope.userData.otp = [];
    $scope.userData.username = "";
    $scope.userData.password = "";
  };
  $scope.inputType1 = "tel";
  $scope.inputType2 = "tel";
  $scope.inputType3 = "tel";
  $scope.inputType4 = "tel";

  $scope.convertToPassword = function (param) {
    switch (param) {
      case "1":
        $scope.inputType1 = "password";
        break;
      case "2":
        $scope.inputType2 = "password";
        break;
      case "3":
        $scope.inputType3 = "password";
        break;
      case "4":
        $scope.inputType4 = "password";
        break;
    }
  };
  $scope.reconfigQR = function () {
    $window.parent.postMessage(
      { func: "configUrl", message: "Configure" },
      "*"
    );
  };

  $scope.login = function () {
    $scope.loading = true;
    //return alert(JSON.stringify($scope.userData));
    $http.post(ajaxUrl + "&ref=1000", JSON.stringify($scope.userData)).then(
      function (response) {
        var data = response["data"];
        if (data["status"] == "success") {
          $window.location.href =
            $scope.urlObj["dashBoardUrl"] +
            "&empId=" +
            data["empid"] +
            "&setUpId=" +
            $scope.urlObj["setUpId"];
        } else {
          if (data["status"] == "invalid") {
            alert("Invalid Credentials!!");
          } else {
            alert("Unauthorized User!!");
          }
          $scope.userData.username = "";
          $scope.userData.password = "";
          $scope.userData.otp = [];
        }
        console.log("data::" + JSON.stringify(data));
        $scope.loading = false;
      },
      function (response) {
        $scope.loading = false;
        alert("error::::::");
      }
    );
  };
});

app.directive("moveNextOnMaxlength", function () {
  return {
    restrict: "A",
    link: function (scope, element, attrs) {
      element.on("input keydown", function (e) {
        var input = e.target;
        if (e.type === "keydown" && e.key !== "Backspace") {
          return; // Ignore keydown events except for Backspace
        }
        if (e.type === "input" && input.value.length > input.maxLength) {
          return; // Ignore input events if the maximum length is exceeded
        }
        if (e.type === "keydown" && input.value.length === 0) {
          var prevElement = element[0].previousElementSibling;
          if (prevElement) {
            prevElement.focus();
          }
        } else if (
          e.type === "input" &&
          input.value.length === input.maxLength
        ) {
          var nextElement = element.next();
          if (nextElement.length) {
            nextElement[0].focus();
          }
        }
      });
    },
  };
});
