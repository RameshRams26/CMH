var app = angular.module("myApp", []);
app.controller(
  "ReceiveListController",
  function ($scope, $window, $http, $filter, $timeout) {
    $scope.urlObj = document.getElementById("myDataObj").innerHTML;
    $scope.urlObj = JSON.parse($scope.urlObj);
    console.log(JSON.stringify($scope.urlObj));
    var ajaxUrl = $scope.urlObj["ajaxUrl"];
    $scope.loading = false;
    $scope.goBack = function () {
      $window.history.back();
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
            //alert(JSON.stringify(response.data));
            console.log("IFDATA::" + JSON.stringify(response.data));
            $scope.finaldata = [];
            $scope.locObj = response["data"]["locationObj"];
            $scope.allOrders = response.data.poReceivesIFs;
            $scope.receiveIFs = $scope.allOrders;
            console.log(JSON.stringify($scope.receiveIFs));
            $scope.loading = false;
          },
          function (response) {
            $scope.loading = false;
            alert("error::::::");
          }
        );
    };
    $scope.getSetUpData();

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
      if ($scope.positiveAdj.date) {
        const dateKey = $scope.positiveAdj.date;
        var date = new Date(dateKey);
        const options = { year: "numeric", month: "long", day: "numeric" };
        const formattedDate = date.toLocaleDateString("en-US", options);

        $scope.positiveAdj.dateText = formattedDate;
      }

      $scope.configuredItems.push($scope.positiveAdj);
      $scope.positiveAdj = {};
    };

    $scope.selectReceive = function () {
     // alert($scope.selectReceiveList);
      $scope.receiveIFs = $filter("filter")($scope.allOrders, {
        recordType: $scope.selectReceiveList,
      });
      console.log('Selection',$scope.receiveIFs);
    // alert(JSON.stringify($scope.receiveIFs));
      if ($scope.fromDate || $scope.toDate) {
        $scope.fromDate = '';
        $scope.toDate = '';
      }
      document.getElementById('scanitem').focus();
    };
      /* $scope.searchbydate = function () {
		 if (!$scope.fromDate && !$scope.toDate) {
			alert("Please enter dates for searching.");
			return; 
			}
      
      if ($scope.fromDate) {
        $scope.receiveIFs = $scope.allOrders.filter(function (item) {
          var itemDate = new Date(item.date.split("/").reverse().join("-"));
          itemDate.setHours(0);
          itemDate.setMinutes(0);
          itemDate.setSeconds(0);
          itemDate.setMilliseconds(0);
          return itemDate >= $scope.fromDate;
        });
      }

      if ($scope.toDate) {
        $scope.receiveIFs = $scope.receiveIFs.filter(function (item) {
          var itemDate = new Date(item.date.split("/").reverse().join("-"));
          itemDate.setHours(0);
          itemDate.setMinutes(0);
          itemDate.setSeconds(0);
          itemDate.setMilliseconds(0);
          return itemDate <= $scope.toDate;
        });
      }
      if (!$scope.receiveIFs.length) {
        $scope.selectReceiveList = "";
        $scope.fromDate = "";
        $scope.toDate = "";
        $scope.selectReceive();
      }
    }; */
     $scope.searchbydate = function () {
      if (!$scope.fromDate && !$scope.toDate) {
          alert("Please enter dates for searching.");
          return;
      }
  
      $scope.receiveIFs = $filter("filter")($scope.allOrders, {
          recordType: $scope.selectReceiveList
      });
  
      if ($scope.fromDate) {
          $scope.receiveIFs = $scope.receiveIFs.filter(function (item) {
              var itemDate = new Date(item.date.split("/").reverse().join("-"));
              itemDate.setHours(0, 0, 0, 0);
              return itemDate >= new Date($scope.fromDate);
          });
      }
  
      if ($scope.toDate) {
          $scope.receiveIFs = $scope.receiveIFs.filter(function (item) {
              var itemDate = new Date(item.date.split("/").reverse().join("-"));
              itemDate.setHours(0, 0, 0, 0);
              return itemDate <= new Date($scope.toDate);
          });
      }
  
      if (!$scope.receiveIFs.length) {
          alert("No records found for the selected date range.");
          $scope.selectReceiveList = "";
          $scope.fromDate = "";
          $scope.toDate = "";
          $scope.selectReceive();
      }
  }; 
  /*   $scope.scanOrder = function () {
		alert("lot");
      $scope.filteredOrders = $filter("filter")($scope.allOrders, {
        orderNo: $scope.scanorder,
      });
	  alert(receiveIFs.length);
	   if (filteredOrders.length == 0) {
		alert("Wrong order scanned. Please scan a valid order.");
	  } else {
		$scope.receiveIFs = filteredOrders;
	  }
    }; */
	$scope.scanOrder = function () {
     var receiveIFs = $filter("filter")($scope.allOrders, {
		orderNo: $scope.scanorder,
	  });
		if (receiveIFs.length === 0) {
		  $scope.scanorder = "";
          $scope.selectReceiveList = "";
		alert("Wrong order scanned. Please scan a valid order.");
		
	} /* else {
    $scope.receiveIFs = filteredOrders;
  } */
  $scope.scanorder = "";
};

	$scope.scanorder = "";
	$scope.selectedResult;

    $scope.recieveOrder = function () {
      console.log("Selected Result:", $scope.selectedResult);
      if ($scope.selectedResult) {
        var url = "";
        if ($scope.selectedResult.recordType == "transferorder") {
          url = $scope.urlObj["reieveTo"];
        } else if ($scope.selectedResult.recordType == "purchaseorder") {
          url = $scope.urlObj["recieveOrd"];
        } else {
          url = $scope.urlObj["receiveRMA"];
        }
        $window.location.href = url +
          "&empId=" +
          $scope.urlObj["empId"] +
          "&setUpId=" +
          $scope.urlObj["setUpId"] +
          "&locationId=" +
          $scope.urlObj["locationId"] +
          "&tranId=" +
          $scope.selectedResult.orderNo;
		} else {
        alert("Please select atleast one order!!");
      }
    };
	
	$scope.onClick = function(orders) {
		$scope.selectedResult = orders;
      console.log('order selected',$scope.selectedResult);
	};
  $scope.openScanner = function (from) {
    $window.parent.postMessage(
      { func: "pickscanBarcodeforV3", message: from },
      "*"
    );
    $window.addEventListener("message", myClick);
  };
  function myClick(event) {
    if (event.data[1] == "scanorder") {
      $scope.scanorder = event.data[0];
      $scope.scanOrder();
    } 
    $window.removeEventListener("message", myClick);
  }
  //document.getElementById('selectReceiveList').focus();
    $scope.moveFocusToNextField = function (fieldId) {
    $timeout(function () {
      document.getElementById(fieldId).focus();
    });
  };
  $scope.moveFocusToNextField("selectReceiveList");
  }
);
