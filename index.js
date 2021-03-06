const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const {pool} = require('./config');
const app = express();
const https = require('https');
const router = express.Router();
const path = require('path'); 
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');

const { programs } = require('./js/etqf_programs.js');


app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({extended: true, limit: '50mb'}));
app.use(cors());

const current_version = "001"; // Current eTQF version. Must match the current_version on client side
const verified_email_sender = 'ignasi.rib@mfu.ac.th'; // Email of sendgrid email sender - must be verified and authorized
const authorizedToUpdate = ["59211131", "58310076", "63410003"];    // IDs of staff members authorized to upload Excel spreadsheets with staff and courses data to update the json files on the server

/// Utility

Object.defineProperty(Array.prototype, 'flat', {
  value: function(depth = 1) {
    return this.reduce(function (flat, toFlatten) {
      return flat.concat((Array.isArray(toFlatten) && (depth>1)) ? toFlatten.flat(depth-1) : toFlatten);
    }, []);
  }
});

// EMAIL FUNCTIONS

function sendMail(req, res) {
  try {
    const sgMail = require('@sendgrid/mail');
    console.log('Sending email with key');
    console.log(process.env.SG_MAIL_APIKEY);
    sgMail.setApiKey(process.env.SG_MAIL_APIKEY);
    var data = req.body;
    const msg = {
      to: data.to, // Change to your recipient
      from: verified_email_sender, // Change to verified sender
      subject: data.subject,
      text: data.text,
      html: data.html,
    }
    sgMail
      .send(msg)
      .then(() => {
        res.send(true);
    })
    .catch((error) => {
      res.send(false);
    });
  } catch(e) {
    console.log(e);
    res.send(false);
  }
}

//// POSTGRES HEROKU functions for SUBMISSIONS table

const getSubmissions = (request, response) => {
  try {
    const { program, year, semester } = request.query;
    if (program === undefined || year === undefined || semester === undefined) throw 'No data';
    pool.query('SELECT * FROM submissions WHERE program=$1 AND year=$2 AND semester=$3', 
      [program, year, semester],
      (error, results) => {
        try {
          if (error) throw error;
          response.status(200).json(results.rows);
        } catch(err) {
          console.log(err);
          response.status(500).json({ message: err });
        }
    });
  } catch(err) {
    console.log(err);
    response.status(500).json({ message: err });
  }
}

const addSubmission = (request, response) => {
  try {
    const { data, submitted_by, timestamp } = request.body;
    var jsonData = JSON.parse(data);
    var id = jsonData.general.program_code + jsonData.course + jsonData.year + jsonData.semester + jsonData.form;
    var coordinators = [];
    for (var i=0;i<jsonData.coordinators.length;i++) coordinators.push(jsonData.coordinators[i].id);
    if (!coordinators.includes(submitted_by)) throw 'Unable to submit';
    pool.query(
      'INSERT INTO submissions (id, timestamp, submitted_by, data, program, year, semester, form) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO UPDATE SET timestamp=$2, submitted_by=$3, data=$4, program=$5, year=$6, semester=$7, form=$8;',
      [id, timestamp, submitted_by, data, jsonData.general.program_code, jsonData.year, jsonData.semester, jsonData.form],
      (error) => {
        try {
          if (error) throw error
          pool.query('SELECT * FROM submissions WHERE id=$1', 
            [id],
            (err, results) => {
            try {
              if (err) throw err;
              if (results.rows.length == 0 || results.rows[0].timestamp != timestamp ) throw 'Failure';
              response.status(200).json({message: 'submission added'}); 
            } catch(e) {
              console.log(e);
              response.status(500).json({ message: 'submission failed' });
            }
          });  
        } catch(e) {
          console.log(e);
          response.status(500).json({ message: 'submission failed' })      
        }
      },
    );
  } catch(e) {
    console.log(e);
    response.status(500).json({ message: 'submission failed' })
  }
}

/// API ENDPOINT TO DOWNLOAD FORMATTED TQF3

