/* ETQF version functions
 * v. 001 
 * Includes:
 * - Setting of global objects for this version
 * - TQF3 and TQF5 prototypes with validations and helper functions
 * - TQFForms prototype with form control functions for version 001 and helper functions
 */

/* GLOBAL OBJECTS */
gradings["001"] = {
  "A-F": {
    "label": "Extended (A, B+, B, C+, C, D+, D, F)",
    "grades": [ "A", "B+", "B", "C+", "C", "D+", "D", "F"],
    "description_en": [ "Excellent", "Very good", "Good", "Fairly good", "Fair", "Poor", "Very poor", "Failed" ],
    "range": [ "84.50", "79.50", "74.50", "69.50", "64.50", "59.50", "54.50", "0.00" ],
    "nongrades": [ "W", "I", "M", "P" ],
    "nongrades_description_en": [ "Withdrawn", "Incomplete", "Missing", "In progress"]    
  },
  "S-U": {
    "label": "Satisfactory/Unsatisfactory (S/U) (with points)",
    "grades": [ "S", "U" ],
    "description_en": [ "Satisfactory", "Unsatisfactory" ],
    "range": [ "50.00", "0.00" ],
    "nongrades": [ "W", "I", "M", "P" ],
    "nongrades_description_en": [ "Withdrawn", "Incomplete", "Missing", "In progress"]    
  },
  "S/U": {
    "label": "Satisfactory/Unsatisfactory (S/U) (without points)",
    "grades": [ "S", "U" ],
    "description_en": [ "Satisfactory", "Unsatisfactory" ],
    "range": [],
    "nongrades": [ "W", "I", "M", "P" ],
    "nongrades_description_en": [ "Withdrawn", "Incomplete", "Missing", "In progress"]
  },
  "None": {
    "label": "No grade",
    "description_en": [],
    "grades": [],
    "range": [],
    "nongrades": [ "W", "I", "M", "P" ],
    "nongrades_description_en": [ "Withdrawn", "Incomplete", "Missing", "In progress"]
  }
}

evaluations["001"] = {
  "Complete student survey": {
  	"label": "Complete MFU student survey",
  	"questions": [
	    "1. Clear explanation of course objectives, scope, contents and evaluation methods",
	    "2. Instruction according to objectives, scope and contents", 
	    "3. Appropriate evaluation methods",
	    "4. Instruction techniques for better understanding",
	    "5. Dedication and determination",
	    "6. Motivation of self study and guidance and recommendation of resources",
	    "7. Motivation of thought process, problem presentation, analysis and synthesis",
	    "8. Opportunities for students to share opinions and participate in class lecture",
	    "9. Counselling platforms for students after school hours",
	    "10. Use of teaching aids to enhance understanding",
	    "11. Use of English as medium of instruction",
	    "12. Using appropriate online teaching technology",
	    "13. Integration of ethics and social responsibility",
	    "14. Personality and well-dressedness"
  	]
  },
  "Summary of student survey": {
  	"label": "Summary of MFU student survey"
  },
  "None": {
  	"label":"No evaluation / Only qualitative feedback"
  }
}


/* PROTOTYPES */
// Includes constructors and validators for both TQF3 and TQF5

TQF3.prototype["001"] = function (data) {

  this.version = "001";
  this.course = data.course.toString();
  this.year = data.year !== undefined ? data.year : "";
  this.semester = data.semester !== undefined ? data.semester : "";
  this.general = data.general !== undefined ? data.general : setGeneralTQF3(this.course);
  this.venue = data.venue !== undefined ? data.venue : "";

  // [{"id": "","name": ""}]
  this.coordinators = data.coordinators !== undefined ? data.coordinators : [];

  // [{"id": "","name": ""}]
  this.instructors = data.instructors !== undefined ? data.instructors : [];
  this.objectives =  data.objectives !== undefined ? data.objectives : [];
  this.outcomes = data.outcomes !== undefined ? data.outcomes : setOutcomesTQF3(this.general);
  this.grading = (data.grading !== undefined && data.grading.system !== undefined) ? data.grading : {
    "system": "None",
    "range": gradings[this.version]["None"]["range"],
    "grades": gradings[this.version]["None"]["grades"],
    "nongrades": gradings[this.version]["None"]["nongrades"]
  };

  // [{ "order": "1","topic": "","contents": "","activities": "","materials": ""}]
  this.weeks = data.weeks !== undefined ? data.weeks : [];

  // [{ "order": "1", "method": "","week": "", "ratio": "", "details": "", "outcomes": [],  "group": false  }]
  this.tasks = data.tasks !== undefined ? data.tasks : []; 
  this.resources = {
    "textbooks": (data.resources !== undefined && data.resources.textbooks !== undefined ) ? data.resources.textbooks : "",
    "references": (data.resources !== undefined && data.resources.references !== undefined ) ? data.resources.references : "",
    "others": (data.resources !== undefined && data.resources.others !== undefined ) ? data.resources.others : ""
  };

  // [{"id": "", "name": "", "pubkey": "", "date": "", "hash": ""}] 
  this.signatures = data.signatures !== undefined ? data.signatures : []; 

  this.validation = (data.validation !== undefined) ? data.validation : {
    "date":"",
    "code": ""
  }

  this.has = {};
  this.has.validated = this.isValid();
  this.has.signature = this.isSigned();
  return this;

}

// Internal functions

function setGeneralTQF3(course_code) {
	var general = jsonCourses[course_code];
	if (general === undefined) throw 'Error';

	// Prerequisites
	Object.keys(general).forEach(key => {
		if (typeof general[key] == 'number') general[key] = general[key].toString();
	});
	var pc;
	for (var i=0; i<general.prerequisites.length;i++) {
  	pc = jsonCourses[general.prerequisites[i]];
  	if (pc !== undefined) general.prerequisites[i] = pc.course + " " + pc.title_en + " / " + pc.title_th;
	}
	// Corequisites
	for (var i=0; i<general.corequisites.length;i++) {
  	pc = jsonCourses[general.corequisites[i]];
  	if (pc !== undefined) general.corequisites[i] = pc.course + " " + pc.title_en + " / " + pc.title_th;
	}
	return general;
}

function setOutcomesTQF3(general) {

	if (general === undefined) throw 'Error';
	var outcomes =  {};
	var obj = programs[general.program_code]['curriculum'];
	var dots = general.outcomes_map.split('');

	Object.keys(obj).forEach((domain, i) => {
  	Object.keys(obj[domain]["outcomes"]).forEach(outcome => {
    	outcomes[outcome] = {
      	"dot": dots[i],
      	"student": "",
      	"teaching": ""
    	}
  	});
	});
	return outcomes;
}


