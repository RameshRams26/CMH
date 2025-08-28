angular.module('assignApp', []).controller('assignCtrl', function ($scope, $http, $timeout) {
  let jsonText = document.getElementById('myDataObj').textContent;
  $scope.urlObj = JSON.parse(jsonText);
  var ajaxUrl = $scope.urlObj['ajaxUrl'];
  $scope.loading = false;

  $scope.filters = {
    search: '',
    type: '',
    dateRange: '',
    delivery: '',
    location: '',
    dateFrom: '',
    dateTo: '',
  };
  $scope.pickers = [];
  $scope.salesOrders = [];

  $scope.get_lists = function () {
    $scope.loading = true;
    $http.get(ajaxUrl + '&ref=get_lists').then(
      function (response) {
        let data = response['data'];
        $scope.locations = data['locationsList'];
        $scope.deliveryOptions = data['deliveryType'];
        $scope.get_pending_orders();

        // $scope.loading = false;
      },
      function (response) {
        $scope.loading = false;
        alert('error::::::');
      },
    );
  };

  $scope.get_lists();

  $scope.get_pending_orders = function () {
    $scope.loading = true;
    $http.get(ajaxUrl + '&ref=get_pending_orders').then(
      function (response) {
        let data = response['data'];
        $scope.pickers = data['pickersList'];
        $scope.salesOrders = angular.copy(data['orders']);
        $scope.allOrders = angular.copy(data['orders']);
        $scope.ordersCount = data['ordersCount'];
        $scope.totalQty = data['totalQty'];
        recomputePickerStats();

        $scope.loading = false;
      },
      function (response) {
        $scope.loading = false;
        alert('error::::::');
      },
    );
  };

  // Expose a location filter function to avoid empty-string matching
  $scope.locationFilter = function (line) {
    if (!$scope.filters.location || $scope.filters.location === '') return true;
    return line.location === $scope.filters.location;
  };

  $scope.itemTypeFilter = function (line) {
    if (!$scope.filters.type || $scope.filters.type === '') return true;
    return line.type == $scope.filters.type;
  };

  $scope.filterByDate = function () {
    if ($scope.filters.dateRange) {
      let d = $scope.filters.dateRange;
      let year = d.getFullYear();
      let month = d.getMonth() + 1;
      let day = d.getDate();

      $scope.salesOrders = $scope.allOrders.filter((order) => {
        let orderDate = new Date(order.date);
        return orderDate.getFullYear() === year && orderDate.getMonth() + 1 === month && orderDate.getDate() === day;
      });
    } else {
      $scope.salesOrders = angular.copy($scope.allOrders);
    }
  };

  /*

  // Picker data: baseAssignedItems comes from backend (do NOT change this on draft).
  $scope.pickers = [
    { id: 1, name: 'Rajesh', baseAssignedItems: 0 },
    { id: 2, name: 'Ravi', baseAssignedItems: 8 },
    { id: 3, name: 'Anil', baseAssignedItems: 3 },
    { id: 4, name: 'Suresh', baseAssignedItems: 12 },
    { id: 5, name: 'Mohammed', baseAssignedItems: 2 },
  ];

  // Sales order data
  $scope.salesOrders = [
    {
      id: 'SO1001',
      customer: 'CMH Stores',
      totalQty: 35,
      type: 'inv',
      deliveryOption: 'Standard',
      items: [
        {
          item: 'Item A',
          location: 'WH1',
          bin: 'Bin-01',
          qty: 10,
          type: 'inv',
          savedPicker: null,
          draftPicker: null,
        },
        {
          item: 'Item B',
          location: 'WH2',
          bin: 'Bin-05',
          qty: 5,
          type: 'noninv',
          savedPicker: null,
          draftPicker: null,
        },
        {
          item: 'Item C',
          location: 'WH1',
          bin: 'Bin-03',
          qty: 20,
          type: 'inv',
          savedPicker: null,
          draftPicker: null,
        },
      ],
    },
    {
      id: 'SO1002',
      customer: 'Clear Bags',
      totalQty: 18,
      type: 'noninv',
      deliveryOption: 'Express',
      items: [
        {
          item: 'Item D',
          location: 'WH1',
          bin: 'Bin-02',
          qty: 12,
          type: 'noninv',
          savedPicker: null,
          draftPicker: null,
        },
        {
          item: 'Item E',
          location: 'WH3',
          bin: 'Bin-07',
          qty: 6,
          type: 'res',
          savedPicker: null,
          draftPicker: null,
        },
      ],
    },
    {
      id: 'SO1003',
      customer: 'Global Tech',
      totalQty: 52,
      type: 'bo',
      deliveryOption: 'Pickup',
      items: [
        {
          item: 'Item F',
          location: 'WH2',
          bin: 'Bin-11',
          qty: 15,
          type: 'bo',
          savedPicker: null,
          draftPicker: null,
        },
        {
          item: 'Item G',
          location: 'WH2',
          bin: 'Bin-12',
          qty: 20,
          type: 'bo',
          savedPicker: null,
          draftPicker: null,
        },
        {
          item: 'Item H',
          location: 'WH3',
          bin: 'Bin-02',
          qty: 17,
          type: 'inv',
          savedPicker: null,
          draftPicker: null,
        },
      ],
    },
  ];

  */
  // ============ Helpers & Calculations ============ //

  // Determine if a picker is busy (CURRENT status):
  // Busy if they have backend items OR any saved items on lines with pending/picked status.
  $scope.isPickerAvailable = function (picker) {
    if (picker.currentAssignedItems > 0) return false; // includes backend + saved (not drafts)
    return true;
  };

  // Collect counts
  function recomputePickerStats() {
    // reset saved/draft counts per picker
    $scope.pickers.forEach(function (p) {
      p.savedItems = 0;
      p.draftItems = 0;
    });

    // Count saved & draft from SO lines
    $scope.salesOrders.forEach(function (so) {
      so.draftAssignedCount = 0;

      so.items.forEach(function (item) {
        if (item.draftPicker) {
          so.draftAssignedCount++;
          var dp = item.draftPicker;
          var idx2 = $scope.pickers.findIndex((pp) => pp.id === dp.id);
          if (idx2 > -1) $scope.pickers[idx2].draftItems += 1;
        }
      });
    });

    // currentAssigned = backend + saved (not drafts)
    $scope.pickers.forEach(function (p) {
      p.currentAssignedItems = (p.baseAssignedItems || 0) + (p.savedItems || 0);
    });

    // pending changes count
    var drafts = 0;
    $scope.salesOrders.forEach(function (so) {
      drafts += so.draftAssignedCount || 0;
    });
    $scope.pendingChangesCount = drafts;
  }

  // Get available pickers
  $scope.getAvailablePickers = function () {
    return $scope.pickers.filter(function (picker) {
      return $scope.isPickerAvailable(picker);
    });
  };

  // Get busy pickers
  $scope.getBusyPickers = function () {
    return $scope.pickers.filter(function (picker) {
      return !$scope.isPickerAvailable(picker);
    });
  };

  // Get count of items by status (across all lines)
  // $scope.getStatusCount = function (status) {
  //   let count = 0;
  //   $scope.salesOrders.forEach(function (so) {
  //     so.items.forEach(function (item) {
  //       if (item.status === status) {
  //         count++;
  //       }
  //     });
  //   });
  //   return count;
  // };

  // On any draft change in any SO line
  $scope.onDraftChange = function () {
    recomputePickerStats();
  };

  $scope.clearDraft = function (line) {
    line.draftPicker = null;
    recomputePickerStats();
  };

  // Assign Entire SO to one picker (as DRAFT)
  $scope.assignEntireSO = function (so) {
    if (!so.bulkPicker) return;

    if (confirm(`Draft assign all ${so.items.length} items to ${so.bulkPicker.name}?`)) {
      angular.forEach(so.items, function (line) {
        line.draftPicker = so.bulkPicker;
      });
      recomputePickerStats();
    }
  };

  $scope.saveAssignments = function () {
    let selectedOrders = $scope.salesOrders
      .map((order) => {
        let pickedItems = order.items.filter((it) => it.draftPicker !== null && it.draftPicker !== undefined);

        if (pickedItems.length > 0) {
          return {
            ...order,
            items: pickedItems,
          };
        }
        return null;
      })
      .filter((order) => order !== null);

    console.log('Orders to submit:', selectedOrders);
    if (!selectedOrders || selectedOrders.length === 0) {
      alert('No selected assignments to save.');
      return;
    }

    let dataObj = {
      empId: $scope.urlObj.empId,
      assignments: selectedOrders,
    };
    $scope.loading = true;
    $http.post(ajaxUrl + '&ref=assign_items_to_pickers', JSON.stringify(dataObj)).then(
      function (response) {
        var data = response['data'];
        if (data.error) {
          $scope.loading = false;
          alert('Error: ' + data.error);
          return;
        }
        confirm('items assigned successfully.');
        $scope.get_pending_orders();
        $scope.loading = false;
      },
      function (response) {
        $scope.loading = false;
        alert('error::::::');
      },
    );
  };

  // Refresh = simulate pulling from backend after save:
  // move saved assignments into backend baseAssignedItems and clear saved markers.
  $scope.refreshScreen = function () {
    if ($scope.pendingChangesCount > 0) {
      if (confirm('You have unsaved changes. Do you want to refresh and lose those changes?')) {
        $scope.get_pending_orders();
      }
      // else do nothing
      return;
    }
    $scope.get_pending_orders();
  };

  $scope.totalDraftsAcrossSOs = function () {
    var t = 0;
    $scope.salesOrders.forEach(function (so) {
      t += so.draftAssignedCount || 0;
    });
    return t;
  };

  // Assignment history
  $scope.assignmentHistory = [];

  $scope.showAssignmentHistory = function () {
    $scope.loading = true;
    $http.get(ajaxUrl + '&ref=get_assignment_history').then(
      function (response) {
        $scope.assignmentHistory = response.data.history || [];
        $scope.loading = false;
        // Show Bootstrap modal
        var modal = new bootstrap.Modal(document.getElementById('assignmentHistoryModal'));
        modal.show();
      },
      function () {
        $scope.assignmentHistory = [];
        $scope.loading = false;
        alert('Failed to load assignment history.');
      },
    );
  };

  // Initialize
});
