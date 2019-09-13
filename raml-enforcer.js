#!/usr/bin/env node
"use strict"

var validationOptions = require('./validation-options.json') // linter configuration
var pkg = require('./package.json') // NPM package configuration
var raml = require('webapi-parser').WebApiParser // RAML parser
var commander = require('commander') // Command line argument parser
var colors = require('colors') // Colors and styles for console
var path = require('path') // node.js library for working with files and directories
var _ = require('lodash') // lodash library

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

_.forEach(commander.args, (filePath) => {
  raml.raml10.parse(`file://${filePath}`)
    .then((webApiBaseUnit) => {
      return raml.raml10.validate(webApiBaseUnit)
    })
    .then((resultPromise) => {
      // Get parser issues
      var issues = _.flatten(
        resultPromise.results.map((issue) => {
          return {
            src: issue.location + ': ' + issue.position,
            message: issue.message,
            kind: issue.level
          }
        })
      )

      var issueCountByKind = _.countBy(issues, function(issue) {
        return issue.kind;
      })
      
      // If the RAML file is valid, check for style and quality issues
      if (_.isEmpty(issues)) {

        // Validate that the API has a title
        if ((_.isEmpty(ramlContent.title()))) {
          issues.push({
            src: filePath,
            message: 'API should spesify a title property',
            kind: 'Warning'
          })
        }

        // Validate that all resources have a description
        function validateResourceDescription(resource, location) {
          if (_.isEmpty(resource.description())) {
            issues.push({
              src: filePath,
              message: 'Resource should have a description ' + location,
              kind: 'Warning'
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

      console.log(error)
      error.forEach((issue) => {
        switch (issue.kind) {
          case "Warning":
            console.log('  ' + colors.white('[' + issue.src + ']') + ' ' + colors.yellow('WARN') + ' ' + colors.yellow(issue.message))
            break;
          case "Violation":
            console.log('  ' + colors.white('[' + issue.src + ']') + ' ' + colors.red('ERROR') + ' ' + colors.red(issue.message))
            break;
        }
      })

      var issueCountByKind = _.countBy(error, function(issue) {
        return issue.kind;
      })

      if ((issueCountByKind[kindEnum.warning] != undefined & issueCountByKind[kindEnum.warning] > 0 & validationOptions.throwOnWarnings) ||
         (issueCountByKind[kindEnum.Violation] != undefined & issueCountByKind[kindEnum.error] > 0 & validationOptions.throwOnErrors)) {
          console.log('Exiting with code 1')
          process.exit(1)
      } else {
        console.log('Exiting with code 0')
        process.exit(0)
      }
    })
  })
