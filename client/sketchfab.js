Template.leaderboard.geometries = function () {
    return Geometries.find();
};

Template.leaderboard.rendered = function () {

    var self = this;
    container = self.find(".model");
    container.appendChild( renderer.domElement );

}

Template.leaderboard.selected_name = function () {
    var geometry = Geometries.findOne(Session.get("selected_name"));
    return geometry && geometry.name;
};

Template.geometry.selected = function () {
    return Session.equals("selected_name", this._id) ? "selected" : '';
};

//function getObjectById(objectId) {
//    Router.setGeometry(objectId);
////    Session.set("selected_name", objectId);
//
//}

Template.geometry.events({
    'click':function () {
        var objectId = this._id;
        Router.setGeometry(objectId);
    },

    'click .destroy': function () {
        var that = this;
        var fpfile = { url: that.url};
        filepicker.remove(this.url, function(){
            console.log("Removed");
            Geometries.remove(that._id);
        });
//        filepicker.read(fpfile, function(FPFile){
//
//        });

    }

});

Template.leaderboard.events({
    'click #picker':function(){
        filepicker.pick(
            function(FPFile){
                var newModel = Geometries.insert({
                    "name" : FPFile.filename,
                    "type": "ascii",
                    "scale": "",
                    "url" :  FPFile.url
                });
                Router.setGeometry(newModel);
            }
        );

    }
});

////////// Tracking selected list in URL //////////

var SketchRouter = Backbone.Router.extend({
    routes: {
        ":selected_name": "main"
    },
    main: function (selected_name) {
        Session.set("selected_name", selected_name);
    },
    setGeometry: function (selected_name) {
        this.navigate(selected_name, true);
        var geometry = Geometries.findOne(selected_name);

        var json1 = new Object();
        json1.urlBaseType = "relativeToHTML";
        json1.objects = {};
        json1.geometries = {};
        json1.materials = {};

        json1.objects[geometry.name] = {
            "geometry":geometry.name,
            "material" : "flamingo",
            "position":[ 0, 0, 0 ],
            "rotation":[ 0, 0, 0 ],
            "scale":[ geometry.scale, geometry.scale, geometry.scale ],
            "visible":true,
            "mirroredLoop":true,
            "properties":{
                "rotating":true,
                "rotateY":true
            }
        };
        json1.objects["light1"] = {
            "type":"DirectionalLight",
            "direction":[ 0, 1, 1 ],
            "color":16777215,
            "intensity":1
        };
        json1.objects["camera1"] = {
            "type":"PerspectiveCamera",
            "fov":50,
            "aspect":1.33333,
            "near":1,
            "far":1000,
            "position":[ 0, 0, 100 ],
            "target":[ 0, 0, 0 ]
        };

        json1.geometries[geometry.name] = {
            "type":geometry.type,
            "url":geometry.url
        };

        json1.materials["flamingo"] = {
            "type": "MeshPhongMaterial",
            "parameters": {
                color: 0xffffff,
                specular: 0xffffff,
                shininess: 20,
                morphTargets: true,
                morphNormals: true,
                vertexColors: THREE.FaceColors,
                shading: THREE.SmoothShading
            }
        };

        json1.materials["flamingo1"] = {
            "type": "MeshLambertMaterial",
            "parameters": { color: 0xffffff, morphTargets: true, morphNormals: true, vertexColors: THREE.FaceColors, shading: THREE.FlatShading }};

        json1.defaults = {
            "bgcolor":[255, 255, 255],
            "bgalpha":1,
            "camera":"camera1"
        };

        loader.parse(json1, callbackFinished, geometry.url);
    }
});

Router = new SketchRouter;

Meteor.startup(function () {
    Backbone.history.start({pushState: true});
});



var container;

var camera, scene, loaded;
var renderer;

var rotatingObjects = [];
var morphAnimatedObjects = [];

var clock = new THREE.Clock();

init();