// Validation //
TQF3.prototype["001"].validate = function(tqf) {
  try {
    var errors = {};

    /* Fix radio output for groups to ensure true/false values */
    for (var i=0; i<tqf.tasks.length; i++) tqf.tasks[i].group = tqf.tasks[i].group !== undefined; 
    
    if (tqf.version !== "001" || tqf.form !== "TQF3") throw 'Incomplete form';

    /// Errors due to user data
    let findDuplicates = arr => arr.filter((item, index) => arr.indexOf(item) != index);

    // Server errors
    if (tqf.general.title_en===undefined || tqf.general.title_en.length == 0 || tqf.general.title_th == undefined || tqf.general.title_th.length == 0)
      errors['title'] ="Missing or incomplete course title in Thai and/or English";
    if (tqf.general.description_en===undefined || tqf.general.description_en.length == 0 || tqf.general.description_th == undefined || tqf.general.description_th.length == 0)
      errors['description'] ="Missing or incomplete course description in Thai and/or English";
    if (tqf.general.program_code===undefined || tqf.general.program_code.length == 0)
      errors['program'] ="Missing program";
    if (tqf.general.type===undefined || tqf.general.type.length == 0)
      errors['type'] ="Missing course type";
    if (tqf.version === undefined || tqf.form === undefined)
      errors['type'] ="Missing form and version";

    // Section 1
    if (tqf.year===undefined || tqf.year.length == 0 || (new Date(tqf.year) === "Invalid Date") || (isNaN(new Date(tqf.year)))) 
      errors['year'] ="Wrong or missing year in section 1";
    if (tqf.semester===undefined || tqf.semester.length==0 || !(Object.keys(semesters).includes(tqf.semester)))
      errors['semester'] ="Wrong or missing semester in section 1"; 
    if (tqf.venue===undefined || tqf.venue.length == 0) 
      errors['venue'] ="Missing venue in section 1";
    if (tqf.coordinators===undefined || tqf.coordinators.length == 0 || tqf.coordinators == "Undetermined")  
      errors['coordinators'] ="Missing coordinators in section 1";
    if (tqf.instructors===undefined || tqf.instructors.length == 0)  
      errors['instructors'] ="Missing instructors in section 1";
    var coords = [];
    var instr = [];
    for (var i=0;i<tqf.coordinators.length;i++) {
      if (tqf.coordinators[i].name===undefined || tqf.coordinators[i].name.length == 0 || tqf.coordinators[i].id === undefined || tqf.coordinators[i].id.length == 0 ) errors['coordinators'] ="Missing coordinators in section 1";
      if (tqf.coordinators[i].id !== undefined) coords.push(tqf.coordinators[i].id);
    }
    for (var i=0;i<tqf.instructors.length;i++) {
      if (tqf.instructors[i].name===undefined || tqf.instructors[i].name.length == 0 || tqf.instructors[i].id === undefined || tqf.instructors[i].id.length == 0 ) errors['instructors'] ="Missing instructors in section 1";
      if (tqf.instructors[i].id !== undefined) instr.push(tqf.instructors[i].id);
    }
    if (findDuplicates(coords).length > 0) errors["duplicate_coordinators"] = "Some coordinators are duplicated in section 1.";
    if (findDuplicates(instr).length > 0) errors["duplicate_instructors"] = "Some instructors are duplicated in section 1.";

    // Section 2
    var objs = [];
    if (tqf.objectives===undefined || tqf.objectives.length == 0 || (tqf.objectives.length == 1 && tqf.objectives[0].length == 0)) {
      errors['objectives'] ="Missing objectives in section 2";
    } else {
      var missing_objectives = false;
      var wrong_objectives = false;
      var short_objectives = false;
      for (var i=0; i<tqf.objectives.length; i++) {
        if (tqf.objectives[i] !== undefined && tqf.objectives[i].length > 0) objs.push(tqf.objectives[i]);
        if (tqf.objectives[i].substring(0, 10) == "The course" || tqf.objectives[i].substring(0, 10) == "the course")
          errors['objectives_phrasing'] = "Objectives in section 2 should not begin with the phrase 'The course aims to', but complete this phrase beginning with an action verb in lowercase";
        if (tqf.objectives[i].length == 0) {
          missing_objectives = true;
        } else if (tqf.objectives[i].match(/^[a-zA-Z]/) === null) { // string doesn't begin with letter
          wrong_objectives = true;
        }
        tqf.objectives[i] = tqf.objectives[i].charAt(0).toLowerCase() + tqf.objectives[i].slice(1).trim(); // trim empty spaces
        if (tqf.objectives[i].match(/[?.,:;@#$%^&*!]$/) !== null) tqf.objectives[i] = tqf.objectives[i].replace(/[?.,:;@#$%^&*!]$/, ""); // remove punctuation at the end
        if (tqf.objectives[i].split(/[\ ,;:]+/) < 6) short_objectives = true;
      }
      if (missing_objectives) errors['missing_objectives'] = "Some objectives in section 2 are missing";
      if (wrong_objectives) errors['wrong_objectives'] = "Some objectives in section 2 are not written correctly";
      if (!missing_objectives && short_objectives) errors['short_objectives'] = "Some objectives in section 2 are too short";
    } 

    if (findDuplicates(objs).length > 0) errors["duplicate_objectives"] = "Some objectives are duplicated in section 2.";

    // Section 3
    var wrong_student = [];
    var wrong_teaching = [];
    var out = Object.entries(tqf.outcomes);
    var dots = tqf.general.outcomes_map.split('');
    for (var i=0;i<out.length;i++) {
      if (dots[i] != 'x') {
        if (out[i][1].student === undefined || out[i][1].student.length == 0 || out[i][1].student.substr(0, 7).toLowerCase() == "student" || out[i][1].student.substr(0, 2).toLowerCase() == "to" ) wrong_student.push(out[i][0]); // 
        if (out[i][1].teaching === undefined || out[i][1].teaching.length == 0 || out[i][1].teaching.substr(0, 10).toLowerCase() == "instructor" || out[i][1].teaching.substr(0, 4).toLowerCase() == "will") wrong_teaching.push(out[i][0]);  
        // Corrections with regex
        //out[i][1].student = out[i][1].student.charAt(0).toUpperCase() + out[i][1].student.slice(1).trim(); // trim empty spaces
        out[i][1].student = out[i][1].student.trim();
        if (out[i][1].student.match(/[.]$/) === null) out[i][1].student = out[i][1].student + "."; // add punctuation

        //out[i][1].teaching = out[i][1].teaching.charAt(0).toUpperCase() + out[i][1].teaching.slice(1).trim(); // trim empty spaces
        out[i][1].teaching = out[i][1].teaching.trim();
        if (out[i][1].teaching.match(/[.]$/) === null) out[i][1].teaching = out[i][1].teaching + "."; // add punctuation

      } else {
        out[i][1].student = "";
        out[i][1].teaching = "";
      }
    }

    if (wrong_student.length > 0) errors['outcomes_student'] ="Wrong or missing student learning outcomes ("+wrong_student.join(", ")+") in section 3 (they should COMPLETE, not contain the phrase 'Students will be able to')";
    if (wrong_teaching.length > 0) errors['outcomes_teaching'] ="Wrong or missing teaching methods ("+wrong_teaching.join(", ")+") in section 3 (they should COMPLETE, not contain the phrase 'Instructors will')";

    // Section 4
    if (tqf.weeks===undefined || tqf.weeks.length == 0 ||  (tqf.weeks.length == 1 && tqf.weeks[0].topic.length == 0)) { 
      errors['weeks'] = "Missing lesson plan in section 4";
    } else {
      var weeks = Object.entries(tqf.weeks);
      for (var i=0;i<weeks.length;i++) {
        if (weeks[i][1].topic === undefined || weeks[i][1].topic.length == 0) {
          errors['weeks'] = 'Incomplete lesson plan in section 4 (missing topics)';
          break;
        }
        if (weeks[i][1].contents === undefined || weeks[i][1].contents.length == 0) {
          errors['weeks'] = 'Incomplete lesson plan in section 4 (missing contents)';
          break;
        }
      }
    }
    
    // if (tqf.weeks.length<15) errors['weeks_length'] = "Lesson plan in section 4 does not cover the whole 15-week semester period"; // Should we add tqf?

    try {
      if (tqf.grading === undefined || tqf.grading.system === undefined || tqf.grading.system.length == 0) 
        throw "Missing grading system in section 4";
      if (tqf.grading.system == 'None') { 
        tqf.grading.grades = [];
        tqf.grading.nongrades = [];
      }
      if (tqf.grading.system == 'None' || tqf.grading.range[0] == "undefined") tqf.grading.range = [];
      if (tqf.grading.range.length > 0) { 
        if (tqf.grading.range.length != tqf.grading.grades.length) throw 'Missing values in the grading range of section 4';
        var num = [];
        for (var i=0; i<tqf.grading.range.length; i++) {
          num[i] = parseFloat(tqf.grading.range[i]);
          if (Number.isNaN(num[i])) throw 'Some grades in the grading range of section 4 are not numbers';
          if (num[i] > num[i-1]) throw 'The grades in the grading range of section 4 are not in order';
          if (num[i] == 0 && i<tqf.grading.range.length-1) throw 'Some intermediate grades in the grading range of section 4 have a value of 0'
          tqf.grading.range[i] = num[i].toFixed(2).toString();
        }
      }

      // Specific validations for Bachelor in English to enforce standard grading range throughout:
      if (tqf.general.program_code == "633100601") {
        if (tqf.grading.system !== "A-F") throw 'Grading system should be A-F (English major)';
        /*
        if ((tqf.grading.range.length !== gradings["001"]["A-F"]["range"].length) || (tqf.grading.range.every(function(value, index) { return value === gradings["001"]["A-F"]["range"][index]})))
          throw 'The values of the grading range should be standard (English major)';*/
      }
    } catch(e) {
      errors['grades'] = e;
    }

    var weeks_in_task = [];
    if (tqf.tasks===undefined || tqf.tasks.length == 0 || (tqf.tasks.length == 1 && tqf.tasks[0].method.length == 0)) {
      errors['tasks_plan'] = "Missing assessment plan in section 4";
    } else {
      var tasks = Object.entries(tqf.tasks);
      for (var i=0;i<tasks.length;i++) {
        if (tasks[i][1].method === undefined || tasks[i][1].method == null || tasks[i][1].method.length == 0) {
          errors['tasks_methods'] = 'Missing assessment methods in section 4';
        }
        if (tasks[i][1].week !== undefined) tasks[i][1].week = tasks[i][1].week.replace(', ', ',').trim();
        if (tasks[i][1].week === undefined || tasks[i][1].week == null || tasks[i][1].week.length == 0) {
          errors['tasks_weeks'] = 'Missing week information on assessment plan in section 4';
        } else if (tasks[i][1].week.toLowerCase().trim() == "midterm" || tasks[i][1].week.toLowerCase().trim() == "final") {
          tasks[i][1].week = tasks[i][1].week.charAt(0).toUpperCase() + tasks[i][1].week.slice(1).toLowerCase().trim(); 
        } else if (tasks[i][1].week.match(/^[1-9]/) === null || tasks[i][1].week.match(/^[1-9-,]*$/) === null ) {
          errors['tasks_weeks_characters'] = 'Task week information in section 4 is not correctly written (should be only numbers, dashes and commas, or the words "Final" or "Midterm")';
        } else {
          weeks_in_task = tasks[i][1].week.split(/[\-,]+/);
          for (var j=0; j<weeks_in_task.length; j++) {
            if (tqf.weeks !== undefined && weeks_in_task[j] > tqf.weeks.length) errors['tasks_weeks_number'] = 'Task week information in section 4 exceeds number of weeks in the lesson plan';
          }
          
        }
        if (tasks[i][1].ratio === undefined || tasks[i][1].ratio == null || tasks[i][1].ratio.length == 0) {
          errors['tasks_ratios'] = 'Missing assessment ratios in section 4';
        }
      }

      var ratioTotal = 0;
      for (var i=0;i<tasks.length;i++) ratioTotal += parseInt(tasks[i][1].ratio);
      if (ratioTotal != 100) errors['tasks_ratios_sum'] = 'Ratios of assessment plan in section 4 do not add up to 100%';


      var outcomesTotal = [];
      for (var i=0;i<tasks.length;i++) outcomesTotal.push(tasks[i][1].outcomes);
      try {
        var flatOutcomes = [...new Set(outcomesTotal.concat.apply([], outcomesTotal).map(JSON.stringify))].map(JSON.parse).sort();
      } catch(err) {
        flatOutcomes = [];
      }
      var expectedOutcomes = [];

      var totalOuts = Object.keys(tqf.outcomes);
      var dots = tqf.general.outcomes_map.split('');
      for (var i=0; i<totalOuts.length;i++) {
        if (dots[i] != 'x') expectedOutcomes.push(totalOuts[i]);
      }
      expectedOutcomes.sort();
      var absent = expectedOutcomes.filter(e=>!flatOutcomes.includes(e));
      if (absent.length>0) errors['outcomes_tasks'] = 'Some learning outcomes ('+absent.join(", ")+') have not been included in the assessment tasks in section 4';

    }

    // Section 5
    var refs = [];
    Object.keys(tqf.resources).forEach( key => {
      Object.values(tqf.resources[key]).forEach( (item, i) => {
        if (i > 0 && (item === undefined || item.length == 0)) errors["empty_"+key] = "Some "+key+" in section 5 are empty.";
        if (i == 0 && tqf.resources[key].length > 1 && (item === undefined || item.length == 0)) errors["empty_"+key] = "Some "+key+" in section 5 are empty.";
        if (item !== undefined && item.length > 0) refs.push(item);
      });
    });
    if (findDuplicates(refs).length > 0) errors["duplicate_resources"] = "Some resources (textbooks, references or other) are duplicated in section 5.";

    // End

    if (Object.keys(errors).length === 0) {
      tqf.has.validated = true;
      if (tqf.validation.errors !== undefined) delete tqf.validation.errors;
      tqf.validation.code = tqf.getValidationCode();
      tqf.validation.date = getTodayDate();
    } else {
      tqf.has.validated = false;
      tqf.validation.errors = errors;
    }
    return tqf.has.validated;

  } catch(e) {
    console.log(e);
    if (e !== undefined && typeof error !== 'string') e = "Failed validation";
    errors['caught'] = e;
    tqf.validation.errors = errors; 
    tqf.has.validated = false;
    return tqf.has.validated;
  }
}


/// TQF5

TQF5.prototype["001"] = function (tqf3, data) {

  this.version = "001";
 
  this.course = data.course !== undefined ? data.course.toString() : tqf3.course.toString();
  this.year = data.year !== undefined ? data.year : tqf3.year;
  this.semester = data.semester !== undefined ? data.semester : tqf3.semester;
  this.general = data.general !== undefined ? data.general : tqf3.general;
  this.venue = data.venue !== undefined ? data.venue : tqf3.venue;    
  this.coordinators = data.coordinators !== undefined ? data.coordinators : tqf3.coordinators;
  this.instructors = data.instructors !== undefined ? data.instructors : tqf3.instructors;
  this.outcomes = data.outcomes !== undefined ? data.outcomes : setOutcomesTQF5(tqf3);
  this.grading =  data.grading !== undefined ? data.grading : tqf3.grading;
  this.tasks = data.tasks !== undefined ? data.tasks : tqf3.tasks;
  this.weeksTotal = data.weeksTotal !== undefined ? data.weeksTotal : tqf3.weeks.length;

  this.tqf3 = {
    'code': (data.tqf3 !== undefined && data.tqf3.code !== undefined) ? data.tqf3.code : tqf3.validation.code,
    'date': (data.tqf3 !== undefined && data.tqf3.date !== undefined) ? data.tqf3.date : tqf3.validation.date
  }

  this.teaching = ( data.teaching !== undefined && data.teaching.facilities !== undefined && data.teaching.support !== undefined && data.teaching.others !== undefined ) 
    ? 
    data.teaching 
    : 
    {
      "facilities": "",
      "support": "",
      "others": ""
    }

  // [{"section": "", "grades": [],"nongrades": [], "enrolled": "", "retained": { "number": "", "percent": "" } }
  this.sections = (data.sections !== undefined && data.sections[0].section !== undefined && 
    data.sections[0].grades !== undefined && data.sections[0].nongrades !== undefined ) ? setSectionsTQF5(data.sections) : [];

  this.total = calculateTotal(this, data.total);

  this.evaluation = (data.evaluation !== undefined && data.evaluation.type !== undefined && data.evaluation.survey.total !== undefined && data.evaluation.survey.total.responses !== undefined 
    && data.evaluation.survey.total.responses !== undefined && data.evaluation.survey.total.mean !== undefined && data.evaluation.survey.total.stdev !== undefined 
    && data.evaluation.feedback !== undefined && data.evaluation.reply !== undefined )
    ? 
    data.evaluation 
    : 
    {
    "type": "None",
    "survey": {     
      // [{ "question": "", "mean": "", "stdev": "" }] 
      "questions": [],
      "total": {
        "responses": "",
        "mean": "",
        "stdev": ""
      }
    },
    "feedback": "",
    "reply": ""
  }

  // For each object: [{ "action": "", "result": ""  }]
  this.plan =  {
    "previous": (data.plan !== undefined && data.plan.previous !== undefined && data.plan.previous[0].action !== undefined && data.plan.previous[0].result !== undefined) ? data.plan.previous : [],
    "current": (data.plan !== undefined && data.plan.current !== undefined && data.plan.current[0].action !== undefined && data.plan.current[0].result !== undefined) ? data.plan.current : [],
    "future": (data.plan !== undefined && data.plan.future !== undefined && data.plan.future[0].action !== undefined && data.plan.future[0].result !== undefined) ? data.plan.future : []
  };

  // [{"id": "", "name": "", "pubkey": "", "date": "", "hash": ""}] 
  this.signatures = data.signatures !== undefined ? data.signatures : [];

  this.validation = (data.validation !== undefined) ? data.validation :{
    "date":"",
    "code": ""
  }

  this.has = {};

  this.has.validated = this.isValid();
  this.has.signature = this.isSigned();

  return this;
}

// Internal functions
function setOutcomesTQF5(tqf5) {
	var outcomes = JSON.parse(JSON.stringify(tqf5.outcomes));
	//delete outcomes.assessment;
	Object.keys(outcomes).forEach(outcome => {
	  outcomes[outcome]["achieved"] = "";
	  outcomes[outcome]["problems"] = "";
	});
	return outcomes;
}

function setSectionsTQF5(sections) {
	// Turn sections objects into arrays 
	if (typeof sections == 'object') {
	    var arraySections = [];
	    var arrayGrades = [];
	    var arrayNongrades = [];
	    Object.keys(sections).forEach( (key, i) => {
	      arraySections[i] = sections[key];
	      if (arraySections[i]['grades'] !== undefined) {
	        arrayGrades = [];
	        Object.keys(arraySections[i]['grades']).forEach( grade => {
	          if (!Number.isNaN(parseInt(arraySections[i]['grades'][grade]))) {
	            arrayGrades.push(arraySections[i]['grades'][grade]);
	          } else {
	            arrayGrades.push("0");
	          }
	        });
	        arraySections[i]['grades'] = arrayGrades;
	      }
	      if (arraySections[i]['nongrades'] !== undefined) {
	        arrayNongrades = [];
	        Object.keys(arraySections[i]['nongrades']).forEach( nongrade => {
	          if (!Number.isNaN(parseInt(arraySections[i]['nongrades'][nongrade]))) {
	            arrayNongrades.push(arraySections[i]['nongrades'][nongrade]);
	          } else {
	            arrayNongrades.push("0");
	          }
	        });
	        arraySections[i]['nongrades'] = arrayNongrades;
	      }
	    });
	    return arraySections;
	} else {
	  return sections;
	}
}

function calculateTotal(object, data) {
	var total = {
	  "sections": (object.sections !== undefined ) ? object.sections.length : 0,
	  "enrolled": 0,
	  "retained": {
	    "number": 0,
	    "percent": 0
	  },
	  "grades": {
	    "number": [],
	    "percent":[]  
	  },
	  "nongrades": {
	    "number": [],
	    "percent":[]        
	  },
	  "comments": (data === undefined || data.comments === undefined) ? "" : data.comments
	}

	for (var i=0; i<object.grading.grades.length; i++) total.grades.number[i] = 0;
	for (var i=0; i<object.grading.nongrades.length; i++) total.nongrades.number[i] = 0;  
	for (var i=0; i<object.grading.grades.length; i++) total.grades.percent[i] = 0;
	for (var i=0; i<object.grading.nongrades.length; i++) total.nongrades.percent[i] = 0;  

	if (total.sections > 0) {
	  var enrolled = 0;
	  var retained = 0;
	  var q = 0;
	  var nq = 0;
	  var j = 0;
	  for (var i=0; i<total.sections;i++) {
	    enrolled = 0;
	    retained = 0;

	    // Add total of different grades in each section
	    object.sections[i].grades.forEach((grade, j) => {
	      q = parseInt(grade);
	      if (!Number.isNaN(q)) {
	        enrolled += q;
	        retained += q;
	        total.grades.number[j] += q;
	      } else {
	        total.grades.number[j] += 0;
	      }
	    });

	    // Add total of different nongrades in each section
	    object.sections[i].nongrades.forEach((nongrade,j) => {
	      nq = parseInt(nongrade);
	      if (!Number.isNaN(nq)) {
	        enrolled += nq;
	        total.nongrades.number[j] += nq;
	      } else {
	        total.nongrades.number[j] += 0;
	      }
	    });

	    object.sections[i].enrolled = enrolled.toString();
	    if (object.sections[i].retained === undefined ) object.sections[i].retained = {};
	    object.sections[i].retained.percent = (100*retained/enrolled).toFixed(2).toString();
	    object.sections[i].retained.number = retained.toString();
	    
	    total.enrolled += enrolled;
	    total.retained.number += retained;
	  }

	  total.retained.percent = (100*parseInt(total.retained.number)/(parseInt(total.enrolled))).toFixed(2);
	  total.grades.number.forEach( (num, j) => {
	    total.grades.percent[j] = (100*(parseInt(num)/parseInt(total.enrolled))).toFixed(2);
	  });
	  total.nongrades.number.forEach( (num, j) => {
	    total.nongrades.percent[j] = (100*(parseInt(num)/parseInt(total.enrolled))).toFixed(2);
	  });
	}
	return {
	  "sections": total.sections.toString(),
	  "enrolled": total.enrolled.toString(),
	  "retained": {
	    "number": total.retained.number.toString(),
	    "percent": total.retained.percent.toString()
	  },
	  "grades": {
	    "number": total.grades.number.map(el => { return el.toString() }),
	    "percent":total.grades.percent.map(el => { return el.toString() })  
	  },
	  "nongrades": {
	    "number": total.nongrades.number.map(el => { return el.toString() }),
	    "percent":total.nongrades.percent.map(el => { return el.toString() })        
	  },
	  "comments": total.comments.length == 0 ? "" : total.comments
	}
}

// Validations //

TQF5.prototype["001"].validate = function(tqf) {

  try {
    /// Preprocess
    // Section 2
    // Fill empty fields with none
    Object.keys(tqf.teaching).forEach( k => {
      if (tqf.teaching[k] === undefined || tqf.teaching[k].length == 0) tqf.teaching[k] = "None";
    });

    Object.keys(tqf.outcomes).forEach( k => {
      if (tqf.outcomes[k]['problems'] === undefined || tqf.outcomes[k]['problems'].length == 0) tqf.outcomes[k]['problems'] = "None";
      if (tqf.outcomes[k]['achieved'] === undefined || tqf.outcomes[k]['achieved'].length == 0 || tqf.outcomes[k]['achieved'] == "false" || tqf.outcomes[k]['achieved'] === false) tqf.outcomes[k]['achieved'] = "No"; 
      if (tqf.outcomes[k]['dot'] === "x") {
        tqf.outcomes[k]['student'] = 'N/A';
        tqf.outcomes[k]['teaching'] = 'N/A';
        tqf.outcomes[k]['achieved'] = 'N/A';        
        tqf.outcomes[k]['problems'] = 'N/A';        
      }
    });

    // Section 3
    for (var j=0; j<tqf.tasks.length;j++) if (tqf.tasks[j]['verification'] === undefined || tqf.tasks[j]['verification'].length == 0) tqf.tasks[j]['verification'] = ""; 

    // Section 5
    // Fill empty fields with none
    for (var j=0; j<tqf.plan.previous.length; j++ ) {
      if (tqf.plan.previous[j].action.length == 0) tqf.plan.previous[j].action = "";
      if (tqf.plan.previous[j].result === undefined || tqf.plan.previous[j].result.length == 0) tqf.plan.previous[j].result = "";
    }
    for (var j=0; j<tqf.plan.current.length; j++ ) {
      if (tqf.plan.current[j].action.length == 0) tqf.plan.current[j].action = "";
      if (tqf.plan.current[j].result === undefined || tqf.plan.current[j].result.length == 0) tqf.plan.current[j].result = "";
    }
    for (var j=0; j<tqf.plan.future.length; j++ ) {
      if (tqf.plan.future[j].action.length == 0) tqf.plan.future[j].action = "";
      if (tqf.plan.future[j].result === undefined || tqf.plan.future[j].result.length == 0) tqf.plan.future[j].result = "";
    }

    /// Errors 
    var errors = {};

    // Server errors
    if (tqf.general.title_en===undefined || tqf.general.title_en.length == 0 || tqf.general.title_th == undefined || tqf.general.title_th.length == 0)
      errors['title'] ="Missing or incomplete course title in Thai and/or English";
    if (tqf.general.description_en===undefined || tqf.general.description_en.length == 0 || tqf.general.description_th == undefined || tqf.general.description_th.length == 0)
      errors['description'] ="Missing or incomplete course description in Thai and/or English";
    if (tqf.general.program_code===undefined || tqf.general.program_code.length == 0)
      errors['program'] ="Missing program";
    if (tqf.general.type===undefined || tqf.general.type.length == 0)
      errors['type'] ="Missing course type";
    if (tqf.version === undefined || tqf.form === undefined)
      errors['type'] ="Missing form and version";

    // Section 1
    if (tqf.year===undefined || tqf.year.length == 0 || (new Date(tqf.year) === "Invalid Date") || (isNaN(new Date(tqf.year)))) 
      errors['year'] ="Wrong or missing year in section 1";
    if (tqf.semester===undefined || tqf.semester.length==0 || !(Object.keys(semesters).includes(tqf.semester)))
      errors['semester'] ="Wrong or missing semester in section 1"; 
    if (tqf.venue===undefined || tqf.venue.length == 0) 
      errors['venue'] ="Missing venue in section 1";
    if (tqf.coordinators===undefined || tqf.coordinators.length == 0)  
      errors['coordinators'] ="Missing coordinators in section 1";
    if (tqf.instructors===undefined || tqf.instructors.length == 0)  
      errors['instructors'] ="Missing instructors in section 1";
    for (var i=0;i<tqf.coordinators.length;i++) {
      if (tqf.coordinators[i].name===undefined || tqf.coordinators[i].name.length == 0 || tqf.coordinators[i].id == undefined || tqf.coordinators[i].id.length == 0 ) errors['coordinators'] ="Missing coordinators in section 1";
    }
    for (var i=0;i<tqf.instructors.length;i++) {
      if (tqf.instructors[i].name===undefined || tqf.instructors[i].name.length == 0 || tqf.instructors[i].id == undefined || tqf.instructors[i].id.length == 0 ) errors['instructors'] ="Missing instructors in section 1";
    }

    // Section 2
    var outs = [];
    Object.keys(tqf.outcomes).forEach((key) => {
      if (tqf.outcomes[key].achieved != "Yes" && (tqf.outcomes[key].problems.length == 0 || tqf.outcomes[key].problems == "None")) outs.push(key);
    });
    if (outs.length > 0) errors['outcomes'] = "Some learning outcomes ("+ outs.join(', ')+") have not been achieved, but the reasons/problems are not indicated in section 2"; 

    // Section 3
    var missing_section = [];
    for (var i=0; i<tqf.sections.length; i++) {
      if (tqf.sections[i].section === undefined || tqf.sections[i].section.length == 0 || (isNaN(parseInt(tqf.sections[i].section)))) errors['missing_section_numbers'] = "Some sections do not have a correct section number";
      tqf.sections[i].grades.forEach((grade) => {
        if (grade === undefined || (isNaN(parseInt(grade)))) errors['wrong_grades'] = "Some of the results for graded students introduced in section 3 are not numbers";
      });
      tqf.sections[i].nongrades.forEach((nongrade) => {
        if (nongrade === undefined || (isNaN(parseInt(nongrade)))) errors['wrong_nongrades'] = "Some of the results for non-graded students introduced in section 3 are not numbers";
      });
    }
    
    // Section 4
    try {
      if (tqf.evaluation.type === undefined) throw "You have not selected the student evaluation system in section 4";
      if (tqf.evaluation.type != "None") {
        if (tqf.evaluation.survey.total === undefined) throw "You have not introduced any data for the student survey results in section 4";
        if (tqf.evaluation.survey.total.responses === undefined || tqf.evaluation.survey.total.mean === undefined || tqf.evaluation.survey.total.stdev === undefined 
          || (isNaN(parseInt(tqf.evaluation.survey.total.responses))) || (isNaN(parseInt(tqf.evaluation.survey.total.mean))) || (isNaN(parseInt(tqf.evaluation.survey.total.stdev))))  throw "Data for student survey in section 4 is not correct";
        if (parseInt(tqf.evaluation.survey.total.responses) > tqf.total.enrolled) throw "Number of responses to student survey in section 4 is more than enrolled students for all sections";
      }
      if (tqf.evaluation.type == "Complete student survey") {
        tqf.evaluation.survey.questions.forEach((item, i) => {
          if (item.question === undefined || item.question.length == 0) errors['evaluation_questions'] = "Some questions in the survey of section 4 are empty";
          if (item.mean === undefined || item.stdev === undefined || isNaN(parseInt(item.mean)) || isNaN(parseInt(item.stdev))) errors['evaluation_data'] = "Data for the student survey reported on section 4 is incomplete";
        });
      }
    } catch(e) {
      errors['evaluation'] = e;
    }

    // Section 5
    Object.keys(tqf.plan).forEach(type => {
      Object.values(tqf.plan[type]).forEach((item, i) => {
        if (item.action === undefined || item.action.length == 0 || item.action == "None") {
          if (i>0) errors["plan_"+type+"_missing_actions"] = "Some actions in "+type+" plan of section 5 are empty";
        } else if (item.result === undefined || item.result.length == 0) {
          errors["plan_"+type+"_missing_results"] = "Some information about the results of "+type+" plan in section 5 is missing";
        }
      });
    });

    // End
    if (Object.keys(errors).length === 0) {
      tqf.has.validated = true;
      if (tqf.validation.errors !== undefined) delete tqf.validation.errors;
      tqf.validation.code = tqf.getValidationCode();
      tqf.validation.date = getTodayDate();
    } else {
      tqf.has.validated = false;
      tqf.validation.errors = errors;
    }
    return tqf.has.validated;

  } catch(e) {
    console.log(e);
    if (e !== undefined && typeof error !== 'string') e = "Failed validation";
    errors['caught'] = e;
    tqf.validation.errors = errors; 
    tqf.has.validated = false;
    return tqf.has.validated;
  }
}

/* PRINT CONTROL */
/* Pre-printing process for this version */

/* Prototype constructor */

TQFPrint.prototype["001"] = function () {
  this.version = "001";
}

TQFPrint.prototype["001"].preprint_process = function(tqf) {

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

  } else {

    // has object
    has.grade = data.has !== undefined && data.has.grade !== undefined ? data.has.grade : tqf3.has.grade;
    has.sects = (tqf.sections !== undefined && tqf.sections.length > 0 && tqf.sections[0].section.length > 0);
    has.eval = (tqf.evaluation !== undefined && tqf.evaluation.type !== undefined && tqf.evaluation.type.length > 0);
    has.survey_total = (tqf.evaluation !== undefined && tqf.evaluation.survey !== undefined && tqf.evaluation.survey.total !== undefined && tqf.evaluation.survey.total.mean !== undefined && tqf.evaluation.survey.total.mean.length > 0);
    has.survey_questions = (tqf.evaluation !== undefined && tqf.evaluation.survey !== undefined && tqf.evaluation.survey.questions !== undefined && tqf.evaluation.survey.questions.length > 0 && tqf.evaluation.survey.questions[0].question !== undefined && tqf.evaluation.survey.questions[0].question.length > 0 && tqf.evaluation.survey.questions[0].mean !== undefined && tqf.evaluation.survey.questions[0].mean.length > 0);
    has.feed = (tqf.evaluation !== undefined && tqf.evaluation.feedback !== undefined && tqf.evaluation.feedback.length > 0);
    has.repl = (tqf.evaluation !== undefined && tqf.evaluation.reply !== undefined && tqf.evaluation.reply.length > 0);
    has.preplan = (tqf.plan !== undefined && tqf.plan.previous !== undefined && tqf.plan.previous.length > 0 && tqf.plan.previous[0].action.length > 0);
    has.curplan = (tqf.plan !== undefined && tqf.plan.current !== undefined && tqf.plan.current.length > 0 && tqf.plan.current[0].action.length > 0);
    has.futplan = (tqf.plan !== undefined && tqf.plan.future !== undefined && tqf.plan.future.length > 0 && tqf.plan.future[0].action.length > 0);

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
       obj['outcomes'][obj['outcomes'].length - 1]['assessment'] = obj['outcomes'][obj['outcomes'].length - 1]['assessment'].join(", ") + ".";
      }
    });
    tqf.outcomes_print[index] = JSON.parse(JSON.stringify(obj));
  });
  return tqf;
}

