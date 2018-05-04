/**
 * @author mrdoob / http://mrdoob.com
 * @author stewdio / http://stewd.io
 */

THREE.TrackedController = function ( id ) {

  THREE.Object3D.call( this );

  var scope = this;
  var gamepad;

  var axes = [ 0, 0 ];
  var thumbpadIsPressed = false;
  var triggerIsPressed = false;
  var gripsArePressed = false;
  var menuIsPressed = false;

  var geometrySphere = new THREE.SphereGeometry( 0.05, 32, 32 );
  var materialSphere = new THREE.MeshBasicMaterial( {color: 0x517ecb} );
  var sphere = new THREE.Mesh( geometrySphere, materialSphere );
  this.add( sphere );

  var geometryTooltip = new THREE.PlaneGeometry( 0.30, 0.030 );
  var materialTooltip = new THREE.MeshBasicMaterial( { map: generateTexture() } );
  var tooltip = new THREE.Mesh( geometryTooltip, materialTooltip );
  tooltip.position.set(0, 0.1, 0);

  var tooltipPivot = new THREE.Object3D();
  tooltipPivot.rotation.set(-Math.PI / 4, 0, 0);
  tooltipPivot.add( tooltip );
  this.add( tooltipPivot );

  function findGamepad( id ) {

    // Iterate across gamepads as Vive Controllers may not be
    // in position 0 and 1.

    var gamepads = navigator.getGamepads && navigator.getGamepads();

    for ( var i = 0, j = 0; i < gamepads.length; i ++ ) {

      var gamepad = gamepads[ i ];

      if ( gamepad && gamepad.id ) {

        if ( j === id ) return gamepad;

        j ++;

      }

    }

  }

  this.matrixAutoUpdate = false;
  this.standingMatrix = new THREE.Matrix4();

  this.getGamepad = function () {

    return gamepad;

  };

  this.isAnyButtonPressed = function ( button ) {

    if (!gamepad) { return false; }

    for (var i = 0; i < gamepad.buttons.length; i++) {
      if (gamepad.buttons[i].pressed) { return true; }
    }

    return false;

  };

  this.update = function () {

    gamepad = findGamepad( id );

    if ( gamepad !== undefined && gamepad.pose !== undefined ) {

      if ( gamepad.pose === null ) return; // No user action yet

      //  Position and orientation.

      var pose = gamepad.pose;

      if ( pose.position !== null ) scope.position.fromArray( pose.position );
      if ( pose.orientation !== null ) scope.quaternion.fromArray( pose.orientation );
      scope.matrix.compose( scope.position, scope.quaternion, scope.scale );
      scope.matrix.premultiply( scope.standingMatrix ); 
      scope.matrixWorldNeedsUpdate = true;
      scope.visible = true;

    } else {

      scope.visible = false;

    }

    if ( scope.isAnyButtonPressed() ) {

      materialSphere.color.set(0x86ebe1);

    } else {

      materialSphere.color.set(0x517ecb);

    }

  };

  function generateTexture() {

    var canvas = document.createElement( 'canvas' );
    var PI2 = Math.PI * 2;

    canvas.width = 1000;
    canvas.height = 100;

    var context = canvas.getContext( '2d' );
    context.fillStyle="#444444";
    context.fillRect(0, 0, 1000, 100);
    context.font="85px Helvetica";
    context.fillStyle="#FFFFFF";
    context.fillText("Press any button to next", 35, 80);
    return new THREE.CanvasTexture( canvas );
  }

};

THREE.TrackedController.prototype = Object.create( THREE.Object3D.prototype );
THREE.TrackedController.prototype.constructor = THREE.TrackedController;
