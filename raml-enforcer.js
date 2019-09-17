#!/usr/bin/env node
"use strict"

var validationOptions = require("./validation-options.json") // linter configuration
var pkg = require("./package.json") // NPM package configuration
var raml = require("webapi-parser").WebApiParser // RAML parser
var commander = require("commander") // Command line argument parser
var colors = require("colors") // Colors and styles for console
var _ = require("lodash") // lodash library

// Parse command line arguments
commander
  .version(pkg.version)
  .usage("[options] <file ...>")
  .option("  --no-color", "do not use color in output")
  .option("  --throw-on-warnings", "exit with an exception when warnings occur")
  .parse(process.argv)

// check if command line args have been provided
if (commander.args.length === 0) {
  commander.help()
  process.exit(1)
}

console.log("parameters:".bold)

// override validation options with command line args
_.forEach(validationOptions, function(value, key) {
  validationOptions[key] = commander[key]
  console.log("  " + colors.white(_.startCase(key) + ":") + colors.magenta(value))
})

console.log("report:".bold)

var createIssue = function(_source, _message, _kind) {
  return {
    src: _source,
    message: _message,
    kind: _kind,
  }
}

var baseUnit = null

_.forEach(commander.args, filePath => {
  raml.raml10
    .parse(`file://${filePath}`)
    .catch(error => {
      throw [createIssue(error.Pp, error.mz, "Violation")]
    })
    .then(webApiBaseUnit => {
      baseUnit = webApiBaseUnit
      return raml.raml10.validate(baseUnit)
    })
    .then(validationReport => {
      const api = baseUnit.encodes

      // If the service contract could not be parsed, format the parser errors into a common model
      var issues = _.flatten(
        validationReport.results.map(issue =>
          createIssue(
            issue.location + ":" + issue.position.start.line + "," + issue.position.start.column,
            issue.message,
            issue.level
          )
        )
      )

      // If the service contract is valid, check for style and quality issues
      if (_.isEmpty(issues)) {
        // Validate that the API has a title
        if (_.isEmpty(api.name.value())) {
          issues.push(createIssue(filePath, "API should spesify a title property", "Warning"))
        }

        // Validate that the API has a description
        if (_.isEmpty(api.description.value())) {
          issues.push(createIssue(filePath, "API should spesify a description property", "Warning"))
        }

        // Validate that all resources have a description
        function validateEndpoints(endpoint, location) {
          if (_.isEmpty(endpoint.description.value())) {
            issues.push(createIssue(filePath, "Resource should have a description " + location, "Warning"))
          }
          _.forEach(endpoint.operations, operation => {
            _.forEach(operation.responses, response => {
              _.forEach(response.payloads, payload => {
                console.log(payload.schema.toJsonSchema)
                if (response.statusCode.value() == 204) {
                  issues.push(createIssue(filePath, "Resource should have a description " + location, "Warning"))
                }
              })
            })
          })
          _.each(endpoint.endPoints, function(childEndpoint) {
            validateEndpoints(childEndpoint, location + childEndpoint.path.value())
          })
        }

        _.each(api.endPoints, function(endpoint) {
          validateEndpoints(endpoint, endpoint.path.value())
        })
      }

      return {
        src: filePath,
        message: "Valid",
        issues: issues
      }
    })
    .then(result => {
      if (!_.isEmpty(result.issues)) {
        result.issues.forEach(issue => {
          const source = issue.src.replace("file://", "")
          switch (issue.kind) {
          case "Warning":
            console.log(
                "  " + colors.white("[" + source + "]") + " " + colors.yellow("WARN") + " " + colors.yellow(issue.message)
              )
            break
          case "Violation":
            console.log(
                "  " + colors.white("[" + source + "]") + " " + colors.red("ERROR") + " " + colors.red(issue.message)
              )
            break
          }
        })
  
        var issueCountByKind = _.countBy(result.issues, function(issue) {
          return issue.kind
        })
  
        if (
          (issueCountByKind["Warning"] != undefined) &
            (issueCountByKind["Warning"] > 0) &
            validationOptions.throwOnWarnings ||
          (issueCountByKind["Violation"] != undefined) &
            (issueCountByKind["Violation"] > 0)
        ) {
          console.log("Exiting with code 1")
          process.exit(1)
        } else {
          console.log("Exiting with code 0")
          process.exit(0)
        }
      } else {
        console.log("  " + colors.white("[" + result.src + "]") + " " + colors.green(result.message))
      }
    })
})
