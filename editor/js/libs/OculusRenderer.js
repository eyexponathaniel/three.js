THREE.OculusRenderer = function(options) {

	var glRenderer = new THREE.WebGLRenderer(options);
	var attr;
	for(attr in glRenderer) {
		if ( glRenderer.hasOwnProperty(attr) ) {
			this[attr] = glRenderer[attr];
		}
	}

	this.vrModeEnabled = false;
	this.render_ = this.render;

	this.render = function(scene, camera, renderTarget, forceClear) {
		var vrModeEnabled = this.vrModeEnabled;

		if (vrModeEnabled && this.vrMode === 'MOZ') {
			this.renderMOZ.apply( this, arguments );
			return;
		}

		if (vrModeEnabled && this.vrMode === 'VRJS') {
			this.renderVRJS.apply( this, arguments );
			return;
		}

		this.render_.apply( this , arguments );
	};

	this.renderVRJS = function(scene, camera, renderTarget, forceClear) {
		var vrState = this.getVRJSOculusState();
		var info = vr.getHmdInfo() || vr.HmdInfo.DEFAULT;
		var nowPresent = vrState ? vrState.hmd.present : false;

		// Propagate camera options.
		var params = this.stereoRenderer_.getParams();
		params.setZNear(camera.near);
		params.setZFar(camera.far);

		// Grab camera matrix from user.
		// This is interpreted as the head base.
		if (camera.matrixAutoUpdate) {
			camera.updateMatrix();
		}
		var eyeWorldMatrix = camera.matrixWorld.clone();

		/*
		 * Simple head simulation:
		 *
		 *    Leye <--IPD--> Reye
		 *             ^
		 *             |
		 *   baseToEyeX/baseToEyeY
		 *             |
		 *           base
		 *
		 */
		// TODO(benvanik): head sim

		// Rotate by Oculus data.
		if (vrState) {
			var quat = new THREE.Quaternion(
					vrState.hmd.rotation[0],
					vrState.hmd.rotation[1],
					vrState.hmd.rotation[2],
					vrState.hmd.rotation[3]);
			var rotMat = new THREE.Matrix4();
			rotMat.setRotationFromQuaternion(quat);
			eyeWorldMatrix.multiply(rotMat);
		}

		// Shift around to the the eye center.
		function convertMatrix(source, target) {
			for (var n = 0; n < 16; n++) {
				target.elements[n] = source[n];
			}
		};

		// Render eyes.
		this.stereoRenderer_.render(vrState || this.dummyState_, function(eye) {
			var eyeCamera = this.eyeCamera_;
			convertMatrix(eye.projectionMatrix, eyeCamera.projectionMatrix);
			var viewAdjustMatrix = new THREE.Matrix4();
			convertMatrix(eye.viewAdjustMatrix, viewAdjustMatrix);
			eyeCamera.matrixWorld.multiplyMatrices(viewAdjustMatrix, eyeWorldMatrix);
			this.render_(scene, this.eyeCamera_, undefined, true);
		}, this);
	};

	this.renderMOZ = function(scene, camera, renderTarget, forceClear) {
		var vrState = this.getMOZOculusState();
		var cameraLeft;
		var cameraRight;
		var leftEyeTranslation = this.leftEyeTranslation;
		var rightEyeTranslation = this.rightEyeTranslation;
		//this.enableScissorTest(true);
		//this.clear();

		// Grab camera matrix from user.
		// This is interpreted as the head base.
		if (camera.matrixAutoUpdate) {
			camera.updateMatrix();
		}
		var eyeWorldMatrix = camera.matrixWorld.clone();

		cameraLeft = camera.clone();
		cameraRight = camera.clone();
		cameraLeft.projectionMatrix = FovToProjection(this.leftEyeFOV);
		cameraRight.projectionMatrix = FovToProjection(this.rightEyeFOV);
		cameraLeft.position.add(new THREE.Vector3(
			leftEyeTranslation.x, leftEyeTranslation.y, leftEyeTranslation.z));
		cameraRight.position.add(new THREE.Vector3(
			rightEyeTranslation.x, rightEyeTranslation.y, rightEyeTranslation.z));

		// Rotate by Oculus data.
		if (vrState) {
			var quat = new THREE.Quaternion(
				vrState.hmd.rotation[1],
				vrState.hmd.rotation[2],
				vrState.hmd.rotation[3],
				vrState.hmd.rotation[0]
			);
			var rotMat = new THREE.Matrix4();
			//rotMat.makeRotationFromQuaternion(quat);
			//eyeWorldMatrix.multiply(rotMat);
			cameraLeft.matrix.set(eyeWorldMatrix);
			cameraRight.matrix.set(eyeWorldMatrix);
			cameraLeft.setRotationFromQuaternion(quat);
			cameraRight.setRotationFromQuaternion(quat);
		}

		// render right eye
		this.setViewport(0, 0, 640, 800);
		this.setScissor(0, 0, 640, 800);
		this.render_(scene, cameraLeft);

		// render right eye
		this.setViewport(640, 0, 640, 800);
		this.setScissor(640, 0, 640, 800);
		this.render_(scene, cameraRight);

	};

	this.initMOZ = function(vrHMD) {
		this.vrHMD = vrHMD;
		this.leftEyeTranslation = vrHMD.getEyeTranslation("left");
		this.rightEyeTranslation = vrHMD.getEyeTranslation("right");
		this.leftEyeFOV = vrHMD.getRecommendedEyeFieldOfView("left");
		this.rightEyeFOV = vrHMD.getRecommendedEyeFieldOfView("right");
	};

	this.initVRJS = function() {
		// VR JS Specific stuff
		this.stereoRenderer_ = new vr.StereoRenderer(this.getContext(), {
			alpha: false,
			depth: true,
			stencil: false
		});
		this.dummyState_ = new vr.State();
		this.eyeCamera_ = new THREE.PerspectiveCamera();
		this.eyeCamera_.matrixAutoUpdate = false;
	};

	this.configure = function( done ) {
		var self = this;
		if (navigator.mozGetVRDevices) {
			this.vrMode = 'MOZ';
			this.getVRState = this.getMOZOculusState;
			navigator.mozGetVRDevices(gotVRDevices);
		} else {
			this.getVRState = this.getVRJSOculusState;
			if (!vr.isInstalled()) {
				alert('Neither NPVR plugin nor native support are available!');
			}
			vr.load(vrJSLoaded);
		}
		function gotVRDevices(devices) {
			for (var i = 0; i < devices.length; ++i) {
				if (devices[i] instanceof PositionSensorVRDevice) {
					self.vrState = devices[i];
				}
				if (devices[i] instanceof HMDVRDevice) {
					self.initMOZ(devices[i]);
				}
			}
			if (done) {
				done();
			}
		}
		function vrJSLoaded(error) {
			if (error) {
				alert('Plugin load failed: ' + error.toString());
			}
			self.initVRJS();
			self.vrMode = 'VRJS';
			self.vrState = new vr.State();
			if (done) {
				done();
			}
		}
	};

	this.getMOZOculusState = function() {
		var orientation = this.vrState.getState().orientation;
		var state = {
			hmd : {
				present : true,
				rotation : [
					orientation.w,
					orientation.x,
					orientation.y,
					orientation.z
				]
			}
		};
		return state;
	};

	this.getVRJSOculusState = function() {
		var polled = vr.pollState(this.vrState);
		var state = polled? this.vrState : null;
		return state;
	};

	this.enableVRMode = function( enable ) {
		this.vrModeEnabled = !!enable;
		if (this.vrModeEnabled) {
			this.setSize(1280, 800);
			if (this.vrMode === 'MOZ') {
				this.vrHMD.xxxToggleElementVR(this.domElement);
				this.domElement.mozRequestFullScreen({ vrDisplay: this.vrHMD });
			}
		}
	};

};