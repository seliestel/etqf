/***
 * eTQF javascript code
 * Created by Ignasi Ribó (ignasi.rib@mfu.ac.th) 
 * for use in Mae Fah Luang University, School of Liberal Arts
 * August 2021
 * Licensed under GNU GPLv3
 * 
 */

/// Global variables ///


/// Form control object initialization ///
class TQFForms {
  constructor() {  
  }
}

class TQFPrint {
  constructor() {  
  }
}

var forms = new TQFForms();
var tqfPrint = new TQFPrint();
var jsonTQF = {}; // Holds the active eTQF3 or eTQF5
var jsonStaff = {}; // Holds the data of staff members obtained from server. App cannot be used if this is not loaded
var jsonCourses = {}; // Holds the data of available courses obtained from server. App cannot be used if this is not loaded

// Version control ////////////////////
// version control to implement changes in the future without rendering old eTQF invalid. Version number is linked to validation functions in separate etqf_[VERSION].js file 
// this version dependent file provides prototypes for TQFForms and TQF3 and TQF5 objects, as well as validations and form control functions that are version-dependent.
const versions = [ "001" ];
var current_version = versions[0]; 
const templates = {
  "TQF3":"versions/"+current_version+"/tqf3-template-v."+current_version+".docx", 
  "TQF5":"versions/"+current_version+"/tqf5-template-v."+current_version+".docx"
};


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

/// Cryptography ///

function createKeypair(string) {
  var buffer = new TextEncoder().encode(string);
  var hashedBuffer = nacl.hash(buffer);
  var hashedPass = [];
  for (var i=0;i<32;i++) hashedPass.push(hashedBuffer[hashedBuffer.length-i-1]); 
  var hash = Uint8Array.from(hashedPass);
  return nacl.sign.keyPair.fromSeed(hash);
}

/// Error handling ///

function error_modal(error) {
  if ($("#multiModal").find(".modal-footer-continue").find('button').length == 0) { 
    if (error === undefined || error == null || error.length == 0) error = "There was an unexpected error and the page needs to be restarted. Sorry for the inconvenience.";
    showModal([
      "Error",
      "<p>"+error+"</p>",
      "",
      "Restart"
    ]); 
    $("#dismissButton").on('click', function(evt) {
      evt.stopPropagation(); 
      hideModal();
      location.reload(true);
    });
  }
}

// Form validation ///

function responseValidate(jsonData) {
  try {
    if (jsonData.has.validated) {
      showModal([ 
        "Your TQF is valid",
        "<p>Two files will be downloaded to your computer:</p><ul><li>a Word file (.docx) that contains the formatted TQF, and</li><li>a text file (.json) that contains the eTQF. Keep this file for future changes or for further submission.</li></ul>",
        "Download",
        "Cancel"
      ]);
      
      $("#dismissButton").on('click', function(evt) { 
        evt.stopPropagation();
        hideModal(); 
      })
      $("#continueButton").on('click', function(evt) {
        evt.stopPropagation();
        hideModal(); 
        download_eTQF(jsonData);
        print_TQF(jsonData);
      });
    } else {
      showModal([ 
        "Attention! Your TQF is not valid",
        "<p>The TQF has the following errors:</p><ul id='errorMessages' class='text-danger'></ul>",
        "Save invalid draft",
        "Continue editing"
      ]);
      Object.values(jsonData.validation.errors).forEach(error => {
        $("#multiModal").find("#errorMessages").append($("<li>").text(error));
      });

      $("#dismissButton").on('click', function(evt) {
        evt.stopPropagation(); 
        hideModal(); 
      });
      $("#continueButton").on('click', function(evt) {
        evt.stopPropagation();
        download_eTQF(jsonData);
        hideModal(); 
      });
    }

  } catch(e) {
    console.log(e);
    hideModal();
    error_modal();
  }
}

/// Output ///

function loadFile(url, callback){
  PizZipUtils.getBinaryContent(url, callback);
}

function generate(template, jsonData, outFilename) {
  loadFile(template, function(error, content) {
    if (error) throw error;
      var zip = new PizZip(content);
      var doc=new window.docxtemplater().loadZip(zip);
      doc.setOptions({linebreaks: true});
      jsonData = tqfPrint[jsonData.version].preprint_process(jsonData);
      doc.setData(jsonData);
      console.log("Rendering");
      console.log(jsonData);
    try {
      doc.render();
    } catch (error) {
      console.log("ERROR HERE");
      var e = {
        message: error.message,
        name: error.name,
        stack: error.stack,
        properties: error.properties,
      }
      console.log(JSON.stringify({error: e}));
      error_modal("There was an unexpected error and the formatted Word file could not be downloaded. Sorry for the inconvenience. Please try again later or inform the School of Liberal Arts, if the problem persists.");
    }
    var out=doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    saveAs(out, outFilename);
  });
}

function print_TQF(jsonData) {
  try {
    console.log("Printing");
    if (jsonData.has === undefined || !jsonData.has.validated) throw 'Not validated'; 
    var filename = jsonData.course + "_" + jsonData.general.title_en +  "_" + jsonData.year + "_" + jsonData.semester + "_" + jsonData.form;
    if (jsonData.signatures !== undefined && jsonData.has !== undefined && jsonData.has.signature && jsonData.signatures.length > 0) {
      filename += "_signed";
    } else if (jsonData.has !== undefined && jsonData.has.validated) {
      filename += "_valid";
    }
    filename += ".docx";
    console.log("Sending to generate");
    console.log(jsonData);

    generate(templates[jsonData.form], jsonData, filename);
  } catch(e) {
    console.log('Error');
    console.log(e);
  } 
}

