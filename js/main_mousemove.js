import { scene, camera, renderer, canvas } from 'modules/scene-dev';
import { raycast } from 'modules/events';
import { getXYZ, getLatLng, getTween } from 'modules/helpers';
import { geodecoder, mapTexture, memoize } from 'modules/geo-helpers';

d3.json('data/world.json', function (err, data) {
  var world, earth, sphere, overlay, currentCountry;
  var segments = 200; // increase for better accuracy
  var countries = topojson.feature(data, data.objects.countries);
  var geo = geodecoder(countries.features);
  var textureCache = memoize(function (cntryID, fill, color) {
    var country = geo.find(cntryID);
    
    return mapTexture(country, fill, color);
  }); 
  // Add image texture
  world  = THREE.ImageUtils.loadTexture('images/2_no_clouds_4k.jpg');
  earth  = new THREE.MeshBasicMaterial({map: world, transparent: true});
  sphere = new THREE.SphereGeometry(200, segments, segments);
  var globe = new THREE.Mesh(sphere, earth);
  globe.rotation.y = Math.PI;
  globe.scale.set(2.75, 2.75, 2.75);
  globe.addEventListener('click', onGlobeClick);
  globe.addEventListener('mousemove', onGlobeMousemove);
  // add country outlines
  world  = mapTexture(countries, false);
  earth  = new THREE.MeshBasicMaterial({map: world, transparent: true});
  sphere = new THREE.SphereGeometry(200, segments, segments);
  var outlines = new THREE.Mesh(sphere, earth);
  outlines.rotation.y = Math.PI;
  outlines.scale.set(2.75, 2.75, 2.75);
  // create a container node and add the two meshes
  var root = new THREE.Object3D();
  root.add(globe);
  root.add(outlines);
  scene.add(root);
  function getPoint(event) {
    // Get the vertices
    var a = this.geometry.vertices[event.face.a];
    var b = this.geometry.vertices[event.face.b];
    var c = this.geometry.vertices[event.face.c];
    // Averge them together
    var point = new THREE.Vector3();
    point.x = (a.x + b.x + c.x) / 3;
    point.y = (a.y + b.y + c.y) / 3;
    point.z = (a.z + b.z + c.z) / 3;
    return point
  }
  function onGlobeClick(event) {
    // Get pointc, convert to latitude/longitude
    var latlng = getLatLng(getPoint.call(this, event));
    // Get new camera position
    var temp = new THREE.Mesh()
    temp.position.copy(getXYZ(latlng, 900));
    temp.lookAt(root.position);
    temp.rotateY(Math.PI);
    var tweenPos = getTween.call(camera, 'position', temp.position);
    d3.timer(tweenPos);
    var tweenRot = getTween.call(camera, 'rotation', temp.rotation);
    d3.timer(tweenRot);
  }
  function onGlobeMousemove(event) {
    var map, material;
    // Get pointc, convert to latitude/longitude
    var latlng = getLatLng(getPoint.call(this, event));
    // Look for country at that latitude/longitude
    var country = geo.search(latlng[0], latlng[1]);
    if (country !== null && country.code !== currentCountry) {
      // Track the current country displayed
      currentCountry = country.code;
      // Update the html 
      d3.select("#info")
        .html('<h2>' + country.code + '</h2>');
       // Overlay the selected country
      map = textureCache(country.code, true, 'blue');
      material = new THREE.MeshBasicMaterial({map: map, transparent: true});
      if (!overlay) {
        overlay = new THREE.Mesh(new THREE.SphereGeometry(201, 40, 40), material);
        overlay.rotation.y = Math.PI;
        overlay.scale.set(2.75, 2.75, 2.75);
        scene.add(overlay);
      } else {
        overlay.material = material;
      }
    }
  }
  
  window.camera = camera;
  raycast(camera, [globe], 'click');
  raycast(camera, [globe], 'mousemove', 10);
});
function animate() {
  requestAnimationFrame(animate);
  render();
}
function render() {
  renderer.render(scene, camera);
}
animate();