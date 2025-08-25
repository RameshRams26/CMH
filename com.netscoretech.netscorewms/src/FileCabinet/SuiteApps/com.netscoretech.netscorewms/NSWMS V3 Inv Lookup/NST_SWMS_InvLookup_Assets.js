var app = angular.module('myApp', []);

app.controller('invLookupController', function ($scope, $window, $filter, $http, $timeout) {
  $scope.urlObj = document.getElementById('myDataObj').innerHTML;
  $scope.urlObj = JSON.parse($scope.urlObj);
  var ajaxUrl = $scope.urlObj['ajaxUrl'];
  var PrintUrl = $scope.urlObj['PrintUrl'];
  //console.log("$scope.urlObj ", PrintUrl);
  //console.log("$scope.urlObj ", JSON.stringify($scope.urlObj));
  $scope.loading = false;
  $scope.select_all = false;
  $scope.itemData = {
    image: 'https://sourceindia-electronics.com/assets/images/no_image.png',
  };
  $scope.goBack = function () {
    $window.history.back();
  };

  $scope.scannedItem;
  $scope.getSetUpData = function () {
    $scope.loading = true;
    $http.get(ajaxUrl + '&ref=getSetUpData' + '&setUpId=' + $scope.urlObj['setUpId']).then(
      function (response) {
        $scope.setUpData = response['data']['setUpData'];
        $scope.items = response['data']['allItems'];
        $scope.loading = false;
      },
      function (response) {
        $scope.loading = false;
        alert("error::::::");
      },
    );
  };

  $scope.getSetUpData();

  $scope.getItemDetails = function () {
    if ($scope.scannedItem || $scope.searchName) {
      $scope.loading = true;
      var item = '';
      if ($scope.scannedItem) {
        item = $scope.scannedItem;
      } else {
        item = $scope.searchName;
      }
      // alert(item)
      $http
        .get(ajaxUrl + '&ref=itemData' + '&setUpData=' + JSON.stringify($scope.setUpData) + '&scannedItem=' + item)
        .then(
          function (response) {
            var data = response['data'];
            if (data['status'] == 'success') {
              $scope.itemData = data;
              $scope.scannedItem = '';
              $scope.searchName = '';
              $scope.searchText = '';
              console.log('$scope.itemData++' + JSON.stringify($scope.itemData));
            } else {
              $scope.itemData = {
                image: 'https://sourceindia-electronics.com/assets/images/no_image.png',
              };
              if ($scope.scannedItem) {
                $scope.moveFocusToNextField('scanitem');
              } else {
                $scope.moveFocusToNextField('myInput');
              }
              $scope.scannedItem = '';
              $scope.searchName = '';
              $scope.searchText = '';
              alert(data['message']);
            }
            $scope.loading = false;
          },
          function (response) {
            $scope.loading = false;
            alert("error::::::");
          },
        );
    } else {
      $scope.itemData = {
        image: 'https://sourceindia-electronics.com/assets/images/no_image.png',
      };
    }
  };

  //Auto suggestions
  $scope.searchText = '';
  $scope.results = [];
  $scope.showSuggestions = false;

  $scope.search = function () {
    $scope.results = [];
    $scope.showSuggestions = false;
    if ($scope.searchText.length >= 4) {
      angular.forEach($scope.items, function (item) {
        if (item.name.toLowerCase().indexOf($scope.searchText.toLowerCase()) >= 0) {
          $scope.results.push(item);
        }
      });
      $scope.showSuggestions = true;
      if ($scope.results.length === 0) {
        alert('No matching items found.');
        $scope.searchText = '';
        $scope.moveFocusToNextField('myInput');
      }
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
      $scope.searchName = '';
    }
  };

  $scope.viewByLocation = function (locationData) {
    console.log('locationData', JSON.stringify(locationData));
    $scope.indData = locationData.inventoryDetail;
    $scope.locationname = locationData.locationId;
    $scope.prefBin = '';
    if ($scope.itemData.preferdBins[locationData.location]) {
      $scope.prefBin = $scope.itemData.preferdBins[locationData.location];
    }
    $scope.select_all = false;
    if ($scope.indData?.length) {
      for (let i = 0; i < $scope.indData.length; i++) {
        if ($scope.indData[i]?.select == true) {
          $scope.indData[i].select = false;
        }
      }
    }
  };

  function myClick(event) {
    if (event.data[1] == 'imageCapture') {
      $scope.uploadImagetoNS(event.data[0]);
    } else if (event.data[1] == 'scanning') {
      $scope.scannedItem = event.data[0];
      $scope.getItemDetails();
    }
    $window.removeEventListener('message', myClick);
  }

  $scope.addPhoto = function () {
    $window.parent.postMessage({ func: 'showImageOptions', message: 'imageCapture' }, '*');
    $window.addEventListener('message', myClick);
  };

  $scope.openScanner = function () {
    $window.parent.postMessage({ func: 'pickscanBarcodeforV3', message: 'scanning' }, '*');
    $window.addEventListener('message', myClick);
  };
  $scope.cardclick = function (inv) {
    inv.select = !inv.select;
    let selectedInvs = [];
    for (let i = 0; i < $scope.indData.length; i++) {
      if ($scope.indData[i]?.select == true) {
        selectedInvs.push($scope.indData[i]);
      }
    }
    $scope.select_all = selectedInvs.length == $scope.indData.length ? true : false;
    // if (selectedInvs.length == $scope.indData.length) {
    //   $scope.select_all = true;
    // } else {
    //   $scope.select_all = false;
    // }
  };
  $scope.uploadImagetoNS = function (imageData) {
    $scope.loading = true;
    $http
      .post(
        ajaxUrl + '&ref=imageUpload',
        JSON.stringify({
          imageData: imageData,
          itemName: $scope.itemData.itemName,
          itemID: $scope.itemData.itemID,
          type: $scope.itemData.type,
        }),
      )
      .then(function (response) {
        if (response.data.status == 'error') {
          $scope.loading = false;
          return alert(response.data.message);
        } else {
          var data = response['data'];
          $scope.itemData.image = data.data;
          $scope.loading = false;
        }
      });
  };

  $scope.selectAll = function (select_all) {
    $scope.indData = $scope.indData.map((obj) => ({
      ...obj,
      select: !select_all,
    }));
  };

  $scope.printLables = function () {
    // console.log($scope.indData);
    var printObj = $filter('filter')(
      $scope.indData,
      {
        select: true,
      },
      true,
    );
    if (!printObj.length) {
      return alert('Please select atleast one checkbox..!');
    }
    var dataObj = {
      itemName: $scope.itemData.itemName,
      upc: $scope.itemData.upc,
      // itemDesc: $scope.itemData.itemDesc,
      isBinItem: $scope.itemData.isBinItem,
      isSerialItem: $scope.itemData.isSerialItem,
      isLotItem: $scope.itemData.isLotItem,
      printObj: printObj,
    };
    console.log(JSON.stringify(dataObj));

    var sendPrint = angular.copy(PrintUrl);
    sendPrint = sendPrint + '&from=lookup' + '&data=' + JSON.stringify(dataObj);
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

  $scope.logOut = function () {
    const confirmation = confirm('Are you sure you want to logout?');
    if (confirmation) {
      $window.location.href = $scope.urlObj['logIn'];
    }
  };
  $scope.moveFocusToNextField = function (fieldId) {
    $timeout(function () {
      document.getElementById(fieldId).focus();
    });
  };
  $scope.moveFocusToNextField('scanitem');
});
app.directive('focusOnLoad', function () {
  return {
    restrict: 'A',
    link: function (scope, element) {
      element[0].focus();
    },
  };
});
