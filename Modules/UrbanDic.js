console.log("Kappa");

		var _checkingBotState = false, _isUrbanState = 0, _currentUrban, _hinted = false, _timeout;

		/**
			This method can be used to initialize the module.
		*/
		function Init_Module() {
		}

		/**
			This is raised when a new chat message is received in the chat
		*/
		function OnChatMessage_Recieved(MessageObject) {
			// Execute some instructions if the command !test is typed into chat.

			if(typeof(MessageObject) !== "undefined" && MessageObject.Message && MessageObject.Message.toLowerCase() == "!urban") {
				
				if(!_checkingBotState && _isUrbanState == 0) {
					
					_checkingBotState = true;
					
					_TwitchBot_CanGameBotStart(function(response) {
						_checkingBotState = false;
						
						if(response.ModuleArgument) {
							_isUrbanState = 1;
							
							_Module_Http_Request({ URL: "http://www.urbandictionary.com/random.php" }, function(httpResult) {
								var _content = $(httpResult.Body).find("#content > div.def-panel:first"),
								
								_word = _content.children("div.def-header:first").find("a.word:first").text(),
								_meaning = _content.children("div.meaning:first").text(), 
								_sententce = _content.children("div.example:first").text();
								
								console.log(_word);
								console.log(_meaning);
								console.log(_sententce);
								
								_meaning = _meaning.substr(0, ( _meaning.length > 75 ? 75 : _meaning.length )),
								_sententce = _sententce.substr(0, ( _sententce.length > 75 ? 75 : _sententce.length ));

								_currentUrban = {
									Word: _word,
									Meaning: _meaning,
									Sentence: _sententce
								};
								
								_hinted = false;
								
								SendChatMessage( "Urban Dictionary: " + ReplaceWith(_meaning, _word, "*"));
								
								_timeout = setTimeout(function() {
									
									if(_currentUrban != null) {
										SendChatMessage("Urban Time Ran Out. Answer: " + _currentUrban.Word);
										_hinted = false;
										_currentUrban = null;
										_timeout = null;
										_isUrbanState = 0;
									}
								}, 25000);
								
							});
						}
					});
				}
			} else if(typeof(MessageObject) !== "undefined" && MessageObject.Message && MessageObject.Message == "!hint") {
				if( typeof(_currentUrban) !== 'undefined' && _currentUrban != null && !_hinted) {
					_hinted = true;
					SendChatMessage( "Word: " + _currentUrban.Word.hint() + " - Example: " + ReplaceWith(_currentUrban.Sentence, _currentUrban.Word, "*"));
				}
			} else if(typeof(MessageObject) !== "undefined" && MessageObject.Message && MessageObject.Message == "!skip" && MessageObject.isMod) {
				_hinted = false;
				_currentUrban = null;
				_isUrbanState = 0;
				SendChatMessage("Urban skipped. Answer: " + _currentUrban.Word);
				
				if(typeof(_timeout) !== 'undefined' && _timeout != null)
					clearTimeout(_timeout);
				
			} else if( _isUrbanState == 1 && typeof(_currentUrban) !== 'undefined' && _currentUrban != null && MessageObject.Message.toLowerCase() == _currentUrban.Word.toLowerCase() ) {
				_isUrbanRunning = false;
				_hinted = true;
				_isUrbanState = 2;
				
				if(typeof(_timeout) !== 'undefined' && _timeout != null)
					clearTimeout(_timeout);
				
				_TwitchBot_AddPlayerScore(MessageObject.From, 1, function(response) {
					SendChatMessage("@" + MessageObject.From + " Has Won Urban. Score: " + response.ModuleArgument2);
					_isUrbanState = 0;
				});
			}
		}

		String.prototype.repeatSequence = function(x) {
			var g = "";
			for(var i = 0; i < x; i++)
				g = g + this;
			return g;
		}
		
		String.prototype.hint = function() {
			var _hint = "";
			
			for (var i = 0, len = this.length; i < len; i++) {
				var _ascii = this.charCodeAt(i);
				
				// Display weird characters
				if((_ascii < 97 || _ascii > 122) && (_ascii < 48 || _ascii > 57)) {
					_hint += this[i];
				} else {
					// Display the first character of a word
					if((i > 0 && this[i-1] == " ") || i == 0)
						_hint += this[i];
					else
						_hint += "*";
				}
			}
			
			return _hint;
		}
		
	
		
		function ReplaceWith(str, search, rc) {
			
			var i = -1;
			while((i = str.toLowerCase().indexOf(search.toLowerCase())) > -1) {
				str = str.substr(0, i) + rc.repeatSequence(search.length) + str.substr(i + search.length);
			}
			return str;
		}

		function SaveData() {

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

		}
		
		/**
			Invoke _Module_ReadData(); 
			The method below will be raised with the data as an argument. 
			Check for a null argument. 
		*/
		function OnData_Read(data) {
		}

		/**
			Invoke this override function to send a message to the chat. You may send a message every 2 seconds. Messages
			will be queued if to many are sent at a time.
		*/
		function SendChatMessage(formattedMessage) {
			// _Module_SendMessage method can be called directly; instead of calling SendChatMessage(<Arg>);
			_Module_SendMessage(formattedMessage);
		}