function download_eTQF(jsonData) {
  try {
    if (jsonData === undefined || (!jsonData instanceof TQF3) || (!jsonData instanceof TQF5)) throw 'Invalid object';
    var filename = jsonData.course + "_" + jsonData.year + "_" + jsonData.semester + "_e" + jsonData.form + "_" + jsonData.version ; 
    if (jsonData.signatures !== undefined && jsonData.has !== undefined && jsonData.has.signature && jsonData.signatures.length > 0) {
      filename +="_signed";
    } else if (jsonData.has !== undefined && jsonData.has.validated) {
      filename +="_valid";
    } else {
      filename +="_draft";
    }
    filename += ".json";
    var data = JSON.stringify(jsonData);
  
    var blob = new Blob([data], {type:'octet/stream'});

    //IE 10+
    if (window.navigator.msSaveBlob) {
      window.navigator.msSaveBlob(blob, filename);
    } else {
      //Everything else
      var url = window.URL.createObjectURL(blob);
      var a = document.createElement('a');
      document.body.appendChild(a);
      a.href = url;
      a.download = filename;
      setTimeout(() => {
        //setTimeout hack is required for older versions of Safari
        a.click();
        //Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 1);
    }
  } catch(e) {
    console.log('Error downloading: '+ e);
  }
}

/// FORM CONTROL ///

/// Call to versioned fill form functions
function fillForm(version, form) {
  if (version === undefined) version = current_version;
  if (form === undefined) throw 'Error';
  try {
    clear_TQF_forms();
    if (form == "TQF3") {
      forms[version].fillTQF3Form();
    } else if (form == "TQF5") {
      forms[version].fillTQF5Form();
    } else {
      throw 'Error';
    }
  } catch(e) {
    console.log(e);
    showModal([
      'Incomplete file',
      'The json file you are uploading is incomplete. Press continue to upload it anyway.',
      'Continue',
      'Cancel'
    ]);
    $("#continueButton").on('click', function(evt) { 
      evt.stopPropagation();
      hideModal();
    });
    $("#dismissButton").on('click', function(evt) { 
      evt.stopPropagation();
      hideModal();
      reset_all_forms();
    });
  }
}


// Form population ///

function populateGeneralSelectFields() {
  try {
    // Fill up year select
    var today = new Date();
    var yyyy = today.getFullYear();
    var initial = yyyy - 5;
    var final = yyyy + 10;
    var y1;

    $(".yearSelect").empty();
    $(".yearSelect").append($('<option disabled selected value>').val("").text("-- Year --"));
    for (var y = initial; y<final; y++) {
      y1 = y + 1;
      $(".yearSelect").append($("<option>").val(parseInt(y)).text(parseInt(y)));     
    }

    $(".programSelect").empty();
    $(".programSelect").append($('<option disabled selected value>').val("").text("-- Program --"));
    Object.keys(programs).forEach((code) => {
      $(".programSelect").append($("<option>").val(code).text(programs[code]['title_en']));  
    })

    $(".semesterSelect").empty();
    $(".semesterSelect").append($('<option disabled selected value>').val("").text("-- Semester --"));
    Object.keys(semesters).forEach((code) => {
      $(".semesterSelect").append($("<option>").val(code).text(semesters[code]));  
    });

  } catch(e) {
    console.log(e);
    error_modal();
  }
}

function parse_nodes(nodes) {
  var output = "";
  $.each(nodes, function(i, node) {
    if (i == 0) {
      output += node;
    } else {
      /* if (!isNaN(parseInt(node))) node = node; */
      output += "[" + node + "]";
    }
  })
  return output;
}

$.fn.values = function(data, callback) {
  var form = this;
  if (typeof callback === "function") {
    callback();
  }
  populator(form, data);
}

function populator(form, json, nodes) {
  try {
    $.each(json, function(key, value) {
      newNodes = nodes ? nodes.slice() : [];
      newNodes.push(key);

      value = (value === "NULL") ? "" : value;
      if (typeof(value) === "object" && value !== null) {
        populator(form, value, newNodes);
      } else {
        if (parse_nodes(newNodes).indexOf("[]") > 0) {
          $('[name="' + parse_nodes(newNodes) + '"]', form).each(function() {
            if ($(this).val() === value) {
              $(this).prop("checked", "checked");
            }
          });
        } else {
          $('[name="' + parse_nodes(newNodes) + '"]', form).val(value);
        }
      }
    });
  } catch(e) {
    console.log(e);
    error_modal();
  }
}

// Event listeners for common elements in forms, loaded from partials, but which will not change with versions

function attachGeneralFormListeners() {

  $(".area-toggle").on('click', function(evt) {
    evt.stopPropagation();
    $(this).siblings(".collapse").collapse("toggle");
    $(this).find("i").toggleClass("fa-plus-square").toggleClass("fa-minus-square");
  });

  $('.card-header').on('click', function(evt) {
    if ($(this).hasClass('instructions') || $(this).hasClass('exception')) {
      // Do nothing
  } else {
      evt.stopPropagation();
      var card = $(this).closest('.card');
      var form = $(this).attr('id').substr(0,4);
      form == "TQF5" ? msg = "You need to upload a valid eTQF3 json file or a draft eTQF5 first." : msg = "You need to select a course or upload a draft eTQF3 json file first."; 
      var course = $("#"+form+"_form").find('[name="course"]').val();
      if (course == undefined || course.length == 0 || course == null) {
        showModal([
          "Warning",
          "<p>"+msg+"</p>",
          "Continue",
          ""
        ]); 
        $("#continueButton").on('click', function(evt) { 
          evt.stopPropagation();
          hideModal();
          $(card).find('.card-body').collapse('hide');
          $(card).find('i').removeClass('fa-minus-square').addClass('fa-plus-square');
        });    
      }
    }
  });

  $('.staffForm').on('change', (evt) => { 
    try {
      evt.preventDefault();
      var type = $(evt.delegateTarget).attr('id').replace('Form', '');    
      var rows = $(evt.delegateTarget).find('.'+type+'Row');
      var row =  $(rows).first();
      for (var i=0;i<rows.length;i++) {
        var id = $(row).find('.'+type+'Select').val();
        if (id != undefined && id != null) {
          var nameDiv = $(row).find('.'+type+'Name');
          var tfound = jsonStaff[id];
          if (tfound != undefined) {
            var str = tfound.name + ' (' + tfound.email + ')';
            $(nameDiv).val(str);
          }
        }
        row = row.next();
      }
    } catch(e) {
      console.log(e);
      error_modal();
    }
  });

  $(".show_hide_password a").on('click', function(evt) {
    evt.preventDefault();
    if($('.show_hide_password').parent().find('input').attr("type") == "text"){
      $('.show_hide_password').parent().find('input').attr('type', 'password');
      $('.show_hide_password i').addClass( "fa-eye-slash" );
      $('.show_hide_password i').removeClass( "fa-eye" );
    } else if($('.show_hide_password').parent().find('input').attr("type") == "password"){
      $('.show_hide_password').parent().find('input').attr('type', 'text');
      $('.show_hide_password i').removeClass( "fa-eye-slash" );
      $('.show_hide_password i').addClass( "fa-eye" );
    }
  });

  $("#course").on('change', (evt) => { 
    createNewTQF3fromSelect();
  });

}

// Listeners for elements outside of loaded forms

$("button.upload").on('click', function (evt) {
  evt.stopPropagation();
  var el = $(this).parent().attr('id').replace('#','');
  var container = $(this).closest('.container');
  $(container).find(".upload_"+el).trigger('click');
});

$(".reset-page").on('click', function(evt) {
  evt.stopPropagation();
  reset_all_forms();
});


/// Modal control ///

function showModal(info) {
  var modal = "multiModal";
  console.log("Showing modal with content: ", info[1]);

  if (info[0] !== undefined && info[0].length > 0) {
    $("#"+modal).find(".modal-header").show();
    $("#"+modal).find(".modal-title").text(info[0]);
  } else {
    $("#"+modal).find(".modal-header").hide();
  }
  $("#"+modal).find(".modal-body").empty().append(info[1]);
  $("#"+modal).find(".modal-footer-continue").empty().hide();
  $("#"+modal).find(".modal-footer-dismiss").empty().hide();
  if (info[2] !== undefined && info[2].length > 0) {
    $("#"+modal).find(".modal-footer-continue").append('<button type="button" id="continueButton" class="btn btn-primary"></button>');
    $("#continueButton").text(info[2]);  
    $("#"+modal).find(".modal-footer-continue").show();
  }
  if (info[3] !== undefined && info[3].length > 0) {  
    $("#"+modal).find(".modal-footer-dismiss").append('<button type="button" id="dismissButton" class="btn btn-secondary" data-bs-dismiss="modal"></button>');
    $("#dismissButton").text(info[3]);
    $("#"+modal).find(".modal-footer-dismiss").show();
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


/// eTQF3 ///

class TQF3 {

  // Constructor is initialized in etqf_VERSION.js with different prototypes according to the version number
  // pass at least an existing course code in object format or constructor will fail
  constructor() {  
    this.form = "TQF3";
  }

  // get validation code
  getValidationCode() {
    try {
      var dataToValidate = JSON.parse(JSON.stringify(this));
      if (dataToValidate.validation !== undefined) delete dataToValidate.validation;
      if (dataToValidate.has.validated !== undefined) delete dataToValidate.has.validated;
      if (dataToValidate.signatures !== undefined) delete dataToValidate.signatures;
      if (dataToValidate.has.signature !== undefined) delete dataToValidate.has.signature;     
      return JSON.stringify(dataToValidate).hashCode();
    } catch(e) {
      console.log(e);
      return null;
    }
  }
  
  // Check validation
  isValid() {
    try {
      if (this.validation === undefined || this.validation.code === undefined || (new Date(this.validation.date) === "Invalid Date")) return false;
      return (this.getValidationCode() === this.validation.code);
    } catch(e) {
      console.log(e);
      return false;
    }
  }

  // Check signatures
  isSigned() {
    return (
      this.signatures !== undefined && this.signatures.length > 0 && this.signatures[0].hash !==undefined && this.signatures[0].id !== undefined && this.signatures[0].name !== undefined
      && this.signatures[0].name.length > 0 && this.signatures[0].id.length > 0 && this.signatures[0].hash.length > 0 && this.signatures[0].date.length > 0
      );
  }

  // TQF3 sign
  sign(signer, password) {
    return signTQF(this, signer, password);
  }

  // TQF3 verify
  verify(id) {
    return verifyTQF(this, id);
  }
}


/// 2 methods to create a TQF3 object:

// 1. Create new TQF3 by selecting a course in the form
function createNewTQF3fromSelect() {
  try {
    jsonTQF = new TQF3()[current_version]({ course: $("#course").val() });
    forms[current_version].populateOutcomes();
  } catch(e) {
    error_modal();
    console.log(e);
  }
}

// 2. Create new TQF3 by uploading a json file with data
$(".upload_draft_eTQF3").on('change', function() {
  var file = this.files[0];
  var reader = new FileReader();
  reader.addEventListener('load', function (e) {
    try {
      var jsonUpload = JSON.parse(e.target.result);
      if (jsonUpload.version === undefined) jsonUpload.version = current_version;

      // Updating general in case the draft has old course data. This cannot be changed in the constructor or it would affect also signatures and verifications of all existing TQFs
      var storedGeneral = jsonCourses[jsonUpload.course];
      if (storedGeneral === undefined) throw 'The course does not exist';
      jsonUpload.general = JSON.parse(JSON.stringify(storedGeneral));

      if (jsonUpload.version != current_version) {
        getForm("TQF3", jsonUpload.version, 
          function(result) {
            $("#TQF3_form").empty();
            $("#TQF3_form").append(result);
            attachGeneralFormListeners();
            forms[current_version].attachListeners();
            reset_all_forms();
            $("select").not('.excludeSelect2').select2({ theme: "bootstrap4"});  
            current_version = jsonUpload.version; 

            jsonTQF = new TQF3()[current_version](jsonUpload);

            if (jsonTQF.signatures.length > 0) {
              jsonTQF.signatures = [];
              jsonTQF.has.signature = false;
            }
            fillForm(jsonTQF.version, jsonTQF.form);
          }, 
          function(error) {
            console.log(error);
            showModal([
              "Warning",
              "<p>The TQF3 you are trying to edit is outdated. Press continue to try to upload it as a draft anyway.</p>",
              "Continue",
              "Cancel"
            ]); 
            $("#dismissButton").on('click', function(evt) { 
              evt.stopPropagation();
              hideModal();
              location.reload(true);
            });
            $("#continueButton").on('click', function(evt) { 
              evt.stopPropagation();
              jsonTQF = new TQF3()[current_version](jsonUpload);
              if (jsonTQF.signatures.length > 0) {
                jsonTQF.signatures = [];
                jsonTQF.has.signature = false;
              }
              fillForm(jsonTQF.version, jsonTQF.form);
              hideModal();
            });
          }
        );
      } else {
        jsonTQF = new TQF3()[current_version](jsonUpload);
        if (jsonTQF.signatures.length > 0) {
          jsonTQF.signatures = [];
          jsonTQF.has.signature = false;
        }
        fillForm(jsonTQF.version, jsonTQF.form);
      }
    } catch(err) {
      console.log(err);
      showModal([
        "Unable to proceed",
        "<p>The file you are trying to upload is not an eTQF3 (json) file or has been corrupted. Please try again or create a new eTQF3.</p>",
        "Continue",
        ""
      ]); 
      $("#continueButton").on('click', function(evt) { 
        evt.stopPropagation();
        hideModal();
      });
    }
  });   
  reader.readAsText(file);
});

// Submit TQF3 form to generate json and Word files after validation

$("#TQF3_form").on("submit", evt => {
  evt.preventDefault();

  if (jsonTQF.course === undefined || jsonTQF.course == null || jsonTQF.course.length == 0) {
    showModal([
      "",
      "<p>You need to select a course or upload an eTQF3 file.</p>",
      "Continue",
      ""
    ]); 
    $("#continueButton").on('click', function(evt) { 
      evt.stopPropagation();
      hideModal();
    });
  } else {   
    try {
      var data = $("#TQF3_form").serializeJSON();
      showModal([
        "Please wait...", 
        "<p>Your TQF3 is being validated.</p>", 
        "", 
        ""
      ]);

      jsonTQF = new TQF3()[current_version](data);
      jsonTQF[current_version].validate(jsonTQF);
      responseValidate(jsonTQF);

    } catch(e) {
      console.log(e);
      error_modal();
    }
  }
});


/// eTQF5 ///

class TQF5 {

  // Constructor is initialized in etqf_VERSION.js with different prototypes according to the version number
  // pass a tqf3 object and/or tqf5 data to construct a TQF5 object
  constructor() {
    this.form = "TQF5";
  }

  // get validation code
  getValidationCode() {
    try {
      var dataToValidate = JSON.parse(JSON.stringify(this));
      if (dataToValidate.validation !== undefined) delete dataToValidate.validation;
      if (dataToValidate.has.validated !== undefined) delete dataToValidate.has.validated;
      if (dataToValidate.signatures !== undefined) delete dataToValidate.signatures;
      if (dataToValidate.has.signature !== undefined) delete dataToValidate.has.signature;     
      return JSON.stringify(dataToValidate).hashCode();
    } catch(e) {
      console.log(e);
      return null;
    }
  }

  // Check validation
  isValid() {
    try {
      if (this.validation === undefined || this.validation.code === undefined || (new Date(this.validation.date) === "Invalid Date")) return false;
      return (this.getValidationCode() === this.validation.code);
    } catch(e) {
      console.log(e);
      return false;
    }
  }

  // Check signatures
  isSigned() {
    return (
      this.signatures !== undefined && this.signatures.length > 0 && this.signatures[0].hash !==undefined && this.signatures[0].id !== undefined && this.signatures[0].name !== undefined
      && this.signatures[0].name.length > 0 && this.signatures[0].id.length > 0 && this.signatures[0].hash.length > 0 && this.signatures[0].date.length > 0
      );
  }

  // TQF5 sign
  sign(signer, password) {
    return signTQF(this, signer, password);
  }

  // TQF5 verify
  verify(id) {
    return verifyTQF(this, id);
  }

}


/// 2 methods to create a TQF5 object:

// 1. Upload a valid TQF3 
$(".upload_valid_eTQF3").on('change', function() {
  var file = this.files[0];
  var reader = new FileReader();
  reader.addEventListener('load', function (e) {
    try {
      var jsonUpload = JSON.parse(e.target.result);
      if (jsonUpload.version === undefined) jsonUpload.version = current_version;
      if (jsonUpload.version != current_version) {
        getForm("TQF5", jsonUpload.version, 
          function(result) {
            $("#TQF5_form").empty();
            $("#TQF5_form").append(result);
            attachGeneralFormListeners();
            forms[current_version].attachListeners();
            reset_all_forms();
            $("select").not('.excludeSelect2').select2({ theme: "bootstrap4"});  
            var jsonTemp = new TQF3()[jsonUpload.version](jsonUpload);
            if (!jsonTemp.isValid()) throw 'Not valid';
            jsonTQF = new TQF5()[jsonUpload.version](jsonTemp, {}); // Create a TQF5 object with TQF3 data only
            $("#TQF3dataToFill").find('input[name=course]').val(jsonTQF.course);
            $("#TQF3dataToFill").find('input[name=year]').val(jsonTQF.year);
            $("#TQF3dataToFill").find('input[name=semester]').val(jsonTQF.semester);   
            if (jsonTQF.signatures.length > 0) {
              jsonTQF.signatures = [];
              jsonTQF.has.signature = false;
            }
            fillForm(jsonTQF.version, jsonTQF.form);
          }, 
          function(error) {
            console.log(error);
            showModal([
              "Warning",
              "<p>The TQF3 you are trying to upload is outdated. You cannot create a TQF5 for an outdated TQF3. Try creating a new TQF3 first.</p>",
              "Continue",
              ""
            ]); 
            $("#continueButton").on('click', function(evt) { 
              evt.stopPropagation();
              reset_all_forms();
              hideModal();
            });
          }
        );
      } else {       
        var jsonTemp = new TQF3()[current_version](jsonUpload);
        if (!jsonTemp.isValid()) throw 'Not valid';
        jsonTQF = new TQF5()[current_version](jsonTemp, {}); // Create a TQF5 object with TQF3 data only
        $("#TQF3dataToFill").find('input[name=course]').val(jsonTQF.course);
        $("#TQF3dataToFill").find('input[name=year]').val(jsonTQF.year);
        $("#TQF3dataToFill").find('input[name=semester]').val(jsonTQF.semester);   
        if (jsonTQF.signatures.length > 0) {
          jsonTQF.signatures = [];
          jsonTQF.has.signature = false;
        }
        fillForm(jsonTQF.version, jsonTQF.form);
      }
    } catch(err) {
      console.log(err);
      showModal([
        "Warning",
        "<p>The file you are trying to upload is not a valid eTQF3 (json) file or has been corrupted. Please upload a validated eTQF3.</p>",
        "Continue",
        ""
      ]); 
      $("#continueButton").on('click', function(evt) { 
        evt.stopPropagation();
        hideModal();
      });
    }
  });   
  reader.readAsText(file);
});

// 2. Upload a TQF5 draft
$(".upload_draft_eTQF5").on('change', function() {
  var file = this.files[0];
  var reader = new FileReader();
  reader.addEventListener('load', function (e) {
    try {
      var jsonUpload = JSON.parse(e.target.result);
      if (jsonUpload.version != current_version) {
        showModal([
          "Warning",
          "<p>The TQF5 you are trying to edit is outdated. Press continue to try to upload it as a draft anyway.</p>",
          "Continue",
          "Cancel"
        ]); 
        $("#dismissButton").on('click', function(evt) { 
          evt.stopPropagation();
          hideModal();
          location.reload(true);
        });
        $("#continueButton").on('click', function(evt) { 
          evt.stopPropagation();
          hideModal();
          try {
            jsonTQF = new TQF5()[current_version]({}, jsonUpload);
            if (jsonTQF.signatures.length > 0) {
             jsonTQF.signatures = [];
             jsonTQF.has.signature = false;
            }
            fillForm(jsonTQF.version, jsonTQF.form);
          } catch(e) {
            console.log(e);
            showModal([
              "Unable to proceed",
              "<p>The file you are trying to upload is not an eTQF5 (json) file or has been corrupted. Please try again or upload a valid eTQF3.</p>",
              "Continue",
              ""
            ]); 
            $("#continueButton").on('click', function(evt) { 
              evt.stopPropagation();
              hideModal();
            }); 
          }
        })
      } else {
        jsonTQF = new TQF5()[current_version]({}, jsonUpload);
        if (jsonTQF.signatures.length > 0) {
          jsonTQF.signatures = [];
          jsonTQF.has.signature = false;
        }
        fillForm(jsonTQF.version, jsonTQF.form);
      }
    } catch(err) {
      console.log(err);
      showModal([
        "Unable to proceed",
        "<p>The file you are trying to upload is not an eTQF5 (json) file or has been corrupted. Please try again or upload a valid eTQF3.</p>",
        "Continue",
        ""
      ]); 
      $("#continueButton").on('click', function(evt) { 
        evt.stopPropagation();
        hideModal();
      }); 
    }
  });   
  reader.readAsText(file);
});


// Submit TQF5 form

$("#TQF5_form").on("submit", evt => {
  try {
    evt.preventDefault();

    showModal([
        "Please wait...", 
        "<p>Your TQF5 is being validated.</p>", 
        "", 
        ""
    ]);

    var currentTQF = JSON.parse(JSON.stringify(jsonTQF));
  
    currentTQF = $.extend(true, currentTQF, $("#TQF5_form").serializeJSON());

    /// Need to correct the radio buttons that serializeJSON doesn't get correctly
    var radios = $('#achievementOutcomes').find('.radios');
    var outs = Object.keys(currentTQF.outcomes);

    var radioVal;
    for (var i=0;i<outs.length;i++) {
      radio = $(radios).filter('input[name^="outcomes['+outs[i]+']"]');
      $(radio).each(function() {
        if ($(this).hasClass('radioYes')) radioVal = 'Yes';
        if ($(this).hasClass('radioNo')) radioVal = 'No';
        if ($(this).hasClass('radioNull')) radioVal = 'N/A';
        if ($(this).prop("checked")) currentTQF.outcomes[outs[i]].achieved = radioVal;
      });
    }

    if (jsonTQF.version != current_version) throw 'Wrong version';
    jsonTQF = new TQF5()[currentTQF.version]({}, currentTQF);
    
    jsonTQF[current_version].validate(jsonTQF);
    responseValidate(jsonTQF);

  } catch(e) {
    console.log(e);
    error_modal();
  }
});


/// SIGN /////////////////////

/// Main function that signs both TQF3 and TQF5, called from classes
function signTQF(tqf, signer, password) {
  try {
    if (tqf === undefined) throw 'No tqf';
    if (signer === undefined) throw 'No signer';
    if (password === undefined || password.length == 0) throw 'No password';
    var dataToSign = JSON.parse(JSON.stringify(tqf));
    delete dataToSign.signatures;
    delete dataToSign.has.signature;

    var iSign = tqf.signatures.length;
 
    tqf.signatures[iSign] = {};
    tqf.signatures[iSign].id = signer.id;
    tqf.signatures[iSign].name = signer.name + " (" + signer.email + ")";  
    tqf.signatures[iSign].pubkey = signer.pubkey; 
    tqf.signatures[iSign].date = getTodayDate();
    tqf.has.signature = true;

    var keyPair = createKeypair(password);
    var pub = toHexString(keyPair.publicKey);

    if (pub != tqf.signatures[iSign].pubkey) throw 'Failed';

    /// Signing
    var stringToSign = "#" + JSON.stringify(dataToSign) + "#" + tqf.signatures[iSign].date + "#" + tqf.signatures[iSign].id + "#";
    var message = new TextEncoder().encode(stringToSign);
    var signature = nacl.sign.detached(message, keyPair.secretKey);
    tqf.signatures[iSign].hash = toHexString(signature);

    return true;
  } catch(e) {
    console.log(e);
    if (tqf.signatures[iSign] !== undefined) delete tqf.signatures[iSign];
    return false;
  }
}


// Only one way to access signature: upload a valid eTQF

$(".upload_valid_eTQF_toSign").on('change', function() {
  var file = this.files[0];
  var reader = new FileReader();
  reader.addEventListener('load', function (e) {
    try {
      var jsonData = JSON.parse(e.target.result);
      (jsonData.form == "TQF3") ? jsonTQF = new TQF3()[jsonData.version](jsonData) : jsonTQF = new TQF5()[jsonData.version]({}, jsonData); 
      console.log("Checking validity");
      console.log(jsonTQF);
      
      if (jsonTQF.isValid()) {
        if (jsonTQF.isSigned()) {
          var signed = [];
          for (var i=0; i<jsonTQF.signatures.length;i++) signed.push(jsonTQF.signatures[i].name);
          showModal([
            "Warning",
            "<p>This eTQF has already been signed by "+signed.join(", ")+". Continue if you want to add your signature to the eTQF.</p>",
            "Continue",
            "Cancel"
          ]); 
          $("#continueButton").on('click', function(evt) {
            evt.stopPropagation(); 
            hideModal();
          });  
          $("#dismissButton").on('click', function(evt) { 
            evt.stopPropagation();
            hideModal();
            reset_all_forms();
          });
        }
        $("#signatureSelect").prop('disabled', false);
        $("#signaturePassword").prop('disabled', false);        
        $("#eTQF_sign_form").values(jsonTQF);
      } else {
        showModal([
          "Warning",
          "<p>This eTQF is not valid. Please upload a validated eTQF3 or eTQF5. You can only validate the eTQF by uploading or completing it in this application and downloading the json file with the 'Generate eTQF' button.</p>",
          "Continue",
          ""
        ]); 
        $("#continueButton").on('click', function(evt) {
          evt.stopPropagation(); 
          hideModal();
        });  
      }
    } catch(err) {
      showModal([
        "Error",
        "<p>The file you are trying to upload is not in the correct eTQF (json) format or has been corrupted.</p>",
        "Continue",
        ""
      ]); 
      $("#continueButton").on('click', function(evt) { 
        evt.stopPropagation();
        hideModal();
      });  
    }
  });   
  reader.readAsText(file);
});

$("#signTQF").on('click', function(evt) {
  try {
    evt.stopPropagation();
    if (jsonTQF === undefined || jsonTQF.form === undefined) throw 'No eTQF';
    var id = $("#signatureSelect").val();
    var password = $("#signaturePassword").val();
    var staff = jsonStaff[id];
    if (password === undefined || password.length == 0) {
      showModal([
        "No password",
        "<p>You need to introduce your secret password to sign an eTQF.</p>",
        "Continue",
        ""
      ]); 
      $("#continueButton").on('click', function(evt) { 
        evt.stopPropagation();
        hideModal();
      });
    } else {
      if (jsonTQF.signatures.some(item => item.id === staff.id)) {
        var signed = jsonTQF.signatures.filter(x => x.id === staff.id)[0];
        showModal([
          "Already signed",
          "<p>You already signed this eTQF on "+signed.date+". A copy of the signed eTQF will be downloaded.</p>",
          "Continue",
          ""
        ]); 
        $("#continueButton").on('click', function(evt) { 
          evt.stopPropagation();
          download_eTQF(jsonTQF);
          print_TQF(jsonTQF);
          hideModal();
          reset_all_forms();
        });
      } else {
        if (jsonTQF.sign(staff, password)) {
          showModal([
            "Successful signature",
            "<p>The signed eTQF (.json) and TQF (.docx) files will be downloaded to your computer.</p>",
            "Continue",
            ""
          ]); 
          $("#continueButton").on('click', function(evt) {
            evt.stopPropagation(); 
            download_eTQF(jsonTQF);
            print_TQF(jsonTQF);
            hideModal();
            reset_all_forms();
          });
        } else {
          showModal([
            "Wrong password",
            "<p>The password you have entered is not correct. Make sure you create a public key by registering in the eTQF system before proceeeding. If you have forgotten your password, you can register again with a new password.</p>",
            "Continue",
            ""
          ]); 
          $("#continueButton").on('click', function(evt) { 
            evt.stopPropagation(); 
            hideModal();
            reset_all_forms();
          });
        }
      }
    }
  } catch(e) {
    console.log(e);
    error_modal();
  }
});

// Event listeners

$("#signatureSelect").on('change', function() {
  $("#signTQF").removeClass('disabled');
});


/// VERIFY ///

/// Main function that verifies both TQF3 and TQF5, called from classes
function verifyTQF(tqf, id) {
  try {
    if (!tqf.isSigned()) throw 'The eTQF has no signatures';
    if (id === undefined) throw 'There is no signer';

    var tempData = JSON.parse(JSON.stringify(tqf));
    delete tempData.signatures;
    delete tempData.has.signature;
    var dataToVerify = JSON.stringify(tempData);

    var signature = tqf.signatures.filter(obj => {
      return obj.id === id
    })[0];

    if (signature === undefined || signature.hash === undefined || signature.pubkey === undefined ) throw 'failed';

    var stringToVerify = "#" + dataToVerify + "#" + signature.date + "#" + id + "#";

    var message = new TextEncoder().encode(stringToVerify);
    var hash = toByteArray(signature.hash);
    var key = toByteArray(signature.pubkey);
    var verification = nacl.sign.detached.verify(message, hash, key);
    if (verification != true) throw 'Not verified'; 
    return signature;
  } catch(e) {
    console.log(e);
    return false;
  }
}

// Event listener for button to verify uploaded eTQF
$("#verifyTQF").on('click', function(evt) {
  try {
    evt.stopPropagation(); 
    if (jsonTQF === undefined || jsonTQF.form === undefined) throw 'No eTQF to verify';
    var id = $("#verifySelect").val();
    var signer = jsonStaff[id];

    var signature = jsonTQF.verify(signer.id);
    if (signature == false) throw 'The signature could not be verified. This might be because the signature has been tampered or the file has been corrupted.';
    var msg = 'The eTQF was signed by '+signature.name+ ' on '+signature.date+'.';
    if (signer.pubkey != signature.pubkey) msg += ' The eTQF was signed with a different password from the one currently stored in the eTQF directory.';
    showModal([
      "Correct verification",
      "<p>"+msg+"</p>",
      "Continue",
      ""
    ]); 
    $("#continueButton").on('click', function(evt) { 
      evt.stopPropagation();
      hideModal();
      reset_all_forms();
      return true;
    });
  } catch(error) {
    console.log(error);
    if ((error !== undefined) && (typeof error !== 'string')) error = "The signature could not be verified. This might be due to an error in the system or a corrupted data file.";
    showModal([
      "Incorrect verification",
      "<p>"+error+"</p>",
      "Continue",
      ""
    ]); 
    $("#continueButton").on('click', function(evt) { 
      evt.stopPropagation();
      hideModal();
      reset_all_forms();
      return false;
    });
  }
});

// Event listener to upload an eTQF to verify or submit. Function updates active jsonTQF.
$(".upload_signed_eTQF").on('change', function() {
  var file = this.files[0];
  var container = $(this).closest('.container');
  var reader = new FileReader();
  reader.addEventListener('load', function (e) {
    try {
      var jsonData = JSON.parse(e.target.result);
      jsonTQF = (jsonData.form == "TQF3") ? new TQF3()[jsonData.version](jsonData) : new TQF5()[jsonData.version]({}, jsonData); 

      if (jsonTQF.isValid()) {
        if (jsonTQF.isSigned()) {
          var form = $(container).find('form');
          $(form).values(jsonTQF);
          if ($(form).attr('id') == 'eTQF_verify_form') {
            var signed = [];
            for (var i=0; i<jsonTQF.signatures.length;i++) signed.push(jsonTQF.signatures[i].id);
            $("#verifySelect > option").each(function() {
              if (!signed.includes($(this).val())) $(this).remove();
            });
            $("#verifySelect").attr('disabled', false);
          } else if ($(form).attr('id') == 'eTQF_submit_form') {
            var coords = [];
            for (var i=0; i<jsonTQF.coordinators.length;i++) coords.push(jsonTQF.coordinators[i].id);
            $("#submitSelect > option").each(function() {
              if (!coords.includes($(this).val())) $(this).remove();
            });
            $("#submitSelect").attr('disabled', false);
            $("#submitPassword").attr('disabled', false);
          }
          $(container).find('.btn').removeClass('disabled');
        } else {
          throw "This eTQF is not signed. Please upload a signed eTQF3 or eTQF5. An eTQF can only be signed by a registered staff member by uploading a valid eTQF and entering the personal password in this application.";
        }
      } else {
        throw "This eTQF is not valid. Please upload a validated and signed eTQF3 or eTQF5. You can only validate the eTQF by uploading or completing it in this application and downloading the json file with the 'Generate TQF' button.";
      }
    } catch(error) {
      console.log(error);
      if ((error !== undefined) && (typeof error !== 'string')) error = "The file you are trying to upload is not in the correct eTQF (json) format or has been corrupted.";
      showModal([
        "Unable to proceed",
        "<p>"+error+"</p>",
        "Continue",
        ""
      ]); 
      $("#continueButton").on('click', function(evt) { 
        evt.stopPropagation();
        hideModal();
        return false;
      });
    }
  });   
  reader.readAsText(file);
});


/// SUBMIT ///

// Event listener to submit eTQF (jsonTQF uploaded with function in VERIFY)
$("#submitTQF").on('click', function(evt) {
  try {
    evt.stopPropagation();
    if (jsonTQF === undefined || jsonTQF.form === undefined) throw 'No eTQF to verify';
    var id = $("#submitSelect").val();
    var password = $("#submitPassword").val();

    if (!jsonTQF.isValid()) throw "The eTQF you are trying to submit is not valid.";
    if (!jsonTQF.isSigned()) throw "The eTQF you are trying to submit is not signed.";

    if (id === undefined || id == null || id.length == 0) throw "You need to select your name from the staff dropdown menu before submitting the eTQF.";
    if (password === undefined || password == null || password.length == 0) throw "You need to enter your password before submitting the eTQF.";

    var keyPair = createKeypair(password);
    var pub = toHexString(keyPair.publicKey);
    var staff = jsonStaff[id];
    if (staff.pubkey != pub) throw "The password you have entered is not correct. Make sure you have registered in the eTQF system and created a public key before trying to submit. If you have forgotten your password, you can create a new one by following the same registration process.";

    for (var i=0;i<jsonTQF.signatures.length;i++) {
      if (jsonTQF.verify(jsonTQF.signatures[i].id) == false) 
        throw "One or more signatures on the eTQF you are trying to submit cannot be verified. This might be due to the signature having been tampered or the file being corrupted. Use the same json file to create a new eTQF and sign it again.";
    }

    showModal([
      "Please wait...",
      "<p>Your eTQF is being submitted.</p>",
      "",
      ""
    ]);

    insertInDatabase(jsonTQF, id, function(res) {

      var link = window.location+ "download?"+jsonTQF.general.program_code+jsonTQF.course+jsonTQF.year+jsonTQF.semester;
      var msg = "<p>Your eTQF has been successfully submitted to the database. You can check that the submission has been correctly updated in the Data tab. <b>Important: To avoid data losses in case of server failure, please save the signed eTQF you have just submitted in your file system.</b></p>";
      if (jsonTQF.form=="TQF3") msg+="<p>Students can download the TQF3 of your course using the following link: <b>"+link+"</b></p><p>You can also save to your computer the following QR code image which links to the download URL: </p><div class='row'><div class='col-sm-1'></div><div class='col-sm-6'><div id='qrcode'></div></div></div>";
 
      showModal([
        "Submission successful",
        msg,
        "Continue",
        ""
      ]);
 
      if (jsonTQF.form=="TQF3") $("#qrcode").qrcode({ text: link, width: 100, height: 100 });
      $("#continueButton").on('click', function(evt) { 
        evt.stopPropagation();
        hideModal();
        getFromDatabase(jsonTQF.general.program_code, jsonTQF.year, jsonTQF.semester, showTable, function (error) {
          console.log(error);
          hideModal();
          location.reload(true);
        });
      });
    }, function(error) {
        if ((error !== undefined) && (typeof error !== 'string')) error = "Your eTQF could not be processed. Please check that you are submitting a correct eTQF and try again later. If the error persists, contact Liberal Arts administrative staff.";
        console.log(error);
        showModal([
          "Submission failed",
          "<p>"+error+"</p>",
          "Continue",
          ""
        ]);
        $("#continueButton").on('click', function(evt) { 
          evt.stopPropagation();
          hideModal();
          reset_all_forms();
        });
    });

  } catch(error) {
    console.log(error);
    if ((error !== undefined) && (typeof error !== 'string')) error = "There was an unexpected error and the submission could not proceed.";
    showModal([
      "Failed submission",
      "<p>"+error+"</p>",
      "Continue",
      ""
    ]); 
    $("#continueButton").on('click', function(evt) { 
      evt.stopPropagation();
      hideModal();
      reset_all_forms();
    });
  }
});

/// REGISTER ///

function getEmailConfirmation(email, token, success, failure) {
  try {
    $("#generateKey").addClass('disabled');
    showModal([
      "Token sent",
      "<p>A one-time password token has been sent to your email:</p><p><b>"+email+"</b></p><p>Please check your email Inbox before proceeding to complete the registration. In the meantime, keep your browser window open.</p><p>The email can take up to 5 minutes to be received and it might end up in your Spam folder. If you don't receive any email, please start the process again. If the email shown above is not correct, contact the administrative staff at the School of Liberal Arts to correct it.</p>",
      "Continue",
      ""
    ]);
    $("#multiModal").find(".modal-footer-continue").hide();

    var html = "<p>Thank you for registering to use eTQF. A one-time password token has been automatically generated to confirm your identity:</p><p></p><p><h3>"+token+"</h3></p>";
    html+= "<p>Please go back to the eTQF website and introduce this token to complete your registration. If you have not requested to register or change your password in the eTQF system, you can ignore this email.</p>"
    html+= "<p>School of Liberal Arts</p><p></p><p>THIS IS AN AUTOMATIC EMAIL. DO NOT REPLY.</p>"
    var jsondata = {
      "to": email,
      "subject":"Your eTQF registration token", 
      "html": html, 
      "sendername": "MFU Liberal Arts"
    }

    var settings = {
      "async": true,
      "crossDomain": true,
      "url": "/send_mail",
      "method": "POST",
      "headers": {
        "content-type": "application/json",
        "cache-control": "no-cache"
      },
      "processData": false,
      "data": JSON.stringify(jsondata)
    }

    $.get(settings).done(function(response) {

      $("#continueButton").on('click', function(evt) { 
        evt.stopPropagation();
        hideModal();
      });
      $("#multiModal").find(".modal-footer-continue").show();
      if (response) {
        success();
      } else {
        failure();
      }
    });
  } catch(e) {
    console.log(e);
    error_modal();
  }
}

function finishRegistration(id, pubkey) {

  showModal([
    "Please wait...",
    "<p>Your public key is being updated in the register.</p>",
    "",
    ""
  ]);

  $.ajax({
    url: "/register", 
    type: "POST",
    data: {'id': id, 'pubkey': pubkey },
    statusCode: {
      200: function(result) {
        showModal([
          "Registration complete",
          "<p>Your public key has been successfully updated in the register. You can now safely sign eTQF forms with your secret password.</p>",
          "Continue",
          ""
        ]);
        $("#continueButton").on('click', function(evt) { 
          evt.stopPropagation();
          hideModal();
          location.reload(true);
        });
      },
      500: function(error) {
        hideModal();
        error_modal('There was an error and your public key could not be registered. Please try again later');
      }
    }
  });

}

$("#generateKey").on('click', function(evt) {
  try {
    evt.stopPropagation();
    var id = $("#registerSelect").val();
    if (id === undefined ||  id == null || id.length == 0) throw 'You need to select your name from the staff dropdown menu.';
    var staff = jsonStaff[id];
    var email = staff.email;
    if (email === undefined || email == null || email.length == 0) throw 'Your email is not in the database. Please contact Liberal Arts administration to update your details.';
    var password = $("#passwordRegister").val();
    if (password === undefined || password == null || password.length < 6) {
      throw 'You need to introduce a password at least 6 characters long.';
    } else {
      var keyPair = createKeypair(password);
      var publicKey = toHexString(keyPair.publicKey);
      if (publicKey == staff.pubkey) throw 'Your public key is already registered in the database using this same password. Use this application only if you need to change your password.';
      var salt = Math.floor(Math.random() * 100000000).toString();
      var token = (publicKey+salt).hashCode().toString(16);
      getEmailConfirmation(email, token, function() {
        $("#registerSelect").attr('disabled', true);
        $("#tokenRegister").val(null);
        $("#tokenRow").show();        
        $("#keyRow").hide();
        $("#multiModal").find(".modal-footer-continue").show();
        $("#continueButton").on('click', function(evt) {
          evt.stopPropagation();
          hideModal();
          $("#confirmRegister").on('click', function(evt) {
            evt.stopPropagation();
            var tokenRegister = $("#tokenRegister").val();
            if (tokenRegister == token) {
              finishRegistration(id, publicKey);
            } else {
              showModal([
                "Wrong token",
                "<p>The token you entered is not correct. The application will restart.</p>",
                "",
                "Restart"
              ]); 
              $("#dismissButton").on('click', function(evt) {
                evt.stopPropagation(); 
                hideModal();
                location.reload(true);
              });
            }
          });
        });
      }, function() {
        showModal([
          "Unable to proceed",
          "<p>There has been an error and the registration cannot processed. Please try again later.</p>",
          "",
          "Restart"
        ]); 
         $("#dismissButton").on('click', function(evt) {
          evt.stopPropagation(); 
          hideModal();
          location.reload(true);
        });
      });
    }
  } catch(error) {
    console.log(error);
    if ((error !== undefined) && (typeof error !== 'string')) error = "There has been an error and the registration cannot be processed. Please try again later.";
    showModal([
      "Unable to proceed",
      "<p>"+error+"</p>",
      "",
      "Restart"
    ]); 
    $("#dismissButton").on('click', function(evt) { 
      evt.stopPropagation();
      hideModal();
      location.reload(true);
    });
  }
});


/// DATA ///

$("#viewData").on('click', evt => {
  try {
    evt.preventDefault();

    var params = $("#eTQF_data_form").serializeJSON();
 
    if (params.year === undefined || params.semester === undefined || params.program_code === undefined) {
       showModal([
         "Incomplete request",
         "<p>You need to select the program, year and semester for which you want to view the submission data.</p>",
         "Continue",
         ""
      ]); 
      $("#continueButton").on('click', function(evt) { 
        evt.stopPropagation();
        hideModal();
      });
    } else if (params.id === undefined || params.id.length == 0) {
      showModal([
         "Incomplete request",
         "<p>You need to select your name from the staff dropdown menu. Only registered staff members can view submissions data.</p>",
         "Continue",
         ""
      ]); 
      $("#continueButton").on('click', function(evt) { 
        evt.stopPropagation();
        hideModal();
      });
    } else if (params.password === undefined || params.password.length == 0) {
      showModal([
         "Incomplete request",
         "<p>You need to introduce your password to be able to access submissions data. If you haven't done it yet or you have forgotten your password, use the Registration section of this website to register before proceeding.</p>",
         "Continue",
         ""
      ]); 
      $("#continueButton").on('click', function(evt) { 
        evt.stopPropagation();
        hideModal();
      });
    } else {
      showModal([
       "Please wait...",
        "<p>The data you requested is being processed.</p>",
        "",
        ""
      ]);
      var keyPair = createKeypair(params.password);
      var pub = toHexString(keyPair.publicKey);
      var staff = jsonStaff[params.id];
      if (staff.pubkey != pub) throw "The password you have entered is not correct. Make sure you have registered in the eTQF system before trying to access submissions data.";
    
      getFromDatabase(params.program_code, params.year, params.semester, showTable, function (error) {
        console.log(error);
        hideModal();
        error_modal("There was an error processing your request. Please try again later or revise the search criteria.");
      });
    }
  } catch(error) {
    console.log(error);
    if (error === undefined || error == null || error.length == 0) error = "There was an error processing your request. Please try again later or revise the search criteria.";
    error_modal(error);
  }
});

function call_download_eTQF(params) {
  var data = $("#tableData"+params['form']).data(params['course']);
  var jsonData = JSON.parse(data);
  download_eTQF(jsonData);
}

function call_print_TQF(params) {
  var data = $("#tableData"+params['form']).data(params['course']);
  var jsonData = JSON.parse(data);
  print_TQF(jsonData);
}

function showTable(program, year, semester, results) {
  try {

    if (results.length == 0) {
      showModal([
        "Nothing found",
        "<p>There are no submissions for the program, year and semester you requested.</p>",
        "Continue",
        ""
      ]); 
      $("#continueButton").on('click', function(evt) { 
        evt.stopPropagation();
        hideModal();
      });
    } else {
      var date, dd, mm, yyyy;
      var obj = {};
      var data;
      for (var i=0; i<results.length; i++) {
        data = JSON.parse(results[i].data);
        Object.keys(data).forEach(function(k){ if (data[k] == 'true') data[k] = true; if (data[k] == 'false') data[k] = false; });
        if (obj[data.course] === undefined) obj[data.course] = {}; 
        obj[data.course]['title'] = data.general.title_en;
        obj[data.course]['coordinators'] = data.coordinators.map(a => a.name).join(", ");;
        date = new Date(parseInt(results[i].timestamp));
        dd = String(date.getDate()).padStart(2, '0');
        mm = String(date.getMonth() + 1).padStart(2, '0'); //January is 0!
        yyyy = date.getFullYear();

        $("#tableData"+data.form).data(data.course, JSON.stringify(data));
        obj[data.course][data.form] = {
          submitted_date: (dd + '/' + mm + '/' + yyyy), 
          submitted_by: jsonStaff[results[i].submitted_by]['name'],
          json: "{form: '"+data.form+"',course: '"+data.course+"'}"  
        }  
      }
     
      $("#table_program_code").text(program);
      $("#table_program_title").text(programs[program]['title_en']);
      $("#table_year").text(year);
      $("#table_semester").text(semester);
  
      var dataSet = [];

      Object.entries(obj).forEach((entry, i) => {
        dataSet[i] = [];
        dataSet[i][0] = entry[0]; // Course code
        dataSet[i][1] = entry[1]['title']; 
        dataSet[i][2] = entry[1]['coordinators']; 
        if (entry[1]['TQF3'] !== undefined) {
          dataSet[i][3] = entry[1]['TQF3']['submitted_date'];
          dataSet[i][4] = entry[1]['TQF3']['submitted_by'];
          dataSet[i][5] = entry[1]['TQF3']['json'];
        } else {
          dataSet[i][3] = "N/A";
          dataSet[i][4] = "N/A";
          dataSet[i][5] = "N/A";
        }
        if (entry[1]['TQF5'] !== undefined) {
          dataSet[i][6] = entry[1]['TQF5']['submitted_date'];
          dataSet[i][7] = entry[1]['TQF5']['submitted_by'];
          dataSet[i][8] = entry[1]['TQF5']['json'];
        } else {
          dataSet[i][6] = "N/A";
          dataSet[i][7] = "N/A";
          dataSet[i][8] = "N/A";
        }
      });

      $('#dataTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
          {
            text: 'Back',
            action: function ( e, dt, node, config ) {
              location.reload(true);
            }
          },
          {
            extend: 'excel',
            title: ('eTQF-data-'+data.program_code+'_'+data.year+'_'+data.semester),
            exportOptions: {
              columns: [ 0, 1, 2, 3, 4, 6, 7 ]
            }             
          }
        ],
        columnDefs: [
          {
            targets: [0],
            render: function (data, type, row, meta) {
              if (row[3] != "N/A") data = '<span class="linkToCopy withPointer text-primary" data-toggle="tooltip" data-placement="bottom" title="Click to copy TQF3 public download link" data-link="'+window.location+'download?' + program + data + year + semester + '">'+data+'</span>';
              return data;
            }
          },
          {
            targets: [5,8],
            render: function (data, type, row, meta) {
              if ((meta.col == 5 && row[3] != "N/A") || (meta.col == 8 && row[6] != "N/A")) data = '<span style="font-size: 1.2em" class="fa fa-file-code text-info withPointer" data-toggle="tooltip" data-placement="bottom" title="Download json file" onclick="call_download_eTQF('+data+')"></span> <span style="font-size: 1.2em" class="fa fa-file-word text-info withPointer" data-toggle="tooltip" data-placement="bottom" title="Download formatted Word file" onclick="call_print_TQF('+data+')" style="cursor:pointer !important"></span>';
              return data;
            }
          }
        ],
        data: dataSet
      });

      hideModal();
      $('#main_page').hide();
      $('#data_table_page').show();    
      $(".linkToCopy").on("click", function(evt) {
        copyToClipboard($(this).data('link'));
      });
      if($('#multiModal').hasClass('show')) $('#multiModal').modal('hide'); 
    }
  } catch(e) {
    console.log(e);
    error_modal();
  }
}

function copyToClipboard(text) {
  var $temp = $("<input>");
  $("body").append($temp);
  $temp.val(text).select();
  document.execCommand("copy");
  $temp.remove();
}

function getFromDatabase(program, year, semester, success, failure) {
  $.ajax({
    url: "/submissions", 
    type: "GET",
    data: {
      program: program,
      year: year,
      semester: semester
    },
    statusCode: {
      200: function(result) {
        success(program, year, semester, result);
      },
      400: function(error) {
        failure(error);
      },
      500: function(error) {
        failure(error);
      }
    }
  });
}

function insertInDatabase(object, id, success, failure) {
  $.ajax({
    url: "/submissions", 
    type: "POST",
    data: {
        data: JSON.stringify(object),
        submitted_by: id,
        timestamp: new Date().getTime().toString()
    },
    statusCode: {
      200: function(result) {
        success(result);
      },
      400: function(error) {
        failure(error);
      },
      500: function(error) {
        failure(error);
      }
    }
  });
}

/// Initialization ///

// Ajax GET from server : course or staff data
function getData(type, success, failure) {
  $.ajax({
    url: "/getdata", 
    type: "GET",
    data: {'type': type},
    statusCode: {
      200: function(result) {
        try {
          success(result);
          return;
        } catch(e) {
          console.log('Error parsing data');
          error_modal();
        }
      },
      500: function(error) {
        console.log(error);
        failure({});
      }
    }
  });
}

// Ajax GET from server: version forms html
function getForm(form, version, success, failure) {
  $.ajax({
    url: "/form", 
    type: "GET",
    data: {
      version: version,
      form: form
    },
    statusCode: {
      200: function(result) {
        success(result);
      },
      400: function(error) {
        failure(error);
      },
      500: function(error) {
        failure(error);
      }
    }
  });
}

function populateCourses() {
  if (jsonCourses === undefined) throw 'Courses not set';
  $("#course").empty();
  $("#course").append(
    $('<option disabled selected value>').val("").text("-- Select a course --")
  );
  Object.keys(jsonCourses).sort( (a, b) => { return a.localeCompare(b) }).forEach( course => {
    $("#course").append(
      $('<option>').val(course).text(course+" "+jsonCourses[course]['title_en'])
    );
  });
  if (!$.isEmptyObject(jsonStaff) && !$.isEmptyObject(jsonCourses)) {
    $("input").not('.always-disabled').prop('disabled', false);
    $("select").not('.always-disabled').prop('disabled', false);
  }
}

function getCourses(callback) {
  return getData("courses", function(y) {
    try {
      courses = y.sort( (a, b) => { return a.course.localeCompare(b.course); });
      courses.forEach( o => {
        Object.keys(o).forEach( key => {
          try {
            o[key] = JSON.parse(o[key]);
          } catch(err) {
            // do nothing
          }
        });
        jsonCourses[o.course] = o;
      });
      populateCourses();
      callback();
    } catch(e) {
      console.log(e);
      error_modal('Data could not be loaded. The page needs to be restarted. Sorry for the inconvenience.');
    }
  }, function(error){
      console.log(error);
      error_modal('Data could not be loaded. The page needs to be restarted. Sorry for the inconvenience.');
  });
}

function populateStaff() {
  if (jsonStaff === undefined) throw 'Staff not set';
  $(".staffSelect").empty();
  $(".staffSelect").append(
    $('<option disabled selected value>').val("").text("-- Staff member --")
  );
  Object.keys(jsonStaff).sort( (a, b) => { return jsonStaff[a]['email'].localeCompare(jsonStaff[b]['email']) }).forEach( id => {
    $(".staffSelect").append(
      $('<option>').val(id).text(jsonStaff[id]['name'] + ' (' + jsonStaff[id]['email'] + ')')
    );
  });
  $(".staffSelect").append(
    $('<option value>').val("Undetermined").text("Undetermined")
  );
  if (!$.isEmptyObject(jsonStaff) && !$.isEmptyObject(jsonCourses)) {
    $("input").not('.always-disabled').prop('disabled', false);
    $("select").not('.always-disabled').prop('disabled', false);
  }
}

function getStaff(callback) {
  return getData('staff', function(y) {
    try {
      var staff = y.sort( (a, b) => { return a.email.localeCompare(b.email); });
      for (var i=0;i<staff.length;i++) jsonStaff[staff[i]['id']] = staff[i];
      populateStaff();
      callback();
    } catch(e) {
      console.log(e);
      error_modal('Data could not be loaded. The page needs to be restarted. Sorry for the inconvenience.');
    }
  }, function() {
    error_modal('Data could not be loaded. The page needs to be restarted. Sorry for the inconvenience.');
  });
}

function clear_TQF_forms() {
  $("form").trigger("reset");
  $("form").values({});
  var flexRows = $(".flexRow");
  var seen = [];
  var classes;
  var toRemove = [];
  for (var i=0;i<flexRows.length;i++) {
    classes = $(flexRows[i]).attr('class');
    if (seen.includes(classes)) {
      toRemove.push($(flexRows[i]));
    } else {
      seen.push(classes);
    }
  }
  for (var i=0;i<toRemove.length;i++) $(toRemove[i]).remove();
  $("input[type=checkbox]").prop('checked', false);
  $("textarea").val('');
  $(".toEmpty").empty();
  $(".toHide").hide();
}

function reset_all_forms() {
  clear_TQF_forms();
  $("input").val("");
  $("textarea").val('');
  var select2_exists = ($("select").filter('.select2-hidden-accessible').length > 0);
  if (select2_exists) $("select").not('.excludeSelect2').select2("destroy");
  $("select").val("");
  populateGeneralSelectFields();
  forms[current_version].populateSelectFields();
  populateCourses();
  populateStaff();
  $('.card').not('.uncollapsed').find('.card-body').collapse('hide');
  $('.card').not('.uncollapsed').find('i').removeClass('fa-minus-square').addClass('fa-plus-square');
  if (select2_exists) $("select").not('.excludeSelect2').select2({ theme: "bootstrap4"});
  $("input[type=checkbox]").prop('checked', false); 
  $(".always-disabled").prop('disabled', true);
  jsonTQF = {};
};

$(".nav-link").on("click", function(evt) {
  evt.preventDefault();
  var target = evt.target;
  var course;
  var current = $('.nav-link').filter('.active');
  if ($(current).attr('id') == "TQF3-link") {
    course = $("select[name='course']").val();
  } else if ($(current).attr('id') == "TQF5-link") {
    course = $("input[name='course']").val();
  }
  filled = (course !== undefined && course !== null && course.length > 0);
  if (filled) {
    showModal([
      "Warning",
      "<p>By navigating away from this page, any data you may have introduced in the form will be lost. If you want to save a json draft, press Cancel and generate the eTQF, even if it is incomplete. Continue to proceed to the next tab.</p>",
      "Continue",
      "Cancel"
     ]); 
     $("#continueButton").on('click', function(e) {
       e.stopPropagation();
       reset_all_forms(); 
       $(target).tab('show');
       hideModal();
     });    
     $("#dismissButton").on('click', function(e) {
       e.stopPropagation(); 
       $(current).tab('show');
       hideModal();
     });
  } else {
    reset_all_forms();
    $(target).tab('show');
  }
});

$(document).ready(function() {
  getForm("TQF3", current_version, 
    function(tqf3Form) {
      $("#TQF3_form").empty();
      $("#TQF3_form").append(tqf3Form);
      getForm("TQF5", current_version, 
        function(tqf5Form) {
          $("#TQF5_form").empty();
          $("#TQF5_form").append(tqf5Form);
          getStaff(function() {
            getCourses(function() {
              attachGeneralFormListeners();
              forms[current_version].attachListeners();
              reset_all_forms();
              $("select").not('.excludeSelect2').select2({ theme: "bootstrap4"});  
              $("#loader").hide();
              hideModal();
            });  
          });
        },
        function(error) {
          console.log(error);
          location.reload(true);
        }
      );
    }, 
    function(error) {
      console.log(error);
      location.reload(true);
    }
  );
});
