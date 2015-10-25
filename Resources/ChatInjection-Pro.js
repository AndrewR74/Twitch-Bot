$(function() {
	var ExtensionID = "[EXTENSION_ID]";
	var Chat_ID = "[CHAT_ID]";
	var _EmberChatView = null;
	
	$('#' + Chat_ID).val("").focus().click();

	function _dispatchMessage(msg) {
		setTimeout(function() {
			for(var k in window.Ember.View.views) {
				if(typeof window.Ember.View.views[k].viewName !== 'undefined' && window.Ember.View.views[k].viewName == "room") {
					_EmberChatView = window.Ember.View.views[k];
					break; 
				}
			}
		
			if(_EmberChatView != null) {
				_EmberChatView.get("controller").set("model.messageToSend", msg);
				_EmberChatView.get("controller").send("sendMessage");
			}
		}, 250);
	}
	
	function _dispatchMessage_old() {
		$('#' + Chat_ID).focus();
		
		setTimeout(function() {
			$('#' + Chat_ID).blur();
			setTimeout(function() {
				$('#' + Chat_ID).focus();
				setTimeout(function() {
					var b = $.Event(
						'keydown');
					b.keyCode = 13;
					$('#' + Chat_ID).trigger(
						b).focus();
				}, 250);
			}, 250);
		}, 250);
	}
	
	setInterval(function() {
		if ($('#jQueue').children().size() > 0) {
			var _cMsg = $('#jQueue').children().first();
			
			if(_cMsg.data('cmd') == "message") {
				//if ($('#' + Chat_ID).val() == '') {
					//$('#' + Chat_ID).val(_cMsg.data('msg'));
					
					_dispatchMessage(_cMsg.data('msg'));
					_cMsg.remove();
					//_dispatchMessage_old();
				//}
			}
		}
		
		if ($('#jCommands').children().size() > 0) {
			var _jCommand = $('#jCommands').children().first();
			
			if(_jCommand.data('cmd') == "login") {
				_jCommand.remove();
				
				$('#' + Chat_ID).val("");
				
				setTimeout(function() {
					$("#login_div div.buttons > button.primary[type='submit']").click();
				}, 1000);
			}
		}
		
	}, 250);

})