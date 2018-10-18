#!/usr/bin/env node
"use strict";

// NPM package configuration
const pkg       = require('./package.json');

// RAML parser
const raml      = require('raml-1-parser');

// Command line argument parser
const commander = require('commander');

// Colors and styles for console
const colors    = require('colors');

// A javascript promise library
const bluebird  = require('bluebird');

// node.js library for working with files and directories
const path      = require('path');

/**
 * Returns a promise that is either an object
 * (with 'src' and 'message' properties) or an error.
 */
const validate = function (filePath, options) {

  const defaultOptions = {
    reportIncludes: true,
    reportWarnings: true,
    reportErrors: true,
  };

  const mergedOptions = Object.assign({}, defaultOptions, options || {});

  return bluebird
    .resolve()
    .then(() => {

      // Parse file
      return raml.loadRAML(filePath).catch((error) => {

        // Generic error
        error.issues = [{ src: filePath, message: error.message}];
        throw error;
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

      // Otherwise the RAML file is valid
      return { src: filePath, message:'VALID' };
    });
};

let errorCount = 0;
let warningCount = 0;

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
bluebird
  .each(commander.args, (file) => {

    // Validate the file
    return validate(file, validationOptions)
      .then((result) => {

        // Display success message for file
        console.log(`[${result.src}] ${colors.green(result.message)}`);
      })
      .catch((error) => {

        // Display error or warning message for each issue in the file
        error.issues.forEach((issue) => {

          if (issue.isWarning) {
            console.log(`[${issue.src}] ${colors.yellow('WARN')} ${colors.yellow(issue.message)}`);
            warningCount++;
          } else {
            console.log(`[${issue.src}] ${colors.red('ERROR')} ${colors.red(issue.message)}`);
            errorCount++;
          }
        });
      });
  })
  .finally(() => {

    // If any issues occurred, return a proper status code
    if (errorCount > 0) {
      process.exit(1);
    }
  });
