angular.module("assignApp", []).controller("assignCtrl", function($scope) {
  // Initialize filters
  $scope.filters = {
    search: "",
    type: "",
    dateRange: "today",
    delivery: "",
    location: ""
  };

  // Expose a location filter function to avoid empty-string matching
  $scope.locationFilter = function(line) {
    if (!$scope.filters.location || $scope.filters.location === "") return true;
    return line.location === $scope.filters.location;
  };

  // Picker data
  $scope.pickers = [
    {id:1, name:"Rajesh", assignedItems: 0},
    {id:2, name:"Ravi", assignedItems: 8},
    {id:3, name:"Anil", assignedItems: 3},
    {id:4, name:"Suresh", assignedItems: 12},
    {id:5, name:"Mohammed", assignedItems: 2}
  ];

  // Sales order data
  $scope.salesOrders = [
    {
      id:"SO1001",
      customer:"CMH Stores",
      totalQty:35,
      type: "inv",
      deliveryOption: "Standard",
      items:[
        {item:"Item A", location:"WH1", bin:"Bin-01", qty:10, type: "inv", status: "pending"},
        {item:"Item B", location:"WH2", bin:"Bin-05", qty:5, type: "noninv", status: "pending"},
        {item:"Item C", location:"WH1", bin:"Bin-03", qty:20, type: "inv", status: "pending"}
      ]
    },
    {
      id:"SO1002",
      customer:"Clear Bags",
      totalQty:18,
      type: "noninv",
      deliveryOption: "Express",
      items:[
        {item:"Item D", location:"WH1", bin:"Bin-02", qty:12, type: "noninv", status: "picked"},
        {item:"Item E", location:"WH3", bin:"Bin-07", qty:6, type: "res", status: "staged"}
      ]
    },
    {
      id:"SO1003",
      customer:"Global Tech",
      totalQty:52,
      type: "bo",
      deliveryOption: "Pickup",
      items:[
        {item:"Item F", location:"WH2", bin:"Bin-11", qty:15, type: "bo", status: "pending"},
        {item:"Item G", location:"WH2", bin:"Bin-12", qty:20, type: "bo", status: "canceled"},
        {item:"Item H", location:"WH3", bin:"Bin-02", qty:17, type: "inv", status: "picked"}
      ]
    }
  ];

  // Function to determine if a picker is busy
  $scope.isPickerAvailable = function(picker) {
    // A picker is considered busy if they have items with status "pending" or "picked"
    let isBusy = false;
    
    $scope.salesOrders.forEach(function(so) {
      so.items.forEach(function(item) {
        if (item.picker && item.picker.id === picker.id && 
            (item.status === 'pending' || item.status === 'picked')) {
          isBusy = true;
        }
      });
    });
    
    return !isBusy;
  };

  // Get available pickers
  $scope.getAvailablePickers = function() {
    return $scope.pickers.filter(function(picker) {
      return $scope.isPickerAvailable(picker);
    });
  };

  // Get busy pickers
  $scope.getBusyPickers = function() {
    return $scope.pickers.filter(function(picker) {
      return !$scope.isPickerAvailable(picker);
    });
  };

  // Get count of items by status
  $scope.getStatusCount = function(status) {
    let count = 0;
    $scope.salesOrders.forEach(function(so) {
      so.items.forEach(function(item) {
        if (item.status === status) {
          count++;
        }
      });
    });
    return count;
  };

  // Function to update assignment status for SOs
  $scope.updateAssignmentStatus = function() {
    $scope.salesOrders.forEach(function(so) {
      var assignedCount = 0;
      so.items.forEach(function(item) {
        if (item.picker) {
          assignedCount++;
        }
      });

      so.assignedCount = assignedCount;
      so.fullyAssigned = (assignedCount === so.items.length);
      so.partiallyAssigned = (assignedCount > 0 && assignedCount < so.items.length);
    });

    // Update picker assigned items count
    $scope.pickers.forEach(function(picker) {
      var count = 0;
      $scope.salesOrders.forEach(function(so) {
        so.items.forEach(function(item) {
          if (item.picker && item.picker.id === picker.id) {
            count++;
          }
        });
      });
      picker.assignedItems = count;
    });
  };

  // Initialize assignment status
  $scope.updateAssignmentStatus();

  // Assign Entire SO to one picker
  $scope.assignEntireSO = function(so) {
    if (!so.bulkPicker) return;

    // Confirm assignment
    if (confirm(`Assign all ${so.items.length} items to ${so.bulkPicker.name}?`)) {
      angular.forEach(so.items, function(line) {
        line.picker = so.bulkPicker;
        line.status = 'pending'; // Set status to pending when assigned
      });
      $scope.updateAssignmentStatus();
    }
  };
});