/* FORM CONTROL */
/* 5 functions are exposed to etqf.js with version number:
  1. attachListeners
  2. fillTQF3Form 
  3. fillTQF5Form
  4. populateOutcomes
  5. populateSelectFields

  The other are internal functions.
*/


/* Prototype constructor */

TQFForms.prototype["001"] = function () {
  this.version = "001";
}


/* Prototype functions */

TQFForms.prototype["001"].attachListeners = function() {

  $("#gradingSystem").on('change', (evt) => {
    evt.stopPropagation();
    var system = $("#gradingSystem").val();
    populateGrading({ 'system' : system, 'grades': gradings["001"][system]['grades'], 'range': gradings["001"][system]['range'], 'nongrades': gradings["001"][system]['nongrades'] });
  });

  $(".add_teacher").on('click', function(evt) {
    evt.stopPropagation();
    var type = $(this).attr('id').replace('add_', '') + 's';
    var current = $("."+type+"Row").length;
    var last_row = $("."+type+"Row").last();
    $(last_row).find('select').select2("destroy");
    var new_row = $(last_row).clone();
    $(new_row).appendTo("#"+type+"Form");
    $(last_row).find('select').select2({ theme: "bootstrap4"});
    $(new_row).find('select').select2({ theme: "bootstrap4"});
  });

  $(".remove_teacher").on('click', function(evt) {
    evt.stopPropagation();
    var type = $(this).attr('id').replace('remove_', '') + 's';
    if ($("."+type+"Row").length > 1) {
      var last_row = $("."+type+"Row").last();
      $(last_row).remove();
    }
  });

  $("#add_objective").on('click', function(evt) {
    evt.stopPropagation();
    var current = $(".objectivesRow").length;
    var new_row = $(".objectivesRow").last().clone();
    $(new_row).find(".objectiveOrder").text(current+1);
    $(new_row).find("input").val("");
    $(new_row).appendTo(".objectivesForm");
  });

  $("#remove_objective").on('click', function(evt) {
    evt.stopPropagation();
    if ($(".objectivesRow").length > 1) {
      var last_row = $(".objectivesRow").last();
      $(last_row).remove();
    }
  });

  $("#add_week").on('click', function(evt) {
    evt.stopPropagation();
    var i = $(".weeksRow").length;
    var new_row = $(".weeksRow").last().clone();
    $(new_row).find("textarea").val("");
    $(new_row).find(".weekOrder").text(i+1);
    $(new_row).find('.weekIndex').val(i+1);
    $(new_row).appendTo(".weeksForm");
  });

  $("#remove_week").on('click', function(evt) {
    evt.stopPropagation();
    if ($(".weeksRow").length > 1) {
      var last_row = $(".weeksRow").last();
      $(last_row).remove();
    }
  });

  $(".add_resource").on('click', function(evt) {
    evt.stopPropagation();
    var type = $(this).attr('id').replace('add_', '') + 's';
    var num = $("."+type+"Row").length;
    var new_row = $("."+type+"Row").last().clone();
    $(new_row).find("."+type+"Order").text(num+1);
    $(new_row).find("input").val("");
    $(new_row).appendTo("#"+type+"Form");
  });

  $(".remove_resource").on('click', function(evt) {
    evt.stopPropagation();
    var type = $(this).attr('id').replace('remove_', '') + 's';
    if ($("."+type+"Row").length > 1) {
      var last_row = $("."+type+"Row").last();
      $(last_row).remove();
    }
  });

  $("#add_task").on('click', function(evt) {
    evt.stopPropagation();
    var i = $(".tasksRow").length;
    var new_row = $(".tasksRow").last().clone();
    $(new_row).find(".taskOrder").text(i+1);
    $(new_row).find('.taskIndex').val(i+1);
    $(new_row).find('.taskMethods').val('');
    $(new_row).find('.taskDetails').val('');
    $(new_row).find('.taskWeeks').val('');
    $(new_row).find('.taskRatios').val(0);
    $(new_row).appendTo(".tasksForm");
  });

  $("#remove_task").on('click', function(evt) {
    evt.stopPropagation();
    if ($(".tasksRow").length > 1) {
      var last_row = $(".tasksRow").last();
      $(last_row).remove();
    }
  });

  $("#evaluationType").on('change', () => {
    fillStudentEvaluationFormat($("#evaluationType").val());
  });

  $("#add_section").on('click', function(evt) {
    evt.stopPropagation();
    var newName;
    var current = $("#gradingResultsTable").find(".sectionRow").length;
    var currentIndex = parseInt($("#gradingResultsTable").find(".sectionRow").last().find("input").first().attr("name").replace("sections[","").replace("][section]",""));
    var new_grade_row = $("#gradingResultsTable").find(".sectionRow").last().clone();
    var new_nongrade_row = $("#gradingNongradesTable").find(".sectionRow").last().clone();
    var rowInputs = $(new_grade_row).find('input');
    $(rowInputs).each( function() { 
      newName = $(this).attr("name").replace(currentIndex.toString(), (currentIndex+1).toString());
      $(this).attr('name', newName);
      $(this).val(""); 
    }); 
    rowInputs = $(new_nongrade_row).find('input');
    $(rowInputs).each( function() { 
      newName = $(this).attr("name").replace(currentIndex.toString(), (currentIndex+1).toString());
      $(this).attr("name").replace(currentIndex.toString(), (currentIndex+1).toString());
      $(this).attr('name', newName);
      $(this).val("") 
    }); 

    $(new_grade_row).appendTo("#gradingResultsTable > .sectionsTbody");
    $(new_nongrade_row).appendTo("#gradingNongradesTable > .sectionsTbody");
  });

  $("#remove_section").on('click', function(evt) {
    evt.stopPropagation();
    var gradesRows = $("#gradingResultsTable").find(".sectionRow");
    if (gradesRows.length > 1) {
      var last_grade_row = $("#gradingResultsTable").find(".sectionRow").last();
      var last_nongrade_row = $("#gradingNongradesTable").find(".sectionRow").last();
      $(last_grade_row).remove();
      $(last_nongrade_row).remove();
    }
  });

  $(".add_action").on('click', function(evt) {
    evt.stopPropagation();
    var form = $(this).closest('.form-group');
    var id = $(form).attr('id').replace('ImprovementsForm', '');
    var new_row = $(form).find('.actionsRow').last().clone();
    $(new_row).find('input').val('');
    $(new_row).appendTo(form);
  });

  $(".remove_action").on('click', function(evt) {
    evt.stopPropagation();
    var form = $(this).closest('.form-group');
    var rows = $(form).find('.actionsRow');
    if ($(rows).length > 1) {
      var last_row = $(rows).last();
      $(last_row).remove();
    }
  });
}

