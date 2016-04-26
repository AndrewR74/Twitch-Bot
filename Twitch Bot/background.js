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
	
	// Keys in the storage that can not be a channel name
	var _ProtectedKeys = {
		SUBSCRIBED_TAB_IDS: "SUBSCRIBED_TAB_IDS",
		BOT_PROPERTIES: "BOT_PROPERTIES"
	};
	
	var _MsgQueue = [];
	var _IdTracker = 0;
	var _Sending = false;
	var _MsgDispatcher = setInterval(function() { CheckForMsg(); }, 250);
	var _CurrentMsg = null;
	var _SendTimeOut = null;
	var _LogInAttemps = 0;
	// An array of tab ids that the bot is running in
	var _BotTabs = [];
	// Properties shared between all instances of the bot
	var _SharedBotProperties = null;
	// Auto start bots after an update
	var _AutoStartTabs = [];
	// A list of tabs that modules created
	var _ActiveModules = null; /*{
		"ModuleID": {
			"ModuleID": "",
			"HostTabId": 0,
			"AllowedTabs": 0,
			"ActiveTabs": []
		}
	};*/
	
	// Could have this in a listener but fuck it
	init();
	
	function CheckForMsg() {
		if(_MsgQueue.length > 0 && _Sending == false) {
			_Sending = true;
			_CurrentMsg = $.extend(true, {}, _MsgQueue[0]);
			_MsgQueue.splice(0, 1);
			
			// chrome.tabs.update(_CurrentMsg.TabId, { /*active: true, selected: true*/ }, function(tab) {
				// chrome.windows.update(tab.windowId, { /*focused: true*/ }, function(window) {
					
				// });
			// });
			
			// Send to content script send msg
			if(_CurrentMsg != null) {
				chrome.tabs.sendMessage(_CurrentMsg.TabId, {method: "Message", Msg: _CurrentMsg.Msg}, function(response) {
					console.log("Message Sent");
					//_CurrentMsg = null;
					_SendTimeOut=  new Date();
				});
			}
			
		} else if(_Sending) {
			console.log("Waiting for message to be sent");
			// 10 Second sending time out
			if(_SendTimeOut != null && ((((new Date()).getTime()) - _SendTimeOut.getTime()) / 1000 ) > 10) {
				if((_LogInAttemps++) == 0) {
					chrome.tabs.update(_CurrentMsg.TabId, { /*active: true, selected: true*/ }, function(tab) {
						chrome.windows.update(tab.windowId, { /*focused: true*/ }, function(window) {
							// Attempt to log in
							chrome.tabs.sendMessage(_CurrentMsg.TabId, {method: "LogIn"}, function(response) {
								if(response.responseCode == 1) {
									setTimeout(function() {
										ReloadSubscribedTabs([_CurrentMsg.TabId]);
										_Sending = false;
										_CurrentMsg = null;
									}, 3000);
									console.log("LogIn Sent");
									
									_AutoStartTabs = _BotTabs;
									
								} else {
									_Sending = false;
									_CurrentMsg = null;
								}
							});
						});
					});
				} else {
					// Well we tried
					// Just put the bot into a spiral b/c I have no idea what to do when no user data is available
					_Sending = false;
					_CurrentMsg = null;
					
					// I guess we can keep trying
					_LogInAttemps = 0;
				}
			}
		}
	}
	
	function ReloadSubscribedTabs(ignoreTabs) {
		_AutoStartTabs = [];
		for(var i = 0; i < _BotTabs.length; i++)
			if(typeof ignoreTabs === "undefined" || ignoreTabs.indexOf(_BotTabs[i]) == -1) {
				chrome.tabs.reload(_BotTabs[i]);
				_AutoStartTabs.push(_BotTabs[i]);
			}
		_BotTabs = [];
	}
	
	function MessageSubscribedTabs(method, data, ignoreTabs) {
		for(var i = 0; i < _BotTabs.length; i++)
			if(typeof ignoreTabs === "undefined" || ignoreTabs.indexOf(_BotTabs[i]) == -1)
				chrome.tabs.sendMessage(_BotTabs[i], {method: method, data: data});
	}
	
	function CheckForUpdate() {
		chrome.runtime.requestUpdateCheck(function (status) {
			if(status == "update_available") {
				// Do Shit
				// Hopefully the update available listener is fired
			}
		});
	}
	
	function init() {
		chrome.storage.local.get("BOT_PROPERTIES", function(data) {
			if("BOT_PROPERTIES" in data)
				_SharedBotProperties = data.BOT_PROPERTIES;
			else 
				_SharedBotProperties = { TU: "", TP: "", AU: "", DeveloperMode: false };
		});
	}
	
	/**
		Closes all active module managed tabs.
	*/
	function CloseAllModuleTabs() {
		if(typeof(_ActiveModules) !== "undefined" && _ActiveModules != null) {
			for (var key in _ActiveModules) {
				if(typeof(_ActiveModules[key]) !== "undefined" && _ActiveModules[key] != null && _ActiveModules[key].ActiveTabs && _ActiveModules[key].ActiveTabs != null) {
					for(var i = 0; i < _ActiveModules[key].ActiveTabs.length; i++) {
						chrome.tabs.remove(_ActiveModules[key].ActiveTabs[i]);
					}
					
					delete _ActiveModules[key];
				}
			}
		}
	}
	
	/**
		Gets the host tab that created a module tab.
	*/
	function GetModuleTabHostTab(tabId) {
		var _result = null;
		
		if(typeof(_ActiveModules) !== "undefined" && _ActiveModules != null) {
			for (var key in _ActiveModules) {
				if(typeof(_ActiveModules[key]) !== "undefined" && _ActiveModules[key] != null && _ActiveModules[key].ActiveTabs && _ActiveModules[key].ActiveTabs != null && _ActiveModules[key].HostTabId) {
					for(var i = 0; i < _ActiveModules[key].ActiveTabs.length; i++) {
						if(_ActiveModules[key].ActiveTabs[i] == tabId) {
							_result = _ActiveModules[key];
							break;
						}
					}
				}
				if(_result != null)
					break;
			}
		}
		
		return _result;
	}
	
	/**
		Gets the host tab of a module
	*/
	function GetModuleHostTab(moduleId) {
		var _result = null;
		
		if(typeof(_ActiveModules) !== "undefined" && _ActiveModules != null) {
			for (var key in _ActiveModules) {
				if(key == moduleId && typeof(_ActiveModules[key]) !== "undefined" && _ActiveModules[key] != null && _ActiveModules[key].HostTabId) {
					_result = _ActiveModules[key].HostTabId;
				}
				if(_result != null)
					break;
			}
		}
		
		return _result;
	}
	
	/**
		If the Host Bot tab is closed then all the tabs created by the modules running in that bot instance will be closed.
	*/
	function CloseActiveModule(hostTabId) {
		if(typeof(_ActiveModules) !== "undefined" && _ActiveModules != null) {
			for (var key in _ActiveModules) {
				if(typeof(_ActiveModules[key]) !== "undefined" && _ActiveModules[key] != null && _ActiveModules[key].HostTabId) {
					if(_ActiveModules[key].HostTabId == hostTabId) {
						CloseAllModuleTabs(key);
						delete _ActiveModules[key];
					}
				}
			}
		}
	}
	
	/**
		Closes all tabs created by a module
	*/
	function CloseAllModuleTabs(moduleId) {
		if(typeof(_ActiveModules) !== "undefined" && _ActiveModules != null) {
			for (var key in _ActiveModules) {
				if( key == moduleId && typeof(_ActiveModules[key]) !== "undefined" && _ActiveModules[key] != null && _ActiveModules[key].ActiveTabs && _ActiveModules[key].ActiveTabs != null) {
					// Removed the tabs from the active list because the host tab is already closed. Nothing to notify
					var _rTabs = _ActiveModules[key].ActiveTabs;
					_ActiveModules[key].ActiveTabs = [];
					for(var i = 0; i < _rTabs.length; i++) {
						chrome.tabs.remove(_rTabs[i]);
					}
					break;
				}
			}
		}
	}
	
	/**
		Handles closing the actual tab and dispatching the notification messsage to the module that the tab was closed.
	*/
	function CloseModuleTabDispatch(hostTabId, tabId, moduleId) {
		_ActiveModules[moduleId].ActiveTabs.splice(_ActiveModules[moduleId].ActiveTabs.indexOf(tabId), 1);
		chrome.tabs.sendMessage(hostTabId, {method: "ModuleIn", ModuleId: moduleId, Command: "TabClosed", ModuleArgument: tabId});
	}
	
	/**
		Called from the module to create a new tab.
	*/
	function OpenModuleTab(hostTabId, tabOptions, moduleId, callback) {
		if(typeof(_ActiveModules) === "undefined" || _ActiveModules == null)
			_ActiveModules = {};
	
		if(typeof(_ActiveModules[moduleId]) === "undefined" || _ActiveModules[moduleId] == null)
			_ActiveModules[moduleId] = { ModuleID: moduleId, ActiveTabs: [], AllowedTabs: 1, HostTabId: hostTabId };
			
		if( typeof(_ActiveModules[moduleId].ActiveTabs) === "undefined" || _ActiveModules[moduleId].ActiveTabs == null)
			_ActiveModules[moduleId].ActiveTabs = [];
			
		if(_ActiveModules[moduleId].ActiveTabs.length < _ActiveModules[moduleId].AllowedTabs)
			chrome.tabs.create(tabOptions, function(tab) {
				_ActiveModules[moduleId].ActiveTabs.push(tab.id);
				callback({ Message: "Successfully Created Tab", Code: 1, Argument: tab.id });
			});
		else
			callback({ Message: "Reached Maximum number of Module Tabs.", Code: 2 });
	}
	
	/**
		Called from the module to update a tab that is managed by the module.
	*/
	function UpdateModuleTab(hostTabId, updateTabId, tabOptions, moduleId, callback) {
		if(typeof(_ActiveModules) !== "undefined" && _ActiveModules != null && typeof(_ActiveModules[moduleId]) !== "undefined") {
			if( typeof(_ActiveModules[moduleId].ActiveTabs) !== "undefined" && _ActiveModules[moduleId].ActiveTabs != null) {
				if(_ActiveModules[moduleId].ActiveTabs.indexOf(updateTabId) > -1) {
					chrome.tabs.update(updateTabId, tabOptions, function() {
						callback({ Message: "Successfully Updated Tab", Code: 1});
					});
				} else {
					callback({ Message: "Tab could not be found.", Code: 2});
				}
			} else {
				callback({ Message: "Module does not have any tabs.", Code: 3});
			}
		} else {
			callback({ Message: "Module did not exist in the subscribed module list.", Code: 4});
		}
	}
	
	/**
		Handles checking that the tab to be close dis managed by the module ID
	*/
	function CloseModuleTab(hostTabId, deleteTabId, moduleId, callback) {
		if(typeof(_ActiveModules) !== "undefined" && _ActiveModules != null && typeof(_ActiveModules[moduleId]) !== "undefined") {
			if( typeof(_ActiveModules[moduleId].ActiveTabs) !== "undefined" && _ActiveModules[moduleId].ActiveTabs != null) {
				if(_ActiveModules[moduleId].ActiveTabs.indexOf(deleteTabId) > -1) {
					chrome.tabs.remove(deleteTabId, function() {
						CloseModuleTabDispatch(hostTabId, deleteTabId, moduleId);
					});
					callback({ Message: "Successfully Closed Tab. Check Dispatch Function.", Code: 1});
				} else {
					callback({ Message: "Tab could not be found.", Code: 2});
				}
			} else {
				callback({ Message: "Module does not have any tabs.", Code: 3});
			}
		} else {
			callback({ Message: "Module did not exist in the subscribed module list.", Code: 4});
		}
	}
	
	chrome.runtime.onInstalled.addListener(
		function (details) {
			if(details.reason == "update") {
				chrome.storage.local.get([_ProtectedKeys.SUBSCRIBED_TAB_IDS], function(data) {
					
					if(data != null && _ProtectedKeys.SUBSCRIBED_TAB_IDS in data) {
						
						_BotTabs = JSON.parse(data[_ProtectedKeys.SUBSCRIBED_TAB_IDS]);
						
						_AutoStartTabs = _BotTabs;
						
						chrome.storage.local.remove(_ProtectedKeys.SUBSCRIBED_TAB_IDS, function() {
							ReloadSubscribedTabs();
						});
					}
				});
			} else if(details.reason == "install") {
				chrome.tabs.create({ url: chrome.extension.getURL('options_page.html') }, function(ctab) {
		   
				});
			}
		}
	);
	
	chrome.browserAction.onClicked.addListener(function(tab) {
	   chrome.tabs.create({ url: chrome.extension.getURL('options_page.html') }, function(ctab) {
		   
	   });
	});
	
	chrome.runtime.onUpdateAvailable.addListener(
		function (details) {
			chrome.storage.local.set({ "SUBSCRIBED_TAB_IDS": JSON.stringify(_BotTabs) }, function() {
				CloseAllModuleTabs();
				chrome.runtime.reload();
			});
		}
	);
	
	chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
		/**
			If the closed tab was a host tab then the module tabs needs to be closed.
		*/
		CloseActiveModule(tabId);
	});
	
	chrome.tabs.onRemoved.addListener(
		function(tabId, removeInfo) {
			if(_BotTabs.indexOf(tabId) > -1) {
				_BotTabs.splice(_BotTabs.indexOf(tabId), 1);
			}
			
			if(_AutoStartTabs.indexOf(tabId) > -1)
				_AutoStartTabs.splice(_AutoStartTabs.indexOf(tabId), 1);
			
			/**
				If the closed tab was a host tab then the module tabs needs to be closed.
			*/
			CloseActiveModule(tabId);
			
			/**
				If the closed tab was a module managed tab then we need to notify the module that it was closed.
			*/
			var _ModuleInfo = GetModuleTabHostTab(tabId);
			
			if(_ModuleInfo != null) {
				CloseModuleTabDispatch(_ModuleInfo.HostTabId, tabId, _ModuleInfo.ModuleID);
			}
		}
	);
	
	chrome.runtime.onMessage.addListener(
		function(request, sender, sendResponse) {
	  
		if (request.method == "export")
		{			
			chrome.storage.local.get(function(data) {
				var url = 'data:application/json;base64,';
				
				url += btoa(JSON.stringify(data));
				
				chrome.downloads.download({
					url: url,
					filename: 'ExportedTwitchBotData.json'
				});
			});
			
			sendResponse({responseCode: 1});
		}
		else if (request.method == "update") 
		{
			CheckForUpdate();
			sendResponse({responseCode: 1});
		}
		else if (request.method == "Message") 
		{

			_MsgQueue.push({Id: _IdTracker++, TabId: sender.tab.id, Msg: request.Msg});
			
			sendResponse({responseCode: 1});
		} 
		else if (request.method == "MessageSent") 
		{
			_LogInAttemps = 0;
			_Sending = false;
			_SendTimeOut = null;
			sendResponse({responseCode: "Message Sent"});
		}
		else if (request.method == "BotStart") 
		{
			if(_BotTabs.indexOf(sender.tab.id) == -1)
				_BotTabs.push(sender.tab.id);
		}
		else if (request.method == "BotStop") 
		{
			if(_BotTabs.indexOf(sender.tab.id) > -1) {
				CloseActiveModule(sender.tab.id);
				_BotTabs.splice(_BotTabs.indexOf(sender.tab.id), 1);
			}
		}
		else if (request.method == "BotAutoStart") 
		{
			if(_AutoStartTabs.indexOf(sender.tab.id) == -1) {
				sendResponse( { Command: "wait" } );
			}
			else {
				CloseActiveModule(sender.tab.id);
				_AutoStartTabs.splice(_AutoStartTabs.indexOf(sender.tab.id), 1);
				sendResponse( { Command: "autoStart" } );
			}
		}
		else if (request.method == "BotPropertiesSaved") 
		{

			_SharedBotProperties["DeveloperMode"] = (("DeveloperMode" in request) ? request.DeveloperMode : false);
			_SharedBotProperties["TU"] = request.Username;
			_SharedBotProperties["TP"] = request.Password;
			_SharedBotProperties["AU"] = request.AdminUsername;
			
			chrome.storage.local.set({ "BOT_PROPERTIES": _SharedBotProperties }, function() {
				MessageSubscribedTabs("BOT_PROPERTIES", _SharedBotProperties);
			});
						
		}
		else if (request.method == "BOT_PROPERTIES") 
		{
			sendResponse({responseCode: 2, Properties: _SharedBotProperties });
			
		} 
		else if (request.method == "BOT_INTERNAL_MEMORY") 
		{
			var _tabId = sender.tab.id;
			
			chrome.storage.local.get(function(data) {
				chrome.tabs.sendMessage(_tabId, {method: "BOT_INTERNAL_MEMORY_RESPONSE", data: data}, function(response) {
					
				});
			});
		} 
		else if (request.method == "BOT_INTERNAL_MEMORY_SAVE") 
		{
			chrome.storage.local.set(request.data, function() {
				init();
				ReloadSubscribedTabs();
			});
		} 
		else if (request.method == "BOT_INSTALL_MODULES") 
		{
			chrome.storage.local.set({ "INSTALLED_MODS": request.ModuleIDs }, function() {
				init();
				ReloadSubscribedTabs();
			});
		} 
		else if (request.method == "BOT_INTERNAL_MEMORY_DELETE_KEYS") 
		{
			
			for(var i = 0; i < request.Keys.length; i++)
				chrome.storage.local.remove(request.Keys[i]);
			
			init();
			ReloadSubscribedTabs();
			
		} 
		else if (request.method == "fixbug1") 
		{
			
			var _tabId = sender.tab.id;
			
			$.get(chrome.extension.getURL("ModuleTemplate.js"),
				function (data) {
					chrome.tabs.executeScript(_tabId, {
						runAt: "document_end",
						code: data
					});
				}
			);

			sendResponse({responseCode: 1});
		} 
		else if (request.method == "fixbug3") 
		{
			var _ndata = {};
			
				for(var key in data){
					_ndata[key] = JSON.parse(data[key]);
				}
				
				chrome.storage.local.set(_ndata);
		} 
		else if (request.method == "ModuleOut")
		{
			var _moduleId = request.ModuleId, _tabId = sender.tab.id, _command = request.Command;
			
			chrome.tabs.sendMessage(_tabId, { method: "GET_BOT_PROPERTIES" }, function(_botResponse) {
				var _channelName = _botResponse.Argument.ChannelName;
				var _async = false;
				
				switch(_command)
				{
					case "OpenTab":
						OpenModuleTab(_tabId, request.TabOptions, _moduleId, sendResponse);
						_async = true;
					break;
					case "CloseTab":
						CloseModuleTab(_tabId, request.DeleteTabId, _moduleId, sendResponse);
						_async = true;
					break;
					case "UpdateTab":
						UpdateModuleTab(_tabId, request.UpdateTabId, request.TabOptions, _moduleId, sendResponse)
						_async = true;
					break;
					case "ReadData":
						chrome.storage.local.get(_channelName, function(mods) {
							var _result = null;
							
							if("BOT_MODULES" in mods[_channelName] && _moduleId in mods[_channelName].BOT_MODULES) {
								_result = mods[_channelName]["BOT_MODULES"][_moduleId];
							}
							
							chrome.tabs.sendMessage(_tabId, { method: "ModuleIn", ModuleId: _moduleId, Command: "ReadData", ModuleArgument: _result } );
						});
					break;
					case "SaveData":
						chrome.storage.local.get(_channelName, function(mods) {
							
							if(!("BOT_MODULES" in mods[_channelName]))
								mods[_channelName]["BOT_MODULES"] = {};
							
							mods[_channelName]["BOT_MODULES"][_moduleId] = request.ModuleArgument;
							
							chrome.storage.local.set( mods );
							
							chrome.tabs.sendMessage(_tabId, { method: "ModuleIn", ModuleId: _moduleId, Command: "SavedData" } );
						});
					break;
					case "ExecuteModuleHttpGet":
						var _apiUrl = chrome.i18n.getMessage("LogUrl");
						
						$.ajax({
						  type: "POST",
						  url: _apiUrl,
						  data: {
								"connectionKey": chrome.i18n.getMessage("ConnectionKey"), 
								"method": "HttpGet",
								"username": "ModuleHttpGet", 
								"DataParts": JSON.stringify( [_moduleId, request.ModuleArgument.URL ] )
							},
							success: function(d) {
								var _apiResponse = JSON.parse(d);
								
								var _result = null;
								
								if(_apiResponse.Code == 1) {
									// Send data
									_result = _apiResponse.Body;
								}
								
								sendResponse({ Body: _result });
							},
							error: function(d) {
								sendResponse({ Body: null });
							}
						});
						
						_async = true;
					break;
					case "GetModuleResources":
						var _apiUrl = chrome.i18n.getMessage("LogUrl");
						//var _moduleId = request.ModuleId;
						
						if(_moduleId != "DEVELOPER_MODULE") {
							
							chrome.storage.local.get("MODULE_RESOURCE_CACHE", function(data) {
								data = data["MODULE_RESOURCE_CACHE"];
								
								if(typeof(data) !== "undefined" && _moduleId in data && ((((new Date()).getTime()) - (new Date(JSON.parse(data[_moduleId].date)).getTime())) / 1000 ) < (60 * 60 * 24 * 5)) {
										chrome.tabs.sendMessage(_tabId, { method: "ModuleIn", ModuleId: _moduleId, Command: "ModuleResources", ModuleArgument: data[_moduleId].resource });
								} else {
									$.ajax({
									  type: "POST",
									  url: _apiUrl,
									  data: {
											"connectionKey": chrome.i18n.getMessage("ConnectionKey"), 
											"method": "GetModuleResources", 
											"username": "jbotuser", 
											"DataParts": JSON.stringify( [_moduleId] )
										},
										success: function(d) {
											var _apiResponse = JSON.parse(d);
											
											var _result = null;
											
											if(_apiResponse.Code == 1) {
												// Send data
												_result = _apiResponse.Body;

												if(typeof(data) === "undefined" || data == null)
													data = {};
												
												data[_moduleId] = { date: JSON.stringify(new Date()), resource: _result };
												
												chrome.storage.local.set( { "MODULE_RESOURCE_CACHE": data });
											}
											
											chrome.tabs.sendMessage(_tabId, { method: "ModuleIn", ModuleId: _moduleId, Command: "ModuleResources", ModuleArgument: _result });
										},
										error: function(d) {
											chrome.tabs.sendMessage(_tabId, { method: "ModuleIn", ModuleId: _moduleId, Command: "ModuleResources", ModuleArgument: null });
										}
									});
								}
							});
						} else {
							chrome.storage.local.get("DEVELOPER_MODULE_RESOURCE", function(data) {
								var _result = null;
								
								if(typeof(data) === "undefined" || data == null)
									data = {};
								
								if("DEVELOPER_MODULE_RESOURCE" in data) {
									_result = data["DEVELOPER_MODULE_RESOURCE"];
								}
								
								chrome.tabs.sendMessage(_tabId, { method: "ModuleIn", ModuleId: _moduleId, Command: "ModuleResources", ModuleArgument: _result });
							});
						}
					break;
					case "GetPlayerScore":
						chrome.tabs.sendMessage(sender.tab.id, { method: "ModuleOut", ModuleId: _moduleId, Command: "GetPlayerScore", ModuleArgument: request.ModuleArgument }, sendResponse );
						_async = true;
					break;
					case "ModifyPlayerScore":
						chrome.tabs.sendMessage(sender.tab.id, { method: "ModuleOut", ModuleId: _moduleId, Command: "ModifyPlayerScore", ModuleArgument: request.ModuleArgument, ModuleArgument2: request.ModuleArgument2 }, sendResponse );
						_async = true;
					break;
					case "CanGameBotStart":
						chrome.tabs.sendMessage(sender.tab.id, { method: "ModuleOut", ModuleId: _moduleId, Command: "CanGameBotStart" }, sendResponse );
						_async = true;
					break;
					default:
					break;
				}
				
				// Have to call the response or the port will stay open.
				if(!_async)
					sendResponse();
			});
			
			return true;
		} 
		else if (request.method == "ModuleMessage") 
		{
			chrome.tabs.sendMessage(sender.tab.id, request.ModuleObject );
		} 
		else if (request.method == "LoadModule") 
		{
			
			var _tabId = sender.tab.id;
			var _apiUrl = chrome.i18n.getMessage("LogUrl");
			var _moduleId = request.ModuleID;
			
			if(_moduleId != "DEVELOPER_MODULE") {
				$.ajax({
				  type: "POST",
				  url: _apiUrl,
				  data: {
						"connectionKey": chrome.i18n.getMessage("ConnectionKey"), 
						"method": "GetModule", 
						"username": "jbotuser", 
						"DataParts": JSON.stringify( [_moduleId] )
					},
					success: function(d) {
						var _moduleScript = JSON.parse(d);
						
						if(_moduleScript.Code == 1) {
							$.get(chrome.extension.getURL("ModuleHeader.js"),
								function (data) {
									
									data = data.replace(/\[MODULEID\]/g, _moduleId).replace("/*[MODULE SCRIPT]*/", _moduleScript.Body);
									
									
									
									chrome.tabs.executeScript(_tabId, {
											runAt: "document_end",
											code: data
									});
								}
							);
						}
					}
				});
			} 
			else 
			{
				chrome.storage.local.get("DEVELOPER_MODULE", function(data) {
					if("DEVELOPER_MODULE" in data) {
						
						var _devMod = data["DEVELOPER_MODULE"];
						
						$.get(chrome.extension.getURL("ModuleHeader.js"),
							function (data) {
								
								data = data.replace(/\[MODULEID\]/g, _moduleId).replace("/*[MODULE SCRIPT]*/", _devMod);
								
								chrome.tabs.executeScript(_tabId, {
										runAt: "document_end",
										code: data
								});
							}
						);
					}
				});
			}

			sendResponse({responseCode: 1});
		} 
		else if (request.method == "SaveDeveloperModule") 
		{
			chrome.storage.local.set({ "DEVELOPER_MODULE": request.DevModule, "DEVELOPER_MODULE_RESOURCE": request.DevResource }, function() {
				init();
				ReloadSubscribedTabs();
			});
		}
		else if (request.method == "CloseTab") 
		{
			chrome.tabs.remove(sender.tab.id);
		}
		else if (request.method == "GetTabId") 
		{
			sendResponse({Argument: sender.tab.id});
		}
		else if (request.method == "YouTubeSerivce") {
			var _moduleId = request.ModuleId, _tabId = sender.tab.id, _command = request.Command, _hostTabId = GetModuleHostTab(_moduleId);
			
			if(_hostTabId != null) {
				switch(_command) {
					case COMMAND_VIDEO_ENDED:
						chrome.tabs.sendMessage(_hostTabId, { method: "ModuleIn", ModuleId: _moduleId, Command: "YouTubeSerivce", ModuleArgument: _command } );
					break;
					case COMMAND_VIDEO_DOESNT_EXIST:
						chrome.tabs.sendMessage(_hostTabId, { method: "ModuleIn", ModuleId: _moduleId, Command: "YouTubeSerivce", ModuleArgument: _command } );
					break;
					case COMMAND_VIDEO_STARTED:
						chrome.tabs.sendMessage(_hostTabId, { method: "ModuleIn", ModuleId: _moduleId, Command: "YouTubeSerivce", ModuleArgument: _command, ModuleArgument2: request.Argument } );
					break;
					default: 
					break;
				}
			}
		}
		else 
		{
			sendResponse({responseCode: 0});
		}		  
	});
});