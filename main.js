/*
*  Copyright (c) 2020 Steve Seguin. All Rights Reserved.
*
*  Use of this source code is governed by the APGLv3 open-source license
*  that can be found in the LICENSE file in the root of the source
*  tree. Alternative licencing options can be made available on request.
*
*/
/*jshint esversion: 6 */

var formSubmitting = true;
var activatedPreview = false;


// function log(msg){ // uncomment to enable logging.
	// console.log(msg);
// }
// function warnlog(msg, url=false, lineNumber=false){
	// onsole.warn(msg);
	// if (lineNumber){
		// console.warn(lineNumber);
	// }
// }
// function errorlog(msg, url=false, lineNumber=false){
	// console.error(msg);
	// if (lineNumber){
		// console.error(lineNumber);
	// }
// }

function addEventToAll(targets, trigger, callback) { // js helper
	const target = document.querySelectorAll(targets);
	var triggers = trigger.split(" ");
	for (let i = 0; i < target.length; i++) {
		for (let j = 0; j < triggers.length; j++) {
			setTimeout(function(t1,t2){
				t1.addEventListener(t2, function(e) {
					callback(e, t1);
				});
			},0,target[i],triggers[j]);
		}
	}
}

function mapToAll(targets, callback, parentElement = document) { // js helper
	if (!targets) {
		return;
	}
	if (!parentElement) {
		return;
	}
	const target = parentElement.querySelectorAll(targets);
	for (let i = 0; i < target.length; i++) {
		callback(target[i]);
	}
}

var isIFrame = false;
if ( parent && (window.location !== window.parent.location )) {
	isIFrame = true;
}

function changeParam(url, paramName, paramValue) {
	paramName = paramName.replace("?", "");
	var qind = url.indexOf('?');
	url = url.replace("?", "&");
	var params = url.substring(qind + 1).split('&');
	var query = '';
	var match = false;
	for (var i = 0; i < params.length; i++) {
		var tokens = params[i].split('=');
		var name = tokens[0];
		var value = "";
		if (tokens.length > 1 && tokens[1] !== '') {
			value = tokens[1];
		}

		if (name == paramName) {
			if (match) {
				continue;
			} // already matched the first time.
			match = true;
			value = paramValue;
		}
		if (value !== "") {
			value = '=' + value;
		}

		if (query == '') {
			query = "?" + name + value;
		} else {
			query = query + '&' + name + value;
		}
	}
	return url.substring(0, qind) + query;
}

function updateURL(param, force = false, cleanUrl = false) {
	param = param.replace("?", "");
	var para = param.split('=');
	if (cleanUrl) {
		if (history.pushState) {
			var href = new URL(cleanUrl);
			if (para.length == 1) {
				href = changeParam(cleanUrl, para[0], "");
			} else {
				href = changeParam(cleanUrl, para[0], para[1]);
			}
			log("--" + href.toString());
			window.history.pushState({path: href.toString()}, '', href.toString());
		}
	} else if (!(urlParams.has(para[0]))) { // don't need to replace as it doesn't exist.
		if (history.pushState) {
			var href = window.location.href;
			href = href.replace("??", "?");
			var arr = href.split('?');
			var newurl;
			if (arr.length > 1 && arr[1] !== '') {
				newurl = href + '&' + param;
			} else {
				newurl = href + '?' + param;
			}

			window.history.pushState({path: newurl.toString()}, '', newurl.toString());
		}
	} else if (force) {
		if (history.pushState) {
			var href = new URL(window.location.href);
			if (para.length == 1) {
				href = changeParam(window.location.href, para[0], "");
			} else {
				href = changeParam(window.location.href, para[0], para[1]);
			}
			log("---" + href.toString());
			window.history.pushState({path: href.toString()}, '', href.toString());
		}
	}
	if (session.sticky) {
		setCookie("settings", encodeURI(window.location.href), 90);
	}
	urlParams = new URLSearchParams(window.location.search);
}

function changeGuestSettings(ele){
	var eles = ele.querySelectorAll('[data-param]');
	var UUID = ele.dataset.UUID;
	var settings = {};
	for (var i = 0;i< eles.length; i++){
		if (eles[i].tagName.toLowerCase() == "input"){
			if (eles[i].checked===true){
				settings[eles[i].dataset.param] = true
			} else if (eles[i].checked===false){
				settings[eles[i].dataset.param] = false;
			} else {
				settings[eles[i].dataset.param] = eles[i].value;
			}
		}
	}
	warnlog(settings);
	
	if (!settings.changepassword){
		delete settings.password;
	}
	
	delete settings.changepassword;
	
	if (!settings.changeroom){
		// send Migration message
		delete settings.roomid;
	} 
	delete settings.roomid;
	delete settings.changeroom;
	
	warnlog(UUID);
	var msg = {};
	msg.changeParams = settings;
	session.sendRequest(msg, UUID);
	closeModal();
}

// proper room migration needs to happen; in sync.
// updateMixer after settings changed
// password needs to be special cased
// room shouldn't be sent

function applyNewParams(changeParams){
	for (var key in changeParams){
		session[key] = changeParams[key];
		log(key);
	}
	log(changeParams);
	updateMixer();
}

function promptUser(eleId, UUID=null){
	if (document.getElementById("modalBackdrop")){
		getById("promptModal").innerHTML = ''; // Delete modal
		getById("promptModal").remove();
		getById("modalBackdrop").innerHTML = ''; // Delete modal
		getById("modalBackdrop").remove();
	}
	
	zindex = 30 + document.querySelectorAll('#promptModal').length;
	modalTemplate =
	`<div id="promptModal" style="z-index:${zindex + 2}">	
		<div class="promptModalInner">
			<span class='modalClose' onclick="closeModal()">×</span>
			<span id='promptModalMessage'></span>
		</div>
	</div>
	<div id="modalBackdrop" style="z-index:${zindex + 1}"></div>`;
	document.body.insertAdjacentHTML("beforeend", modalTemplate); // Insert modal at body end
	
	getById("promptModalMessage").innerHTML = getById(eleId).innerHTML;
	if (UUID){
		getById("promptModalMessage").dataset.UUID = UUID;
	}
	
	
	document.getElementById("modalBackdrop").addEventListener("click", closeModal);

	getById("promptModal").addEventListener("click", function(e) {
		e.stopPropagation();
		return false;
	});
	
}
var warnUserTimeout=null;
function warnUser(message, timeout=false){
	// Allows for multiple alerts to stack better.
	// Every modal and backdrop has an increasing z-index
	// to block the previous modal
	if (document.getElementById("modalBackdrop")){
		getById("alertModal").innerHTML = ''; // Delete modal
		getById("alertModal").remove();
		getById("modalBackdrop").innerHTML = ''; // Delete modal
		getById("modalBackdrop").remove();
	}
	
	zindex = 31 + document.querySelectorAll('.alertModal').length;
	message = message.replace(/\n/g,"<br />");
	modalTemplate =
	`<div class="alertModal" id="alertModal"  style="z-index:${zindex + 2}">	
		<div class="alertModalInner">
			<span class='modalClose' onclick="closeModal()">×</span>
			<span class='alertModalMessage'>${message}</span>
		</div>
	</div>
	<div id="modalBackdrop" style="z-index:${zindex + 1}"></div>`;
	document.body.insertAdjacentHTML("beforeend", modalTemplate); // Insert modal at body end
	
	document.getElementById("modalBackdrop").addEventListener("click", closeModal);
	
	clearTimeout(warnUserTimeout);
	if (timeout){
		warnUserTimeout = setTimeout(closeModal, timeout);
	}
	getById("alertModal").addEventListener("click", function(e) {
		e.stopPropagation();
		return false;
	});
	
}
function closeModal(){
	getById("modalBackdrop").innerHTML = ''; // Delete modal
	getById("modalBackdrop").remove();
	getById("alertModal").innerHTML = ''; // Delete modal
	getById("alertModal").remove();
	getById("promptModal").innerHTML = ''; // Delete modal
	getById("promptModal").remove();
}

var filename = false;
try {
	filename = window.location.pathname.substring(window.location.pathname.lastIndexOf('/') + 1);
	filename = filename.replace("??", "?");
	filename2 = filename.split("?")[0];
	// split at ???
	if (filename.split(".").length == 1) {
		if (filename2.length < 2) { // easy win
			filename = false;
		} else if (filename.startsWith("&")) { // easy win
			var tmpHref = window.location.href.substring(0, window.location.href.lastIndexOf('/')) + "/?" + filename.split("&").slice(1).join("&");
			log("TMP " + tmpHref);
			updateURL(filename.split("&")[1], true, tmpHref);
			filename = false;
		} else if (filename2.split("&")[0].includes("=")) {
			log("asdf  " + filename.split("&")[0]);
			if (history.pushState) {
				var tmpHref = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
				tmpHref = tmpHref + "/?" + filename;
				filename = false;
				//warnUser("Please ensure your URL is correctly formatted.");
				window.history.pushState({path: tmpHref.toString()}, '', tmpHref.toString());
			}
		} else {
			filename = filename2.split("&")[0];
			if (filename2 != filename) {
				warnUser("Warning: Please ensure your URL is correctly formatted.");
			}
		}
	} else {
		filename = false;
	}
	log(filename);
} catch (e) {
	errorlog(e);
}


(function(w) {
	w.URLSearchParams = w.URLSearchParams || function(searchString) {
		var self = this;
		searchString = searchString.replace("??", "?");
		self.searchString = searchString;
		self.get = function(name) {
			var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(self.searchString);
			if (results == null) {
				return null;
			} else {
				return decodeURI(results[1]) || 0;
			}
		};
	};

})(window);

var urlEdited = window.location.search.replace(/\?\?/g, "?");
urlEdited = urlEdited.replace(/\?/g, "&");
urlEdited = urlEdited.replace(/\&/, "?");

if (urlEdited !== window.location.search){
	warnlog(window.location.search + " changed to " + urlEdited);
	window.history.pushState({path: urlEdited.toString()}, '', urlEdited.toString());
}
var urlParams = new URLSearchParams(urlEdited);

var sanitizeStreamID = function(streamID) {
	streamID = streamID.trim();

	if (streamID.length < 1) {
		streamID = session.generateStreamID(8);
		if (!(session.cleanOutput)) {
			warnUser("No streamID was provided; one will be generated randomily.\n\nStream ID: " + streamID);
		}
	}
	var streamID_sanitized = streamID.replace(/[\W]+/g, "_");
	if (streamID !== streamID_sanitized) {
		if (!(session.cleanOutput)) {
			warnUser("Info: Only AlphaNumeric characters should be used for the stream ID.\n\nThe offending characters have been replaced by an underscore");
		}
	}
	if (streamID_sanitized.length > 24) {
		streamID_sanitized = streamID_sanitized.substring(0, 24);
		if (!(session.cleanOutput)) {
			warnUser("The Stream ID should be less than 25 alPhaNuMeric characters long.\n\nWe will trim it to length.");
		}
	}
	return streamID_sanitized;
};

var checkStrength = function(string) {
	var matcher = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{7,30}$/;
	if (string.match(matcher)) {
		return true;
	} else if (string.length > 20) {
		return true;
	} else {
		return false;
	}
};

var checkStrengthRoom = function() {
	var result1 = checkStrength(getById('videoname1').value);
	var result2 = getById('passwordRoom').value.length;
	var target = getById('securityLevelRoom');
	target.style.display = "block";
	if (result1) {
		if (result2) {
			target.innerHTML = "<font style='color:green'>Share only with those you trust</font>";
		} else {
			target.innerHTML = "<font style='color:#e67202;'>A password is recommended</font>";
		}
	} else {
		target.innerHTML = "<font style='color:red'>Insecure room name.</font> Allowed chars: <i>A-Z, a-z, 0-9, _</i>";
	}
};

var sanitizeChat = function(string) {
	var temp = document.createElement('div');
	temp.innerText = string;
	temp.innerText = temp.innerHTML;
	temp = temp.textContent || temp.innerText || "";
	temp = temp.substring(0, Math.min(temp.length, 500));
	return temp.trim();
};

var sanitizeString = function(str) {
	str = str.replace(/[^a-z0-9áéíóúñü \.,_-]/gim, "");
	return str.trim();
};

var sanitizeLabel = function(string) {
	let temp = document.createElement("div");
	temp.innerText = string;
	temp.innerText = temp.innerHTML;
	temp = temp.textContent || temp.innerText || "";
	temp = temp.substring(0, Math.min(temp.length, 50));
	return temp.trim();
};

var sanitizeRoomName = function(roomid) {
	roomid = roomid.trim();
	if (roomid === "") {
		return roomid;
	} else if (roomid === false) {
		return roomid;
	}

	var sanitized = roomid.replace(/[\W]+/g, "_");
	if (sanitized !== roomid) {
		if (!(session.cleanOutput)) {
			warnUser("Info: Only AlphaNumeric characters should be used for the room name.\n\nThe offending characters have been replaced by an underscore");
		}
	}
	if (sanitized.length > 30) {
		sanitized = sanitized.substring(0, 30);
		if (!(session.cleanOutput)) {
			warnUser("The Room name should be less than 31 alPhaNuMeric characters long.\n\nWe will trim it to length.");
		}
	}
	return sanitized;
};

var sanitizePassword = function(passwrd) {
	if (passwrd === "") {
		return passwrd;
	} else if (passwrd === false) {
		return passwrd;
	} else if (passwrd === null) {
		return passwrd;
	}
	passwrd = passwrd.trim();
	if (passwrd.length < 1) {
		if (!(session.cleanOutput)) {
			warnUser("The password provided was blank.");
		}
	}
	var sanitized = encodeURIComponent(passwrd);//.replace(/[\W]+/g, "_");
	//if (sanitized !== passwrd) {
	//	if (!(session.cleanOutput)) {
	//		warnUser("Info: Only AlphaNumeric characters should be used in the password.\n\nThe offending characters have been replaced by an underscore");
	//	}
	//}
	return sanitized;
};

function getChromeVersion() {
	var raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
	return raw ? parseInt(raw[2], 10) : false;
}

if (!(getChromeVersion()>=57)){
	getById("effectSelector").disabled=true;
	getById("effectSelector3").disabled=true;
	getById("effectSelector").title = "Effects are only support on Chromium-based browsers";
	getById("effectSelector3").title = "Effects are only support on Chromium-based browsers";
	var elements = document.querySelectorAll('[data-effectsNotice]')
	for (let i = 0; i < elements.length; i++) {
		elements[i].style.display = "inline-block";
	}
}

function safariVersion() {
	var ver = 0;
	try {
		ver = navigator.appVersion.split("Version/");
		if (ver.length > 1) {
			ver = ver[1].split(" Safari");
		}
		if (ver.length > 1) {
			ver = ver[0].split(".");
		}
		if (ver.length > 1) {
			ver = parseInt(ver[0]);
		} else {
			ver = 0;
		}
	} catch (e) {
		return 0;
	}
	return ver;
}

if (urlParams.has('optimize')) {
	session.optimize = parseInt(urlParams.get('optimize')) || 0;
}

if (window.obsstudio) {
	session.disableWebAudio = true; // default true; might be useful to disable on slow or old computers?
	session.audioMeterGuest = false;
	session.audioEffects = false;
	session.obsfix = 15; // can be manually set via URL.  ; VP8=15, VP9=30. (previous was 20.)
	try {
		log("OBS VERSION:" + window.obsstudio.pluginVersion);
		log("macOS: " + navigator.userAgent.indexOf('Mac OS X') != -1);
		log(window.obsstudio);

		if (!(urlParams.has('streamlabs'))) {

			var ver = window.obsstudio.pluginVersion;
			ver1 = ver.split(".");
			updateURL("streamlabs");
			var cefVersion = getChromeVersion();

			if (ver1.length == 3) { // Should be 3, but disabled3
				if ((ver1.length == 3) && (parseInt(ver1[0]) == 2) && (cefVersion < 76) && (navigator.userAgent.indexOf('Mac OS X') != -1)) {
					getById("main").innerHTML = "<div style='background-color:black;color:white;' data-translate='obs-macos-not-supported'><h1>Update OBS Studio to v26.1.2 or newer; older versions and StreamLabs OBS are not supported on macOS.\
					<br /><i><small><small>download here: <a href='https://github.com/obsproject/obs-studio/releases/tag/26.1.2'>https://github.com/obsproject/obs-studio/releases/tag/26.1.2</a></small></small></i>\
					</h1> <br /><br />\
					<h2>Please use the <a href='https://github.com/steveseguin/electroncapture'>Electron Capture app</a> if there are further problems or if you wish to use StreamLabs on macOS still.</h2>\
					<br />You can find more details <u><a href='https://github.com/steveseguin/obsninja/wiki/FAQ#mac-os'>within our wiki guide - https://github.com/steveseguin/obsninja/wiki/FAQ#mac-os</a></u></h2>\
					<br /> You can bypass this error message by refreshing, <a href='" + window.location.href + "'> Clicking Here,</a> or by adding <i>&streamlabs</i> to the URL, but it may still not actually work.\
					\
					<br /> Please report this problem to steve@seguin.email if you feel it is an error.\
					</div>";
				}
			}
		}
	} catch (e) {
		errorlog(e);
	}

	if (navigator.userAgent.indexOf('Mac OS X') != -1) {
		session.codec = "h264"; // default the codec to h264 if OBS and macOS
	}

	window.addEventListener('obsSceneChanged', function(event) {
		log("OBS EVENT");
		log(event.detail.name);

		window.obsstudio.getCurrentScene(function(scene) {
			log("OBS SCENE");
			log(scene);
		});

		window.obsstudio.getStatus(function(status) {
			log("OBS STATUS:");
			log(status);
		});
	});

}

window.onload = function winonLoad() { // This just keeps people from killing the live stream accidentally. Also give me a headsup that the stream is ending
	window.addEventListener("beforeunload", function(e) {
		try {
			session.ws.close();
			if (session.videoElement.recording) {
				session.videoElement.recorder.writer.close();
				session.videoElement.recording = false;
			}
			for (var i in session.rpcs) {
				if (session.rpcs[i].videoElement) {
					if (session.rpcs[i].videoElement.recording) {
						session.rpcs[i].videoElement.recorder.writer.close();
						session.rpcs[i].videoElement.recording = false;
					}
				}
			}
		} catch (e) {}
		//setTimeout(function(){session.hangup();},0);
		return undefined; // ADDED OCT 29th; get rid of popup. Just close the socket connection if the user is refreshing the page.  It's one or the other.

	});
};

getById("credits").innerHTML = "Version: " + session.version + " - " + getById("credits").innerHTML;

var lastTouchEnd = 0;
document.addEventListener('touchend', function(event) {
	var now = (new Date()).getTime();
	if (now - lastTouchEnd <= 300) {
		event.preventDefault();
	}
	lastTouchEnd = now;
}, false);


document.addEventListener('click', function(event) {
	if (session.firstPlayTriggered == false) {
		playAllVideos();
		session.firstPlayTriggered = true;
		history.pushState({}, '');
	}
});
var Callbacks = [];
var CtrlPressed = false; // global
var AltPressed = false;
document.addEventListener("keydown", event => {

	if ((event.ctrlKey) || (event.metaKey)) { // detect if CTRL is pressed
		CtrlPressed = true;
	} else {
		CtrlPressed = false;
	}
	if (event.altKey) {
		AltPressed = true;
	} else {
		AltPressed = false;
	}


	if (CtrlPressed && event.keyCode) {

		if (event.keyCode == 77) { // m
			if (event.metaKey) {
				if (AltPressed) {
					toggleMute(); // macOS
				}
			} else {
				toggleMute(); // Windows
			}
			// } else if (event.keyCode == 69) { // e 
			//	hangup();
		} else if (event.keyCode == 66) { // b
			toggleVideoMute();
		}
	}


});

document.addEventListener("keyup", event => {
	if (!((event.ctrlKey) || (event.metaKey))) {
		if (CtrlPressed) {
			CtrlPressed = false;
			for (var i in Callbacks) {
				var cb = Callbacks[i];
				log(cb.slice(1));
				cb[0](...cb.slice(1)); // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax#A_better_apply
			}
			Callbacks = [];
		}
	}
	if (!(event.altKey)) {
		AltPressed = false;
	}
});

window.onpopstate = function() {
	if (session.firstPlayTriggered) {
		window.location.reload(true);
	}
};

if (typeof session === 'undefined') { // make sure to init the WebRTC if not exists.
	var session = WebRTC.Media;
	session.streamID = session.generateStreamID();
	errorlog("Serious error: WebRTC session didn't load in time");
}

function makeDraggableElement(elmnt) {
	try {
		elmnt.dragElement = false;
		elmnt.style.bottom = "auto";
		elmnt.style.cursor = "grab";
		elmnt.stashonmouseup = null;
		elmnt.stashonmousemove = null;
		
	} catch (e) {
		errorlog(e);
		return;
	}

	var pos1 = 0;
	var pos2 = 0;
	var pos3 = 0;
	var pos4 = 0;
	
	function dragMouseDown(e) {
		e = e || window.event;
		e.preventDefault();
		
		pos3 = e.clientX;
		pos4 = e.clientY;
		elmnt.stashonmouseup = document.onmouseup; // I don't want to interfere with other drag events.
		elmnt.stashonmousemove = document.onmousemove;

		document.onmouseup = closeDragElement;
		document.onmousemove = elementDrag;
	}
	
	function elementDrag(e) {
		e = e || window.event;
		e.preventDefault();
		
		elmnt.dragElement = true;
		pos1 = pos3 - e.clientX;
		pos2 = pos4 - e.clientY;
		pos3 = e.clientX;
		pos4 = e.clientY;

		var topDrag = (elmnt.offsetTop - pos2);
		if (topDrag > -3) {
			topDrag = -3;
		}
		elmnt.style.top = topDrag + "px";
		elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
		
	}
	
	elmnt.onmousedown = dragMouseDown;
	function closeDragElement() {
		document.onmouseup = elmnt.stashonmouseup;
		document.onmousemove = elmnt.stashonmousemove;
	}
}

function setCookie(cname, cvalue, exdays) {
	var d = new Date();
	d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
	var expires = "expires=" + d.toUTCString();
	document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
	var name = cname + "=";
	var ca = document.cookie.split(';');
	for (var i = 0; i < ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0) == ' ') {
			c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
			return c.substring(name.length, c.length);
		}
	}
	return "";
}

if (getCookie("redirect") == "yes") {
	setCookie("redirect", "", 0);
	session.sticky = true;
} else if (getCookie("settings") != "") {
	session.sticky = confirm("Would you like you load your previous session's settings?");
	if (!session.sticky) {
		setCookie("settings", "", 0);
		log("deleting cookie as user said no");
	} else {
		var cookieSettings = decodeURI(getCookie("settings"));
		setCookie("redirect", "yes", 1);
		window.location.replace(cookieSettings);
	}
}
if (urlParams.has('sticky')) {
	if (getCookie("permission") == "") {
		session.sticky = confirm("Would you allow us to store a cookie to keep your session settings persistent?");
	} else {
		session.sticky = true;
	}
	if (session.sticky) {
		setCookie("permission", "yes", 999);
		setCookie("settings", encodeURI(window.location.href), 90);
	}
}

if (urlParams.has('retrytimeout')) {
	session.retryTimeout = parseInt(urlParams.get('retrytimeout'));
}

if (urlParams.has('ptz')){
	session.ptz=true;
}

var screensharebutton = true;
var screensharesupport = true;
if (urlParams.has('nosettings') || urlParams.has('ns')) {
	screensharebutton = false;
	session.showSettings = false;
}

if (urlParams.has('nomicbutton') || urlParams.has('nmb')) {
	getById("mutebutton").setAttribute('style', "display: none !important");
}


if (urlParams.has('novideobutton') || urlParams.has('nvb')) {
	getById("mutevideobutton").setAttribute('style', "display: none !important");
}

if (urlParams.has('screenshareid') || urlParams.has('ssid')) {
	if (urlParams.get('screenshareid') || urlParams.get('ssid')) {
		session.screenshareid = urlParams.get('screenshareid') || urlParams.get('ssid');
		session.screenshareid = sanitizeStreamID(session.screenshareid);
	}
}

if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
	//session.webcamonly = true;
	getById("shareScreenGear").style.display = "none";
	screensharebutton = false;
	screensharesupport = false;
	getById("container-2").className = 'column columnfade advanced'; // Hide screen share on mobile
	getById("dropButton").style.display = "none";
	//session.disableWebAudio = true; // default true; might be useful to disable on slow or old computers?
	session.audioEffects = false; // disable audio inbound effects also.
	session.audioMeterGuest = false;
	
} else if ((iOS) || (iPad)) {
	getById("shareScreenGear").style.display = "none";
	screensharebutton = false;
	screensharesupport = false;
	getById("container-2").className = 'column columnfade advanced'; // Hide screen share on mobile
	getById("dropButton").style.display = "none";
	//session.audiobitrate = false; // iOS devices seem to get distortion with custom audio bitrates.  Disable for now.
	//session.maxiosbitrate = 10; // this is 10-kbps by default already.
	//session.disableWebAudio = true; // default true; might be useful to disable on slow or old computers?
	session.audioEffects = false; // disable audio inbound effects also.
	session.audioMeterGuest = false;
} else {
	log("MAKE DRAGGABLE");
	setTimeout(function(){makeDraggableElement(document.getElementById("subControlButtons"));},100);
	
	if (safariVersion() && !getChromeVersion()){
		getById("SafariWarning").style.display = "block";
	}
}


if ((iOS) || (iPad)) {
	window.addEventListener('resize', function() {  // Safari is the new IE.
		var msg = {};
		msg.requestSceneUpdate = true;
		session.sendMessage(msg);
		
        if ( window.matchMedia("(orientation: portrait)").matches ) {
            document.getElementsByTagName("html")[0].style.height = "100vh";
            setTimeout(function(){
                document.getElementsByTagName("html")[0].style.height = "100%";
            }, 1000);
        } else if ( window.matchMedia("(orientation: landscape)").matches ) {
            document.getElementsByTagName("html")[0].style.height = "100vh";
            setTimeout(function(){
                document.getElementsByTagName("html")[0].style.height = "100%";
            }, 1000);
        }
    });
}

if (/CriOS/i.test(navigator.userAgent) && (iOS || iPad)) {
	if (!(session.cleanOutput)) {
		try {
			navigator.mediaDevices.getUserMedia;
		} catch (e) {
			warnUser("Chrome on this device does not support the required technology to use this site.\n\nPlease use Safari instead or update your iOS and browser version.");
		}
	}
}

if (urlParams.has('broadcast') || urlParams.has('bc')) {
	log("Broadcast flag set");
	session.broadcast = urlParams.get('broadcast') || urlParams.get('bc');
	//if ((iOS) || (iPad)) {
	//	session.nopreview = false;
	//} else {
	//	session.nopreview = true;
	//}
	session.minipreview = 2; // full screen if nothing else on screen.
	session.style = 1;
	getById("header").style.display = "none";
	getById("header").style.opacity = 0;
	session.showList=false;
}

if (urlParams.has('showlist')) {
	session.showList = urlParams.get('showlist');
	if (session.showList === "false") {
		session.showList = false;
	} else if (session.showList=== "0") {
		session.showList = false;
	} else if (session.showList === "no") {
		session.showList = false;
	} else if (session.showList === "off") {
		session.showList = false;
	} else {
		session.showList = true;
	}
}

var directorLanding = false;
if (urlParams.has('director') || urlParams.has('dir')) {
	directorLanding = urlParams.get('director') || urlParams.get('dir');
	if (directorLanding === null) {
		directorLanding = true;
	} else if (directorLanding.length === 0) {
		directorLanding = true;
	} else {
		directorLanding = false;
	}
} else if (filename === "director") {
	directorLanding = true;
	filename = false;
}

if (urlParams.has('rooms')) {
    session.rooms = urlParams.get('rooms').split(",").map(function(e) { 
        return sanitizeRoomName(e);
    });
	getById("rooms").classList.remove('advanced');
}

if (urlParams.has('showdirector')) {
	session.showDirector = true;
}

if (urlParams.has('midi') || urlParams.has('hotkeys')) {
	session.midiHotkeys = urlParams.get('midi') || urlParams.get ('hotkeys') || 1;
	session.midiHotkeys = parseInt(session.midiHotkeys);
}
var loadedQRCode = false;
function loadQR(){
	if (loadedQRCode==false){
		loadedQRCode=true;
		var script = document.createElement('script');
		script.src = "./thirdparty/qrcode.min.js"; // dynamically load this only if its needed. Keeps loading time down.
		document.head.appendChild(script);
	}
}

if (urlParams.has('webcam') || urlParams.has('wc')) {
	session.webcamonly = true;
	screensharebutton = false;
} else if (urlParams.has('screenshare') || urlParams.has('ss')) {
	session.screenshare = true;
} else if (urlParams.has('fileshare') || urlParams.has('fs')) {
	getById("container-5").classList.remove('advanced');
	getById("container-5").classList.add("skip-animation");
	getById("container-5").classList.remove('pointer');
} else if (directorLanding) {
	getById("container-1").classList.remove('advanced');
	getById("container-1").classList.add("skip-animation");
	getById("container-1").classList.remove('pointer');
} else if (urlParams.has('website') || urlParams.has('iframe')) {
	getById("container-6").classList.remove('advanced');
	getById("container-6").classList.add("skip-animation");
	getById("container-6").classList.remove('pointer');
}

if (urlParams.has('ssb')) {
	screensharebutton = true;
}

if (urlParams.has('mute') || urlParams.has('muted') || urlParams.has('m')) {
	session.muted = true;
}

if (urlParams.has('videomute') || urlParams.has('videomuted') || urlParams.has('vm')) {
	session.videoMutedFlag = true;
}


if (urlParams.has('deaf') || urlParams.has('deafen')) {
	session.directorSpeakerMuted=true; // false == true in this case.
}

if (urlParams.has('blind')) {
	session.directorDisplayMuted=true; // false == true in this case.
}


if (urlParams.has('dpi') || urlParams.has('dpr')) {
	session.devicePixelRatio = urlParams.get('dpi') || urlParams.get('dpr') || 2.0;
} //else if (window.devicePixelRatio && window.devicePixelRatio!==1){ 
//	session.devicePixelRatio = window.devicePixelRatio; // this annoys me to no end.
//}

if (urlParams.has('speakermute') || urlParams.has('mutespeaker') || urlParams.has('sm') || urlParams.has('ms')) {
	session.speakerMuted = true;
	getById("mutespeakertoggle").className = "las la-volume-mute my-float toggleSize";
	//getById("mutespeakerbutton").className="advanced float2 red";
	getById("mutespeakerbutton").classList.add("red");
	getById("mutespeakerbutton").classList.add("float2");
	getById("mutespeakerbutton").classList.remove("float");

	var sounds = document.getElementsByTagName("video");
	for (var i = 0; i < sounds.length; ++i) {
		sounds[i].muted = session.speakerMuted;
	}
}

if (urlParams.has('chatbutton') || urlParams.has('chat') || urlParams.has('cb')) {
	session.chatbutton = urlParams.get('chatbutton') || urlParams.get('chat') || urlParams.get('cb');
	if (session.chatbutton === "false") {
		session.chatbutton = false;
	} else if (session.chatbutton === "0") {
		session.chatbutton = false;
	} else if (session.chatbutton === "no") {
		session.chatbutton = false;
	} else if (session.chatbutton === "off") {
		session.chatbutton = false;
	} else {
		session.chatbutton = true;
		getById("chatbutton").classList.remove("advanced");
		getById("controlButtons").style.display = "inherit";
	}
}

if (session.screenshare == true) {
	getById("container-3").className = 'column columnfade advanced'; // Hide screen share on mobile
	getById("container-2").classList.add("skip-animation");
	getById("container-2").classList.remove('pointer');
}

if (urlParams.has('manual')) {
	session.manual = true;
}

if (urlParams.has('hands') || urlParams.has('hand')) {
	session.raisehands = true;
}

if (urlParams.has('portrait') || urlParams.has('916') || urlParams.has('vertical')) {
	session.aspectratio = 1; // 9:16  (default of 0 is 16:9)
} else if (urlParams.has('square') || urlParams.has('11')) {
	session.aspectratio = 2; // 9:16  (default of 0 is 16:9)
}

if (urlParams.has('record')) {
	if (safariVersion()) {
		if (!(session.cleanOutput)) {
			warnUser("Your browser or device is not supported. Try Chrome if on macOS.");
		}
	} else {
		session.recordLocal = urlParams.get('record');

		if (session.recordLocal !== parseInt(session.recordLocal)) {
			session.recordLocal = 6000;
		} else {
			session.recordLocal = parseInt(session.recordLocal);
		}
	}
}
if (urlParams.has('pcm')) {
	session.pcm = true;
}

if (urlParams.has('bigbutton')) {
	session.bigmutebutton = true;
	getById("mutebutton").style.width = "min(40vh,40vw)";
	getById("mutebutton").style.height = "min(40vh,40vw)";
	getById("mutetoggle").style.width = "min(40vh,40vw)";
	getById("mutetoggle").style.height = "min(40vh,40vw)";

}

if (urlParams.has('scene')) {
	session.scene = parseInt(urlParams.get('scene')) || 0;
	session.disableWebAudio = true;
	session.audioEffects = false;
	session.audioMeterGuest = false;
}
if (session.scene>1){ // scene =0 and 1 should load instantly.
	session.hiddenSceneViewBitrate = 0; // By default this is ~ 400kbps, but if you have 10 scenes, i don't want to kill things.
}

if (urlParams.has('scenetype') || urlParams.has('type')) {
	session.sceneType = parseInt(urlParams.get('scenetype')) || parseInt(urlParams.get('type')) || false;
}

if (urlParams.has('mediasettings')) {
	session.forceMediaSettings = true;
}


if (urlParams.has('transcript') || urlParams.has('transcribe') || urlParams.has('trans')) {
	session.transcript = urlParams.get('transcript') || urlParams.get('transcribe') || urlParams.get('trans') || "en-US";
}


if (urlParams.has('cc') || urlParams.has('closedcaptions') || urlParams.has('captions')) {
	session.closedCaptions = true;
}

if (session.webcamonly == true) {
	getById("container-2").className = 'column columnfade advanced'; // Hide screen share on mobile
	getById("container-3").classList.add("skip-animation");
	getById("container-3").classList.remove('pointer');
	setTimeout(function() {
		previewWebcam();
	}, 100);
}

if (urlParams.has('css')){
	var cssURL = urlParams.get('css');
	cssURL = decodeURI(cssURL);
	log(cssURL);
	var cssStylesheet = document.createElement('link');
	cssStylesheet.rel = 'stylesheet';
	cssStylesheet.type = 'text/css';
	cssStylesheet.media = 'screen';
	cssStylesheet.href = cssURL;
	document.getElementsByTagName('head')[0].appendChild(cssStylesheet);
	
	cssStylesheet.onload = function() {
		getById("main").classList.remove('hidden');
		log("loaded remote style sheet");
	}

	cssStylesheet.onerror = function() {
		getById("main").classList.remove('hidden');
		errorlog("REMOTE STYLE SHEET HAD ERROR");
	}
	
} else {
	getById("main").classList.remove('hidden');
}

if (urlParams.has('password') || urlParams.has('pass') || urlParams.has('pw') || urlParams.has('p')) {
	session.password = urlParams.get('password') || urlParams.get('pass') || urlParams.get('pw') || urlParams.get('p');
	if (!session.password) {
		session.password = prompt("Please enter the password below: \n\n(Note: Passwords are case-sensitive and you will not be alerted if it is incorrect.)");
	} else if (session.password === "false") {
		session.password = false;
		session.defaultPassword = false;
	} else if (session.password === "0") {
		session.password = false;
		session.defaultPassword = false;
	} else if (session.password === "off") {
		session.password = false;
		session.defaultPassword = false;
	}
}

if (session.password) {
	session.password = sanitizePassword(session.password);
	getById("passwordRoom").value = session.password;
	session.defaultPassword = false;
	getById("addPasswordBasic").style.display = "none";
}


if (urlParams.has('hash') || urlParams.has('crc') || urlParams.has('check')) { // could be brute forced in theory, so not as safe as just not using a hash check.
	session.taintedSession = null; // waiting to see if valid or not.
	var hash_input = urlParams.get('hash') || urlParams.get('crc') || urlParams.get('check');
	if (session.password === false) {
		session.password = prompt("Please enter the password below: \n\n(Note: Passwords are case-sensitive and you will not be alerted if it is incorrect.)");
		session.password = sanitizePassword(session.password);
		getById("passwordRoom").value = session.password;
		session.defaultPassword = false;
	}

	session.generateHash(session.password + session.salt, 6).then(function(hash) { // million to one error. 
		log("hash is " + hash);
		if (hash.substring(0, 4) !== hash_input) { // hash crc checks are just first 4 characters.
			session.taintedSession = true;
			if (!(session.cleanOutput)) {
				getById("request_info_prompt").innerHTML = "The password was incorrect.\n\nRefresh and try again.";
				getById("request_info_prompt").style.display = "block";
				getById("mainmenu").style.display = "none";
				getById("head1").style.display = "none";
				session.cleanOutput = true;

			} else {
				getById("request_info_prompt").innerHTML = "";
				getById("request_info_prompt").style.display = "block";
				getById("mainmenu").style.display = "none";
				getById("head1").style.display = "none";
			}
		} else {
			session.taintedSession = false;
			session.hash = hash;
		}
	});
}

if (session.defaultPassword !== false) {
	session.password = session.defaultPassword; // no user entered password; let's use the default password if its not disabled.
}

if (urlParams.has('showlabels') || urlParams.has('showlabel') || urlParams.has('sl')) {
	session.showlabels = urlParams.get('showlabels') || urlParams.get('showlabel') || urlParams.get('sl') || "";
	session.showlabels = sanitizeLabel(session.showlabels.replace(/[\W]+/g, "_").replace(/_+/g, '_'));
	if (session.showlabels == "") {
		session.showlabels = true;
		session.labelstyle = false;
	} else {
		session.labelstyle = session.showlabels;
		session.showlabels = true;
	}
}

if (urlParams.has('sizelabel') || urlParams.has('labelsize') || urlParams.has('fontsize')) {
	session.labelsize = urlParams.get('sizelabel') || urlParams.get('labelsize') || urlParams.get('fontsize') || 100;
	session.labelsize = parseInt(session.labelsize);
}

if (urlParams.has('label') || urlParams.has('l')) {
	session.label = urlParams.get('label') || urlParams.get('l');
	var updateURLAsNeed = true;
	if (session.label == null || session.label.length == 0) {
		session.label = prompt("Please enter your display name:");
	} else {
		var updateURLAsNeed = false;
		session.label = decodeURIComponent(session.label);
	}
	if (session.label != null) {
		session.label = sanitizeLabel(session.label); // alphanumeric was too strict. 
		document.title = session.label; // what the result is.

		if (updateURLAsNeed) {
			var label = encodeURIComponent(session.label);
			if (urlParams.has('l')) {
				updateURL("l=" + label, true, false);
			} else {
				updateURL("label=" + label, true, false);
			}
		}
	}
}

if (urlParams.has('transparent')) { // sets the window to be transparent - useful for IFRAMES?
	getById("main").style.backgroundColor = "rgba(0,0,0,0)";
	document.documentElement.style.setProperty('--container-color', '#0000');
	document.documentElement.style.setProperty('--background-color', '#0000');
	document.documentElement.style.setProperty('--regular-margin', '0');
	document.documentElement.style.setProperty('--director-margin', '0 25px 0 0');
	getById("directorLinksButton").style.color = "black";
	session.transparent=true;
}

if (urlParams.has('stereo') || urlParams.has('s') || urlParams.has('proaudio')) { // both peers need this enabled for HD stereo to be on. If just pub, you get no echo/noise cancellation. if just viewer, you get high bitrate mono 
	log("STEREO ENABLED");
	session.stereo = urlParams.get('stereo') || urlParams.get('s') || urlParams.get('proaudio');

	if (session.stereo) {
		session.stereo = session.stereo.toLowerCase();
	}

	//var supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
	//supportedConstraints.channelCount;

	if (session.stereo === "false") {
		session.stereo = 0;
		session.audioInputChannels = 1;
	} else if (session.stereo === "0") {
		session.stereo = 0;
		session.audioInputChannels = 1;
	} else if (session.stereo === "no") {
		session.stereo = 0;
		session.audioInputChannels = 1;
	} else if (session.stereo === "off") {
		session.stereo = 0;
		session.audioInputChannels = 1;

	} else if (session.stereo === "1") {
		session.stereo = 1;
	} else if (session.stereo === "both") {
		session.stereo = 1;
	} else if (session.stereo === "3") {
		session.stereo = 3;
	} else if (session.stereo === "out") {
		session.stereo = 3;
	} else if (session.stereo === "mono") {
		session.stereo = 3;
		session.audiobitrate = 128;
	} else if (session.stereo === "4") {
		session.stereo = 4;
	} else if (session.stereo === "multi") {
		session.stereo = 4;
	} else if (session.stereo === "2") {
		session.stereo = 2;
	} else if (session.stereo === "in") {
		session.stereo = 2;
	} else {
		session.stereo = 5; // guests; no stereo in, no high bitrate in, but otherwise like stereo=1
	}
}

if ((session.stereo == 1) || (session.stereo == 3) || (session.stereo == 4) || (session.stereo == 5)) {
	session.echoCancellation = false;
	session.autoGainControl = false;
	session.noiseSuppression = false;
}

if (urlParams.has('mono')) {
	session.mono = true;
	if ((session.stereo == 1) || (session.stereo == 4)) {
		session.stereo = 3;
		session.audiobitrate = 128;
	} else if (session.stereo == 5) {
		session.stereo = 3;
		session.audiobitrate = 128;
	} else if (session.stereo == 2) {
		session.stereo = 0;
		session.audiobitrate = 128;
	}
}

if (urlParams.has("channelcount") || urlParams.has("ac")) {
	session.audioInputChannels = urlParams.get('channelcount') || urlParams.get('ac');
	session.audioInputChannels = parseInt(session.audioInputChannels);
	if (!session.audioInputChannels) {
		session.audioInputChannels = false;
	}
}


if (urlParams.has("aec") || urlParams.has("ec")) {

	session.echoCancellation = urlParams.get('aec') || urlParams.get('ec');

	if (session.echoCancellation) {
		session.echoCancellation = session.echoCancellation.toLowerCase();
	}
	if (session.echoCancellation == "false") {
		session.echoCancellation = false;
	} else if (session.echoCancellation == "0") {
		session.echoCancellation = false;
	} else if (session.echoCancellation == "no") {
		session.echoCancellation = false;
	} else if (session.echoCancellation == "off") {
		session.echoCancellation = false;
	} else {
		session.echoCancellation = true;
	}
}


if (urlParams.has("autogain") || urlParams.has("ag")) {

	session.autoGainControl = urlParams.get('autogain') || urlParams.get('ag');
	if (session.autoGainControl) {
		session.autoGainControl = session.autoGainControl.toLowerCase();
	}
	if (session.autoGainControl == "false") {
		session.autoGainControl = false;
	} else if (session.autoGainControl == "0") {
		session.autoGainControl = false;
	} else if (session.autoGainControl == "no") {
		session.autoGainControl = false;
	} else if (session.autoGainControl == "off") {
		session.autoGainControl = false;
	} else {
		session.autoGainControl = true;
	}
}

if (urlParams.has("denoise") || urlParams.has("dn")) {

	session.noiseSuppression = urlParams.get('denoise') || urlParams.get('dn');

	if (session.noiseSuppression) {
		session.noiseSuppression = session.noiseSuppression.toLowerCase();
	}
	if (session.noiseSuppression == "false") {
		session.noiseSuppression = false;
	} else if (session.noiseSuppression == "0") {
		session.noiseSuppression = false;
	} else if (session.noiseSuppression == "no") {
		session.noiseSuppression = false;
	} else if (session.noiseSuppression == "off") {
		session.noiseSuppression = false;
	} else {
		session.noiseSuppression = true;
	}
}


if (urlParams.has('roombitrate') || urlParams.has('roomvideobitrate') || urlParams.has('rbr')) {
	log("Room BITRATE SET");
	session.roombitrate = urlParams.get('roombitrate') || urlParams.get('rbr') || urlParams.get('roomvideobitrate');
	session.roombitrate = parseInt(session.roombitrate);
	if (session.roombitrate < 1) {
		session.roombitrate = 0;
	}
}

if ( urlParams.has('outboundaudiobitrate') || urlParams.has('oab')) {
	session.outboundAudioBitrate = parseInt(urlParams.get('outboundaudiobitrate')) || parseInt(urlParams.get('oab')) || false;
}
if (urlParams.has('outboundvideobitrate') || urlParams.has('ovb')) {
	session.outboundVideoBitrate = parseInt(urlParams.get('outboundvideobitrate')) || parseInt(urlParams.get('ovb')) || false;
}

if (urlParams.has('webp')){
	session.webp = true;
}

if (urlParams.has('webpquality') || urlParams.has('webpq') || urlParams.has('wq')){
	session.webPquality = parseInt(urlParams.get('webpquality')) || parseInt(urlParams.get('webpq')) || parseInt(urlParams.get('wq')) || 4;
}


if (urlParams.has('audiobitrate') || urlParams.has('ab')) { // both peers need this enabled for HD stereo to be on. If just pub, you get no echo/noise cancellation. if just viewer, you get high bitrate mono 
	log("AUDIO BITRATE SET");
	session.audiobitrate = urlParams.get('audiobitrate') || urlParams.get('ab');
	session.audiobitrate = parseInt(session.audiobitrate);
	if (session.audiobitrate < 1) {
		session.audiobitrate = false;
	} else if (session.audiobitrate > 510) {
		session.audiobitrate = 510;
	} // this is to just prevent abuse
}
if ((iOS) || (iPad)) {
	session.audiobitrate = false; // iOS devices seem to get distortion with custom audio bitrates.  Disable for now.
}

/* if (urlParams.has('whitebalance') || urlParams.has('temp')){ // Need to be applied after the camera is selected. bleh. not enforcible. remove for now.
	var temperature = urlParams.get('whitebalance') || urlParams.get('temp');
	try{
		updateCameraConstraints('colorTemperature',  parseFloat(temperature));
	} catch (e){errorlog(e);}
} */

if (urlParams.has('streamid') || urlParams.has('view') || urlParams.has('v') || urlParams.has('pull')) { // the streams we want to view; if set, but let blank, we will request no streams to watch.  
	session.view = urlParams.get('streamid') || urlParams.get('view') || urlParams.get('v') || urlParams.get('pull'); // this value can be comma seperated for multiple streams to pull

	getById("headphonesDiv2").style.display = "inline-block";
	getById("headphonesDiv").style.display = "inline-block";
	getById("addPasswordBasic").style.display = "none";

	if (session.view == null) {
		session.view = "";
	}
	if (session.view) {
		if (session.view.split(",").length > 1) {
			session.view_set = session.view.split(",");
		}
	}
}

if (urlParams.has('nopreview') || urlParams.has('np')) {
	log("preview OFF");
	session.nopreview = true;
} else if ((urlParams.has('preview')) || (urlParams.has('showpreview'))) {
	log("preview ON");
	session.nopreview = false;
} else if ((urlParams.has('minipreview')) || (urlParams.has('mini'))) {
	var mini = urlParams.has('minipreview') || urlParams.has('mini') || true; // 2 is a valid option.
	log("preview ON");
	session.nopreview = false;
	session.minipreview = mini;
}

if (urlParams.has('obsfix')) {
	session.obsfix = urlParams.get('obsfix');
	if (session.obsfix) {
		session.obsfix = session.obsfix.toLowerCase();
	}
	if (session.obsfix == "false") {
		session.obsfix = false;
	} else if (session.obsfix == "0") {
		session.obsfix = false;
	} else if (session.obsfix == "no") {
		session.obsfix = false;
	} else if (session.obsfix == "off") {
		session.obsfix = false;
	} else if (parseInt(session.obsfix) > 0) {
		session.obsfix = parseInt(session.obsfix);
	} else {
		session.obsfix = 1; // aggressive.
	}
}

if (urlParams.has('controlroombitrate') || urlParams.has('crb')) {
	session.controlRoomBitrate = true;
}

if (urlParams.has('remote') || urlParams.has('rem')) {
	log("remote ENABLED");
	session.remote = urlParams.get('remote') || urlParams.get('rem') || "nosecurity";
	session.remote = session.remote.trim();
}

if (urlParams.has('latency') || urlParams.has('al') || urlParams.has('audiolatency')) {
	log("latency  ENABLED");
	session.audioLatency = urlParams.get('latency') || urlParams.get('al') || urlParams.get('audiolatency');
	session.audioLatency = parseInt(session.audioLatency) || 0;
	session.disableWebAudio = false;
}



if (urlParams.has('micdelay') || urlParams.has('delay') || urlParams.has('md')) {
	log("audio gain  ENABLED");
	session.micDelay = urlParams.get('micdelay') || urlParams.get('delay') || urlParams.get('md');
	session.micDelay = parseInt(session.micDelay) || 0;
	session.disableWebAudio = false;
}

if (urlParams.has('audiogain') || urlParams.has('gain') || urlParams.has('g')) {
	log("audio gain  ENABLED");
	session.audioGain = urlParams.get('audiogain') || urlParams.get('gain') || urlParams.get('g');
	session.audioGain = parseInt(session.audioGain) || 0;
	session.disableWebAudio = false;
}
if (urlParams.has('compressor') || urlParams.has('comp')) {
	log("audio gain  ENABLED");
	session.compressor = 1;
	session.disableWebAudio = false;
} else if (urlParams.has('limiter')) {
	log("audio gain  ENABLED");
	session.compressor = 2;
	session.disableWebAudio = false;
}
if ((urlParams.has('equalizer')) || (urlParams.has('eq'))) {
	session.equalizer = true;
	session.disableWebAudio = false;
}
if ((urlParams.has('lowcut')) || (urlParams.has('lc')) || (urlParams.has('higpass'))) {
	session.lowcut = urlParams.get('lowcut') || urlParams.get('lc') || urlParams.get('higpass') || 100;
	session.lowcut = parseInt(session.lowcut);
	session.disableWebAudio = false;
}

if (urlParams.has('pip')) {
	session.pip = true; // togglePip
	//session.manual=true;
	//innerHTML = 
}

if (urlParams.has('keyframeinterval') || urlParams.has('keyframerate') || urlParams.has('keyframe') || urlParams.has('fki')) {
	log("keyframerate ENABLED");
	session.keyframerate = parseInt(urlParams.get('keyframeinterval') || urlParams.get('keyframerate') || urlParams.get('keyframe') || urlParams.get('fki')) || 0;
}

if (urlParams.has('tallyoff') || urlParams.has('obsoff') || urlParams.has('oo')) {
	log("OBS feedback disabled");
	session.disableOBS = true;
}


if (urlParams.has('chroma')) {
	log("Chroma ENABLED");
	getById("main").style.backgroundColor = "#" + (urlParams.get('chroma') || "000");
}

if (urlParams.has("videodevice") || urlParams.has("vdevice") || urlParams.has('vd') || urlParams.has('device') || urlParams.has('d')) {

	session.videoDevice = urlParams.get("videodevice") || urlParams.get("vdevice") || urlParams.get("vd") || urlParams.get("device") || urlParams.get("d");

	if (session.videoDevice === null) {
		session.videoDevice = "1";
	} else if (session.videoDevice) {
		session.videoDevice = session.videoDevice.toLowerCase().replace(/[\W]+/g, "_");
	}
	if (session.videoDevice == "false") {
		session.videoDevice = 0;
	} else if (session.videoDevice == "0") {
		session.videoDevice = 0;
	} else if (session.videoDevice == "no") {
		session.videoDevice = 0;
	} else if (session.videoDevice == "off") {
		session.videoDevice = 0;
	} else if (session.videoDevice == "snapcam") {
		session.videoDevice = "snap_camera";
	} else if (session.videoDevice == "canon") {
		session.videoDevice = "eos";
	} else if (session.videoDevice == "camlink") {
		session.videoDevice = "cam_link";
	} else if (session.videoDevice == "ndi") {
		session.videoDevice = "newtek_ndi_video";
	} else if (session.videoDevice == "") {
		session.videoDevice = 1;
	} else if (session.videoDevice == "1") {
		session.videoDevice = 1;
	} else if (session.videoDevice == "default") {
		session.videoDevice = 1;
	} else {
		// whatever the user entered I guess, santitized.
		session.videoDevice = session.videoDevice.replace(/[\W]+/g, "_").toLowerCase();
	}

	if (session.videoDevice === 0) {
		getById("add_camera").innerHTML = "Share your Microphone";
		miniTranslate(getById("add_camera"), "share-your-mic");
	}

	getById("videoMenu").style.display = "none";
	log("session.videoDevice:" + session.videoDevice);
}

// audioDevice
if (urlParams.has("audiodevice") || urlParams.has("adevice") || urlParams.has("ad") || urlParams.has("device") || urlParams.has("d")) {

	session.audioDevice = urlParams.get("audiodevice") || urlParams.get("adevice") || urlParams.get("ad") || urlParams.get("device") || urlParams.get("d");

	if (session.audioDevice === null) {
		session.audioDevice = "1";
	} else if (session.audioDevice) {
		session.audioDevice = session.audioDevice.toLowerCase().replace(/[\W]+/g, "_");
	}

	if (session.audioDevice == "false") {
		session.audioDevice = 0;
	} else if (session.audioDevice == "0") {
		session.audioDevice = 0;
	} else if (session.audioDevice == "no") {
		session.audioDevice = 0;
	} else if (session.audioDevice == "off") {
		session.audioDevice = 0;
	} else if (session.audioDevice == "") {
		session.audioDevice = 1;
	} else if (session.audioDevice == "1") {
		session.audioDevice = 1;
	} else if (session.audioDevice == "default") {
		session.audioDevice = 1;
	} else if (session.audioDevice == "ndi") {
		session.audioDevice = "line_newtek_ndi_audio";
	} else {
		// whatever the user entered I guess
		session.audioDevice = session.audioDevice.replace(/[\W]+/g, "_").toLowerCase();
	}


	if (session.videoDevice === 0) {
		if (session.audioDevice === 0) {
			getById("add_camera").innerHTML = "Click Start to Join";
			miniTranslate(getById("add_camera"), "click-start-to-join");
			getById("container-2").className = 'column columnfade advanced'; // Hide screen share on mobile
			getById("container-3").classList.add("skip-animation");
			getById("container-3").classList.remove('pointer');
			setTimeout(function() {
				previewWebcam();
			}, 100);
			session.webcamonly = true;
		}
	}

	log("session.audioDevice:" + session.audioDevice);

	getById("audioMenu").style.display = "none";
	getById("headphonesDiv").style.display = "none";
	getById("headphonesDiv2").style.display = "none";
	getById("audioScreenShare1").style.display = "none";

}


if (urlParams.has("autojoin") || urlParams.has("autostart") || urlParams.has('aj') || urlParams.has('as')) {
	session.autostart = true;
	if (session.screenshare) {
		setTimeout(function() {
			publishScreen();
		}, 200);
	}
}

if (urlParams.has('noiframe') || urlParams.has('noiframes') || urlParams.has('nif')) {

	session.noiframe = urlParams.get('noiframe') || urlParams.get('noiframes') || urlParams.get('nif');

	if (!(session.noiframe)) {
		session.noiframe = [];
	} else {
		session.noiframe = session.noiframe.split(",");
	}
	log("disable iframe playback");
	log(session.noiframe);
}


if (urlParams.has('exclude') || urlParams.has('ex')) {

	session.exclude = urlParams.get('exclude') || urlParams.get('ex');

	if (!(session.exclude)) {
		session.exclude = false;
	} else {
		session.exclude = session.exclude.split(",");
	}
	log("exclude video playback");
	log(session.exclude);
}


if (urlParams.has('novideo') || urlParams.has('nv') || urlParams.has('hidevideo') || urlParams.has('showonly')) {

	session.novideo = urlParams.get('novideo') || urlParams.get('nv') || urlParams.get('hidevideo') || urlParams.get('showonly');

	if (!(session.novideo)) {
		session.novideo = [];
	} else {
		session.novideo = session.novideo.split(",");
	}
	log("disable video playback");
	log(session.novideo);
}

if (urlParams.has('noaudio') || urlParams.has('na') || urlParams.has('hideaudio')) {

	session.noaudio = urlParams.get('noaudio') || urlParams.get('na') || urlParams.get('hideaudio');

	if (!(session.noaudio)) {
		session.noaudio = [];
	} else {
		session.noaudio = session.noaudio.split(",");
	}
	log("disable audio playback");
}

if (urlParams.has('forceios')) {
	log("allow iOS to work in video group chat; for this user at least");
	session.forceios = true;
}

if (urlParams.has('nocursor')) {
	session.nocursor = true;
	log("DISABLE CURSOR");
	var style = document.createElement('style');
	style.innerHTML = `
	video {
		margin: 0;
		padding: 0;
		overflow: hidden;
		cursor: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=), none;
		user-select: none;
	}
	`;
	document.head.appendChild(style);
}

if (urlParams.has('vbr')) {
	session.cbr = 0;
}

if (urlParams.has('order')) {
	session.order = parseInt(urlParams.get('order')) || 0;
}
if (urlParams.has('sensors') || urlParams.has('sensor') || urlParams.has('gyro') || urlParams.has('gyros') || urlParams.has('accelerometer')) {
	session.sensorData = urlParams.get('sensors') || urlParams.get('sensor') || urlParams.get('gyro') || urlParams.get('gyros') || urlParams.get('accelerometer') || 30;
	session.sensorData = parseInt(session.sensorData);
}

if (urlParams.has('minptime')) {
	session.minptime = parseInt(urlParams.get('minptime')) || 10;
	if (session.minptime < 10) {
		session.minptime = 10;
	}
	if (session.minptime > 300) {
		session.minptime = 300;
	}
}

if (urlParams.has('maxptime')) {
	session.maxptime = parseInt(urlParams.get('maxptime')) || 60;
	if (session.maxptime < 10) {
		session.maxptime = 10;
	}
	if (session.maxptime > 300) {
		session.maxptime = 300;
	}
}

if (urlParams.has('ptime')) {
	session.ptime = parseInt(urlParams.get('ptime')) || 20;
	if (session.minptime < 10) {
		session.ptime = 10;
	}
	if (session.minptime > 300) {
		session.ptime = 300;
	}
}


if (urlParams.has('codec')) {
	log("CODEC CHANGED");
	session.codec = urlParams.get('codec').toLowerCase();
	if (session.codec=="webp"){
		session.webp = true;
		session.codec = false;
	}
} //else if (window.obsstudio){
//if (session.obsfix===false){
//	session.codec = "h264"; // H264 --- It's too laggy for many!!! 
//}
//}

if (urlParams.has('nonacks')){ // disables error control / throttling.
	session.noNacks = true;
}
if (urlParams.has('nopli')){ // disables error control / throttling.
	session.noPLIs = true;
}
if (urlParams.has('noremb')){ // disables error control / throttling.
	session.noREMB = true;
}

if (urlParams.has('scale')) {
	if (urlParams.get('scale') == "false") {} else if (urlParams.get('scale') == "0") {} else if (urlParams.get('scale') == "no") {} else if (urlParams.get('scale') == "off") {} else {
		log("Resolution scale requested");
		session.scale = parseInt(urlParams.get('scale')) || 100;
	}
	session.dynamicScale = false; // default true
}

var ConfigSettings = getById("main-js");
var ln_template = false;
var translation = false;
try {
	if (ConfigSettings) {
		ln_template = ConfigSettings.getAttribute('data-translation'); // Translations
		if (typeof ln_template === "undefined") {
			ln_template = false;
		} else if (ln_template === null) {
			ln_template = false;
		}
	}

	if (urlParams.has('ln')) {
		ln_template = urlParams.get('ln');
	}
} catch (e) {
	errorlog(e);
}

if (ln_template) { // checking if manual lanuage override enabled
	try {
		log("Template: " + ln_template);
		fetch("./translations/" + ln_template + '.json').then(function(response) {
			if (response.status !== 200) {
				log('Looks like there was a problem. Status Code: ' +
					response.status);
				return;
			}
			response.json().then(function(data) {
				log(data);
				translation = data;
				var trans = data.innerHTML;
				var allItems = document.querySelectorAll('[data-translate]');
				allItems.forEach(function(ele) {
					if (ele.dataset.translate in trans) {
						ele.innerHTML = trans[ele.dataset.translate];
					}
				});
				trans = data.titles;
				var allTitles = document.querySelectorAll('[title]');
				allTitles.forEach(function(ele) {
					var key = ele.title.replace(/[\W]+/g, "-").toLowerCase();
					if (key in trans) {
						ele.title = trans[key];
					}
				});
				trans = data.placeholders;
				var allPlaceholders = document.querySelectorAll('[placeholder]');
				allPlaceholders.forEach(function(ele) {
					var key = ele.placeholder.replace(/[\W]+/g, "-").toLowerCase();
					if (key in trans) {
						ele.placeholder = trans[key];
					}
				});


				getById("mainmenu").style.opacity = 1;
			}).catch(function(err) {
				errorlog(err);
				getById("mainmenu").style.opacity = 1;
			});
		}).catch(function(err) {
			errorlog(err);
			getById("mainmenu").style.opacity = 1;
		});

	} catch (error) {
		errorlog(error);
		getById("mainmenu").style.opacity = 1;
	}
} else if (location.hostname !== "obs.ninja") {
	if (location.hostname === "rtc.ninja") {
		try {
			if (session.label === false) {
				document.title = "";
			}
			getById("qos").innerHTML = "";
			getById("logoname").innerHTML = "";
			getById("helpbutton").style.display = "none";
			getById("helpbutton").style.opacity = 0;
			getById("reportbutton").style.display = "none";
			getById("reportbutton").style.opacity = 0;
			getById("mainmenu").style.opacity = 1;
			getById("mainmenu").style.margin = "30px 0";
			getById("translateButton").style.display = "none";
			getById("translateButton").style.opacity = 0;
			getById("info").style.display = "none";
			getById("info").style.opacity = 0;
			getById("chatBody").innerHTML = "";
		} catch (e) {}
	}
	try {
		fetch("./translations/blank.json").then(function(response) {
			if (response.status !== 200) {
				log('Looks like there was a problem. Status Code: ' +
					response.status);
				return;
			}
			response.json().then(function(data) {
				log(data);

				var trans = data.innerHTML;
				var allItems = document.querySelectorAll('[data-translate]');
				allItems.forEach(function(ele) {
					if (ele.dataset.translate in trans) {
						ele.innerHTML = trans[ele.dataset.translate];
					}
				});
				trans = data.titles;
				var allTitles = document.querySelectorAll('[title]');
				allTitles.forEach(function(ele) {
					var key = ele.title.replace(/[\W]+/g, "-").toLowerCase();
					if (key in trans) {
						ele.title = trans[key];
					}
				});
				trans = data.placeholders;
				var allPlaceholders = document.querySelectorAll('[placeholder]');
				allPlaceholders.forEach(function(ele) {
					var key = ele.placeholder.replace(/[\W]+/g, "-").toLowerCase();
					if (key in trans) {
						ele.placeholder = trans[key];
					}
				});

				if (session.label === false) {
					document.title = location.hostname;
				}
				getById("qos").innerHTML = location.hostname;
				getById("logoname").innerHTML = getById("qos").outerHTML;
				getById("helpbutton").style.display = "none";
				getById("reportbutton").style.display = "none";
				getById("mainmenu").style.opacity = 1;
			}).catch(function(err) {
				errorlog(err);
				getById("mainmenu").style.opacity = 1;
			});
		}).catch(function(err) {
			errorlog(err);
			getById("mainmenu").style.opacity = 1;
		});
		if (session.label === false) {
			document.title = location.hostname;
		}
		getById("qos").innerHTML = location.hostname;
		getById("logoname").innerHTML = getById("qos").outerHTML;
		getById("helpbutton").style.display = "none";
		getById("reportbutton").style.display = "none";
		getById("chatBody").innerHTML = "";
	} catch (error) {
		errorlog(error);
	}
} else { // check if automatic language translation is available
	getById("mainmenu").style.opacity = 1;
}

try {
	if (location.hostname === "rtc.ninja") { // an extra-brand-free version of OBS.Ninja
		if (session.label === false) {
			document.title = "";
		}
		getById("qos").innerHTML = "";
		getById("logoname").innerHTML = "";
		getById("helpbutton").style.display = "none";
		getById("helpbutton").style.opacity = 0;
		getById("reportbutton").style.display = "none";
		getById("reportbutton").style.opacity = 0;
		getById("mainmenu").style.opacity = 1;
		getById("mainmenu").style.margin = "30px 0";
		getById("translateButton").style.display = "none";
		getById("translateButton").style.opacity = 0;
		getById("info").style.display = "none";
		getById("info").style.opacity = 0;
		getById("chatBody").innerHTML = "";
	} else if (location.hostname !== "obs.ninja") {
		if (session.label === false) {
			document.title = location.hostname;
		}
		getById("qos").innerHTML = sanitizeLabel(location.hostname);
		getById("logoname").innerHTML = getById("qos").outerHTML;
		getById("helpbutton").style.display = "none";
		getById("reportbutton").style.display = "none";
	}

} catch (e) {}

if (isIFrame) {
	getById("helpbutton").style.display = "none";
	getById("helpbutton").style.opacity = 0;
	getById("reportbutton").style.display = "none";
	getById("reportbutton").style.opacity = 0;
	getById("chatBody").innerHTML = "";
}

function miniTranslate(ele, ident = false) {
	if (ident) {
		ele.dataset.translate = ident;
	} else {
		ident = ele.dataset.translate;
	}
	try {
		if (ident in translation.innerHTML) {
			ele.innerHTML = translation.innerHTML[ident];
		}
	} catch (e) {}
}

function changeLg(lang) {
	fetch("./translations/" + lang + '.json').then(function(response) {
		if (response.status !== 200) {
			logerror('Language translation file not found.' + response.status);
			return;
		}
		response.json().then(function(data) {
			log(data);
			translation = data; // translation.innerHTML[ele.dataset.translate]
			var trans = data.innerHTML;
			var allItems = document.querySelectorAll('[data-translate]');
			allItems.forEach(function(ele) {
				if (ele.dataset.translate in trans) {
					ele.innerHTML = trans[ele.dataset.translate];
				}
			});
			trans = data.titles;
			var allTitles = document.querySelectorAll('[title]');
			allTitles.forEach(function(ele) {
				var key = ele.title.replace(/[\W]+/g, "-").toLowerCase();
				if (key in trans) {
					ele.title = trans[key];
				}
			});
			trans = data.placeholders;
			var allPlaceholders = document.querySelectorAll('[placeholder]');
			allPlaceholders.forEach(function(ele) {
				var key = ele.placeholder.replace(/[\W]+/g, "-").toLowerCase();
				if (key in trans) {
					ele.placeholder = trans[key];
				}
			});
		});
	}).catch(function(err) {
		errorlog(err);
	});
}

if (urlParams.has('beep') || urlParams.has('notify') || urlParams.has('tone')) {
	session.beepToNotify = true;
}

if (urlParams.has('r2d2')) {
	getById("testtone").innerHTML = "";
	getById("testtone").src = "./media/robot.mp3";
	session.beepToNotify = true;
}

if (urlParams.has('videobitrate') || urlParams.has('bitrate') || urlParams.has('vb')) {
	session.bitrate = urlParams.get('videobitrate') || urlParams.get('bitrate') || urlParams.get('vb');
	if (session.bitrate) {
		if ((session.view_set) && (session.bitrate.split(",").length > 1)) {
			session.bitrate_set = session.bitrate.split(",");
			session.bitrate = parseInt(session.bitrate_set[0]);
		} else {
			session.bitrate = parseInt(session.bitrate);
		}
		if (session.bitrate < 1) {
			session.bitrate = false;
		}
		log("BITRATE ENABLED");
		log(session.bitrate);

	}
}

if (urlParams.has('maxvideobitrate') || urlParams.has('maxbitrate') || urlParams.has('mvb')) {
	session.maxvideobitrate = urlParams.get('maxvideobitrate') || urlParams.get('maxbitrate') || urlParams.get('mvb');
	session.maxvideobitrate = parseInt(session.maxvideobitrate);

	if (session.maxvideobitrate < 1) {
		session.maxvideobitrate = false;
	}
	log("maxvideobitrate ENABLED");
	log(session.maxvideobitrate);
}

if (urlParams.has('totalroombitrate') || urlParams.has('totalroomvideobitrate') || urlParams.has('trb')) {
	session.totalRoomBitrate = urlParams.get('totalroombitrate') || urlParams.get('totalroomvideobitrate') || urlParams.get('trb');
	session.totalRoomBitrate = parseInt(session.totalRoomBitrate);

	if (session.totalRoomBitrate < 1) {
		session.totalRoomBitrate = false;
	}
	log("totalRoomBitrate ENABLED");
	log(session.totalRoomBitrate);
}


if (urlParams.has('height') || urlParams.has('h')) {
	session.height = urlParams.get('height') || urlParams.get('h');
	session.height = parseInt(session.height);
}

if (urlParams.has('width') || urlParams.has('w')) {
	session.width = urlParams.get('width') || urlParams.get('w');
	session.width = parseInt(session.width);
}

if (urlParams.has('quality') || urlParams.has('q')) {
	try {
		session.quality = urlParams.get('quality') || urlParams.get('q') || 0;
		session.quality = parseInt(session.quality);
		getById("gear_screen").parentNode.removeChild(getById("gear_screen"));
		getById("gear_webcam").parentNode.removeChild(getById("gear_webcam"));
	} catch (e) {
		errorlog(e);
	}
}

if (urlParams.has('sink')) {
	session.sink = urlParams.get('sink');
} else if (urlParams.has('outputdevice') || urlParams.has('od') || urlParams.has('audiooutput')) {
	session.outputDevice = urlParams.get('outputdevice') || urlParams.get('od') || urlParams.get('audiooutput') || null;
	
	if (session.outputDevice) {
		session.outputDevice = session.outputDevice.toLowerCase().replace(/[\W]+/g, "_");
	} else {
		session.outputDevice = null;
		getById("headphonesDiv3").style.display = "none"; // 
	}

	if (session.outputDevice) {
		try {
			enumerateDevices().then(function(deviceInfos) {
				for (let i = 0; i !== deviceInfos.length; ++i) {
					if (deviceInfos[i].kind === 'audiooutput') {
						if (deviceInfos[i].label.replace(/[\W]+/g, "_").toLowerCase().includes(session.outputDevice)) {
							session.sink = deviceInfos[i].deviceId;
							log("AUDIO OUT DEVICE: " + deviceInfos[i].deviceId);
							break;
						}
					}
				}
			});
		} catch (e) {}
	}
	
	getById("headphonesDiv").style.display = "none";
	getById("headphonesDiv2").style.display = "none";
}

if (urlParams.has('fullscreen')) {
	session.fullscreen = true;
}
if (urlParams.has('stats')) {
	session.statsMenu = true;
}


if (urlParams.has('cleandirector') || urlParams.has('cdv')) {
	session.cleanDirector = true;
}


if (urlParams.has('cleanoutput') || urlParams.has('clean') || urlParams.has('cleanish')) {
	session.cleanOutput = true;
	getById("translateButton").style.display = "none";
	getById("credits").style.display = "none";
	getById("header").style.display = "none";
	getById("controlButtons").style.display = "none";
	var style = document.createElement('style');
	style.innerHTML = `
	video {
		background-image: none;
	}
	`;
	document.head.appendChild(style);
}

if (urlParams.has('cleanish')) {
	session.cleanish = true;
}

if (urlParams.has('channels')) { // must be loaded before channelOffset
	session.audioChannels = parseInt(urlParams.get('channels'));
	session.offsetChannel = 0;
	log("max channels is 32; channels offset");
	session.audioEffects = true;
}
if (urlParams.has('channeloffset')) {
	session.offsetChannel = parseInt(urlParams.get('channeloffset'));
	log("max channels is 32; channels offset");
	session.audioEffects = true;
}



if (urlParams.has('enhance')) {
	//if (parseInt(urlParams.get('enhance')>0){
	session.enhance = true; //parseInt(urlParams.get('enhance'));
	//}
}

if (urlParams.has('maxviewers') || urlParams.has('mv')) {

	session.maxviewers = urlParams.get('maxviewers') || urlParams.get('mv');
	if (session.maxviewers.length == 0) {
		session.maxviewers = 1;
	} else {
		session.maxviewers = parseInt(session.maxviewers);
	}
	log("maxviewers set");
}

if (urlParams.has('maxpublishers') || urlParams.has('mp')) {

	session.maxpublishers = urlParams.get('maxpublishers') || urlParams.get('mp');
	if (session.maxpublishers.length == 0) {
		session.maxpublishers = 1;
	} else {
		session.maxpublishers = parseInt(session.maxpublishers);
	}
	log("maxpublishers set");
}

if (urlParams.has('maxconnections') || urlParams.has('mc')) {

	session.maxconnections = urlParams.get('maxconnections') || urlParams.get('maxconnections');
	if (session.maxconnections.length == 0) {
		session.maxconnections = 1;
	} else {
		session.maxconnections = parseInt(session.maxconnections);
	}

	log("maxconnections set");
}


if (urlParams.has('secure')) {
	session.security = true;
	if (!(session.cleanOutput)) {
		setTimeout(function() {
			warnUser("Enhanced Security Mode Enabled.");
		}, 100);
	}
}

if (urlParams.has('random') || urlParams.has('randomize')) {
	session.randomize = true;
}

if (urlParams.has('framerate') || urlParams.has('fr') || urlParams.has('fps')) {
	session.framerate = urlParams.get('framerate') || urlParams.get('fr') || urlParams.get('fps');
	session.framerate = parseInt(session.framerate);
	log("framerate Changed");
	log(session.framerate);
}

if (urlParams.has('maxframerate') || urlParams.has('mfr') || urlParams.has('mfps')) {
	session.maxframerate = urlParams.get('maxframerate') || urlParams.get('mfr') || urlParams.get('mfps');
	session.maxframerate = parseInt(session.maxframerate);
	log("max framerate assigned");
	log(session.maxframerate);
}

if (urlParams.has('buffer')) { // needs to be before sync
	session.buffer = parseFloat(urlParams.get('buffer')) || 0;
	log("buffer Changed: " + session.buffer);
	session.sync = 0;
	session.audioEffects = true;
}

if (urlParams.has('sync')) {
	session.sync = parseFloat(urlParams.get('sync'));
	log("sync Changed; in milliseconds.  If not set, defaults to auto.");
	log(session.sync);
	session.audioEffects = true;
	if (session.buffer === false) {
		session.buffer = 0;
	}
}

if (urlParams.has('mirror')) {
	if (urlParams.get('mirror') == "3") {
		getById("main").classList.add("mirror");
	} else if (urlParams.get('mirror') == "2") {
		session.mirrored = 2;
	} else if (urlParams.get('mirror') == "0") {
		session.mirrored = 0;
	} else if (urlParams.get('mirror') == "false") {
		session.mirrored = 0;
	} else if (urlParams.get('mirror') == "off") {
		session.mirrored = 0;
	} else {
		session.mirrored = 1;
	}
}

if (urlParams.has('flip')) {
	if (urlParams.get('flip') == "0") {
		session.flipped = false;
	} else if (urlParams.get('flip') == "false") {
		session.flipped = false;
	} else if (urlParams.get('flip') == "off") {
		session.flipped = false;
	} else {
		session.flipped = true;
	}
}

if ((session.mirrored) && (session.flipped)) {
	try {
		log("Mirror all videos");
		var mirrorStyle = document.createElement('style');
		mirrorStyle.innerHTML = "video {transform: scaleX(-1) scaleY(-1); }";
		document.getElementsByTagName("head")[0].appendChild(mirrorStyle);
	} catch (e) {
		errorlog(e);
	}
} else if (session.mirrored) { // mirror the video horizontally
	try {
		log("Mirror all videos");
		var mirrorStyle = document.createElement('style');
		mirrorStyle.innerHTML = "video {transform: scaleX(-1);}";
		document.getElementsByTagName("head")[0].appendChild(mirrorStyle);
	} catch (e) {
		errorlog(e);
	}
} else if (session.flipped) { // mirror the video vertically
	try {
		log("Mirror all videos");
		var mirrorStyle = document.createElement('style');
		mirrorStyle.innerHTML = "video {transform: scaleY(-1);}";
		document.getElementsByTagName("head")[0].appendChild(mirrorStyle);
	} catch (e) {
		errorlog(e);
	}
}


if (urlParams.has('icefilter')) {
	log("ICE FILTER ENABLED");
	session.icefilter = urlParams.get('icefilter');
}


if (urlParams.has('effects') || urlParams.has('effect')) {
	session.effects = urlParams.get('effects') || urlParams.get('effect') || null;
	if (session.effects === null){
		getById("effectsDiv").style.display = "block";
		session.effects = 0;
	} else if (session.effects === "0" || session.effects === "false" || session.effects === "off"){
		session.effects = false;
		getById("effectSelector3").style.display = "none";
		getById("effectsDiv3").style.display = "none";
		getById("effectSelector").style.display = "none";
		getById("effectsDiv").style.display = "none";
	} else {
		session.effects = parseInt(session.effects);
	}
	
	if (session.effects === 5){
		getById("selectImageTFLITE").style.display = "block";
		getById("selectImageTFLITE3").style.display = "block";
		getById("effectSelector").style.display = "none";
		getById("effectsDiv").style.display = "block";
	}
	// mirror == 2
	// face == 1
	// blur = 3
	// green = 4
	// image = 5
}

if (urlParams.has('activespeaker') || urlParams.has('speakerview')  || urlParams.has('sas')){
	session.activeSpeaker = true;
	session.audioEffects = true;
	session.audioMeterGuest = true;
	setInterval(function(){activeSpeaker(false)},100);
	
}

if (urlParams.has('style') || urlParams.has('st')) {
	session.style = urlParams.get('style') || urlParams.get('st') || 1;
	if ((parseInt(session.style) == 1) || (session.style == "justvideo")) { // no audio only
		session.style = 1;
	} else if ((parseInt(session.style) == 2) || (session.style == "waveform")) { // audio waveform
		session.style = 2;
		session.audioEffects = true; ////!!!!!!! Do I want to enable the audioEffects myself? or do it here?
	} else if ((parseInt(session.style) == 3) || (session.style == "volume")) { // photo is taken? upload option? canvas?
		session.style = 3;
		session.audioEffects = true;
	} else {
		session.style = 1;
	}
}


if (urlParams.has('samplerate') || urlParams.has('sr')) {
	session.sampleRate = parseInt(urlParams.get('samplerate')) || parseInt(urlParams.get('samplerate')) || 48000;
	if (session.audioCtx) {
		session.audioCtx.close(); // close the default audio context.
	}
	session.audioCtx = new AudioContext({ // create a new audio context with a higher sample rate. 
		sampleRate: session.sampleRate
	});
	session.audioEffects = true;
}


if (urlParams.has('noaudioprocessing') || urlParams.has('noap')) {
	session.disableWebAudio = true; // default true; might be useful to disable on slow or old computers?
	session.audioEffects = false; // disable audio inbound effects also.
	session.audioMeterGuest = false;
}

if (urlParams.has('tcp')){ // forces the TURN servers to use TCP mode; still need to add &private to force TURN also tho
	session.forceTcpMode = true;
}
if (urlParams.has('speedtest')){ // forces essentially UDP mode, unless TCP is specified, and some other stuff
	session.speedtest = true;
}

if (urlParams.has('turn')) {
	var turnstring = urlParams.get('turn');
	if (turnstring == "twilio") { // a sample function on loading remote credentials for TURN servers.
		try {
			
			session.ws = false; // prevents connection
			var twillioRequest = new XMLHttpRequest();
			twillioRequest.onreadystatechange = function() {
				if (twillioRequest.status === 200) {
					try{
						var res = JSON.parse(twillioRequest.responseText);
					} catch(e){return;}
					session.configuration = {
						iceServers: [{
								"username": res["1"],
								"credential": res["2"],
								"url": "turn:global.turn.twilio.com:3478?transport=tcp",
								"urls": "turn:global.turn.twilio.com:3478?transport=tcp"
							},
							{
								"username": res["1"],
								"credential": res["2"],
								"url": "turn:global.turn.twilio.com:443?transport=tcp",
								"urls": "turn:global.turn.twilio.com:443?transport=tcp"
							}
						],
						sdpSemantics: 'unified-plan' // future-proofing
					};
					if (session.ws===false){
						session.ws=null; // allows connection (clears state)
						session.connect(); // connect if not already connected.
					}
				}
				// system does not connect if twilio API does not respond.
			};
			twillioRequest.open('GET', 'https://api.obs.ninja:1443/twilio', true); // `false` makes the request synchronous
			twillioRequest.send();

			
		} catch (e) {
			errorlog("Twilio Failed");
		}

	} else if ((turnstring == "false") || (turnstring == "off") || (turnstring == "0")) { // disable TURN servers
		session.configuration = {
			iceServers: [
				{ urls: ["stun:stun.l.google.com:19302", "stun:stun4.l.google.com:19302"]} // more than 4 stun+turn servers will cause firefox issues? (2 + 2 for now then)
			],
			sdpSemantics: 'unified-plan' // future-proofing
		};
	} else {
		try {
			turnstring = turnstring.split(";");
			if (turnstring !== "false") { // false disables the TURN server. Useful for debuggin
				var turn = {};
				turn.username = turnstring[0]; // myusername
				turn.credential = turnstring[1]; //mypassword
				turn.urls = [turnstring[2]]; //  ["turn:turn.obs.ninja:443"];
				session.configuration.iceServers = [{
					urls: ["stun:stun.l.google.com:19302", "stun:stun4.l.google.com:19302"]
				}];
				session.configuration.iceServers.push(turn);
			}
		} catch (e) {
			if (!(session.cleanOutput)) {
				warnUser("TURN server parameters were wrong.");
			}
			errorlog(e);
		}
	}
} else {
	chooseBestTURN(); // obs.ninja turn servers, if needed.
}


if (urlParams.has('privacy') || urlParams.has('private') || urlParams.has('relay')) { // please only use if you are also using your own TURN service.
	session.privacy = true;
	
	try {
		session.configuration.iceTransportPolicy = "relay"; // https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidate/address
	} catch (e) {
		if (!(session.cleanOutput)) {
			warnUser("Privacy mode failed to configure.");
		}
		errorlog(e);
	}
	
	if (session.speedtest){
		if (session.maxvideobitrate !== false) {
			if (session.maxvideobitrate > 6000) {
				session.maxvideobitrate = 6000; // Please feel free to get rid of this if using your own TURN servers...
			}
		} else {
			session.maxvideobitrate = 6000; // don't let people pull more than 2500 from you
		}
		if (session.bitrate !== false) {
			if (session.bitrate > 6000) {
				session.bitrate = 6000; // Please feel free to get rid of this if using your own TURN servers...
			}
		}
	} else {
		if (session.maxvideobitrate !== false) {
			if (session.maxvideobitrate > 2500) {
				session.maxvideobitrate = 2500; // Please feel free to get rid of this if using your own TURN servers...
			}
		} else {
			session.maxvideobitrate = 2500; // don't let people pull more than 2500 from you
		}
		if (session.bitrate !== false) {
			if (session.bitrate > 2500) {
				session.bitrate = 2500; // Please feel free to get rid of this if using your own TURN servers...
			}
		}
	}
}

if (urlParams.has('wss')) {
	if (urlParams.get('wss')) {
		session.wss = "wss://" + urlParams.get('wss');
	}
}

if (urlParams.has('queue')) {
	session.queue = true;
}

if (isIFrame) { // reduce CPU load if not needed.
	window.onmessage = function(e) { // iFRAME support
		log(e);
		try {
			if ("function" in e.data) { // these are calling in-app functions, with perhaps a callback -- TODO: add callbacks
				var ret = null;
				if (e.data.function === "previewWebcam") {
					ret = previewWebcam();
				} else if (e.data.function === "changeHTML") {
					ret = getById(e.data.target);
					ret.innerHTML = e.data.value;
				} else if (e.data.function === "publishScreen") {
					ret = publishScreen();
				} else if (e.data.function === "eval") {
					eval(e.data.value); // eval == evil ; feedback welcomed
				}
			}
		} catch (err) {
			errorlog(err);
		}

		if ("sendChat" in e.data) {
			sendChat(e.data.sendChat); // sends to all peers; more options down the road
		}
		// Chat out gets called via getChatMessage function
		// Related code: parent.postMessage({"chat": {"msg":-----,"type":----,"time":---} }, "*");

		if ("mic" in e.data) { // this should work for the director's mic mute button as well. Needs to be manually enabled the first time still tho.
			if (e.data.mic === true) { // unmute
				session.muted = false; // set
				log(session.muted);
				toggleMute(true); // apply 
			} else if (e.data.mic === false) { // mute
				session.muted = true; // set
				log(session.muted);
				toggleMute(true); // apply
			} else if (e.data.mic === "toggle") { // toggle
				toggleMute();
			}
		}

		if ("camera" in e.data) { // this should work for the director's mic mute button as well. Needs to be manually enabled the first time still tho.
			if (e.data.camera === true) { // unmute
				session.videoMuted = false; // set
				log(session.videoMuted);
				toggleVideoMute(true); // apply 
			} else if (e.data.camera === false) { // mute
				session.videoMuted = true; // set
				log(session.videoMuted);
				toggleVideoMute(true); // apply
			} else if (e.data.camera === "toggle") { // toggle
				toggleVideoMute();
			}
		}

		if ("mute" in e.data) {
			if (e.data.mute === true) { // unmute
				session.speakerMuted = true; // set
				toggleSpeakerMute(true); // apply 
			} else if (e.data.mute === false) { // mute
				session.speakerMuted = false; // set
				toggleSpeakerMute(true); // apply
			} else if (e.data.mute === "toggle") { // toggle
				toggleSpeakerMute();
			}
		} else if ("speaker" in e.data) { // same thing as mute.
			if (e.data.speaker === true) { // unmute
				session.speakerMuted = false; // set
				toggleSpeakerMute(true); // apply 
			} else if (e.data.speaker === false) { // mute
				session.speakerMuted = true; // set
				toggleSpeakerMute(true); // apply
			} else if (e.data.speaker === "toggle") { // toggle
				toggleSpeakerMute();
			}
		}
		
		if ("record" in e.data) {
			if (e.data.record == false) { // mute
				if ("recording" in session.videoElement) {
					recordLocalVideo("stop");
				}
			} else if (e.data.record  == true){
				if ("recording" in session.videoElement) {
					// already recording
				} else {
					recordLocalVideo("start");
				}
			}
		}


		if ("volume" in e.data) {
			for (var i in session.rpcs) {
				try {
					session.rpcs[i].videoElement.volume = parseFloat(e.data.volume);
				} catch (e) {
					errorlog(e);
				}
			}
		}

		if ("bitrate" in e.data) {
			for (var i in session.rpcs) {
				try {
					session.requestRateLimit(parseInt(e.data.bitrate), i);
				} catch (e) {
					errorlog(e);
				}
			}
		}
		
		if ("audiobitrate" in e.data) {
			for (var i in session.rpcs) {
				try {
					session.requestAudioRateLimit(parseInt(e.data.audiobitrate), i);
				} catch (e) {
					errorlog(e);
				}
			}
		}
		

		if ("sceneState" in e.data) { // TRUE OR FALSE - tells the connected peers if they are live or not via a tally light change.

			var visibility = e.data.sceneState;
			var bundle = {};
			bundle.sceneUpdate = [];

			for (var UUID in session.rpcs) {
				if (session.rpcs[UUID].visibility !== visibility) { // only move forward if there is a change; the event likes to double fire you see.

					session.rpcs[UUID].visibility = visibility;
					var msg = {};
					msg.visibility = visibility;

					if (session.rpcs[UUID].videoElement.style.display == "none") { // Flag will be left alone, but message will say its disabled.
						msg.visibility = false;
					}

					msg.UUID = UUID;
					session.sendRequest(msg, UUID);
					bundle.sceneUpdate.push(msg);
				}
			}
			session.sendRequest(bundle); // we want all publishing peers to know the state
		}

		if ("sendMessage" in e.data) { // webrtc send to viewers
			session.sendMessage(e.data);
		}

		if ("sendRequest" in e.data) { // webrtc send to publishers
			session.sendRequest(e.data);
		}

		if ("sendPeers" in e.data) { // webrtc send message to every connected peer; like send and request; a hammer vs a knife.
			session.sendPeers(e.data);
		}

		if ("reload" in e.data) {
			location.reload();
		}

		if ("getStats" in e.data) {

			var stats = {};
			stats.total_outbound_connections = Object.keys(session.pcs).length;
			stats.total_inbound_connections = Object.keys(session.rpcs).length;
			stats.inbound_stats = {};
			for (var i in session.rpcs) {
				stats.inbound_stats[session.rpcs[i].streamID] = session.rpcs[i].stats;
			}


			for (var uuid in session.pcs) {
				setTimeout(function(UUID) {
					session.pcs[UUID].getStats().then(function(stats) {
						stats.forEach(stat => {
							if (stat.type == "outbound-rtp") {
								if (stat.kind == "video") {

									if ("qualityLimitationReason" in stat) {
										session.pcs[UUID].stats.quality_limitation_reason = stat.qualityLimitationReason;
									}
									if ("framesPerSecond" in stat) {
										session.pcs[UUID].stats.resolution = stat.frameWidth + " x " + stat.frameHeight + " @ " + stat.framesPerSecond;
									}
									if ("encoderImplementation" in stat) {
										session.pcs[UUID].stats.encoder = stat.encoderImplementation;
									}
								}
							} else if (stat.type == "remote-candidate") {
								if ("relayProtocol" in stat) {
									if ("ip" in stat) {
										session.pcs[UUID].stats.remote_relay_IP = stat.ip;
									}
									session.pcs[UUID].stats.remote_relayProtocol = stat.relayProtocol;
								}
								if ("candidateType" in stat) {
									session.pcs[UUID].stats.remote_candidateType = stat.candidateType;
								}
							} else if (stat.type == "local-candidate") {
								if ("relayProtocol" in stat) {
									if ("ip" in stat) {
										session.pcs[UUID].stats.local_relayIP = stat.ip;
									}
									session.pcs[UUID].stats.local_relayProtocol = stat.relayProtocol;
								}
								if ("candidateType" in stat) {
									session.pcs[UUID].stats.local_candidateType = stat.candidateType;
								}
							} else if ((stat.type == "candidate-pair" ) && (stat.nominated)) {
								
								if ("availableOutgoingBitrate" in stat){
									session.pcs[UUID].stats.available_outgoing_bitrate_kbps = parseInt(stat.availableOutgoingBitrate/1024);
								}
								if ("totalRoundTripTime" in stat){
									session.pcs[UUID].stats.total_roundTripTime_ms = stat.totalRoundTripTime*1000;
								}
							}
							return;
						});
						return;
					});
				}, 0, uuid);
			}
			setTimeout(function() {
				stats.outbound_stats = {};
				for (var i in session.pcs) {
					stats.outbound_stats[i] = session.pcs[i].stats;
				}
				parent.postMessage({
					"stats": stats
				}, "*");
			}, 1000);
		}
		
		if ("getRemoteStats" in e.data) {
			session.sendRequest({"requestStats":true, "remote":session.remote});
		}

		if ("getLoudness" in e.data) {
			log("GOT LOUDNESS REQUEST");
			if (e.data.getLoudness == true) {
				session.pushLoudness = true;
				var loudness = {};
				
				for (var i in session.rpcs) {
					loudness[session.rpcs[i].streamID] = session.rpcs[i].stats.Audio_Loudness;
				}
				
				parent.postMessage({
					"loudness": loudness
				}, "*");
				
			} else {
				session.pushLoudness = false;
			}
		}

		if ("getStreamIDs" in e.data) {
			if (e.data.getStreamIDs == true) {
				var streamIDs = {};
				for (var i in session.rpcs) {
					streamIDs[session.rpcs[i].streamID] = session.rpcs[i].label;
				}
				parent.postMessage({
					"streamIDs": streamIDs
				}, "*");

			}
		}

		if ("close" in e.data) {
			for (var i in session.rpcs) {
				try {
					session.rpcs[i].close();
				} catch (e) {
					errorlog(e);
				}
			}
		}

		if ("style" in e.data) {
			try {
				const style = document.createElement('style');
				style.textContent = e.data.style;
				document.head.append(style);
				log(style);
			} catch (e) {
				errorlog(e);
			}
		}


		if ("automixer" in e.data) {
			if (e.data.automixer == true) {
				session.manual = false;
				try {
					updateMixer();
				} catch (e) {}
			} else if (e.data.automixer == false) {
				session.manual = true;
			}
		}

		if ("target" in e.data) {
			log(e.data);
			for (var i in session.rpcs) {
				try {
					if ("streamID" in session.rpcs[i]) {
						if ((session.rpcs[i].streamID == e.data.target) || (e.data.target == "*")) {
							try {
								if ("settings" in e.data) {
									for (const property in e.data.settings) {
										session.rpcs[i].videoElement[property] = e.data.settings[property];
									}
								}
								if ("add" in e.data) {
									getById("gridlayout").appendChild(session.rpcs[i].videoElement);

								} else if ("remove" in e.data) {
									try {
										session.rpcs[i].videoElement.parentNode.removeChild(session.rpcs[i].videoElement);
									} catch (e) {
										try {
											session.rpcs[i].videoElement.parentNode.parentNode.removeChild(session.rpcs[i].videoElement.parentNode);
										} catch (e) {}
									}
								}
							} catch (e) {
								errorlog(e);
							}
						}
					}
				} catch (e) {
					errorlog(e);
				}
			}
		}
	};
}

function setupIncomingVideoTracking(v, UUID){  // video element.
	
	if (session.directorUUID===UUID){
		v.muted=false;
	} else {
		v.muted = session.speakerMuted;
	}
	
	v.onpause = (event) => { // prevent things from pausing; human or other
		if (!((event.ctrlKey) || (event.metaKey) )){
			warnlog("Video paused; force it to play again");
			//return;
			//session.audioCtx.resume();
			//log("ctx resume");
			
			event.currentTarget.play().then(_ => {
				log("playing");
			}).catch(error => {
				warnlog("didnt play 1");
			});
			
		}
	}
	
	v.onplay = function(){
		try {
			var bigPlayButton = document.getElementById("bigPlayButton");
			if (bigPlayButton){
				bigPlayButton.parentNode.removeChild(bigPlayButton);
			}
		} catch(e){}
		if (session.pip){
			if (v.readyState >= 3){
				if (!(v.pip)){
					v.pip=true;
					toggleSystemPip(v, true);
				}
			}
		}
		
	}
	
	if (session.pip){
		v.onloadedmetadata = function(){
			if (!v.paused){
				if (!(v.pip)){
					v.pip=true;
					toggleSystemPip(v, true);
				}
			}
		}
	}

	
	v.addEventListener('resize', (e) => {
		log("resize event");
		var aspectRatio = parseFloat(e.target.videoWidth/e.target.videoHeight);
		if (v.dataset.aspectRatio){
			if (aspectRatio != v.dataset.aspectRatio){
				setTimeout(function(){updateMixer();},1);  // We don't want to run this on the first resize?  just subsequent ones.
			}
		} else {
			log("ASPECT RATIO CHANGED");
			setTimeout(function(){updateMixer();},1);
		}
		v.dataset.aspectRatio = parseFloat(e.target.videoWidth/e.target.videoHeight);
	});
	
	v.volume = 1.0; // play audio automatically
	v.autoplay = true;
	v.controls = false;
	v.className += "tile";
	v.setAttribute("playsinline","");
	v.controlTimer = null;
	
	changeAudioOutputDevice(v);  // if enabled, changes to desired output audio device.
	
	if (document.getElementById("mainmenu")){
		var m = getById("mainmenu");
		m.remove();
	}
	
	if (session.director){
		v.controls = true;
		var container = getById("videoContainer_"+UUID);	
		v.disablePictureInPicture = false
		v.setAttribute("controls","controls")
		container.appendChild(v);
		session.requestRateLimit(session.directorViewBitrate,UUID); /// limit resolution for director
		
		if (session.beepToNotify) {
			playtone();
		}
		
	} else if (session.scene!==false){
		v.controls = false;
		
		if (session.view){ // specific video to be played
			v.style.display="block";
		} else if (session.scene===0){
			v.style.display="block";
		} else {  // group scene I guess; needs to be added manually
			v.style.display="none";
			v.muted= true;
		}
		
		setTimeout(function(){updateMixer();},1);
	} else if (session.roomid!==false){
		if (session.cleanOutput){
			v.controls = false;
		} else if (window.obsstudio) {
			v.controls = false;
		} else {
			v.controls = true;
		}
		if ((session.roomid==="") && (session.bitrate)){
			// let's keep the default bitrates, since this isn't a real room and bitrates are specified.
		} else if (session.novideo !== false){
			if (session.novideo.includes(session.rpcs[UUID].streamID)){
				session.requestRateLimit(0,UUID);// limit resolution for guests  see ln: 1804 in main.js also
			}
		} else {
			session.requestRateLimit(0,UUID);// limit resolution for guests  see ln: 1804 in main.js also
		}
		setTimeout(function(){updateMixer();},1);
	} else {
		v.style.display="block";
		if (window.obsstudio) {
			v.controls = false;
		}
		setTimeout(function(){updateMixer();},1);
	}
	
	
	v.addEventListener('click', function(e) { // show stats of video if double clicked
		log("clicked");
		try {
			if ((e.ctrlKey)||(e.metaKey)){
				e.preventDefault();
				var uid = e.currentTarget.dataset.UUID;
				if ("stats" in session.rpcs[uid]){
				
					var [menu, innerMenu] = statsMenuCreator();
					
					printViewStats(innerMenu, session.rpcs[uid].stats, session.rpcs[uid].streamID );
					
					menu.interval = setInterval(printViewStats,3000, innerMenu, session.rpcs[uid].stats, session.rpcs[uid].streamID);
					
					
				}
				e.stopPropagation();
				return false;
			}
		} catch(e){errorlog(e);}
	});
	
	if (session.statsMenu){
		if ("stats" in session.rpcs[UUID]){
			
			if (getById("menuStatsBox")){
				clearInterval(getById("menuStatsBox").interval);
				getById("menuStatsBox").remove();
			}
					
			var [menu, innerMenu] = statsMenuCreator();
			
			printViewStats(innerMenu, session.rpcs[UUID].stats, session.rpcs[UUID].streamID );
			
			menu.interval = setInterval(printViewStats,3000, innerMenu, session.rpcs[UUID].stats, session.rpcs[UUID].streamID);
			
		}
	}
	
	
	v.touchTimeOut = null;
	v.touchLastTap = 0;
	v.touchCount = 0;
	v.addEventListener('touchend', function(event) {
		log("touched");
		
		document.ontouchup = null;
		document.onmouseup = null;
		document.onmousemove = null;
		document.ontouchmove = null;
		
		var currentTime = new Date().getTime();
		var tapLength = currentTime - v.touchLastTap;
		clearTimeout(v.touchTimeOut);
		if (tapLength < 500 && tapLength > 0) {
			///
			log("double touched");
			v.touchCount+=1;
			event.preventDefault();
			if (v.touchCount<5){
				v.touchLastTap = currentTime;
				return false;
			}
			v.touchLastTap = 0;
			v.touchCount=0;
	
			log("double touched");
			var uid = event.currentTarget.dataset.UUID;
			if ("stats" in session.rpcs[uid]){
				
				var [menu, innerMenu] = statsMenuCreator();
				
				printViewStats(innerMenu, session.rpcs[uid].stats, session.rpcs[uid].streamID );
				
				menu.interval = setInterval(printViewStats,3000, innerMenu, session.rpcs[uid].stats, session.rpcs[uid].streamID);

				
			}
			event.stopPropagation();
			return false;
			//////
		} else {
			v.touchCount=1;
			v.touchTimeOut = setTimeout(function(vv) {
				clearTimeout(vv.touchTimeOut);
				vv.touchLastTap = 0;
				vv.touchCount=0;
			}, 5000, v);
			v.touchLastTap = currentTime;
		}
		
	});
	
	
	if (session.remote){
		v.addEventListener("wheel", session.remoteControl);
	}

	if (v.controls == false){
		v.addEventListener("click", function () {
			if (v.paused){
				log("PLAYING MANUALLY?");
				v.play().then(_ => {
				  log("playing");
				}).catch(warnlog);
			}
		});
		if (session.nocursor==false){ // we do not want to show the controls. This is because MacOS + OBS does not work; so electron app needs this.
			if (!(session.cleanOutput)){
				if (!(window.obsstudio)){
					if (v.controlTimer){
						clearInterval(v.controlTimer);
					}
					v.controlTimer = setTimeout(showControlBar.bind(null,v),3000);
					//v.controlTimer = setTimeout(function (){v.controls=true;},3000); // 3 seconds before I enable the controls automatically. This way it doesn't auto appear during loading.  3s enough, right?
				}
			}
		}
	}
	
	setTimeout(session.processStats, 1000, UUID);
	
}

function updateMixerRun(e=false){  // this is the main auto-mixing code.  It's a giant function that runs when there are changes to screensize, video track statuses, etc.
	if (getById("subControlButtons").dragElement){
		if (parseInt(getById("subControlButtons").style.top) > 0){
			getById("subControlButtons").style.top = "0px";
		} else if (parseInt(getById("subControlButtons").style.top) < parseInt(50 - window.innerHeight) ){
			getById("subControlButtons").style.top =  parseInt( 50 - window.innerHeight)+"px";
		}
		if (parseInt(getById("subControlButtons").style.left) < 0){
			getById("subControlButtons").style.left = "0px";
		} else if (parseInt(getById("subControlButtons").style.left) > parseInt( window.innerWidth - getById("subControlButtons").offsetWidth) ){
			getById("subControlButtons").style.left =  parseInt( window.innerWidth -getById("subControlButtons").offsetWidth )+"px";
		}
	}
	if (session.director){return;}
	if (session.manual === true){return;}
	var playarea = getById("gridlayout");
	var header = getById("header");
	
	var hi = header.offsetHeight ;
	var w = window.innerWidth;
	var h = window.innerHeight - hi;
	
	if ( window.innerHeight<=700 ){
		if (document.getElementById("controlButtons")){
			var h = window.innerHeight - hi - document.getElementById("controlButtons").offsetHeight;
		} else {
			var h = window.innerHeight - hi;
		}
	}
	
	if (session.aspectratio){
		if (session.aspectratio==1){
			var arW = 9.0;
			var arH = 16.0;
		} else if (session.aspectratio==2){
			var arW = 1.0;
			var arH = 1.0;
		}
	} else {
		var arW = 16.0;
		var arH = 9.0;
	}
	
	var ww = w/arW;
	var hh = h/arH;
	
	var mediaPool = [];
	var mediaPool_invisible = [];
	
	if (session.videoElement){ // I, myself, exist
		if (session.videoElement.style.display!="none"){  // local feed
			if (session.minipreview && (session.infocus!==true)){
				
				session.videoElement.onclick = function(){
					if (session.infocus === true){
						session.infocus = false;
					} else {
						session.infocus = true;
						log("session: myself");
					}
					setTimeout(()=>updateMixer(),10);
				};
				
			} else {
				if (session.order!==false){
					session.videoElement.order=session.order;
				} else {
					session.videoElement.order=0;
				}
				if (session.activeSpeaker && (!session.activelySpeaking)){
					mediaPool_invisible.push(session.videoElement);
				} else {
					mediaPool.push(session.videoElement);
				}
			}
		}
	}
	
	if (session.screenShareElement){ // I, myself, exist
		if (session.screenShareElement.style.display!="none"){  // local feed
			if (session.order!==false){
				session.screenShareElement.order=session.order;
			} else {
				session.screenShareElement.order=0;
			}
			
			if (session.infocus!==false){
				mediaPool_invisible.push(session.screenShareElement);
			} else if (session.activeSpeaker && (!session.activelySpeaking)){
				mediaPool_invisible.push(session.screenShareElement);
			} else {
				mediaPool.push(session.screenShareElement);
			}
		}
	}
	
	if (session.iframeEle){ // I, myself, exist
		if (session.iframeEle.style.display!="none"){  // local feed
			if (session.order!==false){
				session.iframeEle.order=session.order;
			} else {
				session.iframeEle.order=0;
			}
			if (session.activeSpeaker && (!session.activelySpeaking)){
				mediaPool_invisible.push(session.iframeEle);
			} else {
				mediaPool.push(session.iframeEle);
			}
		}
	}
	

	if ((session.infocus) && (session.infocus in session.rpcs)){ // remote guest being full screened; infocus == UUID
		log(session.infocus+" set fullscreen");
		mediaPool = []; // remove myself from fullscreen
		for (var j in session.rpcs){
			if (j != session.infocus){
				session.requestRateLimit(0, j); // disable the video of non-fullscreen videos
				try {
					if (session.rpcs[j].videoElement.style.display!="none"){  // Add it if not hidden
						mediaPool_invisible.push(session.rpcs[j].videoElement);
					}
				} catch(e){}
			} else {  // in focus video
				////////
				try {
					if (session.rpcs[j].order!==false){
						session.rpcs[j].videoElement.order=session.rpcs[j].order;
					} else {
						session.rpcs[j].videoElement.order=0;
					}
					///////////
					if (session.activeSpeaker && (!session.rpcs[j].activelySpeaking)){
						mediaPool_invisible.push(session.rpcs[j].videoElement);
					} else {
						mediaPool.push(session.rpcs[j].videoElement);
					}
					
					session.rpcs[j].videoElement.style.visibility = "visible";
					if ((session.rpcs[j].targetBandwidth!==-1) && (session.rpcs[j].targetBandwidth<session.zoomedBitrate)){
						session.requestRateLimit(session.zoomedBitrate, j); // 1.2mbps is decent, no?
					}
				} catch(e){}
			}
		}
	} else if ((session.infocus) && (session.infocus === true)){  // well, fullscreen myself. "true" represents me. UUID would be for others.
		log("myself set fullscreen");
		// already added myself to this as fullscreen
		for (var j in session.rpcs){
			session.requestRateLimit(0, j); // other videos are disabled when previewing yourself
			try {
				if (session.rpcs[j].videoElement.style.display!="none"){  // Add it if not hidden
					mediaPool_invisible.push(session.rpcs[j].videoElement);
				}
			} catch(e){}
		}
	} else {
		var roomQuality = 0;
		
		for (var i in session.rpcs){
			if (session.rpcs[i]===null){continue;}
			if (session.rpcs[i].videoElement){ // remote feeds
				
				if (session.rpcs[i].videoElement.style.display!="none"){
					if (session.rpcs[i].videoElement.srcObject.getVideoTracks().length){ // only count videos with actual video tracks; audio-only excluded
						if (session.rpcs[i].videoMuted){
							// it's video muted
							mediaPool_invisible.push(session.rpcs[i].videoElement); // skipped later on
						} else if (session.rpcs[i].directorVideoMuted){
							// it's muted by the director, so likely disabled.
							mediaPool_invisible.push(session.rpcs[i].videoElement);  // skipped later on
						} else if (session.rpcs[i].videoElement.style.opacity==="0"){
							mediaPool_invisible.push(session.rpcs[i].videoElement);  // skipped later on
						} else {
							roomQuality+=1;
						}
					}
				}
			}
		}
		
		if (session.broadcast!==false){
			if (roomQuality>0){
				if (session.nopreview!==false){
					mediaPool = []; // we don't want to show our self-preview if in broadcast mode and there is a director.
				}
			}
		}
		
		if (roomQuality === 0){roomQuality=1;}
		
		roomQuality = parseInt(session.totalRoomBitrate/roomQuality);
		//if (roomQuality<20){
		//	roomQuality=20;
		//}
		
		for (var i in session.rpcs){
			if (session.rpcs[i]===null){continue;}
			
			if (session.rpcs[i].iframeEle){
				if (session.rpcs[i].order!==false){
					session.rpcs[i].iframeEle.order=session.rpcs[i].order;
				} else {
					session.rpcs[i].iframeEle.order=0;
				}
				if (session.activeSpeaker && (!session.rpcs[i].activelySpeaking)){
					mediaPool_invisible.push(session.rpcs[i].iframeEle);
				} else {
					mediaPool.push(session.rpcs[i].iframeEle);
				}
				continue;
			}
			
			if (session.rpcs[i].imageElement){
				//if (session.rpcs[i].videoElement.srcObject.getVideoTracks().length==0){ // video shouldn't be on if images are on.
				
					if (session.rpcs[i].videoElement){ // is there audio?
						mediaPool_invisible.push(session.rpcs[i].videoElement); // include audio as hidden track; 
					}
				
					if (session.rpcs[i].videoMuted){
						continue;
					} else if (session.rpcs[i].directorVideoMuted){
						continue;
					}
				
					if (session.rpcs[i].order!==false){
						session.rpcs[i].imageElement.order=session.rpcs[i].order;
					} else {
						session.rpcs[i].imageElement.order=0;
					}
					if (session.activeSpeaker && (!session.rpcs[i].activelySpeaking)){
						// mediaPool_invisible.push(session.rpcs[i].imageElement);
					} else {
						mediaPool.push(session.rpcs[i].imageElement);
					}
					
					continue;
			//	} else {
			//		errorlog("Video track added while in webp streaming mode? wasted bandwidth / cpu ..")
			//	}
			}
			
			if (session.rpcs[i].videoElement){ // remote feeds
			
				//session.rpcs[i].targetBandwidth = -1;
				if (session.rpcs[i].videoElement.style.opacity==="0"){
					continue;
				}
							
				try{
					session.rpcs[i].videoElement.style.visibility = "visible";
				} catch(e){}
				
				if (session.directorUUID ===session.rpcs[i].UUID){  // director is never audio-only.  Video if need, yes, but not visualized-audio.
					if (session.rpcs[i].videoElement.srcObject.getVideoTracks().length==0){
						//if (session.style==1){ //  avatars and waveforms might be better done elsewhere? as a canvas effect even?
						continue;
						//}
					}
				} else if (session.style==2){
					log("style = 2");
					if (session.rpcs[i].videoElement.srcObject.getVideoTracks().length==0){
						if (session.rpcs[i].canvas){
							if (session.rpcs[i].order!==false){
								session.rpcs[i].canvas.order=session.rpcs[i].order;
							} else {
								session.rpcs[i].canvas.order=0;
							}
							
							if (session.activeSpeaker && (!session.rpcs[i].activelySpeaking)){
								mediaPool_invisible.push(session.rpcs[i].canvas);
							} else {
								mediaPool.push(session.rpcs[i].canvas);
							}
						}
						continue;
					}
				} else if (session.style==1){
					if (session.rpcs[i].videoElement.srcObject.getVideoTracks().length==0){
						//if (session.style==1){ //  avatars and waveforms might be better done elsewhere? as a canvas effect even?
						continue;
						//}
					}
				} else if (session.scene!==false){
					if (session.rpcs[i].videoElement.srcObject.getVideoTracks().length==0){ // unless style==2, then scenes don't show audio.
						//if (session.style==1){ //  avatars and waveforms might be better done elsewhere? as a canvas effect even?
						continue;
						//}
					}
				}
				
				if (session.rpcs[i].videoMuted){
					continue;
				} else if (session.rpcs[i].directorVideoMuted){
					continue;
				}
				
				if (session.director){  // director video should be low-bitrate, although this should never fire.
					warnlog("Update should not be called on DIRECTORs view? sorta at least"); // the director should never be called.
					return;
				} else if (session.rpcs[i].videoElement.style.display=="none"){  // Video is disabled; run at lowest
					if (session.scene!==false){
						session.requestRateLimit(session.hiddenSceneViewBitrate, i);  // hidden. I dont want it to be super low, for video quality reasons.
						if (!session.hiddenSceneViewBitrate){
							session.rpcs[i].videoElement.classList.add("nogb");
						}
					} else {
						session.requestRateLimit(0, i); // w/e   This is not in OBS, so we just set it as low as possible.  Shoudln't exist really unless loading?
					}
				} else if (session.scene!==false){  // max
					session.requestRateLimit(-1, i);  // unlock.
					if (session.rpcs[i].order!==false){
						session.rpcs[i].videoElement.order=session.rpcs[i].order;
					} else {
						session.rpcs[i].videoElement.order=0;
					}
					if (session.activeSpeaker && (!session.rpcs[i].activelySpeaking)){
						if (!(session.rpcs[i].videoElement in mediaPool_invisible)){
							mediaPool_invisible.push(session.rpcs[i].videoElement);
						} else {
							errorlog("THIS SHOULD NOT HAPPEN; 650");
						}
					} else {
						mediaPool.push(session.rpcs[i].videoElement);
					}
				} else if (session.roomid!==false){  // guests should see video at low bitrate, ie: 100kbps (not 35kbps like if disabled)
					if (session.rpcs[i].order!==false){
						session.rpcs[i].videoElement.order=session.rpcs[i].order;
					} else {
						session.rpcs[i].videoElement.order=0;
					}
					if (session.activeSpeaker && (!session.rpcs[i].activelySpeaking)){
						if (!(session.rpcs[i].videoElement in mediaPool_invisible)){
							mediaPool_invisible.push(session.rpcs[i].videoElement);
						} else {
							errorlog("THIS SHOULD NOT HAPPEN; 665");
						}
					} else {
						mediaPool.push(session.rpcs[i].videoElement);
					}
					if ((session.roomid==="") && (session.bitrate)){
						// we will let the URL specified bitrate hold, since this isn't a real room.
						session.requestRateLimit(-1, i);
					} else {
						session.requestRateLimit(roomQuality, i); // well, screw that. Setting it to room quality.
					}
				} else {  // view=xx,yy  or whatever.  This should be highest quality.
					if (session.rpcs[i].order!==false){
						session.rpcs[i].videoElement.order=session.rpcs[i].order;
					} else {
						session.rpcs[i].videoElement.order=0;
					}
					if (session.activeSpeaker && (!session.rpcs[i].activelySpeaking)){
						if (!(session.rpcs[i].videoElement in mediaPool_invisible)){
							mediaPool_invisible.push(session.rpcs[i].videoElement);
						} else {
							errorlog("THIS SHOULD NOT HAPPEN; 684");
						}
					} else {
						mediaPool.push(session.rpcs[i].videoElement);
					}
					session.requestRateLimit(-1, i);
				}
			}
		}
	}
	if (session.director){return;} // director view says go no further :)
		
	if (document.fullscreenElement) {
		log("FULL SCREEN: "+document.fullscreenElement.id);
		return; // This is FULL SCREEN, so let's not continue.
	}
	
	var mpl = mediaPool.length;
	if (mpl>1){
		var BB = 0;
		var rw = 1;
		var rh = 1;
		var NW;
		var NH;
		var current;
		for (NW=1; NW <= mpl; NW++){
			NH = Math.ceil(mpl/NW);
			var www = ww/NW;
			var hhh = hh/NH;
			if (www>hhh){
				current = hhh * hhh * (mpl/(NW*NH));
			} else {
				current = www * www * (mpl/(NW*NH));
			}
			
			if (current>=BB){
				BB = current;
				rw = NW;
				rh = NH;
			}
				
		}
	} else { var rw=1; var rh=1;}
	
	
	if (playarea.getElementsByTagName("iframe").length){
		
		var childNodes = playarea.childNodes;
		
		for (var n=0;n<childNodes.length;n++){
			
			if (childNodes[n].getElementsByTagName("iframe").length==0){
				playarea.removeChild(childNodes[n]);
				n--;
			} else {
				
				var iftemp = childNodes[n].getElementsByTagName("iframe")[0];
				var matched=false;
				for (var m=0;m<mediaPool.length;m++){
					if (mediaPool[m]==iftemp){
						iftemp.alreadyAdded=true;
						matched=true;
					}
				}
				if (!matched){
					playarea.removeChild(childNodes[n]);
					n--;
				}
			}
		}
	} else {
		playarea.innerHTML = "";
	}
	
	if (session.videoElement){
		if ("playlist" in session.videoElement){
			playarea.appendChild(session.videoElement);
		}
		
		if (session.minipreview && (session.infocus!==true)){
			if (session.videoElement.style.display!="none"){
				if (session.videoElement.srcObject.getVideoTracks().length){
					if (mpl===0 && session.minipreview===2){
						mediaPool.push(session.videoElement);
					} else {
						var container = document.createElement("div");
						container.style.top=hi;
						container.style.right=0;
						container.style.width="18%";
						//container.style.height="20%";
						container.style.display = "flex";
						container.style.zIndex=2;
						container.style.margin="2%";
						container.style.position="absolute";
						container.style.cursor = "pointer";
						container.style.border = "2px #BBB solid";
						container.appendChild(session.videoElement);
						playarea.appendChild(container);
					}
				}
			}
		}
		
	}
	var i=0;
	var offset = 0;
	
	
	mediaPool_invisible.forEach(vid=>{
		vid.style.width = "0px";
		vid.style.height = "0px";
		vid.style.top = "0px";
		vid.style.left = "0px";
		//vid.alreadyAdded=false; // what am I doing here? wtf? TODO: this is a typo, right?
		if (vid.alreadyAdded && vid.alreadyAdded==true){
			vid.alreadyAdded=false;
			return;
		} else if (vid.dataset.doNotMove){
			return;
		}
		playarea.appendChild(vid);
	});
	
	mediaPool.sort(compare_vids);
	
	mediaPool.forEach(vid=>{
		
		var container = document.createElement("div");

		container.style.position = "absolute";
		container.style.display = "flex";
		container.style.alignItems = "center";
		offsetx=0;
		
		if (i!==0){
			if (Math.ceil((i+0.01)/rw)==rh){
				if (mediaPool.length%rw){
					offsetx = ((rw - mediaPool.length%rw)*(window.innerWidth/rw))/2;
				}
			}
		}
		
		offsety = (h- Math.ceil(mediaPool.length/rw)*Math.ceil(h/rh))/2;
		
		if (vid.alreadyAdded && vid.alreadyAdded==true){
			container = vid.parentNode;
		}
		
		container.style.left = offsetx+Math.floor(((i%rw)+0)*w/rw)+"px";
		container.style.top  = offsety+Math.floor((Math.floor(i/rw)+0)*h/rh + hi)+"px";
		container.style.width = Math.ceil(w/rw)+"px";
		container.style.height = Math.ceil(h/rh)+"px";
		
		if (vid.alreadyAdded && vid.alreadyAdded==true){
			vid.alreadyAdded=false;
			i+=1;
			return;
		} else if (vid.dataset.doNotMove){
			vid.style.position = "absolute";
			vid.style.left = container.style.left;
			vid.style.top = container.style.top;
			vid.style.width = container.style.width;
			vid.style.height = container.style.height;
			vid.style.display = "flex";
			i+=1;
			return;
		}
		
		
		playarea.appendChild(container);
		
		var wrw = Math.ceil(w/rw);
		var hrh = Math.ceil(h/rh);
		
		if (session.dynamicScale){
			if (vid.dataset.UUID){
				if (wrw && hrh){
					if (session.devicePixelRatio){
						session.requestResolution(vid.dataset.UUID, wrw * session.devicePixelRatio, hrh * session.devicePixelRatio);
					} else if (window.devicePixelRatio && parseInt(window.devicePixelRatio) > 1 ){
						session.requestResolution(vid.dataset.UUID, wrw*window.devicePixelRatio, hrh*window.devicePixelRatio);
					} else {
						session.requestResolution(vid.dataset.UUID, wrw, hrh);
					}
				}
			}
		}
		
		
		vid.style.objectFit = "contain";
		//vid.classList="";
		vid.style.maxWidth = "100%";
		vid.style.maxHeight = "100%";
		vid.style.margin = "auto";

		// Creates relative positioned element, important for label pos
		var holder = document.createElement("div");
		holder.className = "holder";
		//holder.appendChild(vid);
		container.appendChild(vid);
		container.appendChild(holder);
		
		
		
		if (vid.videoWidth && vid.videoHeight){
			var asw = wrw/vid.videoWidth;
			var ash = hrh/vid.videoHeight;
			
			if (asw < ash){
				holder.style.width = Math.ceil(vid.videoWidth*asw)+"px";
				holder.style.height = Math.ceil(vid.videoHeight*asw)+"px";
				holder.style.left = Math.ceil((Math.ceil(w/rw) - Math.ceil(vid.videoWidth*asw))/2);
				holder.style.top =  Math.ceil(( Math.ceil(h/rh) - Math.ceil(vid.videoHeight*asw))/2);
			} else {
				holder.style.width = Math.ceil(vid.videoWidth*ash)+"px";
				holder.style.height = Math.ceil(vid.videoHeight*ash)+"px";
				holder.style.left = Math.ceil((Math.ceil(w/rw) - Math.ceil(vid.videoWidth*ash))/2);
				holder.style.top =  Math.ceil((Math.ceil(h/rh) - Math.ceil(vid.videoHeight*ash))/2);
			}
		} else if (vid.width && vid.height){
			var asw = wrw/vid.width;
			var ash = hrh/vid.height;
			
			if (asw < ash){
				holder.style.width = Math.ceil(vid.width*asw)+"px";
				holder.style.height = Math.ceil(vid.height*asw)+"px";
				holder.style.left = Math.ceil((Math.ceil(w/rw) - Math.ceil(vid.width*asw))/2);
				holder.style.top =  Math.ceil(( Math.ceil(h/rh) - Math.ceil(vid.height*asw))/2);
			} else {
				holder.style.width = Math.ceil(vid.width*ash)+"px";
				holder.style.height = Math.ceil(vid.height*ash)+"px";
				holder.style.left = Math.ceil((Math.ceil(w/rw) - Math.ceil(vid.width*ash))/2);
				holder.style.top =  Math.ceil((Math.ceil(h/rh) - Math.ceil(vid.height*ash))/2);
			}	
		} else if (wrw/hrh < arW/arH){
			holder.style.width = "100%";
			holder.style.height = "100%";
			if (vid.tagName.toLowerCase()=="iframe"){
				holder.style.height = "100%";
			}
			holder.style.left = 0;
			holder.style.top =  0;
			
		} else {
			holder.style.width = "100%";
			holder.style.height = "100%";
			if (vid.tagName.toLowerCase()=="iframe"){
				holder.style.width = "100%";
			}
			holder.style.left = 0;
			holder.style.top =  0;
		}
		
		holder.style.position = "absolute";

		vid.style.width = "100%";
		vid.style.height = "100%";
		
		var fontsize = (vid.offsetWidth + vid.offsetHeight)*0.03;
		log("fontsize " +fontsize + " - " +vid.offsetWidth + " - " + vid.offsetHeight);
		if (!fontsize){
			if (vid.videoWidth/holder.offsetWidth > vid.videoHeight/holder.offsetHeight){
				fontsize = (holder.offsetHeight +  vid.videoHeight/holder.offsetHeight*vid.offsetWidth)*0.03;
			} else {
				fontsize = (holder.offsetWidth +  vid.videoWidth/holder.offsetWidth*vid.offsetHeight)*0.03;
			}
		}
		if (!fontsize){
			
			fontsize = (holder.offsetWidth + holder.offsetHeight)*0.03;
		}
		log("fontsize final:" +fontsize);
		

		if (vid.dataset.UUID && session.rpcs[vid.dataset.UUID].label !== false && session.showlabels===true){  // remote source
			
			// creates a video label holder inside the recently created label holder
			var label = document.createElement("span");
			if (session.labelstyle){
				label.className = 'video-label '+session.labelstyle;
			} else {
				label.className = 'video-label';
			}
			if (fontsize){
				if (session.labelsize){
					fontsize = fontsize*session.labelsize/100;
				}
				fontsize = parseInt(fontsize);
				fontsize = fontsize+"px";
				label.style.fontSize = fontsize;
			}
			label.innerText = session.rpcs[vid.dataset.UUID].label;
			holder.appendChild(label);
		} else if ((session.showlabels===true) &&  (vid.id === "videosource") && (session.label)){  // local source
			// creates a label holder that's the same size of the vid element.
			
			// creates a video label holder inside the recently created label holder
			var label = document.createElement("span");
			if (session.labelstyle){
				label.className = 'video-label '+session.labelstyle;
			} else {
				label.className = 'video-label';
			}
			if (fontsize){
				if (session.labelsize){
					fontsize = fontsize*session.labelsize/100;
				}
				fontsize = parseInt(fontsize);
				fontsize = fontsize+"px";
				label.style.fontSize = fontsize;
			}
			
			label.innerText = sanitizeLabel(session.label);//.replace(/[\W]+/g,"_").replace(/_+/g, ' ');
			holder.appendChild(label);
		}
		
		if (vid.dataset.UUID && session.rpcs[vid.dataset.UUID] && session.rpcs[vid.dataset.UUID].voiceMeter){
			holder.appendChild(session.rpcs[vid.dataset.UUID].voiceMeter);
			
		}
		if (vid.dataset.UUID && session.rpcs[vid.dataset.UUID] && session.rpcs[vid.dataset.UUID].remoteMuteElement){
			holder.appendChild(session.rpcs[vid.dataset.UUID].remoteMuteElement);
		}
		try {
			if (!(session.cleanOutput) || (session.cleanish==true)){
				if (session.firstPlayTriggered===false){ // don't play unless needed; might cause clicking or who knows what else.
					warnlog("VIDEO IS NOT PLAYING");
					if (vid.tagName.toLowerCase()=="video"){ // we don't want to try playing an Iframe or Canvas.
						var playPromise = vid.play();
						if (playPromise !== undefined){
							playPromise.then(_ => {
								// playing
								session.firstPlayTriggered=true; // global tracking. "user gesture obtained", so no longer needed if playing.
							}).catch((err)=>{
								
								var bigPlayButton = document.getElementById("bigPlayButton");
								if (bigPlayButton){
									bigPlayButton.innerHTML = '<i id="playButton" class="las la-play-circle"></i>';
									bigPlayButton.style.display="block";
								}
							});
						} else {
							session.firstPlayTriggered=true; // well, I don't know if it's playing, and so whatever. fail gracefully.
						}
					}
				}
			}
		} catch(e) {
			log("VIDEO IS PLAYING");
			var bigPlayButton = document.getElementById("bigPlayButton");
			if (bigPlayButton){
				bigPlayButton.parentNode.removeChild(bigPlayButton);
			}
					
		}
		
		if (vid.tagName.toLowerCase()=="iframe"){ // I need to add this back in at some point.
			i+=1;
			return;
		}
		
		if (!session.cleanOutput && !session.nocursor){
			if ((session.roomid!==false) && (session.scene===false)){
				var button = document.createElement("div");
				button.id = "button_"+vid.id;
				
				if (session.infocus){
					button.innerHTML = "<img src='./media/sd.svg' style='background-color:#0007;width:4vh' aria-hidden='true' />";
					button.title = "Show all active videos togethers";
				} else if (mediaPool.length>1){
					button.innerHTML = "<img src='./media/hd.svg' style='background-color:#0007;width:4vh' aria-hidden='true' />";
					button.title = "Enlarge video and increase its clarity";
				} else {
					button.style.visibility = "hidden";
				}
				button.style.transition = "opacity 0.3s"
				button.style.width ="4vh";
				button.style.height = "4vh";
				button.style.maxWidth ="30px";
				button.style.maxHeight = "30px";
				button.style.minWidth ="15px";
				button.style.minHeight = "15px";
				button.style.position = "absolute";
				//button.style.display="none";
				//button.style.opacity="10%";
				button.style.zIndex="3";
				button.style.right = "4vh";//(Math.ceil(w/rw) -30 - 30 + offsetx+Math.floor(((i%rw)+0)*w/rw))+"px";
				button.style.top  = "4vh";//(  offsety + 30 + Math.floor((Math.floor(i/rw)+0)*h/rh + hi))+"px";
				button.style.color = "white";
				button.style.cursor = "pointer";
				
				
				container.appendChild(button);
				if (vid.id == "videosource"){
					button.onclick = function(){
						var target =  event.currentTarget;
						log(target);
						if (session.infocus === true){
							session.infocus = false;
							//target.childNodes[0].className = 'las la-arrows-alt';
						} else {
							session.infocus = true;
							log("session: myself");
							//target.childNodes[0].className = 'las la-compress';
						}
						setTimeout(()=>updateMixer(),10);
					};
					
				} else {
					button.dataset.UUID = vid.dataset.UUID;
					button.onclick = function(event){
						var target =  event.currentTarget;
						log("fullscreen");
						log(target);
						if (session.infocus === target.dataset.UUID){
							//target.childNodes[0].className = 'las la-arrows-alt';
							session.infocus = false;
						} else {
							//target.childNodes[0].className = 'las la-compress';
							session.infocus = target.dataset.UUID;
							//log("session:"+target.dataset.UUID);
						}
						setTimeout(()=>updateMixer(),10);
					};
					
				}
				vid.onclick = function(){
					button.style.display="block";
					container.style.backgroundColor= "#4444";
					button.style.opacity="100%";
				};
				button.onmouseenter = function(){
					button.style.display="block";
					container.style.backgroundColor= "#4444";
					setTimeout(function(button){button.style.opacity="100%";},0,button);
					
				};
				container.onmouseenter = function(){
					button.style.display="block";
					container.style.backgroundColor= "#4444";
					setTimeout(function(button){button.style.opacity="100%";},0,button);
				};
				container.onmouseleave = function(){
					button.style.display="none";
					container.style.backgroundColor= null;
					button.style.opacity="10%";
				};
			}
		}
		i+=1;
	});
}


var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
var eventer = window[eventMethod];
var messageEvent = eventMethod === "attachEvent" ? "onmessage" : "message";
eventer(messageEvent, function(e) { // this listens for child IFRAMES.
	if ("action" in e.data) {
		if (e.data.action == "screen-share-ended") {
			if (session.screenShareElement) {
				if (e.source == session.screenShareElement.contentWindow) { // reject messages send from other iframes
					warnlog(e);
					session.screenShareElement.contentWindow.postMessage({
						"close": true
					}, '*');
					session.screenShareElement.parentNode.removeChild(session.screenShareElement);
					session.screenShareElement = false;
					updateMixer();
					getById("screenshare2button").classList.add("float");
					getById("screenshare2button").classList.remove("float2");
				}
			}
		}
	}
});


function requestKeyframeScene(ele) {
	var UUID = ele.dataset.UUID;
	if (ele.dataset.value == 1) {
	} else {
		ele.dataset.value = 1;
		ele.classList.add("pressed");
		session.requestKeyframe(UUID, true);
		setTimeout(function(el){
			el.dataset.value = 0;
			el.classList.remove("pressed");
		}, 1000, ele)
	}
}

function pokeIframeAPI(action, value = null, UUID = null) {
	if (!isIFrame){return;}
	try {
		var data = {};

		data.action = action;

		if (value !== null) {
			data.value = value;
		}
		if (UUID !== null) {
			data.UUID = UUID;
		}

		if (isIFrame) {
			parent.postMessage(data, "*");
		}
	} catch (e) {
		errorlog(e);
	}
}

function jumptoroom(event = null) {

	if (event) {
		if (event.which !== 13) {
			return;
		}
	}

	var arr = window.location.href.split('?');
	var roomname = getById("joinroomID").value;
	roomname = sanitizeRoomName(roomname);
	if (roomname.length) {

		var passStr = "";
		var pass = prompt("Enter a password if provided, otherwise just click cancel"); //sanitizePassword(session.password);
		if (pass && pass.length) {
			session.password = sanitizePassword(pass);
			passStr = "&password=" + session.password;
		} else {
			session.password = false;
		}

		if (arr.length > 1 && arr[1] !== '') {
			window.location += "&room=" + roomname + passStr;
		} else {
			window.location += "?room=" + roomname + passStr;
		}
	}
}

function sleep(ms = 0) {
	return new Promise(r => setTimeout(r, ms)); // LOLz!
}

//////////  Canvas Effects  ///////////////

function drawFrameMirrored() {
	session.canvasCtx.save();
	session.canvasCtx.scale(-1, 1);
	session.canvasCtx.drawImage(session.canvasSource, 0, 0, session.canvas.width * -1, session.canvas.height);
	session.canvasCtx.restore();
}

function setupCanvas() {
	if (session.canvas === null) {
		warnlog("SETUP CANVAS");
		session.canvas = document.createElement("canvas");
		session.canvas.width = 512;
		session.canvas.height = 288;
		session.canvasCtx = session.canvas.getContext('2d', {alpha: false, desynchronized: true});
		//session.canvasCtx.width=288;
		//session.canvasCtx.height=720;
		session.canvasCtx.fillStyle = "blue";
		session.canvasCtx.fillRect(0, 0, 512, 288);
		session.canvasSource = document.createElement("video");
		session.canvasSource.width=512;
		session.canvasSource.height=288;
		session.canvasSource.autoplay = true;
		session.canvasSource.srcObject = new MediaStream();
	}
}

function applyEffects(track, stream) {
	
	setupCanvas();
	
	session.canvasSource.srcObject.addTrack(track, stream);
	session.canvasSource.width = track.getSettings().width || 1280;
	session.canvasSource.height = track.getSettings().height || 720;
	session.canvas.width = track.getSettings().width || 1280;
	session.canvas.height = track.getSettings().height || 720;
	
	var audioTracks = session.streamSrc.getAudioTracks();
	session.streamSrc = session.canvas.captureStream();
	audioTracks.forEach(function(trk) {
		session.streamSrc.addTrack(trk);
	});
	session.videoElement.srcObject = session.streamSrc;
	
	if (session.effects == 1) { // auto align face
		setTimeout(function() {
			drawFace();
		}, 100);
	} else if (session.effects == 2) {  // mirror video at a canvas level
		var drawRate = parseInt(1000 / track.getSettings().frameRate) + 1;
		if (session.canvasInterval !== null) {
			clearInterval(session.canvasInterval);
		}
		session.canvasInterval = setInterval(function() {
			drawFrameMirrored();
		}, drawRate);
	} else if ((session.effects == 3) || (session.effects == 4) || (session.effects == 5)){   // blur & greenscreen (low and high)
		TFLiteWorker();
	} else if (session.effects == 6){
		session.canvasSource.onloadeddata = mainMeshMask;
	}
	return session.streamSrc.getVideoTracks()[0];
}

function dataURItoArraybuffer(dataURI) {
  var byteString = atob(dataURI.split(',')[1]);
  var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
  var ab = new ArrayBuffer(byteString.length);
  var ia = new Uint8Array(ab);
  for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
  }
  return ab;
}


var makeImagesActive = null; 
var makeImagesTimeout = null;
async function makeImages(startup=false){
	if (makeImagesActive===true){return;}
	if (!session.videoElement){return;}
	if (session.videoMuted){return;}
	if (!session.videoElement.srcObject.getVideoTracks().length){return;}
	
	if (makeImagesActive===null){	
		makeImagesActive=true;
		session.webPcanvas = document.createElement("canvas");
		
		var width = 480;
		var height = 270;
		var timeout = 60;
		
		if (session.webPquality===0){
			width = 1920;
			height = 1080;
			timeout = 15;
		} else if (session.webPquality===1){
			width = 1280;
			height = 720;
			timeout = 15;
		} else if (session.webPquality===2){
			width = 640;
			height = 360;
			timeout = 15;
		} else if (session.webPquality===3){
			width = 480;
			height = 270;
			timeout = 15;
		} else if (session.webPquality===4){
			width = 480;
			height = 270;
			timeout = 30;
		} else {
			width = 480;
			height = 270;
			timeout = 60;
		}
		session.webPcanvas.width = width;
		session.webPcanvas.height = height;
		session.webPcanvas.timeout = timeout;
		session.webPcanvasCtx = session.webPcanvas.getContext('2d', {alpha: false, desynchronized: true});
		session.webPcanvasCtx.fillStyle = "black";
		session.webPcanvasCtx.fillRect(0, 0, width, height);
	} else {
		makeImagesActive=true;
	}
	
	if (startup){
		var exit = true;
		for (var i in session.pcs){
			if (session.pcs[i].allowBroadcast){ // just for safety, to avoid a race condition, double check that it's still not active.
				exit = false;
			}
		}
		if (exit){
			makeImagesActive=false;
			return;
		}
	}
	
	try{
		session.webPcanvasCtx.drawImage(session.videoElement, 0, 0, session.webPcanvas.width, session.webPcanvas.height);
		const webp = session.webPcanvas.toDataURL("image/webp",0.6); // seems like a good balance here
		const arrayBuffer = dataURItoArraybuffer(webp);
		var broadcasting = false;
		for (var i in session.pcs){
			try{
				if (session.pcs[i].allowBroadcast){ // only publish to those seeking this stream
					broadcasting = true;
					if (!session.pcs[i].sendChannel.bufferedAmount){ // only send when the buffer is free. don't clog it up or wait.
						session.pcs[i].sendChannel.send(arrayBuffer);
					}
				}
			} catch(e){}
		}
	} catch(e){
		warnlog(e);
		makeImagesActive=false;
		return;
	}
	makeImagesActive=false;
	if (broadcasting){ // cancel broadcasting since now one is active.
		clearTimeout(makeImagesTimeout);
		makeImagesTimeout = setTimeout(function(){
			window.requestAnimationFrame(makeImages);
		},session.webPcanvas.timeout);
	} else {
		for (var i in session.pcs){
			if (session.pcs[i].allowBroadcast){ // just for safety, to avoid a race condition, double check that it's still not active.
				clearTimeout(makeImagesTimeout);
				makeImagesTimeout = setTimeout(function(){
					window.requestAnimationFrame(makeImages);
				},session.webPcanvas.timeout);
				return;
			}
		}
		log("Stopping webP broadcast.");
	}
}

var updateUserListTimeout=null
var updateUserListActive = false;
function updateUserList(){
	if ((session.showList!==true) && (session.cleanOutput || (session.scene!==false) || !session.roomid || session.director || (session.showList===false))){return;}
	clearInterval(updateUserListTimeout);
	updateUserListTimeout = setTimeout(function(){
		if (updateUserListActive){return;}
		updateUserListActive=true;
		try {
			var added = false;
			getById("userList").innerHTML = "";
			
			for (var UUID in session.rpcs){
				var track = false;
				if (session.rpcs[UUID].streamSrc && session.rpcs[UUID].streamSrc.getVideoTracks().length){
					var tracks = session.rpcs[UUID].streamSrc.getVideoTracks().forEach(function(trk){
						//if (!trk.muted){
						track=true;
						//}
					});
				}
				if (((session.rpcs[UUID].videoMuted || (track==false && !session.rpcs[UUID].imageElement)) && !session.rpcs[UUID].canvas) || ( session.infocus && session.infocus!==UUID )){
					
					if (UUID === session.directorUUID){
						if (!session.rpcs[UUID].streamSrc){ // director not active yet, so we won't bother showing it.
							continue;
						}
					}
					
					var insert = document.createElement("div");
					if (session.rpcs[UUID].label){
						insert.innerText = session.rpcs[UUID].label + "";
					} else if (session.directorUUID === UUID){
						insert.innerText = "Director";
					} else {
						insert.innerText = "Unknown User";
					}
					getById("userList").appendChild(insert);
					
					if (session.rpcs[UUID].remoteMuteState || !(session.rpcs[UUID].streamSrc)){
						var muteInsert = document.createElement("div");
						muteInsert.className = "video-mute-state-userlist";
						muteInsert.innerHTML = '<i class="las la-microphone-slash"></i>';
						insert.appendChild(muteInsert);
					} else if (session.rpcs[UUID].voiceMeter){
						insert.appendChild(session.rpcs[UUID].voiceMeter);
					}
					//getById("userList").innerHTML += "<br />";
					added=true;
				}
			}
			
			if (!added){
				getById("connectUsers").style.display = "none";
			} else {
				getById("connectUsers").style.display = "block";
			}
		} catch(e){}
		updateUserListActive=false;
	},200);
}

var LaunchTFWorkerCallback = false;
function TFLiteWorker(){
	if (session.tfliteModule==false){
		LaunchTFWorkerCallback=true
		return;
	}
	if (TFLITELOADING){LaunchTFWorkerCallback=true;return;}
	LaunchTFWorkerCallback=false;
	
	const segmentationWidth = 256;
	const segmentationHeight = 144;
	const segmentationPixelCount = segmentationWidth * segmentationHeight;
	const inputMemoryOffset  = session.tfliteModule._getInputMemoryOffset() / 4;
	const outputMemoryOffset = session.tfliteModule._getOutputMemoryOffset() / 4;
	const segmentationMask = new ImageData(segmentationWidth, segmentationHeight);
	const segmentationMaskCanvas = document.createElement('canvas');
	segmentationMaskCanvas.width = segmentationWidth;
	segmentationMaskCanvas.height = segmentationHeight;
	const segmentationMaskCtx = segmentationMaskCanvas.getContext('2d');
	
	session.tfliteModule.img = document.createElement("img");
	session.tfliteModule.img.onload = function(){
		URL.revokeObjectURL(session.tfliteModule.img.src);  // no longer needed, free memory
		session.tfliteModule.img.ready = true;
	}
	session.tfliteModule.img.src = "./media/bg_sample.jpg";
	session.tfliteModule.img.ready = false;
	
	console.log('Starting Loop');
   
	
	function process(){
		if (session.tfliteModule.activelyProcessing){return;}
		session.tfliteModule.activelyProcessing=true;
		try{
			segmentationMaskCtx.drawImage(
				session.canvasSource,
				0,
				0,
				session.canvasSource.width,
				session.canvasSource.height,
				0,
				0,
				segmentationWidth,
				segmentationHeight
			)
			
			const imageData = segmentationMaskCtx.getImageData(
				0,
				0,
				segmentationWidth,
				segmentationHeight
			);
			
			for (let i = 0; i < segmentationPixelCount; i++) {
				session.tfliteModule.HEAPF32[inputMemoryOffset + i * 3] = imageData.data[i * 4] / 255;
				session.tfliteModule.HEAPF32[inputMemoryOffset + i * 3 + 1] = imageData.data[i * 4 + 1] / 255;
				session.tfliteModule.HEAPF32[inputMemoryOffset + i * 3 + 2] = imageData.data[i * 4 + 2] / 255;
			}
			
			session.tfliteModule._runInference();
			
			for (let i = 0; i < segmentationPixelCount; i++) {
			  const background = session.tfliteModule.HEAPF32[outputMemoryOffset + i * 2];
			  const person = session.tfliteModule.HEAPF32[outputMemoryOffset + i * 2 + 1];
			  const shift = Math.max(background, person);
			  const backgroundExp = Math.exp(background - shift);
			  const personExp = Math.exp(person - shift);
			  segmentationMask.data[i * 4 + 3] = (255 * personExp) / (backgroundExp + personExp); // softmax
			}
			segmentationMaskCtx.putImageData(segmentationMask, 0, 0);
			
			session.canvasCtx.globalCompositeOperation = 'copy';
			session.canvasCtx.filter = 'blur(4px)';
			session.canvasCtx.drawImage(  
			  segmentationMaskCanvas,
			  0,
			  0,
			  segmentationWidth,
			  segmentationHeight,
			  0,
			  0,
			  session.canvasSource.width,
			  session.canvasSource.height
			)
			
			session.canvasCtx.globalCompositeOperation = 'source-in';
			session.canvasCtx.filter = 'none';
			session.canvasCtx.drawImage(session.canvasSource, 0, 0);
			
			session.canvasCtx.globalCompositeOperation = 'destination-over';
			if (session.effects=="4"){ // greenscreen 
				session.canvasCtx.filter = 'none';
				session.canvasCtx.fillStyle = "#0F0";
				session.canvasCtx.fillRect(0, 0, session.canvas.width, session.canvas.height);
			} else if (session.effects=="5"){ 
				session.canvasCtx.filter = 'none';
				if (session.tfliteModule.img.ready){
					session.canvasCtx.drawImage(session.tfliteModule.img, 0, 0, session.canvas.width, session.canvas.height);
				}
			} else if (session.effects=="3"){ // BLUR 
				session.canvasCtx.filter = 'blur(4px)'; // Does not work on Safari
				session.canvasCtx.drawImage(session.canvasSource, 0, 0);
			} else {
				session.tfliteModule.activelyProcessing=false;
				return;
			}
		} catch (e){
				errorlog(e);
				session.tfliteModule.activelyProcessing=false;
				return;
		}
		session.tfliteModule.activelyProcessing=false;
		window.requestAnimationFrame(process);
	}
	process();
}


function mainMeshMask() {
  if (model == false){
	 setTimeout(function(){mainMeshMask();},1000);
	 return;
  }
  function heatMapColorforValue(value){
	  var h = parseInt((1.0 - value) * 240);
	  if (h<0){h=0;}
	  if (h>240){h=240;}
	  return "hsl(" + h + ", 100%, 50%)";
  }
  async function innerLoop(){
	  const predictions = await model.estimateFaces({
		input: session.canvasSource
	  });
	  if (predictions.length > 0) {
		for (let j = 0; j < predictions.length; j++) {
		  const fp = predictions[j].annotations;
		  session.canvasCtx.fillStyle = "#000000";
		  session.canvasCtx.fillRect(0, 0, session.canvas.width, session.canvas.height);
		  const keypoints = predictions[j].scaledMesh
		  for (let i = 0; i < keypoints.length; i++) {
			const [x, y, z] = keypoints[i];
			session.canvasCtx.fillStyle = heatMapColorforValue((z+40)/60);
			session.canvasCtx.fillRect(parseInt(x), parseInt(y), 5, 5);
		  }
		}
	  }
	  window.requestAnimationFrame(innerLoop);
  }
  innerLoop();
}

function drawFace() {
	var faceAlignment = (function() {
		var vid = session.canvasSource;

		var canvas = session.canvas;
		var ctx = session.canvasCtx;

		var canvas_tmp = document.createElement("canvas");
		var ctx_tmp = canvas_tmp.getContext('2d');

		//var stream = canvas.captureStream(30);

		var image = new Image();
		var zoom = 10;
		var scale = 1;
		var lastFace = {};

		var w = vid.videoWidth;
		var h = vid.videoHeight;
		var x = vid.videoWidth / 2;
		var y = vid.videoHeight / 2;

		lastFace.x = vid.videoWidth / 2;
		lastFace.y = vid.videoHeight / 2;
		lastFace.w = vid.videoWidth;
		lastFace.h = vid.videoHeight;
		var yoffset = 0;

		if (window.FaceDetector == undefined) {
			//console.error('Face Detection not supported');
			var faceDetector = false;
		} else {
			var faceDetector = new FaceDetector();
			//console.log('FaceD Loaded');
			setTimeout(function() {
				detect();
			}, 300);
			setTimeout(function() {
				draw();
			}, 33);
		}

		canvas.height = vid.videoHeight;
		canvas.width = vid.videoWidth;
		canvas_tmp.height = vid.videoHeight;
		canvas_tmp.width = vid.videoWidth;
		image.src = canvas_tmp.toDataURL();
		scale = canvas.width / image.width;
		lastFace.x = 0;
		lastFace.y = 0;
		lastFace.w = 1280 / 3 / 16 * zoom;
		lastFace.h = 720 / 3 / 9 * zoom;

		w = 1280 / 5;
		h = 720 / 5;
		x = 1280 / 2;
		y = 720 / 2 - w * 9 / zoom / 2;

		async function detect() {

			if (session.effects !== 1){return;}

			ctx_tmp.drawImage(vid, 0, 0, vid.videoWidth, vid.videoHeight);
			image.src = canvas_tmp.toDataURL();
			await faceDetector.detect(image).then(faces => {

				if (faces.length === 0) {
					log("NO FACES");
					setTimeout(function() {
						detect();
					}, 10);
					return;
				}
				for (let face of faces) {
					lastFace.x = (face.boundingBox.x + lastFace.x) / 2 || face.boundingBox.x;
					lastFace.y = (face.boundingBox.y + lastFace.y) / 2 || face.boundingBox.y;
					lastFace.w = (face.boundingBox.width + lastFace.w) / 2 || face.boundingBox.width;
					lastFace.h = (face.boundingBox.height + lastFace.h) / 2 || face.boundingBox.height;
				}

				setTimeout(function() {
					detect();
				}, 300);
			}).catch((e) => {
				console.error("Boo, Face Detection failed: " + e);
			});

		}

		function draw() {
			
			if (session.effects !== 1){return;}
			
			canvas.height = vid.videoHeight;
			canvas.width = vid.videoWidth;

			if (lastFace.w - w < 0.15 * lastFace.w) {
				w = w * 0.999 + 0.001 * lastFace.w;
			}
			if (lastFace.h - h < 0.15 * lastFace.h) {
				h = h * 0.999 + 0.001 * lastFace.h;
			}
			if (Math.abs(x - (lastFace.x + lastFace.w / 2)) > 0.15 * (lastFace.x + lastFace.w / 2.0)) {
				x = x * 0.999 + 0.001 * (lastFace.x + lastFace.w / 2.0);
			}
			if (Math.abs(y - (lastFace.y + lastFace.h / 2)) > 0.15 * (lastFace.y + lastFace.h / 2.0)) {
				y = y * 0.999 + 0.001 * (lastFace.y + lastFace.h / 2.0);
			}

			yoffset = w * 9 / zoom / 2;

			var yyy = y - w * 9 / zoom - yoffset;
			var hhh = w * 3 * 9 / zoom;
			var www = w * 3 * 16 / zoom;
			var xxx = x - w * 16 / zoom * 1.5;

			if (www + xxx < 1280) {
				xxx = 1280 - www;
			}
			if (hhh + yyy < 720) {
				yyy = 720 - hhh;
			}

			if (www + xxx > 1280) {
				xxx = 1280 - www;
			}
			if (hhh + yyy > 720) {
				yyy = 720 - hhh;
			}

			if (yyy < 0) {
				yyy = 0;
			}
			if (xxx < 0) {
				xxx = 0;
			}

			ctx.drawImage(vid, xxx, yyy, www, hhh, 0, 0, vid.videoWidth, vid.videoHeight);

			setTimeout(function() {
				draw();
			}, 30);
		}
	})();
}


////////  END CANVAS EFFECTS  ///////////////////


if (urlParams.has('permaid') || urlParams.has('push')) {
	session.permaid = urlParams.get('push') || urlParams.get('permaid');

	if (session.permaid) {
		session.streamID = sanitizeStreamID(session.permaid);
	} else {
		session.permaid = null;
	}

	if (urlParams.has('permaid')) {
		updateURL("permaid=" + session.streamID, true, false); // I'm not deleting the permaID first tho...
	} else {
		updateURL("push=" + session.streamID, true, false); // I'm not deleting the permaID first tho...
	}

	if (urlParams.has('director') || urlParams.has('dir')) { // if I do a short form of this, it will cause duplications in the code elsewhere.
		//var director_room_input = urlParams.get('director');
		//director_room_input = sanitizeRoomName(director_room_input);
		//createRoom(director_room_input);
		session.permaid = false; // used to avoid a trigger later on.
	} else {
		getById("container-1").className = 'column columnfade advanced';
		getById("container-4").className = 'column columnfade advanced';
		getById("dropButton").className = 'column columnfade advanced';

		getById("info").innerHTML = "";
		if (session.videoDevice === 0) {
			getById("add_camera").innerHTML = "Share your Microphone";
			miniTranslate(getById("add_camera"), "share-your-mic");
		} else {
			getById("add_camera").innerHTML = "Share your Camera";
			miniTranslate(getById("add_camera"), "share-your-camera");
		}
		getById("add_screen").innerHTML = "Share your Screen";
		miniTranslate(getById("add_screen"), "share-your-screen");

		getById("passwordRoom").value = "";
		getById("videoname1").value = "";
		getById("dirroomid").innerHTML = "";
		getById("roomid").innerHTML = "";

		getById("mainmenu").style.alignSelf = "center";
		getById("mainmenu").classList.add("mainmenuclass");
		getById("header").style.alignSelf = "center";

		if ((iOS) || (iPad)) {
			getById("header").style.display = "none"; // just trying to free up space.
		}

		if (session.webcamonly == true) { // mobile or manual flag 'webcam' pflag set
			getById("head1").innerHTML = '<font style="color:#CCC;" data-translate="please-accept-permissions">- Please accept any camera permissions</font>';
		} else {
			getById("head1").innerHTML = '<br /><font style="color:#CCC" data-translate="please-select-which-to-share">- Please select which you wish to share</font>';
		}
	}
}

if ((session.roomid) || (urlParams.has('roomid')) || (urlParams.has('r')) || (urlParams.has('room')) || (filename) || (session.permaid !== false)) {

	var roomid = "";
	if (filename) {
		roomid = filename;
	} else if (urlParams.has('room')) {
		roomid = urlParams.get('room');
	} else if (urlParams.has('roomid')) {
		roomid = urlParams.get('roomid');
	} else if (urlParams.has('r')) {
		roomid = urlParams.get('r');
	} else if (session.roomid) {
		roomid = session.roomid;
	}

	session.roomid = sanitizeRoomName(roomid);

	if (!(session.cleanOutput)) {
		if (session.roomid === "test") {
			if (session.password === session.defaultPassword) {
				var testRoomResponse = confirm("The room name 'test' is very commonly used and may not be secure.\n\nAre you sure you wish to proceed?");
				if (testRoomResponse == false) {
					hangup();
					throw new Error("User requested to not enter room 'room'.");
				}
			}
		}
	}

	if (session.audioDevice === false && session.outputDevice === false) {
		getById("headphonesDiv2").style.display = "inline-block";
		getById("headphonesDiv").style.display = "inline-block";
	}
	getById("addPasswordBasic").style.display = "none";
	
	getById("info").innerHTML = "";
	getById("info").style.color = "#CCC";
	getById("videoname1").value = session.roomid;
	getById("dirroomid").innerText = session.roomid;
	getById("roomid").innerText = session.roomid;
	getById("container-1").className = 'column columnfade advanced';
	getById("container-4").className = 'column columnfade advanced';
	getById("container-7").style.display = 'none';
	getById("container-8").style.display = 'none';
	getById("mainmenu").style.alignSelf = "center";
	getById("mainmenu").classList.add("mainmenuclass");
	getById("header").style.alignSelf = "center";

	if (session.webcamonly == true) { // mobile or manual flag 'webcam' pflag set
		getById("head1").innerHTML = '';
	} else {
		getById("head1").innerHTML = '<font style="color:#CCC" data-translate="please-select-option-to-join">Please select an option to join.</font>';
	}

	if (session.roomid.length > 0) {
		if (session.videoDevice === 0) {
			if (session.audioDevice === 0) {
				getById("add_camera").innerHTML = "Join room";
				miniTranslate(getById("add_camera"), "join-room");
			} else {
				getById("add_camera").innerHTML = "Join room with Microphone";
				miniTranslate(getById("add_camera"), "join-room-with-mic");
			}
		} else {
			getById("add_camera").innerHTML = "Join Room with Camera";
			miniTranslate(getById("add_camera"), "join-room-with-camera");
		}
		getById("add_screen").innerHTML = "Screenshare with Room";
		miniTranslate(getById("add_screen"), "share-screen-with-room");
	} else {
		if (session.videoDevice === 0) {
			getById("add_camera").innerHTML = "Share your Microphone";
			miniTranslate(getById("add_camera"), "share-your-mic");
		} else {
			getById("add_camera").innerHTML = "Share your Camera";
			miniTranslate(getById("add_camera"), "share-your-camera");
		}
		getById("add_screen").innerHTML = "Share your Screen";
		miniTranslate(getById("add_screen"), "share-your-screen");
	}
	getById("head3").className = 'advanced';

	if (session.scene !== false) {
		getById("container-4").className = 'column columnfade';
		getById("container-3").className = 'column columnfade';
		getById("container-2").className = 'column columnfade';
		getById("container-1").className = 'column columnfade';
		getById("header").className = 'advanced';
		getById("info").className = 'advanced';
		getById("head1").className = 'advanced';
		getById("head2").className = 'advanced';
		getById("mainmenu").style.display = "none";
		getById("translateButton").style.display = "none";
		log("Update Mixer Event on REsize SET");
		window.addEventListener("resize", updateMixer);
		window.addEventListener("orientationchange", function() {
			setTimeout(updateMixer, 200);
		});
		joinRoom(session.roomid); // this is a scene, so we want high resolutions
		getById("main").style.overflow = "hidden";
	} else {
		if ((session.permaid === null) && (session.roomid == "")) {
			if (!(session.cleanOutput)) {
				getById("head3").className = '';
			}
		}
	}

} else if (urlParams.has('director') || urlParams.has('dir')) { // if I do a short form of this, it will cause duplications in the code elsewhere.
	if (directorLanding == false) {
		var director_room_input = urlParams.get('director') || urlParams.get('dir');
		director_room_input = sanitizeRoomName(director_room_input);
		log("director_room_input:" + director_room_input);
		createRoom(director_room_input);
	}
} else if ((session.view) && (session.permaid === false)) {
	//if (!session.activeSpeaker){
	session.audioMeterGuest = false;
	//}
	if (session.audioEffects === null) {
		session.audioEffects = false;
	}
	log("Update Mixer Event on REsize SET");
	getById("translateButton").style.display = "none";
	window.addEventListener("resize", updateMixer);
	window.addEventListener("orientationchange", function() {
		setTimeout(updateMixer, 200);
	});
	getById("main").style.overflow = "hidden";
}

if (session.audioEffects === null) {
	session.audioEffects = true;
}

if (session.audioEffects) {
	getById("channelGroup1").style.display = "block";
	getById("channelGroup2").style.display = "block";
}

if (urlParams.has('hidemenu') || urlParams.has('hm')) { // needs to happen the room and permaid applications
	getById("mainmenu").style.display = "none";
	getById("header").style.display = "none";
	getById("mainmenu").style.opacity = 0;
	getById("header").style.opacity = 0;
}

if (urlParams.has('hideheader') || urlParams.has('noheader') || urlParams.has('hh')) { // needs to happen the room and permaid applications
	getById("header").style.display = "none";
	getById("header").style.opacity = 0;
}

function checkConnection() {
	if (session.ws === null) {
		return;
	}
	if (document.getElementById("qos")) { // true or false; null might cause problems?
		if ((session.ws) && (session.ws.readyState === WebSocket.OPEN)) {
			getById("qos").style.color = "white";
		} else {
			getById("qos").style.color = "red";
		}
	}
}
setInterval(function() {
	checkConnection();
}, 5000);


function remoteStats(msg){
	if (session.director){
		var output = "";
		var size = 0;
		for (var key in msg.remoteStats) {
			if (msg.remoteStats.hasOwnProperty(key)) size++;
		}
		output += "Total Viewers: "+size;
		for (var uuid in msg.remoteStats){
			if ("scene" in msg.remoteStats[uuid] && msg.remoteStats[uuid].scene !== false){
				output+="<hr/>scene: "+msg.remoteStats[uuid].scene;
				if ("video_bitrate_kbps" in msg.remoteStats[uuid]){
					output+="<br />video_bitrate_kbps: "+msg.remoteStats[uuid].video_bitrate_kbps;
				}
				if ("audio_bitrate_kbps" in msg.remoteStats[uuid]){
					output+="<br />audio_bitrate_kbps: "+msg.remoteStats[uuid].audio_bitrate_kbps;
				}
				if (msg.remoteStats[uuid].resolution){
					output+="<br/>resolution: "+msg.remoteStats[uuid].resolution;
				}
				if (msg.remoteStats[uuid].video_encoder){
					output+="<br/>video_encoder: "+msg.remoteStats[uuid].video_encoder;
				}
				if ("scaleFactor" in msg.remoteStats[uuid]){
					output+="<br />scaleFactor: "+msg.remoteStats[uuid].scaleFactor;
				}
				if ("nacks_per_second" in msg.remoteStats[uuid]){
					output+="<br/>nacks_per_second: "+msg.remoteStats[uuid].nacks_per_second;
				}
				if (msg.remoteStats[uuid].retransmitted_kbps){
					output+="<br/>quality_limitation_reason: "+msg.remoteStats[uuid].retransmitted_kbps;
				}
				if (msg.remoteStats[uuid].quality_limitation_reason){
					output+="<br/>quality_limitation_reason: "+msg.remoteStats[uuid].quality_limitation_reason;
				}
			}
		}
		warnUser(output);
	};
	if (isIFrame){
		parent.postMessage({"remoteStats": msg.remoteStats }, "*");
	}
}


function printViewStats(menu, statsObj, streamID) { // Stats for viewing a remote video
	var scrollLeft = menu.scrollLeft;
	var scrollTop = menu.scrollTop;
	//menu.innerHTML="rae:"+session.audioEffects+ ", lae:"+ !session.disableWebAudio;
	menu.innerHTML = "StreamID: <b>" + streamID + "</b><br />";
	menu.innerHTML += printValues(statsObj);
	menu.scrollTop = scrollTop;
	menu.scrollLeft = scrollLeft;

}

function printValues(obj) { // see: printViewStats
	var out = "";
	for (var key in obj) {
		if (typeof obj[key] === "object") {
			if (obj[key] != null) {
				var tmp = key;
				tmp = sanitizeChat((tmp));
				out += "<li><h2 title='" + tmp + "'>" + tmp + "</h2></li>"
				out += printValues(obj[key]);
			}
		} else {
			if (key.startsWith("_")) {
				// if it starts with _, we don't want to show it.
			} else {
				try {
					var unit = '';

					var value = obj[key];

					var stat = sanitizeChat(key);

					if (typeof obj[key] == "string") {
						value = sanitizeChat((value));
					}

					// <i class='las la-copy' data-sid='" + streamID + "' onmousedown='copyFunction(this.dataset.sid)' onclick='popupMessage(event);copyFunction(this.dataset.sid)' title='Copy this Stream ID to the clipboard' style='cursor:pointer'></i>
					if (key == 'useragent') {
						value = "<span style='cursor: pointer;' onmousedown='copyFunction(this.innerText)' onclick='popupMessage(event);copyFunction(this.innerText);' title='Copy this user-agent to the clipboard' style='cursor:pointer'>"+value+"</span>"
					}

					if (key == 'Bitrate_in_kbps') {
						var unit = " kbps";
						stat = "Bitrate";
					}
					else if (key == 'type') {
						var unit = "";
						stat = 'Type';

						if (value == "Audio Track") {
							value = "🔊 " + value;
							//out += "<button onclick='disableTrack()'></button>";
						}

						if (value == "Video Track") {
							value = "📺 " + value;
						}

					}
					else if (key == 'packetLoss_in_percentage') {
						var unit = " %";
						stat = 'Packet Loss 📶';
						value = parseInt(parseFloat(value) * 10000) / 10000.0;
					}
					else if (key == 'local_relayIP') {
						value = "<a href='https://whatismyipaddress.com/ip/" + value + "' target='_blank'>" + value + "</a>";
					}
					else if (key == 'remote_relay_IP') {
						value = "<a href='https://whatismyipaddress.com/ip/" + value + "' target='_blank'>" + value + "</a>";
					}
					else if (key == 'local_candidateType') {
						if (value == "relay") {
							value = "💸 relay server";
						}
					}
					else if (key == 'remote_candidateType') {
						if (value == "relay") {
							value = "💸 relay server";
						}
					}
					else if (key == 'height_url') {
						if (value == false) {
							continue;
						}
					}
					else if (key == 'width_url') {
						if (value == false) {
							continue;
						}
					}
					else if (key == 'height_url') {
						if (value == false) {
							continue;
						}
					}
					else if (key == 'version') {
						stat = "OBS.Ninja Version";
					} else if (key == 'platform') {
						stat = "Platform (OS)";
					}
					else if (key == 'aec_url') {
						stat = "Echo-Cancellation";
					}
					else if (key == 'agc_url') {
						stat = "Auto-Gain (agc)";
					}
					else if (key == 'denoise_url') {
						stat = "De-noising ";
					}
					else if (key == 'audio_level') {
						stat = "Audio Level";
					}
					else if (key == 'Buffer_Delay_in_ms') {
						var unit = " ms";
						stat = 'Buffer Delay';
					}
					else if (value === null) {
						value = "null";
					}
					else if (key == "stereo_url") {
						stat = "Pro-Audio<br />(Stereo-mode)";
						if (value == 3) {
							value = "3 (outbound hi-fi)<br />Use Headphones";
						} else if (value == 1) {
							value = "1 (in & out hi-fi)<br />Use Headphones";
						} else if (value == 2) {
							value = "3 (inbound hi-fi)";
						} else if (value == 4) {
							value = "3 (multichannel)<br />Use Headphones";
						} else if (value == 5) {
							value = "5 (auto-mode)<br />Use Headphones";
						}
					}
					else if (value === false) {
						continue
					} 
					else if (value === "false") {
						continue
					}
					out += "<li><span>" + stat + "</span><span>" + value + unit + "</span></li>";
				} catch (e) {
					warnlog(e);
				}
			}
		}
	}
	return out;
}


function printMyStats(menu) { // see: setupStatsMenu
	var scrollLeft = getById("menuStatsBox").scrollLeft;
	var scrollTop = getById("menuStatsBox").scrollTop;
	menu.innerHTML = "";

	session.stats.outbound_connections = Object.keys(session.pcs).length;
	session.stats.inbound_connections = Object.keys(session.rpcs).length;

	function printViewValues(obj) {
		
		if (!(document.getElementById("menuStatsBox"))){
			return;
		}
		
		for (var key in obj) {
			if (typeof obj[key] === "object") {
				printViewValues(obj[key]);
			} else {

				if (key.startsWith("_")){continue;}
				
				var stat = sanitizeChat(key);
				var value = obj[key];
				if (typeof value == "string") {
					value = sanitizeChat((value));
				}
				
				if (value === false){continue;}
				
				if (key == 'useragent') {
					value = "<span style='cursor: pointer;' onmousedown='copyFunction(this.innerText)' onclick='popupMessage(event);copyFunction(this.innerText);' title='Copy this user-agent to the clipboard' style='cursor:pointer'>"+value+"</span>"
				}

				if (key == 'local_relayIP') {
					value = "<a href='https://whatismyipaddress.com/ip/" + value + "' target='_blank'>" + value + "</a>";
				}
				if (key == 'remote_relay_IP') {
					value = "<a href='https://whatismyipaddress.com/ip/" + value + "' target='_blank'>" + value + "</a>";
				}
				if (key == 'local_candidateType') {
					if (value == "relay") {
						value = "💸 relay server";
					}
				}
				if (key == 'remote_candidateType') {
					if (value == "relay") {
						value = "💸 relay server";
					}
				}

				menu.innerHTML += "<li><span>" + stat + "</span><span>" + value + "</span></li>";
			}
		}
	}
	printViewValues(session.stats);
	menu.innerHTML += "<button onclick='session.forcePLI(null,event);' data-translate='send-keyframe-to-viewer'>Send Keyframe to Viewers</button>";
	for (var uuid in session.pcs) {
		printViewValues(session.pcs[uuid].stats);
		menu.innerHTML += "<hr>";
	}
	try {
		getById("menuStatsBox").scrollLeft = scrollLeft;
		getById("menuStatsBox").scrollTop = scrollTop;
	} catch (e) {}
}


function updateLocalStats(){
	
	var totalBitrate = 0;
	var totalBitrate2 = 0;
	var cpuLimited = false;
	for (var uuid in session.pcs) {
		if ("video_bitrate_kbps" in session.pcs[uuid].stats){
			totalBitrate+=session.pcs[uuid].stats.video_bitrate_kbps || 0;
		}
		if ("audio_bitrate_kbps" in session.pcs[uuid].stats){
			totalBitrate+=session.pcs[uuid].stats.audio_bitrate_kbps || 0;
		}
		if ("total_sending_bitrate_kbps" in session.pcs[uuid].stats){
			totalBitrate2+=session.pcs[uuid].stats.total_sending_bitrate_kbps || 0;
		}
		
		if ("quality_limitation_reason" in session.pcs[uuid].stats){
			if (session.pcs[uuid].stats.quality_limitation_reason == "cpu"){
				cpuLimited=true;
			}
		}
		
		if (uuid in session.rpcs){
			if (session.pcs[uuid].stats.label){
				session.pcs[uuid].stats.label = session.rpcs[uuid].label;
			}
			if (session.pcs[uuid].stats.streamID){
				session.pcs[uuid].stats.streamID = session.rpcs[uuid].streamID;
			}
		}
		
		setTimeout(function(UUID) {
			if (!( session.pcs[UUID])){return;}
			session.pcs[UUID].getStats().then(function(stats) {
				if ("audio_bitrate_kbps" in session.pcs[UUID].stats){
					session.pcs[UUID].stats.audio_bitrate_kbps=0;
				}
				stats.forEach(stat => {
					if (stat.type == "transport"){
						if ("bytesSent" in stat) {
							if ("_bytesSent" in session.pcs[UUID].stats){
								if (session.pcs[UUID].stats._timestamp){
									if (stat.timestamp){
										session.pcs[UUID].stats.total_sending_bitrate_kbps = parseInt(8*(stat.bytesSent - session.pcs[UUID].stats._bytesSent)/(stat.timestamp - session.pcs[UUID].stats._timestamp));
									}
								}
							}
							session.pcs[UUID].stats._bytesSent = stat.bytesSent;
						}
						if ("timestamp" in stat) {
							session.pcs[UUID].stats._timestamp = stat.timestamp;
						}
					} else if (stat.type == "outbound-rtp") {
						if (stat.kind == "video") {
							
							if ("qualityLimitationReason" in stat) {
								session.pcs[UUID].stats.quality_limitation_reason = stat.qualityLimitationReason;
							}
							if ("framesPerSecond" in stat) {
								session.pcs[UUID].stats.resolution = stat.frameWidth + " x " + stat.frameHeight + " @ " + stat.framesPerSecond;
							}
							if ("encoderImplementation" in stat) {
								session.pcs[UUID].stats.video_encoder = stat.encoderImplementation;
							}
							if ("bytesSent" in stat) {
								if ("_bytesSentVideo" in session.pcs[UUID].stats){
									if (session.pcs[UUID].stats._timestamp1){
											session.pcs[UUID].stats.video_bitrate_kbps = parseInt(8*(stat.bytesSent - session.pcs[UUID].stats._bytesSentVideo)/(stat.timestamp - session.pcs[UUID].stats._timestamp1));
										if (stat.timestamp){
										}
									}
								}
								session.pcs[UUID].stats._bytesSentVideo = stat.bytesSent;
							}
							
							if ("nackCount" in stat) {
								if ("_nackCount" in session.pcs[UUID].stats){
									if (session.pcs[UUID].stats._timestamp1){
										if (stat.timestamp){
											session.pcs[UUID].stats.nacks_per_second = parseInt(10000*(stat.nackCount - session.pcs[UUID].stats._nackCount)/(stat.timestamp - session.pcs[UUID].stats._timestamp1))/10;
										}
									}
								}
							}
							if ("retransmittedBytesSent" in stat) {
								if ("_retransmittedBytesSent" in session.pcs[UUID].stats){
									if (session.pcs[UUID].stats._timestamp1){
										if (stat.timestamp){
											session.pcs[UUID].stats.retransmitted_kbps = parseInt(8*(stat.retransmittedBytesSent - session.pcs[UUID].stats._retransmittedBytesSent)/(stat.timestamp - session.pcs[UUID].stats._timestamp1));
										}
									}
								}
							}
							
							if ("nackCount" in stat) {
								session.pcs[UUID].stats._nackCount = stat.nackCount;
								
							}
							
							if ("retransmittedBytesSent" in stat) {
								session.pcs[UUID].stats._retransmittedBytesSent = stat.retransmittedBytesSent;
								
							}
							
							if ("timestamp" in stat) {
								session.pcs[UUID].stats._timestamp1 = stat.timestamp;
							}
							
							if ("pliCount" in stat) {
								session.pcs[UUID].stats.total_pli_count = stat.pliCount;
							}
							if ("keyFramesEncoded" in stat) {
								session.pcs[UUID].stats.total_key_frames_encoded = stat.keyFramesEncoded;
							}
							
							
						} else if (stat.kind == "audio") {
							if ("bytesSent" in stat) {
								if (session.pcs[UUID].stats._bytesSentAudio){
									if (session.pcs[UUID].stats._timestamp2){
										if (stat.timestamp){
											if ("audio_bitrate_kbps" in session.pcs[UUID].stats){
												session.pcs[UUID].stats.audio_bitrate_kbps += parseInt(8*(stat.bytesSent - session.pcs[UUID].stats._bytesSentAudio)/(stat.timestamp - session.pcs[UUID].stats._timestamp2));
											} else {
												session.pcs[UUID].stats.audio_bitrate_kbps=0;
											}
										}
									}
								}
							}
							if ("timestamp" in stat) {
								session.pcs[UUID].stats._timestamp2 = stat.timestamp;
							}
							
							if ("bytesSent" in stat) {
								session.pcs[UUID].stats._bytesSentAudio = stat.bytesSent;
								
							}
						}
					} else if (stat.type == "remote-candidate") {
						if ("relayProtocol" in stat) {
							if ("ip" in stat) {
								session.pcs[UUID].stats.remote_relay_IP = stat.ip;
							}
							session.pcs[UUID].stats.remote_relayProtocol = stat.relayProtocol;
						}
						if ("candidateType" in stat) {
							session.pcs[UUID].stats.remote_candidateType = stat.candidateType;
						}
					} else if (stat.type == "local-candidate") {
						if ("relayProtocol" in stat) {
							if ("ip" in stat) {
								session.pcs[UUID].stats.local_relayIP = stat.ip;
							}
							session.pcs[UUID].stats.local_relayProtocol = stat.relayProtocol;
						}
						if ("candidateType" in stat) {
							session.pcs[UUID].stats.local_candidateType = stat.candidateType;
						}
					} else if ((stat.type == "candidate-pair" ) && (stat.nominated)) {
								
								if ("availableOutgoingBitrate" in stat){
									session.pcs[UUID].stats.available_outgoing_bitrate_kbps = parseInt(stat.availableOutgoingBitrate/1024);
								}
								if ("totalRoundTripTime" in stat){
									session.pcs[UUID].stats.total_roundTripTime_ms = stat.totalRoundTripTime*1000;
								}
							}
					return;
				});
				return;
			});
		}, 0, uuid);
	}
	var headerStats = "Viewers: ";
	headerStats += Object.keys(session.pcs).length || 0;
	headerStats += ", Upload (kbps): "+totalBitrate2; // + " / "+totalBitrate;
	if (cpuLimited){
		headerStats += ", CPU Overloaded";
	}
	if (Object.keys(session.pcs).length){
		getById("head5").classList.remove("advanced");
	}
	getById("head5").innerHTML = headerStats;
}


function updateStats(obsvc = false) {
	log('updateStats - resolution found');
	if (document.getElementById('previewWebcam')) {
		var ele = document.getElementById('previewWebcam');
		var wcs = "webcamstats";
	} else if  (document.getElementById('videosource')) {
		var ele = document.getElementById('videosource');
		var wcs = "webcamstats3";
	} else {
		return;
	}
	
	try {
		getById(wcs).innerHTML = "";
		ele.srcObject.getVideoTracks().forEach(
			function(track) {
				if ((obsvc) && (parseInt(track.getSettings().frameRate) == 30)) {
					getById(wcs).innerHTML = "Video Settings: " + (track.getSettings().width || 0) + "x" + (track.getSettings().height || 0) + " @ up to 60fps";
				} else {
					getById(wcs).innerHTML = "Current Video Settings: " + (track.getSettings().width || 0) + "x" + (track.getSettings().height || 0) + "@" + (parseInt(track.getSettings().frameRate * 10) / 10) + "fps";
				}
			}
		);

	} catch (e) {
		errorlog(e);
	}
}

function toggleMute(apply = false) { // TODO: I need to have this be MUTE, toggle, with volume not touched.

	log("muting");

	if (session.director) {
		if (!session.directorEnabledPPT) {
			log("Director doesn't have PPT enabled yet");
			// director has not enabled PTT yet.
			return;
		}
	}

	if (apply) {
		session.muted = !session.muted;  // we flip here as we are going to flip again in a second.
	}
	//try{var ptt = getById("press2talk");} catch(e){var ptt=false;}
	

	if (session.muted == false) {
		session.muted = true;
		getById("mutetoggle").className = "las la-microphone-slash my-float toggleSize";
		if (!(session.cleanOutput)){
			getById("mutebutton").className = "float2 red puslate";
			getById("header").classList.add('red');
			
			if (session.localMuteElement){
				session.localMuteElement.style.display = "block";
			}
			
		}
		if (session.streamSrc) {
			session.streamSrc.getAudioTracks().forEach((track) => {
				track.enabled = false;
			});
		}
		//if (ptt){
		//	ptt.innerHTML = "<span data-translate='Push-to-Mute'>🔇 Push to Talk</span>";
		//}

	} else {
		session.muted = false;
		getById("mutetoggle").className = "las la-microphone my-float toggleSize";
		if (!(session.cleanOutput)){
			getById("mutebutton").className = "float";
			getById("header").classList.remove('red');
			
			if (session.localMuteElement){
				session.localMuteElement.style.display = "none";
			}
			
		}
		if (session.streamSrc) {
			session.streamSrc.getAudioTracks().forEach((track) => {
				track.enabled = true;
			});
		}
		//if (ptt){
		//	ptt.innerHTML = "<span data-translate='Push-to-Mute'>🔴 Push to Mute</span>";
		//}
	}
	
	if (document.getElementById("screensharesource")){
		document.getElementById("screensharesource").contentWindow.postMessage({"mic":!session.muted}, '*');
	}

	if (!apply) { // only if they are changing states do we bother to spam.
		data = {};
		data.muteState = session.muted;
		session.sendMessage(data);
		log("SEND DATA");
		pokeIframeAPI('mic-mute-state', session.muted);
	}
}


function toggleSpeakerMute(apply = false) { // TODO: I need to have this be MUTE, toggle, with volume not touched.

	if (CtrlPressed) {
		resetupAudioOut();
	}

	if (apply) {
		session.speakerMuted = !session.speakerMuted;
	}
	if (session.speakerMuted == false) {
		session.speakerMuted = true;
		getById("mutespeakertoggle").className = "las la-volume-mute my-float toggleSize";
		if (!(session.cleanOutput)){
			getById("mutespeakerbutton").className = "float2 red";
		}
		var sounds = document.getElementsByTagName("video");
		for (var i = 0; i < sounds.length; ++i) {
			sounds[i].muted = session.speakerMuted;
		}

	} else {
		session.speakerMuted = false;

		getById("mutespeakertoggle").className = "las la-volume-up my-float toggleSize";
		if (!(session.cleanOutput)){
			getById("mutespeakerbutton").className = "float";
		}

		var sounds = document.getElementsByTagName("video");
		for (var i = 0; i < sounds.length; ++i) {

			if (sounds[i].id === "videosource") { // don't unmute ourselves. feedback galore if so.
				continue;
			} else if (sounds[i].id === "previewWebcam") {
				continue;
			} else if (sounds[i].id === "screenshare") {
				continue;
			} else {
				sounds[i].muted = session.speakerMuted;
			}
		}
	}

	for (var UUID in session.rpcs) {
		if (session.rpcs[UUID].videoElement) {
			//if (UUID === session.directorUUID) {
			//	session.rpcs[UUID].videoElement.muted = false; // unmute director
			//	log("MAKE SURE DIRECTOR ISN'T MUTED");
			//} else {
				session.rpcs[UUID].videoElement.muted = session.speakerMuted;
		//	}
		}
	}

	if ((iOS) || (iPad)) {
		resetupAudioOut();
	}
}


function toggleChat(event = null) { // TODO: I need to have this be MUTE, toggle, with volume not touched.
	if (session.chat == false) {
		setTimeout(function() {
			document.addEventListener("click", toggleChat);
		}, 10);

		getById("chatModule").addEventListener("click", function(e) {
			e.stopPropagation();
			return false;
		});
		session.chat = true;
		getById("chattoggle").className = "las la-comment-dots my-float toggleSize";
		getById("chatbutton").className = "float2";
		getById("chatModule").style.display = "block";
		getById("chatInput").focus(); // give it keyboard focus
	} else {
		session.chat = false;
		getById("chattoggle").className = "las la-comment-alt my-float toggleSize";
		getById("chatbutton").className = "float";
		getById("chatModule").style.display = "none";

		document.removeEventListener("click", toggleChat);
		getById("chatModule").removeEventListener("click", function(e) {
			e.stopPropagation();
			return false;
		});
	}
	if (getById("chatNotification").value) {
		getById("chatNotification").value = 0;
	}
	getById("chatNotification").classList.remove("notification");
}

function directorAdvanced(ele) {
	var target = document.createElement("div");
	target.style = "position:absolute;float:left;width:270px;height:222px;background-color:#7E7E7E;";

	var closeButton = document.createElement("button");
	closeButton.innerHTML = "<i class='las la-times'></i> close";
	closeButton.style.left = "5px";
	closeButton.style.position = "relative";
	closeButton.onclick = function() {
		target.parentNode.removeChild(target);
	};
	target.appendChild(closeButton);

	var someButton = document.createElement("button");
	someButton.innerHTML = "<i class='las la-reply'></i> some action ";
	someButton.style.left = "5px";
	someButton.style.position = "relative";
	someButton.onclick = function() {
		var actionMsg = {};
		session.sendRequest(actionMsg, ele.dataset.UUID);
	};
	target.appendChild(someButton);

	ele.parentNode.appendChild(target);
}

function directorSendMessage(ele) {
	var target = document.createElement("div");
	target.style = "position:absolute;float:left;width:270px;height:222px;background-color:#7E7E7E;";

	var inputField = document.createElement("textarea");
	inputField.placeholder = "Enter your message here";
	inputField.style.width = "255px";
	inputField.style.height = "170px";
	inputField.style.margin = "5px 10px 5px 10px";
	inputField.style.padding = "5px";

	target.appendChild(inputField);

	var sendButton = document.createElement("button");
	sendButton.innerHTML = "<i class='las la-reply'></i> send message ";
	sendButton.style.left = "5px";
	sendButton.style.position = "relative";
	sendButton.onclick = function() {
		var chatMsg = {};
		chatMsg.chat = inputField.value;
		if (sendButton.parentNode.overlay) {
			chatMsg.overlay = sendButton.parentNode.overlay;
		}
		session.sendRequest(chatMsg, ele.dataset.UUID);
		inputField.value = "";
		//target.parentNode.removeChild(target);
	};


	var closeButton = document.createElement("button");
	closeButton.innerHTML = "<i class='las la-times'></i> close";
	closeButton.style.left = "5px";
	closeButton.style.position = "relative";
	closeButton.onclick = function() {
		inputField.value = "";
		target.parentNode.removeChild(target);
	};

	var overlayMsg = document.createElement("span");

	overlayMsg.style.left = "16px";
	overlayMsg.style.top = "6px";
	overlayMsg.style.position = "relative";
	overlayMsg.innerHTML = "<i class='lar la-bell' style='font-size:170%; color:#FFF; cursor:pointer;'></i>";
	target.overlay = true;

	overlayMsg.onclick = function(e) {
		log(e.target.parentNode.parentNode);
		if (e.target.parentNode.parentNode.overlay === true) {
			e.target.parentNode.parentNode.overlay = false;
			e.target.parentNode.innerHTML = "<i class='lar la-bell-slash' style='font-size:170%; color:#DDD; cursor:pointer;'></i>";
		} else {
			e.target.parentNode.parentNode.overlay = true;
			e.target.parentNode.innerHTML = "<i class='lar la-bell' style='font-size:170%; color:#FFF; cursor:pointer;'></i>";
		}
	}


	inputField.addEventListener("keydown", function(e) {
		if (e.keyCode == 13) {
			e.preventDefault();
			sendButton.click();
		} else if (e.keyCode == 27) {
			e.preventDefault();
			inputField.value = "";
			target.parentNode.removeChild(target);
		}
	});
	target.appendChild(closeButton);
	target.appendChild(sendButton);
	target.appendChild(overlayMsg);
	ele.parentNode.appendChild(target);
	inputField.focus();
	inputField.select();
}

function toggleVideoMute(apply = false) { // TODO: I need to have this be MUTE, toggle, with volume not touched.
	if (apply) {
		session.videoMuted = !session.videoMuted;
	}
	if (session.videoMuted == false) {
		session.videoMuted = true;
		getById("mutevideotoggle").className = "las la-video-slash my-float toggleSize";
		if (!(session.cleanOutput)){
			getById("mutevideobutton").className = "float2 red";
		}
		if (session.streamSrc) {
			session.streamSrc.getVideoTracks().forEach((track) => {
				track.enabled = false;
			});
		}

	} else {
		session.videoMuted = false;

		getById("mutevideotoggle").className = "las la-video my-float toggleSize";
		if (!(session.cleanOutput)){
			getById("mutevideobutton").className = "float";
		}
		if (session.streamSrc) {
			session.streamSrc.getVideoTracks().forEach((track) => {
			//	try {
			//		if (document.querySelector("select#videoSource3").value == "ZZZ"){
			//			return;
			//		}
			//	} catch(e){}
				track.enabled = true;
			});
		}
	}
	
	
	
	if (!apply) {
		var msg = {};
		msg.videoMuted = session.videoMuted;
		session.sendMessage(msg);
		pokeIframeAPI('video-mute-state', session.videoMuted);
		if (!session.videoMuted){makeImages();}
	}
}

var toggleSettingsState = false;

function toggleSettings(forceShow = false) { // TODO: I need to have this be MUTE, toggle, with volume not touched.

	getById("multiselect-trigger3").dataset.state = "0";
	getById("multiselect-trigger3").classList.add('closed');
	getById("multiselect-trigger3").classList.remove('open');
	getById("chevarrow2").classList.add('bottom');

	if (toggleSettingsState == true) {
		if (forceShow == true) {
			enumerateDevices().then(gotDevices2);
			return;
		}
	} // don't close if already open
	if (getById("popupSelector").style.display == "none") {

		updateConstraintSliders();

		setTimeout(function() {
			document.addEventListener("click", toggleSettings);
		}, 10);

		getById("popupSelector").addEventListener("click", function(e) {
			e.stopPropagation();
			return false;
		});

		if (navigator.userAgent.indexOf('Chrome') != -1) {
			try {
				navigator.permissions.query({
					name: "camera"
				}).then(function(promise) {
					if (promise && promise.state) {
						if (promise.state == "prompt") {
							navigator.mediaDevices.getUserMedia({
								video: true
								, audio: false
							}).then(function(stream) {
								enumerateDevices().then(gotDevices2).then(function() {
									stream.getTracks().forEach(function(track) {
										//stream.removeTrack(track);
										track.stop(); // clean up?
									});
								});

							}).catch(function(err) {
								enumerateDevices().then(gotDevices2).then(function() {});
							});
						} else {
							enumerateDevices().then(gotDevices2).then(function() {});
						}
						// console.log(promise.state); //"granted", "prompt" or "rejected"
					} else {
						enumerateDevices().then(gotDevices2).then(function() {});
					}
				});
			} catch (e) {
				enumerateDevices().then(gotDevices2).then(function() {});
			}
		} else {
			enumerateDevices().then(gotDevices2).then(function() {});
		}

		getById("popupSelector").style.display = "inline-block"
		getById("settingsbutton").classList.add("float2");
		getById("settingsbutton").classList.remove("float");
		setTimeout(function() {
			getById("popupSelector").style.right = "0px";
		}, 1);
		toggleSettingsState = true;
	} else {
		document.removeEventListener("click", toggleSettings);
		getById("popupSelector").removeEventListener("click", function(e) {
			e.stopPropagation();
			return false;
		});

		getById("popupSelector").style.right = "-400px";

		getById("settingsbutton").classList.add("float");
		getById("settingsbutton").classList.remove("float2");
		setTimeout(function() {
			getById("popupSelector").style.display = "none";
		}, 200);
		toggleSettingsState = false;
	}
}

function hangup() { // TODO: I need to have this be MUTE, toggle, with volume not touched.
	getById("main").innerHTML = "<font style='font-size:500%;text-align:center;margin:auto;'>👋</font>";
	setTimeout(function() {
		session.hangup();
	}, 0);
}

function hangup2() {
	session.hangupDirector();
	getById("miniPerformer").innerHTML = "";
	getById("press2talk").dataset.value = 0;
	getById("screensharebutton").classList.add("advanced");
	getById("settingsbutton").classList.add("advanced");
	getById("mutebutton").classList.add("advanced");
	getById("hangupbutton2").classList.add("advanced");
	//getById("chatbutton").classList.remove("advanced");
	getById("controlButtons").style.display = "inherit";
	//getById("mutespeakerbutton").classList.add("advanced");
	getById("mutevideobutton").classList.add("advanced");
	getById("screenshare2button").classList.add("advanced");
	
	getById("screensharebutton").classList.add("float");
	getById("screensharebutton").classList.remove("float2");
	
	if (session.showDirector == false) {
		getById("miniPerformer").innerHTML = '<button id="press2talk" onmousedown="event.preventDefault(); event.stopPropagation();" style="width:auto;margin-left:5px;height:45px;border-radius: 38px;" class="float" onclick="press2talk(true);" title="You can also enable the director`s Video Output afterwards by clicking the Setting`s button"><i class="las la-headset"></i><span data-translate="push-to-talk-enable"> enable director`s microphone or video<br />(only guests can see this feed)</span></button>';
	} else {
		getById("miniPerformer").innerHTML = '<button id="press2talk" onmousedown="event.preventDefault(); event.stopPropagation();" style="width:auto;margin-left:5px;height:45px;border-radius: 38px;" class="float" onclick="press2talk(true);" title="You can also enable the director`s Video Output afterwards by clicking the Setting`s button"><i class="las la-headset"></i><span data-translate="push-to-talk-enable"> enable director`s microphone or video</span></button>';
	}
	getById("miniPerformer").className = "";
}

function hangupComplete() {
	getById("main").innerHTML = "<font style='font-size:500%;text-align:center;margin:auto;'>👋</font>";
}


function raisehand() {
	if (session.directorUUID == false) {
		log("no director in room yet");
		return;
	}

	var data = {};
	data.UUID = session.directorUUID;

	log(data);
	if (getById("raisehandbutton").dataset.raised == "0") {
		getById("raisehandbutton").dataset.raised = "1";
		getById("raisehandbutton").classList.add("raisedHand");
		data.chat = "Raised hand";
		log("hand raised");
	} else {
		log("hand lowered");
		getById("raisehandbutton").dataset.raised = "0";
		getById("raisehandbutton").classList.remove("raisedHand");
		data.chat = "Lowered hand";
	}
	session.sendMessage(data, data.UUID);
}

function lowerhand() {
	log("hand lowered");
	getById("raisehandbutton").dataset.raised = "0";
	getById("raisehandbutton").classList.remove("raisedHand");
}

var previousRoom = "";
var stillNeedRoom = true;
var transferCancelled = false;
var armedTransfer = false;

function directMigrate(ele, event) { // everyone in the room will hangup this guest also?  I like that idea.  What about the STREAM ID?  I suppose we don't kick out if the viewID matches.
	log("directMigrate");
	if (event === false) {
		if (previousRoom === null) { // user cancelled in previous callback
			ele.innerHTML = '<i class="las la-paper-plane"></i> <span data-translate="forward-to-room">Transfer</span>';
			ele.style.backgroundColor = null;
			return;
		}
		if (transferCancelled === true) {
			ele.innerHTML = '<i class="las la-paper-plane"></i> <span data-translate="forward-to-room">Transfer</span>';
			ele.style.backgroundColor = null;
			return;
		}
		var migrateRoom = previousRoom
	} else if ((event.ctrlKey) || (event.metaKey)) {
		ele.innerHTML = '<i class="las la-check"></i> <span data-translate="forward-to-room">Armed</span>';
		ele.style.backgroundColor = "#BF3F3F";
		transferCancelled = false;
		//armedTransfer=true;
		Callbacks.push([directMigrate, ele, stillNeedRoom]);
		stillNeedRoom = false;
		log("Migrate queued");
		return;
   // } else if (armedTransfer){
		//migrateRoom = sanitizeRoomName(previousRoom);
	} else {
		if (armedTransfer!==false && previousRoom!==""){
			var migrateRoom = sanitizeRoomName(previousRoom);
		} else {
			var migrateRoom = prompt("Transfer guests to room:\n\n(Please note rooms must share the same password)", previousRoom);
		}
		stillNeedRoom = true;
		if (migrateRoom === null) { // user cancelled
			ele.innerHTML = '<i class="las la-paper-plane"></i> <span data-translate="forward-to-room">Transfer</span>';
			ele.style.backgroundColor = null;
			transferCancelled = true;
			return;
		}
		try {
			migrateRoom = sanitizeRoomName(migrateRoom);
			previousRoom = migrateRoom;
		} catch (e) {}

	}
	ele.innerHTML = '<i class="las la-paper-plane"></i> <span data-translate="forward-to-room">Transfer</span>';
	ele.style.backgroundColor = null;

	if (migrateRoom) {
		previousRoom = migrateRoom;

		var msg = {};
		msg.request = "migrate";
		if (session.password) {
			return session.generateHash(migrateRoom + session.password + session.salt, 16).then(function(rid) {
				var msg = {};
				msg.request = "migrate";
				msg.roomid = rid;
				msg.target = ele.dataset.UUID;
				session.sendMsg(msg); // send to everyone in the room, so they know if they are on air or not.
			});
		} else {
			var msg = {};
			msg.request = "migrate";
			msg.roomid = migrateRoom;
			msg.target = ele.dataset.UUID;
			session.sendMsg(msg); // send to everyone in the room, so they know if they are on air or not.
		}
	}
}
var stillNeedHangupTarget = 1;

function directHangup(ele, event) { // everyone in the room will hangup this guest?  I like that idea.
	if (event == false) {
		if (stillNeedHangupTarget === 1) {
			var confirmHangup = confirm("Are you sure you wish to disconnect these users?");
			stillNeedHangupTarget = confirmHangup;
		} else {
			confirmHangup = stillNeedHangupTarget;
		}
	} else if ((event.ctrlKey) || (event.metaKey)) {
		ele.innerHTML = '<i class="las la-skull-crossbones"></i> <span data-translate="disconnect-guest" >ARMED</span>';
		ele.style.backgroundColor = "#BF3F3F";
		stillNeedHangupTarget = 1;
		Callbacks.push([directHangup, ele, false]);
		log("Hangup queued");
		return;
	} else {
		var confirmHangup = confirm("Are you sure you wish to disconnect this user?");
	}

	if (confirmHangup) {
		var msg = {};
		msg.hangup = true;
		log(msg);
		log(ele.dataset.UUID);
		session.sendRequest(msg, ele.dataset.UUID);
		//session.anysend(msg); // send to everyone in the room, so they know if they are on air or not.
	} else {
		ele.innerHTML = '<i class="las la-sign-out-alt"></i><span data-translate="disconnect-guest"> Hangup</span>';
		ele.style.backgroundColor = null;
	}
}

function directEnable(ele, event, scene=1, director=false) { // A directing room only is controlled by the Director, with the exception of MUTE.
	if (!((event.ctrlKey) || (event.metaKey))) {
		if (ele.dataset.value == 1) {
			ele.dataset.value = 0;
			ele.className = "";
			if (ele.children[1]){
				ele.children[1].innerHTML = "Add to Scene "+scene;
				if (director){
					getById("container_director").style.backgroundColor = null;
				} else {
					getById("container_" + ele.dataset.UUID).style.backgroundColor = null;
				}
			}
		} else {
			ele.dataset.value = 1;
			ele.className = "pressed";
			if (ele.children[1]){
				ele.children[1].innerHTML = "Remove";
				if (director){
					getById("container_director").style.backgroundColor = "#649166";
				} else {
					getById("container_" + ele.dataset.UUID).style.backgroundColor = "#649166";
				}
			}
		}
	}
	var msg = {};
	msg.request = "sendroom";
	msg.scene = scene;
	msg.action = "display";
	msg.value = ele.dataset.value;
	msg.target = ele.dataset.sid;

	//session.anysend(msg);
	session.sendMsg(msg); // send to everyone in the room, so they know if they are on air or not.
}

var previousURL = "";
var stillNeedURL = true;
var reloadCancelled = false;
var armedReload = false;

function directPageReload(ele, event) {
	log("URL Page reload");
	if (event === false) {
		if (previousURL === null) { // user cancelled in previous callback
			ele.innerHTML = '<i class="las la-sync"></i> <span data-translate="change-url">Change URL</span>';
			ele.style.backgroundColor = null;
			return;
		}
		if (reloadCancelled === true) {
			ele.innerHTML = '<i class="las la-sync"></i> <span data-translate="change-url">Change URL</span>';
			ele.style.backgroundColor = null;
			return;
		}
		reloadURL = previousURL
	} else if ((event.ctrlKey) || (event.metaKey)) {
		ele.innerHTML = '<i class="las la-check"></i> <span data-translate="button-armed">Armed</span>';
		ele.style.backgroundColor = "#BF3F3F";
		reloadCancelled = false;
		armedReload=true;
		Callbacks.push([directPageReload, ele, stillNeedURL]);
		stillNeedURL = false;
		log("URL update queued");
		return;
    } else if (armedReload){
		reloadURL = previousURL;
	} else {
		var reloadURL = prompt("Transfer guests to new website URL.\n\n(Guests will be prompted to accept)", previousURL);
		stillNeedURL = true;
		if (reloadURL === null) { // user cancelled
			ele.innerHTML = '<i class="las la-sync"></i> <span data-translate="change-url">Change URL</span>';
			ele.style.backgroundColor = null;
			reloadCancelled = true;
			return;
		}
		try {
			previousURL = reloadURL;
		} catch (e) {}

	}
	ele.innerHTML = '<i class="las la-sync"></i> <span data-translate="change-url">Change URL</span>';
	ele.style.backgroundColor = null;

	if (reloadURL) {
		previousURL = reloadURL;

		var msg = {};
		msg.changeURL = reloadURL;
		if (ele.dataset.UUID in session.rpcs){
			session.rpcs[ele.dataset.UUID].receiveChannel.send(JSON.stringify(msg));
		}
	}
}

function directMute(ele,  event=false) { // A directing room only is controlled by the Director, with the exception of MUTE.
	log("mute");
	if (!event ||  (!((event.ctrlKey) || (event.metaKey)))) {
		if (ele.dataset.value == 0) {
			ele.dataset.value = 1;
			ele.className = "";
			ele.children[1].innerHTML = "Mute in scene";
		} else {
			ele.dataset.value = 0;
			ele.className = "pressed";
			ele.children[1].innerHTML = "Un-mute";
		}
	}
	var msg = {};
	msg.request = "sendroom";
	msg.scene = "1";
	msg.action = "mute";
	msg.value = ele.dataset.value;
	msg.target = ele.dataset.sid;
	session.sendMsg(msg); // send to everyone in the room, so they know if they are on air or not.
}

function remoteSpeakerMute(ele,  event=false){
	log("speaker mute");
	if (!event || (!((event.ctrlKey) || (event.metaKey)))) {
		if (ele.dataset.value == 1) {
			ele.dataset.value = 0;
			ele.className = "";
			ele.children[1].innerHTML = "deafen guest";
		} else {
			ele.dataset.value = 1;
			ele.className = "pressed";
			ele.children[1].innerHTML = "Un-deafen";
		}
	}

	var msg = {};
	if (ele.dataset.value == 0) {
		msg.speakerMute = ele.dataset.value;
	} else {
		msg.speakerMute = ele.dataset.value;
	}
	msg.UUID = ele.dataset.UUID;
	session.sendRequest(msg, ele.dataset.UUID);
}

function updateRemoteSpeakerMute(UUID) {
	var ele = document.querySelectorAll('[data-action-type="toggle-remote-speaker"][data--u-u-i-d="' + UUID + '"]');
	if (ele[0]) {
		ele[0].classList.add("pressed");
		ele[0].dataset.value = 1;
		ele[0].className = "pressed";
		ele[0].children[1].innerHTML = "Un-deafen";
	}
}

function updateRemoteDisplayMute(UUID) {
	var ele = document.querySelectorAll('[data-action-type="toggle-remote-display"][data--u-u-i-d="' + UUID + '"]');
	if (ele[0]) {
		ele[0].classList.add("pressed");
		ele[0].dataset.value = 1;
		ele[0].className = "pressed";
		ele[0].children[1].innerHTML = "Un-blind";
	}
}

function remoteDisplayMute(ele, event=false) {
	log("display mute");
	if (!event ||  (!((event.ctrlKey) || (event.metaKey)))) {
		if (ele.dataset.value == 1) {
			ele.dataset.value = 0;
			ele.className = "";
			ele.children[1].innerHTML = "blind guest";
		} else {
			ele.dataset.value = 1;
			ele.className = "pressed";
			ele.children[1].innerHTML = "Un-blind";
		}
	}

	var msg = {};
	if (ele.dataset.value == 0) {
		msg.displayMute = false;
	} else {
		msg.displayMute = true;
	}
	msg.UUID = ele.dataset.UUID;
	session.sendRequest(msg, ele.dataset.UUID);
}

function remoteLowerhands(UUID) {
	var msg = {};
	msg.lowerhand = true;
	msg.UUID = UUID;
	session.sendRequest(msg, UUID);
}


function remoteMute(ele,  event=false) {
	log("mute");
	if (!event ||  (!((event.ctrlKey) || (event.metaKey)))) {
		if (ele.dataset.value == 1) {
			ele.dataset.value = 0;
			ele.className = "";
			ele.children[1].innerHTML = "mute guest";
		} else {
			ele.dataset.value = 1;
			ele.className = "pressed";
			ele.children[1].innerHTML = "Un-mute guest";
		}
	}

	try {
		session.rpcs[ele.dataset.UUID].directorMutedState = ele.dataset.mute;
		var volume = session.rpcs[ele.dataset.UUID].directorVolumeState;
	} catch (e) {
		errorlog(e);
		var volume = 100;
	}

	var msg = {};
	if (ele.dataset.value == 0) {
		msg.volume = volume;
	} else {
		msg.volume = 0;
	}
	msg.UUID = ele.dataset.UUID;
	session.sendRequest(msg, ele.dataset.UUID);
}

function remoteMuteVideo(ele,  event=false) {
	log("video mute");
	
	if (!event ||  ((event.ctrlKey) || (event.metaKey))) {
		ele.children[1].innerHTML = "ARMED";
		ele.style.backgroundColor = "#BF3F3F";
		Callbacks.push([remoteMuteVideo, ele, false]);
		log("video queued");
		return;
	} else {
		if (ele.dataset.value == 1) {
			ele.dataset.value = 0;
			ele.className = "";
			ele.children[1].innerHTML = "hide guest";
		} else {
			ele.dataset.value = 1;
			ele.className = "pressed";
			ele.children[1].innerHTML = "Unhide guest";
		}
		ele.style.backgroundColor = null;
	}

	var msg = {};
	if (ele.dataset.value == 0) {
		msg.directVideoMuted = false;
	} else {
		msg.directVideoMuted = true;
	}
	
	for (var i in session.pcs){
		msg.target = ele.dataset.UUID;
		
		if (i === msg.target){
			msg.target = true;
		}
		try{
			session.pcs[i].sendChannel.send(JSON.stringify(msg));
		} catch(e){}
		
	}
}

function updateDirectorVideoMute(UUID) {
	var ele = document.querySelectorAll('[data-action-type="hide-guest"][data--u-u-i-d="' + UUID + '"]');
	if (ele[0]) {
		ele[0].dataset.value = 1;
		ele[0].className = "pressed";
		ele[0].children[1].innerHTML = "Unhide guest";
	}
}

function directVolume(ele) { // NOT USED ANYMORE
	log("volume");
	var msg = {};
	msg.request = "sendroom";
	msg.scene = "1";
	msg.action = "volume";
	msg.target = ele.dataset.sid; // i want to focus on the STREAM ID, not the UUID...
	msg.value = ele.value;
	session.sendMsg(msg); // send to everyone in the room, so they know if they are on air or not.
}

function remoteVolumeUI(ele){
	ele.nextSibling.innerHTML = ele.value;
}

function remoteVolume(ele) { // A directing room only is controlled by the Director, with the exception of MUTE.
	log("volume");
	var msg = {};
	var muted = session.rpcs[ele.dataset.UUID].directorMutedState;
	if (muted == 1) { // 1 is a string, not an int, so == and not ===. this happens in a few places :/  
		session.rpcs[ele.dataset.UUID].directorVolumeState = ele.value;
	} else {
		session.rpcs[ele.dataset.UUID].directorVolumeState = ele.value;
		msg.volume = ele.value;
		msg.UUID = ele.dataset.UUID;
		session.sendRequest(msg, ele.dataset.UUID);
	}
}


function sendChat(chatmessage = "hi", UUID=false) { // A directing room only is controlled by the Director, with the exception of MUTE.
	log("Chat message");
	var msg = {};
	msg.chat = chatmessage;
	
	session.sendPeers(msg, UUID);
}

var activatedStream = false;

function publishScreen() {
	if (activatedStream == true) {
		return;
	}
	activatedStream = true;
	setTimeout(function() {
		activatedStream = false;
	}, 1000);

	var title = "ScreenShare"; //getById("videoname2").value;

	formSubmitting = false;

	var quality = parseInt(getById("webcamquality2").elements.namedItem("resolution2").value);

	if (session.quality !== false) {
		quality = session.quality; // override the user's setting
	}

	if (quality == 0) {
		var width = {
			ideal: 1920
		};
		var height = {
			ideal: 1080
		};
	} else if (quality == 1) {
		var width = {
			ideal: 1280
		};
		var height = {
			ideal: 720
		};
	} else if (quality == 2) {
		var width = {
			ideal: 640
		};
		var height = {
			ideal: 360
		};
	} else if (quality >= 3) { // lowest
		var width = {
			ideal: 320
		};
		var height = {
			ideal: 180
		};
	}

	if (session.width) {
		width = {
			ideal: session.width
		};
	}
	if (session.height) {
		height = {
			ideal: session.height
		};
	}

	var constraints = window.constraints = {
		audio: {
			echoCancellation: false
			, autoGainControl: false
			, noiseSuppression: false
		}
		, video: {
			width: width
			, height: height
		}
	};

	if (session.noiseSuppression === true) {
		constraints.audio.noiseSuppression = true;; // the defaults for screen publishing should be off.
	}
	if (session.autoGainControl === true) {
		constraints.audio.autoGainControl = true; // the defaults for screen publishing should be off.
	}
	if (session.echoCancellation === true) {
		constraints.audio.echoCancellation = true; // the defaults for screen publishing should be off.
	}

	try {
		let supportedConstraints = navigator.mediaDevices.getSupportedConstraints(); // cursor hidding isn't supported by most browsers anyways.
		if (supportedConstraints.cursor) {
			constraints.video.cursor = "never";
		}
	} catch(e){
		warnlog("navigator.mediaDevices.getSupportedConstraints() not supported");
	}

	//if (session.nocursor) { // we assume no cursor on screen share anyways. maybe make a different flag for screenshare cursor
	//	constraints.video.cursor = {
	//		exact: "none"
	//	}; // Not sure this does anything, but whatever.
	//}

	if (session.framerate !== false) {
		constraints.video.frameRate = session.framerate;
	} else if (session.maxframerate != false){
		constraints.video.frameRate = {
			ideal: session.maxframerate,
			max: session.maxframerate
		};
	} else {
		constraints.video.frameRate = {
			ideal: 60
		};
	}

	var audioSelect = document.querySelector('select#audioSourceScreenshare');
	var outputSelect = document.querySelector('select#outputSourceScreenshare');


	session.sink = outputSelect.options[outputSelect.selectedIndex].value;
	log("Session SInk: " + session.sink);
	if (session.sink == "default") {
		session.sink = false;
	}

	/* if (session.sink ===false){
		if (session.outputDevice){
			try {
				for (var i in outputSelect.options){
					log(outputSelect.options[i].label.replace(/[\W]+/g,"_").toLowerCase());
					log(session.outputDevice);
					if (outputSelect.options[i].label.replace(/[\W]+/g,"_").toLowerCase().includes(session.outputDevice)){
						session.sink = outputSelect.options[i].value;
						break;
					}
				}
			} catch (e){}
		}
	} */

	log("*");


	session.publishScreen(constraints, title, audioSelect).then((res) => {
		if (res == false) {
			return;
		} // no screen selected
		log("streamID is: " + session.streamID);

		if (session.transcript) {
			setTimeout(function() {
				setupClosedCaptions();
			}, 0);
		}
		//session.screenShareState=true;
		if (!(session.cleanOutput)) {
			getById("mutebutton").className = "float";
			getById("mutespeakerbutton").classList.remove("advanced");
			//getById("mutespeakerbutton").className="float";
			getById("chatbutton").className = "float";
			getById("mutevideobutton").className = "float";
			getById("hangupbutton").className = "float";
			if (session.showSettings) {
				getById("settingsbutton").className = "float";
			}
			if (session.raisehands) {
				getById("raisehandbutton").className = "float";
			}
			if (session.recordLocal !== false) {
				getById("recordLocalbutton").className = "float";
			}
			if (screensharebutton) {
				getById("screensharebutton").className = "float2";
			}
			getById("controlButtons").style.display = "flex";
			getById("helpbutton").style.display = "inherit";
			getById("reportbutton").style.display = "";
		} else if (session.cleanish && session.recordLocal!==false){
			getById("recordLocalbutton").className = "float";
			getById("mutebutton").classList.add("advanced");
			getById("mutespeakerbutton").classList.add("advanced");
			getById("chatbutton").classList.add("advanced");
			getById("mutevideobutton").classList.add("advanced");
			getById("hangupbutton").classList.add("advanced");
			getById("hangupbutton2").classList.add("advanced");
			getById("controlButtons").style.display = "flex";
			getById("settingsbutton").classList.add("advanced");
			getById("screenshare2button").classList.add("advanced");
			getById("screensharebutton").classList.add("advanced");
			getById("queuebutton").classList.add("advanced");
		} else {
			getById("controlButtons").style.display = "none";
		}

		if (session.chatbutton === true) {
			getById("chatbutton").classList.remove("advanced");
			getById("controlButtons").style.display = "inherit";
		} else if (session.chatbutton === false) {
			getById("chatbutton").classList.add("advanced");
		}

		getById("head1").className = 'advanced';
		getById("head2").className = 'advanced';
	}).catch(() => {});

}

function publishWebcam(btn = false) {
	if (btn) {
		if (btn.dataset.ready == "false") {
			warnlog("Clicked too quickly; button not enabled yet");
			return;
		}
		
		if (getById("passwordBasicInput").value.length){
			session.password = getById("passwordBasicInput").value;
			session.password = sanitizePassword(session.password);
			if (session.password.length==0){
				session.password = false;
			} else {
				session.defaultPassword = false;
				if (urlParams.has('pass')) {
					updateURL("pass=" + session.password);
				} else if (urlParams.has('pw')) {
					updateURL("pw=" + session.password);
				} else if (urlParams.has('p')) {
					updateURL("p=" + session.password);
				} else {
					updateURL("password=" + session.password);
				}
			}
		}
	}

	if (activatedStream == true) {
		return;
	}
	activatedStream = true;
	log("PRESSED PUBLISH WEBCAM!!");

	var title = "Webcam"; // getById("videoname3").value;
	var ele = getById("previewWebcam");

	formSubmitting = false;
	window.scrollTo(0, 0); // iOS has a nasty habit of overriding the CSS when changing camaera selections, so this addresses that.

	getById("head2").className = 'advanced';

	if (session.roomid !== false) {
		if ((session.roomid === "") && ((!(session.view)) || (session.view === ""))) {
			//	no room, no viewing, viewing disabled
			session.manual = true;
			window.addEventListener("resize", updateMixer);
			window.addEventListener("orientationchange", function() {
				setTimeout(updateMixer, 200);
			});
		} else {
			log("ROOM ID ENABLED");
			log("Update Mixer Event on REsize SET");
			window.addEventListener("resize", updateMixer);
			window.addEventListener("orientationchange", function() {
				setTimeout(updateMixer, 200);
			});
			getById("main").style.overflow = "hidden";
			//session.cbr=0; // we're just going to override it

			if (session.stereo == 5) {
				if (session.roomid === "") {
					session.stereo = 1;
				} else {
					session.stereo = 3;
				}
			}
			joinRoom(session.roomid);
			if (session.roomid !== "") {
				if (!(session.cleanOutput)) {
					getById("head2").className = '';
				}
			}
			getById("head3").className = 'advanced';
			
		}

	} else {
		getById("head3").className = '';
		getById("logoname").style.display = 'none';
	}

	log("streamID is: " + session.streamID);
	getById("head1").className = 'advanced';


	if (!(session.cleanOutput)) {
		getById("mutebutton").className = "float";
		getById("mutespeakerbutton").classList.remove("advanced");
		//getById("mutespeakerbutton").className="float";
		getById("chatbutton").className = "float";
		getById("mutevideobutton").className = "float";
		getById("hangupbutton").className = "float";
		if (session.showSettings) {
			getById("settingsbutton").className = "float";
		}
		if (session.raisehands) {
			getById("raisehandbutton").className = "float";
		}
		if (session.recordLocal !== false) {
			getById("recordLocalbutton").className = "float";
		}
		if (screensharebutton) {
			if (session.roomid) {
				getById("screenshare2button").className = "float";
				getById("screensharebutton").className = "float advanced";
			} else {
				getById("screensharebutton").className = "float";
				getById("screenshare2button").className = "float advanced";
			}
		}
		getById("controlButtons").style.display = "flex";
		getById("helpbutton").style.display = "inherit";
		getById("reportbutton").style.display = "";
	} else if (session.cleanish && session.recordLocal!==false){
		getById("recordLocalbutton").className = "float";
		getById("mutebutton").classList.add("advanced");
		getById("mutespeakerbutton").classList.add("advanced");
		getById("chatbutton").classList.add("advanced");
		getById("mutevideobutton").classList.add("advanced");
		getById("hangupbutton").classList.add("advanced");
		getById("hangupbutton2").classList.add("advanced");
		getById("controlButtons").style.display = "flex";
		getById("settingsbutton").classList.add("advanced");
		getById("screenshare2button").classList.add("advanced");
		getById("screensharebutton").classList.add("advanced");
		getById("queuebutton").classList.add("advanced");
	} else {
		getById("controlButtons").style.display = "none";
	}

	if (session.chatbutton === true) {
		getById("chatbutton").classList.remove("advanced");
		getById("controlButtons").style.display = "inherit";
	} else if (session.chatbutton === false) {
		getById("chatbutton").classList.add("advanced");
	}

	if (urlParams.has('permaid')) {
		updateURL("permaid=" + session.streamID);
	} else {
		updateURL("push=" + session.streamID);
	}
	
	session.publishStream(ele, title);

}


session.publishIFrame = function(iframeURL){
	
	if (session.transcript){
		setTimeout(function(){setupClosedCaptions();},0);
	}
	
	if (iframeURL==""){
		iframeURL="./";
	}
	if (iframeURL === session.iframeSrc){return;}
	
	
	if (iframeURL.startsWith("https://") || iframeURL.startsWith("http://")){
		var domain = (new URL(iframeURL));
		domain = domain.hostname;
		log(domain);
		if ((domain=="www.youtube.com") || (domain=="youtube.com")){
			var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
			var match = iframeURL.match(regExp);
			var vidid = (match&&match[7].length==11)? match[7] : false;
			
			if(vidid){
				iframeURL = "https://www.youtube.com/embed/"+vidid+"?autoplay=1&modestbranding=1";
				log(iframeURL);
			}
		} else if (domain=="www.twitch.tv"){
			var vidid = iframeURL.split('/').pop().split('#')[0].split('?')[0];
			if (vidid){
				iframeURL = "https://player.twitch.tv/?channel="+vidid+"&parent="+location.hostname;
				log(iframeURL);
			}
		} else if (domain=="twitch.tv"){
			var vidid = iframeURL.split('/').pop().split('#')[0].split('?')[0];
			if (vidid){
				iframeURL = "https://player.twitch.tv/?channel="+vidid+"&parent="+location.hostname;
				log(iframeURL);
			}
		}
		
	}
	
	
	// https://player.twitch.tv/?channel=twitchpresents&parent=obs.ninja
	
	session.iframeSrc = iframeURL;
	
	var container = document.createElement("div");
	container.id = "container";
	
	var iframe = document.createElement("iframe");
	iframe.allow="autoplay;camera;microphone";
	iframe.allowtransparency="true";
	iframe.allowfullscreen ="true";
	iframe.style.width="100%";
	iframe.style.height="100%";
	iframe.style.margin="auto";
	iframe.style.border = "10px dashed rgb(64 65 62)";
	iframe.src = session.iframeSrc;
	iframe.id = "iframe_source"
	session.iframeEle = iframe;
	
	
	if (session.roomid!==false){
		
		window.addEventListener("resize", updateMixer);
		
		if ((session.roomid==="") && ((!(session.view)) || (session.view===""))){
			
		} else {
			log("ROOMID EANBLED");
			getById("head3").className = 'advanced';
			
			joinRoom(session.roomid);
		}
		
	} else {
		getById("head3").className = '';
		getById("logoname").style.display = 'none';
	}
	getById("head1").className = 'advanced';
	
	if (urlParams.has('permaid')){
		updateURL("permaid="+session.streamID);
	} else {
		updateURL("push="+session.streamID);
	}
	
	getById("head1").className = 'advanced';
	getById("head2").className = 'advanced';

	if (!(session.cleanOutput)){
		getById("chatbutton").className="float";
		getById("hangupbutton").className="float";
		getById("controlButtons").style.display="flex";
		getById("helpbutton").style.display = "inherit";
		getById("reportbutton").style.display = "";
	} else {
		getById("controlButtons").style.display="none";
	}
	
	
	
	if (session.director){
	} else if (session.scene!==false){
		updateMixer();
	} else if (session.roomid!==false){
		if (session.roomid===""){
			if (!(session.view) || (session.view==="")){
				
				
				getById("mutespeakerbutton").classList.add("advanced");
				
				container.style.width="100%";
				container.style.height="100%";
				container.style.alignItems = "center";
				container.style.maxWidth= "1280px";
				container.style.maxHeight= "720px";
				container.style.verticalAlign= "middle";
				container.style.margin= "auto";
				container.style.backgroundColor = "#666";
				container.style.border = "2px solid";
				
			} else {
				session.windowed = false;
				updateMixer();
			}
		} else {
			
			session.windowed = false;
			updateMixer();
		}
	} else {
		
		container.style.maxHeight= "1280px";
		container.style.maxWidth= "720px";
		container.style.verticalAlign= "middle";
		container.style.height="100%";
		container.style.width= "100%";
		container.style.margin= "auto";
		container.style.alignItems = "center";
		container.style.backgroundColor = "#666";
	}
	
	getById("mainmenu").parentElement.removeChild(getById("mainmenu"));
	
	getById("gridlayout").innerHTML = "";
	container.appendChild(iframe);
	getById("gridlayout").appendChild(container);
	
	
	session.seeding=true;

	getById("reshare").href = "https://"+location.host+location.pathname+"?view="+session.streamID;
	getById("reshare").text = "https://"+location.host+location.pathname+"?view="+session.streamID;
	getById("reshare").style.width = ((getById("reshare").text.length + 1)*1.15 * 8) + 'px';
	pokeIframeAPI('started-iframe-share');
	
	session.seedStream();
}
	
function outboundAudioPipeline(stream) {
	if (session.disableWebAudio) {
		return stream;
	}

	//if ((iOS) || (iPad)){
	//	return stream
	//} else {
	try {
		log("Web Audio");
		var tracks = stream.getAudioTracks();
		if (tracks.length) {
			for (var waid in session.webAudios) { // TODO:  EXCLUDE CURRENT TRACK IF ALREADY EXISTS ... if (track.id === wa.id){..
				session.webAudios[waid].stop();
				delete session.webAudios[waid];
			}


			var webAudio = {};
			webAudio.micDelay = false;
			webAudio.compressor = false;
			webAudio.analyser = false;
			webAudio.gainNode = false;

			webAudio.lowEQ = false;
			webAudio.midEQ = false;
			webAudio.highEQ = false;

			webAudio.id = tracks[0].id; // first track is used.

			if (session.audioLatency !== false) { // session.audioLatency could be useful for fixing clicking issues?
				var audioContext = new AudioContext({
					latencyHint: session.audioLatency / 1000.0 //, // needs to be in seconds, but OBSN user input is via milliseconds
					// sampleRate: 48000 // not sure this is a great idea, but might as well add this here, versus later on since it is needed anyways.
				});
			} else {
				var audioContext = new AudioContext();
			}

			webAudio.audioContext = audioContext;
			webAudio.mediaStreamSource = audioContext.createMediaStreamSource(stream); // clone to fix iOS issue
			webAudio.destination = audioContext.createMediaStreamDestination();
			webAudio.gainNode = audioGainNode(webAudio.mediaStreamSource, audioContext);

			var anonNode = webAudio.gainNode;
			
			if (session.micDelay) {
				webAudio.micDelay = micDelayNode(anonNode, audioContext);
				anonNode = webAudio.micDelay;
			}

			if (session.audioInputChannels == 1) {
				webAudio.splitter = audioContext.createChannelSplitter(6);
				anonNode.connect(webAudio.splitter);

				webAudio.merger = audioContext.createChannelMerger(6);
				webAudio.splitter.connect(webAudio.merger, 0, 0);
				webAudio.splitter.connect(webAudio.merger, 0, 1);
				webAudio.splitter.connect(webAudio.merger, 0, 2);
				webAudio.splitter.connect(webAudio.merger, 0, 3);
				webAudio.splitter.connect(webAudio.merger, 0, 4);
				webAudio.splitter.connect(webAudio.merger, 0, 5);
				anonNode = webAudio.merger;
			}


			if (session.lowcut) { // https://webaudioapi.com/samples/frequency-response/ for a tool to help set values
				webAudio.lowcut1 = audioContext.createBiquadFilter();
				webAudio.lowcut1.type = "highpass";
				webAudio.lowcut1.frequency.value = session.lowcut;

				webAudio.lowcut2 = audioContext.createBiquadFilter();
				webAudio.lowcut2.type = "highpass";
				webAudio.lowcut2.frequency.value = session.lowcut;

				webAudio.lowcut3 = audioContext.createBiquadFilter();
				webAudio.lowcut3.type = "highpass";
				webAudio.lowcut3.frequency.value = session.lowcut;

				anonNode.connect(webAudio.lowcut1);
				webAudio.lowcut1.connect(webAudio.lowcut2);
				webAudio.lowcut2.connect(webAudio.lowcut3);
				anonNode = webAudio.lowcut3;
			}


			if (session.equalizer) { // https://webaudioapi.com/samples/frequency-response/ for a tool to help set values
				webAudio.lowEQ = audioContext.createBiquadFilter();
				webAudio.lowEQ.type = "lowshelf";
				webAudio.lowEQ.frequency.value = 100;
				webAudio.lowEQ.gain.value = 0;

				webAudio.midEQ = audioContext.createBiquadFilter();
				webAudio.midEQ.type = "peaking";
				webAudio.midEQ.frequency.value = 1000;
				webAudio.midEQ.Q.value = 0.5;
				webAudio.midEQ.gain.value = 0;

				webAudio.highEQ = audioContext.createBiquadFilter();
				webAudio.highEQ.type = "highshelf";
				webAudio.highEQ.frequency.value = 10000;
				webAudio.highEQ.gain.value = 0;

				anonNode.connect(webAudio.lowEQ);
				webAudio.lowEQ.connect(webAudio.midEQ);
				webAudio.midEQ.connect(webAudio.highEQ);
				anonNode = webAudio.highEQ;
			}

			if (session.compressor === 1) {
				webAudio.compressor = audioCompressor(anonNode, audioContext);
				anonNode = webAudio.compressor;
			} else if (session.compressor === 2) {
				webAudio.compressor = audioLimiter(anonNode, audioContext);
				anonNode = webAudio.compressor;
			}

			webAudio.analyser = audioMeter(anonNode, audioContext);
			webAudio.analyser.connect(webAudio.destination);

			webAudio.stop = function() {
				try {
					webAudio.destination.disconnect();
				} catch (e) {}
				try {
					clearInterval(webAudio.analyser.interval);
				} catch (e) {}
				try {
					webAudio.analyser.disconnect();
				} catch (e) {}
				try {
					webAudio.splitter.disconnect();
				} catch (e) {}
				try {
					webAudio.merger.disconnect();
				} catch (e) {}
				try {
					webAudio.lowcut1.disconnect();
					webAudio.lowcut2.disconnect();
					webAudio.lowcut3.disconnect();
				} catch (e) {}
				try {
					webAudio.lowEQ.disconnect();
				} catch (e) {}
				try {
					webAudio.midEQ.disconnect();
				} catch (e) {}
				try {
					webAudio.highEQ.disconnect();
				} catch (e) {}
				try {
					webAudio.gainNode.disconnect();
				} catch (e) {}
				try {
					webAudio.micDelay.disconnect();
				} catch (e) {}
				try {
					webAudio.compressor.disconnect();
				} catch (e) {}
				try {
					webAudio.mediaStreamSource.context.close();
				} catch (e) {}
			}

			webAudio.mediaStreamSource.onended = function() {
				webAudio.stop();
			};

			session.webAudios[webAudio.id] = webAudio;

			stream.getTracks().forEach(function(track) {
				if (webAudio.id != track.id) {
					webAudio.destination.stream.addTrack(track, stream);
				}
			});

			return webAudio.destination.stream;
		} else {
			return stream; // no audio track
		}
	} catch (e) {
		errorlog(e);
		return stream;
	}
}

function changeLowCut(freq, trackid = 0) {
	if (trackid != 0) {
		errorlog("EQ Doesn't work for anything but track 0. yet");
	}
	log("LOW EQ");

	for (var webAudio in session.webAudios) {
		if (!session.webAudios[webAudio].lowcut1) {
			errorlog("EQ not setup");
			return;
		}
		if (!session.webAudios[webAudio].lowcut2) {
			errorlog("EQ not setup");
			return;
		}
		if (!session.webAudios[webAudio].lowcut3) {
			errorlog("EQ not setup");
			return;
		}
		session.webAudios[webAudio].lowcut1.frequency.setValueAtTime(freq, session.webAudios[webAudio].audioContext.currentTime);
		session.webAudios[webAudio].lowcut2.frequency.setValueAtTime(freq, session.webAudios[webAudio].audioContext.currentTime);
		session.webAudios[webAudio].lowcut3.frequency.setValueAtTime(freq, session.webAudios[webAudio].audioContext.currentTime);
	}

}

function changeLowEQ(lowEQ, trackid = 0) {
	if (trackid != 0) {
		errorlog("EQ Doesn't work for anything but track 0. yet");
	}
	log("LOW EQ");

	for (var webAudio in session.webAudios) {
		if (!session.webAudios[webAudio].lowEQ) {
			errorlog("EQ not setup");
			return;
		}
		session.webAudios[webAudio].lowEQ.gain.setValueAtTime(lowEQ, session.webAudios[webAudio].audioContext.currentTime);
	}

}

function changeMidEQ(midEQ, trackid = 0) {
	if (trackid != 0) {
		errorlog("EQ Doesn't work for anything but track 0. yet");
	}

	for (var webAudio in session.webAudios) {
		if (!session.webAudios[webAudio].midEQ) {
			errorlog("EQ not setup");
			return;
		}
		session.webAudios[webAudio].midEQ.gain.setValueAtTime(midEQ, session.webAudios[webAudio].audioContext.currentTime);
	}

}

function changeHighEQ(highEQ, trackid = 0) {
	if (trackid != 0) {
		errorlog("EQ Doesn't work for anything but track 0. yet");
	}

	for (var webAudio in session.webAudios) {
		if (!session.webAudios[webAudio].highEQ) {
			errorlog("EQ not setup");
			return;
		}
		session.webAudios[webAudio].highEQ.gain.setValueAtTime(highEQ, session.webAudios[webAudio].audioContext.currentTime);
	}

}


function micDelayNode(mediaStreamSource, audioContext) {
	var delayNode = audioContext.createDelay();
	if (session.micDelay !== false) {
		var delay = parseFloat(session.micDelay/1000) || 0;
	} else {
		var delay = 0;
	}
	delayNode.delayTime.value = delay;
	mediaStreamSource.connect(delayNode);
	return delayNode;
}

function audioGainNode(mediaStreamSource, audioContext) {
	var gainNode = audioContext.createGain();
	if (session.audioGain !== false) {
		var gain = parseFloat(session.audioGain / 100.0) || 0;
	} else {
		var gain = 1.0;
	}
	gainNode.gain.value = gain;
	mediaStreamSource.connect(gainNode);
	return gainNode;
}

function audioMeter(mediaStreamSource, audioContext) {
	var analyser = audioContext.createAnalyser();
	mediaStreamSource.connect(analyser);
	analyser.fftSize = 256;
	analyser.smoothingTimeConstant = 0.05;

	var bufferLength = analyser.frequencyBinCount;
	var dataArray = new Uint8Array(bufferLength);


	function draw() {
		analyser.getByteFrequencyData(dataArray);
		var total = 0;
		for (var i = 0; i < dataArray.length; i++) {
			total += dataArray[i];
		}
		total = total / 100;

		if (session.cleanOutput){
			return;
		}
		
		if (document.getElementById("meter1")) {
			if (total == 0) {
				getById("meter1").style.width = "1px";
				getById("meter2").style.width = "0px";
			} else if (total <= 1) {
				getById("meter1").style.width = "1px";
				getById("meter2").style.width = "0px";
			} else if (total <= 150) {
				getById("meter1").style.width = total + "px";
				getById("meter2").style.width = "0px";
			} else if (total > 150) {
				if (total > 200) {
					total = 200;
				}
				getById("meter1").style.width = "150px";
				getById("meter2").style.width = (total - 150) + "px";
			}
		} else if (document.getElementById("mutetoggle")) {
			if (total > 200) {
				total = 200;
			}
			total = parseInt(total);
			document.getElementById("mutetoggle").style.color = "rgb(" + (255 - total) + ",255," + (255 - total) + ")";
		} else {
			clearInterval(analyser.interval);
			warnlog("METERS  NOT FOUND");
			return;
		}
	};
	
	analyser.interval = setInterval(function() {
		draw();
	}, 100);
	return analyser;
}



function audioCompressor(mediaStreamSource, audioContext) {
	var compressor = audioContext.createDynamicsCompressor();
	compressor.threshold.value = -50;
	compressor.knee.value = 40;
	compressor.ratio.value = 12;
	compressor.attack.value = 0;
	compressor.release.value = 0.25;
	mediaStreamSource.connect(compressor);
	return compressor;
}

function audioLimiter(mediaStreamSource, audioContext) {
	var compressor = audioContext.createDynamicsCompressor();
	compressor.threshold.value = -5;
	compressor.knee.value = 0;
	compressor.ratio.value = 20.0; // 1 to 20
	compressor.attack.value = 0.001;
	compressor.release.value = 0.1;
	mediaStreamSource.connect(compressor);
	return compressor;
}


function activeSpeaker(border=false) {
	var lastActiveSpeaker = null;
	var changed = false;
	for (var UUID in session.rpcs) {
		if (session.rpcs[UUID].stats._Audio_Loudness_average) {
			session.rpcs[UUID].stats._Audio_Loudness_average = parseFloat(session.rpcs[UUID].stats.Audio_Loudness*0.2 + session.rpcs[UUID].stats._Audio_Loudness_average*0.8);
		} else {
			session.rpcs[UUID].stats._Audio_Loudness_average = 1;
		}
		//log(session.rpcs[UUID].stats._Audio_Loudness_average);
		if (session.rpcs[UUID].stats._Audio_Loudness_average > 13) {
			
			if (border) {
				if (session.rpcs[UUID].videoElement) {
					session.rpcs[UUID].videoElement.style.border = "green solid 1px";
					session.rpcs[UUID].videoElement.style.padding = "0";
				}
			} else if (!session.rpcs[UUID].activelySpeaking){
				session.rpcs[UUID].activelySpeaking = true;
				changed = true;
				lastActiveSpeaker = UUID;
				session.rpcs[UUID].stats._Audio_Loudness_average+=2000000;
			} 
			
		} else if (session.rpcs[UUID].stats._Audio_Loudness_average > 6) {
			
		} else {
			if (border){
				if (session.rpcs[UUID].videoElement) {
					session.rpcs[UUID].videoElement.style.border = "";
					session.rpcs[UUID].videoElement.style.padding = "1px";
				}
			} else if (session.rpcs[UUID].activelySpeaking) {
				changed = true;
				session.rpcs[UUID].activelySpeaking=false;
				lastActiveSpeaker = UUID;
			}
		}
	}
	
	var speaker = false;
	for (var UUID in session.rpcs) {
		if (session.rpcs[UUID].activelySpeaking){speaker=true;}
	}
	
	if (!speaker && lastActiveSpeaker &&  (session.nopreview || session.minipreview || (session.scene!==false) || (session.permaid === false))){
		session.rpcs[lastActiveSpeaker].activelySpeaking=true; 
	} else if (changed) {
		setTimeout(function(){updateMixer();},0);
	}
}



function randomizeArray(unshuffled) {

	var arr = unshuffled.map((a) => ({
		sort: Math.random(), value: a
	})).sort((a, b) => a.sort - b.sort).map((a) => a.value); // shuffle once

	for (var i = arr.length - 1; i > 0; i--) { // shuffle twice
		var j = Math.floor(Math.random() * (i + 1));
		var tmp = arr[i];
		arr[i] = arr[j];
		arr[j] = tmp;
	}
	return arr
}

function joinRoom(roomname) {
	if (roomname.length) {
		roomname = sanitizeRoomName(roomname);
		log("Join room");
		log(roomname);
		session.joinRoom(roomname).then(function(response) { // callback from server; we've joined the room. Just the listing is returned

			if (session.joiningRoom === "seedPlz") { // allow us to seed, now that we have joined the room.
				session.joiningRoom = false; // joined
				session.seedStream();
			} else {
				session.joiningRoom = false; // no seeding callback
			}

			log("Members in Room");
			log(response);

			if (session.randomize === true) {
				response = randomizeArray(response);
				log("Randomized List of Viewers");
				log(response);
				for (var i in response) {
					if ("UUID" in response[i]) {
						if ("streamID" in response[i]) {
							if (response[i].UUID in session.rpcs) {
								log("RTC already connected"); /// lets just say instead of Stream, we have 
							} else {
								log(response[i].streamID);
								var streamID = session.desaltStreamID(response[i].streamID);
								if (session.queue){
									if (session.directorUUID === response[i].UUID){
										play(streamID);
									} else if (session.queueList.length<5000){
										if (!session.queueList.includes(streamID)){
											session.queueList.push(streamID);
										}
									}
								} else {
									log("STREAM ID DESALTED 3: " + streamID);
									setTimeout(function(sid) {
										play(sid);
									}, (Math.floor(Math.random() * 100)), streamID); // add some furtherchance with up to 100ms added latency			
								}	
							}
						}
					}
				}
			} else {
				for (var i in response) {
					if ("UUID" in response[i]) {
						if ("streamID" in response[i]) {
							if (response[i].UUID in session.rpcs) {
								log("RTC already connected"); /// lets just say instead of Stream, we have 
							} else {
								log(response[i].streamID);
								var streamID = session.desaltStreamID(response[i].streamID);
								if (session.queue){
									if (session.directorUUID === response[i].UUID){
										play(streamID);
									} else if (session.queueList.length<5000){
										if (!session.queueList.includes(streamID)){
											session.queueList.push(streamID);
										}
									}
								} else {
									log("STREAM ID DESALTED 3: " + streamID);
									play(streamID); // play handles the group room mechanics here
								}
							}
						}
					}
				}
			}
			session.updateQueue();
		}, function(error) {
			return {};
		});
	} else {
		log("Room name not long enough or contained all bad characaters");
	}
}

function createRoom(roomname = false) {

	if (roomname == false) {
		roomname = getById("videoname1").value;
		roomname = sanitizeRoomName(roomname);
		
		if (roomname.length != 0) {
			if (urlParams.has('dir')){
				updateURL("dir=" + roomname, true, false); // make the link reloadable.
			} else {
				updateURL("director=" + roomname, true, false); // make the link reloadable.
			}
		}
	}
	if (roomname.length == 0) {
		if (!(session.cleanOutput)) {
			warnUser("Please enter a room name before continuing");
		}
		return;
	}
	log(roomname);
	session.roomid = roomname;

	getById("dirroomid").innerHTML = decodeURIComponent(session.roomid);
	getById("roomid").innerHTML = session.roomid;

	var passwordRoom = getById("passwordRoom").value;
	passwordRoom = sanitizePassword(passwordRoom);
	if (passwordRoom.length) {
		session.password = passwordRoom;
		session.defaultPassword = false;

		if (urlParams.has('pass')) {
			updateURL("pass=" + session.password);
		} else if (urlParams.has('pw')) {
			updateURL("pw=" + session.password);
		} else if (urlParams.has('p')) {
			updateURL("p=" + session.password);
		} else {
			updateURL("password=" + session.password);
		}
	}

	var passAdd = "";
	var passAdd2 = "";

	if ((session.defaultPassword === false) && (session.password)) {
		passAdd2 = "&password=" + session.password;
		return session.generateHash(session.password + session.salt, 4).then(function(hash) {
			passAdd = "&hash=" + hash;
			createRoomCallback(passAdd, passAdd2);
		});
	} else {
		createRoomCallback(passAdd, passAdd2);
	}
}

function hideDirectorinvites(ele) {

	if (getById("directorLinks2").style.display == "none") {
		ele.innerHTML = '<i class="las la-caret-down"></i><span data-translate="hide-the-links"> LINKS (GUEST INVITES & SCENES)</span>';
		getById("directorLinks2").style.display = "inline-block";
		getById("customizeLinks").classList.remove("advanced");
	} else {
		ele.innerHTML = '<i class="las la-caret-right"></i><span data-translate="hide-the-links"> LINKS (GUEST INVITES & SCENES)</span>'
		getById("directorLinks2").style.display = "none";
		getById("help_directors_room").style.display = "none";
		getById("roomnotes2").style.display = "none";
		getById("customizeLinks").classList.add("advanced");
	}
	if (getById("directorLinks1").style.display == "none") {
		getById("directorLinks1").style.display = "inline-block";
		getById("customizeLinks").classList.remove("advanced");
	} else {
		getById("directorLinks1").style.display = "none";
		getById("help_directors_room").style.display = "none";
		getById("roomnotes2").style.display = "none";
		getById("customizeLinks").classList.add("advanced");

	}
	//document.querySelector(".directorContainer.half").style.display="none";
	//document.querySelector(".directorContainer").style.display="none";
}

function createRoomCallback(passAdd, passAdd2) {

	var gridlayout = getById("gridlayout");
	gridlayout.classList.add("directorsgrid");

	var broadcastFlag = getById("broadcastFlag");
	try {
		if (broadcastFlag.checked) {
			broadcastFlag = true;
		} else {
			broadcastFlag = false;
		}
	} catch (e) {
		broadcastFlag = false;
	}

	var broadcastString = "";
	if (broadcastFlag) {
		broadcastString = "&broadcast";
		getById("broadcastSlider").checked = true;
	}

	var showdirectorFlag = getById("showdirectorFlag");
	try {
		if (showdirectorFlag.checked) {
			showdirectorFlag = true;
		} else {
			showdirectorFlag = false;
		}
	} catch (e) {
		showdirectorFlag = false;
	}

	if (showdirectorFlag) {
		updateURL("showdirector", true, false);
		session.showDirector = true;
		//getById("broadcastSlider").checked=true;
	}


	var codecGroupFlag = getById("codecGroupFlag");

	if (codecGroupFlag.value) {
		if (codecGroupFlag.value === "vp9") {
			codecGroupFlag = "&codec=vp9";
			getById("codech264toggle").disabled=true;
		} else if (codecGroupFlag.value === "h264") {
			codecGroupFlag = "&codec=h264";
			getById("codech264toggle").checked=true;
		} else if (codecGroupFlag.value === "vp8") {
			codecGroupFlag = "&codec=vp8";
			getById("codech264toggle").disabled=true;
		} else if (codecGroupFlag.value === "av1") {
			codecGroupFlag = "&codec=av1";
			getById("codech264toggle").disabled=true;
		} else {
			codecGroupFlag = "";
		}
	} else {
		codecGroupFlag = "";
	}
	if (codecGroupFlag) {
		session.codecGroupFlag = codecGroupFlag;
	}

	formSubmitting = false;


	var m = getById("mainmenu");
	m.remove();

	getById("head1").className = 'advanced';
	getById("head2").className = 'advanced';
	//getById("head3").className = 'advanced';
	getById("head4").className = '';

	try {
		if (session.label === false) {
			document.title = "Control Room";
		}
	} catch (e) {
		errorlog(e);
	};


	session.director = true;
	screensharesupport = false;

	window.addEventListener("resize", updateMixer);
	window.addEventListener("orientationchange", updateMixer);
	getById("reshare").parentNode.removeChild(getById("reshare"));


	//getById("mutespeakerbutton").style.display = null;
	session.speakerMuted = true; // the director will start with audio playback muted.
	toggleSpeakerMute(true);


	if (session.cleanDirector == false) {

		getById("roomHeader").style.display = "";
		//getById("directorLinks").style.display = "";
		getById("directorLinks1").style.display = "inline-block";
		getById("directorLinks2").style.display = "inline-block";

		getById("director_block_1").dataset.raw = "https://" + location.host + location.pathname + "?room=" + session.roomid + broadcastString + passAdd;
		getById("director_block_1").href = "https://" + location.host + location.pathname + "?room=" + session.roomid + broadcastString + passAdd;
		getById("director_block_1").innerText = "https://" + location.host + location.pathname + "?room=" + session.roomid + broadcastString + passAdd;


		getById("director_block_3").dataset.raw = "https://" + location.host + location.pathname + "?scene&room=" + session.roomid + codecGroupFlag + passAdd2;
		getById("director_block_3").href = "https://" + location.host + location.pathname + "?scene&room=" + session.roomid + codecGroupFlag + passAdd2;
		getById("director_block_3").innerText = "https://" + location.host + location.pathname + "?scene&room=" + session.roomid + codecGroupFlag + passAdd2;
		
		getById("calendarButton").style.display = "inline-block";


	} else {
		getById("guestFeeds").innerHTML = '';
	}
	getById("guestFeeds").style.display = "";

	if (!(session.cleanOutput)) {
		if (session.queue){
			getById("queuebutton").classList.remove("advanced");
		}
		getById("chatbutton").classList.remove("advanced");
		getById("controlButtons").style.display = "inherit";
		getById("mutespeakerbutton").classList.remove("advanced");
		if (session.showDirector == false) {
			getById("miniPerformer").innerHTML = '<button id="press2talk" onmousedown="event.preventDefault(); event.stopPropagation();" style="width:auto;margin-left:5px;height:45px;border-radius: 38px;" class="float" onclick="press2talk(true);" title="You can also enable the director`s Video Output afterwards by clicking the Setting`s button"><i class="las la-headset"></i><span data-translate="push-to-talk-enable"> enable director`s microphone or video<br />(only guests can see this feed)</span></button>';
		} else {
			getById("miniPerformer").innerHTML = '<button id="press2talk" onmousedown="event.preventDefault(); event.stopPropagation();" style="width:auto;margin-left:5px;height:45px;border-radius: 38px;" class="float" onclick="press2talk(true);" title="You can also enable the director`s Video Output afterwards by clicking the Setting`s button"><i class="las la-headset"></i><span data-translate="push-to-talk-enable"> enable director`s microphone or video</span></button>';
		}
		getById("miniPerformer").className = "";
        
        var tabindex = 26;
        if (session.rooms && session.rooms.length > 0){
            var container = getById("rooms");
            container.innerHTML += 'Arm Transfer: ';
            session.rooms.forEach(function (r) {
                if(session.roomid == r) return; //don't include self
                container.innerHTML += '<button id="roomselect_' + r + '" onmousedown="event.preventDefault(); event.stopPropagation();" class="float btnArmTransferRoom" onclick="handleRoomSelect(\'' + r + '\');" title="Arm/disarm transfer to this room" tabindex="' + tabindex + '"><i class="las la-paper-plane"></i>' + r + '</button>';
                tabindex++;
            });
        }
        
	} else {
		getById("miniPerformer").style.display = "none";
		getById("controlButtons").style.display = "none";
	}

	if (session.chatbutton === true) {
		getById("chatbutton").classList.remove("advanced");
		getById("controlButtons").style.display = "inherit";
	} else if (session.chatbutton === false) {
		getById("chatbutton").classList.add("advanced");
	}

	clearInterval(session.updateLocalStatsInterval);
	session.updateLocalStatsInterval = setInterval(function(){updateLocalStats();},3000);

	if (session.autostart){
		setTimeout(function(){press2talk(true);},400);
	} else {
		session.seeding=true;
		session.seedStream();
	}
	
	joinRoom(session.roomid); 

}
/**
 * Handles click actions on the room selection buttons in #controlButtons
 * @param {string} room - Room name to select/deselect for the next transfer call
 */
function handleRoomSelect(room) {
    var elems = document.querySelectorAll(".btnArmTransferRoom");
    [].forEach.call(elems, function(el) {
        el.classList.remove("selected");
    });
    if (previousRoom == room) {
        previousRoom = "";
        armedTransfer = false;
        stillNeedRoom = true;
    } else {
        previousRoom = room;
        stillNeedRoom = false;
        armedTransfer = true;
        getById("roomselect_" + room).classList.add('selected');
    }
}

function getDirectorSettings(scene){
	var settings = {};
	var eles = document.querySelectorAll('[data-action-type="solo-video"]');
	settings.soloVideo = false;
	for (var i=0;i<eles.length;i++) {
		if (parseInt(eles[i].dataset.value)==1){
			warnlog(eles[i]);
			if (eles[i].dataset.sid){
				settings.soloVideo = eles[i].dataset.sid;
			}
		}
	}
	if (scene){
		var eles = document.querySelectorAll('[data-action-type="addToScene"]');
		settings.scene = {};
		for (var i=0;i<eles.length;i++) {
			if (parseInt(eles[i].dataset.value)==1){
				if (parseInt(eles[i].dataset.scene) == scene){
					if (eles[i].dataset.sid){
						
						var msg = {};
						msg.scene = scene;
						msg.action = "display";
						msg.value = eles[i].dataset.value;
						msg.target = eles[i].dataset.sid;
						
						settings.scene[eles[i].dataset.sid]=msg;
					}
				}
			}
		}
	}
	return settings
}

function requestInfocus(ele) {
	var sid = ele.dataset.sid;

	if (ele.dataset.value == 1) {
		ele.dataset.value = 0;
		ele.classList.remove("pressed");
		var actionMsg = {};
		actionMsg.infocus = false;
		session.sendMessage(actionMsg);
	} else {
		var actionMsg = {};
		for (var i in session.pcs){
			actionMsg.infocus = sid;
			if (sid === session.pcs[i].streamID){
				actionMsg.infocus = true;
			}
			try {
				session.pcs[i].sendChannel.send(JSON.stringify(actionMsg));
			} catch(e){}
		}
		var eles = document.querySelectorAll('[data-action-type="solo-video"]');
		for (var i=0;i<eles.length;i++) {
			log(eles);
			eles[i].classList.remove("pressed");
			eles[i].dataset.value = 0;
		}
		ele.dataset.value = 1;
		ele.classList.add("pressed");
	}
}



function requestAudioSettings(ele) {
	var UUID = ele.dataset.UUID;
	if (ele.dataset.value == 1) {
		ele.dataset.value = 0;
		ele.classList.remove("pressed");
		getById("advanced_audio_director_" + UUID).innerHTML = "";
		getById("advanced_audio_director_" + UUID).className = "advanced";
	} else {
		ele.dataset.value = 1;
		ele.classList.add("pressed");
		getById("advanced_audio_director_" + UUID).innerHTML = "";
		var actionMsg = {};
		actionMsg.getAudioSettings = true;
		session.sendRequest(actionMsg, UUID);
	}
}

function requestVideoSettings(ele) {
	var UUID = ele.dataset.UUID;
	if (ele.dataset.value == 1) {
		ele.dataset.value = 0;
		ele.classList.remove("pressed");
		getById("advanced_video_director_" + UUID).innerHTML = "";
		getById("advanced_video_director_" + UUID).className = "advanced";
	} else {
		ele.dataset.value = 1;
		ele.classList.add("pressed");
		getById("advanced_video_director_" + UUID).innerHTML = "";
		var actionMsg = {};
		actionMsg.getVideoSettings = true;
		session.sendRequest(actionMsg, UUID);
	}
}


function createDirectorOnlyBox() {
	
	var codecGroupFlag="";
		
	if (session.codecGroupFlag){
		codecGroupFlag = session.codecGroupFlag;
	}
	var passAdd2="";
	if (session.password){
		if (session.defaultPassword===false){
			passAdd2="&password="+session.password;
		}
	}
	var soloLink = "https://"+location.host+location.pathname+"?view="+session.streamID+"&scene"+codecGroupFlag+"&room="+session.roomid+passAdd2;
			
	if (document.getElementById("deleteme")) {
		getById("deleteme").parentNode.removeChild(getById("deleteme"));
	}
	var controls = getById("controls_directors_blank").cloneNode(true);

	var container = document.createElement("div");
	container.id = "container_director"; // needed to delete on user disconnect
	container.className = "vidcon directorMargins";

	controls.style.display = "block";
	controls.id = "controls_director";
	getById("guestFeeds").appendChild(container);


	var buttons = "<div class='streamID' style='user-select: none;'>ID: <span style='user-select: text;'>" + session.streamID + "</span>\
	<i class='las la-copy' data-sid='" + session.streamID + "' onmousedown='copyFunction(this.dataset.sid)' onclick='popupMessage(event);copyFunction(this.dataset.sid)' title='Copy this Stream ID to the clipboard' style='cursor:pointer'></i>\
	<span id='label_director' title='Click here to edit the label for this stream. Changes will propagate to all viewers of this stream'>Add a label</span>\
	</div><div id='videoContainer_director'></div>";

	controls.innerHTML += "<div>\
		<div style='padding:5px;word-wrap: break-word; overflow:hidden; white-space: nowrap; overflow: hidden; font-size:0.7em; text-overflow: ellipsis;' title='A direct solo view of the video/audio stream with nothing else. Its audio can be remotely controlled from here'> \
		<a class='soloLink' data-drag='1' draggable='true' onmousedown='copyFunction(this)' onclick='popupMessage(event);copyFunction(this)' \
		value='" + soloLink + "' href='" + soloLink + "'/>" + soloLink + "</a>\
		<button class='pull-right' style='width:100%;background-color:#ecfaff;' onmousedown='copyFunction(this.previousElementSibling)' onclick='popupMessage(event);copyFunction(this.previousElementSibling)'><i class='las la-user'></i> copy Solo link</button>\
		</div><div style='text-align: center;margin:10px;display:block;'><h3>This is you, the director.<br />You are also a performer.</h3></div>";
		
	
	controls.querySelectorAll('[data-action-type]').forEach((ele) => { // give action buttons some self-reference
		ele.dataset.sid = session.streamID;
	});

	container.innerHTML = buttons;
	container.appendChild(controls);
	var labelID = document.getElementById("label_director");
	
	labelID.onclick = function(ee){
		var oldlabel = ee.target.innerText;
		if (session.label===false){
			oldlabel = "";
		}
		var newlabel = prompt("Enter a new Display Name for this stream", oldlabel);
		if (newlabel!==null){
			if (newlabel == ""){
				newlabel = false;
				ee.target.innerText = "Add a label";
			} else {
				ee.target.innerText = newlabel;
			}
			session.label = newlabel;
			var data = {};
			data.changeLabel = true;
			data.value = session.label;
			session.sendMessage(data);
		}
	}
	labelID.style.float = "left";
	labelID.style.top = "2px";
	labelID.style.marginLeft = "5px";
	labelID.style.position  = "relative";
	labelID.style.cursor="pointer";
	if (session.label){
		labelID.innerText = session.label;
	}
}

function createControlBox(UUID, soloLink, streamID) {
	if (document.getElementById("deleteme")) {
		getById("deleteme").parentNode.removeChild(getById("deleteme"));
	}
	var controls = getById("controls_blank").cloneNode(true);

	var container = document.createElement("div");
	container.id = "container_" + UUID; // needed to delete on user disconnect
	container.className = "vidcon directorMargins";
	controls.style.display = "block";
	controls.id = "controls_" + UUID;
	getById("guestFeeds").appendChild(container);

	var buttons = "<div class='streamID' style='user-select: none;'>ID: <span style='user-select: text;'>" + streamID + "</span>\
	<i class='las la-copy' data-sid='" + streamID + "' onmousedown='copyFunction(this.dataset.sid)' onclick='popupMessage(event);copyFunction(this.dataset.sid)' title='Copy this Stream ID to the clipboard' style='cursor:pointer'></i>\
	<span id='label_" + UUID + "' title='Click here to edit the label for this stream. Changes will propagate to all viewers of this stream'></span>\
	</div>";

	if (!session.rpcs[UUID].voiceMeter) {
		session.rpcs[UUID].voiceMeter = getById("voiceMeterTemplate").cloneNode(true);
		session.rpcs[UUID].voiceMeter.id = "voiceMeter_" + UUID;
		session.rpcs[UUID].voiceMeter.style.opacity = 0; // temporary
		//session.rpcs[UUID].voiceMeter.style.display = "block";
		session.rpcs[UUID].voiceMeter.dataset.level = 0;
	}

	session.rpcs[UUID].voiceMeter.style.width = "10px";
	session.rpcs[UUID].voiceMeter.style.height = "10px";
	session.rpcs[UUID].voiceMeter.style.top = "8px";
	session.rpcs[UUID].voiceMeter.style.right = "10px";


	session.rpcs[UUID].remoteMuteElement = getById("muteStateTemplate").cloneNode(true);
	session.rpcs[UUID].remoteMuteElement.id = "";
	session.rpcs[UUID].remoteMuteElement.style.top = "1vh";
	session.rpcs[UUID].remoteMuteElement.style.right = "1vh";


	var videoContainer = document.createElement("div");
	videoContainer.id = "videoContainer_" + UUID; // needed to delete on user disconnect
	videoContainer.style.margin = "0";
	videoContainer.style.position = "relative";

	controls.innerHTML += "<div style='margin:10px;' id='advanced_audio_director_" + UUID + "' class='advanced'></div>";
	controls.innerHTML += "<div style='margin:10px;' id='advanced_video_director_" + UUID + "' class='advanced'></div>";

	var handsID = "hands_" + UUID;

	controls.innerHTML += "<div>\
		<div style='padding:5px;word-wrap: break-word; overflow:hidden; white-space: nowrap; overflow: hidden; font-size:0.7em; text-overflow: ellipsis;' title='A direct solo view of the video/audio stream with nothing else. Its audio can be remotely controlled from here'> \
		<a class='soloLink' data-drag='1' draggable='true' onmousedown='copyFunction(this)' onclick='popupMessage(event);copyFunction(this)' \
		value='" + soloLink + "' href='" + soloLink + "'/>" + soloLink + "</a>\
		<button class='pull-right' style='width:100%;background-color:#ecfaff;' onmousedown='copyFunction(this.previousElementSibling)' onclick='popupMessage(event);copyFunction(this.previousElementSibling)'><i class='las la-user'></i> copy Solo link</button>\
		</div>\
		<button data-action-type=\"hand-raised\" id='" + handsID + "' style='margin: auto;margin-bottom:10px;display:none;background-color:yellow;' data-value='0' title=\"This guest raised their hand. Click this to clear notification.\" onclick=\"remoteLowerhands('" + UUID + "');this.style.display='none';\">\
			<i class=\"las la-hand-paper\"></i>\
			<span data-translate=\"user-raised-hand\">Guest Raised Hand</span>\
		</button>\
		</div>";

	controls.querySelectorAll('[data-action-type]').forEach((ele) => { // give action buttons some self-reference
		ele.dataset.UUID = UUID;
		ele.dataset.sid = streamID;
	});

	container.innerHTML = buttons;
	container.appendChild(videoContainer);
	videoContainer.appendChild(session.rpcs[UUID].voiceMeter);
	videoContainer.appendChild(session.rpcs[UUID].remoteMuteElement);
	container.appendChild(controls);
}

function createDirectorCam(vid) {

	getById("press2talk").innerHTML = "";
	getById("press2talk").outerHTML = "";
	if (document.getElementById("videoContainer_director")){
		getById("videoContainer_director").appendChild(vid);
	} else {
		getById("miniPerformer").appendChild(vid);
	}
	vid.title = "This is the preview of the Director's audio and video output.";
	getById("press2talk").dataset.value = 1;
	session.muted = false;
	toggleMute(true);
	getById("screensharebutton").classList.remove("advanced");
	getById("hangupbutton2").classList.remove("advanced");
	setTimeout(function() {
		toggleSettings();
	}, 200);

	if (urlParams.has('permaid')) {
		updateURL("permaid=" + session.streamID);
	} else {
		updateURL("push=" + session.streamID);
	}
}

function press2talk(clean = false) {
	var ele = getById("press2talk");
	ele.style.minWidth = "127px";
	ele.style.padding = "7px";
	getById("settingsbutton").classList.remove("advanced");
	if (!document.getElementById("controls_director") && session.showDirector){createDirectorOnlyBox();}
	
	
	if (session.videoDevice || (session.audioDevice && session.audioDevice!==1)){
		if ((session.videoDevice === 1) && (session.audioDevice===false || session.audioDevice==1)){
			session.publishDirector(clean, true);
			session.muted = false;
			toggleMute(true);
			return;
		} else {
			enumerateDevices().then(function(deviceInfos) {
				var vdevice = false;
				var adevice = true;
				if (session.audioDevice==0){
					adevice=false;
				}
				if (session.videoDevice && (session.videoDevice!=1)){
					for (let i = 0; i !== deviceInfos.length; ++i) {
						var deviceInfo = deviceInfos[i];
						if ((deviceInfo.kind === 'videoinput') && (deviceInfo.label.replace(/[\W]+/g, "_").toLowerCase().includes(session.videoDevice))) {
							vdevice = {deviceId: {exact: deviceInfo.deviceId}};
							break;
						} else if (deviceInfo.deviceId === session.videoDevice){
							vdevice = {deviceId: {exact: deviceInfo.deviceId}};
							break;
						}
					}
				}
				if (session.audioDevice && (session.audioDevice!=1)){
					for (let i = 0; i !== deviceInfos.length; ++i) {
						var deviceInfo = deviceInfos[i];
						if ((deviceInfo.kind === 'audioinput') && (deviceInfo.label.replace(/[\W]+/g, "_").toLowerCase().includes(session.audioDevice))) {
							adevice = {deviceId: {exact: deviceInfo.deviceId}};
							break;
						} else if (deviceInfo.deviceId === session.audioDevice){
							adevice = {deviceId: {exact: deviceInfo.deviceId}};
							break;
						}
					}
				}
				session.publishDirector(clean, vdevice, adevice);
				session.muted = false;
				toggleMute(true);
			});
			return;
		}
	}
	
	session.publishDirector(clean);
	session.muted = false;
	toggleMute(true);
	
}

function addToGoogleCalendar(){
	var title = "Live Stream";
	//var dates = "20180512T230000Z/20180513T030000Z";
	var linkout = getById("director_block_1").innerText;
	var details = "Join the live stream as a performer at the following link:<br/><br/>===>   "+linkout+"<br/><br/>To test your connection and camera ahead of time, please visit https://obs.ninja/speedtest<br/><br/>Do not share the details of this invite with others, unless explicitly told to.";
	details = details.split(' ').join('+');
	details = details.split('&').join('%26');
	var linkToOpen = "https://calendar.google.com/calendar/r/eventedit?text="+title+"&details="+details;
	//https://calendar.google.com/calendar/r/eventedit?text=My+Custom+Event&dates=20180512T230000Z/20180513T030000Z&details=For+details,+link+here:+https://example.com/tickets-43251101208&location=Garage+Boston+-+20+Linden+Street+-+Allston,+MA+02134
	
	window.open(linkToOpen);
	
}

function addToOutlookCalendar(){
	var title = "Live Stream";
	var linkout = getById("director_block_1").innerText;
	var details = "Join the live stream as a performer at the following link:<br/><br/>===>   "+linkout+"<br/><br/>To test your connection and camera ahead of time, please visit https://obs.ninja/speedtest<br/><br/>Do not share the details of this invite with others, unless explicitly told to.";
	details = details.split(' ').join('%20');
	details = details.split('&').join('%26');
	
	
	var linkToOpen = "https://outlook.live.com/owa/?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&subject="+title+"&body="+details;
	//https://calendar.google.com/calendar/r/eventedit?text=My+Custom+Event&dates=20180512T230000Z/20180513T030000Z&details=For+details,+link+here:+https://example.com/tickets-43251101208&location=Garage+Boston+-+20+Linden+Street+-+Allston,+MA+02134
	
	window.open(linkToOpen);
}

function addToYahooCalendar(){
	var title = "Live Stream";
	var linkout = getById("director_block_1").innerText;
	var details = "Join the live stream as a performer at the following link:<br/><br/>===>   "+linkout+"<br/><br/>To test your connection and camera ahead of time, please visit https://obs.ninja/speedtest<br/><br/>Do not share the details of this invite with others, unless explicitly told to.";
	details = details.split(' ').join('%20');
	details = details.split('&').join('%26');
	var linkToOpen = "https://calendar.yahoo.com?v60&title="+title+"&desc="+details;
	//https://calendar.google.com/calendar/r/eventedit?text=My+Custom+Event&dates=20180512T230000Z/20180513T030000Z&details=For+details,+link+here:+https://example.com/tickets-43251101208&location=Garage+Boston+-+20+Linden+Street+-+Allston,+MA+02134
	
	window.open(linkToOpen);
}

function toggle(ele, tog = false, inline = true) {
	var x = ele;
	if (x.style.display === "none") {
		if (inline) {
			x.style.display = "inline-block";
		} else {
			x.style.display = "block";
		}
	} else {
		x.style.display = "none";
	}
	if (tog) {
		if (tog.dataset.saved) {
			tog.innerHTML = tog.dataset.saved;
			delete(tog.dataset.saved);
		} else {
			tog.dataset.saved = tog.innerHTML;
			tog.innerHTML = "Hide This";
		}
	}
}

function toggleByDataset(filter) {
	var elements = document.querySelectorAll('[data-cluster="'+filter+'"]'); // ie:  .cluster1
	for (var i = 0; i < elements.length; i++) {
	  elements[i].classList.toggle('hidden');
	}
}


var SelectedAudioOutputDevices = []; // order matters.
var SelectedAudioInputDevices = []; // ..
var SelectedVideoInputDevices = []; // ..

function enumerateDevices() {

	log("enumerated start");

	if (typeof navigator.enumerateDevices === "function") {
		log("enumerated failed 1");
		return navigator.enumerateDevices();
	} else if (typeof navigator.mediaDevices === "object" && typeof navigator.mediaDevices.enumerateDevices === "function") {
		return navigator.mediaDevices.enumerateDevices();
	} else {
		return new Promise((resolve, reject) => {
			try {
				if (window.MediaStreamTrack == null || window.MediaStreamTrack.getSources == null) {
					throw new Error();
				}
				window.MediaStreamTrack.getSources((devices) => {
					resolve(devices
						.filter(device => {
							return device.kind.toLowerCase() === "video" || device.kind.toLowerCase() === "videoinput";
						})
						.map(device => {
							return {
								deviceId: device.deviceId != null ? device.deviceId : ""
								, groupId: device.groupId
								, kind: "videoinput"
								, label: device.label
								, toJSON: /* istanbul ignore next */ function() {
									return this;
								}
							};
						}));
				});
			} catch (e) {
				errorlog(e);
			}
		});
	}
}

function requestOutputAudioStream() {
	try {
		//warnlog("GET USER MEDIA");
		return navigator.mediaDevices.getUserMedia({
			audio: true
			, video: false
		}).then(function(stream1) { // Apple needs thi to happen before I can access EnumerateDevices. 
			log("get media sources; request audio stream");
			return enumerateDevices().then(function(deviceInfos) {
				stream1.getTracks().forEach(function(track) { // We don't want to keep it without audio; so we are going to try to add audio now.
					track.stop(); // I need to do this after the enumeration step, else it breaks firefox's labels
				});
				const audioOutputSelect = document.querySelector('#outputSourceScreenshare');
				audioOutputSelect.remove(0);
				audioOutputSelect.removeAttribute("onclick");

				for (let i = 0; i !== deviceInfos.length; ++i) {
					const deviceInfo = deviceInfos[i];
					if (deviceInfo == null) {
						continue;
					}
					const option = document.createElement('option');
					option.value = deviceInfo.deviceId;
					if (deviceInfo.kind === 'audiooutput') {
						const option = document.createElement('option');
						if (audioOutputSelect.length === 0) {
							option.dataset.default = true;
						} else {
							option.dataset.default = false;
						}
						option.value = deviceInfo.deviceId || "default";
						if (option.value == session.sink) {
							option.selected = true;
						}
						option.text = deviceInfo.label || `Speaker ${audioOutputSelect.length + 1}`;
						audioOutputSelect.appendChild(option);
					} else {
						log('Some other kind of source/device: ', deviceInfo);
					}
				}
			});
		});
	} catch (e) {
		if (!(session.cleanOutput)) {
			if (window.isSecureContext) {
				warnUser("An error has occured when trying to access the default audio device. The reason is not known.");
			} else if ((iOS) || (iPad)) {
				warnUser("iOS version 13.4 and up is generally recommended; older than iOS 11 is not supported.");
			} else {
				warnUser("Error acessing the default audio device.\n\nThe website may be loaded in an insecure context.\n\nPlease see: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia");
			}
		}
	}
}


function requestAudioStream() {
	try {
		//warnlog("GET USER MEDIA");
		return navigator.mediaDevices.getUserMedia({
			audio: true
			, video: false
		}).then(function(stream1) { // Apple needs thi to happen before I can access EnumerateDevices. 
			log("get media sources; request audio stream");
			return enumerateDevices().then(function(deviceInfos) {
				stream1.getTracks().forEach(function(track) { // We don't want to keep it without audio; so we are going to try to add audio now.
					track.stop(); // I need to do this after the enumeration step, else it breaks firefox's labels
				});
				log("updating audio");
				const audioInputSelect = document.querySelector('select#audioSourceScreenshare');
				audioInputSelect.remove(1);
				audioInputSelect.removeAttribute("onchange");


				for (let i = 0; i !== deviceInfos.length; ++i) {
					const deviceInfo = deviceInfos[i];
					if (deviceInfo == null) {
						continue;
					}
					const option = document.createElement('option');
					option.value = deviceInfo.deviceId;
					if (deviceInfo.kind === 'audioinput') {
						option.text = deviceInfo.label || `Microphone ${audioInputSelect.length + 1}`;
						audioInputSelect.appendChild(option);
					} else {
						log('Some other kind of source/device: ', deviceInfo);
					}
				}
				audioInputSelect.style.minHeight = ((audioInputSelect.childElementCount + 1) * 1.15 * 16) + 'px';
				audioInputSelect.style.minWidth = "342px";
			});
		});
	} catch (e) {
		if (!(session.cleanOutput)) {
			if (window.isSecureContext) {
				warnUser("An error has occured when trying to access the default audio device. The reason is not known.");
			} else if ((iOS) || (iPad)) {
				warnUser("iOS version 13.4 and up is generally recommended; older than iOS 11 is not supported.");
			} else {
				warnUser("Error acessing the default audio device.\n\nThe website may be loaded in an insecure context.\n\nPlease see: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia");
			}
		}
	}
}


function gotDevices(deviceInfos) { // https://github.com/webrtc/samples/blob/gh-pages/src/content/devices/input-output/js/main.js#L19

	log("got devices!");
	log(deviceInfos);
	try {
		const audioInputSelect = document.querySelector('#audioSource');

		audioInputSelect.innerHTML = "";

		var option = document.createElement('input');
		option.type = "checkbox";
		option.value = "ZZZ";
		option.name = "multiselect1";
		option.id = "multiselect1";
		option.style.display = "none";
		option.checked = true;


		var label = document.createElement('label');
		label.for = option.name;
		label.innerHTML = '<span data-translate="no-audio">No Audio</span>';

		var listele = document.createElement('li');
		listele.appendChild(option);
		listele.appendChild(label);
		audioInputSelect.appendChild(listele);


		option.onchange = function(event) { // make sure to clear 'no audio option' if anything else is selected
			if (!(getById("multiselect1").checked)) {
				getById("multiselect1").checked = true;

				if (SelectedAudioInputDevices.indexOf(event.currentTarget.value) > -1) {} else {
					SelectedAudioInputDevices.push(event.currentTarget.value);
				}

				log("CHECKED 1");
			} else {

				var list = document.querySelectorAll("#audioSource>li>input");
				for (var i = 0; i < list.length; i++) {
					if (list[i].id !== "multiselect1") {
						list[i].checked = false;
					}
				}

				while (SelectedAudioInputDevices.indexOf(event.currentTarget.value) > -1) {
					SelectedAudioInputDevices.splice(SelectedAudioInputDevices.indexOf(event.currentTarget.value), 1);
				}
			}
		};

		getById('multiselect-trigger').dataset.state = '0';
		getById('multiselect-trigger').classList.add('closed');
		getById('multiselect-trigger').classList.remove('open');
		getById('chevarrow1').classList.add('bottom');

		const videoSelect = document.querySelector('select#videoSourceSelect');
		const audioOutputSelect = document.querySelector('#outputSource');
		const selectors = [videoSelect];

		const values = selectors.map(select => select.value);
		selectors.forEach(select => {
			while (select.firstChild) {
				select.removeChild(select.firstChild);
			}
		});


		function comp(a, b) {
			if (a.kind === 'audioinput') {
				return 0;
			} else if (a.kind === 'audiooutput') {
				return 0;
			}
			const labelA = a.label.toUpperCase();
			const labelB = b.label.toUpperCase();
			if (labelA > labelB) {
				return 1;
			} else if (labelA < labelB) {
				return -1;
			}
			return 0;
		}
		//deviceInfos.sort(comp); // I like this idea, but it messes with the defaults.  I just don't know what it will do.

		// This is to hide NDI from default device. NDI Tools fucks up.
		var tmp = [];
		for (let i = 0; i !== deviceInfos.length; ++i) {
			deviceInfo = deviceInfos[i];
			if (!((deviceInfo.kind === 'videoinput') && (deviceInfo.label.toLowerCase().startsWith("ndi") || deviceInfo.label.toLowerCase().startsWith("newtek")))) {
				tmp.push(deviceInfo);
			}
		}

		for (let i = 0; i !== deviceInfos.length; ++i) {
			deviceInfo = deviceInfos[i];
			if ((deviceInfo.kind === 'videoinput') && (deviceInfo.label.toLowerCase().startsWith("ndi") || deviceInfo.label.toLowerCase().startsWith("newtek"))) {
				tmp.push(deviceInfo);
				log("V DEVICE FOUND = " + deviceInfo.label.replace(/[\W]+/g, "_").toLowerCase());
			}
		}
		deviceInfos = tmp;
		log(deviceInfos);

		if ((session.audioDevice) && (session.audioDevice !== 1)) { // this sorts according to users's manual selection
			var tmp = [];
			for (let i = 0; i !== deviceInfos.length; ++i) {
				deviceInfo = deviceInfos[i];
				if ((deviceInfo.kind === 'audioinput') && (deviceInfo.label.replace(/[\W]+/g, "_").toLowerCase().includes(session.audioDevice))) {
					tmp.push(deviceInfo);
					log("A DEVICE FOUND = " + deviceInfo.label.replace(/[\W]+/g, "_").toLowerCase());
				} else if (deviceInfo.deviceId === session.audioDevice){
					tmp.push(deviceInfo);
					log("EXACT A DEVICE FOUND");
				}
			}
			for (let i = 0; i !== deviceInfos.length; ++i) {
				deviceInfo = deviceInfos[i];
				if (!((deviceInfo.kind === 'audioinput') && (deviceInfo.label.replace(/[\W]+/g, "_").toLowerCase().includes(session.audioDevice)))) {
					if (deviceInfo.deviceId !== session.audioDevice){
						tmp.push(deviceInfo);
					}
				}
			}

			deviceInfos = tmp;
			log(session.audioDevice);
			log(deviceInfos);
		}


		if ((session.videoDevice) && (session.videoDevice !== 1)) { // this sorts according to users's manual selection
			var tmp = [];
			for (let i = 0; i !== deviceInfos.length; ++i) {
				deviceInfo = deviceInfos[i];
				if ((deviceInfo.kind === 'videoinput') && (deviceInfo.label.replace(/[\W]+/g, "_").toLowerCase().includes(session.videoDevice))) {
					tmp.push(deviceInfo);
					log("V DEVICE FOUND = " + deviceInfo.label.replace(/[\W]+/g, "_").toLowerCase());
				} else if (deviceInfo.deviceId === session.videoDevice){
					tmp.push(deviceInfo);
					log("EXACT V DEVICE FOUND");
				}
			}
			for (let i = 0; i !== deviceInfos.length; ++i) {
				deviceInfo = deviceInfos[i];
				if (!((deviceInfo.kind === 'videoinput') && (deviceInfo.label.replace(/[\W]+/g, "_").toLowerCase().includes(session.videoDevice)))) {
					if (deviceInfo.deviceId !== session.videoDevice){
						tmp.push(deviceInfo);
					}
				}
			}
			deviceInfos = tmp;
			log("VDECICE:" + session.videoDevice);
			log(deviceInfos);
		}


		var counter = 1;
		for (let i = 0; i !== deviceInfos.length; ++i) {
			const deviceInfo = deviceInfos[i];
			if (deviceInfo == null) {
				continue;
			}

			if (deviceInfo.kind === 'audioinput') {
				option = document.createElement('input');
				option.type = "checkbox";
				counter++;
				listele = document.createElement('li');
				if (counter == 2) {
					option.checked = true;
					listele.style.display = "block";
					option.style.display = "none";
					getById("multiselect1").checked = false;
					getById("multiselect1").parentNode.style.display = "none";
				} else {
					listele.style.display = "none";
				}


				option.value = deviceInfo.deviceId || "default";
				option.name = "multiselect" + counter;
				option.id = "multiselect" + counter;
				label = document.createElement('label');
				label.for = option.name;

				label.innerHTML = " " + (deviceInfo.label || ("microphone " + ((audioInputSelect.length || 0) + 1)));

				listele.appendChild(option);
				listele.appendChild(label);
				audioInputSelect.appendChild(listele);

				option.onchange = function(event) { // make sure to clear 'no audio option' if anything else is selected
					getById("multiselect1").checked = false;
					log("UNCHECKED");
					if (!(CtrlPressed)) {
						document.querySelectorAll("#audioSource input[type='checkbox']").forEach(function(item) {
							if (event.currentTarget.id !== item.id) {
								item.checked = false;

								while (SelectedAudioInputDevices.indexOf(item.value) > -1) {
									SelectedAudioInputDevices.splice(SelectedAudioInputDevices.indexOf(item.value), 1);
								}

							} else {
								item.checked = true;
								if (SelectedAudioInputDevices.indexOf(event.currentTarget.value) > -1) {} else {
									SelectedAudioInputDevices.push(event.currentTarget.value);
								}
							}
						});
					}
				};

			} else if (deviceInfo.kind === 'videoinput') {
				option = document.createElement('option');
				option.value = deviceInfo.deviceId || "default";
				option.text = deviceInfo.label || `camera ${videoSelect.length + 1}`;
				videoSelect.appendChild(option);
			} else if (deviceInfo.kind === 'audiooutput') {
				option = document.createElement('option');
				if (audioOutputSelect.length === 0) {
					option.dataset.default = true;
				} else {
					option.dataset.default = false;
				}
				option.value = deviceInfo.deviceId || "default";
				if (option.value == session.sink) {
					option.selected = true;
				}
				option.text = deviceInfo.label || `Speaker ${audioOutputSelect.length + 1}`;
				audioOutputSelect.appendChild(option);
			} else {
				log('Some other kind of source/device: ', deviceInfo);
			}
		}

		if (audioOutputSelect.childNodes.length == 0) {
			option = document.createElement('option');
			option.value = "default";
			option.text = "System Default";
			audioOutputSelect.appendChild(option);
		}

		option = document.createElement('option');
		option.text = "Disable Video";
		option.value = "ZZZ";
		videoSelect.appendChild(option); // NO AUDIO OPTION

		selectors.forEach((select, selectorIndex) => {
			if (Array.prototype.slice.call(select.childNodes).some(n => n.value === values[selectorIndex])) {
				select.value = values[selectorIndex];
			}
		});

	} catch (e) {
		errorlog(e);
	}
}


if (location.protocol !== 'https:') {
	if (!(session.cleanOutput)) {
		warnUser("SSL (https) is not enabled. This site will not work without it!<br /><br /><a href='https://"+window.location.host+window.location.pathname+window.location.search+"'>Try accessing the site from here instead.</a>");
	}
}


function getUserMediaVideoParams(resolutionFallbackLevel, isSafariBrowser) {
	switch (resolutionFallbackLevel) {
		case 0:
			if (isSafariBrowser) {
				return {
					width: {
						min: 360
						, ideal: 1920
						, max: 1920
					}
					, height: {
						min: 360
						, ideal: 1080
						, max: 1080
					}
				};
			} else {
				return {
					width: {
						min: 720
						, ideal: 1920
						, max: 1920
					}
					, height: {
						min: 720
						, ideal: 1080
						, max: 1920
					}
				};
			}
		case 1:
			if (isSafariBrowser) {
				return {
					width: {
						min: 360
						, ideal: 1280
						, max: 1280
					}
					, height: {
						min: 360
						, ideal: 720
						, max: 720
					}
				};
			} else {
				return {
					width: {
						min: 720
						, ideal: 1280
						, max: 1280
					}
					, height: {
						min: 720
						, ideal: 720
						, max: 1280
					}
				};
			}
		case 2:
			if (isSafariBrowser) {
				return {
					width: {
						min: 640
					}
					, height: {
						min: 360
					}
				};
			} else {
				return {
					width: {
						min: 240
						, ideal: 640
						, max: 1280
					}
					, height: {
						min: 240
						, ideal: 360
						, max: 1280
					}
				};
			}
		case 3:
			if (isSafariBrowser) {
				return {
					width: {
						min: 360
						, ideal: 1280
						, max: 1440
					}
				};
			} else {
				return {
					width: {
						min: 360
						, ideal: 1280
						, max: 1440
					}
				};
			}
		case 4:
			if (isSafariBrowser) {
				return {
					height: {
						min: 360
						, ideal: 720
						, max: 960
					}
				};
			} else {
				return {
					height: {
						ideal: 720
						, max: 960
					}
				};
			}
		case 5:
			if (isSafariBrowser) {
				return {
					width: {
						min: 360
						, ideal: 640
						, max: 1440
					}
					, height: {
						min: 360
						, ideal: 360
						, max: 720
					}
				};
			} else {
				return {
					width: {
						ideal: 640
						, max: 1920
					}
					, height: {
						ideal: 360
						, max: 1920
					}
				}; // same as default, but I didn't want to mess with framerates until I gave it all a try first
			}
		case 6:
			if (isSafariBrowser) {
				return {}; // iphone users probably don't need to wait any longer, so let them just get to it
			} else {
				return {
					width: {
						min: 360
						, ideal: 640
						, max: 3840
					}
					, height: {
						min: 360
						, ideal: 360
						, max: 2160
					}
				};

			}
		case 7:
			return { // If the camera is recording in low-light, it may have a low framerate. It coudl also be recording at a very high resolution.
				width: {
					min: 360
					, ideal: 640
				}
				, height: {
					min: 360
					, ideal: 360
				}
			, };

		case 8:
			return {
				width: {
					min: 360
				}
				, height: {
					min: 360
				}
				, frameRate: 10
			}; // same as default, but I didn't want to mess with framerates until I gave it all a try first
		case 9:
			return {
				frameRate: 0
			}; // Some Samsung Devices report they can only support a framerate of 0.
		case 10:
			return {}
		default:
			return {};
	}
}

function addScreenDevices(device) {
	if (device.kind == "audio") {
		const audioInputSelect = document.querySelector('#audioSource3');
		const listele = document.createElement('li');
		listele.style.display = "block";

		const option = document.createElement('input');
		option.type = "checkbox";
		option.checked = true;

		if (getById('multiselect-trigger3').dataset.state == 0) {
			option.style.display = "none";
		}

		option.value = device.id;
		option.name = device.label;
		option.dataset.type = "screen";
		option.label = device.label;

		const label = document.createElement('label');
		label.for = option.name;
		label.innerHTML = " " + device.label;
		listele.appendChild(option);
		listele.appendChild(label);

		option.onchange = function(event) { // make sure to clear 'no audio option' if anything else is selected
			log("change 4644");
			if (!(CtrlPressed)) {
				document.querySelectorAll("#audioSource3 input[type='checkbox']").forEach(function(item) {
					if (event.currentTarget.value !== item.value) { // this shoulnd't happen, but if it does.

						item.checked = false;

						if (item.dataset.type == "screen") {
							item.parentElement.parentElement.removeChild(item.parentElement);
						}

						while (SelectedAudioInputDevices.indexOf(item.value) > -1) {
							SelectedAudioInputDevices.splice(SelectedAudioInputDevices.indexOf(item.value), 1);
						}

						activatedPreview = false;
						grabAudio("videosource", "#audioSource3"); // exclude item.id

					} else {
						if (SelectedAudioInputDevices.indexOf(item.value) > -1) {} else {
							SelectedAudioInputDevices.push(item.value);
						}

						item.checked = true;
						activatedPreview = false;
						grabAudio("videosource", "#audioSource3", item.value); // exclude item.id.   we will reconnect, even if already connected, as a way to 'reset' a device if it isn't working.
					}
				});
			}
			event.stopPropagation();
			return false;
		};
		audioInputSelect.appendChild(listele);
		getById("audioSourceNoAudio2").checked = false;

	} else if (device.kind == "video") {
		const videoSelect = document.querySelector('select#videoSource3');
		//const selectors = [ videoSelect];
		//const values = selectors.map(select => select.value);
		const option = document.createElement('option');
		option.value = device.id;
		option.text = device.label;
		option.selected = true;
		option.label = device.label;
		videoSelect.appendChild(option);
	}
}

function gotDevices2(deviceInfos) {
	log("got devices!");
	log(deviceInfos);

	getById("multiselect-trigger3").dataset.state = "0";
	getById("multiselect-trigger3").classList.add('closed');
	getById("multiselect-trigger3").classList.remove('open');
	getById("chevarrow2").classList.add('bottom');

	var knownTrack = false;

	try {
		const audioInputSelect = document.querySelector('#audioSource3');
		const videoSelect = document.querySelector('select#videoSource3');
		const audioOutputSelect = document.querySelector('#outputSource3');
		const selectors = [videoSelect];


		[audioInputSelect].forEach(select => {
			while (select.firstChild) {
				select.removeChild(select.firstChild);
			}
		});

		const values = selectors.map(select => select.value);
		selectors.forEach(select => {
			while (select.firstChild) {
				select.removeChild(select.firstChild);
			}
		});

		[audioOutputSelect].forEach(select => {
			while (select.firstChild) {
				select.removeChild(select.firstChild);
			}
		});

		var counter = 0;
		for (let i = 0; i !== deviceInfos.length; ++i) {
			const deviceInfo = deviceInfos[i];
			if (deviceInfo == null) {
				continue;
			}

			if (deviceInfo.kind === 'audioinput') {
				const option = document.createElement('input');
				option.type = "checkbox";
				counter++;
				const listele = document.createElement('li');
				listele.style.display = "none";

				try {
					session.streamSrc.getAudioTracks().forEach(function(track) {
						if (deviceInfo.label == track.label) {
							option.checked = true;
							listele.style.display = "inherit";
						}
					});
				} catch (e) {
					errorlog(e);
				}

				option.style.display = "none"
				option.value = deviceInfo.deviceId || "default";
				option.name = "multiselecta" + counter;
				option.id = "multiselecta" + counter;
				option.dataset.label = deviceInfo.label || ("microphone " + ((audioInputSelect.length || 0) + 1));

				const label = document.createElement('label');
				label.for = option.name;

				label.innerHTML = " " + (deviceInfo.label || ("microphone " + ((audioInputSelect.length || 0) + 1)));

				listele.appendChild(option);
				listele.appendChild(label);
				audioInputSelect.appendChild(listele);

				option.onchange = function(event) { // make sure to clear 'no audio option' if anything else is selected
					log("change 4768");
					if (!(CtrlPressed)) {
						document.querySelectorAll("#audioSource3 input[type='checkbox']").forEach(function(item) {
							if (event.currentTarget.value !== item.value) {
								item.checked = false;
								if (item.dataset.type == "screen") {
									item.parentElement.parentElement.removeChild(item.parentElement);
								}
								while (SelectedAudioInputDevices.indexOf(item.value) > -1) {
									SelectedAudioInputDevices.splice(SelectedAudioInputDevices.indexOf(item.value), 1);
								}
							} else {
								item.checked = true;
								if (SelectedAudioInputDevices.indexOf(event.currentTarget.value) > -1) {} else {
									SelectedAudioInputDevices.push(event.currentTarget.value);
								}
							}
						});
					} else {

						if (SelectedAudioInputDevices.indexOf(event.currentTarget.value) > -1) {} else {
							SelectedAudioInputDevices.push(event.currentTarget.value);
						}

						getById("audioSourceNoAudio2").checked = false;
					}
				};

			} else if (deviceInfo.kind === 'videoinput') {
				const option = document.createElement('option');
				option.value = deviceInfo.deviceId || "default";
				option.text = deviceInfo.label || `camera ${videoSelect.length + 1}`;
				try {
					if (!knownTrack){
						if (session.canvasSource){
							session.canvasSource.srcObject.getVideoTracks().forEach(function(track) {
								if (option.text == track.label) {
									option.selected = true;
									knownTrack = true;
								}
							});
						}
					}
					if (!knownTrack){
						session.streamSrc.getVideoTracks().forEach(function(track) {
							if (option.text == track.label) {
								option.selected = true;
								knownTrack = true;
							}
						});
					}
				} catch (e) {
					errorlog(e);
				}
				videoSelect.appendChild(option);

			} else if (deviceInfo.kind === 'audiooutput') {
				const option = document.createElement('option');
				if (audioOutputSelect.length === 0) {
					option.dataset.default = true;
				} else {
					option.dataset.default = false;
				}
				option.value = deviceInfo.deviceId || "default";
				if (option.value == session.sink) {
					option.selected = true;
				}
				option.text = deviceInfo.label || `Speaker ${outputSelect.length + 1}`;
				audioOutputSelect.appendChild(option);

			} else {
				log('Some other kind of source/device: ', deviceInfo);
			}
		}

		if (audioOutputSelect.childNodes.length == 0) {
			const option = document.createElement('option');
			option.value = "default";
			option.text = "System Default";
			audioOutputSelect.appendChild(option);
		}

		////////////

		session.streamSrc.getAudioTracks().forEach(function(track) { // add active ScreenShare audio tracks to the list
			log("Checking for screenshare audio");
			var matched = false;
			for (var i = 0; i !== deviceInfos.length; ++i) {
				var deviceInfo = deviceInfos[i];
				if (deviceInfo == null) {
					continue;
				}
				log("---");
				if (track.label == deviceInfo.label) {
					matched = true;
					continue;
				}
			}
			if (matched == false) { // Not a gUM device

				var listele = document.createElement('li');
				listele.style.display = "block";
				var option = document.createElement('input');
				option.type = "checkbox";
				option.value = track.id;
				option.checked = true;
				option.style.display = "none";
				option.name = track.label;
				option.label = track.label;
				option.dataset.type = "screen";
				const label = document.createElement('label');
				label.for = option.name;
				label.innerHTML = " " + track.label;
				listele.appendChild(option);
				listele.appendChild(label);
				option.onchange = function(event) { // make sure to clear 'no audio option' if anything else is selected
					log("change 4873");
					var trackid = null;
					if (!(CtrlPressed)) {

						document.querySelectorAll("#audioSource3 input[type='checkbox']").forEach(function(item) {
							if (event.currentTarget.value !== item.value) { // this shoulnd't happen, but if it does.
								item.checked = false;
								if (item.dataset.type == "screen") {
									item.parentElement.parentElement.removeChild(item.parentElement);
								}
							} else {
								event.currentTarget.checked = true;
								trackid = item.value;
							}
						});
					} else {
						//getById("audioSourceNoAudio2").checked=false;
						if (event.currentTarget.dataset.type == "screen") {
							event.currentTarget.parentElement.parentElement.removeChild(event.currentTarget.parentElement);
						}
					}
					activatedPreview = false;
					grabAudio("videosource", "#audioSource3", trackid); // exclude item.id. 
					event.stopPropagation();
					return false;
				};
				audioInputSelect.appendChild(listele);
			}
		});
		/////////// no video option
		var optionss = false;
		if (screensharesupport) {
			optionss = document.createElement('option');
			optionss.text = "New Screen Share";
			optionss.value = "XXX";
			optionss.previous =
				videoSelect.appendChild(optionss); // NO AUDIO OPTION
		}

		option = document.createElement('option'); // no video
		option.text = "Disable Video";
		option.value = "ZZZ";
		videoSelect.appendChild(option);
		if (session.streamSrc.getVideoTracks().length == 0) {
			option.selected = true;
		} else if (knownTrack == false) {
			option = document.createElement('option'); // no video
			option.text = session.streamSrc.getVideoTracks()[0].label;
			option.value = "YYY";
			videoSelect.appendChild(option);
			option.selected = true;

		}

		if (optionss) {
			optionss.lastSelected = videoSelect.selectedIndex;
		}

		/////////////  /// NO AUDIO appended option

		var option = document.createElement('input');
		option.type = "checkbox";
		option.value = "ZZZ";
		option.style.display = "none"
		option.id = "audioSourceNoAudio2";

		var label = document.createElement('label');
		label.for = option.name;
		label.innerHTML = " No Audio";
		var listele = document.createElement('li');

		if (session.streamSrc.getAudioTracks().length == 0) {
			option.checked = true;
		} else {
			listele.style.display = "none";
			option.checked = false;
		}
		option.onchange = function(event) { // make sure to clear 'no audio option' if anything else is selected
			log("change 4938");
			if (!(CtrlPressed)) {
				document.querySelectorAll("#audioSource3 input[type='checkbox']").forEach(function(item) {
					if (event.currentTarget.value !== item.value) {
						item.checked = false;
						if (item.dataset.type == "screen") {
							item.parentElement.parentElement.removeChild(item.parentElement);
						}

						while (SelectedAudioInputDevices.indexOf(item.value) > -1) {
							SelectedAudioInputDevices.splice(SelectedAudioInputDevices.indexOf(item.value), 1);
						}
					} else {
						item.checked = true;
						if (SelectedAudioInputDevices.indexOf(event.currentTarget.value) > -1) {
							//
						} else {
							SelectedAudioInputDevices.push(event.currentTarget.value);
						}
					}
				});
			} else {
				document.querySelectorAll("#audioSource3 input[type='checkbox']").forEach(function(item) {
					if (event.currentTarget.value === item.value) {
						event.currentTarget.checked = true;
						if (SelectedAudioInputDevices.indexOf(event.currentTarget.value) > -1) {} else {
							SelectedAudioInputDevices.push(event.currentTarget.value);
						}
					} else {
						item.checked = false;
						if (item.dataset.type == "screen") {
							item.parentElement.parentElement.removeChild(item.parentElement);
						}
						while (SelectedAudioInputDevices.indexOf(item.value) > -1) {
							SelectedAudioInputDevices.splice(SelectedAudioInputDevices.indexOf(item.value), 1);
						}
					}

				});
			}
		};
		listele.appendChild(option);
		listele.appendChild(label);
		audioInputSelect.appendChild(listele);

		////////////


		selectors.forEach((select, selectorIndex) => {
			if (Array.prototype.slice.call(select.childNodes).some(n => n.value === values[selectorIndex])) {
				select.value = values[selectorIndex];
			}
		});

		audioInputSelect.onchange = function() {
			log("Audio OPTION HAS CHANGED? 2");
			activatedPreview = false;
			setTimeout(function(){
				grabAudio("videosource", "#audioSource3");
			},10)
		};
		videoSelect.onchange = function(event) {
			try {
				if (event.target.options[event.target.options.selectedIndex].value === "XXX") {
					videoSelect.selectedIndex = event.target.options[event.target.options.selectedIndex].lastSelected;
					if (session.screenShareState == false) {
						toggleScreenShare();
					} else {
						toggleScreenShare(true);
					}
					return;
				}
			} catch (e) {}
			log("video source changed");
			activatedPreview = false;
			grabVideo(session.quality, "videosource", "select#videoSource3");
			enumerateDevices().then(gotDevices2).then(function() {
				session.screenShareState = false;
				pokeIframeAPI("screen-share-ended");
				getById("screensharebutton").classList.add("float");
				getById("screensharebutton").classList.remove("float2");
			});
		};
		getById("refreshVideoButton").onclick = function() {
			if (session.screenShareState) {
				log("can't refresh a screenshare");
				return;
			}
			log("video source changed");
			activatedPreview = false;
			grabVideo(session.quality, "videosource", "select#videoSource3");
		};

		audioOutputSelect.onchange = function() {

			if ((iOS) || (iPad)) {
				return;
			}

			var outputSelect = document.querySelector('select#outputSource3');
			session.sink = outputSelect.options[outputSelect.selectedIndex].value;
			//if (session.sink=="default"){session.sink=false;} else {
			try {
				getById("videosource").setSinkId(session.sink).then(() => {
					log("New Output Device:" + session.sink);
				}).catch(error => {
					errorlog(error);
				});
			} catch (e) {
				errorlog(e);
			}
			for (UUID in session.rpcs) {
				session.rpcs[UUID].videoElement.setSinkId(session.sink).then(() => {
					log("New Output Device for: " + UUID);
				}).catch(error => {
					errorlog(error);
				});
			}
		}

	} catch (e) {
		errorlog(e);
	}
}

function playtone(screen = false) {

	if ((iOS) || (iPad)) {
		//	try{
		//		session.audioContext.resume();
		//	} catch(e){errorlog(e);}
		var testtone = document.getElementById("testtone");
		if (testtone) {
			testtone.mute
			testtone.play();
		}
		return;
	}

	if (screen) {
		var outputSelect = document.querySelector('select#outputSourceScreenshare');
		session.sink = outputSelect.options[outputSelect.selectedIndex].value;
	}

	var testtone = document.getElementById("testtone");
	if (testtone) {
		if (session.sink) {
			try {
				testtone.setSinkId(session.sink).then(() => { // TODO: iOS doens't support sink. Needs to bypass if IOS
					log("changing audio sink:" + session.sink);
					testtone.play();
				}).catch(error => {
					errolog("couldn't set sink");
					errorlog(error);
				});
			} catch (e) {
				warnlog(e); // firefox?
				testtone.play();
			}
		} else {
			testtone.play();
		}
	}
}

async function getAudioOnly(selector, trackid = null, override = false) {
	var audioSelect = document.querySelector(selector).querySelectorAll("input");
	var audioList = [];
	var streams = [];
	log("getAudioOnly()");
	for (var i = 0; i < audioSelect.length; i++) {
		if (audioSelect[i].value == "ZZZ") {
			continue;
		} else if (trackid == audioSelect[i].value) { // skip already excluded
			continue;
		} else if ("screen" == audioSelect[i].dataset.type) { // skip already excluded ---------- !!!!!!  DOES THIS MAKE SENSE? TODO: CHECK
			continue;
		} else if (audioSelect[i].checked) {
			log(audioSelect[i]);
			audioList.push(audioSelect[i]);
		}
	}
	for (var i = 0; i < audioList.length; i++) {

		if ((audioList[i].value == "default") && (session.echoCancellation !== false) && (session.autoGainControl !== false) && (session.noiseSuppression !== false)) {
			var constraint = {
				audio: true
			};
		} else { // Just trying to avoid problems with some systems that don't support these features
			var constraint = {
				audio: {
					deviceId: {
						exact: audioList[i].value
					}
				}
			};
			if (session.echoCancellation === false) {
				constraint.audio.echoCancellation = false;
			} else {
				constraint.audio.echoCancellation = true;
			}
			if (session.autoGainControl === false) {
				constraint.audio.autoGainControl = false;
			} else {
				constraint.audio.autoGainControl = true;
			}
			if (session.noiseSuppression === false) {
				constraint.audio.noiseSuppression = false;
			} else {
				constraint.audio.noiseSuppression = true;
			}
		}
		constraint.video = false;
		if (override !== false) {
			try {
				if (override.audio.deviceId == audioList[i].value) {
					constraint = override;
				}
			} catch (e) {}
		}

		if (session.audioInputChannels) {
			if (constraint.audio === true) {
				constraint.audio = {};
				constraint.audio.channelCount = session.audioInputChannels;
			} else if (constraint.audio) {
				constraint.audio.channelCount = session.audioInputChannels;
			}
		}
		log("CONSTRAINT");
		log(constraint);
		var stream = await navigator.mediaDevices.getUserMedia(constraint).then(function(stream2) {
			return stream2;
		}).catch(function(err) {
			errorlog(err);
			if (!(session.cleanOutput)) {
				if (override !== false) {
					if (err.name) {
						if (err.constraint) {
							warnUser(err['name'] + ": " + err['constraint']);
						}
					}
				}
			}
		}); // More error reporting maybe?
		if (stream) {
			streams.push(stream);
		}
	}

	return streams;
}

function applyMirror(mirror, eleName = 'previewWebcam') { // true unmirrors as its already mirrored

	var transFlip = "";
	var transNorm = "";
	if ((eleName == 'videosource') && (session.windowed)) {
		transFlip = " translate(0, 50%)";
		transNorm = " translate(0, -50%)";
	}

	if (session.mirrored == 2) {
		mirror = true;
	} else if (session.mirrored === 0) {
		mirror = true;
	}


	if (mirror) {
		if (session.mirrored && session.flipped) {
			getById(eleName).style.transform = " scaleX(-1) scaleY(-1)" + transFlip;
			getById(eleName).classList.add("mirrorControl");
		} else if (session.mirrored) {
			getById(eleName).style.transform = "scaleX(-1)" + transNorm;
			getById(eleName).classList.add("mirrorControl");
		} else if (session.flipped) {
			getById(eleName).style.transform = "scaleY(-1) scaleX(1)" + transFlip;
			getById(eleName).classList.remove("mirrorControl");
		} else {
			getById(eleName).style.transform = "scaleX(1)" + transNorm;
			getById(eleName).classList.remove("mirrorControl");
		}
	} else {
		if (session.mirrored && session.flipped) {
			getById(eleName).style.transform = " scaleX(1) scaleY(-1)" + transFlip;
			getById(eleName).classList.remove("mirrorControl");
		} else if (session.mirrored) {
			getById(eleName).style.transform = "scaleX(1)" + transNorm;
			getById(eleName).classList.remove("mirrorControl");
		} else if (session.flipped) {
			getById(eleName).style.transform = "scaleY(-1) scaleX(-1)" + transFlip;
			getById(eleName).classList.add("mirrorControl");
		} else {
			getById(eleName).style.transform = "scaleX(-1)" + transNorm;
			getById(eleName).classList.add("mirrorControl");
		}
	}
}

function cleanupMediaTracks() {
	try {
		if (session.streamSrc) {
			session.streamSrc.getTracks().forEach(function(track) {
				session.streamSrc.removeTrack(track);
				track.stop();
				log("stopping old track");
			});
		}
		if (session.videoElement) {
			session.videoElement.srcObject.getTracks().forEach(function(track) {
				session.videoElement.srcObject.removeTrack(track);
				track.stop();
				log("stopping old track");
			});
		}
		activatedPreview = false;
	} catch (e) {
		errorlog(e);
	}
}

///  Detect system changes; handle change or use for debugging
var lastAudioDevice = null;
var lastVideoDevice = null;
var lastPlaybackDevice = null;

var audioReconnectTimeout = null;
var videoReconnectTimeout = null;
var grabDevicesTimeout = null;
var playbackReconnectTimeout = null;

function reconnectDevices(event) { ///  TODO: Perhaps change this to only if there is a DISCONNECT; rather than ON NEW DEVICE?
	if ((iOS) || (iPad)) {
		//	try{
		//		session.audioContext.resume();
		//	} catch(e){errorlog(e);}
		resetupAudioOut();
		return;
	}
	warnlog("A media device has changed");

	if (document.getElementById("previewWebcam")) {
		var outputSelect = document.getElementById("outputSource");
		if (!outputSelect) {
			errorlog("resetup audio failed");
			return;
		}
		try {
			session.sink = outputSelect.options[outputSelect.selectedIndex].value;
			getById("previewWebcam").setSinkId(session.sink).then(() => {}).catch(error => {
				warnlog(error);
			});
		} catch (e) {
			errorlog(e);
		}
		return;
	}


	if (session.streamSrc === null) {
		return;
	}
	if (document.getElementById("videosource") === null) {
		return;
	}

	try {
		session.streamSrc.getTracks().forEach(function(track) {

			if (track.readyState == "ended") {
				if (track.kind == "audio") {
					lastAudioDevice = track.label;
				} else if (track.kind == "video") {
					lastVideoDevice = track.label;
				}
				session.streamSrc.removeTrack(track);
				log("remove ended old track");
			}
		});

		session.videoElement.srcObject.getTracks().forEach(function(track) {
			if (track.readyState == "ended") {
				session.videoElement.srcObject.removeTrack(track);
				log("remove ended old track");
			}
		});

	} catch (e) {
		errorlog(e);
	}

	clearTimeout(audioReconnectTimeout);
	audioReconnectTimeout = null;
	if (lastAudioDevice) {
		audioReconnectTimeout = setTimeout(function() { // only reconnect same audio device.  If reconnected, clear the disconnected flag.
			enumerateDevices().then(gotDevices2).then(function() {
				// TODO: check to see if any audio is connected?
				var streamConnected = false;
				var audioSelect = document.querySelector("#audioSource3").querySelectorAll("input");
				for (var i = 0; i < audioSelect.length; i++) {
					if (audioSelect[i].value == "ZZZ") {
						continue;
					} else if (audioSelect[i].checked) {
						log("checked");
						streamConnected = true;
						break;
					}
				}

				if (!streamConnected) {
					for (var i = 0; i < audioSelect.length; i++) {
						if (audioSelect[i].value == "ZZZ") {
							continue;
						}
						//errorlog(lastAudioDevice +  " : " + audioSelect[i].dataset.label);
						if (lastAudioDevice == audioSelect[i].dataset.label) { // if the last disconnected device matches.
							audioSelect[i].checked = true;
							streamConnected = true;
							lastAudioDevice = null;
							warnlog("DISCONNECTED AUDIO DEVICE RECONNECTED");
							//for (var j=0; j<audioSelect.length;j++){
							//	if (audioSelect[j].value == "ZZZ"){audioSelect[j].checked=false;break;}
							//}
							break;
						}
					}
				}
				// see what previous state was.  We don't want to add a track if it's set to no audio.
				// 
				//	if (!streamConnected){ // don't add a new audio track if one already exists.
				//	var audioSelect = document.querySelector("#audioSource3").querySelectorAll("input"); 
				//		audioSelect[0].checked=true;
				//	}

				activatedPreview = false;
				grabAudio("videosource", "#audioSource3");
				setTimeout(function() {
					enumerateDevices().then(gotDevices2).then(function() {});
				}, 1000);
			});
		}, 2000);
	}

	clearTimeout(videoReconnectTimeout); // only reconnect same video device.
	videoReconnectTimeout = null;
	if (lastVideoDevice) {
		videoReconnectTimeout = setTimeout(function() {
			enumerateDevices().then(gotDevices2).then(function() {
				var streamConnected = false;
				var videoSelect = getById("videoSource3");
				errorlog(videoSelect.value);

				if (videoSelect.value == "ZZZ") {
					for (var i = 0; i < videoSelect.options.length; i++) {
						try {
							if (videoSelect.options[i].innerHTML == lastVideoDevice) {
								videoSelect.options[i].selected = true;
								streamConnected = true;
								lastVideoDevice = null;
								break;
							}
						} catch (e) {
							errorlog(e);
						}
					}
				}

				if (streamConnected) {
					//videoSelect.options[0].selected = true;
					activatedPreview = false;
					grabVideo(session.quality, "videosource", "select#videoSource3");
					setTimeout(function() {
						enumerateDevices().then(gotDevices2).then(function() {});
					}, 1000);
				}

			});
		}, 2000);
	}

	//	clearTimeout(grabDevicesTimeout);  // I just don't want to have this fired more than once, if multiple devices get plugged in.
	//	if ((!audioReconnectTimeout) && (!videoReconnectTimeout)){ 
	//		grabDevicesTimeout = setTimeout(function(){enumerateDevices().then(gotDevices2).then(function(){});},500);
	//	}


	// enumerate devices -> check if session.sink still exists -> if not, select default default (track past last sink) -> if last disconnected devices comes back, reconnect it.

	// lastPlaybackDevice
	//if (session.sink){ //  Let Chrome handle the audio automatically, since not manually specified.
	clearTimeout(playbackReconnectTimeout);
	playbackReconnectTimeout = setTimeout(function() {
		enumerateDevices().then(gotDevices2).then(function() {
			resetupAudioOut();
		});
	}, 500);

}

function resetupAudioOut() {
	if ((iOS) || (iPad)) {
		for (var UUID in session.rpcs) {
			if (session.rpcs[UUID].videoElement) {
				session.rpcs[UUID].videoElement.pause().then(() => {
					setTimeout(function(uuid) {
						session.rpcs[uuid].videoElement.play().then(() => {
							log("toggle pause/play");
						});
					}, 0, UUID);

				});
			}
		}
		return;
	}

	var outputSelect = document.getElementById("outputSource3");
	if (!outputSelect) {
		errorlog("resetup audio failed");
		return;
	}
	log("Resetting Audio Output");
	var sinkSet = false;
	for (var i = 0; i < outputSelect.options.length; i++) {
		if (outputSelect.options[i].value == session.sink) {
			outputSelect.options[i].selected = true;
			sinkSet = true;
		}
	}
	if (sinkSet == false) {
		if (outputSelect.options[0]) {
			outputSelect.options[0].selected = true;
			sinkSet = outputSelect.value;
		}
	} else {
		sinkSet = session.sink;
	}
	if (sinkSet) {
		session.videoElement.setSinkId(sinkSet).then(() => {}).catch(error => {
			errorlog(error);
		});
		for (UUID in session.rpcs) {
			try{
				session.rpcs[UUID].videoElement.setSinkId(sinkSet).then(() => {
					log("New Output Device for: " + UUID);
				}).catch(error => {
					errorlog(error);
				});
			} catch(e){warnlog(e);}
		}
	}
}

function obfuscateURL(input) {
	if (input.startsWith("https://obs.ninja/")) {
		input = input.replace('https://obs.ninja/', '');
	} else if (input.startsWith("http://obs.ninja/")) {
		input = input.replace('http://obs.ninja/', '');
	} else if (input.startsWith("obs.ninja/")) {
		input = input.replace('obs.ninja/', '');
	}

	input = input.replace('&view=', '&v=');
	input = input.replace('&view&', '&v&');
	input = input.replace('?view&', '?v&');
	input = input.replace('?view=', '?v=');

	input = input.replace('&videobitrate=', '&vb=');
	input = input.replace('?videobitrate=', '?vb=');
	input = input.replace('&bitrate=', '&vb=');
	input = input.replace('?bitrate=', '?vb=');

	input = input.replace('?audiodevice=', '?ad=');
	input = input.replace('&audiodevice=', '&ad=');

	input = input.replace('?label=', '?l=');
	input = input.replace('&label=', '&l=');

	input = input.replace('?stereo=', '?s=');
	input = input.replace('&stereo=', '&s=');
	input = input.replace('&stereo&', '&s&');
	input = input.replace('?stereo&', '?s&');

	input = input.replace('?webcam&', '?wc&');
	input = input.replace('&webcam&', '&wc&');

	input = input.replace('?remote=', '?rm=');
	input = input.replace('&remote=', '&rm=');

	input = input.replace('?password=', '?p=');
	input = input.replace('&password=', '&p=');

	input = input.replace('&maxvideobitrate=', '&mvb=');
	input = input.replace('?maxvideobitrate=', '?mvb=');

	input = input.replace('&maxbitrate=', '&mvb=');
	input = input.replace('?maxbitrate=', '?mvb=');

	input = input.replace('&height=', '&h=');
	input = input.replace('?height=', '?h=');

	input = input.replace('&width=', '&w=');
	input = input.replace('?width=', '?w=');

	input = input.replace('&quality=', '&q=');
	input = input.replace('?quality=', '?q=');

	input = input.replace('&cleanoutput=', '&clean=');
	input = input.replace('?cleanoutput=', '?clean=');

	input = input.replace('&maxviewers=', '&clean=');
	input = input.replace('?maxviewers=', '?clean=');

	input = input.replace('&framerate=', '&fr=');
	input = input.replace('?framerate=', '?fr=');

	input = input.replace('&fps=', '&fr=');
	input = input.replace('?fps=', '?fr=');

	input = input.replace('&permaid=', '&push=');
	input = input.replace('?permaid=', '?push=');

	input = input.replace('&roomid=', '&r=');
	input = input.replace('?roomid=', '?r=');

	input = input.replace('&room=', '&r=');
	input = input.replace('?room=', '?r=');

	log(input);
	var key = "OBSNINJAFORLIFE";
	var encrypted = CryptoJS.AES.encrypt(input, key);
	var output = "https://invite.cam/" + encrypted.toString();
	return output;
}

document.addEventListener("visibilitychange", function() {
	log(document.hidden, document.visibilityState);
	if ((iOS) || (iPad)) { // fixes a bug on iOS devices.  Not need with other devices?
		if (document.visibilityState === 'visible') {
			setTimeout(function() {
				resetupAudioOut();
			}, 500);
		}
	}
});

try {
	navigator.mediaDevices.ondevicechange = reconnectDevices;
} catch (e) {
	errorlog(e);
}


function updateConnectionStatus() {
	warnlog("Connection type changed from " + session.stats.network_type + " to " + Connection.effectiveType);
	session.stats.network_type = Connection.effectiveType + " / " + Connection.type;
	session.ping();
}

try {
	var Connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
	session.stats.network_type = Connection.effectiveType + " / " + Connection.type;
	Connection.addEventListener('change', updateConnectionStatus);
} catch (e) {}



var beforeScreenShare = null; // video
var screenShareAudioTrack = null;
async function toggleScreenShare(reload = false) { ////////////////////////////

	if (reload) {
		await grabScreen(quality = 0, audio = true, videoOnEnd = true).then(res => {
			if (res != false) {
				session.screenShareState = true;
				getById("screensharebutton").classList.add("float2");
				getById("screensharebutton").classList.remove("float");
				enumerateDevices().then(gotDevices2).then(function() {});
			}

		});
		return;
	}


	if (session.screenShareState == false) { // adding a screen

		await grabScreen(quality = 0, audio = true, videoOnEnd = true).then(res => {
			if (res != false) {
				session.screenShareState = true;
				getById("screensharebutton").classList.add("float2");
				getById("screensharebutton").classList.remove("float");
				enumerateDevices().then(gotDevices2).then(function() {});
			}

		});

	} else { // removing a screen  . session.screenShareState already true true  /////////////////////////////////


		session.screenShareState = false;
		pokeIframeAPI("screen-share-ended");

		if (beforeScreenShare) {

			session.streamSrc.getAudioTracks().forEach(function(track) { // previous video track; saving it. Must remove the track at some point.
				if (screenShareAudioTrack == track) { // since there are more than one audio track, lets see if we can remove JUST the audio track for the screen share.
					session.streamSrc.removeTrack(track);
					//session.videoElement.srcObject = outboundAudioPipeline(session.streamSrc);
					track.stop();
				}
			});
			session.streamSrc.getVideoTracks().forEach(function(track) {
				//errorlog(track);
				session.streamSrc.removeTrack(track);
				track.stop();
			});

			session.videoElement.srcObject.getVideoTracks().forEach(function(track) {
				//errorlog(track);
				session.videoElement.srcObject.removeTrack(track);
				track.stop();
			});

			getById("screensharebutton").classList.add("float");
			getById("screensharebutton").classList.remove("float2");

			session.streamSrc.addTrack(beforeScreenShare); // add back in the video track we had before we started screen sharing.  It should be NULL if we changed the video track else where (such as via the settings). #TODO:
			session.videoElement.srcObject.addTrack(beforeScreenShare);

			toggleVideoMute(true);
			for (UUID in session.pcs) {
				try {
					if ((session.pcs[UUID].guest == true) && (session.roombitrate === 0)) {
						log("room rate restriction detected. No videos will be published to other guests");
					} else if (session.pcs[UUID].allowVideo == true) { // allow 
						var senders = session.pcs[UUID].getSenders(); // for any connected peer, update the video they have if connected with a video already.
						var added = false;
						senders.forEach((sender) => { // I suppose there could be a race condition between negotiating and updating this. if joining at the same time as changnig streams?
							if (sender.track) {
								if (sender.track && sender.track.kind == "video") {
									sender.replaceTrack(beforeScreenShare); // replace may not be supported by all browsers.  eek.
									sender.track.enabled = true;
									added = true;
								}
							}
						});
						if (added == false) {
							session.pcs[UUID].addTrack(beforeScreenShare, stream);
						}
					}
				} catch (e) {
					errorlog(e);
				}
			}
			session.refreshScale();
			beforeScreenShare = null;
		}
		toggleSettings(forceShow = true);
		//enumerateDevices().then(gotDevices2).then(function(){
		//grabVideo();
		//grabAudio();
		//	toggleSettings(forceShow=true);
		//});


	}
}
var ElectronDesktopCapture = false;
if (navigator.userAgent.toLowerCase().indexOf(' electron/') > -1) {  // this enables Screen Capture in Electron
	try{
		const { desktopCapturer} = require('electron');  // This is definitely Electron specific. Requires Node Integration to be on, which is a potential security hazzard
		window.navigator.mediaDevices.getDisplayMedia = () => {
		  return new Promise(async (resolve, reject) => {
			try {
			  const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });

			  const selectionElem = document.createElement('div');
			  selectionElem.classList = 'desktop-capturer-selection';
			  selectionElem.innerHTML = `
				<div class="desktop-capturer-selection__scroller">
				  <ul class="desktop-capturer-selection__list">
					${sources.map(({id, name, thumbnail, display_id, appIcon}) => `
					  <li class="desktop-capturer-selection__item">
						<button class="desktop-capturer-selection__btn" data-id="${id}" title="${name}">
						  <img class="desktop-capturer-selection__thumbnail" src="${thumbnail.toDataURL()}" />
						  <span class="desktop-capturer-selection__name">${name}</span>
						</button>
					  </li>
					`).join('')}
					<button id="cancelscreenshare">CANCEL<br />SCREEN SHARE<br />SELECTION</button>
				  </ul>
				</div>
			  `;
			  document.body.appendChild(selectionElem);

			  document.getElementById('cancelscreenshare').addEventListener('click', async () => {
				   selectionElem.remove()
				   reject(err)
			  });
			  

			  document.querySelectorAll('.desktop-capturer-selection__btn').forEach(button => {
				  button.addEventListener('click', async () => {
					try {
					  const id = button.getAttribute('data-id')
					  const source = sources.find(source => source.id === id)
					  if(!source) {
						throw new Error(`Source with id ${id} does not exist`)
					  }
					  
					  const stream = await window.navigator.mediaDevices.getUserMedia({
						audio: false,
						video: {
						  mandatory: {
							chromeMediaSource: 'desktop',
							chromeMediaSourceId: source.id
						  }
						}
					  })
					  resolve(stream)

					  selectionElem.remove()
					} catch (err) {
					  errorlog('Error selecting desktop capture source:', err)
					  reject(err)
					}
				  })
				});
			} catch (err) {
			  errorlog('Error displaying desktop capture sources:', err);
			  reject(err);
			}
		  })
		}
		ElectronDesktopCapture = true;
	} catch(e){
		warnlog("couldn't load electron's screen capture; you might need to decrease security permissions a bit.");
	}
}

async function grabScreen(quality = 0, audio = true, videoOnEnd = false) {
	if (!navigator.mediaDevices.getDisplayMedia) {
		if (!(session.cleanOutput)) {
			setTimeout(function() {
				warnUser("Sorry, your browser is not supported. Please use the desktop versions of Firefox or Chrome instead");
			}, 1);
		}
		return false;
	}
	
	if (navigator.userAgent.toLowerCase().indexOf(' electron/') > -1) {
		if (!ElectronDesktopCapture){
			if (!(session.cleanOutput)) {
				warnUser("The Electron Capture app does not support Screen Capture.");
			}
			warnlog("Electron doesn't support screen capture");
			return false;
		}
	}

	if (quality == 0) { // I'm going to go with default quality in most cases, as I assume Dynamic screenshare is going to want low-fps / high def.
		var width = {
			ideal: 1920
		};
		var height = {
			ideal: 1080
		};
	} else if (quality == 1) {
		var width = {
			ideal: 1280
		};
		var height = {
			ideal: 720
		};
	} else if (quality == 2) {
		var width = {
			ideal: 640
		};
		var height = {
			ideal: 360
		};
	} else if (quality >= 3) { // lowest
		var width = {
			ideal: 320
		};
		var height = {
			ideal: 180
		};
	}

	if (session.width) {
		width = {
			ideal: session.width
		};
	}
	if (session.height) {
		height = {
			ideal: session.height
		};
	}

	var constraints = { // this part is a bit annoying. Do I use the same settings?  I can add custom setting controls here later
		audio: {
			echoCancellation: false, // For screen sharing, we want it off by default.
			autoGainControl: false
			, noiseSuppression: false
		}
		, video: {
			width: width
			, height: height
		}
		//,cursor: {exact: "none"}
	};
	
	try {
		let supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
		if (supportedConstraints.cursor) {
			constraints.video.cursor = "never";
		}
	} catch(e){
		warnlog("navigator.mediaDevices.getSupportedConstraints() not supported");
	}

	if (session.echoCancellation === true) {
		constraints.audio.echoCancellation = true;
	}
	if (session.autoGainControl === true) {
		constraints.audio.autoGainControl = true;
	}
	if (session.noiseSuppression === true) {
		constraints.audio.noiseSuppression = true;
	}
	if (audio == false) {
		constraints.audio = false;
	}

	if (session.framerate) {
		constraints.video.frameRate = session.framerate;
	} else if (session.maxframerate !== false){ // not limiting screen share's fps with quality=2 due to gaming centric nature
		constraints.video.frameRate = {
			ideal: session.maxframerate,
			max: session.maxframerate
		};
	}

	return navigator.mediaDevices.getDisplayMedia(constraints).then(function(stream) {
		log("adding video tracks 2245");

		var eleName = "videosource";
		try {
			if (session.streamSrc) {
				session.streamSrc.getVideoTracks().forEach(function(track) {
					//track.stop();
					beforeScreenShare = track;
					session.streamSrc.removeTrack(track);
					log("stopping video track");
				});
				session.videoElement.srcObject.getVideoTracks().forEach(function(track) {
					//track.stop();
					session.videoElement.srcObject.removeTrack(track);
					log("stopping video track 2");
				});
			} else {
				session.streamSrc = new MediaStream();
				session.videoElement.srcObject = session.streamSrc;
				log("CREATE NEW STREAM");
			}
		} catch (e) {
			errorlog(e);
		}
		//session.videoElement.srcObject = session.streamSrc;

		//  Let's not pass the AUDIO thru the webaudio filter. It's screen share after all.

		try {
			stream.getVideoTracks()[0].onended = function() { // if screen share stops, 

				session.streamSrc.getVideoTracks().forEach(function(track) {
					session.streamSrc.removeTrack(track);
					track.stop();
					log("stopping video track 3");
				});
				session.videoElement.srcObject.getVideoTracks().forEach(function(track) {
					session.videoElement.srcObject.removeTrack(track);
					track.stop();
					log("stopping video track 4");
				});

				session.screenShareState = false;
				pokeIframeAPI("screen-share-ended");

				getById("screensharebutton").classList.add("float");
				getById("screensharebutton").classList.remove("float2");

				if (videoOnEnd == true) {
					//activatedPreview = false;

					if (beforeScreenShare) {
						session.streamSrc.addTrack(beforeScreenShare);
						session.videoElement.srcObject.addTrack(beforeScreenShare);
						if (beforeScreenShare.kind == "video") {
							toggleVideoMute(true);
							for (UUID in session.pcs) {
								try {
									if ((session.pcs[UUID].guest == true) && (session.roombitrate === 0)) {
										log("room rate restriction detected. No videos will be published to other guests");
									} else if (session.pcs[UUID].allowVideo == true) { // allow 
										var senders = session.pcs[UUID].getSenders(); // for any connected peer, update the video they have if connected with a video already.
										var added = false;
										senders.forEach((sender) => { // I suppose there could be a race condition between negotiating and updating this. if joining at the same time as changnig streams?
											if (sender.track) {
												if (sender.track && sender.track.kind == "video") {
													sender.replaceTrack(beforeScreenShare); // replace may not be supported by all browsers.  eek.
													sender.track.enabled = true;
													added = true;
												}
											}
										});
										if (added == false) {
											session.pcs[UUID].addTrack(beforeScreenShare, stream);
										}
									}
								} catch (e) {
									errorlog(e);
								}
							}
							session.refreshScale();
						}
						beforeScreenShare = null;
					}

					toggleSettings(forceShow = true);
					//grabVideo(eleName='videosource', selector="select#videoSource3");  


				} else {
					grabScreen();
				}
			};
		} catch (e) {
			log("No Video selected; screensharing?");
		}

		stream.getTracks().forEach(function(track) {
			addScreenDevices(track);

			session.streamSrc.addTrack(track, stream); // Lets not add the audio to this preview; echo can be annoying
			//session.videoElement.srcObject = outboundAudioPipeline(session.streamSrc); // TODO; this should probably be added.
			session.videoElement.srcObject.addTrack(track, stream); //  I should probably add the remote control to his ; #TODO: 

			if (track.kind == "video") {
				toggleVideoMute(true);
				for (UUID in session.pcs) {
					try {
						if ((session.pcs[UUID].guest == true) && (session.roombitrate === 0)) {
							log("room rate restriction detected. No videos will be published to other guests");
						} else if (session.pcs[UUID].allowVideo == true) { // allow 
							var senders = session.pcs[UUID].getSenders(); // for any connected peer, update the video they have if connected with a video already.
							var added = false;
							senders.forEach((sender) => { // I suppose there could be a race condition between negotiating and updating this. if joining at the same time as changnig streams?
								if (sender.track) {
									if (sender.track && sender.track.kind == "video") {
										sender.replaceTrack(track); // replace may not be supported by all browsers.  eek.
										sender.track.enabled = true;
										added = true;
									}
								}
							});
							if (added == false) {
								session.pcs[UUID].addTrack(track, stream);
							}
						}
					} catch (e) {
						errorlog(e);
					}
				}
				session.refreshScale();
			} else {
				toggleMute(true); // I might want to move this outside the loop, but whatever
				for (UUID in session.pcs) {
					try {
						if (session.pcs[UUID].allowAudio == true) {
							session.pcs[UUID].addTrack(track, stream); // If screen sharing, we will add audio; not replace. 
						}
					} catch (e) {
						errorlog(log);
					}
				}
				screenShareAudioTrack = track;
			}
		});
		applyMirror(true, eleName);
		return true;
	}).catch(function(err) {
		errorlog(err);
		if ((err.name == "NotAllowedError") || (err.name == "PermissionDeniedError")) {
			// User Stopped it.
		} else {
			if (audio == true) {
				setTimeout(function() {
					grabScreen(quality, false);
				}, 1);
			}
			if (!(session.cleanOutput)) {
				setTimeout(function() {
					warnUser(err);
				}, 1); // TypeError: Failed to execute 'getDisplayMedia' on 'MediaDevices': Audio capture is not supported
			}
		}
		return false;
	});
}


var getUserMediaRequestID = 0;
var grabVideoUserMediaTimeout = null;
var grabVideoTimer = null;

async function grabVideo(quality = 0, eleName = 'previewWebcam', selector = "select#videoSourceSelect") {
	if (activatedPreview == true) {
		log("activated preview return 2");
		return;
	}
	activatedPreview = true;
	log("Grabbing video: " + quality);
	if (grabVideoTimer) {
		clearTimeout(grabVideoTimer);
	}
	log("element:" + eleName);

	var wasDisabled = true;
	try {
		if (session.streamSrc) {
			
			if (session.canvasSource){
				session.canvasSource.srcObject.getTracks().forEach(function(trk) {
					session.canvasSource.srcObject.removeTrack(trk);
					wasDisabled=false;
				});
			}
			
			if (session.videoElement.srcObject) {
				session.videoElement.srcObject.getVideoTracks().forEach(function(track) {
					session.videoElement.srcObject.removeTrack(track);
					session.videoElement.load();
					wasDisabled=false;
				});
			}
			session.streamSrc.getVideoTracks().forEach(function(track) {
				session.streamSrc.removeTrack(track);
				track.stop();
				log("track removed");
				wasDisabled=false;
			});
			
		} else {
			//log(session.videoElement.srcObject.getTracks());
			session.streamSrc = new MediaStream();
			session.videoElement.srcObject = session.streamSrc;
			log("CREATE NEW STREAM");
		}
	} catch (e) {
		errorlog(e);
	}

	session.videoElement.controls = false;

	log("selector: " + selector);
	var videoSelect = document.querySelector(selector);  // document.querySelector("videoSource3").value == "ZZZ"
	log(videoSelect);
	var mirror = false;

	if (videoSelect.value == "ZZZ") { // if there is no video, or if manually set to audio ready, then do this step.
		warnlog("ZZZ SET - so no VIDEO");
		if (eleName == "previewWebcam") {
			if (session.autostart) {
				publishWebcam(); // no need to mirror as there is no video...
				return;
			} else {
				log("4462");
				updateStats();
				var gowebcam = getById("gowebcam");
				if (gowebcam) {
					gowebcam.disabled = false;
					gowebcam.dataset.ready = "true";
					gowebcam.innerHTML = "START";
					miniTranslate(gowebcam, "start");
				}
			}
		} else { // If they disabled the video but not in preview mode; but actualy live. We will want to remove the stream from the publishing
			// we don't want to do this otherwise, as we are "replacing" the track in other cases.
			// this does cause a problem, as previous bitrate settings & resolutions might not be applied if switched back....  must test
			for (UUID in session.pcs) {
				var senders = session.pcs[UUID].getSenders(); // for any connected peer, update the video they have if connected with a video already.
				senders.forEach((sender) => { // I suppose there could be a race condition between negotiating and updating this. if joining at the same time as changnig streams?
					if (sender.track && sender.track.kind == "video") {
						sender.track.enabled = false;
						getById("mutevideobutton").classList.add("advanced"); // hide the mute button, so they can't unmute while no video.
						//session.pcs[UUID].removeTrack(sender);  // replace may not be supported by all browsers.  eek.
						errorlog("DELETED SENDER");
					}
				});

			}
			var msg = {};
			msg.videoMuted = true;
			session.sendMessage(msg);
		}
		// end
	} else {
		var sq = 0;
		if (session.quality === false) {
			sq = session.quality_wb;
		} else if (session.quality > 2) { // 1080, 720, and 360p 
			sq = 2; // hacking my own code. TODO: ugly, so I need to revisit this. 
		} else {
			sq = session.quality;
		}

		if (session.director && (quality !== false)){ // URL-based quality won't matter if DIRECTOR; 
			// quality = quality; 
		} else if ((quality === false) || (quality < sq)) {
			quality = sq; // override the user's setting
		}


		if ((iOS) || (iPad)) { // iOS will not work correctly at 1080p; likely a h264 codec issue.
			if (quality == 0) {
				quality = 1;
			}
		}

		var constraints = {
			audio: false,
			video: getUserMediaVideoParams(quality, iOS)
		};

		log("Quality selected:" + quality);
		var _, sUsrAg = navigator.userAgent;


		if ((iOS) || (iPad)) {
			constraints.video.deviceId = {
				exact: videoSelect.value
			}; // iPhone 6s compatible ? Needs to be exact for iPhone 6s

		} else if (sUsrAg.indexOf("Firefox") > -1) {
			constraints.video.deviceId = {
				exact: videoSelect.value
			}; // Firefox is a dick. Needs it to be exact.

		} else if (videoSelect.options[videoSelect.selectedIndex].text.includes("NDI Video")) { // NDI does not like "EXACT"
			constraints.video.deviceId = videoSelect.value;

		} else {
			constraints.video.deviceId = {
				exact: videoSelect.value
			}; //  Default. Should work for Logitech, etc.  
		}

		if (session.width) {
			constraints.video.width = {
				exact: session.width
			}; // manually specified - so must be exact
		}
		if (session.height) {
			constraints.video.height = {
				exact: session.height
			};
		}
		if (session.framerate) {
			constraints.video.frameRate = {
				exact: session.framerate
			};
		} else if (session.maxframerate != false){
			constraints.video.frameRate = {
				ideal: session.maxframerate,
				max: session.maxframerate
			};
		}
		if (session.ptz){
			if (constraints.video && constraints.video!==true){
				if (getChromeVersion() && getChromeVersion()>80){
					constraints.video.pan=true;
					constraints.video.tilt=true;
					constraints.video.zoom=true;
				}
			}
		}
		var obscam = false;
		log(videoSelect.options[videoSelect.selectedIndex].text);
		if (videoSelect.options[videoSelect.selectedIndex].text.startsWith("OBS-Camera")) { // OBS Virtualcam
			mirror = true;
			obscam = true;
		} else if (videoSelect.options[videoSelect.selectedIndex].text.startsWith("OBS Virtual Camera")) { // OBS Virtualcam
			mirror = true;
			obscam = true;
		} else if (videoSelect.options[videoSelect.selectedIndex].text.includes(" back")) { // Android
			mirror = true;
		} else if (videoSelect.options[videoSelect.selectedIndex].text.includes(" rear")) { // Android
			mirror = true;
		} else if (videoSelect.options[videoSelect.selectedIndex].text.includes("NDI Video")) { // NDI Virtualcam 
			mirror = true;
		} else if (videoSelect.options[videoSelect.selectedIndex].text.startsWith("Back Camera")) { // iPhone and iOS
			mirror = true;
		} else {
			mirror = false;
		}
		session.mirrorExclude = mirror;

		log(constraints);
		clearTimeout(grabVideoUserMediaTimeout);
		getUserMediaRequestID += 1;
		grabVideoUserMediaTimeout = setTimeout(function(gumID) {
			navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {

				if (getUserMediaRequestID !== gumID) {
					errorlog("GET USER MEDIA CALL HAS EXPIRED");
					return;
				}
				log("adding video tracks 2412");
				stream.getVideoTracks().forEach(function(track) {
					if (!session.streamSrc) {
						session.streamSrc = new MediaStream();
					}
					if (!session.videoElement) {
						if (document.getElementById("previewWebcam")) {
							session.videoElement = document.getElementById("previewWebcam");
						} else if (document.getElementById("videosource")) {
							session.videoElement = document.getElementById("videosource");
						}
						
					}

					if (session.effects) {
						track = applyEffects(track,stream);
					} else {
						log(session.videoElement);
						session.streamSrc.addTrack(track, stream); // add video track to the preview video
						session.videoElement.srcObject.addTrack(track, stream); // add video track to the preview video
						//session.videoElement.srcObject = outboundAudioPipeline(session.streamSrc); // WE DONT DO THIS UNLESS ADDING A NEW AUDIO TRACK ANDDDDD ARE PREPARED TO SETUP AUDIO RE_SENDERS
					}

					toggleVideoMute(true);
					for (UUID in session.pcs) {
						try {
							if (((iOS) || (iPad)) && (session.pcs[UUID].guest == true)) {
								warnlog("iOS and GUest detected");
							} else if ((session.pcs[UUID].guest == true) && (session.roombitrate === 0)) {
								log("room rate restriction detected. No videos will be published to other guests");
							} else if (session.pcs[UUID].allowVideo == true) { // allow 

								// for any connected peer, update the video they have if connected with a video already.
								var added = false;
								session.pcs[UUID].getSenders().forEach((sender) => { // I suppose there could be a race condition between negotiating and updating this. if joining at the same time as changnig streams?

									if (sender.track && sender.track.kind == "video") {
										sender.replaceTrack(track); // replace may not be supported by all browsers.  eek.
										sender.track.enabled = true;
										added = true;
									}

								});
								if (added == false) {
									session.pcs[UUID].addTrack(track, stream); // can't replace, so adding
								}
							}

						} catch (e) {
							errorlog(e);
						}
					}
					
					if (wasDisabled && !session.videoMuted){
						var msg = {};
						msg.videoMuted = session.videoMuted;
						session.sendMessage(msg);
					}
					
					session.refreshScale(); 
				});

				applyMirror(mirror, eleName);

				if (eleName == "previewWebcam") {
					if (session.autostart) {
						publishWebcam();
					} else {
						log("4620");
						if (document.getElementById("gear_webcam")) {
							updateStats(obscam);
						}
						var gowebcam = getById("gowebcam");
						if (gowebcam) {
							gowebcam.disabled = false;
							gowebcam.dataset.ready = "true";
							gowebcam.innerHTML = "START";
							miniTranslate(gowebcam, "start");
						}
					}
				} else if (getById("gear_webcam3").style.display === "inline-block") {
					updateStats(obscam);
				}

				// Once crbug.com/711524 is fixed, we won't need to wait anymore. This is
				// currently needed because capabilities can only be retrieved after the
				// device starts streaming. This happens after and asynchronously w.r.t.
				// getUserMedia() returns.
				if (grabVideoTimer) {
					clearTimeout(grabVideoTimer);
					if (eleName == "previewWebcam") {
						session.videoElement.controls = true;
					}
				}
				if (getById("popupSelector_constraints_video")) {
					getById("popupSelector_constraints_video").innerHTML = "";
				}
				if (getById("popupSelector_constraints_audio")) {
					getById("popupSelector_constraints_audio").innerHTML = "";
				}
				if (getById("popupSelector_constraints_loading")) {
					getById("popupSelector_constraints_loading").style.display = "";
				}

				grabVideoTimer = setTimeout(function() {
					if (getById("popupSelector_constraints_loading")) {
						getById("popupSelector_constraints_loading").style.display = "none";
					}
					if (eleName == "previewWebcam") {
						session.videoElement.controls = true;
					} else {
						updateConstraintSliders();
					}

					dragElement(session.videoElement);
				}, 1000); // focus

				makeImages(true); 

				log("DONE - found stream");
			}).catch(function(e) {
				activatedPreview = false;
				errorlog(e);
				if (e.name === "OverconstrainedError") {
					errorlog(e.message);
					log("Resolution or framerate didn't work");
				} else if (e.name === "NotReadableError") {
					if (quality <= 10) {
						grabVideo(quality + 1, eleName, selector);
					} else {
						if (!(session.cleanOutput)) {
							if (iOS) {
								warnUser("An error occured. Closing existing tabs in Safari may solve this issue.");
							} else {
								warnUser("Error: Could not start video source.\n\nTypically this means the Camera is already be in use elsewhere. Most webcams can only be accessed by one program at a time.\n\nTry a different camera or perhaps try re-plugging in the device.");
							}
						}
						activatedPreview = true;
						if (getById('gowebcam')) {
							getById('gowebcam').innerHTML = "Problem with Camera";
						}

					}
					return;
				} else if (e.name === "NavigatorUserMediaError") {
					if (getById('gowebcam')) {
						getById('gowebcam').innerHTML = "Problem with Camera";
					}
					if (!(session.cleanOutput)) {
						warnUser("Unknown error: 'NavigatorUserMediaError'");
					}
					return;
				} else if (e.name === "timedOut") {
					activatedPreview = true;
					if (getById('gowebcam')) {
						getById('gowebcam').innerHTML = "Problem with Camera";
					}
					if (!(session.cleanOutput)) {
						warnUser(e.message);
					}
					return;
				} else {
					errorlog("An unknown camera error occured");
				}

				if (quality <= 10) {
					grabVideo(quality + 1, eleName, selector);
				} else {
					errorlog("********Camera failed to work");
					activatedPreview = true;
					if (getById('gowebcam')) {
						getById('gowebcam').innerHTML = "Problem with Camera";
					}
					if (!(session.cleanOutput)) {
						if (session.width || session.height || session.framerate) {
							warnUser("<i class='las la-exclamation-circle'></i> Camera failed to load.\n\nPlease ensure your camera supports the resolution and framerate that has been manually specified. Perhaps use &quality=0 instead.");
						} else {
							warnUser("<i class='las la-exclamation-circle'></i> Camera failed to load.\n\nPlease make sure it is not already in use by another application.\n\nPlease make sure you have accepted the camera permissions.");
						}
					}
				}
			});
		}, 100, getUserMediaRequestID);
	}
}


async function grabAudio(eleName = "previewWebcam", selector = "#audioSource", trackid = null, override = false) { // trackid is the excluded track
	if (activatedPreview == true) {
		log("activated preview return 2");
		return;
	}
	activatedPreview = true;
	warnlog("GRABBING AUDIO");
	log("TRACK EXCLUDED:" + trackid);


	try {
		if (session.videoElement.srcObject) {
			var audioSelect = document.querySelector(selector).querySelectorAll("input");
			var audioExcludeList = [];
			for (var i = 0; i < audioSelect.length; i++) {
				try {
					if ("screen" == audioSelect[i].dataset.type) { // skip already excluded ---------- !!!!!!  DOES THIS MAKE SENSE? TODO: CHECK
						if (audioSelect[i].checked) {
							audioExcludeList.push(audioSelect[i]);
						}
					}
				} catch (e) {
					errorlog(e);
				}
			}

			session.videoElement.srcObject.getAudioTracks().forEach(function(track) {
				for (var i = 0; i < audioExcludeList.length; i++) {
					try {
						if (audioExcludeList[i].label == track.label) {
							warnlog("DONE");
							return;
						}
					} catch (e) {}
				}
				if (trackid && (track.id == trackid)) {
					warnlog("SKIPPED EXCLUDED TRACK?");
					return;
				}
				session.videoElement.srcObject.removeTrack(track);
				track.stop();
			});

			session.streamSrc.getAudioTracks().forEach(function(track) {
				for (var i = 0; i < audioExcludeList.length; i++) {
					try {
						if (audioExcludeList[i].label == track.label) {
							warnlog("EXCLUDING TRACK; PROBABLY SCREEN SHARE");
							return;
						}
					} catch (e) {}
				}
				if (trackid && (track.id == trackid)) {
					warnlog("SKIPPED EXCLUDED TRACK?");
					return;
				}
				session.streamSrc.removeTrack(track);
				track.stop();
			});


		} else { // if no stream exists
			session.streamSrc = new MediaStream();
			session.videoElement.srcObject = session.streamSrc;
			log("CREATE NEW SOURCE FOR AUDIO");
		}
	} catch (e) {
		errorlog(e);
	}

	var streams = await getAudioOnly(selector, trackid, override); // Get audio streams
	warnlog(streams);
	try {
		for (var i = 0; i < streams.length; i++) {
			streams[i].getAudioTracks().forEach(function(track) {
				session.streamSrc.addTrack(track, streams[i]); // add video track to the preview video
			});
		}

		session.videoElement.srcObject = outboundAudioPipeline(session.streamSrc);

		toggleMute(true);
		if (session.videoElement.srcObject.getAudioTracks()) {

			for (UUID in session.pcs) {
				if (session.pcs[UUID].allowAudio == true) {
					var tracks = session.videoElement.srcObject.getAudioTracks();

					session.pcs[UUID].getSenders().forEach((sender) => {
						var good = false;
						if (sender.track && sender.track.id && (sender.track.kind == "audio")) {
							tracks.forEach(function(track) {
								if (track.id == sender.track.id) {
									good = true;
								}
							});
						} else { // video or something else; ignore it.
							return;
						}
						if (good) {
							return;
						}
						sender.track.enabled = false;
						//session.pcs[UUID].removeTrack(sender); //  Apparently removeTrack causes renogiation; also kills send/recv.
					});

					if (tracks.length) {
						tracks.forEach(function(track) {
							var matched = false;
							session.pcs[UUID].getSenders().forEach((sender) => {
								if (sender.track && sender.track.id && (sender.track.kind !== "video")) {
									warnlog(sender.track.id + " " + track.id);
									if (sender.track.id == track.id) {
										warnlog("MATCHED 1");
										matched = true;
									}
								}
							});
							if (matched) {
								return;
							}
							var added = false;
							session.pcs[UUID].getSenders().forEach((sender) => {
								if (added) {
									return;
								}
								if (sender.track && (sender.track.enabled == false)) {
									sender.replaceTrack(track);
									sender.track.enabled = true;
									added = true;
									warnlog("ADDED 2");
								}
							});
							if (added) {
								return;
							}
							var sender = session.pcs[UUID].addTrack(track, session.videoElement.srcObject);
						});
					} else {
						session.pcs[UUID].getSenders().forEach((sender) => {
							if (sender.track && sender.track.kind == "audio") {
								sender.track.enabled = false; // (trying this instead)
								//session.pcs[UUID].removeTrack(sender); //  Apparently removeTrack causes renogiation; also kills send/recv.
							}
						});
					}

				}
			}
		}
	} catch (e) {
		errorlog(e);
	}
	var gowebcam = getById("gowebcam");
	if (gowebcam) {
		gowebcam.disabled = false;
		gowebcam.dataset.ready = "true";
		gowebcam.innerHTML = "START";
		miniTranslate(gowebcam, "start");
	}
}


// WEBCAM
session.publishDirector =  async function(clean, vdevice=false, adevice=true){ //  stream is used to generated an SDP
	log("DIRECTOR STREAM SETUP");
	
	if (getById("press2talk").dataset.enabled){log("already enabled");return;}
	getById("press2talk").dataset.enabled = 1;
	
	if (session.streamSrc){
		//if (!session.streamSrc){
		//	session.streamSrc = new MediaStream();
		//}
		if (document.getElementById("videosource")){
			var v = document.getElementById("videosource");
			v.muted = true;
			v.autoplay = true;
			v.controls = false;
			v.setAttribute("playsinline","");
			session.videoElement = v;
		} else if (session.videoElement){
			var v = session.videoElement;
			v.muted = true;
			v.autoplay = true;
			v.controls = false;
			v.setAttribute("playsinline","");
			getById("miniPerformer").appendChild(v);
		} else {
			var v = document.createElement("video");
			session.videoElement = v;
			v.muted = true;
			v.autoplay = true;
			v.controls = false;
			v.setAttribute("playsinline","");
			getById("miniPerformer").appendChild(v);
		}
		
		if (session.streamID){
			session.videoElement.dataset.sid = session.streamID;
		}
		
		v.title = "This is the mini-preview of the Director's audio and video output.  The director cannot be muted by guest and does not show up in scenes.";
		getById("press2talk").innerHTML = "";
		getById("press2talk").outerHTML = "";
		
		session.muted = false;
		toggleMute(true);
		getById("screensharebutton").classList.remove("advanced");
		getById("hangupbutton2").classList.remove("advanced");
		
		v.muted = true;
		v.autoplay = true;
		v.controls = false;
		v.setAttribute("playsinline","");
		v.srcObject = session.streamSrc; // blank, no worries.
		
		if (session.screenShareState) {
			log("can't refresh a screenshare");
			getById("screensharebutton").classList.add("float2");
			getById("screensharebutton").classList.remove("float");
			session.screenShareState = false;
		}
		
		activatedPreview = false;
		await grabAudio("videosource", "#audioSource3");
		
		
		enumerateDevices().then(gotDevices2).then(function() {
			activatedPreview = false;
			grabVideo(session.quality, "videosource", "select#videoSource3");
		});
			
		toggleSettings(true);
		
		var msg = {};
		msg.videoMuted = session.videoMuted;
		session.sendMessage(msg);
		
		return;
	}
	
	
	var title = "Director";
	var v = document.createElement("video");
	session.videoElement = v;
	if (session.streamID){
		session.videoElement.dataset.sid = session.streamID;
	}
	v.id = "videosource"; // could be set to UUID in the future
	v.muted = true;
	v.autoplay = true;
	v.controls = false;
	v.setAttribute("playsinline","");
								
	session.streamSrc = new MediaStream();
	//v.srcObject = outboundAudioPipeline(session.streamSrc);
	v.srcObject = session.streamSrc; // blank, no worries. we dont need outbound.
	
	//createDirectorCam(v,clean);
	
	var constraints = {audio: adevice, video: vdevice};
	
	if (session.audioInputChannels){
		if (constraints.audio === true){
			constraints.audio = {};
			constraints.audio.channelCount = session.audioInputChannels;
		} else if (constraints.audio){
			constraints.audio.channelCount = session.audioInputChannels;
		}
	}
	
	//if (session.echoCancellation===false){
	if (constraints.audio === true){
		constraints.audio = {};
	}
	if (constraints.audio){
		if (session.echoCancellation===false || session.autoGainControl===false || session.noiseSuppression===false){
			if (session.echoCancellation===false){
				constraints.audio.echoCancellation=false;
			} else {
				constraints.audio.echoCancellation=true;
			}
			if (session.autoGainControl===false){
				constraints.audio.autoGainControl=false;
			} else {
				constraints.audio.autoGainControl=true;
			}
			if (session.noiseSuppression===false){
				constraints.audio.noiseSuppression=false;
			} else {
				constraints.audio.noiseSuppression=true;
			}
		}
	}
	
	//if (session.quality===false){
	//	if (session.quality_wb===false){
	//		session.quality_wb=1;
	//	}
	//}
	if (session.quality!==false){
		var quality = parseInt(session.quality) || 0;
		if (quality>2){quality=2;} else if (quality<0){quality = 0;}
		getById("webcamquality3").elements.namedItem("resolution").value = quality;
	}
	
	getById("gear_webcam3").style.display = "inline-block";
	
	getById("webcamquality3").onchange = function(event) {
		if (parseInt(getById("webcamquality3").elements.namedItem("resolution").value) == 2) {
			if (session.maxframerate===false){
				session.maxframerate = 30;
				session.maxframerate_q2 = true;
			} 
		} else if (session.maxframerate_q2){
			session.maxframerate = false;
			session.maxframerate_q2 = false;
		}
		activatedPreview = false;
		session.quality_wb = parseInt(getById("webcamquality3").elements.namedItem("resolution").value);
		
		grabVideo(session.quality_wb, "videosource", "select#videoSource3");
	};
	
	log("constraint");
	log(constraints);
	navigator.mediaDevices.getUserMedia(constraints).then(function(stream){ // very simple.
		session.streamSrc = stream;
		v.srcObject = outboundAudioPipeline(session.streamSrc); // not blank, so now we worry
		
		for (UUID in session.pcs){
			session.initialPublish(UUID); // Start publishing!
		}
		enumerateDevices().then(gotDevices2).then(function(){});
		createDirectorCam(v, clean);
	});
	

	changeAudioOutputDevice(v);
	
	v.onpause = (event) => { // prevent things from pausing; human or other
		if (!((event.ctrlKey) || (event.metaKey) )){
			log("Video paused; auto playing");
			event.currentTarget.play().then(_ => {
				log("playing");
			}).catch(warnlog);
		}
	};
	
	v.addEventListener('click', function(e) { // show stats of video if double clicked
		log("click");
		try {
			if ((e.ctrlKey)||(e.metaKey)){
				e.preventDefault();
				
				////////////////////////	
				
				var [menu, innerMenu] = statsMenuCreator();
				
				//////////////////////////////////
				
				menu.interval = setInterval(printMyStats,3000, innerMenu);
				printMyStats(innerMenu);
				e.stopPropagation();
				
				return false;
			}
		} catch(e){errorlog(e);}
	});
	
	if (session.directorEnabledPPT){
		return;
	}
	
	if (session.videoMutedFlag){
		session.videoMuted = true;
		toggleVideoMute(true);
	}
	
	session.title=title;
	session.directorEnabledPPT = true;
	
	
	if (session.seeding){
		return;
	}
	
	session.seeding=true;
	session.seedStream();
	
};

function statsMenuCreator(){
	
	if (getById("menuStatsBox")){
		clearInterval(getById("menuStatsBox").interval);
		getById("menuStatsBox").remove();
	}
	
	var menu = document.createElement("div");
	menu.id = "menuStatsBox";
	menu.className = "debugStats remotestats";
	getById('main').appendChild(menu);
	
	menu.style.left = parseInt(Math.random()*10)+15+"px"
	menu.style.top = parseInt(Math.random()*10)+"px"
	
	menu.innerHTML="<h1 data-translate='statistics'>Statistics</h1>";
	var menuCloseBtn = document.createElement("button");
	menuCloseBtn.className="close";
	menuCloseBtn.innerHTML="×";
	menu.appendChild(menuCloseBtn);
	
	var innerMenu = document.createElement("div");
	menu.appendChild(innerMenu);
	
	menuCloseBtn.addEventListener('click', function(eve) {
		clearInterval(menu.interval);
		eve.currentTarget.parentNode.remove();
	});
	return [menu, innerMenu];
}


// WEBCAM
session.publishStream = function(v, title="Stream Sharing Session"){ //  stream is used to generated an SDP
	log("STREAM SETUP");
	
	try {
		//session.streamSrc = v.srcObject;  // this shoulnd't be needed
		v.parentNode.removeChild(v); // remove the preview video element after we switch streams to avoid bug on iOS beta 14
		v.className = "";
	} catch (e){
		errorlog(e);
		return;
	}
	
	if (session.transcript){
		setTimeout(function(){setupClosedCaptions();},0);
	}
	
	toggleMute(true);  // apply mute state
	
	if (!session.streamSrc){
		log("no stream selected");
		session.streamSrc =	new MediaStream();  // this is just for backup.
	}
	
	session.streamSrc.oninactive = function streamoninactive() {
		errorlog('Stream inactive');
		if (session.videoElement.recording){
			session.videoElement.recorder.stop();
		}
	};
	
	if (session.streamSrc.getVideoTracks().length==0){
		warnlog("NO VIDEO TRACK INCLUDED");
	}

	if (session.streamSrc.getAudioTracks().length==0){
		warnlog("NO AUDIO TRACK INCLUDED");
	}
	
	
	var container = document.createElement("div");
	container.id = "container";
	
	if (session.cleanOutput){
		container.style.height = "100%";
		v.style.maxWidth = "100%";
		v.style.boxShadow = "none";
	}
	
	container.className = "vidcon";
	getById("gridlayout").appendChild(container);
	
	v.className = "tile";
	v.muted = true;
	v.autoplay = true;
	v.controls = false;
	v.setAttribute("playsinline","");
	v.id = "videosource"; // could be set to UUID in the future
	v.oncanplay = null;
	container.appendChild(v);
	
	if (session.nopreview){
		v.style.display="none";
		container.style.display="none";
	}
	
	changeAudioOutputDevice(v);
	
	if (session.mirrored && session.flipped){
		v.style.transform = "scaleX(1) scaleY(-1) ";
	} else if (session.mirrored){
		v.style.transform = "scaleX(1) ";
	} else if (session.flipped){
		v.style.transform = "scaleY(-1) scaleX(-1)";
	} else {
		v.style.transform = "scaleX(-1) ";
	}
	
	var bigPlayButton = document.getElementById("bigPlayButton");
	if (bigPlayButton){
		bigPlayButton.parentNode.removeChild(bigPlayButton);
	}
	
	session.videoElement = v;
	
	if (session.streamID){
		session.videoElement.dataset.sid = session.streamID;
	}
	
	if (session.director){
		// audio is not mucked with
	} else if (session.scene!==false){
		setTimeout(function(){updateMixer();},1);
	} else if (session.roomid!==false){
		if (session.roomid===""){
			if (!(session.view) || (session.view==="")){
				
				
				if (session.fullscreen){
					session.windowed = false;
				} else {
					v.className = "myVideo";
					session.windowed = true;
				}
				getById("mutespeakerbutton").classList.add("advanced");
				
				applyMirror(session.mirrorExclude, 'videosource');
				
				container.style.width="100%";
				//container.style.height="100%";
				
				container.style.alignItems = "center";
				container.backgroundColor = "#666";
				
				setTimeout(function (){dragElement(v);},1000);
				play();
			} else {
				session.windowed = false;
				applyMirror(session.mirrorExclude, 'videosource');
				play();
				setTimeout(function(){updateMixer();},1);
			}
		} else {
			//session.cbr=0; // we're just going to override it
			if (session.stereo==5){ // not a scene or director, so we will assume its a guest. changing to stereo=3
				session.stereo=3;
			}
			session.windowed = false;
			applyMirror(session.mirrorExclude, 'videosource');
			
			setTimeout(function(){updateMixer();},1);
		}
	} else {
		
		
		if (session.fullscreen){
			session.windowed = false;
		} else {
			v.className = "myVideo";
			session.windowed = true;
		}
		getById("mutespeakerbutton").classList.add("advanced");
		
		applyMirror(session.mirrorExclude, 'videosource');
		
		container.style.width="100%";
		//container.style.height="100%";
		//container.style.display = "flex";
		
		container.style.alignItems = "center";
		container.backgroundColor = "#666";
		
		setTimeout(function (){dragElement(v);},1000);

	}
	
	v.onpause = (event) => { // prevent things from pausing; human or other
		if (!((event.ctrlKey) || (event.metaKey) )){
			log("Video paused; auto playing");
			event.currentTarget.play().then(_ => {
				log("playing");
			}).catch(warnlog);
		}
	};
	
	v.addEventListener('click', function(e) {
		log("click");
		try {
			if ((e.ctrlKey)||(e.metaKey)){
				e.preventDefault();
				
				var [menu, innerMenu] = statsMenuCreator();
				
				menu.interval = setInterval(printMyStats,3000, innerMenu);
				
				printMyStats(innerMenu);
				e.stopPropagation();
				return false;
			}
		} catch(e){errorlog(e);}
	});
	
	v.touchTimeOut = null;
	v.touchLastTap = 0;
	v.touchCount = 0;
	v.addEventListener('touchend', function(event) {
		log("touched");
		
		document.ontouchup = null;
		document.onmouseup = null;
		document.onmousemove = null;
		document.ontouchmove = null;
		
		var currentTime = new Date().getTime();
		var tapLength = currentTime - v.touchLastTap;
		clearTimeout(v.touchTimeOut);
		if (tapLength < 500 && tapLength > 0) {
			///
			log("double touched");
			v.touchCount+=1;
			event.preventDefault();
			if (v.touchCount<5){
				v.touchLastTap = currentTime;
				return false;
			}
			v.touchLastTap = 0;
			v.touchCount=0;
			
			var [menu, innerMenu] = statsMenuCreator();
			
			menu.interval = setInterval(printMyStats,3000, innerMenu);
			
			printMyStats(innerMenu);
			event.stopPropagation();
			return false;
			//////
		} else {
			v.touchCount=1;
			v.touchLastTap = currentTime;
			
			v.touchTimeOut = setTimeout(function(vv) {
				clearTimeout(vv.touchTimeOut);
				vv.touchLastTap = 0;
				vv.touchCount=0;
			}, 5000, v);
			
		}
		
	});
		
	try{
		var m = getById("mainmenu");
		m.remove();
	} catch (e){}
	
	var added = "";
	if (session.defaultPassword===false){
		if (session.password){
			added="&pw="+session.password;
		}
	}
	getById("reshare").href = "https://"+location.host+location.pathname+"?view="+session.streamID+added;
	getById("reshare").text = "https://"+location.host+location.pathname+"?view="+session.streamID+added;
	getById("reshare").style.width = ((getById("reshare").text.length + 1)*1.15 * 8) + 'px';
	pokeIframeAPI('started-camera');
	
	
	
	if (session.videoMutedFlag){
		session.videoMuted = true;
		toggleVideoMute(true);
	}
	
	clearInterval(session.updateLocalStatsInterval);
	session.updateLocalStatsInterval = setInterval(function(){updateLocalStats();},3000);	
	
	session.title=title;
	session.seeding=true;			
	session.seedStream();
	
};


session.publishScreen = function(constraints, title="Screen Sharing Session", audioList=[], audio=true){ // webcam stream is used to generated an SDP
	log("SCREEN SHARE SETUP");
	if (!navigator.mediaDevices.getDisplayMedia){
		setTimeout(function(){warnUser("Sorry, your browser is not supported. Please use the desktop versions of Firefox or Chrome instead");},1);
		return false;
	}
	if (navigator.userAgent.toLowerCase().indexOf(' electron/') > -1) {
		if (!ElectronDesktopCapture){
			if (!(session.cleanOutput)) {
				warnUser("The Electron Capture app does not support Screen Capture.");
			}
			warnlog("Electron doesn't support screen capture");
		return false;
		}
	}
	
	var streams = [];
	for (var i=1; i<audioList.length;i++){  // mic sources; not screen .
		if (audioList[i].selected){
			var constraint = {audio: {deviceId: {exact: audioList[i].value}}};
			
			if (session.echoCancellation===false){  // default should be ON.  we won't even add it since deviceID is specified and Browser defaults to on already
				constraint.audio.echoCancellation=false;
			} else {
				constraint.audio.echoCancellation=true;
			}
			if (session.autoGainControl===false){
				constraint.audio.autoGainControl=false;
			} else {
				constraint.audio.autoGainControl=true;
			}
			if (session.noiseSuppression===false){
				constraint.audio.noiseSuppression=false;
			} else {
				constraint.audio.noiseSuppression=true;
			}
			navigator.mediaDevices.getUserMedia(constraint).then((stream)=>{
				streams.push(stream);
			}).catch(errorlog);
		}
	}
	
	if (session.audioDevice === 0 ){
		constraints.audio = false;
	}
	
	log(constraints);
	return navigator.mediaDevices.getDisplayMedia(constraints).then(function (stream){
		 /// RETURN stream for preview? rather than jumping right in.
		session.screenShareState=true;
		try {
			stream.getVideoTracks()[0].onended = function () {
				session.screenShareState=false;
				pokeIframeAPI("screen-share-ended");
				grabScreen();
			};
		} catch(e){log("No Video selected; screensharing?");}
		
		 // OR, jump right in, and let user change from there
		if (session.roomid!==false){
			if ((session.roomid==="") && ((!(session.view)) || (session.view===""))){
				
			} else {
				getById("head3").className = 'advanced';
				
				log("ROOMID EANBLED");
				log("Update Mixer Event on REsize SET");
				window.addEventListener("resize", updateMixer);
				window.addEventListener("orientationchange", updateMixer);
				joinRoom(session.roomid);
			}
			
		} else {
			getById("head3").className = '';
			getById("logoname").style.display = 'none';
		}
		
		if (urlParams.has('permaid')){
			updateURL("permaid="+session.streamID);
		} else {
			updateURL("push="+session.streamID);
		}

		log("adding tracks");
		for (var i=0; i<streams.length;i++){
			streams[i].getAudioTracks().forEach((track)=>{
				stream.addTrack(track);
			});
		}
		streams = null;
		if (session.audioDevice !== 0){
			if (stream.getAudioTracks().length==0){
				if (!(session.cleanOutput)){
					if (navigator.userAgent.toLowerCase().indexOf(' electron/') > -1){
						// Electron has no audio.
					} else {
						setTimeout(function(){warnUser("No Audio Source was detected.\n\nIf you were wanting to capture an Application's Audio, please see:\nhttp://docs.obs.ninja/audio for an alternative method.");},300);
					}
				}
			}
		}
		
		
		
		try {
			session.streamSrc = stream;
		} catch (e){errorlog(e);}
		
		toggleMute(true);
		
		var v = document.createElement("video");
		
		session.videoElement = v;
		
		
		if (session.streamID){
			session.videoElement.dataset.sid = session.streamID;
		}


		var container = document.createElement("div");
		container.id = "container";
		
		if (session.cleanOutput){
			container.style.height = "100%";
			v.style.maxWidth = "100%";
			v.style.boxShadow = "none";
		}

		container.className = "vidcon";
		getById("gridlayout").appendChild(container);
		
		if (session.nopreview){
			v.style.display="none";
			container.style.display="none";
		}
		
		container.appendChild(v);
		
		
		v.className = "tile";
		
		changeAudioOutputDevice(v);
		
		if (session.director){
		} else if (session.scene!==false){
			setTimeout(function(){updateMixer();},1);
		} else if (session.roomid!==false){
			if (session.roomid===""){
				if (!(session.view) || (session.view==="")){
					
					if (session.fullscreen){
						session.windowed = false;
					} else {
						v.className = "myVideo";
						session.windowed = true;
					}
					getById("mutespeakerbutton").classList.add("advanced");
					
					if (session.mirrored && session.flipped){
						v.style.transform = " scaleX(-1) scaleY(-1) translate(0, 50%)";
						v.classList.add("mirrorControl");
					} else if (session.mirrored){
						v.style.transform = "scaleX(-1) translate(0, -50%)";
						v.classList.add("mirrorControl");
					} else if (session.flipped){
						v.style.transform = "scaleY(-1) translate(0, 50%)";
						v.classList.remove("mirrorControl");
					} else {
						v.style.transform = " translate(0, -50%)";
						v.classList.remove("mirrorControl");
					}
					
					container.style.width="100%";
					//container.style.height="100%";
					container.style.alignItems = "center";
					container.backgroundColor = "#666";
					
					setTimeout(function (){dragElement(v);},1000);
					play();
				} else {
					play();
					setTimeout(function(){updateMixer();},1);
				}
			} else {
				setTimeout(function(){updateMixer();},1);
			}
		} else {
			
			if (session.fullscreen){
				session.windowed = false;
			} else {
				v.className = "myVideo";
				session.windowed = true;
			}
			getById("mutespeakerbutton").classList.add("advanced");
			
			if (session.mirrored && session.flipped){
				v.style.transform = " scaleX(-1) scaleY(-1) translate(0, 50%)";
				v.classList.add("mirrorControl");
			} else if (session.mirrored){
				v.style.transform = "scaleX(-1) translate(0, -50%)";
				v.classList.add("mirrorControl");
			} else if (session.flipped){
				v.style.transform = "scaleY(-1) translate(0, 50%)";
				v.classList.remove("mirrorControl");
			} else {
				v.style.transform = " translate(0, -50%)";
				v.classList.remove("mirrorControl");
			}
			
			container.style.width="100%";
			//container.style.height="100%";
			container.style.alignItems = "center";
			container.backgroundColor = "#666";
		}

		v.autoplay = true;
		v.controls = false;
		v.setAttribute("playsinline","");
		v.muted = true;
		v.id = "videosource";
		
		//if (!v.srcObject || v.srcObject.id !== stream.id) {
		//	v.srcObject = stream;
		v.srcObject = outboundAudioPipeline(session.streamSrc);
		//}
		
		v.onpause = (event) => { // prevent things from pausing; human or other
			if (!((event.ctrlKey) || (event.metaKey) )){
				log("Video paused; auto playing");
				event.currentTarget.play().then(_ => {
					log("playing");
				}).catch(warnlog);
			}
		};
		
		v.addEventListener('click', function(e) { // show stats of video if double clicked
			log("click");
			try {
				if ((e.ctrlKey)||(e.metaKey)){
					e.preventDefault();
			
					var [menu, innerMenu] = statsMenuCreator();
					
					menu.interval = setInterval(printMyStats,3000, innerMenu);
					
					printMyStats(innerMenu);
					e.stopPropagation();
					return false;
				}
			} catch(e){errorlog(e);}
		});
		
		try{
			var m = getById("mainmenu");
			m.remove();
		} catch (e){}
		
		getById("reshare").href = "https://"+location.host+location.pathname+"?view="+session.streamID;
		getById("reshare").text = "https://"+location.host+location.pathname+"?view="+session.streamID;
		getById("reshare").style.width = ((getById("reshare").text.length + 1)*1.15 * 8) + 'px';
		
		
		if (session.videoMutedFlag){
			session.videoMuted = true;
			toggleVideoMute(true);
		}
		
		clearInterval(session.updateLocalStatsInterval);
		session.updateLocalStatsInterval = setInterval(function(){updateLocalStats();},3000);
		
		session.title=title;
		session.seeding=true;
		session.seedStream();
		
		pokeIframeAPI('started-screenshare');
		
		return true;
	}).catch(function(err){
		errorlog(err); /* handle the error */
		if (navigator.userAgent.toLowerCase().indexOf(' electron/') > -1) {
			if (!ElectronDesktopCapture){
				if (!(session.cleanOutput)) {
					warnUser("The Electron Capture app does not support Screen Capture.");
				}
				warnlog("Electron doesn't support screen capture");
				return false;
			}
		}
		if ((err.name == "NotAllowedError") || (err.name == "PermissionDeniedError")){
			// User Stopped it.
			session.screenShareState=false;
			pokeIframeAPI("screen-share-ended");
			return false;
		} else {
			if (audio==true){
				constraints.audio=false;
				if (!(session.cleanOutput)){
					setTimeout(function(){warnUser(err);},1); // TypeError: Failed to execute 'getDisplayMedia' on 'MediaDevices': Audio capture is not supported
				}
				return session.publishScreen(constraints, title, audioList, false);
			} else {
				if (!(session.cleanOutput)){
					setTimeout(function(){warnUser(err);},1); // TypeError: Failed to execute 'getDisplayMedia' on 'MediaDevices': Audio capture is not supported
				}
				return false;
			}
			
		}
	});
		
};

session.publishFile = function(ele, event, title="Video File Sharing Session"){ // webcam stream is used to generated an SDP
	log("FILE SHARE SETUP");

	if (session.transcript){
		setTimeout(function(){setupClosedCaptions();},0);
	}

	var files = [];
	for (var i = 0; i < ele.files.length; i++){ // changing from a FileList to an Array. Arrays are easier to modify later on
		files.push(ele.files[i]);
	}
	log(files);
	//var type = file.type;

	var fileURL = URL.createObjectURL(files[0]);
	var container = document.createElement("div");
	container.id = "container";
	
	
	
	container.className = "vidcon";
	var v = document.createElement("video");
	
	if (session.cleanOutput){
		container.style.height = "100%";
		v.style.maxWidth = "100%";
		v.style.boxShadow = "none";
	}
	
	if (session.streamID){
		v.dataset.sid = session.streamID;
	}
	
	getById("gridlayout").appendChild(container);
	
	if (session.roomid!==false){
		if ((session.roomid==="") && ((!(session.view)) || (session.view===""))){
			
		} else {
			log("ROOMID EANBLED");
			log("Update Mixer Event on REsize SET");
			window.addEventListener("resize", updateMixer);
			window.addEventListener("orientationchange", updateMixer);
			getById("head3").className = 'advanced';
			
			joinRoom(session.roomid);
		}
		
	} else {
		getById("head3").className = '';
		getById("logoname").style.display = 'none';
	}
	getById("head1").className = 'advanced';
	
	if (urlParams.has('permaid')){
		updateURL("permaid="+session.streamID);
	} else {
		updateURL("push="+session.streamID);
	}
	
	getById("head1").className = 'advanced';
	getById("head2").className = 'advanced';

	if (!(session.cleanOutput)){
		getById("chatbutton").className="float";
		getById("hangupbutton").className="float";
		getById("controlButtons").style.display="flex";
		getById("helpbutton").style.display = "inherit";
		getById("reportbutton").style.display = "";
	} else {
		getById("controlButtons").style.display="none";
	}
	
	var bigPlayButton = document.getElementById("bigPlayButton");
	if (bigPlayButton){
		bigPlayButton.parentNode.removeChild(bigPlayButton);
	}
	
	
	
	v.autoplay = false;
	v.controls = true;
	v.muted = false;
	
	if (files.length ==1){  // we don't want to do the complex logic if there is just one video
		v.loop = true;
	} else {
		v.loop = false;  // triggers the complex track/rtc logic.
	}
	
	v.setAttribute("playsinline","");
	v.src = fileURL;
	
	try {
		session.streamSrc=v.captureStream();
	} catch (e){
		errorlog(e);
		return;
	}
	
	v.className = "tile clean";
	v.id = "videosource"; // could be set to UUID in the future
	v.playlist = files;
	
	v.addEventListener('ended',myHandler,false);  // only fires if the video doesn't loop.
	
	
	function myHandler(e) {
		log("MY HANDLER TRIGGERED");
		var vid = getById("videosource");
		log(vid.playlist);
		vid.playlist.unshift(vid.playlist.pop());
		vid.src = URL.createObjectURL(vid.playlist[0]);
		vid.onloadeddata = function(){
			session.streamSrc=vid.captureStream();
			
			session.streamSrc.getTracks().forEach(function(track){
				for (UUID in session.pcs){
					var senders = session.pcs[UUID].getSenders();
					log(track);
					if (track.kind == "video"){
						try {
							if ((session.pcs[UUID].guest==true) && (session.roombitrate===0)) {
								log("room rate restriction detected. No videos will be published to other guests");
							} else if (session.pcs[UUID].allowVideo==true){  // allow
								 // for any connected peer, update the video they have if connected with a video already.
								var added=false;
								senders.forEach((sender) => { // I suppose there could be a race condition between negotiating and updating this. if joining at the same time as changnig streams?
									
									if (sender.track && sender.track.kind == "video"){
										sender.replaceTrack(track);  // replace may not be supported by all browsers.  eek.
										added=true;
									}
									
								});
								if (added==false){
									session.pcs[UUID].addTrack(track, session.streamSrc);
								}
							}
						} catch (e){
							errorlog(e);
						}
						
					} else {
						session.pcs[UUID].addTrack(track, session.streamSrc);
					}
				}
			});
			session.refreshScale();
		}
		vid.load();
		log(session.streamSrc);
		vid.play().then(_ => {
			log("playing");
		}).catch(warnlog);
		
	}
	
	// no preview doesn't work, so just stop it from doing its thing.
	
	
	container.appendChild(v);
	changeAudioOutputDevice(v);
	
	if (session.mirrored && session.flipped){
		v.style.transform = "scaleX(1) scaleY(-1) ";
	} else if (session.mirrored){
		v.style.transform = "scaleX(1) ";
	} else if (session.flipped){
		v.style.transform = "scaleY(-1) scaleX(-1)";
	} else {
		v.style.transform = "scaleX(-1) ";
	}
	
	session.mirrorExclude=true;
	
	if (session.director){
	} else if (session.scene!==false){
		setTimeout(function(){updateMixer();},1);
	} else if (session.roomid!==false){
		if (session.roomid===""){
			if (!(session.view) || (session.view==="")){
				
				if (session.fullscreen){
					session.windowed = false;
				} else {
					v.className = "myVideo clean";
					session.windowed = true;
				}
				getById("mutespeakerbutton").classList.add("advanced");
				
				applyMirror(session.mirrorExclude, 'videosource');
				
				container.style.width="100%";
				//container.style.height="100%";
				
				container.style.alignItems = "center";
				container.backgroundColor = "#666";
				
				play();
			} else {
				session.windowed = false;
				applyMirror(session.mirrorExclude, 'videosource');
				play();
				setTimeout(function(){updateMixer();},1);
			}
		} else {
			//session.cbr=0; // we're just going to override it
			if (session.stereo==5){
				session.stereo=3;
			}
			session.windowed = false;
			applyMirror(session.mirrorExclude, 'videosource');
			setTimeout(function(){updateMixer();},1);
		}
	} else {
		
		
		if (session.fullscreen){
			session.windowed = false;
		} else {
			v.className = "myVideo clean";
			session.windowed = true;
		}
		getById("mutespeakerbutton").classList.add("advanced");
		
		applyMirror(session.mirrorExclude, 'videosource');
		
		container.style.width="100%";
		//container.style.height="100%";
		//container.style.display = "flex";
		
		container.style.alignItems = "center";
		container.backgroundColor = "#666";
		
	}
	
	
	v.addEventListener('click', function(e){
		log("click");
		try {
			if ((e.ctrlKey)||(e.metaKey)){
				e.preventDefault();
				
				var [menu, innerMenu] = statsMenuCreator();
				
				menu.interval = setInterval(printMyStats,3000, innerMenu);
				
				printMyStats(innerMenu);
				e.stopPropagation();
				return false;
			}
		} catch(e){errorlog(e);}
	});
	
	
	v.touchTimeOut = null;
	v.touchLastTap = 0;
	v.touchCount = 0;
	v.addEventListener('touchend', function(event) {
		log("touched");
		
		document.ontouchup = null;
		document.onmouseup = null;
		document.onmousemove = null;
		document.ontouchmove = null;
		
		var currentTime = new Date().getTime();
		var tapLength = currentTime - v.touchLastTap;
		clearTimeout(v.touchTimeOut);
		if (tapLength < 500 && tapLength > 0) {
			///
			log("double touched");
			v.touchCount+=1;
			event.preventDefault();
			if (v.touchCount<5){
				v.touchLastTap = currentTime;
				return false;
			}
			v.touchLastTap = 0;
			v.touchCount=0;
			
			var [menu, innerMenu] = statsMenuCreator();
			
			menu.interval = setInterval(printMyStats,3000, innerMenu);
			
			printMyStats(innerMenu);
			event.stopPropagation();
			return false;
			//////
		} else {
			v.touchCount=1;
			v.touchTimeOut = setTimeout(function(vv) {
				clearTimeout(vv.touchTimeOut);
				vv.touchLastTap = 0;
				vv.touchCount=0;
			}, 5000, v);
			v.touchLastTap = currentTime;
		}
		
	});
		
	try{
		var m = getById("mainmenu");
		m.remove();
	} catch (e){}
	
	
	getById("reshare").href = "https://"+location.host+location.pathname+"?view="+session.streamID;
	getById("reshare").text = "https://"+location.host+location.pathname+"?view="+session.streamID;
	getById("reshare").style.width = ((getById("reshare").text.length + 1)*1.15 * 8) + 'px';
	pokeIframeAPI('started-fileshare');
	
	clearInterval(session.updateLocalStatsInterval);
	session.updateLocalStatsInterval = setInterval(function(){updateLocalStats();},3000);
	
	session.title=title;
	session.seeding=true;
	
	if (session.videoMutedFlag){
		session.videoMuted = true;
		toggleVideoMute(true);
	}
	
	session.seedStream();
};


function tryAgain(event) { // audio or video agnostic track reconnect ------------not actually in use,.  maybe out of date
	log("TRY AGAIN TRIGGERED");
	warnlog(event);
}


function enterPressedClick(event, ele) {
	if (event.keyCode === 13) {
		event.preventDefault();
		ele.click();
	}
}

function enterPressed(event, callback) {
	// Number 13 is the "Enter" key on the keyboard
	if (event.keyCode === 13) {
		event.preventDefault();
		callback();
	}
}


function dragElement(elmnt) {
	var millis = Date.now();
	try {
		var input = getById("zoomSlider");
		var stream = elmnt.srcObject;
		try {
			var track0 = stream.getVideoTracks();
		} catch (e) {
			return;
		}

		if (!(track0.length)) {
			return;
		}

		track0 = track0[0];
		if (track0.getCapabilities) {
			var capabilities = track0.getCapabilities();
			var settings = track0.getSettings();

			// Check whether zoom is supported or not. 
			if (!('zoom' in capabilities)) {
				log('Zoom is not supported by ' + track0.label);
				return;
			}

			// Map zoom to a slider element.
			input.min = capabilities.zoom.min;
			input.max = capabilities.zoom.max;
			input.step = capabilities.zoom.step;
			input.value = settings.zoom;
		}
	} catch (e) {
		errorlog(e);
		return;
	}

	log("drag on");
	elmnt.onmousedown = dragMouseDown;
	elmnt.onclick = onvideoclick;
	elmnt.ontouchstart = dragMouseDown;

	var pos0 = 1;

	function onvideoclick(e) {
		log(e);
		log("onvideoclick");
		e = e || window.event;
		e.preventDefault();
		return false;
	}

	function dragMouseDown(e) {
		log(e);
		log("dragMouseDown");

		//closeDragElement(null);

		//elmnt.controls = false;
		e = e || window.event;
		e.preventDefault();

		pos0 = input.value;
		if (e.type == 'touchstart' || e.type == 'touchmove' || e.type == 'touchend' || e.type == 'touchcancel') {
			var touch = e.touches[0] || e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
			pos3 = touch.clientX;
			pos4 = touch.clientY;
		} else if (e.type == 'mousedown' || e.type == 'mouseup' || e.type == 'mousemove' || e.type == 'mouseover' || e.type == 'mouseout' || e.type == 'mouseenter' || e.type == 'mouseleave') {
			pos3 = e.clientX;
			pos4 = e.clientY;
		}
		document.ontouchup = closeDragElement;
		document.onmouseup = closeDragElement;

		document.ontouchmove = elementDrag;
		document.onmousemove = elementDrag;
	}

	function elementDrag(e) {
		e = e || window.event;
		e.preventDefault();
		// calculate the new cursor position:

		if (Date.now() - millis < 50) {
			return;
		}
		millis = Date.now();

		if (e.type == 'touchstart' || e.type == 'touchmove' || e.type == 'touchend' || e.type == 'touchcancel') {
			var touch = e.touches[0] || e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
			pos1 = touch.clientX;
			pos2 = touch.clientY;
		} else if (e.type == 'mousedown' || e.type == 'mouseup' || e.type == 'mousemove' || e.type == 'mouseover' || e.type == 'mouseout' || e.type == 'mouseenter' || e.type == 'mouseleave') {
			pos1 = e.clientX;
			pos2 = e.clientY;
		}

		var zoom = parseFloat((pos4 - pos2) * 2 / elmnt.offsetHeight);

		if (zoom > 1) {
			zoom = 1.0;
		} else if (zoom < -1) {
			zoom = -1.0;
		}
		input.value = zoom * (input.max - input.min) + input.min;
		if (input.value != pos0) {
			track0.applyConstraints({
				advanced: [{
					zoom: input.value
				}]
			});
		}
	}

	function closeDragElement(e) {
		log(e);
		log("closeDragElement");
		//if (e!==null){
		//	elmnt.controls=true;
		//}
		/* stop moving when mouse button is released:*/
		document.ontouchup = null;
		document.onmouseup = null;
		document.onmousemove = null;
		document.ontouchmove = null;
	}
}

function previewIframe(iframesrc) { // this is pretty important if you want to avoid camera permission popup problems.  You can also call it automatically via: <body onload=>loadIframe();"> , but don't call it before the page loads.

	var iframe = document.createElement("iframe");
	iframe.allow = "autoplay;camera;microphone";
	iframe.allowtransparency = "true";
	iframe.allowfullscreen = "true";
	iframe.style.width = "100%";
	iframe.style.height = "100%";
	iframe.style.border = "10px dashed rgb(64 65 62)";

	if (iframesrc == "") {
		iframesrc = "./";
	}


	if (iframesrc.startsWith("https://") || iframesrc.startsWith("http://")){
		var domain = (new URL(iframesrc));
		domain = domain.hostname;
		log(domain);
		if ((domain=="www.youtube.com") || (domain=="youtube.com")){
			var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
			var match = iframesrc.match(regExp);
			var vidid = (match&&match[7].length==11)? match[7] : false;
			
			if(vidid){
				iframesrc = "https://www.youtube.com/embed/"+vidid+"?autoplay=1&modestbranding=1";
				log(iframesrc);
			}
		} else if (domain=="www.twitch.tv"){
			var vidid = iframesrc.split('/').pop().split('#')[0].split('?')[0];
			if (vidid){
				iframesrc = "https://player.twitch.tv/?channel="+vidid+"&parent="+location.hostname;
				log(iframesrc);
			}
		} else if (domain=="twitch.tv"){
			var vidid = iframesrc.split('/').pop().split('#')[0].split('?')[0];
			if (vidid){
				iframesrc = "https://player.twitch.tv/?channel="+vidid+"&parent="+location.hostname;
				log(iframesrc);
			}
		}
		
	}

	iframe.src = iframesrc;
	getById("previewIframe").innerHTML = "";
	getById("previewIframe").style.width = "640px";
	getById("previewIframe").style.height = "360px";
	getById("previewIframe").style.margin = "auto";
	getById("previewIframe").appendChild(iframe);
}

function loadIframe(iframesrc) { // this is pretty important if you want to avoid camera permission popup problems.  You can also call it automatically via: <body onload=>loadIframe();"> , but don't call it before the page loads.

	var iframe = document.createElement("iframe");
	iframe.allow = "autoplay;camera;microphone";
	iframe.allowtransparency = "true";
	iframe.allowfullscreen = "true";
	iframe.style.width = "100%";
	iframe.style.height = "100%";
	iframe.style.border = "10px dashed rgb(64 65 62)";

	if (iframesrc == "") {
		iframesrc = "./";
	}
	if (document.getElementById("mainmenu")) {
		var m = getById("mainmenu");
		m.remove();
	}
	iframe.src = iframesrc;
	return iframe
}

function dropDownButtonAction(ele) {
	var ele = getById("dropButton");
	if (ele) {
		ele.parentNode.removeChild(ele);
		getById('container-5').classList.remove('advanced');
		getById('container-8').classList.remove('advanced');
		getById('container-6').classList.remove('advanced');
		getById('container-7').classList.remove('advanced');
	}
}

function updateConstraintSliders() {
	log("updateConstraintSliders");
	if (session.roomid !== false && session.roomid !== "" && session.director !== true && session.forceMediaSettings == false) {
		if (session.controlRoomBitrate === true) {
			listCameraSettings();
		}
		if (session.effects === 0){
			if ((iOS) || (iPad)){
			} else {
				getById("effectsDiv3").style.display = "block";
				getById("effectSelector3").value = "0";
			}
		}
	} else {
		listAudioSettings();
		listCameraSettings();
		if ((iOS) || (iPad)){
		} else {
			if (session.effects!==false){
				getById("effectsDiv3").style.display = "block";
				try{
					getById("effectSelector3").value = parseInt(session.effects || 0)+"";
				} catch(E){}
			}
		}	
	}
	//checkIfPIP();  //  this doesn't actually work on iOS still, so whatever.
}

function checkIfPIP() {
	try {
		if (session.videoElement && ((session.videoElement.webkitSupportsPresentationMode && typeof session.videoElement.webkitSetPresentationMode === "function") || (document.pictureInPictureEnabled || !videoElement.disablePictureInPicture))) {
			// Toggle PiP when the user clicks the button.

			getById("pIpStartButton").addEventListener("click", function(event) {
				//	if ( (document.pictureInPictureEnabled || !videoElement.disablePictureInPicture)){
				//session.videoElement.requestPictureInPicture();
				//	} else {
				session.videoElement.webkitSetPresentationMode(session.videoElement.webkitPresentationMode === "picture-in-picture" ? "inline" : "picture-in-picture");
				//	}
			});
			getById("pIpStartButton").style.display = "inline-block";
		}
	} catch (e) {
		errorlog(e);
	}
}

function listAudioSettingsPrep() {
	try {
		var tracks = session.streamSrc.getAudioTracks();
		if (!tracks.length) {
			warnlog("session.streamSrc contains no audio tracks");
			return;
		}
	} catch (e) {
		warnlog(e);
		return;
	}

	var data = [];

	for (var i = 0; i < tracks.length; i += 1) {
		track0 = tracks[i];
		var trackSet = {};

		if (track0.getCapabilities) {
			trackSet.audioConstraints = track0.getCapabilities();
		}

		if (track0.getSettings) {
			trackSet.currentAudioConstraints = track0.getSettings();
		}

		trackSet.trackLabel = "unknown or none";
		if (track0.label) {
			trackSet.trackLabel = track0.label;
		}

		if (i == 0) {
			trackSet.equalizer = session.equalizer; // only supporting the first track at the moment.
		} else {
			trackSet.equalizer = false;
		}

		if (i == 0) {
			trackSet.lowcut = session.lowcut; // only supporting the first track at the moment.
		} else {
			trackSet.lowcut = false;
		}

		data.push(trackSet);
	}
	return data;
}

function listVideoSettingsPrep() {
	try {
		var track0 = session.streamSrc.getVideoTracks();
		if (track0.length) {
			track0 = track0[0];
			if (track0.getCapabilities) {
				session.cameraConstraints = track0.getCapabilities();
			}
			log(session.cameraConstraints);
		}
	} catch (e) {
		warnlog(e);
		return;
	}

	try {
		if (track0.getSettings) {
			session.currentCameraConstraints = track0.getSettings();
		}
	} catch (e) {
		warnlog(e);
		return;
	}
	var msg = {};
	msg.trackLabel = "unknown or none";
	if (track0.label) {
		msg.trackLabel = track0.label;
	}
	msg.currentCameraConstraints = session.currentCameraConstraints;
	msg.cameraConstraints = session.cameraConstraints;
	return msg;
}


var Final_transcript = "";
var Interim_transcript = "";
var Recognition = null;

if ("webkitSpeechRecognition" in window) {
	var SpeechRecognition = webkitSpeechRecognition;
} else if ("SpeechRecognition" in window) {
	var SpeechRecognition = window.SpeechRecognition;
} else {
	var SpeechRecognition = false;
}

var TranscriptionCounter = 0;

function setupClosedCaptions() {
	log("CLOSED CAPTIONING SETUP");
	if (SpeechRecognition) {
		Recognition = new SpeechRecognition();

		Recognition.lang = session.transcript;

		Recognition.continuous = true;
		Recognition.interimResults = true;
		Recognition.maxAlternatives = 0;

		Recognition.onstart = function() {
			log("started transcription");
		};
		Recognition.onerror = function(event) {
			errorlog(event);
			try {
				Recognition.stop();
			} catch (e) {}
			setTimeout(function() {
				setupClosedCaptions();
			}, 0); // restart it if it fails.
		};
		Recognition.onend = function(e) {
			warnlog(e);
			log("Stopped transcription");
			setTimeout(function() {
				setupClosedCaptions();
			}, 0); // restart it if it fails.
		};

		Recognition.onresult = function(event) {

			Interim_transcript = '';
			if (typeof(event.results) == 'undefined') {
				log(event);
				return;
			}
			for (var i = event.resultIndex; i < event.results.length; ++i) {
				if (event.results[i].isFinal) {
					Final_transcript += event.results[i][0].transcript;
				} else {
					Interim_transcript += event.results[i][0].transcript;
				}
			}

			if (Final_transcript.length > 0) {
				log("FINAL:" + Final_transcript);
				try {
					var data = {};
					data.isFinal = true;
					data.transcript = Final_transcript;
					data.counter = TranscriptionCounter;
					session.sendMessage(data);
					TranscriptionCounter += 1;
					Final_transcript = "";
					Interim_transcript = "";
				} catch (e) {
					errorlog(e);
				}

			} else {
				try {
					var data = {};
					data.isFinal = false;
					data.transcript = Interim_transcript;
					data.counter = TranscriptionCounter;
					session.sendMessage(data);
				} catch (e) {
					errorlog(e);
					Interim_transcript = "";
				}
			}
		};

		Recognition.start();
	}
}


function requestVideoRecord(ele) {
	var UUID = ele.dataset.UUID
	if (ele.classList.contains("pressed")) {
		var msg = {};
		msg.requestVideoRecord = false;
		msg.UUID = UUID;
		session.sendRequest(msg, msg.UUID);
		ele.classList.remove("pressed");
	} else {
		var msg = {};
		msg.requestVideoRecord = true;
		msg.UUID = UUID;
		var bitrate = prompt("What bitrate would you like to record at? (kbps)", 6000);
		if (bitrate) {
			msg.value = bitrate;
			session.sendRequest(msg, msg.UUID);
			ele.classList.add("pressed");
		}
	}
}

function changeOrderDirector(value) {
	if (session.order==false){
		session.order=0;
	}
	session.order += parseInt(value) || 0;
	
	var elements = document.querySelectorAll('[data-action-type="order-value-director"]');
	//log(elements);
	if (elements[0]){
		elements[0].innerText = parseInt(session.order) || 0;
	}
	
	var data = {};
	data = {};
	data.order = session.order;
	session.sendPeers(data);
}



function changeOrder(value, UUID) {
	var msg = {};
	msg.changeOrder = value;
	msg.UUID = UUID;
	session.sendRequest(msg, msg.UUID);
}

function requestVideoHack(keyname, value, UUID) {
	var msg = {};
	msg.requestVideoHack = true;
	msg.keyname = keyname;
	msg.value = value;
	msg.UUID = UUID;
	session.sendRequest(msg, msg.UUID);
}

function requestAudioHack(keyname, value, UUID, track = 0) { // updateCameraConstraints
	var msg = {};
	msg.requestAudioHack = true;
	msg.keyname = keyname;
	msg.value = value;
	msg.UUID = UUID;
	msg.track = track;
	session.sendRequest(msg, msg.UUID);
}

function requestChangeEQ(keyname, value, UUID, track = 0) { // updateCameraConstraints
	var msg = {};
	msg.requestChangeEQ = true;
	msg.keyname = keyname;
	msg.value = value;
	msg.UUID = UUID;
	msg.track = track;
	session.sendRequest(msg, msg.UUID);
}

function requestChangeLowcut(value, UUID, track = 0) { // updateCameraConstraints
	var msg = {};
	msg.requestChangeLowcut = true;
	msg.value = value;
	msg.UUID = UUID;
	msg.track = track;
	session.sendRequest(msg, msg.UUID);
}

function toggleSystemPip(vid) {
  if (vid.webkitSupportsPresentationMode && (typeof vid.webkitSetPresentationMode === "function")) {
	vid.webkitSetPresentationMode(
		vid.webkitPresentationMode === "picture-in-picture"
			? "inline"
			: "picture-in-picture"
	);
  } else {
		if (document.pictureInPictureElemen) {
			document.exitPictureInPicture();
			vid.requestPictureInPicture();
		} else {
			vid.requestPictureInPicture();
		}
    
  }
}

function updateDirectorsAudio(dataN, UUID) {
	var audioEle = document.createElement("div");
	getById("advanced_audio_director_" + UUID).innerHTML = "";
	getById("advanced_audio_director_" + UUID).className = "";

	//log(dataN);
	if (!dataN.length) {
		return;
	}

	for (var n = 0; n < dataN.length; n += 1) {
		var data = dataN[n];

		if (data.trackLabel) {
			var label = document.createElement("span");
			label.innerText = data.trackLabel;
			label.style.marginBottom = "10px";
			label.style.display = "block";
			audioEle.appendChild(label);
		}
		if (n !== 0) {
			//var label = document.createElement("span");
			//label.innerText = "Coming Soon";
			//audioEle.appendChild(label);
			continue; // remove to more than one audio device (assuming other fixes are applied)
		}


		if (data.lowcut) {
			var label = document.createElement("label");
			var i = "Low_Cut";
			label.id = "label_" + i;
			label.htmlFor = "constraints_" + i;
			label.innerText = "low cut:";

			var input = document.createElement("input");
			input.min = 50;
			input.max = 150;

			input.type = "range";
			input.dataset.keyname = i;
			input.dataset.labelname = label.innerText;
			input.dataset.track = n;
			input.dataset.UUID = UUID;
			input.id = "constraints_" + i;
			input.style = "display:block; width:100%;";
			input.name = "constraints_" + i;
			input.style.margin = "8px 0";

			input.onchange = function(e) {
				getById("label_" + e.target.dataset.keyname).innerText = e.target.dataset.labelname + " " + e.target.value;
				requestChangeLowcut(parseInt(e.target.value), e.target.dataset.UUID, parseInt(e.target.dataset.track));
			};

			audioEle.appendChild(label);
			audioEle.appendChild(input);
		}

		if (data.equalizer) {
			var label = document.createElement("label");
			var i = "Low_EQ";
			label.id = "label_" + i;
			label.htmlFor = "constraints_" + i;
			label.innerText = "low EQ:";

			var input = document.createElement("input");
			input.min = -50;
			input.max = 50;

			input.type = "range";
			input.dataset.keyname = i;
			input.dataset.labelname = label.innerText;
			input.dataset.track = n;
			input.dataset.UUID = UUID;
			input.id = "constraints_" + i;
			input.style = "display:block; width:100%;";
			input.name = "constraints_" + i;
			input.style.margin = "8px 0";

			input.onchange = function(e) {
				getById("label_" + e.target.dataset.keyname).innerText = e.target.dataset.labelname + " " + e.target.value;
				//changeLowEQ( e.target.value);
				requestChangeEQ("low", parseInt(e.target.value), e.target.dataset.UUID, parseInt(e.target.dataset.track));
			};

			audioEle.appendChild(label);
			audioEle.appendChild(input);

			var label = document.createElement("label");
			var i = "Mid_EQ";
			label.id = "label_" + i;
			label.htmlFor = "constraints_" + i;
			label.innerText = "mid EQ:";

			var input = document.createElement("input");
			input.min = -50;
			input.max = 50;

			input.type = "range";
			input.dataset.keyname = i;
			input.dataset.labelname = label.innerText;
			input.dataset.track = n;
			input.dataset.UUID = UUID;
			input.id = "constraints_" + i;
			input.style = "display:block; width:100%;";
			input.name = "constraints_" + i;
			input.style.margin = "8px 0";


			input.onchange = function(e) {
				getById("label_" + e.target.dataset.keyname).innerText = e.target.dataset.labelname + " " + e.target.value;
				//changeMidEQ( e.target.value);
				requestChangeEQ("mid", parseInt(e.target.value), e.target.dataset.UUID, parseInt(e.target.dataset.track));
			};

			audioEle.appendChild(label);
			audioEle.appendChild(input);


			var label = document.createElement("label");
			var i = "High_EQ";
			label.id = "label_" + i;
			label.htmlFor = "constraints_" + i;
			label.innerText = "high EQ:";

			var input = document.createElement("input");
			input.min = -50;
			input.max = 50;

			input.type = "range";
			input.dataset.keyname = i;
			input.dataset.labelname = label.innerText;
			input.dataset.track = n;
			input.dataset.UUID = UUID;
			input.id = "constraints_" + i;
			input.style = "display:block; width:100%;";
			input.name = "constraints_" + i;
			input.style.margin = "8px 0";

			input.onchange = function(e) {
				getById("label_" + e.target.dataset.keyname).innerText = e.target.dataset.labelname + " " + e.target.value;
				requestChangeEQ("high", parseInt(e.target.value), e.target.dataset.UUID, parseInt(e.target.dataset.track));
			};

			audioEle.appendChild(label);
			audioEle.appendChild(input);
		}
		for (var i in data.audioConstraints) {
			try {
				log(i);
				log(data.audioConstraints[i]);
				if ((typeof data.audioConstraints[i] === 'object') && (data.audioConstraints[i] !== null) && ("max" in data.audioConstraints[i]) && ("min" in data.audioConstraints[i])) {
					if (i === "aspectRatio") {
						continue;
					} else if (i === "width") {
						continue;
					} else if (i === "height") {
						continue;
					} else if (i === "frameRate") {
						continue;
					} else if (i === "latency") {
						continue;
					} else if (i === "sampleRate") {
						continue;
					} else if (i === "channelCount") {
						continue;
					}

					var label = document.createElement("label");
					label.id = "label_" + i;
					label.htmlFor = "constraints_" + i;
					label.innerText = i + ":";

					var input = document.createElement("input");
					input.min = data.audioConstraints[i].min;
					input.max = data.audioConstraints[i].max;

					if (parseFloat(input.min) == parseFloat(input.max)) {
						continue;
					}

					if (i in data.currentAudioConstraints) {
						input.value = data.currentAudioConstraints[i];
						label.innerText = i + ": " + data.currentAudioConstraints[i];
						label.title = "Previously was:  " + data.currentAudioConstraints[i];
						input.title = "Previously was:  " + data.currentAudioConstraints[i];
					} else {
						label.innerText = i;
					}
					if ("step" in data.audioConstraints[i]) {
						input.step = data.audioConstraints[i].step;
					}
					input.type = "range";
					input.dataset.keyname = i;
					input.dataset.track = n;
					input.dataset.UUID = UUID;
					input.id = "constraints_" + i;
					input.style = "display:block; width:100%;";
					input.name = "constraints_" + i;


					input.onchange = function(e) {
						getById("label_" + e.target.dataset.keyname).innerText = e.target.dataset.keyname + ": " + e.target.value;
						//updateAudioConstraints(e.target.dataset.keyname, e.target.value);
						requestAudioHack(e.target.dataset.keyname, e.target.value, e.target.dataset.UUID, e.target.dataset.track);
					};

					audioEle.appendChild(label);
					audioEle.appendChild(input);
				} else if ((typeof data.audioConstraints[i] === 'object') && (data.audioConstraints[i] !== null)) {
					if (i == "resizeMode") {
						continue;
					}

					var div = document.createElement("div");
					var label = document.createElement("label");
					label.id = "label_" + i;
					label.htmlFor = "constraints_" + i;
					label.innerText = i + ":";
					label.style = "display:inline-block; padding:0;margin: 5px 0px 9px;";
					label.dataset.keyname = i;
					var input = document.createElement("select");
					var c = document.createElement("option");

					if (data.audioConstraints[i].length > 1) {
						for (var opts in data.audioConstraints[i]) {
							log(opts);
							var opt = new Option(data.audioConstraints[i][opts], data.audioConstraints[i][opts]);
							input.options.add(opt);
							if (i in data.currentAudioConstraints) {
								if (data.audioConstraints[i][opts] == data.currentAudioConstraints[i]) {
									opt.selected = true;
								}
							}
						}
					} else if (i.toLowerCase == "torch") {
						var opt = new Option("Off", false);
						input.options.add(opt);
						opt = new Option("On", true);
						input.options.add(opt);
					} else {
						continue;
					}

					input.id = "constraints_" + i;
					input.className = "constraintCameraInput";
					input.name = "constraints_" + i;
					input.style = "display:inline; padding:2px; margin:0 10px;";
					input.dataset.keyname = i;
					input.dataset.track = n;
					input.dataset.UUID = UUID;
					input.onchange = function(e) {
						//getById("label_"+e.target.dataset.keyname).innerText =e.target.dataset.keyname+": "+e.target.value;
						//updateAudioConstraints(e.target.dataset.keyname, e.target.value);
						requestAudioHack(e.target.dataset.keyname, e.target.value, e.target.dataset.UUID, e.target.dataset.track);
						log(e.target.dataset.keyname, e.target.value);
					};
					audioEle.appendChild(div);
					div.appendChild(label);
					div.appendChild(input);
				} else if (typeof data.audioConstraints[i] === 'boolean') {

					var div = document.createElement("div");
					var label = document.createElement("label");
					label.id = "label_" + i;
					label.htmlFor = "constraints_" + i;
					label.innerText = i + ":";
					label.style = "display:inline-block; padding:0;margin: 5px 0px 9px;";
					label.dataset.keyname = i;
					var input = document.createElement("select");
					var c = document.createElement("option");

					var opt = new Option("Off", false);
					input.options.add(opt);
					opt = new Option("On", true);
					input.options.add(opt);

					input.id = "constraints_" + i;
					input.className = "constraintCameraInput";
					input.name = "constraints_" + i;
					input.style = "display:inline; padding:2px; margin:0 10px;";
					input.dataset.keyname = i;
					input.dataset.track = n;
					input.dataset.UUID = UUID;
					input.onchange = function(e) {
						//getById("label_"+e.target.dataset.keyname).innerText =e.target.dataset.keyname+": "+e.target.value;
						//updateAudioConstraints(e.target.dataset.keyname, e.target.value);
						requestAudioHack(e.target.dataset.keyname, e.target.value, e.target.dataset.UUID, e.target.dataset.track);
						log(e.target.dataset.keyname, e.target.value);
					};
					audioEle.appendChild(div);
					div.appendChild(label);
					div.appendChild(input);
				}
			} catch (e) {
				errorlog(e);
			}
		}
		getById("advanced_audio_director_" + UUID).appendChild(audioEle);
	}
}

function updateDirectorsVideo(data, UUID) {
	var videoEle = document.createElement("div");
	if (data.trackLabel) {
		var label = document.createElement("span");
		label.innerText = data.trackLabel;
		label.style.marginBottom = "10px";
		label.style.display = "block";
		videoEle.appendChild(label);
	}
	
	for (var i in data.cameraConstraints) {
		try {
			log(i);
			log(data.cameraConstraints[i]);
			if ((typeof data.cameraConstraints[i] === 'object') && (data.cameraConstraints[i] !== null) && ("max" in data.cameraConstraints[i]) && ("min" in data.cameraConstraints[i])) {
				if (i === "aspectRatio") {
					continue;
				} else if (i === "width") {
					continue;
				} else if (i === "height") {
					continue;
				} else if (i === "frameRate") {
					continue;
				} else if (i === "latency") {
					continue;
				} else if (i === "sampleRate") {
					continue;
				} else if (i === "channelCount") {
					continue;
				}

				var label = document.createElement("label");
				label.id = "label_" + i;
				label.htmlFor = "constraints_" + i;
				label.innerText = i + ":";

				var input = document.createElement("input");
				input.min = data.cameraConstraints[i].min;
				input.max = data.cameraConstraints[i].max;

				if (parseFloat(input.min) == parseFloat(input.max)) {
					continue;
				}


				if (i in data.currentCameraConstraints) {
					input.value = data.currentCameraConstraints[i];
					label.innerText = i + ": " + data.currentCameraConstraints[i];
					label.title = "Previously was:  " + data.currentCameraConstraints[i];
					input.title = "Previously was:  " + data.currentCameraConstraints[i];
				} else {
					label.innerText = i;
				}
				if ("step" in data.cameraConstraints[i]) {
					input.step = data.cameraConstraints[i].step;
				}
				input.type = "range";
				input.dataset.keyname = i;
				input.id = "constraints_" + i;
				input.style = "display:block; width:100%;margin: 8px 0;";
				input.name = "constraints_" + i;


				input.onchange = function(e) {
					getById("label_" + e.target.dataset.keyname).innerText = e.target.dataset.keyname + ": " + e.target.value;
					//updateVideoConstraints(e.target.dataset.keyname, e.target.value);
					requestVideoHack(e.target.dataset.keyname, e.target.value, UUID);
				};


				videoEle.appendChild(label);
				videoEle.appendChild(input);
			} else if ((typeof data.cameraConstraints[i] === 'object') && (data.cameraConstraints[i] !== null)) {
				if (i == "resizeMode") {
					continue;
				}

				var div = document.createElement("div");
				var label = document.createElement("label");
				label.id = "label_" + i;
				label.htmlFor = "constraints_" + i;
				label.innerText = i + ":";
				label.style = "display:inline-block; padding:0;margin: 5px 0px 9px;";
				label.dataset.keyname = i;
				var input = document.createElement("select");
				var c = document.createElement("option");

				if (data.cameraConstraints[i].length > 1) {
					for (var opts in data.cameraConstraints[i]) {
						log(opts);
						var opt = new Option(data.cameraConstraints[i][opts], data.cameraConstraints[i][opts]);
						input.options.add(opt);
						if (i in data.currentCameraConstraints) {
							if (data.cameraConstraints[i][opts] == data.currentCameraConstraints[i]) {
								opt.selected = true;
							}
						}
					}
				} else if (i.toLowerCase == "torch") {
					var opt = new Option("Off", false);
					input.options.add(opt);
					opt = new Option("On", true);
					input.options.add(opt);
				} else {
					continue;
				}

				input.id = "constraints_" + i;
				input.className = "constraintCameraInput";
				input.name = "constraints_" + i;
				input.style = "display:inline; padding:2px; margin:0 10px;";
				input.dataset.keyname = i;
				input.onchange = function(e) {
					//getById("label_"+e.target.dataset.keyname).innerText =e.target.dataset.keyname+": "+e.target.value;
					//updateVideoConstraints(e.target.dataset.keyname, e.target.value);
					requestVideoHack(e.target.dataset.keyname, e.target.value, UUID);
					log(e.target.dataset.keyname, e.target.value);
				};
				videoEle.appendChild(div);
				div.appendChild(label);
				div.appendChild(input);
			} else if (typeof data.cameraConstraints[i] === 'boolean') {

				var div = document.createElement("div");
				var label = document.createElement("label");
				label.id = "label_" + i;
				label.htmlFor = "constraints_" + i;
				label.innerText = i + ":";
				label.style = "display:inline-block; padding:0;margin: 5px 0px 9px;";
				label.dataset.keyname = i;
				var input = document.createElement("select");
				var c = document.createElement("option");

				var opt = new Option("Off", false);
				input.options.add(opt);
				opt = new Option("On", true);
				input.options.add(opt);

				input.id = "constraints_" + i;
				input.className = "constraintCameraInput";
				input.name = "constraints_" + i;
				input.style = "display:inline; padding:2px; margin:0 10px;";
				input.dataset.keyname = i;
				input.onchange = function(e) {
					//getById("label_"+e.target.dataset.keyname).innerText =e.target.dataset.keyname+": "+e.target.value;
					//updateVideoConstraints(e.target.dataset.keyname, e.target.value);
					requestVideoHack(e.target.dataset.keyname, e.target.value, UUID);
					log(e.target.dataset.keyname, e.target.value);
				};
				videoEle.appendChild(div);
				div.appendChild(label);
				div.appendChild(input);
			}
		} catch (e) {
			errorlog(e);
		}
	}

	getById("advanced_video_director_" + UUID).innerHTML = "";
	getById("advanced_video_director_" + UUID).appendChild(videoEle);
	getById("advanced_video_director_" + UUID).className = "";
}

///////

function listAudioSettings() {
	getById("popupSelector_constraints_audio").innerHTML = "";
	try {
		var track0 = session.streamSrc.getAudioTracks();
		if (track0.length) {
			track0 = track0[0];
			if (track0.getCapabilities) {
				session.audioConstraints = track0.getCapabilities();
			}
			log(session.audioConstraints);
		} else {
			warnlog("session.streamSrc contains no audio tracks");
			return;
		}
	} catch (e) {
		warnlog("session.streamSrc contains no audio tracks");
		errorlog(e);
		return;
	}
	try {
		if (track0.getSettings) {
			session.currentAudioConstraints = track0.getSettings();
		}
	} catch (e) {
		errorlog(e);
	}
	//////

	if (session.lowcut) {
		if (getById("popupSelector_constraints_audio").style.display == "none") {
			getById("advancedOptionsAudio").style.display = "inline-block";
		}

		var label = document.createElement("label");
		var i = "Low_Cut";
		label.id = "label_" + i;
		label.htmlFor = "constraints_" + i;
		label.innerText = "Low Cut:";

		var input = document.createElement("input");
		input.min = 50;
		input.max = 400;

		input.type = "range";
		input.dataset.keyname = i;
		input.dataset.labelname = label.innerHTML;
		input.id = "constraints_" + i;
		input.style = "display:block; width:100%;";
		input.name = "constraints_" + i;

		for (var webAudio in session.webAudios) {
			if (session.webAudios[webAudio].lowcut1.frequency) {
				input.value = session.webAudios[webAudio].lowcut1.frequency.value;
				label.innerHTML += " " + session.webAudios[webAudio].lowcut1.frequency.value;
			}
		}

		input.onchange = function(e) {
			getById("label_" + e.target.dataset.keyname).innerHTML = e.target.dataset.labelname + " " + e.target.value;
			changeLowCut(e.target.value, 0);
		};

		getById("popupSelector_constraints_audio").appendChild(label);
		getById("popupSelector_constraints_audio").appendChild(input);
	}

	if (session.equalizer) {
		if (getById("popupSelector_constraints_audio").style.display == "none") {
			getById("advancedOptionsAudio").style.display = "inline-block";
		}

		var label = document.createElement("label");
		var i = "Low_EQ";
		label.id = "label_" + i;
		label.htmlFor = "constraints_" + i;
		label.innerHTML = "Low EQ:";

		var input = document.createElement("input");
		input.min = -50;
		input.max = 50;

		input.type = "range";
		input.dataset.keyname = i;
		input.dataset.labelname = label.innerHTML;
		input.id = "constraints_" + i;
		input.style = "display:block; width:100%;";
		input.name = "constraints_" + i;

		for (var webAudio in session.webAudios) {
			if (session.webAudios[webAudio].lowEQ.gain) {
				input.value = session.webAudios[webAudio].lowEQ.gain.value;
				label.innerHTML += " " + session.webAudios[webAudio].lowEQ.gain.value;
			}
		}

		input.onchange = function(e) {
			getById("label_" + e.target.dataset.keyname).innerHTML = e.target.dataset.labelname + " " + e.target.value;
			changeLowEQ(e.target.value, 0);
		};

		getById("popupSelector_constraints_audio").appendChild(label);
		getById("popupSelector_constraints_audio").appendChild(input);
		//
		if (getById("popupSelector_constraints_audio").style.display == "none") {
			getById("advancedOptionsAudio").style.display = "inline-block";
		}

		var label = document.createElement("label");
		var i = "Mid_EQ";
		label.id = "label_" + i;
		label.htmlFor = "constraints_" + i;
		label.innerHTML = "Mid EQ:";

		var input = document.createElement("input");
		input.min = -50;
		input.max = 50;

		input.type = "range";
		input.dataset.keyname = i;
		input.dataset.labelname = label.innerHTML;
		input.id = "constraints_" + i;
		input.style = "display:block; width:100%;";
		input.name = "constraints_" + i;


		for (var webAudio in session.webAudios) {
			if (session.webAudios[webAudio].midEQ.gain) {
				input.value = session.webAudios[webAudio].midEQ.gain.value;
				label.innerHTML += " " + session.webAudios[webAudio].midEQ.gain.value;
			}
		}


		input.onchange = function(e) {
			getById("label_" + e.target.dataset.keyname).innerHTML = e.target.dataset.labelname + " " + e.target.value;
			changeMidEQ(e.target.value, 0);
		};

		getById("popupSelector_constraints_audio").appendChild(label);
		getById("popupSelector_constraints_audio").appendChild(input);
		//
		if (getById("popupSelector_constraints_audio").style.display == "none") {
			getById("advancedOptionsAudio").style.display = "inline-block";
		}

		var label = document.createElement("label");
		var i = "High_EQ";
		label.id = "label_" + i;
		label.htmlFor = "constraints_" + i;
		label.innerHTML = "High EQ:";

		var input = document.createElement("input");
		input.min = -50;
		input.max = 50;


		input.type = "range";
		input.dataset.keyname = i;
		input.dataset.labelname = label.innerHTML;
		input.id = "constraints_" + i;
		input.style = "display:block; width:100%;";
		input.name = "constraints_" + i;

		for (var webAudio in session.webAudios) {
			if (session.webAudios[webAudio].highEQ.gain) {
				input.value = session.webAudios[webAudio].highEQ.gain.value;
				label.innerHTML += " " + session.webAudios[webAudio].highEQ.gain.value;
			}
		}


		input.onchange = function(e) {
			getById("label_" + e.target.dataset.keyname).innerHTML = e.target.dataset.labelname + " " + e.target.value;
			changeHighEQ(e.target.value, 0);
		};

		getById("popupSelector_constraints_audio").appendChild(label);
		getById("popupSelector_constraints_audio").appendChild(input);
	}
	////////
	for (var i in session.audioConstraints) {
		try {
			log(i);
			log(session.audioConstraints[i]);
			if ((typeof session.audioConstraints[i] === 'object') && (session.audioConstraints[i] !== null) && ("max" in session.audioConstraints[i]) && ("min" in session.audioConstraints[i])) {
				if (i === "aspectRatio") {
					continue;
				} else if (i === "width") {
					continue;
				} else if (i === "height") {
					continue;
				} else if (i === "frameRate") {
					continue;
				} else if (i === "latency") {
					continue;
				} else if (i === "sampleRate") {
					continue;
				} else if (i === "channelCount") {
					continue;
				}

				var label = document.createElement("label");
				label.id = "label_" + i;
				label.htmlFor = "constraints_" + i;
				label.innerHTML = i + ":";


				var input = document.createElement("input");
				input.min = session.audioConstraints[i].min;
				input.max = session.audioConstraints[i].max;

				if (parseFloat(input.min) == parseFloat(input.max)) {
					continue;
				}

				if (getById("popupSelector_constraints_audio").style.display == "none") {
					getById("advancedOptionsAudio").style.display = "inline-block";
				}


				if (i in session.currentAudioConstraints) {
					input.value = session.currentAudioConstraints[i];
					label.innerHTML = i + ": " + session.currentAudioConstraints[i];
					label.title = "Previously was:  " + session.currentAudioConstraints[i];
					input.title = "Previously was:  " + session.currentAudioConstraints[i];
				} else {
					label.innerHTML = i;
				}
				if ("step" in session.audioConstraints[i]) {
					input.step = session.audioConstraints[i].step;
				}
				input.type = "range";
				input.dataset.keyname = i;
				input.id = "constraints_" + i;
				input.style = "display:block; width:100%;";
				input.name = "constraints_" + i;


				input.onchange = function(e) {
					getById("label_" + e.target.dataset.keyname).innerHTML = e.target.dataset.keyname + ": " + e.target.value;
					//updateAudioConstraints(e.target.dataset.keyname, e.target.value);
					applyAudioHack(e.target.dataset.keyname, e.target.value);
				};


				getById("popupSelector_constraints_audio").appendChild(label);
				getById("popupSelector_constraints_audio").appendChild(input);
			} else if ((typeof session.audioConstraints[i] === 'object') && (session.audioConstraints[i] !== null)) {
				if (i == "resizeMode") {
					continue;
				}

				var div = document.createElement("div");
				var label = document.createElement("label");
				label.id = "label_" + i;
				label.htmlFor = "constraints_" + i;
				label.innerHTML = i + ":";
				label.style = "display:inline-block; padding:0;margin: 15px 0px 29px;";
				label.dataset.keyname = i;
				var input = document.createElement("select");
				var c = document.createElement("option");

				if (session.audioConstraints[i].length > 1) {
					for (var opts in session.audioConstraints[i]) {
						log(opts);
						var opt = new Option(session.audioConstraints[i][opts], session.audioConstraints[i][opts]);
						input.options.add(opt);

						if (i in session.currentAudioConstraints) {
							if (session.audioConstraints[i][opts] == session.currentAudioConstraints[i]) {
								opt.selected = true;
							}
						}

					}
				} else if (i.toLowerCase == "torch") {
					var opt = new Option("Off", false);
					input.options.add(opt);
					opt = new Option("On", true);
					input.options.add(opt);
				} else {
					continue;
				}

				if (getById("popupSelector_constraints_audio").style.display == "none") {
					getById("advancedOptionsAudio").style.display = "inline-block";
				}

				input.id = "constraints_" + i;
				input.className = "constraintCameraInput";
				input.name = "constraints_" + i;
				input.style = "display:inline; padding:2px; margin:0 10px;";
				input.dataset.keyname = i;
				input.onchange = function(e) {
					//getById("label_"+e.target.dataset.keyname).innerHTML =e.target.dataset.keyname+": "+e.target.value;
					//updateAudioConstraints(e.target.dataset.keyname, e.target.value);
					applyAudioHack(e.target.dataset.keyname, e.target.value);
					log(e.target.dataset.keyname, e.target.value);
				};
				getById("popupSelector_constraints_audio").appendChild(div);
				div.appendChild(label);
				div.appendChild(input);
			} else if (typeof session.audioConstraints[i] === 'boolean') {

				var div = document.createElement("div");
				var label = document.createElement("label");
				label.id = "label_" + i;
				label.htmlFor = "constraints_" + i;
				label.innerHTML = i + ":";
				label.style = "display:inline-block; padding:0;margin: 15px 0px 29px;";
				label.dataset.keyname = i;
				var input = document.createElement("select");
				var c = document.createElement("option");

				var opt = new Option("Off", false);
				input.options.add(opt);
				opt = new Option("On", true);
				input.options.add(opt);

				if (getById("popupSelector_constraints_audio").style.display == "none") {
					getById("advancedOptionsAudio").style.display = "inline-block";
				}

				input.id = "constraints_" + i;
				input.className = "constraintCameraInput";
				input.name = "constraints_" + i;
				input.style = "display:inline; padding:2px; margin:0 10px;";
				input.dataset.keyname = i;
				input.onchange = function(e) {
					//getById("label_"+e.target.dataset.keyname).innerHTML =e.target.dataset.keyname+": "+e.target.value;
					//updateAudioConstraints(e.target.dataset.keyname, e.target.value);
					applyAudioHack(e.target.dataset.keyname, e.target.value);
					log(e.target.dataset.keyname, e.target.value);
				};
				getById("popupSelector_constraints_audio").appendChild(div);
				div.appendChild(label);
				div.appendChild(input);
			}
		} catch (e) {
			errorlog(e);
		}

	}
}


function applyAudioHack(constraint, value = null) {
	if (value == parseFloat(value)) {
		value = parseFloat(value);
		value = {
			exact: value
		};
	} else if (value == "true") {
		value = true;
	} else if (value == "false") {
		value = false;
	}
	log(constraint);
	////////////////
	try {
		var track0 = session.streamSrc.getAudioTracks();
		if (track0.length) {
			track0 = track0[0];
			if (track0.getCapabilities) {
				session.audioConstraints = track0.getCapabilities();
			}
			log(session.audioConstraints);
		} else {
			warnlog("session.streamSrc contains no audio tracks");
			return;
		}
	} catch (e) {
		warnlog("session.streamSrc contains no audio tracks");
		errorlog(e);
		return;
	}
	try {
		if (track0.getSettings) {
			session.currentAudioConstraints = track0.getSettings();
		}
	} catch (e) {
		errorlog(e);
	}
	////////
	
	var new_constraints = Object.assign(track0.getSettings(), {
		[constraint]: value
	}, );
	new_constraints = {
		audio: new_constraints
		, video: false
	};
	log(new_constraints);
	activatedPreview = false;
	enumerateDevices().then(gotDevices2).then(function() {
		grabAudio("videosource", "#audioSource3", null, new_constraints);
	});

}

function updateAudioConstraints(constraint, value = null) { // this is what it SHOULD be, but this doesn't work yet.
	var track0 = session.streamSrc.getAudioTracks();
	track0 = track0[0];
	if (value == parseFloat(value)) {
		value = parseFloat(value);
	} else if (value == "true") {
		value = true;
	} else if (value == "false") {
		value = false;
	}
	log({
		advanced: [{
			[constraint]: value
		}]
	});
	track0.applyConstraints({
		advanced: [{
			[constraint]: value
		}]
	});
	return;

}

var originalBitrate = session.totalRoomBitrate;

function listCameraSettings() {
	getById("popupSelector_constraints_video").innerHTML = "";

	if ((originalBitrate) && (session.roomid) && (session.view !== "") && (session.controlRoomBitrate)) {
		log("LISTING OPTION FOR BITRATE CONTROL");
		var i = "room video bitrate (kbps)";
		var label = document.createElement("label");
		label.id = "label_" + i;
		label.htmlFor = "constraints_" + i;
		label.innerHTML = i + ":";
		label.title = "If you're on a slow network, you can improve frame rate and audio quality by reducing the amount of video data that others send you";

		var input = document.createElement("input");
		input.min = 0;
		input.max = parseInt(originalBitrate);

		if (getById("popupSelector_constraints_video").style.display == "none") {
			getById("advancedOptionsCamera").style.display = "inline-block";
		}

		input.value = session.totalRoomBitrate;
		label.innerHTML = i + ": " + session.totalRoomBitrate;

		input.type = "range";
		input.dataset.keyname = i;
		input.id = "constraints_" + i;
		input.style = "display:block; width:100%;";
		input.name = "constraints_" + i;
		input.title = "If you're on a slow network, you can improve frame rate and audio quality by reducing the amount of video data that others send you";


		input.onchange = function(e) {
			getById("label_" + e.target.dataset.keyname).innerHTML = e.target.dataset.keyname + ": " + e.target.value;

			if (e.target.value > originalBitrate) {
				return;
			} else {
				session.totalRoomBitrate = parseInt(e.target.value);
			}
			updateMixer();
		};


		getById("popupSelector_constraints_video").appendChild(label);
		getById("popupSelector_constraints_video").appendChild(input);

	}
	try {
		var track0 = session.streamSrc.getVideoTracks();
		if (track0.length) {
			track0 = track0[0];
			if (track0.getCapabilities) {
				session.cameraConstraints = track0.getCapabilities();
			}
			log(session.cameraConstraints);
		}
	} catch (e) {
		errorlog(e);
		return;
	}

	try {

		if (track0.getSettings) {
			session.currentCameraConstraints = track0.getSettings();
		}
	} catch (e) {
		errorlog(e);
	}

	for (var i in session.cameraConstraints) {
		try {
			log(i);
			log(session.cameraConstraints[i]);
			if ((typeof session.cameraConstraints[i] === 'object') && (session.cameraConstraints[i] !== null) && ("max" in session.cameraConstraints[i]) && ("min" in session.cameraConstraints[i])) {
				if (i === "aspectRatio") {
					continue;
				} else if (i === "width") {
					continue;
				} else if (i === "height") {
					continue;
				} else if (i === "frameRate") {
					continue;
				}


				var label = document.createElement("label");
				label.id = "label_" + i;
				label.htmlFor = "constraints_" + i;
				label.innerHTML = i + ":";

				var input = document.createElement("input");
				input.min = session.cameraConstraints[i].min;
				input.max = session.cameraConstraints[i].max;

				if (parseFloat(input.min) == parseFloat(input.max)) {
					continue;
				}

				if (getById("popupSelector_constraints_video").style.display == "none") {
					getById("advancedOptionsCamera").style.display = "inline-block";
				}

				if (i in session.currentCameraConstraints) {
					input.value = session.currentCameraConstraints[i];
					label.innerHTML = i + ": " + session.currentCameraConstraints[i];
					label.title = "Previously was:  " + session.currentCameraConstraints[i];
					input.title = "Previously was:  " + session.currentCameraConstraints[i];
				} else {
					label.innerHTML = i;
				}
				if ("step" in session.cameraConstraints[i]) {
					input.step = session.cameraConstraints[i].step;
				}
				input.type = "range";
				input.dataset.keyname = i;
				input.id = "constraints_" + i;
				input.style = "display:block; width:100%;";
				input.name = "constraints_" + i;


				input.onchange = function(e) {
					getById("label_" + e.target.dataset.keyname).innerHTML = e.target.dataset.keyname + ": " + e.target.value;
					updateCameraConstraints(e.target.dataset.keyname, e.target.value);
				};


				getById("popupSelector_constraints_video").appendChild(label);
				getById("popupSelector_constraints_video").appendChild(input);
			} else if ((typeof session.cameraConstraints[i] === 'object') && (session.cameraConstraints[i] !== null)) {
				if (i == "resizeMode") {
					continue;
				}

				var div = document.createElement("div");
				var label = document.createElement("label");
				label.id = "label_" + i;
				label.htmlFor = "constraints_" + i;
				label.innerHTML = i + ":";
				label.style = "display:inline-block; padding:0;margin: 15px 0px 29px;";
				label.dataset.keyname = i;
				var input = document.createElement("select");
				var c = document.createElement("option");

				if (session.cameraConstraints[i].length > 1) {
					for (var opts in session.cameraConstraints[i]) {
						log(opts);
						var opt = new Option(session.cameraConstraints[i][opts], session.cameraConstraints[i][opts]);
						input.options.add(opt);
						if (i in session.currentCameraConstraints) {
							if (session.cameraConstraints[i][opts] == session.currentCameraConstraints[i]) {
								opt.selected = true;
							}
						}
					}
				} else if (i.toLowerCase == "torch") {
					var opt = new Option("Off", false);
					input.options.add(opt);
					opt = new Option("On", true);
					input.options.add(opt);
				} else {
					continue;
				}

				if (getById("popupSelector_constraints_video").style.display == "none") {
					getById("advancedOptionsCamera").style.display = "inline-block";
				}

				input.id = "constraints_" + i;
				input.className = "constraintCameraInput";
				input.name = "constraints_" + i;
				input.style = "display:inline; padding:2px; margin:0 10px;";
				input.dataset.keyname = i;
				input.onchange = function(e) {
					//getById("label_"+e.target.dataset.keyname).innerHTML =e.target.dataset.keyname+": "+e.target.value;
					updateCameraConstraints(e.target.dataset.keyname, e.target.value);
					log(e.target.dataset.keyname, e.target.value);
				};
				getById("popupSelector_constraints_video").appendChild(div);
				div.appendChild(label);
				div.appendChild(input);
			} else if (typeof session.cameraConstraints[i] === 'boolean') {

				var div = document.createElement("div");
				var label = document.createElement("label");
				label.id = "label_" + i;
				label.htmlFor = "constraints_" + i;
				label.innerHTML = i + ":";
				label.style = "display:inline-block; padding:0;margin: 15px 0px 29px;";
				label.dataset.keyname = i;
				var input = document.createElement("select");
				var c = document.createElement("option");

				var opt = new Option("Off", false);
				input.options.add(opt);
				opt = new Option("On", true);
				input.options.add(opt);

				if (getById("popupSelector_constraints_video").style.display == "none") {
					getById("advancedOptionsCamera").style.display = "inline-block";
				}

				input.id = "constraints_" + i;
				input.className = "constraintCameraInput";
				input.name = "constraints_" + i;
				input.style = "display:inline; padding:2px; margin:0 10px;";
				input.dataset.keyname = i;
				input.onchange = function(e) {
					//getById("label_"+e.target.dataset.keyname).innerHTML =e.target.dataset.keyname+": "+e.target.value;
					updateCameraConstraints(e.target.dataset.keyname, e.target.value);
					log(e.target.dataset.keyname, e.target.value);
				};
				getById("popupSelector_constraints_video").appendChild(div);
				div.appendChild(label);
				div.appendChild(input);
			}
		} catch (e) {
			errorlog(e);
		}

	}
}

function updateCameraConstraints(constraint, value = null) {
	var track0 = session.streamSrc.getVideoTracks();
	track0 = track0[0];
	if (value == parseFloat(value)) {
		value = parseFloat(value);
	} else if (value == "true") {
		value = true;
	} else if (value == "false") {
		value = false;
	}
	log({
		advanced: [{
			[constraint]: value
		}]
	});
	track0.applyConstraints({
		advanced: [{
			[constraint]: value
		}]
	});
	return;

}

function setupWebcamSelection(stream = null) {
	log("setup webcam");

	if (stream) {
		log(getById("previewWebcam"));
		session.streamSrc = stream;
		getById("previewWebcam").srcObject = outboundAudioPipeline(session.streamSrc);
		//session.videoElement = getById("previewWebcam");
	} else {
		log("THIS IS NO STREAM??");
	}

	if (!session.videoElement) {
		session.videoElement = getById("previewWebcam");
	}

	try {
		return enumerateDevices().then(gotDevices).then(function() {

			if (parseInt(getById("webcamquality").elements.namedItem("resolution").value) == 3) {
				if (session.maxframerate===false){
					session.maxframerate = 30;
					session.maxframerate_q2 = true;
				} 
			} else if (session.maxframerate_q2){
				session.maxframerate = false;
				session.maxframerate_q2 = false;
			}

			var audioSelect = document.querySelector('#audioSource');
			var videoSelect = document.querySelector('select#videoSourceSelect');
			var outputSelect = document.querySelector('select#outputSource');

			audioSelect.onchange = function() {

				var gowebcam = getById("gowebcam");
				if (gowebcam) {
					gowebcam.disabled = true;
					gowebcam.dataset.ready = "true";
					gowebcam.style.backgroundColor = "#DDDDDD";
					gowebcam.style.fontWeight = "normal";
					gowebcam.innerHTML = "Waiting for Camera to load";
					miniTranslate(gowebcam, "waiting-for-camera-to-load");
				}
				activatedPreview = false;
				grabAudio();
			};
			videoSelect.onchange = function() {

				var gowebcam = getById("gowebcam");
				if (gowebcam) {
					gowebcam.disabled = true;
					gowebcam.dataset.ready = "true";
					gowebcam.style.backgroundColor = "#DDDDDD";
					gowebcam.style.fontWeight = "normal";
					gowebcam.innerHTML = "Waiting for Camera to load";
					miniTranslate(gowebcam, "waiting-for-camera-to-load");
				}
				warnlog("video source changed");

				activatedPreview = false;
				if (session.quality !== false) {
					grabVideo(session.quality);
				} else {
					session.quality_wb = parseInt(getById("webcamquality").elements.namedItem("resolution").value);
					grabVideo(session.quality_wb);
				}
			};

			outputSelect.onchange = function() {

				if ((iOS) || (iPad)) {
					return;
				}

				session.sink = outputSelect.options[outputSelect.selectedIndex].value;
				//if (session.sink=="default"){session.sink=false;} else {
				getById("previewWebcam").setSinkId(session.sink).then(() => {
					log("New Output Device:" + session.sink);
				}).catch(error => {
					errorlog("6597");
					errorlog(error);
					//setTimeout(function(){warnUser("Failed to change audio output destination.");},1);
				});
				//}
			}

			getById("webcamquality").onchange = function() {
				var gowebcam = getById("gowebcam");
				if (gowebcam) {
					gowebcam.disabled = true;
					gowebcam.dataset.ready = "true";
					gowebcam.style.backgroundColor = "#DDDDDD";
					gowebcam.style.fontWeight = "normal";
					gowebcam.innerHTML = "Waiting for Camera to load";
					miniTranslate(gowebcam, "waiting-for-camera-to-load");
				}

				if (parseInt(getById("webcamquality").elements.namedItem("resolution").value) == 2) {
					if (session.maxframerate===false){
						session.maxframerate = 30;
						session.maxframerate_q2 = true;
					} 
				} else if (session.maxframerate_q2){
					session.maxframerate = false;
					session.maxframerate_q2 = false;
				}

				activatedPreview = false;
				session.quality_wb = parseInt(getById("webcamquality").elements.namedItem("resolution").value);
				grabVideo(session.quality_wb);
			};

			if ((session.audioDevice) && (session.audioDevice !== 1)) { // change from Auto to Selected Audio Device
				log("SETTING AUDIO DEVICE!!");
				activatedPreview = false;
				grabAudio();
			}

			if (session.videoDevice === 0) {
				if (session.autostart) {
					publishWebcam(); // no need to mirror as there is no video...
					return;
				} else {
					var gowebcam = getById("gowebcam");
					if (gowebcam) {
						gowebcam.disabled = false;
						gowebcam.dataset.ready = "true";
						gowebcam.innerHTML = "START";
						miniTranslate(gowebcam, "start");
					}
					return;
				}
			} else {
				log("GRabbing video: " + session.quality);
				activatedPreview = false;
				if (session.quality !== false) {
					grabVideo(session.quality);
				} else {
					session.quality_wb = parseInt(getById("webcamquality").elements.namedItem("resolution").value);
					grabVideo(session.quality_wb);
				}
			}

			if ((iOS) || (iPad)) {

				return;
			}
			if (outputSelect.selectedIndex >= 0) {
				session.sink = outputSelect.options[outputSelect.selectedIndex].value;
			}
			if (document.getElementById("previewWebcam") && document.getElementById("previewWebcam").setSinkId) {
				if (session.sink) {
					getById("previewWebcam").setSinkId(session.sink).then(() => {}).catch(error => {
						warnlog("6665");
						warnlog(error);
					});
				}
			}

		}).catch(e => {
			errorlog(e);
		});
	} catch (e) {
		errorlog(e);
	}
}

Promise.wait = function(ms) {
	return new Promise(function(resolve) {
		setTimeout(resolve, ms);
	});
};

Promise.prototype.timeout = function(ms) {
	return Promise.race([
		this, Promise.wait(ms).then(function() {
			var errormsg = new Error("Time Out\nDid you accept camera permissions in time? Please do so first.\n\nOtherwise, do you have NDI Tools installed? Maybe try uninstalling it.\n\nPlease also ensure your camera and audio device are correctly connected and not already in use. You may also need to refresh the page.");
			errormsg.name = "timedOut";
			errormsg.message = "Time Out\nDid you accept camera permissions in time? Please do so first.\n\nOtherwise, do you have NDI Tools installed? Maybe try uninstalling it.\n\nPlease also ensure your camera and audio device are correctly connected and not already in use. You may also need to refresh the page."
			throw errormsg;

		})
	])
};

function createIframePopup() {

	if (session.screenShareElement) {
		session.screenShareElement.contentWindow.postMessage({
			"close": true
		}, '*');
		session.screenShareElement.parentNode.removeChild(session.screenShareElement);
		session.screenShareElement = false;
		updateMixer();
		getById("screenshare2button").classList.add("float");
		getById("screenshare2button").classList.remove("float2");
		return;
	}
	
	if (session.screenshareid) {
		var iFrameID = session.screenshareid;
	} else {
		var iFrameID = session.streamID.substring(0, 12) + "_" + session.generateStreamID(5);
	}

	if (session.exclude) {
		session.exclude.push(iFrameID);
	} else {
		session.exclude = [];
		session.exclude.push(iFrameID);
	}

	var iframe = document.createElement("iframe");
	iframe.allow = "autoplay";
	iframe.allowtransparency = "true";
	
	var extras = "";
	if (session.password){
		extras += "&password=" + session.password; // encodeURIComponent(
	}
	
	if (session.privacy){
		extras += "&privacy"; 
	}
	
	if (session.quality){
		extras += "&q="+session.quality;
	} else {
		extras += "&q=0";
	}
	
	if (session.muted){
		iframe.src = "./?audiodevice=1&screenshare&transparent&cleanoutput&noheader&autostart&view&muted&room=" + session.roomid + "&push=" + iFrameID + extras;
	} else {
		iframe.src = "./?audiodevice=1&screenshare&transparent&cleanoutput&noheader&autostart&view&room=" + session.roomid + "&push=" + iFrameID + extras;
	}
	
	iframe.style.width = "100%";
	iframe.style.height = "100%";
	iframe.style.overflow = "hidden";
	iframe.id = "screensharesource";
	iframe.style.zIndex = "-1";


	session.screenShareElement = iframe;
	session.screenShareElement.dataset.doNotMove = true;


	document.getElementById("main").appendChild(iframe);


	updateMixer();
	getById("screenshare2button").classList.add("float2");
	getById("screenshare2button").classList.remove("float");

	return; // ignore the rest.
}

function previewWebcam() {

	if (session.taintedSession === null) {
		log("STILL WAITING ON HASH TO VALIDATE");
		setTimeout(function() {
			previewWebcam();
		}, 1000);
		return;
	} else if (session.taintedSession === true) {
		warnlog("HASH FAILED; PASSWORD NOT VALID");
		return;
	} else {
		log("NOT TAINTED");
	}

	if (activatedPreview == true) {
		log("activeated preview return 1");
		return;
	}
	activatedPreview = true;

	if (session.audioDevice === 0) { // OFF
		var constraint = {
			audio: false
		};
	} else if ((session.echoCancellation !== false) && (session.autoGainControl !== false) && (session.noiseSuppression !== false)) { // AUTO
		var constraint = {
			audio: true
		};
	} else { // Disable Echo Cancellation and stuff for the PREVIEW (DEFAULT CAM/MIC)
		var constraint = {
			audio: {}
		};
		if (session.echoCancellation !== false) { // if not disabled, we assume it's on
			constraint.audio.echoCancellation = true;
		} else {
			constraint.audio.echoCancellation = false;
		}
		if (session.autoGainControl !== false) {
			constraint.audio.autoGainControl = true;
		} else {
			constraint.audio.autoGainControl = false;
		}
		if (session.noiseSuppression !== false) {
			constraint.audio.noiseSuppression = true;
		} else {
			constraint.audio.noiseSuppression = false;
		}
	}

	if (session.videoDevice === 0) {
		constraint.video = false;
	} else {
		constraint.video = true;
	}

	if ((constraint.video === false) && (constraint.audio === false)){
		
		if (session.autostart) {
			publishWebcam(); // no need to mirror as there is no video...
			return;
		} else {
			var gowebcam = document.getElementById("gowebcam");
			getById("getPermissions").style.display = "none";
			if (gowebcam) {
				gowebcam.style.display = "";
				gowebcam.disabled = false;
				gowebcam.dataset.ready = "true";
				gowebcam.innerHTML = "START";
				miniTranslate(gowebcam, "start");
			}
		}
		return;
	}

	enumerateDevices().then(function(devices) {
		log("enumeratated");
		log(devices);
		var vtrue = false;
		var atrue = false;
		devices.forEach(function(device) {
			if (device.kind === 'audioinput') {
				atrue = true;
			} else if (device.kind === 'videoinput') {
				vtrue = true;
			}
		});
		if (atrue === false) {
			constraint.audio = false;
		}
		if (vtrue === false) {
			constraint.video = false;
		}
		setTimeout(function(constraint) {
			requestBasicPermissions(constraint);
		}, 0, constraint);
	}).catch((error) => {
		log("enumeratated failed. Seeking permissions.");
		setTimeout(function(constraint) {
			requestBasicPermissions(constraint);
		}, 0, constraint);
	});
	
}

function requestBasicPermissions(constraint = {
	video: true
	, audio: true
}) {
	if (session.taintedSession === null) {
		log("STILL WAITING ON HASH TO VALIDATE");
		setTimeout(function(constraint) {
			requestBasicPermissions(constraint);
		}, 1000, constraint);
		return;
	} else if (session.taintedSession === true) {
		warnlog("HASH FAILED; PASSWORD NOT VALID");
		return;
	} else {
		log("NOT TAINTED 1");
	}
	setTimeout(function() {
		getById("getPermissions").style.display = "none";
		getById("gowebcam").style.display = "";
	}, 0);
	log("REQUESTING BASIC PERMISSIONS");

	try {
		var timerBasicCheck = null;
		if (!(session.cleanOutput)) {
			log("Setting Timer for getUserMedia");
			timerBasicCheck = setTimeout(function() {
				if (!(session.cleanOutput)) {
					warnUser("Camera Access Request Timed Out\nDid you accept camera permissions? Please do so first.\n\nOtherwise, do you have NDI Tools installed? Maybe try uninstalling NDI tools.\n\nPlease also ensure that your camera and audio devices are correctly connected and not already in use. You may also need to refresh the page.");
				}
			}, 10000);
		}

		if (session.audioInputChannels) {
			if (constraint.audio === true) {
				constraint.audio = {};
				constraint.audio.channelCount = session.audioInputChannels;
			} else if (constraint.audio) {
				constraint.audio.channelCount = session.audioInputChannels;
			}
		}

		log("CONSTRAINT");
		log(constraint);
		navigator.mediaDevices.getUserMedia(constraint).then(function(stream) { // Apple needs thi to happen before I can access EnumerateDevices. 
			log("got first stream");
			clearTimeout(timerBasicCheck);
			setupWebcamSelection(stream);
		}).catch(function(err) {
			clearTimeout(timerBasicCheck);
			warnlog("some error with GetUSERMEDIA");
			errorlog(err); /* handle the error */
			if (err.name == "NotFoundError" || err.name == "DevicesNotFoundError") {
				//required track is missing 
			} else if (err.name == "NotReadableError" || err.name == "TrackStartError") {
				//webcam or mic are already in use 
			} else if (err.name == "OverconstrainedError" || err.name == "ConstraintNotSatisfiedError") {
				//constraints can not be satisfied by avb. devices 
			} else if (err.name == "NotAllowedError" || err.name == "PermissionDeniedError") {
				//permission denied in browser 
				if (!(session.cleanOutput)) {
					setTimeout(function() {
						warnUser("Permissions denied. Please ensure you have allowed the mic/camera permissions.");
					}, 1);
				}
				return;
			} else if (err.name == "TypeError" || err.name == "TypeError") {
				//empty constraints object 
			} else {
				//permission denied in browser 
				if (!(session.cleanOutput)) {
					setTimeout(function() {
						warnUser(err);
					}, 1);
				}
			}
			errorlog("trying to list webcam again");
			setupWebcamSelection();
		});
	} catch (e) {
		errorlog(e);
		if (!(session.cleanOutput)) {
			if (window.isSecureContext) {
				warnUser("An error has occured when trying to access the webcam or microphone. The reason is not known.");
			} else if ((iOS) || (iPad)) {
				warnUser("iOS version 13.4 and up is generally recommended; older than iOS 11 is not supported.");
			} else {
				warnUser("Error acessing camera or microphone.\n\nThe website may be loaded in an insecure context.\n\nPlease see: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia");
			}
		}
	}
}


function copyFunction(copyText) {

	try {
		copyText.select();
		copyText.setSelectionRange(0, 99999);
		document.execCommand("copy");
	} catch (e) {
		var dummy = document.createElement('input');
		document.body.appendChild(dummy);
		dummy.value = copyText;
		dummy.select();
		document.execCommand('copy');
		document.body.removeChild(dummy);
		return false;
	}
}

function generateQRPage() {
	var pass = sanitizePassword(getById("invite_password").value);
	if (pass.length) {
		return session.generateHash(pass + session.salt, 4).then(function(hash) {
			generateQRPageCallback(hash);
		});
	} else {
		generateQRPageCallback("");
	}
}

function updateLinkWebP(arg, input) {
	if (input.checked){
		if (!((getById("director_block_" + arg).dataset.raw.includes("&broadcast")) || (getById("director_block_" + arg).dataset.raw.includes("?broadcast")))){
			getById("broadcastSlider").checked=true;
			updateLink(arg, getById("broadcastSlider"));
		}
	}
	updateLink(arg, input);
}

function updateLink(arg, input) {
	log(input.dataset.param);
	if (input.checked) {

		getById("director_block_" + arg).dataset.raw += input.dataset.param;

		var string = getById("director_block_" + arg).dataset.raw;

		if (getById("obfuscate_director_" + arg).checked) {
			string = obfuscateURL(string);
		}


		getById("director_block_" + arg).href = string;
		getById("director_block_" + arg).innerText = string;
	} else {
		var string = getById("director_block_" + arg).dataset.raw + "&";
		string = string.replace(input.dataset.param + "&", "&");
		string = string.substring(0, string.length - 1);
		getById("director_block_" + arg).dataset.raw = string;

		if (getById("obfuscate_director_" + arg).checked) {
			string = obfuscateURL(string);
		}

		getById("director_block_" + arg).href = string;
		getById("director_block_" + arg).innerText = string;
	}
}


function updateLinkInverse(arg, input) {
	log(input.dataset.param);
	if (!(input.checked)) {

		getById("director_block_" + arg).dataset.raw += input.dataset.param;

		var string = getById("director_block_" + arg).dataset.raw;

		if (getById("obfuscate_director_" + arg).checked) {
			string = obfuscateURL(string);
		}


		getById("director_block_" + arg).href = string;
		getById("director_block_" + arg).innerText = string;
	} else {
		var string = getById("director_block_" + arg).dataset.raw + "&";
		string = string.replace(input.dataset.param + "&", "&");
		string = string.substring(0, string.length - 1);
		getById("director_block_" + arg).dataset.raw = string;

		if (getById("obfuscate_director_" + arg).checked) {
			string = obfuscateURL(string);
		}

		getById("director_block_" + arg).href = string;
		getById("director_block_" + arg).innerText = string;
	}
}

function updateLinkScene(arg, input) {
	var string = getById("director_block_" + arg).dataset.raw;

	if (input.checked) {
		string = changeParam(string, "scene", "0");
	} else {
		string = changeParam(string, "scene", "1");
	}
	getById("director_block_" + arg).dataset.raw = string;

	if (getById("obfuscate_director_" + arg).checked) {
		string = obfuscateURL(string);
	}

	getById("director_block_" + arg).href = string;
	getById("director_block_" + arg).innerText = string;
}

function resetGen() {
	getById("gencontent").style.display = "block";
	getById("gencontent2").style.display = "none";
	getById("gencontent2").className = ""; //container-inner
	getById("gencontent").className = "container-inner"; //
	getById("gencontent2").innerHTML = "";
	getById("videoname4").focus();
}

function generateQRPageCallback(hash) {
	try {
		var title = getById("videoname4").value;
		if (title.length) {
			title = title.replace(/[\W]+/g, "_").replace(/_+/g, '_'); // but not what others might get.
			title = "&label=" + title;
		}
		var sid = session.generateStreamID();

		var viewstr = "";
		var sendstr = "";

		if (getById("invite_bitrate").checked) {
			viewstr += "&bitrate=20000";
		}
		if (getById("invite_vp9").checked) {
			viewstr += "&codec=vp9";
		}
		if (getById("invite_stereo").checked) {
			viewstr += "&stereo";
			sendstr += "&stereo";
		}
		if (getById("invite_automic").checked) {
			sendstr += "&audiodevice=1";
		}
		if (getById("invite_hidescreen").checked) {
			sendstr += "&webcam";
		}

		if (getById("invite_remotecontrol").checked) { //
			var remote_gen_id = session.generateStreamID();
			sendstr += "&remote=" + remote_gen_id; // security
			viewstr += "&remote=" + remote_gen_id;
		}

		if (getById("invite_joinroom").value.trim().length) {
			sendstr += "&room=" + getById("invite_joinroom").value.trim();
			viewstr += "&scene&room=" + getById("invite_joinroom").value.trim();
		}

		if (getById("invite_password").value.trim().length) {
			sendstr += "&hash=" + hash;
			viewstr += "&password=" + getById("invite_password").value.trim();
		}


		if (getById("invite_group_chat_type").value) { //  0 is default
			if (getById("invite_group_chat_type").value == 1) { // no video
				sendstr += "&novideo";
			} else if (getById("invite_group_chat_type").value == 2) { // no view or audio
				sendstr += "&view";
			}
		}

		if (getById("invite_quality").value) {
			if (getById("invite_quality").value == 0) {
				sendstr += "&quality=0";
			} else if (getById("invite_quality").value == 1) {
				sendstr += "&quality=1";
			} else if (getById("invite_quality").value == 2) {
				sendstr += "&quality=2";
			}
		}

		sendstr = 'https://' + location.host + location.pathname + '?push=' + sid + sendstr + title;

		if (getById("invite_obfuscate").checked) {
			sendstr = obfuscateURL(sendstr);
		}

		viewstr = 'https://' + location.host + location.pathname + '?view=' + sid + viewstr + title;
		getById("gencontent").style.display = "none";
		getById("gencontent").className = ""; //
		getById("gencontent2").style.display = "block";
		getById("gencontent2").className = "container-inner"; //
		getById("gencontent2").innerHTML = '<br /><div id="qrcode" style="background-color:white;display:inline-block;color:black;max-width:380px;padding:35px 40px 40px 40px;">\
		<h2 style="margin:0 0 8px 0;color:black"  data-translate="invite-link">Guest Invite Link:</h2>\
		<a class="task grabLinks" title="Click to copy guest invite link to clipboard" onclick="popupMessage(event);copyFunction(this)" onmousedown="copyFunction(this)"  \
		style="word-break: break-all;cursor:copy;background-color:#CFC;border: 2px solid black;width:300px;padding:8px;margin:0px;color:#000;"  href="' + sendstr + '" >' + sendstr + ' <i class="las la-paperclip" style="cursor:pointer"></i></a><br /><br /></div>\
			<br /><br />and don\'t forget the<h2 style="color:black">OBS Browser Source Link:</h2><a class="task grabLinks" title="Click to copy or just Drag the link directly into OBS" data-drag="1" onmousedown="copyFunction(this)" onclick="popupMessage(event);copyFunction(this)"  style="word-break: break-all;margin:0px;cursor:grab;background-color:#FCC;width:380px;padding:10px;border:2px solid black;margin:5px;color:#000;" href="' + viewstr + '" >' + viewstr + ' <i class="las la-paperclip" style="cursor:pointer"></i></a> \
			<br /><br />\
		<span data-translate="please-note-invite-ingestion-link">This invite link and OBS ingestion link are reusable. Only one person may use a specific invite at a time.</span><br /><br /><button onclick="resetGen();" style="font-size:1.2em;paddding:5px;"><i class="las la-redo-alt"></i> Create Another Invite Link</button>';
		var qrcode = new QRCode(getById("qrcode"), {
			width: 300
			, height: 300
			, colorDark: "#000000"
			, colorLight: "#FFFFFF"
			, useSVG: false
		});
		qrcode.makeCode(sendstr);
		setTimeout(function() {
			getById("qrcode").title = "";
			if (getById("qrcode").getElementsByTagName('img').length) {
				getById("qrcode").getElementsByTagName('img')[0].style.cursor = "none";
			}
		}, 100); // i really hate the title overlay that the qrcode function makes

	} catch (e) {
		errorlog(e);
	}
}


if (session.view) {
	getById("main").className = "";
	getById("credits").style.display = 'none';
	try {
		if (session.label === false) {
			if (document.title == "") {
				document.title = "View=" + session.view.toString();
			} else {
				document.title += ", View=" + session.view.toString();
			}
		}
	} catch (e) {
		errorlog(e);
	};
}

function safariVersion() {
	try {
		var ver = navigator.appVersion.split("Version/");
		if (ver.length > 1) {
			ver = ver[1].split(" Safari");
		}
		if (ver.length > 1) {
			ver = ver[0].split(".");
		}
		if (ver.length > 1) {
			ver = parseInt(ver[0]);
		} else {
			ver = 0;
		}
	} catch (e) {
		return 0;
	}
	return ver;
}

if ((session.view) && (session.roomid === false)) {
	getById("container-4").className = 'column columnfade';
	getById("container-3").className = 'column columnfade';
	getById("container-2").className = 'column columnfade';
	getById("container-1").className = 'column columnfade';
	//getById("header").className = 'advanced';
	getById("info").className = 'advanced';
	getById("header").className = 'advanced';
	getById("head1").className = 'advanced';
	getById("head2").className = 'advanced';
	getById("head3").className = 'advanced';
	

	getById("mainmenu").style.backgroundRepeat = "no-repeat";
	getById("mainmenu").style.backgroundPosition = "bottom center";
	getById("mainmenu").style.minHeight = "300px";
	getById("mainmenu").style.backgroundSize = "100px 100px";
	getById("mainmenu").innerHTML = '';

	setTimeout(function() {
		try {
			if ((session.view) && (!(session.cleanOutput))) {
				if (document.getElementById("mainmenu")) {
					getById("mainmenu").style.backgroundImage = "url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/Pgo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPgo8c3ZnIHdpZHRoPSI0MHB4IiBoZWlnaHQ9IjQwcHgiIHZpZXdCb3g9IjAgMCA0MCA0MCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4bWw6c3BhY2U9InByZXNlcnZlIiBzdHlsZT0iZmlsbC1ydWxlOmV2ZW5vZGQ7Y2xpcC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlLWxpbmVqb2luOnJvdW5kO3N0cm9rZS1taXRlcmxpbWl0OjEuNDE0MjE7IiB4PSIwcHgiIHk9IjBweCI+CiAgICA8ZGVmcz4KICAgICAgICA8c3R5bGUgdHlwZT0idGV4dC9jc3MiPjwhW0NEQVRBWwogICAgICAgICAgICBALXdlYmtpdC1rZXlmcmFtZXMgc3BpbiB7CiAgICAgICAgICAgICAgZnJvbSB7CiAgICAgICAgICAgICAgICAtd2Via2l0LXRyYW5zZm9ybTogcm90YXRlKDBkZWcpCiAgICAgICAgICAgICAgfQogICAgICAgICAgICAgIHRvIHsKICAgICAgICAgICAgICAgIC13ZWJraXQtdHJhbnNmb3JtOiByb3RhdGUoLTM1OWRlZykKICAgICAgICAgICAgICB9CiAgICAgICAgICAgIH0KICAgICAgICAgICAgQGtleWZyYW1lcyBzcGluIHsKICAgICAgICAgICAgICBmcm9tIHsKICAgICAgICAgICAgICAgIHRyYW5zZm9ybTogcm90YXRlKDBkZWcpCiAgICAgICAgICAgICAgfQogICAgICAgICAgICAgIHRvIHsKICAgICAgICAgICAgICAgIHRyYW5zZm9ybTogcm90YXRlKC0zNTlkZWcpCiAgICAgICAgICAgICAgfQogICAgICAgICAgICB9CiAgICAgICAgICAgIHN2ZyB7CiAgICAgICAgICAgICAgICAtd2Via2l0LXRyYW5zZm9ybS1vcmlnaW46IDUwJSA1MCU7CiAgICAgICAgICAgICAgICAtd2Via2l0LWFuaW1hdGlvbjogc3BpbiAxLjVzIGxpbmVhciBpbmZpbml0ZTsKICAgICAgICAgICAgICAgIC13ZWJraXQtYmFja2ZhY2UtdmlzaWJpbGl0eTogaGlkZGVuOwogICAgICAgICAgICAgICAgYW5pbWF0aW9uOiBzcGluIDEuNXMgbGluZWFyIGluZmluaXRlOwogICAgICAgICAgICB9CiAgICAgICAgXV0+PC9zdHlsZT4KICAgIDwvZGVmcz4KICAgIDxnIGlkPSJvdXRlciI+CiAgICAgICAgPGc+CiAgICAgICAgICAgIDxwYXRoIGQ9Ik0yMCwwQzIyLjIwNTgsMCAyMy45OTM5LDEuNzg4MTMgMjMuOTkzOSwzLjk5MzlDMjMuOTkzOSw2LjE5OTY4IDIyLjIwNTgsNy45ODc4MSAyMCw3Ljk4NzgxQzE3Ljc5NDIsNy45ODc4MSAxNi4wMDYxLDYuMTk5NjggMTYuMDA2MSwzLjk5MzlDMTYuMDA2MSwxLjc4ODEzIDE3Ljc5NDIsMCAyMCwwWiIgc3R5bGU9ImZpbGw6YmxhY2s7Ii8+CiAgICAgICAgPC9nPgogICAgICAgIDxnPgogICAgICAgICAgICA8cGF0aCBkPSJNNS44NTc4Niw1Ljg1Nzg2QzcuNDE3NTgsNC4yOTgxNSA5Ljk0NjM4LDQuMjk4MTUgMTEuNTA2MSw1Ljg1Nzg2QzEzLjA2NTgsNy40MTc1OCAxMy4wNjU4LDkuOTQ2MzggMTEuNTA2MSwxMS41MDYxQzkuOTQ2MzgsMTMuMDY1OCA3LjQxNzU4LDEzLjA2NTggNS44NTc4NiwxMS41MDYxQzQuMjk4MTUsOS45NDYzOCA0LjI5ODE1LDcuNDE3NTggNS44NTc4Niw1Ljg1Nzg2WiIgc3R5bGU9ImZpbGw6cmdiKDIxMCwyMTAsMjEwKTsiLz4KICAgICAgICA8L2c+CiAgICAgICAgPGc+CiAgICAgICAgICAgIDxwYXRoIGQ9Ik0yMCwzMi4wMTIyQzIyLjIwNTgsMzIuMDEyMiAyMy45OTM5LDMzLjgwMDMgMjMuOTkzOSwzNi4wMDYxQzIzLjk5MzksMzguMjExOSAyMi4yMDU4LDQwIDIwLDQwQzE3Ljc5NDIsNDAgMTYuMDA2MSwzOC4yMTE5IDE2LjAwNjEsMzYuMDA2MUMxNi4wMDYxLDMzLjgwMDMgMTcuNzk0MiwzMi4wMTIyIDIwLDMyLjAxMjJaIiBzdHlsZT0iZmlsbDpyZ2IoMTMwLDEzMCwxMzApOyIvPgogICAgICAgIDwvZz4KICAgICAgICA8Zz4KICAgICAgICAgICAgPHBhdGggZD0iTTI4LjQ5MzksMjguNDkzOUMzMC4wNTM2LDI2LjkzNDIgMzIuNTgyNCwyNi45MzQyIDM0LjE0MjEsMjguNDkzOUMzNS43MDE5LDMwLjA1MzYgMzUuNzAxOSwzMi41ODI0IDM0LjE0MjEsMzQuMTQyMUMzMi41ODI0LDM1LjcwMTkgMzAuMDUzNiwzNS43MDE5IDI4LjQ5MzksMzQuMTQyMUMyNi45MzQyLDMyLjU4MjQgMjYuOTM0MiwzMC4wNTM2IDI4LjQ5MzksMjguNDkzOVoiIHN0eWxlPSJmaWxsOnJnYigxMDEsMTAxLDEwMSk7Ii8+CiAgICAgICAgPC9nPgogICAgICAgIDxnPgogICAgICAgICAgICA8cGF0aCBkPSJNMy45OTM5LDE2LjAwNjFDNi4xOTk2OCwxNi4wMDYxIDcuOTg3ODEsMTcuNzk0MiA3Ljk4NzgxLDIwQzcuOTg3ODEsMjIuMjA1OCA2LjE5OTY4LDIzLjk5MzkgMy45OTM5LDIzLjk5MzlDMS43ODgxMywyMy45OTM5IDAsMjIuMjA1OCAwLDIwQzAsMTcuNzk0MiAxLjc4ODEzLDE2LjAwNjEgMy45OTM5LDE2LjAwNjFaIiBzdHlsZT0iZmlsbDpyZ2IoMTg3LDE4NywxODcpOyIvPgogICAgICAgIDwvZz4KICAgICAgICA8Zz4KICAgICAgICAgICAgPHBhdGggZD0iTTUuODU3ODYsMjguNDkzOUM3LjQxNzU4LDI2LjkzNDIgOS45NDYzOCwyNi45MzQyIDExLjUwNjEsMjguNDkzOUMxMy4wNjU4LDMwLjA1MzYgMTMuMDY1OCwzMi41ODI0IDExLjUwNjEsMzQuMTQyMUM5Ljk0NjM4LDM1LjcwMTkgNy40MTc1OCwzNS43MDE5IDUuODU3ODYsMzQuMTQyMUM0LjI5ODE1LDMyLjU4MjQgNC4yOTgxNSwzMC4wNTM2IDUuODU3ODYsMjguNDkzOVoiIHN0eWxlPSJmaWxsOnJnYigxNjQsMTY0LDE2NCk7Ii8+CiAgICAgICAgPC9nPgogICAgICAgIDxnPgogICAgICAgICAgICA8cGF0aCBkPSJNMzYuMDA2MSwxNi4wMDYxQzM4LjIxMTksMTYuMDA2MSA0MCwxNy43OTQyIDQwLDIwQzQwLDIyLjIwNTggMzguMjExOSwyMy45OTM5IDM2LjAwNjEsMjMuOTkzOUMzMy44MDAzLDIzLjk5MzkgMzIuMDEyMiwyMi4yMDU4IDMyLjAxMjIsMjBDMzIuMDEyMiwxNy43OTQyIDMzLjgwMDMsMTYuMDA2MSAzNi4wMDYxLDE2LjAwNjFaIiBzdHlsZT0iZmlsbDpyZ2IoNzQsNzQsNzQpOyIvPgogICAgICAgIDwvZz4KICAgICAgICA8Zz4KICAgICAgICAgICAgPHBhdGggZD0iTTI4LjQ5MzksNS44NTc4NkMzMC4wNTM2LDQuMjk4MTUgMzIuNTgyNCw0LjI5ODE1IDM0LjE0MjEsNS44NTc4NkMzNS43MDE5LDcuNDE3NTggMzUuNzAxOSw5Ljk0NjM4IDM0LjE0MjEsMTEuNTA2MUMzMi41ODI0LDEzLjA2NTggMzAuMDUzNiwxMy4wNjU4IDI4LjQ5MzksMTEuNTA2MUMyNi45MzQyLDkuOTQ2MzggMjYuOTM0Miw3LjQxNzU4IDI4LjQ5MzksNS44NTc4NloiIHN0eWxlPSJmaWxsOnJnYig1MCw1MCw1MCk7Ii8+CiAgICAgICAgPC9nPgogICAgPC9nPgo8L3N2Zz4K')";
					getById("mainmenu").innerHTML = '<font style="color:#666"><h1 data-translate="attempting-to-load">Attempting to load video stream.</h1></font>';
					getById("mainmenu").innerHTML += '<font style="color:#EEE" data-translate="stream-not-available-yet">The stream is not available yet or an error occured.</font><br/><button onclick="location.reload();" data-translate="try-manually">Retry Manually</button><br/>';

				}
			}
		} catch (e) {
			errorlog("Error handling QR Code failure");
		}
	}, 15000);

	log("auto playing");
	var SafariVer = safariVersion();
	if ((iPad || iOS) && navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1 && SafariVer > 13) { // Modern iOS doesn't need pop up
		play();
	} else if (navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1) { // Safari on Desktop does require pop up
		if (!(session.cleanOutput)) {
			warnUser("Safari requires us to ask for an audio permission to use peer-to-peer technology. You will need to accept it in a moment if asked to view this live video", 20000);
		}
		navigator.mediaDevices.getUserMedia({
			audio: true
		}).then(function() {
			closeModal();
			play();
		}).catch(function() {
			play();
		});
	} else { // everything else is OK.
		play();
	}
} else if (session.roomid) {
	try {
		if (session.label === false) {
			if (document.title == "") {
				document.title = "Room=" + session.roomid.toString();
			} else {
				document.title += ": " + session.roomid.toString();
			}
		}
	} catch (e) {
		errorlog(e);
	};

}


var vis = (function() {
	var stateKey, eventKey, keys = {
		hidden: "visibilitychange"
		, webkitHidden: "webkitvisibilitychange"
		, mozHidden: "mozvisibilitychange"
		, msHidden: "msvisibilitychange"
	};
	for (stateKey in keys) {
		if (stateKey in document) {
			eventKey = keys[stateKey];
			break;
		}
	}
	return function(c) {
		if (c) {
			document.addEventListener(eventKey, c);
			//document.addEventListener("blur", c);
			//document.addEventListener("focus", c);
		}
		return !document[stateKey];
	};
})();

(function rightclickmenuthing() { // right click menu
	"use strict";

	function clickInsideElement(e, className) {
		var el = e.srcElement || e.target;

		if (el.classList.contains(className)) {
			return el;
		} else {
			while (el = el.parentNode) {
				if (el.classList && el.classList.contains(className)) {
					return el;
				}
			}
		}

		return false;
	}

	function getPosition(event2) {
		var posx = 0;
		var posy = 0;

		if (!event2) var event = window.event;

		if (event2.pageX || event2.pageY) {
			posx = event2.pageX;
			posy = event2.pageY;
		} else if (event2.clientX || event2.clientY) {
			posx = event2.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
			posy = event2.clientY + document.body.scrollTop + document.documentElement.scrollTop;
		}

		return {
			x: posx
			, y: posy
		};
	}
	var contextMenuClassName = "context-menu";
	var contextMenuItemClassName = "context-menu__item";
	var contextMenuLinkClassName = "context-menu__link";
	var contextMenuActive = "context-menu--active";

	var taskItemClassName = "task";
	var taskItemInContext;

	var clickCoords;
	var clickCoordsX;
	var clickCoordsY;

	var menu = document.querySelector("#context-menu");
	var menuItems = menu.querySelectorAll(".context-menu__item");
	var menuState = 0;
	var menuWidth;
	var menuHeight;
	var menuPosition;
	var menuPositionX;
	var menuPositionY;

	var windowWidth;
	var windowHeight;

	function init() {
		contextListener();
		clickListener();
		keyupListener();
		resizeListener();
	}

	function contextListener() {
		document.addEventListener("contextmenu", function(e) {
			taskItemInContext = clickInsideElement(e, taskItemClassName);

			if (taskItemInContext) {
				e.preventDefault();
				toggleMenuOn();
				positionMenu(e);
			} else {
				taskItemInContext = null;
				toggleMenuOff();
			}
		});
	}

	function clickListener() {
		document.addEventListener("click", function(e) {
			var clickeElIsLink = clickInsideElement(e, contextMenuLinkClassName);

			if (clickeElIsLink) {
				e.preventDefault();
				menuItemListener(clickeElIsLink);
			} else {
				var button = e.which || e.button;
				if (button === 1) {
					toggleMenuOff();
				}
			}
		});
	}

	function keyupListener() {
		window.onkeyup = function(e) {
		//  if ( e.keyCode === 27 ) {
		//    toggleMenuOff();
		//  }
			if (e.altKey && e.shiftKey && e.keyCode === 67 /* C */) {
				toggleControlBar();
			}
		};
	}

	function resizeListener() {
		//window.onresize = function(e) {
		//    toggleMenuOff();
		//  };
	}

	function toggleMenuOn() {
		if (menuState !== 1) {
			menuState = 1;
			menu.classList.add(contextMenuActive);
		}
	}

	function toggleMenuOff() {
		if (menuState !== 0) {
			menuState = 0;
			menu.classList.remove(contextMenuActive);
		}
	}

	function toggleControlBar() {
		if (getById("controlButtons").style.display != 'none') {
			// Dont hardcode style here. Copy it over to data-style before changing to none;
			getById("controlButtons").dataset.style = getById("controlButtons").style.display;
			getById("controlButtons").style.display = 'none';
		} else {
			// Copy the style over from the data-style attribute.
			getById("controlButtons").style.display = getById("controlButtons").dataset.style;
		};
	}

	function positionMenu(e) {
		clickCoords = getPosition(e);
		clickCoordsX = clickCoords.x;
		clickCoordsY = clickCoords.y;

		menuWidth = menu.offsetWidth + 4;
		menuHeight = menu.offsetHeight + 4;

		windowWidth = window.innerWidth;
		windowHeight = window.innerHeight;

		if ((windowWidth - clickCoordsX) < menuWidth) {
			menu.style.left = windowWidth - menuWidth + "px";
		} else {
			menu.style.left = clickCoordsX + "px";
		}

		if ((windowHeight - clickCoordsY) < menuHeight) {
			menu.style.top = windowHeight - menuHeight + "px";
		} else {
			menu.style.top = clickCoordsY + "px";
		}
	}

	function menuItemListener(link) {
		if (link.getAttribute("data-action") == "Open") {
			window.open(taskItemInContext.value);
		} else {
			// nothing needed
		}
		log("Task ID - " + taskItemInContext + ", Task action - " + link.getAttribute("data-action"));
		toggleMenuOff();
	}

	init();

})();

document.addEventListener("dragstart", event => {
	var url = event.target.href || event.target.value;
	if (!url || !url.startsWith('https://')) return;
	if (event.target.dataset.drag != "1") {
		return;
	}
	//event.target.ondragend = function(){event.target.blur();}

	var streamId = url.split('view=');
	var label = url.split('label=');

	if (session.label !== false) {
		url += '&layer-name=' + session.label;
	} else {
		url += '&layer-name=OBS.Ninja';
	}
	if (streamId.length > 1) url += ': ' + streamId[1].split('&')[0];
	if (label.length > 1) url += ' - ' + decodeURI(label[1].split('&')[0]);

	try {
		if (document.getElementById("videosource")) {
			var video = getById('videosource');
			if (typeof(video.videoWidth) == "undefined") {
				url += '&layer-width=1920'; // this isn't always 100% correct, as the resolution can fluxuate, but it is probably good enough
				url += '&layer-height=1080';
			} else if ((parseInt(video.videoWidth) < 360) || (video.videoHeight < 640)) {
				url += '&layer-width=1920'; // this isn't always 100% correct, as the resolution can fluxuate, but it is probably good enough
				url += '&layer-height=1080';
			} else {
				url += '&layer-width=' + video.videoWidth; // this isn't always 100% correct, as the resolution can fluxuate, but it is probably good enough
				url += '&layer-height=' + video.videoHeight;
			}
		} else {
			url += '&layer-width=1920'; // this isn't always 100% correct, as the resolution can fluxuate, but it is probably good enough
			url += '&layer-height=1080';
		}
	} catch (error) {
		url += '&layer-width=1920'; // this isn't always 100% correct, as the resolution can fluxuate, but it is probably good enough
		url += '&layer-height=1080';
	}

	event.dataTransfer.setDragImage(document.querySelector('#dragImage'), 24, 24);
	event.dataTransfer.setData("text/uri-list", encodeURI(url));
	//event.dataTransfer.setData("url", encodeURI(url));

});

function popupMessage(e, message = "Copied to Clipboard") { // right click menu

	var posx = 0;
	var posy = 0;

	if (!e) var e = window.event;

	if (e.pageX || e.pageY) {
		posx = e.pageX;
		posy = e.pageY;
	} else if (e.clientX || e.clientY) {
		posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
		posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
	}

	posx += 10;


	var menu = document.querySelector("#messagePopup");
	menu.innerHTML = "<center>" + message + "</center>";
	var menuState = 0;
	var menuWidth;
	var menuHeight;
	var menuPosition;
	var menuPositionX;
	var menuPositionY;

	var windowWidth;
	var windowHeight;

	if (menuState !== 1) {
		menuState = 1;
		menu.classList.add("context-menu--active");
	}

	menuWidth = menu.offsetWidth + 4;
	menuHeight = menu.offsetHeight + 4;

	windowWidth = window.innerWidth;
	windowHeight = window.innerHeight;

	if ((windowWidth - posx) < menuWidth) {
		menu.style.left = windowWidth - menuWidth + "px";
	} else {
		menu.style.left = posx + "px";
	}

	if ((windowHeight - posy) < menuHeight) {
		menu.style.top = windowHeight - menuHeight + "px";
	} else {
		menu.style.top = posy + "px";
	}

	function toggleMenuOff() {
		if (menuState !== 0) {
			menuState = 0;
			menu.classList.remove("context-menu--active");
		}
	}
	setTimeout(function() {
		toggleMenuOff();
	}, 1000);
	event.preventDefault();
}

function timeSince(date) {

	var seconds = Math.floor((new Date() - date) / 1000);

	var interval = seconds / 31536000;

	if (interval > 1) {
		return Math.floor(interval) + " years";
	}
	interval = seconds / 2592000;
	if (interval > 1) {
		return Math.floor(interval) + " months";
	}
	interval = seconds / 86400;
	if (interval > 1) {
		return Math.floor(interval) + " days";
	}
	interval = seconds / 3600;
	if (interval > 1) {
		return Math.floor(interval) + " hours";
	}
	interval = seconds / 60;
	if (interval > 1) {
		return Math.floor(interval) + " minutes";
	}
	return "Seconds ago";
}
var chatUpdateTimeout = null;
var messageList = []

function sendChatMessage(chatMsg = false) { // filtered + visual
	var data = {};
	if (chatMsg === false) {
		var msg = document.getElementById('chatInput').value;
	} else {
		var msg = chatMsg;
	}
	//msg = sanitizeChat(msg);
	if (msg == "") {
		return;
	}
	
	if (msg.trim()==="/list"){
		var listMsg = null;
		for (var UUID in session.rpcs){
			if (session.rpcs[UUID].label){
				listMsg = UUID+": "+session.rpcs[UUID].label
			} else if (session.directorUUID === UUID){
				listMsg = UUID+": Director";
			} else {
				listMsg = UUID+": Unknown User";
			}
			var data = {};
			data.msg = listMsg;
			data.label = false;
			data.type = "alert";
			data.time = Date.now();
			messageList.push(data);
		}
		for (var UUID in session.pcs){
			if (UUID in session.rpcs){continue;}
			if (session.pcs[UUID].label){
				listMsg = UUID+"; "+session.pcs[UUID].label
			} else if (session.directorUUID === UUID){
				listMsg = UUID+"; Director";
			} else {
				listMsg = UUID+"; Unknown User";
			}
			var data = {};
			data.msg = listMsg;
			data.label = false;
			data.type = "alert";
			data.time = Date.now();
			messageList.push(data);
		}
		if (listMsg===null){
			data.msg = "No other users are connected to you";
			data.label = false;
			data.type = "alert";
			data.time = Date.now();
			messageList.push(data);
		}
	} else if (msg.startsWith("\/msg ")){
		var msg = msg.split("\/msg ")[1];
		msg = msg.split(" ");
		uid = msg.shift().toLowerCase();
		msg = msg.join(" ");
		if (msg == ""){return;}
		var sent = false;
		for (var UUID in session.rpcs){
			if (UUID.startsWith(uid)){
				sendChat(msg, UUID); // send message to peers
				var data = {};
				data.time = Date.now();
				data.msg = sanitizeChat(msg); // this is what the other person should see
				data.label = false;
				data.type = "sent";
				messageList.push(data);
				sent=true;
			} else if (session.rpcs[UUID].label && session.rpcs[UUID].label.toLowerCase().startsWith(uid)){
				sendChat(msg, UUID); // send message to peers
				var data = {};
				data.time = Date.now();
				data.msg = sanitizeChat(msg); // this is what the other person should see
				data.label = false;
				data.type = "sent";
				messageList.push(data);
				sent=true;
			} else if ((session.directorUUID === UUID) && "director".startsWith(uid)){
				sendChat(msg, UUID); // send message to peers
				var data = {};
				data.time = Date.now();
				data.msg = sanitizeChat(msg); // this is what the other person should see
				data.label = false;
				data.type = "sent";
				messageList.push(data);
				sent=true;
			}
		}
		for (var UUID in session.pcs){
			if (UUID in session.rpcs){continue;}
			if (UUID.startsWith(uid)){
				sendChat(msg, UUID); // send message to peers
				var data = {};
				data.time = Date.now();
				data.msg = sanitizeChat(msg); // this is what the other person should see
				data.label = false;
				data.type = "sent";
				messageList.push(data);
				sent=true;
			} else if (session.pcs[UUID].label && session.pcs[UUID].label.toLowerCase().startsWith(uid)){
				sendChat(msg, UUID); // send message to peers
				var data = {};
				data.time = Date.now();
				data.msg = sanitizeChat(msg); // this is what the other person should see
				data.label = false;
				data.type = "sent";
				messageList.push(data);
				sent=true;
			} else if ((session.directorUUID === UUID) && "director".startsWith(uid)){
				sendChat(msg, UUID); // send message to peers
				var data = {};
				data.time = Date.now();
				data.msg = sanitizeChat(msg); // this is what the other person should see
				data.label = false;
				data.type = "sent";
				messageList.push(data);
				sent=true;
			}
		}
		if (sent == false){
			var data = {};
			data.msg = "No user found. Message not sent.";
			data.label = false;
			data.type = "alert";
			data.time = Date.now();
			messageList.push(data);
			updateMessages();
			return;
		}
	} else if (msg.startsWith("\/")){
		data.msg = "Unknown command. Try '/list' or '/msg username message'.";
		data.label = false;
		data.type = "alert";
		data.time = Date.now();
		messageList.push(data);
		updateMessages();
		return;
	} else {
		sendChat(msg); // send message to peers
		data.time = Date.now();
		data.msg = sanitizeChat(msg); // this is what the other person should see
		data.label = false;
		data.type = "sent";
		messageList.push(data);
	}
	document.getElementById('chatInput').value = "";
	
	messageList = messageList.slice(-100);
	if (session.broadcastChannel !== false) {
		log(session.broadcastChannel);
		session.broadcastChannel.postMessage(data);
	}
	updateMessages();
}

function toggleQualityDirector(bitrate, UUID, ele = null) { // ele is specific to the button in the director's room
	var eles = ele.parentNode.childNodes;
	for (var i=0;i<eles.length;i++) {
		eles[i].className = "";
	}
	ele.className = "pressed";
	session.requestRateLimit(bitrate, UUID);
}

function createPopoutChat() {
	var randid = session.generateStreamID(8);
	log(randid);
	window.open('./popout.html?id=' + randid, 'popup', 'width=600,height=480,toolbar=no,menubar=no,resizable=yes');
	session.broadcastChannel = new BroadcastChannel(randid);
	session.broadcastChannel.onmessage = function(e) {
		if ("loaded" in e.data) {
			session.broadcastChannel.postMessage({
				messageList: messageList
			});
		} else if ("msg" in e.data) {
			sendChatMessage(e.data.msg);
		}
	}
	return false;
}

function getChatMessage(msg, label = false, director = false, overlay = false) {

	msg = sanitizeChat(msg); // keep it clean.
	if (msg == "") {
		return;
	}

	if (label) {
		label = sanitizeLabel(label);
	}

	data = {};
	data.time = Date.now();
	data.msg = msg;
	if (label) {
		data.label = label;
		if (director) {
			data.label = "<b><i>" + data.label + ":</i></b> ";
		} else {
			data.label = "<b>" + data.label + ":</b> ";
		}
		label = label+":";
	} else if (director) {
		data.label = "<b><i>Director:</i></b> ";
		label = "Director:";
	} else {
		if (session.director){
			data.label = "Someone: ";
		} else {
			data.label = "";
		}
		label = "";
	}
	data.type = "recv";
	messageList.push(data);
	messageList = messageList.slice(-100);

	if (session.beepToNotify) {
		playtone();
	}
	updateMessages();

	if (overlay) {
		if (!(session.cleanOutput)){
			var textOverlay = getById("overlayMsgs");
			if (textOverlay) {
				var spanOverlay = document.createElement("span");
				spanOverlay.innerHTML = "<b><i>" + label + "</i></b> " + msg + "<br />";
				textOverlay.appendChild(spanOverlay);
				textOverlay.style.display = "block";
				var showtime = msg.length * 200 + 3000;
				if (showtime > 8000) {
					showtime = 8000;
				}
				setTimeout(function(ele) {
					ele.parentNode.removeChild(ele);
				}, showtime, spanOverlay);
			}
		}
	}

	if (session.chat == false) {
		getById("chattoggle").className = "las la-comments my-float toggleSize puslate";
		getById("chatbutton").className = "float";

		if (getById("chatNotification").value) {
			getById("chatNotification").value = getById("chatNotification").value + 1;
		} else {
			getById("chatNotification").value = 1;
		}
		getById("chatNotification").classList.add("notification");

	}

	if (isIFrame) {
		parent.postMessage({
			"gotChat": data
		}, "*");
	}
	if (session.broadcastChannel !== false) {
		session.broadcastChannel.postMessage(data); /* send */
	}

}

function updateClosedCaptions(msg, label, UUID) {
	msg.counter = parseInt(msg.counter);
	var transcript = sanitizeChat(msg.transcript); // keep it clean.
	if (transcript == "") {
		return;
	}
	transcript = transcript.toUpperCase();

	if (label) {
		label = sanitizeLabel(label);
		label = "<b>" + label + ":</b> ";
	} else {
		label = "";
	}

	var textOverlay = getById("overlayMsgs");
	if (textOverlay) {
		if (document.getElementById(UUID + "_" + msg.counter)) {
			var spanOverlay = document.getElementById(UUID + "_" + msg.counter);
		} else {
			var spanOverlay = document.createElement("span");
			spanOverlay.id = UUID + "_" + msg.counter;
			textOverlay.appendChild(spanOverlay);
			textOverlay.style.height = "auto";
			textOverlay.style.textAlign = "left";
			textOverlay.style.display = "block";
			textOverlay.style.position = "relative";
		}
		spanOverlay.innerHTML = label + transcript + "<br />";

		spanOverlay.style.fontSize = (parseInt(session.labelsize || 100) / 100.0 * 4.5) + "vh";
		spanOverlay.style.lineHeight = (parseInt(session.labelsize || 100) / 100 * 6) + "vh";
		spanOverlay.style.margin = (parseInt(session.labelsize || 100) / 100.0 * 0.75) + "vh";

		if (msg.isFinal) {
			var showtime = 3000;
			clearTimeout(spanOverlay.timeout);
			spanOverlay.timeout = setTimeout(function(ele) {
				ele.parentNode.removeChild(ele);
			}, showtime, spanOverlay);
		} else {
			clearTimeout(spanOverlay.timeout);
			spanOverlay.timeout = setTimeout(function(ele) {
				ele.parentNode.removeChild(ele);
			}, 30000, spanOverlay);
		}

	}
}

function updateMessages() {
	document.getElementById("chatBody").innerHTML = "";
	for (i in messageList) {

		var time = timeSince(messageList[i].time) || "";
		var msg = document.createElement("div");
		//console.log(messageList[i].msg); // Display received messages for View-Only clients.
		/////////////////////////////
		if (messageList[i].type == "sent") {
			msg.innerHTML = messageList[i].msg + " <i><small> <small>- " + time + "</small></small></i>";
			msg.classList.add("outMessage");
		} else if (messageList[i].type == "recv") {
			var label = "";
			if (messageList[i].label) {
				label = messageList[i].label;
			}
			msg.innerHTML = label + messageList[i].msg + " <i><small> <small>- " + time + "</small></small></i>";
			msg.classList.add("inMessage");
		} else if (messageList[i].type == "alert") {
			msg.innerHTML = messageList[i].msg + " <i><small> <small>- " + time + "</small></small></i>";
			msg.classList.add("inMessage");
		} else {
			msg.innerHTML = messageList[i].msg;
			msg.classList.add("outMessage");
		}

		document.getElementById("chatBody").appendChild(msg);
	}
	if (chatUpdateTimeout) {
		clearInterval(chatUpdateTimeout);
	}
	document.getElementById("chatBody").scrollTop = document.getElementById("chatBody").scrollHeight;
	chatUpdateTimeout = setTimeout(function() {
		updateMessages();
	}, 60000);
}

function EnterButtonChat(event) {
	// Number 13 is the "Enter" key on the keyboard
	var key = event.which || event.keyCode;
	if (key === 13) {
		// Cancel the default action, if needed
		event.preventDefault();
		// Trigger the button element with a click
		sendChatMessage();
	}
}

function showCustomizer(arg, ele) {
	//getById("directorLinksButton").innerHTML='<i class="las la-caret-right"></i><span data-translate="hide-the-links"> LINKS (GUEST INVITES & SCENES)</span>'
	getById("showCustomizerButton1").style.backgroundColor = "";
	getById("showCustomizerButton2").style.backgroundColor = "";
	getById("showCustomizerButton3").style.backgroundColor = "";
	getById("showCustomizerButton4").style.backgroundColor = "";
	getById("showCustomizerButton1").style.boxShadow = "";
	getById("showCustomizerButton2").style.boxShadow = "";
	getById("showCustomizerButton3").style.boxShadow = "";
	getById("showCustomizerButton4").style.boxShadow = "";


	if (getById("customizeLinks" + arg).style.display != "none") {
		getById("customizeLinks").style.display = "none";
		getById("customizeLinks" + arg).style.display = "none";
	} else {
		//directorLinks").style.display="none";
		getById("showCustomizerButton" + arg).style.backgroundColor = "#1e0000";
		getById("showCustomizerButton" + arg).style.boxShadow = "inset 0px 0px 1px #b90000";
		getById("customizeLinks1").style.display = "none";
		getById("customizeLinks3").style.display = "none";
		getById("customizeLinks").style.display = "block";
		getById("customizeLinks" + arg).style.display = "block";
	}
}


var defaultRecordingBitrate = false;

function recordVideo(target, event, videoKbps = false) { // event.currentTarget,this.parentNode.parentNode.dataset.UUID

	var UUID = target.dataset.UUID;
	var video = session.rpcs[UUID].videoElement;
	var audioKbps = false;

	if (event === null) {
		if (defaultRecordingBitrate === null) {
			updateLocalRecordButton(UUID, -1);
			//target.style.backgroundColor = null;
			//target.innerHTML = '<i class="las la-circle"></i><span data-translate="record"> record local</span>';
			return;
		}
	} else if ((event.ctrlKey) || (event.metaKey)) {
		updateLocalRecordButton(UUID, -3);
		//target.innerHTML = '<i class="las la-check"></i> <span data-translate="record"> ARMED</span>';
		//target.style.backgroundColor = "#BF3F3F";
		Callbacks.push([recordVideo, target, null, false]);
		log("Record Video queued");
		defaultRecordingBitrate = false;
		return;
	} else {
		defaultRecordingBitrate = false;
	}

	log("Record Video Clicked");
	if ("recording" in video) {
		log("ALREADY RECORDING!");
		//target.style.backgroundColor = null;
		//target.innerHTML = '<i class="las la-circle"></i><span data-translate="record"> record local</span>';
		updateLocalRecordButton(UUID, -2);
		video.recorder.stop();
		session.requestRateLimit(35, UUID); // 100kbps
		if (session.audiobitrate===false){
			session.requestAudioRateLimit(-1,UUID);
		}
		
		var elements = document.querySelectorAll('[data-action-type="change-quality2"][data--u-u-i-d="' + UUID + '"]');
		if (elements[0]) {
			elements[0].classList.add("pressed");
		}
		var elements = document.querySelectorAll('[data-action-type="change-quality1"][data--u-u-i-d="' + UUID + '"]');
		if (elements[0]) {
			elements[0].classList.remove("pressed");
		}
		var elements = document.querySelectorAll('[data-action-type="change-quality3"][data--u-u-i-d="' + UUID + '"]');
		if (elements[0]) {
			elements[0].classList.remove("pressed");
		}
		return;
	} else {
		updateLocalRecordButton(UUID, 0);
		//target.style.backgroundColor = "#FCC";
		//target.innerHTML = "<i style='font-size:110%;' class='las la-file-download'></i> <span data-translate='Download'>Download</span>";
		video.recording = true;
	}

	video.recorder = {};

	if (videoKbps == false) {
		if (defaultRecordingBitrate == false) {
			videoKbps = 4000; // 4mbps recording bitrate
			videoKbps = prompt("Press OK to start recording. Press again to stop and download.\n\nWarning: Keep this browser tab active to continue recording.\n\nYou can change the default video bitrate if desired below (kbps)", videoKbps);
			if (videoKbps === null) {
				//target.style.backgroundColor = null;
				//target.innerHTML = '<i class="las la-circle"></i><span data-translate="record"> record local</span>';
				updateLocalRecordButton(UUID, -1);
				target.style.backgroundColor = "";
				delete(video.recorder);
				delete(video.recording);
				defaultRecordingBitrate = null;
				return;
			}
			videoKbps = parseInt(videoKbps);
			defaultRecordingBitrate = videoKbps;
		} else {
			videoKbps = defaultRecordingBitrate;
		}
	}

	if (videoKbps <= 0) {
		audioKbps = videoKbps * (-1);
		videoKbps = false;
		if (session.audiobitrate===false){
			if ((audioKbps>0) && (audioKbps>=128)){
				session.requestAudioRateLimit(128,UUID); // no point going higher
			} else if (audioKbps==0){
				session.requestAudioRateLimit(256,UUID); // PCM
			} else {
				session.requestAudioRateLimit(parseInt(audioKbps),UUID); // exact? sure. why not.
			}
		}
	} else if (videoKbps < 50) { // this just makes sure you can't set 0 on the record bitrate.
		videoKbps = 50;
		session.requestRateLimit(parseInt(videoKbps * 0.8), UUID); // 3200kbps transfer bitrate. Less than the recording bitrate, to avoid waste.
	} else {
		session.requestRateLimit(parseInt(videoKbps * 0.8), UUID); // 3200kbps transfer bitrate. Less than the recording bitrate, to avoid waste.
		
		if (videoKbps>4000){
			if (session.audiobitrate===false){
				if (session.pcm){
					session.requestAudioRateLimit(256,UUID);
				} else {
					session.requestAudioRateLimit(128,UUID);
				}
			}
		} else if (videoKbps>2500){
			if (session.audiobitrate===false){
				if (session.pcm){
					session.requestAudioRateLimit(256,UUID);
				} else {
					session.requestAudioRateLimit(80,UUID);
				}
			}
		}
		
	}

	var timestamp = Date.now();
	var filename = "";
	if (session.rpcs[UUID].label || session.rpcs[UUID].streamID) {
		filename = session.rpcs[UUID].label || session.rpcs[UUID].streamID;
		filename = filename.replace(/[\W]+/g, "_");
		filename = filename.substring(0, 200);
	}

	filename += "_" + timestamp.toString();

	var cancell = false;
	if (typeof video.srcObject === "undefined" || !video.srcObject) {
		return;
	}

	const {readable, writable} = new TransformStream({
		transform: (chunk, ctrl) => chunk.arrayBuffer().then(b => ctrl.enqueue(new Uint8Array(b)))
	});
	readable.pipeTo(streamSaver.createWriteStream(filename + '.webm'));
	var writer = writable.getWriter();
	video.recorder.writer = writer;
	video.recorder.stop = function() {
		if (!video.recording) {
			errorlog("ALREADY STOPPED");
			updateLocalRecordButton(UUID, -1);
			return;
		}
		video.recording = false;
		updateLocalRecordButton(UUID, -2);
		try {
			if (video.recorder.mediaRecorder.state !== "inactive") {
				video.recorder.mediaRecorder.stop();
			}
		} catch (e) {
			errorlog(e);
		}

		session.requestRateLimit(35, UUID); // 100kbps
		if (session.audiobitrate===false){
			session.requestAudioRateLimit(-1,UUID);
		}
		var elements = document.querySelectorAll('[data-action-type="change-quality2"][data--u-u-i-d="' + UUID + '"]');
		if (elements[0]) {
			elements[0].classList.add("pressed");
		}
		var elements = document.querySelectorAll('[data-action-type="change-quality1"][data--u-u-i-d="' + UUID + '"]');
		if (elements[0]) {
			elements[0].classList.remove("pressed");
		}
		var elements = document.querySelectorAll('[data-action-type="change-quality3"][data--u-u-i-d="' + UUID + '"]');
		if (elements[0]) {
			elements[0].classList.remove("pressed");
		}

		cancell = true;
		// log('Recorded Blobs: ', recordedBlobs);
		// download();
		setTimeout(() => {
			writer.close();
			updateLocalRecordButton(UUID, -1);
			delete(video.recorder);
			delete(video.recording);
		}, 1200);
	};

	let options = {};

	if (videoKbps) {
		options.mimeType = "video/webm";
		if (session.pcm){
			options.mimeType += ";codecs=pcm";
		}
		if (videoKbps < 1000) {
			options.videoBitsPerSecond = parseInt(videoKbps * 1024); // 100 kbps audio
		} else {
			options.bitsPerSecond = parseInt(videoKbps * 1024); // 100 to 132 kbps audio
		}
		video.recorder.mediaRecorder = new MediaRecorder(video.srcObject, options);
	} else {
		options.mimeType = "audio/webm";
		if (audioKbps == 0) {
			if (MediaRecorder.isTypeSupported("audio/webm;codecs=pcm")) {
				options.mimeType = "audio/webm;codecs=pcm";
			}
		} else {
			options.bitsPerSecond = parseInt(audioKbps * 1024);
		}
		var stream = new MediaStream();
		video.srcObject.getAudioTracks().forEach((track) => {
			stream.addTrack(track, video.srcObject);
		});
		video.recorder.mediaRecorder = new MediaRecorder(stream, options);
	}
	log(options);

	function download() {
		const blob = new Blob(recordedBlobs, {
			type: "video/webm"
		});
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.style.display = 'none';
		a.href = url;
		a.download = filename + ".webm";
		document.body.appendChild(a);
		a.click();
		setTimeout(() => {
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
		}, 100);
	}

	function handleDataAvailable(event) {
		if (event.data && event.data.size > 0) {
			//recordedBlobs.push(event.data);
			writer.write(event.data); ////////////
			if (video.recording) {
				updateLocalRecordButton(UUID, (parseInt((Date.now() - timestamp) / 1000) || 0));
			}
		}
	}

	video.recorder.mediaRecorder.ondataavailable = handleDataAvailable;

	video.recorder.mediaRecorder.onerror = function(event) {
		errorlog(event);
		video.recorder.stop();
		session.requestRateLimit(35, UUID);
		if (!(session.cleanOutput)) {
			setTimeout(function() {
				warnUser("an error occured with the media recorder; stopping recording");
			}, 1);
		}
	};

	video.srcObject.ended = function(event) {
		video.recorder.stop();
		session.requestRateLimit(35, UUID);
		if (!(session.cleanOutput)) {
			setTimeout(function() {
				warnUser("stream ended! stopping recording");
			}, 1);
		}
	};


	setTimeout(function(v) {
		v.recorder.mediaRecorder.start(1000);
	}, 500, video); // 100ms chunks

	return;
}

function updateRemoteRecordButton(UUID, recorder) {
	var elements = document.querySelectorAll('[data-action-type="recorder-remote"][data--u-u-i-d="' + UUID + '"]');
	if (elements[0]) {
		var time = parseInt(recorder) || 0;
		if (time == -3) {
			elements[0].classList.remove("pressed");
			elements[0].disabled = true;
			elements[0].innerHTML = '<i class="lab la-apple"></i> Not Supported';
			if (!(session.cleanOutput)) {
				setTimeout(function() {
					warnUser('The remote browser does not support recording.\n\nPerhaps try local recording instead.');
				}, 0);
			}

		} else if (time == -2) {
			elements[0].classList.add("pressed");
			elements[0].innerHTML = '<i class="las la-stop-circle"></i> stopping...';
		} else if (time == -1) {
			elements[0].classList.remove("pressed");
			elements[0].innerHTML = '<i class="las la-circle"></i> <span data-translate="record-remote"> Record Remote</span>';
		} else {
			var minutes = Math.floor(time / 60);
			var seconds = time - minutes * 60;
			elements[0].classList.add("pressed");
			elements[0].innerHTML = '<i class="las la-stop-circle"></i> ' + minutes + "m : " + (seconds + "").padStart(2, '0') + "s";
		}
	}
}

function updateLocalRecordButton(UUID, recorder) {
	var elements = document.querySelectorAll('[data-action-type="recorder-local"][data--u-u-i-d="' + UUID + '"]');
	if (elements[0]) {
		var time = parseInt(recorder) || 0;

		//target.innerHTML = '<i class="las la-check"></i> <span data-translate="record"> ARMED</span>';
		//
		if (time == -3) {
			elements[0].classList.add("pressed");
			elements[0].innerHTML = '<i class="las la-check"></i> <span data-translate="record"> ARMED</span>';
			elements[0].style.backgroundColor = "#BF3F3F";
		} else if (time == -2) {
			elements[0].classList.add("pressed");
			elements[0].innerHTML = '<i class="las la-stop-circle"></i> stopping...';
			elements[0].style.backgroundColor = "";
		} else if (time == -1) {
			elements[0].classList.remove("pressed");
			elements[0].innerHTML = '<i class="las la-circle"></i> <span data-translate="record-local"> Record Local</span>';
			elements[0].style.backgroundColor = "";
		} else {
			var minutes = Math.floor(time / 60);
			var seconds = time - minutes * 60;
			elements[0].classList.add("pressed");
			elements[0].innerHTML = '<i class="las la-stop-circle"></i> ' + minutes + "m : " + (seconds + "").padStart(2, '0') + "s";
			elements[0].style.backgroundColor = "";
		}
	}
}

function recordLocalVideoToggle() {
	var ele = getById("recordLocalbutton");
	if (ele.dataset.state == "0") {
		ele.dataset.state = "1";
		ele.style.backgroundColor = "red";
		ele.innerHTML = '<i class="toggleSize my-float las la-square" ></i>';
		if ("recording" in session.videoElement) {

		} else {
			recordLocalVideo("start");
		}
		
		if (session.director){
			var elements = document.querySelectorAll('[data-action-type="recorder-local"][data-sid="' + session.streamID + '"]');
			if (elements[0]) {
				elements[0].classList.add("pressed");
				elements[0].innerHTML = '<i class="las la-stop-circle"></i><span data-translate="record-local"> Record</span>';
			}
		}
		
	} else {
		if ("recording" in session.videoElement) {
			recordLocalVideo("stop");
		}
		ele.dataset.state = "0";
		ele.style.backgroundColor = "";
		ele.innerHTML = '<i class="toggleSize my-float las la-dot-circle" ></i>';
		
		if (session.director){
			var elements = document.querySelectorAll('[data-action-type="recorder-local"][data-sid="' + session.streamID + '"]');
			if (elements[0]) {
				elements[0].classList.remove("pressed");
				elements[0].innerHTML = '<i class="las la-circle"></i><span data-translate="record-local"> Record</span>';
			}
		}
	}
	
}

function setupSensorData(pollrate = 30) {
	session.sensors = {};
	session.sensors.data = {};
	session.sensors.data.sensors = true;

	if (window.Accelerometer) {
		session.sensors.data.acc = {};
		session.sensors.Accelerometer = new Accelerometer({
			frequency: pollrate
		});
		session.sensors.Accelerometer.addEventListener('reading', e => {
			session.sensors.data.acc.x = session.sensors.Accelerometer.x;
			session.sensors.data.acc.y = session.sensors.Accelerometer.y;
			session.sensors.data.acc.z = session.sensors.Accelerometer.z;
			session.sensors.data.acc.t = parseInt(Math.round(session.sensors.Accelerometer.timestamp));
		});
		session.sensors.Accelerometer.start();
	}
	if (window.Gyroscope) {
		session.sensors.data.gyro = {};
		session.sensors.Gyroscope = new Gyroscope({
			frequency: pollrate
		});
		session.sensors.Gyroscope.addEventListener('reading', e => {
			session.sensors.data.gyro.x = session.sensors.Gyroscope.x;
			session.sensors.data.gyro.y = session.sensors.Gyroscope.y;
			session.sensors.data.gyro.z = session.sensors.Gyroscope.z;
			session.sensors.data.gyro.t = parseInt(Math.round(session.sensors.Gyroscope.timestamp));
		});
		session.sensors.Gyroscope.start();
	}
	if (window.Magnetometer) {
		session.sensors.data.mag = {};
		session.sensors.Magnetometer = new Magnetometer({
			frequency: pollrate
		});
		session.sensors.Magnetometer.addEventListener('reading', e => {
			session.sensors.data.mag.x = session.sensors.Magnetometer.x;
			session.sensors.data.mag.y = session.sensors.Magnetometer.y;
			session.sensors.data.mag.z = session.sensors.Magnetometer.z;
			session.sensors.data.mag.t = parseInt(Math.round(session.sensors.Magnetometer.timestamp));

		});
		session.sensors.Magnetometer.start();
	}
	if (window.LinearAccelerationSensor) {
		session.sensors.data.lin = {};
		session.sensors.LinearAccelerationSensor = new LinearAccelerationSensor({
			frequency: pollrate
		});
		session.sensors.LinearAccelerationSensor.addEventListener('reading', e => {
			session.sensors.data.lin.x = session.sensors.LinearAccelerationSensor.x;
			session.sensors.data.lin.y = session.sensors.LinearAccelerationSensor.y;
			session.sensors.data.lin.z = session.sensors.LinearAccelerationSensor.z;
			session.sensors.data.lin.t = parseInt(Math.round(session.sensors.LinearAccelerationSensor.timestamp));
		});
		session.sensors.LinearAccelerationSensor.start();
	}
	setInterval(function() {
		firehoseSensorData();
	}, parseInt(1000 / pollrate));
}


function firehoseSensorData() {
	session.sendMessage(session.sensors.data);
}
if (session.sensorData) {
	setupSensorData(parseInt(session.sensorData));
}

async function chunkedVideoTransfer(videoKbps = 500) {
	
	var video = session.videoElement;
	var recorder = {};
	
	var options = {};
	options.mimeType = "video/webm";
	if (videoKbps < 1000) {
		options.videoBitsPerSecond = parseInt(videoKbps * 1024); // 100 kbps audio
	} else {
		options.bitsPerSecond = parseInt(videoKbps * 1024); // 100 to 132 kbps audio
	}
	
	recorder.mediaRecorder = new MediaRecorder(video.srcObject, options);
	
	async function handleDataAvailable(event) {
		if (event.data && event.data.size > 0) {
			try{
				recorder.mediaRecorder.stop();
				setTimeout(function(){recorder.mediaRecorder.start(500);},500);
			} catch(e){
				return;
			}
			
			const arrayBuffer = await event.data.arrayBuffer();
			for (var i in session.pcs){
				session.pcs[i].sendChannel.send(arrayBuffer);
				
			}
		}
		
	}

	recorder.mediaRecorder.ondataavailable = handleDataAvailable;

	recorder.mediaRecorder.onerror = function(event) {
		errorlog(event);
	};

	video.srcObject.ended = function(event) {
		errorlog(event);
	};

	recorder.mediaRecorder.start(500); // 100ms chunks
	
}

function recordLocalVideo(action = null, videoKbps = 6000) { // event.currentTarget,this.parentNode.parentNode.dataset.UUID
	var audioKbps = false;
	var video = session.videoElement;
	if ("recording" in video) {
		if (action == "stop") {
			log("Stopping RECORDING!");
			video.recorder.stop();
			delete(video.recorder);
			delete(video.recording);
			return;
		} else if (action == "start") {
			log("ALREADY RECORDING!");
			getById("recordLocalbutton").dataset.state = "1";
			getById("recordLocalbutton").style.backgroundColor = "red";
			getById("recordLocalbutton").innerHTML = '<i class="toggleSize my-float las la-square" ></i>';
			return;
		} else {
			log("STOPPING RECORDING by default toggle!");
			video.recorder.stop();
			return;
		}
		return;
	} else if (action == "start") {
		if (safariVersion()) {
			var msg = {};
			msg.UUID = session.directorUUID;
			msg.recorder = -3;
			session.sendMessage(msg, msg.UUID);
			return;
		}
		video.recording = true;
		getById("recordLocalbutton").dataset.state = "1";
		getById("recordLocalbutton").style.backgroundColor = "red";
		getById("recordLocalbutton").innerHTML = '<i class="toggleSize my-float las la-square" ></i>';
	} else if (action == "stop") {
		return;
	} else {
		getById("recordLocalbutton").dataset.state = "1";
		getById("recordLocalbutton").style.backgroundColor = "red";
		getById("recordLocalbutton").innerHTML = '<i class="toggleSize my-float las la-square" ></i>';
		video.recording = true;
	}

	video.recorder = {};

	if (session.recordLocal !== false) {
		videoKbps = session.recordLocal;
	}

	if (videoKbps <= 0) {
		audioKbps = videoKbps * (-1);
		videoKbps = false;
	} else if (videoKbps < 50) { // this just makes sure you can't set 0 on the record bitrate.
		videoKbps = 50;
	}

	if (typeof video.srcObject === "undefined" || !video.srcObject) {
		return;
	}

	const {readable, writable} = new TransformStream({
		transform: (chunk, ctrl) => chunk.arrayBuffer().then(b => ctrl.enqueue(new Uint8Array(b)))
	});

	var timestamp = Date.now();
	var filename = "";
	if (session.label || session.streamID) {
		filename = session.label || session.streamID;
		filename = filename.replace(/[\W]+/g, "_");
		filename = filename.substring(0, 200);
	}

	filename += "_" + timestamp.toString();
	readable.pipeTo(streamSaver.createWriteStream(filename.toString() + '.webm'));

	var writer = writable.getWriter();
	video.recorder.writer = writer;
	pokeIframeAPI("recording-started");
	
	video.recorder.stop = function(restart = false) {
		if (restart) {
			if (getById("recordLocalbutton").dataset.state == 2) {
				getById("recordLocalbutton").dataset.state = "0";
				getById("recordLocalbutton").style.backgroundColor = "";
				getById("recordLocalbutton").innerHTML = '<i class="toggleSize my-float las la-exclamation" ></i>';
				restart = false;
				warnUser("Media Recording Stopped due to an error.");
			} else {
				getById("recordLocalbutton").innerHTML = '<i class="toggleSize my-float las la-spinner" ></i>';
				getById("recordLocalbutton").dataset.state = "2";
			}
		} else {
			getById("recordLocalbutton").dataset.state = "0";
			getById("recordLocalbutton").style.backgroundColor = "";
			getById("recordLocalbutton").innerHTML = '<i class="toggleSize my-float las la-dot-circle" ></i>';
		}
		if (!video.recording) {
			errorlog("ALREADY STOPPED");
			return;
		}
		video.recording = false;
		try {
			if (video.recorder.mediaRecorder.state !== "inactive") {
				video.recorder.mediaRecorder.stop();
			}
		} catch (e) {
			errorlog(e);
		}

		setTimeout(() => {
			writer.close();
			pokeIframeAPI("recording-stopped");
			try {
				if (session.directorUUID) {
					var msg = {};
					msg.UUID = session.directorUUID;
					msg.recorder = -1;
					session.sendMessage(msg, msg.UUID);
				}
			} catch (e) {
				errorlog(e);
			}
			delete(video.recorder);
			delete(video.recording);

			if (restart) {
				setTimeout(function() {
					recordLocalVideo("start", videoKbps);
				}, 0);
			}

		}, 500);
		try {
			if (session.directorUUID) {
				var msg = {};
				msg.UUID = session.directorUUID;
				msg.recorder = -2;
				session.sendMessage(msg, msg.UUID);
			}
		} catch (e) {
			errorlog(e);
		}

	};

	let options = {};

	if (videoKbps) {
		options.mimeType = "video/webm";
		if (session.pcm){
			options.mimeType += ";codecs=pcm";
		}
		if (videoKbps < 1000) {
			options.videoBitsPerSecond = parseInt(videoKbps * 1024); // 100 kbps audio
		} else {
			options.bitsPerSecond = parseInt(videoKbps * 1024); // 100 to 132 kbps audio
		}
		video.recorder.mediaRecorder = new MediaRecorder(video.srcObject, options);
	} else {
		options.mimeType = "audio/webm";
		if (audioKbps == 0) {
			if (MediaRecorder.isTypeSupported("audio/webm;codecs=pcm")) {
				options.mimeType = "audio/webm;codecs=pcm";
			}
		} else {
			options.bitsPerSecond = parseInt(audioKbps * 1024);
		}
		var stream = new MediaStream();
		video.srcObject.getAudioTracks().forEach((track) => {
			stream.addTrack(track, video.srcObject);
		});
		video.recorder.mediaRecorder = new MediaRecorder(stream, options);
	}
	log(options);

	function handleDataAvailable(event) {
		if (event.data && event.data.size > 0) {
			writer.write(event.data);
			if (session.directorUUID) {
				if (video.recording) {
					var msg = {};
					msg.UUID = session.directorUUID;
					msg.recorder = parseInt((Date.now() - timestamp) / 1000) || 0;
					session.sendMessage(msg, msg.UUID);
				}
			}
		}
	}

	video.recorder.mediaRecorder.ondataavailable = handleDataAvailable;

	video.recorder.mediaRecorder.onerror = function(event) {
		errorlog(event);
		video.recorder.stop(true);
	};

	video.srcObject.ended = function(event) {
		video.recorder.stop();
	};

	video.recorder.mediaRecorder.start(1000); // 100ms chunks

	if (session.directorUUID) {
		var msg = {};
		msg.UUID = session.directorUUID;
		msg.recorder = 0;
		session.sendMessage(msg, msg.UUID);
	}
	return;
}


function changeAudioOutputDevice(ele) {
	if (session.sink){
		if ((iOS) || (iPad)){return;} // iOS devices do not support this.
		
		if (typeof ele.sinkId !== 'undefined'){
			navigator.mediaDevices.getUserMedia({audio:true,video:false}).then(function (stream){
				ele.setSinkId(session.sink).then(() => {
					log("New Output Device:"+session.sink);
				}).catch(errorlog);
				stream.getTracks().forEach(track => {
					track.stop();
				});
			}).catch(function canplayspecificaudio(){errorlog("Can't play out to specific audio device without mic permissions allowed");});
		} else {
			warnlog("Your browser does not support alternative audio sources.");
		}
	}
}

function addAudioPipeline(stream, UUID, track){  // INBOUND AUDIO EFFECTS
	try{
		log("Triggered webaudio effects path");
		
		if (session.audioEffects!==true){ // audio effects is not enable. Do not apply.
				errorlog("Add Audio Pipeline tried to add effects but should be disabled?");
				return stream;
		}
		for (var tid in session.rpcs[UUID].inboundAudioPipeline){
			delete session.rpcs[UUID].inboundAudioPipeline[tid]; // get rid of old nodes.
		}
		var trackid = track.id;
		session.rpcs[UUID].inboundAudioPipeline[trackid] = {};
		
		session.rpcs[UUID].inboundAudioPipeline[trackid].mediaStream = new MediaStream();
		session.rpcs[UUID].inboundAudioPipeline[trackid].mediaStream.addTrack(track);
		session.rpcs[UUID].inboundAudioPipeline[trackid].mutedAudio = new Audio();
		session.rpcs[UUID].inboundAudioPipeline[trackid].mutedAudio.muted = true;
		session.rpcs[UUID].inboundAudioPipeline[trackid].mutedAudio.srcObject = session.rpcs[UUID].inboundAudioPipeline[trackid].mediaStream; // needs to be added as an streamed element to be usable, even if its hidden
		
		session.rpcs[UUID].inboundAudioPipeline[trackid].mutedAudio.play().then(_ => {
			log("playing");
		}).catch(warnlog);
	
		// https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createMediaStreamTrackSource
		source = session.audioCtx.createMediaStreamSource(session.rpcs[UUID].inboundAudioPipeline[trackid].mediaStream);
		
		//////////////////
	
		var screwedUp = false;
		session.rpcs[UUID].inboundAudioPipeline[trackid].destination = false;
		if (session.sync!==false){
			log("adding a delay node to audio");
			source = addDelayNode( source, UUID, trackid);
			screwedUp = true;
		}
		
		if (session.style===2){
			log("adding a fftwave node to audio");
			source = fftWaveform( source, UUID, trackid);
		} else if (session.style===3){
			log("adding a loudness meter node to audio");
			source = audioMeterGuest(source, UUID, trackid);
		} else if (session.audioMeterGuest){
			log("adding a loudness meter node to audio");
			source = audioMeterGuest(source, UUID, trackid);
		} else if (session.activeSpeaker){
			log("adding a loudness meter node to audio");
			source = audioMeterGuest(source, UUID, trackid);
		}
		
		if (session.rpcs[UUID].channelOffset !== false){
			log("custom offset set");
			session.rpcs[UUID].inboundAudioPipeline[trackid].destination = session.audioCtx.createMediaStreamDestination();
			source = offsetChannel( session.rpcs[UUID].inboundAudioPipeline[trackid].destination, source, session.rpcs[UUID].channelOffset);
			screwedUp = true;
		} else if (session.offsetChannel !== false){  // proably better to do this last.
			log("adding offset channels");
			session.rpcs[UUID].inboundAudioPipeline[trackid].destination = session.audioCtx.createMediaStreamDestination();
			source = offsetChannel( session.rpcs[UUID].inboundAudioPipeline[trackid].destination, source, session.offsetChannel);
			screwedUp = true;
		}
		
		if (screwedUp){
			if (session.rpcs[UUID].inboundAudioPipeline[trackid].destination===false){
				session.rpcs[UUID].inboundAudioPipeline[trackid].destination = session.audioCtx.createMediaStreamDestination();
			}
			source.connect(session.rpcs[UUID].inboundAudioPipeline[trackid].destination);
			stream.getTracks().forEach((trk)=>{
				if (trackid != trk.id){
					session.rpcs[UUID].inboundAudioPipeline[trackid].destination.stream.addTrack(trk);
					log("secondary stream added");
					log(trk);
				}
			});
			
			return session.rpcs[UUID].inboundAudioPipeline[trackid].destination.stream;
		}
		return stream;
	} catch(e) {errorlog(e);}
	return stream;
}

function changeChannelOffset(UUID, channel){
	
	
	var ele = document.querySelectorAll('[data-action-type="add-channel"][data--u-u-i-d="' + UUID + '"]');
	for (var i=0;i<ele.length;i++){
		if (channel===i){
			if (ele[i].classList.contains("pressed")){
				ele[i].classList.remove("pressed");
				channel=false;
			} else {
				ele[i].classList.add("pressed");
			}
		} else {
			ele[i].classList.remove("pressed");
		}
	}
	
	session.rpcs[UUID].channelOffset = channel;
	var tracks = session.rpcs[UUID].streamSrc.getAudioTracks();
	if (tracks.length){
		var track = tracks[0];
		session.rpcs[UUID].videoElement.srcObject = addAudioPipeline(session.rpcs[UUID].streamSrc, UUID, track);
	}
	
}

function offsetChannel( destination, source, offset){
	session.audioCtx.destination.channelCountMode = 'explicit';
	session.audioCtx.destination.channelInterpretation = 'discrete';
	destination.channelCountMode = 'explicit';
	destination.channelInterpretation = 'discrete';
	
	try {
		destination.channelCount = session.audioChannels;
	} catch (e){errorlog("Max channels: "+destination.channelCount);}
	
	var splitter = session.audioCtx.createChannelSplitter(2);
	var merger = session.audioCtx.createChannelMerger(2+offset);
	
	source.connect(splitter);
	splitter.connect(merger, 0,offset);
	
	if ((session.stereo) && (session.stereo!=3)){
		splitter.connect(merger, 1, 1+offset);
	}
	return merger;
}

function addDelayNode(source, UUID, trackid){  // append the delay Node to the track??? WOULD THIS WORK?
	session.rpcs[UUID].inboundAudioPipeline[trackid].delayNode = session.audioCtx.createDelay(5.0);
	var delay = parseFloat(session.sync/1000);
	if (delay<0){delay=0;}
	session.rpcs[UUID].inboundAudioPipeline[trackid].delayNode.delayTime.value = delay; // delayTime takes it in seconds.
	source.connect(session.rpcs[UUID].inboundAudioPipeline[trackid].delayNode);
	log("added new delay node");
	return session.rpcs[UUID].inboundAudioPipeline[trackid].delayNode;
}

function fftWaveform( source, UUID, trackid){  // append the delay Node to the track??? WOULD THIS WORK?
	// https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode
	session.rpcs[UUID].inboundAudioPipeline[trackid].analyser = session.audioCtx.createAnalyser();
	session.rpcs[UUID].inboundAudioPipeline[trackid].analyser.fftSize = 512;
	var bufferLength = session.rpcs[UUID].inboundAudioPipeline[trackid].analyser.frequencyBinCount;
	var dataArray = new Uint8Array(bufferLength);
	session.rpcs[UUID].inboundAudioPipeline[trackid].analyser.getByteTimeDomainData(dataArray);
	// analyser.getByteTimeDomainData(dataArray);
	source.connect(session.rpcs[UUID].inboundAudioPipeline[trackid].analyser);
	
	if (session.rpcs[UUID].canvas===null){
		session.rpcs[UUID].canvas = document.createElement("canvas");
		session.rpcs[UUID].canvas.width="256";
		session.rpcs[UUID].canvas.height="144";
		session.rpcs[UUID].canvas.dataset.UUID = UUID
		session.rpcs[UUID].canvas.style.pointerEvents = "auto";
		session.rpcs[UUID].canvasCtx = session.rpcs[UUID].canvas.getContext('2d');
		//
		session.rpcs[UUID].canvas.addEventListener('click', function(e) { // show stats of video if double clicked
			log("clicked");
			try {
				if ((e.ctrlKey)||(e.metaKey)){
					e.preventDefault();
					var uid = e.currentTarget.dataset.UUID;
					if ("stats" in session.rpcs[uid]){
						
						var [menu, innerMenu] = statsMenuCreator();
						
						printViewStats(innerMenu, session.rpcs[uid].stats, session.rpcs[uid].streamID );
						
						menu.interval = setInterval(printViewStats,3000, innerMenu, session.rpcs[uid].stats, session.rpcs[uid].streamID);
						
					}
					e.stopPropagation();
					return false;
				}
			} catch(e){errorlog(e);}
		});
		
		if (session.statsMenu){
			if ("stats" in session.rpcs[UUID]){
				
				var [menu, innerMenu] = statsMenuCreator();
				
				printViewStats(innerMenu, session.rpcs[UUID].stats, session.rpcs[UUID].streamID );
				
				menu.interval = setInterval(printViewStats,3000, innerMenu, session.rpcs[UUID].stats, session.rpcs[UUID].streamID);
				
				
				
			}
		}
		//
		updateMixer();
		//getById("gridlayout").appendChild(session.rpcs[UUID].canvas);
	}
	
	var fftInterval = setInterval(function(uuid){
		try{
			session.rpcs[UUID].inboundAudioPipeline[trackid].analyser.getByteTimeDomainData(dataArray);
			session.rpcs[uuid].canvasCtx.fillStyle = "rgba(0, 0, 0, 0.2)";
			session.rpcs[uuid].canvasCtx.fillRect(0, 0, session.rpcs[uuid].canvas.width, session.rpcs[uuid].canvas.height);
			session.rpcs[uuid].canvasCtx.lineWidth = 2;
			session.rpcs[uuid].canvasCtx.strokeStyle = "rgb(111, 255, 111)";
			
			var sliceWidth = session.rpcs[uuid].canvas.width * 1.0 / bufferLength;
			var x = 0;

			var loudness = dataArray;
			var Squares = loudness.map((val) => ((val-128.0)*(val-128.0)));
			var Sum = Squares.reduce((acum, val) => (acum + val));
			var Mean = Sum/loudness.length;
			loudness = Math.sqrt(Mean)*10;
			session.rpcs[uuid].stats.Audio_Loudness = parseInt(loudness);
			
			if (session.pushLoudness==true){
				var loudnessObj = {};
				loudnessObj[session.rpcs[uuid].streamID] = session.rpcs[uuid].stats.Audio_Loudness;
				
				if (isIFrame){
					parent.postMessage({"loudness": loudnessObj, "action":"loudness", "value":loudness, "UUID":uuid}, "*");
				}
			}
			
			if (loudness<2){return;}
			
			//log(bufferLength);
			session.rpcs[uuid].canvasCtx.beginPath();
			var m = session.rpcs[uuid].canvas.height / 256.0;
			session.rpcs[uuid].canvasCtx.moveTo(0, dataArray[0]*m);
			for (var i = 1; i < bufferLength; i++){
				var y = dataArray[i] * m;
				session.rpcs[uuid].canvasCtx.lineTo(x, y);
				x += sliceWidth;
			}
			session.rpcs[uuid].canvasCtx.lineTo(session.rpcs[uuid].canvas.width, session.rpcs[uuid].canvas.height / 2);
			session.rpcs[uuid].canvasCtx.stroke();
		} catch(e){
			warnlog(e);
			warnlog("Did the remote source disconnect?");
			clearInterval(fftInterval);
			warnlog(session.rpcs[uuid]);
		}
	},50, UUID);
	return session.rpcs[UUID].inboundAudioPipeline[trackid].analyser; 
}

function audioMeterGuest(mediaStreamSource, UUID, trackid){
	log("audioMeterGuest started");
	session.rpcs[UUID].inboundAudioPipeline[trackid].analyser = session.audioCtx.createAnalyser();
	mediaStreamSource.connect(session.rpcs[UUID].inboundAudioPipeline[trackid].analyser);
	session.rpcs[UUID].inboundAudioPipeline[trackid].analyser.fftSize = 256;
	session.rpcs[UUID].inboundAudioPipeline[trackid].analyser.smoothingTimeConstant = 0.05;
	
	var bufferLength = session.rpcs[UUID].inboundAudioPipeline[trackid].analyser.frequencyBinCount;
	var dataArray = new Uint8Array(bufferLength);
	
	function updateLevels() {
		if (!(UUID in session.rpcs)){return;}
		try {
			session.rpcs[UUID].inboundAudioPipeline[trackid].analyser.getByteFrequencyData(dataArray);
			var total = 0;
			for (var i = 0; i < dataArray.length; i++){
				total += dataArray[i];
			}
			total = total/100;
			session.rpcs[UUID].stats.Audio_Loudness = parseInt(total);
			
			if (session.pushLoudness==true){
				var loudnessObj = {};
				loudnessObj[session.rpcs[UUID].streamID] = session.rpcs[UUID].stats.Audio_Loudness;
				
				if (isIFrame){
					parent.postMessage({"loudness": loudnessObj, "action":"loudness", "value":session.rpcs[UUID].stats.Audio_Loudness, "UUID":UUID}, "*");
				}
			}
			
			try{
				clearTimeout(session.rpcs[UUID].inboundAudioPipeline[trackid].analyser.interval);
				session.rpcs[UUID].inboundAudioPipeline[trackid].analyser.interval = setTimeout(function(){updateLevels();},100);
			} catch(e){
				log("closing old inaudio pipeline");
			}
			
			if (session.scene!==false){return;} // don't show if a scene
			if (session.audioMeterGuest===false){return;} // don't show if we just want the volume levels
			
			if (session.rpcs[UUID].voiceMeter){
				if (total>15){
					session.rpcs[UUID].voiceMeter.style.opacity = 100; // temporary
				} else {
					session.rpcs[UUID].voiceMeter.style.opacity = 0; // temporary
				}
				session.rpcs[UUID].voiceMeter.dataset.level = total;
			} else {
				session.rpcs[UUID].voiceMeter = getById("voiceMeterTemplate").cloneNode(true);
				session.rpcs[UUID].voiceMeter.id = "voiceMeter_"+UUID;
				if (total>15){
					session.rpcs[UUID].voiceMeter.style.opacity = 100; // temporary
				} else {
					session.rpcs[UUID].voiceMeter.style.opacity = 0; // temporary
				}
				//session.rpcs[UUID].voiceMeter.style.display = "block";
				session.rpcs[UUID].voiceMeter.dataset.level = total;
				updateMixer();
			}
			
		} catch(e){
			warnlog(e);
			return;
		}
	};
	clearTimeout(session.rpcs[UUID].inboundAudioPipeline[trackid].analyser.interval);
	session.rpcs[UUID].inboundAudioPipeline[trackid].analyser.interval = setTimeout(function(){updateLevels();},100);
	return session.rpcs[UUID].inboundAudioPipeline[trackid].analyser;
}

function effectsDynamicallyUpdate(event, ele, preview=true){
	
	var effect = ele.options[ele.selectedIndex].value;
	getById("selectImageTFLITE").style.display = "none";
	if (effect === "0"){
		session.effects = 0;
		activatedPreview=false;
		if (preview){
			grabVideo();
		} else {
			grabVideo(session.quality, "videosource", "select#videoSource3");
		}
		if (ele.id == "effectSelector"){
			getById("selectImageTFLITE").style.display = "none";
		} else {
			getById("selectImageTFLITE3").style.display = "none";
		}
		return;
	} else if (effect === "3"){
		if ((session.effects<3) || (session.effects>5)){
			session.effects = 3;
			activatedPreview=false;
			if (preview){
				grabVideo();
			} else {
				grabVideo(session.quality, "videosource", "select#videoSource3");
			}
		} else {
			session.effects = 3;
		}
	} else if (effect === "4"){
		if ((session.effects<3) || (session.effects>5)){
			session.effects = 4;
			activatedPreview=false;
			if (preview){
				grabVideo();
			} else {
				grabVideo(session.quality, "videosource", "select#videoSource3");
			}
		} else {
			session.effects = 4;
		}
	} else if (effect === "5"){
		if (session.tfliteModule.img){
			session.tfliteModule.img.src = "./media/bg_sample.jpg";
		}
		if ((session.effects<3) || (session.effects>5)){
			session.effects = 5;
			activatedPreview=false;
			if (preview){
				grabVideo();
			} else {
				grabVideo(session.quality, "videosource", "select#videoSource3");
			}
		} else {
			session.effects = 5;
		}
		if (ele.id == "effectSelector"){
			getById("selectImageTFLITE").style.display = "block";
		} else {
			getById("selectImageTFLITE3").style.display = "block";
		}
	} else if (effect === "6"){
		session.effects = 6;
		activatedPreview=false;
		if (preview){
			grabVideo();
		} else {
			grabVideo(session.quality, "videosource", "select#videoSource3");
		}
	} 
	
	if (session.effects !== 5){
		if (ele.id == "effectSelector"){
			getById("selectImageTFLITE").style.display = "none";
		} else {
			getById("selectImageTFLITE3").style.display = "none";
		}
	}
	
	if (session.tfliteModule===false){
		attemptTFLiteJsFileLoad();
	}
}
var TFLITELOADING = false;
function attemptTFLiteJsFileLoad(){
	if (session.tfliteModule!==false){
		return true;
	}
	TFLITELOADING=true;
	session.tfliteModule={};
		
	if (!document.getElementById("tflitesimdjs")){
		var tmpScript = document.createElement('script');
		tmpScript.onload = loadTFLiteModel;
		tmpScript.type = 'text/javascript';
		tmpScript.src = "./thirdparty/tflite/tflite-simd.js?ver=2";
		tmpScript.id = "tflitesimdjs";
		document.head.appendChild(tmpScript);
	}
	
	return false;
}
async function changeTFLiteImage(ev, ele){
	
	if (ele.files && ele.files[0]) {
		session.tfliteModule.img = document.querySelector('img');
		session.tfliteModule.img.ready=false;
		session.tfliteModule.img.onload = () => {
			URL.revokeObjectURL(session.tfliteModule.img.src);  // no longer needed, free memory
			session.tfliteModule.img.ready=true;
		}
		session.tfliteModule.img.src = URL.createObjectURL(ele.files[0]); // set src to blob url
	} else if (ele.tagName.toLowerCase() == "img"){
		session.tfliteModule.img = ele
		session.tfliteModule.img.ready=true;
	}
}


async function loadTFLiteModel(){
	try{
		if (session.tfliteModule && (session.tfliteModule.img)){
			var img = session.tfliteModule.img;
			session.tfliteModule = await createTFLiteSIMDModule();
			session.tfliteModule.img = img;
		} else {
			session.tfliteModule = {};
			session.tfliteModule = await createTFLiteSIMDModule();
		}
		if (!session.tfliteModule.simd){
			var elements = document.querySelectorAll('[data-warnSimdNotice]')
			for (let i = 0; i < elements.length; i++) {
				elements[i].style.display = "inline-block";
			}
		}
	} catch(e){
		warnlog("TF-LITE FAILED TO LOAD");
		return;
	}
	const modelResponse = await fetch("./thirdparty/tflite/segm_full_v679.tflite");
	session.tfliteModule.model = await modelResponse.arrayBuffer();
	console.log('Model buffer size:', session.tfliteModule.model.byteLength);
	session.tfliteModule.HEAPU8.set(new Uint8Array(session.tfliteModule.model), session.tfliteModule._getModelBufferMemoryOffset());
	session.tfliteModule._loadModel(session.tfliteModule.model.byteLength);
	session.tfliteModule.activelyProcessing = false;
	TFLITELOADING = false;
	if ((session.effects>=3) && (session.effects<=5)){
		if (document.getElementById("videosource")){
			activatedPreview=false;
			grabVideo(session.quality, "videosource", "select#videoSource3");
		}
	}
	if (LaunchTFWorkerCallback){TFLiteWorker();}
}


if ((session.effects==3) || (session.effects==4) || (session.effects==5)){
	attemptTFLiteJsFileLoad();
} else if (session.effects==6){
	var script = document.createElement('script');
	var script2 = document.createElement('script');
	var script3 = document.createElement('script');
	var script4 = document.createElement('script');
	var model = false;
	script.onload = function() {
		document.head.appendChild(script2);
	}
	script2.onload = function() {
		document.head.appendChild(script3);
	}
	script3.onload = function() {
		document.head.appendChild(script4);
	}
	script4.onload = function() {
		async function loadModel(){
			model = await faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediapipeFacemesh);
			
		}
		loadModel();
	}
	script.src = "https://unpkg.com/@tensorflow/tfjs-core@2.4.0/dist/tf-core.js";
	script2.src = "https://unpkg.com/@tensorflow/tfjs-converter@2.4.0/dist/tf-converter.js";
	script3.src = "https://unpkg.com/@tensorflow/tfjs-backend-webgl@2.4.0/dist/tf-backend-webgl.js";
	script4.src = "https://unpkg.com/@tensorflow-models/face-landmarks-detection@0.0.1/dist/face-landmarks-detection.js";
	
	script.type = 'text/javascript';script2.type = 'text/javascript';script3.type = 'text/javascript';script4.type = 'text/javascript';
	document.head.appendChild(script);
} 
if (session.midiHotkeys) {
	var script = document.createElement('script');
	script.onload = function() {
		WebMidi.enable(function(err) { // hotkeys

			if (err) {
				errorlog(err);
			}

			WebMidi.addListener("connected", function(e) {
				log(e);
			});

			WebMidi.addListener("disconnected", function(e) {
				log(e);
			});

			for (var i = 0; i < WebMidi.inputs.length; i++) {
				var input = WebMidi.inputs[i];
				if (session.midiHotkeys==1){
					input.addListener('noteon', "all", function(e) {
						log(e);
						var note = e.note.name + e.note.octave;
						if (note == "G3") {  // open and close the chat window
							toggleChat();
						} else if (note == "A3") { // mute your audio output
							toggleMute();
						} else if (note == "B3") { // mute your video output
							toggleVideoMute();
						} else if (note == "C4") { // enable / disable screenshare
							toggleScreenShare();
						} else if (note == "D4") { // completely kill your connection/session
							hangup();
						} else if (note == "E4") { // raise your hand; director sees this
							raisehand();
						} else if (note == "F4") { // start/stop local recording
							recordLocalVideoToggle();
						} else if (note == "G4") {  // Director Enables their Audio output
							press2talk(true);
						} else if (note == "A4") {  // Director cut's their audio/video output
							hangup2();
						}
					});
				} else if (session.midiHotkeys==2){
					input.addListener('noteon', "all", function(e) {
						log(e);
						var note = e.note.name + e.note.octave;
						if (note == "G1") {  // open and close the chat window
							toggleChat();
						} else if (note == "A1") { // mute your audio output
							toggleMute();
						} else if (note == "B1") { // mute your video output
							toggleVideoMute();
						} else if (note == "C2") { // enable / disable screenshare
							toggleScreenShare();
						} else if (note == "D2") { // completely kill your connection/session
							hangup();
						} else if (note == "E2") { // raise your hand; director sees this
							raisehand();
						} else if (note == "F2") { // start/stop local recording
							recordLocalVideoToggle();
						} else if (note == "G2") {  // Director Enables their Audio output
							press2talk(true);
						} else if (note == "A2") {  // Director cut's their audio/video output
							hangup2();
						}
					});
				} else if (session.midiHotkeys==3){
					input.addListener('noteon', "all", function(e) {
						log(e);
						var note = e.note.name + e.note.octave;
						var velocity = e.velocity;
						if (note == "C1"){
							if (velocity == "0") {  // open and close the chat window
								toggleChat();
							} else if (note == "1") { // mute your audio output
								toggleMute();
							} else if (note == "2") { // mute your video output
								toggleVideoMute();
							} else if (note == "3") { // enable / disable screenshare
								toggleScreenShare();
							} else if (note == "4") { // completely kill your connection/session
								hangup();
							} else if (note == "5") { // raise your hand; director sees this
								raisehand();
							} else if (note == "6") { // start/stop local recording
								recordLocalVideoToggle();
							} else if (note == "7") {  // Director Enables their Audio output
								press2talk(true);
							} else if (note == "8") {  // Director cut's their audio/video output
								hangup2();
							}
						}
					});
				} else if (session.midiHotkeys==4){
					
					/* channel: 1
					controller: {number: 110, name: undefined}
					data: Uint8Array(3) [176, 110, 3]
					target: Input {_userHandlers: {…}, _midiInput: MIDIInput, …}
					timestamp: 98235.34000001382
					type: "controlchange"
					value: 3 */
					
					input.addListener('controlchange', "all", function(e) {
						log(e);
						if (e.channel!==1){
							errorlog("OBSN is currently configured for use on channel 1");
							return;
						} // channel 1?
						
						var command = e.controller.number;
						var value = e.value;
						
						if (command == 110){
							if (value == 0) {  // open and close the chat window
								toggleChat();
							} else if (value == 1) { // mute your audio output
								toggleMute();
							} else if (value == 2) { // mute your video output
								toggleVideoMute();
							} else if (value == 3) { // enable / disable screenshare
								toggleScreenShare();
							} else if (value == 4) { // completely kill your connection/session
								hangup();
							} else if (value == 5) { // raise your hand; director sees this
								raisehand();
							} else if (value == 6) { // start/stop local recording
								recordLocalVideoToggle();
							} else if (value == 7) {  // Director Enables their Audio output
								press2talk(true);
							} else if (value == 8) {  // Director cut's their audio/video output
								hangup2();
							}
						} else if (command > 110){
							var guestslot = command-111;
							if (value == 0) { 
								var elements = document.querySelectorAll('[data-action-type="forward"][data--u-u-i-d]');
								if (elements[guestslot]) {
									directMigrate(elements[guestslot], true);
								}
							} else if (value == 1) { 
								var elements = document.querySelectorAll('[data-action-type="addToScene"][data--u-u-i-d]');
								if (elements[guestslot]) {
									directEnable(elements[guestslot], true);
								}
							} else if (value == 2) { 
								var elements = document.querySelectorAll('[data-action-type="mute-scene"][data--u-u-i-d]');
								if (elements[guestslot]) {
									directMute(elements[guestslot], true);
								}
							} else if (value == 3) { 
								var elements = document.querySelectorAll('[data-action-type="mute-guest"][data--u-u-i-d]');
								if (elements[guestslot]) {
									directMute(elements[guestslot], true);
								}
							}  else if (value == 4) { 
								var elements = document.querySelectorAll('[data-action-type="hangup"][data--u-u-i-d]');
								if (elements[guestslot]) {
									directHangup(elements[guestslot], true);
								}
							} else if (value == 5) { 
								var elements = document.querySelectorAll('[data-action-type="solo-chat"][data--u-u-i-d]');
								if (elements[guestslot]) {
									session.toggleSoloChat(elements[guestslot].dataset.UUID);
								}
							
							} else if (value == 6) { 
								var elements = document.querySelectorAll('[data-action-type="toggle-remote-speaker"][data--u-u-i-d]');
								if (elements[guestslot]) {
									remoteSpeakerMute(elements[guestslot]);
								}
							} else if (value == 7) { 
								var elements = document.querySelectorAll('[data-action-type="toggle-remote-display"][data--u-u-i-d]');
								if (elements[guestslot]) {
									remoteDisplayMute(elements[guestslot]);
								}
							} else if ((value => 27)) { 
								var elements = document.querySelectorAll('[data-action-type="volume"][data--u-u-i-d]');
								if (elements[guestslot]) {
									elements[guestslot].value = parseInt(value-27);
									remoteVolume(elements[guestslot]);
								}
							}
						}
					});
				}
			}
		});
	};
	script.src = "./thirdparty/webmidi.js"; // dynamically load this only if its needed. Keeps loading time down.
	document.head.appendChild(script);
}

document.body.innerHTML += '<style id="lightbox-animations" type="text/css"></style>';
addEventToAll(".column", 'click', function(e, ele) {
	if (ele.classList.contains("skip-animation")) {
		return;
	}
	var bounding_box = ele.getBoundingClientRect();
	ele.style.top = bounding_box.top + "px";
	ele.style.left = (bounding_box.left - 20) + "px";
	ele.classList.add('in-animation');
	ele.classList.remove('pointer');
	if (document.getElementById("empty-container")) {
		getById("empty-container").parentNode.removeChid(getById("empty-container"));
	}
	var empty = document.createElement("DIV");
	empty.id = "empty-container";
	empty.className = "column";
	ele.parentNode.insertBefore(empty, ele.nextSibling);
	const styles = "\
		@keyframes outlightbox {\
			0% {\
				height: 100%;\
				width: 100%;\
				top: 0px;\
				left: 0px;\
			}\
			50% {\
				height: 200px;\
				top: " + bounding_box.y + "px;\
			}\
			100% {\
				height: 200px;\
				width: " + bounding_box.width + "px;\
				top: " + bounding_box.y + "px;\
				left: " + bounding_box.x + "px;\
			}\
		}\
	";
	if (document.getElementById('lightbox-animations')) {
		getById("lightbox-animations").innerHTML = styles;
	}
	document.body.style.overflow = "hidden";
});
addEventToAll(".close", 'click', function(e, ele) {
	cleanupMediaTracks();
	ele.style.display = "none";
	mapToAll(".container-inner", function(target) {
		target.style.display = "none";
	});
	document.body.style.overflow = "auto";
	var bounding_box = getById("empty-container").parentNode.getBoundingClientRect();
	setTimeout(function() { // just smoothes things out; breathing room to clean up things first.
		ele.parentNode.classList.add('out-animation');
	}, 1);
	ele.parentNode.style.top = bounding_box.top + 'px';
	ele.parentNode.style.left = bounding_box.left + 'px';
	e.stopPropagation();
});
addEventToAll(".column", 'animationend', function(e, ele) {
	if (e.animationName == 'inlightbox') {
		ele.classList.add("skip-animation");
		mapToAll(".close", function(target) {
			target.style.display = "block";
		}, ele);
		mapToAll(".container-inner", function(target) {
			target.style.display = "block";
		}, ele);
	} else if (e.animationName == 'outlightbox') {
		ele.classList.remove('in-animation');
		ele.classList.remove('out-animation');
		ele.classList.remove("skip-animation");
		ele.classList.remove('columnfade');
		ele.classList.add('pointer');
		getById("empty-container").parentNode.removeChild(getById("empty-container"));
		getById("lightbox-animations").sheet.deleteRule(0);
	}
});
addEventToAll("#audioSource", 'mousedown touchend focusin focusout', function(e, ele) {
	var state = getById('multiselect-trigger').dataset.state || 0;
	if (state == 0) {
		getById('multiselect-trigger').dataset.state = 1;
		getById('multiselect-trigger').classList.add('open');
		getById('multiselect-trigger').classList.remove('closed');
		mapToAll('.chevron', function(ele) {
			ele.classList.remove('bottom');
		}, parentElement = getById('multiselect-trigger'));
		mapToAll('.multiselect-contents', function(ele) {
			ele.style.display = "block";
			mapToAll('input[type="checkbox"]', function(ele2) {
				ele2.parentNode.style.display = "block";
				ele2.style.display = "inline-block";
			}, ele);
		}, parentElement = getById('multiselect-trigger').parentNode);
	}
	e.stopPropagation();
	//e.preventDefault();
});
addEventToAll("#audioSource3", 'mousedown touchend focusin focusout', function(e, ele) {
	var state = getById('multiselect-trigger3').dataset.state || 0;
	if (state == 0) {
		getById('multiselect-trigger3').dataset.state = 1;
		getById('multiselect-trigger3').classList.add('open');
		getById('multiselect-trigger3').classList.remove('closed');
		mapToAll(".chevron", function(target) {
			target.classList.remove('bottom');
		}, getById('multiselect-trigger3'));
		mapToAll(".multiselect-contents", function(target) {
			target.style.display = "block";
		}, getById('multiselect-trigger3').parentNode);
		mapToAll(".multiselect-contents", function(target) {
			mapToAll('input[type="checkbox"]', function(target2) {
				target2.style.display = "inline-block";
				target2.parentNode.style.display = "block";
			}, target);
		}, getById('multiselect-trigger3').parentNode);
	}
	e.stopPropagation();
	//e.preventDefault();
});
addEventToAll("#multiselect-trigger", 'mousedown touchend focusin focusout', function(e, ele) {
	var state = ele.dataset.state || 0;
	if (state == 0) { // open the dropdown
		ele.dataset.state = 1;
		ele.classList.add('open');
		ele.classList.remove('closed');
		mapToAll(".chevron", function(target) {
			target.classList.remove('bottom');
		}, getById('multiselect-trigger'));
		mapToAll(".multiselect-contents", function(target) {
			target.style.display = "block";
		}, ele.parentNode);
		mapToAll(".multiselect-contents", function(target) {
			mapToAll('input[type="checkbox"]', function(target2) {
				target2.style.display = "inline-block";
				target2.parentNode.style.display = "block";
			}, target);
		}, ele.parentNode);
	} else { // close the dropdown
		ele.dataset.state = 0;
		ele.classList.add('closed');
		ele.classList.remove('open');
		mapToAll(".chevron", function(target) {
			target.classList.add('bottom');
		}, ele);
		mapToAll(".multiselect-contents", function(target) {
			mapToAll('input[type="checkbox"]', function(target2) {
				target2.style.display = "none";
				if (!target2.checked) {
					target2.parentNode.style.display = "none";
				}
			}, target);
		}, ele.parentNode);
	}
	e.preventDefault();
	e.stopPropagation();
});
addEventToAll("#multiselect-trigger3", 'mousedown touchend focusin focusout', function(e, ele) {
	var state = ele.dataset.state || 0;
	if (state == 0) { // open the dropdown
		ele.dataset.state = 1;
		ele.classList.add('open');
		ele.classList.remove('closed');
		mapToAll(".chevron", function(target) {
			target.classList.remove('bottom');
		}, ele);
		mapToAll(".multiselect-contents", function(target) {
			target.style.display = "block";
		}, ele.parentNode);
		mapToAll(".multiselect-contents", function(target) {
			mapToAll('input[type="checkbox"]', function(target2) {
				target2.style.display = "inline-block";
				target2.parentNode.style.display = "block";
			}, target);
		}, ele.parentNode);
	} else { // close the dropdown
		ele.dataset.state = 0;
		ele.classList.add('closed');
		ele.classList.remove('open');
		mapToAll(".chevron", function(target) {
			target.classList.add('bottom');
		}, ele);
		mapToAll(".multiselect-contents", function(target) {
			mapToAll('input[type="checkbox"]', function(target2) {
				target2.style.display = "none";
				if (!target2.checked) {
					target2.parentNode.style.display = "none";
				}
			}, target);
		}, ele.parentNode);
	}
	e.preventDefault();
	e.stopPropagation();
});


// Warns user about network going down
window.addEventListener("offline", function (e) {
	if ((session.view) && (session.permaid === false)) {
		log( "OBS.Ninja has no network connectivity and can't work properly." );
	} else if (session.scene !== false) {
		log( "OBS.Ninja has no network connectivity and can't work properly." );
	} else if (!session.cleanOutput) {
		warnUser("Network connection lost.");
	} else {
		log("OBS.Ninja has no network connectivity and can't work properly.");
	}
});

window.addEventListener("online", function (e) {
	closeModal();
});

// Remove modal if network comes back up
window.addEventListener("online", function (e) {
	if (!session.cleanOutput) {
		// Remove last inserted modal; Could be improved by tagging the
		// modal elements and only removing modals tagged 'offline'
		userWarnings = document.querySelectorAll('.alertModal');
		closeModal(userWarnings[userWarnings.length- 1]);
	} else {
	  log(
		"Network connectivity has been restored."
	  );
	}
  });
