workflow "Build" {
  on = "push"
  resolves = [
    "Push Docker image with latest",
    "Push Docker image with build number",
  ]
}

action "Authenticate with Docker Registry" {
  uses = "actions/docker/login@master"
  secrets = ["DOCKER_USERNAME", "DOCKER_PASSWORD"]
}

action "Build Docker Image" {
  uses = "actions/docker/cli@8cdf801b322af5f369e00d85e9cf3a7122f49108"
  needs = ["Authenticate with Docker Registry"]
  args = "build -f Dockerfile --tag raml-enforcer ."
}

action "Tag Docker Image with build number" {
  uses = "actions/docker/cli@8cdf801b322af5f369e00d85e9cf3a7122f49108"
  needs = ["Build Docker Image"]
  args = "tag raml-enforcer mikeyryan/raml-enforcer:$GITHUB_SHA"
}

action "Tag Docker Image with latest" {
  uses = "actions/docker/cli@8cdf801b322af5f369e00d85e9cf3a7122f49108"
  needs = ["Build Docker Image"]
  args = "tag raml-enforcer mikeyryan/raml-enforcer:latest"
}

action "Push Docker image with latest" {
  uses = "actions/docker/cli@8cdf801b322af5f369e00d85e9cf3a7122f49108"
  needs = ["Tag Docker Image with latest"]
  args = "push mikeyryan/raml-enforcer:latest"
}

action "Push Docker image with build number" {
  uses = "actions/docker/cli@8cdf801b322af5f369e00d85e9cf3a7122f49108"
  needs = ["Tag Docker Image with build number"]
  args = "push mikeyryan/raml-enforcer:$GITHUB_SHA"
}

