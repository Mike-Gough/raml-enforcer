# RAML Enforcer
RAML Enforcer is a command line tool for identifying and reporting on patterns found within RAML code. It supports:
* RAML 0.8
* RAML 1.0
* Includes
* Fragments

## Prerequisites

You will need the following things properly installed on your computer.

* [Git](https://git-scm.com/)
* [Node.js](https://nodejs.org/) (with npm)

## Installation

* `git clone https://github.com/Mike-Gough/raml-enforcer`
* `cd raml-enforcer`
* `npm install`

## Running
![Example start command](doco/img/linting-options-example.jpg?raw=true)
* `node raml-enforcer.js <main-api-file>`

### Linting Options
| Argument               | Description                                       |
|------------------------|---------------------------------------------------|
| --no-color             | do not use color in output                        |
| --no-includes          | do not report issues for include files            |
| --no-warnings          | do not report warnings                            |
| --no-errors            | do not report errors                              |
| --no-throw-on-warnings | do not exit with an exception when warnings occur |
| --no-throw-on-errors   | do not exit with an exception when errors occur   |

## Further Reading / Useful Links

* [raml.org](https://raml.org/)
