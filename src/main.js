import '../style.css'
import * as THREE from 'three';
import * as dat from 'dat.gui';
import SceneManager from './sceneManager/scene';
import gsap from 'gsap';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { DotScreenPass } from 'three/examples/jsm/postprocessing/DotScreenPass.js';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/**
 * Shader pass
 */
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/examples/jsm/shaders/RGBShiftShader.js';
import { LuminosityShader } from 'three/examples/jsm/shaders/LuminosityShader.js';
import { PixelShader } from 'three/examples/jsm/shaders/PixelShader.js';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


const gui = new dat.GUI();
gui.closed = true;
const debugObject = {};

/**
 * Scene
 */
const canvas = document.querySelector('#canvas');
const scene = new SceneManager(canvas);
let conf = { color : '#a48c5d' }; 
scene.addOrbitControl();

/**
 * DOM loading bar
 */
const loadingElement = document.querySelector('.loading-bar');

/**
 * Loader Manager
 */
let sceneReady = false;
const loadingManager = new THREE.LoadingManager(
	// Loaded
	() => {
		gsap.delayedCall(0.5,() => {
			gsap.to(overlayMaterials.uniforms.uAlpha, {duration:3,value:0, delay:1 });
			loadingElement.classList.add('ended');
			loadingElement.style.transform = '';
		});
		gsap.delayedCall(2,()=>{
			sceneReady = true;
		})
	},
	// Processing
	(itemUrl, itemsLoaded,itemsTotal) => {
		const progressRatio = itemsLoaded / itemsTotal;
		loadingElement.style.transform = `scaleX(${progressRatio})`;
	}
);

/**
 * Raycaster
 */
const raycaster = new THREE.Raycaster();

/**
 * Points of interest
 */
const points = [
	{
		position:new THREE.Vector3(1.55, 0.3, 3),
		element: document.querySelector('.point-0')
	},
	{
		position:new THREE.Vector3(-2.55, 1.3, 2),
		element: document.querySelector('.point-1')
	},
	{
		position:new THREE.Vector3(0, -1, -5),
		element: document.querySelector('.point-2')
	}
]


/**
 * Overlay
 */
 const overlayGeometry = new THREE.PlaneBufferGeometry(2,2,1,1);
 const overlayMaterials = new THREE.ShaderMaterial({
	 transparent:true,
	 uniforms:{
		 uAlpha: { value: 1 },
	 },
	 vertexShader:`
		 void main(){
			 gl_Position = vec4(position, 1.0);
		 }
	 `,
	 fragmentShader:`
		 uniform float uAlpha;
 
		 void main(){
			 gl_FragColor = vec4(0.0, 0.0, 0.0, uAlpha);
		 }
	 `
 })
 const overlayMesh = new THREE.Mesh(overlayGeometry,overlayMaterials);
 scene.add(overlayMesh);


/**
 * Lights
 */
 const directionalLight = new THREE.DirectionalLight(0xFFFFFF,3);
 directionalLight.position.set(10,2,0);
 directionalLight.castShadow = true;
 directionalLight.shadow.camera.top = 10;
 directionalLight.shadow.camera.right = 10;
 directionalLight.shadow.camera.left = - 10;
 directionalLight.shadow.camera.bottom = - 10;
 directionalLight.shadow.mapSize.width = 1024; 
 directionalLight.shadow.mapSize.height = 1024; 
 directionalLight.shadow.camera.near = 1; 
 directionalLight.shadow.camera.far = 20; 
 scene.add(directionalLight);

const guiLight = gui.addFolder('Light'); 
guiLight.add(directionalLight,'intensity').min(0).max(10).step(0.001).name('Intensity');
guiLight.add(directionalLight.position,'x').min(-5).max(5).step(0.001).name('X');
guiLight.add(directionalLight.position,'y').min(-5).max(5).step(0.001).name('Y');
guiLight.add(directionalLight.position,'z').min(-5).max(5).step(0.001).name('Z');


/**
 * Environment Map
 */
const environmentMap = new THREE.CubeTextureLoader(loadingManager).load([
	'./environment/2/px.png',
	'./environment/2/nx.png',
	'./environment/2/py.png',
	'./environment/2/ny.png',
	'./environment/2/pz.png',
	'./environment/2/nz.png',
])
scene.scene.background = environmentMap;
scene.scene.environment = environmentMap;
environmentMap.encoding = THREE.sRGBEncoding;

/**
 * Update Renderer
 */
scene.renderer.outputEncoding = THREE.sRGBEncoding;
scene.renderer.toneMappingExposure = 3;

const toneMappingGui = gui.addFolder('ToneMapping');
toneMappingGui.add(scene.renderer, 'toneMappingExposure').min(0).max(10).step(0.001);
toneMappingGui.add(scene.renderer, 'toneMapping', {
	No: THREE.NoToneMapping,
	Linear : THREE.LinearToneMapping,
	Reinhard : THREE.ReinhardToneMapping,
	Cineon : THREE.CineonToneMapping,
	ACESfilmic :THREE.ACESFilmicToneMapping	
}).onFinishChange(() => {
	scene.renderer.toneMapping = Number(scene.renderer.toneMapping);
	updateAllMaterial();
})

/**
 * Update Materials
 */
function updateAllMaterial(){
	scene.scene.traverse((child) => {
		if(child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial){
			// child.material.envMap = environmentMap;
			child.material.envMapIntensity = debugObject.envMapIntensity;
			child.castShadow = true;
			child.receiveShadow = true;
		}
	})
}
debugObject.envMapIntensity = 1;
gui.add(debugObject, 'envMapIntensity').min(0).max(10).step(0.001).onChange(updateAllMaterial);

