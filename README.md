# RAML Enforcer
The Linting utility for RESTful API Modelling Language (RAML).

## Welcome
RAML Enforcer is a command line tool for identifying and reporting on patterns found within RAML code. It currently supports RAML 1.0.

## Running RAML Enforcer
### Prerequisites
Depending on your development environment, you will need either [Docker](https://www.docker.com) or [Git](https://git-scm.com/) and [Node.js](https://nodejs.org/) ```(^8.10.0)``` to be properly installed on your computer before RAML Enforcer can be run.

### Running using Docker
1. Navigate to the directory containing your RAML Service Contract.
2. Execute RAML Enforcer by running the following command, replacing ```<main-raml-file-path>``` with the path to your main RAML file inside the current directory:
```
sudo docker run --init --rm --volume $(pwd):/tmp "mikeyryan/raml-enforcer:latest" /tmp/<main-raml-file-path>
```

### Running from source code
1. Clone the source code repository:
  ```git clone https://github.com/Mike-Gough/raml-enforcer```
1. Navigate to the cloned folder:
  ```cd raml-enforcer```
1. Install the project dependancies using NPM:
  ```npm install```
1. Execute RAML Enforcer by running the following command, replacing ```<main-raml-file-path>``` with the path to your main RAML file inside the current directory:
  ```
  node raml-enforcer.js <main-raml-file-path>
  ```

## Configuration
RAML Enforcer allows you to pass *Linting options* as arguments to the command line to change the rules it will apply. Below is a brief description of the available arguments and their purpose:

| Argument                                   | Description                                                                          |
|--------------------------------------------|--------------------------------------------------------------------------------------|
| --no-color                                 | do not use color in output                                                           |
| --throw-on-warnings                        | exit with an exception when warnings occur                                           |

## Further reading
* [RAML Enforcer - Official Docker Image](https://cloud.docker.com/u/mikeyryan/repository/docker/mikeyryan/raml-enforcer)
* [Linting RESTful API Modelling Language (RAML)](https://mike.gough.me/posts/linting/raml-enforcer/)
* [Creating a docker image to run a Node.js script](https://mike.gough.me/posts/docker/npm/create-image/)
* [Git pre-commit hook for Linting RESTful API Modelling Language (RAML)](https://mike.gough.me/posts/linting/raml-enforcer/git/hooks/)

## Useful links
* [raml.org](https://raml.org/)
* [webapi-parser](https://raml-org.github.io/webapi-parser/js/index.html)
* [lodash](https://lodash.com)
* [commander](https://github.com/tj/commander.js)
* [color](https://github.com/Qix-/color)
