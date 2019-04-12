pipeline {

	agent {
		label 'master'
	}

	stages {

		stage('Check dependencies') {
			steps {
				timeout(time: 1, unit: 'MINUTES') {
					script {
						sh 'sudo /usr/bin/docker version'
					}
				}
			}
		}

		stage('Build Image') {
			steps {
				timeout(time: 15, unit: 'MINUTES') {
					withCredentials([usernamePassword(credentialsId: 'http-proxy-creds', usernameVariable: 'HTTP_PROXY_USERNAME', passwordVariable: 'HTTP_PROXY_PASSWORD')]) {
						script {
							sh 'sudo /usr/bin/docker rmi -f raml-enforcer | true'
							sh 'sudo /usr/bin/docker build --no-cache --build-arg HTTP_PROXY_USERNAME=$HTTP_PROXY_USERNAME --build-arg HTTP_PROXY_PASSWORD=$HTTP_PROXY_PASSWORD --tag "raml-enforcer" .'
							sh 'sudo /usr/bin/docker tag "raml-enforcer" "cdc-aphmv-dev.comsuper.int/docker-customer-platforms/raml-enforcer:$BUILD_NUMBER"'
							sh 'sudo /usr/bin/docker tag "raml-enforcer" "cdc-aphmv-dev.comsuper.int/docker-customer-platforms/raml-enforcer:latest"'
						}
					}
				}
			}
		}

		stage('Publish Image') {
			when {
				branch 'develop'
			}
			steps {
				timeout(time: 5, unit: 'MINUTES') {
					script {
					  sh 'unset HTTP_PROXY'
						sh 'unset HTTPS_PROXY'
					  sh 'sudo /usr/bin/docker push "cdc-aphmv-dev.comsuper.int/docker-customer-platforms/raml-enforcer:$BUILD_NUMBER"'
					  sh 'sudo /usr/bin/docker push "cdc-aphmv-dev.comsuper.int/docker-customer-platforms/raml-enforcer:latest"'
					}
				}
			}
		}

		stage('Cleanup') {
			steps {
				timeout(time: 5, unit: 'MINUTES') {
					script {
					  sh 'sudo /usr/bin/docker rmi "cdc-aphmv-dev.comsuper.int/docker-customer-platforms/raml-enforcer:$BUILD_NUMBER" || true'
						sh 'sudo /usr/bin/docker rmi "cdc-aphmv-dev.comsuper.int/docker-customer-platforms/raml-enforcer:latest" || true'
						sh 'sudo /usr/bin/docker rmi "raml-enforcer" || true'
					}
				}
			}
		}
	}
}