TQFForms.prototype["001"].fillTQF3Form = function() {

  $("#course").select2("destroy"); // Need to destroy select2 in the course select in order to avoid problems when updating. Select 2 is applied again at the end

  for (var i=0; i<jsonTQF.coordinators.length-1;i++) $("#add_coordinator").trigger('click');
  for (var i=0; i<jsonTQF.instructors.length-1;i++) $("#add_instructor").trigger('click');
  for (var i=0; i<jsonTQF.objectives.length-1;i++) $("#add_objective").trigger('click');
  for (var i=0; i<jsonTQF.weeks.length-1;i++) $("#add_week").trigger('click');
  for (var i=0; i<jsonTQF.tasks.length-1;i++) $("#add_task").trigger('click');
  for (var i=0; i<jsonTQF.resources.textbooks.length-1;i++) $("#add_textbook").trigger('click');
  for (var i=0; i<jsonTQF.resources.references.length-1;i++) $("#add_reference").trigger('click');
  for (var i=0; i<jsonTQF.resources.others.length-1;i++) $("#add_other").trigger('click');

  $("#TQF3_form").values(jsonTQF);

  // Section 1
  row = $(".coordinatorsRow").first();
  jsonTQF.coordinators.forEach((coord, i) => {
    $(row).find('.coordinatorsSelect').val(coord.id);
    row = row.next();
  });

  row = $(".instructorsRow").first();
  jsonTQF.instructors.forEach(instr => {
    $(row).find('.instructorsSelect').val(instr.id);
    row = row.next();
  });

  // Section 2
  row = $(".objectivesRow").first();
  jsonTQF.objectives.forEach(objective => {
    $(row).find('.inputObjectives').val(objective).text(objective);
    row = row.next();
  });

  // Section 4
  row = $(".weeksRow").first();
  for (var i=0;i<jsonTQF.weeks.length;i++) {
    $(row).find('.weekTopics').val(jsonTQF.weeks[i]['topic']);
    $(row).find('.weekContents').val(jsonTQF.weeks[i]['contents']);
    $(row).find('.weekActivities').val(jsonTQF.weeks[i]['activities']);
    $(row).find('.weekMaterials').val(jsonTQF.weeks[i]['materials']);
    row = row.next();    
  }
  
  try {
    populateGrading(jsonTQF.grading);
  } catch(e) {
    console.log(e);
    $("#gradingSystem").val('');
    $("#gradingRange").empty();
  }

  row = $(".tasksRow").first();
  for (var i=0;i<jsonTQF.tasks.length;i++) {
    $(row).find('.taskMethods').val(jsonTQF.tasks[i]['method']);
    $(row).find('.taskDetails').val(jsonTQF.tasks[i]['details']);
    $(row).find('.taskWeeks').val(jsonTQF.tasks[i]['week']);
    $(row).find('.taskRatios').val(jsonTQF.tasks[i]['ratio']);
    $(row).find('.group-checkbox').prop('checked', jsonTQF.tasks[i]['group']);
    row = row.next();    
  }

  // Section 5
  row = $(".textbooksRow").first();
  for (var i=0;i<jsonTQF.resources.textbooks.length;i++) {
    $(row).find('input').val(jsonTQF.resources.textbooks[i]);
    row = row.next();    
  }

  row = $(".referencesRow").first();
  for (var i=0;i<jsonTQF.resources.references.length;i++) {
    $(row).find('input').val(jsonTQF.resources.references[i]);
    row = row.next();    
  }

  row = $(".othersRow").first();
  for (var i=0;i<jsonTQF.resources.others.length;i++) {
    $(row).find('input').val(jsonTQF.resources.others[i]);
    row = row.next();    
  }

  // Section 3
  // Populate and fill outcomes
  forms["001"].populateOutcomes();
  Object.entries(jsonTQF.outcomes).forEach( ([key, out]) => {
    row = $("#learningOutcomes").find("#"+key.replace('.','_'));
    $(row).find('textarea.outcomesStudent').val(out['student']);
    $(row).find('textarea.outcomesTeaching').val(out['teaching']);
  });
  row = $(".tasksRow").first();
  for (var i=0;i<jsonTQF.tasks.length;i++) {
    $(row).find('.taskOutcomesSelectClass').val(jsonTQF.tasks[i]['outcomes']);
    row = row.next();    
  }

  // Trigger changes in select fields, except in course
  $("#year").trigger('change');
  $("#semester").trigger('change');
  $("#gradingSystem").trigger('change');
  $('.coordinatorsSelect').trigger('change');
  $('.instructorsSelect').trigger('change');
  
  $("#course").select2({ theme: 'bootstrap4' });

}

