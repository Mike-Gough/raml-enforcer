#!/usr/bin/env node
"use strict"

var validationOptions = require('./validation-options.json') // linter configuration
var pkg = require('./package.json') // NPM package configuration
var raml = require('raml-1-parser') // RAML parser
var commander = require('commander') // Command line argument parser
var colors = require('colors') // Colors and styles for console
var path = require('path') // node.js library for working with files and directories
var _ = require('lodash') // lodash library
var kindEnum = Object.freeze({
    "error": 0,
    "warning": 1
  })

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
  .parse(process.argv)

// check if command line args have been provided
if (commander.args.length === 0) {
  commander.help()
  process.exit(1)
}

console.log('parameters:'.bold)

// override validation options with command line args
_.forEach(validationOptions, function(value, key) {
  validationOptions[key] = commander[key]
  console.log('  ' + colors.white(_.startCase(key) + ':') + colors.magenta(value))
})

console.log('report:'.bold)

// Process each file sequentially
_.forEach(commander.args, (filePath) => {
  raml.loadRAML(filePath)
    .catch((error) => {
      error = [{
        src: filePath,
        message: error.message
      }]
      throw error
    })
    .then((ramlContent) => {

      // Check ramlContent for parser issues
      var issues = _.flatten(
        ramlContent.errors().map((issue) => {
          var name = path.join(path.dirname(filePath), issue.path)

          if ((validationOptions.includes && name == filePath) || (issue.isWarning && validationOptions.warnings) || (!issue.isWarning && validationOptions.errors)) {
            return {
              src: name + ':' + issue.range.start.line + ':' + issue.range.start.column,
              message: issue.message,
              kind: issue.isWarning ? kindEnum.warning : kindEnum.error
            }
          }
        })
      )

      var issueCountByKind = _.countBy(issues, function(issue) {
        return issue.kind;
      })

      // If the RAML file is valid, check for style and quality issues
      if (_.isEmpty(issues) && [kindEnum.error] == 0) {

        // Validate that the latest version of RAML is used
        if (validationOptions.warnOldRamlVersion && (ramlContent.RAMLVersion() != 'RAML10')) {
          issues.push({
            src: filePath,
            message: 'RAML should be upgraded to version 1.0',
            kind: kindEnum.warning
          })
        }

        // Validate that the API has a title
        if ((_.isEmpty(ramlContent.title()))) {
          issues.push({
            src: filePath,
            message: 'API should spesify a title property',
            kind: kindEnum.warning
          })
        }

        // Validate that all resources have a description
        function validateResourceDescription(resource, location) {
          if (_.isEmpty(resource.description())) {
            issues.push({
              src: filePath,
              message: 'Resource should have a description ' + location,
              kind: kindEnum.warning
            })
          }
          _.each(resource.resources(), function(childResource) {
            validateResourceDescription(childResource, location + childResource.relativeUri().value())
          })
        }

        _.each(ramlContent.resources(), function(resource) {
          validateResourceDescription(resource, resource.relativeUri().value())
        })
      }

      if (!_.isEmpty(issues)) {
        throw issues
      }

      return {
        src: filePath,
        message: 'Valid'
      }
    })
    .then((result) => {
      console.log('  ' + colors.white('[' + result.src + ']') + ' ' + colors.green(result.message))
    })
    .catch((error) => {
      error.forEach((issue) => {
        switch (issue.kind) {
          case kindEnum.warning:
            console.log('  ' + colors.white('[' + issue.src + ']') + ' ' + colors.yellow('WARN') + ' ' + colors.yellow(issue.message))
            break;
          case kindEnum.error:
            console.log('  ' + colors.white('[' + issue.src + ']') + ' ' + colors.red('ERROR') + ' ' + colors.red(issue.message))
            break;
        }
      })

      var issueCountByKind = _.countBy(error.issues, function(issue) {
        return issue.kind;
      })

      if ((issueCountByKind[kindEnum.warning] > 0 & validationOptions.throwOnWarnings) ||
         (issueCountByKind[kindEnum.error] > 0 & validationOptions.throwOnErrors)) {
        process.exit(1)
      }
    })
  })
