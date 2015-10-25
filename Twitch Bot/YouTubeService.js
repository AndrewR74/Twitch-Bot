$(function() {
	if(typeof(player) !== "undefined" && player != null) {

		var port = chrome.runtime.connect();

		window.addEventListener("message", function(event) {
		  // We only accept messages from ourselves
		  if (event.source != window)
			return;

		  if (event.data.method && (event.data.method == "YouTubeSerivce")) {
				// Convert the YouTubeSerivce port message to a module out command for the background page.
				// The background page will handle getting the message to the module instance.
				chrome.runtime.sendMessage(event.data, function(response) { });
		  }
		}, false);
	}
})