const downloadTQF3 = (request, response) => {
  var id = null;
  try {
    var q = Object.keys(request.query)[0]; 
    id = q + "TQF3";
  } catch(e) {
    id = null;
  }
  if (id === undefined || id == null || id.length != 25 ) {
    response.redirect('/404');
  } else {
    pool.query('SELECT * FROM submissions WHERE id=$1', [id],
      (error, results) => {
      try {
        if (error) throw error;
        var jsonData = {};
        if (results.rows !== undefined && results.rows.length > 0) {
          jsonData = JSON.parse(results.rows[0].data);
          jsonData = preprint_process(jsonData);
          var output = generateTQF3(jsonData);
          var filename = jsonData.course + "_" + jsonData.general.title_en +  "_" + jsonData.year + "_" + jsonData.semester + ".docx";
          response.download(output, filename, function(err){
            if (err) response.redirect('/404');
          });
        } else {
          response.redirect('/404');
        }
      } catch(e) {
        console.log(e);
        response.redirect('/404');
      }
    });
  }
}

/// Generate TQF3 with docxtemplater

function generateTQF3(jsonData) {
  // Load the docx file as binary content
  if (jsonData.version === undefined) jsonData.version = current_version;
  var content = fs.readFileSync(path.resolve(__dirname, 'versions/'+jsonData.version+'/tqf3-template-v.'+jsonData.version+'.docx'), 'binary');

  var zip = new PizZip(content);
  var doc;
  try {
    doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  } catch(error) { // Catch compilation errors (errors caused by the compilation of the template: misplaced tags)
    throw error;
  }

  //set the templateVariables
  doc.setData(jsonData);

  try { // render the document (replace all occurences of {first_name} by John, {last_name} by Doe, ...)
    doc.render()
  } catch (error) { 
    throw error;
  }
  var out = doc.getZip().generate({type: 'nodebuffer'});
  // out is a nodejs buffer, you can either write it to a file or do anything else with it.
  var filename = jsonData.course + "_" + jsonData.title_en +  "_" + jsonData.year + "_" + jsonData.semester + ".docx";
  var filepath = path.resolve(__dirname, filename);
  fs.writeFileSync(filepath, out);
  return filepath;
}