TQFForms.prototype["001"].fillTQF5Form = function(grading) {
  var row;

  console.log("Filling TQF5 form");
  /// Section 2
  var outs = [];
  var domains = {};
  Object.keys(programs[jsonTQF.general.program_code]['curriculum']).forEach(key => {
    outs.push(Object.keys(programs[jsonTQF.general.program_code]['curriculum'][key]['outcomes']));
    domains[key+".1"] = key + ". " + programs[jsonTQF.general.program_code]['curriculum'][key]['domain'];
  });
  outs = outs.concat.apply([], outs);

  var outsCourse = [];
  var text = "";
  var precede = "";
  var domainValue = "";
  var radioYes = "";
  var radioNo = "";
  var radio = "";
  $("#achievementOutcomes").empty();

  var dots = jsonTQF.general.outcomes_map.split('');
  dots.forEach((out, i) => {
    text = "";
    var exclude = "";
    if (outs[i] in domains) {
      domainValue = domains[outs[i]];
      precede = "<hr style='color: #fff'><h6 style='padding-bottom: 1em;padding-top:0.5em'><b>"+domainValue+"</b></h6>";
    } else {
      precede = "";
    }
    if (out == "x") {
      exclude = "style='display:none'";
      radio = 'checked="checked"';
      radioYes = "radioNull";
      radioNo = "radioNull";
      yes = "N/A";
      no = "N/A";
    } else if (out == "o") {
      text += "<div> &#9711; " + outs[i] + " :</b> ";
      outsCourse.push(outs[i]);
      radioYes = "radioYes";
      radioNo = "radioNo";
      yes = "Yes";
      no = "No";
      radio='';
    } else if (out == "*") {
      text += "<div><b> &#11044; " + outs[i] + " :</b> ";
      outsCourse.push(outs[i]);
      radioYes = "radioYes";
      radioNo = "radioNo";
      yes = "Yes";
      no = "No";
      radio='';
    } 

    text += "Students will be able to " + jsonTQF.outcomes[outs[i]]['student'];
    text += " Instructors will " + jsonTQF.outcomes[outs[i]]['teaching'];
    text+="</div>";

    $("#achievementOutcomes").append(precede).append(
      $('<div class="form-group" id="ach_'+outs[i].replace('.','_')+'" '+exclude+'>').append(
        $('<div class="col-md-12">').append(text)
      ).append(
        $('<div style="text-align: center; padding:1em">').append(
          $('<div class="form-check form-check-inline">').append(
            $('<input class="form-check-input radios '+radioYes+'" type="radio" name="outcomes['+outs[i]+'][achieved]" value="'+yes+'">')
          ).append(
            $('<label class="form-check-label" style="margin-left: 5px">').text('Achieved')
          )
        ).append(
          $('<div class="form-check form-check-inline">').append(
            $('<input '+radio+' class="form-check-input radios '+radioNo+'" type="radio" name="outcomes['+outs[i]+'][achieved]" checked="checked" value="'+no+'">')
          ).append(
            $('<label class="form-check-label" style="margin-left: 5px">').text('Not achieved')
          )
        )
        ).append(
          $('<div class="col-md-12">').append(
            $('<textarea rows="2" class="form-control" value="" name="outcomes['+outs[i]+'][problems]" placeholder="If not achieved, briefly describe problems encountered and attempted solutions.">')
        )
      )
    )
    if (out == "x") { jsonTQF.outcomes[outs[i]]['achieved'] = 'Not applicable' }
  });

  var radios = $('#achievementOutcomes').find('.radios');

  var radio;
  var outs = Object.keys(jsonTQF.outcomes);
  for (var i=0;i<outs.length;i++) {
    radio = $(radios).filter('input[name^="outcomes['+outs[i]+']"]');
    $(radio).filter('.radioYes').val('Yes');
    $(radio).filter('.radioNo').val('No');
    $(radio).filter('.radioNull').val('N/A');
    $(radio).filter('.radio'+jsonTQF.outcomes[outs[i]]['achieved']).prop('checked', true);
  }

  /// Section 3
  $("#gradingResultsTable").empty();
  $("#gradingNongradesTable").empty();
  if (jsonTQF.grading.system != 'None') {

    $("#gradingResultsTable").append($('<thead>').append($('<tr>').append($('<th scope="col" width="3em" class="text-center">').text('Section'))));
    $("#gradingResultsTable").append($('<tbody class="sectionsTbody">').append($('<tr class="sectionRow form-group">')));
    $("#gradingResultsTable").find('tbody').find('tr').append($('<td>').append($('<input type="number" class="form-control sectionInput text-center" onchange="changeSectionNumber(this)" name="sections[0][section]">')));
    jsonTQF.grading.grades.forEach(grade => {      
      $("#gradingResultsTable").find('thead').find('tr').append($('<th scope="col" class="text-center">').text(grade));
      $("#gradingResultsTable").find('tbody').find('tr').append($('<td>').append($('<input type="number" class="form-control text-center" name="sections[0][grades]['+grade+']">')));
    });

    $("#gradingNongradesTable").append($('<thead>').append($('<tr>').append($('<th scope="col" width="3em" style="font-weight: normal" class="text-center">').text('Section'))));
    $("#gradingNongradesTable").append($('<tbody class="sectionsTbody">').append($('<tr class="sectionRow text-center">')));
    $("#gradingNongradesTable").find('tbody').find('tr').append($('<td>').append($('<input disabled class="always-disabled form-control text-center sectionOutput" width="20px" name="sections[0][section]">')));

    gradings["001"][jsonTQF.grading.system]['nongrades'].forEach((nongrade, i) => {      
      $("#gradingNongradesTable").find('thead').find('tr').append($('<th scope="col" style="font-weight: normal" class="text-center">').text(gradings["001"][jsonTQF.grading.system]['nongrades_description_en'][i]));
      $("#gradingNongradesTable").find('tbody').find('tr').append($('<td>').append($('<input type="number" class="form-control text-center" name="sections[0][nongrades]['+nongrade+']">')));
    });
  }

  for (var i=0; i<jsonTQF.sections.length-1;i++) $("#add_section").trigger('click');

  if (jsonTQF.sections !== undefined && jsonTQF.sections.length > 0) {
    $("#gradingResultsTable").find('.sectionRow').each( function(i) {
      $(this).find('input[name="sections['+i+'][section]"]').val(jsonTQF.sections[i].section);
      jsonTQF.grading.grades.forEach((grade, j) => {
        $(this).find('input[name="sections['+i+'][grades]['+grade+']"]').val(jsonTQF.sections[i].grades[j]);
      });
    });

    $("#gradingNongradesTable").find('.sectionRow').each( function(i) {
      $(this).find('input[name="sections['+i+'][section]"]').val(jsonTQF.sections[i].section);
      jsonTQF.grading.nongrades.forEach((nongrade, j) => {
        $(this).find('input[name="sections['+i+'][nongrades]['+nongrade+']"]').val(jsonTQF.sections[i].nongrades[j]);
      });
    });
  }

  $("#verificationAssessment").empty();
  var info = "";
  jsonTQF.tasks.forEach((task, i) => {
    info = task.order+". "+task.method+" ("+task.ratio+"%)";
    $("#verificationAssessment").append(precede).append(
      $('<div class="row form-group">').append(
        $('<label class="col-md-4">').text(info)
      ).append(
        $('<textarea rows="2" class="form-control col-md-8" value="" name="tasks[][verification]" placeholder="Provide evidence of assessment method for verification.">')
      )
    );
  });

  $("#TQF5_form").find('#verificationAssessment').find('textarea').each( function(i) {
    $(this).val(jsonTQF.tasks[i].verification);
  });

  /// Section 4
  fillStudentEvaluationFormat(jsonTQF.evaluation.type);

  /// Section 5

  for (var i=0; i<jsonTQF.plan.previous.length-1;i++) $("#previousImprovementsForm").find(".add_action").trigger('click');
  for (var i=0; i<jsonTQF.plan.current.length-1;i++) $("#currentImprovementsForm").find(".add_action").trigger('click');
  for (var i=0; i<jsonTQF.plan.future.length-1;i++) $("#futureImprovementsForm").find(".add_action").trigger('click');

  row = $("#previousImprovementsForm").find(".actionsRow").first();
  for (var i=0;i<jsonTQF.plan.previous.length;i++) {
    $(row).find('input[name="plan[previous][][action]"]').val(jsonTQF.plan.previous[i].action);
    $(row).find('input[name="plan[previous][][result]"]').val(jsonTQF.plan.previous[i].result);
    row = row.next();    
  }

  row = $("#currentImprovementsForm").find(".actionsRow").first();
  for (var i=0;i<jsonTQF.plan.current.length;i++) {
    $(row).find('input[name="plan[current][][action]"]').val(jsonTQF.plan.current[i].action);
    $(row).find('input[name="plan[current][][result]"]').val(jsonTQF.plan.current[i].result);
    row = row.next();    
  }

  row = $("#futureImprovementsForm").find(".actionsRow").first();
  for (var i=0;i<jsonTQF.plan.future.length;i++) {
    $(row).find('input[name="plan[future][][action]"]').val(jsonTQF.plan.future[i].action);
    $(row).find('input[name="plan[future][][result]"]').val(jsonTQF.plan.future[i].result);
    row = row.next();    
  }

  $("#TQF5_form").values(jsonTQF);

  $("#TQF5_form").find("select").trigger("change");

}

