// Global variables

var jsonUpload = [];


/// Utility functions ///

String.prototype.hashCode = function() {
    var hash = 0;
    if (this.length == 0) return hash;
    for (var i = 0; i < this.length; i++) {
        var char = this.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
}

function toHexString(byteArray) {
  return Array.prototype.map.call(byteArray, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}

function toByteArray(hexString) {
  var result = [];
  for (var i = 0; i < hexString.length; i += 2) {
    result.push(parseInt(hexString.substr(i, 2), 16));
  }
  return Uint8Array.from(result);
}

function getTodayDate() {
  var today = new Date();
  var dd = String(today.getDate()).padStart(2, '0');
  var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
  var yyyy = today.getFullYear();
  return (dd + '/' + mm + '/' + yyyy);
}


/// Modal control ///

function showModal(info) {
  var modal = "multiModal"
  if (info[0] !== undefined && info[0] != "") {
    $("#"+modal).find(".modal-header").show();
    $("#"+modal).find(".modal-title").text(info[0]);
  } else {
    $("#"+modal).find(".modal-header").hide();
  }
  $("#"+modal).find(".modal-body").empty().append(info[1]);
  if (info[2] !== undefined && info[2] != "") {
    $("#"+modal).find(".modal-footer-continue").append('<button type="button" id="continueButton" class="btn btn-primary"></button>');
    $("#continueButton").text(info[2]);  
    $("#"+modal).find(".modal-footer-continue").show();
  } else {
    $("#"+modal).find(".modal-footer-continue").hide();
  }
  if (info[3] !== undefined && info[3] != "") {  
    $("#"+modal).find(".modal-footer-dismiss").append('<button type="button" id="dismissButton" class="btn btn-secondary" data-bs-dismiss="modal"></button>');
    $("#dismissButton").text(info[3]);
    $("#"+modal).find(".modal-footer-dismiss").show();
  } else {
    $("#"+modal).find(".modal-footer-dismiss").hide();
  }
  $("#"+modal).modal({ backdrop: 'static', keyboard: false });
}

function hideModal() {
  var modal = "multiModal"
  $("#"+modal).modal('hide'); 
  $("#"+modal).find(".modal-title").text("");
  $("#"+modal).find(".modal-header").hide();
  $("#"+modal).find(".modal-body").empty();
  $("#continueButton").text("");
  $("#dismissButton").text("");
  $("#continueButton").off('click');
  $("#dismissButton").off('click');
  $("#"+modal).find(".modal-footer-continue").empty();
  $("#"+modal).find(".modal-footer-dismiss").empty();
  $("#"+modal).find(".modal-footer-continue").hide();
  $("#"+modal).find(".modal-footer-dismiss").hide();
  $('body').removeClass('modal-open');
  $('.modal-backdrop').remove();
}

/// Cryptography ///

function createKeypair(string) {
  var buffer = new TextEncoder().encode(string);
  var hashedBuffer = nacl.hash(buffer);
  var hashedPass = [];
  for (var i=0;i<32;i++) hashedPass.push(hashedBuffer[hashedBuffer.length-i-1]); 
  var hash = Uint8Array.from(hashedPass);
  return nacl.sign.keyPair.fromSeed(hash);
}

/// UPDATE ///

$("#update_file_input").on('change', function(evt) {
  evt.stopPropagation();
  var file = this.files[0];
  var reader = new FileReader();
  reader.readAsBinaryString(file);
  reader.addEventListener('load', function (e) {
    var data = e.target.result;
    var workbook = XLSX.read(data, {type:"binary"});
    workbook.SheetNames.forEach(sheet => {
      var rowObject = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheet]);     
      jsonUpload = jsonUpload.concat(rowObject);
    });
  });
});


$("#updateFile").on("click", evt => {
  try {
    evt.preventDefault();
    showModal([
      "Please wait...",
      "<p>Your file is being processed by the server.</p>",
      "",
      ""
    ]);
    var password = $("#updatePassword").val();
    var type = $("#updateType").val();
    var submitted_by = $("#updateId").val();
    if (jsonUpload === undefined || jsonUpload.length == 0) throw 'You need to select an .xlsx or .xls file to upload.';
    if (type === undefined || type.length == 0 || password === undefined || password.length == 0 || submitted_by === undefined || submitted_by.length == 0) throw 'You have not introduced the necessary information.';
    var keyPair = createKeypair(password);
    var pubkey = toHexString(keyPair.publicKey);

    $.ajax({
      url: "/update", 
      type: "POST",
      data: {
        data: JSON.stringify(jsonUpload, undefined, 4),
        submitted_by: submitted_by,
        pubkey: pubkey,
        timestamp: new Date().getTime().toString(),
        type: type
      },
      statusCode: {
        200: function(result) {
          showModal([
            "Successful update",
            "<p>The "+type+" data has been successfully updated on the application.</p>",
            "Go to app",
            "Continue updating"
          ]); 
          $("#continueButton").on('click', function(evt) { 
            evt.stopPropagation();
            hideModal();
            window.location = '/';
          });
          $("#dismissButton").on('click', function(evt) { 
            evt.stopPropagation();
            hideModal();
          });
        },
        500: function(result) {
          var errors
          try {
            errors = JSON.parse(result.responseText)['errors'];
          } catch(err) {
            errors = [];
          }
          var msg = "<p>The "+type+" data of the application could not be updated.";
          if (errors !== undefined && errors.length > 0) {
            msg += " The following errors were found:</p><ul>";
            for (var i=0; i<errors.length;i++) {
              msg+="<li style='color: red'>"+errors[i]+"</li>";
            }
            msg+="</ul>";
          } else {
            msg+=" It seems that there has been a server error. Please try again or seek assistance.<p>"
          }
          showModal([
            "Failed update",
            msg,
            "Continue",
            ""
          ]); 
          $("#continueButton").on('click', function(evt) { 
            evt.stopPropagation();
            hideModal();
          });
        }
      }
    });
    
  } catch(error) {
    if (error === undefined || error == null || error.length == 0) error = "There was an unexpected error. Sorry for the inconvenience.";
    showModal([
      "Unable to proceed",
      "<p>"+error+"</p>",
      "Continue",
      ""
    ]); 
    $("#continueButton").on('click', function(evt) { 
      evt.stopPropagation();
      hideModal();
    });
  } 
});

$("#backToApp").on('click', function(evt) {
  evt.stopPropagation();
  window.location = '/';
});

/// Initialization ///

$(document).ready(function() {
  $('input').val('');
  $('select').val('').trigger('change');
});
