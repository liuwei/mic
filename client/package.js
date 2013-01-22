  


Package.describe({
  summary: "three.js - lightweight 3D library with a very low level of complexity"
});

Package.on_use(function (api) {
  api.add_files('three.js', 'client');
  api.add_files('TrackballControls.js', 'client');
});

