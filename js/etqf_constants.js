/// Global constants ///

const semesters = {
  "1": "First",
  "2": "Second",
  "3": "Summer"
}

/* GLOBAL OBJECTS */
// These change with version / Objects are filled in each version file
var gradings = {};
var evaluations = {};

if (typeof window === 'undefined') {
  module.exports = {
    semesters,
    gradings,
    evaluations
  }
}
