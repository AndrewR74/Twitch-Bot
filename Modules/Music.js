
	
	const STATE_PLAYING = 1;
	const STATE_STOPPED = 2;
	const STATE_PAUSED = 3;
	const STATE_BUFFERING = 4;
	const STATE_SWITCHING = 5;

	/**
		This is an example variable that counts how many times the !test command was used.
	*/
	var _messagesSent = 0;
	var _externalResource = null;
	var _SongTabId = -1;
	var _SongIds = ["vjW8wmF5VWc", "yzTuBuRdAyA"];
	var _currentSongIndex = 0;
	var _loop = false;
	var _state = -1;
	var _notified = false;
	
	
	
	/**
		This method can be used to initialize the module.
	*/
	function Init_Module() {		
		_Module_ReadData();
		// Only call this if you have an external resource. Otherwise comment out.
		//_Module_GetExternalResources();
	}

	/**
		This is raised when a new chat message is received in the chat
	*/
	function OnChatMessage_Recieved(MessageObject) {
		
		var _cmds = MessageObject.Message.split(" ");

		if(_cmds[0].toLowerCase() == "!add" && _cmds.length == 2) {
			AddSong(_cmds[1]);
		}
		else if(_cmds[0].toLowerCase() == "!remove" && _cmds.length == 2) {
			RemoveSong(_cmds[1]);
		}
        else if(_cmds[0].toLowerCase() == "!next") {
			Next(true);
		}
		else if(_cmds[0].toLowerCase() == "!play" && _cmds.length == 2) {
			PlaySong(_cmds[1]);
		}
		else if(_cmds[0].toLowerCase() == "!play") {
			Play();
		}
		else if(_cmds[0].toLowerCase() == "!stop") {
			Stop();
		}
		else if(_cmds[0].toLowerCase() == "!prev") {
			Previous(true);
		}
		else if(_cmds[0].toLowerCase() == "!delete") {
			DeleteCurrentSong();
		}
		else if(_cmds[0].toLowerCase() == "!loop") {
			_loop = !_loop;
			SendChatMessage("Looping: " + ( _loop ? "Enabled" : "Disabled"));
		}
		else if(_cmds[0].toLowerCase() == "!commands") {
			SendChatMessage("Music Player Commands: !play - Play the current song Queue, !next - Next song, !prev - Previous song, !stop - Stop the player, !delete - Delete the current song, !add <Song ID> - Add a new song, !loop - Loop the music");
		}
                           
	}
	
	/**
		Capture closed tabs
	*/
	_Module_OnTabClosed = function OnTabClosed(tabId) {
		// Remove the played song
		
		if(_SongTabId == tabId) {
			_state = STATE_STOPPED;
			_SongTabId = -1;
		}
			
	}
	
	/**
		Capture messages from the YouTube Service
	*/
	_Module_OnYoutubeServiceMessage_Recieved = function(command, data) {
		switch(command) {
			case COMMAND_VIDEO_ENDED:
				_notified = false;
				Next();
			break;
			case COMMAND_VIDEO_DOESNT_EXIST:
				DeleteCurrentSong();
				Next();
			break;
			case COMMAND_VIDEO_STARTED:
				if(!_notified) { 
					_notified = true;
					SendChatMessage("Now Playing: " + (( typeof(data) !== "undefined" && data.title) ? data.title : _SongIds[_currentSongIndex]));
				}
			break;
			default:
			break;
		}
	}
	
	function AddSong(SongId) {
		_SongIds.push(SongId);
		_Module_SaveData({ SongQueue: _SongIds });
		
		SendChatMessage("Song Added");
		
		if(_state == STATE_STOPPED)
		{
			_currentSongIndex = _SongIds.length;
			Play();
		}
	}
	
	function PlaySong(SongId) {
		var i = _SongIds.indexOf(SongId);
		
		if(i != -1) {
			_SongIds.push(SongId);
			i = _SongIds.length - 1;
		}
		
		_currentSongIndex = i;
		
		Play();
	}
	
	function RemoveSong(SongId) {
		var i = _SongIds.indexOf(SongId);
		
		if(i != -1) {
			_SongIds.splice(i,1);
			
			_Module_SaveData({ SongQueue: _SongIds });
			
			SendChatMessage("Removed Song");
		}
	}
	
	function DeleteCurrentSong(quite) {
		if(_currentSongIndex > -1 && _currentSongIndex < _SongIds.length) {
			_SongIds.splice(_currentSongIndex,1);
			_currentSongIndex--;
			_Module_SaveData({ SongQueue: _SongIds });
			if(typeof(quite) === "undefined" || quite == false)
				SendChatMessage("Removed Song");
		}
	}
	
	function Play(callback) {		
		if(_currentSongIndex < _SongIds.length && _currentSongIndex > -1) {
			
			_state = STATE_BUFFERING;
			
			if(_SongTabId != -1) {
				_Module_UpdateTab({ url: "http://jb0t.x10.mx/JBotAPI/YTP.html?v=" + _SongIds[_currentSongIndex] + "&t=0&m=" + Module.ID + "&c=" + COMMAND_PLAY_VIDEO}, _SongTabId, function(response) {

					if(typeof(callback) === "function")
						callback();
				});
			} else {
				_Module_OpenTab({ url: "http://jb0t.x10.mx/JBotAPI/YTP.html?v=" + _SongIds[_currentSongIndex] + "&t=0&m=" + Module.ID + "&c=" + COMMAND_PLAY_VIDEO, active: false, selected: false}, function(response) {
					
					_SongTabId = response.Argument; 

					if(typeof(callback) === "function")
						callback();
				});
			}
			
			/*var i = _SongTabId;
			_SongTabId = -1;
			_Module_CloseTab(i, function(r) {
				_Module_OpenTab({ url: "http://jb0t.x10.mx/JBotAPI/YTP.html?v=" + _SongIds[_currentSongIndex] + "&t=0", active: false, selected: false}, function(t) { 
					_SongTabId = t.Argument; 
					SendChatMessage("Now Playing: " + _SongIds[_currentSongIndex]); 
					
					if(typeof(callback) === "function")
						callback();
				});
			});*/
		}
	}
	
	function Stop() {
		_state = STATE_STOPPED;
		_Module_CloseTab(_SongTabId);
	}
	
	function Next(explicit) {
		
		_state = STATE_SWITCHING;
		
		_currentSongIndex++;

		if(_currentSongIndex >= _SongIds.length && (_loop || explicit ))
			_currentSongIndex = 0;
		
		if(_currentSongIndex < _SongIds.length && _currentSongIndex > -1)
			Play(function() {  });
		else if(_SongTabId != -1) {
			Stop();
			SendChatMessage("No more songs to play.");
		}
			
	}
	
	function Previous(explicit) {
		
		_state = STATE_SWITCHING;
		
		_currentSongIndex--;
		
		if(_currentSongIndex < 0 && (_loop || explicit))
			_currentSongIndex = _SongIds.length - 1;
		
		if(_currentSongIndex < _SongIds.length && _currentSongIndex > -1)
			Play(function() {  });
		else if(_SongTabId != -1) {
			Stop();
			SendChatMessage("No more songs to play.");
		}
	}

	/**
		Invoke _Module_SaveData(DataObject); to save data. 
		The method below will be raised when completed.
	*/
	function OnData_Saved() {
		 console.log("Saved Song Queue");
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
		if(data != null && data.SongQueue) {
			// Set the module variable _messagesSent with the value from the storage.
			_SongIds = data.SongQueue;
			
			console.log("Song Queue Restored.");
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