var app = angular.module('myApp', []);
app.controller('DeliveryController', function ($scope, $window, $http) {
  c = console.log.bind(document);
  $scope.urlObj = document.getElementById('myDataObj').innerHTML;
  $scope.urlObj = JSON.parse($scope.urlObj);
  var ajaxUrl = $scope.urlObj['ajaxUrl'];
  var PrintUrl = $scope.urlObj['PrintUrl'];
  ($scope.loading = false), $scope.backUpRecId, $scope.backUpRecText;
  $scope.allowClick = false;
  $scope.disableUpc = false;
  $scope.goBack = function (type) {
      $window.history.back();
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
    console.log($scope.urlObj);
     
    $scope.loading = true;
    $http
      .get(
        ajaxUrl +
          '&ref=getSetUpData' +
          '&setUpId=' +
          $scope.urlObj['setUpId'] +
          '&locationId=' +
          $scope.urlObj['locationId']+
          '&assignmentId=' +
          $scope.urlObj['assignmentId'],
      )
      .then(
        function (response) {
          $scope.setUpData = response['data']['setUpData'];
          $scope.locObj = response['data']['locationObj'];
          if ($scope.urlObj['tranId']) {
            $scope.scannedOrder = $scope.urlObj['tranId'];
            $scope.scannedOrderStatus = $scope.urlObj['status'];
            $scope.items = response["data"]["orderData"]["items"];
            $scope.orderText = response["data"]["orderData"]["orderText"];
            $scope.customer = response["data"]["orderData"]["customerText"];
            $scope.deliveryExceptionTypes = response["data"]["deliveryExceptionTypes"];
            //$scope.getOrderDetails($scope.urlObj['assignmentId']);
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

   $scope.filters = {};


  $scope.updateRemaining = function(item){
    if(item.deliveringQty<0) item.deliveringQty=0;
    if(item.deliveringQty>item.pickedQty){
      alert("Delivering Qty cannot exceed Picked Qty!");
      console.log(item);
      item.deliveringQty = Number(item.pickedQty);
    }
    item.remainingQty = item.pickedQty - (item.deliveringQty||0);
    if(item.remainingQty === 0) item.reason = "";
  };

  // Handle checkbox toggle
  $scope.toggleConfirm = function(item){
    if(item.confirmed){
      if(item.remainingQty > 0 ){
        if ((!item.reason || item.reason=="")) {
          alert("Please select a reason before confirming as remainingQty qty is greater than 0!");
          item.confirmed = false;
        }
        if (!item.returnInv) {
          alert ("Please enter the Lot/Ser No");
          item.confirmed = false;
        }
      }
      console.log(item);
    }
  };

  $scope.checkReturnInv = function (item) {
    let result = item.invDetails.find((e)=>e.invNumber == item.returnInv);
    if (result) {
      console.log(result);
    } else {
      alert("Invalid Lot/Ser No!!");
      return item.returnInv = "";
    }
  }

  $scope.applyFilters = function(item){
    if($scope.filters.itemName && !item.itemName.toLowerCase().includes($scope.filters.itemName.toLowerCase())) return false;
    if($scope.filters.invNumbers && !item.invNumbers.toLowerCase().includes($scope.filters.invNumbers.toLowerCase())) return false;
    return true;
  };

  $scope.submitAll = function(){
    var confirmedItems = $scope.order.items.filter(i=>i.confirmed);
    if(confirmedItems.length === 0){
      alert("No confirmed items to submit!");
      return;
    }
    console.log("Submitting confirmed items:", confirmedItems);
    alert(confirmedItems.length + " items submitted successfully!");
  };

  $scope.selectReason = function(item){
    console.log("Selected reason:", item.reason);
    if (item.reason == 1) {
      item.deliveringQty = 0;
      $scope.updateRemaining(item)
    }
  };

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
