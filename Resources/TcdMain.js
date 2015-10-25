$(function() {  
  /**
  * Thresh hold values
  */
  var banTime = 5; //How many minutes to ban message for
  var minHits = 3; //Number hits before banning message
  var maxMessage = 1000; //Only keep track of 1000 messages
  var checkInterval = 2000; // 500 milliseconds
  var cleanInterval = (1000 * 60 * 2); //If theres not alot messages then force a clean
  
  /**
  * Global Variables
  */
  var DeveloperUsername = "andrewr74"; // Lowercase
  var Messages = [];
  var EmberIDs = [];
  var LastClean = (new Date()).getTime();
  //var Jeopardy = setInterval(function(){RunJeopardy();}, checkInterval);
  //var spamChecker = setInterval(function(){DeSpam();}, checkInterval);
  //This needs to be moved to a chrome browser action. That way it can be toggled.
  //var submodOnly = setInterval(function(){SubModeOnly();}, checkInterval);
  
  /**
  * Counters
  */
  var blockedMessages = 0;
  
  /**
  * Class message capture
  */
  function MessageCapture(msg)
  {	
  		this.msg = msg;
  		this.hits = 1;
  		this.timestamp = (new Date()).getTime();
  		
  		this.increment = function() { 
  			this.hits++;
  			this.timestamp = (new Date());
  		};
  		
  		this.getHits = function() {
  			return this.hits;
  		};
  		
  		this.isBan = function() {
  			if(this.hits >= minHits)
  				return true;
  			return false;
  		};
  		
  		this.isExpired = function() {
  			//If the MC is banned check if the ban has expired
  			if( this.isBan() ) {
  				if( ((new Date()).getTime() - this.timestamp) > (1000 * 60 * banTime) )
  					return true;
  			}
  			return false;
  		};
  		
  		this.isNotSpam = function() {
  			//If this is not banned and it has been at least a min timespan. The MC
  			//can be deleted because it is not spam/
  			if( !this.isBan() )
  				if( ((new Date()).getTime() - this.timestamp) > (1000 * 60 * 1) )
  					return true;
  			return false;
  		};
  }
  
  ///
  /// End Of Header
  ///
  
  var Chat_ID = "-1";
  var Questions = null;
  var Riddles = null;
  var Trivias = null;
  var Loaded = false;
  var CurrentQuestionIndex = -1;
  var PlayerScores = {};
  var State = -1;
  var SwitchStateTimer = (new Date());
  var Busy = false;
  var ID_Tracker = 0;
  var Max_Hints = 0;
  var GameMode = 0; // 0 = Jeopardy, 1 = Riddles, 2 = Trivia
  var UpTime = (new Date()); // This should only be set when the extension starts
  var AverageChatMsgs = 0;
  var Chat_Stat_Words = [];
  var Chat_Stats = { };
  
  // States
  var State_LurkBot = true;
  var State_Bot = true;
  var State_LurkOverride = false; // Allow lurk bot to ignore chat average
  
  // Timers
  var LastLurk = null;
  var Last_Public_CMDs = {}; // Used to avoid spammers overloading bot
 
  
  function RunJeopardy()
  {
	// Get the text box id
	var celement = $(".chat-room .chat-interface > .textarea-contain > div").children("textarea").first();
  
	if(celement)
	{
		Chat_ID = celement.attr("id");
	}
		
	// First Run (Init)
	if(State == -1) {
		$("body").append("<div id='jQueue' style='display: none'></div>");
		
  		LoadQuestionDatabase();
		State = 3;
		
		console.log("Paste this code into the console window and execute it.");
		
		console.log(
		"var Chat_ID = '" + Chat_ID + "'; " + 
		"setInterval(function() { if($('#jQueue').children().size() > 0) { if($('#' + Chat_ID).val() == ''){ var _cMsg = $('#jQueue').children().first(); $('#' + Chat_ID).val(_cMsg.data('msg')); _cMsg.remove(); $('#' + Chat_ID).focus(); setTimeout(function() { $('#' + Chat_ID).blur(); setTimeout(function() { $('#' + Chat_ID).focus(); setTimeout(function() { var b = $.Event('keydown'); b.keyCode = 13; $('#' + Chat_ID).trigger(b).focus(); }, 250); }, 250); }, 250); } } }, 2000);"
		);
		
		// NEW
		/*
		setInterval(function() {
			if($('#jQueue').children().size() > 0)
			{
				if($('#' + Chat_ID).val() == ''){
					var _cMsg = $('#jQueue').children().first();
					
					$('#' + Chat_ID).val(_cMsg.data('msg'));
					
					_cMsg.remove();
					
					$('#' + Chat_ID).focus();
					setTimeout(function() {
						$('#' + Chat_ID).blur();
						setTimeout(function() {
							$('#' + Chat_ID).focus();
							setTimeout(function() {
								var b = $.Event('keydown'); 
								b.keyCode = 13;
								$('#' + Chat_ID).trigger(b).focus();
							}, 250);
						}, 250);
					}, 250); 
				}
			}
		}, 2000);
		*/	
  	} else if(!State_Bot){
  	
  		// Still check for lurk bot
  		HandleLurkBot();
  	
		// Check for dev commands
		var cl = GetNewChatLines();
						
		for(var i = 0; i < cl.length; i++)
		{
			if(cl && cl[i].Message && cl[i].From) {
				HandleOtherInputs(cl[i]);
			}
		}
	} else {		
		if(Chat_ID != "-1" && Questions != null && Riddles != null && Trivias != null) {
			if(!Busy) {			
			
				// Check for lurk bot
				HandleLurkBot();
				
				// Start A New Question
				if(State == 0)
				{
					Busy = true;
					var i = -1;
					var cq =  { Answer: "" };
					var msg = "";
					
					if(GameMode == 0)
					{
						i = Math.floor((Math.random() * Questions.length) + 0);
						
						while(cq.Answer == "" || i == CurrentQuestionIndex || i == Questions.length) {
							i = Math.floor((Math.random() * Questions.length) + 0);
							cq = Questions[i];
						}
						msg = "Category: " + cq.Category + " - Question: " + cq.Question;
					} else if(GameMode == 1) {
						i = Math.floor((Math.random() * Riddles.length) + 0);
						
						while(cq.Answer == "" || i == CurrentQuestionIndex || i == Riddles.length) {
							i = Math.floor((Math.random() * Riddles.length) + 0);
							cq = Riddles[i];
						}
						msg = "Riddle: " + cq.Riddle;
					} else if(GameMode == 2) {
						i = Math.floor((Math.random() * Trivias.length) + 0);
						
						while(cq.Answer == "" || i == CurrentQuestionIndex || i == Trivias.length) {
							i = Math.floor((Math.random() * Trivias.length) + 0);
							cq = Trivias[i];
						}
						msg = cq.Question;
					}

					CurrentQuestionIndex = i;

					SendChatMessage(msg);

					SwitchStateTimer = (new Date());
					State = 1;
					Max_Hints = 0;
					
					Busy = false;
				}
				// Check For A Winner Or Time Out
				else if(State == 1) {
				
					Busy = true;
					
					var cl = GetNewChatLines();
					var cq = null;
					if(GameMode == 0)
						cq = Questions[CurrentQuestionIndex];
					else  if(GameMode == 1)
						cq = Riddles[CurrentQuestionIndex];
					else if(GameMode == 2)
						cq = Trivias[CurrentQuestionIndex];
					
					var Winner = "";
					var _hint = false, _skip = false;
					
					for(var i = 0; i < cl.length; i++)
					{
						if(cl && cl[i].Message && cl[i].From)
						{
							HandleOtherInputs(cl[i]);
							
							if(cl[i].Message.toLowerCase() == cq.Answer.toLowerCase())
							{
								Winner = cl[i].From;
								break;
							}
							else if(cl[i].Message.toLowerCase() == "!hint")
							{
								_hint = true;
								Max_Hints++;
							}
							else if(cl[i].Message.toLowerCase() == "!skip" && cl[i].isMod)
							{
								_skip = true;
							}
						}
					}
					
					if(Winner != "")
					{
						if(!(Winner in PlayerScores))
						{
							PlayerScores[Winner] = 0;
						}
					
						PlayerScores[Winner] = (PlayerScores[Winner] + 1);
						
						SaveScores();
					
						State = 3;
						
						SendChatMessage( "@" + Winner + " Has Won. Score: " + PlayerScores[Winner]);
					} else {
						// No answer
						if(_skip)
						{
							State = 3;
							
							SendChatMessage("Skipped - The Answer Was: " + cq.Answer );
							
							SwitchStateTimer = (new Date());
						}
						if( (((new Date()).getTime() - SwitchStateTimer.getTime())/1000) > 60)
						{
							State = 3;
							
							SwitchStateTimer = (new Date());
							
							SendChatMessage("The Answer Was: " + cq.Answer );
						} else {
							if(_hint && Max_Hints < 3)
							{
								var hintAn = "";
								for (var i = 0, len = cq.Answer.length; i < len; i++) {
									// Need to loop here for no alpha numeric characters
									if(cq.Answer[i] == "&")
										hintAn += "&";
									else if(cq.Answer[i] == ",")
										hintAn += ",";
									else if(cq.Answer[i] == "'")
										hintAn += "'";
									else if(cq.Answer[i] == ";")
										hintAn += ";";
									else if(cq.Answer[i] == ":")
										hintAn += ":";
									else if(cq.Answer[i] == "\"")
										hintAn += "\"";
									else if(cq.Answer[i] != " ") {
										if(hintAn.length > 0 && Max_Hints == 2)
										{
											// Check if the last character was a space
											if(hintAn.substring(hintAn.length -1, hintAn.length) == " ") {
												hintAn += cq.Answer[i];
											} else {
												hintAn += "*";
											}
										} else {
											hintAn += "*";
										}
									}
									else { 
										hintAn += " ";
									}
								}
								
								SendChatMessage( "Starts With: " + cq.Answer.substring(0, 1) + " - Hint: " + hintAn);
							}
						}
					}
					
					Busy = false;
				}
				// Game is paused
				else if(State == 2)
				{
					Busy = true;
					//if( (((new Date()).getTime() - SwitchStateTimer.getTime())/1000) > 15 )
					//{
						var cl = GetNewChatLines();
						
						for(var i = 0; i < cl.length; i++)
						{
							if(cl && cl[i].Message && cl[i].From) {
								HandleOtherInputs(cl[i]);
							}
						}
						
						//State = 3;
					//}
					Busy = false;
				}
				// Wait for a trivia command
				else if(State == 3)
				{
					Busy = true;
					var cl = GetNewChatLines();
					var _gameFound = false;
					
					for(var i = 0; i < cl.length; i++)
					{
						if(cl && cl[i].Message && cl[i].From)
						{
							HandleOtherInputs(cl[i]);
							
							if(!_gameFound)
							{
								if(cl[i].Message.toLowerCase() == "!jeopardy")
								{
									State = 0;
									GameMode = 0;
									_gameFound = true;
								}
								else if(cl[i].Message.toLowerCase() == "!riddle")
								{
									State = 0;
									GameMode = 1;
									_gameFound = true;
								}
								else if(cl[i].Message.toLowerCase() == "!trivia")
								{
									State = 0;
									GameMode = 2;
									_gameFound = true;
								}
							}
						}
					}
					Busy = false;
				}
			}
		}
	}
}
  
  function HandleLurkBot()
  {
		// If the chat current sample size is 10 or more then proceed with the lurk bot
		// Also lurk bot must be enabled
		if(State_LurkOverride || (AverageChatMsgs >= 10 && State_LurkBot))
		{
			if(LastLurk == null)
			{
				LastLurk = new Date();
				SendChatMessage("Coleslaw Coin Mining Bot");
			} else {
				if((((new Date()).getTime() - LastLurk.getTime()) / (1000 * 60)) > 25)
				{
					SendChatMessage("Coleslaw Coin Mining Bot");
					LastLurk = new Date();
				}
			}
		}
  }
  
  function HandleOtherInputs(cl)
  {
	  if(cl.Message.toLowerCase().indexOf("!jenable") == 0 && (cl.isDev || cl.isBroadCaster)) {
			var _parts = cl.Message.toLowerCase().split(" ");
			if(_parts.length == 2 ) {
				switch(_parts[1])
				{
					case "lurkbot":
						State_LurkBot = true;
						SendChatMessage("Lurk Bot = ON");
					break;
					case "bot":
						State_Bot = true;
						SendChatMessage("Bot = ON");
					break;
					case "lbo":
						State_LurkOverride = true;
						SendChatMessage("Lurk Bot Override = ON");
					break;
					default:
						SendChatMessage("Unknown J Command");
					break;
				}
			} else {
				SendChatMessage("Unknown J Command");
			}
		}
		else if(cl.Message.toLowerCase().indexOf("!jdisable") == 0 && (cl.isDev || cl.isBroadCaster)) {
			var _parts = cl.Message.toLowerCase().split(" ");
			if(_parts.length == 2 ) {
				switch(_parts[1])
				{
					case "lurkbot":
						State_LurkBot = false;
						SendChatMessage("Lurk Bot = OFF");
					break;
					case "bot":
						State_Bot = false;
						SendChatMessage("Bot = OFF");
					break;
					case "lbo":
						State_LurkOverride = false;
						SendChatMessage("Lurk Bot Override = OFF");
					break;
					default:
						SendChatMessage("Unknown J Command");
					break;
				}
			} else {
				SendChatMessage("Unknown J Command");
			}
		}
		else if(cl.Message.toLowerCase().indexOf("!jstate") == 0 && (cl.isDev || cl.isBroadCaster)) {
			var _parts = cl.Message.toLowerCase().split(" ");
			if(_parts.length == 2 ) {
				switch(_parts[1])
				{
					case "lurkbot":
						SendChatMessage("Lurk Bot is currently " + (State_LurkBot ? "ON" : "OFF"));
					break;
					case "bot":
						SendChatMessage("Bot is currently " + (State_Bot ? "ON" : "OFF"));
					break;
					case "lbo":
						SendChatMessage("Lurk Bot Override is currently " + (State_LurkOverride ? "ON" : "OFF"));
					break;
					default:
						SendChatMessage("Unknown J Command");
					break;
				}
			} else {
				SendChatMessage("Unknown J Command");
			}
		}
		
	if(State_Bot) {
		var _wordFound = false;
		
		// Calculate Key Word Stats
		for(var _i in Chat_Stat_Words)
		{
			//if(!cl.isMod) {
				{
				if(cl.Message.toLowerCase().indexOf(Chat_Stat_Words[_i]) > -1 && cl.Message.toLowerCase().indexOf("stats: ") != 0 && cl.Message.toLowerCase().indexOf("tracker") == -1) {
					if(cl.Message.toLowerCase().indexOf(Chat_Stat_Words[_i]) == 0 || cl.Message.toLowerCase().indexOf(" " + Chat_Stat_Words[_i]) > -1) { // Attempt to filter out words that contain the key word
						if(!(Chat_Stat_Words[_i] in Chat_Stats)) {
							Chat_Stats[Chat_Stat_Words[_i]] = 1;
						} else {
							Chat_Stats[Chat_Stat_Words[_i]] += 1;
						}
						_wordFound = true;
					}
				}
			}
		}
		
		if(_wordFound)
		{
			SaveChatSettings();
		}
		
		if(cl.Message.toLowerCase().indexOf("!jgive") == 0 && (cl.isBroadCaster || cl.isDev)) {
			var _parts = $("<span>" + cl.Message + "</span>").text().split(" ");
			
			if(_parts.length == 3)
			{
				var _pname = _parts[1].replace("@", "");
				
				if(!(_pname in PlayerScores))
				{
					PlayerScores[_pname] = 0;
				}
				
				var _giveAmount = parseInt(_parts[2]);
				
				if(!isNaN(_giveAmount))
				{
					PlayerScores[_pname] += _giveAmount;
					
					SaveScores();
					
					SendChatMessage( "@" + _pname + " Was Given " + _giveAmount + " Points.");
				}
			}
		}
		else if(cl.Message.toLowerCase().indexOf("!jtake") == 0 && (cl.isBroadCaster || cl.isDev)) {
			var _parts = $("<span>" + cl.Message + "</span>").text().split(" ");
			
			if(_parts.length == 3)
			{
				var _pname = _parts[1].replace("@", "");
				
				if((_pname in PlayerScores))
				{
					var _giveAmount = parseInt(_parts[2]);
					
					if(!isNaN(_giveAmount))
					{
						PlayerScores[_pname] -= _giveAmount;
						
						SaveScores();
						
						SendChatMessage( "@" + _pname + " Lost " + _giveAmount + " Points.");
					}
				}
			}
		}
		else if(cl.Message.toLowerCase().indexOf("!jpause") == 0 && (cl.isBroadCaster || cl.isDev)) {
			State = 2;
			SendChatMessage( "@" + cl.From +  " Has paused the game. !jresume to Resume the game" );
		}
		else if(cl.Message.toLowerCase().indexOf("!jresume") == 0 && (cl.isBroadCaster || cl.isDev)) {
			State = 3;
			SendChatMessage( "@" + cl.From + " Has resumed the game." );
		}
		else if(cl.Message.toLowerCase() == "!jscore") {
			if((cl.From in PlayerScores)) {
				if(CanDoPublicCommand("!jscore", cl.From, 10 )) {
					SendChatMessage( "@" + cl.From + " Score Is " + PlayerScores[cl.From]);
				}
			}
		}
		else if(cl.Message.toLowerCase() == "!jleader") {
			if(CanDoPublicCommand("!jleader", "jleader", 10))
			{
				var _leader = "";
				
				for(p in PlayerScores)
				{
					if(_leader == "") {
						_leader = p;
					}
					else {
						if(PlayerScores[p] > PlayerScores[_leader])
							_leader = p;
					}
				}
				
				if(_leader != "") {
					SendChatMessage("Current Leader: @" + _leader + " Score: " + PlayerScores[_leader]);
				} else {
					SendChatMessage("There is no leader.");
				}
			}
		}
		else if(cl.Message.toLowerCase() == "!jhelp") {
			if(CanDoPublicCommand("!jhelp", "jhelp", 10))
			{
				SendChatMessage("Commands: (!jgive <Player> <Amount>) - (!jscore [<Player>]) - (!jtake <Player> <Amount>) - (!skip) - (!jhelp) - (!jleader) - (!jtracker [<CMD> <WORD>]) - (!juptime) - (!jstate <PROPERTY>) - (!jenable <PROPERTY>) - (!jdisable <PROPERTY>) - (!javg)");
			}
		}
		else if(cl.Message.toLowerCase().indexOf("!jscore") == 0) {
			if(CanDoPublicCommand("!jscore2", cl.From, 10)) {
				var _parts = $("<span>" + cl.Message + "</span>").text().trim().split(" ");
				
				if(_parts.length == 2)
				{
					var _pname = _parts[1].replace("@", "").trim();
					
					if((_pname in PlayerScores))
					{
						SendChatMessage("@" + _pname + " Score is " + PlayerScores[_pname]);
					}
				}
			}
		}
		else if(cl.Message.toLowerCase().indexOf("!jexport") == 0 && cl.isDev) {
			ExportPlayerScores();
		}
		else if(cl.Message.toLowerCase().indexOf("!jimport") == 0 && cl.isDev) {
			ImportPlayerScores(prompt("Enter Base64 Data"));
		}
		else if(cl.Message.toLowerCase() == ("!juptime")) {
			if(CanDoPublicCommand("!juptime", "juptime", 10)) {
				SendChatMessage("@" + cl.From + " Bot has been running for " + Date.ToIntervalString(UpTime, (new Date())));
			}
		}
		else if(cl.Message.toLowerCase() == "!jtracker") {
			if(CanDoPublicCommand("!jtracker", "jtracker", 10)) {
				var _o = "";
				
				for(var key in Chat_Stats)
				{
					_o += key + " = " + Chat_Stats[key] + ", ";
				}
				
				if(_o.length > 0)
				{
					_o = _o.substring(0, _o.length - 2);
					
					SendChatMessage("Stats: " + _o);
				}
			}
		}
		else if(cl.Message.toLowerCase().indexOf("!jtracker") == 0 && (cl.isDev ||  cl.isBroadCaster)) {
			var _parts = cl.Message.toLowerCase().split(" ");
			if(_parts.length == 3 ) {
				switch(_parts[1])
				{
					case "add":
						if(Chat_Stat_Words.indexOf(_parts[2].toLowerCase()) == -1)
						{
							Chat_Stat_Words.push(_parts[2].toLowerCase());
							SaveChatSettings();
							SendChatMessage(_parts[2] + " Added To Tracker.");
						} else {
							SendChatMessage(_parts[2] + " Already Exist In Tracker.");
						}
					break;
					case "delete":
						if(Chat_Stat_Words.indexOf(_parts[2].toLowerCase()) >= 0)
						{
							Chat_Stat_Words.splice(Chat_Stat_Words.indexOf(_parts[2].toLowerCase()), 1);
							delete Chat_Stats[_parts[2].toLowerCase()];
							SaveChatSettings();
							SendChatMessage(_parts[2] + " Deleted From Tracker.");
						} else {
							SendChatMessage(_parts[2] + " Does Not Exist In Tracker.");
						}
					break;
					case "reset":
						if(Chat_Stat_Words.indexOf(_parts[2].toLowerCase()) >= 0)
						{
							if(_parts[2].toLowerCase() in Chat_Stats)
							{
								Chat_Stats[_parts[2].toLowerCase()] = 0;
								SaveChatSettings();
							}
							
							SendChatMessage(_parts[2] + " Reset");
						} else {
							SendChatMessage(_parts[2] + " Does Not Exist In Tracker.");
						}
					break;
					case "stats":
						if(Chat_Stat_Words.indexOf(_parts[2].toLowerCase()) >= 0)
						{
							if(_parts[2].toLowerCase() in Chat_Stats)
							{
								SendChatMessage(_parts[2] + " = " + Chat_Stats[_parts[2].toLowerCase()]);
							} else {
								SendChatMessage(_parts[2] + " = 0");
							}
						} else {
							SendChatMessage(_parts[2] + " Does Not Exist In Tracker.");
						}
					break;
					default:
						SendChatMessage("Unknown J Command");
					break;
				}
			} else {
				SendChatMessage("Unknown J Command");
			}
		}
		else if(cl.Message.toLowerCase() == "!javg") {
			if(CanDoPublicCommand("!javg", "javg", 10)) {
				SendChatMessage("Average Messages A Minute (2 Min Sample): " + Math.floor(AverageChatMsgs));
			}
		}
	}
  }
  
  function CanDoPublicCommand(cmd, sender, seconds)
  {
	  /*
	  
	  {
		JSCORE: { Andrew: { LT: DATE() } },
		JHELP: { Andrew: { LT: Date() } }
	  }
  
	  */
	  if(cmd in Last_Public_CMDs) {
		  if(sender in Last_Public_CMDs[cmd]){
			  if((((new Date()).getTime() - Last_Public_CMDs[cmd][sender]["LT"].getTime()) / 1000) > seconds) {
				Last_Public_CMDs[cmd][sender]["LT"] = new Date();
				return true;
			  } else {
				return false;
			  }
		  } else {
			Last_Public_CMDs[cmd][sender] = {};
			Last_Public_CMDs[cmd][sender]["LT"] = new Date();
			return true;
		  }
	  } else {
		  Last_Public_CMDs[cmd] = {};
		  Last_Public_CMDs[cmd][sender] = {};
		  Last_Public_CMDs[cmd][sender]["LT"] = new Date();
		  return true;
	  }
  }
  
  function LoadQuestionDatabase()
  {
  		if(Questions == null && !Loaded) {
			$.get(chrome.extension.getURL("db.json"),
				function (data) {
					
					Questions = JSON.parse(data);
					
					chrome.storage.local.get(["kcs", "kws", "kw", "UT"], function(data) {
						if("kcs" in data) { 
							PlayerScores = JSON.parse(data["kcs"]);
						} else {
							PlayerScores = {};
						}
						
						if("kws" in data) { 
							Chat_Stats = JSON.parse(data["kws"]);
						} else {
							Chat_Stats = {};
						}
						
						if("kw" in data) { 
							Chat_Stat_Words = JSON.parse(data["kw"]);
						} else {
							Chat_Stat_Words = [ "fat", "ugly", "kaceytron", "boob", "sex", "dog" ];
						}
						
						$.get(chrome.extension.getURL("Riddles.json"), function(rData){
							Riddles = JSON.parse(rData);
							$.get(chrome.extension.getURL("Trivias.json"), function(rData){
								Trivias = JSON.parse(rData);
								Loaded = true;
							});
						});
					});
				}
			);
        }
  }
  
  function ImportPlayerScores(_jData)
  {
	  try {
		  PlayerScores = JSON.parse(_jData);
		  SaveScores();
		  SendChatMessage("Successfully Imported Player Scores");
	  } catch(e) {
		  SendChatMessage("Failed Importing Player Scores");
	  }
  }
  
  function ExportPlayerScores()
  {
	chrome.runtime.sendMessage({method: "export"}, function(response) {
	  console.log("Response Code: " + response.responseCode);
	});
  }
  
  function SaveScores()
  {
	chrome.storage.local.set({ "kcs": JSON.stringify(PlayerScores) }, function(){
		if(chrome.runtime.lastError)
			console.log(chrome.runtime.lastError);
	});
  }
  
  function SaveChatSettings()
  {
	chrome.storage.local.set({ "kw": JSON.stringify(Chat_Stat_Words), "kws": JSON.stringify(Chat_Stats) }, function(){
		if(chrome.runtime.lastError)
			console.log(chrome.runtime.lastError);
	});
  }
 
 
  
  /*
  function SaveRiddleScores()
  {
	chrome.storage.local.set({ "rKCS": JSON.stringify(RiddlePlayerScores) }, function(){
		if(chrome.runtime.lastError)
			console.log(chrome.runtime.lastError);
	});
  }*/
  
  function SendChatMessage(Msg)
  {
	$("#jQueue").append(
		$("<div style='display: none'></div>").attr("id", "JMsg" + (ID_Tracker++)).attr("data-msg", Msg)
	);
  }
  
  var _chatAvgTime = null;
  var _chatTotalMsgs = 0;
  
  function GetNewChatLines()
  {
  	var result = [];
  	
	if($("ul.chat-lines").length > 0)
	{
		var _nlines = $("ul.chat-lines").find("li");
		
		if(_chatAvgTime == null)
		{
			_chatAvgTime = new Date();
		}
		
		// Reset the avg messages a min sample counter
		if( ((((new Date()).getTime()) - _chatAvgTime.getTime()) / 1000 ) > 60) 
		{
			if((AverageChatMsgs + _chatTotalMsgs) > 1) {
				if(AverageChatMsgs > 0){
					AverageChatMsgs = (AverageChatMsgs + _chatTotalMsgs) / 2;
				} else {
					AverageChatMsgs = _chatTotalMsgs;
				}
			} else {
				AverageChatMsgs = 0;
			}	
		
			_chatTotalMsgs = 0;
			_chatAvgTime = new Date();
		}
		
		_nlines.each(function() {
			//This is so we dont count a message more than once
			if( EmberIDs.indexOf($(this).attr("id")) == -1)
			{
				//Add Ember ID to array to known when to stop next time
				EmberIDs.push($(this).attr("id"));
				
				result.push(
				 {
				 	Message: $(this).find("span.message").first().html(),
				 	From: $(this).find("span.from").first().text(),
					isMod: (($(this).find("span.badges").find("div.moderator").length > 0) || $(this).find("span.from").first().text().toLowerCase() == "andrewr74" || ($(this).find("span.badges").find("div.broadcaster").length > 0)),
					isBroadCaster: ($(this).find("span.badges").find("div.broadcaster").length > 0),
					isDev: ($(this).find("span.from").first().text().toLowerCase() == DeveloperUsername)
				 });

				//Empty Stored IDs - need to match how many twitch messages shows at a time
				if(EmberIDs.length > 1000)
					EmberIDs = [];
				
				_chatTotalMsgs += 1;
			} else {
				//console.log("End Of New Messages.");
				//return true;
			}
		});
	}
	
	return result;
  }
  
  ///
  /// Sub Mode Only Start
  ///
  
  function SubModeOnly()
  {
  	  	if($("ul.chat-lines").length > 0)
  		{
  			$("ul.chat-lines").find("li").each(function() {
  				var subBadge = $(this).find("span.badges").find("div.subscriber");
  				
  				if(subBadge.size() != 0)
  				{
  					$(this).css("display", "block");
  				}
  			});
  		} else {
  			//console.log("Could not find chat.");
  		}
  }
  
  ///
  /// sub Mode Only End
  ///
  
  ///
  /// DeSpammer Start
  ///
  
  function DeSpam()
  {
  		//console.log("There Are: " + $("ul.chat-lines").find("li").first().attr("id"));
  		
  		if($("ul.chat-lines").length > 0)
  		{
  			$("ul.chat-lines").find("li").each(function() {
  				//This is so we dont count a message more than once
  				if( EmberIDs.indexOf($(this).attr("id")) == -1)
  				{
  					//Add Ember ID to array to known when to stop next time
  					EmberIDs.push($(this).attr("id"));
  					
  					//Handle Message
  					//console.log("IsBan = " + MessageHandler($(this)));
  					
  					if(!MessageHandler($(this)) ){
  						$(this).css("display", "block");
  						//console.log("Banned Message");
  					} else {
  						blockedMessages++;
  						UpdateCounter("TCDBMCSPAM", blockedMessages);
  					}
  					
  					//Empty Stored IDs - need to match how many twitch messages shows at a time
  					if(EmberIDs.length > 1000)
  						EmberIDs = [];
  						
  					//Only Clean up Messages when total Messages is over maxmessages or last clean time > cleaninterval
  					if(Messages.length > maxMessage || ((new Date()).getTime() - LastClean) > cleanInterval)
  						CleanCapturedMessages();
  					
  				} else {
  					//console.log("End Of New Messages.");
  					//return true;
  				}
  			});
  		} else {
  			//console.log("Could not find chat.");
  		}
  }
  
  function MessageHandler(target)
  {
  		var targetMsg = $(target).find("span.message").first().html();
  		
  		if( targetMsg )
  		{
  			targetMsg = targetMsg.toLowerCase();
  		
  			var foundMc = $.grep(Messages, function(e)
  			{ 
  				return (e.msg == targetMsg);
  			});
  		
  			if(foundMc.length == 0)
  			{
  				Messages.push(new MessageCapture(targetMsg));
  				//console.log("Creating MessageCapture");
  				return false;
  			} else {
  				foundMc[0].increment();
  				//console.log("Incremented MessageCapture");
  			
  				return foundMc[0].isBan();
  			}	
  		
  			foundMc = null;
		}
  }
  
  function UpdateCounter(targetID, value)
  {
  		if( $("#" + targetID).length == 0)
  		{
  			$(".room-title")
  				.first()
  				.append("<span id='" + targetID + "' style='float:right;font-size:10px;'>Blocked: " + value + "</span>")
  				.attr("style","margin: auto;text-align: center;");
  		} else {
  			$("#" + targetID).text( "Blocked: " + value);
  		}
  }
  
  function CleanCapturedMessages()
  {
  		LastClean = (new Date()).getTime();
  		
  		for (var i = Messages.length-1; i >= 0; i--) {
			if(Messages[i].isExpired() || Messages[i].isNotSpam())
				Messages.splice(i,1);
		}
  }
  
  ///
  /// End DeSpammer
  ///
  
  
  ///
  /// Prototypes
  ///
	Date.ToIntervalString = function( date1, date2 ) {
	  //Get 1 day in milliseconds
	  var one_day=1000*60*60*24;

	  // Convert both dates to milliseconds
	  var date1_ms = date1.getTime();
	  var date2_ms = date2.getTime();

	  // Calculate the difference in milliseconds
	  var difference_ms = date2_ms - date1_ms;
	  //take out milliseconds
		difference_ms = difference_ms/1000;
	  var seconds = Math.floor(difference_ms % 60);
		difference_ms = difference_ms/60; 
	  var minutes = Math.floor(difference_ms % 60);
		difference_ms = difference_ms/60; 
	  var hours = Math.floor(difference_ms % 24);  
	  var days = Math.floor(difference_ms/24);
	  
	  return days + ' days, ' + hours + ' hours, ' + minutes + ' minutes, and ' + seconds + ' seconds';
	}
  
  
});