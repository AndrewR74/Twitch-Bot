/**
 AUTO Generated Code - Do Not Modify
*/

$(function() {
	
	const COMMAND_VIDEO_DOESNT_EXIST = 0;
	const COMMAND_VIDEO_STARTED = 1;
	const COMMAND_VIDEO_STOPPED = 3;
	const COMMAND_VIDEO_ENDED = 13;
	const COMMAND_VIDEO_INFO = 4;
	const COMMAND_PLAYLIST_DOESNT_EXIST = 5;
	const COMMAND_PLAYLIST_INFO = 6;
	const COMMAND_GET_PLAYLIST = 7;
	const COMMAND_GET_VIDEO_INFO = 8;
	const COMMAND_PLAY_VIDEO = 9;
	const COMMAND_STOP_VIDEO = 10;
	const COMMAND_SET_VIDEO_VOLUME = 11;
	const COMMAND_PLAYER_FAILED_TO_LOAD = 12;
	
	_ModuleInstances["[MODULEID]"] = function () {
		
		var Module = {
			ID: "[MODULEID]",
			Name: "[MODULENAME]",
			InstanceID: -1,
			Manifest: {
				// If the module needs to make a request to a remote server then it needs to list the URL as allowed.
				AllowedUrls: []
			},
			LoadModule: function () {
				// This is placed here so it can be removed after completing the loading process.
				// It prevents the module from recalling it while in operation.
				
				// Send chrome message to get instance ID. If it doesn't exist we create one.
			}
		};
		
		/**
			Call load module
		*/
		Module.LoadModule();
		
		/**
			A date time to keep track of calls to background page
		*/
		var _lastResourceCall = null;
		
		/**
			A receiver to be implemented by the module to receive messages from other modules.
			
			Signature: (sender, argument, callback) 
		*/
		var _Module_OnModuleMessage_Recieved = null; 
		
		/** 
			This needs to be set by the module to be notified by a managed tab is closed.
			
			Signature: (tabId)
		*/
		var _Module_OnTabClosed = null;
		
		/**
			A receiver to be implemented by the module to receive message from the YouTube service page.
			
			Signature: (COMMAND, DATA)
		*/
		var _Module_OnYoutubeServiceMessage_Recieved = null;

		chrome.runtime.onMessage.addListener(
			function(request, sender) {
				if (request.method == "ModuleIn" && request.ModuleId == Module.ID) {
					switch(request.Command) {
						case "Message":
							OnChatMessage_Recieved(request.ModuleArgument);
						break;
						case "ReadData":
							OnData_Read(request.ModuleArgument);
						break;
						case "SavedData":
							OnData_Saved();
						break;
						case "ModuleResources":
							OnResource_Received(request.ModuleArgument);
						break;
						case "TabClosed":
							if(typeof(_Module_OnTabClosed) == "function") {
								_Module_OnTabClosed(request.ModuleArgument);
							}
						break;
						case "YouTubeSerivce":
							if(typeof(_Module_OnYoutubeServiceMessage_Recieved) == "function") {
								_Module_OnYoutubeServiceMessage_Recieved(request.ModuleArgument, request.ModuleArgument2);
							}
						break;
					}
				}
			}
		);

		function _Module_ReadData() {
			chrome.runtime.sendMessage({method: "ModuleOut", ModuleId: Module.ID, Command: "ReadData"}, function(response) { });
		}

		function _Module_SaveData(data) {
			chrome.runtime.sendMessage({method: "ModuleOut", ModuleId: Module.ID, Command: "SaveData", ModuleArgument: data}, function(response) { });
		}

		function _Module_SendMessage(formattedMessage) {
			chrome.runtime.sendMessage({method: "Message", Msg: formattedMessage}, function(response) {	});
		}
		
		/**
			Gets the external resource. Can only be called every 30 seconds
		*/
		function _Module_GetExternalResources() {
			if(_lastResourceCall == null || ((((new Date()).getTime()) - _lastResourceCall.getTime()) / 1000 ) >= 30) {
				_lastResourceCall = new Date();
				chrome.runtime.sendMessage({method: "ModuleOut", ModuleId: Module.ID, Command: "GetModuleResources"}, function(response) { });
			}
			else
				OnResource_Received(null);
		}
		
		/**
			Opens a new tab that is managed by the module. In the future modules may have multiple tabs based on server value.
			If the module already has a tab opened it will return 0 and "Tab already opened & Reached maximum number of tabs."
			Returns the ID of the opened tab
		*/
		function _Module_OpenTab(options, callback) {
			chrome.runtime.sendMessage({method: "ModuleOut", ModuleId: Module.ID, TabOptions: options, Command: "OpenTab"}, function(response) { 
				if(typeof(callback) === "function") {
					callback(response);
				}
			});
		}
		
		/**
			Closes an active module tab that was opened by this module
		*/
		function _Module_CloseTab(tabId, callback) {
			chrome.runtime.sendMessage({method: "ModuleOut", ModuleId: Module.ID, DeleteTabId: tabId, Command: "CloseTab"}, function(response) { 
				if(typeof(callback) === "function") {
					callback(response);
				}
			});
		}
		
		/**
			Update a managed module tab
		*/
		function _Module_UpdateTab(options, tabId, callback) {
			chrome.runtime.sendMessage({method: "ModuleOut", ModuleId: Module.ID, UpdateTabId: tabId, TabOptions: options, Command: "UpdateTab"}, function(response) { 
				if(typeof(callback) === "function") {
					callback(response);
				}
			});
		}

		/**
			Get the number of allowed tabs for this module
		*/
		function _Module_AllocatedTabs() {
			return 1;
		}
		
		/**
			Send another installed module a message
		*/
		function _Module_MessageModule(message, moduleId, callback) {
			
		}
		
		/**
			Saves data to the web. Allowing the module to access the data on the modules web page
		*/
		function _Module_WebResource_Save(data) {
			
		}
		
		/**
			Reads the data currently stored on the web for this Module ID & Channel Name & Instance ID
			
			ModuleID = this.Module_ID
			ChannelName = Twitch.ChannelName
			InstanceID = this.Module_Instance_ID
		*/
		function _Module_WebResource_Read() {
			
		}
		
		/**
			Creates a unique Instance ID for this Module ID & Channel Name.
			
			This is called by the module when it's installed. 
		*/
		function _Module_WebResource_CreateInstanceID() {
			return -1;
		}
		
		/**
			Makes a call to the remote server where the URL is verified it is in the module manifest.
			
			The URL is checked on the client side and server side. Just to prevent strain on the server.
			
			Development module won't be found on the server so the request will just be full filled.
			
			URL
			HTTP TYPE POST/GET/PUT
			HEADERS { Key, Value }
			AUTH { User-name, Password, etc } 
			BODY 
		*/
		function _Module_Http_Request(options, callback) {
			chrome.runtime.sendMessage({method: "ModuleOut", ModuleId: Module.ID, Command: "ExecuteModuleHttpGet", ModuleArgument: options}, callback);
		}
		
		function _TwitchBot_GetPlayerScore(playerName, callback) {
			chrome.runtime.sendMessage({method: "ModuleOut", ModuleId: Module.ID, Command: "GetPlayerScore", ModuleArgument: playerName}, callback);
		}
		
		function _TwitchBot_RemovePlayerScore(playerName, amount, callback) {
			_TwitchBot_AddPlayerScore(playerName, (amount * -1));
		}
		
		function _TwitchBot_AddPlayerScore(playerName, amount, callback) {
			chrome.runtime.sendMessage({method: "ModuleOut", ModuleId: Module.ID, Command: "ModifyPlayerScore", ModuleArgument: playerName, ModuleArgument2: amount }, callback);
		}
		
		function _TwitchBot_CanGameBotStart(callback) {
			chrome.runtime.sendMessage({method: "ModuleOut", ModuleId: Module.ID, Command: "CanGameBotStart"}, callback);
		}
		
		/**
			TODO: This needs to moved to the Module Load method when the Instance ID is implemented.
		*/
		Init_Module();

		/*[MODULE SCRIPT]*/	

		/**
		 Start Bot Module Template
		*/

		/**
		 This will be invoked when the bot has completed it's loading process.
		*/
		//function Init_Module() {		
		//	_Module_ReadData();
		//}

		/**
		 This is raised when a new chat message is received in the chat
		*/
		//function OnChatMessage_Recieved(MessageObject) {
		//	if(MessageObject.Message.toLowerCase() == "!test") {
		//		SendChatMessage("Hello World Test: " + _messagesSent++);
		//	}
		//}

		/**
		 Call this with any data you want to save for this channel
		 
		 Invoke _Module_SaveData(DataObject); to save data. The method below will be raised when completed
		 
		*/
		//function OnData_Saved() {
		//	 
		//}

		/**
		 Read all data saved for this module.
		 
		 Invoke _Module_ReadData(); and the method below will be raised with the data as the argument.
		*/
		//function OnData_Read(data) {
		//	if(data != null)
		//		_messagesSent = data.MessagesSent;
		//}
		
		
		/**
		 Get external resources
		 
		 Invoke _Module_GetExternalResources(); and the method below will be raised with the data as the argument.
		*/
		//function OnResource_Received(data) {
		//	if(data != null)
		//		console.log(data);
		//}
		
		/**
			Invoke this override function to send a message to the chat. You may send a message every 2 seconds. Messages
			will be queued if to many are sent at a time.
		*/
		//function SendChatMessage(formattedMessage) {
		//	_Module_SaveData({ MessagesSent: _messagesSent });
		//	
		//	_Module_SendMessage(formattedMessage);
		//}

		/**
		 Module code can go below here
		*/

		//var _messagesSent = 0;

	};

	_ModuleInstances["[MODULEID]"]();
})