function preprint_process(tqf) {


  /// Section 2
  var weeks;
  if (tqf.weeks !== undefined) {
    weeks = tqf.weeks.length;
  } else if (tqf.weeksTotal !== undefined) {
    weeks = tqf.weeksTotal;  
  } else {
    weeks = 15;
  }
  
  tqf.general.credits_class_total = (parseInt(tqf.general.credits_class) * weeks).toString();
  tqf.general.credits_lab_total = (parseInt(tqf.general.credits_lab) * weeks).toString();
  tqf.general.credits_home_total = (parseInt(tqf.general.credits_home) * weeks).toString();


  // has object
  tqf.has.prerequisite = tqf.general !== undefined && tqf.general.prerequisites.length > 0;
  tqf.has.corequisite = tqf.general !== undefined && tqf.general.corequisites.length > 0;
  tqf.has.task = tqf.tasks.length > 0 && tqf.tasks[0]['method'].length > 0;
  tqf.has.coordinator = tqf.coordinators.length > 0 && tqf.coordinators[0].id !== undefined && tqf.coordinators[0].id.length > 0;
  tqf.has.instructor = tqf.instructors.length > 0  && tqf.instructors[0].id !== undefined && tqf.instructors[0].id.length > 0;
  tqf.has.team = (tqf.coordinators.length > 0 && tqf.coordinators[0].id !== undefined && tqf.coordinators[0].id.length > 0) || (tqf.instructors.length > 0  && tqf.instructors[0].id !== undefined && tqf.instructors[0].id.length > 0);


  if (tqf.form == "TQF3") {
    /// Section 3 : learning outcomes
    Object.keys(tqf.outcomes).forEach( k => { tqf.outcomes[k]['assessment'] = [] });
    tqf.tasks.map(task => { task.outcomes.forEach(out => { tqf.outcomes[out]['assessment'].push(task.method + " (" + task.ratio + "%)" )  })  });

    // has object
    tqf.has.objective = tqf.objectives.length > 0 && tqf.objectives[0].length > 0;
    tqf.has.week = tqf.weeks.length > 0 && tqf.weeks[0]['topic'].length > 0;
    tqf.has.textbook = tqf.resources.textbooks.length > 0 && tqf.resources.textbooks[0].length > 0;
    tqf.has.reference = tqf.resources.references.length > 0 && tqf.resources.references[0].length > 0;
    tqf.has.other = tqf.resources.others.length > 0 && tqf.resources.others[0].length > 0;
    tqf.has.grade = tqf.grading.system.length > 0 && tqf.grading.system != 'None';

  } else if (tqf.form == "TQF5") {
    // has object
    tqf.has.task = tqf.tasks.length > 0;
    tqf.has.sects = (tqf.sections.length > 0) && (parseInt(tqf.total.sections) > 0);
    tqf.has.grade = tqf.grading.system.length > 0 && tqf.grading.system != 'None';
    tqf.has.eval = tqf.evaluation.type.length > 0;
    if (tqf.has.eval) tqf.evaluation.label = evaluations["001"][tqf.evaluation.type]["label"];
    tqf.has.survey_total = tqf.evaluation.survey.total !== undefined && tqf.evaluation.survey.total.responses !== undefined && parseInt(tqf.evaluation.survey.total.responses) > 0;
    tqf.has.survey_questions = tqf.evaluation.survey.questions !== undefined && tqf.evaluation.survey.questions.length > 0; 
    tqf.has.feed = tqf.evaluation.feedback !== undefined && tqf.evaluation.feedback.length > 0;
    tqf.has.repl = tqf.evaluation.reply !== undefined && tqf.evaluation.reply.length > 0;
    tqf.has.preplan = tqf.plan.previous !== undefined && tqf.plan.previous.length > 0 && tqf.plan.previous[0].action !== undefined && tqf.plan.previous[0].action.length > 0;
    tqf.has.curplan = tqf.plan.current !== undefined && tqf.plan.current.length > 0 && tqf.plan.current[0].action !== undefined && tqf.plan.current[0].action.length > 0;
    tqf.has.futplan = tqf.plan.future !== undefined && tqf.plan.future.length > 0 && tqf.plan.future[0].action !== undefined && tqf.plan.future[0].action.length > 0;
  }

  // Outcomes
  var curriculum = programs[tqf.general.program_code]['curriculum'];
  tqf.outcomes_print = [];
  var obj;
  Object.keys(curriculum).forEach( (k, index) => {
    obj = {
      "title": k + ". " + curriculum[k]["domain"],
      "outcomes": []
    }
    Object.keys(curriculum[k]['outcomes']).forEach((out, i) => {
      if (tqf.outcomes[out]["dot"] != 'x') {
        obj['outcomes'].push(Object.assign(tqf.outcomes[out], {'number' : out}));
        obj['outcomes'][obj['outcomes'].length - 1]['student'] = "Students will be able to " + obj['outcomes'][obj['outcomes'].length - 1]['student'];
        obj['outcomes'][obj['outcomes'].length - 1]['teaching'] = "Instructors will " + obj['outcomes'][obj['outcomes'].length - 1]['teaching'];        
        if (tqf.form == "TQF3") {
          obj['outcomes'][obj['outcomes'].length - 1]['assessment'] = obj['outcomes'][obj['outcomes'].length - 1]['assessment'].join(", ") + ".";
        }
      }
    });
    tqf.outcomes_print[index] = JSON.parse(JSON.stringify(obj));
  });

  return tqf;
}


/// ENDPOINT TO GET DATA ON COURSES AND STAFF STORED IN LOCAL JSON FILES

const getData = (request, response) => {
  const { type } = request.query;
  pool.query('SELECT * FROM data WHERE type=$1;', [type],
    (err, stored) => {
    try {
      if (err) throw err;
      if (stored.rows.length == 0) throw 'No data';
      if (stored.rows[0].json === undefined || stored.rows[0].json.length == 0) throw 'No data';
      var data = stored.rows[0].json;
      var jsonData = JSON.parse(data);
      if (type == 'courses') {
        response.status(200).json(jsonData);
      } else {
        pool.query('SELECT * FROM pubkeys', [],
        (error, results) => {
          try {
            if (error) throw error;
            var objIndex;
            for (var i=0;i<jsonData.length;i++) {
              if (results.rows.length == 0) {
                jsonData[i]['pubkey'] = "";
              } else {
                objIndex = results.rows.findIndex((obj => obj.id == jsonData[i]['id'] ));
                if (objIndex === undefined || objIndex == -1) {
                  jsonData[i]['pubkey'] = "";
                } else {
                  jsonData[i]['pubkey'] = results.rows[objIndex]['pubkey'];
                }
              }
            }
            response.status(200).json(jsonData);
          } catch(e) {
            console.log("Failed reading database");
            console.log(e);
            response.status(500).json({message: e});
          }
        });    
      }
    } catch (error) {
      console.log(error);
      response.status(500).json({message: error});
    }
  });
}

