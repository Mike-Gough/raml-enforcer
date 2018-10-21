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

// lodash library
const _         = require('lodash');

// Returns a promise that is either an object or an error
const validate = function (filePath, options) {

  const defaultOptions = {
    includes: true,
    warnings: true,
    errors: true,
    throwOnWarnings: true,
    throwOnErrors: true,
    warnOldRamlVersion: true
  };

  const mergedOptions = Object.assign({}, defaultOptions, options || {});

  _.map(optionKeys, function(key) {
    validationOptions[key] = commander[key];
    console.log(`  merged ${colors.white(_.startCase(key) + ':')} ${colors.magenta(commander[key])}`);
  });

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

        if (!mergedOptions.includes && name !== filePath) {
          return;
        }

        if (!mergedOptions.warnings && issue.isWarning) {
          return;
        }

        if (!mergedOptions.errors && !issue.isWarning) {
          return;
        }

        issuesToReport.push({
          src: `${name}:${issue.range.start.line}:${issue.range.start.column}`,
          message: issue.message,
          isWarning: issue.isWarning,
          isError: !issue.isWarning,
        });
      });

      // If issues were not identified, validate RAML quality
      if (issuesToReport.length == 0) {
        if (!mergedOptions.warnOldRamlVersion && (ramlContent.RAMLVersion() != "RAML10")) {
          issuesToReport.push({
            src: filePath,
            message: `RAML should be upgraded to version 1.0`,
            isWarning: true,
            isError: false,
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
      return { src: filePath, message:'Valid' };
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

console.log(`parameters:`.bold);

let optionKeys = [
  "color",
  "includes",
  "warnings",
  "errors",
  "throwOnWarnings",
  "throwOnErrors",
  "warnOldRamlVersion"
]

_.map(optionKeys, function(key) {
  validationOptions[key] = commander[key];
  console.log(`  ${colors.white(_.startCase(key) + ':')} ${colors.magenta(commander[key])}`);
});

console.log(`report:`.bold);

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
          }

          if (issue.isError) {
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
