/**
 * Copyright 2013 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Portions come from the Oculus SDK.
 * @author benvanik
 */


/**
 * Oculus Rift effect.
 * @param {!THREE.WebGLRenderer} renderer Target.
 * @constructor
 */
THREE.MozOculusRiftEffect = function(renderer, camera, vrHMD) {
  /**
   * Target renderer.
   * @type {!THREE.WebGLRenderer}
   * @private
   */
  this.renderer_ = renderer;
  this.vrHMD_ = vrHMD;

  this.cameraLeft_ = camera.clone();
  this.cameraRight_ = camera.clone();

  // Initialize the renderer (with defaults).
  this.init_();
};


/**
 * Initializes the scene for rendering.
 * This is called whenever the device changes.
 * @param {!vr.HmdInfo} info HMD info.
 * @private
 */
THREE.MozOculusRiftEffect.prototype.init_ = function() {
  var vrHMD = this.vrHMD_;
  var cameraLeft = this.cameraLeft_;
  var cameraRight = this.cameraRight_;
  var leftTx = vrHMD.getEyeTranslation("left");
  var rightTx = vrHMD.getEyeTranslation("right");
  this.renderer_.autoClear = false;
  this.renderer_.setSize(1280, 800);
  cameraLeft.projectionMatrix = FovToProjection(vrHMD.getRecommendedEyeFieldOfView("left"));
  cameraRight.projectionMatrix = FovToProjection(vrHMD.getRecommendedEyeFieldOfView("right"));
  cameraLeft.position.add(new THREE.Vector3(leftTx.x, leftTx.y, leftTx.z));
  cameraRight.position.add(new THREE.Vector3(rightTx.x, rightTx.y, rightTx.z));
  vrHMD.xxxToggleElementVR(this.renderer_.domElement);
  this.renderer_.domElement.mozRequestFullScreen({ vrDisplay: vrHMD });
};
/**
 * Renders the scene to both eyes.
 * @param {!THREE.Scene} scene Three.js scene.
 * @param {!THREE.Camera} camera User camera. This is treated as the neck base.
 * @param {vr.VRState} vrstate VR state, if active.
 */
THREE.MozOculusRiftEffect.prototype.render = function(scene, camera, vrstate) {
  var renderer = this.renderer_;
  renderer.clear();
  //renderer.enableScissorTest(true);

  // Grab camera matrix from user.
  // This is interpreted as the head base.
  if (camera.matrixAutoUpdate) {
   camera.updateMatrix();
  }
  var eyeWorldMatrix = camera.matrixWorld.clone();

  // Rotate by Oculus data.
  if (vrstate) {
    var quat = new THREE.Quaternion(
      vrstate.hmd.rotation[1],
      vrstate.hmd.rotation[2],
      vrstate.hmd.rotation[3],
      vrstate.hmd.rotation[0]
    );
    var rotMat = new THREE.Matrix4();
    //rotMat.makeRotationFromQuaternion(quat);
    //eyeWorldMatrix.multiply(rotMat);
    this.cameraLeft_.matrix.set(eyeWorldMatrix);
    this.cameraRight_.matrix.set(eyeWorldMatrix);
    this.cameraLeft_.setRotationFromQuaternion(quat);
    this.cameraRight_.setRotationFromQuaternion(quat);
  }

  // render right eye
  renderer.setViewport(0, 0, 640, 800);
  renderer.setScissor(0, 0, 640, 800);
  renderer.render(scene, this.cameraLeft_);

  // render right eye
  renderer.setViewport(640, 0, 640, 800);
  renderer.setScissor(640, 0, 640, 800);
  renderer.render(scene, this.cameraRight_);

};
