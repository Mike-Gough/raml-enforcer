#!/usr/bin/env node
"use strict"

var validationOptions = require("./validation-options.json") // linter configuration
var pkg = require("./package.json") // NPM package configuration
var webApiParser = require("webapi-parser").WebApiParser // RAML parser
var commander = require("commander") // Command line argument parser
var colors = require("colors") // Colors and styles for console
var _ = require("lodash") // lodash library
var path = require("path")
var fs = require("fs") // Node.js File System Module

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
var codesWithoutAResponseBody = ['204']

function writeSchemaToFile(payload, filePath) {

  const id = decodeURIComponent(payload.id)
  const filename = id.substring(id.indexOf("end-points//") + "end-points//".length)
  const outputPath = path.dirname(filePath) + "/schemas/"
  const completePath = outputPath + filename.replace(/\//g, "_") + ".schema"

  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath)
  }

  fs.writeFileSync(completePath, payload.schema.toJsonSchema, function(err) {
    if (err) throw err
    console.log("Saved!")
  })
}

_.forEach(commander.args, filePath => {
  webApiParser.raml10
    .parse(`file://${filePath}`)
    .catch(error => {
      throw [createIssue('Parser', error.mz, "Violation")]
    })
    .then(webApiBaseUnit => {
      baseUnit = webApiBaseUnit
      return webApiParser.raml10.validate(baseUnit)
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
          issues.push(createIssue(filePath, "API should have a title", "Error"))
        }

        // Validate that the API has a description
        if (_.isEmpty(api.description.value())) {
          issues.push(createIssue(filePath, "The API should have a description", "Warning"))
        }

        // Validate that all resources have a description
        function validateEndpoints(endpoint, location) {
          const endpointLocation = filePath + ":" + endpoint.position.start.line + ":" + endpoint.position.start.column;

          if (location !== _.toLower(location)) {
            issues.push(createIssue(endpointLocation, "The endpoint " + location + " should be in lower case", "Warning"))
          }
          
          if (_.isEmpty(endpoint.description.value())) {
            issues.push(createIssue(endpointLocation, "The endpoint " + location + " must have a description", "Violation"))
          }

          _.forEach(endpoint.operations, operation => {
            const operationLocation = filePath + ":" + operation.position.start.line + ":" + operation.position.start.column;

            if (_.isEmpty(operation.description.value())) {
              issues.push(createIssue(operationLocation, "The " + operation.method + " operation for the endpoint "+ location + " should have a description", "Warning"))
            }

            _.forEach(operation.responses, response => {
              const responseLocation = filePath + ":" + response.position.start.line + ":" + response.position.start.column;

              if (_.isEmpty(response.payloads) && !_.includes(codesWithoutAResponseBody, response.statusCode.value())) {

                issues.push(createIssue(responseLocation, "The endpoint " + response.statusCode.value() + " " + location + " must have a response payload defined", "Violation"))
              } else if (!_.isEmpty(response.payloads) && _.includes(codesWithoutAResponseBody, response.statusCode.value())) {

                issues.push(createIssue(responseLocation, "The endpoint " + response.statusCode.value() + " " + location + " must not return a payload" + location, "Violation"))
              } else if (!_.isEmpty(response.payloads)) {

                _.forEach(response.payloads, payload => {
                  writeSchemaToFile(payload, filePath)
                })
              } else if (!_.includes(codesWithoutAResponseBody, response.statusCode.value())) {

                issues.push(createIssue(responseLocation, "The endpoint " + response.statusCode.value() + " " + location + " should return a payload" + location, "Warning"))
              }
            })

            if (!_.isEmpty(operation.request) && !_.isEmpty(operation.request.payloads)) {
              _.forEach(operation.request.payloads, payload => {
                writeSchemaToFile(payload, filePath)
              })
            }
          })

          _.each(endpoint.endPoints, function(childEndpoint) {
            validateEndpoints(childEndpoint, location + childEndpoint.path.value())
          })
        }

        _.each(api.endPoints, function(endpoint) {
          validateEndpoints(endpoint, endpoint.path.value())
        })
      }

      if (!_.isEmpty(issues)) {
        throw issues
      }

      return {
        src: filePath,
        message: "Valid"
      }
    })
    .then((result) => {
      console.log("  " + colors.white("[" + result.src + "]") + " " + colors.green(result.message))
    })
    .catch((issues) => {
      issues.forEach(issue => {
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

      var issueCountByKind = _.countBy(issues, function(issue) {
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
    })
})
