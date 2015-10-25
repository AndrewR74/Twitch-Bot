		$(function() {
				var _logoAnimating = false;
				
				setTimeout(function() { AnimateTarget($("#logo")); }, 1000);
				
				$(".logo").on("mouseover", function() {
					AnimateTarget($(this));
				});
				
				function AnimateTarget(target) {
					if(!_logoAnimating) {
						var s = 0, r = 20, o = target;
						animateLogo();
						_logoAnimating = true;
						
						function animateLogo() {
							setTimeout(function() {
								o.css("-webkit-mask", "-webkit-gradient(radial, 60 40, " + (++s) + ", 60 40," + (++r) + ", from(rgb(0,0,0)), color-stop(0.5, rgba(0,0,0, 0.2)), to(rgb(0,0,0)))");
								
								if(s < 123)
									animateLogo();
								else
									_logoAnimating = false;
							}, 10);
						}
					}
				}
		});
		
		
		$(function()
		{
			function SetLabelMessage(msg) {
				$("#messagebox").text(msg);
			}
			
			
			function Ascii2Hex(s) {
				t = '';
				for (a = 0; a < s.length; a = a + 1) {
					var k = s.charCodeAt(a).toString(16);
					t = t + (k.length == 1 ? "0" + k : k);
				}
				return t;
			}
			function Tabs(parentId, options) {
				
				var _instance = this;
				
				this.ParentId = parentId;
				this.Options = options;
				
				this.currentTabId = "";
				
				this.ChangeTabs = function(tabId, elem) {
					this.HideAllTabs();
					
					$("#" + elem.attr("data-key")).css("display", "block");
					elem.parent().addClass("active");
					
					var _oldTabId = this.currentTabId;
					this.currentTabId = elem.attr("data-key");
					
					if(typeof this.Options === "object" && "TabActions" in this.Options) {
						
						if( _oldTabId in this.Options.TabActions ) {
							if("close" in this.Options.TabActions[_oldTabId])
								this.Options.TabActions[_oldTabId].close(tabId, $("#" + this.parentId + " a[data-key='" + _oldTabId + "']").first());
						}
						
						if( elem.attr("data-key") in this.Options.TabActions ) {
							if("open" in this.Options.TabActions[elem.attr("data-key")])
								this.Options.TabActions[elem.attr("data-key")].open(tabId, elem);
						}
					}
				}
				
				this.HideAllTabs = function() {
					$("#" + this.ParentId + " a").each(function() { $("#" + $(this).attr("data-key")).css("display", "none"); $(this).parent().removeClass("active"); });
				}
				
				if( typeof options === 'object' && "ShowTab" in options && options.ShowTab  )
					this.ChangeTabs(0, $("#" + this.ParentId + " a").first());
				
				$("#" + this.ParentId + " a").on("click", function() {
					_instance.ChangeTabs($(this).index(), $(this));
				});
			}
			
			function Developer() {
				
				var _instance = this;
				this.UserId = -1;
				this.Username = "";
				this.Modules = null;
				this.Listeners = {};
				this.LastPing = null;
				
				this.AddListener = function(event, func) {
					var e = event.toLowerCase();
					if(!(e in this.Listeners))
						this.Listeners[e] = [];
					
					this.Listeners[e].push(func);
				}
				
				this.BindForm = function(usernameId, passwordId, submitId) {
					var _usernameId = usernameId, _passwordId = passwordId, _submitId = submitId;
					
					$("#" + _submitId).on("click", function() {
						if($("#" + _usernameId).val().length >= 6 && $("#" + _passwordId).val().length >= 6) {
							_instance.LogIn( $("#" + _usernameId).val(), $("#" + _passwordId).val() );
							$("#" + _passwordId).val("");
						} else {
							SetLabelMessage("Invalid Log In");
						}
					});
				}
				
				this.FireListener = function(event, args) {
					// do shit
					var e = "";
					
					if( typeof event === "string" ) {
						e = event.toLowerCase();
						if(e in this.Listeners) {
							this.Fire(e, args);
						}
					} else {
						for(var i = 0; i < event.length; i++) {
							e = event[i].toLowerCase();
							if(e in this.Listeners) {
								this.Fire(e, args);
							}
						}
					}
				}
				
				this.Fire = function(ef, a) {
					for(var i = 0; i < this.Listeners[ef].length; i++) {
						this.Listeners[ef][i](a);
					}
				}
				
				this.LogIn = function(username, password, callback) {
					var _username = username;
										
					$.ajax({
					  type: "POST",
					  url: "http://jb0t.x10.mx/JBotAPI/TwitchBot_Logs.php",
					  data: { 
					  "connectionKey": "1337-7456-9074-5638", 
					  "method": "AccountLogIn", 
					  "username": "TBD", 
					  "DataParts": JSON.stringify([ username, password ]) },
					  success: function(d) {
						var obj = JSON.parse(d);
						
						_instance.UserId = -1;
						_instance.Username = "";
						
						if( typeof obj === 'object' && obj.Code == 1) {
							_instance.Username = obj.Body.Username;
							_instance.UserId = obj.Body.ID;
							_instance.FireListener(["Changed", "LogIn", "LoggedInSuccess"], { IsLoggedIn: true, IsPing: _username.length == 0 });
						} else if(_username.length == 0){
							_instance.FireListener(["Changed", "LogIn", "LoggedInFailed"], { IsLoggedIn: false, IsPing: true });
						} else {
							_instance.FireListener(["Changed", "LogIn", "LoggedInFailed"], { IsLoggedIn: false });
						}
						
						if(typeof callback === "function")
							callback();
						
					  }, error: function(e) {
						  
							_instance.UserId = -1;
							_instance.Username = "";
						  
						  _instance.FireListener(["Changed", "LogIn", "LoggedInFailed"], { IsLoggedIn: false });
						  
						  if(typeof callback === "function")
							callback();
					  }
					});
				}
				
				this.LogOut = function() {
					
					_instance.UserId = -1;
					_instance.Username = "";
					
					$.ajax({
					  type: "POST",
					  url: "http://jb0t.x10.mx/JBotAPI/TwitchBot_Logs.php",
					  data: { 
					  "connectionKey": "1337-7456-9074-5638", 
					  "method": "AccountLogOut", 
					  "username": "TBD", 
					  "DataParts": "" },
					  success: function(d) {
						var obj = JSON.parse(d);
	
						if( typeof obj === 'object') {
							if(obj.Code == 1) {
								_instance.FireListener(["Changed", "LogOut", "LoggedOutSuccess"], null);
							} else {
								_instance.FireListener(["Changed", "LogOut", "LoggedOutFailed"], null);
							}
						}
					  }, error: function(e) {
						  _instance.FireListener(["Changed", "LogOut", "LoggedOutFailed"], null);
					  }
					});
				}
				
				this.IsLoggedIn = function (callback) {
					
					if(typeof callback !== "undefined") {
						if( this.LastPing == null || (((new Date()).getTime() - this.LastPing.getTime()) / 1000) > 60 ) {
							this.LastPing = new Date();
							this.LogIn("", "", callback);
						} else {
							callback();
						}
					}
					
					// Quick load
					return this.UserId != -1;
				}
				
				this.GetAccountModules = function(callback) {
					
					_instance.Modules = null;
					
					$.ajax({
					  type: "POST",
					  url: "http://jb0t.x10.mx/JBotAPI/TwitchBot_Logs.php",
					  data: { 
					  "connectionKey": "1337-7456-9074-5638", 
					  "method": "GetAccountModules", 
					  "username": "TBD", 
					  "DataParts": JSON.stringify([ this.UserId ])},
					  success: function(d) {
						var obj = JSON.parse(d);
						
						if( typeof obj === 'object' && obj.Code == 1) {
							_instance.Modules = obj.Body;
							_instance.FireListener(["Changed", "Modules", "ModulesSuccess"], null);
						} else {
							_instance.FireListener(["Changed", "Modules", "ModulesFailed"], null);
						}
						
						if(typeof callback === "function")
							callback();
						
					  }, error: function(e) {
						  _instance.FireListener(["Changed", "Modules", "ModulesFailed"], null);
						  
						  if(typeof callback === "function")
							callback();
					  }
					});
				}
				
				this.PublishModule = function(moduleName, moduleScript, moduleResource, callback) {
					$.ajax({
					  type: "POST",
					  url: "http://jb0t.x10.mx/JBotAPI/TwitchBot_Logs.php",
					  data: { 
					  "connectionKey": "1337-7456-9074-5638", 
					  "method": "PublishModule", 
					  "username": "TBD", 
					  "DataParts": JSON.stringify([ this.UserId, moduleName, Ascii2Hex(moduleScript), Ascii2Hex(moduleResource) ])},
					  success: function(d) {
						var obj = JSON.parse(d);
						
						if( typeof obj === 'object' && obj.Code == 1) {
							if(obj.Body > -1) {
								_instance.FireListener(["Changed", "Modules", "ModulePublishSuccess"], null);
							} else {
								_instance.FireListener(["Changed", "Modules", "ModulePublishSuccess"], null);
							}
						} else {
							_instance.FireListener(["Changed", "Modules", "ModulePublishFailed"], null);
							obj = null;
						}
						
						if(typeof callback === "function")
							callback(obj);
						
					  }, error: function(e) {
						  _instance.FireListener(["Changed", "Modules", "ModulePublishFailed"], null);
						  
						  if(typeof callback === "function")
							callback(null);
					  }
					});
				}
				
				// Check if we are already logged in
				this.LogIn("", "");
			}
			
			var _tabMenus = [
				new Tabs("DeveloperAccountTabs", { 
					"ShowTab": true
				}),
				new Tabs("DeveloperPortalTabs", {
					"ShowTab": true,
					"TabActions": {
						"DeveloperModules": {
							"open": function() {
								PopulateDeveloperModules();
							}
						}
					}
				}),
				new Tabs("NavMenu", { 
					"ShowTab": true, 
					"TabActions": { 
						"DeveloperTab": {
							"open": function () {
								// Check if we are logged in
								if(_developerUser.IsLoggedIn()) {
									$("#DeveloperAccount").hide();
									$("#DeveloperPortal").show();
									// If we are ping the server to check we still are
									_developerUser.IsLoggedIn(function() {
										if(_developerUser.IsLoggedIn()) {
											$("#DeveloperAccount").hide();
											$("#DeveloperPortal").show();
										}
									});
								} else {
									LoadDeveloperAccountView();
									$("#DeveloperAccount").show();
									$("#DeveloperPortal").hide();
								}
							},
							"close": function() {
								$("#DeveloperAccount").hide();
								$("#DeveloperPortal").hide();
							}
						}
					}
				}),
				new Tabs("DatabaseTabs", {
					"ShowTab": true
				})
			];
			
			var _developerUser = new Developer();
				_developerUser.BindForm("TXT_DevUsername", "TXT_DevPassword", "BTN_LogInDeveloper");
				_developerUser.AddListener("login", function(args) {
					if(typeof args.IsPing !== "undefined") {
						if(args.IsLoggedIn && !args.IsPing) {
							SetLabelMessage("Successfully logged In");
							$("#DeveloperAccount").hide();
							$("#DeveloperPortal").show();
						} else if(!args.IsPing) {
							SetLabelMessage("Invalid logged In");
						}
					} else if(!args.IsLoggedIn) {
						SetLabelMessage("Invalid logged In");
					}
					
					PopulateDeveloperModules();
				});
				_developerUser.AddListener("loggedoutsuccess", function(args) {
					SetLabelMessage("Successfully logged Out");
					$("#DeveloperAccount").show();
					$("#DeveloperPortal").hide();
				});
				_developerUser.AddListener("ModulesSuccess", function(args) {
					PopulateDeveloperModules();
				});
			
			$(window).on('hashchange', function() {
				switch(window.location.hash.toLowerCase()) {
					case "#/logout":
						if(typeof _developerUser === "object" && _developerUser != null)
							_developerUser.LogOut();
					break;
				}
			});
			
			
			function PopulateDeveloperModules() {
				
				$("#ModuleList").children().remove().end();
				
				if(typeof _developerUser !== "undefined" && _developerUser != null) {
					if(_developerUser.Modules != null) {
						$.each(_developerUser.Modules, function(index, value) {
							$("#ModuleList").append( $("<div>").attr("data-id", value.ID).addClass("module").text(value.Name) );
						});
					} else {
						_developerUser.GetAccountModules(null);
					}
				}
			}
			
			$("#BTN_PublishModule").on("click", function() {
				if(typeof _developerUser !== "undefined" && _developerUser != null && _developerUser.IsLoggedIn()) {
					var _moduleName = $("#TXT_PublishModuleName").val(),
					_moduleScript = $("#TXT_PublishModuleScript").val(),
					_moduleResource = $("#TXT_PublishModuleResouce").val();
					
					if(_moduleName.length > 0 && _moduleName.length <= 100) {
						if(_moduleScript.length > 0 && _moduleScript.length <= 80000) {
							if(_moduleResource.length <= 100000) {
								$(this).prop("disabled", true);
								_developerUser.PublishModule(_moduleName, _moduleScript, _moduleResource, function(arg) {
									$(this).prop("disabled", true);
									if(arg != null) {
										SetLabelMessage(arg.Message);
										
										if(arg.Body > -1) {
											$("#TXT_PublishModuleName").val(""),
											$("#TXT_PublishModuleScript").val(""),
											$("#TXT_PublishModuleResouce").val("");
										}
										
									} else {
										SetLabelMessage("Failed publishing Module");
									}
								});
							} else {
								SetLabelMessage("Resource is too long. 100,000 characters or less");
							}
						} else {
							SetLabelMessage("Script is too long. 80,000 characters or less");
						}
					} else {
						SetLabelMessage("Name is too long. 100 or less");
					}
				}
			});
			
			$("#BTN_SaveBotProperites").on("click", function() {
				chrome.runtime.sendMessage({method: "BotPropertiesSaved", 
					Username: $("#TXT_TwitchUsername").val(), 
					Password: $("#TXT_TwitchPassword").val(), 
					AdminUsername: $("#TXT_AdminUsername").val().toLowerCase(),
					DeveloperMode: $("#CHK_Developermode").prop("checked")
				});	
				SetLabelMessage("Saved Changes - " + (new Date()).getSeconds());
			});
			
			$("#BTN_SaveBotInternalMemory").on("click", function() {
				
				chrome.runtime.sendMessage({ method: "BOT_INTERNAL_MEMORY_SAVE", data: JSON.parse($("#TXT_BotInternalData").val()) });	
				
				SetLabelMessage("Saved Changes - " + (new Date()).getSeconds());
				
			});
			
			var _deletedKeys = [];
			
			$("#BTN_DeleteInternalMemoryKey").on("click", function() {
				var _ddl = $("#DDL_InternalMemory_Keys");
				
				if(_ddl.prop("selectedIndex") > -1) {
					_deletedKeys.push(_ddl.val());
					
					_ddl.children("option[value='" + _ddl.val() + "']").each(function(index) {
						$(this).remove();
					});
				}
			});
			
			$("#BTN_SaveBotInternalMemoryKeys").on("click", function() {
				chrome.runtime.sendMessage({method: "BOT_INTERNAL_MEMORY_DELETE_KEYS", Keys: _deletedKeys});
				_deletedKeys = [];
				chrome.runtime.sendMessage({method: "BOT_INTERNAL_MEMORY"});
				SetLabelMessage("Deleted Keys");
			});
			
			var _installedModules = [];
			
			$("#BTN_DeleteBotModules").on("click", function() {
				var _ddl = $("#DDL_BotModules");
				
				if(_ddl.prop("selectedIndex") > -1) {
					
					//var i = _installedModules.indexOf(_ddl.val());
					
					//_installedModules.splice(i, 1);
					
					if(Remove(_installedModules, function(m) { return (m == _ddl.val()); }) > 0) {
					
						_ddl.children("option[value='" + _ddl.val() + "']").each(function(index) {
							$(this).remove();
							_ddl.trigger("change");
						});
						
						SetLabelMessage("Module Deleted.");
					}
				}
			});
			
			$("#BTN_AddBotModule").on("click", function() {
				var _ddl = $("#DDL_BotModules");
				
				if($("#TXT_BotModules").val().length > 0 && Count(_installedModules, function(m) { return (m.ModuleID == $("#TXT_BotModules").val()); }) == 0) {
					_installedModules.push({ ModuleID: $("#TXT_BotModules").val(), IgnoreChannels: [] });
					
					$("#DDL_BotModules")
							.append($("<option></option>")
							.attr("value", $("#TXT_BotModules").val())
							.text($("#TXT_BotModules").val()));
							
					$("#TXT_BotModules").val("");
					
					SetLabelMessage("Module Installed.");
					
				} else {
					SetLabelMessage("Module is Already Installed.");
				}
			});
			
			$("#BTN_SaveBotModules").on("click", function() {
				chrome.runtime.sendMessage({method: "BOT_INSTALL_MODULES", ModuleIDs: _installedModules}, function (response) { });
				SetLabelMessage("Saved Modules");
				setTimeout(function() {chrome.runtime.sendMessage({method: "BOT_INTERNAL_MEMORY"}); }, 250);
			});
			
			$("#BTN_ResetDeveloperModule").on("click", function() {
				$.get(chrome.extension.getURL("ExampleModule.js"), function(data) {
					$("#TXT_DeveloperModule").val(data);
					SetLabelMessage("Press Save to confirm changes.");
				});
				
				$("#TXT_DeveloperModuleResouce").val('{ "luckynumber": "0111" }');
			});
			
			$("#BTN_SaveDeveloperModule").on("click", function() {
				chrome.runtime.sendMessage({method: "SaveDeveloperModule", DevModule: $("#TXT_DeveloperModule").val(), DevResource: $("#TXT_DeveloperModuleResouce").val() });
				
				SetLabelMessage("Saved Developer Module");
				
				setTimeout(function() {chrome.runtime.sendMessage({method: "BOT_INTERNAL_MEMORY"}); }, 250);
			});
			
			
			$("#BTN_CreateDeveloper").on("click", function() {
				$(this).prop("disabled", true);
				
				var _username = $("#TXT_NDevUsername").val(),
				_email = $("#TXT_NDevEmail").val(),
				_password = $("#TXT_NDevPassword").val(),
				_cpassword = $("#TXT_NDevCPassword").val(),
				_captcha = $("#TXT_NDevCaptcha").val(),
				_captchaId = $("#IMG_NDevCaptcha").attr("data-id");
				
				var _validated = true;
				
				if(_captchaId == "-1") { _validated = false; SetLabelMessage("Captcha Error."); }
				if(_password != _cpassword) { _validated = false; SetLabelMessage("Passwords do not match."); }
				if(_username.length < 6) { _validated = false; SetLabelMessage("Username needs to be minimum of 6 characters"); }
				if(_password.length < 6) { _validated = false; SetLabelMessage("Password needs to be minimum of 6 characters"); }
				if(_email.length < 2 || _email.indexOf("@") == -1 || _email.indexOf(".") == -1) { _validated = false; SetLabelMessage("Invalid Email Address"); }
				
				if(_validated) {
					$.ajax({
					  type: "POST",
					  url: "http://jb0t.x10.mx/JBotAPI/TwitchBot_Logs.php",
					  data: { 
					  "connectionKey": "1337-7456-9074-5638", 
					  "method": "RegisterUser", 
					  "username": "jbotregister", 
					  "DataParts": JSON.stringify([ _captchaId, _captcha, _username, _password, _email ]) },
					  success: function(d) {
						var obj = JSON.parse(d);
						if(obj != undefined && obj) {
							if(obj.Code == 1) {
								SetLabelMessage("Check email for activation link to complete the registration process.");
								LoadDeveloperAccountView();
							} else {
								SetLabelMessage(obj.Message);
							}
						}
						$("#BTN_CreateDeveloper").prop("disabled", false);
					  }, error: function(e) {
						  SetLabelMessage(e);
						  $("#BTN_CreateDeveloper").prop("disabled", false);
					  }
					});
				} else {
					$(this).prop("disabled", false);
				}
			});
			
			function Contains(iEnumerable, predicate) {
				var _result = false;
				
				for( var i = 0; i < iEnumerable.length; i++ )
					if(predicate(iEnumerable[i])) {
						_result = true;
						break;
					}
				
				return _result;
			}
			
			function Where(iEnumerable, predicate) {
				var _result = null;
				
				for( var i = 0; i < iEnumerable.length; i++ )
					if(predicate(iEnumerable[i])) {
						_result = iEnumerable[i];
						break;
					}
				
				return _result;
			}
			
			function First(iEnumerable, predicate) {
				var _result = null;
				
				for( var i = 0; i < iEnumerable.length; i++ )
					if(predicate(iEnumerable[i])) {
						_result = iEnumerable[i];
						break;
					}
				
				return _result;
			}
			
			function Update(iEnumerable, ReplacementValue, predicate) {
				var _result = 0;
				
				for( var i = 0; i < iEnumerable.length; i++ )
					if(predicate(iEnumerable[i])) {
						iEnumerable[i] = ReplacementValue;
						_result++;
					}
				
				return _result;
			}
			
			function Select(iEnumerable, predicate) {
				var _result = [];
				
				for( var i = 0; i < iEnumerable.length; i++ )
					_result.push(predicate(iEnumerable[i]));

				return _result;
			}
			
			function Count(iEnumerable, predicate) {
				var _result = 0;
				
				for( var i = 0; i < iEnumerable.length; i++ )
					if(predicate(iEnumerable[i])) {
						_result++;
					}
				
				return _result;
			}
			
			function Remove(iEnumerable, predicate) {
				var _result = 0, i = iEnumerable.length;
				
				while((i--) == 0) {
					if(predicate(iEnumerable[i])) {
						iEnumerable.splice(i,1);
						_result++;
					}
				}
				
				return _result;
			}

			function LoadDeveloperAccountView() {
				ResetCaptchaCreateDeveloperView();
				ClearCreateDeveloperView();
				$(this).prop("enabled", true);
			}
			
			function ResetCaptchaCreateDeveloperView() {
				$("#IMG_NDevCaptcha").attr("src", "").attr("data-id", "-1");
				
				$.ajax({
				  type: "POST",
				  url: "http://jb0t.x10.mx/JBotAPI/CreateCaptcha.php",
				  data: { "connectionKey": "1337-7456-9074-5638-0010" },
				  success: function(d) {
					var obj = JSON.parse(d);
					if(typeof obj === 'object' && obj) {
						if(obj.Code == 1) {
							$("#IMG_NDevCaptcha").attr("data-id", obj.Body).attr("src", "http://jb0t.x10.mx/JBotAPI/Captcha.php?ID=" + obj.Body);
						} else {
							$("#IMG_NDevCaptcha").attr("src", "").attr("data-id", "-1");
						}
					}
				  }
				});
			}
			
			function ClearCreateDeveloperView() {
				$("#TXT_NDevUsername").val("");
				$("#TXT_NDevEmail").val("");
				$("#TXT_NDevPassword").val("");
				$("#TXT_NDevCPassword").val("");
				$("#TXT_NDevCaptcha").val("");
			}
			
			function LoadIMemoryKeys(data) {
				$("#DDL_InternalMemory_Keys").find("option").remove().end();
				for(var key in data) {
					$("#DDL_InternalMemory_Keys")
						.append($("<option></option>")
						.attr("value", key)
						.text(key));
				}
			}
			
			function LoadModules(data) {
				$("#DDL_BotModules").find("option").remove().end();
				_installedModules = [];
				
				if("INSTALLED_MODS" in data) {
					for(var i = 0; i < data.INSTALLED_MODS.length; i++) {
						_installedModules.push(data.INSTALLED_MODS[i]);
						
						$("#DDL_BotModules")
							.append($("<option></option>")
							.attr("value", data.INSTALLED_MODS[i].ModuleID)
							.text(data.INSTALLED_MODS[i].ModuleID));
					}
				}
				
				$("#BTN_BotModuleblackListedSave").off("click").on("click", function() {
					var _selectedModuleId = $("#DDL_BotModules").val(), _selectModule = First(_installedModules, function(m) { return (m.ModuleID == _selectedModuleId); });
					
					if(_selectModule != null) {
						_selectModule.IgnoreChannels = Select($("#TXT_BotModuleBlackListedChannels").val().split("\n"), function(s) { return s.toLowerCase(); });
						
						if(Update( _installedModules, _selectModule, function(m) { return (m.ModuleID == _selectedModuleId); } ) == 1){
							SetLabelMessage("Press Save button to commit changes");
						}
					}
				});
				
				$("#DDL_BotModules").off("change").on("change", function() {
					SetBlackListedModuleChannels($(this).val());
				});
				
				if($("#DDL_BotModules option").length > 0)
					SetBlackListedModuleChannels($("#DDL_BotModules").val());
				
				function SetBlackListedModuleChannels(_selectedModuleId) {
					var _selectModule = null, _result = "";
					
					$("#BTN_BotModuleblackListedSave").prop("disabled", true);
					
					if(typeof(_selectedModuleId) === "string" && _selectedModuleId.length > 0 && (_selectModule = First(_installedModules, function(m) { return (m.ModuleID == _selectedModuleId); })) != null)
					{
						$("#BTN_BotModuleblackListedSave").prop("disabled", false);
						
						if(_selectModule.IgnoreChannels)
							_result = _selectModule.IgnoreChannels.join("\n");
					}
					
					$("#TXT_BotModuleBlackListedChannels").val(_result);
				}
			}
			
			function LoadDeveloperModule(data) {
				$("#TXT_DeveloperModule").val("");
				
				if("DEVELOPER_MODULE" in data) {
					$("#TXT_DeveloperModule").val(data.DEVELOPER_MODULE);
				} else {
					$.get(chrome.extension.getURL("ExampleModule.js"), function(data) {
						$("#TXT_DeveloperModule").val(data);
					});
				}
			}
			
			function LoadDeveloperModuleResource(data) {
				$("#TXT_DeveloperModuleResouce").val("");
				
				if("DEVELOPER_MODULE_RESOURCE" in data) {
					$("#TXT_DeveloperModuleResouce").val(data.DEVELOPER_MODULE_RESOURCE);
				}
			}
			
			chrome.runtime.sendMessage({method: "BOT_PROPERTIES"}, function (data) {
				$("#TXT_TwitchUsername").val(data.Properties.TU);
				$("#TXT_TwitchPassword").val(data.Properties.TP);
				$("#TXT_AdminUsername").val(data.Properties.AU);
				$("#CHK_Developermode").prop("checked", (data.Properties.DeveloperMode ? data.Properties.DeveloperMode : false));
			});
			
			chrome.runtime.sendMessage({method: "BOT_INTERNAL_MEMORY"});
			
			chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
				if (request.method == "BOT_INTERNAL_MEMORY_RESPONSE") {
					$("#TXT_BotInternalData").val(JSON.stringify(request.data, null, "\t"));
					
					LoadIMemoryKeys(request.data);
					LoadModules(request.data);
					LoadDeveloperModule(request.data);
					LoadDeveloperModuleResource(request.data);
				}
			});
		});