
		console.log("herere");

		/**
			This is an example variable that counts how many times the !test command was used.
		*/
		
		// Sourced From Daveo: http://stackoverflow.com/questions/3809401/what-is-a-good-regular-expression-to-match-a-url
		var _passiveRegex = new RegExp(/[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
		var _strictRegex = new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
		
		var _topLevelDomains = null;
		
		var _UserStatusMatrix = {
			Mod: {
				TimeOutUser: false,
				TimeoutLengthSeconds: 1,
				AllowedWarnings: 1,
				WarningMessage: "No Links allowed in chat. <FROM>"
			},
			Sub: {
				TimeOutUser: false,
				TimeoutLengthSeconds: 1,
				AllowedWarnings: 1,
				WarningMessage: "No Links allowed in chat. <FROM>"
			},
			Dev: {
				TimeOutUser: false,
				TimeoutLengthSeconds: 1,
				AllowedWarnings: 1,
				WarningMessage: "No Links allowed in chat. <FROM>"
			},
			Pleb: {
				TimeOutUser: true,
				TimeoutLengthSeconds: (60 * 5), // 5 Minutes
				AllowedWarnings: 10,
				WarningMessage: "No Links allowed in chat. <FROM>"
			}
		};
		
		var _UsersWarnedMatrix = {
			"~Username~": 0
		};
		
		/**
			This method can be used to initialize the module.
		*/
		function Init_Module() {		
			_Module_ReadData();
			_Module_GetExternalResources();
		}

		/**
			This is raised when a new chat message is received in the chat
		*/
		function OnChatMessage_Recieved(MessageObject) {
			// Execute some instructions if the command !test is typed into chat.
			
			var _isUrl = false;
			
			if(typeof(MessageObject) !== "undefined" && MessageObject.Message && MessageObject.ContainsLinks)
			{
				// Absolute match
				if(MessageObject.Message.match(_strictRegex)) {
					_isUrl = true;
				} else {
					// A very lose filter. Need some human touching up
					if(MessageObject.Message.match(_passiveRegex)) {
						if(typeof(_topLevelDomains) !== "undefined" && _topLevelDomains != null && MessageObject.Message.indexOf(".") > -1 && MessageObject.Message.length >= 6) {
							var _parts = MessageObject.Message.split(" ");
							
							for(var i = 0; i < _parts.length; i++) {
								if(_parts[i].indexOf(".") > 1) {
									for(var k = 0; k < _topLevelDomains.length; k++) {
										var s = _parts[i].indexOf("/"), l = _parts[i].indexOf(_topLevelDomains[k]);
										//console.log("Domain: " + _topLevelDomains[k] + ", S = " + s + ", L = " + l + ", Length = " + _topLevelDomains[k].length + ", MLength = " + _parts[i].length + ", Sum = " + (_topLevelDomains[k].length + l) + " == " + (s == -1 ? _parts[i].length : s));
										if( l > -1 && ((_topLevelDomains[k].length + l) == (s == -1 ? _parts[i].length : s))) {
											_isUrl = true;
											break;
										}
									}
								}
								
								if(_isUrl)
									break;
							}
						}
					}
				}
				
				if(_isUrl) {
					var _timeoutUser = false, _removeLink = false, _StatusMatrix = null;
					
					if(MessageObject.isMod)
					{
						_StatusMatrix = _UserStatusMatrix.Mod;
					}
					else if(MessageObject.isSub)
					{
						_StatusMatrix = _UserStatusMatrix.Sub;
					}
					else if(MessageObject.isDev)
					{
						_StatusMatrix = _UserStatusMatrix.Dev;
					}	
					else
					{
						_StatusMatrix = _UserStatusMatrix.Pleb;
					}
					
					if(_StatusMatrix.TimeOutUser) {
						if(_StatusMatrix.AllowedWarnings > 0)
						{
							// Add user to warning matrix
							if(typeof(_UsersWarnedMatrix[MessageObject.From.toLowerCase()]) === "undefined")
								_UsersWarnedMatrix[MessageObject.From.toLowerCase()] = 0;
								
							if( (++_UsersWarnedMatrix[MessageObject.From.toLowerCase()]) > _StatusMatrix.AllowedWarnings)
								_timeoutUser = true;
							else 
								SendChatMessage(_StatusMatrix.WarningMessage.replace("<FROM>", "@" + MessageObject.From));
							
							SaveData();
							
							_removeLink = true;
						} else {
							_timeoutUser = true;
						}
					}
					
					if(_timeoutUser) {
						// Give them a warning next time before another timeout
						_UsersWarnedMatrix[MessageObject.From.toLowerCase()]--;
						SendChatMessage("/timeout " + MessageObject.From + " " + _StatusMatrix.TimeoutLengthSeconds);
					} else if(_removeLink) {
						SendChatMessage("/timeout " + MessageObject.From + " 2");
					}
				}
			}
		}

		
		function SaveData() {
			_Module_SaveData({
				"WarnedUserMatrix": _UsersWarnedMatrix,
				"UserStatusMatrix": _UserStatusMatrix
			});
		}
		
		/**
			Invoke _Module_SaveData(DataObject); to save data. 
			The method below will be raised when completed.
		*/
		function OnData_Saved() {
			 
		}

		/**
		 Get external resources
		 
		 Invoke _Module_GetExternalResources(); and the method below will be raised with the data as the argument.
		*/
		function OnResource_Received(data) {
			if(typeof(data) !== "undefined" && data != null) {
				try {
					var obj = JSON.parse(data);
					if(obj != null) {
						_topLevelDomains = obj.TopLevelDomains;
					}
				} catch(e) {
					console.log("Failed Parsing External Resource");
				}
			}
		}
		
		/**
			Invoke _Module_ReadData(); 
			The method below will be raised with the data as an argument. 
			Check for a null argument. 
		*/
		function OnData_Read(data) {
			// Make sure we have data to use
			if(data != null)
			{
				if(typeof(data.UserStatusMatrix) !== "undefined")
					_UserStatusMatrix = data.UserStatusMatrix;
				
				if(typeof(data.WarnedUserMatrix) !== "undefined")
					_UsersWarnedMatrix = data.WarnedUserMatrix;
			}
		}

		/**
			Invoke this override function to send a message to the chat. You may send a message every 2 seconds. Messages
			will be queued if to many are sent at a time.
		*/
		function SendChatMessage(formattedMessage) {
			// _Module_SendMessage method can be called directly; instead of calling SendChatMessage(<Arg>);
			_Module_SendMessage(formattedMessage);
		}