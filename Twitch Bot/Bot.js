var _ModuleInstances = { };
	
$(function()
{
	Array.prototype.sum = function(index) {
		var result = 0;
		index = index || 0;
		index = index < this.length ? (index > -1 ? index : 0) : 0;
		
		for(var i = index; i < this.length; i++)
			result += this[i];
		
		return result;
	}
	
	Date.prototype.SecondTimeSpan = function(d) {
		return (((d || (new Date())).getTime() - this.getTime()) / 1000 );
	}
	
	var DeveloperUsername = "andrewr74";
	
	// Run the bot
	var Bot = new TwitchBot();
	Bot.init();

	// what runs the bot
	var RunInterval = setInterval(function() { Bot.Load(); }, 1000);
	
	function TwitchBot()
	{
		var _instance = this;
		
		// The current channel name
		this.ChannelName = "";
		
		// Flag to determine when the bot has finished loading
		this.LoadingState = 0; // 0 = Not Loading, 1 = Loaded, 2 = Loading
		
		// Holds the chat instance
		this.Chat = null;
		
		this.Commands = null;
		
		this.Lurk = null;
		
		this.GameBots = [];
		
		this.Roulette = null;
		
		this.Teams = [];
		
		this.Logger = null;
		
		this.DailyResetHour = 10;
		
		this.DailyScoreResetter = null;
		
		this.Modules = [];

		this.init = function() {
			this.LoadingState = 0;
			this.ChannelName = "";
			this.GameBots = [];
			this.Chat = null;
			this.PlayerScores = {};
			this.Tracker_Words = [];
			this.Tracker_Stats = {};
		}
		
		// Load settings, stats, scores, databases etc
		this.Load = function()
		{
			if(this.LoadingState == 0) {
				this.LoadingState = 2;
				
				// find the chat box for channel
				var celement = $(".chat-room .chat-interface > .textarea-contain > div").children("textarea").first();
  
				// Find the channel name
				var cname = $("#channel a.channel-name").first();
				
				if(celement.length > 0 && cname.length > 0)
				{
					// 5/3/15 - Bug Fix: Twitch allows users to change capitalization in their display name. Fucks up storage
					// Set the channel name 
					this.ChannelName = cname.text().trim().toLowerCase();
					
					// Select the chat id
					var Chat_ID = celement.attr("id");
				
					// Append Chat Queue System & Commands
					$("body").append("<div id='jQueue' style='display: none'></div>");
					$("body").append("<div id='jCommands' style='display: none'></div>");
					
					// Listen to the chat
					this.Chat = new TwitchChat(Chat_ID, this);
					this.Chat.init();
					
					this.Commands = new CommandFactory(this);
					this.Lurk = new LurkBot(this);
					this.Logger = new BotLog(this);
										
					// Load bot settings
					chrome.storage.local.get([this.ChannelName], function(data) { 
						var obj = {};
						_instance.Roulette = new Roulette(_instance, {}, _instance.OnGameStateChanged);
						// Init the Game Bots
						_instance.GameBots.push(new GameBot(_instance.IncrementPlayerScore_CallBack, _instance.SendChatMessage_CallBack, _instance.OnGameStateChanged,
						"!jeopardy", "!hint", "!skip", "0", "db.json", _instance.Default_GameTimeOut));
						_instance.GameBots.push(new GameBot(_instance.IncrementPlayerScore_CallBack, _instance.SendChatMessage_CallBack, _instance.OnGameStateChanged,
						"!riddle", "!hint", "!skip", "1", "Riddles.json", _instance.Default_GameTimeOut));
						_instance.GameBots.push(new GameBot(_instance.IncrementPlayerScore_CallBack, _instance.SendChatMessage_CallBack, _instance.OnGameStateChanged,
						"!trivia", "!hint", "!skip", "2", "Trivias.json", _instance.Default_GameTimeOut));
						
						
						if(_instance.ChannelName in data) {
							// Load any existing channel data
							obj = data[_instance.ChannelName]; //JSON.parse(data[_instance.ChannelName]);
														
							if(obj) {
								_instance.DailyResetHour = obj.DRH || 10;
								_instance.GameTimeSpan = obj.GTS || _instance.Default_GameTimeOut;
								_instance.Tracker_Stats = obj.TS || {};
								_instance.Tracker_Words = obj.TW || [];
								// Fix case sensitive bug. Can't believe I fucking missed this bug.
								var _nps = {}, _tps = (obj.PS || {});
								for(var key in _tps){
									_nps[key.toLowerCase()] = _tps[key];
								}
								_tps = null;
								_instance.PlayerScores = _nps;
								//_instance.Default_GameTimeOut = obj.GTS || 25;
								
								var t = obj.TM || [];
								for(var i = 0; i < t.length; i++) {
									var _t = new Team(_instance);
									_t.fromJSON(t[i]);
									_instance.Teams.push(_t);
								}
								
								if(obj.RS) {
									_instance.Roulette.BustSubTimeOut = obj.RS.SubTO || 30;
									_instance.Roulette.BustModTimeOut = obj.RS.ModTO || 30;
									_instance.Roulette.BustPlebTimeOut = obj.RS.PlebTO || 60;
									_instance.Roulette.BustAmount = obj.RS.BA || 1000;
									_instance.Roulette.BustAmountModMultiplier = obj.RS.ModMP || 2;
									_instance.Roulette.BustAmountSubMultiplier = obj.RS.SubMP || 2;
									_instance.Roulette.TimeSpan = obj.RS.TS || 5;
									_instance.Roulette.BetTimeSpan = obj.RS.BTS || 30;
									_instance.Roulette.StartAmount = obj.RS.SA || 5;
									_instance.Roulette.Players = obj.RS.PS || {};
									var _tps = obj.RS.PS || {};
									
									// Fix Bug where JSON does not parse date times as objects.
									for(var x in _tps)
									{
										if(_tps[x].hasOwnProperty("BustTime")) {
											delete _tps[x].BustTime;
										}
									}
								
									_instance.Roulette.Players = _tps;
								}
							}
						}
						
											
						// Why did I do this when I have the properties in the data object???
						/*chrome.runtime.sendMessage({method: "BOT_PROPERTIES"}, function(response) {
							if(response.Properties.AU != null && response.Properties.AU.length > 0)
								DeveloperUsername = response.Properties.AU;
							else if($("#you span.username").text() != null && $("#you span.username").text().length > 0) {
								DeveloperUsername = $("#you span.username").text().toLowerCase();
							}
						});*/
						
						// Very important that this is set after loading existing data for changes in to the hour property
						// Should Fire Once Every hour
						_instance.DailyScoreResetter = setInterval(function() {
							// Only Fire on hour 10 UTC
							if((new Date()).getUTCHours() == _instance.DailyResetHour) {
								_instance.ResetDailyScores();
							}
						}, 1000 * 60 * 60);
								
						// Run the bot in pending mode
						_instance.LoadingState = 3;	
						
						// Check if we were running before
						chrome.runtime.sendMessage({method: "BotAutoStart"}, function(response) {
							if(response.Command == "autoStart") {
								_instance.StartBot();
							}
								
						});
					});
				} else {
					this.LoadingState = 0;
				}
			}
			else if(this.LoadingState == 1 || this.LoadingState == 3) { // Bot is able to run or waiting for a join command
				this.RunBot();
			}
		}
		
		/**
			Init all stuff when the bot is entered into a channel
		*/
		this.StartBot = function (callback) {
			chrome.runtime.sendMessage({method: "BotStart"}, function(response) { });

			chrome.storage.local.get(["BOT_PROPERTIES", "INSTALLED_MODS", "DEVELOPER_MODULE"], function(data) { 
				if("INSTALLED_MODS" in data) {
					_instance.Modules = []; 
					
					for(var i = 0; i < data["INSTALLED_MODS"].length; i++) {
						if(typeof(data["INSTALLED_MODS"][i]) === "string") {
							_instance.Modules.push(data["INSTALLED_MODS"][i]);
							chrome.runtime.sendMessage({method: "LoadModule", ModuleID: data["INSTALLED_MODS"][i]}, function(response) { });
						} else if(typeof(data["INSTALLED_MODS"][i]) === "object") {
							if( data["INSTALLED_MODS"][i].IgnoreChannels.indexOf(_instance.ChannelName.toLowerCase()) == -1 ) {
								_instance.Modules.push(data["INSTALLED_MODS"][i].ModuleID);
								chrome.runtime.sendMessage({method: "LoadModule", ModuleID: data["INSTALLED_MODS"][i].ModuleID}, function(response) { });
							}
						}
					}
				}

				if("BOT_PROPERTIES" in data) {
					var _bpObj = data["BOT_PROPERTIES"];
					
					// If no developer username is set then the logged in user gets defaulted.
					DeveloperUsername = ( ((_bpObj.AU && _bpObj.AU.length == 0) || !_bpObj.AU) ? $("#you span.username").text().toLowerCase() : _bpObj.AU);
					
					if(_bpObj.DeveloperMode) {
						if("DEVELOPER_MODULE" in data) {
							if(_instance.Modules == null)
								_instance.Modules = [];
							_instance.Modules.push("DEVELOPER_MODULE");
							
							chrome.runtime.sendMessage({method: "LoadModule", ModuleID: "DEVELOPER_MODULE"}, function(response) { });
						}
					}
				}
				
				_instance.LoadingState = 1;

				_instance.Chat.OutputEnabled = true;
				
				if(typeof(callback) !== "undefined")
					callback();
			});
		}
		
		/**
			Disposes of all stuff
		*/
		this.StopBot =  function () {
			
			chrome.storage.local.get(["BOT_PROPERTIES", "INSTALLED_MODS"], function(data) {
				if(data["BOT_PROPERTIES"].DeveloperMode)
					delete _ModuleInstances["DEVELOPER_MODULE"];
				
				if("INSTALLED_MODS" in data)
					for(var i = 0; i < _instance.Modules.length; i++)
						delete _ModuleInstances[_instance.Modules[i]];
			});
			
			
			this.LoadingState = 3;
			this.Chat.SendChatMessage("JBot Has Left The Channel.");
			// Block any timing outputs
			this.Chat.OutputEnabled = false;
			
			chrome.runtime.sendMessage({method: "BotStop"}, function(response) { });
		}
		
		// Where most of the work goes on
		this.RunBot = function ()
		{
			var _MessageObjects = this.Chat.GetNewChatLines();
			
			for(var i = 0; i < _MessageObjects.length; i++) {
				if(this.LoadingState == 1) {
					if(_MessageObjects[i].isBroadCaster) {
						var _parts = _MessageObjects[i].Message.split(" ");
						
						if(_parts[0].toLowerCase() == "!jleave") {
							// Broadcaster - Tell all channel bots to leave the channel
							if(_parts.length == 1) {
								this.StopBot();
							} else if(_parts.length >= 2) {
								// Broadcaster - Leave this person running this bot
								if( $("#you span.username").text().toLowerCase() == _parts[1].toLowerCase().replace("@", "").trim() ) {
									this.StopBot();
								}
							}
						}
					}
					
					// Recheck the running state of the bot
					if(this.LoadingState == 1) {
						// Handle Game Bots
						if(this.GamesEnabled) {
							for(var g = 0; g < this.GameBots.length; g++){
								if(this.GameBots[g].Loaded) {
									this.GameBots[g].OnMessageRecieved(_MessageObjects[i], this);
								}
							}
						}
						
						// Handle Modules
						for(var g = 0; g < this.Modules.length; g++){
							chrome.runtime.sendMessage( { method: "ModuleMessage", ModuleObject: {method: "ModuleIn", ModuleId: this.Modules[g], Command: "Message", ModuleArgument: _MessageObjects[i] } });
						}
						
						// Handle Non-Game Commands
						this.Track(_MessageObjects[i]);
						this.Commands.OnMessageRecieved(_MessageObjects[i]);
						this.Roulette.OnMessageRecieved(_MessageObjects[i]);
						
						// Team Sub Verify
						for(var k = 0; k < this.Teams.length; k++)
							this.Teams[k].OnMessageRecieved(_MessageObjects[i]);
					}
				} else {
					// This needs to be changed to a whitelist of usernames that can make the bot join.
					if(_MessageObjects[i].isBroadCaster || _MessageObjects[i].From.toLowerCase() == "andrewr74" || _MessageObjects[i].From.toLowerCase() == "jeopardybot") {
						var _parts = _MessageObjects[i].Message.split(" ");
						
						if(_parts[0].toLowerCase() == "!join") {
							if(_parts.length == 1 && $("#you span.username").text().toLowerCase() == this.ChannelName) {
								// Subscribe this tab to the background page for refreshing and updating.
								this.StartBot(function() {
									_instance.Chat.SendChatMessage("JBot Has Joined The Channel. Use command !jleave to make the bot leave the channel.");
								});
								
							} else if(_parts.length >= 2 && $("#you span.username").text().toLowerCase() == _parts[1].toLowerCase().replace("@", "").trim()) {
								// Subscribe this tab to the background page for refreshing and updating.
								this.StartBot(function() {
									_instance.Chat.SendChatMessage("JBot Has Joined The Channel. Use command !jleave @" + _parts[1] + " to make the bot leave the channel.");
								});
							}
						}
					}
				}
			}
		}
		
		// Typically not going to be used unless a command is issued
		this.Unload = function()
		{
			//clearInterval(RunInterval);
			this.GameBots = [];
		}
		
		// Save all bot related settings
		this.Save = function(sender)
		{
			var obj = {
				DHR: _instance.DailyResetHour,
				GTS: _instance.GameTimeSpan,
				PS: _instance.PlayerScores,
				TW: _instance.Tracker_Words,
				TS: _instance.Tracker_Stats,
				//GTS: _instance.Default_GameTimeOut,
				RS: { 
					PS: _instance.Roulette.Players,
					SubTO: _instance.Roulette.BustSubTimeOut, 
					PlebTO: _instance.Roulette.BustPlebTimeOut,
					ModTO: _instance.Roulette.BustModTimeOut,
					SubMP: _instance.Roulette.BustAmountSubMultiplier,
					ModMP: _instance.Roulette.BustAmountModMultiplier,
					BA: _instance.Roulette.BustAmount,
					TS: _instance.Roulette.TimeSpan,
					BTS: _instance.Roulette.BetTimeSpan,
					SA: _instance.Roulette.StartAmount
				},
				TM: _instance.Teams
			};

			var hobj = {};
			hobj[_instance.ChannelName] = obj; //JSON.stringify(obj);
			
			chrome.storage.local.set(hobj, function() {
				if(chrome.runtime.lastError)
					console.log(chrome.runtime.lastError);
			});
		}
		
		// Get the bot properties
		this.GetBotProperties = function() {
			return { ChannelName: this.ChannelName, DailyResetHour: this.DailyResetHour };
		}
		
		// General Bot Settings
		
		// Words that this channel is tracking
		this.Tracker_Words = [];
		
		// The stats of the tracked worlds
		this.Tracker_Stats = {};
		
		this.Track = function(cl)
		{
			var _wordFound = false;
		
			// Calculate Key Word Stats
			for(var _i in this.Tracker_Words) {
				//if(!cl.isMod) 
					if(cl.Message.toLowerCase().indexOf(this.Tracker_Words[_i]) > -1 && cl.Message.toLowerCase().indexOf("stats: ") != 0 && cl.Message.toLowerCase().indexOf("tracker") == -1 &&
						cl.Message != this.Tracker_Words[_i] + " reset") {
						if(cl.Message.toLowerCase().indexOf(this.Tracker_Words[_i]) == 0 || cl.Message.toLowerCase().indexOf(" " + this.Tracker_Words[_i]) > -1) { // Attempt to filter out words that contain the key word
							if(!(this.Tracker_Words[_i] in this.Tracker_Stats)) {
								this.Tracker_Stats[this.Tracker_Words[_i]] = 1;
							} else {
								this.Tracker_Stats[this.Tracker_Words[_i]] += 1;
							}
							
							_wordFound = true;
						}
					}
				//
				
				if(_wordFound)
				{
					this.Save("Tracker");
				}
			}
		}
				
		//
		// End Roulette Settings
		//
		
		//
		// Game Related Settings
		//
		
		// Contains this channels player scores
		this.PlayerScores = {};
		
		// Which GameBot Is Active
		this.ActiveGameID = "";
		this.Default_GameTimeOut = 25;
		
		this.GamesEnabled = true;
		
		// The time when a game was started
		this.LastGameTime = null;
		
		// How many seconds the bot must wait until another game can be started
		this.GameTimeSpan = 30;
		
		// Passed to the game classes to report a change in player score
		this.IncrementPlayerScore_CallBack = function(PlayerName, Amount) {
			
			PlayerName = PlayerName.toLowerCase();
			
			if(!(PlayerName in _instance.PlayerScores))
				_instance.PlayerScores[PlayerName] = { LT: 0, LR: 0};
			
			// Players Lifetime Score
			_instance.PlayerScores[PlayerName]["LT"] += Amount; // (_instance.PlayerScores[PlayerName] + Amount);
			
			// Players Daily Score
			_instance.PlayerScores[PlayerName]["LR"] += Amount;
			
			_instance.Save("TwitchBot.IncrementPlayerScore_CallBack");
			
			// Return the modified score
			return _instance.PlayerScores[PlayerName]["LT"];
		}
		
		// Passed to the game classes so they can send messages to the chat
		this.SendChatMessage_CallBack = function(Message) {
			if(_instance.Chat) {
				_instance.Chat.SendChatMessage(Message);
			}
		}
		
		// Passed to the game classes so they can send messages to the chat
		this.GetPlayerScore = function(PlayerName) {
			
			PlayerName = PlayerName.toLowerCase();
			
			if(!(PlayerName in _instance.PlayerScores))
				return 0;
			return _instance.PlayerScores[PlayerName]["LT"];
		}
		
		this.GetLeaders = function(top, selector) {
			var _leader = "";
			
			
			var _a = [];
			
			if(typeof selector === 'undefined')
				selector = "LT";
			
			for(p in _instance.PlayerScores)
				_a.push( { PlayerName: p, LT: _instance.PlayerScores[p].LT, LR: _instance.PlayerScores[p].LR });
			
			_a.sort(function(a, b) { 
				return a[selector] - b[selector];
			});
			
			if(typeof top !== 'undefined') {
				top = top < 1 ? 1 : (top > 15 ? 15 : top);
				_a = _a.reverse().slice(0, top >= _a.length ? _a.length : top);
			}
			
			// Works but there is a compare func
			/*for(var i = 0; i < _a.length; i++) {
				for(var j = 0; j < _a.length; j++) {
					if(j != _a.length-1) {
						if(_a[j] > _a[(j+1)]) {
							var t = _a[j];
							_a[j] = _a[j+1];
							_a[j+1] = t;
						}
					}
				}
			}*/
			
			6
			4
			7
			1
			9
			3
			2
			
			
			
			/*for(p in _instance.PlayerScores)
			{
				if(_leader == "") {
					_leader = p;
				}
				else {
					if(_instance.PlayerScores[p]["LT"] > _instance.PlayerScores[_leader]["LT"])
						_leader = p;
				}
			}*/
			
			return _a;
		}
		
		// Reset daily scores at 10 UTC (6AM EST(-4), 5AM CST(-5))
		this.ResetDailyScores = function() {
			for(var x in _instance.PlayerScores) {
				// That should reset them Kappa
				_instance.PlayerScores["LR"] = 0;
			}
			_instance.Save();
		}
		
		this.OnGameStateChanged = function(GBot) {
			// Game bot ended
			if(GBot.GameState == 0) {
				// The game ended
				_instance.LastGameTime = new Date();
				_instance.ActiveGameID = "";
			} else {
				// Game bot is starting
				_instance.ActiveGameID = GBot.GameIdentifier;
			}
		}
		
		this.CanGameBotStart = function() {
			return this.ActiveGameID == "" && (this.LastGameTime == null || this.LastGameTime.SecondTimeSpan() >= this.GameTimeSpan);
		}
		
		// This is rigged b/c a member should be able to be on multiple teams at once.
		// Finds a members team
		this.FindMemberTeam = function (memberName) {
			var t = null;
			
			for(var i = 0; i < this.Teams.length; i++)
				if(this.Teams[i].IsAMember(memberName)) {
					var t = this.Teams[i];
					break;
				}
			return t;
		}
		
		// Get a team by reference
		this.GetTeamByName = function (name) {
			name = name.toLowerCase();
			
			var r = null;
			for(var i = 0; i < this.Teams.length; i++)
				if(this.Teams[i].Name == name)
				{
					r = this.Teams[i];
					break;
				}
			return r;
		}
		
		// Add a team
		this.AddTeam = function (name) {
			name = name.toLowerCase();
			
			if(this.GetTeamByName(name) == null) {
				var t = new Team(_instance);
				t.Name = name;
				this.Teams.push(t);
				this.Save("TwitchBot.AddTeam");
				return true;
			} else {
				return false;
			}
		}
		
		// Delete a team
		this.DeleteTeam = function (name) {
			name = name.toLowerCase();
			
			var t = this.GetTeamByName(name);
			if(t != null) {
				this.Teams.splice(this.Teams.indexOf(t), 1);
				this.Save("TwitchBot.DeleteTeam");
				return true;
			} else {
				return false;
			}
		}
	}
	
	function Team(BS)
	{
		var _botInstance = BS;
		var _instance = this;
		
		// This is used as the key in the - Teams {} 
		// The team name
		this.Name = "";
		
		// The bot will verify that the members are still subs.
		// If they are not then they will be removed from the team.
		this.SubOnly = true;
		
		// Member names + properties of each member if any
		this.Members = {};
		
		// A winning streak
		this.WinningStreak = 0;
		
		// Placeholders: [<name>]
		// A Key, Value pair 
		// Allow the bot to send commands to the chat for each of the team members
		this.Commands = {};
		
		this.OnMessageRecieved = function(MessageObject) {
			// Remove any non subs from the team
			if(this.SubOnly && this.IsAMember(MessageObject.From) && !MessageObject.isSub) {
				this.RemoveMember(MessageObject.From);
				_botInstance.Save("Team.OnMessageRecieved");
			}
		}
		
		// Send the commands for each of the members
		this.SendCommands = function (rawcmds) {
			
			var cmds = rawcmds.toLowerCase().split(";");
			
			for(var i = 0; i < cmds.length; i++) {
				if(cmds[i] in this.Commands) {
					var _command = this.Commands[cmds[i]];
					
					for(memberName in this.Members) {
						_botInstance.Chat.SendChatMessage(_command.replace(/<name>/gi, memberName), "JTeam.SendCommands");
					}
				}
			}
		}
		
		// Add a new command that doesn't exist
		this.AddCommand = function(name, command) {
			name = name.toLowerCase();
			if(!(name in _instance.Commands)) {
				_instance.Commands[name] = command;
				//_botInstance.Save();
				return true;
			}
			return false;
		}
		
		// Delete an existing command
		this.DeleteCommand = function(name, command) {
			name = name.toLowerCase();
			if(name in _instance.Commands) {
				delete _instance.Commands[name];
				//_botInstance.Save();
				return true;
			}
			return false;
		}
		
		// Get an existing command 
		this.GetCommand = function(name, command) {
			name = name.toLowerCase();
			if(name in _instance.Commands) {
				return _instance.Commands[name];
			}
			return "";
		}
		
		// Checks to see if a name is in the team already.
		this.IsAMember = function(name) {
			name = name.replace("@", "").toLowerCase().trim();
			
			return (name in this.Members);
		}
		
		// Add a new team member as a pleb 
		this.AddMember = function(memberName) {
			memberName = memberName.replace("@", "").toLowerCase().trim();
			
			if(!(memberName in _instance.Members)){
				_instance.Members[memberName] = {
					isLeader: false,
					isModerator: false
				};
				//_botInstance.Save();
				return true;
			} else {
				return false;
			}
		}
		
		// Remove a team member
		this.RemoveMember = function(memberName) {
			memberName = memberName.replace("@", "").toLowerCase().trim();
			
			if((memberName in _instance.Members)){
				delete _instance.Members[memberName];
				//_botInstance.Save();
				return true;
			} else {
				return false;
			}
		}
		
		// Mod an existing team member
		this.ModMember = function(memberName) {
			memberName = memberName.replace("@", "").toLowerCase().trim();
			
			if((memberName in _instance.Members)){
				_instance.Members[memberName].isMod = true;
				//_botInstance.Save();
				return true;
			}
			
			return false;
		}
		
		// UnMod an existing team moderator
		this.UnModMember = function(memberName) {
			memberName = memberName.replace("@", "").toLowerCase().trim();
			
			if((memberName in _instance.Members)){
				_instance.Members[memberName].isMod = false;
				//_botInstance.Save();
				return true;
			}
			
			return false;
		}
		
		// Make an existing member a leader of the team
		this.AddLeader = function(memberName) {
			memberName = memberName.replace("@", "").toLowerCase().trim();
			
			if((memberName in _instance.Members)){
				_instance.Members[memberName].isLeader = true;
				//_botInstance.Save();
				return true;
			}
			
			return false;
		}
		
		// Remove the leader privilege from an existing team member
		this.RemoveLeader = function(memberName) {
			memberName = memberName.replace("@", "").toLowerCase().trim();
			
			if((memberName in _instance.Members)){
				_instance.Members[memberName].isLeader = false;
				//_botInstance.Save();
				return true;
			}
			
			return false;
		}
		
		this.toJSON = function () {
			// pack it up
			return {
				M: this.Members,
				C: this.Commands,
				S: this.SubOnly,
				N: this.Name,
				W: this.WinningStreak
			};
		}
		
		this.fromJSON = function (obj) {
			// unpack it.
			this.Members = obj.M;
			this.Commands = obj.C;
			this.SubOnly = obj.S;
			this.Name = obj.N;
			this.WinningStreak = obj.W;
		}
	}
	
	function Roulette(BI, PS, RGS)
	{
		// Static Variables
		
		var _nums = [{ v: -1, p: new Victor(-9,-9) }, { v: 0, p: new Victor(-9,-9) }];
		
		var _vzno = new Victor(0, -1), _vnos = new Victor(-1, -1);
		
		var _colors = 
		[    { n: -1, c: "green" },
			 { n: 0, c: "green" },
			 { n: 1, c: "red" },
			 { n: 3, c: "red"},
			 { n: 5, c: "red"},
			 { n: 7, c: "red"},
			 { n: 9, c: "red"},
			 { n: 12, c: "red"},
			 { n: 14, c: "red"},
			 { n: 16, c: "red"},
			 { n: 18, c: "red"},
			 { n: 19, c: "red"},
			 { n: 21, c: "red"},
			 { n: 23, c: "red"},
			 { n: 25, c: "red"},
			 { n: 27, c: "red"},
			 { n: 30, c: "red"},
			 { n: 32, c: "red"},
			 { n: 34, c: "red"},
			 { n: 36, c: "red"}
		];
		
		var GetColor = function(n) {
			for(var i = 0; i < _colors.length; i++)
				if(_colors[i].n == n)
					return _colors[i].c;
			return "black";
		};
	
		var BetPayouts = {
			"even": 1,
			"odd": 1,
			"red": 1,
			"black": 1,
			"low": 1,
			"high": 1,
			"dozen": 2,
			"column": 2,
			"split": 17,
			"rsplit": 5,
			"row": 11,
			"corner": 8,
			"number": 35
		};
	
		var GetNumberVector = function(n) {
			for(var i = 0; i < _nums.length; i++)
				if(_nums[i].v == n)
					return _nums[i].p;
			return null;
		};
	
		init();
		
		function init() {
			var x = 0, y = 0;
			
			for(var i = 1; i < 37; i++)
			{
				if(y == 3)  { y = 0; x++; } 
				_nums.push({ v: i, p: new Victor(x, y++), c: ""});
			}
		}
		
		function Bet() {

			this.PlayerName = "";
			this.BetName = "";
			this.Amount = 0;
			this.values = [];
			
			this.GetWinnings = function(nv) {
				var n = nv; // Ball Value
				var v = GetNumberVector(nv); // Vector Position
				var r = 0;
				
				switch(this.BetName) {
					case "even":
						if(((n % 2) == 0) && n > 0)
							r = this.CalculateWinnings();
					break;
					case "odd":
						if(((n % 2) != 0) && n > 0)
							r = this.CalculateWinnings();
					break;
					case "red":
						if((GetColor(n) == "red") && n > 0)
							r = this.CalculateWinnings();
					break;
					case "black":
						if((GetColor(n) == "black") && n > 0)
							r = this.CalculateWinnings();
					break;
					case "low":
						if((n <= 18) && n > 0)
							r = this.CalculateWinnings();
					break;
					case "high":
						if(n <= 36 && n >= 19)
							r = this.CalculateWinnings();
					break;
					case "dozen":
						var dv1 = 1, dv2 = 12
						if(this.values[0] == 2) {
							dv1 = 13; dv2 = 24;
						} else if(this.values[0] == 3) {
							dv1 = 25; dv2 = 36;
						}
						
						if((n >= dv1) && n > 0 && n <= dv2)
							r = this.CalculateWinnings();
					break;
					case "column":
						var c = this.values[0] - 1;
						if((v.y == c) && n > 0)
							r = this.CalculateWinnings();
					break;
					case "split":
						if(this.values[0] == n || this.values[1] == n)
							r = this.CalculateWinnings();
					break;
					case "rsplit":
						var r1 = this.values[0] - 1;
						var r2 = this.values[1] - 1;
						
						if((v.x == r1 || v.x == r2))
							r = this.CalculateWinnings();
					break;
					case "row":
						var r1 = this.values[0] - 1;
						
						if(v.x == r1)
							r = this.CalculateWinnings();
					break;
					case "corner":
						for(var i = 0; i < this.values.length; i++)
							if(this.values[i] == n) {
								r = this.CalculateWinnings();
								break;
							}
					break;
					case "number":
						if(this.values[0] == n)
							r = this.CalculateWinnings();
					break;
				}
				
				return r;
			};
			
			this.CalculateWinnings = function() {
				return ((this.Amount * BetPayouts[this.BetName]) + this.Amount);
			};
						   
		}
	
		
		// End Static Variables

		
		// Instance Variables
		
		var _instance = this;

		var _botInstance = BI;
		
		// 0 = Not Running, 1 = Running; Waiting For Bets, 2 = Spinning;Paying out
		this.GameState = 0;
		
		this.GameIdentifier = "Roulette";
		
		// When Game State changes
		this.OnGameStateChanged = RGS;
		
		this.GameTimer = null;
		
		// When the last game ended
		this.LastGameTime = null;
		
		this.Bets = [];
		
		this.Players = PS;
		
		// How much the player is given after bankrupting.
		this.BustAmount = 5;
		
		// How much a player starts with for the first time
		this.StartAmount = 10;
		
		// Apply a multiplier to higher channel social classes
		this.BustAmountModMultiplier = 1;
		this.BustAmountSubMultiplier = 1;
		
		// How long the player has to wait until they are able to play again
		// Based on the players channel social class they might have a shorter wait time.
		this.BustPlebTimeOut = 60;
		this.BustSubTimeOut = 30;
		this.BustModTimeOut = 30;

		// How often another roulette game can start after one just ended.
		//this.TimeSpan = 5; // Moved to the game timer
		
		// How long players have to place bets
		this.BetTimeSpan = 15;
		
		this.OnMessageRecieved = function(MessageObject)
		{
			if(this.GameState == 0) {
				if(MessageObject.Message.toLowerCase() == "!jroulette" && _botInstance.CanGameBotStart()) {
					//if(this.LastGameTime == null || this.LastGameTime.SecondTimeSpan(new Date()) >= (this.TimeSpan))
						this.StartGame();
				}
			} else if(this.GameState == 1) {
				if(MessageObject.Message.toLowerCase() == "!jstop" && (MessageObject.isMod || MessageObject.isDev || MessageObject.isBroadCaster)) {
					clearInterval(this.GameTimer);
					_botInstance.Chat.SendChatMessage("Roulette Cancelled", "Roulette.OnMessageRecieved");
				} else if(MessageObject.Message.toLowerCase() == "!jspin" && (MessageObject.isMod || MessageObject.isDev || MessageObject.isBroadCaster)) {
					clearInterval(this.GameTimer);
					this.Spin();
				} else {
					this.RunGame(MessageObject);
				}
			}
		}
		
		this.StartGame = function() {
			//this.GameState = 1;
			_instance.SetGameState(1);
			this.GameTimer = setTimeout(function() { _instance.Spin(); }, (this.BetTimeSpan * 1000));
			_botInstance.Chat.SendChatMessage("Roulette Started Place Bets. !bet <even|odd|number|red|black> <amount>");
		}
		
		this.RunGame = function(MessageObject) {
			if(MessageObject.Message.toLowerCase().indexOf("!bet ") == 0)
			{
				var _pname = MessageObject.From.toLowerCase();
				var _parts = MessageObject.Message.toLowerCase().split(" ");
				
				if(_parts.length >= 3) {
					if(_parts[1] in BetPayouts)
					{
						var b = null;
						
						if(!isNaN(_parts[_parts.length-1])) {
							var a = parseInt(_parts[_parts.length-1]);
														
							switch(_parts[1]) {
								case "red":
									b = new Bet();
									b.Amount = a;
									b.BetName = "red";
								break;
								case "black":
									b = new Bet();
									b.Amount = a;
									b.BetName = "black";
								break;
								case "even":
									b = new Bet();
									b.Amount = a;
									b.BetName = "even";
								break;
								case "odd":
									b = new Bet();
									b.Amount = a
									b.BetName = "odd";
								break;
								case "number": // !bet number 1 <Amount>
									if(_parts.length == 4) {
										if(!isNaN(_parts[2])) {
											var x = parseInt(_parts[2]);
											
											if(x == 0 && _parts[2] == "00")
												x = -1;
											
											b = new Bet();
											b.BetName = "number";
											b.values = [x];	
											b.Amount = a;
										}
									}
								break;
								case "row": // !bet row <1-12> <Amount>
									if(_parts.length == 4) {
										if(!isNaN(_parts[2])) {
											var x = parseInt(_parts[2]);
											if(x <= 12 && x >= 1){
												b = new Bet();
												b.BetName = "row";
												b.values = [x];	
												b.Amount = a;
											}
										}
									}
								break;
								case "column": // !bet column <1-3> <Amount>
									if(_parts.length == 4) {
										if(!isNaN(_parts[2])) {
											var x = parseInt(_parts[2]);
											if(x <= 3 && x >= 1){
												b = new Bet();
												b.BetName = "column";
												b.values = [x];	
												b.Amount = a;
											}
										}
									}
								break;
								case "dozen": // !bet dozen <1-3> <Amount>
									if(_parts.length == 4) {
										if(!isNaN(_parts[2])) {
											var x = parseInt(_parts[2]);
											if(x <= 3 && x >= 1){
												b = new Bet();
												b.BetName = "dozen";
												b.values = [x];	
												b.Amount = a;
											}
										}
									}
								break;
								case "rsplit": // !bet rsplit 1 2 <Amount>
									if(_parts.length == 5) {
										if(!isNaN(_parts[2]) && !isNaN(_parts[3])) {
											var x = parseInt(_parts[2]), x2 = parseInt(_parts[3]);
											if(x <= 12 && x >= 1 && x2 <= 12 && x2 >= 1) {
												var g = x > x2 ? x : x2, l = x > x2 ? x2 : x;
												if((g-l) == 1) {
													b = new Bet();
													b.BetName = "rsplit";
													b.values = [l,g];	
													b.Amount = a;
												}
											}
										}
									}
								break;
								case "split": // !bet split 1 2 <Amount>
									if(_parts.length == 5) {
										if(!isNaN(_parts[2]) && !isNaN(_parts[3])) {
											var x = parseInt(_parts[2]), x2 = parseInt(_parts[3]);
											// Excluding 0, 00 because I haven't worked out the vectors yet
											if(x <= 36 && x >= 1) {
												var g = x > x2 ? x : x2, l = x > x2 ? x2 : x;
												var v1 = GetNumberVector(l), v2 = GetNumberVector(g),
												v3 = v1.clone().subtract(v2);
												
												if(v3.isEqualTo(_vnos) || v3.isEqualTo(_vzno)) {
													b = new Bet();
													b.BetName = "split";
													b.values = [l,g];	
													b.Amount = a;
												}
											}
										}
									}
								break;
								case "corner": // !bet corner 1 2 4 5 <Amount>
									if(_parts.length == 7) {
										if(!isNaN(_parts[2]) && !isNaN(_parts[3]) && !isNaN(_parts[4]) && !isNaN(_parts[5])) {
											var x = parseInt(_parts[2]), x2 = parseInt(_parts[3]), 
											x3 = parseInt(_parts[4]), x4 = parseInt(_parts[5]);
											// Excluding 0, 00 because I haven't worked out the vectors yet
											if(x <= 36 && x >= 1) {
												var g = x > x2 ? x : x2, l = x > x2 ? x2 : x;
												var v1 = GetNumberVector(l), v2 = GetNumberVector(g),
												v3 = v1.clone().subtract(v2);
												
												if(v3.isEqualTo(_vnos) || v3.isEqualTo(_vzno)) {
													b = new Bet();
													b.BetName = "corner";
													b.values = [l,g, x3, x4];	
													b.Amount = a;
												}
											}
										}
									}
								break;
							}
						}
						
						if(b != null && b.Amount > 0) {
							if(!(_pname in this.Players)) {
								this.Players[_pname] = {};
								this.Players[_pname]["Score"] = this.StartAmount;
							}
							
							if(_instance.Players[_pname].hasOwnProperty("BustTime")) {
								if(_instance.Players[_pname].BustTime.SecondTimeSpan() >= this.GetPlayerClassTimeOut(MessageObject)) {
									this.Players[_pname].Score += (this.BustAmount * this.GetPlayerClassMultiplier(MessageObject)); // Give the player pitty money
									delete _instance.Players[_pname].BustTime;
								}
							} else if(this.Players[_pname].Score == 0) {
								this.Players[_pname].Score = (this.BustAmount * this.GetPlayerClassMultiplier(MessageObject));
							}
							
							if(this.Players[_pname].Score >= b.Amount ) {
								this.Players[_pname].Score -= b.Amount;
								
								// Set the time when they ran out of money
								if(this.Players[_pname].Score == 0)
									this.Players[_pname]["BustTime"] = new Date();
								
								b.PlayerName = _pname;
								
								this.Bets.push(b);
								
								_botInstance.Chat.SendChatMessage("@" + MessageObject.From + " Bet Placed " + b.Amount, "Roulette.RunGame");
							}
						}
					}
				}
			}
		}
		
		this.Spin = function() {
			//_instance.GameState = 2;
			_instance.SetGameState(2);
			// ((0 - 37) - 1)
			var _winningNumber = Math.floor((Math.random() * 38) + 0) - 1;
			var _winners = ". Winners: ";
			var _wc = 0;
			
			if(_instance.Bets.length > 0) {
				for(var i = 0; i < _instance.Bets.length; i++){
					var w = _instance.Bets[i].GetWinnings(_winningNumber);
					
					_instance.Players[_instance.Bets[i].PlayerName].Score += w;
					
					if(w > 0) {
						// Remove any bust time outs since they won money
						if(_instance.Players[_instance.Bets[i].PlayerName].hasOwnProperty("BustTime"))
							delete _instance.Players[_instance.Bets[i].PlayerName].BustTime;
						
						_winners += "@" + _instance.Bets[i].PlayerName + " -> " + (_instance.Players[_instance.Bets[i].PlayerName].Score - w) + " + (" + w + "), ";
						
						_wc++;
					}
				}
				
				_botInstance.Save("Roulette.Spin");
				
				_botInstance.Chat.SendChatMessage("Winning Number Is: " + GetColor(_winningNumber) + " " + (_winningNumber == -1 ? "00" : _winningNumber) + (_wc > 0 ? _winners : " No Winners."), "Roulette.Spin");
			}
			
			// Mark when the game ended
			_instance.LastGameTime = new Date();
			
			_instance.SetGameState(0);
			//_instance.GameState = 0;
			_instance.Bets = [];
		}
		
		// Exclude @ Symbol from the player name
		this.GetPlayerMoney = function(PlayerName) {
			var _result = 0;
			
			if( PlayerName.toLowerCase() in this.Players ) {
				_result = this.Players[PlayerName.toLowerCase()].Score;
				
				if(isNaN(_result))
					_result = 0;
			} else {
				_result = this.BustAmount;
			}
				
			
			return _result;
		}
		
		// PlayerName - The players username. (Exclude @ Symbol from the player name)
		// Action - [give, take, reset]
		// Optional Value - Amount to give or take
		this.ModifyPlayerMoney = function(PlayerName, Action, Value) {
			var _result = "";
			
			PlayerName = PlayerName.toLowerCase();
			
			if(!(PlayerName in this.Players)) {
				this.Players[PlayerName] = {};
				this.Players[PlayerName]["Score"] = 0;
			}
			
			switch(Action.toLowerCase()) {
				case "give":
					if(Value > 0) {
						this.Players[PlayerName].Score += Value;
						_result = "@" + PlayerName + " Bank was increased. ->" + this.Players[PlayerName].Score;
					}
				break;
				case "take":
					if(Value > 0) {
						this.Players[PlayerName].Score -= Value;
						if(this.Players[PlayerName].Score < 0)
							this.Players[PlayerName].Score = 0;
						_result = "@" + PlayerName + " Bank was robbed. ->" + this.Players[PlayerName].Score;
					}
				break;
				case "reset":
					this.Players[PlayerName].Score = 0;
					_result = "@" + PlayerName + " Bank was emptied.";
				break;
			}
			
			return _result;
		}
		
		this.Reset = function() {
			this.Players = {};
		}
		
		this.GetPlayerClassMultiplier = function(MessageObject) {
			var _result = 1;
			
			if(MessageObject.isMod || MessageObject.isDev)
				_result = this.BustAmountModMultiplier;
			else if(MessageObject.isSub)
				_result = this.BustAmountSubMultiplier;
			
			return _result == 0 ? 1 : _result;
		}
		
		this.GetPlayerClassTimeOut = function(MessageObject) {
			var _result = this.BustPlebTimeOut; 
			
			if(MessageObject.isMod || MessageObject.isDev)
				_result = this.BustModTimeOut;
			else if(MessageObject.isSub)
				_result = this.BustSubTimeOut;
			
			return isNaN(_result) ? 60 : _result;
		}
		
		this.GameStateChanged = function() {
			if(this.OnGameStateChanged) {
				this.OnGameStateChanged(this);
			}
		}
		
		this.SetGameState = function(State) {
			_instance.GameState = State;
			_instance.GameStateChanged();
		}
	}
	
	function GameBot(IPS, TWC, RGS, GameStartKW, GameHintKW, GameSkipKW, GameIdentifier, DataBaseFileName, TOS)
	{
		// Create an Instance
		var _instance = this;
		
		// How to start the game
		this.GameStartKW = GameStartKW;
		
		this.GameHintKW = GameHintKW;
		
		this.GameSkipKW = GameSkipKW;
		
		this.GameTimeOut_Seconds = TOS;
		
		// Identify the game
		this.GameIdentifier = GameIdentifier;
		
		// Used to determine the 
		this.GameState = 0; // 0 = Not running, 1 = Game In Progress, 2 = Paused, 3 = Busy
		
		// Whether the bot finished loading
		this.Loaded = false;

		// The IPS callback function
		this.IncrementPlayerScore_CallBack = IPS;
		
		// When Game State changes
		this.OnGameStateChanged = RGS;
		
		// The TWC callback function
		this.SendChatMessage_CallBack = TWC;
		
		// The database of question indices
		this.Questions = null;
		
		// The current question index
		this.Current_Question_Index = -1;
		
		// A Timeout for the end of a game
		this.GameTimer = null;
		
		// Prevent Hint Spamming
		this.LastHint = new Date();
		
		// This is fired for every new chat message 
		this.OnMessageRecieved = function(MessageObject, _botInstance)
		{
			if(this.Questions != null) {
				if(this.GameState == 1) {
					if(MessageObject.Message.toLowerCase() == GameHintKW) {
						this.Hint();
					} else if(MessageObject.Message.toLowerCase() == GameSkipKW && (MessageObject.isMod || MessageObject.isBroadCaster || MessageObject.isDev)) {
						this.Skip(MessageObject);
					} else {
						this.RunGame(MessageObject);
					}
				} else if(this.GameState == 0) {
					if(MessageObject.Message.toLowerCase() == GameStartKW && _botInstance.CanGameBotStart()) {
						this.StartGame();
					}
				} else {
					// What ever the fuck we want ( Paused )
				}
			}
		}
		
		// Start the game play
		this.StartGame = function() {
			// Game State is busy
			//this.GameState = 3;
			this.SetGameState(3);
			
			// Select a random index
			var i = Math.floor((Math.random() * this.Questions.length) + 0);
			
			// Create an empty question
			var cq =  { Answer: "" };
			
			// Find a non used question with a good answer
			while(cq.Answer == "" || i == this.Current_Question_Index || i == this.Questions.length) {
				i = Math.floor((Math.random() * this.Questions.length) + 0);
				
				// Just realized this could error out. I need refresh on random shit
				if(i < this.Questions.length)
					cq = this.Questions[i];
			}
			
			console.log(cq.Answer);
			
			// Start the time out to 65 Seconds
			this.GameTimer = setTimeout(function() { _instance.TimeRanOut(); }, (1000 * this.GameTimeOut_Seconds));
			
			// Set the current question index
			this.Current_Question_Index = i;
			
			switch(this.GameIdentifier){
				case "0":
					this.SendChatMessage("Category: " + cq.Category + " - Question: " + cq.Question.split('').join('\u180E'));
				break;
				case "1":
					this.SendChatMessage("Riddle: " + cq.Riddle.split('').join('\u180E'));
				break;
				case "2":
					this.SendChatMessage(cq.Question.split('').join('\u180E'));
				break;
			}
			
			
			// Enable the game
			//this.GameState = 1;
			this.SetGameState(1);
		}
		
		// Handle Intense Game Play
		this.RunGame = function(MessageObject) {
			var cq = this.Questions[this.Current_Question_Index];
			
			if(cq) {
				var decoded = $('<div/>').html(MessageObject.Message.toLowerCase().trim()).text();
				if(decoded == cq.Answer.toLowerCase().trim())
				{
					//this.GameState =  0;
					this.SetGameState(0);
					var _score = this.IncrementPlayerScore(MessageObject.From.toLowerCase(), 1);
					clearTimeout(this.GameTimer);
					this.SendChatMessage( "@" + MessageObject.From + " Has Won. Score: " + _score + " The Answer was: " + cq.Answer);
				}
			}
		}
		
		// Send hint
		this.Hint = function() {
			if( ((((new Date()).getTime()) - this.LastHint.getTime()) / 1000 ) > 5) {
				this.LastHint = new Date();
				
				if(this.Current_Question_Index > -1) {
					var _hint = "";
					var cq = this.Questions[this.Current_Question_Index];
					
					var _fake = cq.Answer.toLowerCase().trim();
					
					for (var i = 0, len = cq.Answer.length; i < len; i++) {
						var _ascii = _fake.charCodeAt(i);
						
						// Display weird characters
						if((_ascii < 97 || _ascii > 122) && (_ascii < 48 || _ascii > 57)) {
							_hint += cq.Answer[i];
						} else {
							// Display the first character of a word
							if((i > 0 && cq.Answer[i-1] == " ") || i == 0)
								_hint += cq.Answer[i];
							else
								_hint += "*";
						}
					}
					
					this.SendChatMessage("Hint: " + _hint);
				}
			}
		}
		
		// Skip Question
		this.Skip = function(MessageObject) {
			clearTimeout(this.GameTimer);
			//this.GameState = 0;
			this.SetGameState(0);
			var cq = this.Questions[this.Current_Question_Index];
			if(cq) {
				this.SendChatMessage( "@" + MessageObject.From + " Has Skipped The Question. The Answer was: " + cq.Answer);
			}
		}
		
		// no one answered in time
		this.TimeRanOut = function() {
			_instance.GameTimer = null;
			//_instance.GameState = 0;
			_instance.SetGameState(0);
			var cq = _instance.Questions[this.Current_Question_Index];
			if(cq) {
				_instance.SendChatMessage( "Time Ran Out. The Answer was: " + cq.Answer);
			}
		}
		
		// Increase Player Score on win
		this.IncrementPlayerScore = function(PlayerName, Amount){
			if(this.IncrementPlayerScore_CallBack) {
				return this.IncrementPlayerScore_CallBack(PlayerName, Amount);
			}
			return 0;
		}
		
		// Send a message to the TWC callback
		this.SendChatMessage = function(Message) {
			if(this.SendChatMessage_CallBack) {
				this.SendChatMessage_CallBack(Message);
			}
		}
		
		this.GameStateChanged = function() {
			if(this.OnGameStateChanged) {
				this.OnGameStateChanged(this);
			}
		}
		
		this.SetGameState = function(State) {
			_instance.GameState = State;
			_instance.GameStateChanged();
		}
		
		// Load the Game Bot
		{
			$.get(chrome.extension.getURL(DataBaseFileName),
				function (data) {
					_instance.Questions = JSON.parse(data);
					if(_instance.Questions != null)
						_instance.Loaded = true;
				}
			);
		}
	}
	
	function LurkBot(BI)
	{
		var _instance = this;
		
		var _botInstance = BI;
		
		this.Enabled = false;
		
		this.LastLurk = null;
		
		this.Lurk_Interval = setInterval(function() { _instance.OnLurkAttempt(); }, 10000);
		
		this.OnLurkAttempt = function() {
			if(_instance.Enabled && _botInstance.Chat.GetAverageMessages(2) > 10) {
				if(_instance.LastLurk == null) {
					_botInstance.Chat.SendChatMessage("Coleslaw Coin Mining Bot");
					_instance.LastLurk = new Date();
				}
				else if((((new Date()).getTime() - _instance.LastLurk.getTime()) / (1000 * 60)) > 25)
				{
					_botInstance.Chat.SendChatMessage("Coleslaw Coin Mining Bot");
					_instance.LastLurk = new Date();
				}
			}
		}
	}
	
	function CommandFactory(BI)
	{
		var _instance = this;
		
		var _botInstance = BI;
		
		this.Last_Public_CMDs = {};
		
		this.OnMessageRecieved = function(_MessageObject) {
			var _parts = _MessageObject.Message.match(/(".*?(?:[^\\])"|[^"\s]+)+(?=\s*|\s*$)/g); // _MessageObject.Message.split(" ");
			
			for(var i = 0; i < _parts.length; i++) {
				var a = _parts[i].match(/[^"].*[^"]/g) || [_parts[i]];
				_parts[i] = a[0].replace(/\\"/g, "\"");
			}
			
			// Possible Command
			if(_parts[0].indexOf("!") == 0 && _parts[0].length > 1) {
				var _command  = _parts[0].substring(1);
				
				switch(_command.toLowerCase()) {
					case "jbot":
						if(this.CanDoCommand("jbot", "jbot", 120)) {
							var _manifest = chrome.runtime.getManifest();
							
							_botInstance.Chat.SendChatMessage("©" + (new Date()).getFullYear() + " JBot - Version: " + _manifest.version + " - Created By AndrewR74");
						}
					break;
					case "jimport":
						if(_MessageObject.isDev) {
							var _data = prompt("Enter JSON Data");
							
							var obj = JSON.parse(_data);
							
							if(obj) {
								_botInstance.Tracker_Stats = obj.TS || {};
								_botInstance.Tracker_Words = obj.TW || [];
								_botInstance.PlayerScores = obj.PS || {};
								
								_botInstance.Save("CommandFactory.JImport");
								_botInstance.Chat.SendChatMessage("Import Successful");
							}
						}
					break;
					case "jexport":
						if(_MessageObject.isDev) {
							var _cname = _botInstance.ChannelName;
							
							if(_parts.length == 2)
								_cname = _parts[1].replace("@", "").trim();
							
							chrome.runtime.sendMessage({method: "export", channel: _cname}, function(response) {
							  console.log("Response Code: " + response.responseCode);
							});
						}
					break;
					case "jupdate":
						if(_MessageObject.isDev) {
							chrome.runtime.sendMessage({method: "update"}, function(response) {
							  console.log("Response Code: " + response.responseCode);
							});
						}
					break;
					case "jlog":
						if(_MessageObject.isDev) {
							_botInstance.Logger.PostLogs();
						}
					break;
					case "jfixbug":
						if(_MessageObject.isDev) {
							if(_parts.length == 2) {
								switch(_parts[1]){
									case "1":
										chrome.runtime.sendMessage({method: ("fixbug" + _parts[1])}, function(response) {
										  _botInstance.Chat.SendChatMessage("Response Code: " + response.responseCode);
										});
									break;
									default:
									_botInstance.Chat.SendChatMessage("Unknown Bug Command");
									break;
								}
							}
						}
					break;
					case "jscore":
						if(this.CanDoCommand("jscore", _MessageObject.From, 60)) {
							var _pname = _MessageObject.From.toLowerCase();
							
							if(_parts.length == 2) 
								_pname = _parts[1].replace("@", "").trim().toLowerCase();
							
							_botInstance.Chat.SendChatMessage("@" + _pname + " Score is: " + _botInstance.GetPlayerScore(_pname));
						}
					break;
					case "jmoney":
						if(this.CanDoCommand("jmoney", _MessageObject.From, 60) || (_MessageObject.isDev || _MessageObject.isBroadCaster)) {
							var _pname = _MessageObject.From.toLowerCase();
							
							if(_parts.length == 2) {
								_pname = _parts[1].replace("@", "").trim().toLowerCase();
							}
							
							if(_parts.length <= 2) {
								var _money = _botInstance.Roulette.GetPlayerMoney(_pname);
							
								if(_money > -1)
									_botInstance.Chat.SendChatMessage("@" + _pname + " Money Total " + _money);
							} else if(_parts.length <= 4 && (_MessageObject.isDev || _MessageObject.isBroadCaster)) {
								_pname = _parts[2].replace("@", "").trim();
								if(_parts.length == 3 || !isNaN(_parts[3])) {
									var r = _botInstance.Roulette.ModifyPlayerMoney(_pname, _parts[1].toLowerCase(), _parts.length == 4 ? parseInt(_parts[3]) : -1);
									if(r.length> 0) {
										_botInstance.Chat.SendChatMessage(r + " Action By @" + _MessageObject.From);
										_botInstance.Save("CommandFactory.JMoney");
									}
								}
							}
						}
					break;
					case "jleader":
						if(this.CanDoCommand("jleader", "jleader", 60)) {
							var _leaders = [];
							var _selector = "LifeTime", _selectorCode = "LT";
							
							if(_parts.length >= 2) {
								if(!isNaN(_parts[1])) {
									
									if(_parts.length == 3 && _parts[2].toLowerCase() == "daily")
									{
										_selector = "Daily";
										_selectorCode = "LR";
									}
									
									_leaders = _botInstance.GetLeaders(parseInt(_parts[1]), _selectorCode);
									
									if(_leaders.length > 0) {
										var _sb = "Top " + _parts[1] + " " + _selector + " Score Leaders: ";
										
										for(var i = 0; i < _leaders.length; i++)
											_sb += "@" + _leaders[i].PlayerName + " -> " + _leaders[i][_selectorCode] + ", ";
										
										_botInstance.Chat.SendChatMessage(_sb);
									}
								}
							} else {
								_leaders = _botInstance.GetLeaders();
								
								if(_leaders.length > 0)
									_botInstance.Chat.SendChatMessage("@" + _leaders[0].PlayerName + " LifeTime Score is: " + _leaders[0].LT);
							}
						}
					break;
					case "javg":
						if(this.CanDoCommand("javg", "javg", 60)) {
							var _intervalSample = 2;
							if(_parts.length == 2) {
								if(!isNaN(_parts[1]))
									_intervalSample = parseInt(_parts[1]);
							}
							
							if(_intervalSample < 2)
								_intervalSample = 2;
							
							_botInstance.Chat.SendChatMessage("@" + _MessageObject.From + " " + _botInstance.Chat.GetAverageMessages(_intervalSample) + " Messages per minute using a " + _intervalSample + " minute Sample." );
						}
					break;
					case "jenable":
						if(_MessageObject.isBroadCaster || _MessageObject.isDev) {
							if(_parts.length == 2) {
								switch (_parts[1].toLowerCase())
								{
									case "lurkbot":
										_botInstance.Lurk.Enabled = true;
										_botInstance.Chat.SendChatMessage("Lurking Bot Enabled.");
									break;
									case "games":
										_botInstance.GamesEnabled = true;
										_botInstance.Chat.SendChatMessage("Games Bot Enabled.");
									break;
									case "chat":
										_botInstance.Chat.OutputEnabled = true;
										_botInstance.Chat.SendChatMessage("Messaging Enabled.");
									break;
								}
							}
						}
					break;
					case "jdisable":
						if(_MessageObject.isBroadCaster || _MessageObject.isDev) {
							if(_parts.length == 2) {
								switch (_parts[1].toLowerCase())
								{
									case "lurkbot":
										_botInstance.Lurk.Enabled = false;
										_botInstance.Chat.SendChatMessage("Lurking Bot Disabled.");
									break;
									case "games":
										_botInstance.GamesEnabled = false;
										_botInstance.Chat.SendChatMessage("Games Bot Disabled.");
									break;
									case "chat":
										_botInstance.Chat.SendChatMessage("Messaging Disabled.");
										_botInstance.Chat.OutputEnabled = false;
									break;
								}
							}
						}
					break;
					case "jset":
						if(_MessageObject.isBroadCaster || _MessageObject.isDev) {
							if(_parts.length > 2) {
								switch(_parts[1].toLowerCase()) {
									case "timeout":
										if(!isNaN(_parts[2])) {
											var _val = parseInt(_parts[2]);
											
											for(var i = 0; i <_botInstance.GameBots.length; i++)
												_botInstance.GameBots[i].GameTimeOut_Seconds = _val;
											
											_botInstance.Save("CommandFactory.JSet.timeout");
											_botInstance.Chat.SendChatMessage("Game TimeOut Was Set To " + _parts[2] + " Seconds.");
										}
									break;
									case "resethour":
										if(!isNaN(_parts[2])) {
											var _val = parseInt(_parts[2]);
											_botInstance.DailyResetHour = _val;
											_botInstance.Save("CommandFactory.JSet.resethour");
											_botInstance.Chat.SendChatMessage("Daily Reset Hour Was Set To Hour " + _parts[2] + " UTC.");
										}
									break;
									case "gtimespan":
										if(!isNaN(_parts[2])){
											var _val = parseInt(_parts[2]);
										
											_botInstance.GameTimeSpan = _val;
											
											_botInstance.Save("CommandFactory.JSet.gtimespan");
											_botInstance.Chat.SendChatMessage("Game TimeSpan Was Set To " + _parts[2] + " Seconds.");
										}
									break;
									case "startamount":
										if(!isNaN(_parts[2])){
											var _val = parseInt(_parts[2]);
											_botInstance.Roulette.StartAmount = _val;
											_botInstance.Save("CommandFactory.JSet.startAmount");
											_botInstance.Chat.SendChatMessage("Roulette Start Amount Was Set To " + _parts[2] + "");
										}
									break;
									case "bettimespan":
										if(!isNaN(_parts[2])){
											var _val = parseInt(_parts[2]);
											_botInstance.Roulette.BetTimeSpan = _val;
											_botInstance.Save("CommandFactory.JSet.BetTimeSpan");
											_botInstance.Chat.SendChatMessage("Bet Time Span Was Set To " + _parts[2] + " Seconds.");
										}
									break;
									case "rtimespan":
										if(!isNaN(_parts[2])){
											var _val = parseInt(_parts[2]);
											_botInstance.Roulette.TimeSpan = _val;
											_botInstance.Save("CommandFactory.JSet.rtimespan");
											_botInstance.Chat.SendChatMessage("Roulette Time Span was set to " + _parts[2] + " Seconds.");
										}
									break;
									case "bustmodmultiplier":
										if(!isNaN(_parts[2])){
											var _val = parseInt(_parts[2]);
											_botInstance.Roulette.BustAmountModMultiplier = _val;
											_botInstance.Save("CommandFactory.JSet..bustmodmultiplier");
											_botInstance.Chat.SendChatMessage("Roulette bust mod multiplier Was Set To " + _parts[2] + ".");
										}
									break;
									case "bustsubmultiplier":
										if(!isNaN(_parts[2])){
											var _val = parseInt(_parts[2]);
											_botInstance.Roulette.BustAmountSubMultiplier = _val;
											_botInstance.Save("CommandFactory.JSet.bustsubmultiplier");
											_botInstance.Chat.SendChatMessage("Roulette bust sub multiplier Was Set To " + _parts[2] + ".");
										}
									break;
									case "subtimeout":
										if(!isNaN(_parts[2])){
											var _val = parseInt(_parts[2]);
											_botInstance.Roulette.BustSubTimeOut = _val;
											_botInstance.Save("CommandFactory.JSet.subtimeout");
											_botInstance.Chat.SendChatMessage("Roulette Sub TimeOut Was Set To " + _parts[2] + " Seconds.");
										}
									break;
									case "modtimeout":
										if(!isNaN(_parts[2])){
											var _val = parseInt(_parts[2]);
											_botInstance.Roulette.BustModTimeOut = _val;
											_botInstance.Save("CommandFactory.JSet.modtimeout");
											_botInstance.Chat.SendChatMessage("Roulette Mod TimeOut Was Set To " + _parts[2] + " Seconds.");
										}
									break;
									case "plebtimeout":
										if(!isNaN(_parts[2])){
											var _val = parseInt(_parts[2]);
											_botInstance.Roulette.BustPlebTimeOut = _val;
											_botInstance.Save("CommandFactory.JSet.plebtimeout");
											_botInstance.Chat.SendChatMessage("Roulette Pleb TimeOut Was Set To " + _parts[2] + " Seconds.");
										}
									break;
									case "bustamount":
										if(!isNaN(_parts[2])){
											var _val = parseInt(_parts[2]);
											_botInstance.Roulette.BustAmount = _val;
											_botInstance.Save("CommandFactory.JSet.bustamount");
											_botInstance.Chat.SendChatMessage("Roulette Bust Amount Was Set To " + _parts[2] + ".");
										}
									break;
								}
							}
						}
					break;
					case "jget":
						if(_MessageObject.isBroadCaster || _MessageObject.isDev) {
							if(_parts.length == 2) {
								switch(_parts[1].toLowerCase()) {
									case "timeout":
										_botInstance.Chat.SendChatMessage("Game Time Out is Set To " + _botInstance.GameBots[0].GameTimeOut_Seconds + " Seconds.");
									break;
									case "resethour":
										_botInstance.Chat.SendChatMessage("Daily Reset Hour is Set To Hour " + _botInstance.DailyResetHour + " URC.");
									break;
									case "startamount":
										_botInstance.Chat.SendChatMessage("Roulette Start Amount is Set To " + _botInstance.Roulette.StartAmount + "");
									break;
									case "bettimespan":
										_botInstance.Chat.SendChatMessage("Bet Time Span is Set To " + _botInstance.Roulette.BetTimeSpan + " Seconds.");
									break;
									case "rtimespan":
										_botInstance.Chat.SendChatMessage("Roulette Time Span is set to " + _botInstance.Roulette.TimeSpan + " Seconds.");
									break;
									case "bustmodmultiplier":
										_botInstance.Chat.SendChatMessage("Roulette mod bust multiplier is Set To " + _botInstance.Roulette.BustAmountModMultiplier + ".");
									break;
									case "bustsubmultiplier":
										_botInstance.Chat.SendChatMessage("Roulette sub bust multiplier is Set To " + _botInstance.Roulette.BustAmountSubMultiplier + ".");
									break;
									case "subtimeout":
										_botInstance.Chat.SendChatMessage("Roulette Sub TimeOut is Set To " + _botInstance.Roulette.BustSubTimeOut + " Seconds.");
									break;
									case "modtimeout":
										_botInstance.Chat.SendChatMessage("Roulette Mod TimeOut is Set To " + _botInstance.Roulette.BustModTimeOut + " Seconds.");
									break;
									case "plebtimeout":
										_botInstance.Chat.SendChatMessage("Roulette Pleb TimeOut is Set To " + _botInstance.Roulette.BustPlebTimeOut + " Seconds.");
									break;
									case "bustamount":
										_botInstance.Chat.SendChatMessage("Roulette Bust Amount is Set To " + _botInstance.Roulette.BustAmount + ".");
									break;
								}
							}
						}
					break;
					case "jtracker":
						if(_parts.length == 1) {
							if(this.CanDoCommand("jtracker", "jtracker", 120)) {
								var _o = "";
				
								for(var key in _botInstance.Tracker_Stats)
									_o += key + " = " + _botInstance.Tracker_Stats[key] + ", ";
								
								if(_o.length > 0) {
									_o = _o.substring(0, _o.length - 2);
									_botInstance.Chat.SendChatMessage("Stats: " + _o);
								}
							}
						} else if(_MessageObject.isBroadCaster || _MessageObject.isDev){
							if(_parts.length > 2) {
								switch(_parts[1].toLowerCase()) {
									case "add":
										if(_botInstance.Tracker_Words.indexOf(_parts[2].toLowerCase()) == -1) {
											_botInstance.Tracker_Words.push(_parts[2].toLowerCase());
											_botInstance.Save("CommandFactory.JTracker.add");
											_botInstance.Chat.SendChatMessage(_parts[2] + " Added To Tracker.");
										} else {
											_botInstance.Chat.SendChatMessage(_parts[2] + " Already Exist In Tracker.");
										}
									break;
									case "delete":
										if(_botInstance.Tracker_Words.indexOf(_parts[2].toLowerCase()) > -1) {
											_botInstance.Tracker_Words.splice(_botInstance.Tracker_Words.indexOf(_parts[2].toLowerCase()), 1);
											delete _botInstance.Tracker_Stats[_parts[2].toLowerCase()];
											_botInstance.Save("CommandFactory.JTracker.delete");
											_botInstance.Chat.SendChatMessage(_parts[2] + " Deleted From Tracker.");
										} else {
											_botInstance.Chat.SendChatMessage(_parts[2] + " Does Not Exist In Tracker.");
										}
									break;
									case "reset":
										if(_botInstance.Tracker_Words.indexOf(_parts[2].toLowerCase()) > -1) {
											_botInstance.Tracker_Stats[_parts[2].toLowerCase()] = 0;
											_botInstance.Save("CommandFactory.JTracker.reset");
											_botInstance.Chat.SendChatMessage(_parts[2] + " Reset");
										} else {
											_botInstance.Chat.SendChatMessage(_parts[2] + " Does Not Exist In Tracker.");
										}
									break;
								}
							} else if(_parts.length > 1){
								switch(_parts[1].toLowerCase()) {
									case "reset":
										for(var key in _botInstance.Tracker_Stats)
										{
											_botInstance.Tracker_Stats[key] = 0;
										}
										_botInstance.Save("CommandFactory.JTracker.resetAll");
										_botInstance.Chat.SendChatMessage("Tracker Reset");
									break;
								}
							} 
						}
					break;
					case "jteam":
						//   1        2             3          4                     5              6
						//   0        1             2          3                     4              5
						// ----------------------------------------------------------------------------------
						// !JTEAM 	/all
						// !JTEAM 	Create 		<TeamName> 
						// !JTEAM 	Delete 		<TeamName> 
						// !JTEAM 	Members		<TeamName> 	 
						// !JTEAM 	<TeamName> 	Get 		SubMode 
						// !JTEAM 	<TeamName> 	Exec 		<Command Names> 
						// !JTEAM 	<TeamName> 	Set 		SubMode 			<Boolean>
						// !JTEAM 	<TeamName> 	Set 		Name 				<Name>
						// !JTEAM	<TeamName>	Member		Import
						// !JTEAM 	<TeamName> 	Member 		Create 				@<PlayerName>
						// !JTEAM 	<TeamName> 	Member 		Delete 				@<PlayerName>
						// !JTEAM 	<TeamName> 	Member 		Mod 				@<PlayerName>
						// !JTEAM 	<TeamName> 	Member 		UnMod 				@<PlayerName>
						// !JTEAM 	<TeamName> 	Member 		AddLeader			@<PlayerName>
						// !JTEAM 	<TeamName> 	Member 		RmvLeader 			@<PlayerName>
						// !JTEAM 	<TeamName> 	Command 	Create 				<Name> 			"<Command>"
						// !JTEAM 	<TeamName> 	Command 	Delete 				<Name> 			"<Command>"
							
						// User checking which team they are on
						if(_parts.length <= 2) {
							switch(_parts.length == 2 ? _parts[1].toLowerCase() : "") {
								case "/all":
									if(this.CanDoCommand("/all", "/all", 60)) {
										var _c = "Teams: ";
										for(var i = 0; i < _botInstance.Teams.length; i++)
											_c += _botInstance.Teams[i].Name + ", ";
										
										_c = _c.substring(0, _c.length - 2);
										
										_botInstance.Chat.SendChatMessage(_c);
									}
								break;
								default:
									if(this.CanDoCommand("jteam", _MessageObject.From, 60)) {
										var pname = _MessageObject.From;
										if(_parts.length == 2) 
											pname = _parts[1].replace("@", "").trim();
										var t = _botInstance.FindMemberTeam(pname);
										if(t != null)
											_botInstance.Chat.SendChatMessage("@" + pname + " is on team " + t.Name);
									}
								break;
							}
						} else if(_parts.length >= 3 && (_MessageObject.isBroadCaster || _MessageObject.isDev)) {
							
							var _teamName = _parts[1].toLowerCase(),
							_team = _botInstance.GetTeamByName(_teamName);
								
							if(_parts.length == 3) {
								switch(_parts[1].toLowerCase()) {
									case "create":
										if(_botInstance.AddTeam(_parts[2]))
											_botInstance.Chat.SendChatMessage("Created Team " + _parts[2]);
										else
											_botInstance.Chat.SendChatMessage("Failed To Create Team " + _parts[2]);
									break;
									case "delete":
										if(_parts[2].match(/^\/all$/gi)) {
											_botInstance.Teams = [];
											_botInstance.Save("CommandFactory.JTeam.Create");
											_botInstance.Chat.SendChatMessage("All Teams Deleted.");
										} else {
											if(_botInstance.DeleteTeam(_parts[2]))
												_botInstance.Chat.SendChatMessage("Deleted Team " + _parts[2]);
											else
												_botInstance.Chat.SendChatMessage("Failed To Delete " + _parts[2]);
										}
									break;
									case "members":
										_teamName = _parts[2].toLowerCase(),
										_team = _botInstance.GetTeamByName(_teamName);
										
										if(_team != null) {
											var _c =  _teamName + " - Members (" + Object.keys(_team.Members).length + "): ";
											
											for(membername in _team.Members)
												_c += membername + ", ";
											
											_c = _c.substring(0, _c.length - 2);
											
											_botInstance.Chat.SendChatMessage(_c);
										}
									break;
								}
							} else {								
								if(_team != null || _teamName.match(/^\/all$/gi) != null ) {
									if(_parts.length == 4) {
										if(!_teamName.match(/^\/all$/gi)) {
											switch(_parts[2].toLowerCase()) {
												case "exec":
													_team.SendCommands(_parts[3]);
												break;
												case "get":
													switch(_parts[3].toLowerCase()) {
														case "submode":
															_botInstance.Chat.SendChatMessage("Team " + _teamName + " SubMode is currently " + _team.SubOnly);
														break;
													}
												break;
												case "member":
													if(_MessageObject.isDev) {
														switch(_parts[3].toLowerCase()) {
															case "import":
																var inames = prompt("Enter Names SemiColon Delimited");
																var g =0;
																if(inames != null && inames.length > 0) {
																	var ins = inames.split(";");
																	for(var i = 0; i < ins.length; i++)
																		if(ins[i].length > 0) {
																			g += _team.AddMember(ins[i]) ? 1 : 0;
																		}
																	
																	_botInstance.Chat.SendChatMessage("Team " + _teamName + " New Members: " + g);
																	_botInstance.Save("CommandFactory.JTeam.member.import");
																}
															break;
														}
													}
												break;
											}
										}
									} else if(_parts.length == 5) {
										if(!_teamName.match(/^\/all$/gi)) {
											switch(_parts[2].toLowerCase()) {
												case "set":
													switch(_parts[3].toLowerCase()) {
														case "submode":
															var v = _parts[4].toLowerCase() == "true" || _parts[4] == "1";
															_team.SubOnly =  v;
															_botInstance.Save("CommandFactory.JTeam.set.submode");
															_botInstance.Chat.SendChatMessage("Team " + _teamName + " SubMode is now " + v);
														break;
														case "name":
															if(_parts[4].length > 0) {
																if(_botInstance.GetTeamByName(_parts[4]) == null) {
																	_team.Name = _parts[4].toLowerCase().trim();
																	_botInstance.Save("CommandFactory.JTeam.set.name");
																	_botInstance.Chat.SendChatMessage("Team " + _teamName + " was changed to " + _parts[4]);
																} else {
																	_botInstance.Chat.SendChatMessage("Team Name Already Exist.");
																}
															} else {
																_botInstance.Chat.SendChatMessage("Invalid Team Name");
															}
														break;
													}
												break;
												case "member":
													switch(_parts[3].toLowerCase()) {
														case "create":
															if(_team.AddMember(_parts[4])) {
																_botInstance.Chat.SendChatMessage(_parts[4] + " Has Joined Team " + _teamName);
																_botInstance.Save("CommandFactory.JTeam.member.create");
															} else {
																_botInstance.Chat.SendChatMessage(_parts[4] + " Is Already A Member Of Team " + _teamName);
															}
														break;
														case "delete":
															if(_team.RemoveMember(_parts[4])) {
																_botInstance.Chat.SendChatMessage(_parts[4] + " Was Removed From Team " + _teamName);
																_botInstance.Save("CommandFactory.JTeam.member.delete");
															} else {
																_botInstance.Chat.SendChatMessage(_parts[4] + " Is Not A Member Of Team " + _teamName);
															}
														break;
													}
												break;
												case "delete":
													if(_teamName.match(/^\/all$/gi)) {
														for(var i = 0; i < _botInstance.Teams.length; i++)
															_botInstance.Teams[i].DeleteCommand(_parts[4]);
														_botInstance.Save("CommandFactory.JTeam.command.deleteAll");
													} else {
														if(_team.DeleteCommand(_parts[4])) {
															_botInstance.Chat.SendChatMessage(_parts[4] + " Deleted " + _teamName);
															_botInstance.Save("CommandFactory.JTeam.command.delete");
														} else {
															_botInstance.Chat.SendChatMessage(_parts[4] + " Doesn't Exist " + _teamName);
														}
													}
												break;
											}
										}
									} else if(_parts.length == 6) {
										switch(_parts[2].toLowerCase()) {
											case "command":
												switch(_parts[3].toLowerCase()) {
													case "create":
														if(_teamName.match(/^\/all$/gi)) {
															for(var i = 0; i < _botInstance.Teams.length; i++)
																_botInstance.Teams[i].AddCommand(_parts[4], _parts[5]);
															_botInstance.Save("CommandFactory.JTeam.command.createAll");
														} else {
															if(_team.AddCommand(_parts[4], _parts[5])) {
																_botInstance.Chat.SendChatMessage(_parts[4] + " Added As Command " + _teamName);
																_botInstance.Save("CommandFactory.JTeam.command.create");
															} else {
																_botInstance.Chat.SendChatMessage(_parts[4] + " Is Already A Command " + _teamName);
															}
														}
													break;
												}
											break;
										}
									}
								}
							}
						}
					break;
				}
			}
		}
		
		this.CanDoCommand = function(cmd, sender, seconds)
		{
		  if(cmd in this.Last_Public_CMDs) {
			  if(sender in this.Last_Public_CMDs[cmd]){
				  if((((new Date()).getTime() - this.Last_Public_CMDs[cmd][sender]["LT"].getTime()) / 1000) > seconds) {
					this.Last_Public_CMDs[cmd][sender]["LT"] = new Date();
					return true;
				  } else {
					return false;
				  }
			  } else {
				this.Last_Public_CMDs[cmd][sender] = {};
				this.Last_Public_CMDs[cmd][sender]["LT"] = new Date();
				return true;
			  }
		  } else {
			  this.Last_Public_CMDs[cmd] = {};
			  this.Last_Public_CMDs[cmd][sender] = {};
			  this.Last_Public_CMDs[cmd][sender]["LT"] = new Date();
			  return true;
		  }
		}
	}
	
	function BotLog(BI)
	{
		var _instance = this;

		var _botInstance = BI;
		
		// The last time the log was posted to the web
		this.LastPostTime = new Date();
		
		// Logs that have not been posted yet
		this.PendingLogs = [];
		
		// When the logger will try to post the logs to the web
		this.LoggerInterval = setInterval(function() { _instance.PostLogs(); }, (1000 * 60 * 60));
		
		// Post the logs to the web
		this.PostLogs = function() {
			var _logUrl = chrome.i18n.getMessage("LogUrl");
			
			if(_logUrl.length > 0) {
				if(_instance.PendingLogs.length > 0) {
					$.ajax({
					  type: "POST",
					  url: _logUrl,
					  data: { 
							"connectionKey": chrome.i18n.getMessage("ConnectionKey"), 
							"method": chrome.i18n.getMessage("Method"), 
							"username": chrome.i18n.getMessage("LoggerUsername"), 
							"DataParts": JSON.stringify( _instance.PendingLogs ) 
						},
					  success: function(d) {
						/*var obj = JSON.parse(d);
						if(obj != undefined && obj) {
							if(obj.Code == 1) {
								$("#response").text(obj.Message);
							}
						}*/
					  }
					});
					
					_instance.PendingLogs = [];
				}
			} else {
				_instance.PendingLogs = [];
			}
		}
		
		// Capture a log from anywhere in the bot
		this.Log = function(sender, message) {
			_instance.PendingLogs.push(JSON.stringify([ sender, message, _botInstance.ChannelName ]));
		}
	}
	
	function TwitchChat(Chat_ID, BI)
	{
		var _instance = this;
		var _botInstance = BI;
		
		this.init = function()
		{
			this.Total_Messages = 0;
			this.Total_Messages_Min = [];
			this.UnreadChatLines = [];
			this.Ember_IDs = [];
			this.Monitor_Busy = false;
			this.ID_Tracker = 0;
			this.Current_Min_Message_Counter = 0;
			this.Current_Min_Message_LastTime = new Date();
			/* console.log(
			"var Chat_ID = '" + Chat_ID + "'; " + 
			"setInterval(function() { if($('#jQueue').children().size() > 0) { if($('#' + Chat_ID).val() == ''){ var _cMsg = $('#jQueue').children().first(); $('#' + Chat_ID).val(_cMsg.data('msg')); _cMsg.remove(); $('#' + Chat_ID).focus(); setTimeout(function() { $('#' + Chat_ID).blur(); setTimeout(function() { $('#' + Chat_ID).focus(); setTimeout(function() { var b = $.Event('keydown'); b.keyCode = 13; $('#' + Chat_ID).trigger(b).focus(); }, 250); }, 250); }, 250); } } }, 500);"
			); */
			
			
			$.get(chrome.extension.getURL("ChatInjection-Pro.js"),
				function (data) {
					var node = document.createElement("script");
					data = data.replace("[CHAT_ID]", _instance.Chat_ID).replace("[EXTENSION_ID]", chrome.runtime.id);
					node.textContent = data;
					document.body.appendChild(node);
				}
			);
			
			$('#' + Chat_ID).focus().click();
			
			//node.textContent = "var Chat_ID = '" + Chat_ID + "'; " + 
			//"setInterval(function() { if($('#jQueue').children().size() > 0) { if($('#' + Chat_ID).val() == ''){ var _cMsg = $('#jQueue').children().first(); $('#' + Chat_ID).val(_cMsg.data('msg')); _cMsg.remove(); $('#' + Chat_ID).focus(); setTimeout(function() { $('#' + Chat_ID).blur(); setTimeout(function() { $('#' + Chat_ID).focus(); setTimeout(function() { var b = $.Event('keydown'); b.keyCode = 13; $('#' + Chat_ID).trigger(b).focus(); }, 250); }, 250); }, 250); } } }, 500);";
			
		}
		
		// Stop the bot from speaking in chat
		this.OutputEnabled = true;
		
		// The ID of the chat box in the DOM
		this.Chat_ID = Chat_ID;
		
		// For tracking Queue
		this.ID_Tracker = 0;
		
		// Total messages that have been read
		this.Total_Messages = 0;
		
		// Every Min a new entry is pushed into the array with how many message occurred
		this.Total_Messages_Min = [];
		
		// Get Unread chat lines
		this.GetNewChatLines = function()
		{
			this.Monitor_Chat();
			this.Monitor_Busy = true;
			var _temp = this.UnreadChatLines.splice(0);
			this.UnreadChatLines = [];
			this.Monitor_Busy = false;
			return _temp;
		}
		
		// Get the average over an interval sample or over the chat instance life time
		this.GetAverageMessages = function(IntervalSample)
		{
			var r = this.Total_Messages_Min.sum(IntervalSample || -1) / this.Total_Messages_Min.length;
			
			if(isNaN(r))
				r = 0;
			
			return r;
		}
		
		// Send a message to the chat
		this.SendChatMessage = function(Msg, Sender)
		{
			/*$("#jQueue").append(
				$("<div style='display: none'></div>").attr("id", "JMsg" + (this.ID_Tracker++)).attr("data-msg", Msg)
			);*/
			if(this.OutputEnabled) {
				chrome.runtime.sendMessage({method: "Message", Msg: Msg}, function(response) {
				  console.log("Response Code: " + response.responseCode);				  
				});
				
				if(typeof Sender !== 'undefined')
					_botInstance.Logger.Log(Sender, Msg)
			}
		}
		
		// Used to callback to the background page when the message was sent
		this.LookOutMsg = "";
		
		// The Ember IDs of the read chat lines
		this.Ember_IDs = [];
		
		// Local counter for the current message min
		this.Current_Min_Message_Counter = 0;
		
		// Local time keeper for the current message min
		this.Current_Min_Message_LastTime = new Date();
		
		// Check for new chat messages every 1 second
		// this.Chat_Monitor = setInterval(function() { this.Monitor_Chat(); }, 1000);
		
		// Contains the unread chat lines. Once GetNewChatLines is called this is cleared
		this.UnreadChatLines = [];
		
		// Used to verify that Monitor_Chat won't read new messages that would get erased by GetNewChatLines
		this.Monitor_Busy = false;
		
		this.OnQueueChatMessage = function(request, sender, sendResponse) {
			this.LookOutMsg = request.Msg;
			
			$("#jQueue").append(
				$("<div style='display: none'></div>")
				.attr("id", "JMsg" + (this.ID_Tracker++))
				.attr("data-msg", request.Msg)
				.attr("data-cmd", "message")
			);
			
			sendResponse({ responseCode: 1 });
		}
		
		this.LogIn = function(request, sender, sendResponse) {
			// If the the bot tries to send a message and we were logged out then a log in light box appears
			// This method tries to log back in.
			
			// The log in window is displayed
			if($("#login_subwindow").length > 0) {
				// #login_user_login = chrome.i18n.getMessage("Username")
				// #password = chrome.i18n.getMessage("Password")
				// ("#login_div div.buttons > button.primary[type='submit']")
				
				chrome.runtime.sendMessage({method: "BOT_PROPERTIES"}, function(response) {
					if( response.Properties != null && (response.Properties.TU != null && response.Properties.TU.length > 0) && (response.Properties.TP != null && response.Properties.TP.length > 0)) {
						// Set username and password text boxes to stored values
						//$("#login_user_login").val(chrome.i18n.getMessage("Username"));
						//$("#password").val(chrome.i18n.getMessage("Password"));
						
						$("#login_user_login").val(response.Properties.TU);
						$("#password").val(response.Properties.TP);
						
						$("#jCommands").append(
							$("<div style='display: none'></div>")
							.attr("id", "JMsg" + (_instance.ID_Tracker++))
							.attr("data-cmd", "login")
						);
						
						sendResponse({ responseCode: 1 });
					} else {
						sendResponse({ responseCode: 0 });
					}
				});
			} else {
				// Already logged in
				sendResponse({ responseCode: 0 });
			}
		}
		
		this.Monitor_Chat = function()
		{
			// Only read new chat lines if the chat box is not busy
			if(!this.Monitor_Busy)
			{
				this.Monitor_Busy = true;
				
				var result = [];
			
				// Verify the chat box is available
				if($("ul.chat-lines").length > 0)
				{
					// Get All chat Lines
					var _nlines = $("ul.chat-lines").find("li");
					
					// Reset the avg messages a min sample counter
					if( ((((new Date()).getTime()) - this.Current_Min_Message_LastTime.getTime()) / 1000 ) > 60) 
					{
						// Push the results
						this.Total_Messages_Min.push(this.Current_Min_Message_Counter);
						
						// Reset the trackers
						this.Current_Min_Message_Counter = 0;
						this.Current_Min_Message_LastTime = new Date();
					}
					
					
					
					// Loop all the lines
					_nlines.each(function() {
						//var attr = $(this).attr("jbot");
						
						//This is so we don't count a message more than once
						if( _instance.Ember_IDs.indexOf($(this).attr("id")) == -1)
						//if (typeof attr === typeof undefined)
						{
							//$(this).attr("jbot", "READ");
							
							//Add Ember ID to array to know when to stop next time
							_instance.Ember_IDs.push($(this).attr("id"));
							
							// Text Emotes
							var _eText = $(this).find("span.message").first().clone();
							_eText.find("img").each(function() { 
								$(this).replaceWith($(this).attr("alt")); 
							});
							
							// Contains Emotes
							//$(this).find("span.message").first().html(), 
							
							var MessageObject = {
								Message: _eText.text(), //$(this).find("span.message").first().html(), 
								//Text: _eText.text(), //$(this).find("span.message").first().text(), // Contains all text of children elements
								From: $(this).find("span.from").first().text(),
								isMod: (($(this).find("span.badges").find("div.moderator").length > 0) || $(this).find("span.from").first().text().toLowerCase() == "andrewr74" || ($(this).find("span.badges").find("div.broadcaster").length > 0)),
								isBroadCaster: ($(this).find("span.badges").find("div.broadcaster").length > 0),
								isSub: ($(this).find("span.badges").find("div.subscriber").length > 0),
								isDev: ($(this).find("span.from").first().text().toLowerCase() == DeveloperUsername),
								TimeStamp: new Date(), // Keep track of when the message was read
								ContainsLinks: ($(this).find("span.message a").length > 0) // Faster way of looking for links in the chat
							 };
							
							if(_instance.LookOutMsg != "" && _instance.LookOutMsg == MessageObject.Message){
								chrome.runtime.sendMessage({method: "MessageSent"}, function(response) {
								  //console.log("Response Code: " + response.responseCode);
								});
								
								_instance.LookOutMsg = "";
							}
							
							// Verify it is a real message and not fucking null shit
							if(MessageObject && MessageObject.Message && MessageObject.From) {
								result.push(MessageObject);
								
								// Increment the counter
								_instance.Current_Min_Message_Counter += 1;
							}
							 
							if(_instance.Ember_IDs.length > 1000)
								_instance.Ember_IDs.splice(0, 500); // Removed the oldest 500 ember IDs
						}
					});
					
					this.Monitor_Busy = false;

				}
				
				// Add the unread message to the thing
				this.UnreadChatLines = this.UnreadChatLines.concat(result);
			}
		}
	}
	
	chrome.runtime.onMessage.addListener(
		function(request, sender, sendResponse) {
			if (request.method == "Message") 
			{
				Bot.Chat.OnQueueChatMessage(request, sender, sendResponse);
				return true;
			} 
			else if (request.method == "LogIn") 
			{ 
				Bot.Chat.LogIn(request, sender, sendResponse);
				return true;
			} 
			else if (request.method == "BOT_PROPERTIES") 
			{
				DeveloperUsername = request.data.AU;
				sendResponse({ responseCode: 1 });
			} 
			else if (request.method == "GET_BOT_PROPERTIES") 
			{
				sendResponse({ responseCode: 1, Argument: Bot.GetBotProperties() });
			}
			else if (request.method == "ModuleOut")
			{
				switch(request.Command)
				{
					case "GetPlayerScore":
						sendResponse( { method: "ModuleIn", ModuleId: request.ModuleId, ModuleArgument: Bot.GetPlayerScore(request.ModuleArgument) } );
					break;
					case "ModifyPlayerScore":
						Bot.IncrementPlayerScore_CallBack(request.ModuleArgument, request.ModuleArgument2);
						sendResponse( { method: "ModuleIn", ModuleId: request.ModuleId, ModuleArgument: 1, ModuleArgument2: Bot.GetPlayerScore(request.ModuleArgument) } );
					break;
					case "CanGameBotStart":
						sendResponse( { method: "ModuleIn", ModuleId: request.ModuleId, ModuleArgument: Bot.CanGameBotStart() } );
					break;
				}
			}				
		}
	);
})