// Specific function to populate outcomes
TQFForms.prototype["001"].populateOutcomes = function() {

  var outs = [];
  var domains = {};
  Object.keys(programs[jsonTQF.general.program_code]['curriculum']).forEach(key => {
    outs.push(Object.keys(programs[jsonTQF.general.program_code]['curriculum'][key]['outcomes']));
    domains[key+".1"] = key + ". " + programs[jsonTQF.general.program_code]['curriculum'][key]['domain'];
  });
  outs = outs.concat.apply([], outs);

  $("#learningOutcomes").empty();

  var outsCourse = [];
  var text = "";
  var precede = "";
  var domainValue = "";

  var dots = jsonTQF.general.outcomes_map.split('');

  dots.forEach((out, i) => {
    text = "";
    var exclude = "";
    if (outs[i] in domains) {
      domainValue = domains[outs[i]];
      precede = "<hr style='color: #fff'><h6 style='padding-bottom: 1em;padding-top:0.5em'><b>"+domainValue+"</b></h6>";
    } else {
      precede = "";
    }
    if (out == "x") {
      exclude = "style='display:none'";
    } else if (out == "o") {
      text += "<div> &#9711; " + outs[i] + " :</b> "+programs[jsonTQF.general.program_code]['curriculum'][outs[i].substr(0,1)]['outcomes'][outs[i]]+"</div>";
      outsCourse.push(outs[i]);
    } else if (out == "*") {
      text += "<div><b> &#11044; " + outs[i] + " :</b> "+programs[jsonTQF.general.program_code]['curriculum'][outs[i].substr(0,1)]['outcomes'][outs[i]]+"</div>";
      outsCourse.push(outs[i]);
    } 

    $("#learningOutcomes").append(precede).append(
      $('<div class="outc form-group" id="'+outs[i].replace('.','_')+'" '+exclude+'>').append(
        $('<label class="col-sm-12">').append(text)
      ).append(
        $('<div style="display:none">')
          .append(
            $('<input class="outcomesDots" value="'+out+'" name="outcomes['+outs[i]+'][dot]">')
        )
      ).append(
        $('<div class="form-group row">')
          .append(
            $('<label class="col-sm-5">').text("Students will be able to...").append('<span class="text-danger">*</span> <span class="text-info fa fa-question-circle" data-toggle="tooltip" data-placement="bottom" title="Write the expectations for this course learning outcome from the perspective of the student in specific and clear language, as a continuation to the phrase \'Students will be able to\'. You should describe the outcome(s) students are expected to achieve expressed in action verbs and in a single sentence completing the phrase."></span>')
          ).append(
            $('<textarea rows="2" class="col-sm-7 form-control outcomesStudent" value="" name="outcomes['+outs[i]+'][student]">')
        )
      )
      .append(
        $('<div class="form-group row">')
          .append(
            $('<label class="col-sm-5">').text("Instructors will...").append('<span class="text-danger">*</span> <span class="text-info fa fa-question-circle" data-toggle="tooltip" data-placement="bottom" title="Write the teaching methods that instructors will employ to achieve this learning outcome. You should describe the teaching methods using action verbs in a single sentence that continues the phrase \'Instructors will\'"></span>')
          ).append(
            $('<textarea rows="2" class="col-sm-7 form-control outcomesTeaching" value="" name="outcomes['+outs[i]+'][teaching]">')
        )
      )
    )
    if (out == "0") $("#learningOutcomes").find('.outc').last().hide();
  });
  $("#outcomesForCourse").data('outs', outsCourse);

  $('.taskOutcomesSelectClass').empty();
  $('.taskOutcomesSelectClass').append($('<option disabled selected value>').val("").text('-- Outcomes --'));
  var outs = $("#outcomesForCourse").data('outs');
  for (var i=0; i<outs.length; i++) {
    $('.taskOutcomesSelectClass').append($('<option>').val(outs[i]).text(outs[i]));
  }
}


