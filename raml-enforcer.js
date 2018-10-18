#!/usr/bin/env node
"use strict";

const pkg       = require('./package.json');
const raml      = require('raml-1-parser');
const commander = require('commander');
const colors    = require('colors');
const Bluebird  = require('bluebird');
const path      = require('path');

/**
 * Returns a Bluebird promise that resolves with an object
 * (with 'src' and 'message' properties) or rejects with an error.
 */
const validate = function (filePath, options) {

  const defaultOptions = {
    reportIncludes: true,
    reportWarnings: true,
    reportErrors: true,
  };

  const mergedOptions = Object.assign({}, defaultOptions, options || {});

  return Bluebird
    .resolve()
    .then(() => {

      // Parse file
      return raml.loadRAML(filePath).catch((err) => {

        // Generic error
        err.issues = [{ src: filePath, message: err.message}];
        throw err;
      });
    })
    .then((ramlContent) => {

      const issuesToReport = [];

      // Check ramlContent for issues
      ramlContent.errors().forEach((issue) => {

        let name = path.join(path.dirname(filePath), issue.path);

        if (!mergedOptions.reportIncludes && name !== filePath) {
          return;
        }

        if (!mergedOptions.reportWarnings && issue.isWarning) {
          return;
        }

        if (!mergedOptions.reportErrors && !issue.isWarning) {
          return;
        }

        issuesToReport.push({
          src: `${name}:${issue.range.start.line}:${issue.range.start.column}`,
          message: issue.message,
          isWarning: issue.isWarning,
        });
      });

      // If issues were identified
      if (issuesToReport.length > 0) {

        // Throw an error containing the issues
        let ve = new Error('Validation Error');
        ve.issues = issuesToReport;
        throw ve;
      }

      // Otherwise the file is valid
      return { src: filePath, message:'VALID' };
    });
};

let issueCount = 0;

const validationOptions = {};

// Parse command line arguments
commander
  .version(pkg.version)
  .usage('[options] <file ...>')
  .option('  --no-color', 'do not use color in output')
  .option('  --no-includes', 'do not report issues for include files')
  .option('  --no-warnings', 'do not report warnings')
  .option('  --no-errors', 'do not report errors')
  .parse(process.argv);

// If there are no files to process, then display the usage message
if (commander.args.length === 0) {
  commander.help();
}

// --no-colors option (handled by colors module)
if (!commander.colors) {
  console.log(`[raml-enforcer] ${colors.white('use colors:')} ${colors.green('true')}`);
} else {
  console.log(`[raml-enforcer] use colors: false`);
}

// --no-includes option
if (commander.includes) {
  console.log(`[raml-enforcer] ${colors.white('validate includes:')} ${colors.green('true')}`);
} else {
  validationOptions.reportIncludes = false;
  console.log(`[raml-enforcer] ${colors.white('validate includes:')} ${colors.red('false')}`);
}

// --no-warnings option
if (commander.warnings) {
  console.log(`[raml-enforcer] ${colors.white('report warnings:')} ${colors.green('true')}`);
} else {
  validationOptions.reportWarnings = false;
  console.log(`[raml-enforcer] ${colors.white('report warnings:')} ${colors.red('false')}`);
}

// --no-errors option
if (commander.errors) {
  console.log(`[raml-enforcer] ${colors.white('report errors:')} ${colors.green('true')}`);
} else {
  validationOptions.reportErrors = false;
  console.log(`[raml-enforcer] ${colors.white('report errors:')} ${colors.red('false')}`);
}

// Process each file sequentially
Bluebird
  .each(commander.args, (file) => {

    // Validate the file
    return validate(file, validationOptions)
      .then((result) => {

        // File is valid. Display success message.
        console.log(`[${result.src}] ${colors.green(result.message)}`);
      })
      .catch((error) => {

        // File is invalid. Display message for each issue.
        error.issues.forEach((issue) => {

          if (issue.isWarning) {
            console.log(`[${issue.src}] ${colors.yellow('WARN')} ${colors.yellow(issue.message)}`);
          } else {
            console.log(`[${issue.src}] ${colors.red('ERROR')} ${colors.red(issue.message)}`);
          }

          issueCount++;
        });
      });
  })
  .finally(() => {

    // If any issues occurred, return a proper status code
    if (issueCount > 0) {
      process.exit(1);
    }
  });