function $( id ) {

    return document.getElementById( id );

}

function init() {
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.domElement.style.position = "relative";
    renderer.gammaInput = true;
    renderer.gammaOutput = true;
    renderer.physicallyBasedShading = true;

    loader = new THREE.SceneLoader();

    window.addEventListener( 'resize', onWindowResize, false );

}

//function handle_update( result, pieces ) {
//
////    refreshSceneView( result );
//    //renderer.initWebGLObjects( result.scene );
//
//    var m, material, count = 0;
//
//    for ( m in result.materials ) {
//
//        material = result.materials[ m ];
//        if ( ! ( material instanceof THREE.MeshFaceMaterial || material instanceof THREE.ShaderMaterial || material.morphTargets ) ) {
//
//            if( !material.program ) {
//
//                renderer.initMaterial( material, result.scene.__lights, result.scene.fog );
//
//                count += 1;
//
//                if( count > pieces ) {
//
//                    //console.log("xxxxxxxxx");
//                    break;
//
//                }
//
//            }
//
//        }
//
//    }
//
//}

function callbackFinished( result ) {
//    $( "message" ).style.display = "none";
//    $( "progressbar" ).style.display = "none";

    camera = result.currentCamera;
    camera.aspect = container.clientWidth/container.clientHeight;
    camera.updateProjectionMatrix();

    controls = new THREE.TrackballControls( camera, renderer.domElement );
    controls.target.set( 0, 0, 0 );

    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;

    controls.noZoom = false;
    controls.noPan = false;

    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.15;

    controls.keys = [ 65, 83, 68 ];

    scene = result.scene;

    renderer.setSize(container.clientWidth, container.clientHeight);
//    renderer.setClearColor( result.bgColor, result.bgAlpha );

    scene.traverse( function ( object ) {

        if (object.geometry) {

            morphColorsToFaceColors(object.geometry);
            object.geometry.computeMorphNormals();



            if (object.geometry.boundingSphere) {
                var radius = object.geometry.boundingSphere.radius;
                Geometries.update({"name" : object.name}, {"$set" :{"scale" : 50/radius}});
            }


        }

        if ( object.properties.rotating === true ) {

            rotatingObjects.push( object );

        }

        if ( object instanceof THREE.MorphAnimMesh ) {

            morphAnimatedObjects.push( object );

        }

        if ( object instanceof THREE.SkinnedMesh ) {

            if ( object.geometry.animation ) {

                THREE.AnimationHandler.add( object.geometry.animation );

                var animation = new THREE.Animation( object, object.geometry.animation.name );
                animation.JITCompile = false;
                animation.interpolationType = THREE.AnimationHandler.LINEAR;

                animation.play();

            }

        }

    } );
    animate();
}


function morphColorsToFaceColors( geometry ) {

    if ( geometry.morphColors && geometry.morphColors.length ) {

        var colorMap = geometry.morphColors[ 0 ];

        for ( var i = 0; i < colorMap.colors.length; i ++ ) {

            geometry.faces[ i ].color = colorMap.colors[ i ];

        }

    }

}






function onWindowResize() {

    camera.aspect = container.clientWidth/container.clientHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( container.clientWidth, container.clientHeight);
    controls.handleResize();

}

function animate() {

    requestAnimationFrame( animate );

    render();
}

function render() {

    var delta = clock.getDelta();

    controls.update();

    // update skinning

    THREE.AnimationHandler.update( delta * 1 );

    for ( var i = 0; i < rotatingObjects.length; i ++ ) {

        var object = rotatingObjects[ i ];

        if ( object.properties.rotateX ) object.rotation.x += 1 * delta;
        if ( object.properties.rotateY ) object.rotation.y += 0.5 * delta;

    }

    for ( var i = 0; i < morphAnimatedObjects.length; i ++ ) {

        var object = morphAnimatedObjects[ i ];

        object.updateAnimation( 1000 * delta );

    }

    renderer.render( scene, camera );
}