/**
 * GLTF Loader
 * Model
 */
const gltfLoader = new GLTFLoader(loadingManager);
gltfLoader.load('./model/DamagedHelmet/DamagedHelmet.gltf',(gltf) => {
		gltf.scene.scale.set(5,5,5);
		// gltf.scene.position.set(0,-4,0);
		scene.add(gltf.scene);
		gui.add(gltf.scene.rotation,'y').min(- Math.PI).max(Math.PI).step(0.001).name('rotation');

		updateAllMaterial();
	}
)


/**
 * Post Processing
 */
let RenderTargetClass = null;

if(scene.renderer.getPixelRatio() === 1 && scene.renderer.capabilities.isWebGL2){
	RenderTargetClass = THREE.WebGLMultisampleRenderTarget;
}else{
	RenderTargetClass = THREE.WebGLRenderTarget;
}

const renderTarget = new RenderTargetClass(
	800,
	600,
	{
		minFilter:THREE.LinearFilter,
		magFilter:THREE.LinearFilter,
		format:THREE.RGBAFormat,
		encoding:THREE.sRGBEncoding
	}
)

const effectComposer = new EffectComposer(scene.renderer,renderTarget);
effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
effectComposer.setSize(window.innerWidth,window.innerHeight);

const renderPass = new RenderPass(scene.scene, scene.camera);
effectComposer.addPass(renderPass);

/**
 * Effects / Pass
 */
const dotScreenPass = new DotScreenPass();
dotScreenPass.enabled = false;
effectComposer.addPass(dotScreenPass);

const dotScreenGui = gui.addFolder('dotScreenPass');
dotScreenGui.add(dotScreenPass, 'enabled');

const glitchPass = new GlitchPass();
glitchPass.enabled = false;
effectComposer.addPass(glitchPass);

const glitchPassGui = gui.addFolder('GlitchPass');
glitchPassGui.add(glitchPass, 'enabled');

const rgbShifPass = new ShaderPass(RGBShiftShader);
rgbShifPass.enabled = false;
effectComposer.addPass(rgbShifPass);

const rgbShifPassGui = gui.addFolder('rgbShifPass');
rgbShifPassGui.add(rgbShifPass, 'enabled');

const luminosityShader = new ShaderPass(LuminosityShader);
luminosityShader.enabled = false;
effectComposer.addPass(luminosityShader);

const luminosityShaderGui = gui.addFolder('luminosityShader');
luminosityShaderGui.add(luminosityShader, 'enabled');

const unrealBloomPass = new UnrealBloomPass();
unrealBloomPass.enabled = false;
unrealBloomPass.strength = 0.3;
unrealBloomPass.radius = 1;
unrealBloomPass.threshold = 0.6;
effectComposer.addPass(unrealBloomPass);

const unrealBloomPassGui = gui.addFolder('UnrealBloomPass');
unrealBloomPassGui.add(unrealBloomPass, 'enabled');
unrealBloomPassGui.add(unrealBloomPass, 'strength').min(0).max(2).step(0.001);
unrealBloomPassGui.add(unrealBloomPass, 'radius').min(0).max(2).step(0.001);
unrealBloomPassGui.add(unrealBloomPass, 'threshold').min(0).max(2).step(0.001);

let params = {
	pixelSize: 6
};

const pixelPass = new ShaderPass(PixelShader);
pixelPass.enabled = false;
pixelPass.uniforms[ "resolution" ].value = new THREE.Vector2( window.innerWidth, window.innerHeight );
pixelPass.uniforms[ "resolution" ].value.multiplyScalar( window.devicePixelRatio );
pixelPass.uniforms[ "pixelSize" ].value = params.pixelSize;
effectComposer.addPass(pixelPass);


const pixelPassGui = gui.addFolder('pixelPass');
pixelPassGui.add(pixelPass, 'enabled');
pixelPassGui.add(params, 'pixelSize').min( 2 ).max( 32 ).step( 2 ).onFinishChange(() => {
	pixelPass.uniforms[ "pixelSize" ].value = params.pixelSize;
});


/**
 *  Antialias
 */
if(scene.renderer.getPixelRatio() === 1 && !scene.renderer.capabilities.isWebGL2){
	const smaaPass = new SMAAPass();
	effectComposer.addPass(smaaPass);
}


/**
 * Animate
 */
const clock = new THREE.Clock();
let previousTime = 0;

const animate = () => {
	const elapsedTime = clock.getElapsedTime();
	const deltaTime =  elapsedTime - previousTime; 
	previousTime = elapsedTime;


	/**
	 * HTML/Css Point
	 */
	if(sceneReady){
		for(let point of points)
		{
			const screenPosition = point.position.clone();
			screenPosition.project(scene.camera);
	
			// update the picking ray with the camera and mouse position
			raycaster.setFromCamera(screenPosition, scene.camera);
			const intersects = raycaster.intersectObjects(scene.scene.children,true);
	
			if(intersects.length === 0){
				point.element.classList.add('visible');
			}else{
				const intersectionDistance = intersects[0].distance;
				const pointDistance = point.position.distanceTo(scene.camera.position);
	
				if(intersectionDistance < pointDistance){
					point.element.classList.remove('visible');
				}else{
					point.element.classList.add('visible');
				}
			
			}
			
			const translateX = screenPosition.x * window.innerWidth * 0.5;
			const translateY = - screenPosition.y * window.innerHeight * 0.5;
			point.element.style.transform = `translate(${translateX}px,${translateY}px)`
	
		}
	}
	

	/**
	 * Post Processing
	 */
	effectComposer.render();
	
	// scene.onUpdate();
	scene.onUpdateStats();
	requestAnimationFrame( animate );
};

animate();