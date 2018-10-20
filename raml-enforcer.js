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
    throwOnWarnings: true,
    throwOnErrors: true,
    warnOldRamlVersion: true
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

      // If issues were not identified, validate RAML quality
      if (issuesToReport.length == 0) {
        if (!mergedOptions.warnOldRamlVersion && (ramlContent.RAMLVersion() != "RAML10")) {
          issuesToReport.push({
            src: filePath,
            message: `RAML should be upgraded to version 1.0`,
            isWarning: true,
          });
        }
      }

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
  .option('  --no-throw-on-warnings', 'do not exit with an exception when warnings occur')
  .option('  --no-throw-on-errors', 'do not exit with an exception when errors occur')
  .option('  --no-warn-old-raml-version', 'do not return a warning when an old RAML version is being used')
  .parse(process.argv);

// If there are no files to process, then display the usage message
if (commander.args.length === 0) {
  commander.help();
}

console.log(`raml-enforcer parameters:`.bold);

// --no-colors option (handled by colors module)
if (!commander.colors) {
  console.log(`  ${colors.white('use colors:')} ${colors.magenta('true')}`);
} else {
  console.log(`  use colors: false`);
}

// --no-includes option
if (commander.includes) {
  console.log(`  ${colors.white('validate includes:')} ${colors.magenta('true')}`);
} else {
  validationOptions.reportIncludes = false;
  console.log(`  ${colors.white('validate includes:')} ${colors.yellow('false')}`);
}

// --no-warnings option
if (commander.warnings) {
  console.log(`  ${colors.white('report warnings:')} ${colors.magenta('true')}`);
} else {
  validationOptions.reportWarnings = false;
  console.log(`  ${colors.white('report warnings:')} ${colors.yellow('false')}`);
}

// --no-errors option
if (commander.errors) {
  console.log(`  ${colors.white('report errors:')} ${colors.magenta('true')}`);
} else {
  validationOptions.reportErrors = false;
  console.log(`  ${colors.white('report errors:')} ${colors.yellow('false')}`);
}

// --no-throw-on-warnings option
if (commander.throwOnWarnings) {
  console.log(`  ${colors.white('throw on warnings:')} ${colors.magenta('true')}`);
} else {
  validationOptions.throwOnWarnings = false;
  console.log(`  ${colors.white('throw on warnings:')} ${colors.yellow('false')}`);
}

// --no-throw-on-errors option
if (commander.throwOnErrors) {
  console.log(`  ${colors.white('throw on errors:')} ${colors.magenta('true')}`);
} else {
  validationOptions.throwOnErrors = false;
  console.log(`  ${colors.white('throw on errors:')} ${colors.yellow('false')}`);
}

// --no-warning-on-old-raml-version
if (commander.noWarnOldRamlVersion) {
  console.log(`  ${colors.white('warn of old RAML versions:')} ${colors.magenta('true')}`);
} else {
  validationOptions.warnOldRamlVersion = false;
  console.log(`  ${colors.white('warn of old RAML versions:')} ${colors.yellow('false')}`);
}

console.log(`raml-enforcer report:`.bold);

// Process each file sequentially
bluebird
  .each(commander.args, (file) => {

    // Validate the file
    return validate(file, validationOptions)
      .then((result) => {

        // Display success message for file
        console.log(`  ${colors.white('[' + result.src + ']')} ${colors.green(result.message)}`);
      })
      .catch((error) => {

        // Display error or warning message for each issue in the file
        error.issues.forEach((issue) => {

          if (issue.isWarning) {
            console.log(`  ${colors.white('[' + issue.src + ']')} ${colors.yellow('WARN')} ${colors.yellow(issue.message)}`);
            warningCount++;
          } else {
            console.log(issue);
            console.log(`  ${colors.white('[' + issue.src + ']')} ${colors.red('ERROR')} ${colors.red(issue.message)}`);
            errorCount++;
          }
        });
      });
  })
  .finally(() => {

    // If warnings ocurred, return s proper status code
    if (warningCount > 0 & validationOptions.throwOnWarnings) {
      process.exit(1);
    }

    // If errors occurred, return a proper status code
    if (errorCount > 0 & validationOptions.throwOnErrors) {
      process.exit(1);
    }
  });