/// ENDPOINT TO UPDATE DATA ON COURSES AND STAFF STORED IN JSON FILES, including fixing and validating the data uploaded

function fixData(jsonData, type) {
  const exclude = ['of', 'the', 'a', 'in', 'at', 'and', 'but', 'for', 'by', 'with', 'to', 'from', 'an'];
  jsonData.forEach(item => {
    Object.keys(item).forEach(key => {
      if (typeof item[key] !== 'string') item[key] = item[key].toString();
      item[key] = item[key].trim();
    });               
    if (type == "staff") {
      if (item['email'] !== undefined) item['email'] = item['email'].toLowerCase();
      if (item['name'] !== undefined) {
        item["name"] = item["name"].replace(/\s*([,.!?:;]+)(?!\s*$)\s*/g, '$1 ').replace(/  +/g, ' ');
        item["name"] = item["name"].toLowerCase().split(' ').map(word => exclude.includes(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)).join(' ').replace(/  +/g, ' ').trim();
      }
    } else {
      if (item['title_en'] !== undefined) item['title_en'] = item['title_en'].toLowerCase().split(' ').map(word => exclude.includes(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)).join(' ').replace(/  +/g, ' ').trim();
      if (item['program_title_en'] !== undefined) item['program_title_en'] = item['program_title_en'].toLowerCase().split(' ').map(word => exclude.includes(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)).join(' ').replace(/  +/g, ' ').trim();
      if (item['outcomes_map'] !== undefined) item['outcomes_map'] = item['outcomes_map'].split('').map( dot => { return dot.toLowerCase().trim() }).join('').trim('');
      if (item['equivalents_1'] === undefined || item['equivalents_1'].length == 0) item['equivalents_1'] = "[]";
      if (item['equivalents_2'] === undefined || item['equivalents_2'].length == 0) item['equivalents_2'] = "[]";   
      if (item['prerequisites'] === undefined || item['prerequisites'].length == 0) item['prerequisites'] = "[]";    
      if (item['corequisites'] === undefined || item['corequisites'].length == 0) item['corequisites'] = "[]";

      /// TEMP
      if (item['outcomes_map'] === undefined || item['outcomes_map'].length == 0) item['outcomes_map'] = "ooooooooooooooooo"; 

      try {
        var co = JSON.parse(item['corequisites']);
        var pre = JSON.parse(item['prerequisites']);
        item['corequisites'] = JSON.stringify(co.map(el => { return el.trim() }));
        item['prerequisites'] = JSON.stringify(pre.map(el => { return el.trim() }));
      } catch(e) {
        // do nothing
      }
    }
  });

  return jsonData;
}

