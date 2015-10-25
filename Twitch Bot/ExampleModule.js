
	/**
		This is an example variable that counts how many times the !test command was used.
	*/
	var _messagesSent = 0;
	var _externalResource = null;
	
	/**
		This method can be used to initialize the module.
	*/
	function Init_Module() {		
		_Module_ReadData();
		// Only call this if you have an external resource. Otherwise comment out.
		_Module_GetExternalResources();
	}

	/**
		This is raised when a new chat message is received in the chat
	*/
	function OnChatMessage_Recieved(MessageObject) {
		// Execute some instructions if the command !test is typed into chat.
		if(MessageObject.Message.toLowerCase() == "!test") {
			// Reply to the command with how many times it has been sent.
			SendChatMessage("Hello World Test: " + (++_messagesSent) + 
				" Lucky Number: " + (_externalResource != null ? (typeof _externalResource === 'object' ? (_externalResource.luckynumber ? _externalResource.luckynumber 
				: "Key: luckynumber is not defined") 
				: "External Resource is not an object.") 
				: "External Resource Not Loaded")
			);

			// Save how many times the command has been used.
			_Module_SaveData({ MessagesSent: _messagesSent });
		}
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
		if(data != null) {
			try { 
				// Assuming that the module uses JSON data we try to parse it.
				_externalResource = JSON.parse(data);
			}
			catch(e)
			{ 
				// If we fail then stop the module or revert to a default value
				_externalResource = null; 
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
			// Set the module variable _messagesSent with the value from the storage.
			_messagesSent = data.MessagesSent;
	}

	/**
		Invoke this override function to send a message to the chat. You may send a message every 2 seconds. Messages
		will be queued if to many are sent at a time.
	*/
	function SendChatMessage(formattedMessage) {
		// _Module_SendMessage method can be called directly; instead of calling SendChatMessage(<Arg>);
		_Module_SendMessage(formattedMessage);
	}