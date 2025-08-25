/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
  "N/search",
  "N/file",
  "N/record",
  "../NSWMS V3 Globals/utility_module",
], /**
 * @param{https} https
 * @param{search} search
 * @param{url} url
 */ (search, file, record, utility) => {
  /**
   * Defines the Suitelet script trigger point.
   * @param {Object} scriptContext
   * @param {ServerRequest} scriptContext.request - Incoming request
   * @param {ServerResponse} scriptContext.response - Suitelet response
   * @since 2015.2
   */
  const onRequest = (scriptContext) => {
    if (scriptContext.request.method === "GET") {
      
        var params = scriptContext.request.parameters;
        var response = {};
        if (params["ref"] == "getSetUpData") {
          response["setUpData"] = utility.getSetUpRecordData(params["setUpId"]);
          response["allItems"] = utility.getItems();
        } else if (params["ref"] == "itemData") {
          response = utility.getItemData(
            params["setUpData"],
            params["scannedItem"]
          );
        }
        scriptContext.response.write(JSON.stringify(response));    
    } else {
     
        var params = scriptContext.request.parameters;
        var body = JSON.parse(scriptContext.request.body);
        var response = {};
        if (params["ref"] == "imageUpload") {
          response = uploadImagetoNS(body);
        }
        scriptContext.response.write(JSON.stringify(response));
          
    }

    function uploadImagetoNS(body) {
      var data = body;
      var filename = "";
      if (data.itemName) {
        filename = data.itemName + new Date().getTime() + ".png";
      } else {
        filename = "itemImage" + new Date().getTime() + ".png";
      }
      try {
        var imageUrl = createFile(
          filename,
          "PNGIMAGE",
          replaceBase64(data.imageData),
          utility.getFolderId("NSWMS V3 Lookup Images"),
          true,
          data.itemID,
          data.type
        );
        return {
          status: "successs",
          data: imageUrl,
        };
      } catch (e) {
        log.error("error in uploadImagetoNS", e);
        var response = { status: 'error', message: e.message };
        return response;
      }
    }
    function createFile(
      name,
      type,
      contents,
      folderId,
      isOnline,
      itemId,
      itemType
    ) {
      try {
        var fileObj = file.create({
          name: name,
          fileType: type,
          contents: contents,
          folder: folderId,
          isOnline: isOnline,
        });

        var fileId = fileObj.save();
        if (itemId && itemType) {
          utility.submitFields(itemType, itemId, {
            custitem_nst_wms_lookup_uploaded_image: fileId,
          });
        }
        return utility.getFileUrl(fileId);
      } catch (e) {
        log.error("error in createFile", e);
      }
    }
    function replaceBase64(base64url) {
      base64url = base64url.replace("data:image/png;base64,", "");
      base64url = base64url.replace("data:image/jpeg;base64,", "");
      base64url = base64url.replace(/ /g, "+");
      //log.debug("base64url",base64url)
      return base64url;
    }
  };
  return { onRequest };
});