TQFForms.prototype["001"].populateSelectFields = function() {
  $(".gradingSelect").empty();
  $(".gradingSelect").append($('<option disabled selected value>').val("").text("-- Grading systems --"));
  Object.keys(gradings["001"]).forEach((system) => {
    $(".gradingSelect").append($("<option>").val(system).text(gradings["001"][system]['label']));
  });

  $(".evaluationSelect").empty();
  $(".evaluationSelect").append($('<option disabled selected value>').val("").text("-- Student evaluation systems --"));
  Object.keys(evaluations["001"]).forEach((code) => {
    $(".evaluationSelect").append($("<option>").val(code).text(evaluations["001"][code]["label"]));  
  });
}

/* Internal functions */

function populateGrading(grading) {

  $("#gradingRange").empty();
  var value;
  $("#gradingRange").append($('<div class="row form-group">'));

  grading.grades.forEach((grade, i) => {
    $("#gradingRange").find('.row')
      .append($('<div class="col-sm-1">')
        .append($('<label>').text(grade)
        )
      )
      .append($('<div class="col-sm-2">')
        .append($('<input value="'+grading.range[i]+'" class="form-control" name="grading[range][]" />')
      )
      .append($('<div style="display:none">')
        .append($('<input value="'+grading.grades[i]+'" class="form-control" name="grading[grades][]" />')
      )
    ))
  });

  grading.nongrades.forEach((nongrade, i) => {
    $("#gradingRange").find('.row')  
      .append($('<div style="display:none">')
        .append($('<input value="'+grading.nongrades[i]+'" class="form-control" name="grading[nongrades][]" />')
      )
    )
  });

  (grading.range.length > 0) ? $("#gradingRange").show() : $("#gradingRange").hide();
}


