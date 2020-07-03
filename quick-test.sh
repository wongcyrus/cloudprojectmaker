cp cloudprojectmarker/marking/*.js .aws-sam/build/CloudProjectMarkerFunction/marking
cp cloudprojectmarker/*.js .aws-sam/build/CloudProjectMarkerFunction/
sam local invoke -e events/event.json --env-vars env.json CloudProjectMarkerFunction