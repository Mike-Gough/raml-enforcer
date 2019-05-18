workflow "Build on push" {
  on = "push"
  resolves = [
    "Push Docker image with build number",
    "Push Docker image with build number 1",
    "Push Docker image with latest",
    "Archive release"
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

# Filter for master branch
action "Filter for master" {
  uses = "actions/bin/filter@master"
  needs = ["Build Docker Image"]
  args = "branch master"
}

action "Tag Docker Image with build number" {
  uses = "actions/docker/cli@8cdf801b322af5f369e00d85e9cf3a7122f49108"
  needs = ["Filter for master"]
  args = "tag raml-enforcer mikeyryan/raml-enforcer:$GITHUB_SHA"
}

action "Push Docker image with build number" {
  uses = "actions/docker/cli@8cdf801b322af5f369e00d85e9cf3a7122f49108"
  needs = ["Tag Docker Image with build number"]
  args = "push mikeyryan/raml-enforcer:$GITHUB_SHA"
}

# Filter for master branch
action "Filter for tag" {
  uses = "actions/bin/filter@master"
  needs = ["Build Docker Image"]
  args = "tag v*"
}

action "Tag Docker Image with build number 1" {
  uses = "actions/docker/cli@8cdf801b322af5f369e00d85e9cf3a7122f49108"
  needs = ["Filter for tag"]
  args = "tag raml-enforcer mikeyryan/raml-enforcer:$GITHUB_SHA"
}

action "Push Docker image with build number 1" {
  uses = "actions/docker/cli@8cdf801b322af5f369e00d85e9cf3a7122f49108"
  needs = ["Tag Docker Image with build number 1"]
  args = "push mikeyryan/raml-enforcer:$GITHUB_SHA"
}

action "Tag Docker Image with latest" {
  uses = "actions/docker/cli@8cdf801b322af5f369e00d85e9cf3a7122f49108"
  needs = ["Filter for tag"]
  args = "tag raml-enforcer mikeyryan/raml-enforcer:latest"
}

action "Push Docker image with latest" {
  uses = "actions/docker/cli@8cdf801b322af5f369e00d85e9cf3a7122f49108"
  needs = ["Tag Docker Image with latest"]
  args = "push mikeyryan/raml-enforcer:latest"
}

# Install Dependencies
action "NPM install" {
  uses = "actions/npm@e7aaefe"
  needs = "Filter for tag"
  args = "install"
}

# Build
action "NPM Build" {
  uses = "actions/npm@e7aaefe"
  needs = ["NPM install"]
  args = "run build"
}

# Create Release ZIP archive
action "Archive release" {
  uses = "lubusIN/actions/archive@master"
  needs = ["NPM Build"]
  env = {
    ZIP_FILENAME = "raml-enforcer"
  }
}
