cp cloudprojectmarker/marking/*.js .aws-sam/build/CloudProjectMarkerFunction/marking
cp cloudprojectmarker/app.js .aws-sam/build/CloudProjectMarkerFunction/
sam local invoke -e events/event.json CloudProjectMarkerFunction