function changeSectionNumber(element) {
  var index = $(".sectionInput").index(element);
  var value = $(element).val();
  var output = $(".sectionOutput").eq(index);
  $(output).val(value);
}

function fillStudentEvaluationFormat(type) {
  $("#evaluationResults").empty();
  if (type == "Complete student survey") {
    $("#evaluationResults").append(
      $('<table class="table" id="fullSurvey">').append(
        $('<thead>').append(
          $('<tr>').append(
            $('<th scope="col" class="col-8 text-center">').text('Question')
          ).append(
            $('<th scope="col" class="col-2 text-center">').text('Mean')
          ).append(
            $('<th scope="col" class="col-2 text-center">').text('Std Dev')
          )
        )
      ).append(
        $('<tbody id="fullSurveyTbody">')
      )
    );
    evaluations["001"]["Complete student survey"]["questions"].forEach( qu => {
      $("#fullSurveyTbody").append(
        $('<tr class="surveyRow">')
        .append(
          $('<td>').append($('<input type="text" class="form-control" name="evaluation[survey][questions][][question]"/>')).val(qu).text(qu)
        )
        .append(
          $('<td>').append($('<input type="number" min=0 max=5 step=0.01 class="form-control" name="evaluation[survey][questions][][mean]"/>'))
        )
        .append(
          $('<td>').append($('<input type="number" min=0 max=10 step=0.01 class="form-control" name="evaluation[survey][questions][][stddev]"/>'))
        )
      )
    });

    $("#surveyGroup").show();

  } 
  if (type == "Complete student survey" || type == "Summary of student survey") {
    $("#evaluationResults").append(
      $('<table class="table" id="summarySurvey">').append(
        $('<thead>').append(
          $('<tr>')
          .append(
            $('<th scope="col" class="col-4 text-center">').text('Responses')
          )
          .append(
            $('<th scope="col" class="col-4 text-center">').text('Mean')
          )
          .append(
            $('<th scope="col" class="col-4 text-center">').text('Std Dev')
          )
        )
      ).append(
        $('<tbody id="summarySurveyTbody">').append( $('<tr class="surveyRow">')
          .append(
            $('<td>').append($('<input type="number" class="form-control text-center" name="evaluation[survey][total][responses]"/>'))
          )
          .append(
            $('<td>').append($('<input type="number" min=0 max=5 step=0.01 class="form-control text-center" name="evaluation[survey][total][mean]"/>'))
          ).append(
            $('<td>').append($('<input type="number" min=0 max=10 step=0.01 class="form-control text-center" name="evaluation[survey][total][stdev]"/>'))
          )
      )
    ));

    if (jsonTQF !== undefined && jsonTQF.evaluation !== undefined && jsonTQF.has !== undefined && jsonTQF.evaluation.survey !== undefined) {
      if (jsonTQF.has.survey_total && jsonTQF.evaluation.survey.total !== undefined) {
        $("#evaluationResults").find('input[name="evaluation[survey][total][responses]"').val(jsonTQF.evaluation.survey.total.responses);
        $("#evaluationResults").find('input[name="evaluation[survey][total][mean]"').val(jsonTQF.evaluation.survey.total.mean);
        $("#evaluationResults").find('input[name="evaluation[survey][total][stdev]"').val(jsonTQF.evaluation.survey.total.stdev);
      }
      if (jsonTQF.has.survey_questions && jsonTQF.evaluation.survey.questions !== undefined ) {
        for (var i=0; i<jsonTQF.evaluation.survey.questions.length;i++) {
          $("#evaluationResults").find('input[name="evaluation[survey][questions]['+i+'][question]"').val(jsonTQF.evaluation.survey.questions[i]['question']);
          $("#evaluationResults").find('input[name="evaluation[survey][questions]['+i+'][mean]"').val(jsonTQF.evaluation.survey.questions[i]['mean']);
        $("#evaluationResults").find('input[name="evaluation[survey][questions]['+i+'][stdev]"').val(jsonTQF.evaluation.survey.questions[i]['stdev']);         
        }
      }
    }

    $("#surveyGroup").show();
  }
}