function validateData(jsonData, type) {
  const course_length = 7;
  const program_length = 9;
  const dots_number = 17;
  const min_credits = 0;
  const max_credits = 99;
  var errors = {};
  const email_re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  const number_re = /^[0-9]{1,45}$/;
  var pre = [];
  var co = [];
  var dots = [];
  jsonData.forEach(item => {             
    if (type == "staff") {
      if (!email_re.test(String(item['email']))) errors['email'] = 'Some emails are not correct'; // Not checking  || (item['email'].slice(-10) != '@mfu.ac.th')
      if (item['id'] === undefined || item['id'].length != 8 || !number_re.test(item['id'])) errors['id'] = 'Some ids are not correct';
      if (item['name'] === undefined || item['name'].length == 0 || item['name'] == null) errors['name'] = 'Some names are missing or incomplete';
      var title = item['name'].substr(0,2);
      if (title != 'Aj' && title != 'Dr' && title != 'Mr' && title != 'Ms' && title != 'As' && title != 'Pr') errors['name'] = 'Some names begin with an incorrect title';
    } else if (type == 'courses') {
      if (item['course'] === undefined || item['course'].length != course_length || !number_re.test(item['course'])) errors['course'] = 'Some course codes are missing or incorrect';
      if (item['title_en'] === undefined || item['title_en'].length == 0) errors['title_en'] = 'Some titles in English are empty';
      if (item['title_th'] === undefined || item['title_th'].length == 0) errors['title_th'] = 'Some titles in Thai are empty';
      if (item['description_en'] === undefined || item['description_en'].length == 0) errors['description_en'] = 'Some descriptions in English are empty';
      if (item['description_th'] === undefined || item['description_th'].length == 0) errors['description_th'] = 'Some descriptions in Thai are empty';
      if (item['credits_class'] === undefined || parseInt(item['credits_class']) < min_credits || parseInt(item['credits_class']) > max_credits || !number_re.test(item['credits_class'])) errors['credits_class'] = 'Some credits_class are not correct';
      if (item['credits_lab'] === undefined || parseInt(item['credits_lab']) < min_credits || parseInt(item['credits_lab']) > max_credits || !number_re.test(item['credits_lab'])) errors['credits_lab'] = 'Some credits_lab are not correct';
      if (item['credits_home'] === undefined || parseInt(item['credits_home']) < min_credits || parseInt(item['credits_home']) > max_credits || !number_re.test(item['credits_home'])) errors['credits_home'] = 'Some credits_home are not correct';
      if (item['program_code'] === undefined || item['program_code'].length != program_length || !number_re.test(item['program_code'])) errors['program_code'] = 'Some program codes are not correct';
      if (item['program_title_en'] === undefined || item['program_title_en'].length == 0) errors['program_title_en'] = 'Some program titles in English are empty';
      //TEMP disabled// if (item['program_title_th'] === undefined || item['program_title_th'].length == 0) errors['program_title_th'] = 'Some program titles in Thai are empty';   
      if (item['type'] === undefined || item['type'].length == 0) errors['type'] = 'Some course types are empty';
      
      /// These are problematic
      if (item['prerequisites'] === undefined) {
        errors['missing_pre'] = 'Missing prerequisites in some entries';
      } else {
        pre = JSON.parse(item['prerequisites']);
        if (typeof pre !== 'object') errors['prerequisites_array'] = 'Prerequisite arrays are not correct in some entries';
        for (var i=0; i<pre.length; i++) {
          if (pre[i].length != course_length || !number_re.test(pre[i])) errors['prerequisites'] = 'Some prerequisites are not correct';
        } 
      }
      
      if (item['corequisites'] === undefined) {
        errors['missing_co'] = 'Missing corequisites in some entries';
      } else {
        co = JSON.parse(item['corequisites']);
        if (typeof co !== 'object') errors['corequisites_array'] = 'Corequisites arrays not correct in some entries'; 
        for (var i=0; i<co.length; i++) {
          if (co[i].length != course_length || !number_re.test(co[i])) errors['corequisites'] = 'Some corequisites are not correct';
        } 
      }
      if (item['outcomes_map'] === undefined || item['outcomes_map'].length == 0) {
        errors['missing_outs'] = 'Missing outcomes_map in some entries';
      } else {
        try {
          dots = item['outcomes_map'].split('');
          if (dots.length != dots_number) errors['dots_array'] = 'Some outcomes_map entries do not have the right amount of items or are not well formed'; 
          for (var i=0; i<dots.length; i++) {
            if (!["x", "*", "o"].includes(dots[i])) errors['outcomes_map'] = 'Some outcomes_map entries are not correct (accepted: x / * / o)';
          }
        } catch(e) {
          errors['outcomes_map'] = 'Some outcomes_map entries are not well formed';
        } 
      }

    }
  });
  return errors;
}

