import Ember from "ember";

var UploadController = Ember.Controller.extend({
  session: Ember.inject.service('session'),
  wrongExt: false,
  outOfSpace: false,
  userHasEnteredData: false,
  submitDisabled: false,
  enoughQuotas: false,

  actions : {
    upload: function() {
      var _this = this;
      this.setProperties({
        wrongExt: false,
        outOfSpace: false,
      });

      var host = this.store.adapterFor('upload-app').get('host'),
      namespace = this.store.adapterFor('upload-app').namespace,
      postUrl = [ host, namespace ].join('/');
      const headers = {};

      this.get('session').authorize('authorizer:django', (headerName, headerValue) => {
      headers[headerName] = headerValue;
      });

      var data = new FormData(document.getElementById("upload-app-form"));

      var progress = document.getElementById('progress');
      var progress_text = document.getElementById('progress_text');
      var progress_bar = document.getElementById('progress_bar');
      var submit_button = document.getElementById('submit-button');
      progress.innerHTML =  '';
      progress.style.width = 0;
      progress_text.innerHTML = '';
      progress.className = "progress-bar progress-bar-striped active";
      progress_bar.hidden=true;

      var file = document.getElementById("file");
      var res = file.value.split(".");
      var ext = res[res.length-1];
      var project_name = document.getElementById('project-name').value;
      var pithos_space = this.get('model.userOkeanosProjects').findBy('name', project_name).get('pithos_space');
      var file_size = file.files[0].size;
      if (pithos_space < file_size) {
        this.set('fileSize', file_size);
        this.set('outOfSpace', true);
      }
      else if (ext !== "jar")
      {
        this.set("wrongExt", true);
      }
      else {
      progress_bar.hidden=false;
      Ember.$.ajax({
        url: postUrl,
        headers: headers,
        method: 'POST',
        processData: false,
        contentType: false,
        data: data,
        xhr: function()
        {
          var xhr = new window.XMLHttpRequest();
          _this.set("userHasEnteredData", true);
          submit_button.setAttribute("disabled", "disabled");
          _this.set("submitDisabled", true);
          //Upload progress
          xhr.upload.addEventListener("progress", function(evt){
            if (evt.lengthComputable) {
              var percentComplete = evt.loaded / evt.total;
              progress.style.width = percentComplete * 100 + '%';
              progress_text.innerHTML =  Math.floor(percentComplete * 100) + '%';
              if (percentComplete === 1)
              {
                submit_button.removeAttribute("disabled");
                _this.set("submitDisabled", false);
                _this.set("userHasEnteredData", false);
              }
            }
          }, false);
          return xhr;
        },
        success: function(response){
          progress.className = "progress-bar progress-bar-success";
          progress.innerHTML =  'Success.Your request to upload the application has been sent.';
          _this.transitionToRoute('lambda-app', response.data[0].id).catch(function() {
            _this.transitionToRoute('lambda-apps.index').then(function(newRoute) {
              newRoute.controller.set('message', 'Your lambda application upload will begin shortly.');
              newRoute.controller.set('request', true);
              newRoute.controller.send('dismiss_message');
            });
          });
        },
        statusCode: {
          400: function (response) {
            progress.clasName = "progress-bar progress-bar-danger";
            var error_detail = response.responseJSON.errors[0].detail;
            if (error_detail === 'The specified file name already exists.') {
              progress.innerHTML = error_detail + ' Try another application.';
            }
            else {
              progress.innerHTML = 'Failure. Your request to upload the application has failed. Try another application.';
            }
            progress_text.innerHTML = '';
          }
        },
        error: function() {
          progress.className = "progress-bar progress-bar-danger";
          progress.innerHTML =  'Your request to application the file has been rejected. Please try again later.';
          progress_text.innerHTML =  '';
        }
      });
      }
    },
  },

});

export default UploadController;
