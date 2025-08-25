/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(["N/record"], /**
 * @param{record} record
 */ (record) => {
  /**
   * Defines the function definition that is executed after record is submitted.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {Record} scriptContext.oldRecord - Old record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @since 2015.2
   */
  const afterSubmit = (scriptContext) => {
    try {
      const id = scriptContext.newRecord.id;
      var needSave = false;
      var soRecObj = record.load({
        type: scriptContext.newRecord.type,
        id: id,
        isDynamic: true,
      });
      const itemsCount = soRecObj.getLineCount({
        sublistId: "item",
      });
      for (var i = 0; i < itemsCount; i++) {
        if (soRecObj.getSublistText({sublistId: "item",fieldId: "item",line : i,})) {
          soRecObj.selectLine({
            sublistId: "item",
            line: i,
          });
          var lineuniquekey = soRecObj.getCurrentSublistValue({
            sublistId: "item",
            fieldId: "lineuniquekey",
          });
          var isExists = soRecObj.getCurrentSublistValue({
            sublistId: "item",
            fieldId: "custcol_nst_wms_nestcoreid",
          });
          var item = soRecObj.getCurrentSublistValue({
            sublistId: "item",
            fieldId: "item",
          })
          if (!isExists && item) {
            soRecObj.setCurrentSublistValue({
              sublistId: "item",
              fieldId: "custcol_nst_wms_nestcoreid",
              value: lineuniquekey,
            });
            if (!needSave) needSave = true;
          }
          soRecObj.commitLine({
            sublistId: "item",
          });
        }
      }
      if (needSave) soRecObj.save();
    } catch (e) {
      log.error("error", e);
    }
  };

  return { afterSubmit };
});