const updateData = (request, response) => {
  try {
    const { data, type, submitted_by, pubkey, timestamp } = request.body;
    var jsonData = JSON.parse(data);
    var objIndex;
    var errors = [];

    if (!authorizedToUpdate.includes(submitted_by)) {
      errors.push("Update by a non-authorized user");
      throw 'Not authorized';
    }

    if (type != 'courses' && type != 'staff') {
      errors.push("Type of data to update is undetermined");
      throw 'Wrong type';
    }

    if ((type == 'courses' && jsonData[0]['id'] !== undefined) || (type == 'staff' && jsonData[0]['course'] !== undefined)) {
      errors.push("Trying to update the wrong kind of file");
      throw 'Wrong file';
    }

    pool.query('SELECT * FROM pubkeys WHERE id=$1;', [submitted_by],
      (error, results) => {
        try {
          if (error) {
            errors = ['Database failure'];
            throw error;
          }

          // Authorization
          if (results.rows.length == 0) {
            errors = ['Data submitted by someone without a registered public key in the system'];
            throw errors[0];
          }
          var found = results.rows[0];
          if (found.pubkey === undefined || found.pubkey != pubkey ) {
            errors = ['Wrong authentification'];
            throw errors[0];
          }

          jsonData = fixData(jsonData, type);
          var validationErrors = validateData(jsonData, type);
          Object.keys(validationErrors).forEach( k => {
            errors.push(validationErrors[k]);
          });
          errors = errors.flat();

          if (errors.length != 0) throw 'validation errors';

          // Write data
          pool.query(
           'INSERT INTO data (type, json) VALUES ($1, $2) ON CONFLICT (type) DO UPDATE SET json=$2;',
            [type, JSON.stringify(jsonData)],
            (error) => {
              try {
                if (error) {
                  errors = ['Database failure'];
                  throw error;
                }
                pool.query('SELECT * FROM data WHERE type=$1;', [type],
                  (err, stored) => {
                  try {
                    if (err) {
                      errors = ['Database failure'];
                      throw err;
                    }
                    if (stored.rows.length == 0) throw 'Not inserted';
                    if (stored.rows[0].json != JSON.stringify(jsonData)) throw 'Not inserted';
                    response.status(200).json({ message: 'data updated' });
                  } catch (error2) {
                    console.log(error2);
                    response.status(500).json({message: 'data not updated', errors: errors });
                  }
                });
              } catch(e) {
                response.status(500).json({message: 'data not updated', errors: errors });
              }
          });
        } catch(e) {
          console.log(e);
          response.status(500).json({ message: e, errors: errors })        
        }
    });

  } catch(e) {
    console.log(e);
    response.status(500).json({ message: e, errors: errors });
  }
}

/// ADD A USER'S PUBKEY IN POSTGRES HEROKU DATABASE, update if already exists
const registerPubkey = (request, response) => {
  try {
    const { id, pubkey } = request.body;
    console.log(id);
    if (id === undefined || pubkey === undefined) throw 'No data to add';
    console.log("Adding pubkey");
    pool.query(
      'INSERT INTO pubkeys (id, pubkey) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET pubkey=$2;',
      [id, pubkey],
      (error) => {
        try {
          if (error) throw error;
          pool.query('SELECT * FROM pubkeys WHERE id=$1;', [id],
            (err, results) => {
            try {
              if (err) throw err;
              if (results.rows.length == 0) throw 'Not inserted';
              if (results.rows[0].pubkey != pubkey) throw 'Not inserted';
              response.status(200).json({message: 'success'});
            } catch (error2) {
              console.log(error2);
              response.status(500).json({message: 'failure'});
            }
          });
        } catch(e) {
          console.log(e);
          response.status(500).json({message: 'failure'});
        }
      }
    )
  } catch(e) {
     console.log(e);
     response.status(500).json({message: 'failure'});
  }
}


/// Listeners ///

// Available REST routes
app.post('/send_mail', sendMail); // POST send mail using SendGrid in Heroku
app.get('/submissions', getSubmissions); // GET query Heroku database for submissions 
app.post('/submissions', addSubmission); // POST add submission to Heroku database, update if already exists
app.get('/download', downloadTQF3); // GET download a formatted TQF3 from Heroku database 
app.post('/update', updateData); // POST upload staff and course data from authorized client
app.get('/getdata', getData); // GET staff and course data to use in client
app.post('/register', registerPubkey); // POST register a public key generated by client password, store it in postgres table 'pubkeys'


// Render partials for forms
app.engine('html', require('ejs').renderFile);
router.get('/form',function(req,res){
  var { version, form } = req.query;
  res.render(path.join(__dirname+'/versions/'+version+'/'+form+'.html'), {layout: false});
});

// Home page
router.get('/',function(req,res){
  res.sendFile(path.join(__dirname+'/index.html'));
});

// 404 Error page
router.get('/404',function(req,res){
  res.sendFile(path.join(__dirname+'/404.html'));
});

// Bloom's Taxonomy accepted verbs
router.get('/bloom',function(req,res){
  res.sendFile(path.join(__dirname+'/bloom.html'));
});

// Update page
router.get('/update',function(req,res){
  res.sendFile(path.join(__dirname+'/update.html'));
});

// Add the router
app.use(express.static("."))
app.use('/', router);
app.set( 'port', ( process.env.PORT || 3000 ));

// Start node server
app.listen( app.get( 'port' ), function() {
  console.log( 'Node server is running on port ' + app.get( 'port' ));
});

// Requests for inexistent routes directed to 404 error page
app.get('*', function(req, res){
  res.status(404).sendFile(path.join(__dirname+'/404.html'));
});
